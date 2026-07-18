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
      await dynamo.send(
        new UpdateItemCommand({
          TableName: TABLE,
          Key: marshall({ user_id: userId }),
          UpdateExpression: "SET #d = :data, updatedAt = :ts",
          ExpressionAttributeNames: { "#d": "data" },
          ExpressionAttributeValues: marshall({
            ":data": safeData,
            ":ts": new Date().toISOString(),
          }),
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
