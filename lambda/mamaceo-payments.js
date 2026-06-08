/**
 * Lambda: mamaceo-payments  (ES Module — para index.mjs en Node 22)
 * Acción se pasa en body.action: "create-mp-subscription" | "verify-paypal" | "mp-webhook"
 *
 * Variables de entorno requeridas:
 *   MP_ACCESS_TOKEN   — Access Token privado de Mercado Pago
 *   PAYPAL_CLIENT_ID  — Client ID live de PayPal
 *   PAYPAL_SECRET     — Client Secret live de PayPal
 *   APP_BASE_URL      — URL de la app, ej: https://www.mamaceoapp.co
 *   DYNAMODB_TABLE    — nombre de la tabla DynamoDB (ej: user_states)
 */

import https from "https";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const TABLE  = process.env.DYNAMODB_TABLE || "user_states";

const MP_PLAN_PRICES = {
  mama:         { amount: 19900, currency_id: "COP", reason: "MamaCEO — Plan Mamá" },
  emprendedora: { amount: 39900, currency_id: "COP", reason: "MamaCEO — Plan Emprendedora" },
  ceo:          { amount: 64900, currency_id: "COP", reason: "MamaCEO — Plan CEO" },
};

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

export const handler = async (event) => {
  // OPTIONS preflight
  const method = event.requestContext?.http?.method || event.httpMethod || "POST";
  if (method === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch {}

  const action = body.action;
  const userId =
    event.requestContext?.authorizer?.jwt?.claims?.sub ||
    event.requestContext?.authorizer?.claims?.sub ||
    null;

  // ── 1. Crear suscripción Mercado Pago ──────────────────────────────────────
  if (action === "create-mp-subscription") {
    const { planType, userEmail } = body;
    if (!planType || !MP_PLAN_PRICES[planType])
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "planType inválido" }) };
    if (!process.env.MP_ACCESS_TOKEN)
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "MP_ACCESS_TOKEN no configurado" }) };

    const plan    = MP_PLAN_PRICES[planType];
    const baseUrl = (process.env.APP_BASE_URL || "https://www.mamaceoapp.co").replace(/\/$/, "");

    const mpRes = await httpsRequest(
      "https://api.mercadopago.com/preapproval",
      { method: "POST", headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, "Content-Type": "application/json" } },
      {
        reason: plan.reason,
        auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: plan.amount, currency_id: plan.currency_id },
        payer_email:      userEmail || undefined,
        back_url:         `${baseUrl}/?mp_result=approved&mp_plan=${planType}`,
        failure_back_url: `${baseUrl}/?mp_result=failure&mp_plan=${planType}`,
        pending_back_url: `${baseUrl}/?mp_result=pending&mp_plan=${planType}`,
        status:           "pending",
      }
    );

    if (mpRes.status !== 201 && mpRes.status !== 200) {
      console.error("MP error:", JSON.stringify(mpRes.body));
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: "Error MP", detail: mpRes.body }) };
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ init_point: mpRes.body.init_point }) };
  }

  // ── 2. Verificar suscripción PayPal ────────────────────────────────────────
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

    const premiumExpiresAt = Date.now() + 31 * 24 * 60 * 60 * 1000;

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

  // ── 3. Webhook Mercado Pago ────────────────────────────────────────────────
  if (action === "mp-webhook" || (event.path || "").endsWith("/mp-webhook")) {
    const topic      = body.type || event.queryStringParameters?.topic;
    const resourceId = body.data?.id || event.queryStringParameters?.id;
    if (topic === "subscription_preapproval" && resourceId && process.env.MP_ACCESS_TOKEN) {
      const mpRes = await httpsRequest(
        `https://api.mercadopago.com/preapproval/${resourceId}`,
        { method: "GET", headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
      );
      if (mpRes.status === 200) console.log(`MP webhook: ${resourceId} status=${mpRes.body.status}`);
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ received: true }) };
  }

  return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: "Acción no reconocida" }) };
};
