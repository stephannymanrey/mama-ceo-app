import React, { useEffect, useMemo, useState } from "react";
import { useRegisterSW } from 'virtual:pwa-register/react';
import { awsAuth, getAwsAuthToken, isAwsConfigured, confirmAwsResetPassword, onGoogleRedirectCallback } from "./lib/awsClient";
import Logo from "./Logo";
import Studio from "./Studio";
import Landing from "./Landing";
import "./App.css";

const STORAGE_KEY = "mama-ceo-app-state-v4";

// Sistema de planes
const PLAN_LIMITS = {
  free:         { movements: 30,       clients: 15,       content: 15,       homeTasks: 30 },
  emprendedora: { movements: 100,      clients: 50,       content: 50,       homeTasks: 100 },
  ceo:          { movements: Infinity, clients: Infinity, content: Infinity, homeTasks: Infinity }
};

const PLAN_PRICES = {
  mama:         { cop: "$19.900", usd: "~$5.5",  copYear: "$199.000", usdYear: "$55"  },
  emprendedora: { cop: "$39.900", usd: "~$11",   copYear: "$399.000", usdYear: "$110" },
  ceo:          { cop: "$64.900", usd: "~$18",   copYear: "$649.000", usdYear: "$180" }
};

const POMODORO_MESSAGES = [
  "Respira. Lo que hiciste en este bloque importa.",
  "Tómate el descanso o tu cerebro lo necesita para rendir.",
  "Una pausa consciente es parte del trabajo.",
  "Hidrátate. Mueve el cuerpo. Vuelve con más claridad.",
  "Cada bloque completado es una victoria real."
];

const initialMovements = [
  { id: 1, type: "income", description: "Mentoria grupal", category: "Servicios", classification: "Servicios", amount: 4200, bank: "Bancolombia" },
  { id: 2, type: "income", description: "Plantillas digitales", category: "Productos", classification: "Productos", amount: 2600, bank: "Stripe" },
  { id: 3, type: "income", description: "Asesoria 1:1", category: "Servicios", classification: "Servicios", amount: 4600, bank: "Nequi" },
  { id: 4, type: "expense", description: "Publicidad Instagram", category: "Marketing", classification: "Gasto variable", amount: 1250, bank: "Tarjeta negocio" },
  { id: 5, type: "expense", description: "Herramientas", category: "Operaciones", classification: "Gasto fijo", amount: 1800, bank: "Bancolombia" },
  { id: 6, type: "expense", description: "Diseno de contenido", category: "Servicios", classification: "Gasto variable", amount: 1200, bank: "Nequi" }
];

// ── Duraciones estimadas (minutos) — usadas para calcular carga del día ──
const HOME_CATEGORY_DURATION = { "Rutina": 15, "Compras": 45, "Colegio / Ninos": 30, "Salud": 45, "Hogar / Limpieza": 30, "Bienestar": 20 };
const DEFAULT_HOME_DURATION = 25;
const APPT_TYPE_DURATION = { "Médico": 45, "Cita": 30, "Colegio": 30, "Dentista": 45, "Extracurricular": 60, "Iglesia": 90, "Pago": 15, "Cumpleaños": 120, "Reunión": 60, "Trabajo": 60 };
const DEFAULT_APPT_DURATION = 30;
const APPT_HOME_TYPES = new Set(["Médico","Cita","Colegio","Dentista","Extracurricular","Iglesia","Pago","Cumpleaños"]);
const DEFAULT_BIZ_TASK_DURATION = 30;
const AWAKE_MINUTES_PER_DAY = 16 * 60;
const homeTaskEstDuration = (t) => t.duration || HOME_CATEGORY_DURATION[t.category] || DEFAULT_HOME_DURATION;
const apptEstDuration = (a) => a.duration || APPT_TYPE_DURATION[a.type] || DEFAULT_APPT_DURATION;
const bizTaskEstDuration = (t) => t.duration || DEFAULT_BIZ_TASK_DURATION;

const EXPENSE_CATEGORIES = ["Marketing y publicidad", "Herramientas y software", "Insumos o materiales", "Transporte", "Pago a colaboradores", "Impuestos"];

const PRIORITY_MIGRATION = { "Urgente": "Importante", "Puede esperar": "Sin afán" };
const migratePriorityList = (list) => (list || []).map(item => item.priority && PRIORITY_MIGRATION[item.priority] ? { ...item, priority: PRIORITY_MIGRATION[item.priority] } : item);

const initialTasks = [
  { id: 1, text: "Cerrar 2 ventas principales", done: true },
  { id: 2, text: "Contactar 5 leads clientes", done: true },
  { id: 3, text: "Publicar 1 pieza de contenido", done: false },
  { id: 4, text: "Revisar y optimizar mis gastos", done: false }
];

const initialClients = [
  { id: 1, name: "Andrea Lopez", service: "Mentoria", status: "Lead caliente", amount: 180, nextAction: "Enviar propuesta" },
  { id: 2, name: "Carolina Diaz", service: "Curso", status: "Lead tibio", amount: 97, nextAction: "Escribir por WhatsApp" },
  { id: 3, name: "Laura Ruiz", service: "Asesoria 1:1", status: "Venta ganada", amount: 240, nextAction: "Onboarding" }
];

const initialContent = [
  { id: 1, title: "Reel: enfoque semanal", hook: "Deja de hacer mil cosas", format: "Reel", network: "Instagram", week: "Semana 1", status: "Publicado" },
  { id: 2, title: "Post: como ordenar tus ventas", hook: "Tu negocio necesita claridad", format: "Post", network: "Instagram", week: "Semana 2", status: "Programado" },
  { id: 3, title: "Email: oferta de mentoria", hook: "Hoy puedes vender con calma", format: "Email", network: "Website", week: "Semana 3", status: "Por hacer" }
];

const initialGoals = [
  { id: 1, title: "Meta mensual", amount: 15000, period: "Mensual", status: "Activa" },
  { id: 2, title: "Meta semanal", amount: 3750, period: "Semanal", status: "Activa" },
  { id: 3, title: "Ahorro e inversion", amount: 3000, period: "Mensual", status: "Activa" }
];

const initialHomeTasks = [
  { id: 1, title: "Organizar compras de la semana", category: "Compras", done: false },
  { id: 2, title: "Revisar agenda familiar", category: "Calendario", done: true },
  { id: 3, title: "Preparar loncheras y rutina AM", category: "Rutina", done: false }
];

const initialSystemTasks = [
  { id: 1, title: "Prospectar clientes nuevos", category: "negocio", mode: "manual", canDelegate: true },
  { id: 2, title: "Vender y hacer seguimiento", category: "negocio", mode: "manual", canDelegate: true },
  { id: 3, title: "Crear y publicar contenido", category: "negocio", mode: "manual", canDelegate: true },
  { id: 4, title: "Cobrar y facturar", category: "negocio", mode: "manual", canDelegate: true },
  { id: 5, title: "Diseñar piezas gráficas", category: "negocio", mode: "manual", canDelegate: true },
  { id: 6, title: "Responder mensajes y comentarios", category: "negocio", mode: "manual", canDelegate: true },
  { id: 7, title: "Mercado y compras del hogar", category: "hogar", mode: "manual", canDelegate: true },
  { id: 8, title: "Limpieza y orden del hogar", category: "hogar", mode: "manual", canDelegate: true },
  { id: 9, title: "Rutina de mañana con los niños", category: "maternidad", mode: "manual", canDelegate: false },
  { id: 10, title: "Tiempo de conexión y juego", category: "maternidad", mode: "manual", canDelegate: false }
];

const systemSuggestions = {
  "Prospectar clientes nuevos": { auto: "Crea un embudo con ManyChat o una landing page que capture leads sola.", delegate: "Contrata una asistente virtual para hacer outreach en DMs." },
  "Vender y hacer seguimiento": { auto: "Usa un CRM simple como HubSpot gratuito para automatizar recordatorios.", delegate: "Una asistente de ventas puede hacer el seguimiento inicial." },
  "Crear y publicar contenido": { auto: "Programa con Meta Business Suite o Buffer. Graba en lote una vez a la semana.", delegate: "Una editora de contenido puede tomar el material en bruto y publicarlo." },
  "Cobrar y facturar": { auto: "Usa Stripe, PayU o Wompi o el cobro llega solo sin que escribas a nadie.", delegate: "Una asistente administrativa puede gestionar facturas y cobros." },
  "Diseñar piezas gráficas": { auto: "Crea plantillas en Canva que solo cambias de texto cada semana.", delegate: "Una diseñadora freelance puede hacer el paquete mensual por horas." },
  "Responder mensajes y comentarios": { auto: "Configura respuestas rápidas en WhatsApp Business e Instagram.", delegate: "Una community manager puede manejar la bandeja de entrada." },
  "Mercado y compras del hogar": { auto: "Crea una lista fija en Rappi o el supermercado online de tu ciudad.", delegate: "Puedes delegar las compras a un familiar o servicio de domicilios." },
  "Limpieza y orden del hogar": { auto: "Establece una rutina de 15 min diarios para mantener el orden.", delegate: "Un servicio de limpieza semanal libera horas valiosas." },
  "Rutina de mañana con los niños": { protect: "Este tiempo no se delega o se simplifica. Crea una rutina visual que los niños puedan seguir solos con tu guía." },
  "Tiempo de conexión y juego": { protect: "Este es tu tiempo de presencia real. Bloquéalo en tu agenda como una cita inamovible." }
};

const initialHomeMaternalTasks = [
  { id: 1, title: "Rutina de mañana con los niños", category: "Maternidad", done: false },
  { id: 2, title: "Tiempo de juego y conexión", category: "Maternidad", done: false },
  { id: 3, title: "Tareas del colegio", category: "Maternidad", done: false }
];

const initialHomeWellnessTasks = [
  { id: 1, title: "Ejercicio o caminata", category: "Bienestar", done: false },
  { id: 2, title: "Tiempo para mí", category: "Bienestar", done: false }
];

const initialIncomeSources = [
  { id: 1, name: "Servicios 1:1", monthlyGoal: 3000, color: "purple", platform: "Transferencia bancaria" },
  { id: 2, name: "Cursos / Productos digitales", monthlyGoal: 2000, color: "pink", platform: "Hotmart" },
  { id: 3, name: "Membresías / Recurrente", monthlyGoal: 1500, color: "green", platform: "Mercado Pago" }
];

const initialBusinessSettings = {
  dailyGoal: 750,
  weeklyGoal: 3750,
  monthlyGoal: 15000,
  reinvestmentPercent: 10
};

const initialBanks = ["Bancolombia", "Daviplata", "Stripe", "Tarjeta negocio"];

const PLATFORM_FEES = {
  "Mercado Pago":           { pct: 3.49, fixed: 900,  currency: "COP", label: "3.49% + $900 COP" },
  "PayU":                   { pct: 3.49, fixed: 900,  currency: "COP", label: "3.49% + $900 COP" },
  "Bold":                   { pct: 2.99, fixed: 0,    currency: "",    label: "2.99%" },
  "PayPal":                 { pct: 3.49, fixed: 0.30, currency: "USD", label: "3.49% + $0.30 USD" },
  "Hotmart":                { pct: 9.9,  fixed: 0,    currency: "",    label: "9.9%" },
  "Wise":                   { pct: 0.41, fixed: 0,    currency: "",    label: "0.41%" },
  "Payoneer":               { pct: 3.0,  fixed: 0,    currency: "",    label: "3%" },
  "Transferencia bancaria": { pct: 0,    fixed: 0,    currency: "",    label: "Sin fee" },
  "Efectivo":               { pct: 0,    fixed: 0,    currency: "",    label: "Sin fee" }
};

function calcFee(amount, platform) {
  const p = PLATFORM_FEES[platform];
  if (!p || p.pct === 0) return 0;
  return Math.round((amount * p.pct) / 100);
}

const initialAnnualBudget = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
].map((month) => ({
  month,
  income: 0,
  fixedExpenses: 0,
  variableExpenses: 0,
  platformFees: 0
}));

const initialHomeBudget = [
  { id: 1, type: "Ingreso", description: "Aporte hogar", amount: 2000 },
  { id: 2, type: "Gasto variable", description: "Mercado", amount: 450 },
  { id: 3, type: "Deuda", description: "Tarjeta familiar", amount: 180 }
];

const affirmations = [
  "Una casa bien dirigida se construye con decisiones pequeñas y constantes, no con un solo gran esfuerzo.",
  "La mujer que sabe lo que vale no necesita demostrarle nada a nadie.",
  "Administrar bien lo poco es la práctica más poderosa antes de administrar lo mucho.",
  "Más vale responder con calma que ganar un argumento y perder una relación.",
  "Los planes del diligente generan resultados; la prisa sin dirección solo produce caos.",
  "Tu reputación se construye despacio y se destruye rápido — cuídala más que cualquier venta.",
  "La mujer que organiza su hogar con intención vive más libre que la que lo deja al azar.",
  "No confundas movimiento con avance. Lo que importa es si cada acción te acerca a tu meta.",
  "La generosidad verdadera no empobrece — abre puertas que el dinero solo no puede comprar.",
  "Quien cuida sus palabras cuida sus relaciones; quien cuida sus relaciones cuida su negocio.",
  "La constancia hace lo que el talento no puede sostener solo.",
  "Conocer tus números no es para contadores — es la diferencia entre dirigir y sobrevivir.",
  "La prisa es enemiga del criterio. Las mejores decisiones se toman con la cabeza fría.",
  "Una mujer que sabe escuchar tiene acceso a información que vale más que cualquier consejo pagado.",
  "El orden exterior refleja y refuerza el orden interior.",
  "Aprende de quien tiene lo que quieres lograr, no de quien opina desde afuera.",
  "Tu energía también es un recurso. Adminístrala como adminas tu tiempo y tu dinero.",
  "El éxito sostenible no se improvisa — se construye sobre hábitos que nadie ve.",
  "La humildad no es debilidad — es la base que sostiene a las personas que duran.",
  "Un negocio sin propósito claro es como una casa sin dirección: mucho movimiento, poco avance.",
  "Quien habla más de lo que actúa rara vez llega donde quiere. Las acciones construyen.",
  "El que cuida bien lo que tiene, siempre termina recibiendo más.",
  "No todo problema necesita solución urgente — algunos solo necesitan paciencia y perspectiva.",
  "La mujer que invierte en aprender nunca deja de crecer, sin importar el mercado.",
  "Más vale tener poco con paz en casa que abundar entre conflictos y tensión.",
  "Los grandes negocios se construyen sobre relaciones de confianza, no solo sobre transacciones.",
  "Cada día que organizas con intención es un día que no desperdiciaste.",
  "Corregir a tiempo cuesta menos que dejar que los problemas pequeños se conviertan en grandes.",
  "La mujer que cuida su bienestar cuida mejor a los que la rodean. No es egoísmo — es estrategia.",
  "Celebrar el progreso, aunque sea pequeño, es el combustible que mantiene el rumbo.",
  "La mejor inversión que puedes hacer hoy es la decisión que simplifica mañana."
];

const promesas = [
  "Cuando tus acciones tienen un propósito claro, los planes se convierten en realidad.",
  "La fortaleza y la dignidad son el mejor atuendo que una mujer puede ponerse cada mañana.",
  "No temas a lo que no puedes controlar. Concéntrate en lo que sí está en tus manos.",
  "Hay riqueza que se acumula demasiado rápido y se va igual — lo construido con cuidado dura.",
  "La mujer que trabaja con excelencia no necesita buscar reconocimiento — el reconocimiento la encuentra a ella.",
  "Cada mañana es una hoja en blanco. Lo que escribas hoy, lo leerás mañana.",
  "El corazón de quien planifica con cuidado raramente se ve sorprendido por el caos.",
  "La paz en el hogar no es ausencia de problemas — es la habilidad de navegarlos sin perder la dirección.",
  "Quien invierte en las personas correctas a su alrededor, multiplica lo que sola no podría.",
  "Las palabras bien elegidas construyen puentes; las palabras impulsivas los destruyen.",
  "No confíes solo en tu intuición cuando los números te dicen otra cosa — los dos tienen algo que enseñarte.",
  "El camino de quien aprende continuamente siempre se ilumina más adelante.",
  "Más vale vivir con integridad en una casa pequeña que con deshonestidad en un palacio.",
  "Quien cuida su reputación cuida su mayor activo — sin ella, ningún negocio prospera a largo plazo.",
  "La mujer que enseña bien a sus hijos e hijas está construyendo el futuro desde adentro.",
  "La diligencia abre puertas que el talento solo no puede tocar.",
  "No hay atajos para quien quiere resultados que duren. La paciencia es parte del proceso.",
  "Quien da sin esperar siempre recibe de maneras que no anticipaba.",
  "La grandeza de un hogar no se mide en metros — se mide en la calidad de sus conversaciones.",
  "El liderazgo empieza por casa: quien no puede organizarse a sí misma, difícilmente organiza a otros.",
  "Un negocio que no cuida a sus clientes es un negocio que trabaja contra sí mismo.",
  "La mujer que controla su carácter controla su destino — la que no, lo deja en manos del impulso.",
  "Hay tiempo para todo cuando sabes decir que no a lo que no te corresponde.",
  "La riqueza que se comparte con sabiduría regresa multiplicada de formas que el egoísmo no puede imaginar.",
  "Quien se rodea de personas que la hacen crecer, crece aunque no lo intente.",
  "Lo que haces cuando nadie mira define el tipo de persona que eres cuando todos miran.",
  "La comunicación honesta resuelve en minutos lo que el silencio puede destruir en años.",
  "Una meta sin fecha es solo un sueño. Dale nombre, número y plazo.",
  "La mujer que descansa bien trabaja mejor. El descanso no es pereza — es inversión.",
  "Toda abundancia que vale tiene raíces. Cuida las raíces antes que los frutos."
];

const ALL_MENU_ITEMS = [
  { id: "dashboard", label: "Inicio",          icon: "🏠" },
  { id: "home",      label: "Mi Hogar",         icon: "🌸" },
  { id: "business",  label: "Mi Negocio",       icon: "💼" },
  { id: "clients",   label: "Mis Clientes",     icon: "👩‍💼" },
  { id: "studio",    label: "Studio ✦",          icon: "🎬" },
  { id: "content",   label: "Mi Contenido",     icon: "📱" },
];
const MENU_MAMA        = ["dashboard", "home"];
const MENU_EMPRENDEDORA = ["dashboard", "business", "clients", "studio", "content"];

const diasSemana = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
function getWeekDays() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return `${diasSemana[d.getDay()]} ${d.getDate()}`;
  });
}
const weekDays = getWeekDays();

const currencyLocales = { USD: "en-US", COP: "es-CO", MXN: "es-MX", EUR: "de-DE" };
const monthShortNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function toInputDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayInputValue() {
  return toInputDate(new Date());
}

function parseDateValue(value) {
  if (!value) return null;
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inputDateFromValue(value) {
  const date = parseDateValue(value);
  return date ? toInputDate(date) : getTodayInputValue();
}

function timestampFromInputDate(value) {
  const date = parseDateValue(value);
  if (!date) return Date.now();
  date.setHours(12, 0, 0, 0);
  return date.getTime();
}

function formatShortDate(value) {
  const date = parseDateValue(value);
  if (!date) return "Sin fecha";
  return `${date.getDate()} ${monthShortNames[date.getMonth()]}`;
}

function getCurrentWeekRange(baseDate = new Date()) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end, startTime: start.getTime(), endTime: end.getTime() };
}

function isDateThisWeek(value, range = getCurrentWeekRange()) {
  const date = parseDateValue(value);
  if (!date) return false;
  const time = date.getTime();
  return time >= range.startTime && time <= range.endTime;
}

function getMonthWeekInfo(baseDate = new Date()) {
  const day = baseDate.getDate();
  const total = 4;
  const current = Math.min(total, Math.max(1, Math.ceil(day / 7)));
  return {
    current,
    total,
    month: monthShortNames[baseDate.getMonth()],
    progress: Math.min(100, Math.round((current / total) * 100))
  };
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const initialProfileForm = {
  name: "",
  photo: "",
  businessName: "",
  businessType: "Servicios 1:1",
  stage: "Creciendo",
  monthlyGoalSetup: "",
  mainChallenge: "Conseguir clientes"
};

const initialBrandProfile = {
  queOfreces: "",
  clienteIdeal: "",
  transformacion: "",
  tono: "Cercano",
  redPrincipal: "Instagram",
  hashtags: ""
};

const initialPurposeState = {
  mood: "inspirada",
  energy: "medio",
  mentalLoad: "",
  microVictory: "",
  victoryDone: false,
  water: false,
  walk: false,
  silence: false,
  devotional: false,
  familyDays: { L: false, M: false, X: false, J: false, V: false, S: false, D: false },
  connectionMoments: 0,
  hoursWorked: 0,
  recurringIncomePercent: 0,
  systemsPercent: 0,
  clientsImpacted: 0,
  weekTestimony: "",
  passionLevel: 3,
  visionClarity: "",
  sueno: "",
  tiempoParaMi: 0,
  presenceMoments: [],
};

function cloneList(items) {
  return items.map((item) => ({ ...item }));
}

function createInitialPurpose(overrides = {}) {
  return {
    ...initialPurposeState,
    ...overrides,
    familyDays: {
      ...initialPurposeState.familyDays,
      ...(overrides.familyDays || {})
    }
  };
}

function normalizeAnnualBudget(rows = initialAnnualBudget) {
  return rows.map((row) => {
    const income = Number(row.income || 0);
    return {
      month: row.month,
      income,
      fixedExpenses: row.fixedExpenses ?? Math.round(income * 0.45),
      variableExpenses: row.variableExpenses ?? Math.round(income * 0.35),
      platformFees: row.platformFees ?? 0
    };
  });
}

function normalizeMovements(items = []) {
  return items.map((item) => {
    const fallback = item.createdAt || item.id;
    const date = item.date || (fallback && fallback > 1000000000000 ? inputDateFromValue(fallback) : getTodayInputValue());
    return {
      ...item,
      date,
      createdAt: item.createdAt || timestampFromInputDate(date)
    };
  });
}

function normalizeClients(items = []) {
  return items.map((item) => {
    const lastContactDate = item.lastContactDate || inputDateFromValue(item.lastContact || item.updatedAt || item.createdAt || Date.now());
    const lastContact = item.lastContact || timestampFromInputDate(lastContactDate);
    return {
      ...item,
      lastContact,
      lastContactDate,
      createdAt: item.createdAt || lastContact,
      updatedAt: item.updatedAt || lastContact
    };
  });
}

function normalizeHomeBudget(items = []) {
  return items.map((item) => {
    const dueDate = item.dueDate || inputDateFromValue(item.createdAt || Date.now());
    return {
      ...item,
      dueDate,
      createdAt: item.createdAt || timestampFromInputDate(dueDate)
    };
  });
}

function createBlankUserState(currency = "USD") {
  return {
    activeView: "dashboard",
    currency,
    movements: [],
    tasks: [],
    clients: [],
    contentItems: [],
    goals: [],
    homeTasks: [],
    systemTasks: cloneList(initialSystemTasks),
    maternalTasks: cloneList(initialHomeMaternalTasks),
    wellnessTasks: cloneList(initialHomeWellnessTasks),
    incomeSources: cloneList(initialIncomeSources),
    salesGoal: 0,
    contactLog: {},
    weekBlocks: {},
    businessSettings: { ...initialBusinessSettings },
    banks: [...initialBanks],
    annualBudget: normalizeAnnualBudget(initialAnnualBudget),
    homeBudget: [],
    purpose: createInitialPurpose(),
    profileSetup: null,
    groceryList: [],
    userPlan: "free",
    premiumExpiresAt: null,
    userMode: null
  };
}

const API_URL      = "https://p5ftnawyxe.execute-api.us-east-1.amazonaws.com/default/mamaceo-user-data";
const GEMINI_URL   = "https://p5ftnawyxe.execute-api.us-east-1.amazonaws.com/default/mamaceo-gemini";
const PAYMENTS_URL = "https://p5ftnawyxe.execute-api.us-east-1.amazonaws.com/default/mamaceo-payments";

const HOTMART_LINKS = {
  mama:         "https://pay.hotmart.com/O106234254M?off=x324h3to",
  emprendedora: "https://pay.hotmart.com/O106234254M?off=p2i17fh0",
  ceo:          "https://pay.hotmart.com/O106234254M?off=f4oowsve",
};
const HOTMART_LINKS_YEAR = {
  mama:         "https://pay.hotmart.com/O106234254M?off=56ccbjyb",
  emprendedora: "https://pay.hotmart.com/O106234254M?off=03099551",
  ceo:          "https://pay.hotmart.com/O106234254M?off=sd3qm0jg",
};

const PAYPAL_CLIENT_ID = "AeS56ptU569VQKMGhVeWn1cYsDYTFlq0oxmRPmzcle0g1jxhBjcu4uo29AQofLNHhkzrwRxKYm4tKchS";
const PAYPAL_PLAN_IDS  = {
  mama:         "P-1JS89076U5207463PNITBXNI",
  emprendedora: "P-4BJ96851N4568881DNITBYZY",
  ceo:          "P-4FG244764W7235101NITBZ6Y",
};
const MP_PUBLIC_KEY = "APP_USR-e76c6b9b-9905-4a1a-b946-9f66e40c6e8e";

async function getRemoteAuthHeaders(includeJson = false) {
  const token = await getAwsAuthToken();
  if (!token) {
    throw new Error("No hay token seguro de AWS. Inicia sesión nuevamente.");
  }
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${token}`
  };
}

async function loadRemoteState() {
  const headers = await getRemoteAuthHeaders();
  const res = await fetch(API_URL, { mode: "cors", headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`AWS respondió ${res.status}`);
  const json = await res.json();
  return json.data ?? null;
}

async function saveRemoteState(data) {
  const headers = await getRemoteAuthHeaders(true);
  const res = await fetch(API_URL, {
    mode: "cors",
    method: "POST",
    headers,
    body: JSON.stringify({ data })
  });
  if (!res.ok) throw new Error(`AWS respondió ${res.status}`);
}

async function deleteRemoteState() {
  const headers = await getRemoteAuthHeaders();
  const res = await fetch(API_URL, {
    mode: "cors",
    method: "DELETE",
    headers
  });
  if (!res.ok) throw new Error(`AWS respondió ${res.status}`);
}

export default function App() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installBannerDismissed, setInstallBannerDismissed] = useState(() => !!localStorage.getItem("installDismissed"));
  const [localWarnDismissed, setLocalWarnDismissed] = useState(() => !!localStorage.getItem("localWarnDismissed"));
  const [paymentProcessing, setPaymentProcessing] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState(null);
  const [upgradeModal, setUpgradeModal] = useState(null);
  const [pricingCycle, setPricingCycle] = useState("monthly");
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent);

  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallAndroid = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") { setInstallPrompt(null); setInstallBannerDismissed(true); }
  };
  const dismissInstall = () => { localStorage.setItem("installDismissed", "1"); setInstallBannerDismissed(true); };

  const stored = loadState();
  const [activeView, setActiveView] = useState(stored?.activeView || "dashboard");
  const [currency, setCurrency] = useState(stored?.currency || "USD");
  const isNewUser = !stored;
  const [movements, setMovements] = useState(isNewUser ? [] : normalizeMovements(stored?.movements || initialMovements));
  const [tasks, setTasks] = useState(isNewUser ? [] : migratePriorityList(stored?.tasks || initialTasks));
  const [clients, setClients] = useState(isNewUser ? [] : normalizeClients(stored?.clients || initialClients));
  const [contentItems, setContentItems] = useState(isNewUser ? [] : (stored?.contentItems || initialContent));
  const [goals, setGoals] = useState(isNewUser ? [] : (stored?.goals || initialGoals));
  const [homeTasks, setHomeTasks] = useState(isNewUser ? [] : migratePriorityList(stored?.homeTasks || initialHomeTasks));
  const [systemTasks, setSystemTasks] = useState(stored?.systemTasks || initialSystemTasks);
  const [systemSlide, setSystemSlide] = useState(0);
  const [newSystemTask, setNewSystemTask] = useState("");
  const [incomeSources, setIncomeSources] = useState(stored?.incomeSources || initialIncomeSources);
  const [incomeSourceForm, setIncomeSourceForm] = useState({ name: "", monthlyGoal: "" });
  const [editingSourceId, setEditingSourceId] = useState(null);
  const [showAddSource, setShowAddSource] = useState(false);
  const [maternalTasks, setMaternalTasks] = useState(stored?.maternalTasks || initialHomeMaternalTasks);
  const [wellnessTasks, setWellnessTasks] = useState(stored?.wellnessTasks || initialHomeWellnessTasks);
  const [maternalForm, setMaternalForm] = useState("");
  const [wellnessForm, setWellnessForm] = useState("");
  const [banks, setBanks] = useState(stored?.banks || initialBanks);
  const [newBank, setNewBank] = useState("");
  const [annualBudget, setAnnualBudget] = useState(normalizeAnnualBudget(stored?.annualBudget || initialAnnualBudget));
  const [homeBudget, setHomeBudget] = useState(isNewUser ? [] : normalizeHomeBudget(stored?.homeBudget || initialHomeBudget));
  const [homeBudgetForm, setHomeBudgetForm] = useState({ type: "Gasto variable", description: "", amount: "", dueDate: getTodayInputValue() });
  const [purpose, setPurpose] = useState(createInitialPurpose(stored?.purpose || {}));
  const [profileSetup, setProfileSetup] = useState(stored?.profileSetup || null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileForm, setProfileForm] = useState({ ...initialProfileForm });
  const [profilePhotoError, setProfilePhotoError] = useState("");
  const [brandProfile, setBrandProfile] = useState(stored?.brandProfile || { ...initialBrandProfile });
  const [editingBrand, setEditingBrand] = useState(false);
  const [brandForm, setBrandForm] = useState(stored?.brandProfile || { ...initialBrandProfile });
  const [user, setUser] = useState(null);
  const [preAuthView, setPreAuthView] = useState("landing");
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState("");
  const [authNewPassword, setAuthNewPassword] = useState("");
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showAuthPasswordConfirm, setShowAuthPasswordConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const [confirmMode, setConfirmMode] = useState(false);
  const [confirmCode, setConfirmCode] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetStep, setResetStep] = useState(1);
  const [ready, setReady] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [isRestoringRemote, setIsRestoringRemote] = useState(false);
  const [cloudReadyUserId, setCloudReadyUserId] = useState(null);
  const [remoteStorageEnabled, setRemoteStorageEnabled] = useState(true);
  const awsActive = isAwsConfigured;
  const [businessSettings, setBusinessSettings] = useState({
    ...initialBusinessSettings,
    ...(stored?.businessSettings || {})
  });

  const [form, setForm] = useState({ type: "income", classification: "Servicios", description: "", category: "", categoryOther: "", amount: "", bank: banks[0] || "", date: getTodayInputValue() });
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [clientForm, setClientForm] = useState({ name: "", service: "", status: "Lead tibio", amount: "", nextAction: "", source: "", customSource: "", phone: "", lastContactDate: getTodayInputValue() });
  const [clientFormErrors, setClientFormErrors] = useState({});
  const [contentFilter, setContentFilter] = useState("");
  const [salesGoal, setSalesGoal] = useState(stored?.salesGoal || 0);
  const [contactLog, setContactLog] = useState(stored?.contactLog || {});
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [weekBlocks, setWeekBlocks] = useState(stored?.weekBlocks || {});
  const [contentForm, setContentForm] = useState({ title: "", hook: "", format: "Reel", network: "Instagram", customNetwork: "", week: "Semana 1", status: "Pendiente", goal: "Vender", publishDate: "" });
  const [showContentForm, setShowContentForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: "", amount: "", period: "Mensual", status: "Activa" });
  const [homeForm, setHomeForm] = useState({ title: "", category: "Rutina", priority: "Normal", delegate: "", frequency: "Rutina", customFrequency: "", duration: "" });
  const [taskForm, setTaskForm] = useState({ text: "", priority: "Normal", dueDate: "", duration: "" });
  const [homeFocusOverride, setHomeFocusOverride] = useState(stored?.homeFocusOverride || null);
  const [groceryList, setGroceryList] = useState(stored?.groceryList || []);
  const [appointments, setAppointments] = useState(stored?.appointments || []);
  const [weekMenu, setWeekMenu] = useState(() => {
    const wm = stored?.weekMenu;
    const mg = v => !v ? {desayuno:"",almuerzo:"",cena:"",snack:""} : typeof v==="string" ? {desayuno:"",almuerzo:v,cena:"",snack:""} : {desayuno:"",almuerzo:"",cena:"",snack:"",...v};
    return {L:mg(wm?.L),M:mg(wm?.M),X:mg(wm?.X),J:mg(wm?.J),V:mg(wm?.V),S:mg(wm?.S),D:mg(wm?.D)};
  });
  const [homeRoutines, setHomeRoutines] = useState(stored?.homeRoutines || { L:"",M:"",X:"",J:"",V:"",S:"",D:"" });
  const [kidsSchedule, setKidsSchedule] = useState(() => {
    const raw = stored?.kidsSchedule || {};
    const out = {};
    ["L","M","X","J","V","S","D"].forEach(d => {
      const v = raw[d];
      out[d] = (v && typeof v === "object" && "act" in v) ? v : { act: (typeof v === "string" ? v : ""), time: "" };
    });
    return out;
  });
  const [quickNotes, setQuickNotes] = useState(stored?.quickNotes || []);
  const [quickNoteInput, setQuickNoteInput] = useState("");
  const [groceryForm, setGroceryForm] = useState("");
  const [reportWeekOffset, setReportWeekOffset] = useState(0);
  const [businessTab, setBusinessTab] = useState(0);
  const [userPlan, setUserPlan] = useState(stored?.userPlan || "free");
  const [premiumExpiresAt, setPremiumExpiresAt] = useState(stored?.premiumExpiresAt || null);
  const [userMode, setUserMode] = useState(stored?.userMode || null);
  const [presenceForm, setPresenceForm] = useState({ quien: [], queHicieron: "", tiempo: "30 min" });
  const [presenceCelebration, setPresenceCelebration] = useState(false);
  const [homeTaskError, setHomeTaskError] = useState("");
  const [homeBudgetError, setHomeBudgetError] = useState("");
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [homeTab, setHomeTab] = useState(0);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [abiMenuPrefs, setAbiMenuPrefs] = useState({ personas: "4", dieta: "normal", pais: "colombia" });
  const [abiMenuSuggestion, setAbiMenuSuggestion] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showFamilyTimeModal, setShowFamilyTimeModal] = useState(false);
  const [familyMembers, setFamilyMembers] = useState(stored?.familyMembers || []);
  const [showFamilyConfig, setShowFamilyConfig] = useState(false);
  const [reminderTime, setReminderTime] = useState(stored?.reminderTime || "08:00");
  const [reminderEnabled, setReminderEnabled] = useState(stored?.reminderEnabled !== false);
  const [toolsFabOpen, setToolsFabOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [calendarAddDate, setCalendarAddDate] = useState(null);
  const [calendarNewAppt, setCalendarNewAppt] = useState({ title: "", type: "Médico", time: "", recurrence: "none", duration: "" });
  const [calTab, setCalTab] = useState("all");
  const [calMorningDismissed, setCalMorningDismissed] = useState(false);
  const [calendarEditAppt, setCalendarEditAppt] = useState(null);
  const [calToast, setCalToast] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [betaCode, setBetaCode] = useState("");
  const [betaCodeError, setBetaCodeError] = useState("");
  const [showBetaInput, setShowBetaInput] = useState(false);

  // Temporizador Pomodoro
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState("work");
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [pomodoroSeconds, setPomodoroSeconds] = useState(0);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroBlocks, setPomodoroBlocks] = useState(0);
  const [pomodoroWorkDuration, setPomodoroWorkDuration] = useState(25);
  const [pomodoroBreakDuration, setPomodoroBreakDuration] = useState(5);
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const [pomodoroCelebrating, setPomodoroCelebrating] = useState(false);
  const [clockNow, setClockNow] = useState(() => new Date());
  const pomodoroRef = React.useRef(null);
  const audioCtxRef = React.useRef(null);

  useEffect(() => {
    if (pomodoroRunning) {
      pomodoroRef.current = setInterval(() => {
        setPomodoroSeconds((s) => {
          if (s > 0) return s - 1;
          setPomodoroMinutes((m) => {
            if (m > 0) return m - 1;
            setPomodoroRunning(false);
            if (pomodoroMode === "work") {
              setPomodoroBlocks((b) => b + 1);
              setPomodoroMode("break");
              setPomodoroMinutes(pomodoroBreakDuration);
              playChime();
              if (Notification.permission === "granted") new Notification("🍅 Bloque completado", { body: POMODORO_MESSAGES[Math.floor(Math.random() * POMODORO_MESSAGES.length)], icon: "/logo.png" });
            } else {
              setPomodoroMode("work");
              setPomodoroMinutes(pomodoroWorkDuration);
              playChime();
              if (Notification.permission === "granted") new Notification("💪 ¡A trabajar!", { body: "¡Nuevo bloque de enfoque!", icon: "/logo.png" });
            }
            return 0;
          });
          return 59;
        });
      }, 1000);
    } else {
      clearInterval(pomodoroRef.current);
    }
    return () => clearInterval(pomodoroRef.current);
  }, [pomodoroRunning, pomodoroMode, pomodoroWorkDuration, pomodoroBreakDuration]);

  const pomodoroReset = () => { setPomodoroRunning(false); setPomodoroMode("work"); setPomodoroMinutes(pomodoroWorkDuration); setPomodoroSeconds(0); };
  const requestNotificationPermission = () => { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); };

  useEffect(() => {
    const id = setInterval(() => setClockNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const unlock = () => {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
      } catch(e) {}
    };
    document.addEventListener("click", unlock, { once: true });
    return () => document.removeEventListener("click", unlock);
  }, []);

  useEffect(() => {
    if (!("Notification" in window)) return;
    const askAndNotify = async () => {
      if (Notification.permission === "default") await Notification.requestPermission();
      if (Notification.permission !== "granted") return;
      const today0 = new Date(); today0.setHours(0,0,0,0);
      const todayAppts = appointments.filter(a => {
        const diff = Math.round((new Date(a.date + "T00:00:00") - today0) / 86400000);
        return diff === 0 || diff === 1;
      });
      if (!todayAppts.length) return;
      const lastNotif = localStorage.getItem("lastApptNotif");
      const todayStr = new Date().toISOString().slice(0, 10);
      if (lastNotif === todayStr) return;
      localStorage.setItem("lastApptNotif", todayStr);
      const todayList = todayAppts.filter(a => Math.round((new Date(a.date + "T00:00:00") - today0) / 86400000) === 0);
      const tmrwList  = todayAppts.filter(a => Math.round((new Date(a.date + "T00:00:00") - today0) / 86400000) === 1);
      let body = "";
      if (todayList.length) body += `Hoy: ${todayList.map(a => a.title).join(", ")}. `;
      if (tmrwList.length)  body += `Mañana: ${tmrwList.map(a => a.title).join(", ")}.`;
      new Notification("MamaCEO 🌸 — Citas próximas", { body: body.trim(), icon: "/logo.png" });
    };
    const timer = setTimeout(askAndNotify, 1500);
    return () => clearTimeout(timer);
  }, []);

  function playChime() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      [[523.25, 0], [659.25, 0.2], [783.99, 0.4], [1046.5, 0.6]].forEach(([freq, delay]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        const t = ctx.currentTime + delay;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
        osc.start(t);
        osc.stop(t + 1.4);
      });
    } catch(e) {}
  }

  useEffect(() => {
    if (!reminderEnabled || !reminderTime) return;
    const [h, m] = reminderTime.split(":").map(Number);
    const now    = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    const ms = target - now;
    if (ms < -300000) return; // more than 5 min past → skip today
    const delay = Math.max(0, ms);
    const timer = setTimeout(() => {
      playChime();
      if (Notification.permission !== "granted") return;
      const t0 = new Date(); t0.setHours(0,0,0,0);
      const soon = appointments.filter(a => {
        const diff = Math.round((new Date(a.date + "T00:00:00") - t0) / 86400000);
        return diff >= 0 && diff <= 2;
      });
      if (!soon.length) {
        new Notification("MamaCEO 🌸 — Buenos días", { body: "¡Hoy es un gran día para tu negocio!", icon: "/logo.png" });
        return;
      }
      const body = soon.map(a => {
        const diff = Math.round((new Date(a.date + "T00:00:00") - t0) / 86400000);
        return `${diff === 0 ? "Hoy" : diff === 1 ? "Mañana" : "En 2d"}: ${a.title}`;
      }).join(" · ");
      new Notification("MamaCEO 🌸 — Buenos días", { body, icon: "/logo.png" });
    }, delay);
    return () => clearTimeout(timer);
  }, [reminderEnabled, reminderTime, appointments]);

  // Detectar redirect de Mercado Pago después de que usuaria aprueba suscripción
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mpResult = params.get("mp_result");
    const mpPlan   = params.get("mp_plan");
    if (mpResult === "approved" && mpPlan) {
      setUserPlan(mpPlan);
      setPremiumExpiresAt(Date.now() + 31 * 24 * 60 * 60 * 1000);
      setPaymentMessage({ type: "success", text: `¡Suscripción activada! Bienvenida al plan ${mpPlan === "mama" ? "Mamá" : mpPlan === "emprendedora" ? "Emprendedora" : "CEO"}. 🎉` });
      setActiveView("pricing");
      window.history.replaceState({}, "", "/");
    }
    if (mpResult === "failure" || mpResult === "pending") {
      setPaymentMessage({ type: "error", text: "El pago no se completó. Puedes intentarlo de nuevo cuando quieras." });
      setActiveView("pricing");
      window.history.replaceState({}, "", "/");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar email en DynamoDB al abrir precios (para webhook de Hotmart)
  useEffect(() => {
    if (activeView !== "pricing" || !user) return;
    const email = user.email || profileSetup?.email;
    if (!email) return;
    fetch(PAYMENTS_URL, {
      method: "POST", mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save-email", userId: user.id, email })
    }).catch(() => {});
  }, [activeView, user]);


  const startMPSubscription = async (planId) => {
    if (!user) { setPaymentMessage({ type: "error", text: "Debes iniciar sesión para suscribirte." }); return; }
    setPaymentProcessing(`mp-${planId}`);
    try {
      const res = await fetch(PAYMENTS_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-mp-subscription", planType: planId, userEmail: user.email || profileSetup?.email || "" })
      });
      const json = await res.json();
      if (json.init_point) {
        window.location.href = json.init_point;
      } else {
        setPaymentMessage({ type: "error", text: json.error || "Error al conectar con Mercado Pago. Intenta de nuevo." });
        setPaymentProcessing(null);
      }
    } catch (err) {
      setPaymentMessage({ type: "error", text: `Error: ${err.message || "No se pudo conectar con el servidor de pagos."}` });
      setPaymentProcessing(null);
    }
  };

  const BETA_CODES = [
    { hash: "1df2627e3ac0f8268c070acdbf13b0d354f16f2c38bf873dee2d54b86af13440", days: 90, expiry: new Date("2026-12-31T23:59:59").getTime() },
    { hash: "42f8fdb0a7354c04e994970759b87588906eccb7741c9bc5a7dd52471f7961bf", days: 60, expiry: new Date("2027-12-31T23:59:59").getTime() },
  ];
  const hashCode = async (str) => {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
  };

  const effectivePlan = useMemo(() => {
    if (userPlan === "ceo" || userPlan === "emprendedora" || userPlan === "mama") {
      if (premiumExpiresAt && Date.now() > premiumExpiresAt) return "free";
      return userPlan;
    }
    if (userPlan === "premium") {
      if (premiumExpiresAt && Date.now() > premiumExpiresAt) return "free";
      return "ceo";
    }
    return "free";
  }, [userPlan, premiumExpiresAt]);

  const currentLimits = PLAN_LIMITS[effectivePlan] || PLAN_LIMITS.free;

  const callGemini = async (type, context) => {
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
  };

  const betaDaysLeft = useMemo(() => {
    if (userPlan !== "premium" || !premiumExpiresAt) return null;
    const days = Math.ceil((premiumExpiresAt - Date.now()) / 86400000);
    return days > 0 ? days : 0;
  }, [userPlan, premiumExpiresAt]);

  const isBetaUser = userPlan === "premium" && premiumExpiresAt !== null;

  const activateBetaCode = async (e) => {
    e.preventDefault();
    setBetaCodeError("");
    const entered = await hashCode(betaCode.trim().toUpperCase());
    const match = BETA_CODES.find(c => entered === c.hash);
    if (!match) {
      setBetaCodeError("Código incorrecto. Verifica el correo de bienvenida de UMP Academy.");
      return;
    }
    if (Date.now() > match.expiry) {
      setBetaCodeError("Este código ya expiró.");
      return;
    }
    const expiresAt = Date.now() + match.days * 86400000;
    setUserPlan("premium");
    setPremiumExpiresAt(expiresAt);
    setShowBetaInput(false);
    setBetaCode("");
  };

  const money = useMemo(() => new Intl.NumberFormat(currencyLocales[currency] || "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }), [currency]);

  const totals = useMemo(() => {
    const income = movements.filter((movement) => movement.type === "income").reduce((sum, movement) => sum + movement.amount, 0);
    const expenses = movements.filter((movement) => movement.type === "expense").reduce((sum, movement) => sum + movement.amount, 0);
    const profit = income - expenses;
    const margin = income ? Math.round((profit / income) * 100) : 0;
    return { income, expenses, profit, margin };
  }, [movements]);

  const monthlyGoal = businessSettings.monthlyGoal || initialBusinessSettings.monthlyGoal;
  const weeklyGoal = businessSettings.weeklyGoal || initialBusinessSettings.weeklyGoal;
  const dailyGoal = businessSettings.dailyGoal || initialBusinessSettings.dailyGoal;
  const reinvestmentPercent = businessSettings.reinvestmentPercent ?? initialBusinessSettings.reinvestmentPercent;
  const reinvestmentAmount = Math.round(totals.income * (reinvestmentPercent / 100));
  const monthlyProgress = Math.min(Math.round((totals.income / monthlyGoal) * 100), 100);
  const weeklyProgress = Math.min(Math.round((totals.income / weeklyGoal) * 100), 100);
  const dailyProgress = Math.min(Math.round((totals.income / dailyGoal) * 100), 100);
  const monthWeekInfo = useMemo(() => getMonthWeekInfo(), []);
  const currentWeekRange = useMemo(() => getCurrentWeekRange(), []);
  const sortedMovements = useMemo(() => [...movements].sort((a, b) => timestampFromInputDate(b.date || b.createdAt) - timestampFromInputDate(a.date || a.createdAt)), [movements]);
  const completedTasks = tasks.filter((task) => task.done).length;
  const completedHomeTasks = homeTasks.filter((task) => task.done).length;
  const activeClients = clients.filter((client) => ["Lead tibio", "Lead caliente", "Venta ganada"].includes(client.status)).length;
  const publishedContent = contentItems.filter((item) => item.status === "Publicado").length;
  const pendingHomeTasks = homeTasks.filter((task) => !task.done);
  const followUpClients = clients.filter((client) => ["Lead frio", "Lead tibio", "Lead caliente"].includes(client.status));
  const wonSalesTotal = clients.filter((client) => client.status === "Venta ganada").reduce((sum, client) => sum + client.amount, 0);
  const topClient = [...clients].sort((a, b) => b.amount - a.amount)[0];
  const nextContent = contentItems.find((item) => item.status !== "Publicado");
  const topIncomeSource = [...movements].filter((movement) => movement.type === "income").sort((a, b) => b.amount - a.amount)[0];
  const annualTotals = annualBudget.reduce((sum, row) => ({
    income: sum.income + Number(row.income || 0),
    expenses: sum.expenses + Number(row.fixedExpenses || 0) + Number(row.variableExpenses || 0),
    platformFees: sum.platformFees + Number(row.platformFees || 0)
  }), { income: 0, expenses: 0, platformFees: 0 });
  const annualProfit = annualTotals.income - annualTotals.expenses - annualTotals.platformFees;
  const annualFixedTotal = annualBudget.reduce((sum, row) => sum + Number(row.fixedExpenses || 0), 0);
  const annualVariableTotal = annualBudget.reduce((sum, row) => sum + Number(row.variableExpenses || 0), 0);
  const annualProjectedIncomeSources = [{
    classification: "Ventas",
    amount: annualTotals.income,
    example: "Proyección anual desde ventas"
  }];
  const annualProjectedExpenseDestinations = [
    { classification: "Gastos fijos", amount: annualFixedTotal, note: "Costos recurrentes y nómina" },
    { classification: "Gastos variables", amount: annualVariableTotal, note: "Publicidad, herramientas y producción" },
    { classification: "Reinversión", amount: Math.round(annualTotals.income * 0.20), note: "Marketing, crecimiento y mejora" }
  ];
  const homeBudgetTotals = homeBudget.reduce((sum, row) => {
    if (row.type === "Ingreso") return { ...sum, income: sum.income + row.amount };
    if (row.type === "Ahorro") return { ...sum, savings: sum.savings + row.amount };
    if (row.type === "Deuda") return { ...sum, debt: sum.debt + row.amount };
    if (row.type === "Gasto fijo") return { ...sum, fixed: sum.fixed + row.amount };
    if (row.type === "Gasto hormiga") return { ...sum, smallLeaks: sum.smallLeaks + row.amount };
    return { ...sum, variable: sum.variable + row.amount };
  }, { income: 0, fixed: 0, variable: 0, smallLeaks: 0, debt: 0, savings: 0 });
  const homeSpent = homeBudgetTotals.fixed + homeBudgetTotals.variable + homeBudgetTotals.smallLeaks + homeBudgetTotals.debt;
  const homeAvailable = homeBudgetTotals.income - homeSpent - homeBudgetTotals.savings;
  const homePaymentsThisWeek = homeBudget
    .filter((item) => !["Ingreso", "Ahorro"].includes(item.type) && isDateThisWeek(item.dueDate || item.createdAt, currentWeekRange))
    .sort((a, b) => timestampFromInputDate(a.dueDate) - timestampFromInputDate(b.dueDate));
  const biggestHomeLeak = [
    ["gastos fijos", homeBudgetTotals.fixed],
    ["gastos variables", homeBudgetTotals.variable],
    ["gastos hormiga", homeBudgetTotals.smallLeaks],
    ["deudas", homeBudgetTotals.debt]
  ].sort((a, b) => b[1] - a[1])[0];
  const familyDaysCount = Object.values(purpose.familyDays || {}).filter(Boolean).length;
  const todayAffirmation = affirmations[new Date().getDate() % affirmations.length];
  const excellenceActions = [
    topClient ? `Contactar a ${topClient.name}: ${topClient.nextAction || "hacer seguimiento"}.` : "Registrar tu cliente de mayor potencial.",
    nextContent ? `Mover contenido clave: ${nextContent.title}.` : "Crear una pieza de contenido enfocada en venta.",
    totals.profit >= 0 ? `Separar ${money.format(reinvestmentAmount)} para reinversión antes de gastar.` : "Reducir un gasto no esencial esta semana.",
    pendingHomeTasks[0] ? `Resolver o delegar: ${pendingHomeTasks[0].title}.` : "Proteger un bloque de descanso real."
  ];

  const actualExpenseBreakdown = movements.filter((movement) => movement.type === "expense").reduce((acc, movement) => {
    if (movement.classification === "Gasto fijo") return { ...acc, fixed: acc.fixed + movement.amount };
    if (movement.classification === "Gasto variable") return { ...acc, variable: acc.variable + movement.amount };
    return { ...acc, other: acc.other + movement.amount };
  }, { fixed: 0, variable: 0, other: 0 });

  const budgetMonthlyIncome = annualTotals.income / 12;
  const confirmDelete = (msg, onConfirm) => { if (window.confirm(msg)) onConfirm(); };
  const signOut = async () => {
    await awsAuth.signOut();
    setCloudReadyUserId(null);
    window.localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const translateError = (message) => {
    const translations = {
      "Password did not conform with policy: Password not long enough": "La contraseña debe tener al menos 8 caracteres.",
      "Password did not conform with policy: Password must have uppercase characters": "La contraseña debe tener al menos una letra mayúscula.",
      "Password did not conform with policy: Password must have lowercase characters": "La contraseña debe tener al menos una letra minúscula.",
      "Password did not conform with policy: Password must have numeric characters": "La contraseña debe incluir al menos un número.",
      "Password did not conform with policy: Password must have symbol characters": "La contraseña debe incluir al menos un símbolo (ej: !@#$%).",
      "User already registered": "El usuario ya está registrado",
      "Password should be at least 6 characters": "La contraseña debe tener al menos 8 caracteres",
      "Unable to validate email address: invalid format": "Formato de correo electrónico inválido",
      "Email not confirmed": "Correo electrónico no confirmado",
      "Signup is disabled": "El registro está deshabilitado",
      "Too many requests": "Demasiadas solicitudes, intenta más tarde",
      "Invalid email": "Correo electrónico inválido",
      "Email rate limit exceeded": "Límite de envío de correos excedido, espera unos minutos e intenta de nuevo",
      "Magic link rate limit exceeded": "Límite de envío de enlaces excedido, espera unos minutos e intenta de nuevo"
    };
    if (message?.toLowerCase().includes("rate limit exceeded")) {
      return "Límite de envío de correos excedido, espera unos minutos e intenta de nuevo";
    }
    return translations[message] || message;
  };

  const getPasswordChecks = (pw) => [
    { key: "len",   label: "Mínimo 8 caracteres",        ok: pw.length >= 8 },
    { key: "upper", label: "Una letra mayúscula",         ok: /[A-Z]/.test(pw) },
    { key: "lower", label: "Una letra minúscula",         ok: /[a-z]/.test(pw) },
    { key: "num",   label: "Un número",                   ok: /[0-9]/.test(pw) },
    { key: "sym",   label: "Un símbolo (ej: !@#$%)",      ok: /[^A-Za-z0-9]/.test(pw) },
  ];

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(authEmail)) {
      setAuthError("Por favor ingresa un correo electrónico válido.");
      return;
    }
    
    if (authMode === "signup") {
      const failedChecks = getPasswordChecks(authPassword).filter((c) => !c.ok);
      if (failedChecks.length > 0) {
        setAuthError(`Tu contraseña necesita: ${failedChecks.map((c) => c.label.toLowerCase()).join(", ")}.`);
        return;
      }
      if (authPassword !== authPasswordConfirm) {
        setAuthError("Las contraseñas no coinciden.");
        return;
      }
    }
    
    setAuthLoading(true);
    try {
      if (authMode === "login") {
        const { data, error } = await awsAuth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) setAuthError(translateError(error.message));
        else if (data?.user) setUser(data.user);
      } else {
        const { error } = await awsAuth.signUp({
          email: authEmail,
          password: authPassword,
          options: { data: { full_name: authName.trim() } }
        });
        if (error) setAuthError(translateError(error.message));
        else { setConfirmMode(true); setAuthError(""); }
      }
    } catch (err) {
      setAuthError("Error de conexión. Por favor verifica tu internet e intenta de nuevo.");
      console.error("Error de autenticación:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleConfirmCode = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const { error } = await awsAuth.confirmSignUp({ email: authEmail, code: confirmCode });
      if (error) { setAuthError(translateError(error.message)); }
      else {
        const { data } = await awsAuth.signInWithPassword({ email: authEmail, password: authPassword });
        if (data?.user) setUser(data.user);
        setConfirmMode(false);
      }
    } catch (err) {
      setAuthError("Error al confirmar. Intenta de nuevo.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!authEmail) { setAuthError("Ingresa tu correo electrónico primero."); return; }
    setAuthError("");
    setAuthLoading(true);
    const { error } = await awsAuth.resetPasswordForEmail(authEmail);
    setAuthLoading(false);
    if (error) setAuthError(translateError(error.message));
    else { setResetEmail(authEmail); setResetStep(2); setResetPassword(true); }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const { error } = await confirmAwsResetPassword({ email: resetEmail, code: resetCode, newPassword: resetNewPassword });
      if (error) {
        setAuthError(translateError(error.message));
      } else {
        setResetPassword(false);
        setResetStep(1);
        setAuthError("? Contraseña actualizada. Ya puedes iniciar sesión.");
      }
    } catch (err) {
      setAuthError(translateError(err.message));
    } finally {
      setAuthLoading(false);
    }
  };

  const monthlyIncomeRatio = budgetMonthlyIncome ? totals.income / budgetMonthlyIncome : 0;
  const actualVariableShare = totals.expenses ? actualExpenseBreakdown.variable / totals.expenses : 0;
  const actualFixedShare = totals.expenses ? actualExpenseBreakdown.fixed / totals.expenses : 0;
  const projectedReinvestmentMonthly = Math.round((annualTotals.income * 0.2) / 12);

  const insights = useMemo(() => {
    const notes = [];

    if (annualTotals.income === 0) {
      notes.push("Aún no hay ingresos proyectados para el año. Completa la tabla de presupuesto para obtener una lectura más precisa.");
    } else {
      if (totals.profit < 0) {
        notes.push("Estás operando en rojo: tus gastos actuales superan tus ingresos. Revisa primero gastos variables y pagos recurrentes.");
      } else {
        notes.push("Tu negocio está generando utilidad. Mantén ese margen y evita que gastos variables se salgan de control.");
      }

      if (monthlyIncomeRatio < 0.75) {
        notes.push(`Tus ingresos actuales son ${Math.round(monthlyIncomeRatio * 100)}% de la meta mensual proyectada. Activa ventas, cobros y ofertas de alto valor.`);
      } else if (monthlyIncomeRatio >= 1.1) {
        notes.push("Vas por encima de la meta mensual proyectada. Felicidades: es momento de consolidar caja y reservar para reinversión.");
      } else {
        notes.push("Estás cerca de la proyección mensual. Mantén el ritmo de ventas y cuida la ejecución de cada gasto.");
      }

      if (totals.expenses > annualTotals.income * 0.8) {
        notes.push("Tus gastos actuales ya representan más del 80% de tu proyección anual de ingresos. Cuidado con las fugas de dinero.");
      }

      if (actualVariableShare >= 0.45) {
        notes.push("Los gastos variables son altos: revisa pauta, herramientas y costos de producción para no quemar caja.");
      }

      if (actualFixedShare >= 0.6 && totals.profit < 0) {
        notes.push("La estructura fija es pesada y te está dejando poco margen. Busca reducir o renegociar compromisos fijos.");
      }

      if (totals.profit >= 0 && monthlyIncomeRatio >= 1) {
        notes.push(`Excelente: ya estás cumpliendo la proyección mensual y mantienes utilidad. Reserva al menos ${money.format(projectedReinvestmentMonthly)} al mes para reinversión.`);
      } else {
        notes.push(`Para sostener el crecimiento, separa al menos ${money.format(projectedReinvestmentMonthly)} mensuales para reinversión.`);
      }
    }

    if (completedHomeTasks < homeTasks.length) {
      notes.push("Hay carga del hogar pendiente. Reducir el ruido mental te ayuda a tomar mejores decisiones financieras.");
    }

    return notes;
  }, [annualTotals.income, totals.profit, monthlyIncomeRatio, annualTotals.income, totals.expenses, actualVariableShare, actualFixedShare, projectedReinvestmentMonthly, completedHomeTasks, homeTasks.length, purpose.mood]);

  useEffect(() => {
    let subscription;
    const initAuth = async () => {
      if (!awsActive) {
        setReady(true);
        return;
      }

      const timeout = setTimeout(() => {
        console.warn("AWS Auth tardó más de lo esperado.");
        setAuthError("La conexión segura tardó más de lo esperado. Revisa tu internet e intenta de nuevo.");
        setReady(true);
      }, 8000);

      try {
        const { data, error } = await awsAuth.getSession();
        clearTimeout(timeout);
        if (error) {
          console.error("Error al inicializar auth:", error);
          setAuthError("No pudimos conectar con el inicio de sesión seguro. Intenta de nuevo en unos minutos.");
        } else {
          setUser(data?.session?.user ?? null);
        }
      } catch (initError) {
        clearTimeout(timeout);
        console.error("Error inesperado al inicializar auth:", initError);
        setAuthError("No pudimos conectar con el inicio de sesión seguro. Intenta de nuevo en unos minutos.");
      } finally {
        setReady(true);
      }
    };

    initAuth();
    if (awsActive) {
      const { data: listenerData } = awsAuth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);
        if (event === 'PASSWORD_RECOVERY') {
          setResetPassword(true);
        }
      });
      subscription = listenerData?.subscription;
    }
    const unlistenGoogle = onGoogleRedirectCallback(async () => {
      const { data } = await awsAuth.getSession();
      setUser(data?.session?.user ?? null);
    });
    return () => {
      subscription?.unsubscribe?.();
      if (typeof unlistenGoogle === 'function') unlistenGoogle();
    };
  }, [awsActive]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__MAMACEO_DEBUG = {
        ready,
        awsActive,
        user,
        authMode,
        authLoading,
        authError,
        resetPassword
      };
    }
  }, [ready, awsActive, user, authMode, authLoading, authError, resetPassword]);

  const applyLoadedState = (loaded) => {
    const state = loaded || createBlankUserState(currency);
    setActiveView(state.activeView || "dashboard");
    setCurrency(state.currency || "USD");
    setMovements(normalizeMovements(state.movements || []));
    setTasks(migratePriorityList(state.tasks || []));
    setClients(normalizeClients(state.clients || []));
    setContentItems(state.contentItems || []);
    setGoals(state.goals || []);
    setHomeTasks(migratePriorityList(state.homeTasks || []));
    setSystemTasks(state.systemTasks || cloneList(initialSystemTasks));
    setMaternalTasks(state.maternalTasks || cloneList(initialHomeMaternalTasks));
    setWellnessTasks(state.wellnessTasks || cloneList(initialHomeWellnessTasks));
    setIncomeSources(state.incomeSources || cloneList(initialIncomeSources));
    setSalesGoal(state.salesGoal || 0);
    setContactLog(state.contactLog || {});
    setWeekBlocks(state.weekBlocks || {});
    setBusinessSettings(state.businessSettings || { ...initialBusinessSettings });
    setBanks(state.banks || [...initialBanks]);
    setAnnualBudget(normalizeAnnualBudget(state.annualBudget || initialAnnualBudget));
    setHomeBudget(normalizeHomeBudget(state.homeBudget || cloneList(initialHomeBudget)));
    setPurpose(createInitialPurpose(state.purpose || {}));
    setProfileSetup(state.profileSetup || null);
    setProfileForm(state.profileSetup ? { ...initialProfileForm, ...state.profileSetup } : { ...initialProfileForm });
    setBrandProfile(state.brandProfile || { ...initialBrandProfile });
    setBrandForm(state.brandProfile || { ...initialBrandProfile });
    setGroceryList(state.groceryList || []);
    setUserPlan(state.userPlan || "free");
    setPremiumExpiresAt(state.premiumExpiresAt || null);
    setUserMode(state.userMode || null);
    setHomeFocusOverride(state.homeFocusOverride || null);
    setAppointments(state.appointments || []);
    setWeekMenu((() => { const wm=state.weekMenu; const mg=v=>!v?{desayuno:"",almuerzo:"",cena:"",snack:""}:typeof v==="string"?{desayuno:"",almuerzo:v,cena:"",snack:""}:{desayuno:"",almuerzo:"",cena:"",snack:"",...v}; return {L:mg(wm?.L),M:mg(wm?.M),X:mg(wm?.X),J:mg(wm?.J),V:mg(wm?.V),S:mg(wm?.S),D:mg(wm?.D)}; })());
    setHomeRoutines(state.homeRoutines || { L:"",M:"",X:"",J:"",V:"",S:"",D:"" });
    setKidsSchedule(() => {
      const raw = state.kidsSchedule || {};
      const out = {};
      ["L","M","X","J","V","S","D"].forEach(d => {
        const v = raw[d];
        out[d] = (v && typeof v === "object" && "act" in v) ? v : { act: (typeof v === "string" ? v : ""), time: "" };
      });
      return out;
    });
    setQuickNotes(state.quickNotes || []);
    if (state.reminderTime) setReminderTime(state.reminderTime);
    if (state.reminderEnabled !== undefined) setReminderEnabled(state.reminderEnabled);
  };

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const restore = async () => {
      try {
        if (user && awsActive && remoteStorageEnabled) {
          setIsRestoringRemote(true);
          setCloudReadyUserId(null);
          applyLoadedState(createBlankUserState());
          const remoteState = await loadRemoteState();
          if (cancelled) return;
          applyLoadedState(remoteState || createBlankUserState());
          setCloudReadyUserId(user.id);
          setSyncError("");
          // check-pending-hotmart temporalmente desactivado
        } else {
          const storedState = loadState();
          if (!cancelled) applyLoadedState(storedState || createBlankUserState());
        }
      } catch (err) {
        console.error("Error restaurando estado:", err);
        if (!cancelled) {
          setRemoteStorageEnabled(false);
          setSyncError(err?.message || "No se pudo cargar tu información desde AWS. Usando almacenamiento local por ahora.");
          const storedState = loadState();
          if (storedState) applyLoadedState(storedState);
          else applyLoadedState(createBlankUserState());
        }
      } finally {
        if (!cancelled) setIsRestoringRemote(false);
      }
    };
    restore();
    return () => {
      cancelled = true;
    };
  }, [ready, user, awsActive, remoteStorageEnabled]);

  useEffect(() => {
    if (!ready) return;
    if (isRestoringRemote) return; // wait for cloud data before deciding
    const hasDismissed = window.localStorage.getItem('profile-modal-done');
    if (!profileSetup && !hasDismissed) {
      const knownName = user?.user_metadata?.full_name || user?.user_metadata?.name || authName;
      if (knownName) setProfileForm((c) => ({ ...c, name: c.name || knownName }));
      setShowProfileModal(true);
      window.localStorage.setItem('profile-modal-done', 'true');
    }
  }, [ready, isRestoringRemote, profileSetup]);

  useEffect(() => {
    if (!ready) return;
    const stateToSave = {
      activeView,
      currency,
      movements,
      tasks,
      clients,
      contentItems,
      goals,
      homeTasks,
      systemTasks,
      maternalTasks,
      wellnessTasks,
      incomeSources,
      salesGoal,
      contactLog,
      weekBlocks,
      businessSettings,
      banks,
      annualBudget,
      homeBudget,
      purpose,
      profileSetup,
      brandProfile,
      groceryList,
      appointments,
      weekMenu,
      homeRoutines,
      kidsSchedule,
      quickNotes,
      reminderTime,
      reminderEnabled,
      userPlan,
      premiumExpiresAt,
      userMode,
      homeFocusOverride,
      familyMembers
    };

    if (user && awsActive && remoteStorageEnabled) {
      if (isRestoringRemote || cloudReadyUserId !== user.id) return;
      setIsSyncing(true);
      saveRemoteState(stateToSave)
        .then(() => setSyncError(""))
        .catch((err) => {
          console.error("Error guardando en la nube:", err);
          setRemoteStorageEnabled(false);
          setSyncError("No se pudo guardar en la nube de forma segura. Usando almacenamiento local por ahora.");
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
          } catch (err2) {
            console.error("Error guardando en localStorage tras falla de AWS:", err2);
          }
        })
        .finally(() => setIsSyncing(false));
    } else {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (err) {
        console.error("Error guardando en localStorage:", err);
      }
    }
  }, [ready, user, awsActive, isRestoringRemote, cloudReadyUserId, activeView, currency, movements, tasks, clients, contentItems, goals, homeTasks, businessSettings, banks, annualBudget, homeBudget, purpose, incomeSources, salesGoal, contactLog, groceryList, userPlan, premiumExpiresAt, userMode, profileSetup, brandProfile, systemTasks, maternalTasks, wellnessTasks, weekBlocks, appointments, weekMenu, homeRoutines, kidsSchedule, quickNotes, reminderTime, reminderEnabled, homeFocusOverride]);

  const expandAppts = (list, limitDays = 90) => {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const result = [];
    const tEnd = new Date(t0.getTime() + limitDays * 86400000);
    for (const appt of list) {
      if (!appt.recurrence || appt.recurrence === "none") { result.push(appt); continue; }
      let curr = new Date(appt.date + "T00:00:00");
      while (curr < t0) {
        if (appt.recurrence === "weekly")  curr.setDate(curr.getDate() + 7);
        else if (appt.recurrence === "monthly") curr.setMonth(curr.getMonth() + 1);
        else if (appt.recurrence === "yearly")  curr.setFullYear(curr.getFullYear() + 1);
        else { curr = new Date(tEnd.getTime() + 1); break; }
      }
      let count = 0;
      while (curr <= tEnd && count < 15) {
        result.push({ ...appt, date: curr.toISOString().slice(0,10), _origId: appt.id });
        count++;
        if (appt.recurrence === "weekly")  curr.setDate(curr.getDate() + 7);
        else if (appt.recurrence === "monthly") curr.setMonth(curr.getMonth() + 1);
        else if (appt.recurrence === "yearly")  curr.setFullYear(curr.getFullYear() + 1);
        else break;
      }
    }
    return result;
  };

  const addMovement = (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    const resolvedCategory = form.category === "Otro" ? form.categoryOther.trim() : form.category;
    const errs = {};
    if (!form.description.trim()) errs.description = "Escribe una descripción";
    if (!resolvedCategory)        errs.category    = "Selecciona o escribe la categoría";
    if (!amount || amount <= 0)   errs.amount      = "Ingresa un monto mayor a 0";
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});

    // Validar límite del plan
    if (movements.length >= currentLimits.movements) {
      setUpgradeReason(`Has alcanzado el límite de ${currentLimits.movements} movimientos de tu plan.`);
      setShowUpgradeModal(true);
      return;
    }

    const movementDate = form.date || getTodayInputValue();
    setMovements((current) => [{
      id: Date.now(),
      type: form.type,
      classification: form.classification,
      description: form.description.trim(),
      category: resolvedCategory,
      amount,
      bank: form.bank || banks[0] || "",
      date: movementDate,
      createdAt: timestampFromInputDate(movementDate)
    }, ...current]);
    setForm({
      type: form.type,
      classification: form.classification,
      description: "",
      category: "",
      categoryOther: "",
      amount: "",
      bank: form.bank || banks[0] || "",
      date: getTodayInputValue()
    });
    setShowMovementModal(false);
  };

  const addClient = (event) => {
    event.preventDefault();
    const amount = Number(clientForm.amount);
    const errs = {};
    if (!clientForm.name.trim())    errs.name    = "Escribe el nombre del cliente";
    if (!clientForm.service.trim()) errs.service = "Escribe el servicio o producto";
    if (!amount || amount <= 0)     errs.amount  = "Ingresa un monto mayor a 0";
    if (Object.keys(errs).length) { setClientFormErrors(errs); return; }
    setClientFormErrors({});

    // Validar límite del plan
    if (clients.length >= currentLimits.clients) {
      setUpgradeReason(`Has alcanzado el límite de ${currentLimits.clients} clientes de tu plan.`);
      setShowUpgradeModal(true);
      return;
    }
    
    const contactDate = clientForm.lastContactDate || getTodayInputValue();
    const contactTimestamp = timestampFromInputDate(contactDate);
    const now = Date.now();
    setClients((current) => [{ 
      id: now, 
      name: clientForm.name.trim(), 
      service: clientForm.service.trim(), 
      status: clientForm.status, 
      amount, 
      nextAction: clientForm.nextAction.trim() || "Hacer seguimiento", 
      lastContact: contactTimestamp,
      lastContactDate: contactDate,
      source: clientForm.source === "Otra" ? clientForm.customSource.trim() || "Otra" : clientForm.source, 
      phone: clientForm.phone.trim(), 
      createdAt: now,
      updatedAt: now
    }, ...current]);
    setClientForm({ name: "", service: "", status: "Lead frio", amount: "", nextAction: "", source: "", customSource: "", phone: "", lastContactDate: getTodayInputValue() });
  };

  const addContent = (event) => {
    event.preventDefault();
    if (!contentForm.title.trim()) return;
    
    // Validar límite del plan
    if (contentItems.length >= currentLimits.content) {
      setUpgradeReason(`Has alcanzado el límite de ${currentLimits.content} contenidos de tu plan.`);
      setShowUpgradeModal(true);
      return;
    }
    
    const network = contentForm.network === "Otra" ? contentForm.customNetwork.trim() || "Otra" : contentForm.network;
    const now = Date.now();
    setContentItems((current) => [{ 
      id: now, 
      ...contentForm, 
      network, 
      title: contentForm.title.trim(), 
      hook: contentForm.hook.trim(), 
      createdAt: now 
    }, ...current]);
    setContentForm({ title: "", hook: "", format: "Reel", network: "Instagram", customNetwork: "", week: "Semana 1", status: "Por hacer", goal: "Vender", publishDate: "" });
    setShowContentForm(false);
  };

  const addContentFromIdea = (title, meta = {}) => {
    if (!title || !title.trim()) return { ok: false, message: "" };
    if (contentItems.length >= currentLimits.content) {
      return { ok: false, message: `Llegaste al límite de ${currentLimits.content} contenidos de tu plan.` };
    }
    const now = Date.now();
    setContentItems((current) => [{
      id: now,
      title: title.trim(),
      hook: "",
      format: meta.format || "Reel",
      network: meta.network || "Instagram",
      week: "Semana 1",
      status: "Pendiente",
      goal: "Vender",
      publishDate: "",
      createdAt: now,
    }, ...current]);
    return { ok: true };
  };

  const addGoal = (event) => {
    event.preventDefault();
    const amount = Number(goalForm.amount);
    if (!goalForm.title.trim() || !amount) return;
    setGoals((current) => [{ id: Date.now(), ...goalForm, title: goalForm.title.trim(), amount }, ...current]);
    setGoalForm({ title: "", amount: "", period: "Mensual", status: "Activa" });
  };

  const addHomeTask = (event) => {
    event.preventDefault();
    if (!homeForm.title.trim()) { setHomeTaskError("Escribe un nombre para la tarea antes de agregar."); return; }
    setHomeTaskError("");

    // Validar límite del plan
    if (homeTasks.length >= currentLimits.homeTasks) {
      setUpgradeReason(`Has alcanzado el límite de ${currentLimits.homeTasks} tareas del hogar de tu plan.`);
      setShowUpgradeModal(true);
      return;
    }

    const frequency = homeForm.frequency === "Otro" ? (homeForm.customFrequency.trim() || "Otro") : homeForm.frequency;
    const duration = Number(homeForm.duration) || HOME_CATEGORY_DURATION[homeForm.category] || DEFAULT_HOME_DURATION;
    setHomeTasks((current) => [{ id: Date.now(), title: homeForm.title.trim(), category: homeForm.category, priority: homeForm.priority || "Normal", delegate: homeForm.delegate || "", frequency, duration, done: false }, ...current]);
    setHomeForm({ title: "", category: "Rutina", priority: "Normal", delegate: "", frequency: "Rutina", customFrequency: "", duration: "" });
  };

  const addTask = (event) => {
    event.preventDefault();
    if (!taskForm.text.trim()) return;
    const duration = Number(taskForm.duration) || DEFAULT_BIZ_TASK_DURATION;
    setTasks((current) => [{ id: Date.now(), text: taskForm.text.trim(), priority: taskForm.priority || "Normal", dueDate: taskForm.dueDate || "", duration, done: false }, ...current]);
    setTaskForm({ text: "", priority: "Normal", dueDate: "", duration: "" });
  };
  const deleteTask = (taskId) => setTasks((current) => current.filter((task) => task.id !== taskId));
  const taskUrgencyScore = (t) => {
    let score = 0;
    if (t.priority === "Importante") score += 100;
    else if (t.priority === "Sin afán") score -= 20;
    if (t.dueDate) {
      const days = Math.floor((timestampFromInputDate(t.dueDate) - Date.now()) / 86400000);
      if (days < 0) score += 80;
      else if (days === 0) score += 60;
      else if (days <= 3) score += 30;
      else if (days <= 7) score += 10;
    }
    return score;
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (formErrors[field]) setFormErrors(e => ({ ...e, [field]: "" }));
  };
  const updateMovementType = (type) => setForm((current) => ({
    ...current,
    type,
    classification: type === "income" ? "Servicios" : "Gasto fijo",
    category: "",
    categoryOther: ""
  }));
  const updateMovementDate = (movementId, date) => {
    setMovements((current) => current.map((movement) => movement.id === movementId ? {
      ...movement,
      date,
      createdAt: timestampFromInputDate(date)
    } : movement));
  };
  const updateClientForm = (field, value) => {
    setClientForm((current) => ({ ...current, [field]: value }));
    if (clientFormErrors[field]) setClientFormErrors(e => ({ ...e, [field]: "" }));
  };
  const updateContentForm = (field, value) => setContentForm((current) => ({ ...current, [field]: value }));
  const updateGoalForm = (field, value) => setGoalForm((current) => ({ ...current, [field]: value }));
  const updateHomeForm = (field, value) => setHomeForm((current) => ({ ...current, [field]: value }));
  const updateTaskForm = (field, value) => setTaskForm((current) => ({ ...current, [field]: value }));
  const updatePurpose = (field, value) => setPurpose((current) => ({ ...current, [field]: value }));
  const updateBusinessSetting = (field, value) => {
    setBusinessSettings((current) => ({
      ...current,
      [field]: Math.max(0, Number(value) || 0)
    }));
  };
  const updateMonthlyIncomeGoal = (value) => {
    const monthly = Math.max(0, Number(value) || 0);
    setBusinessSettings((current) => ({
      ...current,
      monthlyGoal: monthly,
      weeklyGoal: Math.round(monthly / 4),
      dailyGoal: Math.round(monthly / 20)
    }));
  };
  const toggleTask = (taskId) => setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)));
  const toggleHomeTask = (taskId) => setHomeTasks((current) => current.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)));
  const updateAnnualBudget = (month, field, value) => {
    setAnnualBudget((current) => current.map((row) => {
      if (row.month !== month) return row;
      const nextValue = Math.max(0, Number(value) || 0);
      if (field === "income") {
        // Solo recalcular gastos si están en 0 o vacíos (no sobrescribir valores personalizados)
        const shouldRecalculateFixed = !row.fixedExpenses || row.fixedExpenses === 0;
        const shouldRecalculateVariable = !row.variableExpenses || row.variableExpenses === 0;
        return {
          ...row,
          income: nextValue,
          fixedExpenses: shouldRecalculateFixed ? Math.round(nextValue * 0.45) : row.fixedExpenses,
          variableExpenses: shouldRecalculateVariable ? Math.round(nextValue * 0.35) : row.variableExpenses
        };
      }
      return { ...row, [field]: nextValue };
    }));
  };
  const addBank = (event) => {
    event.preventDefault();
    const bank = newBank.trim();
    if (!bank || banks.includes(bank)) return;
    setBanks((current) => [...current, bank]);
    setNewBank("");
    setForm((current) => ({ ...current, bank }));
  };
  const removeBank = (bankToRemove) => {
    setBanks((current) => {
      const nextBanks = current.filter((bank) => bank !== bankToRemove);
      setForm((currentForm) => ({
        ...currentForm,
        bank: currentForm.bank === bankToRemove ? (nextBanks[0] || "") : currentForm.bank
      }));
      return nextBanks;
    });
  };
  const exportMovementsToExcel = () => {
    const headers = ["Fecha", "Tipo", "Clasificación", "Descripción", "Categoría", "Banco", "Monto"];
    const rows = sortedMovements.map((movement) => [
      inputDateFromValue(movement.date || movement.createdAt),
      movement.type === "income" ? "Ingreso" : "Gasto",
      movement.classification || "",
      movement.description,
      movement.category,
      movement.bank || "",
      movement.amount
    ]);
    const csvContent = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "movimientos.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportMovementsToPdf = () => {
    window.print();
  };
  const addHomeBudgetItem = (event) => {
    event.preventDefault();
    const amount = Number(homeBudgetForm.amount);
    if (!homeBudgetForm.description.trim() && !amount) { setHomeBudgetError("Completa la descripción y el monto para registrar el movimiento."); return; }
    if (!homeBudgetForm.description.trim()) { setHomeBudgetError("Escribe una descripción para saber de qué es este movimiento."); return; }
    if (!amount) { setHomeBudgetError("Ingresa el monto. Puede ser 0 si no aplica."); return; }
    setHomeBudgetError("");
    const dueDate = homeBudgetForm.dueDate || getTodayInputValue();
    setHomeBudget((current) => [{ id: Date.now(), type: homeBudgetForm.type, description: homeBudgetForm.description.trim(), amount, dueDate, createdAt: timestampFromInputDate(dueDate) }, ...current]);
    setHomeBudgetForm({ type: "Gasto variable", description: "", amount: "", dueDate: getTodayInputValue() });
    setShowBudgetModal(false);
  };
  const updateHomeBudgetDate = (itemId, dueDate) => {
    setHomeBudget((current) => current.map((item) => item.id === itemId ? { ...item, dueDate, createdAt: timestampFromInputDate(dueDate) } : item));
  };
  const moveClientStatus = (clientId, status) => {
    setClients((current) => current.map((client) => client.id === clientId ? { ...client, status, updatedAt: Date.now() } : client));
  };
  const logContact = (clientId, clientName) => {
    const today = getTodayInputValue();
    setContactLog((prev) => ({ ...prev, [Date.now()]: { clientId, clientName, date: today } }));
    setClients((c) => c.map((cl) => cl.id === clientId ? { ...cl, lastContact: timestampFromInputDate(today), lastContactDate: today, updatedAt: Date.now() } : cl));
  };
  const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1)); d.setHours(0,0,0,0); return d.getTime(); })();
  const contactsThisWeek = Object.values(contactLog).filter((e) => timestampFromInputDate(e.date) >= weekStart).length;
  const updateContentStatus = (contentId, status) => {
    setContentItems((current) => current.map((item) => item.id === contentId ? { ...item, status } : item));
  };
  // Migrate old 6-status items to new 3-status scheme on first render
  const migrateContentStatus = (s) => {
    if (s === "Por hacer" || s === "Guion hecho") return "Pendiente";
    if (s === "Grabacion" || s === "Edicion" || s === "Programado") return "En proceso";
    return s; // "Publicado" unchanged
  };
  // Run migration once when contentItems load with legacy statuses
  useEffect(() => {
    const LEGACY = new Set(["Por hacer","Guion hecho","Grabacion","Edicion","Programado"]);
    if (contentItems.some(i => LEGACY.has(i.status))) {
      setContentItems(c => c.map(i => LEGACY.has(i.status) ? { ...i, status: migrateContentStatus(i.status) } : i));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const updateClientNotes = (clientId, notes) => {
    setClients((current) => current.map((client) => client.id === clientId ? { ...client, notes, updatedAt: Date.now() } : client));
  };
  const updateClientLastContact = (clientId, date) => {
    setClients((current) => current.map((client) => client.id === clientId ? {
      ...client,
      lastContactDate: date,
      lastContact: timestampFromInputDate(date),
      updatedAt: Date.now()
    } : client));
  };
  const toggleFamilyDay = (day) => {
    setPurpose((current) => ({
      ...current,
      familyDays: { ...(current.familyDays || {}), [day]: !current.familyDays?.[day] }
    }));
  };

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setProfilePhotoError("Selecciona un archivo de imagen."); return; }
    if (file.size > 8 * 1024 * 1024) { setProfilePhotoError("La imagen es muy pesada (máx. 8MB)."); return; }
    setProfilePhotoError("");
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 240;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(size / img.width, size / img.height);
        const sw = size / scale, sh = size / scale;
        const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
        setProfileForm((c) => ({ ...c, photo: canvas.toDataURL("image/jpeg", 0.85) }));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };
  const saveProfile = (e) => {
    e.preventDefault();
    const monthly = Math.max(0, Number(profileForm.monthlyGoalSetup) || 0);
    const setup = { ...profileForm, monthlyGoalSetup: monthly, completedAt: Date.now() };
    setProfileSetup(setup);
    if (monthly > 0) {
      setBusinessSettings((c) => ({
        ...c,
        monthlyGoal: monthly,
        weeklyGoal: Math.round(monthly / 4),
        dailyGoal: Math.round(monthly / 20)
      }));
    }
    setShowProfileModal(false); window.localStorage.setItem('profile-modal-done', 'true'); setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 4000);
  };

  const menu = useMemo(() => {
    if (!userMode || userMode === "ambas") return ALL_MENU_ITEMS;
    if (userMode === "mama") return ALL_MENU_ITEMS.filter(i => MENU_MAMA.includes(i.id));
    return ALL_MENU_ITEMS.filter(i => MENU_EMPRENDEDORA.includes(i.id));
  }, [userMode]);

  const activeLabel = menu.find((item) => item.id === activeView)?.label || "Inicio";

  const selectUserMode = (mode) => {
    setUserMode(mode);
    const trialEnd = Date.now() + 14 * 24 * 60 * 60 * 1000;
    setPremiumExpiresAt(trialEnd);
    const plan = mode === "mama" ? "emprendedora" : "ceo";
    setUserPlan(plan);
  };

  if (!ready || isRestoringRemote) {
    return (
      <div className="auth-shell">
        <div className="splash-inner">
          <div className="splash-logo-breathe">
            <Logo width={200} className="splash-logo-enter" />
          </div>
          <div className="splash-spinner" />
          <p className="splash-hint">
            {isRestoringRemote ? "Sincronizando tu información segura..." : "Preparando tu espacio..."}
          </p>
        </div>
      </div>
    );
  }

  if (activeView === "studio") {
    return <Studio onBack={() => setActiveView("dashboard")} brandProfile={brandProfile} onSaveBrandProfile={(data) => { setBrandProfile(data); setBrandForm(data); }} callGemini={callGemini} plan={effectivePlan} onAddToContent={addContentFromIdea} />;
  }

  if (!user && awsActive) {
    if (preAuthView === "landing") {
      return (
        <Landing
          onLogin={() => { setAuthMode("login"); setPreAuthView("auth"); }}
          onSignup={() => { setAuthMode("signup"); setPreAuthView("auth"); }}
          onTerminos={() => setPreAuthView("terminos")}
          onPrivacidad={() => setPreAuthView("privacidad")}
          prices={PLAN_PRICES}
          hotmartLinks={HOTMART_LINKS}
          hotmartLinksYear={HOTMART_LINKS_YEAR}
        />
      );
    }
    if (preAuthView === "terminos") {
      return renderTerminos(() => setPreAuthView("landing"));
    }
    if (preAuthView === "privacidad") {
      return renderPrivacidad(() => setPreAuthView("landing"));
    }
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-card-top">
            <button type="button" className="auth-back-btn" onClick={() => setPreAuthView("landing")}>← Inicio</button>
            <div className="auth-logo-center"><Logo width={180} /></div>
          </div>
          
          {confirmMode ? (
            <form className="auth-form" onSubmit={handleConfirmCode}>
              <h3>Confirmación requerida</h3>
              <p>Ingresa el código de 6 dígitos que enviamos a {authEmail}</p>
              <label>
                Código de verificación
                <input type="text" placeholder="000000" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value.replace(/[^0-9]/g, ''))} required maxLength={6} style={{letterSpacing:"4px",fontSize:"20px",textAlign:"center"}} autoFocus />
              </label>
              {authError && <p className="auth-error"><span>⚠️</span><span>{authError}</span></p>}
              <button type="submit" className="auth-button" disabled={authLoading}>Verificar</button>
              <button type="button" className="auth-switch" onClick={() => { setConfirmMode(false); setConfirmCode(""); setAuthError(""); }}>← Volver</button>
            </form>
          ) : resetPassword ? (
            <form className="auth-form" onSubmit={handleResetPassword}>
              <h3>Restablecer contraseña</h3>
              <p>Ingresa el código y tu nueva contraseña</p>
              <label>
                Código de verificación
                <input type="text" placeholder="000000" value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, ''))} required maxLength={6} style={{letterSpacing:"4px",fontSize:"20px",textAlign:"center"}} />
              </label>
              <label>
                Nueva contraseña
                <div className="auth-pw-field">
                  <input type={showAuthPassword?"text":"password"} value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} required minLength={8} />
                  <button type="button" className="auth-pw-toggle" tabIndex={-1} onClick={() => setShowAuthPassword(v => !v)} title={showAuthPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                    {showAuthPassword ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </button>
                </div>
              </label>
              {resetNewPassword && (
                <div className="auth-pw-requirements">
                  {getPasswordChecks(resetNewPassword).map((c) => (
                    <span key={c.key} className={`auth-pw-req${c.ok ? " auth-pw-req--ok" : ""}`}>{c.ok ? "✓" : "○"} {c.label}</span>
                  ))}
                </div>
              )}
              {authError && <p className="auth-error"><span>⚠️</span><span>{authError}</span></p>}
              <button type="submit" className="auth-button" disabled={authLoading}>Actualizar</button>
              <button type="button" className="auth-switch" onClick={() => { setResetPassword(false); setAuthError(""); }}>← Volver</button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <div className="auth-form-header">
                {authMode === "signup" && <span className="auth-trial-badge">✨ 14 días gratis · Sin tarjeta de crédito</span>}
                <h2 className="auth-form-title">{authMode === "login" ? "Bienvenida de vuelta" : "Crea tu cuenta gratis"}</h2>
              </div>
              {authMode === "signup" && (
                <label>
                  Tu nombre
                  <input type="text" placeholder="¿Cómo te llamamos?" value={authName} onChange={(event) => setAuthName(event.target.value)} required />
                </label>
              )}
              <label>
                Correo electrónico
                <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="tu@email.com" required />
              </label>
              <label>
                Contraseña
                <div className="auth-pw-field">
                  <input type={showAuthPassword?"text":"password"} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required minLength={8} />
                  <button type="button" className="auth-pw-toggle" tabIndex={-1} onClick={() => setShowAuthPassword(v => !v)} title={showAuthPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                    {showAuthPassword ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </button>
                </div>
              </label>
              {authMode === "signup" && authPassword && (
                <div className="auth-pw-requirements">
                  {getPasswordChecks(authPassword).map((c) => (
                    <span key={c.key} className={`auth-pw-req${c.ok ? " auth-pw-req--ok" : ""}`}>{c.ok ? "✓" : "○"} {c.label}</span>
                  ))}
                </div>
              )}
              {authMode === "signup" && (
                <label>
                  Confirmar contraseña
                  <div className="auth-pw-field">
                    <input type={showAuthPasswordConfirm?"text":"password"} value={authPasswordConfirm} onChange={(event) => setAuthPasswordConfirm(event.target.value)} required minLength={8} />
                    <button type="button" className="auth-pw-toggle" tabIndex={-1} onClick={() => setShowAuthPasswordConfirm(v => !v)} title={showAuthPasswordConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}>
                      {showAuthPasswordConfirm ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                    </button>
                  </div>
                </label>
              )}
              {authError && <p className="auth-error"><span>⚠️</span><span>{authError}</span></p>}
              <button type="submit" className="auth-button" disabled={authLoading}>
                {authLoading ? "Procesando..." : (authMode === "login" ? "Entrar" : "Registrarme")}
              </button>
              <div className="auth-divider"><span>o</span></div>
              <button type="button" className="auth-google-btn" disabled={authLoading}
                onClick={() => awsAuth.signInWithGoogle()}>
                <svg width="18" height="18" viewBox="0 0 48 48" style={{marginRight:"8px"}}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continuar con Google
              </button>
              <p className="auth-switch-row">
                {authMode === "login"
                  ? <>¿No tienes cuenta?{" "}<button type="button" className="auth-link-btn" onClick={() => setAuthMode("signup")}>Créala gratis</button></>
                  : <>¿Ya tienes cuenta?{" "}<button type="button" className="auth-link-btn" onClick={() => setAuthMode("login")}>Inicia sesión</button></>
                }
              </p>
              {authMode === "login" && (
                <button type="button" className="auth-forgot" onClick={handleForgotPassword} disabled={authLoading}>
                  ¿Olvidé mi contraseña?
                </button>
              )}
            </form>
          )}
          <footer className="auth-footer">
            Hecho por Una mamá con propósito® · Todos los derechos reservados UMP S.A.S 2026
          </footer>
        </div>
      </div>
    );
  }

  if (!userMode) {
    return (
      <div className="auth-shell">
        <div style={{maxWidth:"560px",width:"100%",padding:"32px 20px",margin:"auto"}}>
          <div style={{textAlign:"center",marginBottom:"36px"}}>
            <Logo width={160} />
            <h2 style={{margin:"20px 0 8px",fontSize:"24px",color:"var(--ink)"}}>Bienvenida, {profileSetup?.name || "Mamá"} 🌸</h2>
            <p style={{color:"var(--muted)",fontSize:"15px",margin:0}}>¿Qué te describe mejor? Esto personaliza tu experiencia.</p>
          </div>
          <div style={{display:"grid",gap:"14px"}}>
            {[
              { mode: "mama",        icon: "🌸", title: "Solo quiero organizarme",        desc: "Hogar, familia, bienestar y tiempo para mí. Sin funciones de negocio." },
              { mode: "emprendedora",icon: "💼", title: "Tengo un negocio o quiero emprender", desc: "Clientes, finanzas, Studio de contenido y todo para hacer crecer mi negocio." },
              { mode: "ambas",       icon: "✨", title: "Las dos cosas",                   desc: "Quiero un hogar organizado Y construir mi negocio al mismo tiempo." },
            ].map(({ mode, icon, title, desc }) => (
              <button key={mode} onClick={() => selectUserMode(mode)}
                style={{display:"flex",alignItems:"flex-start",gap:"16px",padding:"20px",border:"2px solid var(--line)",borderRadius:"16px",background:"#fff",cursor:"pointer",textAlign:"left",transition:"border-color 0.2s,box-shadow 0.2s",fontFamily:"inherit"}}
                onMouseEnter={e => { e.currentTarget.style.borderColor="var(--pink)"; e.currentTarget.style.boxShadow="0 4px 16px rgba(212,104,122,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="var(--line)"; e.currentTarget.style.boxShadow="none"; }}>
                <span style={{fontSize:"32px",lineHeight:1,flexShrink:0}}>{icon}</span>
                <div>
                  <strong style={{fontSize:"16px",color:"var(--ink)",display:"block",marginBottom:"4px"}}>{title}</strong>
                  <span style={{fontSize:"13px",color:"var(--muted)",lineHeight:1.5}}>{desc}</span>
                </div>
              </button>
            ))}
          </div>
          <p style={{textAlign:"center",marginTop:"24px",fontSize:"12px",color:"var(--muted)"}}>
            Prueba gratuita de 14 días con acceso completo. Puedes cambiar esto desde tu perfil en cualquier momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {needRefresh && (
        <div style={{position:"fixed",bottom:"16px",left:"50%",transform:"translateX(-50%)",zIndex:9999,background:"#C4526A",color:"#fff",padding:"12px 20px",borderRadius:"12px",display:"flex",alignItems:"center",gap:"12px",boxShadow:"0 4px 20px rgba(0,0,0,0.2)",fontSize:"14px",fontWeight:600,whiteSpace:"nowrap"}}>
          <span>🌸 Nueva versión disponible</span>
          <button type="button" onClick={() => updateServiceWorker(true)} style={{background:"#fff",color:"#C4526A",border:"none",borderRadius:"8px",padding:"6px 14px",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",fontWeight:700}}>Actualizar</button>
        </div>
      )}

      {/* Banner instalación Android — 1 clic */}
      {!isStandalone && !installBannerDismissed && installPrompt && (
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:9998,background:"#fff",borderTop:"1px solid #f0e8e8",padding:"16px 20px",display:"flex",alignItems:"center",gap:"12px",boxShadow:"0 -4px 20px rgba(0,0,0,0.08)"}}>
          <span style={{fontSize:"28px",flexShrink:0}}>🌸</span>
          <div style={{flex:1,minWidth:0}}>
            <p style={{margin:"0 0 2px",fontWeight:700,fontSize:"14px",color:"var(--ink)"}}>Agrega MamaCEO a tu pantalla</p>
            <p style={{margin:0,fontSize:"12px",color:"var(--muted)"}}>Accede más rápido, sin abrir el navegador.</p>
          </div>
          <button type="button" onClick={handleInstallAndroid}
            style={{padding:"10px 18px",background:"#C4526A",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",fontWeight:700,flexShrink:0}}>
            Instalar
          </button>
          <button type="button" onClick={dismissInstall} style={{border:"none",background:"none",fontSize:"20px",color:"var(--muted)",cursor:"pointer",flexShrink:0,lineHeight:1,padding:"4px"}}>×</button>
        </div>
      )}

      {/* Banner instalación iOS — guía visual */}
      {!isStandalone && !installBannerDismissed && isIOS && !installPrompt && (
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:9998,background:"#fff",borderTop:"1px solid #f0e8e8",padding:"16px 20px",display:"flex",alignItems:"center",gap:"12px",boxShadow:"0 -4px 20px rgba(0,0,0,0.08)"}}>
          <span style={{fontSize:"28px",flexShrink:0}}>🌸</span>
          <div style={{flex:1,minWidth:0}}>
            <p style={{margin:"0 0 2px",fontWeight:700,fontSize:"14px",color:"var(--ink)"}}>Agrega MamaCEO a tu pantalla</p>
            <p style={{margin:0,fontSize:"12px",color:"var(--muted)"}}>Accede como app, sin abrir Safari.</p>
          </div>
          <button type="button" onClick={() => setShowIOSGuide(true)}
            style={{padding:"10px 18px",background:"#C4526A",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",fontWeight:700,flexShrink:0}}>
            Cómo hacerlo
          </button>
          <button type="button" onClick={dismissInstall} style={{border:"none",background:"none",fontSize:"20px",color:"var(--muted)",cursor:"pointer",flexShrink:0,lineHeight:1,padding:"4px"}}>×</button>
        </div>
      )}

      {/* Modal guía iOS */}
      {showIOSGuide && (
        <div style={{position:"fixed",inset:0,zIndex:10000,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end"}}>
          <div style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"28px 24px 40px",width:"100%",maxWidth:"480px",margin:"0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <h3 style={{margin:0,fontSize:"18px"}}>Instalar MamaCEO 🌸</h3>
              <button type="button" onClick={() => { setShowIOSGuide(false); dismissInstall(); }} style={{border:"none",background:"none",fontSize:"22px",color:"var(--muted)",cursor:"pointer",lineHeight:1}}>×</button>
            </div>
            <div style={{display:"grid",gap:"16px"}}>
              {[
                { num:"1", icon:"⬆️", title:"Toca el botón compartir", desc:'El ícono de cuadrado con flecha, al pie de Safari.' },
                { num:"2", icon:"➕", title:'"Agregar a pantalla de inicio"', desc:'Baja en el menú hasta encontrar esta opción.' },
                { num:"3", icon:"✅", title:'Toca "Agregar"', desc:'En la esquina superior derecha. ¡Listo!' },
              ].map(step => (
                <div key={step.num} style={{display:"flex",alignItems:"flex-start",gap:"14px",padding:"14px 16px",background:"#fdf9f6",borderRadius:"12px",border:"1px solid #f0e8e0"}}>
                  <div style={{width:"32px",height:"32px",borderRadius:"50%",background:"#C4526A",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:"14px",flexShrink:0}}>{step.num}</div>
                  <div>
                    <p style={{margin:"0 0 3px",fontWeight:700,fontSize:"14px",color:"var(--ink)"}}>{step.icon} {step.title}</p>
                    <p style={{margin:0,fontSize:"13px",color:"var(--muted)"}}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p style={{margin:"20px 0 0",textAlign:"center",fontSize:"13px",color:"var(--muted)"}}>Después de instalada, ábrela desde tu pantalla de inicio como cualquier app 🌸</p>
          </div>
        </div>
      )}
      {showProfileModal && (
        <div className="profile-modal-overlay">
          <div className="profile-modal">
            <div className="profile-modal-header">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <h2>{profileSetup ? "Editar mi perfil ✏️" : "Antes de comenzar... ✨"}</h2>
                {profileSetup && (
                  <button type="button" onClick={() => { setShowProfileModal(false); window.localStorage.setItem('profile-modal-done','true'); }}
                    style={{border:"none",background:"none",fontSize:"24px",cursor:"pointer",color:"var(--muted)",lineHeight:1,padding:"0 4px"}}>×</button>
                )}
              </div>
              <p>{profileSetup ? "Actualiza tu información cuando quieras." : "Configuremos tu perfil para que la app trabaje para ti desde el primer día."}</p>
            </div>
            <form className="profile-modal-form" onSubmit={saveProfile}>
              <div className="profile-photo-row">
                <div className="profile-photo-preview">
                  {profileForm.photo
                    ? <img src={profileForm.photo} alt="Foto de perfil" />
                    : <span>{profileForm.name ? profileForm.name.charAt(0).toUpperCase() : "M"}</span>
                  }
                </div>
                <div>
                  <input type="file" accept="image/*" id="profilePhotoInput" style={{display:"none"}} onChange={handleProfilePhotoChange} />
                  <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                    <button type="button" className="profile-photo-btn" onClick={() => document.getElementById('profilePhotoInput').click()}>
                      {profileForm.photo ? "Cambiar foto" : "📷 Agregar foto"}
                    </button>
                    {profileForm.photo && (
                      <button type="button" className="profile-photo-remove" onClick={() => setProfileForm(c => ({ ...c, photo: "" }))}>Quitar</button>
                    )}
                  </div>
                  {profilePhotoError && <p style={{margin:"6px 0 0",fontSize:"12px",color:"#C4526A",fontWeight:600}}>{profilePhotoError}</p>}
                </div>
              </div>

              <label>
                ¿Cómo te llamamos?
                <input placeholder="Tu nombre" value={profileForm.name} onChange={(e) => setProfileForm((c) => ({ ...c, name: e.target.value }))} required />
              </label>

              {/* Tipo de cuenta — arriba para que controle los campos siguientes */}
              {profileSetup && (
                <div style={{padding:"14px",background:"#faf7f5",borderRadius:"12px",border:"1px solid var(--line)"}}>
                  <p style={{margin:"0 0 10px",fontSize:"13px",fontWeight:700,color:"var(--ink)"}}>¿Qué quieres hacer con Mamá CEO?</p>
                  <div style={{display:"grid",gap:"8px"}}>
                    {[
                      { mode: "mama",         icon: "🌸", label: "Solo organizarme", plan: "mama",         planLabel: "Plan Mamá" },
                      { mode: "emprendedora", icon: "💼", label: "Solo mi negocio",  plan: "emprendedora", planLabel: "Plan Emprendedora" },
                      { mode: "ambas",        icon: "✨", label: "Hogar y negocio",  plan: "ceo",          planLabel: "Plan CEO" },
                    ].map(({ mode, icon, label, plan, planLabel }) => {
                      const planOrder = { free: 0, mama: 1, emprendedora: 2, ceo: 3, premium: 3 };
                      const needsUpgrade = (planOrder[effectivePlan] ?? 0) < (planOrder[plan] ?? 0);
                      return (
                        <button key={mode} type="button" onClick={() => setUserMode(mode)}
                          style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",border:`2px solid ${userMode===mode?"var(--pink)":"var(--line)"}`,borderRadius:"10px",background:userMode===mode?"rgba(212,104,122,0.06)":"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",fontWeight:userMode===mode?700:400,color:"var(--ink)"}}>
                          <span>{icon}</span>
                          <span style={{flex:1}}>{label}</span>
                          {needsUpgrade
                            ? <span style={{fontSize:"11px",fontWeight:700,color:"#fff",background:"var(--purple)",padding:"2px 8px",borderRadius:"20px",whiteSpace:"nowrap"}}>{planLabel}</span>
                            : userMode===mode && <span style={{color:"var(--pink)"}}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Campos de negocio — solo si NO es modo "Solo organizarme" */}
              {userMode !== "mama" && (
                <>
                  <label>
                    Nombre de tu negocio
                    <input placeholder="Ej: Coaching con Ana" value={profileForm.businessName} onChange={(e) => setProfileForm((c) => ({ ...c, businessName: e.target.value }))} required={userMode !== "mama"} />
                  </label>
                  <label>
                    Tipo de negocio
                    <select value={profileForm.businessType} onChange={(e) => setProfileForm((c) => ({ ...c, businessType: e.target.value }))}>
                      <option>Servicios 1:1</option>
                      <option>Coaching o mentoría</option>
                      <option>Productos digitales</option>
                      <option>E-commerce</option>
                      <option>Membresías / Recurrente</option>
                      <option>Otro</option>
                    </select>
                  </label>
                  <label>
                    ¿En qué etapa está tu negocio?
                    <select value={profileForm.stage} onChange={(e) => setProfileForm((c) => ({ ...c, stage: e.target.value }))}>
                      <option>Comenzando</option>
                      <option>Creciendo</option>
                      <option>Escalando</option>
                    </select>
                  </label>
                  <label>
                    Meta de ingresos mensual
                    <MoneyAmountInput placeholder="Ej: 3000" value={profileForm.monthlyGoalSetup} onChange={(v) => setProfileForm((c) => ({ ...c, monthlyGoalSetup: v }))} required={userMode !== "mama"} />
                  </label>
                  <label>
                    Tu mayor reto ahora mismo
                    <select value={profileForm.mainChallenge} onChange={(e) => setProfileForm((c) => ({ ...c, mainChallenge: e.target.value }))}>
                      <option>Conseguir clientes</option>
                      <option>Organizar mis finanzas</option>
                      <option>Tener más tiempo</option>
                      <option>Escalar mi negocio</option>
                      <option>Equilibrar negocio y hogar</option>
                    </select>
                  </label>
                </>
              )}
              {/* Recordatorios */}
              <div style={{padding:"14px",background:"#faf7f5",borderRadius:"12px",border:"1px solid var(--line)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:reminderEnabled?"12px":"0"}}>
                  <div>
                    <p style={{margin:"0 0 2px",fontSize:"13px",fontWeight:700,color:"var(--ink)"}}>🔔 Recordatorios diarios</p>
                    <p style={{margin:0,fontSize:"12px",color:"var(--muted)"}}>Aviso con tus citas del día y mañana.</p>
                  </div>
                  <button type="button" onClick={() => setReminderEnabled(v => !v)}
                    style={{padding:"6px 14px",borderRadius:"20px",border:`2px solid ${reminderEnabled?"var(--pink)":"var(--line)"}`,background:reminderEnabled?"rgba(212,104,122,0.08)":"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:"12px",fontWeight:700,color:reminderEnabled?"var(--pink)":"var(--muted)",flexShrink:0}}>
                    {reminderEnabled ? "Activos ✓" : "Inactivos"}
                  </button>
                </div>
                {reminderEnabled && (
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <label style={{fontSize:"13px",color:"var(--ink)",fontWeight:600,flexShrink:0}}>¿A qué hora?</label>
                    <input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)}
                      style={{flex:1,padding:"8px 12px",border:"1px solid var(--line)",borderRadius:"8px",font:"inherit",fontSize:"14px",background:"#fff",fontWeight:700}} />
                    <button type="button" onClick={playChime}
                      style={{padding:"8px 14px",background:"var(--line)",border:"none",borderRadius:"8px",cursor:"pointer",fontFamily:"inherit",fontSize:"12px",fontWeight:700,flexShrink:0}}>
                      🔔 Probar
                    </button>
                  </div>
                )}
              </div>

              <button className="primary-button" type="submit" style={{marginTop:"8px"}}>{profileSetup ? "Guardar cambios" : "Guardar y comenzar ?"}</button>
              {profileSetup && (
                <button type="button" onClick={async () => {
                  if (!window.confirm("\u00bfEstás segura de que quieres eliminar tu cuenta? Esta acción no se puede deshacer y perderás todos tus datos.")) return;
                  if (!window.confirm("\u00daltima confirmación: se eliminarán todos tus datos permanentemente.")) return;
                  try {
                    if (user && awsActive && remoteStorageEnabled) {
                      await deleteRemoteState();
                      await awsAuth.signOut();
                    }
                    window.localStorage.removeItem(STORAGE_KEY);
                    setUser(null);
                    setShowProfileModal(false);
                  } catch (err) {
                    console.error("Error eliminando cuenta:", err);
                    alert("No pudimos eliminar los datos en AWS de forma segura. No se cerró la cuenta; intenta más tarde o contáctanos en hola@umpacademy.co");
                  }
                }}
                style={{marginTop:"8px",width:"100%",padding:"12px",border:"1px solid #e05a4e",background:"#fff5f4",color:"#e05a4e",borderRadius:"8px",cursor:"pointer",fontSize:"13px",fontWeight:700}}>
                  Eliminar mi cuenta y todos mis datos
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {profileSaved && (
        <div className="profile-toast">
          <span>🎉</span>
          <div>
            <strong>¡Todo listo, {profileSetup?.name || "Mamá CEO"}!</strong>
            <p>Tu perfil está guardado. La app ya trabaja para ti.</p>
          </div>
        </div>
      )}

      {showUpgradeModal && (
        <div className="profile-modal-overlay">
          <div className="profile-modal" style={{maxWidth:"500px"}}>
            <div className="profile-modal-header">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <h2>🚀 Desbloquea todo tu potencial</h2>
                <button type="button" onClick={() => setShowUpgradeModal(false)}
                  style={{border:"none",background:"none",fontSize:"24px",cursor:"pointer",color:"var(--muted)",lineHeight:1,padding:"0 4px"}}>×</button>
              </div>
              <p style={{marginTop:"8px",fontSize:"15px",color:"var(--purple)"}}>{upgradeReason}</p>
            </div>
            <div style={{padding:"24px"}}>
              <div style={{background:"linear-gradient(135deg, rgba(212,104,122,0.1), rgba(201,169,110,0.1))",border:"2px solid var(--purple)",borderRadius:"16px",padding:"24px",marginBottom:"20px"}}>
                <h3 style={{margin:"0 0 16px",fontSize:"20px",color:"var(--purple)"}}>Plan Premium</h3>
                <div style={{display:"grid",gap:"12px",marginBottom:"16px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"20px"}}>✅</span>
                    <span>Movimientos financieros ilimitados</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"20px"}}>✅</span>
                    <span>Clientes ilimitados</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"20px"}}>✅</span>
                    <span>Contenido ilimitado</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"20px"}}>✅</span>
                    <span>Tareas del hogar ilimitadas</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"20px"}}>✅</span>
                    <span>Sincronización en la nube</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"20px"}}>✅</span>
                    <span>Soporte prioritario</span>
                  </div>
                </div>
                <div style={{borderTop:"1px solid var(--line)",paddingTop:"16px",textAlign:"center"}}>
                  <div style={{fontSize:"32px",fontWeight:800,color:"var(--purple)",lineHeight:1}}>$29.900 COP</div>
                  <div style={{fontSize:"14px",color:"var(--muted)",marginTop:"4px"}}>por mes</div>
                </div>
              </div>
              <button className="primary-button" onClick={() => { setShowUpgradeModal(false); setActiveView('pricing'); }} style={{width:"100%",padding:"14px",fontSize:"16px"}}>Ver planes y precios</button>
              <button type="button" onClick={() => setShowUpgradeModal(false)} style={{width:"100%",marginTop:"10px",padding:"12px",border:"1px solid var(--line)",background:"#fff",borderRadius:"8px",cursor:"pointer",fontSize:"14px",fontWeight:700}}>Continuar con plan gratis</button>
            </div>
          </div>
        </div>
      )}

      <aside className={`sidebar${sidebarCollapsed?" sidebar--collapsed":""}`}>
        <div className="brand" style={{display:"flex",alignItems:"center",justifyContent:sidebarCollapsed?"center":"space-between"}}>
          {!sidebarCollapsed && <Logo width={120} />}
          <button onClick={()=>setSidebarCollapsed(v=>!v)} title={sidebarCollapsed?"Expandir menú":"Colapsar menú"}
            className="sidebar-collapse-btn">
            {sidebarCollapsed ? "›" : "‹"}
          </button>
        </div>

        {/* Botón hamburguesa solo en móvil */}
        <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(v => !v)} aria-label="Menú">
          {mobileMenuOpen ? "✕" : "☰"}
        </button>

        <nav className={`main-menu ${mobileMenuOpen ? "mobile-open" : ""}`} aria-label="Navegacion principal">
          {menu.map((item) => {
            const planOrder = { free: 0, mama: 1, emprendedora: 2, ceo: 3, premium: 3 };
            const itemPlan = ["business","clients","studio","content"].includes(item.id) ? "emprendedora" : "free";
            const locked = (planOrder[effectivePlan] ?? 0) < (planOrder[itemPlan] ?? 0);
            return (
              <button className={activeView === item.id ? "menu-item active" : "menu-item"} key={item.id}
                title={sidebarCollapsed ? item.label : undefined}
                onClick={() => {
                  if (locked) { setUpgradeModal({ feature: item.label, plan: "Emprendedora" }); setMobileMenuOpen(false); return; }
                  setActiveView(item.id); setMobileMenuOpen(false);
                }}>
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
                {locked && <span className="menu-lock">🔒</span>}
              </button>
            );
          })}
        </nav>

        {userMode !== "mama" && (
          <div className="currency-box">
            <label>Moneda base</label>
            <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option>USD</option>
              <option>COP</option>
              <option>MXN</option>
              <option>EUR</option>
            </select>
          </div>
        )}

        <div className="quote-card">
          <p>{promesas[(new Date().getDate() - 1) % promesas.length]}</p>
        </div>
      </aside>

      <main className="dashboard">
        <header className="topbar">
          <div>
            <p className="view-label">{activeLabel}</p>
            <h1>{clockNow.getHours() < 12 ? "Buenos días" : clockNow.getHours() < 19 ? "Buenas tardes" : "Buenas noches"}, {(profileSetup?.name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Mamá").split(" ")[0]}</h1>
            <p>Enfocada · Organizada · en Calma</p>
          </div>
          <div className="profile-area">
            {isSyncing && <div className="status-chip syncing">Guardando…</div>}
            {(!awsActive || !remoteStorageEnabled) && !isSyncing && <div className="status-chip" title="Tus datos se guardan en este dispositivo">Solo en este dispositivo</div>}
            <button className="profile-avatar-btn" onClick={() => { if (profileSetup) setProfileForm(profileSetup); setShowProfileModal(true); }} title="Editar perfil">
              {profileSetup?.photo
                ? <img className="profile-edit-avatar profile-edit-avatar--photo" src={profileSetup.photo} alt="" />
                : <span className="profile-edit-avatar">{profileSetup?.name ? profileSetup.name.charAt(0).toUpperCase() : "M"}</span>
              }
            </button>
            {awsActive && user && (
              <button className="signout-icon-btn" onClick={signOut} title="Cerrar sesión">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            )}
          </div>
        </header>

        {!awsActive && !localWarnDismissed && (
          <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"10px 20px",background:"#FFFBEB",borderBottom:"1px solid rgba(202,138,4,0.25)"}}>
            <span style={{fontSize:"18px",flexShrink:0}}>⚠️</span>
            <p style={{margin:0,fontSize:"13px",color:"#92400e",lineHeight:1.4,flex:1}}>
              <strong>Tus datos se guardan solo en este dispositivo.</strong> Si borras el historial del navegador o cambias de dispositivo, perderás tu información.
            </p>
            <button onClick={() => { setLocalWarnDismissed(true); localStorage.setItem("localWarnDismissed","1"); }} style={{border:"none",background:"none",fontSize:"20px",color:"#b45309",cursor:"pointer",flexShrink:0,lineHeight:1,padding:"4px"}}>×</button>
          </div>
        )}
        {syncError && (
          <div className="local-banner">
            <strong>Sincronización segura pendiente</strong> • {syncError}
          </div>
        )}

        {/* Banner beta motivacional */}
        {isBetaUser && effectivePlan === "premium" && betaDaysLeft !== null && (
          <div className="beta-banner">
            {betaDaysLeft > 30 ? (
              <><span>🌟</span><div><strong>Bienvenida al grupo beta de Mamá CEO</strong><p>Tienes <b>{betaDaysLeft} días</b> de acceso Premium gratis. ¡Úsalos para construir el hábito de organizar tu negocio y hogar!</p></div></>
            ) : betaDaysLeft > 7 ? (
              <><span>⏳</span><div><strong>Ya llevas un buen camino, {profileSetup?.name || "Mamá CEO"}</strong><p>Te quedan <b>{betaDaysLeft} días</b> de Premium gratis. Todo lo que organizaste aquí ya es tuyo • sigue construyendo.</p></div></>
            ) : betaDaysLeft > 0 ? (
              <><span>⏰</span><div><strong>Últimos {betaDaysLeft} días de tu acceso beta</strong><p>Has avanzado mucho. Activa tu plan cuando estés lista, sin presión.</p><button className="beta-banner-btn" onClick={() => setActiveView("pricing")}>Ver planes →</button></div></>
            ) : (
              <><span>💙</span><div><strong>Tu período beta terminó</strong><p>Tus datos están seguros. Activa tu plan para seguir con acceso ilimitado.</p><button className="beta-banner-btn" onClick={() => setActiveView("pricing")}>Activar mi plan →</button></div></>
            )}
          </div>
        )}

        {activeView === "dashboard" && renderDashboard()}
        {activeView === "business" && renderBusiness()}
        {activeView === "clients" && renderClients()}
        {activeView === "content" && renderContent()}
        {activeView === "home" && renderHome()}
        {/* report tab merged into business */}
        {activeView === "pricing" && renderPricing()}
        {activeView === "terminos" && renderTerminos()}
        {activeView === "privacidad" && renderPrivacidad()}

        {/* Backdrop — oscurece el fondo cuando el hub de herramientas está abierto */}
        <div className={`tools-fab-backdrop${toolsFabOpen ? " tools-fab-backdrop--open" : ""}`} onClick={() => setToolsFabOpen(false)} />

        {/* Pomodoro — FAB fijo + panel */}
        {(function() {
          const _total = pomodoroMode === "work" ? pomodoroWorkDuration * 60 : pomodoroBreakDuration * 60;
          const _elapsed = _total - (pomodoroMinutes * 60 + pomodoroSeconds);
          const _progress = _total > 0 ? (_elapsed / _total) : 0;
          const R = 32; const _circ = 2 * Math.PI * R;
          const _msgs = ["Excelente sesion!", "Eres imparable.", "Pura concentracion.", "Que consistencia!"];
          const _mm = String(pomodoroMinutes).padStart(2,"0");
          const _ss = String(pomodoroSeconds).padStart(2,"0");
          const _hasFree = effectivePlan === "free";
          return (
            <>
              {/* Panel — abre hacia arriba */}
              {pomodoroOpen && toolsFabOpen && (
                <div className={`pomo-panel${pomodoroRunning && pomodoroMode === "work" ? " pomo-panel--focus" : pomodoroMode === "break" ? " pomo-panel--break" : ""}`}
                  style={{ bottom: "256px" }}>
                  <div className="pomo-panel-head">
                    <span className="pomo-label">{pomodoroMode === "break" ? "Descanso" : "Temporizador de foco"}</span>
                    <button className="pomo-tog" onClick={() => setPomodoroOpen(false)}>&#x00D7;</button>
                  </div>
                  <div className="pomo-body">
                    {pomodoroCelebrating ? (
                      <div className="pomo-party">
                        <div className="pomo-party-ico">&#x1F389;</div>
                        <p className="pomo-party-title">{_msgs[(pomodoroBlocks - 1) % _msgs.length]}</p>
                        <p className="pomo-party-sub">{pomodoroBlocks} {pomodoroBlocks === 1 ? "sesi\xF3n" : "sesiones"} completada{pomodoroBlocks !== 1 ? "s" : ""} hoy</p>
                        <p className="pomo-party-stars">{Array.from({length: Math.min(pomodoroBlocks, 8)}).map((_x,i) => <span key={i}>&#x2B50;</span>)}</p>
                      </div>
                    ) : (
                      <>
                        <div className="pomo-ring-wrap">
                          <svg viewBox="0 0 80 80" className="pomo-ring-svg">
                            <circle cx="40" cy="40" r={R} className="pomo-ring-bg" />
                            <circle cx="40" cy="40" r={R} className="pomo-ring-fg"
                              strokeDasharray={_circ}
                              strokeDashoffset={_circ * (1 - _progress)}
                              transform="rotate(-90 40 40)"
                            />
                          </svg>
                          <div className="pomo-time-disp">{_mm}:{_ss}</div>
                        </div>
                        <div className="pomo-ctrls">
                          <button
                            className={`pomo-main-btn${pomodoroRunning ? " pomo-main-btn--pause" : " pomo-main-btn--start"}`}
                            onClick={() => { setPomodoroRunning(r => !r); requestNotificationPermission(); }}
                          >
                            {pomodoroRunning ? "Pausar" : pomodoroMode === "break" ? "Descansar" : "Iniciar foco"}
                          </button>
                          <button className="pomo-reset-btn" onClick={pomodoroReset} title="Reiniciar">&#x21BA;</button>
                        </div>
                        <div className="pomo-durations">
                          <select value={pomodoroWorkDuration} onChange={(e) => { const v=Number(e.target.value); setPomodoroWorkDuration(v); if(!pomodoroRunning&&pomodoroMode==="work") setPomodoroMinutes(v); }}>
                            <option value={15}>15 min</option><option value={25}>25 min</option><option value={45}>45 min</option><option value={60}>60 min</option>
                          </select>
                          <span className="pomo-dur-sep">&#x2022;</span>
                          <select value={pomodoroBreakDuration} onChange={(e) => { const v=Number(e.target.value); setPomodoroBreakDuration(v); if(!pomodoroRunning&&pomodoroMode==="break") setPomodoroMinutes(v); }}>
                            <option value={5}>5 min</option><option value={10}>10 min</option><option value={15}>15 min</option>
                          </select>
                        </div>
                        {pomodoroBlocks > 0 && (
                          <p className="pomo-blocks-row">{Array.from({length: Math.min(pomodoroBlocks, 8)}).map((_x,i) => <span key={i}>&#x2B50;</span>)} {pomodoroBlocks} {pomodoroBlocks === 1 ? "sesi\xF3n" : "sesiones"} hoy</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              {/* FAB icono */}
              <div className={`tools-fab-row tools-fab-item${toolsFabOpen ? " tools-fab-item--open" : ""}`} style={{ position: "fixed", bottom: "196px", right: "28px", zIndex: 1400 }}>
                <span className="tools-fab-tag">Temporizador</span>
                <button
                  className={`pomo-fab${pomodoroRunning ? " pomo-fab--active" : ""}${pomodoroOpen ? " pomo-fab--open" : ""}`}
                  style={{ position: "static" }}
                  onClick={() => setPomodoroOpen(v => !v)}
                  title="Temporizador de foco"
                  tabIndex={toolsFabOpen ? 0 : -1}
                >
                  <span className="pomo-fab-ico">&#x23F1;</span>
                  {pomodoroRunning && <span className="pomo-fab-time">{_mm}:{_ss}</span>}
                  {!pomodoroRunning && pomodoroBlocks > 0 && <span className="pomo-fab-stars">&#x2B50;{pomodoroBlocks}</span>}
                </button>
              </div>
            </>
          );
        }())}
        {/* Calendar FAB */}
        {(() => {
          const showMorningPrompt = !calMorningDismissed && clockNow.getHours() >= 6 && clockNow.getHours() < 12;
          return (
            <div className={`cal-fab-wrapper tools-fab-item${toolsFabOpen ? " tools-fab-item--open" : ""}`} style={{ bottom: "140px", right: "28px" }}>
              <div className="tools-fab-row">
                <span className="tools-fab-tag">Calendario</span>
                <button type="button"
                  onClick={() => { setShowCalendar(true); setCalMorningDismissed(true); }}
                  className={`cal-fab${showMorningPrompt ? " cal-fab--morning" : ""}`}
                  title="Ver calendario"
                  tabIndex={toolsFabOpen ? 0 : -1}>
                  📅
                  {showMorningPrompt && <span className="cal-fab-dot" />}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Plan FAB */}
        <button
          className={`upgrade-fab tools-fab-item${toolsFabOpen ? " tools-fab-item--open" : ""}`}
          style={{ bottom: "84px", ...(effectivePlan !== "free" ? { background: "var(--purple)", color: "#fff", border: "none" } : {}) }}
          onClick={() => setActiveView("pricing")}
          tabIndex={toolsFabOpen ? 0 : -1}
        >
          🚀 Upgrade
        </button>

        {/* Tools hub — abre/cierra los 3 widgets */}
        <div className="tools-hub-wrap">
          {!toolsFabOpen && <span className="tools-hub-orbit-ring" />}
          <button
            type="button"
            className={`tools-hub-fab${toolsFabOpen ? " tools-hub-fab--open" : ""}`}
            onClick={() => setToolsFabOpen(v => !v)}
            title={toolsFabOpen ? "Cerrar herramientas" : "Más herramientas"}
          >
            {toolsFabOpen ? "✕" : "⋮"}
          </button>
        </div>

        {/* Calendar overlay */}
        {showCalendar && (() => {
          const year  = calendarMonth.getFullYear();
          const month = calendarMonth.getMonth();
          const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
          const today = new Date(); today.setHours(0,0,0,0);
          const firstDay = new Date(year, month, 1);
          const lastDay  = new Date(year, month+1, 0);
          const startOffset = (firstDay.getDay() + 6) % 7;
          const totalCells  = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;
          const t0 = new Date(year, month, 1);
          const tEnd = new Date(year, month+1, 0); tEnd.setHours(23,59,59,999);
          const CAL_TRABAJO = new Set(["Trabajo", "Reunión"]);
          const CAL_TYPES_HOGAR   = ["Médico","Cita","Colegio","Dentista","Extracurricular","Iglesia","Pago","Cumpleaños","Otro"];
          const CAL_TYPES_TRABAJO = ["Reunión","Trabajo"];
          const allMonthAppts = expandAppts(appointments, 400).filter(a => { const d = new Date(a.date+"T00:00:00"); return d >= t0 && d <= tEnd; });
          const monthAppts = calTab === "hogar"   ? allMonthAppts.filter(a => !CAL_TRABAJO.has(a.type))
                           : calTab === "trabajo" ? allMonthAppts.filter(a =>  CAL_TRABAJO.has(a.type))
                           : allMonthAppts;
          const apptsByDay = {};
          monthAppts.forEach(a => { const d = new Date(a.date+"T00:00:00").getDate(); if (!apptsByDay[d]) apptsByDay[d] = []; apptsByDay[d].push(a); });
          const TYPE_COLORS = { "Médico":"#C4526A","Cita":"#C4526A","Colegio":"#6B46C1","Dentista":"#e87b1e","Extracurricular":"#059669","Iglesia":"#7C3AED","Reunión":"#1D9E75","Trabajo":"#0EA5E9","Pago":"#2563EB","Cumpleaños":"#D97706","Otro":"#6B7280" };
          const CAL_TYPES = calTab === "hogar" ? CAL_TYPES_HOGAR : calTab === "trabajo" ? CAL_TYPES_TRABAJO : ["Médico","Cita","Colegio","Dentista","Extracurricular","Iglesia","Reunión","Trabajo","Pago","Cumpleaños","Otro"];
          const defaultType = calTab === "trabajo" ? "Reunión" : "Médico";
          const REC_OPTS = [["none","No se repite"],["weekly","Cada semana"],["monthly","Cada mes"],["yearly","Cada año"]];
          const isMobile = window.innerWidth < 700;
          const inp = {border:"1px solid var(--line)",borderRadius:"10px",padding:"10px 12px",fontSize:"14px",fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",background:"#fff"};

          const STANDARD_TYPES = new Set(["Médico","Cita","Colegio","Dentista","Extracurricular","Iglesia","Pago","Cumpleaños","Reunión","Trabajo","Otro"]);
          const showToast = (msg) => { setCalToast(msg); setTimeout(() => setCalToast(null), 2800); };

          const saveCalendarAppt = () => {
            if (!calendarNewAppt.title.trim()) return;
            const typeVal = calendarNewAppt.type === "Otro" && calendarNewAppt.customType?.trim()
              ? calendarNewAppt.customType.trim() : calendarNewAppt.type;
            const durationVal = Number(calendarNewAppt.duration) || APPT_TYPE_DURATION[typeVal] || DEFAULT_APPT_DURATION;
            setAppointments(prev => [...prev, { id: Date.now(), title: calendarNewAppt.title.trim(), date: calendarAddDate, time: calendarNewAppt.time, type: typeVal, recurrence: calendarNewAppt.recurrence || "none", duration: durationVal }]);
            setCalendarAddDate(null);
            setCalendarNewAppt({ title: "", type: defaultType, time: "", recurrence: "none", customType: "", duration: "" });
            showToast("¡Listo! Evento guardado ✓");
          };

          const saveCalendarEdit = () => {
            if (!calendarEditAppt?.title.trim()) return;
            const typeVal = calendarEditAppt.type === "Otro" && calendarEditAppt.customType?.trim()
              ? calendarEditAppt.customType.trim() : calendarEditAppt.type;
            const durationVal = Number(calendarEditAppt.duration) || APPT_TYPE_DURATION[typeVal] || DEFAULT_APPT_DURATION;
            setAppointments(prev => prev.map(a => a.id === calendarEditAppt.id ? { ...calendarEditAppt, type: typeVal, duration: durationVal } : a));
            setCalendarEditAppt(null);
            showToast("¡Cambios guardados ✓");
          };

          const deleteCalAppt = (id) => {
            setAppointments(prev => prev.filter(a => a.id !== id));
            setCalendarEditAppt(null);
            showToast("Evento eliminado");
          };

          const openEdit = (a) => {
            const isStd = STANDARD_TYPES.has(a.type);
            setCalendarEditAppt({ ...a, type: isStd ? a.type : "Otro", customType: isStd ? "" : a.type });
          };

          return (
            <>
              <style>{`
                @keyframes _calIn { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:none; } }
                @keyframes _calFade { from { opacity:0; } to { opacity:1; } }
                @keyframes _miniIn { from { opacity:0; transform:scale(0.93) translateY(-8px); } to { opacity:1; transform:none; } }
                ._cal-panel { animation: _calIn 0.28s cubic-bezier(.32,.72,0,1); }
                ._cal-back  { animation: _calFade 0.22s ease; }
                ._cal-mini  { animation: _miniIn 0.2s cubic-bezier(.32,.72,0,1); }
                ._cal-day:hover { filter: brightness(0.96); }
                ._cal-chip:hover { opacity:0.85; }
              `}</style>

              {/* Backdrop */}
              <div className="_cal-back" onClick={e => { if (e.target===e.currentTarget) { setShowCalendar(false); setCalendarAddDate(null); } }}
                style={{position:"fixed",inset:0,zIndex:9000,background:isMobile?"#fff":"rgba(15,15,25,0.55)",display:"flex",alignItems:isMobile?"stretch":"center",justifyContent:"center",backdropFilter:isMobile?"none":"blur(2px)"}}>

                {/* Calendar panel */}
                <div className="_cal-panel"
                  style={{background:"#fff",width:"100%",maxWidth:isMobile?"100%":"860px",height:isMobile?"100dvh":"92vh",borderRadius:isMobile?"0":"20px",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:isMobile?"none":"0 32px 80px rgba(0,0,0,0.22)"}}>

                  {/* Header — pure flex, no absolute */}
                  <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"14px 16px",borderBottom:"1px solid var(--line)",flexShrink:0}}>
                    <button type="button" onClick={() => { setCalendarMonth(new Date(year,month-1,1)); setCalendarAddDate(null); }}
                      style={{border:"none",background:"var(--line)",borderRadius:"10px",width:"38px",height:"38px",cursor:"pointer",fontSize:"20px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>‹</button>
                    <div style={{flex:1,textAlign:"center"}}>
                      <span style={{fontSize:"18px",fontWeight:800,color:"var(--ink)"}}>{MONTH_NAMES[month]} {year}</span>
                    </div>
                    <button type="button" onClick={() => { setCalendarMonth(new Date(year,month+1,1)); setCalendarAddDate(null); }}
                      style={{border:"none",background:"var(--line)",borderRadius:"10px",width:"38px",height:"38px",cursor:"pointer",fontSize:"20px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>›</button>
                    <button type="button" onClick={() => { setShowCalendar(false); setCalendarAddDate(null); }}
                      style={{border:"none",background:"var(--line)",borderRadius:"10px",width:"38px",height:"38px",cursor:"pointer",fontSize:"16px",color:"var(--ink)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:700}}>✕</button>
                  </div>

                  {/* Tab bar: Todos / Hogar / Trabajo */}
                  <div style={{display:"flex",gap:"4px",padding:"8px 14px 0",flexShrink:0,borderBottom:"1px solid var(--line)"}}>
                    {[["all","Todos"],["hogar","🏠 Hogar"],["trabajo","💼 Trabajo"]].map(([id,label]) => (
                      <button key={id} type="button" onClick={() => { setCalTab(id); setCalendarAddDate(null); }}
                        style={{padding:"7px 14px",borderRadius:"8px 8px 0 0",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",fontWeight:calTab===id?700:500,
                          background:calTab===id?"#fff":"transparent",color:calTab===id?"var(--ink)":"var(--muted)",
                          borderBottom:calTab===id?"2px solid #C4526A":"2px solid transparent",transition:"all 0.15s"}}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Day labels — single letters to avoid Sunday clip */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"8px 4px 2px",flexShrink:0}}>
                    {["L","M","X","J","V","S","D"].map(d => (
                      <div key={d} style={{textAlign:"center",fontSize:"11px",fontWeight:800,color:"var(--muted)",letterSpacing:"0.5px"}}>{d}</div>
                    ))}
                  </div>

                  {/* Grid — no horizontal padding to prevent Sunday clip */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"2px",padding:"2px 4px 4px",flex:1,alignContent:"stretch",minHeight:0}}>
                    {Array.from({length:totalCells}).map((_,i) => {
                      const dayNum = i - startOffset + 1;
                      const isThisMonth = dayNum >= 1 && dayNum <= lastDay.getDate();
                      const dateStr = isThisMonth ? `${year}-${String(month+1).padStart(2,"0")}-${String(dayNum).padStart(2,"0")}` : null;
                      const isToday = isThisMonth && new Date(year,month,dayNum).toDateString() === today.toDateString();
                      const isSelected = !!dateStr && dateStr === calendarAddDate;
                      const dayAppts = isThisMonth ? (apptsByDay[dayNum] || []) : [];
                      return (
                        <div key={i} className={isThisMonth?"_cal-day":""} onClick={() => { if (!isThisMonth) return; setCalendarAddDate(isSelected?null:dateStr); if (!isSelected) setCalendarNewAppt(p => ({...p, type: defaultType})); }}
                          style={{borderRadius:"8px",padding:"4px 3px",background:isSelected?"rgba(196,82,106,0.11)":isToday?"#FEF3E0":"transparent",border:isSelected?"2px solid #C4526A":"2px solid transparent",display:"flex",flexDirection:"column",gap:"2px",overflow:"hidden",cursor:isThisMonth?"pointer":"default",transition:"all 0.12s"}}>
                          {isThisMonth && (<>
                            <span style={{fontSize:"13px",fontWeight:isToday||isSelected?800:500,color:isSelected?"#C4526A":isToday?"#A0722A":"var(--ink)",alignSelf:"center",lineHeight:1.3}}>{dayNum}</span>
                            {dayAppts.slice(0,3).map((a,ai) => (
                              <div key={ai} className="_cal-chip"
                                onClick={e => { e.stopPropagation(); openEdit(a); }}
                                title={`Editar: ${a.title}`}
                                style={{fontSize:"9px",fontWeight:700,color:"#fff",background:TYPE_COLORS[a.type]||"#6B7280",borderRadius:"3px",padding:"2px 3px",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",lineHeight:1.4,cursor:"pointer",transition:"opacity 0.1s"}}>
                                {a.time && <span style={{opacity:0.9}}>{a.time} </span>}{a.title}
                              </div>
                            ))}
                            {dayAppts.length > 3 && <span style={{fontSize:"9px",color:"var(--muted)",textAlign:"center",fontWeight:700}}>+{dayAppts.length-3}</span>}
                          </>)}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div style={{padding:"6px 12px",borderTop:"1px solid var(--line)",display:"flex",gap:"6px",flexWrap:"wrap",justifyContent:"center",alignItems:"center",flexShrink:0,paddingBottom:"max(8px,env(safe-area-inset-bottom))"}}>
                    <span style={{fontSize:"10px",color:"var(--muted)",width:"100%",textAlign:"center"}}>Toca un día para agregar · Toca un evento para editarlo</span>
                    {Object.entries(TYPE_COLORS).filter(([t])=>t!=="Cita").map(([type,color]) => (
                      <span key={type} style={{display:"flex",alignItems:"center",gap:"3px",fontSize:"10px",color:"var(--muted)"}}>
                        <span style={{width:"8px",height:"8px",borderRadius:"2px",background:color,flexShrink:0,display:"inline-block"}}></span>{type}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Add event modal */}
                {calendarAddDate && (
                  <div className="_cal-back" onClick={e => { if(e.target===e.currentTarget) setCalendarAddDate(null); }}
                    style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.22)",zIndex:10}}>
                    <div className="_cal-mini" style={{background:"#fff",borderRadius:"20px",width:"min(380px,92vw)",boxShadow:"0 24px 64px rgba(0,0,0,0.2)",overflow:"hidden"}}>
                      <div style={{background:"linear-gradient(135deg,#C4526A,#a33a54)",padding:"18px 20px 16px",color:"#fff",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"8px"}}>
                        <div>
                          <p style={{margin:"0 0 3px",fontSize:"11px",fontWeight:700,opacity:0.8,textTransform:"uppercase",letterSpacing:"0.8px"}}>Nuevo evento</p>
                          <p style={{margin:0,fontSize:"16px",fontWeight:800,textTransform:"capitalize",lineHeight:1.2}}>
                            {new Date(calendarAddDate+"T00:00:00").toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long"})}
                          </p>
                        </div>
                        <button type="button" onClick={() => setCalendarAddDate(null)}
                          style={{border:"none",background:"rgba(255,255,255,0.22)",borderRadius:"8px",width:"30px",height:"30px",cursor:"pointer",fontSize:"15px",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
                      </div>
                      <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:"12px"}}>
                        <input autoFocus placeholder="¿Qué tienes ese día?" value={calendarNewAppt.title}
                          onChange={e => setCalendarNewAppt(p => ({...p, title:e.target.value}))}
                          onKeyDown={e => e.key==="Enter" && saveCalendarAppt()}
                          style={{...inp,fontWeight:500}} />
                        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"8px",alignItems:"start"}}>
                          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                            <label style={{fontSize:"10px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Tipo</label>
                            <select value={calendarNewAppt.type} onChange={e => setCalendarNewAppt(p => ({...p, type:e.target.value, customType:""}))} style={{...inp}}>
                              <optgroup label="🏠 Hogar">
                                {["Médico","Cita","Colegio","Dentista","Extracurricular","Iglesia","Pago","Cumpleaños"].map(t => <option key={t}>{t}</option>)}
                              </optgroup>
                              <optgroup label="💼 Trabajo">
                                {["Reunión","Trabajo"].map(t => <option key={t}>{t}</option>)}
                              </optgroup>
                              <option value="Otro">✏️ Otro…</option>
                            </select>
                            {calendarNewAppt.type === "Otro" && (
                              <input placeholder="¿Qué tipo de evento?" value={calendarNewAppt.customType||""}
                                onChange={e => setCalendarNewAppt(p => ({...p, customType:e.target.value}))}
                                style={{...inp,fontSize:"13px"}} />
                            )}
                          </div>
                          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                            <label style={{fontSize:"10px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Hora</label>
                            <input type="time" value={calendarNewAppt.time}
                              onChange={e => setCalendarNewAppt(p => ({...p, time:e.target.value}))}
                              style={{...inp,width:"108px"}} />
                          </div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                            <label style={{fontSize:"10px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Repetición</label>
                            <select value={calendarNewAppt.recurrence} onChange={e => setCalendarNewAppt(p => ({...p, recurrence:e.target.value}))} style={{...inp}}>
                              {REC_OPTS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          </div>
                          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                            <label style={{fontSize:"10px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Duración (min)</label>
                            <input type="number" min="0" step="5"
                              placeholder={`Auto: ${APPT_TYPE_DURATION[calendarNewAppt.type]||DEFAULT_APPT_DURATION}`}
                              value={calendarNewAppt.duration} onChange={e => setCalendarNewAppt(p => ({...p, duration:e.target.value}))}
                              style={{...inp}} />
                          </div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginTop:"2px"}}>
                          <button type="button" onClick={() => setCalendarAddDate(null)}
                            style={{border:"1px solid var(--line)",background:"#fff",borderRadius:"12px",padding:"11px",fontSize:"14px",fontWeight:600,cursor:"pointer",color:"var(--ink)"}}>Cancelar</button>
                          <button type="button" onClick={saveCalendarAppt}
                            style={{border:"none",background:"#C4526A",borderRadius:"12px",padding:"11px",fontSize:"14px",fontWeight:700,cursor:"pointer",color:"#fff"}}>Guardar evento</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit event modal */}
                {calendarEditAppt && (
                  <div className="_cal-back" onClick={e => { if(e.target===e.currentTarget) setCalendarEditAppt(null); }}
                    style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.22)",zIndex:10}}>
                    <div className="_cal-mini" style={{background:"#fff",borderRadius:"20px",width:"min(380px,92vw)",boxShadow:"0 24px 64px rgba(0,0,0,0.2)",overflow:"hidden"}}>
                      <div style={{background:"linear-gradient(135deg,#4B5563,#374151)",padding:"18px 20px 16px",color:"#fff",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"8px"}}>
                        <div>
                          <p style={{margin:"0 0 3px",fontSize:"11px",fontWeight:700,opacity:0.8,textTransform:"uppercase",letterSpacing:"0.8px"}}>Editar evento</p>
                          <p style={{margin:0,fontSize:"16px",fontWeight:800,textTransform:"capitalize",lineHeight:1.2}}>
                            {new Date(calendarEditAppt.date+"T00:00:00").toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long"})}
                          </p>
                        </div>
                        <button type="button" onClick={() => setCalendarEditAppt(null)}
                          style={{border:"none",background:"rgba(255,255,255,0.22)",borderRadius:"8px",width:"30px",height:"30px",cursor:"pointer",fontSize:"15px",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
                      </div>
                      <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:"12px"}}>
                        <input autoFocus placeholder="¿Qué tienes ese día?" value={calendarEditAppt.title}
                          onChange={e => setCalendarEditAppt(p => ({...p, title:e.target.value}))}
                          onKeyDown={e => e.key==="Enter" && saveCalendarEdit()}
                          style={{...inp,fontWeight:500}} />
                        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"8px",alignItems:"start"}}>
                          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                            <label style={{fontSize:"10px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Tipo</label>
                            <select value={calendarEditAppt.type} onChange={e => setCalendarEditAppt(p => ({...p, type:e.target.value, customType:""}))} style={{...inp}}>
                              <optgroup label="🏠 Hogar">
                                {["Médico","Cita","Colegio","Dentista","Extracurricular","Iglesia","Pago","Cumpleaños"].map(t => <option key={t}>{t}</option>)}
                              </optgroup>
                              <optgroup label="💼 Trabajo">
                                {["Reunión","Trabajo"].map(t => <option key={t}>{t}</option>)}
                              </optgroup>
                              <option value="Otro">✏️ Otro…</option>
                            </select>
                            {calendarEditAppt.type === "Otro" && (
                              <input placeholder="¿Qué tipo de evento?" value={calendarEditAppt.customType||""}
                                onChange={e => setCalendarEditAppt(p => ({...p, customType:e.target.value}))}
                                style={{...inp,fontSize:"13px"}} />
                            )}
                          </div>
                          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                            <label style={{fontSize:"10px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Hora</label>
                            <input type="time" value={calendarEditAppt.time||""}
                              onChange={e => setCalendarEditAppt(p => ({...p, time:e.target.value}))}
                              style={{...inp,width:"108px"}} />
                          </div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                            <label style={{fontSize:"10px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Repetición</label>
                            <select value={calendarEditAppt.recurrence||"none"} onChange={e => setCalendarEditAppt(p => ({...p, recurrence:e.target.value}))} style={{...inp}}>
                              {REC_OPTS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          </div>
                          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                            <label style={{fontSize:"10px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Duración (min)</label>
                            <input type="number" min="0" step="5"
                              placeholder={`Auto: ${APPT_TYPE_DURATION[calendarEditAppt.type]||DEFAULT_APPT_DURATION}`}
                              value={calendarEditAppt.duration||""} onChange={e => setCalendarEditAppt(p => ({...p, duration:e.target.value}))}
                              style={{...inp}} />
                          </div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"auto 1fr 1fr",gap:"8px",marginTop:"2px"}}>
                          <button type="button" onClick={() => deleteCalAppt(calendarEditAppt.id)}
                            style={{border:"1px solid #FECACA",background:"#FEF2F2",borderRadius:"12px",padding:"11px 14px",fontSize:"16px",cursor:"pointer"}} title="Eliminar evento">🗑</button>
                          <button type="button" onClick={() => setCalendarEditAppt(null)}
                            style={{border:"1px solid var(--line)",background:"#fff",borderRadius:"12px",padding:"11px",fontSize:"14px",fontWeight:600,cursor:"pointer",color:"var(--ink)"}}>Cancelar</button>
                          <button type="button" onClick={saveCalendarEdit}
                            style={{border:"none",background:"#C4526A",borderRadius:"12px",padding:"11px",fontSize:"14px",fontWeight:700,cursor:"pointer",color:"#fff"}}>Guardar</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Toast notification */}
                {calToast && (
                  <div style={{position:"absolute",bottom:"20px",left:"50%",transform:"translateX(-50%)",background:"#1C1C1E",color:"#fff",borderRadius:"24px",padding:"11px 22px",fontSize:"13px",fontWeight:600,zIndex:20,whiteSpace:"nowrap",boxShadow:"0 8px 32px rgba(0,0,0,0.3)",display:"flex",alignItems:"center",gap:"8px",animation:"_calFade 0.25s ease",pointerEvents:"none"}}>
                    {calToast}
                  </div>
                )}
              </div>
            </>
          );
        })()}

        <footer className="app-footer">
          <span>Hecho por Una mamá con propósito® · Todos los derechos reservados UMP S.A.S 2026</span>
          <span>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('terminos'); }} style={{color:"inherit",textDecoration:"underline",cursor:"pointer"}}>Términos</a>
            {" • "}
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('privacidad'); }} style={{color:"inherit",textDecoration:"underline",cursor:"pointer"}}>Privacidad</a>
          </span>
        </footer>

        {/* Barra de navegación inferior — solo mobile */}
        <nav className="mobile-bottom-nav">
          {menu.slice(0, 5).map((item) => {
            const planOrder = { free: 0, mama: 1, emprendedora: 2, ceo: 3, premium: 3 };
            const itemPlan = ["business","clients","studio","content"].includes(item.id) ? "emprendedora" : "free";
            const locked = (planOrder[effectivePlan] ?? 0) < (planOrder[itemPlan] ?? 0);
            return (
              <button key={item.id} className={`mobile-bottom-nav-item${activeView === item.id ? " active" : ""}`}
                onClick={() => {
                  if (locked) { setUpgradeModal({ feature: item.label, plan: "Emprendedora" }); return; }
                  setActiveView(item.id);
                }}>
                <span className="mobile-bottom-nav-icon">{item.icon}</span>
                <span className="mobile-bottom-nav-label">{item.label.split(" ")[0]}</span>
                {locked && <span className="mobile-bottom-nav-lock">🔒</span>}
              </button>
            );
          })}
          <button className={`mobile-bottom-nav-item${activeView === "pricing" ? " active" : ""}`}
            onClick={() => setActiveView("pricing")}>
            <span className="mobile-bottom-nav-icon">⭐</span>
            <span className="mobile-bottom-nav-label">Planes</span>
          </button>
        </nav>
      </main>

      {/* Modal de upgrade */}
      {upgradeModal && (() => {
        const perks = {
          "Emprendedora": [
            "💰 Ingresos y gastos de tu negocio, al día",
            "👥 Pipeline de clientes: sabe quién está lista para comprar",
            "🤖 Hasta 60 publicaciones al mes creadas con IA",
            "📅 Agenda de citas de tu negocio integrada",
          ],
          "CEO": [
            "📊 Proyecciones de ingresos antes de que termine el mes",
            "📤 Exporta todos tus registros a Excel cuando quieras",
            "♾️ Sin límites en absolutamente todo",
            "⏱️ Temporizador Pomodoro para trabajar enfocada",
          ],
        };
        const planPerks = perks[upgradeModal.plan] || perks["Emprendedora"];
        return (
          <div onClick={() => setUpgradeModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
            <div onClick={e => e.stopPropagation()} style={{background:"#fff",borderRadius:"22px",padding:"28px 24px",maxWidth:"360px",width:"100%",boxShadow:"0 12px 50px rgba(0,0,0,0.2)"}}>
              <p style={{margin:"0 0 6px",fontSize:"11px",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.8px",color:"var(--muted)"}}>Plan {upgradeModal.plan}</p>
              <h3 style={{margin:"0 0 6px",fontSize:"20px",color:"var(--ink)",fontWeight:800,lineHeight:1.25}}>
                ✨ {upgradeModal.feature} te espera
              </h3>
              <p style={{margin:"0 0 16px",color:"var(--muted)",fontSize:"13px",lineHeight:1.5}}>
                Esta función es parte del Plan {upgradeModal.plan}. Aquí lo que desbloqueas:
              </p>
              <div style={{background:"#faf5ff",borderRadius:"12px",padding:"14px 16px",marginBottom:"20px",display:"grid",gap:"9px"}}>
                {planPerks.map(p => (
                  <div key={p} style={{display:"flex",gap:"8px",fontSize:"13px",color:"var(--ink)",lineHeight:1.4,alignItems:"flex-start"}}>
                    <span style={{flexShrink:0}}>{p}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => { setActiveView("pricing"); setUpgradeModal(null); }}
                style={{width:"100%",padding:"14px",borderRadius:"12px",border:"none",background:"var(--purple)",color:"#fff",fontWeight:700,fontSize:"15px",cursor:"pointer",marginBottom:"10px"}}>
                Ver mi plan →
              </button>
              <button onClick={() => setUpgradeModal(null)}
                style={{width:"100%",padding:"10px",borderRadius:"12px",border:"1px solid var(--line)",background:"none",color:"var(--muted)",fontSize:"14px",cursor:"pointer"}}>
                Ahora no
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );

  function renderDashboard() {
    const todayStr = clockNow.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
    const timeStr = clockNow.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    const urgentLeads = clients.filter((c) => c.status === "Lead caliente");
    const lastPublished = contentItems.filter((i) => i.status === "Publicado" && i.createdAt).sort((a, b) => b.createdAt - a.createdAt)[0];
    const daysSincePublish = lastPublished ? Math.floor((Date.now() - lastPublished.createdAt) / 86400000) : null;
    const urgentHomeTasks = homeTasks.filter((t) => !t.done && t.priority === "Importante");
    const hasAlerts = urgentLeads.length > 0 || (daysSincePublish !== null && daysSincePublish > 3) || urgentHomeTasks.length > 0;
    const focusTasks = [...tasks].filter((t) => !t.done).sort((a, b) => taskUrgencyScore(b) - taskUrgencyScore(a)).slice(0, 3);

    // ── Gating por modo / trial ──
    const trialActive = !!premiumExpiresAt && Date.now() < premiumExpiresAt;
    const showNegocioPareto = trialActive || !userMode || userMode === "ambas" || userMode === "emprendedora";
    const showHogarPareto   = trialActive || !userMode || userMode === "ambas" || userMode === "mama";

    // ── Pareto Negocio: 80/20 de ingresos ──
    const wonClients = clients.filter((c) => c.status === "Venta ganada" && c.amount > 0).sort((a, b) => b.amount - a.amount);
    const totalWonAmount = wonClients.reduce((s, c) => s + c.amount, 0);
    let paretoCount = 0, paretoCumulative = 0;
    for (const c of wonClients) {
      paretoCumulative += c.amount;
      paretoCount++;
      if (paretoCumulative >= totalWonAmount * 0.8) break;
    }
    const paretoTopClients = wonClients.slice(0, Math.max(paretoCount, 1));
    const paretoPct = wonClients.length ? Math.round((paretoTopClients.length / wonClients.length) * 100) : 0;
    const paretoShareOfIncome = totalWonAmount > 0 ? Math.round((paretoTopClients.reduce((s, c) => s + c.amount, 0) / totalWonAmount) * 100) : 0;

    // ── Top servicios/productos: movements agrupados por clasificación ──
    const incomeByClassification = movements
      .filter(m => m.type === "income" && m.classification)
      .reduce((acc, m) => { acc[m.classification] = (acc[m.classification] || 0) + m.amount; return acc; }, {});
    const topServices = Object.entries(incomeByClassification).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // ── Citas de hoy en el calendario ──
    // Usar fecha local (no UTC) para evitar desfase de timezone
    const _tn = new Date();
    const todayISO = `${_tn.getFullYear()}-${String(_tn.getMonth()+1).padStart(2,"0")}-${String(_tn.getDate()).padStart(2,"0")}`;
    const isTodayAppt = (appt) => {
      if (!appt.date) return false;
      const orig = new Date(appt.date + "T00:00:00");
      const tod  = new Date(todayISO  + "T00:00:00");
      if (orig > tod) return false;
      if (!appt.recurrence || appt.recurrence === "none") return appt.date === todayISO;
      if (appt.recurrence === "weekly")  return Math.round((tod - orig) / 86400000) % 7 === 0;
      if (appt.recurrence === "monthly") return orig.getDate() === tod.getDate();
      if (appt.recurrence === "yearly")  return orig.getDate() === tod.getDate() && orig.getMonth() === tod.getMonth();
      return false;
    };
    const TRABAJO_TYPES = new Set(["Trabajo", "Reunión"]);
    const APPT_ICONS = { "Médico":"🩺","Cita":"📋","Colegio":"🎒","Dentista":"🦷","Extracurricular":"⚽","Iglesia":"🙏","Reunión":"🤝","Trabajo":"💼","Pago":"💳","Cumpleaños":"🎂","Otro":"📌" };
    const todayCalAppts = appointments.filter(isTodayAppt).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    const todayHogar    = todayCalAppts.filter(a => !TRABAJO_TYPES.has(a.type));
    const todayTrabajo  = todayCalAppts.filter(a =>  TRABAJO_TYPES.has(a.type));
    const hasTodayCal   = todayCalAppts.length > 0;

    // ── Carga del día: minutos estimados (sin pedirte nada extra) ──
    const trackWork = userMode !== "mama";
    const trackHome = userMode !== "emprendedora";
    const pendingHomeAll = homeTasks.filter(t => !t.done);
    const pendingBizAll = tasks.filter(t => !t.done);
    const homeTaskMinutes = pendingHomeAll.reduce((s,t)=>s+homeTaskEstDuration(t),0);
    const bizTaskMinutes = pendingBizAll.reduce((s,t)=>s+bizTaskEstDuration(t),0);
    const todayHogarMinutes = todayHogar.reduce((s,a)=>s+apptEstDuration(a),0);
    const todayTrabajoMinutes = todayTrabajo.reduce((s,a)=>s+apptEstDuration(a),0);
    const totalHomeMinutes = trackHome ? homeTaskMinutes + todayHogarMinutes : 0;
    const totalWorkMinutes = trackWork ? bizTaskMinutes + todayTrabajoMinutes : 0;
    const totalLoadMinutes = totalHomeMinutes + totalWorkMinutes;
    const freeMinutes = Math.max(0, AWAKE_MINUTES_PER_DAY - totalLoadMinutes);
    const loadPct = Math.min(100, Math.round((totalLoadMinutes / AWAKE_MINUTES_PER_DAY) * 100));
    const dayState = loadPct < 30
      ? { label: "Libre", emoji: "🌿", color: "#1D9E75", bg: "rgba(29,158,117,0.07)", msg: "Tienes el día despejado. Aprovecha para agendar algo pendiente o simplemente disfrutar." }
      : loadPct < 60
      ? { label: "Equilibrada", emoji: "😊", color: "#C9A96E", bg: "rgba(201,169,110,0.08)", msg: "Tienes una carga razonable hoy. Vas bien." }
      : loadPct < 85
      ? { label: "Ocupada", emoji: "💪", color: "#e87b1e", bg: "rgba(232,123,30,0.08)", msg: "Hoy requiere enfoque, pero es manejable. Prueba el temporizador Pomodoro para avanzar sin agobiarte." }
      : { label: "Saturada", emoji: "😮‍💨", color: "#C4526A", bg: "rgba(196,82,106,0.08)", msg: "Tu día está muy cargado. Considera delegar algo o mover lo que pueda esperar a otro día." };
    const fmtHrs = (mins) => { const h=Math.floor(mins/60); const m=Math.round(mins%60); if (h<=0) return `${m}m`; return m>0 ? `${h}h ${m}m` : `${h}h`; };

    // ── Hogar: "Tus 3 de hoy" ──
    const pendingHome = homeTasks.filter((t) => !t.done);
    const homePriorityRank = { "Importante": 0, "Normal": 1, "Sin afán": 2 };
    const sortHomePool = (list) => [...list].sort((a, b) => (homePriorityRank[a.priority || "Normal"] - homePriorityRank[b.priority || "Normal"]) || (a.id - b.id));
    const autoTop3 = sortHomePool(pendingHome).slice(0, 3);
    const validOverrideIds = (homeFocusOverride && homeFocusOverride.date === todayISO)
      ? homeFocusOverride.ids.filter((id) => pendingHome.some((t) => t.id === id))
      : [];
    let focusHomeTasks = validOverrideIds.length
      ? pendingHome.filter((t) => validOverrideIds.includes(t.id))
      : autoTop3;
    if (focusHomeTasks.length < 3) {
      const extra = autoTop3.filter((t) => !focusHomeTasks.some((f) => f.id === t.id));
      focusHomeTasks = [...focusHomeTasks, ...extra].slice(0, 3);
    }
    const isCustomFocus = validOverrideIds.length > 0;
    const swapHomeFocusTask = (taskId) => {
      const currentIds = focusHomeTasks.map((t) => t.id);
      const candidates = sortHomePool(pendingHome.filter((t) => !currentIds.includes(t.id)));
      if (!candidates.length) return;
      const newIds = currentIds.map((id) => (id === taskId ? candidates[0].id : id));
      setHomeFocusOverride({ date: todayISO, ids: newIds });
    };

    return (
      <section className="panel workspace-panel">
        <div className="db-wrap">

          {/* ── Carga del día ── */}
          <div className="db-load-grid">
            <div className="db-load-card" style={{background:dayState.bg}}>
              <span className="db-load-card-ico">{dayState.emoji}</span>
              <p className="db-load-card-label">Hoy estás</p>
              <p className="db-load-card-val" style={{color:dayState.color}}>{dayState.label}</p>
              <p className="db-load-card-msg">{dayState.msg}</p>
            </div>
            {trackWork && (
              <div className="db-load-card">
                <span className="db-load-card-ico">💼</span>
                <p className="db-load-card-label">Negocio</p>
                <p className="db-load-card-val">{fmtHrs(totalWorkMinutes)}</p>
                <p className="db-load-card-msg">{pendingBizAll.length+todayTrabajo.length===0?"Nada pendiente hoy":`para cumplir con lo de hoy`}</p>
              </div>
            )}
            {trackHome && (
              <div className="db-load-card">
                <span className="db-load-card-ico">🏠</span>
                <p className="db-load-card-label">Hogar</p>
                <p className="db-load-card-val">{fmtHrs(totalHomeMinutes)}</p>
                <p className="db-load-card-msg">{pendingHomeAll.length+todayHogar.length===0?"Nada pendiente hoy":`para cumplir con lo de hoy`}</p>
              </div>
            )}
            <div className="db-load-card db-load-card--free">
              <span className="db-load-card-ico">🌸</span>
              <p className="db-load-card-label">Tiempo libre</p>
              <p className="db-load-card-val" style={{color:"#1D9E75"}}>{fmtHrs(freeMinutes)}</p>
              <p className="db-load-card-msg">para tu familia o para ti</p>
              {loadPct>=60&&(
                <button type="button" className="db-load-pomo-btn" onClick={()=>{setToolsFabOpen(true);setPomodoroOpen(true);}}>
                  ⏱️ Probar Pomodoro
                </button>
              )}
            </div>
          </div>

          {/* ── Panel de Hoy ── */}
          <div className="db-today-panel">
            <p className="db-today-heading">Tu día de hoy</p>
            <div className={`db-today-grid${userMode === "mama" || userMode === "emprendedora" ? " db-today-grid--2col" : ""}`}>

              {/* Agenda */}
              <div className="db-today-col">
                <p className="db-today-label">📅 Agenda</p>
                {hasTodayCal ? todayCalAppts.map(a => (
                  <div key={a.id} className="db-today-appt-row">
                    {a.time && <span className="db-today-appt-time">{a.time}</span>}
                    <span className="db-today-appt-name">{a.title}</span>
                  </div>
                )) : <p className="db-today-nil">Sin citas hoy</p>}
              </div>

              {/* Hogar */}
              {userMode !== "emprendedora" && (
                <div className="db-today-col">
                  <div className="db-today-col-head">
                    <p className="db-today-label">🌸 Hogar</p>
                    {isCustomFocus && <button type="button" className="db-today-reset-btn" onClick={() => setHomeFocusOverride(null)} title="Reiniciar">↺</button>}
                  </div>
                  {homeTasks.length === 0
                    ? <button type="button" className="db-today-cta-link" onClick={() => setActiveView("home")}>Agregar primera tarea →</button>
                    : focusHomeTasks.length === 0
                    ? <p className="db-today-done">✅ ¡Hiciste las 3 del hogar!</p>
                    : focusHomeTasks.map(task => (
                        <div key={task.id} className="db-today-task-row">
                          <input type="checkbox" className="check-sm" checked={task.done} onChange={() => toggleHomeTask(task.id)} style={{accentColor:"var(--green)"}} />
                          <span className={`db-today-task-title${task.done ? " db-today-task--done" : ""}`}>{task.title}</span>
                          <button type="button" className="db-today-swap-btn" onClick={() => swapHomeFocusTask(task.id)} title="Cambiar">↻</button>
                        </div>
                      ))
                  }
                </div>
              )}

              {/* Negocio */}
              {userMode !== "mama" && (
                <div className="db-today-col">
                  <p className="db-today-label">💼 Negocio</p>
                  {focusTasks.length === 0
                    ? <button type="button" className="db-today-cta-link" onClick={() => setActiveView("business")}>Agregar tarea de negocio →</button>
                    : <>
                        {focusTasks.map(task => (
                          <div key={task.id} className="db-today-task-row">
                            <input type="checkbox" className="check-sm" checked={task.done} onChange={() => toggleTask(task.id)} style={{accentColor:"var(--green)"}} />
                            <span className={`db-today-task-title${task.done ? " db-today-task--done" : ""}`}>{task.text}</span>
                            {task.priority === "Importante" && <span className="db-today-urgente">Importante</span>}
                          </div>
                        ))}
                        <button type="button" className="db-today-see-more" onClick={() => setActiveView("business")}>Ver negocio →</button>
                      </>
                  }
                </div>
              )}

            </div>

            {/* Menú de hoy strip */}
            {(()=>{const tm=weekMenu[["D","L","M","X","J","V","S"][new Date().getDay()]]; const hasMenu=tm&&(typeof tm==="string"?tm:Object.values(tm).some(Boolean)); const d=tm&&(typeof tm==="string"?{almuerzo:tm}:tm)||{};
              const MEALS=[["desayuno","🌅","Desayuno"],["almuerzo","🍽️","Almuerzo"],["cena","🌙","Cena"],["snack","🍎","Snack"]];
              return (
                <div className="db-menu-strip">
                  <div className="db-menu-strip-head">
                    <span className="db-menu-strip-title">🍽️ Hoy comerás</span>
                    <button type="button" className="db-menu-strip-cta" onClick={()=>setActiveView("home")}>
                      {hasMenu?"Ver menú →":"Planear con Abi →"}
                    </button>
                  </div>
                  {hasMenu?(
                    <div className="db-menu-items">
                      {MEALS.filter(([key])=>d[key]).map(([key,ico,label])=>(
                        <div key={key} className="db-menu-item">
                          <span className="db-menu-item-ico">{ico}</span>
                          <div className="db-menu-item-text">
                            <span className="db-menu-item-label">{label}</span>
                            <span className="db-menu-item-val">{d[key]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ):(
                    <p className="db-menu-empty">Aún no planeas qué comer hoy — Abi te ayuda en segundos.</p>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Meta del mes + Semana */}
          <div className="db-meta-row">
            <div className="db-meta-card">
              <div className="db-meta-top">
                <span className="db-section-label">Meta del mes</span>
                <span className="db-meta-pct" style={{color: monthlyProgress >= 75 ? "var(--green)" : monthlyProgress >= 50 ? "var(--orange)" : "var(--pink)"}}>{monthlyProgress}%</span>
              </div>
              <div className="db-meta-numbers">
                <strong className="db-meta-income">{money.format(totals.income)}</strong>
                <span className="db-meta-goal">de {money.format(monthlyGoal)}</span>
              </div>
              <Progress value={monthlyProgress} tone={monthlyProgress >= 75 ? "green" : monthlyProgress >= 50 ? "orange" : "pink"} />
              <p className="db-meta-msg">
                {monthlyProgress >= 100 ? "Meta cumplida. &#x1F3C6;" : monthlyProgress >= 75 ? "Vas muy bien, sigue as\xED." : monthlyProgress >= 50 ? "Mitad del camino, t\xFA puedes!" : monthlyProgress >= 25 ? "Buen comienzo, acelera." : "Empieza hoy con una acci\xF3n concreta."}
              </p>
            </div>
            <div className="db-week-card">
              <div className="week-ring" style={{"--value": monthWeekInfo.progress}}>
                <span>Semana</span>
                <strong>{monthWeekInfo.current} de {monthWeekInfo.total}</strong>
                <small>{monthWeekInfo.month}</small>
              </div>
              <p className="db-week-balance" style={{color: totals.profit >= 0 ? "var(--green)" : "var(--pink)"}}>
                {totals.profit >= 0 ? "+" : ""}{money.format(totals.profit)}
              </p>
              <span className="db-week-balance-label">balance del mes</span>
            </div>
          </div>

          {/* Alertas */}
          {hasAlerts && (
            <div className="db-alerts">
              {urgentLeads.length > 0 && (
                <button className="db-alert db-alert--purple" onClick={() => setActiveView("clients")}>
                  &#x1F469;&#x200D;&#x1F4BC; {urgentLeads.length} lead{urgentLeads.length > 1 ? "s" : ""} caliente{urgentLeads.length > 1 ? "s" : ""} esperando &rarr;
                </button>
              )}
              {daysSincePublish !== null && daysSincePublish > 3 && (
                <button className="db-alert db-alert--orange" onClick={() => setActiveView("content")}>
                  &#x1F4F1; {daysSincePublish} d&iacute;as sin publicar &mdash; crea algo hoy &rarr;
                </button>
              )}
              {urgentHomeTasks.length > 0 && (
                <button className="db-alert db-alert--red" onClick={() => setActiveView("home")}>
                  &#x1F3E0; {urgentHomeTasks.length} tarea{urgentHomeTasks.length > 1 ? "s" : ""} urgente{urgentHomeTasks.length > 1 ? "s" : ""} en el hogar &rarr;
                </button>
              )}
            </div>
          )}

          {/* Lo que sostiene tu negocio: clientes + servicios */}
          {showNegocioPareto && (
            <div className="db-sustain-card">
              <div className="db-sustain-head">
                <span className="db-sustain-title">Lo que sostiene tu negocio</span>
                <button type="button" className="db-pareto-link" onClick={() => setActiveView("business")}>Ver negocio →</button>
              </div>
              <div className="db-sustain-grid">

                {/* Top clientes */}
                <div className="db-sustain-col">
                  <p className="db-sustain-col-label">Clientes que más aportan</p>
                  {wonClients.length === 0 ? (
                    <div className="db-pareto-empty-state">
                      <p className="db-pareto-empty">Sin ventas cerradas aún. Registra clientes para ver quién sostiene tu negocio.</p>
                      <button type="button" className="db-pareto-link" onClick={() => setActiveView("clients")}>Agregar clientes →</button>
                    </div>
                  ) : (
                    <>
                      {wonClients.length >= 2 && (
                        <p className="db-sustain-stat">{paretoTopClients.length} cliente{paretoTopClients.length > 1 ? "s" : ""} generan el <strong>{paretoShareOfIncome}%</strong> de tus ingresos</p>
                      )}
                      {wonClients.slice(0, 5).map(c => (
                        <div key={c.id} className="db-sustain-row">
                          <span className="db-sustain-row-name">{c.name}</span>
                          <span className="db-sustain-row-val">{money.format(c.amount)}</span>
                        </div>
                      ))}
                      <button type="button" className="db-pareto-link" onClick={() => setActiveView("clients")}>Ver clientes →</button>
                    </>
                  )}
                </div>

                {/* Top servicios/productos */}
                <div className="db-sustain-col">
                  <p className="db-sustain-col-label">Servicios / productos top</p>
                  {topServices.length === 0 ? (
                    <div className="db-pareto-empty-state">
                      <p className="db-pareto-empty">Registra ingresos clasificados para ver qué ofrece mejores resultados.</p>
                      <button type="button" className="db-pareto-link" onClick={() => setActiveView("business")}>Ir a finanzas →</button>
                    </div>
                  ) : (
                    topServices.map(([name, amount]) => (
                      <div key={name} className="db-sustain-row">
                        <span className="db-sustain-row-name">{name}</span>
                        <span className="db-sustain-row-val">{money.format(amount)}</span>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Studio — insight motivacional */}
          <div className="db-studio-insight">
            <div className="db-studio-insight-icon">✦</div>
            <div className="db-studio-insight-body">
              <p className="db-studio-insight-title">Mi Studio de Contenido</p>
              <p className="db-studio-insight-msg">
                {daysSincePublish === null
                  ? "Las mamás CEO que publican contenido consistente atraen más clientes sin salir a buscarlos."
                  : daysSincePublish === 0
                  ? "¡Publicaste hoy! La consistencia construye audiencias — y las audiencias construyen ventas."
                  : daysSincePublish <= 3
                  ? `Último contenido hace ${daysSincePublish} día${daysSincePublish > 1 ? "s" : ""}. Cada pieza que publicas trabaja para ti 24/7.`
                  : `Llevas ${daysSincePublish} días sin publicar. Tu próxima pieza puede ser tu próxima venta.`
                }
              </p>
            </div>
            <div className="db-studio-insight-right">
              {contentItems.length > 0 && (
                <p className="db-studio-insight-stat">{contentItems.filter(i => i.status !== "Publicado").length} <span>en proceso</span></p>
              )}
              <button type="button" className="db-studio-insight-btn" onClick={() => setActiveView("studio")}>Abrir Studio →</button>
            </div>
          </div>

        </div>
      </section>
    );
  }

  function renderBusiness() {
    const brandComplete = !!(brandProfile.queOfreces && brandProfile.transformacion);

    // Salud del mes
    const healthColor = totals.profit >= 0 && monthlyProgress >= 75 ? "#1D9E75"
      : totals.profit >= 0 || monthlyProgress >= 50 ? "#e87b1e" : "#C4526A";
    const healthLabel = totals.profit >= 0 && monthlyProgress >= 75 ? "Negocio saludable 💚"
      : totals.profit >= 0 || monthlyProgress >= 50 ? "Atención requerida ⚠️" : "Alerta financiera 🚨";

    // Semana actual vs anterior
    const weekBounds = (offset) => {
      const now = new Date();
      const day = now.getDay();
      const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7); mon.setHours(0,0,0,0);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
      return { start: mon.getTime(), end: sun.getTime() };
    };
    const thisWeek = weekBounds(0);
    const lastWeek = weekBounds(-1);
    const inWeek = (m, w) => { const ts = timestampFromInputDate(m.date || m.createdAt); return ts >= w.start && ts <= w.end; };
    const twMovs = sortedMovements.filter(m => inWeek(m, thisWeek));
    const lwMovs = sortedMovements.filter(m => inWeek(m, lastWeek));
    const twIncome  = twMovs.filter(m => m.type === "income").reduce((s,m) => s + m.amount, 0);
    const lwIncome  = lwMovs.filter(m => m.type === "income").reduce((s,m) => s + m.amount, 0);
    const twChange  = lwIncome > 0 ? Math.round(((twIncome - lwIncome) / lwIncome) * 100) : null;
    const twWon     = clients.filter(c => c.status === "Venta ganada" && inWeek({date: c.updatedAt || c.lastContact || c.createdAt}, thisWeek)).length;
    const twContacts = Object.values(contactLog).filter(e => { const ts = timestampFromInputDate(e.date); return ts >= thisWeek.start && ts <= thisWeek.end; }).length;

    // Alertas urgentes
    const alerts = [];
    if (twIncome < weeklyGoal * 0.5) alerts.push({ tone: "red",    msg: `Ingresos de la semana por debajo del 50% de tu meta (${money.format(twIncome)} de ${money.format(weeklyGoal)})` });
    if (twContacts < 3)              alerts.push({ tone: "orange", msg: `Solo ${twContacts} contactos esta semana. Apunta a 5+ para mantener el pipeline activo.` });
    const hotLeads = clients.filter(c => c.status === "Lead caliente").length;
    if (hotLeads >= 3)               alerts.push({ tone: "green",  msg: `🔥 Tienes ${hotLeads} leads calientes esperando seguimiento.`, action: "clients" });

    // Insights automáticos
    const autoInsights = [];
    const incomeByDay = {};
    twMovs.filter(m => m.type === "income").forEach(m => {
      const d = (parseDateValue(m.date || m.createdAt) || new Date()).toLocaleDateString("es", { weekday: "long" });
      incomeByDay[d] = (incomeByDay[d] || 0) + m.amount;
    });
    const bestDay = Object.entries(incomeByDay).sort((a,b) => b[1]-a[1])[0];
    if (bestDay) autoInsights.push(`Mejor día esta semana: ${bestDay[0]} con ${money.format(bestDay[1])}.`);
    const srcCounts = clients.reduce((acc,c) => { const s = c.source||"Sin fuente"; acc[s]=(acc[s]||0)+1; return acc; }, {});
    const topSrc = Object.entries(srcCounts).sort((a,b)=>b[1]-a[1])[0];
    if (topSrc) autoInsights.push(`Tu fuente top de clientes: ${topSrc[0]} (${topSrc[1]} ${topSrc[1]===1?"cliente":"clientes"}).`);

    // Fuentes de ingreso simplificadas — conectadas via category (antes desconectado por classification)
    const incomeBySource = incomeSources.map(src => {
      const actual = movements.filter(m => m.type==="income" && m.category===src.name).reduce((s,m)=>s+m.amount,0);
      const progress = src.monthlyGoal > 0 ? Math.min(Math.round((actual/src.monthlyGoal)*100),100) : 0;
      return { ...src, actual, progress };
    });

    // Meta de ventas
    const salesGoalProgress = salesGoal > 0 ? Math.min(Math.round((wonSalesTotal/salesGoal)*100),100) : 0;

    // Racha de registro — días consecutivos con al menos un movimiento
    const streakDays = (() => {
      const datesWithMovs = new Set(movements.map(m => inputDateFromValue(m.date || m.createdAt)));
      let count = 0;
      const d = new Date(); d.setHours(0,0,0,0);
      while (datesWithMovs.has(d.toISOString().slice(0,10))) { count++; d.setDate(d.getDate()-1); }
      return count;
    })();

    // Gastos por categoría — "En qué se va el dinero"
    const expensesByCategory = {};
    movements.filter(m => m.type==="expense").forEach(m => { const c=m.category||"Sin categoría"; expensesByCategory[c]=(expensesByCategory[c]||0)+m.amount; });
    const topExpenseCategories = Object.entries(expensesByCategory).sort((a,b)=>b[1]-a[1]).slice(0,5);

    const inp = { border:"1px solid var(--line)", borderRadius:"8px", padding:"8px 12px", fontSize:"14px", fontFamily:"inherit", outline:"none", background:"#fff", width:"100%" };
    const TABS_BIZ = ["Esta semana", "Tareas", "Historial"];
    const sortedBizTasks = [...tasks].sort((a, b) => (a.done === b.done ? taskUrgencyScore(b) - taskUrgencyScore(a) : a.done ? 1 : -1));
    const pendingBizTasksCount = tasks.filter(t => !t.done).length;

    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Mi Negocio 💼</h2>
          <p style={{color:healthColor,fontWeight:700}}>{healthLabel}</p>
        </div>

        {/* Sub-tab nav */}
        <div style={{display:"flex",gap:"4px",background:"var(--line)",padding:"4px",borderRadius:"12px",marginBottom:"20px"}}>
          {TABS_BIZ.map((label,i) => (
            <button key={i} type="button" onClick={() => setBusinessTab(i)} style={{
              flex:1, padding:"9px 0", borderRadius:"8px", border:"none",
              background: businessTab===i ? "#fff" : "transparent",
              cursor:"pointer", fontFamily:"inherit", fontSize:"13px",
              fontWeight: businessTab===i ? 700 : 400,
              color: businessTab===i ? "var(--ink)" : "var(--muted)",
              boxShadow: businessTab===i ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition:"all 0.15s ease",
            }}>{label}</button>
          ))}
        </div>

        {/* ── ESTA SEMANA ── */}
        {businessTab === 0 && (
          <>
            {/* 1. Resumen del mes — compacto, lo más importante primero */}
            <div className="biz-month-summary">
              <div className="biz-month-stat">
                <span className="biz-stat-label">Entradas del mes</span>
                <strong className="biz-stat-val biz-stat-green">{money.format(totals.income)}</strong>
                {(salesGoal > 0 || monthlyGoal > 0) && (
                  <div className="biz-meta-mini">
                    <div className="biz-meta-bar">
                      <div className="biz-meta-fill" style={{width:`${salesGoalProgress}%`}} />
                    </div>
                    <span className="biz-meta-pct">{salesGoalProgress}% de tu meta</span>
                  </div>
                )}
              </div>
              <div className="biz-month-divider" />
              <div className="biz-month-stat">
                <span className="biz-stat-label">Salidas del mes</span>
                <strong className="biz-stat-val" style={{color:"#C4526A"}}>{money.format(totals.expenses)}</strong>
              </div>
              <div className="biz-month-divider" />
              <div className="biz-month-stat">
                <span className="biz-stat-label">Lo que ganaste</span>
                <strong className="biz-stat-val" style={{color:totals.profit>=0?"#1D9E75":"#C4526A"}}>{money.format(totals.profit)}</strong>
              </div>
            </div>

            {/* 2. Registrar — botón, el form vive en popup */}
            <div className="biz-register-row">
              <button type="button" className="fin-add-btn" onClick={() => setShowMovementModal(true)}>
                + Registrar movimiento
              </button>
              {streakDays > 0 && (
                <span className="biz-streak-badge">🔥 {streakDays} día{streakDays>1?"s":""} seguidos registrando</span>
              )}
            </div>

            {/* 3. Mis fuentes de ingreso — rediseñadas */}
            <div className="biz-sources-card">
              <div className="biz-sources-head">
                <div>
                  <p className="biz-sources-title">Mis fuentes de ingreso</p>
                  <p className="biz-sources-sub">¿Cuánto llevo por cada una este mes?</p>
                </div>
              </div>

              {incomeBySource.length === 0 && (
                <p style={{fontSize:"13px",color:"var(--muted)",margin:"8px 0 14px"}}>Agrega tus fuentes para ver el progreso de cada una.</p>
              )}

              {incomeBySource.map(src => {
                const barColor = src.progress >= 75 ? "#1D9E75" : src.progress >= 25 ? "#e87b1e" : "#C4526A";
                const isEditing = editingSourceId === src.id;
                return (
                  <div key={src.id} className="biz-source-row">
                    <div className="biz-source-top">
                      <span className="biz-source-name">{src.name}</span>
                      <div className="biz-source-actions">
                        <span className="biz-source-amount">{money.format(src.actual)}</span>
                        <button type="button" className="biz-source-edit-btn"
                          onClick={() => setEditingSourceId(isEditing ? null : src.id)}
                          title="Editar meta">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </button>
                        <button type="button" className="biz-source-del-btn"
                          onClick={() => confirmDelete("¿Eliminar esta fuente?", () => setIncomeSources(c => c.filter(s => s.id !== src.id)))}>×</button>
                      </div>
                    </div>
                    <div className="biz-source-bar-wrap">
                      <div className="biz-source-bar">
                        <div className="biz-source-fill" style={{width:`${src.progress}%`, background:barColor}} />
                      </div>
                      <span className="biz-source-pct" style={{color:barColor}}>{src.progress}%</span>
                    </div>
                    {isEditing ? (
                      <div className="biz-source-edit-row">
                        <span className="biz-source-edit-label">Meta mensual:</span>
                        <input type="text" inputMode="decimal" className="biz-source-edit-input"
                          defaultValue={src.monthlyGoal ? Number(src.monthlyGoal).toLocaleString("en-US") : ""}
                          onBlur={e => { const num = Number(e.target.value.replace(/[^0-9.]/g, "")) || 0; setIncomeSources(c => c.map(s => s.id === src.id ? {...s, monthlyGoal: num} : s)); setEditingSourceId(null); }}
                          onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingSourceId(null); }}
                          autoFocus />
                        <span className="biz-source-edit-hint">↵ para guardar</span>
                      </div>
                    ) : (
                      <p className="biz-source-goal-text">Meta: {src.monthlyGoal > 0 ? money.format(src.monthlyGoal) : <span style={{color:"var(--muted)"}}>sin meta — toca editar para agregar</span>}</p>
                    )}
                  </div>
                );
              })}

              {/* Añadir fuente */}
              {showAddSource ? (
                <form className="biz-add-source-form" onSubmit={e => {
                  e.preventDefault();
                  if (!incomeSourceForm.name.trim()) return;
                  setIncomeSources(c => [...c, { id: Date.now(), name: incomeSourceForm.name.trim(), monthlyGoal: Number(incomeSourceForm.monthlyGoal) || 0, color: "purple", platform: "Transferencia bancaria" }]);
                  setIncomeSourceForm({ name: "", monthlyGoal: "" });
                  setShowAddSource(false);
                }}>
                  <input className="biz-add-source-input" placeholder="Nombre de la fuente (ej: Servicios 1:1)"
                    value={incomeSourceForm.name} onChange={e => setIncomeSourceForm(c => ({...c, name: e.target.value}))} autoFocus />
                  <MoneyAmountInput className="biz-add-source-input" placeholder="Meta mensual (opcional)"
                    value={incomeSourceForm.monthlyGoal} onChange={v => setIncomeSourceForm(c => ({...c, monthlyGoal: v}))} />
                  <div className="biz-add-source-btns">
                    <button className="primary-button" type="submit">Guardar fuente</button>
                    <button type="button" className="ck-cancel-btn" onClick={() => { setShowAddSource(false); setIncomeSourceForm({ name: "", monthlyGoal: "" }); }}>Cancelar</button>
                  </div>
                </form>
              ) : (
                <button type="button" className="biz-add-source-btn" onClick={() => setShowAddSource(true)}>
                  + Añadir fuente de ingreso
                </button>
              )}
            </div>

            {/* 3b. En qué se va el dinero */}
            {topExpenseCategories.length > 0 && (
              <div className="biz-sources-card">
                <p className="biz-sources-title">En qué se va el dinero</p>
                <p className="biz-sources-sub" style={{marginBottom:"14px"}}>Tus gastos del negocio por categoría.</p>
                {topExpenseCategories.map(([cat, amt]) => {
                  const pct = totals.expenses > 0 ? Math.round((amt/totals.expenses)*100) : 0;
                  return (
                    <div key={cat} style={{marginBottom:"10px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                        <span style={{fontSize:"13px",color:"var(--ink)"}}>{cat}</span>
                        <span style={{fontSize:"13px",fontWeight:700,color:"var(--muted)"}}>{money.format(amt)} · {pct}%</span>
                      </div>
                      <div className="biz-source-bar">
                        <div className="biz-source-fill" style={{width:`${pct}%`,background:"#C4526A"}} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. Esta semana — resumen compacto */}
            <div className="biz-week-summary">
              <p className="biz-week-title">Esta semana</p>
              <div className="biz-week-row">
                {[
                  { label: "Entradas", val: money.format(twIncome), sub: twChange !== null ? `${twChange > 0 ? "+" : ""}${twChange}% vs semana anterior` : null, color: twChange !== null ? (twChange >= 0 ? "#1D9E75" : "#C4526A") : null },
                  { label: "Ventas cerradas", val: twWon, sub: "esta semana", color: "#7F77DD" },
                  { label: "Contactos", val: twContacts, sub: twContacts >= 5 ? "¡Buen ritmo!" : twContacts >= 3 ? "Bien, sigue" : "Apunta a 5+", color: twContacts >= 5 ? "#1D9E75" : twContacts >= 3 ? "#e87b1e" : "#C4526A" },
                ].map(({ label, val, sub, color }) => (
                  <div key={label} className="biz-week-stat">
                    <span className="biz-week-label">{label}</span>
                    <strong className="biz-week-val">{val}</strong>
                    {sub && <span className="biz-week-sub" style={{color}}>{sub}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Alertas — al final, no al inicio */}
            {alerts.length > 0 && (
              <div style={{display:"grid",gap:"8px",marginTop:"4px"}}>
                {alerts.map((a, i) => (
                  <div key={i} style={{padding:"12px 16px",borderRadius:"10px",fontSize:"13px",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px",flexWrap:"wrap",
                    background:a.tone==="red"?"#fdf2f2":a.tone==="orange"?"#fff8f0":"#f0fdf7",
                    color:a.tone==="red"?"#b91c1c":a.tone==="orange"?"#c2410c":"#065f46",
                    border:`1px solid ${a.tone==="red"?"rgba(185,28,28,0.2)":a.tone==="orange"?"rgba(194,65,12,0.2)":"rgba(6,95,70,0.2)"}`}}>
                    <span>{a.msg}</span>
                    {a.action && (
                      <button type="button" onClick={() => setActiveView(a.action)}
                        style={{flexShrink:0,padding:"5px 12px",borderRadius:"20px",border:"none",background:"rgba(0,0,0,0.08)",color:"inherit",cursor:"pointer",fontFamily:"inherit",fontSize:"12px",fontWeight:700,whiteSpace:"nowrap"}}>
                        Ir a Clientes →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAREAS ── */}
        {businessTab === 1 && (
          <>
            <div className="card" style={{marginBottom:"16px"}}>
              <h3 style={{margin:"0 0 4px"}}>Nueva acción</h3>
              <p className="helper-copy" style={{margin:"0 0 12px"}}>Asigna prioridad y fecha límite para saber qué es realmente importante.</p>
              <form onSubmit={addTask} style={{display:"grid",gap:"8px",gridTemplateColumns:"1fr",maxWidth:"480px"}}>
                <input placeholder="¿Qué necesitas hacer?" value={taskForm.text}
                  onChange={e => updateTaskForm("text", e.target.value)}
                  style={{minHeight:"40px",border:"1px solid var(--line)",borderRadius:"8px",padding:"0 12px",font:"inherit",background:"#FAF7F5"}} />
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                  <select value={taskForm.priority} onChange={e => updateTaskForm("priority", e.target.value)}
                    style={{minHeight:"40px",border:"1px solid var(--line)",borderRadius:"8px",padding:"0 10px",font:"inherit",background:"#FAF7F5"}}>
                    <option>Normal</option><option>Importante</option><option>Sin afán</option>
                  </select>
                  <input type="date" value={taskForm.dueDate} onChange={e => updateTaskForm("dueDate", e.target.value)}
                    style={{minHeight:"40px",border:"1px solid var(--line)",borderRadius:"8px",padding:"0 10px",font:"inherit",background:"#FAF7F5"}} />
                </div>
                <input type="number" min="0" step="5" placeholder={`Duración estimada en min (auto: ${DEFAULT_BIZ_TASK_DURATION})`}
                  value={taskForm.duration} onChange={e => updateTaskForm("duration", e.target.value)}
                  style={{minHeight:"40px",border:"1px solid var(--line)",borderRadius:"8px",padding:"0 12px",font:"inherit",background:"#FAF7F5"}} />
                <button className="primary-button" type="submit" style={{minHeight:"40px"}}>+ Agregar acción</button>
              </form>
            </div>

            <div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                <h3 style={{margin:0}}>Tus acciones</h3>
                <span style={{fontSize:"12px",color:"var(--muted)"}}>{pendingBizTasksCount} pendiente{pendingBizTasksCount===1?"":"s"}</span>
              </div>
              {sortedBizTasks.length === 0 && <p className="helper-copy">Agrega tu primera acción de negocio.</p>}
              {sortedBizTasks.map(task => {
                const days = task.dueDate ? Math.floor((timestampFromInputDate(task.dueDate) - Date.now()) / 86400000) : null;
                const dueColor = days === null ? "var(--muted)" : days < 0 ? "#C4526A" : days === 0 ? "#e87b1e" : "var(--muted)";
                const dueLabel = days === null ? null : days < 0 ? `Vencida hace ${Math.abs(days)}d` : days === 0 ? "Hoy" : days === 1 ? "Mañana" : `En ${days}d`;
                return (
                  <div key={task.id} className="home-task-row">
                    <input type="checkbox" className="check-sm" checked={task.done} onChange={() => toggleTask(task.id)} style={{accentColor:"var(--purple)",flexShrink:0}} />
                    <div style={{flex:1,minWidth:0}}>
                      <strong style={{fontSize:"14px",textDecoration:task.done?"line-through":"none",color:task.done?"var(--muted)":"var(--ink)"}}>{task.text}</strong>
                      <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"2px"}}>
                        {task.priority === "Importante" && <small style={{color:"#C4526A",fontWeight:700}}>⭐ Importante</small>}
                        {dueLabel && <small style={{color:dueColor,fontWeight:600}}>{dueLabel}</small>}
                      </div>
                    </div>
                    <button type="button" onClick={() => confirmDelete("¿Eliminar esta acción?", () => deleteTask(task.id))}
                      style={{border:"none",background:"none",color:"var(--muted)",cursor:"pointer",fontSize:"16px",flexShrink:0}}>×</button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── HISTORIAL ── */}
        {businessTab === 2 && (
          <>
            <div style={{display:"flex",gap:"10px",marginBottom:"16px",justifyContent:"flex-end"}}>
              <button type="button" onClick={exportMovementsToExcel}
                style={{padding:"8px 18px",border:"1px solid var(--line)",background:"#fff",borderRadius:"8px",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",fontWeight:700}}>
                📊 Excel
              </button>
              <button type="button" onClick={exportMovementsToPdf}
                style={{padding:"8px 18px",border:"1px solid var(--line)",background:"#fff",borderRadius:"8px",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",fontWeight:700}}>
                📄 PDF
              </button>
            </div>
            <div className="card movement-card">
              <h3 style={{marginBottom:"14px"}}>Todos los movimientos</h3>
              {sortedMovements.length === 0 && <p style={{color:"var(--muted)",fontSize:"14px"}}>Sin movimientos registrados aún.</p>}
              {sortedMovements.map(m => (
                <div className="movement-row" key={m.id}>
                  <span className={m.type}>{m.type==="income"?"+":"-"}</span>
                  <div>
                    <strong>{m.description}</strong>
                    <small>{m.classification} · {m.category} · {m.bank||"Sin banco"}</small>
                    <small>Fecha: {formatShortDate(m.date||m.createdAt)}</small>
                  </div>
                  <input className="movement-date-input" type="date" value={inputDateFromValue(m.date||m.createdAt)}
                    onChange={e=>updateMovementDate(m.id,e.target.value)} aria-label={`Fecha de ${m.description}`} />
                  <b>{money.format(m.amount)}</b>
                  <button className="row-delete" type="button"
                    onClick={()=>confirmDelete("¿Eliminar este movimiento?",()=>setMovements(c=>c.filter(i=>i.id!==m.id)))}>×</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Modal: Registrar movimiento ── */}
        {showMovementModal && (
          <div className="app-modal-backdrop" onClick={e => e.target===e.currentTarget && setShowMovementModal(false)}>
            <div className="app-modal-card" style={{width:"min(460px,100%)"}}>
              <div className="app-modal-head">
                <div>
                  <p className="app-modal-head-eyebrow">Mi Negocio</p>
                  <p className="app-modal-head-title">Registrar movimiento</p>
                </div>
                <button type="button" className="app-modal-close" onClick={() => setShowMovementModal(false)}>✕</button>
              </div>
              <div style={{padding:"4px 0"}}>
                {MovementForm()}
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }
  function renderClients() {
    const stages = ["Lead frio", "Lead tibio", "Lead caliente", "Venta ganada"];
    const alertDays = { "Lead frio": [7, 14], "Lead tibio": [3, 7], "Lead caliente": [1, 3], "Venta ganada": [14, 30] };
    const today = Date.now();
    const daysSince = (ts) => ts ? Math.floor((today - ts) / 86400000) : 999;
    const getAlert = (client) => {
      const days = daysSince(client.lastContact);
      const [warn, danger] = alertDays[client.status] || [7, 14];
      if (days >= danger) return "red";
      if (days >= warn) return "yellow";
      return "green";
    };
    const urgentClients = clients.filter((c) => getAlert(c) !== "green" && c.status !== "Venta ganada");
    const urgentSubscriptions = clients.filter((c) => getAlert(c) !== "green" && c.status === "Venta ganada");
    const stageTotal = (stage) => clients.filter((c) => c.status === stage).reduce((sum, c) => sum + (c.amount || 0), 0);
    const paidClients = clients.filter((c) => c.status === "Venta ganada");
    const pipelineTotal = clients.filter((c) => c.status !== "Venta ganada").reduce((sum, c) => sum + (c.amount || 0), 0);
    const priorityClient = [...clients].filter((c) => c.status !== "Venta ganada").sort((a, b) => {
      const stageScore = { "Lead caliente": 3, "Lead tibio": 2, "Lead frio": 1 };
      return ((stageScore[b.status] || 0) * 100 + daysSince(b.lastContact)) - ((stageScore[a.status] || 0) * 100 + daysSince(a.lastContact));
    })[0];
    const totalLeads = clients.length;
    const totalWon = clients.filter((c) => c.status === "Venta ganada").length;
    const conversionRate = totalLeads > 0 ? Math.round((totalWon / totalLeads) * 100) : 0;
    const closedWithDates = clients.filter((c) => c.status === "Venta ganada" && c.createdAt && c.lastContact);
    const avgCloseDays = closedWithDates.length > 0
      ? Math.round(closedWithDates.reduce((sum, c) => sum + Math.floor((c.lastContact - c.createdAt) / 86400000), 0) / closedWithDates.length)
      : null;
    const sourceCounts = clients.reduce((acc, c) => { const src = c.source || "Sin fuente"; acc[src] = (acc[src] || 0) + 1; return acc; }, {});
    const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0];
    const defaultSources = ["Instagram", "Referido", "Contenido / Reel", "WhatsApp", "TikTok", "Email", "Otra"];
    const filteredClients = (stage) => clients.filter((c) => c.status === stage && (clientSearch === "" || c.name.toLowerCase().includes(clientSearch.toLowerCase())));

    const waMsg = (client) => {
      const msgs = {
        "Lead frio": `Hola ${client.name}! Noo queria dejar nuestra conversacion en el aire. Aqui estoy para retomarla cuando sea un buen momento para ti. Sigues interesada en ${client.service}?`,
        "Lead tibio": `Hola ${client.name}! Pense en ti hoy. No queria que nuestra conversacion quedara pendiente. Que ha sido lo que te ha frenado para dar el siguiente paso?`,
        "Lead caliente": `Hola ${client.name}! Queria retomar lo que conversamos sobre ${client.service}. Tienes 5 minutos hoy para que te cuente como podemos empezar?`,
        "Venta ganada": `Hola ${client.name}! Solo queria saber como vas con ${client.service}. Que resultado has notado hasta ahora?`
      };
      return encodeURIComponent(msgs[client.status] || `Hola ${client.name}, queria hacer seguimiento sobre ${client.service}.`);
    };

    const waLink = (client) => {
      const msg = waMsg(client);
      return client.phone ? `https://wa.me/${client.phone.replace(/\D/g,"")}?text=${msg}` : `https://wa.me/?text=${msg}`;
    };

    const pipelineStages = stages.filter(s => s !== "Venta ganada");
    const stageEmoji = { "Lead frio": "🧊", "Lead tibio": "🌡️", "Lead caliente": "🔥" };

    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Clientes</h2>
          <p>{activeClients} activas · {money.format(wonSalesTotal)} cerrados</p>
        </div>

        {/* 3 KPIs clave */}
        <div className="cl-kpi-row">
          <div className="cl-kpi">
            <span>En proceso</span>
            <strong>{activeClients}</strong>
            <small>{money.format(pipelineTotal)} potencial</small>
          </div>
          <div className="cl-kpi cl-kpi-divider">
            <span>Conversión</span>
            <strong>{conversionRate}%</strong>
            <small>{totalWon} cerradas de {totalLeads}</small>
          </div>
          <div className="cl-kpi cl-kpi-divider">
            <span>Ventas cerradas</span>
            <strong style={{color:"#1D9E75"}}>{money.format(wonSalesTotal)}</strong>
            <small>{paidClients.length} clientes</small>
          </div>
        </div>

        {/* Acción del día */}
        {priorityClient && (
          <div className="action-day-banner">
            <div className="action-day-left">
              <span className="action-day-label">Acción del día</span>
              <strong>{priorityClient.name}</strong>
              <span>{priorityClient.status} · {money.format(priorityClient.amount)} · hace {daysSince(priorityClient.lastContact)} días sin contacto</span>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"8px"}}>
                <button type="button" className="contact-today-btn" style={{width:"auto",padding:"0 14px"}} onClick={() => logContact(priorityClient.id, priorityClient.name)}>✓ Contacté hoy</button>
                <a href={waLink(priorityClient)} target="_blank" rel="noreferrer" className="cl-wa-btn">WhatsApp</a>
              </div>
            </div>
            <div className="action-day-right">
              <p>{priorityClient.nextAction || "Hacer seguimiento"}</p>
              <div style={{marginTop:"8px",textAlign:"center"}}>
                <strong style={{fontSize:"28px",color:"var(--green)",display:"block",lineHeight:1}}>{contactsThisWeek}</strong>
                <small style={{color:"var(--muted)",fontSize:"11px",textTransform:"uppercase",fontWeight:800}}>contactos esta semana</small>
                <small style={{color:"var(--green)",fontSize:"11px",fontWeight:700}}>{contactsThisWeek >= 5 ? "¡Excelente ritmo!" : contactsThisWeek >= 3 ? "Buen avance" : "Meta: 5 esta semana"}</small>
              </div>
            </div>
          </div>
        )}

        {/* Alertas */}
        {(urgentClients.length > 0 || urgentSubscriptions.length > 0) && (
          <div className="client-alerts">
            {urgentClients.length > 0 && (
              <div className="alert-banner alert-orange">
                <strong>{urgentClients.length} lead{urgentClients.length > 1 ? "s" : ""} sin contacto:</strong>{" "}
                {urgentClients.slice(0,3).map(c=>c.name).join(", ")}{urgentClients.length > 3 ? ` y ${urgentClients.length-3} más` : ""} — actúa hoy.
              </div>
            )}
            {urgentSubscriptions.length > 0 && (
              <div className="alert-banner alert-red">
                <strong>{urgentSubscriptions.length} cliente{urgentSubscriptions.length > 1 ? "s" : ""} sin seguimiento:</strong>{" "}
                {urgentSubscriptions.slice(0,3).map(c=>c.name).join(", ")}{urgentSubscriptions.length > 3 ? ` y ${urgentSubscriptions.length-3} más` : ""}
              </div>
            )}
          </div>
        )}

        {/* Layout: formulario + pipeline */}
        <div className="clients-main-layout">

          {/* Formulario simplificado */}
          <form className="card clients-form-card" onSubmit={addClient}>
            <h3>Nuevo cliente</h3>
            {clients.length >= currentLimits.clients && (
              <div className="plan-limit-banner">
                ⚠️ Llegaste al límite de <strong>{currentLimits.clients} clientes</strong> de tu plan.{" "}
                <button type="button" className="plan-limit-link" onClick={() => setActiveView("pricing")}>Ver planes →</button>
              </div>
            )}

            {/* Nombre */}
            <input placeholder="Nombre *" value={clientForm.name} onChange={(e) => updateClientForm("name", e.target.value)}
              className={clientFormErrors.name ? "input-error" : ""} />
            {clientFormErrors.name && <span className="field-error">{clientFormErrors.name}</span>}

            {/* Servicio */}
            <input placeholder="Servicio o producto *" value={clientForm.service} onChange={(e) => updateClientForm("service", e.target.value)}
              className={clientFormErrors.service ? "input-error" : ""} />
            {clientFormErrors.service && <span className="field-error">{clientFormErrors.service}</span>}

            {/* Monto */}
            <MoneyAmountInput placeholder="Monto *" value={clientForm.amount} onChange={(v) => updateClientForm("amount", v)}
              className={clientFormErrors.amount ? "input-error" : ""} />
            {clientFormErrors.amount && <span className="field-error">{clientFormErrors.amount}</span>}

            {/* Teléfono — visible por defecto para que el botón de WhatsApp funcione */}
            <input placeholder="Teléfono WhatsApp (ej: 573001234567)" value={clientForm.phone} onChange={(e) => updateClientForm("phone", e.target.value)} />

            {/* Estado — chips visuales */}
            <div>
              <p className="cl-form-label">Estado</p>
              <div className="cl-status-chips">
                {stages.map(s => (
                  <button type="button" key={s}
                    className={`cl-status-chip${clientForm.status === s ? " active" : ""}`}
                    onClick={() => updateClientForm("status", s)}>
                    {stageEmoji[s] || "✓"} {s.replace("Lead ", "")}
                  </button>
                ))}
              </div>
            </div>

            {/* Más detalles — colapsable */}
            <button type="button" className="cl-details-toggle" onClick={() => setShowClientDetails(v => !v)}>
              {showClientDetails ? "▲ Menos detalles" : "▼ Agregar detalles (fuente, próxima acción)"}
            </button>

            {showClientDetails && (
              <>
                <input placeholder="Próxima acción (opcional)" value={clientForm.nextAction} onChange={(e) => updateClientForm("nextAction", e.target.value)} />
                <select value={clientForm.source} onChange={(e) => updateClientForm("source", e.target.value)}>
                  <option value="">¿De dónde llegó?</option>
                  {defaultSources.map((s) => <option key={s}>{s}</option>)}
                </select>
                {clientForm.source === "Otra" && (
                  <input placeholder="¿Cuál fuente?" value={clientForm.customSource} onChange={(e) => updateClientForm("customSource", e.target.value)} />
                )}
                <label className="inline-date-field">
                  <span>Último contacto</span>
                  <input type="date" value={clientForm.lastContactDate} onChange={(e) => updateClientForm("lastContactDate", e.target.value)} />
                </label>
              </>
            )}

            <button className="primary-button" type="submit">Guardar cliente</button>
          </form>

          {/* Pipeline — solo 3 columnas (sin "Venta ganada") */}
          <div className="clients-pipeline-wrap">
            <div className="clients-search-bar">
              <input placeholder="Buscar por nombre..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="clients-search-input" />
            </div>
            <div className="pipeline-board">
              {pipelineStages.map((stage) => (
                <div className="pipeline-column" key={stage}>
                  <div className="pipeline-col-header">
                    <h3>{stageEmoji[stage]} {stage.replace("Lead ", "")}</h3>
                    <small>{filteredClients(stage).length} · {money.format(stageTotal(stage))}</small>
                  </div>
                  {filteredClients(stage).map((client) => {
                    const alert = getAlert(client);
                    const days = daysSince(client.lastContact);
                    const daysColor = days > 7 ? "#C4526A" : days > 3 ? "#e87b1e" : "#1D9E75";
                    return (
                      <div className={`lead-card lead-alert-${alert}`} key={client.id}>
                        <div className="lead-card-top">
                          <strong>{client.name}</strong>
                          <span className="cl-amount-chip">{money.format(client.amount)}</span>
                        </div>
                        <p className="cl-service-text">{client.service}</p>
                        {client.nextAction && <p className="cl-next-action">→ {client.nextAction}</p>}
                        <div className="cl-days-row">
                          <span className="cl-days-badge" style={{color:daysColor,background:daysColor+"18"}}>
                            {client.lastContact ? `Hace ${days} día${days !== 1 ? "s" : ""}` : "Sin contacto"}
                          </span>
                        </div>
                        <div className="cl-card-actions">
                          <button type="button" className="contact-today-btn" style={{flex:1}} onClick={() => logContact(client.id, client.name)}>✓ Contacté</button>
                          <a href={waLink(client)} target="_blank" rel="noreferrer" className="cl-wa-btn">WA</a>
                        </div>
                        <div className="lead-stage-btns">
                          {pipelineStages.filter(s => s !== stage).map(s => (
                            <button type="button" key={s} onClick={() => moveClientStatus(client.id, s)}>{stageEmoji[s]} {s.replace("Lead ","")}</button>
                          ))}
                          <button type="button" className="cl-close-btn" onClick={() => moveClientStatus(client.id, "Venta ganada")}>✓ Cerré</button>
                          <button type="button" className="delete-btn" onClick={() => confirmDelete("¿Eliminar este cliente?", () => setClients(c => c.filter(cl => cl.id !== client.id)))}>×</button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredClients(stage).length === 0 && (
                    <p className="cl-empty-col">Sin clientes aquí</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Clientes que ya pagaron */}
        <div className="paid-clients-section card">
          <div className="section-title compact-title">
            <h2>Clientes que ya pagaron</h2>
            <p>Cuida la relación, fomenta la recompra y los referidos.</p>
          </div>
          {paidClients.length === 0 && <p className="helper-copy">Tus ventas cerradas aparecerán aquí.</p>}
          <div className="paid-client-grid">
            {paidClients.map((client) => {
              const days = daysSince(client.lastContact);
              const daysColor = days > 30 ? "#C4526A" : days > 14 ? "#e87b1e" : "#1D9E75";
              return (
                <article className="paid-client-card" key={client.id}>
                  <div className="paid-client-header">
                    <div>
                      <strong>{client.name}</strong>
                      <small>{client.service} · {money.format(client.amount)}</small>
                    </div>
                    <span className="cl-days-badge" style={{color:daysColor,background:daysColor+"18",fontSize:"11px"}}>
                      {client.lastContact ? `Hace ${days}d` : "Sin contacto"}
                    </span>
                  </div>
                  <div style={{display:"flex",gap:"6px"}}>
                    <button type="button" className="contact-today-btn" style={{flex:1}} onClick={() => logContact(client.id, client.name)}>✓ Contacté hoy</button>
                    <a href={waLink(client)} target="_blank" rel="noreferrer" className="cl-wa-btn">WA</a>
                  </div>
                  <textarea placeholder="Notas: entrega, resultados, próxima recompra…" value={client.notes || ""} onChange={(e) => updateClientNotes(client.id, e.target.value)} />
                </article>
              );
            })}
          </div>
        </div>
      </section>
    );
  }
  function renderContent() {
    const unpublished = contentItems.filter((i) => i.status !== "Publicado").length;
    const byNetwork = contentItems.reduce((acc, i) => { acc[i.network] = (acc[i.network] || 0) + 1; return acc; }, {});
    const topNetwork = Object.entries(byNetwork).sort((a, b) => b[1] - a[1])[0];
    const lastPublished = contentItems.filter((i) => i.status === "Publicado" && i.createdAt).sort((a, b) => b.createdAt - a.createdAt)[0];
    const daysSincePublish = lastPublished ? Math.floor((Date.now() - lastPublished.createdAt) / 86400000) : null;
    const oldPending = contentItems.filter((i) => i.status === "Pendiente" && i.createdAt && Math.floor((Date.now() - i.createdAt) / 86400000) > 7);

    const goalMeta = {
      "Vender":     { color: "#2f9f70", dot: "#2f9f70" },
      "Educar":     { color: "#C9A96E", dot: "#C9A96E" },
      "Conectar":   { color: "#E8836E", dot: "#E8836E" },
      "Entretener": { color: "#8a7f7a", dot: "#8a7f7a" },
    };
    const formatIcon  = { "Reel":"🎬","Historia":"📸","Post":"🖼️","Carrusel":"📱","Foto":"📷","Articulo":"✍️","Episodio":"🎙️" };
    const networkIcon = { "Instagram":"✦","TikTok":"♪","YouTube":"▶","Spotify":"🎵","Website":"🌐" };
    const statusMeta  = {
      "Pendiente":  { dot: "#C4526A",  label: "Pendiente" },
      "En proceso": { dot: "#E8836E",  label: "En proceso" },
      "Publicado":  { dot: "#2f9f70",  label: "Publicado" },
    };

    const COLUMNAS = [
      { status: "Pendiente",  label: "Pendiente",   icon: "📋", color: "#C4526A", bg: "#FFF0F3",  hint: "Ideas y piezas por crear" },
      { status: "En proceso", label: "En proceso",  icon: "⚙️",  color: "#E8836E", bg: "#FDF0EC",  hint: "Grabando, editando o programado" },
      { status: "Publicado",  label: "Publicado",   icon: "✅", color: "#2f9f70", bg: "#def3e8",  hint: "Ya salió al mundo" },
    ];

    const filteredItems = contentFilter
      ? contentItems.filter((i) => i.network === contentFilter)
      : contentItems;

    return (
      <section className="panel workspace-panel">

        {/* Header */}
        <div className="ck-header">
          <div className="ck-header-left">
            <h2>Mi Contenido</h2>
            <p>{publishedContent} publicadas · {unpublished} en pipeline · {contentItems.length} total</p>
          </div>
          <div className="ck-header-actions">
            <select value={contentFilter} onChange={(e) => setContentFilter(e.target.value)} className="ck-filter-select">
              <option value="">Todas las redes</option>
              <option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Spotify</option><option>Website</option>
            </select>
            <button className="ck-add-btn" onClick={() => setShowContentForm((v) => !v)}>
              {showContentForm ? "✕ Cancelar" : "+ Nueva pieza"}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="ck-kpi-row">
          <div className="ck-kpi">
            <span className="ck-kpi-label">Publicadas</span>
            <strong className="ck-kpi-val" style={{color:"var(--green)"}}>{publishedContent}</strong>
            <small>piezas listas</small>
          </div>
          <div className="ck-kpi">
            <span className="ck-kpi-label">En proceso</span>
            <strong className="ck-kpi-val" style={{color:"#E8836E"}}>{contentItems.filter(i=>i.status==="En proceso").length}</strong>
            <small>en producción</small>
          </div>
          <div className="ck-kpi">
            <span className="ck-kpi-label">Red top</span>
            <strong className="ck-kpi-val" style={{fontSize:"13px"}}>{topNetwork ? topNetwork[0] : "—"}</strong>
            <small>{topNetwork ? `${topNetwork[1]} piezas` : "sin datos"}</small>
          </div>
          <div className="ck-kpi">
            <span className="ck-kpi-label">Consistencia</span>
            <strong className="ck-kpi-val" style={{color: publishedContent >= 3 ? "var(--green)" : publishedContent >= 1 ? "var(--orange)" : "#C4526A"}}>
              {publishedContent >= 3 ? "Buena" : publishedContent >= 1 ? "Regular" : "Baja"}
            </strong>
            <small>{daysSincePublish !== null ? `hace ${daysSincePublish}d` : "sin publicar"}</small>
          </div>
        </div>

        {/* Alertas */}
        {(publishedContent >= 3 || (daysSincePublish !== null && daysSincePublish > 3) || contentItems.length === 0 || oldPending.length > 0) && (
          <div className="ck-alerts">
            {publishedContent >= 3 && <div className="ck-alert ck-alert--green">Excelente consistencia — llevas {publishedContent} piezas publicadas. Sigue así.</div>}
            {daysSincePublish !== null && daysSincePublish > 3 && <div className="ck-alert ck-alert--orange">Llevas {daysSincePublish} días sin publicar. Una pieza simple hoy vale más que la perfección mañana.</div>}
            {contentItems.length === 0 && <div className="ck-alert ck-alert--orange">Aún no tienes contenido registrado. Empieza con una pieza simple que venda.</div>}
            {oldPending.length > 0 && <div className="ck-alert ck-alert--red">Tienes {oldPending.length} pieza{oldPending.length > 1 ? "s" : ""} pendiente{oldPending.length > 1 ? "s" : ""} por más de 7 días. Muévelas o elimínalas.</div>}
          </div>
        )}

        {/* Formulario */}
        {showContentForm && (
          <form className="ck-form card" onSubmit={addContent}>
            <div className="ck-form-grid">
              <div className="ck-form-col">
                <label className="ck-label">Título del contenido *</label>
                <input className="ck-input" placeholder="Ej: Cómo organicé mis finanzas siendo mamá" value={contentForm.title} onChange={(e) => updateContentForm("title", e.target.value)} required />
              </div>
              <div className="ck-form-col">
                <label className="ck-label">Hook (opcional)</label>
                <input className="ck-input" placeholder="La frase que engancha en los primeros 3 segundos" value={contentForm.hook} onChange={(e) => updateContentForm("hook", e.target.value)} />
              </div>
              <div className="ck-form-col">
                <label className="ck-label">Objetivo</label>
                <select className="ck-input" value={contentForm.goal} onChange={(e) => updateContentForm("goal", e.target.value)}>
                  <option>Vender</option><option>Educar</option><option>Conectar</option><option>Entretener</option>
                </select>
              </div>
              <div className="ck-form-col">
                <label className="ck-label">Formato</label>
                <select className="ck-input" value={contentForm.format} onChange={(e) => updateContentForm("format", e.target.value)}>
                  <option>Reel</option><option>Historia</option><option>Post</option><option>Carrusel</option><option>Foto</option><option>Articulo</option><option>Episodio</option>
                </select>
              </div>
              <div className="ck-form-col">
                <label className="ck-label">Red social</label>
                <select className="ck-input" value={contentForm.network} onChange={(e) => updateContentForm("network", e.target.value)}>
                  <option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Spotify</option><option>Website</option><option>Otra</option>
                </select>
                {contentForm.network === "Otra" && <input className="ck-input" style={{marginTop:"6px"}} placeholder="¿Cuál red?" value={contentForm.customNetwork} onChange={(e) => updateContentForm("customNetwork", e.target.value)} />}
              </div>
              <div className="ck-form-col">
                <label className="ck-label">Fecha de publicación</label>
                <input className="ck-input" type="date" value={contentForm.publishDate} onChange={(e) => updateContentForm("publishDate", e.target.value)} />
              </div>
              <div className="ck-form-col">
                <label className="ck-label">Estado</label>
                <select className="ck-input" value={contentForm.status} onChange={(e) => updateContentForm("status", e.target.value)}>
                  <option>Pendiente</option><option>En proceso</option><option>Publicado</option>
                </select>
              </div>
            </div>
            <div className="ck-form-footer">
              <button className="primary-button" type="submit">Guardar pieza</button>
              <button type="button" className="ck-cancel-btn" onClick={() => setShowContentForm(false)}>Cancelar</button>
            </div>
          </form>
        )}

        {/* Kanban — 3 columnas */}
        <div className="ck-kanban">
          {COLUMNAS.map((col) => {
            const colItems = filteredItems.filter((i) => i.status === col.status);
            return (
              <div className="ck-col" key={col.status}>
                <div className="ck-col-header" style={{"--col-color": col.color, "--col-bg": col.bg}}>
                  <span className="ck-col-icon">{col.icon}</span>
                  <span className="ck-col-label">{col.label}</span>
                  <span className="ck-col-count">{colItems.length}</span>
                </div>
                <div className="ck-col-body">
                  {colItems.length === 0 && <div className="ck-empty">{col.hint}</div>}
                  {colItems.map((item) => {
                    const gm = goalMeta[item.goal] || goalMeta["Entretener"];
                    const sm = statusMeta[item.status] || statusMeta["Pendiente"];
                    const fi = formatIcon[item.format] || "🎬";
                    const ni = networkIcon[item.network] || "✦";
                    return (
                      <div className="ck-card" key={item.id} style={{"--card-accent": gm.color}}>
                        <div className="ck-card-top">
                          <div className="ck-card-badges">
                            <span className="ck-badge ck-badge--format">{fi} {item.format}</span>
                            <span className="ck-badge ck-badge--network">{ni} {item.network}</span>
                          </div>
                          <button type="button" className="ck-card-del" onClick={() => confirmDelete("¿Eliminar esta pieza?", () => setContentItems((c) => c.filter((ci) => ci.id !== item.id)))}>✕</button>
                        </div>
                        <div className="ck-card-body">
                          <div className="ck-card-goal" style={{color: gm.color}}>
                            <span className="ck-goal-dot" style={{background: gm.dot}}></span>
                            {item.goal}
                          </div>
                          <p className="ck-card-title">{item.title}</p>
                          {item.hook && <p className="ck-card-hook">"{item.hook}"</p>}
                        </div>
                        <div className="ck-card-footer">
                          <div className="ck-status-wrap">
                            <span className="ck-status-dot" style={{background: sm.dot}}></span>
                            <select className="ck-status-select" value={item.status} onChange={(e) => updateContentStatus(item.id, e.target.value)}>
                              <option>Pendiente</option><option>En proceso</option><option>Publicado</option>
                            </select>
                          </div>
                          {item.publishDate && (
                            <span className="ck-card-date">📅 {new Date(item.publishDate + "T00:00:00").toLocaleDateString("es", {day:"numeric",month:"short"})}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </section>
    );
  }
  function renderHome() {
    const todayDay   = ["D","L","M","X","J","V","S"][new Date().getDay()];
    const DAY_LABELS = [["L","Lunes"],["M","Martes"],["X","Miércoles"],["J","Jueves"],["V","Viernes"],["S","Sábado"],["D","Domingo"]];
    const homeProgress  = homeTasks.length ? Math.round((completedHomeTasks / homeTasks.length) * 100) : 0;
    const pendingCount  = homeTasks.filter(t => !t.done).length;
    const TABS = ["Hoy","Semana","Tareas","Mis Finanzas"];

    // ── Abi menu database — por país y dieta, 4 comidas por día ──
    const MD=(d,a,c,s)=>({desayuno:d,almuerzo:a,cena:c,snack:s});
    const ABI_MENU_DB = {
      colombia:{
        normal:[
          {L:MD("Arepa con huevo y café","Arroz con pollo y ensalada verde","Sopa de lentejas","Fruta picada"),M:MD("Avena con fruta","Pasta boloñesa con pan","Huevos revueltos con plátano","Yogur natural"),X:MD("Changua con pan","Sopa de lentejas y aguacate","Arroz con atún","Nueces y banano"),J:MD("Huevos fritos con arepa","Pescado al horno con papas","Crema de verduras","Mango con limón"),V:MD("Chocolate con pandebono","Pollo a la plancha con fríjoles","Mazamorra con leche","Maní tostado"),S:MD("Calentado con café","Bandeja paisa","Sancocho ligero","Helado de paila"),D:MD("Changua especial","Sancocho de gallina","Fríjoles con arroz","Brevas con arequipe")},
          {L:MD("Tostadas con queso y jugo","Fríjoles con arroz y chicharrón","Sopa de pasta","Fruta de temporada"),M:MD("Huevos perico con arepa","Carne asada con yuca y ensalada","Crema de tomate","Galletas con queso"),X:MD("Avena caliente con pan","Arroz con atún y vegetales","Huevos tibios con pan","Manzana"),J:MD("Arepas con mantequilla","Sudado de pollo con papas","Sopa de fideos","Chontaduro"),V:MD("Granola con leche","Chuletas con arroz y ensalada","Arroz con huevo","Bocadillo con queso"),S:MD("Changua con almojábanas","Arroz con pollo guisado","Lentejas rápidas","Fruta de temporada"),D:MD("Huevos con arepa y café","Estofado de res con verduras","Caldo de costilla","Arequipe con galletas")},
        ],
        vegetariano:[
          {L:MD("Avena con fruta","Arroz con vegetales salteados","Sopa de verduras","Galletas integrales"),M:MD("Tostadas con queso","Pasta primavera con queso","Crema de brócoli","Fruta"),X:MD("Jugo con pan","Sopa de verduras con pan","Huevos revueltos","Yogur"),J:MD("Granola con leche","Lentejas con arroz y plátano","Ensalada con queso","Maní"),V:MD("Avena con banano","Quesadillas de espinaca","Arroz con verduras","Fruta"),S:MD("Tostadas con aguacate","Pizza de vegetales","Sopa de tomate","Galletas"),D:MD("Huevos benedictinos","Crema de zapallo con ensalada","Pasta al pesto","Yogur con granola")},
        ],
        economico:[
          {L:MD("Arepa con café","Fríjoles con arroz y plátano","Sopa de papa","Fruta"),M:MD("Huevos con pan","Sopa de pasta con pollo","Arroz con huevo","Galletas"),X:MD("Avena","Revuelto de huevos con papa","Fríjoles","Banano"),J:MD("Pan con mantequilla","Arroz con atún","Sopa de fideos","Maní"),V:MD("Chocolate con pan","Lentejas con aguacate","Arroz con pollo","Fruta"),S:MD("Calentado","Estofado económico","Sopa de arroz","Galletas"),D:MD("Changua","Sancocho de papa","Fríjoles","Fruta de temporada")},
        ],
      },
      mexico:{
        normal:[
          {L:MD("Chilaquiles con crema y queso","Tacos de pollo con salsa verde","Sopa de lima yucateca","Fruta picada"),M:MD("Tamales con atole","Enchiladas rojas con crema","Caldo de pollo","Elote con chile"),X:MD("Pan dulce con café","Chile relleno con arroz rojo","Sopa de fideo","Mango"),J:MD("Huevos rancheros con frijoles","Pollo en mole verde","Crema de verduras","Jícama con limón"),V:MD("Quesadillas con frijoles","Tostadas de tinga de pollo","Sopa de tortilla","Fruta"),S:MD("Enfrijoladas con queso","Pozole rojo con tostadas","Tamales refritos","Cacahuates"),D:MD("Huevos a la mexicana","Caldo tlalpeño con pollo","Frijoles de olla","Fruta de temporada")},
        ],
        vegetariano:[
          {L:MD("Avena con fruta y miel","Tacos de nopales con queso","Sopa de fideo seco","Jícama"),M:MD("Pan dulce con café de olla","Enchiladas verdes de queso","Crema de chayote","Fruta"),X:MD("Tostadas con frijoles","Quesadillas de champiñones","Sopa de verduras","Pepino con limón"),J:MD("Huevos divorciados","Chiles rellenos de queso","Crema de calabaza","Maní"),V:MD("Fruta con granola","Tostadas de frijoles con aguacate","Sopa de lentejas","Fruta"),S:MD("Molletes con queso","Tamales de rajas con queso","Elote hervido","Cacahuates"),D:MD("Atole con pan","Arroz con rajas","Frijoles con queso","Fruta")},
        ],
        economico:[
          {L:MD("Tortillas con frijoles","Arroz rojo con frijoles","Sopa de pasta","Fruta"),M:MD("Pan con mantequilla","Quesadillas de frijoles","Sopa de verduras","Pepino"),X:MD("Avena","Huevos a la mexicana","Arroz rojo","Fruta"),J:MD("Tortillas con huevo","Sopa de verduras con chile","Frijoles","Limón con sal"),V:MD("Chilaquiles simples","Arroz con leche de coco","Sopa de fideos","Fruta"),S:MD("Pan con crema","Carnitas básicas con tortillas","Caldo de frijoles","Fruta"),D:MD("Atole de maíz","Caldo de pollo con verduras","Frijoles de olla","Fruta")},
        ],
      },
      argentina:{
        normal:[
          {L:MD("Tostadas con mermelada y mate","Milanesa napolitana con papas","Sopa de verduras","Fruta"),M:MD("Medialunas con café","Tallarines con estofado de carne","Ensalada mixta","Alfajor"),X:MD("Tostadas con queso y mate","Locro norteño con pan","Sopa de cebolla","Fruta"),J:MD("Huevos revueltos con pan","Empanadas de carne al horno","Crema de verduras","Nueces"),V:MD("Yogur con granola","Pollo al horno con ensalada","Fideos con manteca","Fruta"),S:MD("Huevos con pan y mate","Asado con chimichurri","Ensalada rusa","Fruta"),D:MD("Facturas con mate","Puchero de verduras y carne","Sopa de pollo","Dulce de leche con galletitas")},
        ],
        vegetariano:[
          {L:MD("Tostadas con palta y mate","Milanesa de soja con papas","Sopa de verduras","Fruta"),M:MD("Medialunas con café","Fideos con salsa de tomates","Ensalada caprese","Alfajor vegano"),X:MD("Granola con leche","Tarta de verduras al horno","Crema de zapallo","Fruta"),J:MD("Huevos revueltos con pan","Ensalada de lentejas con queso","Sopa fría de tomate","Nueces"),V:MD("Yogur con frutas","Tortilla española de papas","Fideos con pesto","Fruta"),S:MD("Tostadas con queso","Pizza de mozzarella y albahaca","Ensalada mixta","Fruta"),D:MD("Mate con bizcochos","Berenjenas a la parmesana","Sopa de lentejas","Fruta")},
        ],
        economico:[
          {L:MD("Pan con mantequilla y mate","Guiso de lentejas con pan","Sopa de verduras","Fruta"),M:MD("Tostadas con azúcar","Fideos con manteca y queso","Ensalada simple","Galletas"),X:MD("Avena con leche","Sopa de verduras","Arroz con papas","Fruta"),J:MD("Huevos duros con pan","Arroz con papas","Caldo de pollo","Fruta"),V:MD("Pan con mermelada","Tortilla de papa y cebolla","Sopa de lentejas","Galletas"),S:MD("Mate con pan","Revuelto de huevos con verduras","Fideos simples","Fruta"),D:MD("Tostadas con mate","Polenta con tuco de tomate","Sopa de pan","Fruta")},
        ],
      },
      peru:{
        normal:[
          {L:MD("Pan con mantequilla y café","Lomo saltado con arroz y papas","Sopa de menestrón","Fruta de temporada"),M:MD("Quinua con leche y canela","Ají de gallina con arroz","Caldo de gallina","Mazamorra morada"),X:MD("Pan con queso y café","Causa limeña de atún","Sopa de quinua","Fruta"),J:MD("Huevos revueltos con pan","Seco de pollo con frejoles","Crema de verduras","Choclo"),V:MD("Avena con leche","Tallarín saltado de pollo","Sopa de pollo","Fruta"),S:MD("Pan con jamón y jugo","Ceviche de pescado con choclo","Anticuchos","Mazamorra"),D:MD("Chicha morada con pan","Caldo de gallina peruano","Arroz con leche","Fruta")},
        ],
        vegetariano:[
          {L:MD("Quinua con leche","Tacu tacu de frejoles","Sopa de verduras","Fruta"),M:MD("Pan con palta","Causa de papa con palta","Crema de zapallo","Choclo"),X:MD("Avena","Sopa de fideos con huevo","Arroz con frejoles","Fruta"),J:MD("Tostadas con queso","Ensalada de quinua","Sopa de verduras","Maní"),V:MD("Granola","Papa rellena vegetariana","Caldo de verduras","Fruta"),S:MD("Pan con mantequilla","Arroz con leche y canela","Sopa de lentejas","Canchita"),D:MD("Chicha de quinua","Crema de zapallo con pan","Tacu tacu básico","Fruta")},
        ],
        economico:[
          {L:MD("Pan con café","Arroz con frejoles y plátano","Sopa de verduras","Fruta"),M:MD("Avena","Sopa de verduras con fideos","Arroz blanco","Banano"),X:MD("Pan con queso","Tallarín verde con papas","Caldo simple","Fruta"),J:MD("Huevos hervidos","Revuelto de huevos con papas","Frejoles","Fruta"),V:MD("Avena con azúcar","Guiso de arroz amarillo","Sopa de papa","Fruta"),S:MD("Pan con mermelada","Pan con palta y huevo","Sopa de verduras","Fruta"),D:MD("Arroz con leche","Caldo de verduras","Arroz simple","Fruta")},
        ],
      },
      venezuela:{
        normal:[
          {L:MD("Arepas con perico","Pabellón criollo con tajadas","Sopa de pollo venezolana","Fruta"),M:MD("Cachitos con café","Pollo guisado con arroz blanco","Caraotas negras","Papelón con limón"),X:MD("Pan de jamón con jugo","Arroz con pollo venezolano","Sopa de verduras","Fruta"),J:MD("Tequeños con café","Bistec encebollado con arroz","Caldo de pollo","Cambur"),V:MD("Arepas con queso blanco","Carne mechada con caraotas","Sopa de pasta","Fruta"),S:MD("Cachapas con queso","Hallacas con ensalada","Pernil con arroz","Bienmesabe"),D:MD("Arepas dominicales","Hervido de res con verduras","Sancocho","Fruta")},
        ],
        vegetariano:[
          {L:MD("Arepas de queso","Caraotas negras con arroz","Sopa de verduras","Fruta"),M:MD("Pan de queso con café","Bollitos de maíz con queso","Crema de auyama","Cambur"),X:MD("Tostadas con margarina","Sopa de verduras con yuca","Arroz blanco","Fruta"),J:MD("Cachapas simples","Pasta con queso crema y tomates","Sopa de lentejas","Nueces"),V:MD("Avena","Arroz con vegetales","Caraotas","Fruta"),S:MD("Cachapas con queso de mano","Pastelitos de queso","Sopa de auyama","Fruta"),D:MD("Hallaquitas de maíz","Arroz con vegetales salteados","Caraotas con plátano","Fruta")},
        ],
        economico:[
          {L:MD("Arepa con café","Arroz con caraotas y plátano","Sopa de pasta","Fruta"),M:MD("Pan con margarina","Sopa de pasta con pollo","Caraotas","Cambur"),X:MD("Avena","Arepas con queso","Arroz blanco","Fruta"),J:MD("Arepa con queso","Pasta con salsa de tomate","Caraotas","Fruta"),V:MD("Pan con margarina","Caraotas con tajadas","Sopa de verduras","Fruta"),S:MD("Cachapas simples","Arroz con huevo frito","Sopa básica","Fruta"),D:MD("Arepa con mantequilla","Sopa de verduras con arepa","Caraotas","Fruta")},
        ],
      },
      chile:{
        normal:[
          {L:MD("Tostadas con palta y café","Cazuela de vacuno con zapallo","Sopa de verduras","Fruta"),M:MD("Pan con mantequilla y té","Porotos con rienda","Ensalada chilena","Fruta"),X:MD("Huevos revueltos con pan","Pastel de choclo","Sopa de pollo","Fruta"),J:MD("Yogur con granola","Empanadas de pino al horno","Crema de verduras","Nueces"),V:MD("Avena con leche","Chorrillana con huevo","Sopa de fideos","Fruta"),S:MD("Pancakes con miel","Asado al palo con pebre","Ensalada mixta","Fruta"),D:MD("Huevos con pan y café","Caldo de vacuno con papas","Sopa de lentejas","Fruta")},
        ],
        vegetariano:[
          {L:MD("Tostadas con palta","Porotos con rienda sin carne","Sopa de verduras","Fruta"),M:MD("Yogur con granola","Cazuela de verduras","Ensalada chilena","Nueces"),X:MD("Pan con queso","Pastel de choclo vegetariano","Crema de zapallo","Fruta"),J:MD("Avena","Ensalada chilena con pan amasado","Sopa de lentejas","Fruta"),V:MD("Tostadas con mermelada","Tarta de espinaca y queso","Sopa de fideos","Fruta"),S:MD("Huevos revueltos","Pizza napolitana","Ensalada mixta","Fruta"),D:MD("Pan con mantequilla","Sopa de verduras con pan","Arroz con verduras","Fruta")},
        ],
        economico:[
          {L:MD("Pan con mantequilla","Arroz graneado con huevo frito","Sopa de pollo","Fruta"),M:MD("Avena con azúcar","Porotos granados","Ensalada","Fruta"),X:MD("Tostadas","Sopa de pollo con fideos","Arroz con verduras","Fruta"),J:MD("Pan con huevo","Guiso de arroz con verduras","Sopa simple","Fruta"),V:MD("Avena","Revuelto de papas y cebolla","Arroz con huevo","Fruta"),S:MD("Pan con palta","Pan con palta","Sopa de verduras","Fruta"),D:MD("Huevos con pan","Caldo de pollo con fideos","Arroz blanco","Fruta")},
        ],
      },
      espana:{
        normal:[
          {L:MD("Tostadas con aceite y jamón","Paella valenciana","Gazpacho andaluz","Fruta"),M:MD("Churros con chocolate","Cocido madrileño","Sopa de ajo castellana","Fruta"),X:MD("Pan con tomate y aceite","Tortilla española con pan","Crema de verduras","Fruta"),J:MD("Huevos con pan","Merluza al horno con papas","Sopa de pescado","Fruta"),V:MD("Yogur con miel","Croquetas de jamón con ensalada","Caldo de pollo","Fruta"),S:MD("Tostadas con mantequilla","Pulpo a la gallega con cachelos","Gazpacho","Fruta"),D:MD("Pan con aceite y café","Caldo gallego","Empanada gallega","Fruta")},
        ],
        vegetariano:[
          {L:MD("Tostadas con tomate y aceite","Pisto manchego con huevo","Gazpacho","Fruta"),M:MD("Magdalenas con café","Gazpacho con tostadas","Crema de verduras","Fruta"),X:MD("Pan con aceite","Tortilla española de patatas","Sopa fría de tomate","Fruta"),J:MD("Yogur con granola","Lentejas estofadas con pimentón","Crema de calabacín","Fruta"),V:MD("Tostadas con mermelada","Berenjenas rellenas de verduras","Sopa de verduras","Fruta"),S:MD("Cereales con leche","Pizza española de verduras","Ensalada mixta","Fruta"),D:MD("Pan con aceite y tomate","Crema de verduras asadas","Huevos al plato","Fruta")},
        ],
        economico:[
          {L:MD("Pan con aceite","Lentejas estofadas con pan","Sopa de verduras","Fruta"),M:MD("Tostadas con mantequilla","Sopa de ajo castellana","Arroz a la cubana","Fruta"),X:MD("Pan con tomate","Arroz a la cubana con tomate","Sopa de fideos","Fruta"),J:MD("Cereales","Tortilla de patatas y cebolla","Caldo de pollo","Fruta"),V:MD("Pan con mermelada","Pasta con tomate y orégano","Ensalada","Fruta"),S:MD("Tostadas","Pan con tomate y aceite","Sopa de lentejas","Fruta"),D:MD("Leche con galletas","Caldo de verduras con pan","Arroz blanco","Fruta")},
        ],
      },
      brasil:{
        normal:[
          {L:MD("Pão de queijo com café","Feijoada com arroz e farofa","Caldo verde","Fruta"),M:MD("Tapioca com queijo","Frango grelhado com arroz e feijão","Sopa de legumes","Açaí"),X:MD("Bolo de banana com café","Macarrão à bolonhesa","Arroz com feijão","Fruta"),J:MD("Iogurte com granola","Moqueca de peixe com arroz","Sopa de cenoura","Fruta"),V:MD("Pão com manteiga","Churrasco de frango com mandioca","Feijão tropeiro","Fruta"),S:MD("Vitamina de fruta","Picanha com arroz e farofa","Caldinho de feijão","Fruta"),D:MD("Cuscuz com ovo","Cozido brasileiro","Sopa de galinha","Fruta")},
        ],
        vegetariano:[
          {L:MD("Tapioca com queijo","Arroz com feijão e salada","Sopa de legumes","Fruta"),M:MD("Pão de queijo com café","Macarrão com molho de tomate","Creme de abóbora","Fruta"),X:MD("Aveia com fruta","Sopa de mandioca com verduras","Arroz com feijão","Fruta"),J:MD("Iogurte com granola","Quibe de aveia assado","Sopa de cenoura","Fruta"),V:MD("Vitamina verde","Empadão de legumes","Feijão simples","Fruta"),S:MD("Cuscuz com queijo","Pizza margherita","Sopa de tomate","Fruta"),D:MD("Açaí com granola","Creme de abóbora","Arroz integral","Fruta")},
        ],
        economico:[
          {L:MD("Pão com manteiga","Arroz com feijão e ovo frito","Sopa de legumes","Fruta"),M:MD("Tapioca simples","Macarrão simples com tomate","Feijão","Banana"),X:MD("Aveia com leite","Sopa de legumes","Arroz com ovo","Fruta"),J:MD("Pão com ovo","Farofa com banana","Caldo de feijão","Fruta"),V:MD("Cuscuz","Frango com batata cozida","Feijão simples","Fruta"),S:MD("Pão com margarina","Tapioca com queijo","Sopa de macarrão","Fruta"),D:MD("Mingau de aveia","Caldo de feijão com pão","Arroz simples","Fruta")},
        ],
      },
      internacional:{
        normal:[
          {L:MD("Smoothie bowl con granola","Pollo al curry con arroz basmati","Ramen de pollo japonés","Fruta"),M:MD("Tostadas con aguacate y huevo","Pasta carbonara italiana","Bowl mediterráneo con hummus","Nueces"),X:MD("Yogur griego con fruta","Salmón a la plancha con ensalada","Sopa thai de coco","Fruta"),J:MD("Granola con leche","Bowl mediterráneo con hummus","Pollo tikka masala","Fruta"),V:MD("Huevos benedictinos","Tacos mexicanos con guacamole","Sopa de tomate","Galletas"),S:MD("Pancakes con miel","Paella de mariscos","Pollo teriyaki con arroz","Fruta"),D:MD("Tostadas francesas","Estofado de res al vino tinto","Sopa de cebolla","Fruta")},
        ],
        vegetariano:[
          {L:MD("Smoothie verde con pan","Buddha bowl de quinua","Sopa de lentejas rojas","Fruta"),M:MD("Tostadas con pesto","Pasta al pesto con tomates","Crema de zanahoria","Nueces"),X:MD("Yogur con semillas","Curry de garbanzos indio","Sopa de miso","Fruta"),J:MD("Avena con fruta","Falafel con pita y tzatziki","Bowl de verduras asadas","Hummus con zanahoria"),V:MD("Granola con leche","Bowl de tofu teriyaki","Sopa de tomate","Fruta"),S:MD("Tostadas con aguacate","Pizza de vegetales","Ensalada mediterránea","Fruta"),D:MD("Pancakes de avena","Sopa de lentejas rojas","Dal de lentejas","Fruta")},
        ],
        economico:[
          {L:MD("Pan con huevo","Arroz frito con huevo estilo asiático","Sopa de verduras","Fruta"),M:MD("Avena","Pasta con salsa de tomate","Lentejas","Banana"),X:MD("Tostadas con mermelada","Sopa de verduras","Arroz con huevo","Fruta"),J:MD("Pan con mantequilla","Lentejas con arroz y especias","Caldo de verduras","Fruta"),V:MD("Cereales","Quesadillas de frijoles","Sopa de fideos","Fruta"),S:MD("Tostadas","Arroz con vegetales salteados","Sopa simple","Fruta"),D:MD("Avena caliente","Caldo vegetal con pan","Arroz blanco","Fruta")},
        ],
      },
    };
    const generateAbiMenu = () => {
      const countryDB = ABI_MENU_DB[abiMenuPrefs.pais] || ABI_MENU_DB.colombia;
      const pool = countryDB[abiMenuPrefs.dieta] || countryDB.normal;
      return pool[Math.floor(Math.random()*pool.length)];
    };

    // ── Grocery from menu ──
    const INGREDIENT_HINTS = [
      [/pollo/i,"Pollo (kg)"],[/pasta|macarr/i,"Pasta (500g)"],[/arroz/i,"Arroz (kg)"],
      [/lentejas/i,"Lentejas (500g)"],[/pescado|salmón/i,"Pescado (500g)"],[/carne|res|bife|lomo/i,"Carne de res (500g)"],
      [/fríjoles|frijoles|feijão|caraotas|frejoles/i,"Fríjoles (500g)"],[/huevo|huevos|ovo|perico/i,"Huevos (12 und)"],[/atún/i,"Atún en lata"],
      [/papa|papas|patata|batata/i,"Papas (kg)"],[/tomate/i,"Tomates (kg)"],[/aguacate|palta|abacate/i,"Aguacates"],
      [/plátano|banana|banano|cambur/i,"Plátanos"],[/queso|queijo/i,"Queso (250g)"],[/pan|pão|arepa|tortilla|tostada/i,"Pan"],
      [/yuca|mandioca/i,"Yuca (kg)"],[/quinua|quinoa/i,"Quinua (500g)"],[/leche|leite/i,"Leche (lt)"],[/fruta/i,"Frutas variadas"],
    ];
    const suggestedGrocery = (() => {
      const found = new Set();
      Object.values(weekMenu).forEach(dayMenu => {
        if (!dayMenu) return;
        const meals = typeof dayMenu==="string" ? [dayMenu] : Object.values(dayMenu).filter(Boolean);
        meals.forEach(meal => INGREDIENT_HINTS.forEach(([rx,item]) => { if (rx.test(meal)) found.add(item); }));
      });
      found.add("Aceite de cocina"); found.add("Sal y condimentos");
      return [...found];
    })();
    const addSuggestedToList = () => {
      const existing = groceryList.map(g => g.text);
      const newItems = suggestedGrocery.filter(s => !existing.includes(s)).map(text => ({id:Date.now()+Math.random(),text,done:false,fromMenu:true}));
      if (newItems.length) setGroceryList(c => [...c,...newItems]);
    };

    // ── Family presence this week ──
    const parseMinutes = t => t==="15 min"?15:t==="30 min"?30:t==="1 hora"?60:t?.includes("Más")?90:30;
    const monday = (() => { const n=new Date(); n.setDate(n.getDate()-(n.getDay()===0?6:n.getDay()-1)); n.setHours(0,0,0,0); return n; })();
    const thisWeekMoments = (purpose.presenceMoments||[]).filter(m => new Date(m.date) >= monday);
    const minutesByRole = {};
    thisWeekMoments.forEach(m => { const mins=parseMinutes(m.tiempo); (m.quien||[]).forEach(role => { minutesByRole[role]=(minutesByRole[role]||0)+mins; }); });
    const topFamilyRole = Object.keys(minutesByRole).length ? Object.entries(minutesByRole).sort((a,b)=>b[1]-a[1])[0][0] : null;
    const DEFAULT_ROLES = [{id:"r1",role:"Hijo/a",emoji:"👧"},{id:"r2",role:"Pareja",emoji:"💑"},{id:"r3",role:"Padres",emoji:"👵"},{id:"r4",role:"Amiga",emoji:"👯"}];
    const activeFamilyMembers = familyMembers.length ? familyMembers : DEFAULT_ROLES;
    const toggleQuien = label => setPresenceForm(f => ({...f, quien: f.quien.includes(label)?f.quien.filter(q=>q!==label):[...f.quien,label]}));
    const savePresence = () => {
      if (!presenceForm.quien.length && !presenceForm.queHicieron.trim()) return;
      updatePurpose("presenceMoments",[...(purpose.presenceMoments||[]),{id:Date.now(),date:new Date().toISOString(),quien:presenceForm.quien,queHicieron:presenceForm.queHicieron,tiempo:presenceForm.tiempo}]);
      setPresenceForm({quien:[],queHicieron:"",tiempo:"30 min"});
      setPresenceCelebration(true); setTimeout(()=>setPresenceCelebration(false),4000);
    };
    const VICTORY_MSGS = ["Ese momento cuenta para siempre. 🌸","Estar presente es el regalo más grande. 💛","No lo olvidarán. Ni tú. ✨","Eso es lo que importa de verdad. 💕","Una mamá presente no necesita ser perfecta. 🌿"];
    const victoryMsg = VICTORY_MSGS[Math.floor(Date.now()/1000)%VICTORY_MSGS.length];

    // ── Finance analysis ──
    const homeBudgetByType = {};
    homeBudget.forEach(item => { homeBudgetByType[item.type]=(homeBudgetByType[item.type]||0)+item.amount; });
    const financeRecs = [];
    if (homeAvailable < 0) financeRecs.push({icon:"🚨",text:"Tus gastos superan tus ingresos. Identifica un gasto variable que puedas reducir esta semana."});
    else if (homeBudgetTotals.savings===0&&homeBudgetTotals.income>0) financeRecs.push({icon:"💡",text:"Aún no tienes ahorro registrado. Separa un monto fijo al inicio del mes, aunque sea pequeño."});
    if (homeBudgetTotals.income>0&&(homeSpent/homeBudgetTotals.income)>0.9) financeRecs.push({icon:"⚠️",text:"Estás gastando más del 90% de tus ingresos. Busca reducir al menos un gasto hormiga."});
    if (financeRecs.length===0&&homeAvailable>0) financeRecs.push({icon:"✅",text:"Tus finanzas del hogar están equilibradas. Considera aumentar tu porcentaje de ahorro un 5%."});

    // ── Task categories ──
    const CAT_CONFIG = [
      {key:"Rutina",emoji:"🧹",color:"#6B46C1",bg:"#F5F0FC"},
      {key:"Compras",emoji:"🛒",color:"#0EA5E9",bg:"#F0F9FF"},
      {key:"Colegio / Ninos",emoji:"🎒",color:"#D97706",bg:"#FFFBEB"},
      {key:"Salud",emoji:"💊",color:"#DC2626",bg:"#FEF2F2"},
      {key:"Hogar / Limpieza",emoji:"🏠",color:"#059669",bg:"#F0FDF4"},
      {key:"Bienestar",emoji:"💆",color:"#C4526A",bg:"#FDF2F5"},
    ];

    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Mi Hogar 🌸</h2>
          <p>{pendingCount===0 ? "Todo al día — gran trabajo hoy 🌟" : `${pendingCount} pendiente${pendingCount>1?"s":""} · ${homeProgress}% completado`}</p>
        </div>

        {/* Tab nav */}
        <div className="home-tab-nav">
          {TABS.map((label,i) => (
            <button key={i} type="button" onClick={() => setHomeTab(i)} className={`home-tab-btn${homeTab===i?" home-tab-btn--active":""}`}>{label}</button>
          ))}
        </div>

        {/* ── TAB 0: HOY ── */}
        {homeTab === 0 && (
          <div className="home-today-grid">
            <div className="home-today-card home-today-card--menu">
              <div className="home-today-card-menu-top">
                <span className="home-today-card-ico">🍽️</span>
                <span className="home-today-card-ai-badge">✨ IA</span>
              </div>
              <p className="home-today-card-label" style={{color:"rgba(255,255,255,0.75)"}}>Menú de hoy</p>
              {(()=>{const tm=weekMenu[todayDay]; const hasMenu=tm&&(typeof tm==="string"?tm:Object.values(tm).some(Boolean));
                if(!hasMenu) return <p className="home-today-card-empty" style={{color:"rgba(255,255,255,0.65)"}}>Sin planear aún</p>;
                const d=typeof tm==="string"?{almuerzo:tm}:tm;
                return <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                  {d.desayuno&&<p style={{margin:0,fontSize:"11px",color:"rgba(255,255,255,0.8)"}}><span style={{opacity:0.7}}>🌅</span> {d.desayuno}</p>}
                  {d.almuerzo&&<p style={{margin:0,fontSize:"13px",fontWeight:700,color:"#fff"}}><span style={{opacity:0.8}}>🍽️</span> {d.almuerzo}</p>}
                  {d.cena&&<p style={{margin:0,fontSize:"11px",color:"rgba(255,255,255,0.8)"}}><span style={{opacity:0.7}}>🌙</span> {d.cena}</p>}
                  {d.snack&&<p style={{margin:0,fontSize:"11px",color:"rgba(255,255,255,0.75)"}}><span style={{opacity:0.7}}>🍎</span> {d.snack}</p>}
                </div>;
              })()}
              <button type="button" className="home-today-card-menu-cta" onClick={() => setShowMenuModal(true)}>
                {weekMenu[todayDay]&&Object.values(typeof weekMenu[todayDay]==="string"?{a:weekMenu[todayDay]}:weekMenu[todayDay]).some(Boolean) ? "Cambiar menú" : <><span className="abi-avatar">A</span> Planear con Abi</>}
              </button>
            </div>
            <div className="home-today-card">
              <span className="home-today-card-ico">🧹</span>
              <p className="home-today-card-label">Rutina de hoy</p>
              {homeRoutines[todayDay] ? <p className="home-today-card-val" style={{color:"var(--purple)"}}>{homeRoutines[todayDay]}</p> : <p className="home-today-card-empty">Sin rutina definida</p>}
              <button type="button" className="home-today-card-btn" style={{color:"var(--purple)"}} onClick={() => setHomeTab(2)}>
                {homeRoutines[todayDay] ? "Ver tareas →" : "Definir →"}
              </button>
            </div>
            <div className="home-today-card">
              <span className="home-today-card-ico">🎒</span>
              <p className="home-today-card-label">Hijos hoy</p>
              {kidsSchedule[todayDay]?.act
                ? <><p className="home-today-card-val" style={{color:"#1D9E75"}}>{kidsSchedule[todayDay].act}</p>{kidsSchedule[todayDay].time&&<p style={{margin:0,fontSize:"12px",color:"var(--muted)",fontWeight:600}}>{kidsSchedule[todayDay].time}</p>}</>
                : <p className="home-today-card-empty">Sin actividades</p>
              }
              <button type="button" className="home-today-card-btn" style={{color:"#1D9E75"}} onClick={() => setHomeTab(1)}>
                {kidsSchedule[todayDay]?.act ? "Ver semana →" : "Agregar →"}
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 1: SEMANA ── */}
        {homeTab === 1 && (
          <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>

            {/* Con mi familia — PRIORITY */}
            <div className="fam-card">
              {/* Header */}
              <div className="fam-card-header">
                <div>
                  <h3 className="fam-card-title">Con mi familia 💛</h3>
                  <p className="fam-card-sub">Presencia real — no perfecta.</p>
                </div>
                <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
                  {thisWeekMoments.length>0&&<span className="fam-moments-badge">{thisWeekMoments.length} momento{thisWeekMoments.length>1?"s":""}</span>}
                  <button type="button" className={`fam-config-btn${showFamilyConfig?" fam-config-btn--active":""}`}
                    onClick={()=>setShowFamilyConfig(v=>!v)}>
                    {showFamilyConfig?"✓ Listo":"✏️ Editar familia"}
                  </button>
                </div>
              </div>

              {/* Config panel */}
              {showFamilyConfig&&(
                <div className="fam-config-panel">
                  <p className="fam-config-title">Tu familia (sin nombres — solo roles)</p>
                  <div className="fam-roles-list">
                    {activeFamilyMembers.map(m=>(
                      <div key={m.id} className="fam-role-chip">
                        <span>{m.emoji}</span>
                        <span>{m.role}</span>
                        <button type="button" className="fam-role-delete"
                          onClick={()=>{
                            const base=familyMembers.length?familyMembers:DEFAULT_ROLES;
                            setFamilyMembers(base.filter(x=>x.id!==m.id));
                          }}
                          title={`Quitar ${m.role}`}>×</button>
                      </div>
                    ))}
                  </div>
                  <div className="fam-add-roles">
                    {[["👧","Hija"],["👦","Hijo"],["💑","Pareja"],["👵","Abuela"],["👴","Abuelo"],["🐾","Mascota"],["👶","Bebé"],["👨‍👩‍👦","Familia"]].map(([emoji,role])=>(
                      activeFamilyMembers.some(m=>m.role===role)?null:
                      <button key={role} type="button" className="fam-add-btn"
                        onClick={()=>setFamilyMembers(c=>[...(c.length?c:DEFAULT_ROLES),{id:Date.now()+Math.random(),role,emoji}])}>
                        + {emoji} {role}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tarjetas por miembro con gráfica circular */}
              <div className="fam-member-grid">
                {activeFamilyMembers.map(m=>{
                  const mins=minutesByRole[m.role]||0; const hrs=(mins/60).toFixed(1); const goalMins=120;
                  const pct=Math.min(100,Math.round((mins/goalMins)*100));
                  const isTop = topFamilyRole && m.role===topFamilyRole && mins>0;
                  const R=26; const circ=2*Math.PI*R;
                  const lastMoment=[...thisWeekMoments].reverse().find(mo=>mo.quien.includes(m.role));
                  return (
                    <div key={m.id} className={`fam-member-card${isTop?" fam-member-card--top":""}`}>
                      {isTop && <span className="fam-member-top-badge">👑 Más tiempo</span>}
                      <div className="fam-member-ring-wrap">
                        <svg viewBox="0 0 60 60" className="fam-member-ring-svg">
                          <circle cx="30" cy="30" r={R} className="fam-member-ring-bg" />
                          <circle cx="30" cy="30" r={R} className="fam-member-ring-fg"
                            strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)}
                            style={{stroke:pct>=100?"var(--green)":"#C4526A"}}
                            transform="rotate(-90 30 30)" />
                        </svg>
                        <span className="fam-member-ring-emoji">{m.emoji}</span>
                      </div>
                      <p className="fam-member-role">{m.role}</p>
                      <p className="fam-member-hrs">{hrs}h <span className="fam-member-hrs-sub">esta semana</span></p>
                      {lastMoment
                        ? <p className="fam-member-last">{lastMoment.queHicieron || lastMoment.tiempo}</p>
                        : <p className="fam-member-last fam-member-last--empty">Sin momentos aún</p>
                      }
                    </div>
                  );
                })}
              </div>

              {/* Celebration o botón para agregar */}
              {presenceCelebration?(
                <div className="fam-celebration">
                  <p style={{fontSize:"28px",margin:"0 0 6px"}}>🌸</p>
                  <p style={{margin:0,fontWeight:700,fontSize:"15px",color:"var(--ink)"}}>{victoryMsg}</p>
                </div>
              ):(
                <button type="button" className="fam-add-time-btn" onClick={()=>setShowFamilyTimeModal(true)}>
                  💛 Agregar tiempo en familia
                </button>
              )}
            </div>

            {/* Menú semanal */}
            <div className="card" style={{padding:"20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px",flexWrap:"wrap",gap:"8px"}}>
                <div>
                  <h3 style={{margin:"0 0 2px",fontSize:"16px"}}>Menú de la semana 🍽️</h3>
                  <p style={{margin:0,fontSize:"13px",color:"var(--muted)"}}>Saber qué cocinar elimina la decisión diaria.</p>
                </div>
                <button type="button" onClick={()=>setShowMenuModal(true)}
                  style={{padding:"7px 14px",background:"rgba(196,82,106,0.09)",border:"none",borderRadius:"8px",cursor:"pointer",fontFamily:"inherit",fontSize:"12px",fontWeight:700,color:"#C4526A",whiteSpace:"nowrap"}}>
                  <span className="abi-avatar">A</span> Planear con Abi
                </button>
              </div>
              <div style={{display:"grid",gap:"8px"}}>
                {DAY_LABELS.map(([key,name])=>{
                  const dm=weekMenu[key]||{}; const isToday=todayDay===key;
                  const upd=(field,val)=>setWeekMenu(m=>({...m,[key]:{...(typeof m[key]==="string"?{almuerzo:m[key]}:m[key]||{}),desayuno:"",almuerzo:"",cena:"",snack:"",...(typeof m[key]==="string"?{almuerzo:m[key]}:m[key]||{}),[field]:val}}));
                  return (
                    <div key={key} style={{padding:"10px 12px",borderRadius:"12px",border:`1px solid ${isToday?"rgba(196,82,106,0.35)":"var(--line)"}`,background:isToday?"#fdf5f7":"#faf7f5"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px"}}>
                        <span style={{width:"26px",height:"26px",borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:800,background:isToday?"#C4526A":"var(--line)",color:isToday?"#fff":"var(--muted)"}}>{key}</span>
                        <span style={{fontSize:"12px",fontWeight:700,color:isToday?"#C4526A":"var(--muted)"}}>{name}{isToday?" — Hoy":""}</span>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5px"}}>
                        {[["desayuno","🌅","Desayuno"],["almuerzo","🍽️","Almuerzo"],["cena","🌙","Cena"],["snack","🍎","Snack"]].map(([field,ico,label])=>(
                          <div key={field}>
                            <p style={{margin:"0 0 3px",fontSize:"10px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.3px"}}>{ico} {label}</p>
                            <input value={(typeof dm==="string"&&field==="almuerzo"?dm:typeof dm==="object"?dm[field]||"":"")}
                              onChange={e=>upd(field,e.target.value)}
                              placeholder={`${name}...`}
                              style={{width:"100%",padding:"6px 8px",font:"inherit",fontSize:"12px",borderRadius:"7px",border:"1px solid rgba(0,0,0,0.1)",background:"#fff",outline:"none",boxSizing:"border-box"}}/>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hijos esta semana */}
            <div className="card" style={{padding:"20px"}}>
              <h3 style={{margin:"0 0 2px",fontSize:"16px"}}>Actividades de tus hijos esta semana 🎒</h3>
              <p style={{margin:"0 0 12px",fontSize:"13px",color:"var(--muted)"}}>Actividades y horarios — un día a la vez.</p>
              <div style={{display:"grid",gap:"6px"}}>
                {DAY_LABELS.map(([key,name])=>(
                  <div key={key} style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <span style={{width:"28px",height:"28px",borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:800,background:todayDay===key?"#C4526A":"var(--line)",color:todayDay===key?"#fff":"var(--muted)"}}>{key}</span>
                    <input value={kidsSchedule[key]?.act||""} onChange={e=>setKidsSchedule(s=>({...s,[key]:{...s[key],act:e.target.value}}))} placeholder={todayDay===key?"Actividad de hoy...":name+"..."}
                      style={{flex:2,padding:"7px 10px",font:"inherit",fontSize:"13px",borderRadius:"8px",border:`1px solid ${todayDay===key?"rgba(196,82,106,0.35)":"var(--line)"}`,background:todayDay===key?"#fdf5f7":"#faf7f5",minWidth:0,outline:"none"}}/>
                    <input type="time" value={kidsSchedule[key]?.time||""} onChange={e=>setKidsSchedule(s=>({...s,[key]:{...s[key],time:e.target.value}}))}
                      style={{flex:"0 0 88px",padding:"7px 8px",font:"inherit",fontSize:"12px",borderRadius:"8px",border:`1px solid ${todayDay===key?"rgba(196,82,106,0.35)":"var(--line)"}`,background:todayDay===key?"#fdf5f7":"#faf7f5",outline:"none"}}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: TAREAS ── */}
        {homeTab === 2 && (
          <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>

            {/* Progress + add button */}
            <div className="card" style={{padding:"16px 20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                <p style={{margin:0,fontSize:"14px",fontWeight:700,color:"var(--ink)"}}>Tareas del hogar</p>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <span style={{fontSize:"13px",fontWeight:700,color:homeProgress===100?"var(--green)":"var(--ink)"}}>{homeProgress}%</span>
                  <button type="button" onClick={()=>setShowTaskModal(true)} style={{background:"#C4526A",color:"#fff",border:"none",borderRadius:"10px",padding:"7px 16px",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",fontWeight:700}}>+ Nueva</button>
                </div>
              </div>
              <div style={{height:"7px",background:"rgba(0,0,0,0.07)",borderRadius:"4px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${homeProgress}%`,background:homeProgress===100?"var(--green)":"#C4526A",borderRadius:"4px",transition:"width 0.5s ease"}}></div>
              </div>
              <p style={{margin:"5px 0 0",fontSize:"12px",color:"var(--muted)"}}>{completedHomeTasks} de {homeTasks.length} completadas</p>
            </div>

            {/* Category cards */}
            {homeTasks.length>0&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:"10px"}}>
                {CAT_CONFIG.map(cat=>{
                  const catTasks=homeTasks.filter(t=>t.category===cat.key); const catDone=catTasks.filter(t=>t.done).length;
                  if(!catTasks.length) return null;
                  return (
                    <div key={cat.key} style={{padding:"14px",background:cat.bg,borderRadius:"12px",border:`1px solid ${cat.color}22`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
                        <span style={{fontSize:"20px"}}>{cat.emoji}</span>
                        <span style={{fontSize:"10px",fontWeight:700,color:cat.color,background:`${cat.color}18`,padding:"2px 7px",borderRadius:"12px"}}>{catDone}/{catTasks.length}</span>
                      </div>
                      <p style={{margin:"0 0 8px",fontSize:"11px",fontWeight:700,color:"var(--ink)"}}>{cat.key}</p>
                      {catTasks.slice(0,3).map(task=>(
                        <label key={task.id} style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"4px",cursor:"pointer"}}>
                          <input type="checkbox" checked={task.done} onChange={()=>toggleHomeTask(task.id)} style={{accentColor:cat.color,width:"13px",height:"13px",flexShrink:0}}/>
                          <span style={{fontSize:"12px",color:task.done?"var(--muted)":"var(--ink)",textDecoration:task.done?"line-through":"none",lineHeight:1.3}}>{task.title}</span>
                        </label>
                      ))}
                      {catTasks.length>3&&<p style={{margin:"3px 0 0",fontSize:"11px",color:"var(--muted)"}}>+{catTasks.length-3} más</p>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full list by priority */}
            {homeTasks.length>0&&(
              <div className="card" style={{padding:"18px 20px"}}>
                <h3 style={{margin:"0 0 12px",fontSize:"15px"}}>Todos los pendientes</h3>
                {["Importante","Normal","Sin afán"].map(priority=>{
                  const tasks=homeTasks.filter(t=>(t.priority||"Normal")===priority); if(!tasks.length) return null;
                  return (
                    <div key={priority} style={{marginBottom:"12px"}}>
                      <p style={{fontSize:"10px",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.6px",color:priority==="Importante"?"#C4526A":"var(--muted)",margin:"0 0 6px"}}>
                        {priority==="Importante"&&"⭐ "}{priority}
                      </p>
                      {tasks.map(task=>(
                        <div key={task.id} style={{display:"flex",alignItems:"center",gap:"8px",padding:"7px 10px",borderRadius:"8px",background:"#fff",border:"1px solid var(--line)",marginBottom:"4px"}}>
                          <input type="checkbox" checked={task.done} onChange={()=>toggleHomeTask(task.id)} style={{accentColor:"var(--green)",width:"14px",height:"14px",flexShrink:0,cursor:"pointer"}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <span style={{fontSize:"13px",fontWeight:600,color:task.done?"var(--muted)":"var(--ink)",textDecoration:task.done?"line-through":"none"}}>{task.title}</span>
                            <span style={{marginLeft:"7px",fontSize:"11px",color:"var(--muted)"}}>{task.category}</span>
                            {task.frequency&&<span style={{marginLeft:"6px",fontSize:"11px",color:"var(--muted)"}}>· {task.frequency}</span>}
                            {task.delegate&&<span style={{marginLeft:"6px",fontSize:"11px",color:"#C4526A",fontWeight:600}}>→ {task.delegate}</span>}
                          </div>
                          <button type="button" onClick={()=>setHomeTasks(c=>c.filter(t=>t.id!==task.id))} style={{border:"none",background:"none",color:"var(--muted)",cursor:"pointer",fontSize:"15px",lineHeight:1,padding:"2px 4px",flexShrink:0}}>×</button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {homeTasks.length===0&&(
              <div className="card" style={{padding:"28px",textAlign:"center",background:"linear-gradient(135deg,#fdf9f6,#fef4f0)",border:"2px dashed #e8d5c4"}}>
                <p style={{fontSize:"32px",margin:"0 0 10px"}}>🌱</p>
                <h3 style={{margin:"0 0 6px",fontSize:"16px"}}>Tu lista está vacía</h3>
                <p style={{margin:"0 0 16px",fontSize:"13px",color:"var(--muted)"}}>Agrega tu primera tarea del hogar.</p>
                <button type="button" onClick={()=>setShowTaskModal(true)} style={{padding:"10px 24px",background:"#C4526A",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontFamily:"inherit",fontSize:"14px",fontWeight:700}}>+ Agregar tarea</button>
              </div>
            )}

            {/* Rutinas del hogar */}
            <div className="card" style={{padding:"18px 20px"}}>
              <h3 style={{margin:"0 0 2px",fontSize:"15px"}}>Rutinas del hogar 🧹</h3>
              <p style={{margin:"0 0 10px",fontSize:"13px",color:"var(--muted)"}}>Qué toca hacer cada día.</p>
              <div style={{display:"grid",gap:"5px"}}>
                {DAY_LABELS.map(([key,name])=>(
                  <div key={key} style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <span style={{width:"26px",height:"26px",borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:800,background:todayDay===key?"var(--purple)":"var(--line)",color:todayDay===key?"#fff":"var(--muted)"}}>{key}</span>
                    <input value={homeRoutines[key]||""} onChange={e=>setHomeRoutines(r=>({...r,[key]:e.target.value}))} placeholder={`${name}...`}
                      style={{flex:1,padding:"6px 10px",font:"inherit",fontSize:"13px",borderRadius:"7px",border:`1px solid ${todayDay===key?"rgba(107,70,193,0.3)":"var(--line)"}`,background:todayDay===key?"#f5f0fc":"#faf7f5",outline:"none"}}/>
                  </div>
                ))}
              </div>
            </div>

            {/* Lista de mercado */}
            <div className="card" style={{padding:"18px 20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",flexWrap:"wrap",gap:"8px"}}>
                <div>
                  <h3 style={{margin:"0 0 2px",fontSize:"15px"}}>Lista de mercado 🛒</h3>
                  <p style={{margin:0,fontSize:"13px",color:"var(--muted)"}}>Del menú + lo que necesites agregar.</p>
                </div>
                {Object.values(weekMenu).some(v=>v&&(typeof v==="string"?v:Object.values(v).some(Boolean)))&&(
                  <button type="button" onClick={addSuggestedToList}
                    style={{padding:"6px 12px",background:"rgba(14,165,233,0.08)",border:"1px solid rgba(14,165,233,0.25)",borderRadius:"8px",cursor:"pointer",fontFamily:"inherit",fontSize:"12px",fontWeight:700,color:"#0EA5E9",whiteSpace:"nowrap"}}>
                    ✨ Importar del menú
                  </button>
                )}
              </div>
              <form onSubmit={e=>{e.preventDefault();if(!groceryForm.trim())return;setGroceryList(c=>[...c,{id:Date.now(),text:groceryForm.trim(),done:false}]);setGroceryForm("");}} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"8px",marginBottom:"10px"}}>
                <input placeholder="Agregar item..." value={groceryForm} onChange={e=>setGroceryForm(e.target.value)}
                  style={{padding:"8px 12px",border:"1px solid var(--line)",borderRadius:"8px",font:"inherit",fontSize:"13px",background:"#FAF7F5",outline:"none"}}/>
                <button type="submit" style={{padding:"8px 14px",background:"#C4526A",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"15px",fontWeight:700}}>+</button>
              </form>
              {groceryList.length===0
                ?<p style={{margin:0,fontSize:"13px",color:"var(--muted)",fontStyle:"italic"}}>Lista vacía — agrega items o importa del menú.</p>
                :<div style={{display:"grid",gap:"4px",maxHeight:"260px",overflowY:"auto"}}>
                  {groceryList.map(item=>(
                    <label key={item.id} style={{display:"flex",alignItems:"center",gap:"8px",padding:"6px 10px",border:"1px solid var(--line)",borderRadius:"7px",background:item.done?"rgba(47,159,112,0.04)":"#fff",cursor:"pointer"}}>
                      <input type="checkbox" checked={item.done} onChange={()=>setGroceryList(c=>c.map(g=>g.id===item.id?{...g,done:!g.done}:g))} style={{accentColor:"var(--green)",width:"13px",height:"13px",flexShrink:0}}/>
                      <span style={{flex:1,fontSize:"13px",textDecoration:item.done?"line-through":"none",color:item.done?"var(--muted)":"var(--ink)"}}>{item.text}</span>
                      {item.fromMenu&&<span style={{fontSize:"9px",color:"#0EA5E9",fontWeight:700,background:"rgba(14,165,233,0.1)",padding:"1px 5px",borderRadius:"4px"}}>MENÚ</span>}
                      <button type="button" onClick={()=>setGroceryList(c=>c.filter(g=>g.id!==item.id))} style={{border:"none",background:"none",color:"var(--muted)",cursor:"pointer",fontSize:"14px",lineHeight:1,padding:"0 2px"}}>×</button>
                    </label>
                  ))}
                </div>
              }
            </div>
          </div>
        )}

        {/* ── TAB 3: MIS FINANZAS ── */}
        {homeTab === 3 && (
          <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
              <div className="card" style={{padding:"16px",textAlign:"center"}}>
                <p style={{margin:"0 0 4px",fontSize:"11px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Gano</p>
                <p style={{margin:"0 0 2px",fontSize:"20px",fontWeight:800,color:"var(--green)"}}>{money.format(homeBudgetTotals.income)}</p>
                <p style={{margin:0,fontSize:"11px",color:"var(--muted)"}}>este mes</p>
              </div>
              <div className="card" style={{padding:"16px",textAlign:"center"}}>
                <p style={{margin:"0 0 4px",fontSize:"11px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Gasto</p>
                <p style={{margin:"0 0 2px",fontSize:"20px",fontWeight:800,color:homeSpent>homeBudgetTotals.income?"#DC2626":"var(--ink)"}}>{money.format(homeSpent)}</p>
                <p style={{margin:0,fontSize:"11px",color:"var(--muted)"}}>{homeBudgetTotals.income>0?Math.round((homeSpent/homeBudgetTotals.income)*100):0}% de ingresos</p>
              </div>
              <div className="card" style={{padding:"16px",textAlign:"center"}}>
                <p style={{margin:"0 0 4px",fontSize:"11px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Me queda</p>
                <p style={{margin:"0 0 2px",fontSize:"20px",fontWeight:800,color:homeAvailable>=0?"var(--green)":"#DC2626"}}>{money.format(homeAvailable)}</p>
                <p style={{margin:0,fontSize:"11px",color:"var(--muted)"}}>disponible</p>
              </div>
            </div>

            {homeBudgetTotals.income>0&&(
              <div className="card" style={{padding:"14px 18px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                  <span style={{fontSize:"12px",fontWeight:600,color:"var(--muted)"}}>Gastado vs ingresos</span>
                  <span style={{fontSize:"12px",fontWeight:700,color:homeSpent>homeBudgetTotals.income?"#DC2626":"var(--ink)"}}>{Math.round((homeSpent/homeBudgetTotals.income)*100)}%</span>
                </div>
                <div style={{height:"9px",background:"rgba(0,0,0,0.07)",borderRadius:"5px",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${Math.min(100,(homeSpent/homeBudgetTotals.income)*100)}%`,background:homeSpent>homeBudgetTotals.income*0.9?"#DC2626":homeSpent>homeBudgetTotals.income*0.7?"#D97706":"var(--green)",borderRadius:"5px",transition:"width 0.5s"}}></div>
                </div>
              </div>
            )}

            {/* Movements list full-width + add button */}
            <div className="card" style={{padding:"18px 20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                <h3 style={{margin:0,fontSize:"15px"}}>Mis movimientos</h3>
                <button type="button" className="fin-add-btn" onClick={()=>{setHomeBudgetError("");setShowBudgetModal(true);}}>
                  + Registrar
                </button>
              </div>
              {homeBudget.length===0?(
                <div style={{textAlign:"center",padding:"24px 16px"}}>
                  <p style={{fontSize:"28px",margin:"0 0 8px"}}>💸</p>
                  <p style={{margin:"0 0 14px",fontSize:"13px",color:"var(--muted)"}}>Aún no hay movimientos. Empieza registrando un ingreso.</p>
                  <button type="button" className="fin-add-btn" onClick={()=>{setHomeBudgetError("");setShowBudgetModal(true);}}>+ Registrar movimiento</button>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:"5px",maxHeight:"340px",overflowY:"auto"}}>
                  {[...homeBudget].sort((a,b)=>new Date(b.dueDate||b.createdAt)-new Date(a.dueDate||a.createdAt)).map(item=>{
                    const TYPE_ICONS={"Ingreso":"💰","Gasto fijo":"🏠","Gasto variable":"🛍️","Gasto hormiga":"☕","Deuda":"📋","Ahorro":"🐷"};
                    return (
                      <div key={item.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"9px 12px",borderRadius:"10px",background:item.type==="Ingreso"?"rgba(47,159,112,0.05)":item.type==="Ahorro"?"rgba(37,99,235,0.05)":"rgba(220,38,38,0.025)",border:"1px solid var(--line)"}}>
                        <span style={{fontSize:"18px",flexShrink:0}}>{TYPE_ICONS[item.type]||"💳"}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{margin:"0 0 1px",fontSize:"13px",fontWeight:600,color:"var(--ink)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.description}</p>
                          <p style={{margin:0,fontSize:"11px",color:"var(--muted)"}}>{item.type} · {formatShortDate(item.dueDate||item.createdAt)}</p>
                        </div>
                        <span style={{fontSize:"14px",fontWeight:700,color:item.type==="Ingreso"?"var(--green)":item.type==="Ahorro"?"#2563EB":"#DC2626",flexShrink:0,whiteSpace:"nowrap"}}>{item.type==="Ingreso"?"+":"-"}{money.format(item.amount)}</span>
                        <button type="button" onClick={()=>setHomeBudget(c=>c.filter(r=>r.id!==item.id))} style={{border:"none",background:"none",color:"var(--muted)",cursor:"pointer",fontSize:"16px",lineHeight:1,padding:"0 2px",flexShrink:0}}>×</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Weekly analysis */}
            {homeBudget.length>0&&(()=>{
              const weeks=[{label:"Sem 1 (1-7)",from:1,to:7},{label:"Sem 2 (8-14)",from:8,to:14},{label:"Sem 3 (15-21)",from:15,to:21},{label:"Sem 4 (22+)",from:22,to:31}];
              const nowMonth=new Date().getMonth(); const nowYear=new Date().getFullYear();
              const weekData=weeks.map(w=>{
                const items=homeBudget.filter(item=>{
                  const d=new Date(item.dueDate||item.createdAt);
                  return d.getMonth()===nowMonth&&d.getFullYear()===nowYear&&d.getDate()>=w.from&&d.getDate()<=w.to;
                });
                const income=items.filter(i=>i.type==="Ingreso").reduce((s,i)=>s+i.amount,0);
                const expense=items.filter(i=>i.type!=="Ingreso"&&i.type!=="Ahorro").reduce((s,i)=>s+i.amount,0);
                return {...w,income,expense,total:income+expense};
              }).filter(w=>w.total>0);
              if(!weekData.length) return null;
              const maxIncome=Math.max(...weekData.map(w=>w.income),1);
              const maxExpense=Math.max(...weekData.map(w=>w.expense),1);
              const bestIncomeWeek=weekData.reduce((a,b)=>b.income>a.income?b:a,weekData[0]);
              const worstExpenseWeek=weekData.reduce((a,b)=>b.expense>a.expense?b:a,weekData[0]);
              return (
                <div className="card" style={{padding:"18px 20px"}}>
                  <h3 style={{margin:"0 0 4px",fontSize:"15px"}}>📅 Por semana este mes</h3>
                  <p style={{margin:"0 0 14px",fontSize:"13px",color:"var(--muted)"}}>Cuándo entra y cuándo sale el dinero.</p>
                  <div style={{display:"grid",gap:"10px"}}>
                    {weekData.map(w=>(
                      <div key={w.label}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                          <span style={{fontSize:"12px",fontWeight:700,color:"var(--ink)"}}>{w.label}</span>
                          <span style={{fontSize:"11px",color:"var(--muted)"}}>
                            {w.income>0&&<span style={{color:"var(--green)",fontWeight:700}}>+{money.format(w.income)} </span>}
                            {w.expense>0&&<span style={{color:"#DC2626",fontWeight:700}}>-{money.format(w.expense)}</span>}
                          </span>
                        </div>
                        {w.income>0&&(
                          <div style={{height:"6px",background:"rgba(0,0,0,0.06)",borderRadius:"3px",overflow:"hidden",marginBottom:"3px"}}>
                            <div style={{height:"100%",width:`${Math.round((w.income/maxIncome)*100)}%`,background:"var(--green)",borderRadius:"3px",transition:"width 0.5s"}}></div>
                          </div>
                        )}
                        {w.expense>0&&(
                          <div style={{height:"6px",background:"rgba(0,0,0,0.06)",borderRadius:"3px",overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${Math.round((w.expense/maxExpense)*100)}%`,background:"#C4526A",borderRadius:"3px",transition:"width 0.5s"}}></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {weekData.length>1&&(
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginTop:"14px"}}>
                      {bestIncomeWeek.income>0&&(
                        <div style={{padding:"10px 12px",background:"rgba(47,159,112,0.06)",borderRadius:"10px",border:"1px solid rgba(47,159,112,0.15)"}}>
                          <p style={{margin:"0 0 2px",fontSize:"11px",color:"var(--muted)"}}>📈 Más ingresos</p>
                          <p style={{margin:0,fontSize:"13px",fontWeight:700,color:"var(--ink)"}}>{bestIncomeWeek.label}</p>
                        </div>
                      )}
                      {worstExpenseWeek.expense>0&&(
                        <div style={{padding:"10px 12px",background:"rgba(220,38,38,0.04)",borderRadius:"10px",border:"1px solid rgba(220,38,38,0.1)"}}>
                          <p style={{margin:"0 0 2px",fontSize:"11px",color:"var(--muted)"}}>📉 Más gastos</p>
                          <p style={{margin:0,fontSize:"13px",fontWeight:700,color:"var(--ink)"}}>{worstExpenseWeek.label}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {homeBudget.length>0&&(
              <div className="card" style={{padding:"18px 20px"}}>
                <h3 style={{margin:"0 0 14px",fontSize:"15px"}}>📊 Análisis de mis finanzas</h3>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
                  <div>
                    <p style={{margin:"0 0 8px",fontSize:"11px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px"}}>En qué gasto más</p>
                    {Object.entries(homeBudgetByType).filter(([t])=>t!=="Ingreso"&&t!=="Ahorro").sort((a,b)=>b[1]-a[1]).map(([type,amt])=>{
                      const pct=homeBudgetTotals.income>0?Math.round((amt/homeBudgetTotals.income)*100):0;
                      return (
                        <div key={type} style={{marginBottom:"6px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px"}}>
                            <span style={{fontSize:"12px",color:"var(--ink)"}}>{type}</span>
                            <span style={{fontSize:"12px",fontWeight:700}}>{pct}%</span>
                          </div>
                          <div style={{height:"5px",background:"rgba(0,0,0,0.07)",borderRadius:"3px",overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${pct}%`,background:"#C4526A",borderRadius:"3px"}}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                    <div style={{padding:"10px 12px",background:"rgba(47,159,112,0.06)",borderRadius:"8px",border:"1px solid rgba(47,159,112,0.15)"}}>
                      <p style={{margin:0,fontSize:"11px",color:"var(--muted)"}}>Ingresos totales</p>
                      <p style={{margin:"2px 0 0",fontSize:"16px",fontWeight:800,color:"var(--green)"}}>{money.format(homeBudgetTotals.income)}</p>
                    </div>
                    <div style={{padding:"10px 12px",background:"rgba(37,99,235,0.05)",borderRadius:"8px",border:"1px solid rgba(37,99,235,0.12)"}}>
                      <p style={{margin:0,fontSize:"11px",color:"var(--muted)"}}>Ahorro registrado</p>
                      <p style={{margin:"2px 0 0",fontSize:"16px",fontWeight:800,color:"#2563EB"}}>{money.format(homeBudgetTotals.savings)}</p>
                    </div>
                    {biggestHomeLeak[0]&&(
                      <div style={{padding:"10px 12px",background:"rgba(220,38,38,0.04)",borderRadius:"8px",border:"1px solid rgba(220,38,38,0.1)"}}>
                        <p style={{margin:0,fontSize:"11px",color:"var(--muted)"}}>Mayor salida</p>
                        <p style={{margin:"2px 0 0",fontSize:"13px",fontWeight:700,color:"#DC2626"}}>{biggestHomeLeak[0]} — {money.format(biggestHomeLeak[1])}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{borderTop:"1px solid var(--line)",paddingTop:"12px"}}>
                  <p style={{margin:"0 0 8px",fontSize:"11px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px"}}>💡 Recomendaciones</p>
                  {financeRecs.map((rec,i)=>(
                    <div key={i} style={{display:"flex",gap:"10px",alignItems:"flex-start",padding:"10px 12px",background:"rgba(196,82,106,0.03)",borderRadius:"8px",border:"1px solid rgba(196,82,106,0.1)",marginBottom:"6px"}}>
                      <span style={{fontSize:"18px",flexShrink:0}}>{rec.icon}</span>
                      <p style={{margin:0,fontSize:"13px",color:"var(--ink)",lineHeight:1.4}}>{rec.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Modal: Registrar movimiento ── */}
        {showBudgetModal&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:8000,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0"}}
            onClick={e=>e.target===e.currentTarget&&(setShowBudgetModal(false),setHomeBudgetError(""))}>
            <div style={{background:"#fff",borderRadius:"24px 24px 0 0",width:"min(520px,100%)",boxShadow:"0 -8px 40px rgba(0,0,0,0.18)",animation:"slideUp 0.25s ease"}}>
              <div style={{background:"linear-gradient(135deg,#C4526A,#9e3a52)",padding:"20px 22px 18px",color:"#fff",borderRadius:"24px 24px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <p style={{margin:"0 0 2px",fontSize:"11px",fontWeight:700,opacity:0.8,letterSpacing:"0.8px",textTransform:"uppercase"}}>Mis Finanzas</p>
                  <p style={{margin:0,fontSize:"18px",fontWeight:800}}>Registrar movimiento</p>
                </div>
                <button type="button" onClick={()=>{setShowBudgetModal(false);setHomeBudgetError("");}}
                  style={{border:"none",background:"rgba(255,255,255,0.2)",borderRadius:"10px",width:"32px",height:"32px",cursor:"pointer",color:"#fff",fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>
              <form onSubmit={addHomeBudgetItem} style={{padding:"22px",display:"flex",flexDirection:"column",gap:"12px"}}>
                <div>
                  <label style={{display:"block",fontSize:"11px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"7px"}}>Tipo</label>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"7px"}}>
                    {[["Ingreso","💰"],["Gasto fijo","🏠"],["Gasto variable","🛍️"],["Gasto hormiga","☕"],["Deuda","📋"],["Ahorro","🐷"]].map(([t,ico])=>(
                      <button key={t} type="button" onClick={()=>setHomeBudgetForm(c=>({...c,type:t}))}
                        style={{padding:"9px 6px",borderRadius:"10px",border:`2px solid ${homeBudgetForm.type===t?"#C4526A":"var(--line)"}`,background:homeBudgetForm.type===t?"rgba(196,82,106,0.08)":"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:"12px",fontWeight:homeBudgetForm.type===t?700:400,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",transition:"all 0.15s"}}>
                        <span style={{fontSize:"16px"}}>{ico}</span>{t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{display:"block",fontSize:"11px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"7px"}}>Descripción</label>
                  <input placeholder="Ej: Pago del arriendo, Mercado semanal..." value={homeBudgetForm.description}
                    onChange={e=>{setHomeBudgetForm(c=>({...c,description:e.target.value}));if(homeBudgetError)setHomeBudgetError("");}}
                    style={{width:"100%",padding:"11px 14px",border:"1px solid var(--line)",borderRadius:"10px",font:"inherit",fontSize:"14px",background:"#faf7f5",outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                  <div>
                    <label style={{display:"block",fontSize:"11px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"7px"}}>Monto</label>
                    <MoneyAmountInput placeholder="$ 0" value={homeBudgetForm.amount}
                      onChange={v=>{setHomeBudgetForm(c=>({...c,amount:v}));if(homeBudgetError)setHomeBudgetError("");}}/>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:"11px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"7px"}}>Fecha</label>
                    <input type="date" value={homeBudgetForm.dueDate} onChange={e=>setHomeBudgetForm(c=>({...c,dueDate:e.target.value}))}
                      style={{width:"100%",padding:"11px 12px",border:"1px solid var(--line)",borderRadius:"10px",font:"inherit",fontSize:"13px",background:"#faf7f5",outline:"none",boxSizing:"border-box"}}/>
                  </div>
                </div>
                {homeBudgetError&&<p style={{margin:0,fontSize:"12px",color:"#C4526A",fontWeight:600}}>{homeBudgetError}</p>}
                <button type="submit" style={{padding:"14px",background:"#C4526A",color:"#fff",border:"none",borderRadius:"12px",cursor:"pointer",fontFamily:"inherit",fontSize:"15px",fontWeight:700,marginTop:"2px"}}>
                  Guardar movimiento
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Abi Menú ── */}
        {showMenuModal&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:8000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}} onClick={e=>e.target===e.currentTarget&&(setShowMenuModal(false),setAbiMenuSuggestion(null))}>
            <div style={{background:"#fff",borderRadius:"20px",width:"min(500px,100%)",maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 24px 80px rgba(0,0,0,0.22)"}}>
              <div style={{background:"linear-gradient(135deg,#C4526A,#a33a54)",padding:"20px 22px",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0}}>
                <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                  <div className="abi-avatar-lg">A</div>
                  <div>
                    <p style={{margin:"0 0 2px",fontSize:"11px",fontWeight:700,opacity:0.8,letterSpacing:"0.8px",textTransform:"uppercase"}}>Asistente de menú</p>
                    <p style={{margin:0,fontSize:"18px",fontWeight:800}}>Hola, soy Abi 👋</p>
                  </div>
                </div>
                <button type="button" onClick={()=>{setShowMenuModal(false);setAbiMenuSuggestion(null);}} style={{border:"none",background:"rgba(255,255,255,0.2)",borderRadius:"8px",width:"30px",height:"30px",cursor:"pointer",color:"#fff",fontSize:"15px",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>
              <div style={{padding:"20px 22px",overflowY:"auto",flex:1}}>
                {!abiMenuSuggestion?(
                  <div style={{display:"flex",flexDirection:"column",gap:"18px"}}>
                    <p style={{margin:0,fontSize:"14px",color:"var(--ink)",lineHeight:1.5}}>Cuéntame un poco y te sugiero un menú típico de tu país, adaptado a tu familia.</p>

                    <div>
                      <label style={{display:"block",fontSize:"11px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"10px"}}>¿De dónde son tus recetas?</label>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"7px"}}>
                        {[
                          ["colombia","🇨🇴","Colombia"],
                          ["mexico","🇲🇽","México"],
                          ["argentina","🇦🇷","Argentina"],
                          ["peru","🇵🇪","Perú"],
                          ["venezuela","🇻🇪","Venezuela"],
                          ["chile","🇨🇱","Chile"],
                          ["brasil","🇧🇷","Brasil"],
                          ["espana","🇪🇸","España"],
                          ["internacional","🌎","Internacional"],
                        ].map(([key,flag,name])=>(
                          <button key={key} type="button" onClick={()=>setAbiMenuPrefs(p=>({...p,pais:key}))}
                            style={{padding:"9px 6px",borderRadius:"10px",border:`2px solid ${abiMenuPrefs.pais===key?"#C4526A":"var(--line)"}`,background:abiMenuPrefs.pais===key?"rgba(196,82,106,0.08)":"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",fontWeight:abiMenuPrefs.pais===key?700:400,display:"flex",alignItems:"center",justifyContent:"center",gap:"5px",transition:"all 0.15s"}}>
                            <span style={{fontSize:"16px"}}>{flag}</span>{name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{display:"block",fontSize:"11px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"8px"}}>¿Cuántas personas?</label>
                      <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                        {["2","3","4","5","6+"].map(n=>(
                          <button key={n} type="button" onClick={()=>setAbiMenuPrefs(p=>({...p,personas:n}))}
                            style={{padding:"8px 18px",borderRadius:"20px",border:`2px solid ${abiMenuPrefs.personas===n?"#C4526A":"var(--line)"}`,background:abiMenuPrefs.personas===n?"rgba(196,82,106,0.08)":"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:"14px",fontWeight:abiMenuPrefs.personas===n?700:400}}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{display:"block",fontSize:"11px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"8px"}}>Preferencia alimentaria</label>
                      <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                        {[["normal","🍖 Normal"],["vegetariano","🥦 Vegetariano"],["economico","💰 Económico"]].map(([key,label])=>(
                          <button key={key} type="button" onClick={()=>setAbiMenuPrefs(p=>({...p,dieta:key}))}
                            style={{padding:"8px 16px",borderRadius:"20px",border:`2px solid ${abiMenuPrefs.dieta===key?"#C4526A":"var(--line)"}`,background:abiMenuPrefs.dieta===key?"rgba(196,82,106,0.08)":"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:"14px",fontWeight:abiMenuPrefs.dieta===key?700:400}}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button type="button" onClick={()=>setAbiMenuSuggestion(generateAbiMenu())}
                      style={{marginTop:"2px",padding:"13px",background:"#C4526A",color:"#fff",border:"none",borderRadius:"12px",cursor:"pointer",fontFamily:"inherit",fontSize:"15px",fontWeight:700}}>
                      ✨ Generar mi menú
                    </button>
                  </div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                    {(()=>{const PAIS_LABELS={colombia:"🇨🇴 Colombia",mexico:"🇲🇽 México",argentina:"🇦🇷 Argentina",peru:"🇵🇪 Perú",venezuela:"🇻🇪 Venezuela",chile:"🇨🇱 Chile",brasil:"🇧🇷 Brasil",espana:"🇪🇸 España",internacional:"🌎 Internacional"};return(<p style={{margin:"0 0 4px",fontSize:"14px",color:"var(--ink)"}}>Menú <strong>{PAIS_LABELS[abiMenuPrefs.pais]||""}</strong> — edita lo que necesites antes de guardar.</p>);})()}
                    {DAY_LABELS.map(([key,name])=>{
                      const dm=abiMenuSuggestion[key]||{}; const isToday=todayDay===key;
                      const upd=(field,val)=>setAbiMenuSuggestion(p=>({...p,[key]:{...(p[key]||{}),[field]:val}}));
                      return (
                        <div key={key} style={{padding:"10px 12px",borderRadius:"12px",border:`1px solid ${isToday?"rgba(196,82,106,0.35)":"var(--line)"}`,background:isToday?"#fdf5f7":"#faf7f5"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"7px"}}>
                            <span style={{width:"24px",height:"24px",borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:800,background:isToday?"#C4526A":"#e0d9d1",color:isToday?"#fff":"var(--muted)"}}>{key}</span>
                            <span style={{fontSize:"11px",fontWeight:700,color:isToday?"#C4526A":"var(--muted)"}}>{name}{isToday?" — Hoy":""}</span>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px"}}>
                            {[["desayuno","🌅","Desayuno"],["almuerzo","🍽️","Almuerzo"],["cena","🌙","Cena"],["snack","🍎","Snack"]].map(([field,ico,label])=>(
                              <div key={field}>
                                <p style={{margin:"0 0 2px",fontSize:"10px",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.3px"}}>{ico} {label}</p>
                                <input value={typeof dm==="string"&&field==="almuerzo"?dm:typeof dm==="object"?dm[field]||"":""}
                                  onChange={e=>upd(field,e.target.value)} placeholder={`${name}...`}
                                  style={{width:"100%",padding:"6px 8px",font:"inherit",fontSize:"12px",borderRadius:"7px",border:"1px solid rgba(0,0,0,0.1)",background:"#fff",outline:"none",boxSizing:"border-box"}}/>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginTop:"6px"}}>
                      <button type="button" onClick={()=>setAbiMenuSuggestion(generateAbiMenu())}
                        style={{padding:"11px",background:"#fff",color:"var(--ink)",border:"1px solid var(--line)",borderRadius:"10px",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",fontWeight:600}}>
                        🔄 Otra sugerencia
                      </button>
                      <button type="button" onClick={()=>{setWeekMenu(abiMenuSuggestion);setAbiMenuSuggestion(null);setShowMenuModal(false);}}
                        style={{padding:"11px",background:"#C4526A",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",fontWeight:700}}>
                        ✓ Usar este menú
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Nueva Tarea ── */}
        {showTaskModal&&(
          <div className="app-modal-backdrop" onClick={e=>e.target===e.currentTarget&&(setShowTaskModal(false),setHomeTaskError(""))}>
            <div className="app-modal-card" style={{width:"min(440px,100%)"}}>
              <div className="app-modal-head">
                <div>
                  <p className="app-modal-head-eyebrow">Mi Hogar</p>
                  <p className="app-modal-head-title">Nueva tarea</p>
                </div>
                <button type="button" className="app-modal-close" onClick={()=>{setShowTaskModal(false);setHomeTaskError("");}}>✕</button>
              </div>
              <form onSubmit={e=>{addHomeTask(e);if(!homeTaskError)setShowTaskModal(false);}} style={{padding:"20px 22px",display:"flex",flexDirection:"column",gap:"14px"}}>
                <div>
                  <label className="app-form-label">Tarea</label>
                  <input autoFocus placeholder="¿Qué hay que hacer?" value={homeForm.title}
                    onChange={e=>{updateHomeForm("title",e.target.value);if(homeTaskError)setHomeTaskError("");}}
                    className="app-form-input"/>
                  {homeTaskError&&<p style={{margin:"4px 0 0",fontSize:"12px",color:"#C4526A",fontWeight:600}}>{homeTaskError}</p>}
                </div>

                <div>
                  <label className="app-form-label">Categoría</label>
                  <select value={homeForm.category} onChange={e=>updateHomeForm("category",e.target.value)} className="app-form-input">
                    <option>Rutina</option><option>Compras</option><option>Colegio / Ninos</option><option>Salud</option><option>Hogar / Limpieza</option><option>Bienestar</option>
                  </select>
                </div>

                <div>
                  <label className="app-form-label">¿Con qué frecuencia?</label>
                  <div className="app-pill-row">
                    {["Rutina","Semanal","Mensual","Anual","Otro"].map(f=>(
                      <button key={f} type="button" onClick={()=>updateHomeForm("frequency",f)}
                        className={`app-pill-btn${homeForm.frequency===f?" app-pill-btn--active":""}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                  {homeForm.frequency==="Otro"&&(
                    <input placeholder="¿Cada cuánto? Ej: Cada 2 días" value={homeForm.customFrequency}
                      onChange={e=>updateHomeForm("customFrequency",e.target.value)}
                      className="app-form-input" style={{marginTop:"8px"}}/>
                  )}
                </div>

                <div>
                  <label className="app-form-label">Prioridad</label>
                  <div style={{display:"flex",gap:"6px"}}>
                    {[["Importante","⭐","#C4526A"],["Normal","🟡","#D97706"],["Sin afán","🌿","#1D9E75"]].map(([p,ico,color])=>(
                      <button key={p} type="button" onClick={()=>updateHomeForm("priority",p)}
                        style={{flex:1,padding:"9px 4px",borderRadius:"10px",border:`2px solid ${homeForm.priority===p?color:"var(--line)"}`,background:homeForm.priority===p?`${color}14`:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:"11px",fontWeight:600,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",transition:"all 0.15s"}}>
                        <span>{ico}</span><span style={{color:homeForm.priority===p?color:"var(--muted)",textAlign:"center"}}>{p}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="app-form-label">Duración estimada <span style={{fontWeight:400,textTransform:"none"}}>(minutos, opcional)</span></label>
                  <input type="number" min="0" step="5" placeholder={`Auto: ${HOME_CATEGORY_DURATION[homeForm.category]||DEFAULT_HOME_DURATION} min`}
                    value={homeForm.duration} onChange={e=>updateHomeForm("duration",e.target.value)}
                    className="app-form-input"/>
                </div>

                <div>
                  <label className="app-form-label">Delegar a <span style={{fontWeight:400,textTransform:"none"}}>(opcional)</span></label>
                  <input placeholder="Ej: Esposo, María..." value={homeForm.delegate} onChange={e=>updateHomeForm("delegate",e.target.value)}
                    className="app-form-input"/>
                </div>

                <button type="submit" className="app-modal-submit">Guardar tarea</button>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Agregar tiempo en familia ── */}
        {showFamilyTimeModal&&(
          <div className="app-modal-backdrop" onClick={e=>e.target===e.currentTarget&&setShowFamilyTimeModal(false)}>
            <div className="app-modal-card" style={{width:"min(460px,100%)"}}>
              <div className="app-modal-head">
                <div>
                  <p className="app-modal-head-eyebrow">Con mi familia</p>
                  <p className="app-modal-head-title">Agregar un momento 💛</p>
                </div>
                <button type="button" className="app-modal-close" onClick={()=>setShowFamilyTimeModal(false)}>✕</button>
              </div>
              <div style={{padding:"20px 22px",display:"flex",flexDirection:"column",gap:"16px"}}>
                <div>
                  <p className="fam-form-label">¿Con quién estuviste hoy?</p>
                  <div className="fam-quien-row">
                    {activeFamilyMembers.map(m=>(
                      <button key={m.id} type="button"
                        className={`fam-quien-btn${presenceForm.quien.includes(m.role)?" fam-quien-btn--active":""}`}
                        onClick={()=>toggleQuien(m.role)}>
                        <span className="fam-quien-emoji">{m.emoji}</span>
                        <span className="fam-quien-role">{m.role}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="fam-form-label">¿Qué hicieron? <span style={{fontWeight:400,color:"var(--muted)"}}>(opcional)</span></p>
                  <textarea className="fam-textarea" value={presenceForm.queHicieron}
                    onChange={e=>setPresenceForm(f=>({...f,queHicieron:e.target.value}))}
                    placeholder="Ej: Leímos un cuento, cocinamos juntos..."/>
                </div>

                <div>
                  <p className="fam-form-label">¿Cuánto tiempo?</p>
                  <div className="fam-tiempo-row">
                    {["15 min","30 min","1 hora","Más de 1 hora"].map(t=>(
                      <button key={t} type="button"
                        className={`fam-tiempo-btn${presenceForm.tiempo===t?" fam-tiempo-btn--active":""}`}
                        onClick={()=>setPresenceForm(f=>({...f,tiempo:t}))}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="button" className="app-modal-submit"
                  disabled={!presenceForm.quien.length&&!presenceForm.queHicieron.trim()}
                  onClick={()=>{savePresence();setShowFamilyTimeModal(false);}}>
                  Guardar este momento 💛
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  function MovementForm() {
    const isIncome = form.type === "income";
    const categoryOptions = isIncome ? incomeSources.map(s => s.name) : EXPENSE_CATEGORIES;
    return (
      <form className="card mov-form" onSubmit={addMovement}>
        {movements.length >= currentLimits.movements && (
          <div className="plan-limit-banner">
            ⚠️ Llegaste al límite de <strong>{currentLimits.movements} movimientos</strong> de tu plan.{" "}
            <button type="button" className="plan-limit-link" onClick={() => setActiveView("pricing")}>Ver planes →</button>
          </div>
        )}

        {/* Tipo */}
        <div className="mov-type-tabs">
          <button type="button" className={`mov-tab mov-tab-in${isIncome ? " active" : ""}`} onClick={() => updateMovementType("income")}>↑ Ingreso</button>
          <button type="button" className={`mov-tab mov-tab-ex${!isIncome ? " active" : ""}`} onClick={() => updateMovementType("expense")}>↓ Gasto</button>
        </div>

        {/* Monto — campo héroe */}
        <div className={`mov-amount-wrap${formErrors.amount ? " input-error" : ""}${isIncome ? " mov-amount-in" : " mov-amount-ex"}`}>
          <span className="mov-curr">{currency === "EUR" ? "€" : "$"}</span>
          <MoneyAmountInput className="mov-amount-input" placeholder="0.00"
            value={form.amount} onChange={(v) => updateForm("amount", v)} />
        </div>
        {formErrors.amount && <span className="field-error">{formErrors.amount}</span>}

        {/* Descripción */}
        <input placeholder="¿Qué fue? (ej: Consultoría, venta de curso…)"
          value={form.description} onChange={(e) => updateForm("description", e.target.value)}
          className={formErrors.description ? "input-error" : ""} />
        {formErrors.description && <span className="field-error">{formErrors.description}</span>}

        {/* Clasificación + banco */}
        <div className="mov-row-2">
          <div>
            <label className="mov-field-label">{isIncome ? "Tipo de ingreso" : "Tipo de gasto"}</label>
            <select value={form.classification} onChange={(e) => updateForm("classification", e.target.value)}>
              {isIncome ? (
                <><option>Servicios</option><option>Productos</option><option>Otros ingresos</option></>
              ) : (
                <><option>Gasto fijo</option><option>Gasto variable</option><option>Inversión de negocio</option></>
              )}
            </select>
          </div>
          <div>
            <label className="mov-field-label">Cuenta</label>
            <select value={form.bank} onChange={(e) => updateForm("bank", e.target.value)}>
              {banks.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {/* Categoría (conectada a fuentes de ingreso) + fecha */}
        <div className="mov-row-2">
          <div>
            <label className="mov-field-label">{isIncome ? "Fuente de ingreso" : "Categoría del gasto"}</label>
            <select value={form.category} onChange={(e) => updateForm("category", e.target.value)}
              className={formErrors.category ? "input-error" : ""}>
              <option value="" disabled>Selecciona...</option>
              {categoryOptions.map(c => <option key={c}>{c}</option>)}
              <option value="Otro">Otro…</option>
            </select>
          </div>
          <div>
            <label className="mov-field-label">Fecha</label>
            <input type="date" value={form.date} onChange={(e) => updateForm("date", e.target.value)} />
          </div>
        </div>
        {form.category === "Otro" && (
          <input placeholder={isIncome ? "¿De dónde vino este ingreso?" : "¿En qué se fue este gasto?"}
            value={form.categoryOther} onChange={(e) => updateForm("categoryOther", e.target.value)} />
        )}
        {isIncome && categoryOptions.length === 0 && (
          <p className="helper-copy" style={{margin:0}}>Aún no tienes fuentes de ingreso configuradas — usa "Otro" o agrega una abajo en "Mis fuentes de ingreso".</p>
        )}
        {formErrors.category && <span className="field-error">{formErrors.category}</span>}

        <button className={`primary-button mov-submit${isIncome ? " mov-submit-in" : " mov-submit-ex"}`} type="submit">
          {isIncome ? "Registrar ingreso ↑" : "Registrar gasto ↓"}
        </button>
      </form>
    );
  }

  function BanksCard() {
    return (
      <div className="card banks-card">
        <h3>Mis bancos</h3>
        <form className="bank-form" onSubmit={addBank}>
          <input placeholder="Agregar banco o billetera" value={newBank} onChange={(event) => setNewBank(event.target.value)} />
          <button className="primary-button" type="submit">Agregar</button>
        </form>
        <div className="bank-list">
          {banks.map((bank) => (
            <span key={bank} className="bank-chip">
              {bank}
              <button type="button" className="bank-remove" onClick={() => removeBank(bank)}>×</button>
            </span>
          ))}
        </div>
      </div>
    );
  }



  function ReinvestmentCard() {
    return (
      <div className="card reinvestment-card">
        <h3>Calculadora de reinversión</h3>
        <div className="reinvestment-amount">
          <span>Reserva sugerida</span>
          <strong>{money.format(reinvestmentAmount)}</strong>
          <small>{reinvestmentPercent}% de {money.format(totals.income)} en ventas</small>
        </div>
        <label className="range-field">
          <span>Porcentaje a reinvertir</span>
          <b>{reinvestmentPercent}%</b>
          <input type="range" min="0" max="50" value={reinvestmentPercent} onChange={(event) => updateBusinessSetting("reinvestmentPercent", event.target.value)} />
        </label>
        <input className="percent-input" type="number" min="0" max="100" value={reinvestmentPercent} onChange={(event) => updateBusinessSetting("reinvestmentPercent", event.target.value)} />
        <p className="helper-copy">Usa esta reserva primero en marketing medible: anuncios, contenido que vende, email list o herramientas que traen clientes. No la mezcles con gustos personales del día.</p>
      </div>
    );
  }

  function DashboardSummaryCard() {
    return (
      <div className="card summary-card">
        <h3>Resumen desde tus pestañas</h3>
        <div className="summary-row"><span>Clientes</span><strong>{followUpClients.length}</strong><small>requieren seguimiento</small></div>
        <div className="summary-row"><span>Contenido</span><strong>{contentItems.length - publishedContent}</strong><small>piezas por mover</small></div>
        <div className="summary-row"><span>Hogar</span><strong>{pendingHomeTasks.length}</strong><small>pendientes visibles</small></div>
        <div className="summary-row"><span>Mejor ingreso</span><strong>{topIncomeSource?.category || "Sin datos"}</strong><small>{topIncomeSource?.description || "Registra ventas"}</small></div>
        <div className="summary-row"><span>ánimo</span><strong>{purpose.mood}</strong><small>La semana pasada te sentiste así. Esta semana puede ser más liviana.</small></div>
        <div className="summary-row"><span>Ventas cerradas</span><strong>{money.format(wonSalesTotal)}</strong><small>Registradas en clientes ganadas</small></div>
        <div className="summary-row"><span>Presupuesto hogar</span><strong>{money.format(homeAvailable)}</strong><small>Disponible despuás de gastos y deudas</small></div>
      </div>
    );
  }

  function MovementList({ compact = false } = {}) {
    return (
      <div className={`card movement-card ${compact ? "compact" : ""}`}>
        <h3>Últimos movimientos</h3>
        {sortedMovements.slice(0, 10).map((movement) => (
          <div className="movement-row" key={movement.id}>
            <span className={movement.type}>{movement.type === "income" ? "+" : "-"}</span>
            <div>
              <strong>{movement.description}</strong>
              <small>{movement.classification} • {movement.category} • {movement.bank || "Sin banco"}</small>
              <small>Fecha: {formatShortDate(movement.date || movement.createdAt)}</small>
            </div>
            <input className="movement-date-input" type="date" value={inputDateFromValue(movement.date || movement.createdAt)} onChange={(event) => updateMovementDate(movement.id, event.target.value)} aria-label={`Fecha de ${movement.description}`} />
            <b>{money.format(movement.amount)}</b>
            <button className="row-delete" type="button" onClick={() => confirmDelete("¿Eliminar este movimiento?", () => setMovements((current) => current.filter((item) => item.id !== movement.id)))}>×</button>
          </div>
        ))}
      </div>
    );
  }

  function CalendarCard() {
    return <div className="card calendar-card"><h3>Calendario de la semana</h3><small className="helper-copy">Semana actual</small>{weekDays.map((day) => <div className="calendar-row" key={day}><span>{day}</span><p>×</p></div>)}</div>;
  }

  function renderWeeklyReport() {
    // Calcular rango de fechas de la semana
    const getWeekRange = (offset) => {
      const today = new Date();
      const currentDay = today.getDay();
      const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset + (offset * 7));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { start: monday.getTime(), end: sunday.getTime(), monday, sunday };
    };

    const currentWeek = getWeekRange(reportWeekOffset);
    const previousWeek = getWeekRange(reportWeekOffset - 1);

    const formatDateRange = (start, end) => {
      const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      const startD = new Date(start);
      const endD = new Date(end);
      return `${startD.getDate()} ${months[startD.getMonth()]} - ${endD.getDate()} ${months[endD.getMonth()]}`;
    };

    // Filtrar datos por semana actual
    const isInWeek = (timestamp, week) => timestamp >= week.start && timestamp <= week.end;

    const currentMovements = sortedMovements.filter((m) => isInWeek(timestampFromInputDate(m.date || m.createdAt), currentWeek));
    const previousMovements = sortedMovements.filter((m) => isInWeek(timestampFromInputDate(m.date || m.createdAt), previousWeek));

    const currentClients = clients.filter((c) => c.createdAt && isInWeek(c.createdAt, currentWeek));

    const currentIncome = currentMovements.filter((m) => m.type === "income").reduce((sum, m) => sum + m.amount, 0);
    const previousIncome = previousMovements.filter((m) => m.type === "income").reduce((sum, m) => sum + m.amount, 0);
    const incomeChange = previousIncome > 0 ? Math.round(((currentIncome - previousIncome) / previousIncome) * 100) : 0;
    const currentExpenses = currentMovements.filter((m) => m.type === "expense").reduce((sum, m) => sum + m.amount, 0);
    const currentProfit = currentIncome - currentExpenses;

    const currentWon = clients.filter((c) => c.status === "Venta ganada" && isInWeek(timestampFromInputDate(c.updatedAt || c.lastContact || c.createdAt), currentWeek)).length;
    const previousWon = clients.filter((c) => c.status === "Venta ganada" && isInWeek(timestampFromInputDate(c.updatedAt || c.lastContact || c.createdAt), previousWeek)).length;
    const wonChange = previousWon > 0 ? Math.round(((currentWon - previousWon) / previousWon) * 100) : 0;

    const currentContactsThisWeek = Object.values(contactLog).filter((e) => {
      const contactDate = timestampFromInputDate(e.date);
      return contactDate >= currentWeek.start && contactDate <= currentWeek.end;
    }).length;

    const previousContactsCount = Object.values(contactLog).filter((e) => {
      const contactDate = timestampFromInputDate(e.date);
      return contactDate >= previousWeek.start && contactDate <= previousWeek.end;
    }).length;

    const contactsChange = previousContactsCount > 0 ? Math.round(((currentContactsThisWeek - previousContactsCount) / previousContactsCount) * 100) : 0;

    // Datos generales (no filtrados por semana)
    const totalLeads = clients.length;
    const totalWon = clients.filter((c) => c.status === "Venta ganada").length;
    const conversionRate = totalLeads > 0 ? Math.round((totalWon / totalLeads) * 100) : 0;
    const hotLeads = clients.filter((c) => c.status === "Lead caliente").length;
    const homeProgress = homeTasks.length ? Math.round((completedHomeTasks / homeTasks.length) * 100) : 0;
    const selfCareScore = [purpose.water, purpose.walk, purpose.silence, purpose.devotional].filter(Boolean).length;
    const incomePerHour = purpose.hoursWorked > 0 ? Math.round(totals.income / purpose.hoursWorked) : 0;
    const salesGoalProgress = salesGoal > 0 ? Math.min(Math.round((wonSalesTotal / salesGoal) * 100), 100) : 0;

    // Insights automáticos
    const insights = [];

    // Mejor día de ingresos
    const incomeByDay = {};
    currentMovements.filter((m) => m.type === "income").forEach((m) => {
      const movementDay = parseDateValue(m.date || m.createdAt) || new Date();
      const day = movementDay.toLocaleDateString('es', { weekday: 'long' });
      incomeByDay[day] = (incomeByDay[day] || 0) + m.amount;
    });
    const bestDay = Object.entries(incomeByDay).sort((a, b) => b[1] - a[1])[0];
    if (bestDay) {
      insights.push(`Tu mejor día fue ${bestDay[0]} con ${money.format(bestDay[1])} en ingresos.`);
    }

    // Mejor fuente de leads
    const weekSourceCounts = currentClients.reduce((acc, c) => {
      const src = c.source || "Sin fuente";
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {});
    const topSource = Object.entries(weekSourceCounts).sort((a, b) => b[1] - a[1])[0];
    if (topSource && topSource[1] > 0) {
      const percentage = Math.round((topSource[1] / currentClients.length) * 100);
      insights.push(`${topSource[0]} trajo ${percentage}% de tus leads esta semana.`);
    }

    // Tendencia de contactos
    if (currentContactsThisWeek >= 5) {
      insights.push(`Excelente ritmo de contactos: ${currentContactsThisWeek} esta semana.`);
    } else if (currentContactsThisWeek < 3) {
      insights.push(`Solo ${currentContactsThisWeek} contactos esta semana. Meta: 5+ para mantener el pipeline activo.`);
    }

    // Alertas urgentes
    const urgentAlerts = [];
    if (currentIncome < weeklyGoal * 0.5 && reportWeekOffset === 0) {
      urgentAlerts.push({ type: "danger", message: `Ingresos por debajo del 50% de la meta semanal (${money.format(currentIncome)} de ${money.format(weeklyGoal)})` });
    }
    if (currentContactsThisWeek < 3 && reportWeekOffset === 0) {
      urgentAlerts.push({ type: "warning", message: `Solo ${currentContactsThisWeek} contactos esta semana. Necesitas acelerar el seguimiento.` });
    }
    if (hotLeads >= 3 && reportWeekOffset === 0) {
      urgentAlerts.push({ type: "success", message: `Tienes ${hotLeads} leads calientes esperando. ¿Es momento de cerrar ventas!` });
    }

    const whatsappMsg = (client) => {
      const msgs = {
        "Lead frio": `Hola ${client.name}! 👋 Quería retomar el contacto contigo. ¿Sigues interesada en ${client.service}? Con gusto te cuento más.`,
        "Lead tibio": `Hola ${client.name}! 👋 Estaba pensando en ti. ¿Cómo vas? Me encantaría contarte sobre ${client.service} y cómo puede ayudarte.`,
        "Lead caliente": `Hola ${client.name}! 👋 Quería hacer seguimiento a nuestra conversación sobre ${client.service}. ¿Tienes 5 minutos para hablar hoy?`,
        "Venta ganada": `Hola ${client.name}! 👋 ¿Cómo vas con ${client.service}? Quería saber cómo te ha ido y si tienes alguna pregunta.`
      };
      return encodeURIComponent(msgs[client.status] || `Hola ${client.name}, quería hacer seguimiento sobre ${client.service}.`);
    };

    const urgentFollowUps = clients
      .filter((c) => c.status !== "Venta ganada")
      .sort((a, b) => {
        const score = { "Lead caliente": 3, "Lead tibio": 2, "Lead frio": 1 };
        return (score[b.status] || 0) - (score[a.status] || 0);
      })
      .slice(0, 5);

    const sourceCounts = clients.reduce((acc, c) => {
      const src = c.source || "Sin fuente";
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {});

    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Reporte semanal</h2>
          <div style={{display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
            <button type="button" onClick={() => setReportWeekOffset(reportWeekOffset - 1)}
              style={{border:"1px solid var(--line)",background:"#fff",borderRadius:"8px",padding:"6px 12px",cursor:"pointer",fontSize:"13px",fontWeight:700}}>? Anterior</button>
            <span style={{fontSize:"14px",fontWeight:700,color:"var(--purple)"}}>{formatDateRange(currentWeek.start, currentWeek.end)}</span>
            <button type="button" onClick={() => setReportWeekOffset(reportWeekOffset + 1)} disabled={reportWeekOffset >= 0}
              style={{border:"1px solid var(--line)",background:reportWeekOffset >= 0 ? "#f5f5f5" : "#fff",borderRadius:"8px",padding:"6px 12px",cursor:reportWeekOffset >= 0 ? "not-allowed" : "pointer",fontSize:"13px",fontWeight:700,opacity:reportWeekOffset >= 0 ? 0.5 : 1}}>Siguiente ?</button>
            {reportWeekOffset !== 0 && (
              <button type="button" onClick={() => setReportWeekOffset(0)}
                style={{border:"1px solid var(--purple)",background:"var(--purple-soft)",color:"var(--purple)",borderRadius:"8px",padding:"6px 12px",cursor:"pointer",fontSize:"13px",fontWeight:700}}>Semana actual</button>
            )}
          </div>
        </div>

        {/* Alertas urgentes */}
        {urgentAlerts.length > 0 && (
          <div style={{display:"grid",gap:"10px",marginBottom:"20px"}}>
            {urgentAlerts.map((alert, i) => (
              <div key={i} className={`alert-banner alert-${alert.type === "danger" ? "red" : alert.type === "warning" ? "orange" : "green"}`}
                style={{fontSize:"15px",fontWeight:700,padding:"16px 20px"}}>
                {alert.type === "danger" && "🚨 "}{alert.type === "warning" && "⚠️ "}{alert.type === "success" && "✅ "}
                {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Resumen ejecutivo de 30 segundos */}
        <div className="card" style={{background:"linear-gradient(135deg, rgba(212,104,122,0.08), rgba(201,169,110,0.08))",border:"2px solid var(--purple)",marginBottom:"20px",padding:"24px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
            <span style={{fontSize:"32px"}}>?</span>
            <h3 style={{margin:0,fontSize:"22px",color:"var(--purple)"}}>Resumen ejecutivo • 30 segundos</h3>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:"20px",marginBottom:"16px"}}>
            <div>
              <p style={{margin:"0 0 4px",fontSize:"13px",color:"var(--muted)",fontWeight:800,textTransform:"uppercase"}}>Ingresos esta semana</p>
              <div style={{display:"flex",alignItems:"baseline",gap:"8px"}}>
                <strong style={{fontSize:"32px",color:"var(--green)",lineHeight:1}}>{money.format(currentIncome)}</strong>
                {incomeChange !== 0 && (
                  <span style={{fontSize:"16px",fontWeight:700,color:incomeChange > 0 ? "var(--green)" : "var(--pink)"}}>
                    {incomeChange > 0 ? "?" : "?"} {Math.abs(incomeChange)}%
                  </span>
                )}
              </div>
            </div>
            <div>
              <p style={{margin:"0 0 4px",fontSize:"13px",color:"var(--muted)",fontWeight:800,textTransform:"uppercase"}}>Ventas cerradas</p>
              <div style={{display:"flex",alignItems:"baseline",gap:"8px"}}>
                <strong style={{fontSize:"32px",color:"var(--purple)",lineHeight:1}}>{currentWon}</strong>
                {wonChange !== 0 && (
                  <span style={{fontSize:"16px",fontWeight:700,color:wonChange > 0 ? "var(--green)" : "var(--pink)"}}>
                    {wonChange > 0 ? "?" : "?"} {Math.abs(wonChange)}%
                  </span>
                )}
              </div>
            </div>
            <div>
              <p style={{margin:"0 0 4px",fontSize:"13px",color:"var(--muted)",fontWeight:800,textTransform:"uppercase"}}>Contactos realizados</p>
              <div style={{display:"flex",alignItems:"baseline",gap:"8px"}}>
                <strong style={{fontSize:"32px",color:"var(--orange)",lineHeight:1}}>{currentContactsThisWeek}</strong>
                {contactsChange !== 0 && (
                  <span style={{fontSize:"16px",fontWeight:700,color:contactsChange > 0 ? "var(--green)" : "var(--pink)"}}>
                    {contactsChange > 0 ? "?" : "?"} {Math.abs(contactsChange)}%
                  </span>
                )}
              </div>
            </div>
          </div>
          {insights.length > 0 && (
            <div style={{borderTop:"1px solid var(--line)",paddingTop:"16px"}}>
              <p style={{margin:"0 0 10px",fontSize:"13px",fontWeight:800,textTransform:"uppercase",color:"var(--purple)"}}>💡 Insights clave</p>
              {insights.map((insight, i) => (
                <p key={i} style={{margin:"6px 0",fontSize:"14px",lineHeight:1.6,color:"var(--ink)"}}>• {insight}</p>
              ))}
            </div>
          )}
        </div>

        {/* Meta de ventas del mes */}
        <div className="card" style={{marginBottom:"14px",display:"grid",gap:"12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"12px"}}>
            <div>
              <h3 style={{margin:0}}>🎯 Meta de ventas del mes</h3>
              <p className="helper-copy" style={{marginTop:"4px"}}>{money.format(wonSalesTotal)} cerrados de {money.format(salesGoal || monthlyGoal)} meta</p>
            </div>
            <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
              <span style={{fontSize:"13px",color:"var(--muted)"}}>Meta:</span>
              <MoneyAmountInput value={salesGoal || ""} placeholder={money.format(monthlyGoal)}
                onChange={(v) => setSalesGoal(Number(v) || 0)}
                className="sales-goal-input" />
            </div>
          </div>
          <Progress value={salesGoalProgress} tone="green" />
          <div style={{display:"flex",justifyContent:"space-between",fontSize:"13px",color:"var(--muted)"}}>
            <span>{salesGoalProgress}% completado</span>
            <span>Faltan {money.format(Math.max(0, (salesGoal || monthlyGoal) - wonSalesTotal))}</span>
          </div>
        </div>

        <div className="purpose-sections">
          {/* Resumen ventas */}
          <div className="card purpose-block">
            <h3>💰 Ventas esta semana</h3>
            <div className="purpose-stat"><span>Ingresos registrados</span><strong>{money.format(currentIncome)}</strong></div>
            <div className="purpose-stat"><span>Utilidad</span><strong style={{color: currentProfit >= 0 ? "var(--green)" : "var(--pink)"}}>{money.format(currentProfit)}</strong></div>
            {(() => {
              const totalFees = incomeSources.reduce((sum, src) => {
                const actual = currentMovements.filter((m) => m.type === "income" && m.classification === src.name).reduce((s, m) => s + m.amount, 0);
                return sum + calcFee(actual, src.platform);
              }, 0);
              if (totalFees === 0) return null;
              return (
                <>
                  <div className="purpose-stat"><span>Fees de plataformas</span><strong style={{color:"var(--pink)"}}>-{money.format(totalFees)}</strong></div>
                  <div className="purpose-stat"><span>Ingreso neto real</span><strong style={{color:"var(--green)"}}>{money.format(currentIncome - totalFees)}</strong></div>
                </>
              );
            })()}
            <div className="purpose-stat"><span>Ventas cerradas</span><strong>{totalWon} clientes</strong></div>
            <div className="purpose-stat"><span>Tasa de conversión</span><strong>{conversionRate}%</strong></div>
            <div className="purpose-stat"><span>Leads calientes ahora</span><strong>{hotLeads}</strong></div>
            <div className="purpose-stat"><span>Contactos realizados</span><strong style={{color:"var(--green)"}}>{contactsThisWeek} esta semana</strong></div>
            <ProgressLabel label="Meta contactos (5)" value={Math.min(Math.round((contactsThisWeek/5)*100),100)} tone="green" />
            {incomePerHour > 0 && <div className="purpose-stat"><span>Ingreso por hora</span><strong>{money.format(incomePerHour)}</strong></div>}
            <div className="weekly-movement-list">
              <small>Movimientos de la semana</small>
              {currentMovements.slice(0, 4).map((movement) => (
                <span key={movement.id}>
                  {formatShortDate(movement.date || movement.createdAt)} • {movement.description} • {movement.type === "income" ? "+" : "-"}{money.format(movement.amount)}
                </span>
              ))}
              {currentMovements.length === 0 && <span>Sin movimientos registrados en esta semana.</span>}
            </div>
          </div>

          {/* Recordatorios WhatsApp */}
          <div className="card purpose-block">
            <h3>📲 Recordatorios de seguimiento</h3>
            <p className="helper-copy">Toca el botón para abrir WhatsApp con el mensaje listo.</p>
            {urgentFollowUps.length === 0 && <p className="helper-copy">No hay leads activos por seguir.</p>}
            {urgentFollowUps.map((client) => (
              <div key={client.id} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"8px",alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--line)"}}>
                <div>
                  <strong style={{fontSize:"14px"}}>{client.name}</strong>
                  <small style={{display:"block",color:"var(--muted)"}}>{client.status} • {client.nextAction || "Hacer seguimiento"}</small>
                </div>
                <a href={`https://wa.me/?text=${whatsappMsg(client)}`} target="_blank" rel="noreferrer"
                  style={{display:"inline-flex",alignItems:"center",gap:"6px",padding:"8px 12px",borderRadius:"8px",background:"#25d366",color:"#fff",fontSize:"12px",fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>
                  💬 WhatsApp
                </a>
              </div>
            ))}
          </div>

          {/* Hogar */}
          <div className="card purpose-block">
            <h3>🌸 Hogar esta semana</h3>
            <div className="purpose-stat"><span>Tareas completadas</span><strong>{completedHomeTasks}/{homeTasks.length}</strong></div>
            <ProgressLabel label="Progreso hogar" value={homeProgress} tone="orange" />
            <div className="purpose-stat"><span>Disponible familiar</span><strong>{money.format(homeAvailable)}</strong></div>
            <div className="purpose-stat"><span>Días de presencia</span><strong>{Object.values(purpose.familyDays || {}).filter(Boolean).length} días</strong></div>
          </div>

          {/* Energía */}
          <div className="card purpose-block">
            <h3>✨ Energía y bienestar</h3>
            <div className="purpose-stat"><span>ánimo de la semana</span><strong>{purpose.mood}</strong></div>
            <div className="purpose-stat"><span>Nivel de energía</span><strong>{purpose.energy}</strong></div>
            <ProgressLabel label="Autocuidado" value={Math.round((selfCareScore / 4) * 100)} tone="green" />
            <div className="purpose-stat"><span>Horas trabajadas</span><strong>{purpose.hoursWorked || 0}h</strong></div>
            <div className="purpose-stat"><span>Momentos de conexión</span><strong>{purpose.connectionMoments || 0}</strong></div>
          </div>

          {/* Fuentes de origen */}
          <div className="card purpose-block purpose-block-wide">
            <h3>📊 ¿De dónde vienen tus clientes?</h3>
            <p className="helper-copy">Invierte tu tiempo donde más resultado produce.</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"10px",marginTop:"8px"}}>
              {Object.entries(sourceCounts).sort((a,b) => b[1]-a[1]).map(([src, count]) => (
                <div key={src} style={{border:"1px solid var(--line)",borderRadius:"12px",padding:"14px",textAlign:"center",background:"rgba(255,255,255,0.8)"}}>
                  <strong style={{fontSize:"28px",color:"#6f2f4b",display:"block"}}>{count}</strong>
                  <small style={{color:"var(--muted)"}}>{src}</small>
                  <div style={{marginTop:"6px"}}><Progress value={Math.round((count/totalLeads)*100)} tone="purple" /></div>
                  <small style={{color:"var(--muted)"}}>{Math.round((count/totalLeads)*100)}%</small>
                </div>
              ))}
              {Object.keys(sourceCounts).length === 0 && <p className="helper-copy">Agrega clientes con fuente de origen para ver este análisis.</p>}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderPricing() {
    const isYearly = pricingCycle === "yearly";
    const plans = [
      { id: "mama", name: "🌸 Mamá", price: PLAN_PRICES.mama.cop,
        priceUsd: PLAN_PRICES.mama.usd,
        desc: "Para la mamá que quiere que el hogar funcione sin depender de su memoria.",
        forYou: "¿Para ti si...? Manejas casa, familia y poco tiempo.",
        features: [
          "Tareas del hogar y la familia — nunca más se te olvida nada",
          "Presupuesto familiar: siempre sabes en qué se va el dinero",
          "Check-in de bienestar: 3 minutos al día solo para ti",
          "Calendario y recordatorios: citas, pagos y eventos en un lugar",
        ] },
      { id: "emprendedora", name: "💼 Emprendedora", price: PLAN_PRICES.emprendedora.cop,
        priceUsd: PLAN_PRICES.emprendedora.usd,
        badge: "MÁS POPULAR",
        desc: "Para la mamá que tiene un negocio y necesita que las dos vidas quepan en un día.",
        forYou: "¿Para ti si...? Vendes, atiendes clientes y también eres mamá.",
        features: [
          "Todo lo del plan Mamá incluido",
          "Ingresos y gastos del negocio — siempre al día",
          "Pipeline de clientes: sabes quién está lista para comprar",
          "Meta de ventas mensual con seguimiento en tiempo real",
          "Descubre de dónde vienen tus clientes más rentables",
          "Planificación de contenido para redes sin improvisar",
          "Hasta 60 publicaciones al mes creadas con IA en minutos",
          "Agenda de citas de tu negocio integrada con el hogar",
          "Soporte en menos de 48 horas",
        ] },
      { id: "ceo", name: "👑 Mamá CEO", price: PLAN_PRICES.ceo.cop,
        priceUsd: PLAN_PRICES.ceo.usd,
        desc: "Para la mamá que quiere saber exactamente hacia dónde va su negocio, sin límites.",
        forYou: "¿Para ti si...? Tu negocio crece y necesitas datos, no suposiciones.",
        features: [
          "Todo lo anterior, absolutamente sin límites",
          "Hasta 200 publicaciones al mes con IA",
          "Exporta todos tus registros a Excel cuando quieras",
          "Proyecciones: sabe cuánto vas a ganar antes de que llegue el dinero",
          "Rentabilidad real de tu negocio — sin fórmulas complicadas",
          "Temporizador Pomodoro para trabajar enfocada sin distracciones",
          "Acceso anticipado a cada nueva función",
          "Soporte en menos de 24 horas",
        ] },
    ];
    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Elige tu plan</h2>
          <p>Empieza gratis 14 días · Sin tarjeta · Sin compromiso · Cancela cuando quieras</p>
        </div>

        {/* Toggle mensual / anual */}
        <div style={{display:"flex",justifyContent:"center",marginBottom:"32px"}}>
          <div style={{display:"inline-flex",background:"var(--surface,#f5f5f5)",borderRadius:"40px",padding:"4px",gap:"4px"}}>
            <button onClick={()=>setPricingCycle("monthly")} style={{padding:"10px 28px",borderRadius:"40px",border:"none",fontWeight:600,fontSize:"14px",cursor:"pointer",background:!isYearly?"#fff":"transparent",color:!isYearly?"var(--pink)":"var(--muted)",boxShadow:!isYearly?"0 2px 8px rgba(0,0,0,0.10)":"none",transition:"all 0.2s"}}>Mensual</button>
            <button onClick={()=>setPricingCycle("yearly")} style={{padding:"10px 28px",borderRadius:"40px",border:"none",fontWeight:600,fontSize:"14px",cursor:"pointer",background:isYearly?"#fff":"transparent",color:isYearly?"var(--pink)":"var(--muted)",boxShadow:isYearly?"0 2px 8px rgba(0,0,0,0.10)":"none",transition:"all 0.2s",display:"flex",alignItems:"center",gap:"8px"}}>
              Anual <span style={{background:"var(--pink)",color:"#fff",fontSize:"11px",fontWeight:700,padding:"2px 8px",borderRadius:"20px"}}>2 meses gratis</span>
            </button>
          </div>
        </div>

        {paymentMessage&&(
          <div style={{maxWidth:"900px",margin:"0 auto 24px",padding:"14px 20px",borderRadius:"12px",background:paymentMessage.type==="success"?"#ecfdf5":"#fef2f2",border:`1px solid ${paymentMessage.type==="success"?"#86efac":"#fca5a5"}`,color:paymentMessage.type==="success"?"#166534":"#991b1b",fontSize:"15px",fontWeight:600,display:"flex",alignItems:"center",gap:"12px"}}>
            <span style={{fontSize:"22px"}}>{paymentMessage.type==="success"?"✅":"❌"}</span>
            <span style={{flex:1}}>{paymentMessage.text}</span>
            <button onClick={()=>setPaymentMessage(null)} style={{border:"none",background:"none",fontSize:"20px",cursor:"pointer",color:"inherit",opacity:0.6,lineHeight:1,padding:"2px"}}>×</button>
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:window.innerWidth<700?"1fr":"repeat(3,1fr)",gap:"16px",maxWidth:"960px",margin:"0 auto"}}>
          {plans.map((plan) => {
            const isCurrent = effectivePlan===plan.id||(plan.id==="ceo"&&effectivePlan==="premium")||(plan.id==="mama"&&userMode==="mama"&&effectivePlan==="emprendedora");
            return (
              <div key={plan.id} className="card" style={{border:`2px solid ${isCurrent?"var(--pink)":"var(--line)"}`,background:"#fff",position:"relative",borderRadius:"16px"}}>
                {isCurrent&&<div style={{position:"absolute",top:"-12px",left:"50%",transform:"translateX(-50%)",background:"var(--pink)",color:"#fff",padding:"4px 16px",borderRadius:"20px",fontSize:"12px",fontWeight:700,whiteSpace:"nowrap"}}>Tu plan actual ✓</div>}
                {plan.badge&&!isCurrent&&<div style={{position:"absolute",top:"-12px",left:"50%",transform:"translateX(-50%)",background:"var(--purple)",color:"#fff",padding:"4px 16px",borderRadius:"20px",fontSize:"12px",fontWeight:700,whiteSpace:"nowrap"}}>{plan.badge}</div>}
                <div style={{padding:"24px 20px"}}>
                  <h3 style={{margin:"0 0 4px",fontSize:"18px",color:"var(--ink)",fontWeight:700}}>{plan.name}</h3>
                  <p style={{margin:"0 0 8px",fontSize:"13px",color:"var(--muted)",lineHeight:1.5}}>{plan.desc}</p>
                  {plan.forYou && <p style={{margin:"0 0 14px",fontSize:"12px",color:"var(--purple)",fontWeight:600,lineHeight:1.4,fontStyle:"italic"}}>{plan.forYou}</p>}
                  <div style={{marginBottom:"16px"}}>
                    <span style={{fontSize:"30px",fontWeight:800,color:"var(--ink)"}}>{isYearly ? PLAN_PRICES[plan.id].copYear : plan.price}</span>
                    <span style={{fontSize:"14px",color:"var(--muted)",marginLeft:"4px"}}>{isYearly?"COP/año":"COP/mes"}</span>
                    <div style={{fontSize:"12px",color:"var(--muted)",marginTop:"2px"}}>{isYearly ? PLAN_PRICES[plan.id].usdYear : plan.priceUsd} USD</div>
                  </div>
                  <div style={{display:"grid",gap:"8px",marginBottom:"20px"}}>
                    {plan.features.map((f)=>(<div key={f} style={{display:"flex",alignItems:"flex-start",gap:"8px",fontSize:"13px",lineHeight:1.4}}><span style={{color:"var(--pink)",flexShrink:0,marginTop:"1px"}}>✓</span><span style={{color:"var(--ink)"}}>{f}</span></div>))}
                  </div>

                  {isCurrent?(
                    <div style={{padding:"12px",background:"#fdf2f4",borderRadius:"10px",textAlign:"center",color:"var(--pink)",fontWeight:700,fontSize:"14px"}}>Tu plan actual ✓</div>
                  ):(
                    <>
                      <button
                        onClick={()=>window.open(isYearly ? HOTMART_LINKS_YEAR[plan.id] : HOTMART_LINKS[plan.id],"_blank")}
                        style={{width:"100%",padding:"13px 0",borderRadius:"10px",border:"none",background:"var(--pink)",color:"#fff",fontWeight:700,fontSize:"15px",cursor:"pointer",transition:"opacity 0.2s"}}
                      >
                        Empezar gratis 14 días →
                      </button>
                      <p style={{margin:"8px 0 0",fontSize:"11px",color:"var(--muted)",textAlign:"center"}}>Sin tarjeta · Cancela cuando quieras</p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="card" style={{maxWidth:"1000px",margin:"28px auto 0",padding:"24px"}}>
          <h3 style={{margin:"0 0 16px"}}>Tu uso actual • Plan {effectivePlan==="free"?"Gratis":effectivePlan==="mama"?"Mamá Organizada":effectivePlan==="emprendedora"?"Emprendedora":"CEO"}</h3>
          <div style={{display:"grid",gap:"14px"}}>
            {[{label:"Movimientos",used:movements.length,limit:currentLimits.movements},{label:"Clientes",used:clients.length,limit:currentLimits.clients},{label:"Contenidos",used:contentItems.length,limit:currentLimits.content},{label:"Tareas hogar",used:homeTasks.length,limit:currentLimits.homeTasks}].map(({label,used,limit})=>(
              <div key={label}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px",fontSize:"14px"}}><span>{label}</span><span><strong>{used}</strong> / {limit===Infinity?"8":limit}</span></div>
                <Progress value={limit===Infinity?0:Math.min(Math.round((used/limit)*100),100)} tone={limit!==Infinity&&used>=limit?"pink":"green"} />
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{maxWidth:"1000px",margin:"20px auto 0",padding:"24px",border:"2px dashed var(--line)"}}>
          <h3 style={{margin:"0 0 8px"}}>🔑 ¿Tienes un código de acceso beta?</h3>
          <p style={{margin:"0 0 16px",color:"var(--muted)",fontSize:"14px"}}>Si eres parte de la incubadora o de UMP Academy, revisa tu correo de bienvenida — tienes un código de acceso CEO gratis.</p>
          {!showBetaInput?(
            <button className="primary-button" style={{padding:"10px 24px"}} onClick={()=>setShowBetaInput(true)}>Tengo un código</button>
          ):(
            <form onSubmit={activateBetaCode} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"10px",maxWidth:"480px"}}>
              <input placeholder="Ingresa tu código de acceso" value={betaCode} onChange={(e)=>setBetaCode(e.target.value)} style={{minHeight:"44px",border:"1px solid var(--line)",borderRadius:"10px",padding:"0 14px",font:"inherit"}} autoFocus />
              <button className="primary-button" type="submit" style={{padding:"0 20px"}}>Activar</button>
              {betaCodeError&&<p style={{gridColumn:"1/-1",margin:0,color:"var(--purple)",fontSize:"13px",fontWeight:700}}>{betaCodeError}</p>}
            </form>
          )}
          {isBetaUser&&(
            <div style={{marginTop:"16px",padding:"12px 16px",background:"var(--green-soft)",borderRadius:"10px",color:"#1a5c3a",fontWeight:700,fontSize:"14px"}}>
              ✅ Código activo • Plan CEO gratis por {betaDaysLeft ?? "..."} días más
            </div>
          )}
        </div>
      </section>
    );
  }

  // ---- FIN renderPricing ----
  function _renderPricingOLD_PLACEHOLDER() {
    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Planes y Precios</h2>
          <p>Elige el plan que mejor se adapte a tu negocio</p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:"24px",maxWidth:"900px",margin:"0 auto"}}>
          {/* Plan Gratis */}
          <div className="card" style={{border: userPlan === "free" ? "2px solid var(--purple)" : "1px solid var(--line)",position:"relative"}}>
            {userPlan === "free" && (
              <div style={{position:"absolute",top:"-12px",left:"50%",transform:"translateX(-50%)",background:"var(--purple)",color:"#fff",padding:"4px 16px",borderRadius:"20px",fontSize:"12px",fontWeight:800}}>PLAN ACTUAL</div>
            )}
            <div style={{padding:"24px"}}>
              <h3 style={{margin:"0 0 8px",fontSize:"24px"}}>Plan Gratis</h3>
              <div style={{fontSize:"36px",fontWeight:800,color:"var(--purple)",lineHeight:1,marginBottom:"8px"}}>$0</div>
              <p style={{fontSize:"14px",color:"var(--muted)",marginBottom:"24px"}}>Perfecto para empezar</p>
              
              <div style={{display:"grid",gap:"12px",marginBottom:"24px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--green)",fontSize:"18px"}}>?</span>
                  <span>{PLAN_LIMITS.free.movements} movimientos financieros/mes</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--green)",fontSize:"18px"}}>?</span>
                  <span>{PLAN_LIMITS.free.clients} clientes</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--green)",fontSize:"18px"}}>?</span>
                  <span>{PLAN_LIMITS.free.content} contenidos/mes</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--green)",fontSize:"18px"}}>?</span>
                  <span>{PLAN_LIMITS.free.homeTasks} tareas del hogar/mes</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--green)",fontSize:"18px"}}>?</span>
                  <span>Sincronización en la nube</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--green)",fontSize:"18px"}}>?</span>
                  <span>Todas las funcionalidades básicas</span>
                </div>
              </div>
              
              {userPlan === "free" ? (
                <div style={{padding:"12px",background:"var(--purple-soft)",borderRadius:"8px",textAlign:"center",color:"var(--purple)",fontWeight:700}}>Plan actual</div>
              ) : (
                <button className="primary-button" onClick={() => setUserPlan("free")} style={{width:"100%"}}>Cambiar a gratis</button>
              )}
            </div>
          </div>

          {/* Plan Premium */}
          <div className="card" style={{border: userPlan === "premium" ? "2px solid var(--purple)" : "2px solid var(--purple)",background:"linear-gradient(135deg, rgba(212,104,122,0.05), rgba(201,169,110,0.05))",position:"relative"}}>
            {userPlan === "premium" && (
              <div style={{position:"absolute",top:"-12px",left:"50%",transform:"translateX(-50%)",background:"var(--purple)",color:"#fff",padding:"4px 16px",borderRadius:"20px",fontSize:"12px",fontWeight:800}}>PLAN ACTUAL</div>
            )}
            <div style={{position:"absolute",top:"16px",right:"16px",background:"var(--green)",color:"#fff",padding:"4px 12px",borderRadius:"20px",fontSize:"11px",fontWeight:800}}>RECOMENDADO</div>
            <div style={{padding:"24px"}}>
              <h3 style={{margin:"0 0 8px",fontSize:"24px",color:"var(--purple)"}}>Plan Premium</h3>
              <div style={{fontSize:"36px",fontWeight:800,color:"var(--purple)",lineHeight:1,marginBottom:"4px"}}>$29.900</div>
              <p style={{fontSize:"14px",color:"var(--muted)",marginBottom:"24px"}}>COP/mes • $7.99 USD/mes</p>
              
              <div style={{display:"grid",gap:"12px",marginBottom:"24px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--purple)",fontSize:"18px"}}>?</span>
                  <span><strong>Movimientos ilimitados</strong></span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--purple)",fontSize:"18px"}}>?</span>
                  <span><strong>Clientes ilimitados</strong></span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--purple)",fontSize:"18px"}}>?</span>
                  <span><strong>Contenido ilimitado</strong></span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--purple)",fontSize:"18px"}}>?</span>
                  <span><strong>Tareas ilimitadas</strong></span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--purple)",fontSize:"18px"}}>?</span>
                  <span>Sincronización en la nube</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--purple)",fontSize:"18px"}}>?</span>
                  <span>Soporte prioritario</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--purple)",fontSize:"18px"}}>?</span>
                  <span>Acceso anticipado a nuevas funciones</span>
                </div>
              </div>
              
              {userPlan === "premium" ? (
                <div style={{padding:"12px",background:"var(--purple)",color:"#fff",borderRadius:"8px",textAlign:"center",fontWeight:700}}>Plan actual</div>
              ) : (
                <button className="primary-button" onClick={() => setUserPlan("premium")} style={{width:"100%",background:"var(--purple)",fontSize:"16px"}}>Actualizar a Premium</button>
              )}
            </div>
          </div>
        </div>

        {/* Indicadores de uso */}
        <div className="card" style={{maxWidth:"900px",margin:"32px auto 0",padding:"24px"}}>
          <h3 style={{margin:"0 0 20px"}}>Tu uso actual</h3>
          <div style={{display:"grid",gap:"16px"}}>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
                <span>Movimientos financieros</span>
                <span><strong>{movements.length}</strong> / {userPlan === "free" ? PLAN_LIMITS.free.movements : "8"}</span>
              </div>
              <Progress value={userPlan === "free" ? Math.min(Math.round((movements.length / PLAN_LIMITS.free.movements) * 100), 100) : 0} tone={movements.length >= PLAN_LIMITS.free.movements ? "pink" : "green"} />
            </div>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
                <span>Clientes</span>
                <span><strong>{clients.length}</strong> / {userPlan === "free" ? PLAN_LIMITS.free.clients : "8"}</span>
              </div>
              <Progress value={userPlan === "free" ? Math.min(Math.round((clients.length / PLAN_LIMITS.free.clients) * 100), 100) : 0} tone={clients.length >= PLAN_LIMITS.free.clients ? "pink" : "green"} />
            </div>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
                <span>Contenidos</span>
                <span><strong>{contentItems.length}</strong> / {userPlan === "free" ? PLAN_LIMITS.free.content : "8"}</span>
              </div>
              <Progress value={userPlan === "free" ? Math.min(Math.round((contentItems.length / PLAN_LIMITS.free.content) * 100), 100) : 0} tone={contentItems.length >= PLAN_LIMITS.free.content ? "pink" : "green"} />
            </div>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
                <span>Tareas del hogar</span>
                <span><strong>{homeTasks.length}</strong> / {userPlan === "free" ? PLAN_LIMITS.free.homeTasks : "8"}</span>
              </div>
              <Progress value={userPlan === "free" ? Math.min(Math.round((homeTasks.length / PLAN_LIMITS.free.homeTasks) * 100), 100) : 0} tone={homeTasks.length >= PLAN_LIMITS.free.homeTasks ? "pink" : "green"} />
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="card" style={{maxWidth:"900px",margin:"24px auto 0",padding:"24px"}}>
          <h3 style={{margin:"0 0 20px"}}>Preguntas frecuentes</h3>
          <div style={{display:"grid",gap:"16px"}}>
            <div>
              <strong style={{display:"block",marginBottom:"6px"}}>¿Puedo cambiar de plan en cualquier momento?</strong>
              <p style={{margin:0,color:"var(--muted)",lineHeight:1.6}}>Sí, puedes actualizar o cambiar tu plan cuando quieras desde esta página.</p>
            </div>
            <div>
              <strong style={{display:"block",marginBottom:"6px"}}>¿Qué pasa si alcanzo el límite del plan gratis?</strong>
              <p style={{margin:0,color:"var(--muted)",lineHeight:1.6}}>Te mostraremos una notificación invitándote a actualizar a Premium para continuar agregando más datos.</p>
            </div>
            <div>
              <strong style={{display:"block",marginBottom:"6px"}}>¿Los datos se mantienen al cambiar de plan?</strong>
              <p style={{margin:0,color:"var(--muted)",lineHeight:1.6}}>Sí, todos tus datos se mantienen intactos al cambiar entre planes.</p>
            </div>
            <div>
              <strong style={{display:"block",marginBottom:"6px"}}>¿Cómo realizo el pago?</strong>
              <p style={{margin:0,color:"var(--muted)",lineHeight:1.6}}>Próximamente integraremos Mercado Pago (Colombia) y PayPal (internacional) como pasarelas de pago seguras.</p>
            </div>
          </div>
        </div>

        {/* Código beta */}
        <div className="card" style={{maxWidth:"900px",margin:"24px auto 0",padding:"24px",border:"2px dashed var(--line)"}}>
          <h3 style={{margin:"0 0 8px"}}>¿Tienes un código de acceso beta?</h3>
          <p style={{margin:"0 0 16px",color:"var(--muted)",fontSize:"14px"}}>Si eres parte de la incubadora o de UMP Academy, revisa tu correo de bienvenida — tienes un código de acceso CEO gratis.</p>
          {!showBetaInput ? (
            <button className="primary-button" style={{padding:"10px 24px"}} onClick={() => setShowBetaInput(true)}>Tengo un código</button>
          ) : (
            <form onSubmit={activateBetaCode} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"10px",maxWidth:"480px"}}>
              <input
                placeholder="Ingresa tu código (ej: MAMACEO2026)"
                value={betaCode}
                onChange={(e) => setBetaCode(e.target.value)}
                style={{minHeight:"44px",border:"1px solid var(--line)",borderRadius:"10px",padding:"0 14px",font:"inherit",fontSize:"15px"}}
                autoFocus
              />
              <button className="primary-button" type="submit" style={{padding:"0 20px"}}>Activar</button>
              {betaCodeError && <p style={{gridColumn:"1/-1",margin:0,color:"var(--purple)",fontSize:"13px",fontWeight:700}}>{betaCodeError}</p>}
            </form>
          )}
          {isBetaUser && (
            <div style={{marginTop:"16px",padding:"12px 16px",background:"var(--green-soft)",borderRadius:"10px",color:"#1a5c3a",fontWeight:700,fontSize:"14px"}}>
              ✅ Código activo • Plan CEO gratis por {betaDaysLeft ?? "..."} días más
            </div>
          )}
        </div>
      </section>
    );
  }

}

function SystemsDonut({ tasks }) {
  const manual = tasks.filter((t) => t.mode === "manual").length;
  const delegado = tasks.filter((t) => t.mode === "delegado").length;
  const auto = tasks.filter((t) => t.mode === "automatizado").length;
  const total = tasks.length || 1;
  const pManual = Math.round((manual / total) * 100);
  const pDelegado = Math.round((delegado / total) * 100);
  const pAuto = Math.round((auto / total) * 100);
  const r = 40, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  const segments = [
    { pct: pManual / 100, color: "#c9607a", label: `Manual ${pManual}%` },
    { pct: pDelegado / 100, color: "#c9a96e", label: `Delegado ${pDelegado}%` },
    { pct: pAuto / 100, color: "#2f9f70", label: `Automatizado ${pAuto}%` }
  ];
  let offset = 0;
  return (
    <div className="systems-donut-wrap">
      <svg width="100" height="100" viewBox="0 0 100 100">
        {segments.map((s, i) => {
          const dash = s.pct * circ;
          const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="18"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset * circ}
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />;
          offset += s.pct;
          return el;
        })}
        <circle cx={cx} cy={cy} r="28" fill="white" />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#6f2f4b">{pAuto}%</text>
      </svg>
      <div className="systems-donut-labels">
        {segments.map((s) => (
          <div className="systems-donut-label" key={s.label}>
            <span className="systems-donut-dot" style={{ background: s.color }}></span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ title, value, change, tone }) {
  return <article className={`metric-card ${tone}`}><span className="metric-icon">?</span><p>{title}</p><strong>{value}</strong><small>{change}</small></article>;
}

function DataRow({ title, meta, value, onDelete }) {
  return <div className="data-row"><div><strong>{title}</strong><small>{meta}</small></div><b>{value}</b><button type="button" onClick={onDelete}>Eliminar</button></div>;
}

function MoneyAmountInput({ value, onChange, className, placeholder, min, autoFocus, required, onBlur }) {
  const display = value === "" || value === undefined || value === null || Number.isNaN(Number(value))
    ? (value ?? "")
    : Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      placeholder={placeholder}
      value={display}
      min={min}
      autoFocus={autoFocus}
      required={required}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
      onBlur={onBlur}
    />
  );
}

function Progress({ value, tone }) {
  return <div className={`progress ${tone}`} aria-label={`Progreso ${value}%`}><span style={{ width: `${Math.min(value, 100)}%` }}></span></div>;
}

function ProgressLabel({ label, value, tone }) {
  return <div className="progress-label"><span>{label}</span><Progress value={value} tone={tone} /><b>{value}%</b></div>;
}

function MiniGoal({ label, amount, value }) {
  return <div className="mini-goal"><span>{label}</span><strong>{amount}</strong><Progress value={value} tone="green" /><small>{value}%</small></div>;
}

function LineChart({ movements }) {
  const last7 = movements.slice(0, 7).reverse();
  if (last7.length === 0) {
    return <div className="line-chart-empty">Agrega movimientos para ver la gráfica</div>;
  }
  const incomes = last7.map((m) => m.type === "income" ? m.amount : 0);
  const expenses = last7.map((m) => m.type === "expense" ? m.amount : 0);
  const maxVal = Math.max(...incomes, ...expenses, 1);
  const W = 420, H = 200, padX = 30, padY = 20;
  const chartW = W - padX * 2;
  const chartH = H - padY * 2;
  const toX = (i) => padX + (i / (last7.length - 1 || 1)) * chartW;
  const toY = (v) => padY + chartH - (v / maxVal) * chartH;
  const pointsIncome = last7.map((_, i) => `${toX(i)},${toY(incomes[i])}`).join(" ");
  const pointsExpense = last7.map((_, i) => `${toX(i)},${toY(expenses[i])}`).join(" ");
  return (
    <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Grafica de ingresos y gastos">
      <g className="grid-lines">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={padX} y1={padY + chartH * (1 - t)} x2={W - padX} y2={padY + chartH * (1 - t)} />
        ))}
      </g>
      <polyline className="line income-line" points={pointsIncome} />
      <polyline className="line expense-line" points={pointsExpense} />
      {last7.map((_, i) => <circle className="income-dot" cx={toX(i)} cy={toY(incomes[i])} r="6" key={`i-${i}`} />)}
      {last7.map((_, i) => <circle className="expense-dot" cx={toX(i)} cy={toY(expenses[i])} r="6" key={`e-${i}`} />)}
    </svg>
  );
}










  function renderTerminos(onBack = null) {
    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Términos y Condiciones</h2>
          <button type="button" onClick={() => onBack ? onBack() : setActiveView('dashboard')} style={{border:"1px solid var(--line)",background:"#fff",borderRadius:"8px",padding:"8px 16px",cursor:"pointer",fontSize:"13px",fontWeight:700}}>← Volver</button>
        </div>
        <div className="card" style={{maxWidth:"900px",margin:"0 auto",padding:"32px"}}>
          <p style={{fontSize:"13px",color:"var(--muted)",marginBottom:"24px"}}>Última actualización: 5 de junio de 2026</p>
          
          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>1. Aceptación de los Términos</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Al acceder y utilizar Mamá CEO App, aceptas estar sujeto a estos Términos y Condiciones. Si no estás de acuerdo con alguna parte de estos términos, no deberías usar la aplicación.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>2. Descripción del Servicio</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Mamá CEO App es una plataforma de gestión integral diseñada para mamás emprendedoras que permite organizar y administrar su negocio, hogar y propósito en un solo lugar. El servicio incluye herramientas para gestión financiera, seguimiento de clientes, planificación de contenido, organización del hogar y seguimiento de objetivos personales.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>3. Registro y Cuenta de Usuario</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Para utilizar Mamá CEO App, debes crear una cuenta proporcionando información precisa y completa. Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades que ocurran bajo tu cuenta. Debes notificarnos inmediatamente sobre cualquier uso no autorizado de tu cuenta.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>4. Uso Aceptable</h3>
          <p style={{lineHeight:1.7,marginBottom:"8px"}}>Te comprometes a utilizar Mamá CEO App únicamente para fines legales y de acuerdo con estos Términos. No debes:</p>
          <ul style={{lineHeight:1.7,marginBottom:"16px",paddingLeft:"24px"}}>
            <li>Usar la aplicación de manera que viole leyes locales, nacionales o internacionales</li>
            <li>Intentar acceder sin autorización a otras cuentas, sistemas o redes</li>
            <li>Interferir o interrumpir el servicio o los servidores conectados al servicio</li>
            <li>Transmitir virus, malware o cualquier código malicioso</li>
            <li>Usar la aplicación para propósitos comerciales no autorizados</li>
          </ul>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>5. Propiedad Intelectual</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Todo el contenido, características y funcionalidad de Mamá CEO App, incluyendo pero no limitado a texto, gráficos, logos, iconos, imágenes y software, son propiedad exclusiva de UMP S.A.S y están protegidos por las leyes de propiedad intelectual de Colombia y tratados internacionales.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>6. Privacidad y Protección de Datos</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Tu privacidad es importante para nosotros. El uso de tu información personal está regido por nuestra Política de Privacidad, que forma parte integral de estos Términos. Al usar Mamá CEO App, aceptas la recolección y uso de tu información de acuerdo con nuestra Política de Privacidad y la Ley 1581 de 2012 de Protección de Datos Personales de Colombia.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>7. Suscripciones y Pagos</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Mamá CEO App puede ofrecer diferentes planes de suscripción. Los precios, características y términos de cada plan se especificarán claramente antes de la compra. Las suscripciones se renovarán automáticamente a menos que se cancelen antes de la fecha de renovación. Todos los pagos son procesados de forma segura a través de proveedores de pago certificados.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>8. Cancelación y Reembolsos</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Puedes cancelar tu suscripción en cualquier momento desde la configuración de tu cuenta. La cancelación será efectiva al final del período de facturación actual. No se ofrecen reembolsos por períodos de suscripción parcialmente utilizados, excepto cuando lo requiera la ley aplicable.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>9. Limitación de Responsabilidad</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Mamá CEO App se proporciona "tal cual" y "según disponibilidad". No garantizamos que el servicio será ininterrumpido, seguro o libre de errores. En ningún caso UMP S.A.S será responsable por daños indirectos, incidentales, especiales, consecuentes o punitivos, incluyendo pérdida de beneficios, datos, uso o cualquier otra pérdida intangible.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>10. Modificaciones del Servicio y Términos</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Nos reservamos el derecho de modificar o discontinuar, temporal o permanentemente, el servicio (o cualquier parte del mismo) con o sin previo aviso. También podemos actualizar estos Términos periódicamente. Te notificaremos sobre cambios significativos publicando los nuevos Términos en la aplicación. Tu uso continuado del servicio despuás de dichos cambios constituye tu aceptación de los nuevos Términos.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>11. Ley Aplicable y Jurisdicción</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Estos Términos se regirán e interpretarán de acuerdo con las leyes de la República de Colombia. Cualquier disputa relacionada con estos Términos estará sujeta a la jurisdicción exclusiva del Centro de Arbitraje y Conciliación de la Cámara de Comercio de Bogotá.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>12. Contacto</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Si tienes preguntas sobre estos Términos y Condiciones, puedes contactarnos a través de:</p>
          <p style={{lineHeight:1.7,marginBottom:"4px"}}><strong>UMP S.A.S</strong></p>
          <p style={{lineHeight:1.7,marginBottom:"4px"}}>Email: hola@umpacademy.co</p>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Sitio web: www.umpacademy.co</p>
        </div>
      </section>
    );
  }

  function renderPrivacidad(onBack = null) {
    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Política de Privacidad</h2>
          <button type="button" onClick={() => onBack ? onBack() : setActiveView('dashboard')} style={{border:"1px solid var(--line)",background:"#fff",borderRadius:"8px",padding:"8px 16px",cursor:"pointer",fontSize:"13px",fontWeight:700}}>← Volver</button>
        </div>
        <div className="card" style={{maxWidth:"900px",margin:"0 auto",padding:"32px"}}>
          <p style={{fontSize:"13px",color:"var(--muted)",marginBottom:"24px"}}>Última actualización: 5 de junio de 2026</p>
          
          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>1. Introducción</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>En UMP S.A.S, operadores de Mamá CEO App, nos comprometemos a proteger tu privacidad y tus datos personales. Esta Política de Privacidad explica cómo recopilamos, usamos, compartimos y protegemos tu información personal de acuerdo con la Ley 1581 de 2012 de Protección de Datos Personales de Colombia y el Reglamento General de Protección de Datos (GDPR) cuando aplique.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>2. Información que Recopilamos</h3>
          <p style={{lineHeight:1.7,marginBottom:"8px"}}>Recopilamos la siguiente información cuando usas Mamá CEO App:</p>
          <ul style={{lineHeight:1.7,marginBottom:"16px",paddingLeft:"24px"}}>
            <li><strong>Información de cuenta:</strong> Nombre, correo electrónico, contraseña (encriptada)</li>
            <li><strong>Información de perfil:</strong> Nombre del negocio, tipo de negocio, etapa empresarial, metas financieras</li>
            <li><strong>Datos de uso:</strong> Información sobre cómo usas la aplicación, incluyendo movimientos financieros, clientes, contenido, tareas del hogar y objetivos personales que tú ingresas voluntariamente</li>
            <li><strong>Información técnica:</strong> Dirección IP, tipo de navegador, sistema operativo, identificadores de dispositivo</li>
            <li><strong>Cookies y tecnologías similares:</strong> Usamos cookies para mejorar tu experiencia y mantener tu sesión activa</li>
          </ul>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>3. Cómo Usamos tu Información</h3>
          <p style={{lineHeight:1.7,marginBottom:"8px"}}>Utilizamos tu información personal para:</p>
          <ul style={{lineHeight:1.7,marginBottom:"16px",paddingLeft:"24px"}}>
            <li>Proporcionar, mantener y mejorar Mamá CEO App</li>
            <li>Crear y gestionar tu cuenta de usuario</li>
            <li>Procesar transacciones y gestionar suscripciones</li>
            <li>Enviarte notificaciones importantes sobre el servicio</li>
            <li>Responder a tus consultas y proporcionar soporte al cliente</li>
            <li>Personalizar tu experiencia en la aplicación</li>
            <li>Analizar el uso de la aplicación para mejorar nuestros servicios</li>
            <li>Cumplir con obligaciones legales y regulatorias</li>
            <li>Enviarte comunicaciones de marketing (solo con tu consentimiento explícito)</li>
          </ul>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>4. Base Legal para el Procesamiento</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Procesamos tu información personal bajo las siguientes bases legales: (a) Tu consentimiento explícito al crear una cuenta y usar la aplicación; (b) Ejecución del contrato de servicios contigo; (c) Cumplimiento de obligaciones legales; (d) Nuestros intereses legítimos en mejorar y proteger nuestros servicios.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>5. Compartir tu Información</h3>
          <p style={{lineHeight:1.7,marginBottom:"8px"}}>No vendemos tu información personal. Podemos compartir tu información con:</p>
          <ul style={{lineHeight:1.7,marginBottom:"16px",paddingLeft:"24px"}}>
            <li><strong>Proveedores de servicios tecnológicos:</strong> Plataformas de almacenamiento de datos, autenticación y hosting que utilizamos para operar la aplicación</li>
            <li><strong>Cumplimiento legal:</strong> Cuando sea requerido por ley o para proteger nuestros derechos legales</li>
            <li><strong>Transferencia de negocio:</strong> En caso de fusión, adquisición o venta de activos</li>
          </ul>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Todos nuestros proveedores de servicios están obligados contractualmente a proteger tu información y solo pueden usarla para los propósitos específicos que les autorizamos.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>6. Seguridad de los Datos</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Implementamos medidas de seguridad técnicas y organizativas apropiadas para proteger tu información personal contra acceso no autorizado, alteración, divulgación o destrucción. Esto incluye encriptación de datos en tránsito y en reposo, controles de acceso estrictos, y auditorías de seguridad regulares. Sin embargo, ningún método de transmisión por Internet o almacenamiento electrónico es 100% seguro.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>7. Retención de Datos</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Conservamos tu información personal mientras tu cuenta está activa o según sea necesario para proporcionarte servicios. Si solicitas la eliminación de tu cuenta, eliminaremos o anonimizaremos tu información personal dentro de 30 días, excepto cuando debamos retenerla para cumplir con obligaciones legales, resolver disputas o hacer cumplir nuestros acuerdos.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>8. Tus Derechos</h3>
          <p style={{lineHeight:1.7,marginBottom:"8px"}}>De acuerdo con la Ley 1581 de 2012 y el GDPR, tienes los siguientes derechos:</p>
          <ul style={{lineHeight:1.7,marginBottom:"16px",paddingLeft:"24px"}}>
            <li><strong>Acceso:</strong> Solicitar una copia de tu información personal</li>
            <li><strong>Rectificación:</strong> Corregir información inexacta o incompleta</li>
            <li><strong>Eliminación:</strong> Solicitar la eliminación de tu información personal</li>
            <li><strong>Portabilidad:</strong> Recibir tu información en un formato estructurado y de uso común</li>
            <li><strong>Oposición:</strong> Oponerte al procesamiento de tu información personal</li>
            <li><strong>Limitación:</strong> Solicitar la limitación del procesamiento de tu información</li>
            <li><strong>Revocación del consentimiento:</strong> Retirar tu consentimiento en cualquier momento</li>
          </ul>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Para ejercer estos derechos, contáctanos en hola@umpacademy.co. Responderemos a tu solicitud dentro de 15 días hábiles.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>9. Transferencias Internacionales de Datos</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Tu información puede ser transferida y almacenada en servidores ubicados fuera de Colombia. Cuando transferimos datos internacionalmente, nos aseguramos de que existan garantías adecuadas para proteger tu información de acuerdo con esta Política de Privacidad y las leyes aplicables.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>10. Menores de Edad</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Mamá CEO App no está dirigida a menores de 18 años. No recopilamos intencionalmente información personal de menores. Si descubrimos que hemos recopilado información de un menor sin el consentimiento parental verificable, eliminaremos esa información inmediatamente.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>11. Cambios a esta Política</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Podemos actualizar esta Política de Privacidad periódicamente. Te notificaremos sobre cambios significativos publicando la nueva Política en la aplicación y actualizará la fecha de "Última actualización" en la parte superior. Te recomendamos revisar esta Política regularmente.</p>

          <h3 style={{marginTop:"24px",marginBottom:"12px",fontSize:"18px"}}>12. Contacto</h3>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Si tienes preguntas sobre esta Política de Privacidad o deseas ejercer tus derechos, puedes contactarnos:</p>
          <p style={{lineHeight:1.7,marginBottom:"4px"}}><strong>UMP S.A.S</strong></p>
          <p style={{lineHeight:1.7,marginBottom:"4px"}}>Responsable de Protección de Datos</p>
          <p style={{lineHeight:1.7,marginBottom:"4px"}}>Email: hola@umpacademy.co</p>
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Sitio web: www.umpacademy.co</p>
          
          <p style={{lineHeight:1.7,marginBottom:"16px",marginTop:"24px",padding:"16px",background:"var(--purple-soft)",borderRadius:"12px",border:"1px solid var(--purple)"}}>Para cualquier consulta sobre esta Política de Privacidad, contáctanos en hola@umpacademy.co.</p>
        </div>
      </section>
    );
  }











