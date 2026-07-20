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
// Debe reflejar los mismos tiers que src/lib/planGating.js (PLAN_ORDER) — si agregas
// o renombras un plan ahí, actualízalo también aquí. No se puede compartir el módulo
// directamente porque esta Lambda es deliberadamente "cero dependencias" (ver
// lambda/README.md), así que este es el único lugar del backend con este mapa.
// "mama" faltaba antes: una usuaria con el plan Mamá caía en PLAN_LIMITS.free (50/mes)
// en vez de tener su propio límite.
const PLAN_LIMITS = { free: 50, mama: 50, emprendedora: 60, ceo: 200, premium: 200 };

// Techos de tamaño para texto libre que se interpola en prompts de Claude.
// Sin esto, una sola request dentro de la cuota permitida podía mandar
// megabytes de texto (costo desproporcionado + superficie de prompt injection
// más grande de lo necesario). Generosos a propósito: el límite real de
// abuso es la cuota diaria/mensual, esto solo evita un request individual
// absurdo.
const MAX_TEXT_LEN     = 20000;  // ~ una sección larga de plan de negocio
const MAX_TRANSCRIPT_LEN = 150000; // ~ transcripción con timestamps de un video de hasta ~1h
const MAX_FRAME_LEN    = 2_000_000; // base64 de un frame JPEG 512px real pesa muchísimo menos

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
async function callClaude(prompt, maxTokens = 4096, prefill = null) {
  const messages = [{ role: "user", content: prompt }];
  if (prefill) messages.push({ role: "assistant", content: prefill });
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
      messages,
    }),
  });
  if (res.status === 429) throw new Error("rate_limit");
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  return prefill ? prefill + text : text;
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
  const nombre = ctx.nombre ? `Nombre de la fundadora: ${ctx.nombre}` : "";
  return `Eres una consultora de negocios especializada en elaborar planes de negocio formales para mamás emprendedoras de Latinoamérica. Tu misión es redactar un plan de negocio profesional, con mérito jurídico, apto para convocatorias de capital semilla, solicitudes de financiación e inversionistas ángel.

PERFIL DE LA EMPRENDEDORA:
${nombre}
- Historia personal: ${ctx.historia || ""}
- Habilidades: ${ctx.habilidades || ""}
- Pasiones: ${ctx.pasion || ""}
- Problemas que puede resolver: ${ctx.problemas || ""}
- Experiencia: ${ctx.experiencia || ""}
- Tiempo disponible: ${ctx.tiempo || ""}
- Meta de ingresos: ${ctx.ingresos || ""}
- Estilo de vida deseado: ${ctx.estiloVida || ""}

INSTRUCCIONES DE REDACCIÓN — OBLIGATORIAS:
- VOZ: Escribe en PRIMERA PERSONA DEL PLURAL empresarial. Usa siempre 'Ofrecemos', 'Desarrollamos', 'Nuestro modelo', 'Nuestra propuesta', 'Nos dirigimos a', 'Generamos', 'Contamos con'. NUNCA uses 'ella', 'la emprendedora', 'su negocio' ni segunda persona.
- TONO: Formal y profesional, como un documento que se presenta ante un banco, un fondo o una convocatoria gubernamental. Claro, preciso y sin frases vagas.
- CONTENIDO: Usa toda la información del perfil. Infiere y amplía con criterio empresarial — no inventes datos numéricos que no se puedan sustentar, pero sí construye argumentos sólidos a partir de lo que ella describió.
- NOMBRES: Propone un nombre de negocio concreto y memorable basado en lo que hace.
- FINANZAS: Basa las proyecciones en la meta de ingresos real mencionada. Desglosa con coherencia.
- PROHIBIDO en el texto: 'empoderar', 'potencial', 'journey', 'transformar tu vida', 'éxito que mereces', 'abundancia'.
- CRÍTICO para el JSON: NUNCA uses comillas dobles (") dentro de los valores — usa comillas simples (') si necesitas citar algo. NO incluyas saltos de línea literales; escribe texto corrido con puntos.

LONGITUDES OBJETIVO por campo (respétalas para que el documento sea completo sin truncarse):
- resumenEjecutivo: 150-180 palabras
- problema: 80-100 palabras
- solucion.descripcion: 80-100 palabras
- mercado.descripcion: 80-100 palabras
- modeloNegocio.descripcion: 80-100 palabras
- modeloNegocio.estructura: 60-80 palabras
- ventajaCompetitiva: 60-80 palabras
- estrategiaCrecimiento.embudo: exactamente 4 pasos (objetos con "paso" y "desc")
- impacto (cada sub-campo): 40-50 palabras
- proyeccionesFinancieras (cada año): objeto con 4 campos numéricos
- usoRecursos.descripcion: 60-80 palabras
- Arrays de strings: máximo 5 elementos, cada elemento máximo 15 palabras

Genera el plan con esta estructura exacta en JSON:

- nombreNegocio: string — nombre formal de la empresa (máx 5 palabras)
- resumenEjecutivo: string — presentación ejecutiva en primera persona: qué somos, a quién servimos, cómo generamos valor, modelo de ingresos y visión de crecimiento (150-180 palabras)
- problema: string — descripción del problema o necesidad del mercado que resolvemos, con contexto del mercado latinoamericano (80-100 palabras)
- solucion: objeto con 'descripcion' (string, 80-100 palabras describiendo la solución en primera persona), 'productos' (array de 3-5 strings, cada uno describiendo un producto o servicio concreto con su formato y público), 'areas' (array de 3-5 strings de 2-4 palabras con las áreas de trabajo)
- mercado: objeto con 'descripcion' (string, 80-100 palabras sobre el tamaño y características del mercado), 'mercadoObjetivo' (string, 40-50 palabras con perfil demográfico y psicográfico preciso), 'clienteIdeal' (array de 4-5 strings describiendo características concretas del cliente ideal)
- modeloNegocio: objeto con 'descripcion' (string, 80-100 palabras explicando el modelo en primera persona), 'lineasIngreso' (array de 3-5 OBJETOS, cada uno con "nombre" (string, nombre del producto/servicio), "precio" (string, ej: "$15/mes" o "$97 único pago"), "clientes" (string, proyección, ej: "40-60"), "total" (string, total mensual estimado, ej: "$800-1,000/mes")), 'estructura' (string, 60-80 palabras explicando cómo opera el negocio)
- ventajaCompetitiva: string — por qué nos elegirían a nosotros, qué nos diferencia concretamente de otras opciones del mercado (60-80 palabras)
- estrategiaCrecimiento: objeto con 'embudo' (array de exactamente 4 OBJETOS, cada uno con "paso" (string, 2-3 palabras, ej: "Atracción orgánica") y "desc" (string, máx 8 palabras describiendo la acción concreta)) y 'fases' (array de exactamente 3 strings con formato "Fase 1 (meses 1-4): objetivos concretos", "Fase 2 (meses 5-8): objetivos", "Fase 3 (meses 9-12): objetivos", cada uno máx 25 palabras)
- impacto: objeto que describe el impacto del NEGOCIO en sus CLIENTAS y en la comunidad — NO menciones a la fundadora por nombre ni su situación personal. Usa primera persona del plural empresarial o forma impersonal. Campos: 'economico' (string, 40-50 palabras sobre qué ingresos y bienestar económico generamos en nuestras clientas), 'familiar' (string, 40-50 palabras sobre cómo facilitamos el equilibrio familia-trabajo en nuestras clientas), 'educativo' (string, 40-50 palabras sobre formación y conocimientos que entregamos), 'emocional' (string, 40-50 palabras sobre la confianza y el bienestar que generamos en quienes trabajan con nosotros)
- proyeccionesFinancieras: objeto con 'año1', 'año2', 'año3' (cada uno un OBJETO con "clientes" (string, cantidad proyectada de clientes ese año), "ingresos" (string, ingresos totales anuales estimados), "costos" (string, costos operativos anuales estimados), "utilidad" (string, utilidad neta anual estimada)) y 'vision5anos' (string, 30-40 palabras sobre la escala del negocio a 5 años)
- usoRecursos: objeto con 'descripcion' (string, 60-80 palabras explicando para qué necesitamos financiación y qué impacto tendrá), 'categorias' (array de 3-5 OBJETOS con "categoria" (string, nombre breve de la categoría), "descripcion" (string, qué incluye, máx 6 palabras), "porcentaje" (string, ej: "30%"), "monto" (string, ej: "$6,000"))

Responde SOLO JSON válido, sin texto extra, sin markdown:`;
}

// ─── Handler público: Plan de Negocio ─────────────────────────────────────
const PLAN_DAILY_LIMIT = 150;
const PUBLIC_AI_DAILY_LIMIT = 150;

// Límite diario compartido por las rutas públicas (sin JWT) que llaman a Claude:
// mejorarSeccion/dofa/extractReels no tenían ningún control, así que cualquiera
// podía llamarlas en bucle y agotar el presupuesto de ANTHROPIC_KEY.
async function checkAndIncrDailyLimit(bucket, limit) {
  const today  = new Date().toISOString().slice(0, 10);
  const dayKey = `${bucket}_daily#${today}`;
  try {
    const dayRes = await dynamoCall("GetItem", { TableName: TABLE, Key: { user_id: { S: dayKey } } });
    if (dayRes?.Item) {
      const dayData = unmarshal(dayRes.Item);
      if ((dayData.count || 0) >= limit) return false;
    }
  } catch (err) { console.warn(`[${bucket}] No se pudo leer el contador diario:`, err.message); }
  try {
    await dynamoCall("UpdateItem", {
      TableName: TABLE,
      Key: { user_id: { S: dayKey } },
      UpdateExpression: "ADD #c :one SET #t = :type",
      ExpressionAttributeNames: { "#c": "count", "#t": "type" },
      ExpressionAttributeValues: { ":one": { N: "1" }, ":type": { S: "daily_counter" } },
    });
  } catch (err) { console.warn(`[${bucket}] No se pudo incrementar el contador diario:`, err.message); }
  return true;
}

async function handlePlanNegocio(publicEmail, context, event) {
  if (!ANTHROPIC_KEY) return respond(500, { error: "API key no configurada" }, event);

  const emailKey = `plan_pub#${publicEmail}`;
  const today    = new Date().toISOString().slice(0, 10);
  const dayKey   = `plan_daily#${today}`;

  // 1+2. Verificar email existente y límite diario en paralelo
  const [existingRes, dayRes] = await Promise.allSettled([
    dynamoCall("GetItem", { TableName: TABLE, Key: { user_id: { S: emailKey } } }),
    dynamoCall("GetItem", { TableName: TABLE, Key: { user_id: { S: dayKey } } }),
  ]);

  if (existingRes.status === "fulfilled" && existingRes.value.Item) {
    const item = unmarshal(existingRes.value.Item);
    if (item.plan) {
      return respond(200, { result: item.plan, emailSent: false, error: "ya_generado", plan: item.plan }, event);
    }
  }

  if (dayRes.status === "fulfilled" && dayRes.value.Item) {
    const dayData = unmarshal(dayRes.value.Item);
    if ((dayData.count || 0) >= PLAN_DAILY_LIMIT) {
      return respond(429, { error: "limite_diario" }, event);
    }
  }

  // 3. Generar el plan
  const prompt = buildPlanNegocioPrompt(context);
  let rawText;
  try {
    rawText = await callClaude(prompt, 6000, "{");
  } catch (err) {
    console.error("[planNegocio] Claude error:", err.message);
    if (err.message === "rate_limit") return respond(429, { error: "rate_limit" }, event);
    return respond(502, { error: "Error al generar el plan. Intenta de nuevo." }, event);
  }

  let planResult;
  try {
    let txt = (rawText || "").replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const start = txt.indexOf("{");
    const end = txt.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Sin bloque JSON");
    txt = txt.slice(start, end + 1);
    // Reparar saltos de línea/tabs literales dentro de strings (Claude los incluye con frecuencia)
    let fixed = "";
    let inStr = false, esc = false;
    for (const c of txt) {
      if (esc)                      { fixed += c; esc = false; }
      else if (c === "\\" && inStr) { fixed += c; esc = true; }
      else if (c === '"')           { inStr = !inStr; fixed += c; }
      else if (inStr && c === "\n") fixed += "\\n";
      else if (inStr && c === "\r") fixed += "\\r";
      else if (inStr && c === "\t") fixed += "\\t";
      else                          fixed += c;
    }
    planResult = JSON.parse(fixed);
  } catch(err) {
    console.error("[planNegocio] JSON parse error:", err.message, "| Raw (first 1200):", rawText?.slice(0, 1200));
    return respond(502, { error: "Respuesta no válida. Intenta de nuevo." }, event);
  }

  // 4+5. Guardar lead e incrementar contador en paralelo
  await Promise.allSettled([
    dynamoCall("PutItem", {
      TableName: TABLE,
      Item: {
        user_id:    { S: emailKey },
        email:      { S: publicEmail },
        nombre:     { S: context.nombre || "" },
        plan:       mv(planResult),
        createdAt:  { N: String(Date.now()) },
        type:       { S: "plan_lead" },
      },
    }),
    dynamoCall("UpdateItem", {
      TableName: TABLE,
      Key: { user_id: { S: dayKey } },
      UpdateExpression: "ADD #c :one SET #t = :type",
      ExpressionAttributeNames: { "#c": "count", "#t": "type" },
      ExpressionAttributeValues: { ":one": { N: "1" }, ":type": { S: "daily_counter" } },
    }),
  ]);

  // 6. Enviar email con Brevo — timeout 4s para no bloquear la respuesta
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

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": brevoKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          sender:      { name: "Mamá CEO", email: "hola@mamaceoapp.co" },
          to:          [{ email: publicEmail, name: context.nombre || "" }],
          subject:     `Tu plan de negocio está listo — ${nombreNegocio}`,
          htmlContent: htmlBody,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (brevoRes.ok) emailSent = true;
    } catch { /* no bloquear si el email falla o se agota el tiempo */ }
  }

  return respond(200, { result: planResult, emailSent }, event);
}

// ─── Handler: Mejorar sección ─────────────────────────────────────────────
async function handleMejorarSeccion(body, event) {
  if (!ANTHROPIC_KEY) return respond(500, { error: "API key no configurada" }, event);
  const { texto, seccion, negocio } = body;
  if (!texto?.trim()) return respond(400, { error: "Falta texto" }, event);
  if (texto.length > MAX_TEXT_LEN) return respond(400, { error: "Texto demasiado largo" }, event);
  if (!(await checkAndIncrDailyLimit("mejorarSeccion", PUBLIC_AI_DAILY_LIMIT))) {
    return respond(429, { error: "limite_diario" }, event);
  }

  const prompt = `Eres redactor especializado en planes de negocio formales para presentar ante inversionistas, fondos de capital semilla y convocatorias gubernamentales en Latinoamérica.

Empresa: ${negocio || "la empresa"}
Sección: ${seccion || "Plan de Negocio"}

Texto a mejorar:
${texto}

Instrucciones:
- Conserva TODOS los datos, cifras y hechos exactos sin excepción — no inventes ni elimines información
- Usa primera persona del plural empresarial: 'Ofrecemos', 'Nuestro modelo', 'Desarrollamos', 'Contamos con', 'Generamos'
- Tono formal y profesional — como documento para banco, fondo o convocatoria gubernamental
- Lenguaje claro, preciso y directo — sin frases vagas ni adjetivos vacíos
- Longitud similar al original o ligeramente mayor si mejora la claridad
- PROHIBIDO: 'empoderar', 'potencial', 'journey', 'transformar tu vida', 'abundancia'

Responde ÚNICAMENTE con el texto mejorado. Sin explicaciones, sin comillas al inicio o al final, sin markdown.`;

  try {
    const resultado = await callClaude(prompt, 1200);
    return respond(200, { resultado: resultado.trim() }, event);
  } catch (err) {
    console.error("[mejorarSeccion] error:", err.message);
    return respond(502, { error: "Error al mejorar el texto. Intenta de nuevo." }, event);
  }
}

// ─── Handler: DOFA ────────────────────────────────────────────────────────
async function handleDofa(body, event) {
  if (!ANTHROPIC_KEY) return respond(500, { error: "API key no configurada" }, event);
  const { plan } = body;
  if (!plan) return respond(400, { error: "Falta plan" }, event);
  if (JSON.stringify(plan).length > MAX_TEXT_LEN) return respond(400, { error: "Plan demasiado largo" }, event);
  if (!(await checkAndIncrDailyLimit("dofa", PUBLIC_AI_DAILY_LIMIT))) {
    return respond(429, { error: "limite_diario" }, event);
  }

  const ctx = [
    plan.nombreNegocio         && `Empresa: ${plan.nombreNegocio}`,
    plan.resumenEjecutivo      && `Resumen: ${plan.resumenEjecutivo}`,
    plan.problema              && `Problema que resuelve: ${plan.problema}`,
    plan.solucion?.descripcion && `Solución: ${plan.solucion.descripcion}`,
    plan.ventajaCompetitiva    && `Ventaja competitiva: ${plan.ventajaCompetitiva}`,
    plan.mercado?.descripcion  && `Mercado: ${plan.mercado.descripcion}`,
    plan.modeloNegocio?.descripcion && `Modelo: ${plan.modeloNegocio.descripcion}`,
  ].filter(Boolean).join("\n");

  const prompt = `Eres consultor estratégico especializado en análisis DOFA para pequeñas y medianas empresas de Latinoamérica.

Plan de negocio:
${ctx}

Genera un análisis DOFA completo, honesto y específico a este negocio. No uses frases genéricas que apliquen a cualquier empresa.

Reglas de contenido:
- Fortalezas: capacidades internas reales. Primera persona: 'Contamos con experiencia en...', 'Ofrecemos un modelo de...', 'Nuestra fundadora tiene...'
- Oportunidades: factores externos favorables del mercado. Impersonal: 'Mercado digital en expansión de...', 'Alta demanda de...'
- Debilidades: limitaciones internas honestas y específicas. Impersonal: 'Dependencia de redes sociales...', 'Requiere construcción de marca...'
- Amenazas: riesgos externos concretos. Impersonal: 'Alta competencia de plataformas globales', 'Volatilidad del tipo de cambio'
- Exactamente 4 puntos por cuadrante, máximo 12 palabras cada punto
- NUNCA uses comillas dobles (") dentro de los valores — usa comillas simples
- NO incluyas saltos de línea literales

Responde SOLO JSON válido:
{"fortalezas":["f1","f2","f3","f4"],"oportunidades":["o1","o2","o3","o4"],"debilidades":["d1","d2","d3","d4"],"amenazas":["a1","a2","a3","a4"]}`;

  let rawText;
  try {
    rawText = await callClaude(prompt, 800, "{");
  } catch (err) {
    console.error("[dofa] error:", err.message);
    return respond(502, { error: "Error al generar el análisis DOFA. Intenta de nuevo." }, event);
  }

  let dofa;
  try {
    let txt = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const start = txt.indexOf("{");
    const end   = txt.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Sin JSON");
    dofa = JSON.parse(txt.slice(start, end + 1));
  } catch (err) {
    console.error("[dofa] JSON parse error:", err.message, rawText?.slice(0, 400));
    return respond(502, { error: "Respuesta no válida. Intenta de nuevo." }, event);
  }

  return respond(200, { dofa }, event);
}

// ─── Handler: Extraer fragmentos virales para Reels ───────────────────────
// Ruta autenticada (ver dispatch en handler): cuenta contra el límite mensual
// de generaciones de IA del plan real de la usuaria, igual que guion/hooks/ideas.
async function handleExtractReels(body, event, userId) {
  if (!ANTHROPIC_KEY) return respond(500, { error: "API key no configurada" }, event);
  const { transcription, duration } = body;
  if (!transcription?.trim()) return respond(400, { error: "Falta transcripción" }, event);
  if (transcription.length > MAX_TRANSCRIPT_LEN) return respond(400, { error: "Transcripción demasiado larga" }, event);

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

  const durMin = Math.round((duration || 0) / 60);

  const prompt = `Eres experta en contenido viral para Instagram Reels y TikTok de Latinoamérica, especializada en mamás emprendedoras y mujeres de negocios.

Video de ${durMin} minuto${durMin !== 1 ? "s" : ""}. Transcripción con timestamps en segundos:

${transcription}

Extrae exactamente 6 fragmentos para Reels. Criterios de selección:
- Momentos con gancho emocional fuerte o revelación personal
- Tips accionables y directos
- Historias o testimonios concretos
- Frases memorables que generen identificación
- Cada fragmento: entre 25 y 90 segundos, coherente y completo
- No cortes en medio de una oración — el fragmento debe tener inicio y cierre claros
- Añade 2 segundos de margen al inicio y 2 al final
- Variedad: evita fragmentos consecutivos o muy similares en tema

Responde SOLO JSON válido, sin texto extra, sin markdown:
[{"titulo":"string (4-6 palabras)","inicio":number,"fin":number,"hook":"string (gancho en máx 12 palabras)","por_que":"string (razón viral en máx 10 palabras)"}]`;

  let rawText;
  try {
    rawText = await callClaude(prompt, 1200, "[");
  } catch (err) {
    console.error("[extractReels] callClaude error:", err.message);
    return respond(502, { error: "Error al analizar el video. Intenta de nuevo." }, event);
  }

  let fragmentos;
  try {
    let txt = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const si = txt.indexOf("["), ei = txt.lastIndexOf("]");
    if (si === -1 || ei === -1) throw new Error("No JSON array");
    fragmentos = JSON.parse(txt.slice(si, ei + 1));
    fragmentos = fragmentos.filter(f =>
      typeof f.inicio === "number" && typeof f.fin === "number" && f.fin > f.inicio + 5
    );
    if (!fragmentos.length) throw new Error("Sin fragmentos válidos");
  } catch (err) {
    console.error("[extractReels] parse error:", err.message, rawText?.slice(0, 300));
    return respond(502, { error: "No se pudo interpretar la respuesta. Intenta de nuevo." }, event);
  }

  const updatedUsage = { ...usage, [mk]: currentCount + 1 };
  try { await saveUsage(userId, updatedUsage); }
  catch (err) { console.warn("No se pudo guardar contador:", err); }

  return respond(200, { fragmentos, usage: currentCount + 1, limit, plan }, event);
}

async function handleGenerateCards(body, event, userId) {
  if (!ANTHROPIC_KEY) return respond(500, { error: "API key no configurada" }, event);
  const { transcription, duration } = body;
  if (!transcription?.trim()) return respond(400, { error: "Falta transcripción" }, event);
  if (transcription.length > MAX_TRANSCRIPT_LEN) return respond(400, { error: "Transcripción demasiado larga" }, event);

  const { plan, usage } = await getUserPlanAndUsage(userId);
  const mk = monthKey();
  const currentCount = usage[mk] || 0;
  const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  if (currentCount >= limit) {
    return respond(429, { error: "limite_alcanzado", usage: currentCount, limit, plan,
      message: `Llegaste al límite de ${limit} generaciones este mes.` }, event);
  }

  const durSec = Math.round(duration || 0);
  const maxCards = durSec < 60 ? 3 : durSec < 180 ? 4 : 6;

  const prompt = `Eres editora de video experta en el estilo "editorial/documental" para Reels y TikTok: video de una persona hablando a cámara, interrumpido por tarjetas de texto a pantalla completa que marcan cada punto o capítulo clave (como un titular de revista).

Video de ${durSec} segundos. Transcripción con timestamps en segundos:

${transcription}

Sugiere entre 3 y ${maxCards} tarjetas de texto para este video. Criterios:
- Cada tarjeta marca el inicio de un punto, idea o capítulo nuevo — no un resumen genérico
- Texto corto y directo: máximo 6 palabras, como un titular
- keyword: UNA palabra o frase corta dentro de "texto" que se debe destacar visualmente (o "" si no aplica)
- startTime: el segundo exacto (según los timestamps) donde debe aparecer la tarjeta, coincidiendo con el inicio de esa idea
- Deja al menos 4 segundos entre el startTime de una tarjeta y la siguiente
- No pongas una tarjeta en los primeros 2 segundos del video

Responde SOLO JSON válido, sin texto extra, sin markdown:
[{"texto":"string (máx 6 palabras)","keyword":"string o vacío","startTime":number}]`;

  let rawText;
  try {
    rawText = await callClaude(prompt, 800, "[");
  } catch (err) {
    console.error("[generateCards] callClaude error:", err.message);
    return respond(502, { error: "Error al generar las tarjetas. Intenta de nuevo." }, event);
  }

  let tarjetas;
  try {
    let txt = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const si = txt.indexOf("["), ei = txt.lastIndexOf("]");
    if (si === -1 || ei === -1) throw new Error("No JSON array");
    tarjetas = JSON.parse(txt.slice(si, ei + 1));
    tarjetas = tarjetas.filter(t =>
      typeof t.texto === "string" && t.texto.trim() &&
      typeof t.startTime === "number" && t.startTime >= 0 &&
      (!duration || t.startTime < duration)
    ).map(t => ({
      texto: t.texto.trim().slice(0, 80),
      keyword: typeof t.keyword === "string" ? t.keyword.trim().slice(0, 40) : "",
      startTime: Math.round(t.startTime * 10) / 10,
    }));
    if (!tarjetas.length) throw new Error("Sin tarjetas válidas");
  } catch (err) {
    console.error("[generateCards] parse error:", err.message, rawText?.slice(0, 300));
    return respond(502, { error: "No se pudo interpretar la respuesta. Intenta de nuevo." }, event);
  }

  const updatedUsage = { ...usage, [mk]: currentCount + 1 };
  try { await saveUsage(userId, updatedUsage); }
  catch (err) { console.warn("No se pudo guardar contador:", err); }

  return respond(200, { tarjetas, usage: currentCount + 1, limit, plan }, event);
}

// ─── Handler: Analizar estilo visual de un video de referencia ───────────
async function handleAnalyzeStyle(body, event, userId) {
  if (!ANTHROPIC_KEY) return respond(500, { error: "API key no configurada" }, event);
  const { frames, format, duration } = body;
  if (!frames?.length) return respond(400, { error: "Falta frames" }, event);
  if (frames.some(f => typeof f !== "string" || f.length > MAX_FRAME_LEN)) {
    return respond(400, { error: "Frame demasiado pesado" }, event);
  }

  let plan = "free", usage = {}, currentCount = 0, limit = 99999;
  if (userId) {
    const r = await getUserPlanAndUsage(userId);
    plan = r.plan; usage = r.usage;
    const mk = monthKey();
    currentCount = usage[mk] || 0;
    // Límite por plan: free/mama=10, emprendedora=20, ceo/premium=50 análisis de estilo/mes
    const styleLimits = { free: 10, mama: 10, emprendedora: 20, ceo: 50, premium: 50 };
    limit = styleLimits[plan] ?? 10;
    if (currentCount >= limit) {
      return respond(429, { error: "limite_alcanzado", usage: currentCount, limit, plan,
        message: `Llegaste al límite de ${limit} análisis de estilo este mes. Actualiza tu plan para más.` }, event);
    }
  } else {
    // Sin JWT: límite diario compartido de 30 análisis (protege el budget sin bloquear el flujo)
    const ok = await checkAndIncrDailyLimit("analyzeStyle_pub", 30);
    if (!ok) return respond(429, { error: "limite_diario", message: "Límite diario de análisis alcanzado. Intenta mañana o inicia sesión." }, event);
  }

  const imageContent = frames.slice(0, 3).map(f => ({
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data: f },
  }));
  const formatLabel = format === "portrait" ? "vertical 9:16" : format === "square" ? "cuadrado 1:1" : "horizontal 16:9";

  const messages = [{
    role: "user",
    content: [
      ...imageContent,
      {
        type: "text",
        text: `Eres un editor de video experto analizando el estilo de edición de contenido para redes sociales. Los ${frames.length} frames son del mismo video.

Formato: ${formatLabel} | Duración: ${Math.round(duration || 0)}s

Analiza TODO lo que ves con libertad — no te limites a categorías predefinidas. Describe el estilo real del video.

Devuelve SOLO JSON válido, sin texto extra:
{
  "videoPreset":"warm|natural|vibrant|fresh|cinema|none",
  "musicGenre":"motivacional|calmante|energetico|corporativo",
  "hasCards":true/false,
  "cardPosition":"fullscreen|pill",
  "format":"${format || "portrait"}",
  "editingVibe":"frase 5-7 palabras que captura la esencia del estilo",
  "colorDesc":"descripción colores 3-5 palabras",
  "bokeh":true/false,
  "transition":"cut|smooth|zoom|fade",
  "editingPace":"fast|medium|slow",
  "description":"Descripción libre y detallada de TODO lo que ves en el estilo (60-90 palabras en español). Menciona: tipo de planos, movimiento de cámara, efectos especiales, tipografía/texto, overlays, stickers, filtros, ritmo de corte, energía, narración, si hay música visible en pantalla, uso del espacio, cualquier característica visual o técnica notable.",
  "extras":["hasta 5 strings con características adicionales detectadas que no caben en los campos anteriores — efectos concretos, técnicas, elementos visuales únicos"]
}

Criterios campos estructurados:
- videoPreset: warm=tonos cálidos/dorados, natural=neutro/limpio, vibrant=muy saturado, fresh=tonos fríos/azules, cinema=oscuro/alto contraste, none=sin filtro notable
- musicGenre: motivacional=upbeat inspiracional, calmante=suave/lifestyle, energetico=beats rápidos/baile, corporativo=profesional/negocios
- hasCards: true si hay texto/tarjetas superpuestas al video (NO solo subtítulos en la parte baja)
- bokeh: true si hay fondo borroso/depth-of-field visible
- transition: cut=cortes directos, smooth=fundidos suaves, zoom=zoom in/out, fade=fundido a negro
- editingPace: fast=clips <2s muy dinámico, slow=clips >5s pausado, medium=ritmo normal`,
      },
    ],
  }];

  let rawText;
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01", "x-api-key": ANTHROPIC_KEY },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 800, messages }),
    });
    if (!res.ok) throw new Error(`Claude ${res.status}`);
    const data = await res.json();
    rawText = data.content?.[0]?.text || "";
  } catch (err) {
    console.error("[analyzeStyle] Claude error:", err.message);
    return respond(502, { error: "No se pudo analizar el video. Intenta de nuevo." }, event);
  }

  let analysis;
  try {
    let txt = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const s = txt.indexOf("{"), e = txt.lastIndexOf("}");
    if (s === -1 || e === -1) throw new Error("No JSON");
    analysis = JSON.parse(txt.slice(s, e + 1));
  } catch (err) {
    console.error("[analyzeStyle] parse error:", err.message, rawText?.slice(0, 200));
    return respond(502, { error: "Respuesta no válida. Intenta de nuevo." }, event);
  }

  if (userId) {
    const mk = monthKey();
    try { await saveUsage(userId, { ...usage, [mk]: currentCount + 1 }); } catch {}
  }
  return respond(200, { analysis }, event);
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
  if (body.type === "mejorarSeccion" && body.publicEmail) {
    return handleMejorarSeccion(body, event);
  }
  if (body.type === "dofa" && body.publicEmail) {
    return handleDofa(body, event);
  }
  // Ruta semi-pública: análisis de estilo visual — funciona sin JWT, tracking opcional
  if (body.type === "analyzeStyle") {
    return handleAnalyzeStyle(body, event, getUserId(event) || null);
  }

  const userId = getUserId(event);
  if (!userId) return respond(401, { error: "No autorizada" }, event);

  // A diferencia de planNegocio/mejorarSeccion/dofa (pensadas para el flujo
  // público de plan de negocio, sin cuenta), extractReels se usa desde el
  // editor de video con sesión iniciada — cuenta contra el límite mensual
  // real del plan de la usuaria en vez de un tope genérico compartido.
  if (body.type === "extractReels") {
    return handleExtractReels(body, event, userId);
  }
  if (body.type === "generateCards") {
    return handleGenerateCards(body, event, userId);
  }

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
