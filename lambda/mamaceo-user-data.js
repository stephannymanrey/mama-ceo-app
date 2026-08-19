/**
 * Lambda: mamaceo-user-data  (index.mjs — ES module, HTTP API v2)
 * Table: user_states  |  PK: user_id (String)
 *
 * Deploy: subir como .zip con este archivo renombrado a index.mjs +
 * la carpeta _shared/ al lado (ver lambda/README.md).
 */
import { DynamoDBClient, GetItemCommand, UpdateItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { respond } from "./_shared/respond.mjs";
import { getMethod, getUserId } from "./_shared/auth.mjs";

const dynamo = new DynamoDBClient({ region: "us-east-1" });
const TABLE = process.env.TABLE_NAME || "user_states";
const METHODS = "GET,POST,DELETE,OPTIONS";

// Las secciones que más le duelen a una usuaria si desaparecen de golpe
// (finanzas, clientes, tareas, contenido, metas). Si TODAS estas quedan en
// cero de un guardado a otro, habiendo tenido contenido real antes, es casi
// seguro un bug del cliente (ej. un reset de estado accidental) y no una
// acción real de la usuaria — nadie borra finanzas+clientes+tareas+metas
// de un tirón en un solo guardado.
const CORE_ARRAY_KEYS = ["movements", "clients", "tasks", "contentItems", "goals"];
function looksLikeAccidentalWipe(oldData, newData) {
  if (!oldData) return false; // sin estado previo — nada que proteger
  const oldTotal = CORE_ARRAY_KEYS.reduce((t, k) => t + (Array.isArray(oldData[k]) ? oldData[k].length : 0), 0);
  const newTotal = CORE_ARRAY_KEYS.reduce((t, k) => t + (Array.isArray(newData[k]) ? newData[k].length : 0), 0);
  return oldTotal > 3 && newTotal === 0;
}

export const handler = async (event) => {
  const method = getMethod(event);

  if (method === "OPTIONS") {
    return respond(200, "", event, METHODS);
  }

  const userId = getUserId(event);
  if (!userId) {
    return respond(401, { error: "No autorizado" }, event, METHODS);
  }

  try {
    if (method === "GET") {
      const result = await dynamo.send(
        new GetItemCommand({ TableName: TABLE, Key: marshall({ user_id: userId }) })
      );
      if (!result.Item) {
        return respond(404, { data: null }, event, METHODS);
      }
      const item = unmarshall(result.Item);
      const data = item.data ?? null;
      // Mezclar atributos de plan guardados por mamaceo-payments
      const merged = data ? {
        ...data,
        ...(item.userPlan        ? { userPlan: item.userPlan }               : {}),
        ...(item.premiumExpiresAt ? { premiumExpiresAt: item.premiumExpiresAt } : {}),
      } : data;
      return respond(200, { data: merged }, event, METHODS);
    }

    if (method === "POST") {
      const body = JSON.parse(event.body || "{}");

      // ── Push subscription ─────────────────────────────────────────────────
      if (body.action === "save-push") {
        const sub = body.subscription;
        if (!sub?.endpoint) return respond(400, { error: "subscription inválida" }, event, METHODS);
        await dynamo.send(new UpdateItemCommand({
          TableName: TABLE,
          Key: marshall({ user_id: userId }),
          UpdateExpression: "SET push_sub = :sub",
          ExpressionAttributeValues: marshall({ ":sub": sub }, { removeUndefinedValues: true }),
        }));
        return respond(200, { ok: true }, event, METHODS);
      }
      if (body.action === "delete-push") {
        await dynamo.send(new UpdateItemCommand({
          TableName: TABLE,
          Key: marshall({ user_id: userId }),
          UpdateExpression: "REMOVE push_sub",
        }));
        return respond(200, { ok: true }, event, METHODS);
      }

      // Modo "campo parcial" — para herramientas independientes (Studio, Facturas
      // standalone, y las que vengan) que NO montan el dashboard completo y por lo
      // tanto no tienen todo el estado en memoria. Actualiza solo esa clave dentro
      // de `data` sin tocar el resto, a diferencia del guardado completo de abajo
      // que reemplaza todo el objeto — así una tool independiente nunca puede
      // pisar datos de otras partes de la app aunque tenga un bug.
      if (body.field) {
        const ALLOWED_PARTIAL_FIELDS = new Set(["brandProfile", "contentItems"]);
        if (!ALLOWED_PARTIAL_FIELDS.has(body.field)) {
          return respond(400, { error: "Campo no permitido para actualización parcial" }, event, METHODS);
        }
        if (body.value === undefined) {
          return respond(400, { error: "Falta value" }, event, METHODS);
        }
        // contentItems es también uno de los CORE_ARRAY_KEYS que protege
        // looksLikeAccidentalWipe en el guardado completo — aplicamos el mismo
        // criterio acá para que una tool independiente no pueda vaciarlo de
        // golpe por un bug propio, sea cual sea el camino de guardado.
        if (body.field === "contentItems" && Array.isArray(body.value) && body.value.length === 0) {
          try {
            const existing = await dynamo.send(
              new GetItemCommand({ TableName: TABLE, Key: marshall({ user_id: userId }) })
            );
            const prevContentItems = existing.Item ? unmarshall(existing.Item).data?.contentItems : null;
            if (Array.isArray(prevContentItems) && prevContentItems.length > 3) {
              console.error(JSON.stringify({ metric: "suspicious_wipe_blocked_partial", userId, field: "contentItems" }));
              return respond(409, {
                error: "guardado_sospechoso",
                message: "Este guardado borraría de golpe tu contenido existente. Por seguridad no se guardó — recarga la página e intenta de nuevo.",
              }, event, METHODS);
            }
          } catch (err) {
            console.warn("[mamaceo-user-data] No se pudo validar wipe parcial:", err.message);
          }
        }
        await dynamo.send(
          new UpdateItemCommand({
            TableName: TABLE,
            Key: marshall({ user_id: userId }),
            // if_not_exists crea el mapa `data` vacío si esta es la primera escritura
            // de la cuenta (p.ej. alguien que entra directo a /studio sin haber
            // abierto nunca el dashboard principal), sin sobreescribir nada si ya existe.
            UpdateExpression: "SET #d = if_not_exists(#d, :empty), #d.#f = :v, updatedAt = :ts",
            ExpressionAttributeNames: { "#d": "data", "#f": body.field },
            ExpressionAttributeValues: marshall({
              ":empty": {},
              ":v": body.value,
              ":ts": new Date().toISOString(),
            }),
          })
        );
        return respond(200, { ok: true }, event, METHODS);
      }

      if (!body.data || typeof body.data !== "object" || Array.isArray(body.data) || Object.keys(body.data).length === 0) {
        return respond(400, { error: "data inválido o vacío" }, event, METHODS);
      }
      // userPlan/premiumExpiresAt son atributos de solo lectura para el cliente:
      // solo mamaceo-payments / mamaceo-admin-actions pueden escribirlos (tras un pago real).
      // Si el cliente los incluye en su guardado normal de estado, se descartan aquí para
      // que nadie pueda auto-otorgarse premium editando el payload.
      const { userPlan, premiumExpiresAt, ...safeData } = body.data;

      // Traer el estado actual SOLO para comparar (nunca se vuelve a escribir
      // una copia de esto — el respaldo real ya lo da Point-in-Time Recovery
      // de DynamoDB, activado en la tabla). Esta lectura nunca hace crecer el
      // registro ni cambia lo que se guarda; si falla, seguimos sin bloquear
      // el guardado (mejor guardar sin la validación que no guardar nada).
      let previousData = null;
      try {
        const existing = await dynamo.send(
          new GetItemCommand({ TableName: TABLE, Key: marshall({ user_id: userId }) })
        );
        if (existing.Item) previousData = unmarshall(existing.Item).data ?? null;
      } catch (err) {
        console.warn("[mamaceo-user-data] No se pudo leer el estado anterior:", err.message);
      }

      if (looksLikeAccidentalWipe(previousData, safeData)) {
        console.error(JSON.stringify({ metric: "suspicious_wipe_blocked", userId }));
        return respond(409, {
          error: "guardado_sospechoso",
          message: "Este guardado borraría de golpe datos existentes (finanzas, clientes, tareas). Por seguridad no se guardó — recarga la página e intenta de nuevo. Si de verdad quieres borrar todo, contáctanos.",
        }, event, METHODS);
      }

      await dynamo.send(
        new UpdateItemCommand({
          TableName: TABLE,
          Key: marshall({ user_id: userId }),
          UpdateExpression: "SET #d = :data, updatedAt = :ts",
          ExpressionAttributeNames: { "#d": "data" },
          // removeUndefinedValues: sin esto, marshall() LANZA una excepción
          // si cualquier campo anidado del estado de la usuaria llega en
          // undefined (algo normal en JS, ej. un campo opcional nunca
          // seteado) — eso tumbaba el guardado entero por un solo campo.
          ExpressionAttributeValues: marshall({
            ":data": safeData,
            ":ts": new Date().toISOString(),
          }, { removeUndefinedValues: true }),
        })
      );
      return respond(200, { ok: true }, event, METHODS);
    }

    if (method === "DELETE") {
      await dynamo.send(
        new DeleteItemCommand({ TableName: TABLE, Key: marshall({ user_id: userId }) })
      );
      return respond(200, { ok: true }, event, METHODS);
    }

    return respond(405, { error: "Método no permitido" }, event, METHODS);
  } catch (err) {
    console.error("Lambda error:", err);
    return respond(500, { error: err.message }, event, METHODS);
  }
};
