/**
 * Lambda: mamaceo-push-daily
 * Trigger: EventBridge cron  cron(0 13 * * ? *)  = 8:00 AM Colombia (UTC-5)
 *
 * Env vars requeridas:
 *   TABLE_NAME        — igual que mamaceo-user-data (default: user_states)
 *   VAPID_PUBLIC_KEY  — clave pública VAPID (base64url, 65 bytes)
 *   VAPID_PRIVATE_KEY — clave privada VAPID (base64url, 32 bytes)
 *   VAPID_SUBJECT     — mailto o URL del remitente (ej: mailto:hola@mamaceo.co)
 *
 * Deploy: copiar este archivo como index.mjs en la consola de AWS Lambda.
 * No requiere dependencias npm — solo crypto (built-in) y @aws-sdk (runtime).
 */
import crypto from 'crypto';
import { DynamoDBClient, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const TABLE = process.env.TABLE_NAME || 'user_states';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hola@mamaceo.co';

const NOTIF_TITLE = 'Mamá CEO 🌸';
const NOTIF_BODY  = 'Hola mamá CEO, hoy es un nuevo día para continuar con tu propósito.';
const NOTIF_URL   = '/';

// ── VAPID JWT (ES256) sin dependencias externas ──────────────────────────────

function vapidJwt(endpoint) {
  const aud = new URL(endpoint).origin;
  const header  = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    aud, sub: VAPID_SUBJECT, exp: Math.floor(Date.now() / 1000) + 43200,
  })).toString('base64url');
  const sigInput = `${header}.${payload}`;

  // Construir JWK desde los bytes raw de las claves VAPID
  const pubBytes = Buffer.from(VAPID_PUBLIC, 'base64url');
  const x = pubBytes.slice(1, 33).toString('base64url');
  const y = pubBytes.slice(33, 65).toString('base64url');
  const privKey = crypto.createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', d: VAPID_PRIVATE, x, y },
    format: 'jwk',
  });
  const sig = crypto.sign('SHA256', Buffer.from(sigInput), { key: privKey, dsaEncoding: 'ieee-p1363' });
  return `${sigInput}.${sig.toString('base64url')}`;
}

// ── Enviar push vacío (sin payload cifrado) ───────────────────────────────────
// El service worker muestra el mensaje hardcodeado en sw.js
async function sendPush(sub) {
  const { endpoint } = sub;
  const jwt = vapidJwt(endpoint);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt},k=${VAPID_PUBLIC}`,
      TTL: '86400',
      'Content-Length': '0',
    },
  });
  return res.status;
}

// ── Eliminar suscripción vencida ──────────────────────────────────────────────
async function removeSub(userId) {
  await dynamo.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: marshall({ user_id: userId }),
    UpdateExpression: 'REMOVE push_sub',
  }));
}

// ── Handler ───────────────────────────────────────────────────────────────────
export const handler = async () => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.error('Faltan VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY en las variables de entorno');
    return { statusCode: 500, body: 'VAPID keys not configured' };
  }

  // Escanear tabla buscando usuarios con push_sub
  let lastKey;
  const subscriptions = [];
  do {
    const res = await dynamo.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'attribute_exists(push_sub)',
      ProjectionExpression: 'user_id, push_sub',
      ExclusiveStartKey: lastKey,
    }));
    for (const item of res.Items || []) {
      const row = unmarshall(item);
      subscriptions.push({ userId: row.user_id, sub: row.push_sub });
    }
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  console.log(`Enviando a ${subscriptions.length} suscripciones`);

  let ok = 0, expired = 0, errors = 0;
  await Promise.allSettled(
    subscriptions.map(async ({ userId, sub }) => {
      try {
        const status = await sendPush(sub);
        if (status === 201 || status === 202 || status === 200) {
          ok++;
        } else if (status === 404 || status === 410) {
          // Suscripción vencida — eliminar de la BD
          await removeSub(userId);
          expired++;
        } else {
          console.warn(`Push ${userId}: status ${status}`);
          errors++;
        }
      } catch (err) {
        console.error(`Push ${userId}:`, err.message);
        errors++;
      }
    })
  );

  console.log(JSON.stringify({ ok, expired, errors, total: subscriptions.length }));
  return { statusCode: 200, body: JSON.stringify({ ok, expired, errors }) };
};
