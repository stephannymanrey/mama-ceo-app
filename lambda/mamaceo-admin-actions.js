/**
 * Lambda: mamaceo-admin-actions  (ES Module, Node 22, HTTP API v2)
 * Table: user_states  |  PK: user_id (String)
 *
 * Separada a propósito de mamaceo-admin-data (que es de SOLO lectura):
 * esta Lambda escribe, así que tiene su propio rol de ejecución (con permisos
 * de escritura acotados a esta tabla) y la invoca una credencial IAM distinta
 * (ump-admin-write-mamaceo) — si las credenciales de lectura se filtran, no
 * alcanzan para escribir nada. Autorizador AWS_IAM en API Gateway, igual que
 * mamaceo-admin-data.
 */
import { DynamoDBClient, UpdateItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const TABLE = process.env.DYNAMODB_TABLE || "user_states";

function respond(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || event?.httpMethod || "POST";
  if (method === "OPTIONS") return respond(200, "");
  if (method !== "POST") return respond(405, { error: "Método no permitido" });

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { error: "Body inválido" });
  }

  const { action, userId } = body;
  if (!userId) return respond(400, { error: "Falta userId" });

  try {
    if (action === "set-plan") {
      const { userPlan, premiumExpiresAt } = body;
      if (!userPlan) return respond(400, { error: "Falta userPlan" });
      await dynamo.send(
        new UpdateItemCommand({
          TableName: TABLE,
          Key: marshall({ user_id: userId }),
          UpdateExpression: "SET userPlan = :p, premiumExpiresAt = :e",
          ExpressionAttributeValues: marshall({
            ":p": userPlan,
            ":e": premiumExpiresAt || null,
          }),
        })
      );
      return respond(200, { ok: true });
    }

    if (action === "reset-usuaria") {
      await dynamo.send(new DeleteItemCommand({ TableName: TABLE, Key: marshall({ user_id: userId }) }));
      return respond(200, { ok: true });
    }

    return respond(400, { error: "Acción no reconocida" });
  } catch (err) {
    console.error("Lambda error:", err);
    return respond(500, { error: err.message });
  }
};
