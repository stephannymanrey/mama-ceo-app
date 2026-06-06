import React, { useEffect, useMemo, useState } from "react";
import { awsAuth, getAwsAuthToken, isAwsConfigured, confirmAwsResetPassword } from "./lib/awsClient";
import Logo from "./Logo";
import Studio from "./Studio";
import "./App.css";

const STORAGE_KEY = "mama-ceo-app-state-v4";

// Sistema de planes
const PLAN_LIMITS = {
  free:         { movements: 30,       clients: 15,       content: 15,       homeTasks: 30 },
  emprendedora: { movements: 100,      clients: 50,       content: 50,       homeTasks: 100 },
  ceo:          { movements: Infinity, clients: Infinity, content: Infinity, homeTasks: Infinity }
};

const PLAN_PRICES = {
  mama:         { cop: "$39.900", usd: "$9.99",  copYear: "$399.000", usdYear: "$99"  },
  emprendedora: { cop: "$79.900", usd: "$19.99", copYear: "$799.000", usdYear: "$199" },
  ceo:          { cop: "$119.900",usd: "$29.99", copYear: "$1.199.000",usdYear: "$299" }
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
  "No tengo que hacerlo todo para ser una mujer excelente.",
  "Mi calma también es estrategia.",
  "Dios me da sabiduría para elegir lo importante.",
  "Puedo liderar mi negocio sin abandonar mi hogar ni abandonarme a mí.",
  "Una acción correcta vale más que diez hechas desde ansiedad."
];

const promesas = [
  "Dios tiene planes de bien para ti, no de mal. Tu futuro tiene esperanza.",
  "Cuando pides sabiduría con fe, él la da generosamente y sin reproche.",
  "Todo lo puedes cuando él te fortalece. No en tus fuerzas, sino en las suyas.",
  "Dios cuida de ti. No tienes que cargar sola con la ansiedad de mañana.",
  "Cuando estés cansada y cargada, hay descanso real esperando por ti.",
  "Dios completa lo que empieza en ti. Tu negocio y tu familia están en sus manos.",
  "No te ha dado espíritu de temor, sino de poder, amor y dominio propio.",
  "Busca primero lo que importa de verdad, y lo demás se añade.",
  "Confía en él con todo tu corazón y él enderezará tus caminos.",
  "Eres más que vencedora. No solo sobrevives, triunfas.",
  "Dios conoce cada detalle de tu vida y tiene cuidado de ti.",
  "La mujer que teme a Dios es digna de alabanza. Tú eres esa mujer.",
  "Con él, lo que parece imposible se vuelve posible.",
  "Tu trabajo no es en vano cuando lo haces con propósito y fe.",
  "Dios te da la fuerza que necesitas exactamente cuando la necesitas."
];

const ALL_MENU_ITEMS = [
  { id: "dashboard", label: "Inicio",          icon: "🏠" },
  { id: "home",      label: "Mi Hogar",         icon: "🌸" },
  { id: "ceo",       label: "Para Mí",           icon: "💛" },
  { id: "business",  label: "Mi Negocio",       icon: "💼" },
  { id: "clients",   label: "Mis Clientas",     icon: "👩‍💼" },
  { id: "studio",    label: "Studio ✦",          icon: "🎬" },
  { id: "content",   label: "Mi Contenido",     icon: "📱" },
  { id: "report",    label: "Reporte Semanal",  icon: "📊" },
];
const MENU_MAMA        = ["dashboard", "home", "ceo"];
const MENU_EMPRENDEDORA = ["dashboard", "business", "clients", "studio", "content", "report"];

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
  checkIn: { date: "", energia: "", intencion: "", paraHoy: "" },
  sueno: "",
  tiempoParaMi: 0,
  presenceMoments: [],
  checkInHistory: [],
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
    homeBudget: normalizeHomeBudget(cloneList(initialHomeBudget)),
    purpose: createInitialPurpose(),
    profileSetup: null,
    groceryList: [],
    userPlan: "free",
    premiumExpiresAt: null,
    userMode: null
  };
}

const API_URL     = "https://p5ftnawyxe.execute-api.us-east-1.amazonaws.com/default/mamaceo-user-data";
const GEMINI_URL  = "https://p5ftnawyxe.execute-api.us-east-1.amazonaws.com/default/mamaceo-gemini";

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
  const stored = loadState();
  const [activeView, setActiveView] = useState(stored?.activeView || "dashboard");
  const [currency, setCurrency] = useState(stored?.currency || "USD");
  const isNewUser = !stored;
  const [movements, setMovements] = useState(isNewUser ? [] : normalizeMovements(stored?.movements || initialMovements));
  const [tasks, setTasks] = useState(isNewUser ? [] : (stored?.tasks || initialTasks));
  const [clients, setClients] = useState(isNewUser ? [] : normalizeClients(stored?.clients || initialClients));
  const [contentItems, setContentItems] = useState(isNewUser ? [] : (stored?.contentItems || initialContent));
  const [goals, setGoals] = useState(isNewUser ? [] : (stored?.goals || initialGoals));
  const [homeTasks, setHomeTasks] = useState(isNewUser ? [] : (stored?.homeTasks || initialHomeTasks));
  const [systemTasks, setSystemTasks] = useState(stored?.systemTasks || initialSystemTasks);
  const [systemSlide, setSystemSlide] = useState(0);
  const [newSystemTask, setNewSystemTask] = useState("");
  const [incomeSources, setIncomeSources] = useState(stored?.incomeSources || initialIncomeSources);
  const [incomeSourceForm, setIncomeSourceForm] = useState({ name: "", monthlyGoal: "" });
  const [maternalTasks, setMaternalTasks] = useState(stored?.maternalTasks || initialHomeMaternalTasks);
  const [wellnessTasks, setWellnessTasks] = useState(stored?.wellnessTasks || initialHomeWellnessTasks);
  const [maternalForm, setMaternalForm] = useState("");
  const [wellnessForm, setWellnessForm] = useState("");
  const [banks, setBanks] = useState(stored?.banks || initialBanks);
  const [newBank, setNewBank] = useState("");
  const [annualBudget, setAnnualBudget] = useState(normalizeAnnualBudget(stored?.annualBudget || initialAnnualBudget));
  const [homeBudget, setHomeBudget] = useState(normalizeHomeBudget(stored?.homeBudget || initialHomeBudget));
  const [homeBudgetForm, setHomeBudgetForm] = useState({ type: "Gasto variable", description: "", amount: "", dueDate: getTodayInputValue() });
  const [purpose, setPurpose] = useState(createInitialPurpose(stored?.purpose || {}));
  const [profileSetup, setProfileSetup] = useState(stored?.profileSetup || null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileForm, setProfileForm] = useState({ ...initialProfileForm });
  const [brandProfile, setBrandProfile] = useState(stored?.brandProfile || { ...initialBrandProfile });
  const [editingBrand, setEditingBrand] = useState(false);
  const [brandForm, setBrandForm] = useState(stored?.brandProfile || { ...initialBrandProfile });
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState("");
  const [authNewPassword, setAuthNewPassword] = useState("");
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showAuthPasswordConfirm, setShowAuthPasswordConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const [form, setForm] = useState({ type: "income", classification: "Servicios", description: "", category: "", amount: "", bank: banks[0] || "", date: getTodayInputValue() });
  const [clientForm, setClientForm] = useState({ name: "", service: "", status: "Lead tibio", amount: "", nextAction: "", source: "", customSource: "", phone: "", lastContactDate: getTodayInputValue() });
  const [contentFilter, setContentFilter] = useState("");
  const [salesGoal, setSalesGoal] = useState(stored?.salesGoal || 0);
  const [contactLog, setContactLog] = useState(stored?.contactLog || {});
  const [clientSearch, setClientSearch] = useState("");
  const [weekBlocks, setWeekBlocks] = useState(stored?.weekBlocks || {});
  const [contentForm, setContentForm] = useState({ title: "", hook: "", format: "Reel", network: "Instagram", customNetwork: "", week: "Semana 1", status: "Por hacer", goal: "Vender", publishDate: "" });
  const [showContentForm, setShowContentForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: "", amount: "", period: "Mensual", status: "Activa" });
  const [homeForm, setHomeForm] = useState({ title: "", category: "Rutina", priority: "Normal", delegate: "" });
  const [groceryList, setGroceryList] = useState(stored?.groceryList || []);
  const [appointments, setAppointments] = useState(stored?.appointments || []);
  const [apptForm, setApptForm] = useState({ title: "", date: "", type: "Médico" });
  const [weekMenu, setWeekMenu] = useState(stored?.weekMenu || { L:"",M:"",X:"",J:"",V:"",S:"",D:"" });
  const [homeRoutines, setHomeRoutines] = useState(stored?.homeRoutines || { L:"",M:"",X:"",J:"",V:"",S:"",D:"" });
  const [kidsSchedule, setKidsSchedule] = useState(stored?.kidsSchedule || { L:"",M:"",X:"",J:"",V:"",S:"",D:"" });
  const [quickNotes, setQuickNotes] = useState(stored?.quickNotes || []);
  const [quickNoteInput, setQuickNoteInput] = useState("");
  const [groceryForm, setGroceryForm] = useState("");
  const [reportWeekOffset, setReportWeekOffset] = useState(0);
  const [userPlan, setUserPlan] = useState(stored?.userPlan || "free");
  const [premiumExpiresAt, setPremiumExpiresAt] = useState(stored?.premiumExpiresAt || null);
  const [userMode, setUserMode] = useState(stored?.userMode || null);
  const [presenceForm, setPresenceForm] = useState({ quien: [], queHicieron: "", tiempo: "30 min" });
  const [presenceCelebration, setPresenceCelebration] = useState(false);
  const [homeTab, setHomeTab] = useState(0);
  const [checkInStep, setCheckInStep] = useState(0);
  const [checkInResp, setCheckInResp] = useState({ dia: "", pensando: "", postergando: "", treinta: "", emocional: 5, social: 5, proyectos: 5 });
  const [checkInAnimating, setCheckInAnimating] = useState(false);
  const [checkInDirFwd, setCheckInDirFwd] = useState(true);
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
              if (Notification.permission === "granted") new Notification("? Bloque completado", { body: POMODORO_MESSAGES[Math.floor(Math.random() * POMODORO_MESSAGES.length)] });
            } else {
              setPomodoroMode("work");
              setPomodoroMinutes(pomodoroWorkDuration);
              if (Notification.permission === "granted") new Notification("? ¡A trabajar", { body: "¡Nuevo bloque de enfoque!" });
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

  const BETA_CODE = "MAMACEO2026";
  const BETA_CODE_EXPIRY = new Date("2026-12-31T23:59:59").getTime();

  const effectivePlan = useMemo(() => {
    if (userPlan === "ceo" || userPlan === "emprendedora") {
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
    if (effectivePlan !== "premium" || !premiumExpiresAt) return null;
    const days = Math.ceil((premiumExpiresAt - Date.now()) / 86400000);
    return days > 0 ? days : 0;
  }, [effectivePlan, premiumExpiresAt]);

  const isBetaUser = premiumExpiresAt !== null;

  const activateBetaCode = (e) => {
    e.preventDefault();
    setBetaCodeError("");
    if (betaCode.trim().toUpperCase() !== BETA_CODE) {
      setBetaCodeError("Código incorrecto. Verifica el correo de bienvenida de UMP Academy.");
      return;
    }
    if (Date.now() > BETA_CODE_EXPIRY) {
      setBetaCodeError("Este código ya expiró.");
      return;
    }
    const expiresAt = Date.now() + 90 * 86400000;
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
    topClient ? `Contactar a ${topClient.name}: ${topClient.nextAction || "hacer seguimiento"}.` : "Registrar tu clienta de mayor potencial.",
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
      "Password did not conform with policy: Password must have numeric characters": "La contraseña debe incluir al menos un número.",
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
      if (authPassword !== authPasswordConfirm) {
        setAuthError("Las contraseñas no coinciden.");
        return;
      }
      if (authPassword.length < 8) {
        setAuthError("La contraseña debe tener al menos 8 caracteres.");
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
    return () => subscription?.unsubscribe?.();
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
    setTasks(state.tasks || []);
    setClients(normalizeClients(state.clients || []));
    setContentItems(state.contentItems || []);
    setGoals(state.goals || []);
    setHomeTasks(state.homeTasks || []);
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
    const hasSeenModal = window.sessionStorage.getItem('profile-modal-seen');
    if (!profileSetup && !hasSeenModal) {
      setShowProfileModal(true);
      window.sessionStorage.setItem('profile-modal-seen', 'true');
    }
  }, [ready, user, isRestoringRemote, profileSetup]);

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
      userPlan,
      premiumExpiresAt,
      userMode
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
  }, [ready, user, awsActive, isRestoringRemote, cloudReadyUserId, activeView, currency, movements, tasks, clients, contentItems, goals, homeTasks, businessSettings, banks, annualBudget, homeBudget, purpose, incomeSources, salesGoal, contactLog, groceryList, userPlan, premiumExpiresAt, userMode, profileSetup, brandProfile, systemTasks, maternalTasks, wellnessTasks, weekBlocks]);

  const addMovement = (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.description.trim() || !form.category.trim() || !amount) return;
    
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
      category: form.category.trim(),
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
      amount: "",
      bank: form.bank || banks[0] || "",
      date: getTodayInputValue()
    });
  };

  const addClient = (event) => {
    event.preventDefault();
    const amount = Number(clientForm.amount);
    if (!clientForm.name.trim() || !clientForm.service.trim() || !amount) return;
    
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

  const addGoal = (event) => {
    event.preventDefault();
    const amount = Number(goalForm.amount);
    if (!goalForm.title.trim() || !amount) return;
    setGoals((current) => [{ id: Date.now(), ...goalForm, title: goalForm.title.trim(), amount }, ...current]);
    setGoalForm({ title: "", amount: "", period: "Mensual", status: "Activa" });
  };

  const addHomeTask = (event) => {
    event.preventDefault();
    if (!homeForm.title.trim()) return;
    
    // Validar límite del plan
    if (homeTasks.length >= currentLimits.homeTasks) {
      setUpgradeReason(`Has alcanzado el límite de ${currentLimits.homeTasks} tareas del hogar de tu plan.`);
      setShowUpgradeModal(true);
      return;
    }
    
    setHomeTasks((current) => [{ id: Date.now(), title: homeForm.title.trim(), category: homeForm.category, priority: homeForm.priority || "Normal", delegate: homeForm.delegate || "", done: false }, ...current]);
    setHomeForm({ title: "", category: "Rutina", priority: "Normal", delegate: "" });
  };

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateMovementType = (type) => setForm((current) => ({
    ...current,
    type,
    classification: type === "income" ? "Servicios" : "Gasto fijo"
  }));
  const updateMovementDate = (movementId, date) => {
    setMovements((current) => current.map((movement) => movement.id === movementId ? {
      ...movement,
      date,
      createdAt: timestampFromInputDate(date)
    } : movement));
  };
  const updateClientForm = (field, value) => setClientForm((current) => ({ ...current, [field]: value }));
  const updateContentForm = (field, value) => setContentForm((current) => ({ ...current, [field]: value }));
  const updateGoalForm = (field, value) => setGoalForm((current) => ({ ...current, [field]: value }));
  const updateHomeForm = (field, value) => setHomeForm((current) => ({ ...current, [field]: value }));
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
    if (!homeBudgetForm.description.trim() || !amount) return;
    const dueDate = homeBudgetForm.dueDate || getTodayInputValue();
    setHomeBudget((current) => [{ id: Date.now(), type: homeBudgetForm.type, description: homeBudgetForm.description.trim(), amount, dueDate, createdAt: timestampFromInputDate(dueDate) }, ...current]);
    setHomeBudgetForm({ type: "Gasto variable", description: "", amount: "", dueDate: getTodayInputValue() });
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
    setShowProfileModal(false); window.sessionStorage.setItem('profile-modal-seen', 'true'); setProfileSaved(true);
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
    return <Studio onBack={() => setActiveView("dashboard")} brandProfile={brandProfile} onGoToBrandProfile={() => setActiveView("business")} callGemini={callGemini} plan={effectivePlan} />;
  }

  if (!user && awsActive) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div style={{textAlign:"center",marginBottom:"40px"}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:"12px"}}>
              <Logo width={220} />
            </div>
            <p style={{fontSize:"16px",color:"var(--muted)",margin:"0",fontWeight:500}}>Tu negocio, hogar y propósito en un solo lugar</p>
          </div>
          
          {confirmMode ? (
            <form className="auth-form" onSubmit={handleConfirmCode}>
              <h3>Confirmación requerida</h3>
              <p>Ingresa el código de 6 dígitos que enviamos a {authEmail}</p>
              <label>
                Código de verificación
                <input type="text" placeholder="000000" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value.replace(/[^0-9]/g, ''))} required maxLength={6} style={{letterSpacing:"4px",fontSize:"20px",textAlign:"center"}} autoFocus />
              </label>
              {authError && <p className="auth-error">{authError}</p>}
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
                <input type="password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} required minLength={8} />
              </label>
              {authError && <p className="auth-error">{authError}</p>}
              <button type="submit" className="auth-button" disabled={authLoading}>Actualizar</button>
              <button type="button" className="auth-switch" onClick={() => { setResetPassword(false); setAuthError(""); }}>← Volver</button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleAuthSubmit}>
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
                <input type={showAuthPassword?"text":"password"} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required minLength={8} />
              </label>
              {authMode === "signup" && (
                <label>
                  Confirmar contraseña
                  <input type="password" value={authPasswordConfirm} onChange={(event) => setAuthPasswordConfirm(event.target.value)} required minLength={8} />
                </label>
              )}
              {authError && <p className="auth-error">{authError}</p>}
              <button type="submit" className="auth-button" disabled={authLoading}>
                {authLoading ? "Procesando..." : (authMode === "login" ? "Entrar" : "Registrarme")}
              </button>
              <button type="button" className="auth-switch" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>
                {authMode === "login" ? "Crear una cuenta nueva" : "Ya tengo cuenta"}
              </button>
              {authMode === "login" && (
                <button type="button" className="auth-forgot" onClick={handleForgotPassword} disabled={authLoading}>
                  ¿Olvidé mi contraseña?
                </button>
              )}
            </form>
          )}
          <footer className="auth-footer">
            Una mamá con propósito | 2026 UMP S.A.S
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
              { mode: "emprendedora",icon: "💼", title: "Tengo un negocio o quiero emprender", desc: "Clientas, finanzas, Studio de contenido y todo para hacer crecer mi negocio." },
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
      {showProfileModal && (
        <div className="profile-modal-overlay">
          <div className="profile-modal">
            <div className="profile-modal-header">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <h2>{profileSetup ? "Editar mi perfil ✏️" : "Antes de comenzar... ✨"}</h2>
                {profileSetup && (
                  <button type="button" onClick={() => setShowProfileModal(false)}
                    style={{border:"none",background:"none",fontSize:"24px",cursor:"pointer",color:"var(--muted)",lineHeight:1,padding:"0 4px"}}>×</button>
                )}
              </div>
              <p>{profileSetup ? "Actualiza tu información cuando quieras." : "Configuremos tu perfil para que la app trabaje para ti desde el primer día."}</p>
            </div>
            <form className="profile-modal-form" onSubmit={saveProfile}>
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
                      { mode: "mama",        icon: "🌸", label: "Solo organizarme"  },
                      { mode: "emprendedora", icon: "💼", label: "Solo mi negocio"   },
                      { mode: "ambas",        icon: "✨", label: "Hogar y negocio"   },
                    ].map(({ mode, icon, label }) => (
                      <button key={mode} type="button" onClick={() => setUserMode(mode)}
                        style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",border:`2px solid ${userMode===mode?"var(--pink)":"var(--line)"}`,borderRadius:"10px",background:userMode===mode?"rgba(212,104,122,0.06)":"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",fontWeight:userMode===mode?700:400,color:"var(--ink)"}}>
                        <span>{icon}</span>{label}{userMode===mode&&<span style={{marginLeft:"auto",color:"var(--pink)"}}>✓</span>}
                      </button>
                    ))}
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
                    <input type="number" min="0" placeholder="Ej: 3000" value={profileForm.monthlyGoalSetup} onChange={(e) => setProfileForm((c) => ({ ...c, monthlyGoalSetup: e.target.value }))} required={userMode !== "mama"} />
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
                <h2>? Desbloquea todo tu potencial</h2>
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
                    <span style={{fontSize:"20px"}}>?</span>
                    <span>Movimientos financieros ilimitados</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"20px"}}>?</span>
                    <span>Clientes ilimitados</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"20px"}}>?</span>
                    <span>Contenido ilimitado</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"20px"}}>?</span>
                    <span>Tareas del hogar ilimitadas</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"20px"}}>?</span>
                    <span>Sincronización en la nube</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"20px"}}>?</span>
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

      <aside className="sidebar">
        <div className="brand">
          <Logo width={130} />
        </div>

        {/* Botón hamburguesa solo en móvil */}
        <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(v => !v)} aria-label="Menú">
          {mobileMenuOpen ? "✕" : "☰"}
        </button>

        <nav className={`main-menu ${mobileMenuOpen ? "mobile-open" : ""}`} aria-label="Navegacion principal">
          {menu.map((item) => (
            <button className={activeView === item.id ? "menu-item active" : "menu-item"} key={item.id} onClick={() => { setActiveView(item.id); setMobileMenuOpen(false); }}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="currency-box">
          <label>Moneda base</label>
          <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
            <option>USD</option>
            <option>COP</option>
            <option>MXN</option>
            <option>EUR</option>
          </select>
        </div>

        <div className="quote-card">
          <p className="brand-tagline">Negocio, hogar y visión en un solo lugar</p>
          <span>×</span>
          <p>{promesas[new Date().getDate() % promesas.length]}</p>
        </div>
      </aside>

      <main className="dashboard">
        <header className="topbar">
          <div>
            <p className="view-label">{activeLabel}</p>
            <h1>Hola {profileSetup?.name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Mamá CEO"} 👋</h1>
            <p>Enfocada • Organizada • Imparable</p>
          </div>
          <div className="profile-area">
            {isSyncing && <div className="status-chip syncing">Guardando…</div>}
            {(!awsActive || !remoteStorageEnabled) && !isSyncing && <div className="status-chip">Modo local</div>}
            <button className="profile-edit-btn" onClick={() => { if (profileSetup) setProfileForm(profileSetup); setShowProfileModal(true); }} title="Editar perfil">
              <span className="profile-edit-avatar">{profileSetup?.name ? profileSetup.name.charAt(0).toUpperCase() : "M"}</span>
              <span className="profile-edit-name">{profileSetup?.name || "Mi perfil"}</span>
              <span className="profile-edit-icon">✏️</span>
            </button>
            {awsActive && user && (
              <button className="signout-button" onClick={signOut}>Salir</button>
            )}
          </div>
        </header>

        {!awsActive && (
          <div className="local-banner">
            <strong>Modo sin conexión</strong> • tus datos se guardan en este navegador. Si cambias de dispositivo o navegador, no verás tus datos.
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
              <><span>⏰</span><div><strong>Últimos {betaDaysLeft} días de tu acceso beta</strong><p>Has avanzado mucho. Activa Premium cuando estás lista, sin presión.</p><button className="beta-banner-btn" onClick={() => setActiveView("pricing")}>Ver planes ?</button></div></>
            ) : (
              <><span>💙</span><div><strong>Tu período beta terminó</strong><p>Tus datos están seguros. Activa Premium para seguir con acceso ilimitado.</p><button className="beta-banner-btn" onClick={() => setActiveView("pricing")}>Activar Premium ?</button></div></>
            )}
          </div>
        )}

        {activeView === "dashboard" && renderDashboard()}
        {activeView === "business" && renderBusiness()}
        {activeView === "clients" && renderClients()}
        {activeView === "content" && renderContent()}
        {activeView === "home" && renderHome()}
        {activeView === "ceo" && renderCeo()}
        {activeView === "report" && renderWeeklyReport()}
        {activeView === "pricing" && renderPricing()}
        {activeView === "terminos" && renderTerminos()}
        {activeView === "privacidad" && renderPrivacidad()}

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
              {pomodoroOpen && (
                <div className={`pomo-panel${pomodoroRunning && pomodoroMode === "work" ? " pomo-panel--focus" : pomodoroMode === "break" ? " pomo-panel--break" : ""}`}
                  style={{ bottom: _hasFree ? "136px" : "84px" }}>
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
              <button
                className={`pomo-fab${pomodoroRunning ? " pomo-fab--active" : ""}${pomodoroOpen ? " pomo-fab--open" : ""}`}
                style={{ bottom: _hasFree ? "84px" : "28px" }}
                onClick={() => setPomodoroOpen(v => !v)}
                title="Temporizador de foco"
              >
                <span className="pomo-fab-ico">&#x23F1;</span>
                {pomodoroRunning && <span className="pomo-fab-time">{_mm}:{_ss}</span>}
                {!pomodoroRunning && pomodoroBlocks > 0 && <span className="pomo-fab-stars">&#x2B50;{pomodoroBlocks}</span>}
              </button>
            </>
          );
        }())}
        {effectivePlan === "free" && (
          <button className="upgrade-fab" onClick={() => setActiveView("pricing")}>⭐ Upgrade</button>
        )}

        <footer className="app-footer">
          <span>© 2026 UMP S.A.S • Todos los derechos reservados</span>
          <span>Hecho por Una mamá con propósito…</span>
          <span>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('terminos'); }} style={{color:"inherit",textDecoration:"underline",cursor:"pointer"}}>Términos</a>
            {" • "}
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('privacidad'); }} style={{color:"inherit",textDecoration:"underline",cursor:"pointer"}}>Privacidad</a>
          </span>
        </footer>
      </main>
    </div>
  );

  function renderDashboard() {
    const todayStr = clockNow.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
    const timeStr = clockNow.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    const urgentLeads = clients.filter((c) => c.status === "Lead caliente");
    const lastPublished = contentItems.filter((i) => i.status === "Publicado" && i.createdAt).sort((a, b) => b.createdAt - a.createdAt)[0];
    const daysSincePublish = lastPublished ? Math.floor((Date.now() - lastPublished.createdAt) / 86400000) : null;
    const urgentHomeTasks = homeTasks.filter((t) => !t.done && t.priority === "Urgente");
    const hasAlerts = urgentLeads.length > 0 || (daysSincePublish !== null && daysSincePublish > 3) || urgentHomeTasks.length > 0;
    const focusTasks = tasks.filter((t) => !t.done).slice(0, 3);

    return (
      <section className="panel workspace-panel">
        <div className="db-wrap">

          {/* Hero */}
          <div className="db-hero">
            <div className="db-date-row">
              <p className="db-date" style={{textTransform:"capitalize"}}>{todayStr}</p>
              <p className="db-time">{timeStr}</p>
            </div>
            <p className="db-affirmation">&ldquo;{todayAffirmation}&rdquo;</p>
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
              <div className="db-week-stats">
                <div><span>Ingresos</span><strong>{money.format(totals.income)}</strong></div>
                <div><span>Gastos</span><strong>{money.format(totals.expenses)}</strong></div>
              </div>
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

          {/* Acciones de hoy */}
          <div className="db-focus-card">
            <div className="db-focus-header">
              <span>&#x1F3AF; Acciones de hoy</span>
              <span className="db-focus-sub">{completedTasks} de {tasks.length} completadas</span>
            </div>
            {tasks.length === 0 && (
              <p style={{fontSize:"13px",color:"var(--muted)",margin:"8px 0 0"}}>Sin tareas a&uacute;n &mdash; &iquest;qu&eacute; har&aacute;s hoy para acercarte a tu meta?</p>
            )}
            {tasks.length > 0 && focusTasks.length === 0 && (
              <p style={{fontSize:"13px",color:"var(--green)",fontWeight:600,margin:"8px 0 0"}}>&#x2705; Todas tus tareas completadas hoy</p>
            )}
            {focusTasks.map((task) => (
              <label key={task.id} className="db-task-row">
                <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} style={{accentColor:"var(--purple)"}} />
                <span>{task.text}</span>
              </label>
            ))}
            {tasks.filter((t) => !t.done).length > 3 && (
              <p style={{fontSize:"12px",color:"var(--muted)",margin:"8px 0 0"}}>+{tasks.filter((t) => !t.done).length - 3} m&aacute;s pendientes</p>
            )}
          </div>

          {/* Acceso r&#xE1;pido */}
          <div className="db-quick-grid">
            <button className="db-quick-card" onClick={() => setActiveView("business")}>
              <span className="db-quick-icon">&#x1F4B0;</span>
              <span>Negocio</span>
              <span className="db-quick-val">{money.format(totals.income)}</span>
            </button>
            <button className="db-quick-card" onClick={() => setActiveView("clients")}>
              <span className="db-quick-icon">&#x1F469;&#x200D;&#x1F4BC;</span>
              <span>Clientes</span>
              <span className="db-quick-val">{clients.filter((c) => c.status === "Lead caliente").length} leads</span>
            </button>
            <button className="db-quick-card" onClick={() => setActiveView("content")}>
              <span className="db-quick-icon">&#x1F4F1;</span>
              <span>Contenido</span>
              <span className="db-quick-val">{contentItems.filter((i) => i.status !== "Publicado").length} por publicar</span>
            </button>
            <button className="db-quick-card" onClick={() => setActiveView("home")}>
              <span className="db-quick-icon">&#x1F338;</span>
              <span>Hogar</span>
              <span className="db-quick-val">{homeTasks.filter((t) => !t.done).length} pendientes</span>
            </button>
          </div>

          {/* Studio CTA */}
          <button className="db-studio-cta" onClick={() => setActiveView("studio")}>
            <div className="db-studio-left">
              <span className="db-studio-star">&#x2726;</span>
              <div>
                <p className="db-studio-title">Mi Studio</p>
                <p className="db-studio-sub">Guiones, contenido y marca</p>
              </div>
            </div>
            <span className="db-studio-arrow">&#x2192;</span>
          </button>

        </div>
      </section>
    );
  }

  function renderBusiness() {
    const healthScore = totals.profit >= 0 && monthlyProgress >= 75 ? "green"
      : totals.profit >= 0 || monthlyProgress >= 50 ? "orange" : "red";
    const healthLabel = healthScore === "green" ? "Negocio saludable"
      : healthScore === "orange" ? "Atencion requerida" : "Alerta financiera";
    const healthMsg = healthScore === "green"
      ? "Tus ingresos superan tus gastos y vas bien hacia tu meta."
      : healthScore === "orange"
        ? "Hay margen pero necesitas acelerar ventas o reducir gastos."
        : "Tus gastos superan tus ingresos. Prioriza cobros y reduce gastos no esenciales hoy.";
    const incomeBySource = incomeSources.map((src) => {
      const actual = movements.filter((m) => m.type === "income" && m.classification === src.name).reduce((sum, m) => sum + m.amount, 0);
      const progress = src.monthlyGoal > 0 ? Math.min(Math.round((actual / src.monthlyGoal) * 100), 100) : 0;
      const feeEstimated = calcFee(src.monthlyGoal, src.platform);
      const netEstimated = src.monthlyGoal - feeEstimated;
      return { ...src, actual, progress, feeEstimated, netEstimated };
    });
    const fixedExpensesTotal = movements.filter((m) => m.type === "expense" && m.classification === "Gasto fijo").reduce((sum, m) => sum + m.amount, 0);
    const cashFlow = totals.income - fixedExpensesTotal;
    const cashFlowScore = cashFlow > 0 ? "green" : "red";
    const latestMovement = sortedMovements[0];
    const businessMovementsThisWeek = sortedMovements.filter((movement) => isDateThisWeek(movement.date || movement.createdAt, currentWeekRange));
    const brandComplete = !!(brandProfile.queOfreces && brandProfile.transformacion);
    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Negocio</h2>
          <p>{profileSetup?.businessName || "Tu negocio"} • {profileSetup?.stage || ""}</p>
        </div>

        {/* Perfil de Marca */}
        <div className="bpcard">
          <div className="bpcard-header">
            <div className="bpcard-title-row">
              <span className="bpcard-star">✦</span>
              <span className="bpcard-title">Perfil de Marca para el Studio</span>
              {brandComplete && <span className="bpcard-badge">✓ Activo</span>}
            </div>
            <button className="bpcard-toggle-btn" onClick={() => { setEditingBrand((v) => !v); setBrandForm({ ...brandProfile }); }}>
              {editingBrand ? "Cancelar" : brandComplete ? "Editar ✏️" : "Completar →"}
            </button>
          </div>

          {!editingBrand && brandComplete && (
            <div className="bpcard-view">
              <div className="bpcard-field">
                <span className="bpcard-field-label">💼 Qué ofreces</span>
                <span className="bpcard-field-val">{brandProfile.queOfreces}</span>
              </div>
              <div className="bpcard-field">
                <span className="bpcard-field-label">👤 Cliente ideal</span>
                <span className="bpcard-field-val">{brandProfile.clienteIdeal || "—"}</span>
              </div>
              <div className="bpcard-field">
                <span className="bpcard-field-label">✨ Transformación clave</span>
                <span className="bpcard-field-val">{brandProfile.transformacion}</span>
              </div>
              <div className="bpcard-meta-row">
                <span>🎯 Tono: <b>{brandProfile.tono}</b></span>
                <span>📱 Red: <b>{brandProfile.redPrincipal}</b></span>
                {brandProfile.hashtags && <span>🏷️ {brandProfile.hashtags}</span>}
              </div>
            </div>
          )}

          {!editingBrand && !brandComplete && (
            <p className="bpcard-empty">Completa tu perfil para que el Studio pre-llene automáticamente todos los generadores — guiones, ideas, hooks, emails y más.</p>
          )}

          {editingBrand && (
            <form className="bpcard-form" onSubmit={(e) => { e.preventDefault(); setBrandProfile({ ...brandForm }); setEditingBrand(false); }}>
              <div className="bpcard-form-grid">
                <div className="bpcard-form-col">
                  <label className="bpcard-label">¿Qué ofreces? <span className="bpcard-req">*</span></label>
                  <textarea className="bpcard-textarea" placeholder="Ej: Coaching de maternidad consciente para mamás emprendedoras" value={brandForm.queOfreces} onChange={(e) => setBrandForm((p) => ({ ...p, queOfreces: e.target.value }))} rows={2} required />
                </div>
                <div className="bpcard-form-col">
                  <label className="bpcard-label">¿Quién es tu cliente ideal?</label>
                  <textarea className="bpcard-textarea" placeholder="Ej: Mamás de 28 a 40 años que quieren crecer en su negocio sin descuidar a su familia" value={brandForm.clienteIdeal} onChange={(e) => setBrandForm((p) => ({ ...p, clienteIdeal: e.target.value }))} rows={2} />
                </div>
                <div className="bpcard-form-col bpcard-form-col--full">
                  <label className="bpcard-label">¿Cuál es tu transformación clave? (lo que logra tu cliente) <span className="bpcard-req">*</span></label>
                  <textarea className="bpcard-textarea" placeholder="Ej: Pasar de agotada y desbordada a organizada, rentable y presente en su familia" value={brandForm.transformacion} onChange={(e) => setBrandForm((p) => ({ ...p, transformacion: e.target.value }))} rows={2} required />
                </div>
                <div className="bpcard-form-col">
                  <label className="bpcard-label">Tono de comunicación</label>
                  <select className="bpcard-select" value={brandForm.tono} onChange={(e) => setBrandForm((p) => ({ ...p, tono: e.target.value }))}>
                    <option>Cercano</option><option>Profesional</option><option>Inspirador</option><option>Directo</option>
                  </select>
                </div>
                <div className="bpcard-form-col">
                  <label className="bpcard-label">Red social principal</label>
                  <select className="bpcard-select" value={brandForm.redPrincipal} onChange={(e) => setBrandForm((p) => ({ ...p, redPrincipal: e.target.value }))}>
                    <option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Spotify</option>
                  </select>
                </div>
                <div className="bpcard-form-col bpcard-form-col--full">
                  <label className="bpcard-label">Hashtags favoritos (opcional)</label>
                  <input className="bpcard-input" placeholder="Ej: #mamaceo #emprendedora #maternidadconsciente" value={brandForm.hashtags} onChange={(e) => setBrandForm((p) => ({ ...p, hashtags: e.target.value }))} />
                </div>
              </div>
              <div className="bpcard-form-footer">
                <button className="primary-button" type="submit">Guardar perfil de marca</button>
                <button type="button" className="ck-cancel-btn" onClick={() => setEditingBrand(false)}>Cancelar</button>
              </div>
            </form>
          )}
        </div>

        <div className="business-top-grid">
          <div className={`health-banner health-${healthScore}`}>
            <strong>{healthLabel}</strong>
            <p>{healthMsg}</p>
            <div className="health-stats">
              <span>Ingresos: <b>{money.format(totals.income)}</b></span>
              <span>Gastos: <b>{money.format(totals.expenses)}</b></span>
              <span>Utilidad: <b>{money.format(totals.profit)}</b></span>
              <span>Meta: <b>{monthlyProgress}%</b></span>
            </div>
          </div>
          <div className={`cashflow-card cashflow-${cashFlowScore}`}>
            <div className="cashflow-label">Flujo de caja del mes</div>
            <div className="cashflow-amount">{money.format(cashFlow)}</div>
            <div className="cashflow-detail">
              <span>Ingresos <b>{money.format(totals.income)}</b></span>
              <span>Gastos fijos <b>{money.format(fixedExpensesTotal)}</b></span>
            </div>
            <p className="helper-copy">{cashFlow >= 0 ? "Tienes margen positivo este mes. Cuida los gastos variables." : "Tus gastos fijos superan tus ingresos. Revisa que puedes reducir."}</p>
          </div>
        </div>

        <div className="business-movements-grid">
          <div className="card">{MovementForm()}</div>
          <div className="card movement-detail-card">
            <div className="movement-detail-header">
              <div><h3>Movimientos</h3><p className="helper-copy">Tus ultimos registros.</p></div>
              <div className="export-buttons">
                <button type="button" onClick={exportMovementsToExcel}>Excel</button>
                <button type="button" onClick={exportMovementsToPdf}>PDF</button>
              </div>
            </div>
            {MovementList({ compact: true })}
          </div>
        </div>

        <div className="business-sources-grid">
          <div className="card">
            <h3>Fuentes de ingreso</h3>
            <p className="helper-copy">Define tus fuentes, plataforma de cobro y metas mensuales.</p>
            {incomeBySource.map((src) => {
              const feeInfo = PLATFORM_FEES[src.platform];
              return (
                <div className="source-row" key={src.id} style={{flexWrap:"wrap",gap:"10px"}}>
                  <div className="source-info" style={{minWidth:"140px"}}>
                    <strong>{src.name}</strong>
                    <small>{money.format(src.actual)} de {money.format(src.monthlyGoal)} meta</small>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:"4px",flex:1,minWidth:"160px"}}>
                    <select value={src.platform || "Transferencia bancaria"}
                      onChange={(e) => setIncomeSources((c) => c.map((s) => s.id === src.id ? { ...s, platform: e.target.value } : s))}
                      style={{minHeight:"32px",border:"1px solid var(--line)",borderRadius:"8px",padding:"0 8px",font:"inherit",fontSize:"12px",background:"#FAF7F5"}}>
                      {Object.keys(PLATFORM_FEES).map((k) => <option key={k}>{k}</option>)}
                    </select>
                    {feeInfo && feeInfo.pct > 0 && (
                      <div style={{display:"flex",gap:"12px",fontSize:"12px",flexWrap:"wrap"}}>
                        <span style={{color:"var(--pink)",fontWeight:700}}>Fee est.: {feeInfo.label} • -{money.format(src.feeEstimated)}</span>
                        <span style={{color:"var(--green)",fontWeight:700}}>Neto est.: {money.format(src.netEstimated)}</span>
                      </div>
                    )}
                  </div>
                  <div className="source-right">
                    <Progress value={src.progress} tone={src.color} />
                    <small>{src.progress}%</small>
                    <input type="number" min="0" value={src.monthlyGoal} onChange={(e) => setIncomeSources((c) => c.map((s) => s.id === src.id ? { ...s, monthlyGoal: Number(e.target.value) } : s))} />
                    <button type="button" className="row-delete" onClick={() => confirmDelete("Eliminar?", () => setIncomeSources((c) => c.filter((s) => s.id !== src.id)))}>x</button>
                  </div>
                </div>
              );
            })}
            <form className="source-form" onSubmit={(e) => { e.preventDefault(); if (!incomeSourceForm.name.trim()) return; setIncomeSources((c) => [...c, { id: Date.now(), name: incomeSourceForm.name.trim(), monthlyGoal: Number(incomeSourceForm.monthlyGoal) || 0, color: "purple", platform: "Transferencia bancaria" }]); setIncomeSourceForm({ name: "", monthlyGoal: "" }); }}>
              <input placeholder="Nombre de la fuente" value={incomeSourceForm.name} onChange={(e) => setIncomeSourceForm((c) => ({ ...c, name: e.target.value }))} />
              <input type="number" min="0" placeholder="Meta mensual" value={incomeSourceForm.monthlyGoal} onChange={(e) => setIncomeSourceForm((c) => ({ ...c, monthlyGoal: e.target.value }))} />
              <button className="primary-button" type="submit">Agregar</button>
            </form>

            {/* Resumen total de fees */}
            {(() => {
              const totalFees = incomeSources.reduce((sum, src) => sum + calcFee(src.monthlyGoal, src.platform), 0);
              const totalNet = incomeSources.reduce((sum, src) => sum + (src.monthlyGoal - calcFee(src.monthlyGoal, src.platform)), 0);
              if (totalFees === 0) return null;
              return (
                <div style={{marginTop:"12px",padding:"12px 14px",background:"var(--pink-soft)",borderRadius:"10px",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"8px"}}>
                  <div><span style={{fontSize:"12px",color:"var(--muted)",fontWeight:800,textTransform:"uppercase"}}>Fees estimados (sobre meta)</span><br/><strong style={{color:"var(--pink)",fontSize:"18px"}}>-{money.format(totalFees)}</strong></div>
                  <div style={{textAlign:"right"}}><span style={{fontSize:"12px",color:"var(--muted)",fontWeight:800,textTransform:"uppercase"}}>Neto estimado</span><br/><strong style={{color:"var(--green)",fontSize:"18px"}}>{money.format(totalNet)}</strong></div>
                </div>
              );
            })()}
          </div>
          <div className="card insight-card">
            <h3>Lectura CEO</h3>
            <p className="helper-copy">Analisis inteligente de tu situacion actual.</p>
            <div className="ceo-reading-meta">
              <span>{businessMovementsThisWeek.length} movimientos registrados esta semana</span>
              <strong>{latestMovement ? `Ultimo: ${formatShortDate(latestMovement.date || latestMovement.createdAt)}` : "Sin movimientos aun"}</strong>
            </div>
            {insights.map((insight) => <p key={insight} style={{borderLeft:"3px solid var(--pink)",paddingLeft:"12px",margin:"8px 0"}}>{insight}</p>)}
          </div>
        </div>

        <div className="business-panel-row">
          {ReinvestmentCard()}
          <div>{BanksCard()}</div>
        </div>

        <div className="annual-budget-card card">
          <div className="budget-head">
            <div><h3>Presupuesto anual</h3><p>Planifica mes a mes.</p></div>
            <div className="budget-total"><span>Utilidad anual estimada</span><strong>{money.format(annualProfit)}</strong></div>
          </div>
          <div className="budget-table">
            <div className="budget-row budget-header"><span>Mes</span><span>Ingresos</span><span>Gastos fijos</span><span>Gastos variables</span><span>Fees</span><span>Utilidad</span></div>
            {annualBudget.map((row) => {
              const profit = Number(row.income||0)-Number(row.fixedExpenses||0)-Number(row.variableExpenses||0)-Number(row.platformFees||0);
              return (
                <div className="budget-row" key={row.month}>
                  <strong>{row.month}</strong>
                  <input type="number" min="0" value={row.income} onChange={(e) => updateAnnualBudget(row.month,"income",e.target.value)} />
                  <input type="number" min="0" value={row.fixedExpenses} onChange={(e) => updateAnnualBudget(row.month,"fixedExpenses",e.target.value)} />
                  <input type="number" min="0" value={row.variableExpenses} onChange={(e) => updateAnnualBudget(row.month,"variableExpenses",e.target.value)} />
                  <input type="number" min="0" value={row.platformFees} onChange={(e) => updateAnnualBudget(row.month,"platformFees",e.target.value)} />
                  <b style={{color: profit >= 0 ? "var(--green)" : "var(--pink)"}}>{money.format(profit)}</b>
                </div>
              );
            })}
          </div>
        </div>
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

    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Clientes</h2>
          <p>{activeClients} activas - {money.format(wonSalesTotal)} en ventas cerradas</p>
        </div>

        {/* KPIs */}
        <div className="clients-kpi-row">
          {stages.map((stage) => (
            <div className="client-kpi" key={stage}>
              <span>{stage}</span>
              <strong>{clients.filter((c) => c.status === stage).length}</strong>
              <small>{money.format(stageTotal(stage))}</small>
            </div>
          ))}
          <div className="client-kpi">
            <span>Pipeline total</span>
            <strong style={{fontSize:"14px"}}>{money.format(pipelineTotal)}</strong>
            <small>potencial en proceso</small>
          </div>
          <div className="client-kpi">
            <span>Conversion</span>
            <strong>{conversionRate}%</strong>
            <small>{totalWon} de {totalLeads}</small>
          </div>
          <div className="client-kpi">
            <span>Cierre promedio</span>
            <strong>{avgCloseDays !== null ? `${avgCloseDays}d` : "-"}</strong>
            <small>{avgCloseDays !== null ? "dias hasta venta" : "sin datos"}</small>
          </div>
          {topSource && (
            <div className="client-kpi">
              <span>Mejor fuente</span>
              <strong style={{fontSize:"13px"}}>{topSource[0]}</strong>
              <small>{topSource[1]} clienta{topSource[1] !== 1 ? "s" : ""}</small>
            </div>
          )}
        </div>

        {/* Accion del dia */}
        {priorityClient && (
          <div className="action-day-banner">
            <div className="action-day-left">
              <span className="action-day-label">Accion del dia</span>
              <strong>{priorityClient.name}</strong>
              <span>{priorityClient.status} • {money.format(priorityClient.amount)} • hace {daysSince(priorityClient.lastContact)} dias sin contacto</span>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"8px"}}>
                <button type="button" className="contact-today-btn" style={{width:"auto",padding:"0 14px"}} onClick={() => logContact(priorityClient.id, priorityClient.name)}>Contacte hoy</button>
                <a href={waLink(priorityClient)} target="_blank" rel="noreferrer"
                  style={{display:"inline-flex",alignItems:"center",gap:"6px",padding:"0 14px",minHeight:"32px",borderRadius:"8px",background:"#25d366",color:"#fff",fontSize:"12px",fontWeight:700,textDecoration:"none"}}>
                  WhatsApp
                </a>
              </div>
            </div>
            <div className="action-day-right">
              <p>{priorityClient.nextAction || "Hacer seguimiento"}</p>
              <div style={{marginTop:"8px",textAlign:"center"}}>
                <strong style={{fontSize:"28px",color:"var(--green)",display:"block",lineHeight:1}}>{contactsThisWeek}</strong>
                <small style={{color:"var(--muted)",fontSize:"11px",textTransform:"uppercase",fontWeight:800}}>contactos esta semana</small>
                <small style={{color:"var(--green)",fontSize:"11px",fontWeight:700}}>{contactsThisWeek >= 5 ? "excelente ritmo" : contactsThisWeek >= 3 ? "buen avance" : "meta: 5+"}</small>
              </div>
            </div>
          </div>
        )}

        {/* Alertas */}
        {(urgentClients.length > 0 || urgentSubscriptions.length > 0) && (
          <div className="client-alerts">
            {urgentClients.length > 0 && (
              <div className="alert-banner alert-orange">
                <strong>{urgentClients.length} lead{urgentClients.length > 1 ? "s" : ""} sin contacto:</strong> {urgentClients.map((c) => c.name).join(", ")} — actuas hoy o se enfriaran.
              </div>
            )}
            {urgentSubscriptions.length > 0 && (
              <div className="alert-banner alert-red">
                <strong>{urgentSubscriptions.length} clienta{urgentSubscriptions.length > 1 ? "s" : ""} sin seguimiento:</strong> {urgentSubscriptions.map((c) => c.name).join(", ")} — riesgo de perder la relacion.
              </div>
            )}
          </div>
        )}

        {/* Layout: formulario + pipeline */}
        <div className="clients-main-layout">

          {/* Formulario nueva clienta */}
          <form className="card clients-form-card" onSubmit={addClient}>
            <h3>Nueva clienta</h3>
            <input placeholder="Nombre" value={clientForm.name} onChange={(e) => updateClientForm("name", e.target.value)} required />
            <input placeholder="Servicio o producto" value={clientForm.service} onChange={(e) => updateClientForm("service", e.target.value)} required />
            <input placeholder="Telefono (ej: 573001234567)" value={clientForm.phone} onChange={(e) => updateClientForm("phone", e.target.value)} />
            <select value={clientForm.status} onChange={(e) => updateClientForm("status", e.target.value)}>
              {stages.map((s) => <option key={s}>{s}</option>)}
            </select>
            <label className="inline-date-field">
              <span>Último contacto</span>
              <input type="date" value={clientForm.lastContactDate} onChange={(e) => updateClientForm("lastContactDate", e.target.value)} />
            </label>
            <input placeholder="Proxima accion" value={clientForm.nextAction} onChange={(e) => updateClientForm("nextAction", e.target.value)} />
            <input placeholder="Monto potencial" type="number" min="0" value={clientForm.amount} onChange={(e) => updateClientForm("amount", e.target.value)} required />
            <select value={clientForm.source} onChange={(e) => updateClientForm("source", e.target.value)}>
              <option value="">De donde llego?</option>
              {defaultSources.map((s) => <option key={s}>{s}</option>)}
            </select>
            {clientForm.source === "Otra" && (
              <input placeholder="Cual fuente?" value={clientForm.customSource} onChange={(e) => updateClientForm("customSource", e.target.value)} />
            )}
            <button className="primary-button" type="submit">Guardar clienta</button>
          </form>

          {/* Pipeline */}
          <div className="clients-pipeline-wrap">
            <div className="clients-search-bar">
              <input placeholder="Buscar clienta por nombre..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="clients-search-input" />
            </div>
            <div className="pipeline-board">
              {stages.map((stage) => (
                <div className="pipeline-column" key={stage}>
                  <div className="pipeline-col-header">
                    <h3>{stage}</h3>
                    <small>{money.format(stageTotal(stage))}</small>
                  </div>
                  {filteredClients(stage).map((client) => {
                    const alert = getAlert(client);
                    const days = daysSince(client.lastContact);
                    return (
                      <div className={`lead-card lead-alert-${alert}`} key={client.id}>
                        <div className="lead-card-top">
                          <strong>{client.name}</strong>
                          <span className={`alert-dot alert-dot-${alert}`}></span>
                        </div>
                        <small>{client.service} • {money.format(client.amount)}</small>
                        {client.source && <small style={{color:"var(--purple)",fontWeight:700}}>{client.source}</small>}
                        <p>{client.nextAction || "Hacer seguimiento"}</p>
                        <small className="last-contact">
                          {client.lastContact ? `Último contacto: ${formatShortDate(client.lastContactDate || client.lastContact)} • hace ${days} dia${days !== 1 ? "s" : ""}` : "Sin contacto"}
                        </small>
                        <input className="client-date-input" type="date" value={inputDateFromValue(client.lastContactDate || client.lastContact)} onChange={(e) => updateClientLastContact(client.id, e.target.value)} aria-label={`Último contacto de ${client.name}`} />
                        <small className="last-contact">Actualizado: {formatShortDate(client.updatedAt || client.lastContact)}</small>
                        <div style={{display:"flex",gap:"6px",marginTop:"6px"}}>
                          <button type="button" className="contact-today-btn" style={{flex:1}} onClick={() => logContact(client.id, client.name)}>Contacte hoy</button>
                          <a href={waLink(client)} target="_blank" rel="noreferrer"
                            style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"36px",height:"32px",borderRadius:"8px",background:"#25d366",color:"#fff",fontSize:"16px",textDecoration:"none",flexShrink:0}}>
                            W
                          </a>
                        </div>
                        <div className="lead-stage-btns">
                          {stages.filter((s) => s !== stage).map((s) => (
                            <button type="button" key={s} onClick={() => moveClientStatus(client.id, s)}>{s.replace("Lead ", "")}</button>
                          ))}
                          <button type="button" className="delete-btn" onClick={() => confirmDelete("Eliminar?", () => setClients((c) => c.filter((cl) => cl.id !== client.id)))}>x</button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredClients(stage).length === 0 && (
                    <p style={{fontSize:"12px",color:"var(--muted)",textAlign:"center",padding:"12px 0"}}>Sin clientas aqui</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Clientas que pagaron */}
        <div className="paid-clients-section card">
          <div className="section-title compact-title">
            <h2>Clientas que ya pagaron</h2>
            <p>Cuida la experiencia, fomenta la recompra y los referidos.</p>
          </div>
          {paidClients.length === 0 && <p className="helper-copy">Aun no tienes ventas cerradas registradas.</p>}
          <div className="paid-client-grid">
            {paidClients.map((client) => (
              <article className="paid-client-card" key={client.id}>
                <div className="paid-client-header">
                  <div>
                    <strong>{client.name}</strong>
                    <small>{client.service} • {money.format(client.amount)}</small>
                  </div>
                  <span className={`alert-dot alert-dot-${getAlert(client)}`}></span>
                </div>
                {client.source && <small style={{color:"var(--purple)",fontWeight:700}}>{client.source}</small>}
                <small className="last-contact">{client.lastContact ? `Último contacto: ${formatShortDate(client.lastContactDate || client.lastContact)} • hace ${daysSince(client.lastContact)} dias` : "Sin contacto registrado"}</small>
                <input className="client-date-input" type="date" value={inputDateFromValue(client.lastContactDate || client.lastContact)} onChange={(e) => updateClientLastContact(client.id, e.target.value)} aria-label={`Último contacto de ${client.name}`} />
                <small className="last-contact">Actualizado: {formatShortDate(client.updatedAt || client.lastContact)}</small>
                <div style={{display:"flex",gap:"6px"}}>
                  <button type="button" className="contact-today-btn" style={{flex:1}} onClick={() => logContact(client.id, client.name)}>Contacte hoy</button>
                  <a href={waLink(client)} target="_blank" rel="noreferrer"
                    style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"36px",height:"32px",borderRadius:"8px",background:"#25d366",color:"#fff",fontSize:"16px",textDecoration:"none",flexShrink:0}}>
                    W
                  </a>
                </div>
                <textarea placeholder="Notas de seguimiento, entrega, resultados o proxima recompra..." value={client.notes || ""} onChange={(e) => updateClientNotes(client.id, e.target.value)} />
              </article>
            ))}
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
    const oldPending = contentItems.filter((i) => i.status === "Por hacer" && i.createdAt && Math.floor((Date.now() - i.createdAt) / 86400000) > 7);

    const goalMeta = {
      "Vender":      { color: "#2f9f70", bg: "#def3e8", dot: "#2f9f70" },
      "Educar":      { color: "#C9A96E", bg: "#faf3e7", dot: "#C9A96E" },
      "Conectar":    { color: "#E8836E", bg: "#fdf0ec", dot: "#E8836E" },
      "Entretener":  { color: "#8a7f7a", bg: "#f5f2f0", dot: "#8a7f7a" },
    };
    const formatIcon = { "Reel":"🎬", "Historia":"📸", "Post":"🖼️", "Carrusel":"📱", "Foto":"📷", "Articulo":"✍️", "Episodio":"🎙️" };
    const networkIcon = { "Instagram":"✦", "TikTok":"♪", "YouTube":"▶", "Spotify":"🎵", "Website":"🌐" };
    const statusMeta = {
      "Por hacer":   { dot: "#C4526A", label: "Por hacer" },
      "Guion hecho": { dot: "#C9A96E", label: "Guión hecho" },
      "Grabacion":   { dot: "#E8836E", label: "Grabación" },
      "Edicion":     { dot: "#8a7f7a", label: "Edición" },
      "Programado":  { dot: "#2f9f70", label: "Programado" },
      "Publicado":   { dot: "#2f9f70", label: "Publicado" },
    };

    const COLUMNAS = [
      { id: "grabar",     label: "Por grabar",      icon: "📹", color: "#C4526A", bg: "#FFF0F3",
        statuses: ["Por hacer", "Guion hecho"] },
      { id: "produccion", label: "En producción",   icon: "⚙️",  color: "#E8836E", bg: "#FDF0EC",
        statuses: ["Grabacion", "Edicion", "Programado"] },
      { id: "publicado",  label: "Publicado",        icon: "✅", color: "#2f9f70", bg: "#def3e8",
        statuses: ["Publicado"] },
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
            <span className="ck-kpi-label">En pipeline</span>
            <strong className="ck-kpi-val" style={{color:"#C4526A"}}>{unpublished}</strong>
            <small>por publicar</small>
          </div>
          <div className="ck-kpi">
            <span className="ck-kpi-label">Red top</span>
            <strong className="ck-kpi-val" style={{fontSize:"13px"}}>{topNetwork ? topNetwork[0] : "—"}</strong>
            <small>{topNetwork ? `${topNetwork[1]} piezas` : "sin datos"}</small>
          </div>
          <div className="ck-kpi">
            <span className="ck-kpi-label">Consistencia</span>
            <strong className="ck-kpi-val" style={{color: publishedContent >= 3 ? "var(--green)" : "var(--orange)"}}>
              {publishedContent >= 3 ? "Buena" : publishedContent >= 1 ? "Regular" : "Baja"}
            </strong>
            <small>{daysSincePublish !== null ? `hace ${daysSincePublish}d` : "sin publicar"}</small>
          </div>
        </div>

        {/* Alertas */}
        {(publishedContent >= 3 || (daysSincePublish !== null && daysSincePublish > 3) || contentItems.length === 0 || oldPending.length > 0) && (
          <div className="ck-alerts">
            {publishedContent >= 3 && (
              <div className="ck-alert ck-alert--green">Excelente consistencia — llevas {publishedContent} piezas publicadas esta semana. Sigue así.</div>
            )}
            {daysSincePublish !== null && daysSincePublish > 3 && (
              <div className="ck-alert ck-alert--orange">Llevas {daysSincePublish} días sin publicar. Una pieza simple hoy vale más que la perfección mañana.</div>
            )}
            {contentItems.length === 0 && (
              <div className="ck-alert ck-alert--orange">Aún no tienes contenido registrado. Empieza con una pieza simple que venda.</div>
            )}
            {oldPending.length > 0 && (
              <div className="ck-alert ck-alert--red">Tienes {oldPending.length} pieza{oldPending.length > 1 ? "s" : ""} pendiente{oldPending.length > 1 ? "s" : ""} por más de 7 días. Muévelas o elimínalas.</div>
            )}
          </div>
        )}

        {/* Formulario colapsable */}
        {showContentForm && (
          <form className="ck-form card" onSubmit={addContent}>
            <div className="ck-form-grid">
              <div className="ck-form-col">
                <label className="ck-label">Título del contenido</label>
                <input className="ck-input" placeholder="Ej: Cómo organicé mis finanzas siendo mamá" value={contentForm.title} onChange={(e) => updateContentForm("title", e.target.value)} required />
              </div>
              <div className="ck-form-col">
                <label className="ck-label">Hook (primera frase)</label>
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
                  <option>Instagram</option><option>YouTube</option><option>Spotify</option><option>TikTok</option><option>Website</option><option>Otra</option>
                </select>
                {contentForm.network === "Otra" && <input className="ck-input" style={{marginTop:"6px"}} placeholder="¿Cuál red?" value={contentForm.customNetwork} onChange={(e) => updateContentForm("customNetwork", e.target.value)} />}
              </div>
              <div className="ck-form-col">
                <label className="ck-label">Fecha de publicación</label>
                <input className="ck-input" type="date" value={contentForm.publishDate} onChange={(e) => updateContentForm("publishDate", e.target.value)} />
              </div>
              <div className="ck-form-col">
                <label className="ck-label">Estado inicial</label>
                <select className="ck-input" value={contentForm.status} onChange={(e) => updateContentForm("status", e.target.value)}>
                  <option>Por hacer</option><option>Guion hecho</option><option>Grabacion</option><option>Edicion</option><option>Programado</option><option>Publicado</option>
                </select>
              </div>
            </div>
            <div className="ck-form-footer">
              <button className="primary-button" type="submit">Guardar pieza</button>
              <button type="button" className="ck-cancel-btn" onClick={() => setShowContentForm(false)}>Cancelar</button>
            </div>
          </form>
        )}

        {/* Kanban */}
        <div className="ck-kanban">
          {COLUMNAS.map((col) => {
            const colItems = filteredItems.filter((i) => col.statuses.includes(i.status));
            return (
              <div className="ck-col" key={col.id}>
                <div className="ck-col-header" style={{"--col-color": col.color, "--col-bg": col.bg}}>
                  <span className="ck-col-icon">{col.icon}</span>
                  <span className="ck-col-label">{col.label}</span>
                  <span className="ck-col-count">{colItems.length}</span>
                </div>
                <div className="ck-col-body">
                  {colItems.length === 0 && (
                    <div className="ck-empty">Sin piezas aquí</div>
                  )}
                  {colItems.map((item) => {
                    const gm = goalMeta[item.goal] || goalMeta["Entretener"];
                    const sm = statusMeta[item.status] || statusMeta["Por hacer"];
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
                              <option>Por hacer</option><option>Guion hecho</option><option>Grabacion</option><option>Edicion</option><option>Programado</option><option>Publicado</option>
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
    const homeProgress    = homeTasks.length ? Math.round((completedHomeTasks / homeTasks.length) * 100) : 0;
    const mentalLoad      = homeTasks.filter(t => !t.done).length;
    const mentalLoadLevel = mentalLoad >= 8 ? "alta" : mentalLoad >= 4 ? "media" : "baja";
    const mentalLoadColor = mentalLoad >= 8 ? "var(--purple)" : mentalLoad >= 4 ? "var(--orange)" : "var(--green)";
    const delegatedTasks  = homeTasks.filter(t => t.delegate && t.delegate.trim() !== "");
    const urgentTasks     = homeTasks.filter(t => !t.done && t.priority === "Urgente");
    const todayDay        = ["D","L","M","X","J","V","S"][new Date().getDay()];
    const today0          = new Date(); today0.setHours(0,0,0,0);
    const withDiff        = appointments.map(a => ({ ...a, diff: Math.round((new Date(a.date+"T00:00:00") - today0) / 86400000) }));
    const upcomingAppts   = withDiff.filter(a => a.diff >= 0).sort((a,b) => a.diff - b.diff);
    const DAY_LABELS      = [["L","Lunes"],["M","Martes"],["X","Miércoles"],["J","Jueves"],["V","Viernes"],["S","Sábado"],["D","Domingo"]];
    const TYPE_ICONS      = { "Médico":"🩺","Colegio":"🎒","Dentista":"🦷","Reunión":"📋","Pago":"💳","Cumpleaños":"🎂","Otro":"📌" };
    const daysLabel       = d => d === 0 ? "Hoy" : d === 1 ? "Mañana" : `En ${d}d`;
    const daysColor       = d => d === 0 ? "#C4526A" : d <= 3 ? "#e87b1e" : "#1D9E75";
    const addToGCal       = appt => { const t = encodeURIComponent(appt.title); const d = appt.date.replace(/-/g,""); window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${t}&dates=${d}/${d}`, "_blank"); };
    const submitAppt      = e => { e.preventDefault(); if (!apptForm.title.trim() || !apptForm.date) return; setAppointments(c => [...c, { id:Date.now(), ...apptForm, title:apptForm.title.trim() }]); setApptForm(f => ({ ...f, title:"", date:"" })); };
    const addQuickNote    = e => { e.preventDefault(); if (!quickNoteInput.trim()) return; setQuickNotes(c => [...c, { id:Date.now(), text:quickNoteInput.trim() }]); setQuickNoteInput(""); };
    const STARTER_TASKS   = [
      { title:"Organizar cajones de la cocina", category:"Hogar / Limpieza" },
      { title:"Lista de mercado de la semana",  category:"Compras" },
      { title:"Agendar cita médica pendiente",  category:"Salud" },
      { title:"Revisar tareas del colegio",     category:"Colegio / Ninos" },
      { title:"30 minutos solo para mí",        category:"Bienestar" },
    ];
    const thisWeekMoments = (purpose.presenceMoments||[]).filter(m => {
      const d = new Date(m.date); const now = new Date();
      const monday = new Date(now); monday.setDate(now.getDate()-(now.getDay()===0?6:now.getDay()-1)); monday.setHours(0,0,0,0);
      return d >= monday;
    });
    const QUIEN_OPTS  = [["👧","Hijo/a"],["💑","Pareja"],["👵","Padres/familia"],["👯","Amigas"]];
    const toggleQuien = label => setPresenceForm(f => ({ ...f, quien: f.quien.includes(label) ? f.quien.filter(q=>q!==label) : [...f.quien, label] }));
    const savePresence = () => {
      if (!presenceForm.quien.length && !presenceForm.queHicieron.trim()) return;
      const moment = { id:Date.now(), date:new Date().toISOString(), quien:presenceForm.quien, queHicieron:presenceForm.queHicieron, tiempo:presenceForm.tiempo };
      updatePurpose("presenceMoments", [...(purpose.presenceMoments||[]), moment]);
      setPresenceForm({ quien:[], queHicieron:"", tiempo:"30 min" });
      setPresenceCelebration(true);
      setTimeout(() => setPresenceCelebration(false), 4000);
    };
    const VICTORY_MSGS = ["Ese momento cuenta para siempre. 🌸","Estar presente es el regalo más grande. 💛","No lo olvidarán. Ni tú. ✨","Eso es lo que importa de verdad. 💕","Una mamá presente no necesita ser perfecta. 🌿"];
    const victoryMsg   = VICTORY_MSGS[Math.floor(Date.now()/1000) % VICTORY_MSGS.length];
    const TABS         = ["Hoy","Semana","Tareas","Presupuesto"];

    const ApptRow = ({ appt }) => (
      <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 12px", border:`1px solid ${appt.diff===0?"rgba(196,82,106,0.3)":appt.diff<=1?"rgba(232,123,30,0.25)":"var(--line)"}`, borderRadius:"10px", background:appt.diff===0?"#fdf5f7":appt.diff<=1?"#fef8f0":"#fff" }}>
        <span style={{ fontSize:"20px", flexShrink:0 }}>{TYPE_ICONS[appt.type]||"📌"}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:"0 0 1px", fontSize:"14px", fontWeight:600, color:"var(--ink)" }}>{appt.title}</p>
          <p style={{ margin:0, fontSize:"12px", color:"var(--muted)" }}>{appt.type} · {new Date(appt.date+"T00:00:00").toLocaleDateString("es-CO",{ weekday:"short", day:"numeric", month:"short" })}</p>
        </div>
        <span style={{ fontSize:"11px", fontWeight:800, color:daysColor(appt.diff), background:`${daysColor(appt.diff)}18`, padding:"3px 8px", borderRadius:"12px", flexShrink:0, whiteSpace:"nowrap" }}>{daysLabel(appt.diff)}</span>
        <button type="button" onClick={() => addToGCal(appt)} title="Google Calendar" style={{ border:"none", background:"none", cursor:"pointer", fontSize:"16px", flexShrink:0, padding:"2px", lineHeight:1 }}>📆</button>
        <button type="button" onClick={() => setAppointments(c => c.filter(a => a.id!==appt.id))} style={{ border:"none", background:"none", color:"var(--muted)", cursor:"pointer", fontSize:"18px", flexShrink:0, lineHeight:1 }}>×</button>
      </div>
    );

    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Mi Hogar 🌸</h2>
          <p>{homeTasks.length === 0 ? "Empieza con una sola cosa hoy — no tienes que hacerlo todo" : `${completedHomeTasks} de ${homeTasks.length} tareas listas`}</p>
        </div>

        {/* KPIs — siempre visibles */}
        <div className="home-kpi-row">
          <div className="client-kpi">
            <span>Carga mental</span>
            <strong style={{color:mentalLoadColor}}>{mentalLoadLevel}</strong>
            <small>{mentalLoad} pendientes</small>
          </div>
          <div className="client-kpi">
            <span>Próximas citas</span>
            <strong style={{color:upcomingAppts.length?"var(--orange)":"var(--green)"}}>{upcomingAppts.length}</strong>
            <small>{upcomingAppts.length ? upcomingAppts[0]?.title?.slice(0,20) : "sin citas"}</small>
          </div>
          <div className="client-kpi">
            <span>Dinero familiar</span>
            <strong style={{fontSize:"14px",color:"var(--green)"}}>{money.format(homeAvailable)}</strong>
            <small>disponible</small>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{display:"flex",gap:"4px",background:"var(--line)",padding:"4px",borderRadius:"12px",marginBottom:"20px"}}>
          {TABS.map((label, i) => (
            <button key={i} type="button" onClick={() => setHomeTab(i)} style={{
              flex:1, padding:"9px 0", borderRadius:"8px", border:"none",
              background: homeTab===i ? "#fff" : "transparent",
              cursor:"pointer", fontFamily:"inherit", fontSize:"13px",
              fontWeight: homeTab===i ? 700 : 400,
              color: homeTab===i ? "var(--ink)" : "var(--muted)",
              boxShadow: homeTab===i ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition:"all 0.15s ease",
            }}>{label}</button>
          ))}
        </div>

        {/* ── TAB 0: HOY ── */}
        {homeTab === 0 && (
          <div>
            {/* Citas próximas — prominente */}
            <div className="card" style={{padding:"20px",marginBottom:"14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                <div>
                  <h3 style={{margin:"0 0 2px",fontSize:"16px"}}>Citas y recordatorios 📅</h3>
                  <p style={{margin:0,fontSize:"13px",color:"var(--muted)"}}>Lo que viene próximamente.</p>
                </div>
                <button type="button" onClick={() => setHomeTab(1)}
                  style={{fontSize:"12px",color:"#C4526A",background:"rgba(196,82,106,0.08)",border:"none",borderRadius:"8px",padding:"5px 12px",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>
                  + Agregar
                </button>
              </div>
              {upcomingAppts.length === 0 ? (
                <div style={{textAlign:"center",padding:"16px 0"}}>
                  <p style={{margin:"0 0 10px",fontSize:"13px",color:"var(--muted)"}}>Sin citas próximas.</p>
                  <button type="button" onClick={() => setHomeTab(1)} style={{padding:"8px 20px",background:"#C4526A",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",fontWeight:700}}>
                    Agregar cita
                  </button>
                </div>
              ) : (
                <div style={{display:"grid",gap:"8px"}}>
                  {upcomingAppts.slice(0,4).map(appt => <ApptRow key={appt.id} appt={appt} />)}
                  {upcomingAppts.length > 4 && (
                    <button type="button" onClick={() => setHomeTab(1)} style={{padding:"8px",background:"var(--line)",border:"none",borderRadius:"8px",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",color:"var(--muted)"}}>
                      Ver {upcomingAppts.length-4} más →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Menú + Rutina + Actividades hijos de hoy */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"12px",marginBottom:"14px"}}>
              <div className="card" style={{padding:"16px"}}>
                <p style={{margin:"0 0 6px",fontSize:"11px",fontWeight:800,textTransform:"uppercase",letterSpacing:"1px",color:"var(--muted)"}}>Menú de hoy</p>
                {weekMenu[todayDay] ? (
                  <p style={{margin:0,fontSize:"15px",fontWeight:700,color:"var(--ink)",lineHeight:1.3}}>{weekMenu[todayDay]}</p>
                ) : (
                  <p style={{margin:"0 0 6px",fontSize:"13px",color:"var(--muted)",fontStyle:"italic"}}>Sin planear</p>
                )}
                <button type="button" onClick={() => setHomeTab(1)} style={{marginTop:"8px",fontSize:"12px",color:"var(--pink)",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:0,fontWeight:600,display:"block"}}>
                  {weekMenu[todayDay] ? "Ver semana →" : "Planear →"}
                </button>
              </div>
              <div className="card" style={{padding:"16px"}}>
                <p style={{margin:"0 0 6px",fontSize:"11px",fontWeight:800,textTransform:"uppercase",letterSpacing:"1px",color:"var(--muted)"}}>Rutina de hoy</p>
                {homeRoutines[todayDay] ? (
                  <p style={{margin:0,fontSize:"15px",fontWeight:700,color:"var(--purple)",lineHeight:1.3}}>{homeRoutines[todayDay]}</p>
                ) : (
                  <p style={{margin:"0 0 6px",fontSize:"13px",color:"var(--muted)",fontStyle:"italic"}}>Sin rutina</p>
                )}
                <button type="button" onClick={() => setHomeTab(2)} style={{marginTop:"8px",fontSize:"12px",color:"var(--purple)",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:0,fontWeight:600,display:"block"}}>
                  {homeRoutines[todayDay] ? "Ver tareas →" : "Definir →"}
                </button>
              </div>
              <div className="card" style={{padding:"16px"}}>
                <p style={{margin:"0 0 6px",fontSize:"11px",fontWeight:800,textTransform:"uppercase",letterSpacing:"1px",color:"var(--muted)"}}>Hijos hoy</p>
                {kidsSchedule[todayDay] ? (
                  <p style={{margin:0,fontSize:"15px",fontWeight:700,color:"#1D9E75",lineHeight:1.3}}>{kidsSchedule[todayDay]}</p>
                ) : (
                  <p style={{margin:"0 0 6px",fontSize:"13px",color:"var(--muted)",fontStyle:"italic"}}>Sin actividades</p>
                )}
                <button type="button" onClick={() => setHomeTab(1)} style={{marginTop:"8px",fontSize:"12px",color:"#1D9E75",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:0,fontWeight:600,display:"block"}}>
                  {kidsSchedule[todayDay] ? "Ver semana →" : "Agregar →"}
                </button>
              </div>
            </div>

            {/* Notas rápidas */}
            <div className="card" style={{padding:"18px 20px"}}>
              <h3 style={{margin:"0 0 2px",fontSize:"16px"}}>Notas rápidas 📝</h3>
              <p style={{margin:"0 0 12px",fontSize:"13px",color:"var(--muted)"}}>Cosas que no quieres olvidar.</p>
              <form onSubmit={addQuickNote} style={{display:"flex",gap:"8px",marginBottom:quickNotes.length?"12px":0}}>
                <input placeholder="Anota algo rápido..." value={quickNoteInput} onChange={e => setQuickNoteInput(e.target.value)}
                  style={{flex:1,padding:"9px 12px",border:"1px solid var(--line)",borderRadius:"8px",font:"inherit",fontSize:"13px",background:"#faf7f5"}} />
                <button type="submit" style={{padding:"9px 16px",background:"#C4526A",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",fontFamily:"inherit",fontSize:"15px",fontWeight:700}}>+</button>
              </form>
              {quickNotes.length > 0 && (
                <div style={{display:"grid",gap:"6px"}}>
                  {[...quickNotes].reverse().slice(0,6).map(note => (
                    <div key={note.id} style={{display:"flex",alignItems:"flex-start",gap:"10px",padding:"8px 12px",background:"#fffcf0",border:"1px solid #ede8d0",borderRadius:"8px"}}>
                      <span style={{flex:1,fontSize:"13px",color:"var(--ink)",lineHeight:1.45}}>{note.text}</span>
                      <button type="button" onClick={() => setQuickNotes(c => c.filter(n => n.id!==note.id))}
                        style={{border:"none",background:"none",color:"var(--muted)",cursor:"pointer",fontSize:"14px",flexShrink:0,lineHeight:1}}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 1: SEMANA ── */}
        {homeTab === 1 && (
          <div>
            {/* Citas — gestión completa */}
            <div className="card" style={{padding:"20px",marginBottom:"14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                <div>
                  <h3 style={{margin:"0 0 2px",fontSize:"16px"}}>Citas importantes 📅</h3>
                  <p style={{margin:0,fontSize:"13px",color:"var(--muted)"}}>Médicos, colegios, pagos — todo en un lugar.</p>
                </div>
                {upcomingAppts.length > 0 && (
                  <span style={{fontSize:"12px",fontWeight:700,color:"#C4526A",background:"rgba(196,82,106,0.1)",padding:"3px 10px",borderRadius:"20px",flexShrink:0}}>
                    {upcomingAppts.length} próxima{upcomingAppts.length>1?"s":""}
                  </span>
                )}
              </div>
              <form onSubmit={submitAppt} style={{display:"grid",gap:"8px",marginBottom:appointments.length?"14px":0}}>
                <input placeholder="¿Qué cita? Ej: Cita pediatra, Reunión colegio..."
                  value={apptForm.title} onChange={e => setApptForm(f => ({...f,title:e.target.value}))}
                  style={{padding:"9px 12px",border:"1px solid var(--line)",borderRadius:"8px",font:"inherit",fontSize:"13px",background:"#faf7f5"}} />
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:"8px"}}>
                  <input type="date" value={apptForm.date} onChange={e => setApptForm(f => ({...f,date:e.target.value}))}
                    style={{padding:"9px 10px",border:"1px solid var(--line)",borderRadius:"8px",font:"inherit",fontSize:"13px",background:"#faf7f5"}} />
                  <select value={apptForm.type} onChange={e => setApptForm(f => ({...f,type:e.target.value}))}
                    style={{padding:"9px 10px",border:"1px solid var(--line)",borderRadius:"8px",font:"inherit",fontSize:"13px",background:"#faf7f5"}}>
                    {Object.keys(TYPE_ICONS).map(t => <option key={t}>{t}</option>)}
                  </select>
                  <button type="submit" style={{padding:"9px 16px",background:"#C4526A",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",fontFamily:"inherit",fontSize:"15px",fontWeight:700}}>+</button>
                </div>
              </form>
              {upcomingAppts.length > 0 ? (
                <div style={{display:"grid",gap:"8px"}}>
                  {upcomingAppts.map(appt => <ApptRow key={appt.id} appt={appt} />)}
                </div>
              ) : (
                <p style={{margin:0,fontSize:"13px",color:"var(--muted)",fontStyle:"italic"}}>Sin citas próximas. Agrega una arriba.</p>
              )}
            </div>

            {/* Menú semanal + Actividades */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"14px",marginBottom:"14px"}}>

              <div className="card" style={{padding:"20px"}}>
                <h3 style={{margin:"0 0 2px",fontSize:"16px"}}>Menú de la semana 🍽️</h3>
                <p style={{margin:"0 0 14px",fontSize:"13px",color:"var(--muted)"}}>Saber qué cocinar elimina la decisión diaria.</p>
                <div style={{display:"grid",gap:"7px"}}>
                  {DAY_LABELS.map(([key, name]) => (
                    <div key={key} style={{display:"flex",alignItems:"center",gap:"10px"}}>
                      <span style={{width:"30px",height:"30px",borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:800,background:todayDay===key?"#C4526A":"var(--line)",color:todayDay===key?"#fff":"var(--muted)"}}>{key}</span>
                      <input value={weekMenu[key]} onChange={e => setWeekMenu(m => ({...m,[key]:e.target.value}))}
                        placeholder={todayDay===key?"¿Qué cocinas hoy?":name+"..."}
                        style={{flex:1,padding:"7px 10px",font:"inherit",fontSize:"13px",borderRadius:"8px",border:`1px solid ${todayDay===key?"rgba(196,82,106,0.35)":"var(--line)"}`,background:todayDay===key?"#fdf5f7":"#faf7f5"}} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{padding:"20px"}}>
                <h3 style={{margin:"0 0 2px",fontSize:"16px"}}>Actividades de los hijos 🎒</h3>
                <p style={{margin:"0 0 14px",fontSize:"13px",color:"var(--muted)"}}>¿Quién va dónde? Escribe todas las actividades del día en una línea.</p>
                <div style={{display:"grid",gap:"7px"}}>
                  {DAY_LABELS.map(([key, name]) => (
                    <div key={key} style={{display:"flex",alignItems:"center",gap:"10px"}}>
                      <span style={{width:"30px",height:"30px",borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:800,background:todayDay===key?"#C4526A":"var(--line)",color:todayDay===key?"#fff":"var(--muted)"}}>{key}</span>
                      <input value={kidsSchedule[key]} onChange={e => setKidsSchedule(s => ({...s,[key]:e.target.value}))}
                        placeholder={todayDay===key?"Ej: Ana fútbol 4pm, Pedro piano 5pm":"Ej: Ana natación 3pm..."}
                        style={{flex:1,padding:"7px 10px",font:"inherit",fontSize:"13px",borderRadius:"8px",border:`1px solid ${todayDay===key?"rgba(196,82,106,0.35)":"var(--line)"}`,background:todayDay===key?"#fdf5f7":"#faf7f5"}} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Con mi familia hoy */}
            <div className="card" style={{padding:"20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
                <h3 style={{margin:0}}>Con mi familia hoy 💛</h3>
                {thisWeekMoments.length > 0 && (
                  <span style={{fontSize:"12px",fontWeight:700,color:"var(--pink)",background:"rgba(212,104,122,0.1)",padding:"3px 10px",borderRadius:"20px"}}>
                    {thisWeekMoments.length} momento{thisWeekMoments.length>1?"s":""} esta semana
                  </span>
                )}
              </div>
              <p style={{margin:"0 0 16px",fontSize:"13px",color:"var(--muted)"}}>No mides el tiempo — mides la intención. ¿Con quién estuviste hoy?</p>
              {presenceCelebration ? (
                <div style={{padding:"20px",background:"linear-gradient(135deg,rgba(212,104,122,0.08),rgba(47,159,112,0.08))",borderRadius:"14px",textAlign:"center",border:"2px solid rgba(212,104,122,0.2)"}}>
                  <p style={{fontSize:"24px",margin:"0 0 6px"}}>🌸</p>
                  <p style={{margin:0,fontWeight:700,fontSize:"15px",color:"var(--ink)"}}>{victoryMsg}</p>
                </div>
              ) : (
                <div style={{display:"grid",gap:"14px"}}>
                  <div>
                    <p style={{margin:"0 0 8px",fontSize:"13px",fontWeight:600,color:"var(--ink)"}}>¿Con quién?</p>
                    <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                      {QUIEN_OPTS.map(([icon,label]) => (
                        <button key={label} type="button" onClick={() => toggleQuien(label)}
                          style={{display:"flex",alignItems:"center",gap:"6px",padding:"7px 14px",borderRadius:"20px",border:`2px solid ${presenceForm.quien.includes(label)?"var(--pink)":"var(--line)"}`,background:presenceForm.quien.includes(label)?"rgba(212,104,122,0.08)":"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",fontWeight:presenceForm.quien.includes(label)?700:400}}>
                          {icon} {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p style={{margin:"0 0 6px",fontSize:"13px",fontWeight:600,color:"var(--ink)"}}>¿Qué hicieron?</p>
                    <textarea value={presenceForm.queHicieron} onChange={e => setPresenceForm(f=>({...f,queHicieron:e.target.value}))}
                      placeholder="Ej: Leímos un cuento antes de dormir. Cocinamos juntos..."
                      style={{width:"100%",minHeight:"64px",padding:"10px 12px",border:"1px solid var(--line)",borderRadius:"10px",font:"inherit",fontSize:"13px",resize:"none",boxSizing:"border-box",background:"#faf7f5"}} />
                  </div>
                  <div>
                    <p style={{margin:"0 0 8px",fontSize:"13px",fontWeight:600,color:"var(--ink)"}}>¿Cuánto tiempo?</p>
                    <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                      {["15 min","30 min","1 hora","Más de 1 hora"].map(t => (
                        <button key={t} type="button" onClick={() => setPresenceForm(f=>({...f,tiempo:t}))}
                          style={{padding:"7px 14px",borderRadius:"20px",border:`2px solid ${presenceForm.tiempo===t?"var(--purple)":"var(--line)"}`,background:presenceForm.tiempo===t?"rgba(107,70,193,0.08)":"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",fontWeight:presenceForm.tiempo===t?700:400}}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={savePresence} disabled={!presenceForm.quien.length&&!presenceForm.queHicieron.trim()}
                    style={{padding:"12px",background:"var(--pink)",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontFamily:"inherit",fontSize:"14px",fontWeight:700,opacity:(!presenceForm.quien.length&&!presenceForm.queHicieron.trim())?0.5:1}}>
                    Guardar este momento 🌸
                  </button>
                </div>
              )}
              {thisWeekMoments.length > 0 && (
                <div style={{marginTop:"16px",borderTop:"1px solid var(--line)",paddingTop:"14px"}}>
                  <p style={{margin:"0 0 10px",fontSize:"12px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",color:"var(--muted)"}}>Esta semana</p>
                  <div style={{display:"grid",gap:"8px"}}>
                    {thisWeekMoments.slice(-5).reverse().map(m => (
                      <div key={m.id} style={{display:"flex",alignItems:"flex-start",gap:"10px",padding:"10px 12px",background:"rgba(212,104,122,0.04)",borderRadius:"10px",border:"1px solid rgba(212,104,122,0.12)"}}>
                        <span style={{fontSize:"18px",flexShrink:0}}>💛</span>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{margin:"0 0 2px",fontSize:"13px",fontWeight:600,color:"var(--ink)"}}>{m.quien.join(" · ")} — {m.tiempo}</p>
                          {m.queHicieron && <p style={{margin:0,fontSize:"12px",color:"var(--muted)",whiteSpace:"pre-wrap"}}>{m.queHicieron}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {thisWeekMoments.length >= 5 && (
                    <div style={{marginTop:"12px",padding:"12px 16px",background:"linear-gradient(135deg,rgba(212,104,122,0.08),rgba(47,159,112,0.06))",borderRadius:"12px",textAlign:"center"}}>
                      <p style={{margin:0,fontWeight:700,fontSize:"14px",color:"var(--ink)"}}>🏆 5 momentos esta semana — eso es presencia real.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: TAREAS ── */}
        {homeTab === 2 && (
          <div>
            {mentalLoad >= 8 && (
              <div className="alert-banner alert-red" style={{marginBottom:"14px"}}>
                Tu carga mental está alta. Elige 3 tareas para hoy y deja el resto para después.
              </div>
            )}
            {urgentTasks.length > 0 && (
              <div className="alert-banner alert-orange" style={{marginBottom:"14px"}}>
                {urgentTasks.length} urgente{urgentTasks.length>1?"s":""}: {urgentTasks.map(t => t.title).join(", ")}
              </div>
            )}
            {homeTasks.length === 0 && (
              <div className="card" style={{marginBottom:"16px",background:"linear-gradient(135deg,#fdf9f6,#fef4f0)",border:"2px dashed #e8d5c4",padding:"24px"}}>
                <h3 style={{margin:"0 0 6px",fontSize:"16px"}}>¿Por dónde empiezo? 🌱</h3>
                <p style={{margin:"0 0 16px",fontSize:"13px",color:"var(--muted)"}}>Elige una tarea o escribe la tuya. Una sola ya cuenta.</p>
                <div style={{display:"grid",gap:"8px"}}>
                  {STARTER_TASKS.map(t => (
                    <button key={t.title} type="button"
                      onClick={() => setHomeTasks(c => [...c, {id:Date.now()+Math.random(),title:t.title,category:t.category,priority:"Normal",delegate:"",done:false,createdAt:new Date().toISOString()}])}
                      style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",border:"1px solid var(--line)",borderRadius:"10px",background:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",textAlign:"left",color:"var(--ink)"}}>
                      <span style={{fontSize:"18px"}}>{t.category==="Bienestar"?"💆":t.category==="Compras"?"🛒":t.category==="Salud"?"💊":t.category==="Colegio / Ninos"?"🎒":"🧹"}</span>
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="home-main-layout">
              <div className="home-left-col">
                <form className="card home-form-card" onSubmit={addHomeTask}>
                  <h3>Nueva tarea</h3>
                  <input placeholder="Tarea del hogar" value={homeForm.title} onChange={e => updateHomeForm("title",e.target.value)} required />
                  <select value={homeForm.category} onChange={e => updateHomeForm("category",e.target.value)}>
                    <option>Rutina</option><option>Compras</option><option>Colegio / Ninos</option>
                    <option>Salud</option><option>Hogar / Limpieza</option><option>Bienestar</option><option>Calendario</option>
                  </select>
                  <select value={homeForm.priority} onChange={e => updateHomeForm("priority",e.target.value)}>
                    <option>Normal</option><option>Urgente</option><option>Puede esperar</option>
                  </select>
                  <input placeholder="Delegar a... (opcional)" value={homeForm.delegate} onChange={e => updateHomeForm("delegate",e.target.value)} />
                  <button className="primary-button" type="submit">Guardar tarea</button>
                </form>
                <div className="card home-form-card" style={{marginTop:"0"}}>
                  <h3>Lista de mercado</h3>
                  <p className="helper-copy">Agrega lo que necesitas comprar esta semana.</p>
                  <form onSubmit={e => { e.preventDefault(); if (!groceryForm.trim()) return; setGroceryList(c => [...c,{id:Date.now(),text:groceryForm.trim(),done:false}]); setGroceryForm(""); }} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"8px"}}>
                    <input placeholder="Ej: Leche, pan, frutas..." value={groceryForm} onChange={e => setGroceryForm(e.target.value)}
                      style={{minHeight:"40px",border:"1px solid var(--line)",borderRadius:"8px",padding:"0 12px",font:"inherit",background:"#FAF7F5"}} />
                    <button className="primary-button" type="submit" style={{minHeight:"40px",padding:"0 14px"}}>+</button>
                  </form>
                  <div style={{display:"grid",gap:"6px",marginTop:"8px"}}>
                    {groceryList.map(item => (
                      <label key={item.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 10px",border:"1px solid var(--line)",borderRadius:"8px",background:item.done?"rgba(47,159,112,0.06)":"#fff"}}>
                        <input type="checkbox" checked={item.done} onChange={() => setGroceryList(c => c.map(g => g.id===item.id?{...g,done:!g.done}:g))} style={{accentColor:"var(--green)"}} />
                        <span style={{flex:1,fontSize:"14px",textDecoration:item.done?"line-through":"none",color:item.done?"var(--muted)":"var(--ink)"}}>{item.text}</span>
                        <button type="button" onClick={() => setGroceryList(c => c.filter(g => g.id!==item.id))}
                          style={{border:"none",background:"none",color:"var(--muted)",cursor:"pointer",fontSize:"16px",lineHeight:1}}>x</button>
                      </label>
                    ))}
                    {groceryList.length===0 && <p className="helper-copy">Tu lista está vacía.</p>}
                  </div>
                </div>
              </div>
              <div className="home-right-col">
                <div className="card">
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                    <h3 style={{margin:0}}>Rutinas y pendientes</h3>
                    <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                      <Progress value={homeProgress} tone="green" />
                      <b style={{fontSize:"13px",minWidth:"36px",textAlign:"right"}}>{homeProgress}%</b>
                    </div>
                  </div>
                  {homeTasks.length===0 && <p className="helper-copy">Agrega tu primera tarea del hogar.</p>}
                  {["Urgente","Normal","Puede esperar"].map(priority => {
                    const tasks = homeTasks.filter(t => (t.priority||"Normal")===priority);
                    if (!tasks.length) return null;
                    return (
                      <div key={priority} style={{marginBottom:"12px"}}>
                        <p style={{fontSize:"11px",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.5px",color:priority==="Urgente"?"var(--purple)":"var(--muted)",margin:"0 0 6px"}}>{priority}</p>
                        {tasks.map(task => (
                          <div key={task.id} className="home-task-row">
                            <input type="checkbox" checked={task.done} onChange={() => toggleHomeTask(task.id)} style={{accentColor:"var(--green)",flexShrink:0}} />
                            <div style={{flex:1,minWidth:0}}>
                              <strong style={{fontSize:"14px",textDecoration:task.done?"line-through":"none",color:task.done?"var(--muted)":"var(--ink)"}}>{task.title}</strong>
                              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"2px"}}>
                                <small style={{color:"var(--muted)"}}>{task.category}</small>
                                {task.delegate && <small style={{color:"var(--pink)",fontWeight:700}}>Delegar a: {task.delegate}</small>}
                              </div>
                            </div>
                            <button type="button" onClick={() => confirmDelete("Eliminar?",() => setHomeTasks(c => c.filter(t => t.id!==task.id)))}
                              style={{border:"none",background:"none",color:"var(--muted)",cursor:"pointer",fontSize:"16px",flexShrink:0}}>x</button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {delegatedTasks.length>0 && (
                    <div style={{marginTop:"12px",padding:"10px 12px",background:"var(--pink-soft)",borderRadius:"10px"}}>
                      <p style={{margin:"0 0 6px",fontSize:"12px",fontWeight:800,color:"var(--purple)"}}>DELEGADAS ({delegatedTasks.length})</p>
                      {delegatedTasks.map(t => <p key={t.id} style={{margin:"2px 0",fontSize:"13px",color:"var(--ink)"}}>{t.title} - {t.delegate}</p>)}
                    </div>
                  )}
                </div>
                <div className="card home-budget-card" style={{marginTop:"0"}}>
                  <h3 style={{margin:"0 0 2px",fontSize:"16px"}}>Rutinas del hogar 🧹</h3>
                  <p style={{margin:"0 0 14px",fontSize:"13px",color:"var(--muted)"}}>Qué toca hacer cada día para que el hogar funcione.</p>
                  {homeRoutines[todayDay] && (
                    <div style={{marginBottom:"12px",padding:"9px 14px",background:"rgba(107,70,193,0.07)",borderRadius:"10px",border:"1px solid rgba(107,70,193,0.18)"}}>
                      <p style={{margin:0,fontSize:"13px",color:"var(--purple)",fontWeight:700}}>Hoy toca: {homeRoutines[todayDay]}</p>
                    </div>
                  )}
                  <div style={{display:"grid",gap:"6px"}}>
                    {DAY_LABELS.map(([key,name]) => (
                      <div key={key} style={{display:"flex",alignItems:"center",gap:"9px"}}>
                        <span style={{width:"28px",height:"28px",borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:800,background:todayDay===key?"var(--purple)":"var(--line)",color:todayDay===key?"#fff":"var(--muted)"}}>{key}</span>
                        <input value={homeRoutines[key]} onChange={e => setHomeRoutines(r => ({...r,[key]:e.target.value}))}
                          placeholder={`${name}...`}
                          style={{flex:1,padding:"7px 10px",font:"inherit",fontSize:"13px",borderRadius:"7px",border:`1px solid ${todayDay===key?"rgba(107,70,193,0.3)":"var(--line)"}`,background:todayDay===key?"#f5f0fc":"#faf7f5"}} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: PRESUPUESTO ── */}
        {homeTab === 3 && (
          <div className="home-budget-card card">
            <div className="budget-head">
              <div><h3>Presupuesto del hogar 💰</h3><p>Ingresos, gastos y dinero disponible para la familia.</p></div>
              <div className="budget-total"><span>Disponible</span><strong>{money.format(homeAvailable)}</strong></div>
            </div>
            <form className="home-budget-form" onSubmit={addHomeBudgetItem}>
              <select value={homeBudgetForm.type} onChange={e => setHomeBudgetForm(c => ({...c,type:e.target.value}))}><option>Ingreso</option><option>Gasto fijo</option><option>Gasto variable</option><option>Gasto hormiga</option><option>Deuda</option><option>Ahorro</option></select>
              <input placeholder="Descripción" value={homeBudgetForm.description} onChange={e => setHomeBudgetForm(c => ({...c,description:e.target.value}))} />
              <input type="number" min="0" placeholder="Monto" value={homeBudgetForm.amount} onChange={e => setHomeBudgetForm(c => ({...c,amount:e.target.value}))} />
              <input type="date" value={homeBudgetForm.dueDate} onChange={e => setHomeBudgetForm(c => ({...c,dueDate:e.target.value}))} />
              <button className="primary-button" type="submit">Agregar</button>
            </form>
            <div className="home-money-insights">
              <article><span>Ganando</span><strong>{money.format(homeBudgetTotals.income)}</strong></article>
              <article><span>Gastando</span><strong>{money.format(homeSpent)}</strong></article>
              <article><span>Mayor fuga</span><strong>{biggestHomeLeak[0]}</strong><small>{money.format(biggestHomeLeak[1])}</small></article>
              <article><span>Ahorro</span><strong>{money.format(homeBudgetTotals.savings)}</strong></article>
            </div>
            <div className="money-track">
              <span style={{width:`${Math.min(100,homeBudgetTotals.income?(homeSpent/homeBudgetTotals.income)*100:0)}%`}}></span>
              <small>Gastado vs ingresos del hogar</small>
            </div>
            <div className="budget-list">
              {homeBudget.map(item => (
                <div className="home-budget-row" key={item.id}>
                  <div>
                    <strong>{item.description}</strong>
                    <small>{item.type} • pago: {formatShortDate(item.dueDate||item.createdAt)}</small>
                  </div>
                  <input type="date" value={inputDateFromValue(item.dueDate||item.createdAt)} onChange={e => updateHomeBudgetDate(item.id,e.target.value)} aria-label={`Fecha de pago de ${item.description}`} />
                  <b>{money.format(item.amount)}</b>
                  <button className="row-delete" type="button" onClick={() => setHomeBudget(c => c.filter(r => r.id!==item.id))}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }
  function renderCeo() {
    const todayStr    = new Date().toISOString().slice(0, 10);
    const history     = purpose.checkInHistory || [];
    const todayEntry  = history.find(c => c.date === todayStr);
    const showResults = checkInStep === 6 || (checkInStep === 0 && !!todayEntry);
    const displayResp = showResults ? (todayEntry || checkInResp) : checkInResp;

    const AFFIRMATIONS = {
      "Con energía y lista":       { word: "Imparable",   phrase: "Esa energía que sientes hoy es tuya — no fue suerte. La construiste tú, con cada decisión que tomaste." },
      "Tranquila pero cansada":    { word: "Valiente",    phrase: "El cansancio que sientes no es debilidad — es evidencia de todo lo que has cargado con amor. Eres más fuerte de lo que crees." },
      "Con mucho en la cabeza":    { word: "Capaz",       phrase: "La mente ocupada es señal de una mujer que piensa, que siente, que no se rinde. Respira. Tú puedes con esto." },
      "Abrumada":                  { word: "Suficiente",  phrase: "Hoy, exactamente como eres, eres suficiente. No tienes que resolverlo todo hoy. Solo este momento. Y en este momento, estás bien." },
      "Agradecida aunque ocupada": { word: "Sabia",       phrase: "Reconocer la gratitud en medio del caos es un regalo. Esa sabiduría que tienes es lo que te diferencia." },
    };

    const THIRTY_SUGG = {
      "Descansar sin hacer nada":        "Agenda 30 minutos el miércoles en la tarde — apaga el teléfono, acuéstate, no hagas nada. Ese descanso no es pereza: es combustible.",
      "Leer o escuchar algo inspirador": "Pon en tu calendario 30 minutos cualquier mañana esta semana — antes de que el día te consuma. Un podcast, un capítulo, algo que te alimente.",
      "Moverme o hacer ejercicio":       "Esta semana, 30 minutos de movimiento para ti. No para verte bien — para sentirte bien. Ponlo en tu calendario como reunión importante.",
      "Trabajar en mi negocio":          "Agenda una hora contigo misma esta semana para avanzar en lo que llevas posponiendo. Cierra la puerta. Apaga las notificaciones. Es tu hora.",
      "Estar en silencio y orar":        "Agenda 30 minutos de silencio esta semana. Puede ser temprano en la mañana o cuando los niños duerman. Ese tiempo contigo y con Dios es lo que te recarga.",
      "honestamente no sé":             "Está bien no saber. Esta semana, regálate 30 minutos sin agenda — sin saber qué harás con ellos. A veces el alma necesita espacio para descubrir qué necesita.",
    };

    const getHabits = (resp) => {
      if (!resp) return [];
      const { dia = "", emocional = 5, social = 5, proyectos = 5 } = resp;
      const stressed = emocional <= 5 || social <= 4 || proyectos <= 4 || dia === "Abrumada" || dia === "Con mucho en la cabeza";
      if (!stressed) return [];
      const pool = [];
      if (emocional <= 5 || dia === "Abrumada") {
        pool.push({ icon: "💧", title: "Agua antes que el caos", desc: "2 vasos apenas te despiertes — antes del café y el teléfono. La deshidratación sube el cortisol más de lo que imaginas." });
        pool.push({ icon: "🌬️", title: "3 respiraciones antes de reaccionar", desc: "Cuando sientas que vas a explotar — pausa. Inhala 4 seg, exhala 6. Eso activa el nervio vago y te regresa a ti en segundos." });
      }
      if (dia === "Abrumada" || dia === "Con mucho en la cabeza" || emocional <= 5) {
        pool.push({ icon: "📵", title: "Sin pantallas los primeros 30 min", desc: "El teléfono en la mañana activa la mente en modo reactivo antes de que hayas decidido cómo quieres estar. Esos 30 min son tuyos." });
      }
      if (proyectos <= 4 || dia === "Con mucho en la cabeza") {
        pool.push({ icon: "🌅", title: "Levántate 20 min antes que todos", desc: "No para hacer más — para llegar al día siendo tú, no como respuesta a lo que los demás necesitan de ti desde el primer segundo." });
      }
      if (emocional <= 4 || social <= 4) {
        pool.push({ icon: "🚶", title: "5 min de movimiento antes del mediodía", desc: "Caminar, estirarte, bailar una canción. El movimiento resetea el sistema nervioso más rápido que cualquier otra cosa." });
        pool.push({ icon: "🌙", title: "Teléfono fuera del cuarto al dormir", desc: "La luz azul bloquea la melatonina. Una noche de mejor sueño vale más que una hora extra de scroll." });
      }
      const seen = new Set();
      return pool.filter(h => { if (seen.has(h.title)) return false; seen.add(h.title); return true; }).slice(0, 3);
    };

    const aff    = AFFIRMATIONS[displayResp?.dia] || AFFIRMATIONS["Abrumada"];
    const sugg   = THIRTY_SUGG[displayResp?.treinta] || THIRTY_SUGG["honestamente no sé"];
    const habits = getHabits(displayResp);

    const slideStyle = {
      opacity:    checkInAnimating ? 0 : 1,
      transform:  checkInAnimating ? (checkInDirFwd ? "translateX(22px)" : "translateX(-22px)") : "translateX(0)",
      transition: "opacity 0.22s ease, transform 0.22s ease",
    };

    const goNext = (n) => { setCheckInDirFwd(true);  setCheckInAnimating(true); setTimeout(() => { setCheckInStep(n); setCheckInAnimating(false); }, 220); };
    const goBack = (n) => { setCheckInDirFwd(false); setCheckInAnimating(true); setTimeout(() => { setCheckInStep(n); setCheckInAnimating(false); }, 220); };
    const finish = () => {
      const entry = { ...checkInResp, date: todayStr };
      updatePurpose("checkInHistory", [...history.filter(c => c.date !== todayStr), entry]);
      goNext(6);
    };
    const restart = () => {
      setCheckInResp({ dia: "", pensando: "", postergando: "", treinta: "", emocional: 5, social: 5, proyectos: 5 });
      setCheckInDirFwd(true);
      setCheckInAnimating(true);
      setTimeout(() => { setCheckInStep(1); setCheckInAnimating(false); }, 220);
    };

    const StepBar = ({ current }) => (
      <div style={{ marginBottom: "28px" }}>
        <div style={{ height: "3px", background: "var(--line)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(current / 5) * 100}%`, background: "#C4526A", borderRadius: "2px", transition: "width 0.35s ease" }} />
        </div>
        <p style={{ margin: "7px 0 0", fontSize: "12px", color: "var(--muted)", textAlign: "right" }}>Paso {current} de 5</p>
      </div>
    );

    const ChipSelect = ({ options, value, onChange }) => (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "9px", marginTop: "16px" }}>
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => onChange(opt)} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "10px 16px", borderRadius: "24px",
            border: `2px solid ${value === opt ? "#C4526A" : "var(--line)"}`,
            background: value === opt ? "rgba(196,82,106,0.09)" : "#fff",
            cursor: "pointer", fontFamily: "inherit", fontSize: "14px",
            fontWeight: value === opt ? 700 : 400, color: "var(--ink)",
            transition: "all 0.15s ease",
          }}>
            {value === opt && <span style={{ fontSize: "11px", color: "#C4526A", lineHeight: 1 }}>✓</span>}
            {opt}
          </button>
        ))}
      </div>
    );

    const wrap    = { maxWidth: "560px" };
    const divider = <div style={{ height: "1px", background: "var(--line)" }} />;
    const btnNext = { flex: 2, padding: "13px", background: "#C4526A", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontFamily: "inherit", fontSize: "15px", fontWeight: 700 };
    const btnBack = { flex: 1, padding: "13px", background: "#fff", color: "var(--ink)", border: "1.5px solid var(--line)", borderRadius: "12px", cursor: "pointer", fontFamily: "inherit", fontSize: "15px", fontWeight: 600 };

    const header = (
      <div className="section-title">
        <h2>Para Mí 💛</h2>
        <p>Tu espacio. Lo que sientes, lo que necesitas, lo que sueñas.</p>
      </div>
    );

    /* ── RESULTADOS ── */
    if (showResults) {
      const recentHistory = history.slice(-8).reverse();
      return (
        <section className="panel workspace-panel">
          {header}
          <div style={wrap}>

            {/* Tarjeta unificada */}
            <div className="card" style={{ padding: 0, marginBottom: "14px", overflow: "hidden" }}>

              {/* Afirmación */}
              <div style={{ background: "#FBEAF0", padding: "24px" }}>
                <p style={{ margin: "0 0 2px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#C4526A" }}>Hoy eres</p>
                <h2 style={{ margin: "0 0 10px", fontSize: "30px", color: "#C4526A", fontWeight: 800 }}>{aff.word}</h2>
                <p style={{ margin: "0 0 14px", fontSize: "15px", lineHeight: 1.6, color: "#6f2f4b" }}>{aff.phrase}</p>
                <p style={{ margin: 0, fontSize: "13px", fontStyle: "italic", color: "#a0476b", lineHeight: 1.6 }}>Eres valiente. Eres esforzada. Eres fuerte. Puedes ser y hacer todo lo que te propongas.</p>
              </div>

              <div style={{ height: "1px", background: "#ede0e6" }} />

              {/* 30 minutos */}
              <div style={{ padding: "22px 24px" }}>
                <p style={{ margin: "0 0 5px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "var(--muted)" }}>Tu 30 minutos de esta semana</p>
                <p style={{ margin: "0 0 14px", fontSize: "14px", lineHeight: 1.6, color: "var(--ink)" }}>{sugg}</p>
                <button onClick={() => {
                    const title = encodeURIComponent("Mis 30 minutos — Para Mí");
                    const details = encodeURIComponent(sugg);
                    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`, "_blank");
                  }} style={{ padding: "11px 20px", background: "#C4526A", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  📆 Agendar en Google Calendar
                </button>
              </div>

              {divider}

              {/* 3 dimensiones */}
              <div style={{ padding: "22px 24px" }}>
                <p style={{ margin: "0 0 16px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "var(--muted)" }}>Tu semana en 3 dimensiones</p>
                {[["Estado emocional","#D4537E",displayResp?.emocional||5],["Vida social","#1D9E75",displayResp?.social||5],["Proyectos personales","#7F77DD",displayResp?.proyectos||5]].map(([label,color,val],i,arr) => (
                  <div key={label} style={{ marginBottom: i < arr.length - 1 ? "14px" : 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>{label}</span>
                      <strong style={{ fontSize: "13px", color }}>{val}/10</strong>
                    </div>
                    <div style={{ height: "7px", background: "var(--line)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${val * 10}%`, background: color, borderRadius: "4px", transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Hábitos — solo si hay señales de alerta */}
              {habits.length > 0 && (
                <>
                  {divider}
                  <div style={{ padding: "22px 24px", background: "#fdf8f5" }}>
                    <p style={{ margin: "0 0 3px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#a05a20" }}>Tu sistema nervioso necesita esto</p>
                    <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--muted)" }}>Hábitos simples que regulan cómo te sientes por dentro.</p>
                    <div style={{ display: "grid", gap: "14px" }}>
                      {habits.map((h, i) => (
                        <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                          <span style={{ fontSize: "20px", lineHeight: 1, paddingTop: "1px", flexShrink: 0 }}>{h.icon}</span>
                          <div>
                            <p style={{ margin: "0 0 3px", fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>{h.title}</p>
                            <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: 1.5 }}>{h.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Historial emocional */}
              {recentHistory.length > 1 && (
                <>
                  {divider}
                  <div style={{ padding: "18px 24px" }}>
                    <p style={{ margin: "0 0 12px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "var(--muted)" }}>Tu estado emocional — historial</p>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "48px" }}>
                      {recentHistory.slice(0, 8).reverse().map((c, i) => (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                          <div style={{
                            width: "100%", borderRadius: "3px",
                            height: `${Math.max(5, (c.emocional || 5) * 4)}px`,
                            background: (c.emocional||5) >= 7 ? "#1D9E75" : (c.emocional||5) >= 4 ? "#D4537E" : "#7F77DD",
                            transition: "height 0.4s ease",
                          }} />
                          <span style={{ fontSize: "9px", color: "var(--muted)" }}>{(c.date||"").slice(5)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button type="button" onClick={restart} style={{ width: "100%", padding: "13px", background: "var(--line)", color: "var(--ink)", border: "none", borderRadius: "12px", cursor: "pointer", fontFamily: "inherit", fontSize: "15px", fontWeight: 700 }}>
              Hacer otro check-in
            </button>
          </div>
        </section>
      );
    }

    /* ── BIENVENIDA ── */
    if (checkInStep === 0) {
      return (
        <section className="panel workspace-panel">
          {header}
          <div style={wrap}>
            <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
              <span style={{ fontSize: "46px" }}>🌸</span>
              <h3 style={{ margin: "14px 0 6px", fontSize: "21px", color: "var(--ink)", fontWeight: 800 }}>¿Lista para tu check-in de hoy?</h3>
              <p style={{ margin: "0 0 26px", color: "var(--muted)", fontSize: "14px", lineHeight: 1.6 }}>5 preguntas. 3 minutos. Solo para ti.</p>
              <button onClick={() => goNext(1)} style={{ padding: "14px 48px", background: "#C4526A", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontFamily: "inherit", fontSize: "16px", fontWeight: 700 }}>
                Empezar
              </button>
            </div>
          </div>
        </section>
      );
    }

    /* ── PASOS 1–5 ── */
    const canNext = !(checkInStep === 1 && !checkInResp.dia) && !(checkInStep === 4 && !checkInResp.treinta);

    return (
      <section className="panel workspace-panel">
        {header}
        <div style={wrap}>
          <StepBar current={checkInStep} />
          <div style={slideStyle}>

            {checkInStep === 1 && (
              <div>
                <h3 style={{ fontSize: "20px", margin: "0 0 6px", color: "var(--ink)", fontWeight: 800 }}>¿Cómo empezó tu día hoy?</h3>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--muted)" }}>Sin juicio. Solo dinos cómo llegaste aquí.</p>
                <ChipSelect options={["Con energía y lista","Tranquila pero cansada","Con mucho en la cabeza","Abrumada","Agradecida aunque ocupada"]} value={checkInResp.dia} onChange={v => setCheckInResp(r => ({ ...r, dia:v }))} />
              </div>
            )}

            {checkInStep === 2 && (
              <div>
                <h3 style={{ fontSize: "20px", margin: "0 0 6px", color: "var(--ink)", fontWeight: 800 }}>¿Qué estás pensando en este momento?</h3>
                <p style={{ margin: "0 0 14px", fontSize: "14px", color: "var(--muted)" }}>No lo sobrepienses, desahogate. Esto es solo tuyo.</p>
                <textarea value={checkInResp.pensando} onChange={e => setCheckInResp(r => ({ ...r, pensando:e.target.value }))}
                  placeholder="Lo que está en tu mente ahora mismo..."
                  style={{ width:"100%", minHeight:"120px", padding:"14px", border:"1.5px solid var(--line)", borderRadius:"12px", font:"inherit", fontSize:"14px", resize:"vertical", boxSizing:"border-box", background:"#faf7f5", lineHeight:1.6 }} />
              </div>
            )}

            {checkInStep === 3 && (
              <div>
                <h3 style={{ fontSize: "20px", margin: "0 0 6px", color: "var(--ink)", fontWeight: 800 }}>¿Qué llevas días o semanas posponiendo?</h3>
                <p style={{ margin: "0 0 14px", fontSize: "14px", color: "var(--muted)" }}>Eso que sientes cuando cierras los ojos y sabes que está pendiente.</p>
                <textarea value={checkInResp.postergando} onChange={e => setCheckInResp(r => ({ ...r, postergando:e.target.value }))}
                  placeholder="Eso que sabes que necesitas hacer pero sigues aplazando..."
                  style={{ width:"100%", minHeight:"120px", padding:"14px", border:"1.5px solid var(--line)", borderRadius:"12px", font:"inherit", fontSize:"14px", resize:"vertical", boxSizing:"border-box", background:"#faf7f5", lineHeight:1.6 }} />
              </div>
            )}

            {checkInStep === 4 && (
              <div>
                <h3 style={{ fontSize: "20px", margin: "0 0 6px", color: "var(--ink)", fontWeight: 800 }}>Si esta semana tuvieras 30 minutos solo para ti, ¿en qué los usarías?</h3>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--muted)" }}>Sin culpa. ¿Qué necesitas tú?</p>
                <ChipSelect options={["Descansar sin hacer nada","Leer o escuchar algo inspirador","Moverme o hacer ejercicio","Trabajar en mi negocio","Estar en silencio y orar","honestamente no sé"]} value={checkInResp.treinta} onChange={v => setCheckInResp(r => ({ ...r, treinta:v }))} />
              </div>
            )}

            {checkInStep === 5 && (
              <div>
                <h3 style={{ fontSize: "20px", margin: "0 0 6px", color: "var(--ink)", fontWeight: 800 }}>Por último — ¿cómo está tu vida en estas tres áreas?</h3>
                <p style={{ margin: "0 0 22px", fontSize: "14px", color: "var(--muted)" }}>Del 1 al 10. Sin presión.</p>
                {[["Estado emocional","#D4537E","emocional"],["Vida social","#1D9E75","social"],["Proyectos personales","#7F77DD","proyectos"]].map(([label,color,key]) => (
                  <div key={key} style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>{label}</span>
                      <strong style={{ fontSize: "16px", color }}>{checkInResp[key]}</strong>
                    </div>
                    <input type="range" min="1" max="10" value={checkInResp[key]}
                      onChange={e => setCheckInResp(r => ({ ...r, [key]:Number(e.target.value) }))}
                      style={{ width: "100%", accentColor: color }} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>1 — Muy bajo</span>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>10 — Excelente</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "28px", gap: "12px" }}>
            {checkInStep > 1
              ? <button onClick={() => goBack(checkInStep - 1)} style={btnBack}>← Atrás</button>
              : <div style={{ flex: 1 }} />
            }
            {checkInStep < 5
              ? <button onClick={() => goNext(checkInStep + 1)} disabled={!canNext} style={{ ...btnNext, opacity: canNext ? 1 : 0.45 }}>Siguiente →</button>
              : <button onClick={finish} style={btnNext}>Ver mi resultado ✨</button>
            }
          </div>
        </div>
      </section>
    );
  }

  function MovementForm() {
    return (
      <form className="card form-card" onSubmit={addMovement}>
        <h3>Agregar movimiento</h3>
        <div className="segmented"><button type="button" className={form.type === "income" ? "selected" : ""} onClick={() => updateMovementType("income")}>Ingreso</button><button type="button" className={form.type === "expense" ? "selected" : ""} onClick={() => updateMovementType("expense")}>Gasto</button></div>
        <input placeholder="Descripcion" value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
        <input placeholder="Categoria" value={form.category} onChange={(event) => updateForm("category", event.target.value)} />
        <select value={form.classification} onChange={(event) => updateForm("classification", event.target.value)}>
          {form.type === "income" ? (
            <>
              <option>Servicios</option>
              <option>Productos</option>
              <option>Otros ingresos</option>
            </>
          ) : (
            <>
              <option>Gasto fijo</option>
              <option>Gasto variable</option>
              <option>Inversión de negocio</option>
            </>
          )}
        </select>
        <select value={form.bank} onChange={(event) => updateForm("bank", event.target.value)}>{banks.map((bank) => <option key={bank}>{bank}</option>)}</select>
        <input type="date" value={form.date} onChange={(event) => updateForm("date", event.target.value)} />
        <input placeholder="Monto" type="number" min="0" value={form.amount} onChange={(event) => updateForm("amount", event.target.value)} />
        <button className="primary-button" type="submit">Guardar movimiento</button>
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
        <p className="helper-copy">Usa esta reserva primero en marketing medible: anuncios, contenido que vende, email list o herramientas que traen clientas. No la mezcles con gustos personales del día.</p>
      </div>
    );
  }

  function DashboardSummaryCard() {
    return (
      <div className="card summary-card">
        <h3>Resumen desde tus pestañas</h3>
        <div className="summary-row"><span>Clientas</span><strong>{followUpClients.length}</strong><small>requieren seguimiento</small></div>
        <div className="summary-row"><span>Contenido</span><strong>{contentItems.length - publishedContent}</strong><small>piezas por mover</small></div>
        <div className="summary-row"><span>Hogar</span><strong>{pendingHomeTasks.length}</strong><small>pendientes visibles</small></div>
        <div className="summary-row"><span>Mejor ingreso</span><strong>{topIncomeSource?.category || "Sin datos"}</strong><small>{topIncomeSource?.description || "Registra ventas"}</small></div>
        <div className="summary-row"><span>ánimo</span><strong>{purpose.mood}</strong><small>La semana pasada te sentiste así. Esta semana puede ser más liviana.</small></div>
        <div className="summary-row"><span>Ventas cerradas</span><strong>{money.format(wonSalesTotal)}</strong><small>Registradas en clientas ganadas</small></div>
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
              <input type="number" min="0" value={salesGoal || ""} placeholder={money.format(monthlyGoal)}
                onChange={(e) => setSalesGoal(Number(e.target.value))}
                style={{width:"120px",minHeight:"36px",border:"1px solid var(--line)",borderRadius:"8px",padding:"0 10px",font:"inherit"}} />
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
            <div className="purpose-stat"><span>Ventas cerradas</span><strong>{totalWon} clientas</strong></div>
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
            <h3>📊 ¿De dónde vienen tus clientas?</h3>
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
              {Object.keys(sourceCounts).length === 0 && <p className="helper-copy">Agrega clientas con fuente de origen para ver este análisis.</p>}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderPricing() {
    const plans = [
      { id: "mama", name: "🌸 Mamá", price: PLAN_PRICES.mama.usd, period: "/mes USD",
        priceCop: PLAN_PRICES.mama.cop+" COP/mes", priceYear: PLAN_PRICES.mama.usdYear+" USD/año (2 meses gratis)",
        color: "var(--pink)",
        desc: "Para la mamá que quiere organizarse y tener más tiempo para sí misma.",
        features: ["Mi Hogar completo — tareas, mercado, rutinas","Mi Propósito — bienestar y presencia","Presupuesto familiar","Check-in diario","Acceso sin límites a las funciones del hogar"] },
      { id: "emprendedora", name: "💼 Emprendedora", price: PLAN_PRICES.emprendedora.usd, period: "/mes USD",
        priceCop: PLAN_PRICES.emprendedora.cop+" COP/mes", priceYear: PLAN_PRICES.emprendedora.usdYear+" USD/año (2 meses gratis)",
        color: "var(--purple)",
        desc: "Para la mamá que tiene un negocio o quiere emprender.",
        features: ["Todo el plan Mamá incluido","Mi Negocio y Mis Clientas","Studio de contenido (60 generaciones/mes)","Mi Contenido — planificador","Reporte semanal","Soporte email 48h"] },
      { id: "ceo", name: "👑 CEO", price: PLAN_PRICES.ceo.usd, period: "/mes USD",
        priceCop: PLAN_PRICES.ceo.cop+" COP/mes", priceYear: PLAN_PRICES.ceo.usdYear+" USD/año (2 meses gratis)",
        badge: "RECOMENDADO", color: "var(--gold,#c9a96e)",
        desc: "Para la mamá que quiere el hogar organizado Y escalar su negocio.",
        features: ["Todo ilimitado — hogar y negocio","Studio con 200 generaciones/mes","Exportar Excel y PDF","Proyección de ingresos","Pomodoro flotante","Soporte prioritario 24h","Acceso anticipado a nuevas funciones"] },
    ];
    return (
      <section className="panel workspace-panel">
        <div className="section-title"><h2>Planes y Precios</h2><p>14 días de prueba gratis con acceso completo — elige tu plan cuando estés lista</p></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"20px",maxWidth:"1000px",margin:"0 auto"}}>
          {plans.map((plan) => {
            const isCurrent = effectivePlan===plan.id||(plan.id==="ceo"&&effectivePlan==="premium")||(plan.id==="mama"&&userMode==="mama"&&effectivePlan==="emprendedora");
            return (
              <div key={plan.id} className="card" style={{border:`2px solid ${isCurrent||plan.id==="ceo"?plan.color:"var(--line)"}`,background:plan.id==="ceo"?"linear-gradient(135deg,rgba(212,104,122,0.05),rgba(201,169,110,0.05))":"#fff",position:"relative"}}>
                {isCurrent&&<div style={{position:"absolute",top:"-12px",left:"50%",transform:"translateX(-50%)",background:plan.color,color:"#fff",padding:"4px 16px",borderRadius:"20px",fontSize:"12px",fontWeight:800}}>PLAN ACTUAL</div>}
                {plan.badge&&!isCurrent&&<div style={{position:"absolute",top:"12px",right:"12px",background:"var(--green)",color:"#fff",padding:"3px 10px",borderRadius:"20px",fontSize:"11px",fontWeight:800}}>{plan.badge}</div>}
                <div style={{padding:"24px"}}>
                  <h3 style={{margin:"0 0 4px",fontSize:"20px",color:plan.color}}>{plan.name}</h3>
                  {plan.desc&&<p style={{margin:"0 0 10px",fontSize:"13px",color:"var(--muted)",lineHeight:1.4}}>{plan.desc}</p>}
                  <div style={{fontSize:"32px",fontWeight:800,color:plan.color,lineHeight:1,marginBottom:"2px"}}>{plan.price}<span style={{fontSize:"14px",fontWeight:400,color:"var(--muted)"}}>{plan.period}</span></div>
                  {plan.priceCop&&<p style={{margin:"0 0 2px",fontSize:"13px",color:"var(--muted)"}}>{plan.priceCop}</p>}
                  {plan.priceYear&&<p style={{margin:"0 0 16px",fontSize:"12px",color:"var(--green)",fontWeight:700}}>{plan.priceYear}</p>}
                  <div style={{display:"grid",gap:"10px",marginBottom:"20px"}}>
                    {plan.features.map((f)=>(<div key={f} style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"13px"}}><span style={{color:plan.color,fontSize:"16px",flexShrink:0}}>?</span><span>{f}</span></div>))}
                  </div>
                  {isCurrent?(
                    <div style={{padding:"10px",background:"rgba(0,0,0,0.05)",borderRadius:"8px",textAlign:"center",color:plan.color,fontWeight:700,fontSize:"14px"}}>Plan actual</div>
                  ):plan.id==="free"?(
                    <button className="primary-button" onClick={()=>setUserPlan("free")} style={{width:"100%",background:"var(--muted)"}}>Cambiar a gratis</button>
                  ):(
                    <button className="primary-button" style={{width:"100%",background:plan.color,fontSize:"15px",opacity:0.7,cursor:"not-allowed"}} disabled>Próximamente</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="card" style={{maxWidth:"1000px",margin:"28px auto 0",padding:"24px"}}>
          <h3 style={{margin:"0 0 16px"}}>Tu uso actual • Plan {effectivePlan==="free"?"Gratis":effectivePlan==="emprendedora"?"Emprendedora":"CEO"}</h3>
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
          <p style={{margin:"0 0 16px",color:"var(--muted)",fontSize:"14px"}}>Si eres estudiante de UMP Academy, revisa tu correo de bienvenida para encontrar tu código de acceso CEO gratis por 90 días.</p>
          {!showBetaInput?(
            <button className="primary-button" style={{padding:"10px 24px"}} onClick={()=>setShowBetaInput(true)}>Tengo un código</button>
          ):(
            <form onSubmit={activateBetaCode} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"10px",maxWidth:"480px"}}>
              <input placeholder="Ingresa tu código de acceso" value={betaCode} onChange={(e)=>setBetaCode(e.target.value)} style={{minHeight:"44px",border:"1px solid var(--line)",borderRadius:"10px",padding:"0 14px",font:"inherit"}} autoFocus />
              <button className="primary-button" type="submit" style={{padding:"0 20px"}}>Activar</button>
              {betaCodeError&&<p style={{gridColumn:"1/-1",margin:0,color:"var(--purple)",fontSize:"13px",fontWeight:700}}>{betaCodeError}</p>}
            </form>
          )}
          {isBetaUser&&(effectivePlan==="ceo"||effectivePlan==="premium")&&(
            <div style={{marginTop:"16px",padding:"12px 16px",background:"var(--green-soft)",borderRadius:"10px",color:"#1a5c3a",fontWeight:700,fontSize:"14px"}}>
              ? Código activo • Plan CEO gratis por {betaDaysLeft} días más
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
          <p style={{margin:"0 0 16px",color:"var(--muted)",fontSize:"14px"}}>Si eres estudiante de UMP Academy, revisa tu correo de bienvenida para encontrar tu código de acceso Premium gratis por 90 días.</p>
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
          {isBetaUser && effectivePlan === "premium" && (
            <div style={{marginTop:"16px",padding:"12px 16px",background:"var(--green-soft)",borderRadius:"10px",color:"#1a5c3a",fontWeight:700,fontSize:"14px"}}>
              ? Código activo • Premium gratis por {betaDaysLeft} días más
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










  function renderTerminos() {
    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Términos y Condiciones</h2>
          <button type="button" onClick={() => setActiveView('dashboard')} style={{border:"1px solid var(--line)",background:"#fff",borderRadius:"8px",padding:"8px 16px",cursor:"pointer",fontSize:"13px",fontWeight:700}}>? Volver</button>
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

  function renderPrivacidad() {
    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Política de Privacidad</h2>
          <button type="button" onClick={() => setActiveView('dashboard')} style={{border:"1px solid var(--line)",background:"#fff",borderRadius:"8px",padding:"8px 16px",cursor:"pointer",fontSize:"13px",fontWeight:700}}>? Volver</button>
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











