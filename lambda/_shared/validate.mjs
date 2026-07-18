/**
 * Validación de input del lado servidor. Regla dura: el cliente puede mandar
 * cualquier cosa (un bug, una extensión del navegador, o alguien atacando a
 * propósito) — cada Lambda valida ANTES de tocar DynamoDB o de interpolar
 * el valor en un prompt de IA / HTML / PDF.
 */
export function isNonEmptyString(v, maxLen = 2000) {
  return typeof v === "string" && v.trim().length > 0 && v.length <= maxLen;
}

export function isPositiveNumber(v) {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

export function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function clampString(v, maxLen) {
  return typeof v === "string" ? v.slice(0, maxLen) : "";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isEmail(v) {
  return typeof v === "string" && v.length <= 254 && EMAIL_RE.test(v);
}
