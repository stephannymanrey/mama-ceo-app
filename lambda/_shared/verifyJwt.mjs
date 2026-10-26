/**
 * Verificación manual de JWT de Cognito, sin dependencias externas.
 *
 * Por qué existe: la ruta HTTP de mamaceo-payments usa AuthorizationType
 * "NONE" en API Gateway (tiene que — también la llama el webhook de Hotmart,
 * que no manda ningún token). Eso significa que getUserId(event) de
 * auth.mjs SIEMPRE devuelve null aquí, porque esa función solo lee
 * requestContext.authorizer, que no existe sin un authorizer adjunto a la
 * ruta. Cualquier acción de esta Lambda que necesite saber de verdad quién
 * llama (activate-beta, verify-paypal, check-pending-hotmart, save-email)
 * tiene que verificar el JWT a mano, aquí — nunca confiar en un userId o
 * email que venga suelto en el body (cualquiera podría escribir el de otra
 * persona con solo cambiar un campo).
 */
import crypto from "crypto";

const REGION = process.env.AWS_REGION || "us-east-1";
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || "us-east-1_ZvJgj7iG1";
const CLIENT_ID = process.env.COGNITO_CLIENT_ID || "5hjqj36u9oeud7cs8onj93d36j";
const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
const JWKS_URL = `${ISSUER}/.well-known/jwks.json`;
const JWKS_TTL_MS = 60 * 60 * 1000; // las llaves de Cognito rotan muy rara vez — 1h de caché es seguro

let cachedJwks = null;
let cachedAt = 0;

async function getJwks() {
  if (cachedJwks && Date.now() - cachedAt < JWKS_TTL_MS) return cachedJwks;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`No se pudo obtener JWKS de Cognito: ${res.status}`);
  const data = await res.json();
  cachedJwks = data.keys;
  cachedAt = Date.now();
  return cachedJwks;
}

/**
 * Verifica el header Authorization de un evento de API Gateway.
 * Devuelve { sub, email } si el token es válido, o null si falta, está mal
 * formado, expiró, no es de este user pool/app client, o la firma no cuadra.
 */
export async function verifyIdToken(event) {
  const authHeader = event?.headers?.authorization || event?.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;

  let header, payload;
  try {
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (header.alg !== "RS256") return null;
  if (payload.iss !== ISSUER) return null;
  if (payload.token_use !== "id") return null; // necesitamos el ID token (trae email), no el access token
  if (payload.aud !== CLIENT_ID) return null;
  if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
  if (!payload.sub) return null;

  let jwks;
  try {
    jwks = await getJwks();
  } catch {
    return null;
  }
  const jwk = jwks.find((k) => k.kid === header.kid);
  if (!jwk) return null;

  let publicKey;
  try {
    publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  } catch {
    return null;
  }

  const signedData = Buffer.from(`${headerB64}.${payloadB64}`);
  const signature = Buffer.from(sigB64, "base64url");
  let validSignature = false;
  try {
    validSignature = crypto.verify(
      "RSA-SHA256",
      signedData,
      { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      signature
    );
  } catch {
    return null;
  }
  if (!validSignature) return null;

  return { sub: payload.sub, email: payload.email || null };
}
