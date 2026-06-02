/**
 * Lambda: mamaceo-user-data  (index.mjs — ES module, HTTP API v2)
 * Table: user_states  |  PK: user_id (String)
 */
import { DynamoDBClient, GetItemCommand, PutItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const dynamo = new DynamoDBClient({ region: "us-east-1" });
const TABLE = process.env.TABLE_NAME || "user_states";

const ALLOWED_ORIGINS = [
  "https://www.mamaceoapp.co",
  "https://mamaceoapp.co",
  "http://localhost:5173",
  "http://localhost:5174",
];

function corsHeaders(event) {
  const origin = event?.headers?.origin || event?.headers?.Origin || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

function respond(statusCode, body, event) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders(event) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

function getMethod(event) {
  // HTTP API v2 usa requestContext.http.method; REST API v1 usa httpMethod
  return event?.requestContext?.http?.method || event?.httpMethod || "GET";
}

function getUserId(event) {
  // HTTP API v2 JWT authorizer
  return (
    event?.requestContext?.authorizer?.jwt?.claims?.sub ||
    event?.requestContext?.authorizer?.claims?.sub ||
    event?.requestContext?.authorizer?.sub ||
    null
  );
}

export const handler = async (event) => {
  const method = getMethod(event);

  if (method === "OPTIONS") {
    return respond(200, "", event);
  }

  const userId = getUserId(event);
  if (!userId) {
    return respond(401, { error: "No autorizado" }, event);
  }

  try {
    if (method === "GET") {
      const result = await dynamo.send(
        new GetItemCommand({ TableName: TABLE, Key: marshall({ user_id: userId }) })
      );
      if (!result.Item) {
        return respond(404, { data: null }, event);
      }
      const item = unmarshall(result.Item);
      return respond(200, { data: item.data ?? null }, event);
    }

    if (method === "POST") {
      const body = JSON.parse(event.body || "{}");
      await dynamo.send(
        new PutItemCommand({
          TableName: TABLE,
          Item: marshall({
            user_id: userId,
            data: body.data,
            updatedAt: new Date().toISOString(),
          }),
        })
      );
      return respond(200, { ok: true }, event);
    }

    if (method === "DELETE") {
      await dynamo.send(
        new DeleteItemCommand({ TableName: TABLE, Key: marshall({ user_id: userId }) })
      );
      return respond(200, { ok: true }, event);
    }

    return respond(405, { error: "Método no permitido" }, event);
  } catch (err) {
    console.error("Lambda error:", err);
    return respond(500, { error: err.message }, event);
  }
};
