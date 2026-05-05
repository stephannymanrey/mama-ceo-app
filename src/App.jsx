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
  { id: "ceo", label: "Propósito & Impacto", icon: "○" }
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

  const [form, setForm] = useState({ type: "income", classification: "Servicios", description: "", category: "", amount: "", bank: banks[0] || "" });
  const [clientForm, setClientForm] = useState({ name: "", service: "", status: "Lead tibio", amount: "", nextAction: "" });
  const [contentForm, setContentForm] = useState({ title: "", hook: "", format: "Reel", network: "Instagram", customNetwork: "", week: "Semana 1", status: "Por hacer" });
  const [goalForm, setGoalForm] = useState({ title: "", amount: "", period: "Mensual", status: "Activa" });
  const [homeForm, setHomeForm] = useState({ title: "", category: "Compras" });

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
    setClients((current) => [{ id: Date.now(), name: clientForm.name.trim(), service: clientForm.service.trim(), status: clientForm.status, amount, nextAction: clientForm.nextAction.trim() || "Hacer seguimiento" }, ...current]);
    setClientForm({ name: "", service: "", status: "Seguimiento", amount: "", nextAction: "" });
  };

  const addContent = (event) => {
    event.preventDefault();
    if (!contentForm.title.trim()) return;
    const network = contentForm.network === "Otra" ? contentForm.customNetwork.trim() || "Otra" : contentForm.network;
    setContentItems((current) => [{ id: Date.now(), ...contentForm, network, title: contentForm.title.trim(), hook: contentForm.hook.trim() }, ...current]);
    setContentForm({ title: "", hook: "", format: "Reel", network: "Instagram", customNetwork: "", week: "Semana 1", status: "Por hacer" });
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
            <h1>¡Hola, {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Mamá CEO"}!</h1>
            <p>Enfocada • Organizada • Imparable</p>
          </div>
          <div className="profile-area">
            <button className="icon-button" aria-label="Notificaciones">◌</button>
            <div className="avatar">MC</div>
            {isSyncing && <div className="status-chip syncing">Guardando…</div>}
            {!supabaseActive && !isSyncing && <div className="status-chip">Modo local</div>}
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

        {activeView === "dashboard" && renderDashboard()}
        {activeView === "business" && renderBusiness()}
        {activeView === "clients" && renderClients()}
        {activeView === "content" && renderContent()}
        {activeView === "home" && renderHome()}
        {activeView === "ceo" && renderCeo()}

        <footer className="app-footer">
          <span>Hecho por una mamá con propósito S.A.S.</span>
          <span>Marca registrada</span>
          <span>Todos los derechos reservados</span>
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
    return (
      <section className="panel workspace-panel">
        <div className="section-title"><h2>Negocio</h2><p>Presupuesto, bancos y flujo de movimiento con propósito.</p></div>
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
        <div className="business-top-actions">
          {ReinvestmentCard()}
        </div>
        <div className="business-breakdown-grid">
          <div className="card breakdown-card">
            <h3>Origen de ingresos proyectados</h3>
            <p className="helper-copy">Se alimenta automáticamente desde la tabla de presupuesto anual.</p>
            {annualProjectedIncomeSources.map((row) => (
              <div className="breakdown-row" key={row.classification}>
                <div>
                  <strong>{row.classification}</strong>
                  <small>{row.example}</small>
                </div>
                <span>{money.format(row.amount)}</span>
              </div>
            ))}
          </div>
          <div className="card breakdown-card">
            <h3>Destino estimado de gastos</h3>
            <p className="helper-copy">Los montos se arrastran directamente de los valores proyectados arriba.</p>
            {annualProjectedExpenseDestinations.map((row) => (
              <div className="breakdown-destination" key={row.classification}>
                <div className="breakdown-row">
                  <div>
                    <strong>{row.classification}</strong>
                    <small>{row.note}</small>
                  </div>
                  <span>{money.format(row.amount)}</span>
                </div>
              </div>
            ))}
            {annualTotals.platformFees > 0 && (
              <div className="breakdown-destination">
                <div className="breakdown-row">
                  <div>
                    <strong>Comisiones y fees</strong>
                    <small>Costo proyectado de plataformas y cobros digitales</small>
                  </div>
                  <span>{money.format(annualTotals.platformFees)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="business-panel-row">
          <div className="card movement-small-card">
            {MovementForm()}
          </div>
          <div className="card insight-card">
            <h3>Lectura CEO</h3>
            {insights.map((insight) => <p key={insight}>{insight}</p>)}
          </div>
        </div>
        <div className="bank-section">
          {BanksCard()}
        </div>
        <div className="card movement-detail-card">
          <div className="movement-detail-header">
            <div>
              <h3>Detalles de movimientos</h3>
              <p className="helper-copy">Consulta y descarga tus movimientos en Excel o PDF.</p>
            </div>
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

  function renderClients() {
    const stages = ["Lead frio", "Lead tibio", "Lead caliente", "Venta ganada"];
    const paidClients = clients.filter((client) => client.status === "Venta ganada");
    return (
      <section className="panel workspace-panel">
        <div className="section-title"><h2>Clientes</h2><p>{activeClients} en movimiento • {money.format(wonSalesTotal)} en ventas ganadas</p></div>
        <div className="clients-layout">
          <form className="card form-card section-form" onSubmit={addClient}>
            <h3>Agregar clienta</h3>
            <input placeholder="Nombre" value={clientForm.name} onChange={(event) => updateClientForm("name", event.target.value)} />
            <input placeholder="Servicio o producto" value={clientForm.service} onChange={(event) => updateClientForm("service", event.target.value)} />
            <select value={clientForm.status} onChange={(event) => updateClientForm("status", event.target.value)}>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select>
            <input placeholder="Proxima acción" value={clientForm.nextAction} onChange={(event) => updateClientForm("nextAction", event.target.value)} />
            <input placeholder="Monto" type="number" min="0" value={clientForm.amount} onChange={(event) => updateClientForm("amount", event.target.value)} />
            <button className="primary-button" type="submit">Guardar clienta</button>
          </form>
          <div className="pipeline-board">
            {stages.map((stage) => (
              <div className="pipeline-column" key={stage}>
                <h3>{stage}</h3>
                {clients.filter((client) => client.status === stage).map((client) => (
                  <div className="lead-card" key={client.id}>
                    <strong>{client.name}</strong>
                    <small>{client.service} • {money.format(client.amount)}</small>
                    <p>{client.nextAction || "Hacer seguimiento"}</p>
                    <div className="lead-actions">
                      {stages.map((nextStage) => <button type="button" key={nextStage} onClick={() => moveClientStatus(client.id, nextStage)}>{nextStage.replace("Lead ", "")}</button>)}
                      <button type="button" onClick={() => confirmDelete("¿Eliminar esta clienta?", () => setClients((current) => current.filter((c) => c.id !== client.id)))}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="paid-clients-section card">
          <div className="section-title compact-title"><h2>Seguimiento a clientas que ya pagaron</h2><p>Notas por persona para cuidar experiencia, recompra y referidos.</p></div>
          <div className="paid-client-grid">
            {paidClients.map((client) => (
              <article className="paid-client-card" key={client.id}>
                <div>
                  <strong>{client.name}</strong>
                  <small>{client.service} • {money.format(client.amount)}</small>
                </div>
                <textarea placeholder="Notas de seguimiento, entrega, resultados o próxima recompra..." value={client.notes || ""} onChange={(event) => updateClientNotes(client.id, event.target.value)} />
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function renderContent() {
    const unpublished = contentItems.filter((item) => item.status !== "Publicado").length;
    const recordMessage = publishedContent >= 3 ? "Estás on fire con tu consistencia de publicación." : publishedContent >= 1 ? "Vas tomando ritmo. El siguiente paso es sostenerlo una semana más." : "Empieza con una pieza simple que venda, no con perfección.";
    return (
      <section className="panel workspace-panel">
        <div className="section-title"><h2>Contenido</h2><p>{publishedContent} publicado • {contentItems.length} piezas en pipeline</p></div>
        <div className="section-layout">
          <form className="card form-card section-form" onSubmit={addContent}>
            <h3>Agregar contenido</h3>
            <input placeholder="Titulo del contenido" value={contentForm.title} onChange={(event) => updateContentForm("title", event.target.value)} />
            <input placeholder="Hook o primera frase" value={contentForm.hook} onChange={(event) => updateContentForm("hook", event.target.value)} />
            <select value={contentForm.format} onChange={(event) => updateContentForm("format", event.target.value)}><option>Reel</option><option>Historia</option><option>Post</option><option>Carrusel</option><option>Foto</option><option>Articulo</option><option>Episodio</option></select>
            <select value={contentForm.network} onChange={(event) => updateContentForm("network", event.target.value)}><option>Instagram</option><option>YouTube</option><option>Spotify</option><option>TikTok</option><option>Website</option><option>Otra</option></select>
            {contentForm.network === "Otra" && <input placeholder="Cual red social" value={contentForm.customNetwork} onChange={(event) => updateContentForm("customNetwork", event.target.value)} />}
            <select value={contentForm.week} onChange={(event) => updateContentForm("week", event.target.value)}><option>Semana 1</option><option>Semana 2</option><option>Semana 3</option><option>Semana 4</option></select>
            <select value={contentForm.status} onChange={(event) => updateContentForm("status", event.target.value)}><option>Por hacer</option><option>Guion hecho</option><option>Grabacion</option><option>Edicion</option><option>Programado</option><option>Publicado</option></select>
            <button className="primary-button" type="submit">Guardar contenido</button>
          </form>
          <div className="card data-card content-record"><h3>Record de publicación</h3><div className="record-grid"><MetricCard title="Publicado" value={publishedContent} change="piezas" tone="green" /><MetricCard title="Pendiente" value={unpublished} change="por mover" tone="orange" /></div><p>{recordMessage}</p></div>
          <div className="card data-card content-table"><h3>Tabla de contenido por semanas</h3>{["Semana 1", "Semana 2", "Semana 3", "Semana 4"].map((week) => <div className="content-week" key={week}><h4>{week}</h4>{contentItems.filter((item) => item.week === week).map((item) => <div className="content-row" key={item.id}><div><strong>{item.title}</strong><small>{item.hook || "Sin hook"} • {item.format} • {item.network}</small></div><select value={item.status} onChange={(event) => updateContentStatus(item.id, event.target.value)}><option>Por hacer</option><option>Guion hecho</option><option>Grabacion</option><option>Edicion</option><option>Programado</option><option>Publicado</option></select><button type="button" onClick={() => confirmDelete("¿Eliminar este contenido?", () => setContentItems((current) => current.filter((content) => content.id !== item.id)))}>Eliminar</button></div>)}</div>)}</div>
        </div>
      </section>
    );
  }

  function renderHome() {
    const homeProgress = homeTasks.length ? Math.round((completedHomeTasks / homeTasks.length) * 100) : 0;
    return (
      <section className="panel workspace-panel">
        <div className="section-title"><h2>Hogar</h2><p>{completedHomeTasks}/{homeTasks.length} tareas hechas para bajar carga mental</p></div>
        <div className="home-budget-card card">
          <div className="budget-head">
            <div><h3>Presupuesto mensual del hogar</h3><p>Ingresos, gastos, deudas y disponible familiar.</p></div>
            <div className="budget-total"><span>Disponible</span><strong>{money.format(homeAvailable)}</strong></div>
          </div>
          <form className="home-budget-form" onSubmit={addHomeBudgetItem}>
            <select value={homeBudgetForm.type} onChange={(event) => setHomeBudgetForm((current) => ({ ...current, type: event.target.value }))}><option>Ingreso</option><option>Gasto fijo</option><option>Gasto variable</option><option>Gasto hormiga</option><option>Deuda</option><option>Ahorro</option></select>
            <input placeholder="Descripcion" value={homeBudgetForm.description} onChange={(event) => setHomeBudgetForm((current) => ({ ...current, description: event.target.value }))} />
            <input type="number" min="0" placeholder="Monto" value={homeBudgetForm.amount} onChange={(event) => setHomeBudgetForm((current) => ({ ...current, amount: event.target.value }))} />
            <button className="primary-button" type="submit">Agregar</button>
          </form>
          <div className="home-money-insights">
            <article><span>Estás ganando</span><strong>{money.format(homeBudgetTotals.income)}</strong></article>
            <article><span>Estás gastando</span><strong>{money.format(homeSpent)}</strong></article>
            <article><span>Mayor fuga</span><strong>{biggestHomeLeak[0]}</strong><small>{money.format(biggestHomeLeak[1])}</small></article>
            <article><span>Fondo/ahorro</span><strong>{money.format(homeBudgetTotals.savings)}</strong><small>{homeBudgetTotals.savings > 0 ? "Excelente, estás construyendo paz financiera." : "Empieza con una reserva pequeña esta semana."}</small></article>
          </div>
          <div className="money-track">
            <span style={{ width: `${Math.min(100, homeBudgetTotals.income ? (homeSpent / homeBudgetTotals.income) * 100 : 0)}%` }}></span>
            <small>Track: gastado frente a ingresos del hogar</small>
          </div>
          <div className="budget-list">{homeBudget.map((item) => <DataRow key={item.id} title={item.description} meta={item.type} value={money.format(item.amount)} onDelete={() => setHomeBudget((current) => current.filter((row) => row.id !== item.id))} />)}</div>
        </div>
        <div className="section-layout">
          <form className="card form-card section-form" onSubmit={addHomeTask}>
            <h3>Agregar tarea del hogar</h3>
            <input placeholder="Tarea" value={homeForm.title} onChange={(event) => updateHomeForm("title", event.target.value)} />
            <select value={homeForm.category} onChange={(event) => updateHomeForm("category", event.target.value)}><option>Compras</option><option>Calendario</option><option>Rutina</option><option>Bienestar</option></select>
            <button className="primary-button" type="submit">Guardar tarea</button>
          </form>
          <div className="card data-card"><h3>Rutinas y pendientes</h3><div className="weekly-goal"><span>Progreso semanal del hogar</span><strong>{homeProgress}%</strong><Progress value={homeProgress} tone="green" /></div>{homeTasks.map((task) => <label className="home-row" key={task.id}><input type="checkbox" checked={task.done} onChange={() => toggleHomeTask(task.id)} /><span><strong>{task.title}</strong><small>{task.category}</small></span><button type="button" onClick={() => confirmDelete("¿Eliminar esta tarea?", () => setHomeTasks((current) => current.filter((item) => item.id !== task.id)))}>Eliminar</button></label>)}</div>
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
            <h3>🏗️ Sistemas</h3>
            <p className="helper-copy">No necesitas hacer más, necesitas repetir mejor.</p>
            <label className="purpose-field">
              <span>% de tareas repetibles sistematizadas</span>
              <input type="range" min="0" max="100" value={purpose.systemsPercent || 0} onChange={(e) => updatePurpose("systemsPercent", Number(e.target.value))} />
              <small>{purpose.systemsPercent || 0}% sistematizado</small>
            </label>
            <label className="purpose-field">
              <span>Micro-victoria de hoy</span>
              <input type="text" placeholder="Hoy me sentiré orgullosa de..." value={purpose.microVictory || ""} onChange={(e) => updatePurpose("microVictory", e.target.value)} />
            </label>
            <label className="task-row">
              <input type="checkbox" checked={!!purpose.victoryDone} onChange={(e) => updatePurpose("victoryDone", e.target.checked)} />
              <span>Ya hice mi mínimo indispensable</span>
            </label>
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
