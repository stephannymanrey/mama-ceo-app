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
async function callClaude(prompt) {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": ANTHROPIC_KEY,
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2500,
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
function buildPrompt(type, ctx) {
  const nicho = ctx.nicho || ctx.clienteIdeal || "mamás emprendedoras";
  const tono  = ctx.tono  || "cercano y cálido";

  if (type === "guion") {
    return `Eres guionista de video para mamás emprendedoras en LatAm. Tu trabajo es escribir guiones COMPLETOS, LISTOS PARA GRABAR, que suenen como una conversación real — no como un anuncio ni un texto de ventas.

Contexto del negocio:
- Lo que ofrece/logra: ${ctx.logro || ctx.queOfreces || ""}
- Dolor real de su audiencia: ${ctx.dolor || ""}
- Transformación/resultado: ${ctx.cambio || ""}
- Objetivo del video: ${ctx.objetivo || "Vender"}
- Habla a: ${nicho}
- Tono: ${tono}

Escribe 3 variantes COMPLETAS del guión. Cada variante tiene 4 partes. Cada parte debe estar COMPLETAMENTE DESARROLLADA — no resúmenes, sino el texto exacto que se va a grabar:

1. hook (1-2 oraciones, ~15 palabras): Arranca desde una situación concreta o momento real que detiene el scroll. Nada de promesas. Nada de preguntas genéricas.

2. interes (4-6 oraciones, ~60 palabras): Describe con precisión el dolor o situación que ella vive. Nombra detalles específicos del día a día. Que sienta "así me pasa exactamente a mí". Todavía SIN solución.

3. deseo (6-9 oraciones, ~100 palabras): Pinta la vida después de trabajar contigo. Escenas reales y concretas — qué hace por la mañana, qué siente cuando cierra una venta, cómo cambia su rutina. Emocional pero creíble. Sin frases vacías.

4. accion (1-2 oraciones, ~20 palabras): Una sola instrucción clara. Sin urgencia falsa ni presión.

Reglas CRÍTICAS:
- Escribe en primera persona como si ELLA lo estuviera diciendo, en voz alta, natural
- Español de LatAm coloquial — como habla una mamá con su mejor amiga
- PROHIBIDO: "transforma tu vida", "alcanza el éxito", "llegó el momento", "potencial", "empoderar", "journey", "abundancia", "merezco"
- PROHIBIDO: empezar con "¿Cansada de...?", "Si quieres...", "Llegó el momento de...", "¿Sabías que...?"
- PROHIBIDO: frases que podrían aplicar a cualquier negocio — sé específica al contexto dado
- Las 3 variantes deben ser COMPLETAMENTE DIFERENTES en enfoque, emoción y estructura — no la misma idea con otras palabras
- Sin emojis

EJEMPLOS de tono y longitud correctos:

hook MAL: "¿Lista para transformar tu vida y vivir sin límites?"
hook BIEN: "Hace seis meses tenía tres clientes y sentía que les estaba fallando a los tres"

interes MAL: "Sé que estás cansada de no lograr tus metas"
interes BIEN: "Te quedas hasta las 11 de la noche respondiendo mensajes, revisas el celular antes de levantarte, aceptas pagos que no alcanza y de todas formas sientes que no estás haciendo suficiente. Llevas meses así y ya no sabes si es el negocio o eres tú."

deseo MAL: "Imagina una vida de libertad y éxito donde logras todo lo que quieres"
deseo BIEN: "El martes pasado cerré en la mañana, recogí a mi hija a las 2, fuimos a caminar y no revisé el celular hasta las 5. Tenía tres pagos confirmados esperándome. Eso no pasó de un día para otro pero sí pasó, y no tuve que sacrificar a mi familia para lograrlo."

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
    return `Eres estratega de contenido para mamás emprendedoras en LatAm. Tu trabajo es generar ideas de contenido que se sientan ORIGINALES, ESPECÍFICAS y que ella quiera hacer ya.

Tema: "${ctx.keyword}"
Nicho: ${nicho}
Tono: ${tono}

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
  let rawText;
  try {
    rawText = await callClaude(prompt);
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
