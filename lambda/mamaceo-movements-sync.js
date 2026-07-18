/**
 * Lambda: mamaceo-movements-sync  (ES Module, Node 22, HTTP API v2)
 * Tablas: mamaceo_inbound_tokens (PK token) y mamaceo_pending_movements
 * (PK user_id, SK item_id). Ver lambda/MOVEMENTS-SYNC-DEPLOY.md.
 *
 * Esta Lambda es la que habla con el navegador (JWT de Cognito). La que
 * recibe y procesa los correos reenviados es mamaceo-inbound-mail.js —
 * separada a propósito porque esa la dispara S3/SES, no un usuario, y por
 * lo tanto tiene un modelo de confianza distinto (ver ese archivo).
 */
import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { respond } from "./_shared/respond.mjs";
import { getMethod, getUserId } from "./_shared/auth.mjs";
import { randomToken } from "./_shared/token.mjs";
import { isNonEmptyString } from "./_shared/validate.mjs";

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const TOKENS_TABLE = process.env.TOKENS_TABLE || "mamaceo_inbound_tokens";
const PENDING_TABLE = process.env.PENDING_TABLE || "mamaceo_pending_movements";
const MAIL_DOMAIN = process.env.MAIL_DOMAIN || "mov.mamaceoapp.co";
const METHODS = "POST,OPTIONS";

async function findExistingToken(userId) {
  // Los tokens son la PK de su tabla (búsqueda por valor no indexado por
  // userId) — como cada usuaria solo tiene uno, lo guardamos también en su
  // registro de user_states-like item aquí mismo bajo una key propia para
  // no tener que escanear toda la tabla. Ver mamaceo_inbound_tokens: además
  // del item { token, user_id }, guardamos un item espejo { token: "by_user#<uid>", user_id, realToken }.
  const mirror = await dynamo.send(new GetItemCommand({
    TableName: TOKENS_TABLE,
    Key: marshall({ token: `by_user#${userId}` }),
  }));
  return mirror.Item ? unmarshall(mirror.Item).realToken : null;
}

export const handler = async (event) => {
  const method = getMethod(event);
  if (method === "OPTIONS") return respond(200, "", event, METHODS);

  const userId = getUserId(event);
  if (!userId) return respond(401, { error: "No autorizada" }, event, METHODS);

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch { return respond(400, { error: "Body inválido" }, event, METHODS); }
  const action = body.action;

  try {
    // ── Obtener (o crear) la dirección única de sincronización ───────────
    if (action === "get-my-address") {
      let token = await findExistingToken(userId);
      if (!token) {
        token = randomToken();
        // Dos items: uno indexado por token (lo que usa mamaceo-inbound-mail
        // para resolver a quién pertenece un correo) y otro espejo indexado
        // por usuaria (para no reasignar un token nuevo cada vez que pide su dirección).
        await Promise.all([
          dynamo.send(new PutItemCommand({ TableName: TOKENS_TABLE, Item: marshall({ token, user_id: userId, createdAt: Date.now() }) })),
          dynamo.send(new PutItemCommand({ TableName: TOKENS_TABLE, Item: marshall({ token: `by_user#${userId}`, user_id: userId, realToken: token, createdAt: Date.now() }) })),
        ]);
      }
      return respond(200, { address: `${token}@${MAIL_DOMAIN}` }, event, METHODS);
    }

    // ── Listar movimientos pendientes de revisión ─────────────────────────
    if (action === "list-pending") {
      const result = await dynamo.send(new QueryCommand({
        TableName: PENDING_TABLE,
        KeyConditionExpression: "user_id = :u",
        ExpressionAttributeValues: marshall({ ":u": userId }),
      }));
      const items = (result.Items || []).map(unmarshall).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return respond(200, { pending: items }, event, METHODS);
    }

    // ── Descartar (o marcar confirmado) un pendiente ──────────────────────
    // El movimiento real se crea del lado del cliente con los datos que la
    // usuaria confirmó (misma lógica que si lo hubiera digitado a mano) —
    // esta Lambda solo quita el pendiente de la cola una vez resuelto.
    if (action === "discard" || action === "confirm") {
      const { itemId } = body;
      if (!isNonEmptyString(itemId, 200)) return respond(400, { error: "Falta itemId" }, event, METHODS);
      await dynamo.send(new DeleteItemCommand({ TableName: PENDING_TABLE, Key: marshall({ user_id: userId, item_id: itemId }) }));
      return respond(200, { ok: true }, event, METHODS);
    }

    return respond(404, { error: "Acción no reconocida" }, event, METHODS);
  } catch (err) {
    console.error("Lambda error:", err);
    return respond(500, { error: err.message }, event, METHODS);
  }
};
