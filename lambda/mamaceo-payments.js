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
import crypto from "crypto";
import { DynamoDBClient, UpdateItemCommand, ScanCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const TABLE  = process.env.DYNAMODB_TABLE || "user_states";

// Códigos beta — viven SOLO aquí (server-side), nunca en el bundle del cliente.
// Antes el hash y la comparación se hacían en App.jsx, así que cualquiera podía
// leer los hashes en el JS público y atacarlos offline sin límite de intentos.
let BETA_CODES = [
  { hash: "1df2627e3ac0f8268c070acdbf13b0d354f16f2c38bf873dee2d54b86af13440", days: 90, expiry: new Date("2026-12-31T23:59:59").getTime() },
  { hash: "42f8fdb0a7354c04e994970759b87588906eccb7741c9bc5a7dd52471f7961bf", days: 60, expiry: new Date("2027-12-31T23:59:59").getTime() },
  { hash: "e838734981031ac5ebe63fc160b956a2b17c3e34768c34d73c4f3b2ff20d71d9", days: 60, expiry: new Date("2027-12-31T23:59:59").getTime() },
];
try { if (process.env.BETA_CODES) BETA_CODES = JSON.parse(process.env.BETA_CODES); } catch {}

function hashBetaCode(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

// IDs de plan de PayPal (públicos) — deben coincidir con PAYPAL_PLAN_IDS en src/App.jsx.
// Se usan para verificar que el plan_id real de la suscripción activa corresponde al
// planType que el cliente pide activar, en vez de confiar ciegamente en planType.
let PAYPAL_PLAN_IDS = {
  mama:         "P-1JS89076U5207463PNITBXNI",
  emprendedora: "P-4BJ96851N4568881DNITBYZY",
  ceo:          "P-4FG244764W7235101NITBZ6Y",
};
try { if (process.env.PAYPAL_PLAN_IDS) PAYPAL_PLAN_IDS = JSON.parse(process.env.PAYPAL_PLAN_IDS); } catch {}

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
    ProjectionExpression: "user_id",
  }));
  return result.Items?.[0]?.user_id?.S || null;
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
        Key: { user_id: { S: uid } },
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
          Key: { user_id: { S: `pending_${buyerEmail.toLowerCase()}` } },
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
          Key: { user_id: { S: foundUserId } },
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
          Key: { user_id: { S: foundUserId } },
          UpdateExpression: "SET userPlan = :p, premiumExpiresAt = :e",
          ExpressionAttributeValues: {
            ":p": { S: "free" },
            ":e": { N: "0" },
          },
        }));
        console.log(`Plan cancelado: userId=${foundUserId}`);
      }
    } catch (e) {
      console.error("DynamoDB update error:", e.message);
      // 500 para que Hotmart reintente el webhook — si respondemos 200 aquí, Hotmart
      // da por hecho que se activó el plan aunque el pago se cobró y nunca se aplicó.
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ received: false, error: "No se pudo actualizar el plan, reintentar" }) };
    }

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

    // El cliente elige qué planType activar, pero el precio real pagado lo determina
    // el plan_id de la suscripción en PayPal — sin esta verificación, alguien con una
    // suscripción activa al plan más barato podía pedir activar el plan más caro gratis.
    const expectedPlanId = PAYPAL_PLAN_IDS[planType];
    if (!expectedPlanId || ppRes.body.plan_id !== expectedPlanId)
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, error: "El plan de la suscripción no coincide con el plan solicitado" }) };

    const premiumExpiresAt = Date.now() + 35 * 24 * 60 * 60 * 1000;

    if (userId) {
      try {
        await dynamo.send(new UpdateItemCommand({
          TableName: TABLE,
          Key: { user_id: { S: userId } },
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
        Key: { user_id: { S: `pending_${email.toLowerCase()}` } },
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
        Key: { user_id: { S: uid } },
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
        Key: { user_id: { S: `pending_${email.toLowerCase()}` } },
        UpdateExpression: "SET pendingPlan = :p",
        ExpressionAttributeValues: { ":p": { S: "free" } },
      }));

      return { statusCode: 200, headers: CORS, body: JSON.stringify({ pending: true, planType, premiumExpiresAt }) };
    } catch (e) {
      console.error("check-pending error:", e.message);
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
    }
  }

  // ── 5. Activar código beta (validación server-side) ────────────────────────
  if (action === "activate-beta") {
    if (!userId)
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: "No autorizado. Inicia sesión." }) };

    const code = String(body.code || "").trim().toUpperCase();
    if (!code)
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Falta el código" }) };

    const entered = hashBetaCode(code);
    const match = BETA_CODES.find((c) => c.hash === entered);
    if (!match)
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Código incorrecto. Verifica que lo escribiste exactamente como te lo enviaron." }) };
    if (Date.now() > match.expiry)
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Este código ya expiró." }) };

    const premiumExpiresAt = Date.now() + match.days * 24 * 60 * 60 * 1000;
    try {
      await dynamo.send(new UpdateItemCommand({
        TableName: TABLE,
        Key: { user_id: { S: userId } },
        UpdateExpression: "SET userPlan = :p, premiumExpiresAt = :e",
        ExpressionAttributeValues: { ":p": { S: "premium" }, ":e": { N: String(premiumExpiresAt) } },
      }));
    } catch (e) {
      console.error("activate-beta error:", e.message);
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, userPlan: "premium", premiumExpiresAt }) };
  }

  return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: "Acción no reconocida" }) };
};
