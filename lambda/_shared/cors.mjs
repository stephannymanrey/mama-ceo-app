/**
 * CORS compartido por todas las Lambdas de MamáCEO.
 *
 * Regla: nunca "Access-Control-Allow-Origin": "*" en una ruta que acepta
 * Authorization (JWT) o hace cambios de estado. Los webhooks server-to-server
 * (Hotmart, PayPal) no llevan Origin de navegador, así que esta allowlist no
 * les afecta — solo endurece lo que un navegador puede llamar.
 *
 * Si agregas un dominio nuevo (ej. un dominio de preview), agrégalo aquí,
 * no lo agregues suelto en una sola Lambda — así no queda desincronizado.
 */
export const ALLOWED_ORIGINS = [
  "https://www.mamaceoapp.co",
  "https://mamaceoapp.co",
  "http://localhost:5173",
  "http://localhost:5174",
];

/**
 * @param {object} event - evento de API Gateway
 * @param {string} methods - valor de Access-Control-Allow-Methods para esta ruta
 */
export function corsHeaders(event, methods = "GET,POST,OPTIONS") {
  const origin = event?.headers?.origin || event?.headers?.Origin || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Credentials": "true",
  };
}
