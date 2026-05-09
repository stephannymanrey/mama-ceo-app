import React, { useEffect, useMemo, useState } from "react";
import { awsAuth, isAwsConfigured } from "./lib/awsClient";
const supabase = { auth: awsAuth, from: () => ({ select: async () => ({ data: null, error: null }), upsert: async () => ({ error: null }), delete: () => ({ eq: async () => ({ error: null }) }) }) };
const isSupabaseConfigured = isAwsConfigured;
import "./App.css";

const STORAGE_KEY = "mama-ceo-app-state-v4";

// Sistema de planes
const PLAN_LIMITS = {
  free:         { movements: 30,       clients: 15,       content: 15,       homeTasks: 30 },
  emprendedora: { movements: 100,      clients: 50,       content: 50,       homeTasks: 100 },
  ceo:          { movements: Infinity, clients: Infinity, content: Infinity, homeTasks: Infinity }
};

const PLAN_PRICES = {
  emprendedora: { cop: "$59.900", usd: "$14.99", copYear: "$599.000", usdYear: "$149" },
  ceo:          { cop: "$99.900", usd: "$24.99", copYear: "$999.000", usdYear: "$249" }
};

const POMODORO_MESSAGES = [
  "Respira. Lo que hiciste en este bloque importa.",
  "Tómate el descanso — tu cerebro lo necesita para rendir.",
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
  "Cobrar y facturar": { auto: "Usa Stripe, PayU o Wompi — el cobro llega solo sin que escribas a nadie.", delegate: "Una asistente administrativa puede gestionar facturas y cobros." },
  "Diseñar piezas gráficas": { auto: "Crea plantillas en Canva que solo cambias de texto cada semana.", delegate: "Una diseñadora freelance puede hacer el paquete mensual por horas." },
  "Responder mensajes y comentarios": { auto: "Configura respuestas rápidas en WhatsApp Business e Instagram.", delegate: "Una community manager puede manejar la bandeja de entrada." },
  "Mercado y compras del hogar": { auto: "Crea una lista fija en Rappi o el supermercado online de tu ciudad.", delegate: "Puedes delegar las compras a un familiar o servicio de domicilios." },
  "Limpieza y orden del hogar": { auto: "Establece una rutina de 15 min diarios para mantener el orden.", delegate: "Un servicio de limpieza semanal libera horas valiosas." },
  "Rutina de mañana con los niños": { protect: "Este tiempo no se delega — se simplifica. Crea una rutina visual que los niños puedan seguir solos con tu guía." },
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
  "Mi calma tambien es estrategia.",
  "Dios me da sabiduria para elegir lo importante.",
  "Puedo liderar mi negocio sin abandonar mi hogar ni abandonarme a mi.",
  "Una accion correcta vale mas que diez hechas desde ansiedad."
];

const promesas = [
  "Dios tiene planes de bien para ti, no de mal. Tu futuro tiene esperanza.",
  "Cuando pides sabiduría con fe, él la da generosamente y sin reproche.",
  "Todo lo puedes cuando él te fortalece. No en tus fuerzas, sino en las suyas.",
  "Dios cuida de ti. No tienes que cargar sola con la ansiedad de mañana.",
  "Cuando estás cansada y cargada, hay descanso real esperando por ti.",
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

const menu = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "business", label: "Negocio", icon: "💼" },
  { id: "clients", label: "Clientes", icon: "👩‍💼" },
  { id: "content", label: "Contenido", icon: "📱" },
  { id: "home", label: "Hogar", icon: "🌸" },
  { id: "ceo", label: "Propósito & Impacto", icon: "✨" },
  { id: "report", label: "Reporte semanal", icon: "📊" }
];

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

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const API_URL = "https://p5ftnawyxe.execute-api.us-east-1.amazonaws.com/default/mamaceo-user-data";

async function loadRemoteState(userId) {
  if (!userId) return null;
  try {
    const res = await fetch(`${API_URL}?userId=${userId}`);
    const json = await res.json();
    return json.data ?? null;
  } catch (err) {
    console.error("Error cargando estado remoto:", err);
    return null;
  }
}

async function saveRemoteState(userId, data) {
  if (!userId) return;
  try {
    await fetch(`${API_URL}?userId=${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data })
    });
  } catch (err) {
    console.error("Error guardando estado remoto:", err);
  }
}

export default function App() {
  const stored = loadState();
  const [activeView, setActiveView] = useState(stored?.activeView || "dashboard");
  const [currency, setCurrency] = useState(stored?.currency || "USD");
  const isNewUser = !stored;
  const [movements, setMovements] = useState(isNewUser ? [] : (stored?.movements || initialMovements));
  const [tasks, setTasks] = useState(isNewUser ? [] : (stored?.tasks || initialTasks));
  const [clients, setClients] = useState(isNewUser ? [] : (stored?.clients || initialClients));
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
  const [annualBudget, setAnnualBudget] = useState((stored?.annualBudget || initialAnnualBudget).map((row) => {
    const income = Number(row.income || 0);
    return {
      month: row.month,
      income: income,
      fixedExpenses: row.fixedExpenses ?? Math.round(income * 0.45),
      variableExpenses: row.variableExpenses ?? Math.round(income * 0.35),
      platformFees: row.platformFees ?? 0
    };
  }));
  const [homeBudget, setHomeBudget] = useState(stored?.homeBudget || initialHomeBudget);
  const [homeBudgetForm, setHomeBudgetForm] = useState({ type: "Gasto variable", description: "", amount: "" });
  const [purpose, setPurpose] = useState({
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
    ...(stored?.purpose || {})
  });
  const [profileSetup, setProfileSetup] = useState(stored?.profileSetup || null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    businessName: "",
    businessType: "Servicios 1:1",
    stage: "Creciendo",
    monthlyGoalSetup: "",
    mainChallenge: "Conseguir clientes"
  });
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
  const [supabaseActive, setSupabaseActive] = useState(isSupabaseConfigured);
  const [businessSettings, setBusinessSettings] = useState({
    ...initialBusinessSettings,
    ...(stored?.businessSettings || {})
  });

  const [form, setForm] = useState({ type: "income", classification: "Servicios", description: "", category: "", amount: "", bank: banks[0] || "" });
  const [clientForm, setClientForm] = useState({ name: "", service: "", status: "Lead tibio", amount: "", nextAction: "", source: "", customSource: "", phone: "" });
  const [contentFilter, setContentFilter] = useState("");
  const [salesGoal, setSalesGoal] = useState(stored?.salesGoal || 0);
  const [contactLog, setContactLog] = useState(stored?.contactLog || {});
  const [clientSearch, setClientSearch] = useState("");
  const [weekBlocks, setWeekBlocks] = useState(stored?.weekBlocks || {});
  const [contentForm, setContentForm] = useState({ title: "", hook: "", format: "Reel", network: "Instagram", customNetwork: "", week: "Semana 1", status: "Por hacer", goal: "Vender" });
  const [goalForm, setGoalForm] = useState({ title: "", amount: "", period: "Mensual", status: "Activa" });
  const [homeForm, setHomeForm] = useState({ title: "", category: "Rutina", priority: "Normal", delegate: "" });
  const [groceryList, setGroceryList] = useState(stored?.groceryList || []);
  const [groceryForm, setGroceryForm] = useState("");
  const [reportWeekOffset, setReportWeekOffset] = useState(0);
  const [userPlan, setUserPlan] = useState(stored?.userPlan || "free");
  const [premiumExpiresAt, setPremiumExpiresAt] = useState(stored?.premiumExpiresAt || null);
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
              if (Notification.permission === "granted") new Notification("⏰ Bloque completado", { body: POMODORO_MESSAGES[Math.floor(Math.random() * POMODORO_MESSAGES.length)] });
            } else {
              setPomodoroMode("work");
              setPomodoroMinutes(pomodoroWorkDuration);
              if (Notification.permission === "granted") new Notification("▶ A trabajar", { body: "¡Nuevo bloque de enfoque!" });
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
    await supabase.auth.signOut();
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
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) setAuthError(translateError(error.message));
        else if (data?.user) setUser(data.user);
      } else {
        const { error } = await supabase.auth.signUp({
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
        const { data } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
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
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail);
    setAuthLoading(false);
    if (error) setAuthError(translateError(error.message));
    else { setResetEmail(authEmail); setResetStep(2); setResetPassword(true); }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const { confirmResetPassword } = await import('aws-amplify/auth');
      await confirmResetPassword({ username: resetEmail, confirmationCode: resetCode, newPassword: resetNewPassword });
      setResetPassword(false);
      setResetStep(1);
      setAuthError("✅ Contraseña actualizada. Ya puedes iniciar sesión.");
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
      if (!supabaseActive) {
        setReady(true);
        return;
      }

      const timeout = setTimeout(() => {
        console.warn("Supabase auth tardó demasiado. Usando modo local temporalmente.");
        setSupabaseActive(false);
        setReady(true);
      }, 4000);

      try {
        const { data, error } = await supabase.auth.getSession();
        clearTimeout(timeout);
        if (error) {
          console.error("Error al inicializar auth:", error);
          setSupabaseActive(false);
        } else {
          setUser(data?.session?.user ?? null);
        }
      } catch (initError) {
        clearTimeout(timeout);
        console.error("Error inesperado al inicializar auth:", initError);
        setSupabaseActive(false);
      } finally {
        setReady(true);
      }
    };

    initAuth();
    if (supabaseActive) {
      const { data: listenerData } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);
        if (event === 'PASSWORD_RECOVERY') {
          setResetPassword(true);
        }

      });
      subscription = listenerData?.subscription;
    }
    return () => subscription?.unsubscribe?.();
  }, [supabaseActive]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__MAMACEO_DEBUG = {
        ready,
        supabaseActive,
        user,
        authMode,
        authLoading,
        authError,
        resetPassword
      };
    }
  }, [ready, supabaseActive, user, authMode, authLoading, authError, resetPassword]);

  const applyLoadedState = (loaded) => {
    if (!loaded) return;
    setActiveView(loaded.activeView || "dashboard");
    setCurrency(loaded.currency || "USD");
    setMovements(loaded.movements || initialMovements);
    setTasks(loaded.tasks || initialTasks);
    setClients(loaded.clients || initialClients);
    setContentItems(loaded.contentItems || initialContent);
    setGoals(loaded.goals || initialGoals);
    setHomeTasks(loaded.homeTasks || initialHomeTasks);
    setBusinessSettings(loaded.businessSettings || initialBusinessSettings);
    setBanks(loaded.banks || initialBanks);
    setAnnualBudget(loaded.annualBudget || initialAnnualBudget);
    setHomeBudget(loaded.homeBudget || initialHomeBudget);
    setPurpose(loaded.purpose || purpose);
  };

  useEffect(() => {
    if (!ready) return;
    const restore = async () => {
      try {
        if (user && supabaseActive) {
          const remoteState = await loadRemoteState(user.id);
          if (remoteState) applyLoadedState(remoteState);
        } else {
          const storedState = loadState();
          if (storedState) applyLoadedState(storedState);
        }
      } catch (err) {
        console.error("Error restaurando estado:", err);
      }
    };
    restore();
  }, [ready, user, supabaseActive]);

  useEffect(() => {
    if (!ready || !user) return;
    if (!profileSetup) setShowProfileModal(true);
  }, [ready, user]);

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
      groceryList,
      userPlan,
      premiumExpiresAt
    };

    if (user && supabaseActive) {
      setIsSyncing(true);
      saveRemoteState(user.id, stateToSave)
        .catch((err) => {
          console.error("Error guardando en la nube:", err);
          // Fallback a localStorage si falla Supabase
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        })
        .finally(() => setIsSyncing(false));
    } else {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (err) {
        console.error("Error guardando en localStorage:", err);
      }
    }
  }, [ready, user, supabaseActive, activeView, currency, movements, tasks, clients, contentItems, goals, homeTasks, businessSettings, banks, annualBudget, homeBudget, purpose, incomeSources, salesGoal, contactLog, groceryList, userPlan, premiumExpiresAt, profileSetup, systemTasks, weekBlocks]);

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
    
    setMovements((current) => [{
      id: Date.now(),
      type: form.type,
      classification: form.classification,
      description: form.description.trim(),
      category: form.category.trim(),
      amount,
      bank: form.bank || banks[0] || ""
    }, ...current]);
    setForm({
      type: form.type,
      classification: form.classification,
      description: "",
      category: "",
      amount: "",
      bank: form.bank || banks[0] || ""
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
    
    const now = Date.now();
    setClients((current) => [{ 
      id: now, 
      name: clientForm.name.trim(), 
      service: clientForm.service.trim(), 
      status: clientForm.status, 
      amount, 
      nextAction: clientForm.nextAction.trim() || "Hacer seguimiento", 
      lastContact: now, 
      source: clientForm.source === "Otra" ? clientForm.customSource.trim() || "Otra" : clientForm.source, 
      phone: clientForm.phone.trim(), 
      createdAt: now 
    }, ...current]);
    setClientForm({ name: "", service: "", status: "Lead frio", amount: "", nextAction: "", source: "", customSource: "", phone: "" });
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
    setContentForm({ title: "", hook: "", format: "Reel", network: "Instagram", customNetwork: "", week: "Semana 1", status: "Por hacer", goal: "Vender" });
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
    const headers = ["Tipo", "Clasificación", "Descripción", "Categoría", "Banco", "Monto"];
    const rows = movements.map((movement) => [
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
    setHomeBudget((current) => [{ id: Date.now(), type: homeBudgetForm.type, description: homeBudgetForm.description.trim(), amount }, ...current]);
    setHomeBudgetForm({ type: "Gasto variable", description: "", amount: "" });
  };
  const moveClientStatus = (clientId, status) => {
    setClients((current) => current.map((client) => client.id === clientId ? { ...client, status } : client));
  };
  const logContact = (clientId, clientName) => {
    const today = new Date().toISOString().split("T")[0];
    setContactLog((prev) => ({ ...prev, [Date.now()]: { clientId, clientName, date: today } }));
    setClients((c) => c.map((cl) => cl.id === clientId ? { ...cl, lastContact: Date.now() } : cl));
  };
  const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1)); d.setHours(0,0,0,0); return d.getTime(); })();
  const contactsThisWeek = Object.values(contactLog).filter((e) => new Date(e.date).getTime() >= weekStart).length;
  const updateContentStatus = (contentId, status) => {
    setContentItems((current) => current.map((item) => item.id === contentId ? { ...item, status } : item));
  };
  const updateClientNotes = (clientId, notes) => {
    setClients((current) => current.map((client) => client.id === clientId ? { ...client, notes } : client));
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
    setShowProfileModal(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 4000);
  };

  const activeLabel = menu.find((item) => item.id === activeView)?.label || "Dashboard";

  if (!ready) {
    return (
      <div className="auth-shell">
        <div className="auth-card" style={{textAlign:"center"}}>
          <div style={{fontSize:"32px",marginBottom:"12px"}}>✨</div>
          <h2>Cargando tu espacio...</h2>
          <p>Un momento, preparando todo para ti.</p>
        </div>
      </div>
    );
  }

  if (!user && supabaseActive) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          {confirmMode ? (
            <>
              <h2>Confirma tu correo 📬</h2>
              <p>Te enviamos un código de 6 dígitos a <strong>{authEmail}</strong>. Ingrésalo aquí para activar tu cuenta.</p>
              <form className="auth-form" onSubmit={handleConfirmCode}>
                <label>
                  Código de verificación
                  <input type="text" placeholder="123456" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} required maxLength={6} style={{letterSpacing:"8px",fontSize:"22px",textAlign:"center"}} autoFocus />
                </label>
                {authError && <p className="auth-error">{authError}</p>}
                <button type="submit" className="auth-button" disabled={authLoading}>Verificar y entrar</button>
              </form>
              <button className="auth-switch" onClick={() => { setConfirmMode(false); setConfirmCode(""); setAuthError(""); }}>← Volver</button>
            </>
          ) : resetPassword ? (
            <>
              <h2>Restablecer contraseña</h2>
              <p>Ingresa el código que llegó a <strong>{resetEmail}</strong> y tu nueva contraseña.</p>
              <form className="auth-form" onSubmit={handleResetPassword}>
                <label>
                  Código de verificación
                  <input type="text" placeholder="123456" value={resetCode} onChange={(e) => setResetCode(e.target.value)} required maxLength={6} style={{letterSpacing:"8px",fontSize:"22px",textAlign:"center"}} />
                </label>
                <label>
                  Nueva contraseña
                  <input type="password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} required minLength={8} />
                </label>
                {authError && <p className="auth-error">{authError}</p>}
                <button type="submit" className="auth-button" disabled={authLoading}>Actualizar contraseña</button>
              </form>
              <button className="auth-switch" onClick={() => { setResetPassword(false); setAuthError(""); }}>← Volver</button>
            </>
          ) : (
            <>
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <label>
                Correo electrónico
                <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required />
              </label>
              {authMode === "signup" && (
                <label>
                  Tu nombre
                  <input type="text" placeholder="¿Cómo te llamamos?" value={authName} onChange={(event) => setAuthName(event.target.value)} required />
                </label>
              )}
              <label>
                Contraseña
                <div style={{position:"relative"}}>
                  <input type={showAuthPassword?"text":"password"} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required minLength={8} style={{paddingRight:"44px",width:"100%"}} />
                  <button type="button" onClick={()=>setShowAuthPassword(v=>!v)} style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",border:"none",background:"none",cursor:"pointer",fontSize:"18px",color:"var(--muted)",padding:0,lineHeight:1}}>{showAuthPassword?"🙈":"👁"}</button>
                </div>
              </label>
              {authMode === "signup" && (
                <label>
                  Repite la contraseña
                  <div style={{position:"relative"}}>
                    <input type={showAuthPasswordConfirm?"text":"password"} value={authPasswordConfirm} onChange={(event) => setAuthPasswordConfirm(event.target.value)} required minLength={8} style={{paddingRight:"44px",width:"100%"}} />
                    <button type="button" onClick={()=>setShowAuthPasswordConfirm(v=>!v)} style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",border:"none",background:"none",cursor:"pointer",fontSize:"18px",color:"var(--muted)",padding:0,lineHeight:1}}>{showAuthPasswordConfirm?"🙈":"👁"}</button>
                  </div>
                </label>
              )}
              {authError && <p className="auth-error">{authError}</p>}
              <button type="submit" className="auth-button" disabled={authLoading}>
                {authMode === "login" ? "Entrar" : "Registrarme"}
              </button>
            </form>
            <button className="auth-switch" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>
              {authMode === "login" ? "Quiero crear una cuenta" : "Ya tengo cuenta"}
            </button>
            {authMode === "login" && (
              <button type="button" className="auth-forgot" onClick={handleForgotPassword} disabled={authLoading}>
                Olvidé mi contraseña
              </button>
            )}
            </>
          )}
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
                <h2>{profileSetup ? "Editar mi perfil ✏️" : "Antes de comenzar... 🌸"}</h2>
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
              <label>
                Nombre de tu negocio
                <input placeholder="Ej: Coaching con Ana" value={profileForm.businessName} onChange={(e) => setProfileForm((c) => ({ ...c, businessName: e.target.value }))} required />
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
                <input type="number" min="0" placeholder="Ej: 3000" value={profileForm.monthlyGoalSetup} onChange={(e) => setProfileForm((c) => ({ ...c, monthlyGoalSetup: e.target.value }))} required />
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
              <button className="primary-button" type="submit" style={{marginTop:"8px"}}>{profileSetup ? "Guardar cambios" : "Guardar y comenzar ✨"}</button>
              {profileSetup && (
                <button type="button" onClick={async () => {
                  if (!window.confirm("\u00bfEstás segura de que quieres eliminar tu cuenta? Esta acción no se puede deshacer y perderás todos tus datos.")) return;
                  if (!window.confirm("\u00daltima confirmación: se eliminarán todos tus datos permanentemente.")) return;
                  try {
                    if (user && supabaseActive) {
                      await supabase.from("user_states").delete().eq("user_id", user.id);
                      await supabase.auth.signOut();
                    }
                    window.localStorage.removeItem(STORAGE_KEY);
                    setUser(null);
                    setShowProfileModal(false);
                  } catch (err) {
                    console.error("Error eliminando cuenta:", err);
                    alert("Hubo un error al eliminar la cuenta. Contáctanos en hola@umpacademy.co");
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
          <span>🌸</span>
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
                <h2>✨ Desbloquea todo tu potencial</h2>
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
                    <span style={{fontSize:"20px"}}>✓</span>
                    <span>Movimientos financieros ilimitados</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"20px"}}>✓</span>
                    <span>Clientes ilimitados</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"20px"}}>✓</span>
                    <span>Contenido ilimitado</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"20px"}}>✓</span>
                    <span>Tareas del hogar ilimitadas</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"20px"}}>✓</span>
                    <span>Sincronización en la nube</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"20px"}}>✓</span>
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
          <div className="brand-mark"></div>
          <div className="brand-script">Mamá</div>
          <div className="brand-ceo">CEO</div>
          <div className="brand-app">APP</div>
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
          <span>“</span>
          <p>{promesas[new Date().getDate() % promesas.length]}</p>
        </div>
      </aside>

      <main className="dashboard">
        <header className="topbar">
          <div>
            <p className="view-label">{activeLabel}</p>
            <h1>¡Hola, {profileSetup?.name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Mamá CEO"}!</h1>
            <p>Enfocada • Organizada • Imparable</p>
          </div>
          <div className="profile-area">
            {isSyncing && <div className="status-chip syncing">Guardando…</div>}
            {!supabaseActive && !isSyncing && <div className="status-chip">Modo local</div>}
            <button className="profile-edit-btn" onClick={() => { if (profileSetup) setProfileForm(profileSetup); setShowProfileModal(true); }} title="Editar perfil">
              <span className="profile-edit-avatar">{profileSetup?.name ? profileSetup.name.charAt(0).toUpperCase() : "M"}</span>
              <span className="profile-edit-name">{profileSetup?.name || "Mi perfil"}</span>
              <span className="profile-edit-icon">⚙️</span>
            </button>
            {supabaseActive && user && (
              <button className="signout-button" onClick={signOut}>Salir</button>
            )}
          </div>
        </header>

        {!supabaseActive && (
          <div className="local-banner">
            <strong>Modo sin conexión</strong> — tus datos se guardan en este navegador. Si cambias de dispositivo o navegador, no verás tus datos.
          </div>
        )}

        {/* Banner beta motivacional */}
        {isBetaUser && effectivePlan === "premium" && betaDaysLeft !== null && (
          <div className="beta-banner">
            {betaDaysLeft > 30 ? (
              <><span>🌸</span><div><strong>Bienvenida al grupo beta de Mamá CEO</strong><p>Tienes <b>{betaDaysLeft} días</b> de acceso Premium gratis. ¡Úsalos para construir el hábito de organizar tu negocio y hogar!</p></div></>
            ) : betaDaysLeft > 7 ? (
              <><span>✨</span><div><strong>Ya llevas un buen camino, {profileSetup?.name || "Mamá CEO"}</strong><p>Te quedan <b>{betaDaysLeft} días</b> de Premium gratis. Todo lo que organizaste aquí ya es tuyo — sigue construyendo.</p></div></>
            ) : betaDaysLeft > 0 ? (
              <><span>💛</span><div><strong>Últimos {betaDaysLeft} días de tu acceso beta</strong><p>Has avanzado mucho. Activa Premium cuando estés lista, sin presión.</p><button className="beta-banner-btn" onClick={() => setActiveView("pricing")}>Ver planes →</button></div></>
            ) : (
              <><span>🎯</span><div><strong>Tu período beta terminó</strong><p>Tus datos están seguros. Activa Premium para seguir con acceso ilimitado.</p><button className="beta-banner-btn" onClick={() => setActiveView("pricing")}>Activar Premium →</button></div></>
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

        {/* Widget Pomodoro flotante - solo plan CEO */}
        {effectivePlan === "ceo" && (
          <div className={`pomodoro-widget ${pomodoroActive ? "pomodoro-open" : ""}`}>
            <button className="pomodoro-toggle" onClick={() => { setPomodoroActive((v) => !v); requestNotificationPermission(); }} title="Temporizador de enfoque">
              {pomodoroRunning ? "⏸" : "⏱"}
              {pomodoroRunning && <span className="pomodoro-pulse" />}
            </button>
            {pomodoroActive && (
              <div className="pomodoro-panel">
                <div className="pomodoro-header">
                  <span className="pomodoro-mode-label">{pomodoroMode === "work" ? "🎯 Enfoque" : "☕ Descanso"}</span>
                  <span className="pomodoro-blocks">{pomodoroBlocks} bloques hoy</span>
                </div>
                <div className="pomodoro-clock">{String(pomodoroMinutes).padStart(2,"0")}:{String(pomodoroSeconds).padStart(2,"0")}</div>
                <div className="pomodoro-controls">
                  <button onClick={() => setPomodoroRunning((r) => !r)}>{pomodoroRunning ? "⏸ Pausar" : "▶ Iniciar"}</button>
                  <button onClick={pomodoroReset}>↺</button>
                </div>
                <div className="pomodoro-settings">
                  <label>Trabajo
                    <select value={pomodoroWorkDuration} onChange={(e) => { const v=Number(e.target.value); setPomodoroWorkDuration(v); if(!pomodoroRunning&&pomodoroMode==="work") setPomodoroMinutes(v); }}>
                      <option value={25}>25 min</option><option value={45}>45 min</option><option value={60}>60 min</option>
                    </select>
                  </label>
                  <label>Descanso
                    <select value={pomodoroBreakDuration} onChange={(e) => { const v=Number(e.target.value); setPomodoroBreakDuration(v); if(!pomodoroRunning&&pomodoroMode==="break") setPomodoroMinutes(v); }}>
                      <option value={5}>5 min</option><option value={10}>10 min</option><option value={15}>15 min</option>
                    </select>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {effectivePlan === "free" && (
          <button className="upgrade-fab" onClick={() => setActiveView("pricing")}>✨ Upgrade</button>
        )}

        <footer className="app-footer">
          <span>© 2026 UMP S.A.S • Todos los derechos reservados</span>
          <span>Hecho por Una mamá con propósito®</span>
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
    const hotLeads = clients.filter((c) => c.status === "Lead caliente").length;
    const familyDaysCount = Object.values(purpose.familyDays || {}).filter(Boolean).length;
    const presenceMsg = familyDaysCount >= 5 ? "Semana excelente de presencia 💛" : familyDaysCount >= 3 ? "Buen ritmo, sigue presente" : "Puedes mejorar tu presencia esta semana";
    const unpublishedContent = contentItems.filter((i) => i.status !== "Publicado").length;
    const hotClient = clients.filter((c) => c.status === "Lead caliente")[0];

    return (
      <>
        {/* Banner de enfoque */}
        <section className="focus-banner">
          <div className="focus-copy">
            <span className="target-icon">◎</span>
            <div>
              <p className="eyebrow">Tu enfoque de la semana</p>
              <h2>{monthlyProgress >= 80 ? "Cierra ventas pendientes y protege tu energía." : "Haz seguimiento a clientas y prioriza acciones que generan caja."}</h2>
              <span className="pill">Elige la acción pequeña que más resultado produce</span>
            </div>
          </div>
          <div className="goal-box">
            <p>Meta mensual</p>
            <strong>{money.format(monthlyGoal)}</strong>
            <Progress value={monthlyProgress} tone="purple" />
            <small>{monthlyProgress}% completado</small>
          </div>
          <div className="week-ring" style={{"--value": 75}}>
            <span>Semana</span>
            <strong>3 de 4</strong>
          </div>
        </section>

        {/* Acciones clave */}
        <section className="excellence-panel">
          <div className="excellence-copy">
            <p className="eyebrow">Tus acciones clave de hoy</p>
            <h2>Una sola acción bien elegida mueve más que diez hechas desde el agotamiento.</h2>
          </div>
          <div className="excellence-actions">
            {excellenceActions.map((action, index) => (
              <div className="excellence-action" key={action}>
                <span>{index + 1}</span>
                <p>{action}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          {/* KPIs financieros */}
          <div className="section-title">
            <h2>Resumen financiero</h2>
            <p>Actualizado con tus movimientos</p>
          </div>
          <div className="kpi-grid">
            <MetricCard title="Ingresos" value={money.format(totals.income)} change="Dinero generado" tone="green" />
            <MetricCard title="Gastos" value={money.format(totals.expenses)} change="Dinero invertido" tone="pink" />
            <MetricCard title="Utilidad" value={money.format(totals.profit)} change="Resultado actual" tone="purple" />
            <MetricCard title="Reinversión" value={money.format(reinvestmentAmount)} change={`${reinvestmentPercent}% de tus ventas`} tone="orange" />
          </div>

          {/* Fila principal: gráfica + acciones */}
          <div className="dash-main-row">
            <div className="card chart-card-wide">
              <h3>Ingresos vs gastos</h3>
              <LineChart movements={movements} />
            </div>
            <div className="card task-card">
              <h3>Acciones clave ({completedTasks}/{tasks.length})</h3>
              <p className="helper-copy">Marca las que ya completaste hoy.</p>
              {tasks.map((task) => (
                <label key={task.id} className="task-row">
                  <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} />
                  <span>{task.text}</span>
                </label>
              ))}
              <ProgressLabel label="Progreso" value={tasks.length ? Math.round((completedTasks/tasks.length)*100) : 0} tone="green" />
            </div>
          </div>

          {/* Metas */}
          <div className="dash-goals-row">
            <div className="card">
              <h3>Progreso de metas</h3>
              <div className="mini-goals">
                <MiniGoal label="Meta diaria" value={dailyProgress} amount={money.format(dailyGoal)} />
                <MiniGoal label="Meta semanal" value={weeklyProgress} amount={money.format(weeklyGoal)} />
                <MiniGoal label="Meta mensual" value={monthlyProgress} amount={money.format(monthlyGoal)} />
              </div>
            </div>
          </div>

          {/* Resúmenes de otras pestañas */}
          <div className="section-title" style={{marginTop:"20px"}}>
            <h2>Tu semana de un vistazo</h2>
            <p>Resumen de todas las áreas</p>
          </div>
          <div className="dash-summary-grid">

            {/* Clientes */}
            <div className="card dash-summary-card">
              <div className="dash-summary-icon">🧑‍💼</div>
              <h3>Clientes</h3>
              <div className="dash-summary-stat">
                <span>Leads calientes</span>
                <strong style={{color:"var(--purple)"}}>{hotLeads}</strong>
              </div>
              <div className="dash-summary-stat">
                <span>Ventas cerradas</span>
                <strong style={{color:"var(--green)"}}>{money.format(wonSalesTotal)}</strong>
              </div>
              <div className="dash-summary-stat">
                <span>Contactos esta semana</span>
                <strong>{contactsThisWeek}</strong>
              </div>
              {hotClient && (
                <p className="helper-copy" style={{marginTop:"6px"}}>Prioridad: <b>{hotClient.name}</b> — {hotClient.nextAction || "hacer seguimiento"}</p>
              )}
            </div>

            {/* Contenido */}
            <div className="card dash-summary-card">
              <div className="dash-summary-icon">📱</div>
              <h3>Contenido</h3>
              <div className="dash-summary-stat">
                <span>Publicadas</span>
                <strong style={{color:"var(--green)"}}>{publishedContent}</strong>
              </div>
              <div className="dash-summary-stat">
                <span>Por publicar</span>
                <strong style={{color:"var(--orange)"}}>{unpublishedContent}</strong>
              </div>
              <ProgressLabel label="Pipeline" value={contentItems.length ? Math.round((publishedContent/contentItems.length)*100) : 0} tone="orange" />
              {nextContent && (
                <p className="helper-copy" style={{marginTop:"6px"}}>Siguiente: <b>{nextContent.title}</b></p>
              )}
            </div>

            {/* Hogar y presencia */}
            <div className="card dash-summary-card">
              <div className="dash-summary-icon">🏠</div>
              <h3>Hogar y presencia</h3>
              <div className="dash-summary-stat">
                <span>Tareas del hogar</span>
                <strong>{completedHomeTasks}/{homeTasks.length}</strong>
              </div>
              <ProgressLabel label="Hogar" value={homeTasks.length ? Math.round((completedHomeTasks/homeTasks.length)*100) : 0} tone="green" />
              <div className="dash-summary-stat" style={{marginTop:"8px"}}>
                <span>Días presente esta semana</span>
                <strong style={{color: familyDaysCount >= 4 ? "var(--green)" : "var(--orange)"}}>{familyDaysCount} días</strong>
              </div>
              <div className="dash-summary-stat">
                <span>Momentos de conexión</span>
                <strong>{purpose.connectionMoments || 0}</strong>
              </div>
              <p className="helper-copy" style={{marginTop:"6px"}}>{presenceMsg}</p>
            </div>

            {/* Energía */}
            <div className="card dash-summary-card">
              <div className="dash-summary-icon">⚡</div>
              <h3>Energía y bienestar</h3>
              <div className="dash-summary-stat">
                <span>Ánimo</span>
                <strong style={{textTransform:"capitalize"}}>{purpose.mood}</strong>
              </div>
              <div className="dash-summary-stat">
                <span>Nivel de energía</span>
                <strong style={{textTransform:"capitalize"}}>{purpose.energy}</strong>
              </div>
              <ProgressLabel label="Autocuidado" value={Math.round(([purpose.water,purpose.walk,purpose.silence,purpose.devotional].filter(Boolean).length/4)*100)} tone="green" />
              <div className="dash-summary-stat" style={{marginTop:"4px"}}>
                <span>Horas trabajadas</span>
                <strong>{purpose.hoursWorked || 0}h</strong>
              </div>
            </div>

          </div>

          {/* Últimos movimientos + planificador */}
          {(() => {
            const today = new Date();
            const dayNames = ["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"];
            const todayName = dayNames[today.getDay()];
            const todayTasks = homeTasks.filter((t) => !t.done).slice(0, 3);
            const todayUrgent = homeTasks.filter((t) => !t.done && t.priority === "Urgente");
            return (
              <div className="card dash-today-card">
                <div className="dash-today-header">
                  <div>
                    <p className="eyebrow">Hoy es {todayName}</p>
                    <h3 style={{margin:"4px 0 0"}}>Tu hogar hoy</h3>
                  </div>
                  <button type="button" className="dash-today-link" onClick={() => setActiveView("home")}>Ver semana completa</button>
                </div>
                {todayUrgent.length > 0 && (
                  <div style={{padding:"8px 12px",background:"var(--pink-soft)",borderRadius:"8px",fontSize:"13px",color:"var(--purple)",fontWeight:700}}>
                    Urgente: {todayUrgent.map((t) => t.title).join(", ")}
                  </div>
                )}
                {todayTasks.length === 0 && <p className="helper-copy">No tienes tareas pendientes. Buen trabajo!</p>}
                {todayTasks.map((task) => (
                  <label key={task.id} style={{display:"flex",alignItems:"center",gap:"10px",fontSize:"14px"}}>
                    <input type="checkbox" checked={task.done} onChange={() => toggleHomeTask(task.id)} style={{accentColor:"var(--green)"}} />
                    <span style={{flex:1}}>{task.title}</span>
                    {task.delegate && <small style={{color:"var(--pink)",fontWeight:700}}>{task.delegate}</small>}
                  </label>
                ))}
                {homeTasks.filter((t) => !t.done).length > 3 && (
                  <p className="helper-copy">+{homeTasks.filter((t) => !t.done).length - 3} tareas mas. <button type="button" style={{border:"none",background:"none",color:"var(--purple)",fontWeight:700,cursor:"pointer",padding:0}} onClick={() => setActiveView("home")}>Ver todas</button></p>
                )}
              </div>
            );
          })()}
          <div className="dash-bottom-row">
            {MovementList()}
            {CalendarCard()}
          </div>

        </section>
      </>
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
    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Negocio</h2>
          <p>{profileSetup?.businessName || "Tu negocio"} â€¢ {profileSetup?.stage || ""}</p>
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
                        <span style={{color:"var(--pink)",fontWeight:700}}>Fee est.: {feeInfo.label} ≈ -{money.format(src.feeEstimated)}</span>
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
              <span>{priorityClient.status} â€¢ {money.format(priorityClient.amount)} â€¢ hace {daysSince(priorityClient.lastContact)} dias sin contacto</span>
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
                <strong>{urgentClients.length} lead{urgentClients.length > 1 ? "s" : ""} sin contacto:</strong> {urgentClients.map((c) => c.name).join(", ")} â€” actuas hoy o se enfriaran.
              </div>
            )}
            {urgentSubscriptions.length > 0 && (
              <div className="alert-banner alert-red">
                <strong>{urgentSubscriptions.length} clienta{urgentSubscriptions.length > 1 ? "s" : ""} sin seguimiento:</strong> {urgentSubscriptions.map((c) => c.name).join(", ")} â€” riesgo de perder la relacion.
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
                        <small>{client.service} â€¢ {money.format(client.amount)}</small>
                        {client.source && <small style={{color:"var(--purple)",fontWeight:700}}>{client.source}</small>}
                        <p>{client.nextAction || "Hacer seguimiento"}</p>
                        <small className="last-contact">
                          {client.lastContact ? `Hace ${days} dia${days !== 1 ? "s" : ""}` : "Sin contacto"}
                        </small>
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
                    <small>{client.service} â€¢ {money.format(client.amount)}</small>
                  </div>
                  <span className={`alert-dot alert-dot-${getAlert(client)}`}></span>
                </div>
                {client.source && <small style={{color:"var(--purple)",fontWeight:700}}>{client.source}</small>}
                <small className="last-contact">{client.lastContact ? `Ultimo contacto: hace ${daysSince(client.lastContact)} dias` : "Sin contacto registrado"}</small>
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
    const publishedThisWeek = contentItems.filter((i) => i.status === "Publicado" && i.week === "Semana 1").length;
    const lastPublished = contentItems.filter((i) => i.status === "Publicado" && i.createdAt).sort((a, b) => b.createdAt - a.createdAt)[0];
    const daysSincePublish = lastPublished ? Math.floor((Date.now() - lastPublished.createdAt) / 86400000) : null;
    const oldPending = contentItems.filter((i) => i.status === "Por hacer" && i.createdAt && Math.floor((Date.now() - i.createdAt) / 86400000) > 7);
    const goalColors = { "Vender": "var(--green)", "Educar": "var(--pink)", "Conectar": "var(--orange)", "Entretener": "#8a7f7a" };


    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Contenido</h2>
          <p>{publishedContent} publicadas - {contentItems.length} piezas en pipeline</p>
        </div>

        {/* KPIs */}
        <div className="content-kpi-row">
          <div className="client-kpi">
            <span>Publicadas</span>
            <strong style={{color:"var(--green)"}}>{publishedContent}</strong>
            <small>piezas listas</small>
          </div>
          <div className="client-kpi">
            <span>Pendientes</span>
            <strong style={{color:"var(--orange)"}}>{unpublished}</strong>
            <small>por mover</small>
          </div>
          <div className="client-kpi">
            <span>Red principal</span>
            <strong style={{fontSize:"13px"}}>{topNetwork ? topNetwork[0] : "-"}</strong>
            <small>{topNetwork ? `${topNetwork[1]} piezas` : "sin datos"}</small>
          </div>
          <div className="client-kpi">
            <span>Consistencia</span>
            <strong style={{color: publishedContent >= 3 ? "var(--green)" : "var(--orange)"}}>{publishedContent >= 3 ? "Buena" : publishedContent >= 1 ? "Regular" : "Baja"}</strong>
            <small>{publishedContent} publicadas</small>
          </div>
        </div>

        {/* Alertas */}
        <div className="content-alerts">
          {publishedContent >= 3 && (
            <div className="alert-banner" style={{background:"var(--green-soft)",border:"1px solid var(--green)",color:"#1a5c3a"}}>
              Excelente consistencia esta semana! Llevas {publishedContent} piezas publicadas. Sigue asi.
            </div>
          )}
          {daysSincePublish !== null && daysSincePublish > 3 && (
            <div className="alert-banner alert-orange">
              Llevas {daysSincePublish} dias sin publicar. Tu audiencia te extrana - una pieza simple hoy vale mas que la perfeccion manana.
            </div>
          )}
          {daysSincePublish === null && contentItems.length === 0 && (
            <div className="alert-banner alert-orange">
              Aun no tienes contenido registrado. Empieza con una pieza simple que venda, no con perfeccion.
            </div>
          )}
          {oldPending.length > 0 && (
            <div className="alert-banner alert-red">
              Tienes {oldPending.length} pieza{oldPending.length > 1 ? "s" : ""} en "Por hacer" desde hace mas de 7 dias: {oldPending.map((i) => i.title).join(", ")}. Muevelas o eliminalas.
            </div>
          )}
        </div>

        {/* Layout principal */}
        <div className="content-main-layout">

          {/* Formulario */}
          <form className="card content-form-card" onSubmit={addContent}>
            <h3>Nueva pieza</h3>
            <input placeholder="Titulo del contenido" value={contentForm.title} onChange={(e) => updateContentForm("title", e.target.value)} required />
            <input placeholder="Hook - primera frase que engancha" value={contentForm.hook} onChange={(e) => updateContentForm("hook", e.target.value)} />
            <label style={{fontSize:"12px",color:"var(--muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>
              Objetivo
              <select value={contentForm.goal} onChange={(e) => updateContentForm("goal", e.target.value)} style={{marginTop:"4px"}}>
                <option>Vender</option>
                <option>Educar</option>
                <option>Conectar</option>
                <option>Entretener</option>
              </select>
            </label>
            <select value={contentForm.format} onChange={(e) => updateContentForm("format", e.target.value)}>
              <option>Reel</option><option>Historia</option><option>Post</option><option>Carrusel</option><option>Foto</option><option>Articulo</option><option>Episodio</option>
            </select>
            <select value={contentForm.network} onChange={(e) => updateContentForm("network", e.target.value)}>
              <option>Instagram</option><option>YouTube</option><option>Spotify</option><option>TikTok</option><option>Website</option><option>Otra</option>
            </select>
            {contentForm.network === "Otra" && <input placeholder="Cual red social" value={contentForm.customNetwork} onChange={(e) => updateContentForm("customNetwork", e.target.value)} />}
            <select value={contentForm.week} onChange={(e) => updateContentForm("week", e.target.value)}>
              <option>Semana 1</option><option>Semana 2</option><option>Semana 3</option><option>Semana 4</option>
            </select>
            <select value={contentForm.status} onChange={(e) => updateContentForm("status", e.target.value)}>
              <option>Por hacer</option><option>Guion hecho</option><option>Grabacion</option><option>Edicion</option><option>Programado</option><option>Publicado</option>
            </select>
            <button className="primary-button" type="submit">Guardar pieza</button>
          </form>

          {/* Tabla de contenido */}
          <div className="content-table-wrap">
            <div className="content-filter-bar">
              <select value={contentFilter} onChange={(e) => setContentFilter(e.target.value)} className="content-filter-select">
                <option value="">Todas las redes</option>
                <option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Spotify</option><option>Website</option>
              </select>
            </div>
            {["Semana 1", "Semana 2", "Semana 3", "Semana 4"].map((week) => {
              const items = contentItems.filter((i) => i.week === week && (contentFilter === "" || i.network === contentFilter));
              if (items.length === 0) return null;
              return (
                <div className="content-week-block card" key={week}>
                  <h4>{week}</h4>
                  {items.map((item) => (
                    <div className="content-row-new" key={item.id}>
                      <div className="content-row-info">
                        <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
                          <strong>{item.title}</strong>
                          {item.goal && <span className="content-goal-badge" style={{background: goalColors[item.goal] || "var(--muted)", opacity:0.85}}>{item.goal}</span>}
                        </div>
                        {item.hook && <p className="content-hook">{item.hook}</p>}
                        <small>{item.format} - {item.network}</small>
                      </div>
                      <div className="content-row-actions">
                        <select value={item.status} onChange={(e) => updateContentStatus(item.id, e.target.value)}>
                          <option>Por hacer</option><option>Guion hecho</option><option>Grabacion</option><option>Edicion</option><option>Programado</option><option>Publicado</option>
                        </select>
                        <button type="button" className="row-delete" onClick={() => confirmDelete("Eliminar?", () => setContentItems((c) => c.filter((ci) => ci.id !== item.id)))}>x</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {contentItems.length === 0 && <p className="helper-copy" style={{padding:"20px 0"}}>Agrega tu primera pieza de contenido para empezar.</p>}
          </div>
        </div>
      </section>
    );
  }
  function renderHome() {
    const homeProgress = homeTasks.length ? Math.round((completedHomeTasks / homeTasks.length) * 100) : 0;
    const mentalLoad = homeTasks.filter((t) => !t.done).length;
    const mentalLoadLevel = mentalLoad >= 8 ? "alta" : mentalLoad >= 4 ? "media" : "baja";
    const mentalLoadColor = mentalLoad >= 8 ? "var(--purple)" : mentalLoad >= 4 ? "var(--orange)" : "var(--green)";
    const familyDaysCount = Object.values(purpose.familyDays || {}).filter(Boolean).length;
    const delegatedTasks = homeTasks.filter((t) => t.delegate && t.delegate.trim() !== "");
    const urgentTasks = homeTasks.filter((t) => !t.done && t.priority === "Urgente");

    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Hogar</h2>
          <p>{completedHomeTasks}/{homeTasks.length} tareas completadas esta semana</p>
        </div>

        {/* KPIs */}
        <div className="home-kpi-row">
          <div className="client-kpi">
            <span>Tareas completadas</span>
            <strong style={{color:"var(--green)"}}>{completedHomeTasks}/{homeTasks.length}</strong>
            <small>{homeProgress}% del hogar</small>
          </div>
          <div className="client-kpi">
            <span>Carga mental</span>
            <strong style={{color: mentalLoadColor}}>{mentalLoadLevel}</strong>
            <small>{mentalLoad} pendientes</small>
          </div>
          <div className="client-kpi">
            <span>Disponible familiar</span>
            <strong style={{fontSize:"14px"}}>{money.format(homeAvailable)}</strong>
            <small>despues de gastos</small>
          </div>
          <div className="client-kpi">
            <span>Dias de presencia</span>
            <strong style={{color: familyDaysCount >= 4 ? "var(--green)" : "var(--orange)"}}>{familyDaysCount} dias</strong>
            <small>{familyDaysCount >= 4 ? "excelente semana" : "puedes mejorar"}</small>
          </div>
        </div>

        {/* Alertas */}
        {mentalLoad >= 8 && (
          <div className="alert-banner alert-red" style={{marginBottom:"14px"}}>
            Tu carga mental esta alta con {mentalLoad} tareas pendientes. Revisa cuales puedes delegar o eliminar hoy.
          </div>
        )}
        {urgentTasks.length > 0 && (
          <div className="alert-banner alert-orange" style={{marginBottom:"14px"}}>
            Tienes {urgentTasks.length} tarea{urgentTasks.length > 1 ? "s" : ""} urgente{urgentTasks.length > 1 ? "s" : ""}: {urgentTasks.map((t) => t.title).join(", ")}
          </div>
        )}

        {/* Layout principal */}
        <div className="home-main-layout">

          {/* Columna izquierda: formularios */}
          <div className="home-left-col">

            {/* Agregar tarea */}
            <form className="card home-form-card" onSubmit={addHomeTask}>
              <h3>Nueva tarea</h3>
              <input placeholder="Tarea del hogar" value={homeForm.title} onChange={(e) => updateHomeForm("title", e.target.value)} required />
              <select value={homeForm.category} onChange={(e) => updateHomeForm("category", e.target.value)}>
                <option>Rutina</option>
                <option>Compras</option>
                <option>Colegio / Ninos</option>
                <option>Salud</option>
                <option>Hogar / Limpieza</option>
                <option>Bienestar</option>
                <option>Calendario</option>
              </select>
              <select value={homeForm.priority} onChange={(e) => updateHomeForm("priority", e.target.value)}>
                <option>Normal</option>
                <option>Urgente</option>
                <option>Puede esperar</option>
              </select>
              <input placeholder="Delegar a... (opcional)" value={homeForm.delegate} onChange={(e) => updateHomeForm("delegate", e.target.value)} />
              <button className="primary-button" type="submit">Guardar tarea</button>
            </form>

            {/* Lista de mercado */}
            <div className="card home-form-card" style={{marginTop:"0"}}>
              <h3>Lista de mercado</h3>
              <p className="helper-copy">Agrega lo que necesitas comprar esta semana.</p>
              <form onSubmit={(e) => { e.preventDefault(); if (!groceryForm.trim()) return; setGroceryList((c) => [...c, { id: Date.now(), text: groceryForm.trim(), done: false }]); setGroceryForm(""); }} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"8px"}}>
                <input placeholder="Ej: Leche, pan, frutas..." value={groceryForm} onChange={(e) => setGroceryForm(e.target.value)}
                  style={{minHeight:"40px",border:"1px solid var(--line)",borderRadius:"8px",padding:"0 12px",font:"inherit",background:"#FAF7F5"}} />
                <button className="primary-button" type="submit" style={{minHeight:"40px",padding:"0 14px"}}>+</button>
              </form>
              <div style={{display:"grid",gap:"6px",marginTop:"8px"}}>
                {groceryList.map((item) => (
                  <label key={item.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 10px",border:"1px solid var(--line)",borderRadius:"8px",background: item.done ? "rgba(47,159,112,0.06)" : "#fff"}}>
                    <input type="checkbox" checked={item.done} onChange={() => setGroceryList((c) => c.map((g) => g.id === item.id ? { ...g, done: !g.done } : g))} style={{accentColor:"var(--green)"}} />
                    <span style={{flex:1,fontSize:"14px",textDecoration: item.done ? "line-through" : "none",color: item.done ? "var(--muted)" : "var(--ink)"}}>{item.text}</span>
                    <button type="button" onClick={() => setGroceryList((c) => c.filter((g) => g.id !== item.id))}
                      style={{border:"none",background:"none",color:"var(--muted)",cursor:"pointer",fontSize:"16px",lineHeight:1}}>x</button>
                  </label>
                ))}
                {groceryList.length === 0 && <p className="helper-copy">Tu lista esta vacia.</p>}
              </div>
            </div>
          </div>

          {/* Columna derecha: tareas + presupuesto */}
          <div className="home-right-col">

            {/* Tareas del hogar */}
            <div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                <h3 style={{margin:0}}>Rutinas y pendientes</h3>
                <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                  <Progress value={homeProgress} tone="green" />
                  <b style={{fontSize:"13px",minWidth:"36px",textAlign:"right"}}>{homeProgress}%</b>
                </div>
              </div>
              {homeTasks.length === 0 && <p className="helper-copy">Agrega tu primera tarea del hogar.</p>}
              {["Urgente", "Normal", "Puede esperar"].map((priority) => {
                const tasks = homeTasks.filter((t) => (t.priority || "Normal") === priority);
                if (tasks.length === 0) return null;
                return (
                  <div key={priority} style={{marginBottom:"12px"}}>
                    <p style={{fontSize:"11px",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.5px",color: priority === "Urgente" ? "var(--purple)" : priority === "Normal" ? "var(--muted)" : "var(--muted)",margin:"0 0 6px"}}>{priority}</p>
                    {tasks.map((task) => (
                      <div key={task.id} className="home-task-row">
                        <input type="checkbox" checked={task.done} onChange={() => toggleHomeTask(task.id)} style={{accentColor:"var(--green)",flexShrink:0}} />
                        <div style={{flex:1,minWidth:0}}>
                          <strong style={{fontSize:"14px",textDecoration: task.done ? "line-through" : "none",color: task.done ? "var(--muted)" : "var(--ink)"}}>{task.title}</strong>
                          <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"2px"}}>
                            <small style={{color:"var(--muted)"}}>{task.category}</small>
                            {task.delegate && <small style={{color:"var(--pink)",fontWeight:700}}>Delegar a: {task.delegate}</small>}
                          </div>
                        </div>
                        <button type="button" onClick={() => confirmDelete("Eliminar?", () => setHomeTasks((c) => c.filter((t) => t.id !== task.id)))}
                          style={{border:"none",background:"none",color:"var(--muted)",cursor:"pointer",fontSize:"16px",flexShrink:0}}>x</button>
                      </div>
                    ))}
                  </div>
                );
              })}
              {delegatedTasks.length > 0 && (
                <div style={{marginTop:"12px",padding:"10px 12px",background:"var(--pink-soft)",borderRadius:"10px"}}>
                  <p style={{margin:"0 0 6px",fontSize:"12px",fontWeight:800,color:"var(--purple)"}}>DELEGADAS ({delegatedTasks.length})</p>
                  {delegatedTasks.map((t) => <p key={t.id} style={{margin:"2px 0",fontSize:"13px",color:"var(--ink)"}}>{t.title} - {t.delegate}</p>)}
                </div>
              )}
            </div>

            {/* Presupuesto del hogar */}
            <div className="home-budget-card card">
              <div className="budget-head">
                <div><h3>Presupuesto del hogar</h3><p>Ingresos, gastos y disponible familiar.</p></div>
                <div className="budget-total"><span>Disponible</span><strong>{money.format(homeAvailable)}</strong></div>
              </div>
              <form className="home-budget-form" onSubmit={addHomeBudgetItem}>
                <select value={homeBudgetForm.type} onChange={(e) => setHomeBudgetForm((c) => ({ ...c, type: e.target.value }))}><option>Ingreso</option><option>Gasto fijo</option><option>Gasto variable</option><option>Gasto hormiga</option><option>Deuda</option><option>Ahorro</option></select>
                <input placeholder="Descripcion" value={homeBudgetForm.description} onChange={(e) => setHomeBudgetForm((c) => ({ ...c, description: e.target.value }))} />
                <input type="number" min="0" placeholder="Monto" value={homeBudgetForm.amount} onChange={(e) => setHomeBudgetForm((c) => ({ ...c, amount: e.target.value }))} />
                <button className="primary-button" type="submit">Agregar</button>
              </form>
              <div className="home-money-insights">
                <article><span>Ganando</span><strong>{money.format(homeBudgetTotals.income)}</strong></article>
                <article><span>Gastando</span><strong>{money.format(homeSpent)}</strong></article>
                <article><span>Mayor fuga</span><strong>{biggestHomeLeak[0]}</strong><small>{money.format(biggestHomeLeak[1])}</small></article>
                <article><span>Ahorro</span><strong>{money.format(homeBudgetTotals.savings)}</strong></article>
              </div>
              <div className="money-track">
                <span style={{width:`${Math.min(100, homeBudgetTotals.income ? (homeSpent/homeBudgetTotals.income)*100 : 0)}%`}}></span>
                <small>Gastado vs ingresos del hogar</small>
              </div>
              <div className="budget-list">{homeBudget.map((item) => <DataRow key={item.id} title={item.description} meta={item.type} value={money.format(item.amount)} onDelete={() => setHomeBudget((c) => c.filter((r) => r.id !== item.id))} />)}</div>
            </div>
          </div>
        </div>
      </section>
    );
  }
  function renderCeo() {
    const selfCareScore = [purpose.water, purpose.walk, purpose.silence, purpose.devotional].filter(Boolean).length;
    const familyDaysCount = Object.values(purpose.familyDays || {}).filter(Boolean).length;
    const incomePerHour = purpose.hoursWorked > 0 ? Math.round(totals.income / purpose.hoursWorked) : 0;
    const peaceScore = ["inspirada", "feliz"].includes(purpose.mood) ? 100 : ["cansada"].includes(purpose.mood) ? 50 : 20;
    const mentalAdvice = purpose.mood === "controladora"
      ? "Cambia control por presencia. Elige una cosa que sí depende de ti y suelta una que no."
      : purpose.mood === "abrumada"
        ? "Reduce la lista a una sola acción visible. No tienes que hacerlo todo hoy."
        : purpose.mood === "cansada"
          ? "Protégete. El descanso también es productividad."
          : "Usa tu energía sin sobreexigirte. Deja espacio para gracia y descanso.";
    const impactScore = Math.round(((familyDaysCount/7)*0.3 + (selfCareScore/4)*0.2 + (purpose.connectionMoments/3)*0.2 + (purpose.clientsImpacted/5)*0.15 + (purpose.systemsPercent/100)*0.15) * 100);
    
    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Propósito &amp; Impacto</h2>
          <p>Mide lo que realmente importa — presencia, energía, sistemas e impacto</p>
        </div>

        {/* Banner de afirmación destacado */}
        <div className="card" style={{background:"linear-gradient(135deg, #f8f4f1 0%, #fef9f6 100%)",border:"2px solid #e8d5c4",padding:"24px",marginBottom:"20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"16px",marginBottom:"12px"}}>
            <span style={{fontSize:"32px"}}>✨</span>
            <div style={{flex:1}}>
              <p style={{fontSize:"11px",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.5px",color:"var(--purple)",margin:0}}>Tu afirmación de hoy</p>
              <h3 style={{fontSize:"18px",lineHeight:1.4,margin:"6px 0 0",color:"#6f2f4b"}}>{todayAffirmation}</h3>
            </div>
          </div>
          <div style={{display:"flex",gap:"20px",alignItems:"center",marginTop:"16px",paddingTop:"16px",borderTop:"1px solid #e8d5c4"}}>
            <div style={{flex:1}}>
              <p style={{fontSize:"12px",color:"var(--muted)",margin:"0 0 4px"}}>Índice de impacto esta semana</p>
              <Progress value={impactScore} tone="purple" />
            </div>
            <strong style={{fontSize:"28px",color:"var(--purple)"}}>{impactScore}%</strong>
          </div>
        </div>

        {/* KPIs visuales mejorados */}
        <div className="purpose-kpi-grid">
          <div className="purpose-kpi">
            <span className="purpose-kpi-icon">👩‍👦</span>
            <strong>{purpose.connectionMoments}</strong>
            <small>momentos de conexión hoy</small>
            <span className={purpose.connectionMoments >= 2 ? "kpi-badge good" : "kpi-badge alert"}>meta: 2–3</span>
          </div>
          <div className="purpose-kpi">
            <span className="purpose-kpi-icon">💸</span>
            <strong>{money.format(incomePerHour)}</strong>
            <small>ingreso por hora trabajada</small>
            <span className="kpi-badge neutral">KPI estrella</span>
          </div>
          <div className="purpose-kpi">
            <span className="purpose-kpi-icon">⚡</span>
            <strong>{purpose.energy === "alto" ? "Alta" : purpose.energy === "medio" ? "Media" : "Baja"}</strong>
            <small>energía del día</small>
            <span className={peaceScore >= 80 ? "kpi-badge good" : peaceScore >= 50 ? "kpi-badge neutral" : "kpi-badge alert"}>{purpose.mood}</span>
          </div>
          <div className="purpose-kpi">
            <span className="purpose-kpi-icon">👥</span>
            <strong>{purpose.clientsImpacted}</strong>
            <small>clientes impactados esta semana</small>
            <span className="kpi-badge neutral">impacto real</span>
          </div>
          <div className="purpose-kpi">
            <span className="purpose-kpi-icon">📅</span>
            <strong>{familyDaysCount}</strong>
            <small>días de presencia consciente</small>
            <span className={familyDaysCount >= 4 ? "kpi-badge good" : "kpi-badge alert"}>{familyDaysCount >= 4 ? "excelente" : "puedes mejorar"}</span>
          </div>
          <div className="purpose-kpi">
            <span className="purpose-kpi-icon">🔄</span>
            <strong>{purpose.systemsPercent}%</strong>
            <small>tareas sistematizadas</small>
            <span className={purpose.systemsPercent >= 60 ? "kpi-badge good" : "kpi-badge neutral"}>meta: 60%+</span>
          </div>
        </div>

        <div className="purpose-sections">

          <div className="card purpose-block">
            <h3>👩‍👦 Presencia real</h3>
            <p className="helper-copy">Puedes pasar todo el día en casa y no estar. Mide lo que importa.</p>
            <label className="purpose-field">
              <span>Momentos de conexión hoy (sin celular, sin multitarea)</span>
              <div className="counter-row">
                <button type="button" onClick={() => updatePurpose("connectionMoments", Math.max(0, (purpose.connectionMoments || 0) - 1))}>-</button>
                <strong>{purpose.connectionMoments || 0}</strong>
                <button type="button" onClick={() => updatePurpose("connectionMoments", (purpose.connectionMoments || 0) + 1)}>+</button>
              </div>
            </label>
            <label className="purpose-field"><span>Días de presencia consciente esta semana</span></label>
            <div className="week-checks">
              {["L","M","X","J","V","S","D"].map((day) => (
                <button type="button" className={purpose.familyDays?.[day] ? "checked" : ""} key={day}
                  onClick={() => setPurpose((c) => ({ ...c, familyDays: { ...c.familyDays, [day]: !c.familyDays?.[day] } }))}>{day}</button>
              ))}
            </div>
            <textarea className="purpose-textarea" placeholder="¿Cómo crees que se sintió tu hijo/a esta semana? (reflexión libre)" value={purpose.mentalLoad} onChange={(e) => updatePurpose("mentalLoad", e.target.value)} />
          </div>

          <div className="card purpose-block">
            <h3>💰 Negocio inteligente</h3>
            <p className="helper-copy">Más horas no es más éxito. Mide lo que escala.</p>
            <label className="purpose-field">
              <span>Horas trabajadas esta semana</span>
              <input type="number" min="0" max="80" value={purpose.hoursWorked || 0} onChange={(e) => updatePurpose("hoursWorked", Number(e.target.value))} />
            </label>
            <div className="purpose-stat">
              <span>Ingreso por hora trabajada</span>
              <strong>{incomePerHour > 0 ? money.format(incomePerHour) : "Registra horas"}</strong>
            </div>
            <label className="purpose-field">
              <span>% de ingresos recurrentes (membresías, productos escalables)</span>
              <input type="range" min="0" max="100" value={purpose.recurringIncomePercent || 0} onChange={(e) => updatePurpose("recurringIncomePercent", Number(e.target.value))} />
              <small>{purpose.recurringIncomePercent || 0}% recurrente</small>
            </label>
          </div>

          <div className="card purpose-block">
            <h3>⚡ Energía y salud emocional</h3>
            <p className="helper-copy">Si tú te quiebras, todo se cae. Tu energía es un recurso.</p>
            <label className="purpose-field"><span>Nivel de energía hoy</span></label>
            <div className="mood-grid">
              {["alto","medio","bajo"].map((e) => (
                <button type="button" key={e} className={purpose.energy === e ? "selected" : ""} onClick={() => updatePurpose("energy", e)}>{e}</button>
              ))}
            </div>
            <label className="purpose-field"><span>Ánimo general</span></label>
            <div className="mood-grid">
              {["abrumada","inspirada","feliz","controladora","cansada"].map((mood) => (
                <button type="button" key={mood} className={purpose.mood === mood ? "selected" : ""} onClick={() => updatePurpose("mood", mood)}>{mood}</button>
              ))}
            </div>
            <p className="helper-copy" style={{marginTop:"10px"}}>{mentalAdvice}</p>
            <div className="selfcare-checks">
              {[["water","Bebí agua"],["walk","Caminé 10 min"],["silence","Tuve silencio"],["devotional","Devocional / oración"]].map(([key, label]) => (
                <label key={key} className="task-row">
                  <input type="checkbox" checked={!!purpose[key]} onChange={(e) => updatePurpose(key, e.target.checked)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <ProgressLabel label="Autocuidado" value={Math.round((selfCareScore / 4) * 100)} tone="green" />
          </div>

          <div className="card purpose-block">
            <h3>🏗️ Autoevaluación de sistemas</h3>
            <p className="helper-copy">No necesitas hacer más, necesitas soltar más. Evalúa una tarea a la vez.</p>
            <SystemsDonut tasks={systemTasks} />
            <div className="carousel-wrap">
              <div className="carousel-header">
                <button type="button" className="carousel-nav" onClick={() => setSystemSlide((s) => Math.max(0, s - 1))} disabled={systemSlide === 0}>←</button>
                <span className="carousel-counter">{systemSlide + 1} de {systemTasks.length}</span>
                <button type="button" className="carousel-nav" onClick={() => setSystemSlide((s) => Math.min(systemTasks.length - 1, s + 1))} disabled={systemSlide === systemTasks.length - 1}>→</button>
              </div>
              {(() => {
                const task = systemTasks[systemSlide];
                const suggestion = task ? systemSuggestions[task.title] : null;
                return task ? (
                  <div className="carousel-card">
                    <span className={`system-cat system-cat-${task.category}`}>{task.category}</span>
                    <h4>{task.title}</h4>
                    <div className="system-modes">
                      {task.canDelegate ? (
                        <>
                          <button type="button" className={task.mode === "manual" ? "mode-btn active-manual" : "mode-btn"} onClick={() => setSystemTasks((c) => c.map((t) => t.id === task.id ? { ...t, mode: "manual" } : t))}>🔴 Lo hago yo</button>
                          <button type="button" className={task.mode === "delegado" ? "mode-btn active-delegado" : "mode-btn"} onClick={() => setSystemTasks((c) => c.map((t) => t.id === task.id ? { ...t, mode: "delegado" } : t))}>🟡 Lo delego</button>
                          <button type="button" className={task.mode === "automatizado" ? "mode-btn active-auto" : "mode-btn"} onClick={() => setSystemTasks((c) => c.map((t) => t.id === task.id ? { ...t, mode: "automatizado" } : t))}>🟢 Automatizado</button>
                        </>
                      ) : (
                        <span className="mode-btn mode-protect">💛 Presencia materna — no se delega</span>
                      )}
                    </div>
                    {task.mode === "manual" && suggestion && (
                      <div className="system-suggestion">
                        {suggestion.protect ? (
                          <p>📌 {suggestion.protect}</p>
                        ) : (
                          <>
                            {suggestion.auto && <p>⚡ <strong>Automatizar:</strong> {suggestion.auto}</p>}
                            {suggestion.delegate && <p>🤝 <strong>Delegar:</strong> {suggestion.delegate}</p>}
                            <a href="https://www.umpacademy.co/membresia" target="_blank" rel="noreferrer" className="ump-link">🎓 Aprende cómo en UMP Academy →</a>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
              <form className="source-form" style={{marginTop:"12px"}} onSubmit={(e) => { e.preventDefault(); if (!newSystemTask.trim()) return; setSystemTasks((c) => [...c, { id: Date.now(), title: newSystemTask.trim(), category: "negocio", mode: "manual", canDelegate: true }]); setNewSystemTask(""); setSystemSlide(systemTasks.length); }}>
                <input placeholder="Agregar mi propia tarea..." value={newSystemTask} onChange={(e) => setNewSystemTask(e.target.value)} />
                <button className="primary-button" type="submit">+</button>
              </form>
            </div>
          </div>

          <div className="card purpose-block purpose-block-wide">
            <h3>📛 Propósito e impacto</h3>
            <p className="helper-copy">5 clientes transformados &gt; 5.000 vistas vacías.</p>
            <div className="purpose-impact-grid">
              <label className="purpose-field">
                <span>Clientes impactados esta semana</span>
                <div className="counter-row">
                  <button type="button" onClick={() => updatePurpose("clientsImpacted", Math.max(0, (purpose.clientsImpacted || 0) - 1))}>-</button>
                  <strong>{purpose.clientsImpacted || 0}</strong>
                  <button type="button" onClick={() => updatePurpose("clientsImpacted", (purpose.clientsImpacted || 0) + 1)}>+</button>
                </div>
              </label>
              <label className="purpose-field">
                <span>Nivel de pasión al crear / trabajar (1–5)</span>
                <div className="passion-stars">
                  {[1,2,3,4,5].map((n) => (
                    <button type="button" key={n} className={n <= (purpose.passionLevel || 3) ? "star active" : "star"} onClick={() => updatePurpose("passionLevel", n)}>★</button>
                  ))}
                </div>
              </label>
              <label className="purpose-field">
                <span>Testimonio o transformación de esta semana</span>
                <textarea className="purpose-textarea" placeholder="¿Qué cambió en un cliente gracias a tu trabajo?" value={purpose.weekTestimony || ""} onChange={(e) => updatePurpose("weekTestimony", e.target.value)} />
              </label>
              <label className="purpose-field">
                <span>Claridad de visión — ¿sabes hacia dónde vas?</span>
                <textarea className="purpose-textarea" placeholder="Mi visión esta semana es..." value={purpose.visionClarity || ""} onChange={(e) => updatePurpose("visionClarity", e.target.value)} />
              </label>
            </div>
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
        <div className="summary-row"><span>Ánimo</span><strong>{purpose.mood}</strong><small>La semana pasada te sentiste así. Esta semana puede ser más liviana.</small></div>
        <div className="summary-row"><span>Ventas cerradas</span><strong>{money.format(wonSalesTotal)}</strong><small>Registradas en clientas ganadas</small></div>
        <div className="summary-row"><span>Presupuesto hogar</span><strong>{money.format(homeAvailable)}</strong><small>Disponible después de gastos y deudas</small></div>
      </div>
    );
  }

  function MovementList({ compact = false } = {}) {
    return (
      <div className={`card movement-card ${compact ? "compact" : ""}`}>
        <h3>Últimos movimientos</h3>
        {movements.slice(0, 10).map((movement) => (
          <div className="movement-row" key={movement.id}>
            <span className={movement.type}>{movement.type === "income" ? "+" : "-"}</span>
            <div>
              <strong>{movement.description}</strong>
              <small>{movement.classification} • {movement.category} • {movement.bank || "Sin banco"}</small>
            </div>
            <b>{money.format(movement.amount)}</b>
            <button className="row-delete" type="button" onClick={() => confirmDelete("¿Eliminar este movimiento?", () => setMovements((current) => current.filter((item) => item.id !== movement.id)))}>×</button>
          </div>
        ))}
      </div>
    );
  }

  function CalendarCard() {
    return <div className="card calendar-card"><h3>Calendario de la semana</h3><small className="helper-copy">Semana actual</small>{weekDays.map((day) => <div className="calendar-row" key={day}><span>{day}</span><p>—</p></div>)}</div>;
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

    const currentMovements = movements.filter((m) => m.createdAt && isInWeek(m.createdAt, currentWeek));
    const previousMovements = movements.filter((m) => m.createdAt && isInWeek(m.createdAt, previousWeek));

    const currentClients = clients.filter((c) => c.createdAt && isInWeek(c.createdAt, currentWeek));
    const previousClients = clients.filter((c) => c.createdAt && isInWeek(c.createdAt, previousWeek));

    const currentIncome = currentMovements.filter((m) => m.type === "income").reduce((sum, m) => sum + m.amount, 0);
    const previousIncome = previousMovements.filter((m) => m.type === "income").reduce((sum, m) => sum + m.amount, 0);
    const incomeChange = previousIncome > 0 ? Math.round(((currentIncome - previousIncome) / previousIncome) * 100) : 0;

    const currentWon = currentClients.filter((c) => c.status === "Venta ganada").length;
    const previousWon = previousClients.filter((c) => c.status === "Venta ganada").length;
    const wonChange = previousWon > 0 ? Math.round(((currentWon - previousWon) / previousWon) * 100) : 0;

    const currentContactsThisWeek = Object.values(contactLog).filter((e) => {
      const contactDate = new Date(e.date).getTime();
      return contactDate >= currentWeek.start && contactDate <= currentWeek.end;
    }).length;

    const previousContactsCount = Object.values(contactLog).filter((e) => {
      const contactDate = new Date(e.date).getTime();
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
      const day = new Date(m.createdAt).toLocaleDateString('es', { weekday: 'long' });
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
      urgentAlerts.push({ type: "success", message: `Tienes ${hotLeads} leads calientes esperando. ¡Es momento de cerrar ventas!` });
    }

    const whatsappMsg = (client) => {
      const msgs = {
        "Lead frio": `Hola ${client.name}! 👋 Quería retomar el contacto contigo. ¿Sigues interesada en ${client.service}? Con gusto te cuento más.`,
        "Lead tibio": `Hola ${client.name}! 😊 Estaba pensando en ti. ¿Cómo vas? Me encantaría contarte sobre ${client.service} y cómo puede ayudarte.`,
        "Lead caliente": `Hola ${client.name}! 🔥 Quería hacer seguimiento a nuestra conversación sobre ${client.service}. ¿Tienes 5 minutos para hablar hoy?`,
        "Venta ganada": `Hola ${client.name}! 💛 ¿Cómo vas con ${client.service}? Quería saber cómo te ha ido y si tienes alguna pregunta.`
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
              style={{border:"1px solid var(--line)",background:"#fff",borderRadius:"8px",padding:"6px 12px",cursor:"pointer",fontSize:"13px",fontWeight:700}}>← Anterior</button>
            <span style={{fontSize:"14px",fontWeight:700,color:"var(--purple)"}}>{formatDateRange(currentWeek.start, currentWeek.end)}</span>
            <button type="button" onClick={() => setReportWeekOffset(reportWeekOffset + 1)} disabled={reportWeekOffset >= 0}
              style={{border:"1px solid var(--line)",background:reportWeekOffset >= 0 ? "#f5f5f5" : "#fff",borderRadius:"8px",padding:"6px 12px",cursor:reportWeekOffset >= 0 ? "not-allowed" : "pointer",fontSize:"13px",fontWeight:700,opacity:reportWeekOffset >= 0 ? 0.5 : 1}}>Siguiente →</button>
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
                {alert.type === "danger" && "🚨 "}{alert.type === "warning" && "⚠️ "}{alert.type === "success" && "🎯 "}
                {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Resumen ejecutivo de 30 segundos */}
        <div className="card" style={{background:"linear-gradient(135deg, rgba(212,104,122,0.08), rgba(201,169,110,0.08))",border:"2px solid var(--purple)",marginBottom:"20px",padding:"24px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
            <span style={{fontSize:"32px"}}>⚡</span>
            <h3 style={{margin:0,fontSize:"22px",color:"var(--purple)"}}>Resumen ejecutivo — 30 segundos</h3>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:"20px",marginBottom:"16px"}}>
            <div>
              <p style={{margin:"0 0 4px",fontSize:"13px",color:"var(--muted)",fontWeight:800,textTransform:"uppercase"}}>Ingresos esta semana</p>
              <div style={{display:"flex",alignItems:"baseline",gap:"8px"}}>
                <strong style={{fontSize:"32px",color:"var(--green)",lineHeight:1}}>{money.format(currentIncome)}</strong>
                {incomeChange !== 0 && (
                  <span style={{fontSize:"16px",fontWeight:700,color:incomeChange > 0 ? "var(--green)" : "var(--pink)"}}>
                    {incomeChange > 0 ? "↑" : "↓"} {Math.abs(incomeChange)}%
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
                    {wonChange > 0 ? "↑" : "↓"} {Math.abs(wonChange)}%
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
                    {contactsChange > 0 ? "↑" : "↓"} {Math.abs(contactsChange)}%
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
              <h3 style={{margin:0}}>💰 Meta de ventas del mes</h3>
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
            <h3>📊 Ventas esta semana</h3>
            <div className="purpose-stat"><span>Ingresos registrados</span><strong>{money.format(totals.income)}</strong></div>
            <div className="purpose-stat"><span>Utilidad</span><strong style={{color: totals.profit >= 0 ? "var(--green)" : "var(--pink)"}}>{money.format(totals.profit)}</strong></div>
            {(() => {
              const totalFees = incomeSources.reduce((sum, src) => {
                const actual = movements.filter((m) => m.type === "income" && m.classification === src.name).reduce((s, m) => s + m.amount, 0);
                return sum + calcFee(actual, src.platform);
              }, 0);
              if (totalFees === 0) return null;
              return (
                <>
                  <div className="purpose-stat"><span>Fees de plataformas</span><strong style={{color:"var(--pink)"}}>-{money.format(totalFees)}</strong></div>
                  <div className="purpose-stat"><span>Ingreso neto real</span><strong style={{color:"var(--green)"}}>{money.format(totals.income - totalFees)}</strong></div>
                </>
              );
            })()}
            <div className="purpose-stat"><span>Ventas cerradas</span><strong>{totalWon} clientas</strong></div>
            <div className="purpose-stat"><span>Tasa de conversión</span><strong>{conversionRate}%</strong></div>
            <div className="purpose-stat"><span>Leads calientes ahora</span><strong>{hotLeads}</strong></div>
            <div className="purpose-stat"><span>Contactos realizados</span><strong style={{color:"var(--green)"}}>{contactsThisWeek} esta semana</strong></div>
            <ProgressLabel label="Meta contactos (5)" value={Math.min(Math.round((contactsThisWeek/5)*100),100)} tone="green" />
            {incomePerHour > 0 && <div className="purpose-stat"><span>Ingreso por hora</span><strong>{money.format(incomePerHour)}</strong></div>}
          </div>

          {/* Recordatorios WhatsApp */}
          <div className="card purpose-block">
            <h3>💬 Recordatorios de seguimiento</h3>
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
                  📲 WhatsApp
                </a>
              </div>
            ))}
          </div>

          {/* Hogar */}
          <div className="card purpose-block">
            <h3>🏠 Hogar esta semana</h3>
            <div className="purpose-stat"><span>Tareas completadas</span><strong>{completedHomeTasks}/{homeTasks.length}</strong></div>
            <ProgressLabel label="Progreso hogar" value={homeProgress} tone="orange" />
            <div className="purpose-stat"><span>Disponible familiar</span><strong>{money.format(homeAvailable)}</strong></div>
            <div className="purpose-stat"><span>Días de presencia</span><strong>{Object.values(purpose.familyDays || {}).filter(Boolean).length} días</strong></div>
          </div>

          {/* Energía */}
          <div className="card purpose-block">
            <h3>⚡ Energía y bienestar</h3>
            <div className="purpose-stat"><span>Ánimo de la semana</span><strong>{purpose.mood}</strong></div>
            <div className="purpose-stat"><span>Nivel de energía</span><strong>{purpose.energy}</strong></div>
            <ProgressLabel label="Autocuidado" value={Math.round((selfCareScore / 4) * 100)} tone="green" />
            <div className="purpose-stat"><span>Horas trabajadas</span><strong>{purpose.hoursWorked || 0}h</strong></div>
            <div className="purpose-stat"><span>Momentos de conexión</span><strong>{purpose.connectionMoments || 0}</strong></div>
          </div>

          {/* Fuentes de origen */}
          <div className="card purpose-block purpose-block-wide">
            <h3>📍 ¿De dónde vienen tus clientas?</h3>
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
      { id: "free", name: "Gratis", price: "$0", period: "", color: "var(--muted)",
        features: [`${PLAN_LIMITS.free.movements} movimientos/mes`,`${PLAN_LIMITS.free.clients} clientes`,`${PLAN_LIMITS.free.content} contenidos/mes`,`${PLAN_LIMITS.free.homeTasks} tareas hogar/mes`,"Sincronización en la nube","Todas las funciones básicas"] },
      { id: "emprendedora", name: "Emprendedora", price: PLAN_PRICES.emprendedora.usd, period: "/mes USD",
        priceCop: PLAN_PRICES.emprendedora.cop+" COP/mes", priceYear: PLAN_PRICES.emprendedora.usdYear+" USD/año (2 meses gratis)",
        color: "var(--pink)",
        features: [`${PLAN_LIMITS.emprendedora.movements} movimientos/mes`,`${PLAN_LIMITS.emprendedora.clients} clientes`,`${PLAN_LIMITS.emprendedora.content} contenidos/mes`,`${PLAN_LIMITS.emprendedora.homeTasks} tareas hogar/mes`,"Exportar Excel y PDF","Historial 6 meses","Soporte email 48h"] },
      { id: "ceo", name: "CEO", price: PLAN_PRICES.ceo.usd, period: "/mes USD",
        priceCop: PLAN_PRICES.ceo.cop+" COP/mes", priceYear: PLAN_PRICES.ceo.usdYear+" USD/año (2 meses gratis)",
        badge: "RECOMENDADO", color: "var(--purple)",
        features: ["Todo ilimitado","Exportar Excel y PDF","Historial ilimitado","Calculadora de precio de servicios ✨","Proyección de ingresos ✨","Temporizador Pomodoro flotante ✨","Acceso anticipado a nuevas funciones","Soporte prioritario 24h"] }
    ];
    return (
      <section className="panel workspace-panel">
        <div className="section-title"><h2>Planes y Precios</h2><p>Elige el plan que mejor se adapte a tu negocio</p></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"20px",maxWidth:"1000px",margin:"0 auto"}}>
          {plans.map((plan) => {
            const isCurrent = effectivePlan===plan.id||(plan.id==="ceo"&&effectivePlan==="premium");
            return (
              <div key={plan.id} className="card" style={{border:`2px solid ${isCurrent||plan.id==="ceo"?plan.color:"var(--line)"}`,background:plan.id==="ceo"?"linear-gradient(135deg,rgba(212,104,122,0.05),rgba(201,169,110,0.05))":"#fff",position:"relative"}}>
                {isCurrent&&<div style={{position:"absolute",top:"-12px",left:"50%",transform:"translateX(-50%)",background:plan.color,color:"#fff",padding:"4px 16px",borderRadius:"20px",fontSize:"12px",fontWeight:800}}>PLAN ACTUAL</div>}
                {plan.badge&&!isCurrent&&<div style={{position:"absolute",top:"12px",right:"12px",background:"var(--green)",color:"#fff",padding:"3px 10px",borderRadius:"20px",fontSize:"11px",fontWeight:800}}>{plan.badge}</div>}
                <div style={{padding:"24px"}}>
                  <h3 style={{margin:"0 0 4px",fontSize:"22px",color:plan.color}}>{plan.name}</h3>
                  <div style={{fontSize:"34px",fontWeight:800,color:plan.color,lineHeight:1,marginBottom:"2px"}}>{plan.price}<span style={{fontSize:"14px",fontWeight:400,color:"var(--muted)"}}>{plan.period}</span></div>
                  {plan.priceCop&&<p style={{margin:"0 0 2px",fontSize:"13px",color:"var(--muted)"}}>{plan.priceCop}</p>}
                  {plan.priceYear&&<p style={{margin:"0 0 16px",fontSize:"12px",color:"var(--green)",fontWeight:700}}>{plan.priceYear}</p>}
                  {!plan.priceCop&&<p style={{margin:"0 0 16px",fontSize:"13px",color:"var(--muted)"}}>Para empezar a organizarte</p>}
                  <div style={{display:"grid",gap:"10px",marginBottom:"20px"}}>
                    {plan.features.map((f)=>(<div key={f} style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"13px"}}><span style={{color:plan.color,fontSize:"16px",flexShrink:0}}>✓</span><span>{f}</span></div>))}
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
          <h3 style={{margin:"0 0 16px"}}>Tu uso actual — Plan {effectivePlan==="free"?"Gratis":effectivePlan==="emprendedora"?"Emprendedora":"CEO"}</h3>
          <div style={{display:"grid",gap:"14px"}}>
            {[{label:"Movimientos",used:movements.length,limit:currentLimits.movements},{label:"Clientes",used:clients.length,limit:currentLimits.clients},{label:"Contenidos",used:contentItems.length,limit:currentLimits.content},{label:"Tareas hogar",used:homeTasks.length,limit:currentLimits.homeTasks}].map(({label,used,limit})=>(
              <div key={label}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px",fontSize:"14px"}}><span>{label}</span><span><strong>{used}</strong> / {limit===Infinity?"∞":limit}</span></div>
                <Progress value={limit===Infinity?0:Math.min(Math.round((used/limit)*100),100)} tone={limit!==Infinity&&used>=limit?"pink":"green"} />
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{maxWidth:"1000px",margin:"20px auto 0",padding:"24px",border:"2px dashed var(--line)"}}>
          <h3 style={{margin:"0 0 8px"}}>🎟️ ¿Tienes un código de acceso beta?</h3>
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
              ✅ Código activo — Plan CEO gratis por {betaDaysLeft} días más
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
                  <span style={{color:"var(--green)",fontSize:"18px"}}>✓</span>
                  <span>{PLAN_LIMITS.free.movements} movimientos financieros/mes</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--green)",fontSize:"18px"}}>✓</span>
                  <span>{PLAN_LIMITS.free.clients} clientes</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--green)",fontSize:"18px"}}>✓</span>
                  <span>{PLAN_LIMITS.free.content} contenidos/mes</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--green)",fontSize:"18px"}}>✓</span>
                  <span>{PLAN_LIMITS.free.homeTasks} tareas del hogar/mes</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--green)",fontSize:"18px"}}>✓</span>
                  <span>Sincronización en la nube</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--green)",fontSize:"18px"}}>✓</span>
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
                  <span style={{color:"var(--purple)",fontSize:"18px"}}>✓</span>
                  <span><strong>Movimientos ilimitados</strong></span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--purple)",fontSize:"18px"}}>✓</span>
                  <span><strong>Clientes ilimitados</strong></span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--purple)",fontSize:"18px"}}>✓</span>
                  <span><strong>Contenido ilimitado</strong></span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--purple)",fontSize:"18px"}}>✓</span>
                  <span><strong>Tareas ilimitadas</strong></span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--purple)",fontSize:"18px"}}>✓</span>
                  <span>Sincronización en la nube</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--purple)",fontSize:"18px"}}>✓</span>
                  <span>Soporte prioritario</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{color:"var(--purple)",fontSize:"18px"}}>✓</span>
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
                <span><strong>{movements.length}</strong> / {userPlan === "free" ? PLAN_LIMITS.free.movements : "∞"}</span>
              </div>
              <Progress value={userPlan === "free" ? Math.min(Math.round((movements.length / PLAN_LIMITS.free.movements) * 100), 100) : 0} tone={movements.length >= PLAN_LIMITS.free.movements ? "pink" : "green"} />
            </div>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
                <span>Clientes</span>
                <span><strong>{clients.length}</strong> / {userPlan === "free" ? PLAN_LIMITS.free.clients : "∞"}</span>
              </div>
              <Progress value={userPlan === "free" ? Math.min(Math.round((clients.length / PLAN_LIMITS.free.clients) * 100), 100) : 0} tone={clients.length >= PLAN_LIMITS.free.clients ? "pink" : "green"} />
            </div>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
                <span>Contenidos</span>
                <span><strong>{contentItems.length}</strong> / {userPlan === "free" ? PLAN_LIMITS.free.content : "∞"}</span>
              </div>
              <Progress value={userPlan === "free" ? Math.min(Math.round((contentItems.length / PLAN_LIMITS.free.content) * 100), 100) : 0} tone={contentItems.length >= PLAN_LIMITS.free.content ? "pink" : "green"} />
            </div>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
                <span>Tareas del hogar</span>
                <span><strong>{homeTasks.length}</strong> / {userPlan === "free" ? PLAN_LIMITS.free.homeTasks : "∞"}</span>
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
              ✅ Código activo — Premium gratis por {betaDaysLeft} días más
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
  return <article className={`metric-card ${tone}`}><span className="metric-icon">●</span><p>{title}</p><strong>{value}</strong><small>{change}</small></article>;
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
          <button type="button" onClick={() => setActiveView('dashboard')} style={{border:"1px solid var(--line)",background:"#fff",borderRadius:"8px",padding:"8px 16px",cursor:"pointer",fontSize:"13px",fontWeight:700}}>← Volver</button>
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
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Nos reservamos el derecho de modificar o discontinuar, temporal o permanentemente, el servicio (o cualquier parte del mismo) con o sin previo aviso. También podemos actualizar estos Términos periódicamente. Te notificaremos sobre cambios significativos publicando los nuevos Términos en la aplicación. Tu uso continuado del servicio después de dichos cambios constituye tu aceptación de los nuevos Términos.</p>

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
          <button type="button" onClick={() => setActiveView('dashboard')} style={{border:"1px solid var(--line)",background:"#fff",borderRadius:"8px",padding:"8px 16px",cursor:"pointer",fontSize:"13px",fontWeight:700}}>← Volver</button>
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
          <p style={{lineHeight:1.7,marginBottom:"16px"}}>Conservamos tu información personal mientras tu cuenta esté activa o según sea necesario para proporcionarte servicios. Si solicitas la eliminación de tu cuenta, eliminaremos o anonimizaremos tu información personal dentro de 30 días, excepto cuando debamos retenerla para cumplir con obligaciones legales, resolver disputas o hacer cumplir nuestros acuerdos.</p>

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
