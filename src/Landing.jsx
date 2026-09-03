import { useState, useEffect, useRef } from "react";
import Logo from "./Logo";
import "./Landing.css";
import { trackEvent } from "./analytics";

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
      "Hasta 15 clientes con pipeline",
      "30 movimientos financieros al mes",
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
      "100 movimientos financieros al mes",
      "Studio IA: guiones, hooks e ideas",
      "Radar de Clientas — seguimiento con IA",
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
      "200 generaciones de IA al mes",
      "Guiones largos YouTube y Podcast",
      "Editor de video SilenceCutter",
      "Reproposición de contenido con IA",
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
    a: "Absolutamente. Tus datos se almacenan con cifrado y autenticación segura, y nunca se comparten con terceros. Cumplimos con la Ley 1581 de 2012 de protección de datos de Colombia.",
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
  const [imgError, setImgError] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach((k) => {
      const v = params.get(k);
      if (v) sessionStorage.setItem(k, v);
    });
  }, []);

  const pricingRef = useRef(null);
  useEffect(() => {
    const el = document.getElementById("precios");
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { trackEvent("scroll_pricing"); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS      = /iPad|iPhone|iPod/.test(ua);
  const isAndroid  = /Android/.test(ua);
  const isChromeIOS = isIOS && /CriOS/.test(ua);
  const isSafariIOS = isIOS && !isChromeIOS;
  const isMobileKnown = isIOS || isAndroid;

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 3000);
    });
  };

  return (
    <div className="landing">

      {/* ── NAVBAR ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Logo width={150} />
          <div className="landing-nav-actions">
            <button className="lbtn-ghost" onClick={onLogin}>Iniciar sesión</button>
            <button className="lbtn-primary" onClick={() => { trackEvent("cta_click", { location: "navbar" }); onSignup(); }}>Prueba gratis</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="landing-hero">
        <div className="landing-hero-text">
          <span className="landing-badge">✨ 14 días gratis · Sin tarjeta de crédito</span>
          <h1 className="landing-h1">
            Organiza tu casa<br />y tu negocio
            <span className="landing-h1-accent"> en un solo lugar.</span>
          </h1>
          <p className="landing-hero-sub">
            Deja de sentirte abrumada entre el hogar y el negocio. Mamá CEO App te ayuda a{" "}
            <strong>organizar tu casa, vender más y cuidarte</strong> — todo desde el teléfono, sin perder el hilo de nada.
          </p>
          <div className="landing-hero-ctas">
            <button className="lbtn-hero" onClick={() => { trackEvent("cta_click", { location: "hero" }); scrollTo("registro"); }}>
              Empieza gratis — 14 días
            </button>
          </div>
          <p className="landing-hero-trust">Sin tarjeta de crédito · Cancela cuando quieras · Datos seguros</p>
        </div>

        {/* VISUAL HERO
            Cuando tengas una captura real del dashboard, reemplaza todo el bloque
            .lhv-mockup por:
              <img src="./screenshot-hero.png" alt="Dashboard Mamá CEO" className="lhv-screenshot" />
            y guarda la imagen en public/screenshot-hero.png
        */}
        <div className="landing-hero-visual">
          {!imgError ? (
            <img
              src="./screenshot-hero.png"
              alt="Dashboard Mamá CEO"
              className="lhv-screenshot"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="lhv-mockup">
              <div className="lhv-phone-bar">
                <span className="lhv-dot pink" />
                <span className="lhv-dot yellow" />
                <span className="lhv-dot green" />
                <span className="lhv-phone-title">Mamá CEO</span>
              </div>

              <div className="lhv-section-label">🏠 Mi hogar</div>
              <div className="lhv-tasks">
                <div className="lhv-task done">✓ Pagar servicios del mes</div>
                <div className="lhv-task done">✓ Cita pediatra — martes 10am</div>
                <div className="lhv-task">○ Lista de mercado semanal</div>
                <div className="lhv-task">○ Uniforme escolar de Samuel</div>
              </div>

              <div className="lhv-section-label" style={{ marginTop: 10 }}>💰 Mi negocio</div>
              <div className="lhv-stats">
                <div className="lhv-stat">
                  <span className="lhv-stat-ico">💰</span>
                  <div>
                    <div className="lhv-stat-label">Ventas este mes</div>
                    <div className="lhv-stat-val">$4.200.000</div>
                  </div>
                </div>
                <div className="lhv-stat">
                  <span className="lhv-stat-ico">🤝</span>
                  <div>
                    <div className="lhv-stat-label">Clientes activos</div>
                    <div className="lhv-stat-val">12</div>
                  </div>
                </div>
              </div>

              <div className="lhv-pareto">
                <span className="lhv-pareto-ico">✨</span>
                <span>Todo en un solo lugar — sin apps dispersas</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div className="landing-stats-bar">
        <div className="landing-container">
          <div className="landing-stats-inner">
            <div className="lstat-item">
              <span className="lstat-num">7</span>
              <span className="lstat-label">herramientas en 1 app</span>
            </div>
            <div className="lstat-divider" />
            <div className="lstat-item">
              <span className="lstat-num">14</span>
              <span className="lstat-label">días gratis sin límites</span>
            </div>
            <div className="lstat-divider" />
            <div className="lstat-item">
              <span className="lstat-num">3</span>
              <span className="lstat-label">planes para cada etapa</span>
            </div>
            <div className="lstat-divider" />
            <div className="lstat-item">
              <span className="lstat-num">📱</span>
              <span className="lstat-label">funciona como app nativa</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── PARA QUIÉN ── */}
      <section className="landing-section landing-forwhom">
        <div className="landing-container">
          <h2 className="landing-h2">¿Esto es para ti?</h2>
          <p className="landing-section-sub">Si te identificas con alguna de estas situaciones, Mamá CEO App es lo que necesitas.</p>
          <div className="landing-fw-grid">
            {[
              { emoji: "🏠", text: "Tu casa nunca está del todo organizada — las tareas del hogar, el mercado y los compromisos de los niños viven en tu cabeza o en chats dispersos." },
              { emoji: "📅", text: "La cita del pediatra, la reunión del colegio, el pago del recibo — todo lo manejas de memoria y con miedo a olvidar algo importante." },
              { emoji: "👩‍👧‍👦", text: "Eres mamá y emprendedora, y sientes que en ninguno de los dos roles lo estás haciendo completamente bien." },
              { emoji: "💸", text: "No sabes exactamente cuánto estás ganando ni en qué se fue el dinero a fin de mes — en el hogar ni en el negocio." },
              { emoji: "🔥", text: "Tienes un millón de tareas pendientes entre la casa y el trabajo pero no sabes por cuál empezar hoy." },
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
            <div className="landing-feat-label">Para tu hogar 🏠</div>
            <div className="landing-feat-grid">
              {[
                { icon: "🛒", title: "Todo el hogar organizado", desc: "Lista de compras, tareas del hogar, presupuesto familiar y recordatorios — todo en un panel claro para que no se te escape nada." },
                { icon: "📅", title: "Calendario familiar", desc: "Citas médicas, actividades de tus hijos, compromisos del hogar — organizados en un solo lugar para toda la familia." },
                { icon: "🌿", title: "Tu bienestar", desc: "Check-in emocional diario, temporizador Pomodoro y seguimiento de tus metas personales. Porque tú también importas." },
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
            <div className="landing-feat-label">Y también para tu negocio 💼</div>
            <div className="landing-feat-grid">
              {[
                { icon: "💰", title: "Finanzas claras", desc: "Registra ingresos y gastos, sigue tus metas de venta y entiende el flujo de tu negocio de un vistazo." },
                { icon: "🤝", title: "Radar de Clientas IA", desc: "Tu pipeline prioriza quién necesita atención hoy y te sugiere el mensaje exacto de WhatsApp para retomar el contacto — con IA." },
                { icon: "✍️", title: "Studio de contenido IA", desc: "Guiones para Reels, YouTube y Podcast, hooks que detienen el scroll, ideas por categoría y lead magnets — todo con IA en segundos." },
                { icon: "🎬", title: "Editor de video SilenceCutter", desc: "Sube tu video y elimina los silencios automáticamente. Edita en la línea de tiempo, corta con precisión y exporta listo para publicar." },
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
          <p className="landing-section-sub">Deja de improvisar cada día. Con Mamá CEO tienes claridad, enfoque y control.</p>
          <div className="landing-transform-grid">
            {[
              { before: "El hogar y el negocio se mezclan en tu cabeza todo el día", after: "Cada área tiene su espacio — todo separado, todo claro" },
              { before: "No sabes cuánto ganaste este mes ni en qué se fue el dinero", after: "Ves tus ingresos y gastos del hogar y negocio en tiempo real" },
              { before: "Olvidas hacer seguimiento a clientas y pierdes ventas", after: "Tu pipeline con IA te dice quién necesita atención hoy" },
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
            <button className={`ltoggle-btn${!isYearly ? " active" : ""}`} onClick={() => setIsYearly(false)}>
              Mensual
            </button>
            <button className={`ltoggle-btn${isYearly ? " active" : ""}`} onClick={() => setIsYearly(true)}>
              Anual <span className="ltoggle-save">2 meses gratis</span>
            </button>
          </div>

          <div className="landing-plans-grid">
            {PLANS.map((plan) => {
              const p = prices[plan.id];
              const priceLabel = isYearly ? p.copYear : p.cop;
              const usdLabel   = isYearly ? p.usdYear : p.usd;
              const link       = isYearly ? hotmartLinksYear[plan.id] : hotmartLinks[plan.id];
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
                      <li key={i}><span className="lplan-check">✓</span>{f}</li>
                    ))}
                  </ul>
                  <button
                    className={`landing-plan-btn${plan.highlight ? " featured" : ""}`}
                    onClick={() => { trackEvent("cta_click", { location: "pricing", plan: plan.id }); scrollTo("registro"); }}
                  >
                    Probar gratis — 14 días
                  </button>
                  <p className="landing-plan-trial">Sin tarjeta · Elige tu plan al terminar</p>
                </div>
              );
            })}
          </div>

          <p className="landing-pricing-note">
            ¿Ya tienes cuenta?{" "}
            <button className="landing-link-btn" onClick={onLogin}>Inicia sesión aquí</button>
            {" "}y actualiza tu plan desde la app cuando estés lista.
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
                <button className="landing-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <span className="landing-faq-icon">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && <p className="landing-faq-a">{faq.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REGISTRO ── */}
      <section className="landing-final-cta" id="registro">
        <div className="landing-container landing-final-cta-inner">
          <h2>Empieza gratis hoy — 14 días sin tarjeta</h2>
          <p>Ingresa tu correo y en menos de 2 minutos tienes tu cuenta lista.</p>
          <form
            className="landing-registro-form"
            onSubmit={(e) => { e.preventDefault(); trackEvent("cta_click", { location: "registro_form" }); onSignup(); }}
          >
            <input
              className="landing-registro-input"
              type="email"
              placeholder="tucorreo@gmail.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
            />
            <button type="submit" className="lbtn-cta-white">
              Crear cuenta gratis →
            </button>
          </form>
          <p className="landing-cta-note">Sin tarjeta de crédito · Cancela cuando quieras · Datos seguros</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <Logo width={130} />
          <p className="landing-footer-tagline">Organiza tu casa y tu negocio. Todo en un solo lugar.</p>
          <div className="landing-footer-links">
            <button className="landing-link-btn" onClick={onTerminos}>Términos y Condiciones</button>
            <span>·</span>
            <button className="landing-link-btn" onClick={onPrivacidad}>Política de Privacidad</button>
          </div>
          <p className="landing-footer-copy">Hecho por Una mamá con propósito® · Todos los derechos reservados UMP S.A.S 2026</p>
        </div>
      </footer>

    </div>
  );
}
