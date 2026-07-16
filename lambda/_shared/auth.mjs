/**
 * Autenticación — SIEMPRE leer el usuario desde el JWT de Cognito que ya
 * validó API Gateway (el authorizer JWT rechaza tokens inválidos antes de
 * que la Lambda se ejecute). Nunca confiar en un userId enviado en el body
 * o en query string: eso permitiría a cualquiera leer/escribir datos de
 * otra cuenta con solo cambiar un parámetro.
 */
export function getMethod(event) {
  return event?.requestContext?.http?.method || event?.httpMethod || "GET";
}

export function getUserId(event) {
  return (
    event?.requestContext?.authorizer?.jwt?.claims?.sub ||
    event?.requestContext?.authorizer?.claims?.sub ||
    event?.requestContext?.authorizer?.sub ||
    null
  );
}
