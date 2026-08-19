/**
 * Fuente única de verdad para "¿qué plan necesita esto?" en el frontend.
 *
 * Antes de este archivo, `planOrder` (el ranking de planes) estaba copiado
 * 3 veces sueltas dentro de App.jsx — exactamente el tipo de duplicación que
 * hace que un día alguien actualice un plan en un lugar y se le olvide en
 * los otros dos. Todo lo que dependa del plan de la usuaria debería vivir
 * aquí, tanto para las pantallas actuales como para las herramientas nuevas.
 *
 * IMPORTANTE — esto es solo para la experiencia del cliente (mostrar
 * candados, mensajes de "mejora tu plan", etc.). Nunca es la fuente de
 * verdad de seguridad: cualquier acción que cueste dinero o dependa del plan
 * (generar con IA, activar una suscripción, etc.) DEBE volver a validarse
 * en la Lambda correspondiente contra el plan real guardado en DynamoDB.
 * Ver lambda/README.md, sección "Checklist de seguridad".
 */

// Orden de planes, de menor a mayor beneficio.
export const PLAN_ORDER = { free: 0, mama: 1, emprendedora: 2, ceo: 3, premium: 3 };

export function planRank(plan) {
  return PLAN_ORDER[plan] ?? 0;
}

/** ¿El plan de la usuaria alcanza el mínimo requerido? */
export function planMeetsMinimum(userPlan, minPlan) {
  return planRank(userPlan) >= planRank(minPlan);
}

// Límites de uso por plan en las pantallas de datos existentes.
// "mama" usaba por accidente los límites de "free" antes de este archivo
// (no tenía entrada propia y el fallback caía en PLAN_LIMITS.free) — bug real,
// una usuaria pagando el plan Mamá veía los límites del plan gratis.
export const USAGE_LIMITS = {
  free:         { movements: 30,       clients: 15,       content: 15,       homeTasks: 30 },
  mama:         { movements: 30,       clients: 15,       content: 15,       homeTasks: 30 },
  emprendedora: { movements: 100,      clients: 50,       content: 50,       homeTasks: 100 },
  ceo:          { movements: Infinity, clients: Infinity, content: Infinity, homeTasks: Infinity },
  premium:      { movements: Infinity, clients: Infinity, content: Infinity, homeTasks: Infinity },
};

export function getUsageLimits(plan) {
  return USAGE_LIMITS[plan] || USAGE_LIMITS.free;
}

// Plan mínimo requerido por cada pestaña/herramienta del menú principal.
// Agrega aquí cada herramienta nueva en vez de escribir un `if (plan === ...)`
// suelto dentro del componente — así el menú, el candado y el mensaje de
// upgrade siempre están de acuerdo entre sí.
export const TOOL_MIN_PLAN = {
  business: "emprendedora",
  clients: "emprendedora",
  // "content" es el tablero "Mi Contenido" dentro del dashboard — antes vivía
  // adentro del tab "studio" y heredaba su candado; al separarse en su propio
  // tab (ver App.jsx) necesita su propia entrada para no quedar gratis.
  content: "emprendedora",
  // studio e invoicing ahora son rutas independientes (/studio, /facturas —
  // ver src/main.jsx) en vez de tabs del dashboard, pero el mínimo de plan
  // sigue viviendo acá: StudioStandalone/InvoicingStandalone lo leen con
  // toolMinPlan() para mostrar el mismo candado fuera del dashboard.
  studio: "emprendedora",
  invoicing: "mama",
};

export function toolMinPlan(toolId) {
  return TOOL_MIN_PLAN[toolId] || "free";
}

export function isToolLocked(userPlan, toolId) {
  return !planMeetsMinimum(userPlan, toolMinPlan(toolId));
}

export const PLAN_LABELS = { free: "Gratis", mama: "Mamá Organizada", emprendedora: "Emprendedora", ceo: "CEO", premium: "CEO" };

export function planLabel(plan) {
  return PLAN_LABELS[plan] || "Emprendedora";
}
