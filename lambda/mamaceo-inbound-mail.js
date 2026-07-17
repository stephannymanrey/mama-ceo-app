/**
 * Lambda: mamaceo-inbound-mail  (ES Module, Node 22)
 * Disparada por S3 (ObjectCreated), NO por API Gateway — no tiene JWT, no
 * tiene CORS, nadie desde un navegador la llama. El único "cliente" es SES
 * guardando un correo en el bucket de recepción. Ver lambda/MOVEMENTS-SYNC-DEPLOY.md.
 *
 * Modelo de confianza: cualquiera que conozca la dirección exacta
 * `<token>@mov.mamaceoapp.co` de una usuaria puede mandarle un correo — el
 * token (80 bits, ver _shared/token.mjs) es la única barrera, no hay
 * verificación de remitente. Por diseño, esto NUNCA crea un movimiento real
 * directamente: solo una entrada en la bandeja "por confirmar" que la
 * usuaria revisa a mano. Así, un correo falso o un intento de manipular el
 * prompt de la IA como mucho ensucia la bandeja de revisión — nunca toca
 * sus finanzas reales sin que ella lo confirme. No quites ese paso de
 * confirmación manual en el frontend sin repensar este modelo de amenaza.
 */
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { simpleParser } from "mailparser";
import { checkAndIncrUserDailyLimit } from "./_shared/rateLimit.mjs";
import { isNonEmptyString, isPositiveNumber } from "./_shared/validate.mjs";

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const TOKENS_TABLE = process.env.TOKENS_TABLE || "mamaceo_inbound_tokens";
const PENDING_TABLE = process.env.PENDING_TABLE || "mamaceo_pending_movements";
const RATE_LIMIT_TABLE = process.env.RATE_LIMIT_TABLE || PENDING_TABLE;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

const EMAILS_PER_USER_PER_DAY = 100; // generoso para uso real, bajo para frenar un token filtrado usado para spam
const MAX_BODY_CHARS = 6000;
const PENDING_TTL_DAYS = 30; // si nunca lo revisa, se autoelimina — no acumulamos contenido de correos bancarios indefinidamente
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function fetchRawEmail(bucket, key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function resolveUserId(token) {
  const result = await dynamo.send(new GetItemCommand({ TableName: TOKENS_TABLE, Key: marshall({ token }) }));
  return result.Item ? unmarshall(result.Item).user_id : null;
}

export function extractToken(toAddress) {
  // toAddress viene como "token@mov.mamaceoapp.co" (posiblemente con nombre, "Nombre <token@dominio>")
  const match = /([a-z0-9]+)@/i.exec(toAddress || "");
  return match ? match[1].toLowerCase() : null;
}

async function extractTransaction(bodyText) {
  const prompt = `Eres un extractor de datos de notificaciones bancarias. Analiza el siguiente correo y determina si es una notificación real de un movimiento bancario (ingreso o egreso de dinero).

Correo:
"""
${bodyText.slice(0, MAX_BODY_CHARS)}
"""

Si NO es una notificación de movimiento bancario real (publicidad, spam, un correo cualquiera, un resumen no transaccional), responde exactamente: {"is_transaction": false}

Si SÍ es una notificación de movimiento bancario real, responde con este JSON exacto (sin texto adicional, sin markdown):
{"is_transaction": true, "type": "income" o "expense", "amount": número positivo sin símbolos ni separadores de miles, "currency": código de 3 letras (COP, USD, MXN, etc. — el que mejor infieras), "date": "YYYY-MM-DD" o null si no la puedes determinar, "description": "descripción corta, máx 15 palabras, ej: comercio o persona involucrada"}

Responde SOLO el JSON, nada más.`;

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const data = await res.json();
  const rawText = data.content?.[0]?.text || "";
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Sin JSON en la respuesta");
  return JSON.parse(rawText.slice(start, end + 1));
}

// La IA puede alucinar o (si alguien manda un correo a propósito) intentar
// devolver algo fuera de forma — nunca se guarda nada que no pase esto,
// sin importar lo que haya respondido el modelo.
export function validateExtraction(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  if (!parsed.is_transaction) return null;
  if (!["income", "expense"].includes(parsed.type)) return null;
  const amount = Number(parsed.amount);
  if (!isPositiveNumber(amount) || amount > 1_000_000_000) return null;
  if (!isNonEmptyString(parsed.currency, 10)) return null;
  const date = DATE_RE.test(parsed.date || "") ? parsed.date : null;
  const description = isNonEmptyString(parsed.description, 300) ? parsed.description.slice(0, 300) : "Movimiento detectado";
  return { type: parsed.type, amount, currency: parsed.currency.slice(0, 10), date, description };
}

export const handler = async (event) => {
  for (const record of event.Records || []) {
    try {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
      const raw = await fetchRawEmail(bucket, key);
      const parsedMail = await simpleParser(raw);

      const toAddress = parsedMail.to?.value?.[0]?.address || "";
      const token = extractToken(toAddress);
      if (!token) { console.warn("Correo sin token reconocible en To:", toAddress); continue; }

      const userId = await resolveUserId(token);
      if (!userId) { console.warn("Token no asociado a ninguna usuaria:", token); continue; }

      const withinLimit = await checkAndIncrUserDailyLimit(dynamo, RATE_LIMIT_TABLE, userId, "inbound-mail", EMAILS_PER_USER_PER_DAY);
      if (!withinLimit) { console.warn("Límite diario de correos alcanzado para", userId); continue; }

      const bodyText = (parsedMail.text || parsedMail.html || "").trim();
      if (!bodyText) { console.warn("Correo sin contenido de texto legible"); continue; }
      if (!ANTHROPIC_KEY) { console.error("ANTHROPIC_API_KEY no configurada"); continue; }

      let extraction;
      try {
        extraction = validateExtraction(await extractTransaction(bodyText));
      } catch (err) {
        console.error("Error extrayendo con IA:", err.message);
        continue;
      }
      if (!extraction) { console.log("No es un movimiento bancario reconocible, se descarta."); continue; }

      const now = Date.now();
      await dynamo.send(new PutItemCommand({
        TableName: PENDING_TABLE,
        Item: marshall({
          user_id: userId,
          item_id: `pend#${now}-${Math.random().toString(36).slice(2, 8)}`,
          ...extraction,
          fromAddress: parsedMail.from?.value?.[0]?.address || "",
          snippet: bodyText.slice(0, 300),
          status: "pending",
          createdAt: now,
          ttl: Math.floor(now / 1000) + PENDING_TTL_DAYS * 24 * 60 * 60,
        }),
      }));
      console.log("Movimiento pendiente creado para", userId);
    } catch (err) {
      // Un correo mal formado no debe tumbar el procesamiento de los demás
      // registros del batch ni generar reintentos infinitos de S3.
      console.error("Error procesando registro:", err.message);
    }
  }
  return { statusCode: 200 };
};
