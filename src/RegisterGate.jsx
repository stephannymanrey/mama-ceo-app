import React, { useState } from "react";
import { awsAuth } from "./lib/awsClient";
import "./RegisterGate.css";

// Mismas reglas de contraseña y traducciones de error que usa App.jsx —
// una sola fuente de verdad hubiera sido mejor, pero App.jsx las tiene
// dentro del componente (no exportadas) y este gate se usa en mini apps
// standalone (PlanBuilder, SilenceCutter) que no montan App.jsx. Si cambian
// las reglas allá, hay que replicarlas acá.
const getPasswordChecks = (pw) => [
  { key: "len",   label: "Mínimo 8 caracteres",   ok: pw.length >= 8 },
  { key: "upper", label: "Una letra mayúscula",    ok: /[A-Z]/.test(pw) },
  { key: "lower", label: "Una letra minúscula",    ok: /[a-z]/.test(pw) },
  { key: "num",   label: "Un número",              ok: /[0-9]/.test(pw) },
  { key: "sym",   label: "Un símbolo (ej: !@#$%)", ok: /[^A-Za-z0-9]/.test(pw) },
];

function translateAuthError(message) {
  const translations = {
    "Password did not conform with policy: Password not long enough": "La contraseña debe tener al menos 8 caracteres.",
    "Password did not conform with policy: Password must have uppercase characters": "La contraseña debe tener al menos una letra mayúscula.",
    "Password did not conform with policy: Password must have lowercase characters": "La contraseña debe tener al menos una letra minúscula.",
    "Password did not conform with policy: Password must have numeric characters": "La contraseña debe incluir al menos un número.",
    "Password did not conform with policy: Password must have symbol characters": "La contraseña debe incluir al menos un símbolo (ej: !@#$%).",
    "User already registered": "Ya existe una cuenta con este correo — inicia sesión en vez de crear una nueva.",
    "Unable to validate email address: invalid format": "Formato de correo electrónico inválido",
    "Email not confirmed": "Correo electrónico no confirmado",
    "Too many requests": "Demasiadas solicitudes, intenta más tarde",
    "Invalid email": "Correo electrónico inválido",
  };
  if (message?.toLowerCase().includes("rate limit exceeded")) {
    return "Límite de envío de correos excedido, espera unos minutos e intenta de nuevo";
  }
  if (message?.toLowerCase().includes("incorrect username or password")) {
    return "Correo o contraseña incorrectos.";
  }
  return translations[message] || message;
}

/**
 * Modal de "crea tu cuenta / inicia sesión" para mini apps standalone
 * (Business Plan, Editor de video, futuras) — se muestra en el momento de
 * conversión (descargar/exportar), no al entrar a la herramienta, para no
 * perder el efecto de lead magnet de "pruébalo antes de registrarte".
 *
 * onSuccess(user) se llama apenas hay sesión iniciada (signup+confirmación
 * o login directo) para que quien lo use continúe con la acción bloqueada.
 */
export default function RegisterGate({ title, subtitle, ctaLabel = "Crear cuenta y continuar", onSuccess, onClose }) {
  const [mode, setMode] = useState("signup"); // "signup" | "login"
  const [confirmMode, setConfirmMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!emailRegex.test(email)) { setError("Por favor ingresa un correo electrónico válido."); return; }

    if (mode === "signup") {
      const failed = getPasswordChecks(password).filter(c => !c.ok);
      if (failed.length > 0) { setError(`Tu contraseña necesita: ${failed.map(c => c.label.toLowerCase()).join(", ")}.`); return; }
      if (password !== passwordConfirm) { setError("Las contraseñas no coinciden."); return; }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { data, error: err } = await awsAuth.signInWithPassword({ email, password });
        if (err) setError(translateAuthError(err.message));
        else if (data?.user) onSuccess?.(data.user);
      } else {
        const { error: err } = await awsAuth.signUp({ email, password, options: { data: { full_name: name.trim(), whatsapp: whatsapp.trim() || null } } });
        if (err) setError(translateAuthError(err.message));
        else setConfirmMode(true);
      }
    } catch (err) {
      setError("Error de conexión. Verifica tu internet e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: err } = await awsAuth.confirmSignUp({ email, code });
      if (err) { setError(translateAuthError(err.message)); }
      else {
        const { data } = await awsAuth.signInWithPassword({ email, password });
        if (data?.user) onSuccess?.(data.user);
      }
    } catch {
      setError("Error al confirmar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rg-backdrop" onClick={onClose}>
      <div className="rg-modal" onClick={e => e.stopPropagation()}>
        <button className="rg-close" onClick={onClose} aria-label="Cerrar">×</button>

        {confirmMode ? (
          <form onSubmit={handleConfirm}>
            <h2 className="rg-title">Confirma tu correo</h2>
            <p className="rg-subtitle">Te enviamos un código a {email} — ingrésalo para activar tu cuenta.</p>
            <input className="rg-input" type="text" placeholder="Código de verificación" value={code}
              onChange={e => setCode(e.target.value)} required autoFocus />
            {error && <p className="rg-error">{error}</p>}
            <button className="rg-submit" type="submit" disabled={loading}>{loading ? "Confirmando..." : "Confirmar y continuar"}</button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="rg-title">{title || "Crea tu cuenta gratis"}</h2>
            <p className="rg-subtitle">{subtitle || "14 días de prueba gratis, sin tarjeta de crédito."}</p>

            <div className="rg-mode-tabs">
              <button type="button" className={mode === "signup" ? "rg-mode-tab active" : "rg-mode-tab"} onClick={() => { setMode("signup"); setError(""); }}>Crear cuenta</button>
              <button type="button" className={mode === "login" ? "rg-mode-tab active" : "rg-mode-tab"} onClick={() => { setMode("login"); setError(""); }}>Ya tengo cuenta</button>
            </div>

            {mode === "signup" && (
              <input className="rg-input" type="text" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} required />
            )}
            {mode === "signup" && (
              <input className="rg-input" type="tel" placeholder="WhatsApp con código de país (+57 300 000 0000)" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
            )}
            <input className="rg-input" type="email" placeholder="Tu correo electrónico" value={email} onChange={e => setEmail(e.target.value)} required />
            <input className="rg-input" type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
            {mode === "signup" && (
              <input className="rg-input" type="password" placeholder="Confirma tu contraseña" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} required />
            )}

            {error && <p className="rg-error">{error}</p>}
            <button className="rg-submit" type="submit" disabled={loading}>
              {loading ? "Un momento..." : mode === "signup" ? ctaLabel : "Iniciar sesión y continuar"}
            </button>
            {mode === "signup" && <p className="rg-trial-note">✨ 14 días gratis · Sin tarjeta de crédito</p>}
          </form>
        )}
      </div>
    </div>
  );
}
