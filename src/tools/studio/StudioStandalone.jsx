import { useEffect, useState } from "react";
import Studio from "../../Studio";
import Logo from "../../Logo";
import { getAwsAuthToken } from "../../lib/awsClient";
import { callGemini } from "../../lib/callGemini";
import { getUserData, saveUserField } from "../../lib/userDataClient";
import { planMeetsMinimum, toolMinPlan, planLabel } from "../../lib/planGating";
import "../../SilenceCutter.css"; // reutiliza las clases sc-page/sc-btn-primary del "shell" de herramientas independientes

// Misma lógica que effectivePlan en App.jsx, simplificada: acá solo se usa
// para copys/UX (qué límites mostrar). El plan real siempre se vuelve a
// verificar del lado del servidor antes de cualquier generación con IA.
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
 * Monta Studio como página independiente en /studio, SIN cargar App.jsx (y por
 * lo tanto sin tocar ni arriesgar el resto del estado de negocio/hogar de la
 * usuaria — ver la discusión sobre por qué /editor y /plan-de-negocio ya
 * funcionan así). Studio lee/guarda solo su propio campo (`brandProfile`) vía
 * actualización parcial, nunca el estado completo del dashboard.
 *
 * "Agregar a mi contenido" desde acá queda deshabilitado a propósito (Studio
 * ya maneja `onAddToContent`/`onUpdateContentGuion` ausentes sin romperse):
 * mover el tablero de contenido completo a este modo standalone es un cambio
 * más grande, pendiente para una siguiente iteración.
 */
export default function StudioStandalone() {
  const [status, setStatus] = useState("loading"); // loading|needsAuth|locked|ready|error
  const [brandProfile, setBrandProfile] = useState({});
  const [plan, setPlan] = useState("free");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getAwsAuthToken();
      if (!token) { if (!cancelled) setStatus("needsAuth"); return; }
      const data = await getUserData();
      if (cancelled) return;
      const effectivePlan = computeEffectivePlan(data?.userPlan, data?.premiumExpiresAt);
      if (!planMeetsMinimum(effectivePlan, toolMinPlan("studio"))) { setStatus("locked"); return; }
      setBrandProfile(data?.brandProfile || {});
      setPlan(effectivePlan);
      setStatus("ready");
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSaveBrandProfile = async (next) => {
    setBrandProfile(next); // optimista — Studio ya refleja el cambio de inmediato
    const res = await saveUserField("brandProfile", next);
    if (res?.error) console.error("[StudioStandalone] no se pudo guardar brandProfile:", res.error);
  };

  if (status === "loading") {
    return (
      <div className="sc-page sc-page--center">
        <Logo width={100} />
        <p style={{ marginTop: 16, color: "#666" }}>Cargando Studio...</p>
      </div>
    );
  }

  if (status === "needsAuth") {
    return (
      <div className="sc-page sc-page--center">
        <Logo width={100} />
        <h2 style={{ marginTop: 16 }}>Inicia sesión para usar Studio</h2>
        <p style={{ color: "#666", maxWidth: 420, textAlign: "center" }}>
          Studio genera contenido con IA y guarda tu perfil de marca — necesitas una cuenta.
        </p>
        <a className="sc-btn-primary" href="/" style={{ marginTop: 12 }}>Iniciar sesión / Crear cuenta →</a>
      </div>
    );
  }

  if (status === "locked") {
    return (
      <div className="sc-page sc-page--center">
        <Logo width={100} />
        <h2 style={{ marginTop: 16 }}>Studio es parte del plan {planLabel(toolMinPlan("studio"))}</h2>
        <p style={{ color: "#666", maxWidth: 420, textAlign: "center" }}>
          Actualiza tu plan desde el dashboard para generar contenido con IA en Studio.
        </p>
        <a className="sc-btn-primary" href="/" style={{ marginTop: 12 }}>Ver planes →</a>
      </div>
    );
  }

  return (
    <Studio
      onBack={() => { window.location.href = "/"; }}
      brandProfile={brandProfile}
      onSaveBrandProfile={handleSaveBrandProfile}
      callGemini={callGemini}
      plan={plan}
      contentBoard={
        <div style={{ padding: 32, textAlign: "center", color: "#666" }}>
          Tu tablero completo de contenido vive en el dashboard.{" "}
          <a href="/" target="_blank" rel="noopener noreferrer">Ábrelo aquí →</a>
        </div>
      }
    />
  );
}
