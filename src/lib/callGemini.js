import { getAwsAuthToken } from "./awsClient";

const GEMINI_URL = "https://p5ftnawyxe.execute-api.us-east-1.amazonaws.com/default/mamaceo-gemini";

/**
 * Llama a la IA de generación de contenido (ideas, hooks, lead magnets, guiones).
 * Extraído de App.jsx para que Studio funcione igual desde el dashboard como
 * desde su propia ruta independiente (/studio), sin duplicar esta lógica.
 */
export async function callGemini(type, context) {
  try {
    const token = await getAwsAuthToken();
    if (!token) return { error: "No autenticada. Inicia sesión." };
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type, context }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || data.message || `Error ${res.status}`, ...data };
    return data;
  } catch (err) {
    return { error: err.message || "Error de red. Intenta de nuevo." };
  }
}
