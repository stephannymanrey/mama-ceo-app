import { GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

/**
 * Límite diario simple respaldado en DynamoDB (mismo patrón que ya usa
 * handlePlanNegocio en index.mjs). Pensado para rutas SIN JWT (públicas) o
 * para acotar el gasto total de un recurso caro (ej. llamadas a un LLM).
 *
 * @param {import('@aws-sdk/client-dynamodb').DynamoDBClient} dynamo
 * @param {string} table
 * @param {string} bucket - nombre corto de la ruta/recurso, ej. "invoicing-pdf"
 * @param {number} limit
 * @returns {Promise<boolean>} true si quedó dentro del límite (y ya se incrementó)
 */
export async function checkAndIncrDailyLimit(dynamo, table, bucket, limit) {
  const today = new Date().toISOString().slice(0, 10);
  const dayKey = `${bucket}_daily#${today}`;
  try {
    const dayRes = await dynamo.send(new GetItemCommand({ TableName: table, Key: { user_id: { S: dayKey } } }));
    if (dayRes.Item) {
      const dayData = unmarshall(dayRes.Item);
      if ((dayData.count || 0) >= limit) return false;
    }
  } catch (err) {
    console.warn(`[${bucket}] No se pudo leer el contador diario:`, err.message);
  }
  try {
    await dynamo.send(new UpdateItemCommand({
      TableName: table,
      Key: { user_id: { S: dayKey } },
      UpdateExpression: "ADD #c :one SET #t = :type",
      ExpressionAttributeNames: { "#c": "count", "#t": "type" },
      ExpressionAttributeValues: { ":one": { N: "1" }, ":type": { S: "daily_counter" } },
    }));
  } catch (err) {
    console.warn(`[${bucket}] No se pudo incrementar el contador diario:`, err.message);
  }
  return true;
}

/**
 * Igual que checkAndIncrDailyLimit pero acotado por usuaria — útil en rutas
 * autenticadas donde cada cuenta tiene su propio cupo diario (evita que una
 * sola cuenta comprometida agote el presupuesto del resto de usuarias).
 */
export function checkAndIncrUserDailyLimit(dynamo, table, userId, bucket, limit) {
  return checkAndIncrDailyLimit(dynamo, table, `${bucket}#${userId}`, limit);
}
