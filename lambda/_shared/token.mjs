import { randomBytes } from "node:crypto";

/**
 * Token aleatorio no adivinable (base32 minúscula, sin caracteres ambiguos),
 * para identificadores que se exponen públicamente (ej. la dirección de
 * correo de sincronización de una usuaria). No uses el userId ni nada
 * derivado de datos de la usuaria — debe ser imposible de adivinar o
 * enumerar.
 */
export function randomToken(bytes = 10) {
  return randomBytes(bytes).toString("hex");
}
