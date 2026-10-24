/**
 * Lambda: mamaceo-push-daily
 * Trigger: EventBridge cron  cron(0/15 * * * ? *)  = cada 15 minutos
 *
 * Cambio de frecuencia (antes 1x al día a las 8am fijas para todas):
 * ahora corre cada 15 min y cada usuaria recibe su recordatorio en la
 * hora que ELLA configuró (reminderTime), con contenido real (sus citas
 * de hoy/mañana) en vez de un mensaje genérico igual para todas — igual
 * que en Creanautas. Colombia no tiene horario de verano, así que se usa
 * un offset fijo de UTC-5 para calcular "hoy" y "ahora" de cada usuaria.
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

const WINDOW_MIN = 15; // debe coincidir con la frecuencia del cron

const FALLBACK_GREETINGS = [
  '¡Hoy es un gran día para tu negocio! 🌸',
  'Un paso a la vez — hoy también cuenta. 💪',
  'Respira, organiza, avanza. Tu día te espera. 🌼',
];

// ── VAPID JWT (ES256) sin dependencias externas ──────────────────────────────

function vapidJwt(endpoint) {
  const aud = new URL(endpoint).origin;
  const header  = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    aud, sub: VAPID_SUBJECT, exp: Math.floor(Date.now() / 1000) + 43200,
  })).toString('base64url');
  const sigInput = `${header}.${payload}`;

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

// ── Cifrado del contenido (RFC 8291 — aes128gcm), sin dependencias ──────────

function hkdfExtract(salt, ikm) {
  return crypto.createHmac('sha256', salt).update(ikm).digest();
}
function hkdfExpand(prk, info, len) {
  return crypto.createHmac('sha256', prk).update(Buffer.concat([info, Buffer.from([1])])).digest().subarray(0, len);
}

function encryptPayload(p256dh, authSecretB64, plaintext) {
  const uaPublic = Buffer.from(p256dh, 'base64url');
  const authSecret = Buffer.from(authSecretB64, 'base64url');

  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const sharedSecret = ecdh.computeSecret(uaPublic);

  const salt = crypto.randomBytes(16);

  const prkKey = hkdfExtract(authSecret, sharedSecret);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info'), Buffer.from([0x00]), uaPublic, asPublic]);
  const ikm = hkdfExpand(prkKey, keyInfo, 32);

  const prk = hkdfExtract(salt, ikm);
  const cek   = hkdfExpand(prk, Buffer.concat([Buffer.from('Content-Encoding: aes128gcm'), Buffer.from([0x00])]), 16);
  const nonce = hkdfExpand(prk, Buffer.concat([Buffer.from('Content-Encoding: nonce'),      Buffer.from([0x00])]), 12);

  const padded = Buffer.concat([plaintext, Buffer.from([0x02])]); // delimitador, sin padding extra
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const ciphertext = Buffer.concat([cipher.update(padded), cipher.final(), cipher.getAuthTag()]);

  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);
  const header = Buffer.concat([salt, recordSize, Buffer.from([asPublic.length]), asPublic]);

  return Buffer.concat([header, ciphertext]);
}

// ── Enviar push con contenido cifrado ─────────────────────────────────────────

async function sendPush(sub, payloadObj) {
  const { endpoint, keys } = sub;
  const jwt = vapidJwt(endpoint);
  const body = encryptPayload(keys.p256dh, keys.auth, Buffer.from(JSON.stringify(payloadObj)));
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt},k=${VAPID_PUBLIC}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
    },
    body,
  });
  return res.status;
}

async function removeSub(userId) {
  await dynamo.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: marshall({ user_id: userId }),
    UpdateExpression: 'REMOVE push_sub',
  }));
}

async function markSentToday(userId, todayISO) {
  await dynamo.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: marshall({ user_id: userId }),
    UpdateExpression: 'SET push_last_sent = :d',
    ExpressionAttributeValues: marshall({ ':d': todayISO }),
  }));
}

// ── Hora de Colombia (UTC-5 fijo, sin horario de verano) ─────────────────────

function colombiaParts(d = new Date()) {
  const shifted = new Date(d.getTime() - 5 * 3600 * 1000);
  return {
    dateISO: shifted.toISOString().slice(0, 10),
    minutesSinceMidnight: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    dayOfYear: Math.floor((shifted - new Date(Date.UTC(shifted.getUTCFullYear(), 0, 0))) / 86400000),
  };
}

function daysBetweenISO(dateStrA, dateStrB) {
  const [ya, ma, da] = dateStrA.split('-').map(Number);
  const [yb, mb, db] = dateStrB.split('-').map(Number);
  return Math.round((Date.UTC(ya, ma - 1, da) - Date.UTC(yb, mb - 1, db)) / 86400000);
}

function parseTimeToMinutes(hhmm) {
  const [h, m] = String(hhmm || '08:00').split(':').map(Number);
  return (Number.isFinite(h) ? h : 8) * 60 + (Number.isFinite(m) ? m : 0);
}

// ── Construir el contenido real de la notificación ────────────────────────────

function buildContent(data, todayISO, dayOfYear) {
  const appts = Array.isArray(data?.appointments) ? data.appointments : [];
  const relevant = appts.filter((a) => {
    if (!a?.date) return false;
    const diff = daysBetweenISO(a.date, todayISO);
    return diff === 0 || diff === 1;
  });

  if (!relevant.length) {
    return {
      title: 'Mamá CEO 🌸',
      body: FALLBACK_GREETINGS[dayOfYear % FALLBACK_GREETINGS.length],
      url: '/',
    };
  }

  const hoy    = relevant.filter((a) => daysBetweenISO(a.date, todayISO) === 0).map((a) => a.title).filter(Boolean);
  const manana = relevant.filter((a) => daysBetweenISO(a.date, todayISO) === 1).map((a) => a.title).filter(Boolean);
  let body = '';
  if (hoy.length)    body += `Hoy: ${hoy.join(', ')}. `;
  if (manana.length) body += `Mañana: ${manana.join(', ')}.`;

  return { title: 'Mamá CEO 🌸 — Tu día', body: body.trim() || FALLBACK_GREETINGS[dayOfYear % FALLBACK_GREETINGS.length], url: '/' };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const handler = async () => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.error('Faltan VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY en las variables de entorno');
    return { statusCode: 500, body: 'VAPID keys not configured' };
  }

  const { dateISO: todayISO, minutesSinceMidnight: nowMin, dayOfYear } = colombiaParts();

  let lastKey;
  const rows = [];
  do {
    const res = await dynamo.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'attribute_exists(push_sub)',
      ProjectionExpression: 'user_id, push_sub, #d, push_last_sent',
      ExpressionAttributeNames: { '#d': 'data' },
      ExclusiveStartKey: lastKey,
    }));
    for (const item of res.Items || []) {
      rows.push(unmarshall(item));
    }
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  const due = rows.filter((row) => {
    const data = row.data || {};
    if (data.reminderEnabled === false) return false;
    if (row.push_last_sent === todayISO) return false; // ya se le envió hoy
    const targetMin = parseTimeToMinutes(data.reminderTime);
    return nowMin >= targetMin && nowMin < targetMin + WINDOW_MIN;
  });

  console.log(`${rows.length} suscripciones totales, ${due.length} dentro de su ventana horaria ahora`);

  let ok = 0, expired = 0, errors = 0;
  await Promise.allSettled(
    due.map(async ({ user_id: userId, push_sub: sub, data }) => {
      try {
        const payload = buildContent(data, todayISO, dayOfYear);
        const status = await sendPush(sub, payload);
        if (status === 201 || status === 202 || status === 200) {
          ok++;
          await markSentToday(userId, todayISO);
        } else if (status === 404 || status === 410) {
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

  console.log(JSON.stringify({ ok, expired, errors, checked: rows.length, due: due.length }));
  return { statusCode: 200, body: JSON.stringify({ ok, expired, errors }) };
};
