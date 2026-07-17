/**
 * Lambda: mamaceo-invoicing  (ES Module, Node 22, HTTP API v2)
 * Table: mamaceo_invoicing  |  PK: user_id (String)  |  SK: doc_id (String)
 *
 * Deploy: subir como .zip con este archivo renombrado a index.mjs +
 * la carpeta _shared/ al lado. Ver lambda/README.md.
 *
 * Facturas y cotizaciones de una usuaria. Vive en su propia tabla (no en
 * user_states) porque son documentos que crecen sin límite claro y se
 * consultan por separado — meterlos dentro del blob gigante de user_states
 * habría significado reescribir todo el historial de documentos cada vez
 * que se guarda cualquier otro cambio de la app.
 */
import { DynamoDBClient, QueryCommand, PutItemCommand, UpdateItemCommand, DeleteItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { respond } from "./_shared/respond.mjs";
import { getMethod, getUserId } from "./_shared/auth.mjs";
import { checkAndIncrUserDailyLimit } from "./_shared/rateLimit.mjs";
import { isNonEmptyString, isPositiveNumber, isPlainObject, clampString } from "./_shared/validate.mjs";

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const TABLE = process.env.DYNAMODB_TABLE || "mamaceo_invoicing";
const METHODS = "POST,OPTIONS";

const MAX_ITEMS = 200;
const CREATE_DAILY_LIMIT = 50; // tope generoso para uso real, bajo para frenar un script con bug/abuso
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const TYPE_PREFIX = { quote: "COT", invoice: "FAC" };
const STATUS_BY_TYPE = {
  quote:   ["draft", "sent", "accepted", "rejected", "expired"],
  invoice: ["draft", "sent", "paid", "overdue", "canceled"],
};

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) return null;
  const clean = [];
  for (const raw of items) {
    if (!isPlainObject(raw)) return null;
    if (!isNonEmptyString(raw.description, 300)) return null;
    const quantity = Number(raw.quantity);
    const unitPrice = Number(raw.unitPrice);
    if (!isPositiveNumber(quantity) || !Number.isFinite(unitPrice) || unitPrice < 0) return null;
    clean.push({ description: clampString(raw.description, 300), quantity, unitPrice });
  }
  return clean;
}

function computeTotal(items) {
  return Math.round(items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0) * 100) / 100;
}

// Numeración atómica por usuaria y tipo de documento — un ADD en DynamoDB no
// tiene condición de carrera aunque la usuaria cree dos documentos casi al
// mismo tiempo desde dos pestañas.
async function nextDocNumber(userId, type) {
  const field = type === "invoice" ? "invoiceSeq" : "quoteSeq";
  const result = await dynamo.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: marshall({ user_id: userId, doc_id: "_counter" }),
    UpdateExpression: `ADD ${field} :one`,
    ExpressionAttributeValues: marshall({ ":one": 1 }),
    ReturnValues: "UPDATED_NEW",
  }));
  const seq = unmarshall(result.Attributes)[field];
  return `${TYPE_PREFIX[type]}-${String(seq).padStart(4, "0")}`;
}

async function getOwnedDoc(userId, docId) {
  const result = await dynamo.send(new GetItemCommand({
    TableName: TABLE,
    Key: marshall({ user_id: userId, doc_id: docId }),
  }));
  return result.Item ? unmarshall(result.Item) : null;
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
    // ── Listar documentos de la usuaria ───────────────────────────────────
    if (action === "list") {
      const result = await dynamo.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "user_id = :u",
        ExpressionAttributeValues: marshall({ ":u": userId }),
      }));
      const docs = (result.Items || [])
        .map(unmarshall)
        .filter((d) => d.doc_id !== "_counter")
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return respond(200, { documents: docs }, event, METHODS);
    }

    // ── Crear factura o cotización ────────────────────────────────────────
    if (action === "create") {
      const { type, clientId, clientName, clientEmail, clientPhone, issueDate, dueDate, notes, currency } = body;
      if (!["quote", "invoice"].includes(type))
        return respond(400, { error: "type debe ser 'quote' o 'invoice'" }, event, METHODS);
      if (!isNonEmptyString(clientName, 200))
        return respond(400, { error: "Falta el nombre de la clienta" }, event, METHODS);
      const items = validateItems(body.items);
      if (!items)
        return respond(400, { error: "Los ítems no son válidos (descripción, cantidad y precio > 0)" }, event, METHODS);
      if (issueDate && !DATE_RE.test(issueDate)) return respond(400, { error: "issueDate inválida" }, event, METHODS);
      if (dueDate && !DATE_RE.test(dueDate)) return respond(400, { error: "dueDate inválida" }, event, METHODS);

      const withinLimit = await checkAndIncrUserDailyLimit(dynamo, TABLE, userId, "invoicing-create", CREATE_DAILY_LIMIT);
      if (!withinLimit)
        return respond(429, { error: "Llegaste al límite de documentos por hoy. Intenta mañana." }, event, METHODS);

      const number = await nextDocNumber(userId, type);
      const now = Date.now();
      const doc = {
        user_id: userId,
        doc_id: `doc#${now}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        number,
        status: "draft",
        clientId: Number.isFinite(Number(clientId)) ? Number(clientId) : null,
        clientName: clampString(clientName, 200),
        clientEmail: isNonEmptyString(clientEmail, 254) ? clampString(clientEmail, 254) : "",
        clientPhone: isNonEmptyString(clientPhone, 40) ? clampString(clientPhone, 40) : "",
        issueDate: issueDate || new Date().toISOString().slice(0, 10),
        dueDate: dueDate || "",
        items,
        notes: clampString(notes || "", 2000),
        currency: isNonEmptyString(currency, 10) ? currency : "USD",
        total: computeTotal(items),
        createdAt: now,
        updatedAt: now,
      };
      await dynamo.send(new PutItemCommand({ TableName: TABLE, Item: marshall(doc) }));
      return respond(200, { document: doc }, event, METHODS);
    }

    // ── Editar un documento existente (dueño) ─────────────────────────────
    if (action === "update") {
      const { docId } = body;
      if (!isNonEmptyString(docId, 200)) return respond(400, { error: "Falta docId" }, event, METHODS);
      const existing = await getOwnedDoc(userId, docId);
      if (!existing) return respond(404, { error: "Documento no encontrado" }, event, METHODS);

      const items = body.items ? validateItems(body.items) : existing.items;
      if (!items) return respond(400, { error: "Los ítems no son válidos" }, event, METHODS);
      if (body.issueDate && !DATE_RE.test(body.issueDate)) return respond(400, { error: "issueDate inválida" }, event, METHODS);
      if (body.dueDate && !DATE_RE.test(body.dueDate)) return respond(400, { error: "dueDate inválida" }, event, METHODS);

      const updated = {
        ...existing,
        clientName: isNonEmptyString(body.clientName, 200) ? clampString(body.clientName, 200) : existing.clientName,
        clientEmail: body.clientEmail !== undefined ? clampString(body.clientEmail, 254) : existing.clientEmail,
        clientPhone: body.clientPhone !== undefined ? clampString(body.clientPhone, 40) : existing.clientPhone,
        issueDate: body.issueDate || existing.issueDate,
        dueDate: body.dueDate !== undefined ? body.dueDate : existing.dueDate,
        items,
        notes: body.notes !== undefined ? clampString(body.notes, 2000) : existing.notes,
        total: computeTotal(items),
        updatedAt: Date.now(),
      };
      await dynamo.send(new PutItemCommand({ TableName: TABLE, Item: marshall(updated) }));
      return respond(200, { document: updated }, event, METHODS);
    }

    // ── Cambiar estado (enviado/pagado/aceptado/rechazado...) ─────────────
    if (action === "set-status") {
      const { docId, status } = body;
      if (!isNonEmptyString(docId, 200)) return respond(400, { error: "Falta docId" }, event, METHODS);
      const existing = await getOwnedDoc(userId, docId);
      if (!existing) return respond(404, { error: "Documento no encontrado" }, event, METHODS);
      const validStatuses = STATUS_BY_TYPE[existing.type] || [];
      if (!validStatuses.includes(status))
        return respond(400, { error: `Estado inválido para ${existing.type}` }, event, METHODS);

      await dynamo.send(new UpdateItemCommand({
        TableName: TABLE,
        Key: marshall({ user_id: userId, doc_id: docId }),
        UpdateExpression: "SET #s = :s, updatedAt = :u",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: marshall({ ":s": status, ":u": Date.now() }),
      }));
      return respond(200, { ok: true }, event, METHODS);
    }

    // ── Eliminar ────────────────────────────────────────────────────────
    if (action === "delete") {
      const { docId } = body;
      if (!isNonEmptyString(docId, 200)) return respond(400, { error: "Falta docId" }, event, METHODS);
      const existing = await getOwnedDoc(userId, docId);
      if (!existing) return respond(404, { error: "Documento no encontrado" }, event, METHODS);
      await dynamo.send(new DeleteItemCommand({ TableName: TABLE, Key: marshall({ user_id: userId, doc_id: docId }) }));
      return respond(200, { ok: true }, event, METHODS);
    }

    return respond(404, { error: "Acción no reconocida" }, event, METHODS);
  } catch (err) {
    console.error("Lambda error:", err);
    return respond(500, { error: err.message }, event, METHODS);
  }
};
