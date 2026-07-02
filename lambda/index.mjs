/**
 * Lambda: mamaceo-claude  (ES module, Node.js 22.x)
 * Sin dependencias externas — usa fetch nativo + AWS SigV4 manual para DynamoDB.
 */
import { createHmac, createHash } from "node:crypto";

const TABLE         = process.env.TABLE_NAME      || "user_states";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL  = "claude-haiku-4-5-20251001";
const REGION        = process.env.AWS_REGION      || "us-east-1";
const PLAN_LIMITS = { free: 50, emprendedora: 60, ceo: 200, premium: 200 };

const ALLOWED_ORIGINS = [
  "https://www.mamaceoapp.co",
  "https://mamaceoapp.co",
  "http://localhost:5173",
  "http://localhost:5174",
];

// ─── AWS SigV4 — DynamoDB via fetch nativo ────────────────────────────────
function hmac(key, data) { return createHmac("sha256", key).update(data).digest(); }
function sha256hex(s)     { return createHash("sha256").update(s, "utf8").digest("hex"); }
function amzDate(d)       { return d.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z"; }

async function dynamoCall(action, payload) {
  const accKey = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  const token  = process.env.AWS_SESSION_TOKEN;
  const host   = `dynamodb.${REGION}.amazonaws.com`;
  const body   = JSON.stringify(payload);
  const now    = new Date();
  const date   = amzDate(now);
  const day    = date.slice(0, 8);

  const hdrs = {
    "content-type":    "application/x-amz-json-1.0",
    "host":            host,
    "x-amz-date":     date,
    "x-amz-target":   `DynamoDB_20120810.${action}`,
    ...(token ? { "x-amz-security-token": token } : {}),
  };

  const sortedKeys   = Object.keys(hdrs).sort();
  const canonHdrs    = sortedKeys.map(k => `${k}:${hdrs[k]}`).join("\n") + "\n";
  const signedHdrs   = sortedKeys.join(";");
  const canonReq     = `POST\n/\n\n${canonHdrs}\n${signedHdrs}\n${sha256hex(body)}`;
  const scope        = `${day}/${REGION}/dynamodb/aws4_request`;
  const strToSign    = `AWS4-HMAC-SHA256\n${date}\n${scope}\n${sha256hex(canonReq)}`;
  const sigKey       = hmac(hmac(hmac(hmac(`AWS4${secret}`, day), REGION), "dynamodb"), "aws4_request");
  const sig          = createHmac("sha256", sigKey).update(strToSign).digest("hex");

  const res = await fetch(`https://${host}/`, {
    method: "POST",
    headers: {
      ...hdrs,
      authorization: `AWS4-HMAC-SHA256 Credential=${accKey}/${scope}, SignedHeaders=${signedHdrs}, Signature=${sig}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`DynamoDB ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── DynamoDB JSON marshalling ────────────────────────────────────────────
function mv(v) {
  if (v === null || v === undefined) return { NULL: true };
  if (typeof v === "boolean") return { BOOL: v };
  if (typeof v === "number")  return { N: String(v) };
  if (typeof v === "string")  return { S: v };
  if (Array.isArray(v))       return { L: v.map(mv) };
  return { M: Object.fromEntries(Object.entries(v).map(([k, val]) => [k, mv(val)])) };
}
function uv(v) {
  if (v.S    !== undefined) return v.S;
  if (v.N    !== undefined) return Number(v.N);
  if (v.BOOL !== undefined) return v.BOOL;
  if (v.NULL)               return null;
  if (v.L)                  return v.L.map(uv);
  if (v.M)                  return Object.fromEntries(Object.entries(v.M).map(([k, val]) => [k, uv(val)]));
  return undefined;
}
function unmarshal(item) {
  return Object.fromEntries(Object.entries(item).map(([k, v]) => [k, uv(v)]));
}

// ─── Plan / uso ───────────────────────────────────────────────────────────
function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function getUserPlanAndUsage(userId) {
  try {
    const r = await dynamoCall("GetItem", {
      TableName: TABLE,
      Key: { user_id: { S: userId } },
    });
    if (!r.Item) return { plan: "free", usage: {} };
    const item = unmarshal(r.Item);
    let plan = "free";
    try {
      const appData = typeof item.data === "string" ? JSON.parse(item.data) : (item.data || {});
      plan = appData.userPlan || item.userPlan || "free";
    } catch { /* free por defecto */ }
    return { plan, usage: item.ai_usage || {} };
  } catch {
    return { plan: "free", usage: {} };
  }
}

async function saveUsage(userId, usageMap) {
  await dynamoCall("UpdateItem", {
    TableName: TABLE,
    Key: { user_id: { S: userId } },
    UpdateExpression: "SET ai_usage = :u",
    ExpressionAttributeValues: { ":u": mv(usageMap) },
  });
}

// ─── CORS / respuesta ─────────────────────────────────────────────────────
function corsHeaders(event) {
  const origin  = event?.headers?.origin || event?.headers?.Origin || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin":  allowed,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}
function respond(status, body, event) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", ...corsHeaders(event) },
    body: JSON.stringify(body),
  };
}
function getUserId(event) {
  return (
    event?.requestContext?.authorizer?.jwt?.claims?.sub ||
    event?.requestContext?.authorizer?.claims?.sub ||
    null
  );
}

// ─── Claude (Anthropic) ───────────────────────────────────────────────────
async function callClaude(prompt, maxTokens = 4096) {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": ANTHROPIC_KEY,
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      temperature: 0.88,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (res.status === 429) throw new Error("rate_limit");
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ─── Prompts ──────────────────────────────────────────────────────────────
const DIALECTO = `DIALECTO — MUY IMPORTANTE:
- Español neutro de LatAm: México, Colombia, Venezuela, Perú — NO Argentina
- Usa SIEMPRE "tú" (nunca "vos")
- PROHIBIDO: "che", "boluda", "dale", "re-", "igual" como muletilla, "bárbaro", "copado", "laburo", "posta"
- SÍ puedes usar: "oye", "mira", "ahorita", "chévere" (con moderación), "linda", "amiga"
- El registro es cálido y cercano, como DM de WhatsApp entre amigas latinoamericanas`;

function buildPrompt(type, ctx) {
  const nicho = ctx.nicho || ctx.clienteIdeal || "mamás emprendedoras";
  const tono  = ctx.tono  || "cercano y cálido";

  if (type === "guion" && ctx.modo === "refinar") {
    const formatoLabel = { ig: "Reel de Instagram (máx 3 min)", youtube: "Video de YouTube (15-20 min)" }[ctx.formato || "ig"] || "video";
    const guionJSON = JSON.stringify(ctx.guionActual || {}, null, 2);
    return `Eres Abi, asistente de contenido que ayuda a mejorar guiones. Eres directa, específica y cálida — como una editora que lee el guión a fondo y hace exactamente lo que le piden, con criterio.

${DIALECTO}

Guión actual de ${formatoLabel} sobre "${ctx.tema || ""}":
${guionJSON}

Instrucción: "${ctx.instruccion || ""}"

Qué debes hacer:
- Lee el guión completo y aplica la instrucción con precisión.
- Si la instrucción afecta una sección específica, modifica solo esa sección y deja las demás EXACTAMENTE igual.
- Si es general, aplícala en todo el guión con coherencia.
- Sé valiente con los cambios: si pide "más emotivo", sé realmente emotivo, no levemente.
- Primera persona, como si ELLA lo dijera en voz alta. Coloquial pero neutro.
- Sin emojis dentro del guión. PROHIBIDO: "transforma", "potencial", "empoderar".
- Mantén el mismo número de secciones, nombres y tiempos originales.

Después de aplicar los cambios, escribe un campo "abi" con 1-2 oraciones específicas explicando QUÉ cambiaste y POR QUÉ — como si le dijeras a tu clienta en persona. Menciona la sección o parte concreta que modificaste.

Responde SOLO JSON válido, sin texto extra ni markdown:
{"titulo":"...","secciones":[{"nombre":"...","tiempo":"...","guion":"..."}],"abi":"Aquí va tu respuesta específica de Abi..."}`;
  }

  if (type === "guion") {
    const formato   = ctx.formato || "ig";
    const tema      = ctx.tema || ctx.queOfreces || "";
    const queOfrece = ctx.queOfreces ? `Contexto del creador: ${ctx.queOfreces}` : "";
    const transf    = ctx.transformacion ? `Valor que transmite: ${ctx.transformacion}` : "";

    const base = `Tema del contenido: "${tema}"
Audiencia: ${nicho}
Tono: ${tono}
${queOfrece}
${transf}

${DIALECTO}

Reglas de escritura CRÍTICAS:
- El guión debe girar EXCLUSIVAMENTE alrededor del tema — no introduzcas ángulos de negocio, ventas o emprendimiento si el tema no los pide.
- Escribe en primera persona, como si ELLA lo estuviera diciendo en voz alta de forma natural.
- Coloquial pero neutro — como habla una persona con su mejor amiga.
- PROHIBIDO: "transforma tu vida", "alcanza el éxito", "potencial", "empoderar", "journey", "abundancia".
- PROHIBIDO: empezar con "¿Cansada de...?", "Si quieres...", "Llegó el momento de...".
- SÍ: situaciones concretas y reales del tema, emociones nombradas con precisión, momentos específicos.
- Sin emojis dentro del guión.`;

    const jsonSafety = `
FORMATO DE RESPUESTA — REGLAS ESTRICTAS:
- Responde EXCLUSIVAMENTE con el objeto JSON, sin texto antes ni después, sin markdown ni \`\`\`
- Dentro de los campos "guion" NUNCA uses comillas dobles ("); usa comillas simples (') si necesitas citar algo.
- NO uses saltos de línea literales dentro de ningún string; separa ideas con puntos.
- Escribe todo como texto corrido — sin guiones, viñetas ni bullet points.`;

    if (formato === "ig") {
      return `Eres guionista experta en Reels de Instagram. Escribe el guión COMPLETO Y LISTO PARA GRABAR de un Reel de máximo 3 minutos.

${base}

Estructura — 4 secciones:
1. Hook (0-15 seg): 1-2 oraciones. Arranca desde una situación real que detiene el scroll. Sin promesas genéricas.
2. Interés (15 seg - 1 min): 4-6 oraciones. Nombra el dolor o la situación con precisión. Que ella sienta "eso me pasa exactamente". Sin solución aún.
3. Deseo (1-2 min): 6-8 oraciones. Pinta la vida o la situación después. Escenas reales y concretas. Emocional pero creíble.
4. Llamada a Acción (últimos 30 seg): 1-2 oraciones. Una sola instrucción. Simple y directa.

Responde SOLO JSON válido, sin texto extra:
{"titulo":"título del video (max 10 palabras)","secciones":[{"nombre":"Hook","tiempo":"0-15 seg","guion":"..."},{"nombre":"Interés","tiempo":"15 seg - 1 min","guion":"..."},{"nombre":"Deseo","tiempo":"1-2 min","guion":"..."},{"nombre":"Llamada a Acción","tiempo":"últimos 30 seg","guion":"..."}]}`;
    }

    if (formato === "youtube") {
      return `Eres guionista experta en contenido de YouTube de formato largo. Escribe el guión COMPLETO Y LISTO PARA GRABAR de un video de 15 a 20 minutos.

${base}

Estructura — 5 secciones con contenido sólido y desarrollado:
1. Hook de apertura (0-2 min): Empieza con una situación, pregunta o historia concreta que enganche desde el primer segundo. No promesas — una escena real.
2. Contexto y promesa (2-5 min): Explica de qué va el video y por qué importa. Qué van a aprender o sentir al terminar. Honesta y directa.
3. Desarrollo central (5-13 min): El corazón del video. Desarrolla el tema con profundidad — cuenta historias reales, da ejemplos concretos, explica conceptos con claridad. Puede tener 2 o 3 bloques internos de ideas, pero escríbelos como texto corrido, uno fluyendo en el otro.
4. Cierre reflexivo (13-17 min): Resume la idea central en tus propias palabras. Qué quieres que se lleven. Sin repetir lo anterior — eleva el mensaje.
5. Llamada a Acción (17-20 min): Una sola instrucción concreta y personal. Cierra con algo cálido y propio de ti.

Cada sección entre 130 y 180 palabras. Escribe texto corrido, fluido y natural — como habla alguien frente a una cámara.
${jsonSafety}

Responde SOLO JSON válido:
{"titulo":"título del video (max 12 palabras)","secciones":[{"nombre":"Hook de apertura","tiempo":"0-2 min","guion":"..."},{"nombre":"Contexto y promesa","tiempo":"2-5 min","guion":"..."},{"nombre":"Desarrollo central","tiempo":"5-13 min","guion":"..."},{"nombre":"Cierre reflexivo","tiempo":"13-17 min","guion":"..."},{"nombre":"Llamada a Acción","tiempo":"17-20 min","guion":"..."}]}`;
    }

    return "";
  }

  if (type === "hooks") {
    return `Eres experta en hooks de video para mamás emprendedoras en LatAm.
El video trata sobre: "${ctx.tema}"
Audiencia: ${nicho}
Tono: ${tono}

${DIALECTO}

Escribe 4 hooks para cada estilo. Cada hook debe capturar la EMOCIÓN o SITUACIÓN detrás del tema, no nombrarlo.

Estilos:
- curiosidad: despierta intriga sin revelar el secreto
- dolor: toca la frustración exacta que ella siente
- promesa: muestra un resultado concreto y creíble
- pregunta: una pregunta directa que la hace parar a pensar
- historia: arranca con un momento real ("Antes yo...", "El día que...", "Cuando mi clienta...")
- numero: empieza con un dato o número específico
- contraintuitivo: rompe una creencia que ella tiene sobre el tema
- identidad: habla directo a quien ella es como mamá emprendedora

Reglas CRÍTICAS:
- NUNCA repitas la frase "${ctx.tema}" literalmente dentro del hook
- Escribe desde la situación, la emoción o el momento concreto — no desde la etiqueta del tema
- Español de LatAm conversacional, como habla una mamá con otra en WhatsApp
- Máximo 18 palabras por hook
- Sin emojis, sin comillas

Ejemplo de lo que NO hacer (con tema "cobrar sin culpa"):
MAL: "Lo que nadie te dice sobre cobrar sin culpa"
MAL: "Descubrí cómo cobrar sin culpa y cambió todo"

Ejemplo de lo que SÍ hacer:
BIEN: "Cuánto cuesta que les regales tu trabajo por miedo al no?"
BIEN: "Mandé la propuesta y esperé que me dijeran que era muy caro"

Responde SOLO JSON válido, sin texto extra:
{"curiosidad":["h1","h2","h3","h4"],"dolor":["h1","h2","h3","h4"],"promesa":["h1","h2","h3","h4"],"pregunta":["h1","h2","h3","h4"],"historia":["h1","h2","h3","h4"],"numero":["h1","h2","h3","h4"],"contraintuitivo":["h1","h2","h3","h4"],"identidad":["h1","h2","h3","h4"]}`;
  }

  if (type === "ideas") {
    const intentionMap = {
      entretener: "ENTRETENER — cada idea debe capturar la atención de inmediato: sorpresa, curiosidad, giro inesperado, revelación que nadie se espera. El viewer no puede scrollear.",
      educar:     "EDUCAR — cada idea enseña algo concreto y aplicable. El viewer se lleva un aprendizaje real. Ángulos: datos sorprendentes, comparaciones, desmitificaciones, procesos paso a paso.",
      inspirar:   "INSPIRAR — cada idea eleva la perspectiva o desafía una creencia limitante. El viewer se siente motivada a actuar o a ver su situación diferente.",
      nutrir:     "NUTRIR — cada idea construye confianza y conexión con la comunidad. Ángulos: empatía, vulnerabilidad honesta, apoyo, cercanía, 'te entiendo'.",
      divertir:   "DIVERTIR — cada idea usa humor, ligereza y situaciones cotidianas reconocibles. El viewer sonríe o se identifica al instante. Irónía amigable, exageraciones, memes de nicho.",
    };
    const intentionInstr = ctx.intention && intentionMap[ctx.intention]
      ? `\nINTENCIÓN DE CONTENIDO: ${intentionMap[ctx.intention]}\nTodas las ideas de todos los formatos deben cumplir esta intención sin excepción.\n`
      : "";

    const ideasBase = `Eres estratega de contenido digital especializada en generar ideas creativas y originales para cualquier tipo de creadora de contenido — de crianza, negocios, cocina, salud, relaciones, lifestyle, o cualquier otro tema.

Tema de búsqueda: "${ctx.keyword}"
Audiencia: ${nicho}
Tono: ${tono}
${intentionInstr}
${DIALECTO}

REGLA FUNDAMENTAL: Las ideas deben girar EXCLUSIVAMENTE alrededor del tema de búsqueda tal como está escrito. No mezcles otros temas ni introduzcas ángulos de negocio, ventas, o emprendimiento si el tema no lo pide. Si el tema es crianza, todas las ideas son de crianza. Si es cocina, son de cocina. Si es fitness, son de fitness.

LONGITUD DE TÍTULOS — REGLA CRÍTICA:
- Máximo 8 palabras por título. Punchy, directo, que quepa en 2 líneas en móvil.
- Prohibido usar comas, "—", dos puntos o conectores que alargan la frase.
- Si tienes ganas de poner "y además...", "que te...", "para que puedas..." — CÓRTALO. Quédate con el gancho.
- Ejemplos CORRECTOS: "¿Tus reels no funcionan? Esto falta", "El hábito que destruye tu productividad", "Nadie te dijo esto sobre vender"
- Ejemplos PROHIBIDOS: "5 errores que arruinan tus resultados con reels y cómo evitarlos de una vez por todas", "Todo lo que necesitas saber sobre organización para mamás emprendedoras que quieren más tiempo"

PROHIBIDO en todos los formatos:
- Anécdotas fabricadas en primera persona: "Mi hijo me interrumpió...", "Cuando yo...", "Me pasó que...", "Esa vez que..." — NO inventes vivencias personales.
- Fórmulas predecibles: "N errores que...", "N razones por las que...", "N pasos para...", "Todo lo que nadie te dice sobre...", "La verdad sobre..."
- Empezar con "POV:", "Cómo X sin Y", "Así hago yo", "Descubrí que", "Lo que aprendí sobre"
- Frases vacías: "potencial", "empoderar", "journey", "vivir tus sueños", "transformar tu vida"
- Repetir la frase exacta del tema como título — escribe desde el ÁNGULO o la EMOCIÓN, no desde la etiqueta

LO QUE SÍ QUEREMOS — hooks que paran el scroll:
1. PREGUNTA DIRECTA que toca un dolor real: "¿Por qué nadie te contacta después de ver tus reels?"
2. AFIRMACIÓN PROVOCADORA: "Vender sin convencer es posible"
3. SITUACIÓN en 2da persona: "Publicas todos los días y nadie compra"
4. DATO O CONTRASTE inesperado: "El reel de 7 segundos que vendió más que el de 3 minutos"`;

    const formatosDesc = `
Genera 6 ideas para cada formato. Cada idea es un título o hook listo para usar, máximo 8 palabras:
- vertical: Reels / TikTok — gancho visual que para el scroll en 2 segundos
- horizontal: YouTube / Podcast — pregunta o insight que justifica 15-20 min de atención
- carrusel: Post de Instagram — promesa de aprendizaje accionable en slides
- story: Historia de Instagram — pregunta directa o mini-reflexión conversacional
- digital: Producto digital (guía, plantilla, reto, mini-curso) — promesa de resultado concreto
- email: Asunto de email — corto, personal, como mensaje de amiga, genera curiosidad
- whatsapp: Broadcast de WhatsApp — máximo 12 palabras, 1 solo emoji natural al final`;

    // Modo "más ideas": solo para un formato, evitando repetir las existentes
    if (ctx.modo === "mas" && ctx.catKey) {
      const formatoLabels = {
        vertical: "Reels / TikTok (gancho visual que para el scroll en 2 segundos)",
        horizontal: "YouTube / Podcast (pregunta o insight que justifica 15-20 min de atención)",
        carrusel: "Carrusel de Instagram (promesa de aprendizaje accionable en slides)",
        story: "Historia de Instagram (pregunta directa o mini-reflexión conversacional)",
        digital: "Producto digital como guía, plantilla, reto o mini-curso (promete resultado concreto)",
        email: "Asunto de email (corto, personal, curioso, como mensaje de amiga)",
        whatsapp: "Broadcast de WhatsApp (máximo 12 palabras, 1 emoji natural al final)",
      };
      const excluir = (ctx.excluir || []).map(t => `- ${t}`).join("\n");
      return `${ideasBase}

Genera 4 ideas NUEVAS Y DIFERENTES de tipo "${formatoLabels[ctx.catKey] || ctx.catKey}" sobre el tema. Máximo 8 palabras cada una.

${excluir ? `IMPORTANTE — NO repitas ni hagas variaciones de estas ideas que ya generaste:\n${excluir}\n` : ""}
Responde SOLO JSON válido, sin texto extra:
{"${ctx.catKey}":["idea1","idea2","idea3","idea4"]}`;
    }

    return `${ideasBase}
${formatosDesc}

Responde SOLO JSON válido, sin texto extra:
{"vertical":["i1","i2","i3","i4","i5","i6"],"horizontal":["i1","i2","i3","i4","i5","i6"],"carrusel":["i1","i2","i3","i4","i5","i6"],"story":["i1","i2","i3","i4","i5","i6"],"digital":["i1","i2","i3","i4","i5","i6"],"email":["i1","i2","i3","i4","i5","i6"],"whatsapp":["i1","i2","i3","i4","i5","i6"]}`;
  }

  if (type === "leadmagnet") {
    const tipoLabel = {
      guia:      "Guía / Ebook PDF descargable",
      checklist: "Checklist o Plantilla lista para usar",
      clase:     "Mini-clase o Webinar grabado",
      reto:      "Reto o Challenge de varios días",
    }[ctx.tipo] || "Guía";
    return `Eres experta en lead magnets para mamás emprendedoras en LatAm.
Crea la estructura completa de un lead magnet tipo "${tipoLabel}" sobre: "${ctx.keyword}"
Audiencia: ${nicho}
Tono: ${tono}

${DIALECTO}

Genera exactamente esto:
- titulo: Título irresistible que promete una victoria rápida y concreta. Máximo 12 palabras. Sin comillas ni emojis.
- promesa: Lo que la clienta podrá hacer o sentir al terminar. Máximo 15 palabras. Empieza con verbo: "Aprenderás...", "Podrás...", "Sabrás cómo..."
- secciones: Array de exactamente 5 nombres de secciones/módulos/ítems/días. Cada uno 5-8 palabras, concreto y accionable.

Reglas:
- Español de LatAm, cálido y directo — como habla una mamá emprendedora
- Títulos con resultados claros y concretos — nada genérico
- PROHIBIDO: "empoderar", "potencial", "transformar tu vida", "éxito que mereces", "viaje"
- Cada sección debe ser un paso que la clienta puede completar

Responde SOLO JSON válido, sin texto extra, sin markdown:
{"titulo":"...","promesa":"...","secciones":["sec1","sec2","sec3","sec4","sec5"]}`;
  }

  if (type === "reproposito") {
    const scriptTexto = ctx.scriptTexto || "";
    const tema        = ctx.tema || "este tema";
    const formato     = ctx.formato || "ig";
    const formatoLabel = { ig: "Reel de Instagram", youtube: "Video de YouTube", podcast: "Episodio de Podcast" }[formato] || "Reel";

    return `Eres experta en repurposing de contenido para mamás emprendedoras en LatAm.
Tienes este guión de ${formatoLabel} sobre "${tema}":

${scriptTexto}

---
Audiencia: ${nicho}
Tono: ${tono}

${DIALECTO}

Adapta el mensaje central de este guión en 4 formatos. Mantén la esencia y emoción del guión original, pero reescribe para cada plataforma.

CARRUSEL de Instagram — 5 slides:
- Slide 01 "Portada": frase de impacto que detiene el scroll (máx 12 palabras)
- Slide 02 "El dolor": la situación que ella vive (1-2 oraciones cortas)
- Slide 03 "El insight": la idea clave que cambia la perspectiva (1-2 oraciones)
- Slide 04 "El resultado": cómo se siente o qué logra con esto (1-2 oraciones)
- Slide 05 "CTA": qué hacer ahora (1 oración, directa)

EMAIL a lista — asunto + cuerpo:
- Asunto: máximo 8 palabras, personal y curioso (como mensaje de amiga)
- Cuerpo: 150-200 palabras, conversacional, termina con una pregunta o una sola acción clara

MENSAJES WhatsApp — 3 momentos:
- "📣 Pre-publicación": antes de subir el contenido, genera expectativa (máx 60 palabras)
- "🚀 El día que publicas": anuncia el contenido con link placeholder (máx 60 palabras)
- "🔁 Follow-up": al día siguiente, genera conversación (máx 60 palabras)

STORIES de Instagram — 5 historias en secuencia:
- Story 01 "Pregunta": pregunta que la detiene (1 oración)
- Story 02 "El contexto": situación reconocible (1-2 oraciones)
- Story 03 "El cambio": el giro o insight (1-2 oraciones)
- Story 04 "El resultado": cómo se siente después (1 oración)
- Story 05 "CTA": acción concreta (1 oración)

Reglas de escritura:
- Español de LatAm, cálido y cercano
- PROHIBIDO: "transforma tu vida", "alcanza el éxito", "potencial", "empoderar", "journey"
- Cada formato debe funcionar de forma independiente, sin contexto extra
- WhatsApp y Stories: máximo 2 oraciones por mensaje, sin bullet points internos

Responde SOLO JSON válido, sin texto extra, sin markdown:
{"carrusel":[{"num":"01","etq":"Portada","txt":"..."},{"num":"02","etq":"El dolor","txt":"..."},{"num":"03","etq":"El insight","txt":"..."},{"num":"04","etq":"El resultado","txt":"..."},{"num":"05","etq":"CTA","txt":"..."}],"email":{"asunto":"...","cuerpo":"..."},"whatsapp":[{"label":"📣 Pre-publicación","txt":"..."},{"label":"🚀 El día que publicas","txt":"..."},{"label":"🔁 Follow-up","txt":"..."}],"stories":[{"num":"01","tipo":"Pregunta","txt":"..."},{"num":"02","tipo":"El contexto","txt":"..."},{"num":"03","tipo":"El cambio","txt":"..."},{"num":"04","tipo":"El resultado","txt":"..."},{"num":"05","tipo":"CTA","txt":"..."}]}`;
  }

  return "";
}

// ─── Prompt: Plan de Negocio Público ──────────────────────────────────────
function buildPlanNegocioPrompt(ctx) {
  const nombre = ctx.nombre ? `Nombre: ${ctx.nombre}` : "";
  return `Eres una asesora de negocios experta en mamás emprendedoras de Latinoamérica. Tu misión es construir un plan de negocio digital aterrizado, simple, humano y accionable — adaptado a la realidad de una mamá que quiere generar ingresos online.

INFORMACIÓN DE LA EMPRENDEDORA:
${nombre}
- Historia personal: ${ctx.historia || ""}
- Habilidades: ${ctx.habilidades || ""}
- Pasiones: ${ctx.pasion || ""}
- Problemas que puede resolver: ${ctx.problemas || ""}
- Experiencia: ${ctx.experiencia || ""}
- Tiempo disponible: ${ctx.tiempo || ""}
- Meta de ingresos: ${ctx.ingresos || ""}
- Estilo de vida deseado: ${ctx.estiloVida || ""}

INSTRUCCIONES GENERALES:
- Escribe en español de LatAm, cálido, claro y sin jerga técnica.
- Usa "tú" (nunca "usted" ni "vos").
- Adapta todo a la realidad específica de esta mamá — no uses ejemplos genéricos.
- El plan debe ser realista, práctico y útil para convocatorias de capital semilla, inversionistas y alianzas.
- Propone un nombre de negocio basado en lo que ella hace.
- Donde pongas proyecciones financieras, basalas en su meta de ingresos real.
- PROHIBIDO: "empoderar", "potencial", "journey", "transformar tu vida", "éxito que mereces".

Genera el plan completo con esta estructura exacta en JSON:

- nombreNegocio: string — nombre propuesto para su negocio
- resumenEjecutivo: string — 1 página que responde qué hace, a quién ayuda, cómo genera ingresos, qué impacto produce y cuánto quiere crecer
- problema: string — el dolor o necesidad que tiene su cliente ideal, con contexto real
- solucion: objeto con "descripcion" (string), "productos" (array de strings con sus servicios/productos propuestos), "areas" (array de strings con las áreas que trabaja: ej. ventas, marketing, IA, bienestar, etc.)
- mercado: objeto con "descripcion" (string), "mercadoObjetivo" (string con perfil demográfico), "clienteIdeal" (array de 4-6 características del cliente ideal)
- modeloNegocio: objeto con "descripcion" (string), "lineasIngreso" (array de strings con cada línea de ingreso y su precio estimado), "estructura" (string explicando cómo funciona el modelo)
- ventajaCompetitiva: string — por qué alguien la elegiría a ella específicamente
- estrategiaCrecimiento: objeto con "embudo" (string explicando el funnel de conversión), "fases" (array de 3 strings: fase 1, 2 y 3 del crecimiento en 12 meses)
- impacto: objeto con "economico" (string), "familiar" (string), "educativo" (string), "emocional" (string) — cómo se mide el impacto en cada dimensión
- proyeccionesFinancieras: objeto con "año1" (string con proyección detallada), "año2" (string), "año3" (string), "vision5anos" (string con visión a 5 años)
- usoRecursos: objeto con "descripcion" (string explicando para qué necesita financiación), "categorias" (array de strings con cada uso específico del capital: ej. "Adquisición de clientes: $X", "Producción educativa: $X")

Responde SOLO JSON válido, sin texto extra, sin markdown:`;
}

// ─── Handler público: Plan de Negocio ─────────────────────────────────────
const PLAN_DAILY_LIMIT = 150;

async function handlePlanNegocio(publicEmail, context, event) {
  if (!ANTHROPIC_KEY) return respond(500, { error: "API key no configurada" }, event);

  const emailKey = `plan_pub#${publicEmail}`;
  const today    = new Date().toISOString().slice(0, 10);
  const dayKey   = `plan_daily#${today}`;

  // 1. Verificar si este email ya tiene un plan
  try {
    const existing = await dynamoCall("GetItem", {
      TableName: TABLE,
      Key: { user_id: { S: emailKey } },
    });
    if (existing.Item) {
      const item = unmarshal(existing.Item);
      if (item.plan) {
        return respond(200, { result: item.plan, emailSent: false, error: "ya_generado", plan: item.plan }, event);
      }
    }
  } catch { /* continuar */ }

  // 2. Verificar límite diario global
  try {
    const dayItem = await dynamoCall("GetItem", {
      TableName: TABLE,
      Key: { user_id: { S: dayKey } },
    });
    if (dayItem.Item) {
      const dayData = unmarshal(dayItem.Item);
      if ((dayData.count || 0) >= PLAN_DAILY_LIMIT) {
        return respond(429, { error: "limite_diario" }, event);
      }
    }
  } catch { /* continuar */ }

  // 3. Generar el plan
  const prompt = buildPlanNegocioPrompt(context);
  let rawText;
  try {
    rawText = await callClaude(prompt, 8192);
  } catch (err) {
    if (err.message === "rate_limit") return respond(429, { error: "rate_limit" }, event);
    return respond(502, { error: "Error al generar el plan. Intenta de nuevo." }, event);
  }

  let planResult;
  try {
    const match = rawText.match(/\{[\s\S]*\}/);
    planResult = JSON.parse(match ? match[0] : rawText);
  } catch {
    return respond(502, { error: "Respuesta no válida. Intenta de nuevo." }, event);
  }

  // 4. Guardar email como lead + plan generado
  try {
    await dynamoCall("PutItem", {
      TableName: TABLE,
      Item: {
        user_id:    { S: emailKey },
        email:      { S: publicEmail },
        nombre:     { S: context.nombre || "" },
        plan:       mv(planResult),
        createdAt:  { N: String(Date.now()) },
        type:       { S: "plan_lead" },
      },
    });
  } catch { /* no bloquear por error de guardado */ }

  // 5. Incrementar contador diario
  try {
    await dynamoCall("UpdateItem", {
      TableName: TABLE,
      Key: { user_id: { S: dayKey } },
      UpdateExpression: "ADD #c :one SET #t = :type",
      ExpressionAttributeNames: { "#c": "count", "#t": "type" },
      ExpressionAttributeValues: { ":one": { N: "1" }, ":type": { S: "daily_counter" } },
    });
  } catch { /* continuar */ }

  // 6. Enviar email con Brevo (cuando esté configurado)
  let emailSent = false;
  const brevoKey = process.env.BREVO_API_KEY;
  if (brevoKey && planResult) {
    try {
      const nombreNegocio = planResult.nombreNegocio || "Tu Negocio";
      const resumen = planResult.resumenEjecutivo || "";
      const htmlBody = `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e">
          <div style="background:#C4526A;padding:24px 32px;border-radius:12px 12px 0 0">
            <h1 style="color:#fff;margin:0;font-size:22px">Tu Plan de Negocio está listo 🎉</h1>
          </div>
          <div style="background:#fff;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb">
            <p style="margin:0 0 16px">Hola${context.nombre ? ` ${context.nombre}` : ""},</p>
            <p style="margin:0 0 16px">Tu plan de negocio <strong>${nombreNegocio}</strong> está listo. Aquí un resumen ejecutivo:</p>
            <div style="background:#faf9f7;border-left:3px solid #C4526A;padding:16px 20px;border-radius:8px;margin:0 0 20px">
              <p style="margin:0;font-size:14px;line-height:1.7;color:#374151">${resumen.slice(0, 500)}${resumen.length > 500 ? "..." : ""}</p>
            </div>
            <p style="margin:0 0 20px;color:#6b7280;font-size:14px">Para ver tu plan completo con todas las secciones, ve a:</p>
            <a href="https://www.mamaceoapp.co/plan-de-negocio" style="display:inline-block;background:#C4526A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Ver mi plan completo →</a>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0">
            <p style="margin:0;font-size:13px;color:#9ca3af">Mamá CEO · <a href="https://www.mamaceoapp.co" style="color:#C4526A">mamaceoapp.co</a></p>
          </div>
        </div>`;

      const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender:      { name: "Mamá CEO", email: "hola@mamaceoapp.co" },
          to:          [{ email: publicEmail, name: context.nombre || "" }],
          subject:     `Tu plan de negocio está listo — ${nombreNegocio}`,
          htmlContent: htmlBody,
        }),
      });
      if (brevoRes.ok) emailSent = true;
    } catch { /* no bloquear si el email falla */ }
  }

  return respond(200, { result: planResult, emailSent }, event);
}

// ─── Handler ──────────────────────────────────────────────────────────────
export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || event?.httpMethod || "POST";
  if (method === "OPTIONS") return respond(200, "", event);

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return respond(400, { error: "JSON inválido" }, event); }

  // Ruta pública: plan de negocio gratuito (sin JWT)
  if (body.type === "planNegocio" && body.publicEmail) {
    return handlePlanNegocio(body.publicEmail, body.context || {}, event);
  }

  const userId = getUserId(event);
  if (!userId) return respond(401, { error: "No autorizada" }, event);

  const { type, context } = body;
  if (!type || !context) return respond(400, { error: "Faltan campos: type, context" }, event);
  if (!["guion", "hooks", "ideas", "leadmagnet", "reproposito"].includes(type)) return respond(400, { error: "Tipo no soportado" }, event);
  if (!ANTHROPIC_KEY) return respond(500, { error: "API key no configurada" }, event);

  const { plan, usage } = await getUserPlanAndUsage(userId);
  const mk = monthKey();
  const currentCount = usage[mk] || 0;
  const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  if (currentCount >= limit) {
    return respond(429, {
      error: "limite_alcanzado",
      usage: currentCount,
      limit,
      plan,
      message: `Llegaste al límite de ${limit} generaciones este mes.`,
    }, event);
  }

  const prompt = buildPrompt(type, context);
  let maxTokens = 4096;
  if (type === "guion" && (context.formato === "youtube" || context.formato === "podcast")) maxTokens = 8192;
  if (type === "reproposito") maxTokens = 8192;

  const parseJSON = (rawText) => {
    const match = rawText.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : rawText);
  };

  let rawText;
  try {
    rawText = await callClaude(prompt, maxTokens);
  } catch (err) {
    if (err.message === "rate_limit") {
      return respond(429, { error: "rate_limit" }, event);
    }
    console.error("Claude error:", err);
    return respond(502, { error: "Error al contactar el servicio. Intenta de nuevo." }, event);
  }

  let result;
  try {
    result = parseJSON(rawText);
  } catch (firstErr) {
    // Las respuestas largas (Youtube/Podcast) tienen más riesgo de comillas o saltos de línea
    // sin escapar dentro del JSON — reintentamos una vez pidiendo explícitamente que lo corrija.
    console.warn("Parse error, reintentando. Raw:", rawText);
    try {
      const retryPrompt = `${prompt}\n\nTu respuesta anterior NO fue JSON válido. Corrígelo: responde EXCLUSIVAMENTE el objeto JSON (sin texto antes/después, sin markdown), escapa toda comilla doble dentro de los textos como \\", y no incluyas saltos de línea literales dentro de ningún string.`;
      const rawText2 = await callClaude(retryPrompt, maxTokens);
      result = parseJSON(rawText2);
    } catch (err) {
      console.error("Parse error tras reintento:", err);
      return respond(502, { error: "Respuesta no válida. Intenta de nuevo." }, event);
    }
  }

  const updatedUsage = { ...usage, [mk]: currentCount + 1 };
  try { await saveUsage(userId, updatedUsage); }
  catch (err) { console.warn("No se pudo guardar contador:", err); }

  return respond(200, { result, usage: currentCount + 1, limit, plan }, event);
};
