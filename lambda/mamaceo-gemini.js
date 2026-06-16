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
    const formatoLabel = { ig: "Reel de Instagram (máx 3 min)", youtube: "Video de YouTube (15-20 min)", podcast: "Podcast (~60 min)" }[ctx.formato || "ig"] || "video";
    const guionJSON = JSON.stringify(ctx.guionActual || {}, null, 2);
    return `Eres guionista refinando el guión de una mamá emprendedora.

${DIALECTO}

Guión actual de ${formatoLabel} sobre "${ctx.tema || ""}":
${guionJSON}

Instrucción de la usuaria: "${ctx.instruccion || ""}"

Aplica la instrucción. Si afecta una sección específica, solo modifica esa sección y deja las demás exactamente igual. Si es general, aplícala a todo el guión.

Reglas de escritura:
- Primera persona, como si ELLA lo dijera en voz alta
- Coloquial pero neutro — NO Argentina
- Sin emojis dentro del guión
- PROHIBIDO: "transforma tu vida", "potencial", "empoderar", "journey"
- Mantén el mismo número de secciones y sus nombres/tiempos originales

Responde SOLO JSON válido con el mismo formato, sin texto extra, sin markdown:
{"titulo":"...","secciones":[{"nombre":"...","tiempo":"...","guion":"..."}]}`;
  }

  if (type === "guion") {
    const formato   = ctx.formato || "ig";
    const tema      = ctx.tema || ctx.queOfreces || "";
    const queOfrece = ctx.queOfreces || "";
    const transf    = ctx.transformacion || "";

    const base = `Tema del video: "${tema}"
Negocio: ${queOfrece}
Transformación que logra con sus clientas: ${transf}
Habla a: ${nicho}
Tono: ${tono}

${DIALECTO}

Reglas de escritura CRÍTICAS:
- Escribe en primera persona como si ELLA lo estuviera diciendo en voz alta, natural
- Coloquial pero neutro — como habla una mamá con su mejor amiga en WhatsApp
- PROHIBIDO: "transforma tu vida", "alcanza el éxito", "potencial", "empoderar", "journey", "abundancia"
- PROHIBIDO: empezar con "¿Cansada de...?", "Si quieres...", "Llegó el momento de..."
- SÍ: situaciones concretas del día a día, emociones nombradas con precisión, momentos reales
- Sin emojis dentro del guión`;

    if (formato === "ig") {
      return `Eres guionista de Reels de Instagram para mamás emprendedoras en LatAm.
Escribe el guión COMPLETO Y LISTO PARA GRABAR de un Reel de máximo 3 minutos.

${base}

Estructura — 4 secciones, cada una completamente desarrollada:
1. Hook (0-15 seg, 1-2 oraciones): Arranca desde una situación real que detiene el scroll. Sin promesas genéricas.
2. Interés (15 seg - 1 min, 4-6 oraciones): Nombra el dolor con precisión. Que ella sienta "eso me pasa exactamente". Sin solución aún.
3. Deseo (1-2 min, 6-8 oraciones): Pinta la vida después. Escenas reales y concretas — su rutina, sus resultados, cómo se siente. Emocional pero creíble.
4. Llamada a Acción (últimos 30 seg, 1-2 oraciones): Una sola instrucción. Simple y directa.

Responde SOLO JSON válido, sin texto extra:
{"titulo":"título del video (sin comillas, max 10 palabras)","secciones":[{"nombre":"Hook","tiempo":"0-15 seg","guion":"..."},{"nombre":"Interés","tiempo":"15 seg - 1 min","guion":"..."},{"nombre":"Deseo","tiempo":"1-2 min","guion":"..."},{"nombre":"Llamada a Acción","tiempo":"últimos 30 seg","guion":"..."}]}`;
    }

    if (formato === "youtube") {
      return `Eres guionista de YouTube para mamás emprendedoras en LatAm.
Escribe el guión COMPLETO Y LISTO PARA GRABAR de un video de 15 a 20 minutos.

${base}

Estructura — 7 secciones con contenido completamente desarrollado para grabar:
1. Hook de apertura (0-1 min): Arranca con una situación concreta o historia personal que engancha desde el primer segundo.
2. Intro y contexto (1-3 min): Preséntate brevemente, explica qué van a aprender y por qué importa para ellas hoy.
3. Punto principal 1 (3-7 min): Primer insight clave con historia real, ejemplo o caso concreto. Desarrollado con detalle.
4. Punto principal 2 (7-12 min): Segundo insight con otro ejemplo o historia diferente. Que profundice en el tema.
5. Punto principal 3 (12-16 min): Tercer insight, el más accionable. Qué puede hacer ella hoy mismo.
6. Conclusión y síntesis (16-18 min): Resume los 3 puntos en 2-3 oraciones. Qué cambió en ella al entender esto.
7. CTA y cierre (18-20 min): Una sola instrucción clara. Cierra con algo personal y cercano.

Escribe texto corrido, NO bullet points. Cada sección debe tener mínimo 150 palabras.

Responde SOLO JSON válido, sin texto extra:
{"titulo":"título del episodio (max 12 palabras, sin comillas)","secciones":[{"nombre":"Hook de apertura","tiempo":"0-1 min","guion":"..."},{"nombre":"Intro y contexto","tiempo":"1-3 min","guion":"..."},{"nombre":"Punto 1","tiempo":"3-7 min","guion":"..."},{"nombre":"Punto 2","tiempo":"7-12 min","guion":"..."},{"nombre":"Punto 3","tiempo":"12-16 min","guion":"..."},{"nombre":"Conclusión","tiempo":"16-18 min","guion":"..."},{"nombre":"CTA y cierre","tiempo":"18-20 min","guion":"..."}]}`;
    }

    if (formato === "podcast") {
      return `Eres productora de podcast para mamás emprendedoras en LatAm.
Escribe el guión COMPLETO de un episodio de podcast de aproximadamente 60 minutos.

${base}

Estructura — 8 segmentos completamente desarrollados con texto listo para hablar:
1. Apertura y bienvenida (0-3 min): Saludo cálido, presenta el episodio y por qué decidiste grabar esto hoy.
2. Contexto del tema (3-8 min): Cuenta qué es este tema, por qué importa, y qué error común existe sobre él.
3. Tu historia con este tema (8-18 min): Una historia personal real y detallada — el antes, el momento de quiebre, el aprendizaje. Honesta.
4. Profundización 1 (18-28 min): Primer ángulo o subtema importante. Desarrollado con ejemplos, situaciones reales, casos de clientas.
5. Profundización 2 (28-38 min): Segundo ángulo. Más profundo. Puede incluir preguntas para que ella reflexione.
6. Profundización 3 (38-48 min): Tercer ángulo o lo más accionable del episodio. Qué puede hacer esta semana.
7. Reflexión y síntesis (48-55 min): Qué quieres que se lleven. La idea central en 3-4 oraciones.
8. Cierre y CTA (55-60 min): Despedida cercana, una sola acción concreta, y algo personal para terminar.

Escribe texto corrido, NO bullet points. Cada segmento mínimo 200 palabras. Tono conversacional — como si estuviera hablando en vivo.

Responde SOLO JSON válido, sin texto extra:
{"titulo":"título del episodio (max 10 palabras)","secciones":[{"nombre":"Apertura","tiempo":"0-3 min","guion":"..."},{"nombre":"Contexto del tema","tiempo":"3-8 min","guion":"..."},{"nombre":"Tu historia","tiempo":"8-18 min","guion":"..."},{"nombre":"Profundización 1","tiempo":"18-28 min","guion":"..."},{"nombre":"Profundización 2","tiempo":"28-38 min","guion":"..."},{"nombre":"Profundización 3","tiempo":"38-48 min","guion":"..."},{"nombre":"Reflexión y síntesis","tiempo":"48-55 min","guion":"..."},{"nombre":"Cierre y CTA","tiempo":"55-60 min","guion":"..."}]}`;
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
    return `Eres estratega de contenido para mamás emprendedoras en LatAm. Tu trabajo es generar ideas de contenido que se sientan ORIGINALES, ESPECÍFICAS y que ella quiera hacer ya.

Tema: "${ctx.keyword}"
Nicho: ${nicho}
Tono: ${tono}

${DIALECTO}

Genera 6 ideas para cada formato. Cada idea es un título o ángulo listo para usar:

- vertical: Reels / TikTok — 1 idea narrativa o de momento real que quepa en 60 segundos
- horizontal: YouTube / Podcast — episodio que promete UNA historia real o UN insight concreto y profundo
- carrusel: Post de Instagram con slides — que enseñe algo accionable paso a paso o cuente algo con datos
- story: Historia de Instagram — pregunta directa, detrás de escenas, o mini-tip conversacional
- digital: Producto digital (guía, plantilla, reto, mini-curso) — título que promete un resultado específico
- email: Asunto de email — corto, personal, como mensaje de una amiga, que genere curiosidad real
- whatsapp: Broadcast de WhatsApp — máximo 18 palabras, termina con 1 solo emoji natural

PROHIBIDO en todos los formatos:
- Fórmulas de plantilla: "N errores que...", "N razones por las que...", "N pasos para...", "Todo lo que nadie te dice sobre...", "La verdad sobre..."
- Empezar con "POV:", "Cómo X sin Y", "Así hago yo", "Descubrí que", "Lo que aprendí sobre"
- Frases genéricas: "mejorar tu negocio", "alcanzar el éxito", "vivir tus sueños", "potencial", "empoderar", "journey"
- Repetir la palabra clave del tema textualmente como título — escribe desde el ÁNGULO, no desde la etiqueta

LO QUE SÍ QUEREMOS:
- Títulos que cuenten una historia en pocas palabras o hagan una pregunta que incomoda
- Situaciones del día a día de una mamá emprendedora (recoger hijos, responder DMs, cobrar, etc.)
- Números concretos cuando apliquen (no inventados, pero reales)
- Que al leerlo ella piense "eso me pasó" o "eso quiero saber exactamente"

EJEMPLOS de lo que NO y SÍ (tema: "cobrar sin culpa"):
MAL vertical: "3 errores que cometes al cobrar sin culpa"
BIEN vertical: "Mandé la cotización y estuve 2 días esperando que me dijeran que era muy caro"

MAL horizontal: "Cómo cobrar sin culpa y transformar tu negocio"
BIEN horizontal: "Le bajé el precio una vez. Después me lo pidió en cada sesión — lo que aprendí de ese cliente"

MAL email: "Sobre cobrar sin culpa..."
BIEN email: "te cuento algo que me da pena admitir"

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

// ─── Handler ──────────────────────────────────────────────────────────────
export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || event?.httpMethod || "POST";
  if (method === "OPTIONS") return respond(200, "", event);

  const userId = getUserId(event);
  if (!userId) return respond(401, { error: "No autorizada" }, event);

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return respond(400, { error: "JSON inválido" }, event); }

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
    const match = rawText.match(/\{[\s\S]*\}/);
    result = JSON.parse(match ? match[0] : rawText);
  } catch {
    console.error("Parse error, raw:", rawText);
    return respond(502, { error: "Respuesta no válida. Intenta de nuevo." }, event);
  }

  const updatedUsage = { ...usage, [mk]: currentCount + 1 };
  try { await saveUsage(userId, updatedUsage); }
  catch (err) { console.warn("No se pudo guardar contador:", err); }

  return respond(200, { result, usage: currentCount + 1, limit, plan }, event);
};
