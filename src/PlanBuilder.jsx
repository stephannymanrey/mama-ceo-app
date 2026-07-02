import React, { useState, useRef } from "react";
import Logo from "./Logo";
import "./PlanBuilder.css";

const API_URL = "https://p5ftnawyxe.execute-api.us-east-1.amazonaws.com/default/mamaceo-gemini";

const PREGUNTAS = [
  {
    id: "historia",
    pregunta: "¿Cuál es tu historia?",
    sub: "¿Qué te llevó a querer emprender? ¿Qué momento de tu vida te hizo decir 'necesito cambiar algo'?",
    placeholder: "Cuéntame desde el corazón, no tiene que ser perfecto...",
  },
  {
    id: "habilidades",
    pregunta: "¿Qué sabes hacer?",
    sub: "Piensa en todo lo que has aprendido en tu vida, trabajo, estudios o como mamá. No te limites.",
    placeholder: "Ej: sé cocinar, enseñar, organizar, diseñar, comunicarme bien con la gente...",
  },
  {
    id: "pasion",
    pregunta: "¿Qué te gusta hacer?",
    sub: "¿De qué podrías hablar horas? ¿Qué actividades te hacen olvidar el tiempo?",
    placeholder: "Ej: me encanta enseñar a otras mujeres, el bienestar, la cocina saludable...",
  },
  {
    id: "problemas",
    pregunta: "¿Qué problemas puedes resolver?",
    sub: "¿A quién ayudas? ¿Qué dolor o necesidad sabes atender con lo que sabes y te gusta?",
    placeholder: "Ej: ayudo a mamás a organizarse, a aprender a vender online, a cocinar sano sin tiempo...",
  },
  {
    id: "experiencia",
    pregunta: "¿Qué experiencia tienes?",
    sub: "Trabajo anterior, estudios, cursos, proyectos, crianza — todo cuenta.",
    placeholder: "Ej: 5 años en administración, cursos de marketing digital, 3 años como emprendedora...",
  },
  {
    id: "tiempo",
    pregunta: "¿Cuánto tiempo puedes dedicar a tu negocio?",
    sub: "Sé honesta — un negocio construido sobre tu realidad funciona mejor.",
    placeholder: "Ej: 2 horas diarias en la mañana mientras los niños están en el colegio...",
  },
  {
    id: "ingresos",
    pregunta: "¿Cuánto necesitas generar?",
    sub: "¿Cuál es tu meta de ingresos mensuales? ¿Para qué necesitas ese dinero?",
    placeholder: "Ej: necesito $1.500 USD mensuales para cubrir mis gastos y empezar a ahorrar...",
  },
  {
    id: "estiloVida",
    pregunta: "¿Qué estilo de vida quieres construir?",
    sub: "Imagina tu vida ideal en 3 años. ¿Cómo se ve? ¿Cómo te sientes?",
    placeholder: "Ej: quiero trabajar desde casa, estar presente con mis hijos, viajar en familia...",
  },
];

const SECCIONES_PLAN = [
  { key: "resumenEjecutivo",       num: "01", titulo: "Resumen Ejecutivo" },
  { key: "problema",               num: "02", titulo: "El Problema" },
  { key: "solucion",               num: "03", titulo: "La Solución" },
  { key: "mercado",                num: "04", titulo: "Mercado Objetivo" },
  { key: "modeloNegocio",          num: "05", titulo: "Modelo de Negocio" },
  { key: "ventajaCompetitiva",     num: "06", titulo: "Ventaja Competitiva" },
  { key: "estrategiaCrecimiento",  num: "07", titulo: "Estrategia de Crecimiento" },
  { key: "impacto",                num: "08", titulo: "Impacto Social" },
  { key: "proyeccionesFinancieras",num: "09", titulo: "Proyecciones Financieras" },
  { key: "usoRecursos",            num: "10", titulo: "Uso de Recursos" },
];

function renderValor(v) {
  if (!v) return null;
  if (typeof v === "string") return <p className="pb-sec-text">{v}</p>;
  if (Array.isArray(v)) return (
    <ul className="pb-list">
      {v.map((item, i) => <li key={i}>{typeof item === "string" ? item : JSON.stringify(item)}</li>)}
    </ul>
  );
  return (
    <div className="pb-subsections">
      {Object.entries(v).map(([k, val]) => (
        <div key={k} className="pb-subsec">
          <h4 className="pb-subsec-title">{k}</h4>
          {renderValor(val)}
        </div>
      ))}
    </div>
  );
}

export default function PlanBuilder() {
  const [fase, setFase]         = useState("intro");
  const [paso, setPaso]         = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [email, setEmail]       = useState("");
  const [nombre, setNombre]     = useState("");
  const [plan, setPlan]         = useState(null);
  const [error, setError]       = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const resultRef = useRef(null);

  const pregunta = PREGUNTAS[paso];
  const total    = PREGUNTAS.length;
  const progreso = Math.round((paso / total) * 100);

  const siguiente = () => {
    if (!respuestas[pregunta.id]?.trim()) return;
    if (paso < total - 1) setPaso(p => p + 1);
    else setFase("email");
  };

  const anterior = () => {
    if (paso > 0) setPaso(p => p - 1);
    else setFase("intro");
  };

  const generarPlan = async () => {
    const emailClean = email.trim().toLowerCase();
    if (!emailClean || !emailClean.includes("@")) {
      setError("Por favor ingresa un correo válido.");
      return;
    }
    setError("");
    setFase("generating");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "planNegocio",
          publicEmail: emailClean,
          context: { nombre: nombre.trim(), ...respuestas },
        }),
      });
      const data = await res.json();

      if (data.error === "ya_generado") {
        setPlan(data.plan);
        setFase("result");
        return;
      }
      if (data.error === "limite_diario") {
        setError("El cupo de planes gratuitos de hoy está lleno. Vuelve mañana o crea tu cuenta para acceso ilimitado.");
        setFase("email");
        return;
      }
      if (data.error === "limite_email") {
        setError("Ya generaste un plan con este correo. Revisa tu bandeja de entrada o usa otro correo.");
        setFase("email");
        return;
      }
      if (data.error) {
        setError("Algo salió mal. Intenta de nuevo en unos segundos.");
        setFase("email");
        return;
      }

      if (!data.result) {
        setError("La generación tardó demasiado. Intenta de nuevo en unos segundos.");
        setFase("email");
        return;
      }

      setPlan(data.result);
      setEmailSent(data.emailSent || false);
      setFase("result");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setFase("email");
    }
  };

  // ── INTRO ──────────────────────────────────────────────────────
  if (fase === "intro") return (
    <div className="pb-page">
      <div className="pb-hero">
        <nav className="pb-nav">
          <Logo width={110} />
          <a href="/" className="pb-nav-link">Ir a la app →</a>
        </nav>
        <div className="pb-hero-body">
          <span className="pb-badge">100% gratis · Sin tarjeta de crédito</span>
          <h1 className="pb-h1">Tu plan de negocio,<br />hecho para tu realidad</h1>
          <p className="pb-hero-sub">
            Responde 8 preguntas sobre ti y tu idea — la IA construye un plan de negocio profesional de 15 a 25 páginas, claro, realista y listo para convocatorias, inversionistas o simplemente para arrancar con dirección.
          </p>
          <div className="pb-features">
            {[
              "Adaptado a tu historia y habilidades reales",
              "Listo para convocatorias de capital semilla",
              "Con proyecciones financieras y modelo de ingresos",
              "Te llega por correo y puedes guardarlo en tu cuenta",
            ].map(f => (
              <div key={f} className="pb-feature-row">
                <span className="pb-check">✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
          <button className="pb-btn-primary" onClick={() => setFase("form")}>
            Construir mi plan gratis →
          </button>
          <p className="pb-hero-note">Toma entre 10 y 15 minutos. Solo 8 preguntas.</p>
        </div>
      </div>
    </div>
  );

  // ── FORMULARIO ─────────────────────────────────────────────────
  if (fase === "form") return (
    <div className="pb-page pb-page--form">
      <div className="pb-form-wrap">
        <div className="pb-form-topbar">
          <button className="pb-back-btn" onClick={anterior}>
            ← {paso === 0 ? "Inicio" : "Anterior"}
          </button>
          <span className="pb-paso-badge">{paso + 1} / {total}</span>
        </div>

        <div className="pb-progress-bg">
          <div className="pb-progress-fill" style={{ width: `${progreso}%` }} />
        </div>

        <div className="pb-question-wrap">
          <p className="pb-q-num">Pregunta {paso + 1}</p>
          <h2 className="pb-q-title">{pregunta.pregunta}</h2>
          <p className="pb-q-sub">{pregunta.sub}</p>
          <textarea
            className="pb-textarea"
            rows={5}
            placeholder={pregunta.placeholder}
            value={respuestas[pregunta.id] || ""}
            onChange={e => setRespuestas(r => ({ ...r, [pregunta.id]: e.target.value }))}
            autoFocus
          />
          <button
            className="pb-btn-primary"
            onClick={siguiente}
            disabled={!respuestas[pregunta.id]?.trim()}
          >
            {paso < total - 1 ? "Siguiente →" : "Continuar → ingresar correo"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── EMAIL ──────────────────────────────────────────────────────
  if (fase === "email") return (
    <div className="pb-page pb-page--form">
      <div className="pb-form-wrap">
        <button className="pb-back-btn" onClick={() => { setPaso(total - 1); setFase("form"); }}>
          ← Volver
        </button>

        <div className="pb-email-card">
          <div className="pb-email-icon">🎉</div>
          <h2 className="pb-email-title">¡Todo listo para generar tu plan!</h2>
          <p className="pb-email-sub">
            Ingresa tu correo y te enviamos el plan completo. También lo verás aquí en pantalla para descargarlo como PDF.
          </p>

          <input
            className="pb-input"
            type="text"
            placeholder="Tu nombre (opcional)"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
          />
          <input
            className="pb-input"
            type="email"
            placeholder="Tu correo electrónico *"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && generarPlan()}
          />
          {error && <p className="pb-error">{error}</p>}
          <button
            className="pb-btn-primary"
            onClick={generarPlan}
            disabled={!email.trim()}
          >
            ✨ Generar mi plan de negocio
          </button>
          <p className="pb-privacy-note">
            Sin spam. Solo tu plan y recursos útiles para mamás emprendedoras.
          </p>
        </div>
      </div>
    </div>
  );

  // ── GENERANDO ──────────────────────────────────────────────────
  if (fase === "generating") return (
    <div className="pb-page pb-page--center">
      <div className="pb-generating">
        <div className="pb-gen-rings">
          <div className="pb-gen-ring pb-gen-ring--1" />
          <div className="pb-gen-ring pb-gen-ring--2" />
          <div className="pb-gen-ring pb-gen-ring--3" />
          <span className="pb-gen-icon">📋</span>
        </div>
        <h2 className="pb-gen-title">Construyendo tu plan de negocio...</h2>
        <div className="pb-gen-steps">
          {[
            "Analizando tu historia y habilidades",
            "Identificando tu mercado y cliente ideal",
            "Definiendo tu modelo de ingresos",
            "Calculando proyecciones financieras",
            "Redactando plan completo",
          ].map((s, i) => (
            <div key={i} className="pb-gen-step" style={{ animationDelay: `${i * 0.6}s` }}>
              <span className="pb-gen-dot" />
              <span>{s}</span>
            </div>
          ))}
        </div>
        <p className="pb-gen-note">Puede tomar hasta 60 segundos. No cierres esta ventana.</p>
      </div>
    </div>
  );

  // ── RESULTADO ──────────────────────────────────────────────────
  if (fase === "result" && plan) return (
    <div className="pb-page" ref={resultRef}>
      {/* Header — solo pantalla */}
      <div className="pb-result-header no-print">
        <nav className="pb-nav">
          <Logo width={110} />
          <a href="/" className="pb-nav-link">Crear mi cuenta gratis →</a>
        </nav>
        <div className="pb-result-top">
          <div>
            <span className="pb-badge">Plan de Negocio · Generado con IA</span>
            {emailSent && (
              <p className="pb-email-sent">✓ Te lo enviamos a <strong>{email}</strong></p>
            )}
          </div>
          <button className="pb-btn-outline" onClick={() => window.print()}>
            ⬇ Descargar PDF
          </button>
        </div>
      </div>

      <div className="pb-plan-wrap">
        {/* Portada — solo en PDF */}
        <div className="pb-cover print-only">
          <div className="pb-cover-brand">Mamá CEO · mamaceoapp.co</div>
          <h1 className="pb-cover-title">{plan.nombreNegocio || "Plan de Negocio"}</h1>
          {nombre && <p className="pb-cover-autor">Preparado para: {nombre}</p>}
          <p className="pb-cover-date">
            {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Título en pantalla */}
        <h1 className="pb-plan-title no-print">{plan.nombreNegocio || "Tu Plan de Negocio"}</h1>

        {/* Secciones */}
        {SECCIONES_PLAN.map(({ key, num, titulo }) =>
          plan[key] ? (
            <div key={key} className="pb-sec">
              <div className="pb-sec-header">
                <span className="pb-sec-num">{num}</span>
                <h2 className="pb-sec-title">{titulo}</h2>
              </div>
              <div className="pb-sec-body">{renderValor(plan[key])}</div>
            </div>
          ) : null
        )}

        {/* CTA final — solo pantalla */}
        <div className="pb-final-cta no-print">
          <h3 className="pb-final-title">¿Quieres llevar tu negocio al siguiente nivel?</h3>
          <p className="pb-final-sub">
            Crea tu cuenta en Mamá CEO y gestiona clientes, finanzas, contenido y tu plan — todo en un solo lugar, diseñado para mamás emprendedoras.
          </p>
          <a className="pb-btn-primary" href="/">Crear mi cuenta gratis →</a>
        </div>
      </div>
    </div>
  );

  return null;
}
