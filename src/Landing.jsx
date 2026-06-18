import { useState } from "react";
import Logo from "./Logo";
import "./Landing.css";

const PLANS = [
  {
    id: "mama",
    name: "Mamá",
    emoji: "🏠",
    tagline: "Para empezar a organizar",
    features: [
      "Organización del hogar completa",
      "Calendario y citas familiares",
      "Presupuesto del hogar",
      "Check-in de bienestar diario",
      "Hasta 15 clientes",
      "Historial financiero básico",
    ],
    highlight: false,
  },
  {
    id: "emprendedora",
    name: "Emprendedora",
    emoji: "🚀",
    tagline: "El más popular",
    features: [
      "Todo lo del plan Mamá",
      "Hasta 50 clientes con pipeline",
      "100 movimientos financieros",
      "Studio de contenido con IA",
      "Metas y seguimiento de ventas",
      "Análisis Pareto de negocio",
    ],
    highlight: true,
  },
  {
    id: "ceo",
    name: "CEO",
    emoji: "👑",
    tagline: "Sin límites",
    features: [
      "Todo lo del plan Emprendedora",
      "Clientes y movimientos ilimitados",
      "Contenido ilimitado",
      "Guiones largos YouTube y Podcast",
      "Reproposición de contenido IA",
      "Acceso prioritario a novedades",
    ],
    highlight: false,
  },
];

const FAQS = [
  {
    q: "¿Necesito tarjeta de crédito para los 14 días gratis?",
    a: "No. Prueba Mamá CEO App completamente gratis durante 14 días sin ingresar ningún dato de pago. Solo cuando quieras continuar, eliges tu plan.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí, puedes cancelar tu suscripción en cualquier momento desde tu perfil, sin penalizaciones ni complicaciones.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Absolutamente. Usamos AWS con cifrado y autenticación segura, y tus datos nunca se comparten con terceros. Cumplimos con la Ley 1581 de 2012 de protección de datos de Colombia.",
  },
  {
    q: "¿Funciona para cualquier tipo de negocio?",
    a: "Sí. Mamá CEO App funciona para servicios, productos físicos, digitales, mentoría, ventas directas, tiendas online — cualquier negocio que una mamá emprendedora tenga.",
  },
  {
    q: "¿Puedo cambiar de plan después?",
    a: "Claro. Puedes subir o bajar de plan cuando lo necesites. Si cambias a uno mayor, empiezas a disfrutar los beneficios de inmediato.",
  },
];

export default function Landing({ onLogin, onSignup, onTerminos, onPrivacidad, prices, hotmartLinks, hotmartLinksYear }) {
  const [isYearly, setIsYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="landing">

      {/* ── NAVBAR ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Logo width={160} />
          <div className="landing-nav-actions">
            <button className="lbtn-ghost" onClick={onLogin}>Iniciar sesión</button>
            <button className="lbtn-primary" onClick={onSignup}>Prueba gratis</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="landing-hero">
        <div className="landing-hero-text">
          <span className="landing-badge">✨ 14 días gratis · Sin tarjeta de crédito</span>
          <h1 className="landing-h1">
            Tu negocio, hogar<br />y propósito.
            <span className="landing-h1-accent"> Todo en un solo lugar.</span>
          </h1>
          <p className="landing-hero-sub">
            Deja de sentirte abrumada. Mamá CEO App te ayuda a{" "}
            <strong>vender más, organizar tu hogar y cuidarte</strong> — sin perder el hilo de nada.
          </p>
          <div className="landing-hero-ctas">
            <button className="lbtn-hero" onClick={onSignup}>
              Empieza gratis — 14 días
            </button>
            <button className="lbtn-outline" onClick={() => scrollTo("precios")}>
              Ver planes ↓
            </button>
          </div>
          <p className="landing-hero-trust">Sin tarjeta de crédito · Cancela cuando quieras · Datos seguros</p>
        </div>
        <div className="landing-hero-visual">
          <div className="lhv-card">
            <div className="lhv-header">
              <span className="lhv-dot pink" /><span className="lhv-dot yellow" /><span className="lhv-dot green" />
              <span className="lhv-title">Dashboard Mamá CEO</span>
            </div>
            <div className="lhv-stats">
              <div className="lhv-stat">
                <span className="lhv-stat-label">💰 Ventas este mes</span>
                <span className="lhv-stat-val">$4.200.000</span>
              </div>
              <div className="lhv-stat">
                <span className="lhv-stat-label">🤝 Clientes activos</span>
                <span className="lhv-stat-val">12</span>
              </div>
              <div className="lhv-stat">
                <span className="lhv-stat-label">✅ Tus 3 de hoy</span>
                <span className="lhv-stat-val">1/3</span>
              </div>
            </div>
            <div className="lhv-pareto">
              🎯 Pareto: 3 clientes = 80% de tus ingresos
            </div>
            <div className="lhv-pills">
              <span className="lhv-pill">📅 Cita dentista 4pm</span>
              <span className="lhv-pill">🛒 Hacer mercado</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PARA QUIÉN ── */}
      <section className="landing-section landing-forwhom">
        <div className="landing-container">
          <h2 className="landing-h2">¿Esto es para ti?</h2>
          <p className="landing-section-sub">Si te identificas con alguna de estas situaciones, Mamá CEO App es lo que necesitas.</p>
          <div className="landing-fw-grid">
            {[
              { emoji: "👩‍👧‍👦", text: "Eres mamá y emprendedora, y sientes que en ninguno de los dos roles lo estás haciendo completamente bien." },
              { emoji: "📱", text: "Manejas tu negocio desde el teléfono entre las actividades de los niños, el hogar y las mil cosas del día." },
              { emoji: "💸", text: "No sabes exactamente cuánto estás ganando ni en qué se fue el dinero a fin de mes." },
              { emoji: "🔥", text: "Tienes un millón de tareas pendientes pero no sabes por cuál empezar hoy." },
              { emoji: "📊", text: "Sabes que deberías publicar más contenido pero no tienes ni el tiempo ni las ideas." },
              { emoji: "😮‍💨", text: "Llegas a la noche agotada con la sensación de que corriste todo el día pero no avanzaste nada importante." },
            ].map((item, i) => (
              <div key={i} className="landing-fw-card">
                <span className="landing-fw-emoji">{item.emoji}</span>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="landing-section landing-features" id="funciones">
        <div className="landing-container">
          <h2 className="landing-h2">Todo lo que necesitas, en un solo lugar</h2>
          <p className="landing-section-sub">Diseñado especialmente para la mamá emprendedora: sin complejidad, sin apps dispersas.</p>

          <div className="landing-feat-block">
            <div className="landing-feat-label">Para tu negocio 💼</div>
            <div className="landing-feat-grid">
              {[
                {
                  icon: "💰",
                  title: "Finanzas claras",
                  desc: "Registra ingresos y gastos, sigue tus metas de venta y entiende el flujo de tu negocio de un vistazo.",
                },
                {
                  icon: "🤝",
                  title: "Pipeline de clientes",
                  desc: "Sabe exactamente quién está lista para comprar, quién está tibia y a quién debes contactar hoy.",
                },
                {
                  icon: "✍️",
                  title: "Studio de contenido IA",
                  desc: "Genera guiones para Reels, YouTube, Podcast, posts y correos con IA en segundos. Sin bloqueo creativo.",
                },
              ].map((f, i) => (
                <div key={i} className="landing-feat-card">
                  <span className="landing-feat-icon">{f.icon}</span>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-feat-block">
            <div className="landing-feat-label">Para tu hogar 🏠</div>
            <div className="landing-feat-grid">
              {[
                {
                  icon: "🛒",
                  title: "Organización del hogar",
                  desc: "Lista de compras, tareas del hogar y presupuesto familiar todo en un solo panel claro.",
                },
                {
                  icon: "📅",
                  title: "Calendario familiar",
                  desc: "Citas médicas, actividades de tus hijos, recordatorios — todo organizado para que no se te escape nada.",
                },
                {
                  icon: "🌿",
                  title: "Tu bienestar",
                  desc: "Check-in emocional diario, temporizador Pomodoro y seguimiento de tus metas personales.",
                },
              ].map((f, i) => (
                <div key={i} className="landing-feat-card">
                  <span className="landing-feat-icon">{f.icon}</span>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TRANSFORMACIÓN ── */}
      <section className="landing-section landing-transform">
        <div className="landing-container">
          <h2 className="landing-h2">Lo que cambia cuando usas Mamá CEO</h2>
          <p className="landing-section-sub">Resultados reales que experimentan las mamás emprendedoras que toman el control.</p>
          <div className="landing-transform-grid">
            {[
              { before: "No sabes cuánto ganaste este mes", after: "Ves tus ingresos, gastos y meta en tiempo real" },
              { before: "Olvidas hacer seguimiento a clientes potenciales", after: "Tu pipeline te dice quién necesita atención hoy" },
              { before: "Publicas contenido sin estrategia ni constancia", after: "El Studio IA genera tu guión en 30 segundos" },
              { before: "El hogar y el negocio se mezclan en tu cabeza", after: "Cada área tiene su espacio: todo separado y claro" },
              { before: "No sabes qué priorizar cada día", after: "Tu Pareto te dice qué 3 cosas importan hoy" },
              { before: "Terminas el día agotada sin claridad de avance", after: "Claridad, enfoque y progreso visible cada día" },
            ].map((t, i) => (
              <div key={i} className="landing-transform-card">
                <div className="ltc-before">
                  <span className="ltc-label">Antes</span>
                  <p>{t.before}</p>
                </div>
                <span className="ltc-arrow">→</span>
                <div className="ltc-after">
                  <span className="ltc-label">Con Mamá CEO</span>
                  <p>{t.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="landing-section landing-pricing" id="precios">
        <div className="landing-container">
          <h2 className="landing-h2">Elige tu plan</h2>
          <p className="landing-section-sub">Empieza con 14 días gratis. Sin tarjeta de crédito. Cancela cuando quieras.</p>

          <div className="landing-toggle">
            <button
              className={`ltoggle-btn${!isYearly ? " active" : ""}`}
              onClick={() => setIsYearly(false)}
            >
              Mensual
            </button>
            <button
              className={`ltoggle-btn${isYearly ? " active" : ""}`}
              onClick={() => setIsYearly(true)}
            >
              Anual <span className="ltoggle-save">2 meses gratis</span>
            </button>
          </div>

          <div className="landing-plans-grid">
            {PLANS.map((plan) => {
              const p = prices[plan.id];
              const priceLabel = isYearly ? p.copYear : p.cop;
              const usdLabel = isYearly ? p.usdYear : p.usd;
              const link = isYearly ? hotmartLinksYear[plan.id] : hotmartLinks[plan.id];
              return (
                <div key={plan.id} className={`landing-plan-card${plan.highlight ? " landing-plan-featured" : ""}`}>
                  {plan.highlight && <div className="landing-plan-badge">⭐ Más popular</div>}
                  <div className="landing-plan-header">
                    <span className="landing-plan-emoji">{plan.emoji}</span>
                    <h3 className="landing-plan-name">{plan.name}</h3>
                    <p className="landing-plan-tagline">{plan.tagline}</p>
                  </div>
                  <div className="landing-plan-price">
                    <span className="lpp-amount">{priceLabel}</span>
                    <span className="lpp-period">COP / {isYearly ? "año" : "mes"}</span>
                    <span className="lpp-usd">({usdLabel} USD)</span>
                  </div>
                  <ul className="landing-plan-features">
                    {plan.features.map((f, i) => (
                      <li key={i}>
                        <span className="lplan-check">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`landing-plan-btn${plan.highlight ? " featured" : ""}`}
                    onClick={() => window.open(link, "_blank")}
                  >
                    Empezar ahora
                  </button>
                  <p className="landing-plan-trial">✨ 14 días gratis incluidos</p>
                </div>
              );
            })}
          </div>

          <p className="landing-pricing-note">
            ¿Prefieres explorar primero?{" "}
            <button className="landing-link-btn" onClick={onSignup}>
              Crea tu cuenta gratuita aquí
            </button>{" "}
            y accede a todos los planes desde la app.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="landing-section landing-faq">
        <div className="landing-container landing-container--narrow">
          <h2 className="landing-h2">Preguntas frecuentes</h2>
          <div className="landing-faq-list">
            {FAQS.map((faq, i) => (
              <div key={i} className={`landing-faq-item${openFaq === i ? " open" : ""}`}>
                <button
                  className="landing-faq-q"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>{faq.q}</span>
                  <span className="landing-faq-icon">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && <p className="landing-faq-a">{faq.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="landing-final-cta">
        <div className="landing-container">
          <h2>¿Lista para ser la CEO de tu vida?</h2>
          <p>Únete hoy y empieza a organizar tu negocio y tu hogar — gratis por 14 días.</p>
          <button className="lbtn-hero" onClick={onSignup}>
            Crear cuenta gratis — 14 días
          </button>
          <p className="landing-cta-note">Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <Logo width={130} />
          <p className="landing-footer-tagline">Tu negocio, hogar y propósito. Todo en un solo lugar.</p>
          <div className="landing-footer-links">
            <button className="landing-link-btn" onClick={onTerminos}>Términos y Condiciones</button>
            <span>·</span>
            <button className="landing-link-btn" onClick={onPrivacidad}>Política de Privacidad</button>
          </div>
          <p className="landing-footer-copy">© 2026 UMP S.A.S · hola@umpacademy.co</p>
        </div>
      </footer>

    </div>
  );
}
