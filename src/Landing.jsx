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

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

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
              <div className="lhv-section-label">Dashboard</div>
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
                <div className="lhv-stat">
                  <span className="lhv-stat-ico">🎯</span>
                  <div>
                    <div className="lhv-stat-label">Meta del mes</div>
                    <div className="lhv-stat-val">84%</div>
                  </div>
                </div>
              </div>
              <div className="lhv-pareto">
                <span className="lhv-pareto-ico">📊</span>
                <span>3 clientes generan el <strong>80%</strong> de tus ingresos</span>
              </div>
              <div className="lhv-tus3-label">Tus 3 de hoy</div>
              <div className="lhv-tasks">
                <div className="lhv-task done">✓ Enviar propuesta a Carolina</div>
                <div className="lhv-task">○ Publicar Reel de ventas</div>
                <div className="lhv-task">○ Revisar presupuesto semanal</div>
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
              <span className="lstat-num">6</span>
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
                { icon: "💰", title: "Finanzas claras", desc: "Registra ingresos y gastos, sigue tus metas de venta y entiende el flujo de tu negocio de un vistazo." },
                { icon: "🤝", title: "Pipeline de clientes", desc: "Sabe exactamente quién está lista para comprar, quién está tibia y a quién debes contactar hoy." },
                { icon: "✍️", title: "Studio de contenido IA", desc: "Genera guiones para Reels, YouTube, Podcast, posts y correos con IA en segundos. Sin bloqueo creativo." },
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
                { icon: "🛒", title: "Organización del hogar", desc: "Lista de compras, tareas del hogar y presupuesto familiar todo en un solo panel claro." },
                { icon: "📅", title: "Calendario familiar", desc: "Citas médicas, actividades de tus hijos, recordatorios — todo organizado para que no se te escape nada." },
                { icon: "🌿", title: "Tu bienestar", desc: "Check-in emocional diario, temporizador Pomodoro y seguimiento de tus metas personales." },
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
            <button className="landing-link-btn" onClick={onSignup}>Crea tu cuenta gratuita aquí</button>{" "}
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

      {/* ── TENLA SIEMPRE A MANO ── */}
      <section className="landing-section landing-pwa">
        <div className="landing-container">
          <span className="landing-badge">📲 Sin descargas · Sin tienda de apps</span>
          <h2 className="landing-h2" style={{marginTop:"12px"}}>Tenla siempre a mano</h2>
          <p className="landing-section-sub">
            Agrégala a tu pantalla de inicio en segundos y ábrela como cualquier app — sin buscar en el navegador cada vez.
          </p>

          {/* iOS + Safari → solo tarjeta iPhone */}
          {isSafariIOS && (
            <div className="landing-pwa-card lpwa-solo">
              <div className="lpwa-detected">¡Estás en iPhone! Aquí te explicamos cómo hacerlo 👇</div>
              <div className="lpwa-steps-visual">
                {[
                  { n:"1", icon:"⬆️", text: <span>Toca el ícono de <strong>Compartir</strong> en la barra inferior de Safari <em>(el cuadrado con flechita)</em></span> },
                  { n:"2", icon:"➕", text: <span>Selecciona <strong>"Agregar a pantalla de inicio"</strong></span> },
                  { n:"3", icon:"✅", text: <span>Toca <strong>"Agregar"</strong> — ¡listo! Ya aparece en tu pantalla</span> },
                ].map(s => (
                  <div key={s.n} className="lpwa-vstep">
                    <span className="lpwa-num">{s.n}</span>
                    <span className="lpwa-vstep-ico">{s.icon}</span>
                    <span className="lpwa-vstep-txt">{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* iOS + Chrome → pide abrir en Safari */}
          {isChromeIOS && (
            <div className="landing-pwa-card lpwa-solo">
              <div className="lpwa-detected">Estás en iPhone 🍎</div>
              <p className="lpwa-chrome-msg">Para agregarla a tu pantalla de inicio, necesitas abrirla en <strong>Safari</strong>. Copia el enlace y pégalo allí:</p>
              <button className="lpwa-copy-btn" onClick={copyLink}>
                {urlCopied ? "✅ Enlace copiado" : "📋 Copiar enlace para Safari"}
              </button>
            </div>
          )}

          {/* Android → solo tarjeta Android */}
          {isAndroid && (
            <div className="landing-pwa-card lpwa-solo">
              <div className="lpwa-detected">¡Estás en Android! Aquí te explicamos cómo hacerlo 👇</div>
              <div className="lpwa-steps-visual">
                {[
                  { n:"1", icon:"⋮", text: <span>Toca los <strong>3 puntos</strong> en la esquina superior derecha de Chrome</span> },
                  { n:"2", icon:"➕", text: <span>Selecciona <strong>"Agregar a pantalla de inicio"</strong></span> },
                  { n:"3", icon:"✅", text: <span>Confirma — ¡ya aparece en tu pantalla!</span> },
                ].map(s => (
                  <div key={s.n} className="lpwa-vstep">
                    <span className="lpwa-num">{s.n}</span>
                    <span className="lpwa-vstep-ico">{s.icon}</span>
                    <span className="lpwa-vstep-txt">{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Desktop → muestra las dos opciones */}
          {!isMobileKnown && (
            <div className="landing-pwa-grid">
              <div className="landing-pwa-card">
                <div className="lpwa-os-icon">🍎</div>
                <h3 className="lpwa-title">En iPhone</h3>
                <p className="lpwa-sub-note">Ábrela en Safari (no Chrome)</p>
                <ol className="lpwa-steps">
                  <li><span className="lpwa-num">1</span><span>Toca el ícono <strong>Compartir ⬆️</strong> en la barra de Safari</span></li>
                  <li><span className="lpwa-num">2</span><span>Selecciona <strong>"Agregar a pantalla de inicio"</strong></span></li>
                  <li><span className="lpwa-num">3</span><span>Toca <strong>Agregar</strong> — ¡lista!</span></li>
                </ol>
              </div>
              <div className="landing-pwa-card">
                <div className="lpwa-os-icon">🤖</div>
                <h3 className="lpwa-title">En Android</h3>
                <p className="lpwa-sub-note">Ábrela en Chrome</p>
                <ol className="lpwa-steps">
                  <li><span className="lpwa-num">1</span><span>Toca los <strong>3 puntos ⋮</strong> arriba a la derecha</span></li>
                  <li><span className="lpwa-num">2</span><span>Selecciona <strong>"Agregar a pantalla de inicio"</strong></span></li>
                  <li><span className="lpwa-num">3</span><span>Confirma — ¡lista!</span></li>
                </ol>
              </div>
            </div>
          )}

          <div className="lpwa-footer-note">
            Se abre directamente — como si la hubieras descargado de la tienda. Sin buscar, sin navegador. ✨
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="landing-final-cta">
        <div className="landing-container landing-final-cta-inner">
          <h2>¿Lista para ser la CEO de tu vida?</h2>
          <p>Únete hoy y empieza a organizar tu negocio y tu hogar — gratis por 14 días.</p>
          <button className="lbtn-cta-white" onClick={onSignup}>
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
          <p className="landing-footer-copy">Hecho por Una mamá con propósito® · Todos los derechos reservados UMP S.A.S 2026</p>
        </div>
      </footer>

    </div>
  );
}
