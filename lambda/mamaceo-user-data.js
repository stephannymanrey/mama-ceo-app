/**
 * Lambda: mamaceo-user-data  (index.mjs — ES module, HTTP API v2)
 * Table: user_states  |  PK: user_id (String)
 *
 * Deploy: subir como .zip con este archivo renombrado a index.mjs +
 * la carpeta _shared/ al lado (ver lambda/README.md).
 */
import { DynamoDBClient, GetItemCommand, UpdateItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { respond } from "./_shared/respond.mjs";
import { getMethod, getUserId } from "./_shared/auth.mjs";

const dynamo = new DynamoDBClient({ region: "us-east-1" });
const TABLE = process.env.TABLE_NAME || "user_states";
const METHODS = "GET,POST,DELETE,OPTIONS";

// Las secciones que más le duelen a una usuaria si desaparecen de golpe
// (finanzas, clientes, tareas, contenido, metas). Si TODAS estas quedan en
// cero de un guardado a otro, habiendo tenido contenido real antes, es casi
// seguro un bug del cliente (ej. un reset de estado accidental) y no una
// acción real de la usuaria — nadie borra finanzas+clientes+tareas+metas
// de un tirón en un solo guardado.
const CORE_ARRAY_KEYS = ["movements", "clients", "tasks", "contentItems", "goals"];
function looksLikeAccidentalWipe(oldData, newData) {
  if (!oldData) return false; // sin estado previo — nada que proteger
  const oldTotal = CORE_ARRAY_KEYS.reduce((t, k) => t + (Array.isArray(oldData[k]) ? oldData[k].length : 0), 0);
  const newTotal = CORE_ARRAY_KEYS.reduce((t, k) => t + (Array.isArray(newData[k]) ? newData[k].length : 0), 0);
  return oldTotal > 3 && newTotal === 0;
}

export const handler = async (event) => {
  const method = getMethod(event);

  if (method === "OPTIONS") {
    return respond(200, "", event, METHODS);
  }

  const userId = getUserId(event);
  if (!userId) {
    return respond(401, { error: "No autorizado" }, event, METHODS);
  }

  try {
    if (method === "GET") {
      const result = await dynamo.send(
        new GetItemCommand({ TableName: TABLE, Key: marshall({ user_id: userId }) })
      );
      if (!result.Item) {
        return respond(404, { data: null }, event, METHODS);
      }
      const item = unmarshall(result.Item);
      const data = item.data ?? null;
      // Mezclar atributos de plan guardados por mamaceo-payments
      const merged = data ? {
        ...data,
        ...(item.userPlan        ? { userPlan: item.userPlan }               : {}),
        ...(item.premiumExpiresAt ? { premiumExpiresAt: item.premiumExpiresAt } : {}),
      } : data;
      return respond(200, { data: merged }, event, METHODS);
    }

    if (method === "POST") {
      const body = JSON.parse(event.body || "{}");
      if (!body.data || typeof body.data !== "object" || Array.isArray(body.data) || Object.keys(body.data).length === 0) {
        return respond(400, { error: "data inválido o vacío" }, event, METHODS);
      }
      // userPlan/premiumExpiresAt son atributos de solo lectura para el cliente:
      // solo mamaceo-payments / mamaceo-admin-actions pueden escribirlos (tras un pago real).
      // Si el cliente los incluye en su guardado normal de estado, se descartan aquí para
      // que nadie pueda auto-otorgarse premium editando el payload.
      const { userPlan, premiumExpiresAt, ...safeData } = body.data;

      // Traer el estado actual ANTES de sobrescribir: sirve para (a) dejar un
      // respaldo de una generación por si hay que recuperar algo a mano, y
      // (b) detectar un guardado que borraría todo de golpe (ver looksLikeAccidentalWipe).
      let previousData = null, previousUpdatedAt = null;
      try {
        const existing = await dynamo.send(
          new GetItemCommand({ TableName: TABLE, Key: marshall({ user_id: userId }) })
        );
        if (existing.Item) {
          const item = unmarshall(existing.Item);
          previousData = item.data ?? null;
          previousUpdatedAt = item.updatedAt ?? null;
        }
      } catch (err) {
        console.warn("[mamaceo-user-data] No se pudo leer el estado anterior:", err.message);
      }

      if (looksLikeAccidentalWipe(previousData, safeData)) {
        console.error(JSON.stringify({ metric: "suspicious_wipe_blocked", userId }));
        return respond(409, {
          error: "guardado_sospechoso",
          message: "Este guardado borraría de golpe datos existentes (finanzas, clientes, tareas). Por seguridad no se guardó — recarga la página e intenta de nuevo. Si de verdad quieres borrar todo, contáctanos.",
        }, event, METHODS);
      }

      const exprValues = { ":data": safeData, ":ts": new Date().toISOString() };
      let updateExpr = "SET #d = :data, updatedAt = :ts";
      if (previousData) {
        updateExpr += ", previousData = :prevData, previousUpdatedAt = :prevTs";
        exprValues[":prevData"] = previousData;
        exprValues[":prevTs"] = previousUpdatedAt || new Date().toISOString();
      }

      await dynamo.send(
        new UpdateItemCommand({
          TableName: TABLE,
          Key: marshall({ user_id: userId }),
          UpdateExpression: updateExpr,
          ExpressionAttributeNames: { "#d": "data" },
          ExpressionAttributeValues: marshall(exprValues),
        })
      );
      return respond(200, { ok: true }, event, METHODS);
    }

    if (method === "DELETE") {
      await dynamo.send(
        new DeleteItemCommand({ TableName: TABLE, Key: marshall({ user_id: userId }) })
      );
      return respond(200, { ok: true }, event, METHODS);
    }

    return respond(405, { error: "Método no permitido" }, event, METHODS);
  } catch (err) {
    console.error("Lambda error:", err);
    return respond(500, { error: err.message }, event, METHODS);
  }
};
