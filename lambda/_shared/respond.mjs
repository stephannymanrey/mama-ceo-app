import { corsHeaders } from "./cors.mjs";

/**
 * Respuesta JSON estándar con CORS ya resuelto. Usar SIEMPRE esto en vez de
 * construir el objeto {statusCode, headers, body} a mano — evita que una
 * Lambda nueva se olvide del CORS o de Content-Type.
 */
export function respond(statusCode, body, event, methods) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders(event, methods) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}
