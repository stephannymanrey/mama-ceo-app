/**
 * Lambda: mamaceo-admin-data  (ES Module, Node 22, HTTP API v2)
 * Table: user_states  |  PK: user_id (String)
 *
 * A diferencia de las otras Lambdas de este proyecto, esta ruta NO valida un JWT
 * de Cognito de usuarias: la autenticación la hace API Gateway con un autorizador
 * AWS_IAM en esta ruta específica (ver lambda/ADMIN-DEPLOY.md). Solo lectura.
 *
 * No devuelve el contenido de negocio de las usuarias (montos, nombres de clientes,
 * texto de tareas) — solo conteos y metadatos de plan/uso, pensado para ump-admin.
 */
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const TABLE = process.env.DYNAMODB_TABLE || "user_states";

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function activityCounts(data) {
  if (!data) return {};
  const lengthOf = (arr) => (Array.isArray(arr) ? arr.length : 0);
  return {
    movements: lengthOf(data.movements),
    clients: lengthOf(data.clients),
    tasks: lengthOf(data.tasks),
    contentItems: lengthOf(data.contentItems),
    goals: lengthOf(data.goals),
    homeTasks: lengthOf(data.homeTasks),
  };
}

async function scanAllUsers() {
  const items = [];
  let ExclusiveStartKey;
  do {
    const result = await dynamo.send(
      new ScanCommand({ TableName: TABLE, ExclusiveStartKey })
    );
    (result.Items || []).forEach((raw) => items.push(unmarshall(raw)));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || event?.httpMethod || "GET";
  if (method === "OPTIONS") return respond(200, "");
  if (method !== "GET") return respond(405, { error: "Método no permitido" });

  try {
    const items = await scanAllUsers();

    const users = items.map((item) => ({
      userId: item.user_id,
      email: item.userEmail || item.hotmartEmail || null,
      plan: item.userPlan || "free",
      premiumExpiresAt: item.premiumExpiresAt || null,
      updatedAt: item.updatedAt || null,
      usage: item.data?.usage || { views: {}, subtabs: {} },
      activityCounts: activityCounts(item.data),
    }));

    const byPlan = {};
    const viewTotals = {};
    for (const u of users) {
      byPlan[u.plan] = (byPlan[u.plan] || 0) + 1;
      for (const [view, count] of Object.entries(u.usage.views || {})) {
        viewTotals[view] = (viewTotals[view] || 0) + count;
      }
    }
    const topViews = Object.entries(viewTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([view, total]) => ({ view, total }));

    return respond(200, {
      summary: { totalUsers: users.length, byPlan, topViews },
      users,
    });
  } catch (err) {
    console.error("Lambda error:", err);
    return respond(500, { error: err.message });
  }
};
