import { useEffect, useMemo, useState } from "react";
import InvoicingTool from "./InvoicingTool";
import Logo from "../../Logo";
import { getAwsAuthToken } from "../../lib/awsClient";
import { getUserData } from "../../lib/userDataClient";
import { planMeetsMinimum, toolMinPlan, planLabel } from "../../lib/planGating";
import "../../SilenceCutter.css"; // reutiliza las clases sc-page/sc-btn-primary del "shell" de herramientas independientes

const CURRENCY_LOCALES = { USD: "en-US", COP: "es-CO", MXN: "es-MX", EUR: "de-DE" };

// Misma lógica que effectivePlan en App.jsx, simplificada (ver StudioStandalone.jsx).
function computeEffectivePlan(userPlan, premiumExpiresAt) {
  if (userPlan === "ceo" || userPlan === "emprendedora" || userPlan === "mama") {
    if (premiumExpiresAt && Date.now() > premiumExpiresAt) return "free";
    return userPlan;
  }
  if (userPlan === "premium") {
    if (premiumExpiresAt && Date.now() > premiumExpiresAt) return "free";
    return "ceo";
  }
  return "free";
}

/**
 * Monta Facturas como página independiente en /facturas, sin cargar App.jsx.
 * Solo LEE clients/currency/profileSetup una vez al montar (para precargar
 * el selector de clientas y el membrete de los documentos) — nunca escribe
 * de vuelta el estado del dashboard. Los documentos en sí ya viven en su
 * propia tabla/Lambda (mamaceo-invoicing), independiente desde el día uno.
 */
export default function InvoicingStandalone() {
  const [status, setStatus] = useState("loading"); // loading|needsAuth|locked|ready
  const [clients, setClients] = useState([]);
  const [currency, setCurrency] = useState("USD");
  const [profileSetup, setProfileSetup] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getAwsAuthToken();
      if (!token) { if (!cancelled) setStatus("needsAuth"); return; }
      const data = await getUserData();
      if (cancelled) return;
      const effectivePlan = computeEffectivePlan(data?.userPlan, data?.premiumExpiresAt);
      if (!planMeetsMinimum(effectivePlan, toolMinPlan("invoicing"))) { setStatus("locked"); return; }
      setClients(data?.clients || []);
      setCurrency(data?.currency || "USD");
      setProfileSetup(data?.profileSetup || null);
      setStatus("ready");
    })();
    return () => { cancelled = true; };
  }, []);

  const money = useMemo(() => new Intl.NumberFormat(CURRENCY_LOCALES[currency] || "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }), [currency]);

  if (status === "loading") {
    return (
      <div className="sc-page sc-page--center">
        <Logo width={100} />
        <p style={{ marginTop: 16, color: "#666" }}>Cargando Facturas...</p>
      </div>
    );
  }

  if (status === "needsAuth") {
    return (
      <div className="sc-page sc-page--center">
        <Logo width={100} />
        <h2 style={{ marginTop: 16 }}>Inicia sesión para usar Facturas</h2>
        <p style={{ color: "#666", maxWidth: 420, textAlign: "center" }}>
          Tus facturas y cotizaciones se guardan en tu cuenta — necesitas iniciar sesión.
        </p>
        <a className="sc-btn-primary" href="/" style={{ marginTop: 12 }}>Iniciar sesión / Crear cuenta →</a>
      </div>
    );
  }

  if (status === "locked") {
    return (
      <div className="sc-page sc-page--center">
        <Logo width={100} />
        <h2 style={{ marginTop: 16 }}>Facturas es parte del plan {planLabel(toolMinPlan("invoicing"))}</h2>
        <p style={{ color: "#666", maxWidth: 420, textAlign: "center" }}>
          Actualiza tu plan desde el dashboard para crear facturas y cotizaciones.
        </p>
        <a className="sc-btn-primary" href="/" style={{ marginTop: 12 }}>Ver planes →</a>
      </div>
    );
  }

  return (
    <InvoicingTool
      onBack={() => { window.location.href = "/"; }}
      clients={clients}
      currency={currency}
      money={money}
      profileSetup={profileSetup}
    />
  );
}
