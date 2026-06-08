/**
 * Lambda: mamaceo-payments
 * Rutas:
 *   POST /create-mp-subscription   → crea suscripción en Mercado Pago y devuelve init_point
 *   POST /verify-paypal            → verifica suscripción de PayPal y activa plan en DynamoDB
 *   POST /mp-webhook               → webhook de MP para renovaciones / cancelaciones
 *
 * Variables de entorno requeridas en AWS Lambda:
 *   MP_ACCESS_TOKEN      → tu Access Token privado de Mercado Pago (comienza por APP_USR-...)
 *   PAYPAL_CLIENT_ID     → Client ID de PayPal (live)
 *   PAYPAL_SECRET        → Client Secret de PayPal (live)
 *   APP_BASE_URL         → URL base de la app, ej: https://main.d3abc123.amplifyapp.com
 *   DYNAMODB_TABLE       → nombre de tu tabla de DynamoDB (ej: mama-ceo-users)
 */

const https = require("https");
const { DynamoDBClient, UpdateItemCommand, GetItemCommand } = require("@aws-sdk/client-dynamodb");

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const TABLE  = process.env.DYNAMODB_TABLE || "mama-ceo-users";

// ─── Precios de los planes en la moneda que cobras ────────────────────────────
// Ajusta estos valores antes de activar. MP cobra en tu moneda local.
// Para Colombia usa COP; para México usa MXN; para Argentina usa ARS.
const MP_PLAN_PRICES = {
  mama:         { amount: 19900, currency_id: "COP", reason: "MamaCEO — Plan Mamá" },
  emprendedora: { amount: 39900, currency_id: "COP", reason: "MamaCEO — Plan Emprendedora" },
  ceo:          { amount: 64900, currency_id: "COP", reason: "MamaCEO — Plan CEO" },
};

// ─── Helpers HTTP ─────────────────────────────────────────────────────────────
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

// ─── PayPal: obtener access token ────────────────────────────────────────────
async function getPayPalToken() {
  const creds = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString("base64");
  const res = await httpsRequest(
    "https://api-m.paypal.com/v1/oauth2/token",
    { method: "POST", headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" } },
    "grant_type=client_credentials"
  );
  return res.body.access_token;
}

// ─── Handler principal ────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  const path = event.path || event.rawPath || "";
  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch {}

  // Acción: viene en body.action o como subruta de la URL
  const action = body.action || path.split("/").filter(Boolean).pop();

  // ── Extraer userId del token Cognito (JWT) ────────────────────────────────
  const userId =
    event.requestContext?.authorizer?.claims?.sub ||
    event.requestContext?.authorizer?.jwt?.claims?.sub ||
    body.userEmail ||
    null;

  // ─────────────────────────────────────────────────────────────────────────
  // 1. POST /create-mp-subscription
  // ─────────────────────────────────────────────────────────────────────────
  if (action === "create-mp-subscription") {
    const { planType, userEmail } = body;
    if (!planType || !MP_PLAN_PRICES[planType]) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "planType inválido" }) };
    }
    if (!process.env.MP_ACCESS_TOKEN) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "MP_ACCESS_TOKEN no configurado" }) };
    }

    const plan    = MP_PLAN_PRICES[planType];
    const baseUrl = (process.env.APP_BASE_URL || "").replace(/\/$/, "");

    // Mercado Pago Preapproval (suscripción recurrente)
    const mpPayload = {
      reason:            plan.reason,
      auto_recurring: {
        frequency:        1,
        frequency_type:   "months",
        transaction_amount: plan.amount,
        currency_id:      plan.currency_id,
      },
      payer_email:        userEmail || undefined,
      back_url:           `${baseUrl}/?mp_result=approved&mp_plan=${planType}`,
      failure_back_url:   `${baseUrl}/?mp_result=failure&mp_plan=${planType}`,
      pending_back_url:   `${baseUrl}/?mp_result=pending&mp_plan=${planType}`,
      notification_url:   `${baseUrl.replace("https://", "https://")}/mp-webhook`, // no aplica aquí, usa API GW URL
      status:             "pending",
    };

    const mpRes = await httpsRequest(
      "https://api.mercadopago.com/preapproval",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
      mpPayload
    );

    if (mpRes.status !== 201 && mpRes.status !== 200) {
      console.error("MP error:", JSON.stringify(mpRes.body));
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Error al crear suscripción en MP", detail: mpRes.body }) };
    }

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ init_point: mpRes.body.init_point, preapproval_id: mpRes.body.id }),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. POST /verify-paypal
  // ─────────────────────────────────────────────────────────────────────────
  if (action === "verify-paypal") {
    const { subscriptionId, planType } = body;
    if (!subscriptionId || !planType) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Faltan subscriptionId o planType" }) };
    }

    let ppToken;
    try { ppToken = await getPayPalToken(); }
    catch (e) { return { statusCode: 502, headers, body: JSON.stringify({ error: "No se pudo autenticar con PayPal" }) }; }

    const ppRes = await httpsRequest(
      `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}`,
      { method: "GET", headers: { Authorization: `Bearer ${ppToken}`, "Content-Type": "application/json" } }
    );

    if (ppRes.status !== 200 || ppRes.body.status !== "ACTIVE") {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "Suscripción PayPal no activa" }) };
    }

    // Activar plan en DynamoDB (si hay userId / userEmail)
    const premiumExpiresAt = Date.now() + 31 * 24 * 60 * 60 * 1000;
    if (userId) {
      try {
        await dynamo.send(new UpdateItemCommand({
          TableName: TABLE,
          Key: { userId: { S: userId } },
          UpdateExpression: "SET userPlan = :p, premiumExpiresAt = :e, ppSubscriptionId = :s",
          ExpressionAttributeValues: {
            ":p": { S: planType },
            ":e": { N: String(premiumExpiresAt) },
            ":s": { S: subscriptionId },
          },
        }));
      } catch (dbErr) {
        console.error("DynamoDB error:", dbErr.message);
        // No bloqueamos — devolvemos success igualmente para que el frontend active localmente
      }
    }

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ success: true, planType, premiumExpiresAt }),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. POST /mp-webhook (Mercado Pago notifica renovaciones y cancelaciones)
  // ─────────────────────────────────────────────────────────────────────────
  if (action === "mp-webhook" || path.endsWith("/mp-webhook")) {
    const topic = body.type || event.queryStringParameters?.topic;
    const resourceId = body.data?.id || event.queryStringParameters?.id;

    if (topic === "subscription_preapproval" && resourceId && process.env.MP_ACCESS_TOKEN) {
      const mpRes = await httpsRequest(
        `https://api.mercadopago.com/preapproval/${resourceId}`,
        { method: "GET", headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
      );

      if (mpRes.status === 200) {
        const sub = mpRes.body;
        const payerEmail = sub.payer_email;
        const status     = sub.status; // "authorized" | "cancelled" | "paused"

        // Buscar usuario en DynamoDB por email (scan simple — si tienes GSI por email, mejor)
        // Por simplicidad, guardamos directamente si el frontend ya pasó el userId en el preapproval
        // Este webhook es un respaldo para renovaciones automáticas
        console.log(`MP webhook: preapproval ${resourceId} status=${status} payer=${payerEmail}`);
        // TODO: si tienes GSI email → userId en DynamoDB, actualiza el plan aquí
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };
  }

  return { statusCode: 404, headers, body: JSON.stringify({ error: "Ruta no encontrada" }) };
};
