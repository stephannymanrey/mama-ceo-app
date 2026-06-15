/**
 * Lambda: mamaceo-gemini  (ES module, Node.js 22.x)
 * Sin dependencias externas — usa fetch nativo + AWS SigV4 manual para DynamoDB.
 */
import { createHmac, createHash } from "node:crypto";

const TABLE       = process.env.TABLE_NAME    || "user_states";
const GEMINI_KEY  = process.env.GEMINI_API_KEY;
const GEMINI_URL  = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const REGION      = process.env.AWS_REGION    || "us-east-1";
const PLAN_LIMITS = { free: 5, emprendedora: 60, ceo: 200, premium: 200 };

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
      plan = appData.userPlan || "free";
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

// ─── Gemini ───────────────────────────────────────────────────────────────
async function callGemini(prompt) {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.88, maxOutputTokens: 2500 },
    }),
  });
  if (res.status === 429) throw new Error("rate_limit");
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ─── Prompts ──────────────────────────────────────────────────────────────
function buildPrompt(type, ctx) {
  const nicho = ctx.nicho || ctx.clienteIdeal || "mamás emprendedoras";
  const tono  = ctx.tono  || "cercano y cálido";

  if (type === "guion") {
    return `Eres experta en copywriting de video para mamás emprendedoras en LatAm.
Escribe el guión de un reel de 60 segundos que suene como una mamá real hablando, no como un anuncio.

Contexto del negocio:
- Lo que ofrece/logra: ${ctx.logro || ctx.queOfreces || ""}
- Dolor real de su audiencia: ${ctx.dolor || ""}
- Transformación/resultado: ${ctx.cambio || ""}
- Objetivo del video: ${ctx.objetivo || "Vender"}
- Habla a: ${nicho}
- Tono: ${tono}

Escribe 3 variantes para cada escena. Cada variante debe ser diferente en enfoque:

1. hook (3 seg): Detiene el scroll. Arranca desde una situación, emoción o pregunta — nunca desde una promesa genérica.
2. interes (12 seg): Nombra el dolor con precisión. Que ella sienta "así me pasa exactamente". Sin solución aún.
3. deseo (30 seg): Pinta la vida después. Concreto, visual, emocional — no "vas a lograr el éxito" sino una escena real.
4. accion (10 seg): Una sola instrucción. Simple, directa, sin presión.

Reglas CRÍTICAS:
- Habla como una mamá colombiana le habla a otra en WhatsApp — sin dramatismo, sin grandilocuencia
- PROHIBIDO: "transforma tu vida", "alcanza el éxito", "llegó el momento", "sin límites", "potencial", "empoderar", "journey"
- PROHIBIDO: frases que empiecen con "Si quieres...", "¿Cansada de...?", "Llegó el momento de..."
- SÍ: situaciones concretas, números reales, momentos del día a día, emociones nombradas con exactitud
- Máximo 30 palabras por variante
- Sin emojis

Ejemplos de lo que NO hacer:
MAL hook: "¿Lista para transformar tu negocio y vivir la vida que mereces?"
MAL deseo: "Imagina una vida llena de éxito, libertad y abundancia"

Ejemplos de lo que SÍ hacer:
BIEN hook: "El mes pasado rechacé un cliente y fue la mejor decisión del año"
BIEN deseo: "Hoy recojo a mi hijo a las 3, cierro ventas desde el carro, y no le debo explicaciones a nadie"

Responde SOLO JSON válido, sin texto extra, sin markdown:
{"hook":["v1","v2","v3"],"interes":["v1","v2","v3"],"deseo":["v1","v2","v3"],"accion":["v1","v2","v3"]}`;
  }

  if (type === "hooks") {
    return `Eres experta en hooks de video para mamás emprendedoras en LatAm.
El video trata sobre: "${ctx.tema}"
Audiencia: ${nicho}
Tono: ${tono}

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
    return `Eres estratega de contenido para mamás emprendedoras en LatAm.
Genera ideas de contenido originales y específicas sobre: "${ctx.keyword}"
Nicho: ${nicho}
Tono: ${tono}

Genera 6 ideas para cada formato:
- vertical: Reels / TikTok — videos cortos de impacto
- horizontal: YouTube / Podcast — contenido largo y profundo
- carrusel: Posts de Instagram con múltiples slides
- story: Historias de Instagram o Facebook
- digital: Producto digital (guía, plantilla, curso, challenge)
- email: Asunto de email de nurturing — personal, conversacional, como carta a una amiga
- whatsapp: Mensaje para broadcast de WhatsApp — corto, directo, con 1 emoji al final natural

Reglas:
- Títulos específicos y concretos — nada de "Cómo mejorar tu negocio" o "Transforma tu vida"
- Que al leerlo ella piense "eso es exactamente lo que necesito saber"
- En español de LatAm, como habla una mamá emprendedora real
- Incluye números, situaciones o resultados concretos cuando aplique
- Sin emojis en los títulos de vertical/horizontal/carrusel/story/digital
- Para email: sin emojis, asunto corto que genere curiosidad genuina
- Para whatsapp: máximo 20 palabras, termina con 1 solo emoji relevante
- PROHIBIDO: "transformar", "potencial", "empoderar", "journey", "el éxito que mereces"

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
  if (!["guion", "hooks", "ideas", "leadmagnet"].includes(type)) return respond(400, { error: "Tipo no soportado" }, event);
  if (!GEMINI_KEY) return respond(500, { error: "API key no configurada" }, event);

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
  let rawText;
  try {
    rawText = await callGemini(prompt);
  } catch (err) {
    if (err.message === "rate_limit") {
      return respond(429, { error: "rate_limit" }, event);
    }
    console.error("Gemini error:", err);
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
