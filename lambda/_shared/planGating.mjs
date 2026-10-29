/**
 * Verificación REAL de plan en el servidor — espejo de src/lib/planGating.js.
 * El candado en la app (🔒 en el menú, botones deshabilitados) es solo para
 * la experiencia del cliente; cualquiera que llame el endpoint directo con
 * un JWT válido se lo salta. Esto es lo que de verdad impide usar una
 * función fuera del plan pagado — nunca confiar en el plan que mande el
 * cliente en el body, siempre leerlo de user_states.
 */
import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

export const PLAN_ORDER = { free: 0, mama: 1, emprendedora: 2, ceo: 3, premium: 3 };

export function planRank(plan) {
  return PLAN_ORDER[plan] ?? 0;
}

export function planMeetsMinimum(userPlan, minPlan) {
  return planRank(userPlan) >= planRank(minPlan);
}

/** Lee el plan real de la usuaria desde user_states (nunca desde el body). */
export async function getUserPlan(dynamo, userId, tableName = process.env.USER_STATES_TABLE || "user_states") {
  try {
    const result = await dynamo.send(new GetItemCommand({
      TableName: tableName,
      Key: marshall({ user_id: userId }),
    }));
    if (!result.Item) return "free";
    const item = unmarshall(result.Item);
    if (item.userPlan) return item.userPlan;
    try {
      const data = typeof item.data === "string" ? JSON.parse(item.data) : item.data;
      return data?.userPlan || "free";
    } catch {
      return "free";
    }
  } catch {
    return "free";
  }
}
