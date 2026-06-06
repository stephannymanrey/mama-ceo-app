/**
 * Lambda: mamaceo-gemini  (ES module, HTTP API v2)
 * Proxy seguro para Gemini — controla uso por plan, nunca expone la API key al cliente.
 * Despliega igual que mamaceo-user-data: mismo API Gateway, nueva ruta /mamaceo-gemini
 */
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const dynamo      = new DynamoDBClient({ region: "us-east-1" });
const TABLE       = process.env.TABLE_NAME   || "user_states";
const GEMINI_KEY  = process.env.GEMINI_API_KEY;
const GEMINI_URL  = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const ALLOWED_ORIGINS = [
  "https://www.mamaceoapp.co",
  "https://mamaceoapp.co",
  "http://localhost:5173",
  "http://localhost:5174",
];

// Límites mensuales de generaciones IA por plan
const PLAN_LIMITS = { free: 5, emprendedora: 60, ceo: 200, premium: 200 };

function corsHeaders(event) {
  const origin = event?.headers?.origin || event?.headers?.Origin || "";
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

function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function getUserPlanAndUsage(userId) {
  try {
    const r = await dynamo.send(new GetItemCommand({
      TableName: TABLE,
      Key: marshall({ user_id: userId }),
    }));
    if (!r.Item) return { plan: "free", usage: {} };
    const item = unmarshall(r.Item);
    let plan = "free";
    try {
      const appData = typeof item.data === "string" ? JSON.parse(item.data) : (item.data || {});
      plan = appData.userPlan || "free";
    } catch { /* leave as free */ }
    return { plan, usage: item.ai_usage || {} };
  } catch {
    return { plan: "free", usage: {} };
  }
}

async function saveUsage(userId, mk, newUsageMap) {
  await dynamo.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: marshall({ user_id: userId }),
    UpdateExpression: "SET ai_usage = :u",
    ExpressionAttributeValues: marshall({ ":u": newUsageMap }),
  }));
}

async function callGemini(prompt) {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.88, maxOutputTokens: 1400 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function buildPrompt(type, ctx) {
  const nicho = ctx.nicho  || ctx.clienteIdeal || "mamás emprendedoras";
  const tono  = ctx.tono   || "cercano y cálido";

  if (type === "guion") {
    return `Eres experta en marketing de contenido para mamás emprendedoras en LatAm.
Escribe frases auténticas para un guión de reel de 60 segundos.

Contexto:
- Ofrece/transforma: ${ctx.logro || ctx.queOfreces || ""}
- Dolor de su audiencia: ${ctx.dolor || ""}
- Cambio/resultado: ${ctx.cambio || ""}
- Objetivo del video: ${ctx.objetivo || "Vender"}
- Habla a: ${nicho}
- Tono: ${tono}

Escribe 3 variantes para cada escena:
1. hook: primeros 3 segundos — frase que detiene el scroll, hace pensar "eso me pasa"
2. interes: 12 seg — habla del dolor con empatía real, sin dar la solución aún
3. deseo: 30 seg — pinta la transformación, visual y emocional
4. accion: 10 seg — una sola instrucción simple y clara

Reglas IMPORTANTES:
- Lenguaje conversacional, auténtico, como una mamá colombiana habla con otra
- NUNCA uses: "transforma tu vida", "alcanza el éxito", "llegó el momento", "sin límites"
- SÍ usa: frases específicas al tema dado, emociones reales, situaciones concretas
- Máximo 35 palabras por variante
- Sin emojis en el texto

Responde SOLO JSON válido, sin texto extra, sin markdown:
{"hook":["v1","v2","v3"],"interes":["v1","v2","v3"],"deseo":["v1","v2","v3"],"accion":["v1","v2","v3"]}`;
  }

  if (type === "hooks") {
    return `Eres experta en hooks de contenido para mamás emprendedoras en LatAm.
Escribe hooks auténticos para un video sobre: "${ctx.tema}"
Audiencia: ${nicho}
Tono: ${tono}

Escribe 4 hooks para cada uno de estos 8 estilos:
- curiosidad: despierta intriga sin revelar todo
- dolor: habla directo a su frustración
- promesa: muestra resultado concreto y alcanzable
- pregunta: pregunta directa que la hace parar
- historia: POV o historia personal
- numero: lista o dato específico
- contraintuitivo: rompe una creencia común
- identidad: habla directo a mamás emprendedoras

Reglas:
- Lenguaje natural, español de LatAm, como mamás reales hablan
- Específico al tema "${ctx.tema}", NO genérico
- Máximo 20 palabras por hook
- Sin emojis

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

Reglas:
- Ideas concretas y creativas, NO genéricas
- En español de LatAm, natural y directo
- Que realmente resonarían con mamás emprendedoras
- Títulos específicos y accionables, no vaguedades
- Sin emojis en los títulos

Responde SOLO JSON válido, sin texto extra:
{"vertical":["i1","i2","i3","i4","i5","i6"],"horizontal":["i1","i2","i3","i4","i5","i6"],"carrusel":["i1","i2","i3","i4","i5","i6"],"story":["i1","i2","i3","i4","i5","i6"],"digital":["i1","i2","i3","i4","i5","i6"]}`;
  }

  return "";
}

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
  if (!["guion", "hooks", "ideas"].includes(type)) return respond(400, { error: "Tipo no soportado" }, event);
  if (!GEMINI_KEY) return respond(500, { error: "API key no configurada" }, event);

  // Verificar plan y uso
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

  // Llamar a Gemini
  const prompt = buildPrompt(type, context);
  let rawText;
  try {
    rawText = await callGemini(prompt);
  } catch (err) {
    console.error("Gemini error:", err);
    return respond(502, { error: "Error al contactar Gemini. Intenta de nuevo." }, event);
  }

  // Parsear JSON de la respuesta
  let result;
  try {
    const match = rawText.match(/\{[\s\S]*\}/);
    result = JSON.parse(match ? match[0] : rawText);
  } catch {
    console.error("Parse error, raw:", rawText);
    return respond(502, { error: "Respuesta de IA no válida. Intenta de nuevo." }, event);
  }

  // Incrementar contador de uso
  const updatedUsage = { ...usage, [mk]: currentCount + 1 };
  try { await saveUsage(userId, mk, updatedUsage); }
  catch (err) { console.warn("No se pudo guardar contador:", err); }

  return respond(200, {
    result,
    usage: currentCount + 1,
    limit,
    plan,
  }, event);
};
