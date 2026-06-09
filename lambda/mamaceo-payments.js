/**
 * Lambda: mamaceo-payments  (ES Module — para index.mjs en Node 22)
 * Acción se pasa en body.action, excepto el webhook de Hotmart que se detecta
 * por el campo `event` en el body.
 *
 * Variables de entorno requeridas:
 *   HOTMART_HOTTOK    — Token de verificación del webhook de Hotmart
 *   HOTMART_OFFER_MAP — JSON: {"offerCode":"mama","offerCode2":"emprendedora",...}
 *   PAYPAL_CLIENT_ID  — Client ID live de PayPal (backup)
 *   PAYPAL_SECRET     — Client Secret live de PayPal (backup)
 *   APP_BASE_URL      — URL de la app, ej: https://www.mamaceoapp.co
 *   DYNAMODB_TABLE    — nombre de la tabla DynamoDB (ej: user_states)
 */

import https from "https";
import { DynamoDBClient, UpdateItemCommand, ScanCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const TABLE  = process.env.DYNAMODB_TABLE || "user_states";

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

async function getPayPalToken() {
  const creds = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString("base64");
  const res = await httpsRequest(
    "https://api-m.paypal.com/v1/oauth2/token",
    { method: "POST", headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" } },
    "grant_type=client_credentials"
  );
  return res.body.access_token;
}

async function findUserIdByEmail(email) {
  const result = await dynamo.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: "userEmail = :e",
    ExpressionAttributeValues: { ":e": { S: email.toLowerCase() } },
    ProjectionExpression: "userId",
  }));
  return result.Items?.[0]?.userId?.S || null;
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || "POST";
  if (method === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch {}

  const action = body.action;
  const userId =
    event.requestContext?.authorizer?.jwt?.claims?.sub ||
    event.requestContext?.authorizer?.claims?.sub ||
    null;

  // ── 1. Guardar email del usuario (llamado desde el frontend al abrir precios) ─
  if (action === "save-email") {
    const { userId: uid, email } = body;
    if (!uid || !email)
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Faltan campos" }) };
    try {
      await dynamo.send(new UpdateItemCommand({
        TableName: TABLE,
        Key: { userId: { S: uid } },
        UpdateExpression: "SET userEmail = :e",
        ExpressionAttributeValues: { ":e": { S: email.toLowerCase() } },
      }));
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      console.error("save-email error:", e.message);
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
    }
  }

  // ── 2. Webhook de Hotmart ──────────────────────────────────────────────────
  // Hotmart envía: { event: "PURCHASE_APPROVED", data: { buyer, purchase, product, offer } }
  // El hottok viene como query param: ?hottok=XXX
  const isHotmartWebhook = body.event && body.data?.buyer;
  if (isHotmartWebhook) {
    const hottok = event.headers?.["x-hotmart-webhook-token"] ||
                   event.headers?.["X-Hotmart-Webhook-Token"] ||
                   event.queryStringParameters?.hottok;
    if (process.env.HOTMART_HOTTOK && hottok !== process.env.HOTMART_HOTTOK) {
      console.error("Hotmart hottok inválido:", hottok);
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    const eventType   = body.event;         // "PURCHASE_APPROVED", "SUBSCRIPTION_CANCELLATION", etc.
    const buyerEmail  = body.data?.buyer?.email;
    const offerCode   = body.data?.offer?.code;
    const purchStatus = body.data?.purchase?.status; // "APPROVED", "CANCELED", "REFUNDED"

    console.log(`Hotmart webhook: event=${eventType} email=${buyerEmail} offer=${offerCode} status=${purchStatus}`);

    // Mapear offerCode → planType
    let offerMap = {};
    try { offerMap = JSON.parse(process.env.HOTMART_OFFER_MAP || "{}"); } catch {}
    const planType = offerMap[offerCode];

    if (!buyerEmail)
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ received: true, note: "sin email" }) };

    // Activar o desactivar plan según el evento
    const isApproved = ["PURCHASE_APPROVED", "PURCHASE_COMPLETE"].includes(eventType) ||
                       purchStatus === "APPROVED";
    const isCanceled = ["SUBSCRIPTION_CANCELLATION", "PURCHASE_REFUNDED", "PURCHASE_CANCELED"].includes(eventType) ||
                       ["CANCELED", "REFUNDED"].includes(purchStatus);

    let foundUserId = null;
    try { foundUserId = await findUserIdByEmail(buyerEmail); } catch (e) { console.error("Scan error:", e.message); }

    if (!foundUserId) {
      // Guardar activación pendiente por email para cuando el usuario inicie sesión
      console.log(`Usuario no encontrado para email ${buyerEmail} — guardando activación pendiente`);
      try {
        await dynamo.send(new UpdateItemCommand({
          TableName: TABLE,
          Key: { userId: { S: `pending_${buyerEmail.toLowerCase()}` } },
          UpdateExpression: "SET userEmail = :e, pendingPlan = :p, pendingExpiresAt = :x, updatedAt = :u",
          ExpressionAttributeValues: {
            ":e": { S: buyerEmail.toLowerCase() },
            ":p": { S: isApproved ? (planType || "mama") : "free" },
            ":x": { N: String(isApproved ? Date.now() + 35 * 24 * 60 * 60 * 1000 : 0) },
            ":u": { N: String(Date.now()) },
          },
        }));
      } catch (e) { console.error("pending save error:", e.message); }
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ received: true, note: "activación pendiente guardada" }) };
    }

    // Usuario encontrado — actualizar plan directamente
    try {
      if (isApproved && planType) {
        const premiumExpiresAt = Date.now() + 35 * 24 * 60 * 60 * 1000; // 35 días (buffer para renovación)
        await dynamo.send(new UpdateItemCommand({
          TableName: TABLE,
          Key: { userId: { S: foundUserId } },
          UpdateExpression: "SET userPlan = :p, premiumExpiresAt = :e, hotmartEmail = :he",
          ExpressionAttributeValues: {
            ":p":  { S: planType },
            ":e":  { N: String(premiumExpiresAt) },
            ":he": { S: buyerEmail.toLowerCase() },
          },
        }));
        console.log(`Plan activado: userId=${foundUserId} plan=${planType}`);
      } else if (isCanceled) {
        await dynamo.send(new UpdateItemCommand({
          TableName: TABLE,
          Key: { userId: { S: foundUserId } },
          UpdateExpression: "SET userPlan = :p, premiumExpiresAt = :e",
          ExpressionAttributeValues: {
            ":p": { S: "free" },
            ":e": { N: "0" },
          },
        }));
        console.log(`Plan cancelado: userId=${foundUserId}`);
      }
    } catch (e) { console.error("DynamoDB update error:", e.message); }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ received: true }) };
  }

  // ── 3. Verificar suscripción PayPal (backup) ───────────────────────────────
  if (action === "verify-paypal") {
    const { subscriptionId, planType } = body;
    if (!subscriptionId || !planType)
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Faltan campos" }) };

    let ppToken;
    try { ppToken = await getPayPalToken(); }
    catch { return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: "Error autenticando PayPal" }) }; }

    const ppRes = await httpsRequest(
      `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}`,
      { method: "GET", headers: { Authorization: `Bearer ${ppToken}`, "Content-Type": "application/json" } }
    );

    if (ppRes.status !== 200 || ppRes.body.status !== "ACTIVE")
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, error: "Suscripción no activa" }) };

    const premiumExpiresAt = Date.now() + 35 * 24 * 60 * 60 * 1000;

    if (userId) {
      try {
        await dynamo.send(new UpdateItemCommand({
          TableName: TABLE,
          Key: { userId: { S: userId } },
          UpdateExpression: "SET userPlan = :p, premiumExpiresAt = :e, ppSubscriptionId = :s",
          ExpressionAttributeValues: { ":p": { S: planType }, ":e": { N: String(premiumExpiresAt) }, ":s": { S: subscriptionId } },
        }));
      } catch (e) { console.error("DynamoDB:", e.message); }
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, planType, premiumExpiresAt }) };
  }

  // ── 4. Activar plan pendiente de Hotmart al iniciar sesión ─────────────────
  if (action === "check-pending-hotmart") {
    const { userId: uid, email } = body;
    if (!uid || !email)
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Faltan campos" }) };

    try {
      const result = await dynamo.send(new GetItemCommand({
        TableName: TABLE,
        Key: { userId: { S: `pending_${email.toLowerCase()}` } },
      }));
      const pending = result.Item ? { pendingPlan: result.Item.pendingPlan, pendingExpiresAt: result.Item.pendingExpiresAt } : null;
      if (!pending?.pendingPlan?.S || pending.pendingPlan.S === "free")
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ pending: false }) };

      const planType       = pending.pendingPlan.S;
      const premiumExpiresAt = Number(pending.pendingExpiresAt?.N || 0);

      if (premiumExpiresAt < Date.now())
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ pending: false }) };

      // Mover activación pendiente al usuario real
      await dynamo.send(new UpdateItemCommand({
        TableName: TABLE,
        Key: { userId: { S: uid } },
        UpdateExpression: "SET userPlan = :p, premiumExpiresAt = :e, userEmail = :em",
        ExpressionAttributeValues: {
          ":p":  { S: planType },
          ":e":  { N: String(premiumExpiresAt) },
          ":em": { S: email.toLowerCase() },
        },
      }));

      // Limpiar registro pendiente
      await dynamo.send(new UpdateItemCommand({
        TableName: TABLE,
        Key: { userId: { S: `pending_${email.toLowerCase()}` } },
        UpdateExpression: "SET pendingPlan = :p",
        ExpressionAttributeValues: { ":p": { S: "free" } },
      }));

      return { statusCode: 200, headers: CORS, body: JSON.stringify({ pending: true, planType, premiumExpiresAt }) };
    } catch (e) {
      console.error("check-pending error:", e.message);
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: "Acción no reconocida" }) };
};
