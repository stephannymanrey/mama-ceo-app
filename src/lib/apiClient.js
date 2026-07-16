import { getAwsAuthToken } from "./awsClient";

/**
 * fetch autenticado estándar para llamar a las Lambdas de MamáCEO desde
 * cualquier herramienta. Adjunta el JWT de Cognito, normaliza la respuesta
 * de error, y nunca lanza una excepción no controlada — siempre devuelve
 * `{ error }` para que la UI pueda mostrar el mensaje sin un try/catch propio.
 *
 * Antes cada herramienta (Studio, etc.) reimplementaba este mismo patrón
 * (callGemini) suelto dentro de App.jsx. Las herramientas nuevas deberían
 * usar esto en vez de copiar ese bloque otra vez.
 */
export async function callToolApi(url, body, { method = "POST" } = {}) {
  try {
    const token = await getAwsAuthToken();
    if (!token) return { error: "No autenticada. Inicia sesión de nuevo." };
    const res = await fetch(url, {
      method,
      mode: "cors",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: method === "GET" ? undefined : JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: data.error || data.message || `Error ${res.status}`, status: res.status, ...data };
    }
    return data;
  } catch (err) {
    return { error: err.message || "Error de red. Intenta de nuevo." };
  }
}
