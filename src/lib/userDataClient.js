import { callToolApi } from "./apiClient";

const USER_DATA_URL = "https://p5ftnawyxe.execute-api.us-east-1.amazonaws.com/default/mamaceo-user-data";

/**
 * Lee el estado guardado del usuario — mismo endpoint que usa el dashboard
 * principal. Pensado para que herramientas independientes (Studio, Facturas
 * en su propia ruta) lean solo los campos puntuales que necesitan al montar.
 *
 * Para ESCRIBIR, usar saveUserField() — nunca reenviar este objeto completo
 * de vuelta con cambios: eso pisaría cualquier dato que el dashboard haya
 * guardado mientras tanto en otra pestaña. Ver lambda/mamaceo-user-data.js.
 */
export async function getUserData() {
  const res = await callToolApi(USER_DATA_URL, null, { method: "GET" });
  if (res.error) return null;
  return res.data || null;
}

/**
 * Guarda UN campo del estado del usuario sin tocar el resto (actualización
 * parcial en el backend, no un reemplazo del blob completo). Seguro para
 * herramientas que viven en su propia ruta/pestaña y no tienen todo el
 * estado del dashboard en memoria.
 *
 * Solo un puñado de campos están permitidos del lado del backend — para
 * habilitar uno nuevo, agrégalo a ALLOWED_PARTIAL_FIELDS en
 * lambda/mamaceo-user-data.js primero.
 */
export async function saveUserField(field, value) {
  return callToolApi(USER_DATA_URL, { field, value });
}
