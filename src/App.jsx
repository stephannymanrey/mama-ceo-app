import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "./lib/supabaseClient";
import "./App.css";

const STORAGE_KEY = "mama-ceo-app-state-v4";

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
  { id: 1, title: "Reel: enfoque semanal", hook: "Deja de hacer mil cosas", format: "Reel", network: "Instagram", week: "Semana 1", status: "Publicado", type: "Educativo" },
  { id: 2, title: "Post: como ordenar tus ventas", hook: "Tu negocio necesita claridad", format: "Post", network: "Instagram", week: "Semana 2", status: "Programado", type: "Educativo" },
  { id: 3, title: "Email: oferta de mentoria", hook: "Hoy puedes vender con calma", format: "Email", network: "Website", week: "Semana 3", status: "Por hacer", type: "Oferta" }
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
  { id: 1, name: "Servicios 1:1", monthlyGoal: 3000, color: "purple" },
  { id: 2, name: "Cursos / Productos digitales", monthlyGoal: 2000, color: "pink" },
  { id: 3, name: "Membresías / Recurrente", monthlyGoal: 1500, color: "green" }
];

const initialBusinessSettings = {
  dailyGoal: 750,
  weeklyGoal: 3750,
  monthlyGoal: 15000,
  reinvestmentPercent: 10
};

const initialBanks = ["Bancolombia", "Nequi", "Daviplata", "Stripe", "Tarjeta negocio"];

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
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "business", label: "Negocio", icon: "▣" },
  { id: "clients", label: "Clientes", icon: "◇" },
  { id: "content", label: "Contenido", icon: "▷" },
  { id: "home", label: "Hogar", icon: "⌁" },
  { id: "ceo", label: "Propósito & Impacto", icon: "○" },
  { id: "report", label: "Reporte semanal", icon: "◈" }
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

async function loadRemoteState(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("user_states")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("Error cargando estado remoto:", error);
    return null;
  }
  return data?.data ?? null;
}

async function saveRemoteState(userId, data) {
  if (!userId) return;
  const { error } = await supabase
    .from("user_states")
    .upsert({ user_id: userId, data }, { onConflict: "user_id" });
  if (error) console.error("Error guardando estado remoto:", error);
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
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState("");
  const [authNewPassword, setAuthNewPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const [ready, setReady] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [supabaseActive, setSupabaseActive] = useState(isSupabaseConfigured);
  const [businessSettings, setBusinessSettings] = useState({
    ...initialBusinessSettings,
    ...(stored?.businessSettings || {})
  });

  const [profile, setProfile] = useState({
    displayName: stored?.profile?.displayName || "",
    businessName: stored?.profile?.businessName || "",
    businessDesc: stored?.profile?.businessDesc || "",
    photo: stored?.profile?.photo || ""
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [clientForm, setClientForm] = useState({ name: "", service: "", status: "Lead tibio", amount: "", nextAction: "", source: "", customSource: "" });
  const [salesGoal, setSalesGoal] = useState(stored?.salesGoal || 0);
  const [contactLog, setContactLog] = useState(stored?.contactLog || {});
  const [contentForm, setContentForm] = useState({ title: "", hook: "", type: "Educativo", format: "Reel", network: "Instagram", customNetwork: "", week: "Semana 1", status: "Por hacer" });
  const [goalForm, setGoalForm] = useState({ title: "", amount: "", period: "Mensual", status: "Activa" });
  const [homeForm, setHomeForm] = useState({ title: "", category: "Operaciones" });

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
      "Invalid login credentials": "Credenciales de inicio de sesión inválidas",
      "User already registered": "El usuario ya está registrado",
      "Password should be at least 6 characters": "La contraseña debe tener al menos 6 caracteres",
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
    if (authMode === "signup") {
      if (authPassword !== authPasswordConfirm) {
        setAuthError("Las contraseñas no coinciden.");
        return;
      }
    }
    setAuthLoading(true);
    if (authMode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) setAuthError(translateError(error.message));
    } else {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
        options: { data: { full_name: authName.trim() } }
      });
      if (error) setAuthError(translateError(error.message));
      else setAuthError("Revisa tu correo para confirmar tu cuenta.");
    }
    setAuthLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!authEmail) {
      setAuthError("Ingresa tu correo electrónico primero.");
      return;
    }
    setAuthError("");
    setAuthLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail);
    setAuthLoading(false);
    if (error) setAuthError(translateError(error.message));
    else setAuthError("Revisa tu correo para restablecer tu contraseña.");
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    const { error } = await supabase.auth.updateUser({ password: authNewPassword });
    setAuthLoading(false);
    if (error) setAuthError(translateError(error.message));
    else {
      setResetPassword(false);
      setAuthError("Contraseña actualizada. Ya puedes iniciar sesión.");
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
    if (loaded.profile) setProfile({
      displayName: loaded.profile.displayName || "",
      businessName: loaded.profile.businessName || "",
      businessDesc: loaded.profile.businessDesc || "",
      photo: loaded.profile.photo || ""
    });
    if (loaded.salesGoal !== undefined) setSalesGoal(loaded.salesGoal);
    if (loaded.contactLog) setContactLog(loaded.contactLog);
    if (loaded.incomeSources) setIncomeSources(loaded.incomeSources);
  };

  useEffect(() => {
    if (!ready) return;
    const restore = async () => {
      if (user && supabaseActive) {
        const remoteState = await loadRemoteState(user.id);
        if (remoteState) applyLoadedState(remoteState);
      } else {
        const storedState = loadState();
        if (storedState) applyLoadedState(storedState);
      }
    };
    restore();
  }, [ready, user, supabaseActive]);

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
      profile,
      businessSettings,
      banks,
      annualBudget,
      homeBudget,
      purpose
    };

    if (user && supabaseActive) {
      setIsSyncing(true);
      saveRemoteState(user.id, stateToSave).finally(() => setIsSyncing(false));
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [ready, user, supabaseActive, activeView, currency, movements, tasks, clients, contentItems, goals, homeTasks, businessSettings, banks, annualBudget, homeBudget, purpose]);

  const addMovement = (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.description.trim() || !form.category.trim() || !amount) return;
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
    setClients((current) => [{ id: Date.now(), name: clientForm.name.trim(), service: clientForm.service.trim(), status: clientForm.status, amount, nextAction: clientForm.nextAction.trim() || "Hacer seguimiento", lastContact: Date.now(), source: clientForm.source === "Otra" ? clientForm.customSource.trim() || "Otra" : clientForm.source, createdAt: Date.now() }, ...current]);
    setClientForm({ name: "", service: "", status: "Lead frio", amount: "", nextAction: "", source: "", customSource: "" });
  };

  const addContent = (event) => {
    event.preventDefault();
    if (!contentForm.title.trim()) return;
    const network = contentForm.network === "Otra" ? contentForm.customNetwork.trim() || "Otra" : contentForm.network;
    setContentItems((current) => [{ id: Date.now(), ...contentForm, network, title: contentForm.title.trim(), hook: contentForm.hook.trim() }, ...current]);
    setContentForm({ title: "", hook: "", type: "Educativo", format: "Reel", network: "Instagram", customNetwork: "", week: "Semana 1", status: "Por hacer" });
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
    setHomeTasks((current) => [{ id: Date.now(), title: homeForm.title.trim(), category: homeForm.category, done: false }, ...current]);
    setHomeForm({ title: "", category: "Compras" });
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
        return {
          ...row,
          income: nextValue,
          fixedExpenses: Math.round(nextValue * 0.45),
          variableExpenses: Math.round(nextValue * 0.35)
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

  const activeLabel = menu.find((item) => item.id === activeView)?.label || "Dashboard";

  if (!ready) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h2>Cargando aplicación...</h2>
          <p>Preparando tu espacio de trabajo</p>
        </div>
      </div>
    );
  }

  if (!user && supabaseActive) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h2>{resetPassword ? "Restablecer contraseña" : authMode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h2>
          <p>{resetPassword ? "Ingresa tu nueva contraseña." : "Ingresa con tu correo para acceder a tu tablero Mamá CEO."}</p>
          {resetPassword ? (
            <form className="auth-form" onSubmit={handleResetPassword}>
              <label>
                Nueva contraseña
                <input type="password" value={authNewPassword} onChange={(event) => setAuthNewPassword(event.target.value)} required minLength={6} />
              </label>
              {authError && <p className="auth-error">{authError}</p>}
              <button type="submit" className="auth-button" disabled={authLoading}>
                Actualizar contraseña
              </button>
            </form>
          ) : (
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
                <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required minLength={6} />
              </label>
              {authMode === "signup" && (
                <label>
                  Repite la contraseña
                  <input type="password" value={authPasswordConfirm} onChange={(event) => setAuthPasswordConfirm(event.target.value)} required minLength={6} />
                </label>
              )}
              {authError && <p className="auth-error">{authError}</p>}
              <button type="submit" className="auth-button" disabled={authLoading}>
                {authMode === "login" ? "Entrar" : "Registrarme"}
              </button>
            </form>
          )}
          {!resetPassword && (
            <>
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
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"></div>
          <div className="brand-script">Mamá</div>
          <div className="brand-ceo">CEO</div>
          <div className="brand-app">APP</div>
        </div>

        <nav className="main-menu" aria-label="Navegacion principal">
          {menu.map((item) => (
            <button className={activeView === item.id ? "menu-item active" : "menu-item"} key={item.id} onClick={() => setActiveView(item.id)}>
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
            <h1>¡Hola, {profile.displayName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Mamá CEO"}!</h1>
            {profile.businessName && <p style={{margin:"4px 0 0",color:"var(--purple)",fontWeight:700,fontSize:"13px"}}>{profile.businessName}</p>}
            {!profile.businessName && <p>Enfocada • Organizada • Imparable</p>}
          </div>
          <div className="profile-area">
            {isSyncing && <div className="status-chip syncing">Guardando…</div>}
            {!supabaseActive && !isSyncing && <div className="status-chip">Modo local</div>}
            <button
              type="button"
              className="avatar-btn"
              onClick={() => setProfileOpen(true)}
              title="Mi perfil"
            >
              {profile.photo
                ? <img src={profile.photo} alt="perfil" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}} />
                : <span>{(profile.displayName || user?.user_metadata?.full_name || user?.email || "M").charAt(0).toUpperCase()}</span>
              }
            </button>
          </div>
        </header>

        {!supabaseActive && (
          <div className="local-banner">
            <strong>Modo sin conexión</strong> — tus datos se guardan en este navegador. Si cambias de dispositivo o navegador, no verás tus datos.
          </div>
        )}

        {activeView === "dashboard" && renderDashboard()}
        {activeView === "business" && renderBusiness()}
        {activeView === "clients" && renderClients()}
        {activeView === "content" && renderContent()}
        {activeView === "home" && renderHome()}
        {activeView === "ceo" && renderCeo()}
        {activeView === "report" && renderWeeklyReport()}

        {profileOpen && (
          <div className="profile-overlay" onClick={() => setProfileOpen(false)}>
            <div className="profile-panel" onClick={(e) => e.stopPropagation()}>
              <div className="profile-panel-header">
                <h3>Mi perfil</h3>
                <button type="button" className="row-delete" style={{fontSize:"22px"}} onClick={() => setProfileOpen(false)}>×</button>
              </div>
              <div className="profile-photo-wrap">
                <div className="profile-photo-circle">
                  {profile.photo
                    ? <img src={profile.photo} alt="perfil" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}} />
                    : <span style={{fontSize:"36px",fontWeight:800,color:"#fff"}}>{(profile.displayName || user?.user_metadata?.full_name || "M").charAt(0).toUpperCase()}</span>
                  }
                </div>
                <label className="photo-upload-btn">
                  📷 Cambiar foto
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => setProfile((p) => ({ ...p, photo: ev.target.result }));
                    reader.readAsDataURL(file);
                  }} />
                </label>
                {profile.photo && <button type="button" className="photo-remove-btn" onClick={() => setProfile((p) => ({ ...p, photo: "" }))}>Quitar foto</button>}
              </div>
              <div className="profile-fields">
                <label className="profile-field">
                  <span>Tu nombre</span>
                  <input type="text" placeholder="Cómo quieres que te llamemos" value={profile.displayName} onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))} />
                </label>
                <label className="profile-field">
                  <span>Nombre de tu negocio</span>
                  <input type="text" placeholder="Ej: Mamá CEO Academy" value={profile.businessName} onChange={(e) => setProfile((p) => ({ ...p, businessName: e.target.value }))} />
                </label>
                <label className="profile-field">
                  <span>¿Qué vendes y a quién?</span>
                  <textarea className="purpose-textarea" style={{minHeight:"70px"}} placeholder="Ej: Mentoría para mamás emprendedoras que quieren vivir de su negocio" value={profile.businessDesc} onChange={(e) => setProfile((p) => ({ ...p, businessDesc: e.target.value }))} />
                </label>
                <label className="profile-field">
                  <span>Moneda base</span>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{minHeight:"42px",border:"1px solid var(--line)",borderRadius:"8px",padding:"0 12px",background:"#fff",color:"var(--ink)",font:"inherit",width:"100%"}}>
                    <option>USD</option><option>COP</option><option>MXN</option><option>EUR</option>
                  </select>
                </label>
              </div>
              <div style={{display:"grid",gap:"8px",marginTop:"8px"}}>
                <button className="primary-button" type="button" onClick={() => setProfileOpen(false)}>Guardar y cerrar</button>
                {supabaseActive && user && <button type="button" className="signout-button" style={{width:"100%",textAlign:"center"}} onClick={signOut}>Cerrar sesión</button>}
              </div>
            </div>
          </div>
        )}

        <footer className="app-footer">
          <span>© 2026 UMP S.A.S • Todos los derechos reservados</span>
          <span>Hecho por Una mamá con propósito®</span>
        </footer>
      </main>
    </div>
  );

  function renderDashboard() {
    return (
      <>
        <section className="focus-banner">
          <div className="focus-copy">
            <span className="target-icon">◎</span>
            <div>
              <p className="eyebrow">Tu enfoque de excelencia de la semana</p>
              <h2>{monthlyProgress >= 80 ? "Cierra ventas pendientes y protege tu energia." : "Haz seguimiento a clientas y prioriza acciones que generan caja."}</h2>
              <span className="pill">Elige la acción pequeña que más resultado produce</span>
            </div>
          </div>
          <div className="goal-box">
            <p>Tu meta financiera mensual</p>
            <strong>{money.format(monthlyGoal)}</strong>
            <Progress value={monthlyProgress} tone="purple" />
            <small>{monthlyProgress}% completado</small>
          </div>
          <div className="week-ring" style={{ "--value": 75 }}>
            <span>Semana</span>
            <strong>3 de 4</strong>
          </div>
        </section>

        <section className="excellence-panel">
          <div className="excellence-copy">
            <p className="eyebrow">La ley de la excelencia aplicada</p>
            <h2>Haz menos cosas, pero mejor elegidas: una acción correcta puede mover ventas, paz mental y hogar.</h2>
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
          <div className="section-title">
            <h2>Resumen financiero del negocio</h2>
            <p>Actualizado con tus movimientos</p>
          </div>

          <div className="kpi-grid">
            <MetricCard title="Ingresos" value={money.format(totals.income)} change="Dinero generado" tone="green" />
            <MetricCard title="Gastos" value={money.format(totals.expenses)} change="Dinero invertido" tone="pink" />
            <MetricCard title="Utilidad" value={money.format(totals.profit)} change="Resultado actual" tone="purple" />
            <MetricCard title="Reinversión" value={money.format(reinvestmentAmount)} change={`${reinvestmentPercent}% de tus ventas`} tone="orange" />
          </div>

          <div className="content-grid">
            <div className="card chart-card"><h3>Ingresos vs gastos</h3><LineChart movements={movements} /></div>
            <div className="card donut-card">
              <h3>Distribución de gastos</h3>
              <div className="donut-wrap">
                <div className="donut"><strong>{money.format(totals.expenses)}</strong><span>Total</span></div>
                <ul>
                  <li><span className="dot purple"></span>Marketing <b>35%</b></li>
                  <li><span className="dot pink"></span>Herramientas <b>25%</b></li>
                  <li><span className="dot orange"></span>Operaciones <b>20%</b></li>
                  <li><span className="dot green"></span>Servicios <b>20%</b></li>
                </ul>
              </div>
            </div>
            {MovementForm()}
            <div className="card task-card">
              <h3>Acciones clave ({completedTasks}/{tasks.length})</h3>
              {tasks.map((task) => <label key={task.id} className="task-row"><input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} /><span>{task.text}</span></label>)}
            </div>
            <div className="card avoid-card"><h3>Qué no hacer esta semana</h3><p>No responder desde culpa o ansiedad.</p><p>No intentar controlar cada emoción de tus hijos.</p><p>No llenar tu agenda para sentirte productiva.</p><p>{purpose.mood === "controladora" ? "Practica soltar una cosa pequeña y respirar antes de corregir." : "Protege tu paz antes de decir sí a otra carga."}</p></div>
            <div className="card progress-card"><h3>Tu semana de excelencia</h3><div className="weekly-goal"><span>Meta semanal de ingresos</span><strong>{money.format(weeklyGoal)}</strong><Progress value={weeklyProgress} tone="pink" /></div><p className="helper-copy">Esta tarjeta muestra si tus acciones de la semana están acercando dinero, calma y ejecución.</p><ProgressLabel label="Ventas" value={weeklyProgress} tone="green" /><ProgressLabel label="Paz" value={purpose.silence ? 80 : 45} tone="purple" /><ProgressLabel label="Acción" value={completedTasks ? Math.round((completedTasks / tasks.length) * 100) : 0} tone="orange" /></div>
            <div className="card goals-card"><h3>Progreso de tus metas</h3><p className="helper-copy">Esta semana enfócate en seguimiento, cobros y una oferta clara antes de crear más tareas.</p><div className="mini-goals"><MiniGoal label="Meta diaria" value={dailyProgress} amount={money.format(dailyGoal)} /><MiniGoal label="Meta semanal" value={weeklyProgress} amount={money.format(weeklyGoal)} /><MiniGoal label="Meta mensual" value={monthlyProgress} amount={money.format(monthlyGoal)} /></div></div>
            {ReinvestmentCard()}
            {DashboardSummaryCard()}
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
    const healthLabel = healthScore === "green" ? "🟢 Negocio saludable"
      : healthScore === "orange" ? "🟡 Atención requerida" : "🔴 Alerta financiera";
    const healthMsg = healthScore === "green"
      ? "Tus ingresos superan tus gastos y vas bien hacia tu meta."
      : healthScore === "orange"
        ? "Hay margen pero necesitas acelerar ventas o reducir gastos."
        : "Tus gastos superan tus ingresos. Prioriza cobros y reduce gastos no esenciales hoy.";
    const incomeBySource = incomeSources.map((src) => {
      const actual = movements.filter((m) => m.type === "income" && m.classification === src.name).reduce((sum, m) => sum + m.amount, 0);
      const progress = src.monthlyGoal > 0 ? Math.min(Math.round((actual / src.monthlyGoal) * 100), 100) : 0;
      return { ...src, actual, progress };
    });
    return (
      <section className="panel workspace-panel">
        <div className="section-title"><h2>Negocio</h2><p>Salud financiera, fuentes de ingreso y presupuesto.</p></div>

        <div className={`health-banner health-${healthScore}`}>
          <strong>{healthLabel}</strong>
          <p>{healthMsg}</p>
          <div className="health-stats">
            <span>Ingresos: <b>{money.format(totals.income)}</b></span>
            <span>Gastos: <b>{money.format(totals.expenses)}</b></span>
            <span>Utilidad: <b>{money.format(totals.profit)}</b></span>
            <span>Meta mensual: <b>{monthlyProgress}%</b></span>
          </div>
        </div>

        <div className="business-sources-grid">
          <div className="card">
            <h3>Fuentes de ingreso</h3>
            <p className="helper-copy">Define tus fuentes y metas mensuales. Los ingresos se calculan desde tus movimientos registrados.</p>
            {incomeBySource.map((src) => (
              <div className="source-row" key={src.id}>
                <div className="source-info">
                  <strong>{src.name}</strong>
                  <small>{money.format(src.actual)} de {money.format(src.monthlyGoal)} meta</small>
                </div>
                <div className="source-right">
                  <Progress value={src.progress} tone={src.color} />
                  <small>{src.progress}%</small>
                  <input type="number" min="0" value={src.monthlyGoal} onChange={(e) => setIncomeSources((c) => c.map((s) => s.id === src.id ? { ...s, monthlyGoal: Number(e.target.value) } : s))} />
                  <button type="button" className="row-delete" onClick={() => confirmDelete("¿Eliminar?", () => setIncomeSources((c) => c.filter((s) => s.id !== src.id)))}>×</button>
                </div>
              </div>
            ))}
            <form className="source-form" onSubmit={(e) => { e.preventDefault(); if (!incomeSourceForm.name.trim()) return; setIncomeSources((c) => [...c, { id: Date.now(), name: incomeSourceForm.name.trim(), monthlyGoal: Number(incomeSourceForm.monthlyGoal) || 0, color: "purple" }]); setIncomeSourceForm({ name: "", monthlyGoal: "" }); }}>
              <input placeholder="Nombre de la fuente" value={incomeSourceForm.name} onChange={(e) => setIncomeSourceForm((c) => ({ ...c, name: e.target.value }))} />
              <input type="number" min="0" placeholder="Meta mensual" value={incomeSourceForm.monthlyGoal} onChange={(e) => setIncomeSourceForm((c) => ({ ...c, monthlyGoal: e.target.value }))} />
              <button className="primary-button" type="submit">Agregar</button>
            </form>
          </div>
          <div className="card insight-card">
            <h3>Lectura CEO</h3>
            {insights.map((insight) => <p key={insight}>{insight}</p>)}
          </div>
        </div>

        <div className="business-panel-row">
          <div className="card movement-small-card">{MovementForm()}</div>
          {ReinvestmentCard()}
        </div>

        <div className="annual-budget-card card">
          <div className="budget-head">
            <div><h3>Presupuesto anual</h3><p>Todos los campos son editables. Los gastos ya no se calculan solos.</p></div>
            <div className="budget-total"><span>Utilidad anual estimada</span><strong>{money.format(annualProfit)}</strong></div>
          </div>
          <div className="budget-table">
            <div className="budget-row budget-header"><span>Mes</span><span>Ingresos</span><span>Gastos fijos</span><span>Gastos variables</span><span>Fees</span><span>Utilidad</span></div>
            {annualBudget.map((row) => {
              const profit = Number(row.income || 0) - Number(row.fixedExpenses || 0) - Number(row.variableExpenses || 0) - Number(row.platformFees || 0);
              return (
                <div className="budget-row" key={row.month}>
                  <strong>{row.month}</strong>
                  <input type="number" min="0" value={row.income} onChange={(e) => updateAnnualBudget(row.month, "income", e.target.value)} />
                  <input type="number" min="0" value={row.fixedExpenses} onChange={(e) => updateAnnualBudget(row.month, "fixedExpenses", e.target.value)} />
                  <input type="number" min="0" value={row.variableExpenses} onChange={(e) => updateAnnualBudget(row.month, "variableExpenses", e.target.value)} />
                  <input type="number" min="0" value={row.platformFees} onChange={(e) => updateAnnualBudget(row.month, "platformFees", e.target.value)} />
                  <b style={{color: profit >= 0 ? "var(--green)" : "var(--pink)"}}>{money.format(profit)}</b>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bank-section">{BanksCard()}</div>
        <div className="card movement-detail-card">
          <div className="movement-detail-header">
            <div><h3>Detalles de movimientos</h3><p className="helper-copy">Consulta y descarga tus movimientos.</p></div>
            <div className="export-buttons">
              <button type="button" onClick={exportMovementsToExcel}>Exportar a Excel</button>
              <button type="button" onClick={exportMovementsToPdf}>Exportar a PDF</button>
            </div>
          </div>
          {MovementList({ compact: true })}
        </div>
      </section>
    );
  }
        <div className="annual-budget-card card">
          <div className="budget-head">
            <div>
              <h3>Presupuesto anual</h3>
              <p>Ingresos proyectados definen automáticamente gastos fijos y variables.</p>
            </div>
            <div className="budget-total">
              <span>Utilidad anual estimada</span>
              <strong>{money.format(annualProfit)}</strong>
            </div>
          </div>
          <div className="budget-table">
            <div className="budget-row budget-header"><span>Mes</span><span>Ingresos</span><span>Gastos fijos</span><span>Gastos variables</span><span>Fees</span><span>Utilidad</span></div>
            {annualBudget.map((row) => {
              const profit = Number(row.income || 0) - Number(row.fixedExpenses || 0) - Number(row.variableExpenses || 0) - Number(row.platformFees || 0);
              return (
                <div className="budget-row" key={row.month}>
                  <strong>{row.month}</strong>
                  <input type="number" min="0" value={row.income} onChange={(event) => updateAnnualBudget(row.month, "income", event.target.value)} />
                  <span>{money.format(row.fixedExpenses)}</span>
                  <span>{money.format(row.variableExpenses)}</span>
                  <input type="number" min="0" value={row.platformFees} onChange={(event) => updateAnnualBudget(row.month, "platformFees", event.target.value)} />
                  <b>{money.format(profit)}</b>
                </div>
              );
            })}
          </div>
        </div>
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

    // 1. Acción del día — clienta más prioritaria
    const priorityClient = [...clients]
      .filter((c) => c.status !== "Venta ganada")
      .sort((a, b) => {
        const stageScore = { "Lead caliente": 3, "Lead tibio": 2, "Lead frio": 1 };
        const aScore = (stageScore[a.status] || 0) * 100 + daysSince(a.lastContact) + (a.amount || 0) / 100;
        const bScore = (stageScore[b.status] || 0) * 100 + daysSince(b.lastContact) + (b.amount || 0) / 100;
        return bScore - aScore;
      })[0];

    // 2. Tasa de conversión
    const totalLeads = clients.length;
    const totalWon = clients.filter((c) => c.status === "Venta ganada").length;
    const conversionRate = totalLeads > 0 ? Math.round((totalWon / totalLeads) * 100) : 0;

    // 3. Tiempo promedio de cierre
    const closedWithDates = clients.filter((c) => c.status === "Venta ganada" && c.createdAt && c.lastContact);
    const avgCloseDays = closedWithDates.length > 0
      ? Math.round(closedWithDates.reduce((sum, c) => sum + Math.floor((c.lastContact - c.createdAt) / 86400000), 0) / closedWithDates.length)
      : null;

    // 4. Fuentes de origen
    const sourceCounts = clients.reduce((acc, c) => {
      const src = c.source || "Sin fuente";
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {});
    const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0];

    const defaultSources = ["Instagram", "Referido", "Contenido / Reel", "WhatsApp", "TikTok", "Email", "Otra"];

    return (
      <section className="panel workspace-panel">
        <div className="section-title"><h2>Clientes</h2><p>{activeClients} activas • {money.format(wonSalesTotal)} en ventas cerradas</p></div>

        {/* 1. Acción del día */}
        {priorityClient && (() => {
          const waMsg = encodeURIComponent(`Hola ${priorityClient.name}! 💛 No quería dejar nuestra conversación sin un final. Aquí estoy para retomar cuando sea buen momento para ti. ¿Sigues interesada en ${priorityClient.service}?`);
          return (
            <div className="action-day-banner">
              <div className="action-day-left">
                <span className="action-day-label">🎯 Acción del día</span>
                <strong>{priorityClient.name}</strong>
                <span>{priorityClient.status} • {money.format(priorityClient.amount)} • hace {daysSince(priorityClient.lastContact)} días sin contacto</span>
                <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"8px"}}>
                  <button type="button" className="contact-today-btn" style={{width:"auto",padding:"0 14px"}} onClick={() => logContact(priorityClient.id, priorityClient.name)}>✅ Contacté hoy</button>
                  <a href={`https://wa.me/?text=${waMsg}`} target="_blank" rel="noreferrer"
                    style={{display:"inline-flex",alignItems:"center",gap:"6px",padding:"0 14px",minHeight:"32px",borderRadius:"8px",background:"#25d366",color:"#fff",fontSize:"12px",fontWeight:700,textDecoration:"none"}}>
                    📲 WhatsApp
                  </a>
                </div>
              </div>
              <div className="action-day-right">
                <p>{priorityClient.nextAction || "Hacer seguimiento"}</p>
                <div style={{marginTop:"8px",textAlign:"center"}}>
                  <strong style={{fontSize:"28px",color:"var(--green)",display:"block",lineHeight:1}}>{contactsThisWeek}</strong>
                  <small style={{color:"var(--muted)",fontSize:"11px",textTransform:"uppercase",fontWeight:800,letterSpacing:"0.5px"}}>contactos esta semana</small>
                  <small style={{color:"var(--green)",fontSize:"11px",fontWeight:700}}>{contactsThisWeek >= 5 ? "🔥 excelente ritmo" : contactsThisWeek >= 3 ? "👍 buen avance" : "meta: 5+"}</small>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 2 y 3. KPIs inteligentes */}
        <div className="clients-kpi-row">
          {stages.map((stage) => (
            <div className="client-kpi" key={stage}>
              <span>{stage}</span>
              <strong>{clients.filter((c) => c.status === stage).length}</strong>
              <small>{money.format(stageTotal(stage))}</small>
            </div>
          ))}
          <div className="client-kpi">
            <span>Conversión</span>
            <strong>{conversionRate}%</strong>
            <small>{totalWon} de {totalLeads} leads</small>
          </div>
          <div className="client-kpi">
            <span>Cierre promedio</span>
            <strong>{avgCloseDays !== null ? `${avgCloseDays}d` : "—"}</strong>
            <small>{avgCloseDays !== null ? "días hasta venta" : "sin datos aún"}</small>
          </div>
          {topSource && (
            <div className="client-kpi">
              <span>Mejor fuente</span>
              <strong style={{fontSize:"14px"}}>{topSource[0]}</strong>
              <small>{topSource[1]} clienta{topSource[1] !== 1 ? "s" : ""}</small>
            </div>
          )}
        </div>

        {(urgentClients.length > 0 || urgentSubscriptions.length > 0) && (
          <div className="client-alerts">
            {urgentClients.length > 0 && (
              <div className="alert-banner alert-orange">
                🔔 <strong>{urgentClients.length} lead{urgentClients.length > 1 ? "s" : ""} sin contacto:</strong> {urgentClients.map((c) => c.name).join(", ")} — actúas hoy o se enfriarán.
              </div>
            )}
            {urgentSubscriptions.length > 0 && (
              <div className="alert-banner alert-red">
                ⚠️ <strong>{urgentSubscriptions.length} clienta{urgentSubscriptions.length > 1 ? "s" : ""} sin seguimiento:</strong> {urgentSubscriptions.map((c) => c.name).join(", ")} — riesgo de perder la relación.
              </div>
            )}
          </div>
        )}

        {/* 4. Fuentes de origen en formulario */}
        <form className="card form-card" onSubmit={addClient} style={{display:"grid",gap:"10px",marginBottom:"14px"}}>
          <h3>Nueva clienta</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"8px"}}>
            <input placeholder="Nombre" value={clientForm.name} onChange={(e) => updateClientForm("name", e.target.value)} />
            <input placeholder="Servicio o producto" value={clientForm.service} onChange={(e) => updateClientForm("service", e.target.value)} />
            <select value={clientForm.status} onChange={(e) => updateClientForm("status", e.target.value)}>{stages.map((s) => <option key={s}>{s}</option>)}</select>
            <input placeholder="Próxima acción" value={clientForm.nextAction} onChange={(e) => updateClientForm("nextAction", e.target.value)} />
            <input placeholder="Monto" type="number" min="0" value={clientForm.amount} onChange={(e) => updateClientForm("amount", e.target.value)} />
            <select value={clientForm.source} onChange={(e) => updateClientForm("source", e.target.value)}>
              <option value="">¿De dónde llegó?</option>
              {defaultSources.map((s) => <option key={s}>{s}</option>)}
            </select>
            {clientForm.source === "Otra" && (
              <input placeholder="¿Cuál fuente?" value={clientForm.customSource} onChange={(e) => updateClientForm("customSource", e.target.value)} />
            )}
            <button className="primary-button" type="submit">Guardar clienta</button>
          </div>
        </form>

        <div className="pipeline-board">
            {stages.map((stage) => (
              <div className="pipeline-column" key={stage}>
                <div className="pipeline-col-header">
                  <h3>{stage}</h3>
                  <small>{money.format(stageTotal(stage))}</small>
                </div>
                {clients.filter((c) => c.status === stage).map((client) => {
                  const alert = getAlert(client);
                  const days = daysSince(client.lastContact);
                  return (
                    <div className={`lead-card lead-alert-${alert}`} key={client.id}>
                      <div className="lead-card-top">
                        <strong>{client.name}</strong>
                        <span className={`alert-dot alert-dot-${alert}`}></span>
                      </div>
                      <small>{client.service} • {money.format(client.amount)}</small>
                      {client.source && <small style={{color:"var(--purple)",fontWeight:700}}>📍 {client.source}</small>}
                      <p>{client.nextAction || "Hacer seguimiento"}</p>
                      <small className="last-contact">
                        {client.lastContact ? `Último contacto: hace ${days} día${days !== 1 ? "s" : ""}` : "Sin contacto registrado"}
                      </small>
                      <button type="button" className="contact-today-btn" onClick={() => logContact(client.id, client.name)}>
                        ✅ Contacté hoy
                      </button>
                      <div className="lead-stage-btns">
                        {stages.filter((s) => s !== stage).map((s) => (
                          <button type="button" key={s} onClick={() => moveClientStatus(client.id, s)}>{s.replace("Lead ", "")}</button>
                        ))}
                        <button type="button" className="delete-btn" onClick={() => confirmDelete("¿Eliminar?", () => setClients((c) => c.filter((cl) => cl.id !== client.id)))}>Eliminar</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

        <div className="paid-clients-section card">
          <div className="section-title compact-title"><h2>Clientas que ya pagaron</h2><p>Cuida la experiencia, fomenta la recompra y los referidos.</p></div>
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
                {client.source && <small style={{color:"var(--purple)",fontWeight:700}}>📍 {client.source}</small>}
                <small className="last-contact">{client.lastContact ? `Último contacto: hace ${daysSince(client.lastContact)} días` : "Sin contacto registrado"}</small>
                <button type="button" className="contact-today-btn" onClick={() => logContact(client.id, client.name)}>✅ Contacté hoy</button>
                <textarea placeholder="Notas de seguimiento, entrega, resultados o próxima recompra..." value={client.notes || ""} onChange={(e) => updateClientNotes(client.id, e.target.value)} />
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function renderContent() {
    const contentTypes = [
      { key: "Educativo", color: "purple", pct: 40, desc: "Demuestra que sabes" },
      { key: "Storytelling", color: "pink", pct: 30, desc: "Genera conexión" },
      { key: "Entretenido", color: "orange", pct: 20, desc: "Construye audiencia" },
      { key: "Oferta", color: "green", pct: 10, desc: "Convierte a ventas" }
    ];
    const published = contentItems.filter((i) => i.status === "Publicado");
    const total = published.length || 1;
    const typeCounts = contentTypes.map((t) => ({
      ...t,
      actual: published.filter((i) => i.type === t.key).length,
      actualPct: Math.round((published.filter((i) => i.type === t.key).length / total) * 100)
    }));

    // Semaforo de marketing
    const ofertaCount = published.filter((i) => i.type === "Oferta").length;
    const leadsFromContent = clients.filter((c) => c.source === "Contenido / Reel").length;
    const consistencyWeeks = ["Semana 1","Semana 2","Semana 3","Semana 4"].filter((w) => contentItems.some((i) => i.week === w && i.status === "Publicado")).length;
    const marketingScore = published.length >= 4 && ofertaCount >= 1 && consistencyWeeks >= 3 ? "green"
      : published.length >= 2 || ofertaCount >= 1 ? "orange" : "red";
    const marketingMsg = marketingScore === "green"
      ? "🟢 Tu contenido está trabajando bien. Mantén la consistencia y sigue mezclando tipos."
      : marketingScore === "orange"
        ? "🟡 Vas bien pero falta consistencia o contenido de oferta directa."
        : "🔴 Tu contenido aún no está atrayendo. Publica más seguido y agrega al menos 1 oferta clara.";

    // Que publicar esta semana
    const missingType = typeCounts.find((t) => t.actualPct < t.pct / 2);
    const nextSuggestion = missingType
      ? `Publicas poco contenido de tipo “${missingType.key}” (tienes ${missingType.actualPct}%, meta ${missingType.pct}%). Esta semana crea uno.`
      : "Tu mezcla de contenido está balanceada. Sigue publicando con consistencia.";

    const unpublished = contentItems.filter((i) => i.status !== "Publicado").length;

    return (
      <section className="panel workspace-panel">
        <div className="section-title"><h2>Marketing &amp; Contenido</h2><p>{published.length} publicados • {consistencyWeeks}/4 semanas activas</p></div>

        {/* Semáforo */}
        <div className={`health-banner health-${marketingScore}`} style={{marginBottom:"14px"}}>
          <strong>{marketingMsg}</strong>
          <div className="health-stats">
            <span>Publicados: <b>{published.length}</b></span>
            <span>Semanas activas: <b>{consistencyWeeks}/4</b></span>
            <span>Ofertas directas: <b>{ofertaCount}</b></span>
            <span>Leads por contenido: <b>{leadsFromContent}</b></span>
          </div>
        </div>

        {/* Mezcla de contenido */}
        <div className="card" style={{marginBottom:"14px",display:"grid",gap:"14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h3 style={{margin:0}}>🎯 Tu mezcla de contenido</h3>
            <small style={{color:"var(--muted)",fontSize:"12px"}}>basado en publicados</small>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"10px"}}>
            {typeCounts.map((t) => {
              const ok = t.actualPct >= t.pct * 0.7;
              return (
                <div key={t.key} style={{border:`2px solid ${ok ? "var(--green)" : "var(--orange)"}`,borderRadius:"12px",padding:"12px",background:ok ? "var(--green-soft)" : "var(--orange-soft)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                    <strong style={{fontSize:"13px"}}>{t.key}</strong>
                    <span style={{fontSize:"11px",fontWeight:800,color:ok ? "var(--green)" : "#8a5a00"}}>{t.actualPct}% / {t.pct}%</span>
                  </div>
                  <Progress value={t.actualPct} tone={ok ? "green" : "orange"} />
                  <small style={{color:"var(--muted)",fontSize:"11px",marginTop:"4px",display:"block"}}>{t.desc} • {t.actual} pieza{t.actual !== 1 ? "s" : ""}</small>
                </div>
              );
            })}
          </div>
          <div style={{padding:"12px 14px",borderRadius:"10px",background:"var(--purple-soft)",borderLeft:"3px solid var(--purple)"}}>
            <p style={{margin:0,fontSize:"13px",color:"#3a1a4a"}}>💡 <strong>Esta semana publica:</strong> {nextSuggestion}</p>
          </div>
        </div>

        <div className="section-layout">
          <form className="card form-card section-form" onSubmit={addContent}>
            <h3>Agregar contenido</h3>
            <input placeholder="Título del contenido" value={contentForm.title} onChange={(e) => updateContentForm("title", e.target.value)} />
            <input placeholder="Hook o primera frase" value={contentForm.hook} onChange={(e) => updateContentForm("hook", e.target.value)} />
            <select value={contentForm.type} onChange={(e) => updateContentForm("type", e.target.value)}>
              <option>Educativo</option>
              <option>Storytelling</option>
              <option>Entretenido</option>
              <option>Oferta</option>
            </select>
            <select value={contentForm.format} onChange={(e) => updateContentForm("format", e.target.value)}><option>Reel</option><option>Historia</option><option>Post</option><option>Carrusel</option><option>Foto</option><option>Articulo</option><option>Episodio</option></select>
            <select value={contentForm.network} onChange={(e) => updateContentForm("network", e.target.value)}><option>Instagram</option><option>YouTube</option><option>Spotify</option><option>TikTok</option><option>Website</option><option>Otra</option></select>
            {contentForm.network === "Otra" && <input placeholder="Cuál red social" value={contentForm.customNetwork} onChange={(e) => updateContentForm("customNetwork", e.target.value)} />}
            <select value={contentForm.week} onChange={(e) => updateContentForm("week", e.target.value)}><option>Semana 1</option><option>Semana 2</option><option>Semana 3</option><option>Semana 4</option></select>
            <select value={contentForm.status} onChange={(e) => updateContentForm("status", e.target.value)}><option>Por hacer</option><option>Guion hecho</option><option>Grabacion</option><option>Edicion</option><option>Programado</option><option>Publicado</option></select>
            <button className="primary-button" type="submit">Guardar</button>
          </form>

          <div style={{display:"grid",gap:"14px"}}>
            <div className="card data-card">
              <h3>Resumen</h3>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                <MetricCard title="Publicado" value={published.length} change="piezas" tone="green" />
                <MetricCard title="Pendiente" value={unpublished} change="por mover" tone="orange" />
              </div>
              <p className="helper-copy">{published.length >= 3 ? "Estás on fire con tu consistencia." : published.length >= 1 ? "Vas tomando ritmo. Sosténlo una semana más." : "Empieza con una pieza simple que venda."}</p>
            </div>

            <div className="card data-card content-table">
              <h3>Tabla por semanas</h3>
              {["Semana 1","Semana 2","Semana 3","Semana 4"].map((week) => (
                <div className="content-week" key={week}>
                  <h4>{week}</h4>
                  {contentItems.filter((i) => i.week === week).map((item) => (
                    <div className="content-row" key={item.id}>
                      <div>
                        <strong>{item.title}</strong>
                        <small>
                          <span className={`content-type-badge content-type-${(item.type || "Educativo").toLowerCase()}`}>{item.type || "Educativo"}</span>
                          {" "}{item.hook || "Sin hook"} • {item.format} • {item.network}
                        </small>
                      </div>
                      <select value={item.status} onChange={(e) => updateContentStatus(item.id, e.target.value)}><option>Por hacer</option><option>Guion hecho</option><option>Grabacion</option><option>Edicion</option><option>Programado</option><option>Publicado</option></select>
                      <button type="button" onClick={() => confirmDelete("¿Eliminar?", () => setContentItems((c) => c.filter((x) => x.id !== item.id)))}>Eliminar</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderHome() {
    const homeProgress = homeTasks.length ? Math.round((completedHomeTasks / homeTasks.length) * 100) : 0;
    const catConfig = {
      Compras: { icon: "🛒", color: "var(--orange)", bg: "var(--orange-soft)" },
      Calendario: { icon: "📅", color: "var(--purple)", bg: "var(--purple-soft)" },
      Rutina: { icon: "☀️", color: "#c9607a", bg: "var(--pink-soft)" },
      Bienestar: { icon: "💚", color: "var(--green)", bg: "var(--green-soft)" }
    };
    const tasksByCategory = ["Compras","Calendario","Rutina","Bienestar"].map((cat) => ({
      cat,
      ...catConfig[cat],
      tasks: homeTasks.filter((t) => t.category === cat)
    }));
    return (
      <section className="panel workspace-panel">
        <div className="section-title"><h2>Hogar</h2><p>{completedHomeTasks}/{homeTasks.length} tareas • {money.format(homeAvailable)} disponible</p></div>

        {/* Presupuesto del hogar */}
        <div className="home-budget-card card">
          <div className="budget-head">
            <div><h3>Presupuesto mensual del hogar</h3><p>Ingresos, gastos, deudas y disponible familiar.</p></div>
            <div className="budget-total"><span>Disponible</span><strong style={{color: homeAvailable >= 0 ? "#6f2f4b" : "var(--pink)"}}>{money.format(homeAvailable)}</strong></div>
          </div>
          <form className="home-budget-form" onSubmit={addHomeBudgetItem}>
            <select value={homeBudgetForm.type} onChange={(e) => setHomeBudgetForm((c) => ({ ...c, type: e.target.value }))}><option>Ingreso</option><option>Gasto fijo</option><option>Gasto variable</option><option>Gasto hormiga</option><option>Deuda</option><option>Ahorro</option></select>
            <input placeholder="Descripción" value={homeBudgetForm.description} onChange={(e) => setHomeBudgetForm((c) => ({ ...c, description: e.target.value }))} />
            <input type="number" min="0" placeholder="Monto" value={homeBudgetForm.amount} onChange={(e) => setHomeBudgetForm((c) => ({ ...c, amount: e.target.value }))} />
            <button className="primary-button" type="submit">Agregar</button>
          </form>
          <div className="home-money-insights">
            <article><span>Ganando</span><strong>{money.format(homeBudgetTotals.income)}</strong></article>
            <article><span>Gastando</span><strong>{money.format(homeSpent)}</strong></article>
            <article><span>Mayor fuga</span><strong style={{fontSize:"14px"}}>{biggestHomeLeak[0]}</strong><small>{money.format(biggestHomeLeak[1])}</small></article>
            <article><span>Ahorro</span><strong>{money.format(homeBudgetTotals.savings)}</strong><small>{homeBudgetTotals.savings > 0 ? "✅ construyendo paz" : "empieza con poco"}</small></article>
          </div>
          <div className="money-track">
            <span style={{ width: `${Math.min(100, homeBudgetTotals.income ? (homeSpent / homeBudgetTotals.income) * 100 : 0)}%` }}></span>
            <small>Gastado vs ingresos del hogar</small>
          </div>
          <div className="budget-list">{homeBudget.map((item) => <DataRow key={item.id} title={item.description} meta={item.type} value={money.format(item.amount)} onDelete={() => setHomeBudget((c) => c.filter((r) => r.id !== item.id))} />)}</div>
        </div>

        {/* Tareas por categoría */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"14px",marginBottom:"14px"}}>
          {tasksByCategory.map(({ cat, icon, color, bg, tasks: catTasks }) => (
            <div key={cat} className="card" style={{display:"grid",gap:"10px",alignContent:"start",minHeight:"auto",borderTop:`3px solid ${color}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <h3 style={{margin:0,fontSize:"14px"}}>{icon} {cat}</h3>
                <span style={{fontSize:"11px",fontWeight:800,color,background:bg,padding:"2px 8px",borderRadius:"999px"}}>{catTasks.filter((t) => t.done).length}/{catTasks.length}</span>
              </div>
              {catTasks.map((task) => (
                <label key={task.id} className="home-row" style={{gridTemplateColumns:"auto 1fr auto",minHeight:"44px"}}>
                  <input type="checkbox" checked={task.done} onChange={() => toggleHomeTask(task.id)} />
                  <span><strong style={{fontSize:"13px"}}>{task.title}</strong></span>
                  <button type="button" className="row-delete" onClick={() => confirmDelete("¿Eliminar?", () => setHomeTasks((c) => c.filter((t) => t.id !== task.id)))}>×</button>
                </label>
              ))}
              {catTasks.length === 0 && <small style={{color:"var(--muted)"}}>Sin tareas en esta categoría</small>}
            </div>
          ))}
        </div>

        {/* Agregar tarea + progreso */}
        <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:"14px",alignItems:"start"}}>
          <form className="card form-card" onSubmit={addHomeTask} style={{display:"grid",gap:"10px",minHeight:"auto"}}>
            <h3>Agregar tarea</h3>
            <input placeholder="Tarea" value={homeForm.title} onChange={(e) => updateHomeForm("title", e.target.value)} />
            <select value={homeForm.category} onChange={(e) => updateHomeForm("category", e.target.value)}><option>Compras</option><option>Calendario</option><option>Rutina</option><option>Bienestar</option></select>
            <button className="primary-button" type="submit">Guardar tarea</button>
          </form>
          <div className="card" style={{display:"grid",gap:"12px",minHeight:"auto"}}>
            <h3>Progreso semanal del hogar</h3>
            <div className="weekly-goal">
              <span>Tareas completadas</span>
              <strong>{homeProgress}%</strong>
              <Progress value={homeProgress} tone="green" />
            </div>
            <p className="helper-copy">{homeProgress >= 80 ? "🔥 Semana del hogar excelente. Tu mente está más libre para vender." : homeProgress >= 50 ? "👍 Buen avance. Delega o simplifica lo que queda." : "⚠️ La carga del hogar pesa. Elige 1 tarea urgente y delega el resto."}</p>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
              {["Compras","Calendario","Rutina","Bienestar"].map((cat) => {
                const cfg = catConfig[cat];
                const done = homeTasks.filter((t) => t.category === cat && t.done).length;
                const total = homeTasks.filter((t) => t.category === cat).length;
                return total > 0 ? (
                  <span key={cat} style={{fontSize:"12px",fontWeight:700,padding:"4px 10px",borderRadius:"999px",background:cfg.bg,color:cfg.color}}>
                    {cfg.icon} {cat} {done}/{total}
                  </span>
                ) : null;
              })}
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
    return (
      <section className="panel workspace-panel">
        <div className="section-title">
          <h2>Propósito &amp; Impacto</h2>
          <p>Mide lo que realmente importa — presencia, energía, sistemas e impacto</p>
        </div>

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
    const totalLeads = clients.length;
    const totalWon = clients.filter((c) => c.status === "Venta ganada").length;
    const conversionRate = totalLeads > 0 ? Math.round((totalWon / totalLeads) * 100) : 0;
    const hotLeads = clients.filter((c) => c.status === "Lead caliente").length;
    const homeProgress = homeTasks.length ? Math.round((completedHomeTasks / homeTasks.length) * 100) : 0;
    const selfCareScore = [purpose.water, purpose.walk, purpose.silence, purpose.devotional].filter(Boolean).length;
    const incomePerHour = purpose.hoursWorked > 0 ? Math.round(totals.income / purpose.hoursWorked) : 0;
    const salesGoalProgress = salesGoal > 0 ? Math.min(Math.round((wonSalesTotal / salesGoal) * 100), 100) : 0;

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
          <p>Tu resumen inteligente de ventas, hogar y energía</p>
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
