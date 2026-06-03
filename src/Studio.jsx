import { useState, useEffect } from "react";
import "./Studio.css";

const STUDIO_KEY = "mama-ceo-studio-v1";
function loadStudio() {
  try { return JSON.parse(localStorage.getItem(STUDIO_KEY)) || {}; } catch { return {}; }
}
function saveStudio(data) {
  try { localStorage.setItem(STUDIO_KEY, JSON.stringify(data)); } catch {}
}

const TABS = [
  { id: "mensaje",  icon: "✦",  label: "Mensaje"    },
  { id: "ideas",    icon: "💡", label: "Ideas"       },
  { id: "lead",     icon: "🎁", label: "Lead Magnet" },
  { id: "hooks",    icon: "🪝", label: "Hooks"       },
  { id: "guion",    icon: "🎬", label: "Guión"       },
  { id: "email",    icon: "📧", label: "Email"       },
];

// ── MENSAJE ────────────────────────────────────────────────────
function MensajeTab({ saved, onSave }) {
  const [view, setView] = useState("inicio"); // inicio | wizard | descubrir | results
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState("fwd");
  const [desc, setDesc] = useState({ consejo: "", resultado: "", queja: "", audiencia: "", servicio: "No lo sé aún" });
  const [mision, setMision] = useState(null);
  const [mp, setMp] = useState({ cliente: "", problema: "", tiempo: "", producto: "" });
  const [mpResult, setMpResult] = useState(null);
  const [epText, setEpText] = useState("");
  const [copiado, setCopiado] = useState("");

  const copiar = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiado(key);
    setTimeout(() => setCopiado(""), 2000);
  };

  const PASOS = [
    { field: "cliente",  emoji: "👩‍💼", pregunta: "¿A quién ayudas?",                hint: "Piensa en la persona a quien más le cambiarías la vida.",                    placeholder: "mamás emprendedoras con hijos pequeños",  ejemplo: "Ej: mujeres que venden desde casa, coaches que empiezan, mamás online" },
    { field: "problema", emoji: "🎯",  pregunta: "¿Qué resultado logran contigo?", hint: "No el problema — el resultado positivo que quieren conseguir.",                placeholder: "vender más sin descuidar su familia",     ejemplo: "Ej: organizar su negocio, conseguir sus primeras clientas, escalar online" },
    { field: "tiempo",   emoji: "⏱️", pregunta: "¿En cuánto tiempo lo logran?",   hint: "Un tiempo específico genera más confianza que uno vago.",                      placeholder: "8 semanas",                               ejemplo: "Ej: 30 días, 3 meses, 6 semanas, 90 días" },
    { field: "producto", emoji: "✨",  pregunta: "¿Con qué lo logran?",            hint: "Tu servicio, programa, método o herramienta de acompañamiento.",               placeholder: "mi programa CEO en Casa",                 ejemplo: "Ej: mi mentoría, mi curso online, mis consultorías 1:1" },
  ];

  const goNext = () => {
    const val = mp[PASOS[step].field];
    if (!val?.trim()) return;
    if (step < 3) { setDir("fwd"); setStep(s => s + 1); }
    else {
      const result = buildMPMResult(mp);
      const pitch = `Ofrezco ${mp.producto} para ${mp.cliente}. Trabajo específicamente con ${mp.cliente}, ayudándoles a ${mp.problema}. Lo logramos en ${mp.tiempo} con acompañamiento cercano y estratégico. Si eso resuena contigo, me encantaría que conversáramos.`;
      setMpResult(result); setEpText(pitch); setView("results");
    }
  };

  const goBack = () => {
    if (step > 0) { setDir("bwd"); setStep(s => s - 1); }
    else setView("inicio");
  };

  const resetWizard = () => {
    setMp({ cliente: "", problema: "", tiempo: "", producto: "" });
    setStep(0); setDir("fwd"); setMpResult(null); setEpText(""); setView("wizard");
  };

  // ── DESCUBRIMIENTO ────────────────────────────────────────────
  const limpiarConsejo = (texto) => {
    return texto.trim()
      .replace(/^me piden (consejo|ayuda|apoyo)( sobre| en| con| acerca de)?/i, "")
      .replace(/^(siempre |la gente |todos |mis amigas |mis conocidas )?me (preguntan|buscan|consultan)( sobre| por| en)?/i, "")
      .trim()
      .replace(/^(sobre|en|con|acerca de|para)\s+/i, "")
      .trim();
  };

  const limpiarAudiencia = (texto) => {
    return texto.trim().replace(/^(a\s+)/i, "").trim();
  };

  const transformarDeseo = (queja) => {
    let q = queja.trim();
    // "que no saben X" → "aprender X"
    if (/^que no saben?/i.test(q)) return q.replace(/^que no saben?\s*/i, "aprender a ");
    // "no saben X" → "aprender a X"
    if (/^no saben?\s/i.test(q)) return q.replace(/^no saben?\s*/i, "aprender a ");
    // "no tengo X" → "tener X"
    if (/^no tengo\s/i.test(q)) return q.replace(/^no tengo\s*/i, "tener ");
    // "no puedo X" → "poder X"
    if (/^no puedo\s/i.test(q)) return q.replace(/^no puedo\s*/i, "poder ");
    // "no sé X" → "aprender X"
    if (/^no sé\s/i.test(q)) return q.replace(/^no sé\s*/i, "aprender a ");
    // "me falta X" → "conseguir X"
    if (/^me falta\s/i.test(q)) return q.replace(/^me falta\s*/i, "conseguir ");
    // "que no tienen X" → "tener X"
    if (/^que no tienen?\s/i.test(q)) return q.replace(/^que no tienen?\s*/i, "tener ");
    // "siento que X" → remove filler
    if (/^siento que\s/i.test(q)) return q.replace(/^siento que\s*/i, "");
    return q;
  };

  const generarMision = () => {
    const { consejo, resultado, queja, audiencia, servicio } = desc;
    if (!consejo.trim() || !queja.trim()) return;

    const habilidad = limpiarConsejo(consejo);
    const clientaProb = limpiarAudiencia(audiencia) || "mamás emprendedoras que están comenzando";
    const deseo = transformarDeseo(queja);

    // Zona de genialidad
    const zonaGenialidad = resultado.trim()
      ? `Tu fuerte es ${habilidad}. Ya lo has demostrado: ${resultado.trim()}.`
      : `Tu fuerte natural es ${habilidad} — ese es tu punto de partida.`;

    // Producto sugerido
    const PRODUCTOS = {
      "Mentoría / coaching 1:1": "mi mentoría personalizada",
      "Programa o curso":        "mi programa paso a paso",
      "Taller o masterclass":    "mi taller práctico",
      "Comunidad":               "mi comunidad de apoyo",
      "Consultoría":             "mis consultorías",
      "Venta de productos":      "mis productos",
    };
    const productoSug = PRODUCTOS[servicio] || "mi acompañamiento";

    const mpmBorrador = `Ayudo a ${clientaProb} a ${deseo} con ${productoSug}`;

    setMision({
      zonaGenialidad,
      clientaProb,
      problemaTexto: deseo,
      productoSug,
      mpmBorrador,
      sugerencias: { cliente: clientaProb, problema: deseo, tiempo: "", producto: productoSug },
    });
  };

  const usarEnMPM = () => {
    if (!mision) return;
    setMp({ ...mision.sugerencias });
    setStep(0); setDir("fwd"); setView("wizard");
  };

  // ── MENSAJE PERFECTO ──────────────────────────────────────────
  const buildMPMResult = ({ cliente, problema, tiempo, producto }) => ({
    completo:      `Ayudo a ${cliente} que quieren ${problema} en ${tiempo} con ${producto}`,
    bio_ig:        `Ayudo a ${cliente} a ${problema} ✨\n📍 ${producto} | Resultados en ${tiempo}`,
    bio_linkedin:  `Especialista en ${problema} para ${cliente}. A través de ${producto}, acompaño a mis clientas a transformar su negocio en ${tiempo}.`,
    dm:            `Hola! 👋 Trabajo con ${cliente} y mi especialidad es ayudarles a ${problema}. Lo logramos en ${tiempo} con ${producto}. ¿Te gustaría saber cómo podría funcionar para ti?`,
    historia:      `¿Eres ${cliente}? 👇\nSi quieres ${problema} en ${tiempo}, tengo algo para ti.\nEs ${producto} y ya está ayudando a muchas como tú.\n¡Respóndeme aquí! 💌`,
    story_corta:   `${cliente} → ${problema} en ${tiempo} ✨`,
    presencial:    `Hola, trabajo con ${cliente} ayudándoles a ${problema}, y lo logramos en ${tiempo} a través de ${producto}. ¿Es algo que estás buscando?`,
    video_intro:   `Si eres ${cliente} y quieres ${problema}… este video es para ti.`,
    pagina_ventas: `¿Lista para ${problema}?\nAyudo a ${cliente} a lograrlo en ${tiempo} con ${producto}.`,
    email_intro:   `Hola [nombre],\n\nMe contacto porque trabajo con ${cliente} — específicamente ayudándoles a ${problema}.\n\nA través de ${producto}, hemos logrado esos resultados en tan solo ${tiempo}.\n\n¿Tienes 15 minutos para conversar?\n\n[Tu nombre]`,
    whatsapp_bio:  `${producto} para ${cliente} 📲 | ${problema} en ${tiempo}`,
    evento:        `Me llamo [tu nombre] y acompaño a ${cliente} a ${problema} en ${tiempo}, a través de ${producto}. Si eso te resuena, con gusto te cuento más.`,
  });


  const usarMensajeGuardado = (m) => {
    if (!m.campos) return;
    const campos = m.campos;
    setMp({ ...campos });
    setMpResult(buildMPMResult(campos));
    setEpText(`Ofrezco ${campos.producto} para ${campos.cliente}. Trabajo específicamente con ${campos.cliente}, ayudándoles a ${campos.problema}. Lo logramos en ${campos.tiempo} con acompañamiento cercano y estratégico. Si eso resuena contigo, me encantaría que conversáramos.`);
    setView("results");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const elevatorDesdeBanco = (m) => {
    const campos = m.campos || {};
    if (campos.cliente && campos.problema) {
      setMp({ ...campos });
      setMpResult(buildMPMResult(campos));
      setEpText(`Ofrezco ${campos.producto || "mi servicio"} para ${campos.cliente}. Trabajo específicamente con ${campos.cliente}, ayudándoles a ${campos.problema}. Lo logramos en ${campos.tiempo || "poco tiempo"} con acompañamiento cercano y estratégico. Si eso resuena contigo, me encantaría que conversáramos.`);
    } else {
      setEpText(m.texto || "");
    }
    setView("results");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const VARIACIONES = [
    { key: "bio_ig",       label: "📌 Bio de Instagram" },
    { key: "bio_linkedin", label: "💼 Bio de LinkedIn" },
    { key: "dm",           label: "💬 DM / WhatsApp" },
    { key: "historia",     label: "📸 Historia de IG" },
    { key: "story_corta",  label: "⚡ Story ultra-corta" },
    { key: "presencial",   label: "🤝 Networking presencial" },
    { key: "video_intro",  label: "🎬 Intro de video" },
    { key: "pagina_ventas",label: "🛒 Página de ventas" },
    { key: "email_intro",  label: "📩 Email de presentación" },
    { key: "whatsapp_bio", label: "📲 Bio de WhatsApp Business" },
    { key: "evento",       label: "🎤 Presentación en evento" },
  ];


  return (
    <div className="studio-tab-content">

      {/* ── INICIO ─────────────────────────────────── */}
      {view === "inicio" && (
        <div className="mpm-landing">
          <div className="mpm-landing-header">
            <div className="mpm-landing-badge">✦</div>
            <h2 className="mpm-landing-title">Tu Mensaje Perfecto de Marketing</h2>
            <p className="mpm-landing-sub">El mensaje que hace que tu clienta ideal diga "¡Eso es exactamente lo que necesito!"</p>
          </div>
          <div className="mpm-cards-row">
            <button className="mpm-card" onClick={() => setView("descubrir")}>
              <div className="mpm-card-top">
                <span className="mpm-card-emoji">🗺️</span>
                <span className="mpm-card-tag">Exploración</span>
              </div>
              <strong className="mpm-card-name">Descubrir mi mensaje</strong>
              <p className="mpm-card-desc">No sé aún a quién ayudo ni qué ofrezco — quiero encontrar mi punto de partida</p>
              <span className="mpm-card-link">Comenzar →</span>
            </button>
            <button className="mpm-card mpm-card--highlight" onClick={() => setView("wizard")}>
              <div className="mpm-card-top">
                <span className="mpm-card-badge-ico">✦</span>
                <span className="mpm-card-tag mpm-card-tag--primary">4 pasos</span>
              </div>
              <strong className="mpm-card-name">Crear mi MPM</strong>
              <p className="mpm-card-desc">Ya sé a quién ayudo y quiero construir mi mensaje con 12 variaciones listas</p>
              <span className="mpm-card-link mpm-card-link--primary">Empezar →</span>
            </button>
          </div>
        </div>
      )}

      {/* ── WIZARD ──────────────────────────────────── */}
      {view === "wizard" && (
        <div className="mpm-wizard-card">
          <div className="mpm-wizard-nav">
            <button className="mpm-wizard-back-btn" onClick={goBack}>← {step === 0 ? "Inicio" : "Anterior"}</button>
            <div className="mpm-dots">
              {PASOS.map((_, i) => <div key={i} className={`mpm-dot ${i === step ? "active" : i < step ? "done" : ""}`} />)}
            </div>
            <span className="mpm-step-count">{step + 1} / 4</span>
          </div>

          <div key={step} className={`mpm-step-content anim-${dir}`}>
            <div className="mpm-step-emoji">{PASOS[step].emoji}</div>
            <h2 className="mpm-step-pregunta">{PASOS[step].pregunta}</h2>
            <p className="mpm-step-hint">{PASOS[step].hint}</p>
            <input
              className="mpm-step-input"
              placeholder={PASOS[step].placeholder}
              value={mp[PASOS[step].field]}
              onChange={e => setMp(p => ({ ...p, [PASOS[step].field]: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && mp[PASOS[step].field]?.trim() && goNext()}
              autoFocus
            />
            <p className="mpm-step-ejemplo">{PASOS[step].ejemplo}</p>
          </div>

          <button className="mpm-step-btn" onClick={goNext} disabled={!mp[PASOS[step].field]?.trim()}>
            {step < 3 ? "Siguiente →" : "¡Generar mi mensaje! ✦"}
          </button>
        </div>
      )}

      {/* ── DESCUBRIMIENTO ──────────────────────────── */}
      {view === "descubrir" && (
        <div className="desc-wrap">
          <div className="desc-header">
            <button className="mpm-wizard-back-btn" onClick={() => setView("inicio")}>← Inicio</button>
            <h2 className="desc-title">Descubre tu punto de partida</h2>
            <p className="desc-subtitle">Responde desde lo que sabes hoy — no hay respuestas incorrectas. Esto es solo tu punto de partida.</p>
          </div>

          <div className="desc-questions">
            {[
              { num:"01", emoji:"💡", label:"¿Con qué te piden consejo o ayuda más frecuentemente?",        field:"consejo",   placeholder:"organizar el tiempo, vender por WhatsApp, criar con calma...", hint:"Piensa en lo que tus amigas o conocidas te preguntan más." },
              { num:"02", emoji:"🌟", label:"¿Qué resultado concreto has logrado — para alguien o para ti?",field:"resultado", placeholder:"ayudé a una amiga a conseguir sus primeras clientas...",           hint:"No necesita ser perfecto. Un resultado pequeño también cuenta." },
              { num:"03", emoji:"🎯", label:"¿Cuál es la queja o dolor que más escuchas a tu alrededor?",   field:"queja",     placeholder:"no tengo tiempo, no sé cómo cobrar lo que valgo...",            hint:"La frustración más repetida entre mujeres de tu círculo." },
              { num:"04", emoji:"👩‍💼", label:"¿A qué tipo de mujer te imaginas ayudando?",                  field:"audiencia", placeholder:"mamás que quieren emprender, mujeres que venden desde casa...", hint:"Puede ser amplio — lo afinarás más adelante." },
            ].map(q => (
              <div className={`desc-q-card${desc[q.field] ? " filled" : ""}`} key={q.field}>
                <div className="desc-q-num">{q.num}</div>
                <div className="desc-q-body">
                  <div className="desc-q-top">
                    <span className="desc-q-emoji">{q.emoji}</span>
                    <label className="desc-q-label">{q.label}</label>
                  </div>
                  <input className="desc-q-input" placeholder={q.placeholder} value={desc[q.field]} onChange={e => setDesc(p => ({...p, [q.field]: e.target.value}))} />
                  <span className="desc-q-hint">{q.hint}</span>
                </div>
              </div>
            ))}

            <div className={`desc-q-card${desc.servicio !== "No lo sé aún" ? " filled" : ""}`}>
              <div className="desc-q-num">05</div>
              <div className="desc-q-body">
                <div className="desc-q-top">
                  <span className="desc-q-emoji">✨</span>
                  <label className="desc-q-label">¿Tienes idea del servicio que quieres ofrecer?</label>
                </div>
                <div className="desc-pills">
                  {["No lo sé aún","Mentoría / coaching 1:1","Programa o curso","Taller o masterclass","Comunidad","Consultoría","Venta de productos"].map(s => (
                    <button key={s} className={`desc-pill${desc.servicio === s ? " active" : ""}`} onClick={() => setDesc(p => ({...p, servicio: s}))}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button className="mpm-step-btn" onClick={generarMision} disabled={!desc.consejo.trim() || !desc.queja.trim()}>
            Ver mi mapa de negocio ✦
          </button>

          {mision && (
            <div className="desc-result-section">
              <div className="desc-result-nota">✦ Este es tu punto de partida. No necesita ser perfecto — solo necesitas empezar.</div>
              <div className="desc-result-grid">
                <div className="desc-rc"><div className="desc-rc-ico">💎</div><strong>Tu zona de genialidad</strong><p>{mision.zonaGenialidad}</p></div>
                <div className="desc-rc"><div className="desc-rc-ico">👩‍💼</div><strong>Tu clienta probable</strong><p>{mision.clientaProb}</p></div>
                <div className="desc-rc"><div className="desc-rc-ico">🎯</div><strong>El problema que resuelves</strong><p>{mision.problemaTexto}</p></div>
                <div className="desc-rc desc-rc--highlight">
                  <div className="desc-rc-ico">✦</div>
                  <strong>Tu primer MPM borrador</strong>
                  <p className="desc-mpm-text">{mision.mpmBorrador}</p>
                  <button className="studio-copy-btn small" onClick={() => copiar(mision.mpmBorrador, "mpm-borrador")}>{copiado === "mpm-borrador" ? "¡Copiado!" : "Copiar borrador"}</button>
                </div>
              </div>

              <div className="desc-ajusta">
                <div className="desc-ajusta-label">Ajusta y luego genera tus 12 variaciones</div>
                <p className="studio-helper" style={{margin:"0 0 14px"}}>Edita lo que no te convenza — esto es tuyo para moldearlo.</p>
                <div className="desc-ajusta-grid">
                  <div className="desc-ajusta-field"><label>Ayudo a...</label><input value={mision.sugerencias.cliente} onChange={e => setMision(p => ({...p, sugerencias: {...p.sugerencias, cliente: e.target.value}}))} /></div>
                  <div className="desc-ajusta-field"><label>...que quieren...</label><input value={mision.sugerencias.problema} onChange={e => setMision(p => ({...p, sugerencias: {...p.sugerencias, problema: e.target.value}}))} /></div>
                  <div className="desc-ajusta-field"><label>...en...</label><input placeholder="Ej: 8 semanas, 3 meses..." value={mision.sugerencias.tiempo} onChange={e => setMision(p => ({...p, sugerencias: {...p.sugerencias, tiempo: e.target.value}}))} /></div>
                  <div className="desc-ajusta-field"><label>...con...</label><input value={mision.sugerencias.producto} onChange={e => setMision(p => ({...p, sugerencias: {...p.sugerencias, producto: e.target.value}}))} /></div>
                </div>
              </div>
              <button className="mpm-step-btn" onClick={usarEnMPM}>Crear mi MPM con esto →</button>
            </div>
          )}
        </div>
      )}

      {/* ── RESULTADOS ──────────────────────────────── */}
      {view === "results" && (
        <div className="mpm-results-wrap">
          <div className="mpm-results-topbar">
            <div>
              <h3 className="mpm-results-title">Tu Mensaje Perfecto ✦</h3>
              {mp.cliente && <p className="studio-helper" style={{margin:0}}>Para: <strong>{mp.cliente}</strong> · {mp.problema}</p>}
            </div>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
              <button className="mpm-edit-btn" onClick={() => { setView("wizard"); setStep(0); }}>✏️ Editar datos</button>
              <button className="mpm-edit-btn" onClick={() => setView("inicio")}>← Inicio</button>
            </div>
          </div>

          <div className="mpm-results-cols">
            <div className="mpm-results-left">
              {mpResult && (
                <>
                  <div className="studio-result-main">
                    <label>Mensaje completo</label>
                    <p className="studio-result-text">{mpResult.completo}</p>
                    <div className="studio-btn-row">
                      <button className="studio-copy-btn" onClick={() => copiar(mpResult.completo, "completo")}>{copiado === "completo" ? "¡Copiado!" : "Copiar"}</button>
                      <button className="studio-btn-save" onClick={() => onSave("mensajes", { id: Date.now(), tipo: "Mensaje Perfecto", texto: mpResult.completo, campos: {...mp}, fecha: new Date().toLocaleDateString("es") })}>Guardar</button>
                    </div>
                  </div>
                  <div className="studio-variations">
                    <h4>11 variaciones — un mensaje para cada contexto</h4>
                    {VARIACIONES.map(({ key, label }) => (
                      <div className="studio-variation-item" key={key}>
                        <span className="studio-variation-label">{label}</span>
                        <p>{mpResult[key]}</p>
                        <button className="studio-copy-btn small" onClick={() => copiar(mpResult[key], key)}>{copiado === key ? "¡Copiado!" : "Copiar"}</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="mpm-results-right">
              <h4 style={{margin:"0 0 6px",fontSize:"14px",fontWeight:700,color:"#2D1B1B"}}>🎤 Elevator Pitch</h4>
              <p className="studio-helper">Para inversionistas, proveedores o personas de autoridad. Máximo 2 minutos.</p>
              <textarea className="mpm-ep-textarea" value={epText} onChange={e => setEpText(e.target.value)} rows={9} />
              <div className="studio-btn-row" style={{marginTop:"8px"}}>
                <button className="studio-copy-btn" onClick={() => copiar(epText, "ep")}>{copiado === "ep" ? "¡Copiado!" : "Copiar pitch"}</button>
                <button className="studio-btn-save" onClick={() => onSave("mensajes", { id: Date.now(), tipo: "Elevator Pitch", texto: epText, fecha: new Date().toLocaleDateString("es") })}>Guardar pitch</button>
              </div>
              <button className="mpm-new-btn" onClick={resetWizard}>✦ Crear otro mensaje</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BANCO ───────────────────────────────────── */}
      {saved?.mensajes?.length > 0 && (
        <div className="studio-bank">
          <h4>Banco de mensajes guardados ({saved.mensajes.length})</h4>
          {saved.mensajes.slice().reverse().map(m => (
            <div className="studio-bank-item" key={m.id}>
              <div className="studio-bank-item-top">
                <span className="studio-bank-tipo">{m.tipo}</span>
                <small>{m.fecha}</small>
              </div>
              <p>{m.texto}</p>
              <div className="studio-bank-actions">
                <button className="studio-bank-action-copy" onClick={() => copiar(m.texto, `bank-${m.id}`)}>{copiado === `bank-${m.id}` ? "¡Copiado!" : "Copiar"}</button>
                {m.campos && (
                  <>
                    <button className="studio-bank-action-mpm" onClick={() => usarMensajeGuardado(m)}>Recrear mis 12 variaciones ✦</button>
                    <button className="studio-bank-action-ep" onClick={() => elevatorDesdeBanco(m)}>Generar Elevator Pitch →</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── IDEAS ──────────────────────────────────────────────────────
function IdeasTab({ saved, onSave, onDelete, onCrearGuion }) {
  const [keyword, setKeyword] = useState("");
  const [ideas, setIdeas] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [copiado, setCopiado] = useState("");

  const copiar = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiado(key);
    setTimeout(() => setCopiado(""), 2000);
  };

  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

  const CATS = {
    vertical: {
      label: "📱 Video Vertical", sub: "Reels · TikTok",
      color: "#C4526A", bg: "#FFF0F3",
      templates: [
        k => `3 errores que arruinan tu ${k} (y cómo evitarlos)`,
        k => `Lo que nadie te dice sobre ${k} 👀`,
        k => `Cómo mejorar tu ${k} en solo 24 horas`,
        k => `POV: el día que entendí cómo funciona ${k}`,
        k => `El truco de ${k} que cambió todo para mí`,
        k => `¿Por qué tu ${k} no está funcionando? Esto es lo que falta`,
        k => `Antes vs después de trabajar tu ${k}`,
        k => `Mini tutorial: ${k} desde cero en 60 segundos`,
        k => `Las 3 preguntas más frecuentes sobre ${k} — respondidas`,
        k => `La forma más fácil de empezar con ${k} sin experiencia previa`,
        k => `Esto me pasó con ${k} y no lo esperaba 😳`,
        k => `${k}: mito vs realidad 🔥`,
        k => `5 señales de que necesitas mejorar tu ${k} ya`,
        k => `Cómo hago yo mi ${k} (proceso completo en 60s)`,
        k => `Si estás comenzando con ${k}, ve este video primero`,
      ],
    },
    horizontal: {
      label: "🎬 Video Horizontal", sub: "YouTube · Podcast",
      color: "#4A90D9", bg: "#EEF5FF",
      templates: [
        k => `Cómo dominar ${k}: guía completa para mamás emprendedoras`,
        k => `Mi historia con ${k}: lo que aprendí en el camino`,
        k => `Todo lo que necesitas saber sobre ${k} — preguntas y respuestas`,
        k => `Por qué ${k} es la clave que le falta a tu negocio`,
        k => `De cero a experta en ${k}: episodio completo`,
        k => `Entrevista: cómo una mamá transformó su negocio con ${k}`,
        k => `${k} paso a paso: el proceso completo que uso con mis clientas`,
        k => `Los mitos de ${k} que te están frenando — y cómo superarlos`,
        k => `Qué nadie te enseñó sobre ${k}`,
        k => `El episodio de ${k} que ojalá hubiera visto cuando empecé`,
        k => `Cómo ${k} me ayudó a escalar mi negocio sin quemarme`,
        k => `La estrategia de ${k} que funcionó para mis clientas este mes`,
        k => `${k} y bienestar: cómo equilibrar todo sin colapsar`,
      ],
    },
    carrusel: {
      label: "🎠 Carrusel", sub: "Instagram · Facebook",
      color: "#27AE60", bg: "#EEFAF3",
      templates: [
        k => `5 claves para dominar ${k} desde hoy`,
        k => `Antes vs después de trabajar tu ${k}`,
        k => `El proceso de ${k} que uso con mis clientas (paso a paso)`,
        k => `Errores vs soluciones: guía de ${k}`,
        k => `Las preguntas más frecuentes sobre ${k} — respondidas`,
        k => `Guarda este carrusel: todo sobre ${k} en un solo post`,
        k => `${k}: la guía visual que siempre quisiste`,
        k => `Lo que aprendí sobre ${k} en el último año`,
        k => `Checklist: ¿estás haciendo bien tu ${k}?`,
        k => `Comparte si ${k} también te ha costado trabajo 👇`,
        k => `3 formas de mejorar tu ${k} esta semana`,
        k => `El ABC de ${k} para emprendedoras`,
      ],
    },
    story: {
      label: "💬 Historia / Story", sub: "IG Stories · FB Stories",
      color: "#E8755A", bg: "#FFF5F0",
      templates: [
        k => `¿Cuál es tu mayor reto con ${k}? [encuesta]`,
        k => `El secreto de ${k} que me tomó meses aprender`,
        k => `¿Ya probaste esto para mejorar tu ${k}? [encuesta sí/no]`,
        k => `Una cosa que haría diferente si empezara de cero con ${k}`,
        k => `Mi reflexión de hoy sobre ${k} — sigue viendo`,
        k => `¿Qué tanto sabes de ${k}? Ponlo a prueba [quiz]`,
        k => `Lo que me preguntan todo el tiempo sobre ${k}`,
        k => `${k} cambió mi negocio — te cuento cómo`,
        k => `Hoy hablamos de ${k} en el live. ¿Te unes?`,
        k => `Tip exprés de ${k} que puedes aplicar hoy 🔥`,
        k => `Cuéntame: ¿${k} te ha traído algún reto? [caja de preguntas]`,
      ],
    },
  };

  const generar = (kw) => {
    const k = (typeof kw === "string" ? kw : keyword).trim();
    if (!k) return;
    setThinking(true);
    setIdeas(null);
    setTimeout(() => {
      const gen = {};
      Object.entries(CATS).forEach(([key, cat]) => {
        gen[key] = shuffle([...cat.templates]).slice(0, 5).map((f, i) => ({
          id: `${key}-${Date.now()}-${i}`,
          texto: f(k),
        }));
      });
      setIdeas({ keyword: k, ...gen });
      setThinking(false);
    }, 1400);
  };

  const masIdeas = (catKey) => {
    if (!ideas) return;
    const cat = CATS[catKey];
    const nuevas = shuffle([...cat.templates]).slice(0, 3).map((f, i) => ({
      id: `${catKey}-mas-${Date.now()}-${i}`,
      texto: f(ideas.keyword),
    }));
    setIdeas(prev => ({ ...prev, [catKey]: [...prev[catKey], ...nuevas] }));
  };

  const bancoIdeas = saved?.ideas || [];
  const EJEMPLOS = ["ventas en WhatsApp", "organizar el tiempo", "reels", "bienestar", "maternidad", "redes sociales"];

  return (
    <div className="studio-tab-content">
      <div className="ideas-search-bar">
        <span className="ideas-search-icon">💡</span>
        <input
          className="ideas-search-input"
          placeholder="Escribe un tema: ventas, reels, bienestar, organización..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && generar()}
        />
        <button className="ideas-search-btn" onClick={() => generar()} disabled={!keyword.trim() || thinking}>
          Generar ideas ✦
        </button>
      </div>

      {!ideas && !thinking && (
        <div className="ideas-empty">
          <div className="ideas-brain-glow">🧠</div>
          <h3>¿Sobre qué quieres crear contenido?</h3>
          <p>Escribe un tema y te genero ideas organizadas por formato — verticales, horizontales, carruseles y stories.</p>
          <div className="ideas-chips">
            {EJEMPLOS.map(ej => (
              <button key={ej} className="ideas-chip" onClick={() => { setKeyword(ej); generar(ej); }}>{ej}</button>
            ))}
          </div>
        </div>
      )}

      {thinking && (
        <div className="ideas-thinking">
          <div className="ideas-orbit-container">
            <div className="ideas-brain-orbit">🧠</div>
            {["💡","🎬","📱","🎠","💬","✨"].map((s, i) => (
              <div key={i} className={`ideas-orbit-item ideas-orbit-${i}`}>{s}</div>
            ))}
          </div>
          <p className="ideas-thinking-text">Generando ideas para ti<span className="ideas-dots-anim">...</span></p>
        </div>
      )}

      {ideas && !thinking && (
        <>
          <div className="ideas-result-header">
            <div>
              <span className="ideas-kw-label">Ideas para </span>
              <strong className="ideas-kw-value">"{ideas.keyword}"</strong>
            </div>
            <button className="ideas-regen-btn" onClick={() => generar(ideas.keyword)}>🔄 Nuevas ideas</button>
          </div>
          {Object.entries(CATS).map(([catKey, cat]) => (
            <div className="ideas-cat-section" key={catKey} style={{ "--cat-color": cat.color, "--cat-bg": cat.bg }}>
              <div className="ideas-cat-header">
                <div className="ideas-cat-title">
                  <span className="ideas-cat-label">{cat.label}</span>
                  <span className="ideas-cat-sub">{cat.sub}</span>
                </div>
                <button className="ideas-mas-btn" onClick={() => masIdeas(catKey)}>+ Más ideas</button>
              </div>
              <div className="ideas-cards-grid">
                {ideas[catKey].map((idea, i) => (
                  <div className="ideas-card" key={idea.id} style={{ animationDelay: `${i * 70}ms` }}>
                    <p className="ideas-card-text">{idea.texto}</p>
                    <div className="ideas-card-actions">
                      <button className="ideas-card-copy" onClick={() => copiar(idea.texto, idea.id)}>
                        {copiado === idea.id ? "✓ Copiado" : "Copiar"}
                      </button>
                      <button className="ideas-card-save" onClick={() => onSave("ideas", {
                        id: Date.now(), titulo: idea.texto, tipo: cat.label,
                        plataforma: cat.sub, color: cat.color, keyword: ideas.keyword,
                        fecha: new Date().toLocaleDateString("es"),
                      })}>Guardar</button>
                      <button className="ideas-card-guion" onClick={() => onCrearGuion?.(idea.texto)}>Guión 🎬</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {bancoIdeas.length > 0 && (
        <div className="studio-bank">
          <h4>Ideas guardadas ({bancoIdeas.length})</h4>
          {bancoIdeas.slice().reverse().map(idea => (
            <div className="studio-bank-item" key={idea.id}>
              <div className="studio-bank-item-top">
                <span className="studio-tipo-badge" style={{ background: idea.color || "#8B6565" }}>{idea.tipo}</span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <small>{idea.fecha}</small>
                  <button className="studio-delete-btn" onClick={() => onDelete("ideas", idea.id)}>✕</button>
                </div>
              </div>
              <p className="studio-idea-titulo">{idea.titulo}</p>
              <div className="studio-bank-actions">
                <button className="studio-bank-action-copy" onClick={() => copiar(idea.titulo, `bank-${idea.id}`)}>
                  {copiado === `bank-${idea.id}` ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LEAD MAGNET ────────────────────────────────────────────────
function LeadMagnetTab({ saved, onSave, onDelete }) {
  const [view, setView]         = useState("inicio");
  const [keyword, setKeyword]   = useState("");
  const [lmIdeas, setLmIdeas]   = useState(null);
  const [thinking, setThinking] = useState(false);
  const [form, setForm]         = useState({ titulo: "", promesa: "", audiencia: "", tipo: "guia", secciones: ["", "", ""], cta: "", producto: "" });
  const [docData, setDocData]   = useState(null);
  const [copiado, setCopiado]   = useState("");

  const savedIdeas = (saved?.ideas || []).slice(-8).reverse();
  const bancoLeads = saved?.leads || [];
  const shuffle    = (arr) => [...arr].sort(() => Math.random() - 0.5);
  const copiar     = (t, k) => { navigator.clipboard.writeText(t); setCopiado(k); setTimeout(() => setCopiado(""), 2000); };

  const LM_CATS = {
    guia: {
      label: "📄 Guía / Ebook", sub: "PDF descargable · Evergreen",
      color: "#C4526A", bg: "#FFF0F3",
      templates: [
        k => `La guía definitiva de ${k} para mamás emprendedoras`,
        k => `${k}: los 5 pasos que nadie te ha explicado`,
        k => `De cero a resultados con ${k} — guía paso a paso`,
        k => `Todo lo que necesitas sobre ${k} en un solo lugar`,
        k => `El método de ${k} para empezar desde hoy`,
        k => `${k} sin complicarte: guía express de 10 minutos`,
        k => `Las 7 claves de ${k} que cambiarán tu negocio`,
        k => `Mini guía: cómo aplicar ${k} esta misma semana`,
        k => `${k} para principiantes: empieza sin experiencia`,
      ],
    },
    checklist: {
      label: "✅ Checklist / Plantilla", sub: "Listo para usar · Imprimible",
      color: "#27AE60", bg: "#EEFAF3",
      templates: [
        k => `Checklist: todo lo que necesitas para dominar ${k}`,
        k => `Plantilla lista: organiza tu ${k} paso a paso`,
        k => `El checklist de ${k} que uso con mis clientas`,
        k => `Lista de verificación: ¿estás lista para ${k}?`,
        k => `Plantilla gratuita: planifica tu ${k} en minutos`,
        k => `El checklist esencial de ${k} — descárgalo gratis`,
        k => `Hoja de trabajo: domina ${k} en 7 acciones concretas`,
        k => `${k}: la plantilla que te ahorra horas cada semana`,
      ],
    },
    clase: {
      label: "🎓 Mini-clase / Webinar", sub: "Video · Audio · Live",
      color: "#4A90D9", bg: "#EEF5FF",
      templates: [
        k => `Mini-clase gratuita: el método de ${k} que funciona`,
        k => `Masterclass: domina ${k} sin años de experiencia`,
        k => `Clase exprés de ${k} en 20 minutos`,
        k => `Taller virtual: implementa ${k} esta semana`,
        k => `El webinar de ${k}: tu primera victoria rápida`,
        k => `Live gratuito: ${k} para mamás que empiezan desde cero`,
        k => `Video privado: mi proceso completo de ${k}`,
        k => `Capacitación express: ${k} en una sola sesión`,
      ],
    },
    reto: {
      label: "🔥 Reto / Challenge", sub: "3-7 días de acción",
      color: "#E8755A", bg: "#FFF5F0",
      templates: [
        k => `Reto de 5 días: transforma tu ${k} con una acción diaria`,
        k => `Challenge gratuito: ${k} en 7 días`,
        k => `El reto de ${k} que cambiará tu negocio esta semana`,
        k => `3 días para dominar ${k} — únete gratis`,
        k => `Reto express: tu primera victoria con ${k}`,
        k => `Challenge de ${k}: una acción diaria durante 5 días`,
        k => `El reto de ${k} que mis clientas llaman transformador`,
        k => `Mini reto de ${k}: empieza hoy, ve resultados en 3 días`,
      ],
    },
  };

  const generar = (kw) => {
    const k = (typeof kw === "string" ? kw : keyword).trim();
    if (!k) return;
    setThinking(true); setLmIdeas(null);
    setTimeout(() => {
      const gen = {};
      Object.entries(LM_CATS).forEach(([key, cat]) => {
        gen[key] = shuffle([...cat.templates]).slice(0, 4).map((f, i) => ({
          id: `lm-${key}-${Date.now()}-${i}`, texto: f(k), tipo: key,
        }));
      });
      setLmIdeas({ keyword: k, ...gen });
      setThinking(false);
    }, 1200);
  };

  const masIdeasLm = (catKey) => {
    if (!lmIdeas) return;
    const nuevas = shuffle([...LM_CATS[catKey].templates]).slice(0, 2).map((f, i) => ({
      id: `lm-${catKey}-mas-${Date.now()}-${i}`, texto: f(lmIdeas.keyword), tipo: catKey,
    }));
    setLmIdeas(prev => ({ ...prev, [catKey]: [...prev[catKey], ...nuevas] }));
  };

  const usarIdea = (idea) => {
    setForm(p => ({ ...p, titulo: idea.texto, tipo: idea.tipo }));
    setView("crear");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const TIPO_OPTIONS = [
    { key: "guia",      emoji: "📄", label: "Guía / Ebook",         desc: "PDF descargable" },
    { key: "checklist", emoji: "✅", label: "Checklist / Plantilla", desc: "Lista de acciones" },
    { key: "clase",     emoji: "🎓", label: "Mini-clase / Webinar",  desc: "Video + guión" },
    { key: "reto",      emoji: "🔥", label: "Reto / Challenge",      desc: "3-7 días" },
  ];

  const SECCIONES_META = {
    guia:      { label: "Secciones del documento",  add: "+ Agregar sección", ph: (i) => `Sección ${i+1}: ej. "Cómo organizarte antes de vender"` },
    checklist: { label: "Ítems del checklist",       add: "+ Agregar ítem",    ph: (i) => `Ítem ${i+1}: ej. "Identificar a tu clienta ideal"` },
    clase:     { label: "Módulos de la clase",       add: "+ Agregar módulo",  ph: (i) => `Módulo ${i+1}: ej. "Cómo encontrar tu primera clienta"` },
    reto:      { label: "Días / acciones del reto",  add: "+ Agregar día",     ph: (i) => `Día ${i+1}: ej. "Define tu oferta principal"` },
  };

  const TIPO_LABELS  = { guia: "📄 Guía",       checklist: "✅ Checklist", clase: "🎓 Mini-clase", reto: "🔥 Reto" };
  const TIPO_COLORS  = { guia: "#C4526A",        checklist: "#27AE60",     clase: "#4A90D9",       reto: "#E8755A" };

  const buildDoc = () => {
    const { tipo, titulo, promesa, audiencia, secciones, cta, producto } = form;
    const aud    = audiencia || "mamás emprendedoras";
    const prod   = producto  || "mi programa / servicio";
    const ctaTxt = cta       || `Conoce ${prod} →`;
    const secc   = secciones.filter(s => s.trim());

    let estructura = [];
    if (tipo === "guia") {
      estructura = [
        { tipo: "intro", label: "✦ Introducción", content: `Hola! Soy [tu nombre] y creé esta guía especialmente para ti.\n\nSi eres ${aud}, sé exactamente el reto que estás viviendo. Esta guía es tu punto de partida.\n\nAl terminar, vas a ${promesa || "tener claridad y pasos concretos para avanzar"}.` },
        ...(secc.length > 0 ? secc : ["Sección 1", "Sección 2", "Sección 3"]).map((s, i) => ({
          tipo: "seccion", label: `Sección ${i+1}: ${s}`,
          content: "[Desarrolla aquí el contenido — 3-5 párrafos con ejemplos concretos y pasos accionables]",
        })),
        { tipo: "cta", label: "🎁 ¿Lista para el siguiente nivel?", content: `Esta guía es solo el principio.\n\nCuando estés lista para ir más lejos, ${prod} fue diseñado exactamente para ti.\n\n👉 ${ctaTxt}` },
      ];
    } else if (tipo === "checklist") {
      const items = secc.length > 0 ? secc : ["Paso 1: [Describe la acción]","Paso 2: [Describe la acción]","Paso 3: [Describe la acción]","Paso 4: [Describe la acción]","Paso 5: [Describe la acción]"];
      estructura = [
        { tipo: "intro", label: "Para qué es este checklist", content: `Para ${aud} que quieren ${promesa || "avanzar con claridad y sin pasos perdidos"}.` },
        { tipo: "checklist-items", label: "Tu lista de acciones", items },
        { tipo: "cta", label: "🎁 ¿Completaste el checklist?", content: `¡Eso significa que estás lista para el siguiente paso!\n\n👉 ${ctaTxt}` },
      ];
    } else if (tipo === "clase") {
      estructura = [
        { tipo: "guion-parte", label: "🎬 BIENVENIDA (2-3 min)", content: `"¡Hola! Soy [tu nombre] y bienvenida a esta mini-clase.\n\nHoy vamos a aprender: ${titulo}.\n\nAl terminar, vas a ${promesa || "tener una acción clara para implementar hoy"}."\n\n[Preséntate brevemente: quién eres y a quién ayudas]` },
        ...(secc.length > 0 ? secc : ["Módulo 1","Módulo 2","Módulo 3"]).map((s, i) => ({
          tipo: "guion-parte", label: `📖 MÓDULO ${i+1}: ${s}`,
          content: `"[Desarrolla el contenido de este módulo]\n\n[Incluye 1 ejemplo concreto o historia]\n\n[Da 1 acción práctica que puedan tomar ahora mismo]"`,
        })),
        { tipo: "guion-parte", label: "🚀 CIERRE + CTA (3-5 min)", content: `"Hemos llegado al final y ya tienes [resume lo aprendido].\n\nSi esto te fue útil y quieres ir más lejos, ${prod} fue creado para ti.\n\n${ctaTxt}\n\n¡Gracias por estar aquí! 💌"` },
      ];
    } else if (tipo === "reto") {
      const dias = secc.length > 0 ? secc : ["Día 1: Claridad","Día 2: Acción","Día 3: Revisión","Día 4: Profundidad","Día 5: Celebración"];
      estructura = [
        { tipo: "intro", label: "✦ Bienvenida al Reto", content: `¡Hola! Soy [tu nombre] y diseñé este reto para ${aud}.\n\nDurante los próximos días, vas a ${promesa || "avanzar con una acción pequeña cada día"}.\n\nReglas simples: un día a la vez, una acción a la vez. ¡Tú puedes!` },
        { tipo: "reto-dias", label: "Tus días de acción", dias },
        { tipo: "cta", label: "🎁 ¡Completaste el reto!", content: `¡Felicidades! Eso dice mucho de ti.\n\nAhora imagina lo que puedes lograr con acompañamiento real.\n\n👉 ${ctaTxt}` },
      ];
    }
    return { tipo, titulo, promesa, audiencia: aud, estructura };
  };

  const generarDoc = () => {
    if (!form.titulo.trim()) return;
    setDocData(buildDoc());
    setView("preview");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const downloadWord = (doc) => {
    const { titulo, promesa, audiencia, estructura } = doc;
    let body = "";
    estructura.forEach(parte => {
      body += `<h2 style="color:#C4526A;font-family:Arial,sans-serif;border-bottom:2px solid #f5d0d8;padding-bottom:6px;margin-top:32px;">${parte.label}</h2>`;
      if (parte.tipo === "checklist-items") {
        parte.items.forEach(item => {
          body += `<p style="font-family:Arial,sans-serif;margin:8px 0;font-size:14px;">☐ &nbsp;${item}</p>`;
        });
      } else if (parte.tipo === "reto-dias") {
        parte.dias.forEach((dia, i) => {
          body += `<div style="border:1px solid #f0d0d8;border-radius:8px;padding:12px 16px;margin:10px 0;">`;
          body += `<p style="font-family:Arial,sans-serif;margin:0 0 6px;font-weight:bold;color:#2D1B1B;">Día ${i+1}: ${dia}</p>`;
          body += `<p style="font-family:Arial,sans-serif;margin:0;color:#9A7878;font-size:13px;">Acción de hoy: _______________________________________</p>`;
          body += `</div>`;
        });
      } else if (parte.content) {
        parte.content.split("\n").forEach(line => {
          if (line.trim()) body += `<p style="font-family:Arial,sans-serif;line-height:1.75;margin:8px 0;font-size:14px;">${line}</p>`;
          else body += `<br/>`;
        });
      }
    });

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${titulo}</title></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;">
<div style="background:linear-gradient(135deg,#C4526A,#E8755A);padding:36px 40px;color:white;">
  <p style="font-size:11px;color:rgba(255,255,255,0.65);margin:0 0 10px;letter-spacing:1px;text-transform:uppercase;">Mamá CEO · Studio de Contenido</p>
  <h1 style="color:white;margin:0 0 12px;font-size:28px;line-height:1.2;">${titulo}</h1>
  ${promesa ? `<p style="color:rgba(255,255,255,0.85);font-style:italic;margin:0 0 8px;font-size:15px;">"${promesa}"</p>` : ""}
  ${audiencia ? `<p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0;">Para: ${audiencia}</p>` : ""}
</div>
<div style="max-width:700px;margin:0 auto;padding:32px 40px;">${body}</div>
<div style="border-top:1px solid #f0d0d8;padding:16px 40px;text-align:center;">
  <p style="font-size:11px;color:#ccc;font-family:Arial,sans-serif;">Creado con Studio de Contenido · Mamá CEO App</p>
</div></body></html>`;

    const blob = new Blob([html], { type: "application/msword" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${titulo.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ]/g, "").trim()}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="studio-tab-content">

      {/* ── INICIO ─────────────────────────────────── */}
      {view === "inicio" && (
        <div className="lm-landing">
          <div className="mpm-landing-header">
            <div className="mpm-landing-badge">🎁</div>
            <h2 className="mpm-landing-title">Lead Magnet</h2>
            <p className="mpm-landing-sub">Tu regalo de bienvenida para personas que aún no te conocen bien — la puerta de entrada a tu mundo.</p>
          </div>

          <div className="lm-purpose-strip">
            <div className="lm-purpose-item">
              <span className="lm-purpose-num">1</span>
              <div>
                <strong>Primera victoria rápida</strong>
                <p>Resuelve un problema pequeño y concreto que tu clienta tiene ahora mismo.</p>
              </div>
            </div>
            <div className="lm-purpose-arrow">→</div>
            <div className="lm-purpose-item">
              <span className="lm-purpose-num">2</span>
              <div>
                <strong>Genera confianza</strong>
                <p>Ella experimenta tu estilo y tu forma de enseñar. Te empieza a conocer.</p>
              </div>
            </div>
            <div className="lm-purpose-arrow">→</div>
            <div className="lm-purpose-item lm-purpose-item--highlight">
              <span className="lm-purpose-num lm-purpose-num--highlight">3</span>
              <div>
                <strong>CTA a tu producto ✦</strong>
                <p>Siempre termina invitando a tu servicio o programa de pago.</p>
              </div>
            </div>
          </div>

          <div className="mpm-cards-row">
            <button className="mpm-card" onClick={() => setView("generar")}>
              <div className="mpm-card-top">
                <span className="mpm-card-emoji">💡</span>
                <span className="mpm-card-tag">Explorar</span>
              </div>
              <strong className="mpm-card-name">Generar ideas</strong>
              <p className="mpm-card-desc">Escribe un tema y te doy ideas de lead magnets: guías, checklists, mini-clases y retos</p>
              <span className="mpm-card-link">Explorar ideas →</span>
            </button>
            <button className="mpm-card mpm-card--highlight" onClick={() => setView("crear")}>
              <div className="mpm-card-top">
                <span className="mpm-card-badge-ico">🎁</span>
                <span className="mpm-card-tag mpm-card-tag--primary">Crear</span>
              </div>
              <strong className="mpm-card-name">Crear mi lead magnet</strong>
              <p className="mpm-card-desc">Ya tengo idea — quiero crear el documento o guión de clase listo para exportar como PDF</p>
              <span className="mpm-card-link mpm-card-link--primary">Empezar →</span>
            </button>
          </div>

          {savedIdeas.length > 0 && (
            <div className="lm-inspiracion">
              <p className="lm-inspi-label">💡 Generar ideas desde tus contenidos guardados:</p>
              <div className="lm-inspi-chips">
                {savedIdeas.map(idea => (
                  <button key={idea.id} className="lm-inspi-chip"
                    onClick={() => { const kw = idea.titulo.slice(0, 45); setKeyword(kw); generar(kw); setView("generar"); }}>
                    {idea.titulo.length > 48 ? idea.titulo.slice(0, 48) + "…" : idea.titulo}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GENERAR ─────────────────────────────────── */}
      {view === "generar" && (
        <div>
          <div className="lm-gen-topbar">
            <button className="mpm-wizard-back-btn" onClick={() => setView("inicio")}>← Inicio</button>
          </div>

          <div className="ideas-search-bar">
            <span className="ideas-search-icon">🎁</span>
            <input
              className="ideas-search-input"
              placeholder="¿Sobre qué tema será tu lead magnet? ventas, organización, bienestar..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && generar()}
            />
            <button className="ideas-search-btn" onClick={() => generar()} disabled={!keyword.trim() || thinking}>
              Generar ideas ✦
            </button>
          </div>

          {savedIdeas.length > 0 && !lmIdeas && !thinking && (
            <div className="lm-inspiracion" style={{marginBottom:"24px"}}>
              <p className="lm-inspi-label">💡 Desde tus ideas guardadas:</p>
              <div className="lm-inspi-chips">
                {savedIdeas.map(idea => (
                  <button key={idea.id} className="lm-inspi-chip"
                    onClick={() => { const kw = idea.titulo.slice(0, 45); setKeyword(kw); generar(kw); }}>
                    {idea.titulo.length > 45 ? idea.titulo.slice(0, 45) + "…" : idea.titulo}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!lmIdeas && !thinking && (
            <div className="ideas-empty">
              <div className="ideas-brain-glow">🎁</div>
              <h3>¿Sobre qué quieres crear tu lead magnet?</h3>
              <p>Escribe un tema y te genero ideas organizadas por tipo: guías, checklists, mini-clases y retos de acción.</p>
              <div className="ideas-chips">
                {["ventas en WhatsApp","organizar el tiempo","conseguir clientas","marketing de contenido","bienestar para mamás"].map(ej => (
                  <button key={ej} className="ideas-chip" onClick={() => { setKeyword(ej); generar(ej); }}>{ej}</button>
                ))}
              </div>
            </div>
          )}

          {thinking && (
            <div className="ideas-thinking">
              <div className="ideas-orbit-container">
                <div className="ideas-brain-orbit">🎁</div>
                {["📄","✅","🎓","🔥","💡","✨"].map((s, i) => (
                  <div key={i} className={`ideas-orbit-item ideas-orbit-${i}`}>{s}</div>
                ))}
              </div>
              <p className="ideas-thinking-text">Creando ideas de lead magnet<span className="ideas-dots-anim">...</span></p>
            </div>
          )}

          {lmIdeas && !thinking && (
            <>
              <div className="ideas-result-header">
                <div>
                  <span className="ideas-kw-label">Ideas para </span>
                  <strong className="ideas-kw-value">"{lmIdeas.keyword}"</strong>
                </div>
                <button className="ideas-regen-btn" onClick={() => generar(lmIdeas.keyword)}>🔄 Nuevas ideas</button>
              </div>
              {Object.entries(LM_CATS).map(([catKey, cat]) => (
                <div className="ideas-cat-section" key={catKey} style={{ "--cat-color": cat.color, "--cat-bg": cat.bg }}>
                  <div className="ideas-cat-header">
                    <div className="ideas-cat-title">
                      <span className="ideas-cat-label">{cat.label}</span>
                      <span className="ideas-cat-sub">{cat.sub}</span>
                    </div>
                    <button className="ideas-mas-btn" onClick={() => masIdeasLm(catKey)}>+ Más ideas</button>
                  </div>
                  <div className="ideas-cards-grid">
                    {lmIdeas[catKey].map((idea, i) => (
                      <div className="ideas-card" key={idea.id} style={{ animationDelay: `${i * 70}ms` }}>
                        <p className="ideas-card-text">{idea.texto}</p>
                        <div className="ideas-card-actions">
                          <button className="ideas-card-copy" onClick={() => copiar(idea.texto, idea.id)}>
                            {copiado === idea.id ? "✓ Copiado" : "Copiar"}
                          </button>
                          <button className="ideas-card-guion lm-usar-btn" onClick={() => usarIdea(idea)}>
                            Crear este 🎁
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── CREAR ───────────────────────────────────── */}
      {view === "crear" && (
        <div className="lm-crear-wrap">
          <div className="desc-header">
            <button className="mpm-wizard-back-btn" onClick={() => setView("inicio")}>← Inicio</button>
            <h2 className="desc-title">Crea tu Lead Magnet</h2>
            <p className="desc-subtitle">La promesa lo vende — el contenido lo cumple. Define primero qué victoria rápida le vas a dar a tu clienta.</p>
          </div>

          <div className="lm-crear-form">
            <div className="lm-crear-section">
              <label className="lm-crear-label">¿Qué tipo de lead magnet vas a crear?</label>
              <div className="lm-tipo-pills">
                {TIPO_OPTIONS.map(t => (
                  <button key={t.key} className={`lm-tipo-pill${form.tipo === t.key ? " active" : ""}`}
                    onClick={() => setForm(p => ({...p, tipo: t.key}))}>
                    <span className="lm-tipo-pill-emoji">{t.emoji}</span>
                    <span className="lm-tipo-pill-label">{t.label}</span>
                    <span className="lm-tipo-pill-desc">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="lm-crear-grid">
              {[
                { num:"01", emoji:"✏️", label:"Título de tu lead magnet",          field:"titulo",    ph:"Las 5 claves para vender sin sentirte pesada",                      hint:"Claro, específico y con la victoria que promete" },
                { num:"02", emoji:"🎯", label:"¿Qué victoria rápida les das?",      field:"promesa",   ph:"Aprenderán a vender con confianza sin presionar",                   hint:"Lo que podrán hacer o sentir al terminar" },
                { num:"03", emoji:"👩‍💼", label:"¿Para quién es?",                  field:"audiencia", ph:"Mamás que venden desde casa y odian el rechazo",                    hint:"Mientras más específico, más se identifica tu clienta ideal" },
                { num:"04", emoji:"🚀", label:"¿A qué producto lleva el CTA final?",field:"producto",  ph:"Mi mentoría CEO en Casa / Mi programa de ventas",                   hint:"El lead magnet siempre lleva a tu producto de pago" },
                { num:"05", emoji:"💌", label:"¿Cuál es el CTA exacto?",            field:"cta",       ph:"Agenda una llamada gratuita / Conoce mi programa en [link]",         hint:"Texto exacto que aparecerá al final del documento" },
              ].map(q => (
                <div key={q.field} className={`desc-q-card${form[q.field] ? " filled" : ""}`}>
                  <div className="desc-q-num">{q.num}</div>
                  <div className="desc-q-body">
                    <div className="desc-q-top">
                      <span className="desc-q-emoji">{q.emoji}</span>
                      <label className="desc-q-label">{q.label}</label>
                    </div>
                    <input className="desc-q-input" placeholder={q.ph} value={form[q.field]}
                      onChange={e => setForm(p => ({...p, [q.field]: e.target.value}))} />
                    <span className="desc-q-hint">{q.hint}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="lm-secciones-block">
              <label className="lm-crear-label">{SECCIONES_META[form.tipo]?.label || "Contenido"}</label>
              <p className="studio-helper" style={{marginTop:0,marginBottom:"12px"}}>No necesitan ser perfectos — son el esqueleto de tu documento.</p>
              {form.secciones.map((s, i) => (
                <div key={i} className="lm-seccion-row">
                  <span className="lm-seccion-num">{i+1}</span>
                  <input
                    className="lm-seccion-input"
                    placeholder={SECCIONES_META[form.tipo]?.ph(i) || `Sección ${i+1}`}
                    value={s}
                    onChange={e => { const a = [...form.secciones]; a[i] = e.target.value; setForm(p => ({...p, secciones: a})); }}
                  />
                  {form.secciones.length > 1 && (
                    <button className="studio-delete-btn" onClick={() => setForm(p => ({...p, secciones: p.secciones.filter((_, idx) => idx !== i)}))}>✕</button>
                  )}
                </div>
              ))}
              <button className="studio-add-btn" onClick={() => setForm(p => ({...p, secciones: [...p.secciones, ""]}))}>
                {SECCIONES_META[form.tipo]?.add || "+ Agregar sección"}
              </button>
            </div>

            <button className="mpm-step-btn" onClick={generarDoc} disabled={!form.titulo.trim()}>
              Generar documento ✦
            </button>
          </div>
        </div>
      )}

      {/* ── PREVIEW ─────────────────────────────────── */}
      {view === "preview" && docData && (
        <div className="lm-preview-wrap">
          <div className="lm-preview-topbar">
            <button className="mpm-wizard-back-btn" onClick={() => setView("crear")}>← Editar</button>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
              <button className="mpm-edit-btn" onClick={() => onSave("leads", { id: Date.now(), titulo: docData.titulo, tipo: docData.tipo, promesa: docData.promesa, audiencia: docData.audiencia, fecha: new Date().toLocaleDateString("es") })}>
                Guardar 🎁
              </button>
              <button className="lm-dl-btn lm-dl-btn--word" onClick={() => downloadWord(docData)}>⬇ Word (.doc)</button>
              <button className="lm-dl-btn lm-dl-btn--pdf" onClick={() => window.print()}>🖨️ PDF</button>
            </div>
          </div>

          <div className="lm-export-strip">
            <div className="lm-export-item">
              <span className="lm-export-ico">📄</span>
              <div>
                <strong>Word (.doc)</strong>
                <p>Descarga y edita en Microsoft Word — o sube a Google Drive y ábrelo con Google Docs para editarlo online.</p>
              </div>
            </div>
            <div className="lm-export-sep" />
            <div className="lm-export-item">
              <span className="lm-export-ico">🖨️</span>
              <div>
                <strong>PDF (impresión)</strong>
                <p>Al imprimir elige <strong>"Guardar como PDF"</strong> para obtener una versión lista para compartir.</p>
              </div>
            </div>
          </div>

          <div className="lm-print-area">
            <div className="lm-doc-header">
              <div className="lm-doc-brand">Mamá CEO · Studio de Contenido</div>
              <h1 className="lm-doc-title">{docData.titulo}</h1>
              {docData.promesa && <p className="lm-doc-promesa">"{docData.promesa}"</p>}
              <div className="lm-doc-meta-row">
                {docData.audiencia && <span className="lm-doc-para">Para: {docData.audiencia}</span>}
                <span className="lm-doc-tipo-badge" style={{background: TIPO_COLORS[docData.tipo]}}>{TIPO_LABELS[docData.tipo]}</span>
              </div>
            </div>

            <div className="lm-doc-body">
              {docData.estructura.map((parte, i) => (
                <div key={i} className={`lm-doc-parte lm-doc-parte--${parte.tipo}`}>
                  <h3 className="lm-doc-parte-label">{parte.label}</h3>
                  {parte.tipo === "checklist-items" && (
                    <div className="lm-doc-checklist">
                      {parte.items.map((item, j) => (
                        <div key={j} className="lm-doc-check-item">
                          <span className="lm-doc-checkbox">☐</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {parte.tipo === "reto-dias" && (
                    <div className="lm-doc-dias">
                      {parte.dias.map((dia, j) => (
                        <div key={j} className="lm-doc-dia">
                          <span className="lm-doc-dia-num">{j+1}</span>
                          <div>
                            <strong>{dia}</strong>
                            <p className="lm-doc-dia-accion">Acción de hoy: [Describe la acción específica que harán este día]</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {parte.content && (
                    <div className="lm-doc-content">
                      {parte.content.split("\n").map((line, j) =>
                        line ? <p key={j}>{line}</p> : <br key={j} />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="lm-doc-footer">
              <p>Creado con Studio de Contenido · Mamá CEO App</p>
            </div>
          </div>
        </div>
      )}

      {/* ── BANCO ───────────────────────────────────── */}
      {bancoLeads.length > 0 && (
        <div className="studio-bank">
          <h4>Mis Lead Magnets ({bancoLeads.length})</h4>
          {bancoLeads.slice().reverse().map(item => (
            <div className="studio-bank-item" key={item.id}>
              <div className="studio-bank-item-top">
                <span className="studio-tipo-badge" style={{ background: TIPO_COLORS[item.tipo] || "#8B6565" }}>
                  {TIPO_LABELS[item.tipo] || item.tipo || "Lead Magnet"}
                </span>
                <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                  <small>{item.fecha}</small>
                  <button className="studio-delete-btn" onClick={() => onDelete("leads", item.id)}>✕</button>
                </div>
              </div>
              <strong>{item.titulo}</strong>
              {item.promesa && <p style={{fontSize:"13px",color:"var(--muted)",margin:"4px 0 0"}}>{item.promesa}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── HOOKS ──────────────────────────────────────────────────────
function HooksTab({ saved, onSave, onCrearGuion }) {
  const [tema, setTema]       = useState("");
  const [nicho, setNicho]     = useState("");
  const [hooks, setHooks]     = useState(null);
  const [thinking, setThinking] = useState(false);
  const [copiado, setCopiado] = useState("");

  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
  const copiar  = (t, k) => { navigator.clipboard.writeText(t); setCopiado(k); setTimeout(() => setCopiado(""), 2000); };

  const HOOK_CATS = {
    curiosidad: {
      label: "🤔 Curiosidad", sub: "Detiene el scroll al instante",
      color: "#4A90D9", bg: "#EEF5FF",
      templates: [
        t => `Lo que nadie te dice sobre ${t}`,
        t => `El secreto de ${t} que las expertas se guardan`,
        t => `Por qué las emprendedoras exitosas hacen esto con ${t}`,
        t => `Lo que descubrí sobre ${t} que lo cambió todo`,
        t => `La razón oculta por la que ${t} no te está funcionando`,
        t => `Existe una forma de ${t} que casi nadie conoce`,
        t => `Esto es lo que realmente pasa cuando haces ${t}`,
      ],
    },
    dolor: {
      label: "😩 Dolor / Frustración", sub: "Habla directo a lo que siente",
      color: "#C4526A", bg: "#FFF0F3",
      templates: [
        t => `¿Cansada de que ${t} no te dé resultados?`,
        t => `Si ${t} te tiene abrumada, para y mira esto`,
        t => `Esto es exactamente lo que sientes cuando ${t} no avanza`,
        t => `Dejé de luchar con ${t} cuando entendí esto`,
        t => `El error que te está frenando en ${t} (y no lo sabías)`,
        t => `Para las que ya estamos hartas de que ${t} no funcione`,
        t => `${t} te está robando tiempo que no tienes — y esto lo para`,
      ],
    },
    promesa: {
      label: "✨ Promesa de Resultado", sub: "Le muestra lo que puede lograr",
      color: "#27AE60", bg: "#EEFAF3",
      templates: [
        t => `Cómo mejorar tu ${t} en menos de 30 días (sin complicarte)`,
        t => `La forma más rápida de dominar ${t} desde hoy`,
        t => `${t} sin esfuerzo extra: el método que sí funciona`,
        t => `En 60 segundos te enseño lo más importante de ${t}`,
        t => `Así transformé mi ${t} — tú puedes hacer lo mismo`,
        t => `Después de esto, ${t} va a ser mucho más fácil`,
        t => `Lo que cambié en ${t} que me dio resultados esta semana`,
      ],
    },
    pregunta: {
      label: "❓ Pregunta Directa", sub: "Las hace parar a pensar",
      color: "#E8755A", bg: "#FFF5F0",
      templates: [
        t => `¿Estás haciendo ${t} de la forma equivocada?`,
        t => `¿Sabes por qué tu ${t} aún no despega?`,
        t => `¿Y si ${t} fuera más fácil de lo que siempre creíste?`,
        t => `¿Cuánto tiempo llevas intentando ${t} sin ver resultados?`,
        t => `¿Qué pasaría si resolvieras ${t} esta semana?`,
        t => `¿Por qué ${t} funciona para otras y para ti no?`,
        t => `¿Alguien más batalla con ${t} o soy solo yo?`,
      ],
    },
    historia: {
      label: "📖 Historia / POV", sub: "Emoción y conexión personal",
      color: "#8B6565", bg: "#FFF8F5",
      templates: [
        t => `POV: el día que todo cambió con mi ${t}`,
        t => `Hace un año no entendía nada de ${t}. Hoy te cuento todo.`,
        t => `Una clienta me escribió llorando porque logró ${t}. Esto es lo que hicimos.`,
        t => `Esto me pasó con ${t} y no lo esperaba 😳`,
        t => `La historia de cómo ${t} cambió mi negocio completamente`,
        t => `Cuando estaba a punto de rendirme con ${t}, pasó esto`,
        t => `Nadie me contó esto sobre ${t} cuando empecé`,
      ],
    },
    numero: {
      label: "🔢 Número / Lista", sub: "Específico y escaneable",
      color: "#9B59B6", bg: "#F8F0FF",
      templates: [
        t => `3 errores que arruinan tu ${t} (y cómo evitarlos)`,
        t => `5 señales de que necesitas mejorar tu ${t} ya`,
        t => `Las 7 claves de ${t} que nadie te enseña`,
        t => `Solo necesitas estos 3 pasos para dominar ${t}`,
        t => `El 80% de las emprendedoras falla en ${t} por estas razones`,
        t => `2 minutos de ${t} al día cambian todo — te lo demuestro`,
        t => `4 cosas que aprendí de ${t} que ojalá hubiera sabido antes`,
      ],
    },
    contraintuitivo: {
      label: "🔄 Contraintuitivo", sub: "Rompe lo que creen saber",
      color: "#E67E22", bg: "#FFF5EB",
      templates: [
        t => `Deja de intentar ${t} de esta forma. No es lo que crees.`,
        t => `Por qué hacer MÁS no te ayuda con ${t}`,
        t => `Lo que te enseñaron sobre ${t} está equivocado`,
        t => `Trabajar más duro en ${t} te está frenando — y aquí explico por qué`,
        t => `Esto que parece un error en ${t} es en realidad tu mayor ventaja`,
        t => `${t}: todo lo que crees que sabes está al revés`,
        t => `La estrategia de ${t} que parece incorrecta y funciona mejor que todo`,
      ],
    },
    identidad: {
      label: "🪞 Identidad / Tribu", sub: "Habla directo a mamás como ella",
      color: "#16A085", bg: "#EDFAF6",
      templates: [
        t => `Este video es para las mamás que luchan con ${t} en silencio`,
        t => `Si eres mamá emprendedora y ${t} te pesa, esto es para ti`,
        t => `Para las que dijeron "ya no puedo con ${t}" — no estás sola`,
        t => `¿Mamá emprendedora con problemas de ${t}? Para y mira esto`,
        t => `Solo las mamás que se toman en serio ${t} entienden esto`,
        t => `Si combinas maternidad y ${t}, este video te va a resonar`,
        t => `Las mamás que logran ${t} tienen algo en común — y te lo cuento aquí`,
      ],
    },
  };

  const generar = (t) => {
    const k = (typeof t === "string" ? t : tema).trim();
    if (!k) return;
    setThinking(true); setHooks(null);
    setTimeout(() => {
      const gen = {};
      Object.entries(HOOK_CATS).forEach(([key, cat]) => {
        gen[key] = shuffle([...cat.templates]).slice(0, 3).map((f, i) => ({
          id: `hook-${key}-${Date.now()}-${i}`, texto: f(k),
        }));
      });
      setHooks({ tema: k, nicho: nicho.trim(), ...gen });
      setThinking(false);
    }, 1100);
  };

  const masHooks = (catKey) => {
    if (!hooks) return;
    const nuevos = shuffle([...HOOK_CATS[catKey].templates]).slice(0, 2).map((f, i) => ({
      id: `hook-${catKey}-mas-${Date.now()}-${i}`, texto: f(hooks.tema),
    }));
    setHooks(prev => ({ ...prev, [catKey]: [...prev[catKey], ...nuevos] }));
  };

  const totalHooks = hooks ? Object.values(HOOK_CATS).reduce((s, _, i) => s + (hooks[Object.keys(HOOK_CATS)[i]]?.length || 0), 0) : 0;
  const EJEMPLOS = ["vender en WhatsApp", "cobrar sin miedo", "organizarme mejor", "conseguir clientas", "reels de negocio", "emprender con hijos"];

  const CAT_COLORS_BANCO = { curiosidad:"#4A90D9", dolor:"#C4526A", promesa:"#27AE60", pregunta:"#E8755A", historia:"#8B6565", numero:"#9B59B6", contraintuitivo:"#E67E22", identidad:"#16A085" };

  return (
    <div className="studio-tab-content">

      {/* ── BARRA DE BÚSQUEDA ─────────────────────────── */}
      <div className="hooks-search-area">
        <div className="ideas-search-bar">
          <span className="ideas-search-icon">🪝</span>
          <input
            className="ideas-search-input"
            placeholder="¿De qué trata tu video? Ej: vender, organizarme, reels, cobrar sin miedo..."
            value={tema}
            onChange={e => setTema(e.target.value)}
            onKeyDown={e => e.key === "Enter" && generar()}
          />
          <button className="ideas-search-btn" onClick={() => generar()} disabled={!tema.trim() || thinking}>
            Generar hooks ✦
          </button>
        </div>
        <input
          className="hooks-nicho-input"
          placeholder="¿A quién le hablas? (opcional) — mamás que venden desde casa, coaches, emprendedoras con hijos..."
          value={nicho}
          onChange={e => setNicho(e.target.value)}
        />
      </div>

      {/* ── ESTADO VACÍO ─────────────────────────────── */}
      {!hooks && !thinking && (
        <div className="ideas-empty">
          <div className="ideas-brain-glow">🪝</div>
          <h3>¿De qué trata tu próximo video?</h3>
          <p>Escribe el tema y te genero <strong>24+ hooks</strong> organizados en 8 tipos — para detener el scroll en los primeros 3 segundos.</p>
          <div className="ideas-chips">
            {EJEMPLOS.map(ej => (
              <button key={ej} className="ideas-chip" onClick={() => { setTema(ej); generar(ej); }}>{ej}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── PENSANDO ─────────────────────────────────── */}
      {thinking && (
        <div className="ideas-thinking">
          <div className="ideas-orbit-container">
            <div className="ideas-brain-orbit">🪝</div>
            {["🤔","😩","✨","❓","📖","🔢","🔄","🪞"].map((s, i) => (
              <div key={i} className={`ideas-orbit-item ideas-orbit-${i}`}>{s}</div>
            ))}
          </div>
          <p className="ideas-thinking-text">Creando hooks para tu video<span className="ideas-dots-anim">...</span></p>
        </div>
      )}

      {/* ── RESULTADOS ───────────────────────────────── */}
      {hooks && !thinking && (
        <>
          <div className="ideas-result-header">
            <div>
              <span className="ideas-kw-label">Hooks para </span>
              <strong className="ideas-kw-value">"{hooks.tema}"</strong>
              {hooks.nicho && <span className="hooks-nicho-badge"> · {hooks.nicho}</span>}
            </div>
            <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
              <span className="hooks-total-badge">{totalHooks} hooks</span>
              <button className="ideas-regen-btn" onClick={() => generar(hooks.tema)}>🔄 Nuevos hooks</button>
            </div>
          </div>

          {Object.entries(HOOK_CATS).map(([catKey, cat]) => (
            <div className="ideas-cat-section" key={catKey} style={{ "--cat-color": cat.color, "--cat-bg": cat.bg }}>
              <div className="ideas-cat-header">
                <div className="ideas-cat-title">
                  <span className="ideas-cat-label">{cat.label}</span>
                  <span className="ideas-cat-sub">{cat.sub}</span>
                </div>
                <button className="ideas-mas-btn" onClick={() => masHooks(catKey)}>+ Más hooks</button>
              </div>
              <div className="ideas-cards-grid">
                {hooks[catKey].map((hook, i) => (
                  <div className="ideas-card hooks-card" key={hook.id} style={{ animationDelay: `${i * 60}ms` }}>
                    <p className="hooks-card-text">{hook.texto}</p>
                    <div className="ideas-card-actions">
                      <button className="ideas-card-copy" onClick={() => copiar(hook.texto, hook.id)}>
                        {copiado === hook.id ? "✓ Copiado" : "Copiar"}
                      </button>
                      <button className="ideas-card-save" onClick={() => onSave("hooks", {
                        id: Date.now(), hook: hook.texto, cat: catKey,
                        tema: hooks.tema, fecha: new Date().toLocaleDateString("es"),
                      })}>Guardar</button>
                      <button className="ideas-card-guion" onClick={() => onCrearGuion?.(hook.texto)}>Guión 🎬</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── BANCO ───────────────────────────────────── */}
      {saved?.hooks?.length > 0 && (
        <div className="studio-bank">
          <h4>Hooks guardados ({saved.hooks.length})</h4>
          {saved.hooks.slice().reverse().map(h => (
            <div className="studio-bank-item" key={h.id}>
              <div className="studio-bank-item-top">
                <span className="studio-tipo-badge" style={{ background: CAT_COLORS_BANCO[h.cat] || "#8B6565" }}>
                  {HOOK_CATS[h.cat]?.label || h.cat}
                </span>
                <small>{h.fecha}</small>
              </div>
              <p style={{fontSize:"13px",color:"#2D1B1B",margin:"4px 0 6px",fontWeight:500}}>{h.hook}</p>
              <button className="studio-bank-action-copy" onClick={() => copiar(h.hook, `bank-${h.id}`)}>
                {copiado === `bank-${h.id}` ? "¡Copiado!" : "Copiar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── GUIÓN ──────────────────────────────────────────────────────
function GuionTab({ saved, onSave, seed, onSeedConsumed }) {
  const [subTab,    setSubTab]    = useState("guion");
  const [form,      setForm]      = useState({ tema: seed || "", objetivo: "Vender", tipo: "Reel (60s)", audiencia: "" });
  const [guion,     setGuion]     = useState(null);
  const [escritura, setEscritura] = useState({});
  const [c,         setC]         = useState({ red: "Instagram", tono: "Cercano", tema: "", cta: "", hashtags: true });
  const [caption,   setCaption]   = useState(null);
  const [copiado,   setCopiado]   = useState("");

  useEffect(() => { if (seed) { setForm(p => ({...p, tema: seed})); onSeedConsumed?.(); } }, []);

  const copiar = (t, k) => { navigator.clipboard.writeText(t); setCopiado(k); setTimeout(() => setCopiado(""), 2000); };
  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

  const buildEscenas = (tema, objetivo, tipo, aud) => {
    const isShort = !tipo.includes("YouTube");

    const HOOKS = {
      "Vender":   [ `¿Sabías que ${tema} puede transformar tus ventas sin tener que cambiar quién eres?`, `Esto sobre ${tema} me costó años entenderlo. Hoy te lo doy en un minuto.`, `Hay una forma de ${tema} que casi nadie usa — y cuando la aplicas, todo cambia.` ],
      "Conectar": [ `Tengo que contarte algo sobre ${tema} que cambió todo para mí.`, `El día que entendí ${tema}, sentí un alivio que no esperaba. Quiero que tú también lo sientas.`, `Nadie me dijo esto sobre ${tema} cuando más lo necesitaba. Y hoy lo cambio.` ],
      "Educar":   [ `Hoy te enseño sobre ${tema} lo que ojalá alguien me hubiera dicho cuando empecé.`, `${tema}: lo más importante que necesitas saber — en menos de 60 segundos.`, `Esto sobre ${tema} marca la diferencia entre las que avanzan y las que se estancan.` ],
      "Inspirar": [ `${tema} me parecía imposible. Hasta que cambié una sola cosa.`, `Si alguien me hubiera dicho que ${tema} era posible para mí, lo habría intentado antes.`, `Quiero que sepas que ${tema} SÍ es posible para ti. Aunque ahora no puedas creerlo.` ],
    };
    const ACCION = {
      "Vender":   [ `"Escríbeme '${tema.split(" ")[0].toUpperCase()}' en los comentarios y te cuento el siguiente paso."`, `"Si esto te resonó, el link está en mi bio. Hay un espacio para ti."`, `"Mándame un DM — hablemos de cómo puedo ayudarte específicamente."` ],
      "Conectar": [ `"Comenta con una sola palabra cómo te sentiste. Me encanta leerte."`, `"Guarda este video — lo vas a querer tener cuando lo necesites."`, `"¿A quién le hace falta escuchar esto hoy? Compártelo con ella."` ],
      "Educar":   [ `"Guarda este video — lo vas a querer consultar cuando lo apliques."`, `"Sígueme para que no te pierdas lo que viene."`, `"Comparte esto con alguien que también está aprendiendo ${tema}."` ],
      "Inspirar": [ `"Guarda este video para los días difíciles — como recordatorio de que sí puedes."`, `"Cuéntame en comentarios: ¿qué cambiarías hoy con esto en mente?"`, `"Sígueme — esto es solo el principio de lo que tengo para ti."` ],
    };

    return [
      {
        num: "01", nombre: "HOOK", subtitulo: "Los primeros 3 segundos",
        tiempo: "0:00 – 0:03", color: "#1B2A4A", bgLight: "#EEF2F8",
        emocion: "CURIOSIDAD · IDENTIDAD",
        guia: `Los primeros 3 segundos deciden si te siguen viendo o hacen scroll. Una frase que las haga pensar "eso me pasa a mí" o "necesito escuchar esto".`,
        frases: HOOKS[objetivo] || HOOKS["Conectar"],
        palabras: ["¿Sabías que...?", "Esto me costó entender", "Lo que nadie dice", "¿Te ha pasado?", "Hay una forma"],
        nota: null,
        placeholder: "Escribe tu gancho — una pregunta, afirmación o frase de identidad que detenga el scroll...",
      },
      {
        num: "02", nombre: "INTERÉS", subtitulo: "Hazla sentir vista",
        tiempo: isShort ? "0:03 – 0:15" : "0:03 – 0:20", color: "#C4526A", bgLight: "#FFF0F3",
        emocion: "EMPATÍA · DOLOR RECONOCIDO",
        guia: `No des la solución todavía. Solo hazlas sentir completamente VISTAS y ENTENDIDAS. Que digan "eso es exactamente lo que siento".`,
        frases: [
          `"Sé que ${aud} lucha con ${tema}. Y lo más duro no es el obstáculo — es sentir que por más que lo intentas, no avanzas."`,
          `"¿Te ha pasado que haces todo lo que dicen y aun así ${tema} no funciona? Exactamente así se siente. Es agotador."`,
          `"La verdad sobre ${tema} es que nadie dice lo difícil que puede ser. En redes se ve fácil. Pero la realidad es otra — y tú lo sabes."`,
        ],
        palabras: ["Sé exactamente cómo se siente", "No estás sola", "¿Te ha pasado?", "Es agotador", "Y encima tienes que..."],
        nota: `Miedo que activas: sentir que trabajan duro y no avanzan. Que las demás lo logran y ellas no.`,
        placeholder: "Habla de su realidad, su dolor, lo que siente. Sin juzgar. Sin soluciones todavía — solo hazla sentir que la entiendes...",
      },
      {
        num: "03", nombre: "DESEO", subtitulo: "Pinta su transformación",
        tiempo: isShort ? "0:15 – 0:45" : "0:20 – 0:50", color: "#27AE60", bgLight: "#EEFAF3",
        emocion: "TRANSFORMACIÓN · ESPERANZA",
        guia: `Aquí pintas el SUEÑO — no el producto todavía. La vida que tendrán cuando esto se resuelva. Sé visual, específica, emocional.`,
        frases: [
          `"Imagina que ${tema} deja de pesarte. Que en lugar de resistirte, fluye y trabaja para ti."`,
          `"¿Qué pasaría si pudieras ${tema} con seguridad — sin dudar de ti, sin el miedo al error?"`,
          `"Mereces que ${tema} sea tu fortaleza, no tu carga. Ese lugar existe. Yo te muestro el camino."`,
        ],
        palabras: ["Imagina que...", "¿Qué pasaría si...?", "Mereces...", "Sin tener que...", "Con seguridad", "Es posible"],
        nota: `Deseo que activas: libertad, resultados visibles, ser valorada — sin sacrificar lo que más les importa.`,
        placeholder: "Describe la vida que puede tener cuando esto se resuelva. Usa 'imagina', 'mereces', '¿qué pasaría si...'...",
      },
      {
        num: "04", nombre: "ACCIÓN", subtitulo: "Una sola instrucción clara",
        tiempo: isShort ? "0:45 – 0:60" : "0:50 – 1:00", color: "#E8755A", bgLight: "#FFF5F0",
        emocion: "DECISIÓN · CONFIANZA",
        guia: `Una sola acción, fácil de hacer en 10 segundos. Sin presionar — invitando. La confianza que construiste en el video ya hizo el trabajo.`,
        frases: ACCION[objetivo] || ACCION["Conectar"],
        palabras: ["Escríbeme", "Guarda este video", "Sígueme", "Comenta con", "Link en mi bio", "Hay un lugar para ti"],
        nota: null,
        placeholder: "El cierre — una sola acción. Simple, directa, sin presión. Ella ya está lista porque la preparaste bien...",
      },
    ];
  };

  const generarGuion = () => {
    if (!form.tema.trim()) return;
    const aud = form.audiencia.trim() || "tu audiencia";
    setGuion({
      tema: form.tema, objetivo: form.objetivo, tipo: form.tipo, audiencia: aud,
      escenas: buildEscenas(form.tema, form.objetivo, form.tipo, aud),
      fecha: new Date().toLocaleDateString("es"),
    });
    setEscritura({});
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const downloadWordGuion = () => {
    if (!guion) return;
    let scenesHtml = "";
    guion.escenas.forEach((esc, i) => {
      const txt = escritura[i];
      scenesHtml += `<div style="border-left:5px solid ${esc.color};padding:20px 24px;margin:20px 0;background:${esc.bgLight};border-radius:0 12px 12px 0;">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
          <span style="font-size:32px;font-weight:900;color:${esc.color};font-family:Georgia,serif;line-height:1;">${esc.num}</span>
          <div><div style="font-size:18px;font-weight:900;color:#2D1B1B;font-family:Arial;">${esc.nombre} <span style="font-size:13px;color:#9A7878;font-style:italic;">— ${esc.subtitulo}</span></div>
          <div style="margin-top:4px;"><span style="font-size:10px;font-weight:800;background:${esc.color};color:white;border-radius:4px;padding:2px 9px;font-family:Arial;">${esc.emocion}</span>&nbsp;<span style="font-size:11px;color:#9A7878;font-family:Arial;">⏱ ${esc.tiempo}</span></div></div>
        </div>
        <div style="background:rgba(255,255,255,0.7);border-left:3px solid ${esc.color};border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:12px;">
          <p style="font-size:12px;color:#555;margin:0;font-style:italic;font-family:Arial;">💡 ${esc.guia}</p></div>
        ${esc.nota ? `<p style="font-size:12px;color:#666;margin:0 0 12px;font-family:Arial;">🎯 ${esc.nota}</p>` : ""}
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#2D1B1B;margin:0 0 6px;font-family:Arial;">FRASES SUGERIDAS</p>
        ${esc.frases.map(f => `<div style="background:white;border-radius:6px;padding:9px 12px;margin:5px 0;font-family:Arial;font-size:13px;color:#2D1B1B;"><span style="color:${esc.color};font-weight:700;">✦</span> ${f}</div>`).join("")}
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#2D1B1B;margin:14px 0 6px;font-family:Arial;">PALABRAS QUE TOCAN CORAZONES</p>
        <p style="font-size:12px;color:${esc.color};font-family:Arial;margin:0 0 14px;">${esc.palabras.join(" · ")}</p>
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#2D1B1B;margin:0 0 6px;font-family:Arial;">✍ TU VERSIÓN</p>
        <div style="background:white;border:1.5px solid ${txt ? esc.color : "#ddd"};border-radius:8px;padding:16px;min-height:70px;font-family:Arial;font-size:13px;color:${txt ? "#2D1B1B" : "#ccc"};white-space:pre-wrap;">${txt || esc.placeholder}</div>
      </div>`;
    });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Guión: ${guion.tema}</title></head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;">
    <div style="background:linear-gradient(135deg,#1B2A4A,#2D3F6B);padding:36px 40px;color:white;">
      <p style="font-size:10px;color:rgba(255,255,255,0.5);margin:0 0 8px;letter-spacing:1.5px;text-transform:uppercase;">Mamá CEO · Studio de Contenido · GUIÓN</p>
      <h1 style="color:white;margin:0 0 12px;font-size:28px;font-family:Arial;">${guion.tema}</h1>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <span style="font-size:11px;background:rgba(255,255,255,0.15);color:white;border-radius:4px;padding:3px 10px;font-family:Arial;">${guion.tipo}</span>
        <span style="font-size:11px;background:rgba(255,255,255,0.15);color:white;border-radius:4px;padding:3px 10px;font-family:Arial;">Objetivo: ${guion.objetivo}</span>
        ${guion.audiencia ? `<span style="font-size:11px;background:rgba(255,255,255,0.15);color:white;border-radius:4px;padding:3px 10px;font-family:Arial;">Para: ${guion.audiencia}</span>` : ""}
      </div>
    </div>
    <div style="max-width:700px;margin:0 auto;padding:32px 40px;">${scenesHtml}</div>
    <div style="border-top:1px solid #eee;padding:14px 40px;text-align:center;"><p style="font-size:11px;color:#ccc;font-family:Arial;">Creado con Studio de Contenido · Mamá CEO App</p></div>
    </body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `Guion - ${guion.tema.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ]/g,"").trim()}.doc`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const generarCaption = () => {
    if (!c.tema) return;
    const intros = { "Cercano": `Oye, te cuento algo sobre ${c.tema} 👇`, "Profesional": `Hablemos de ${c.tema}. Esto es lo que necesitas saber:`, "Emotivo": `${c.tema} cambió algo en mí que quiero compartir contigo.`, "Directo": `${c.tema}: aquí van los puntos clave.`, "Divertido": `${c.tema}... sí, vamos a hablar de eso 😅👇` };
    const tags = c.hashtags ? `\n\n#mamáemprendedora #negociodesdehogar #emprendimiento #mamáceo #marketingdigital #mujeresemprendedoras` : "";
    setCaption(`${intros[c.tono]}\n\n[Desarrolla tu punto principal — 3 a 5 líneas, con saltos para facilitar la lectura]\n\n${c.cta ? `👉 ${c.cta}` : ""}${tags}`);
  };

  return (
    <div className="studio-tab-content">
      <div className="studio-mode-toggle">
        <button className={subTab === "guion" ? "active" : ""} onClick={() => setSubTab("guion")}>Guión 🎬</button>
        <button className={subTab === "caption" ? "active" : ""} onClick={() => setSubTab("caption")}>Caption 📝</button>
      </div>

      {/* ── SUB-TAB GUIÓN ──────────────────────────── */}
      {subTab === "guion" && (
        <>
          {/* FORM */}
          {!guion && (
            <div className="guion-form-wrap">
              <div className="guion-form-intro">
                <div className="mpm-landing-badge" style={{margin:"0 auto 4px"}}>🎬</div>
                <h2>Crea tu guión</h2>
                <p>Estructura con intención — frases que conectan, palabras que transforman y espacio para tu voz.</p>
              </div>

              <div className={`desc-q-card${form.tema ? " filled" : ""}`}>
                <div className="desc-q-num">🎬</div>
                <div className="desc-q-body">
                  <div className="desc-q-top">
                    <label className="desc-q-label">¿De qué trata tu video?</label>
                  </div>
                  <input className="desc-q-input" autoFocus
                    placeholder="cómo vender sin presionar, organizar el tiempo, reels de negocio..."
                    value={form.tema} onChange={e => setForm(p => ({...p, tema: e.target.value}))}
                    onKeyDown={e => e.key === "Enter" && generarGuion()} />
                  <span className="desc-q-hint">Entre más específico, más poderoso el guión</span>
                </div>
              </div>

              <div className="guion-obj-grid">
                <div className="guion-obj-group">
                  <label className="lm-crear-label">¿Para qué es este video?</label>
                  <div className="guion-obj-pills">
                    {[{k:"Vender",i:"💰"},{k:"Conectar",i:"💙"},{k:"Educar",i:"📖"},{k:"Inspirar",i:"⚡"}].map(o => (
                      <button key={o.k} className={`guion-obj-pill${form.objetivo===o.k?" active":""}`}
                        onClick={() => setForm(p => ({...p, objetivo: o.k}))}>{o.i} {o.k}</button>
                    ))}
                  </div>
                </div>
                <div className="guion-obj-group">
                  <label className="lm-crear-label">Tipo de video</label>
                  <div className="guion-obj-pills">
                    {[{k:"Reel (60s)",i:"📱"},{k:"TikTok (30-60s)",i:"🎵"},{k:"Historia 3 partes",i:"📖"},{k:"YouTube (3-5 min)",i:"🎬"}].map(t => (
                      <button key={t.k} className={`guion-obj-pill${form.tipo===t.k?" active":""}`}
                        onClick={() => setForm(p => ({...p, tipo: t.k}))}>{t.i} {t.k}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`desc-q-card${form.audiencia?" filled":""}`}>
                <div className="desc-q-num">👩‍💼</div>
                <div className="desc-q-body">
                  <div className="desc-q-top">
                    <label className="desc-q-label">¿Para quién es? (opcional)</label>
                  </div>
                  <input className="desc-q-input"
                    placeholder="mamás emprendedoras que quieren vender más, coaches que empiezan..."
                    value={form.audiencia} onChange={e => setForm(p => ({...p, audiencia: e.target.value}))} />
                  <span className="desc-q-hint">Si lo dejas vacío, el guión habla a mamás emprendedoras en general</span>
                </div>
              </div>

              <button className="mpm-step-btn" onClick={generarGuion} disabled={!form.tema.trim()}>
                Generar guión ✦
              </button>
            </div>
          )}

          {/* SCRIPT DOCUMENT */}
          {guion && (
            <div className="guion-hoja-wrap">
              <div className="guion-hoja-topbar">
                <button className="mpm-wizard-back-btn" onClick={() => setGuion(null)}>← Editar</button>
                <div className="guion-hoja-actions">
                  <button className="mpm-edit-btn" onClick={() => onSave("guiones", { id: Date.now(), tema: guion.tema, tipo: guion.tipo, objetivo: guion.objetivo, fecha: guion.fecha })}>
                    Guardar 🎬
                  </button>
                  <button className="lm-dl-btn lm-dl-btn--word" onClick={downloadWordGuion}>⬇ Word</button>
                  <button className="lm-dl-btn lm-dl-btn--pdf" onClick={() => window.print()}>🖨️ PDF</button>
                </div>
              </div>

              <div className="guion-print-area">
                {/* Header cinematográfico */}
                <div className="guion-doc-header">
                  <span className="guion-doc-brand">Mamá CEO · Studio de Contenido · GUIÓN</span>
                  <h1 className="guion-doc-title">{guion.tema}</h1>
                  <div className="guion-doc-meta-row">
                    <span className="guion-doc-meta-badge">{guion.tipo}</span>
                    <span className="guion-doc-meta-badge">Objetivo: {guion.objetivo}</span>
                    {guion.audiencia && <span className="guion-doc-meta-badge">Para: {guion.audiencia}</span>}
                    <span className="guion-doc-meta-badge">{guion.fecha}</span>
                  </div>
                </div>

                {/* Escenas */}
                <div className="guion-escenas">
                  {guion.escenas.map((esc, i) => (
                    <div key={i} className="guion-escena" style={{"--scene-color": esc.color, "--scene-bg": esc.bgLight}}>
                      <div className="guion-escena-strip" />
                      <div className="guion-escena-content">

                        <div className="guion-escena-header">
                          <span className="guion-escena-num">{esc.num}</span>
                          <div className="guion-escena-title-group">
                            <div className="guion-escena-name-row">
                              <h2 className="guion-escena-nombre">{esc.nombre}</h2>
                              <span className="guion-escena-sub">— {esc.subtitulo}</span>
                            </div>
                            <div className="guion-escena-badges">
                              <span className="guion-escena-tiempo">⏱ {esc.tiempo}</span>
                              <span className="guion-escena-emocion" style={{background: esc.color}}>{esc.emocion}</span>
                            </div>
                          </div>
                        </div>

                        <div className="guion-guia-box">
                          <span>💡</span>
                          <p>{esc.guia}</p>
                        </div>

                        {esc.nota && (
                          <div className="guion-nota-box">
                            <span>🎯</span>
                            <p>{esc.nota}</p>
                          </div>
                        )}

                        <div className="guion-frases-section">
                          <div className="guion-frases-title">Frases que puedes usar o adaptar:</div>
                          {esc.frases.map((frase, j) => (
                            <div key={j} className="guion-frase-row">
                              <span className="guion-frase-mark">✦</span>
                              <p className="guion-frase-text">{frase}</p>
                              <button className="guion-frase-copy" onClick={() => copiar(frase, `f-${i}-${j}`)}>
                                {copiado === `f-${i}-${j}` ? "✓" : "Copiar"}
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="guion-palabras-section">
                          <div className="guion-palabras-title">Palabras que tocan corazones:</div>
                          <div className="guion-palabras-row">
                            {esc.palabras.map((pw, j) => (
                              <span key={j} className="guion-palabra-chip"
                                style={{background: esc.bgLight, color: esc.color, borderColor: esc.color + "55"}}>
                                {pw}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="guion-write-section">
                          <div className="guion-write-label">✍ Tu versión:</div>
                          <textarea
                            className="guion-write-textarea"
                            placeholder={esc.placeholder}
                            value={escritura[i] || ""}
                            onChange={e => setEscritura(p => ({...p, [i]: e.target.value}))}
                            rows={4}
                          />
                        </div>

                      </div>
                    </div>
                  ))}
                </div>

                <div className="guion-doc-footer">
                  <p>Creado con Studio de Contenido · Mamá CEO App</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── SUB-TAB CAPTION ────────────────────────── */}
      {subTab === "caption" && (
        <div className="studio-two-col">
          <div className="studio-form-card">
            <h3>Caption para Redes</h3>
            <p className="studio-helper">Genera la estructura de tu descripción lista para completar y publicar.</p>
            <label>Red social</label>
            <select value={c.red} onChange={e => setC(p => ({...p, red: e.target.value}))}>
              {["Instagram","TikTok","YouTube","Facebook"].map(r => <option key={r}>{r}</option>)}
            </select>
            <label>Tono</label>
            <select value={c.tono} onChange={e => setC(p => ({...p, tono: e.target.value}))}>
              {["Cercano","Profesional","Emotivo","Directo","Divertido"].map(t => <option key={t}>{t}</option>)}
            </select>
            <label>Tema del post</label>
            <input placeholder="cómo le digo el precio sin miedo" value={c.tema} onChange={e => setC(p => ({...p, tema: e.target.value}))} />
            <label>CTA</label>
            <input placeholder="Guarda este post / Comenta SÍ si te pasó" value={c.cta} onChange={e => setC(p => ({...p, cta: e.target.value}))} />
            <label className="studio-checkbox-label">
              <input type="checkbox" checked={c.hashtags} onChange={e => setC(p => ({...p, hashtags: e.target.checked}))} />
              Incluir hashtags
            </label>
            <button className="studio-btn-primary" onClick={generarCaption}>Generar caption 📝</button>
          </div>
          <div className="studio-result-card">
            {!caption ? (
              <div className="studio-empty-state"><span>📝</span><p>Tu estructura de caption aparecerá aquí, lista para completar con tu texto.</p></div>
            ) : (
              <>
                <label style={{fontSize:"11px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",color:"var(--muted)"}}>Caption para {c.red} · Tono {c.tono}</label>
                <textarea className="studio-caption-edit" value={caption} onChange={e => setCaption(e.target.value)} rows={11} />
                <button className="studio-copy-btn" onClick={() => copiar(caption, "caption")}>{copiado === "caption" ? "¡Copiado!" : "Copiar caption"}</button>
                <button className="studio-btn-save" style={{marginTop:"8px"}} onClick={() => onSave("captions", { id: Date.now(), caption, red: c.red, tema: c.tema, fecha: new Date().toLocaleDateString("es") })}>Guardar caption</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── BANCO ────────────────────────────────────── */}
      {saved?.guiones?.length > 0 && subTab === "guion" && (
        <div className="studio-bank">
          <h4>Guiones guardados ({saved.guiones.length})</h4>
          {saved.guiones.slice().reverse().map(g => (
            <div className="studio-bank-item" key={g.id}>
              <div className="studio-bank-item-top">
                <span className="studio-tipo-badge" style={{background:"#1B2A4A"}}>{g.tipo || "Guión"}</span>
                <small>{g.fecha}</small>
              </div>
              <strong style={{fontSize:"13px"}}>{g.tema}</strong>
              {g.objetivo && <span style={{fontSize:"11px",color:"#9A7878",marginLeft:"8px"}}>· {g.objetivo}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── EMAIL ──────────────────────────────────────────────────────
function EmailTab({ saved, onSave }) {
  const [objetivo, setObjetivo] = useState("Lanzar producto");
  const [comunicar, setComunicar] = useState("");
  const [campania, setCampania] = useState(null);
  const [copiado, setCopiado] = useState("");

  const ESTRUCTURAS = {
    "Lanzar producto": [
      { num: 1, asunto: "🎉 Ya está aquí — [nombre del producto]",           prop: "Anuncio emocional — cuenta la historia de por qué lo creaste",          cta: "Conoce todos los detalles" },
      { num: 2, asunto: "¿Para quién es esto exactamente?",                  prop: "Educación — describe a quién ayuda y qué problema resuelve",             cta: "¿Eres tú? Entra aquí" },
      { num: 3, asunto: "Esto dice alguien que ya lo vivió 💬",              prop: "Prueba social — testimonio real + transformación específica",            cta: "Quiero ese resultado" },
      { num: 4, asunto: "Últimas horas ⏰",                                  prop: "Urgencia + resumen del beneficio principal + fecha límite real",         cta: "Me uno antes del cierre" },
    ],
    "Nutrir lista": [
      { num: 1, asunto: "Un tip rápido que puedes aplicar hoy",              prop: "Valor puro — una sola idea aplicable, sin venta",                       cta: "¿Quieres más como este?" },
      { num: 2, asunto: "Mi historia con [tema de la semana]",               prop: "Conexión — algo personal relacionado a la situación de tu audiencia",   cta: "Esto también es para ti" },
      { num: 3, asunto: "Una pregunta importante para ti",                   prop: "Engagement — haz una pregunta y pídeles que respondan",                 cta: "Respóndeme aquí" },
    ],
    "Recuperar inactivos": [
      { num: 1, asunto: "¿Sigues ahí? Te extrañé 🙋",                       prop: "Reconexión — quién eres y por qué se suscribieron",                     cta: "Sigo aquí" },
      { num: 2, asunto: "Esto cambió y quería que lo supieras",              prop: "Novedad — algo que no sabían que tienes ahora",                         cta: "Quiero saber más" },
      { num: 3, asunto: "¿Me lees o me doy de baja?",                       prop: "Limpieza honesta — pídeles que confirmen su interés",                   cta: "Sigo suscrita, me quedo" },
    ],
    "Bienvenida a suscriptores": [
      { num: 1, asunto: "¡Bienvenida! Aquí está tu regalo 🎁",               prop: "Entrega del lead magnet prometido + quién eres en 3 líneas",            cta: "Descargar mi regalo" },
      { num: 2, asunto: "Por qué empecé todo esto...",                       prop: "Tu historia — la razón de fondo que conecta con tu audiencia",          cta: "Seguir leyendo" },
      { num: 3, asunto: "Mis 3 mejores recursos para ti",                    prop: "Curación — tus mejores piezas de contenido gratuito",                   cta: "Ver los recursos" },
    ],
    "Venta directa": [
      { num: 1, asunto: "Una oportunidad especial, solo para ti",            prop: "Exclusividad + beneficio principal del producto",                       cta: "Ver la oferta" },
      { num: 2, asunto: "Las dudas más frecuentes — las resuelvo aquí",      prop: "Objeciones — responde las 3 más comunes de tu audiencia",               cta: "Ya no tengo dudas, quiero entrar" },
      { num: 3, asunto: "Hoy es el último día ⏰",                           prop: "Urgencia + resumen completo de lo que se llevan",                       cta: "Entrar antes del cierre" },
    ],
    "Compartir valor": [
      { num: 1, asunto: "Esto me pasó esta semana y quería contarte",        prop: "Storytelling + aprendizaje + aplicación práctica para tu audiencia",    cta: "Comparte si te resonó" },
      { num: 2, asunto: "El recurso que más me han pedido",                  prop: "Entrega de valor — guía, checklist o consejo concreto",                 cta: "Descargar / Ver recurso" },
    ],
  };

  const generar = () => {
    if (!comunicar.trim()) return;
    setCampania({ objetivo, comunicar: comunicar.trim(), emails: ESTRUCTURAS[objetivo] || [] });
  };

  const copiar = (text, key) => { navigator.clipboard.writeText(text); setCopiado(key); setTimeout(() => setCopiado(""), 2000); };

  return (
    <div className="studio-tab-content">
      <div className="studio-two-col">
        <div className="studio-form-card">
          <h3>Campaña de Email</h3>
          <p className="studio-helper">Dinos el objetivo y qué quieres comunicar — generamos el plan completo de la secuencia.</p>
          <label>Objetivo de la campaña</label>
          <select value={objetivo} onChange={e => setObjetivo(e.target.value)}>
            {Object.keys(ESTRUCTURAS).map(o => <option key={o}>{o}</option>)}
          </select>
          <label>¿Qué quieres comunicar?</label>
          <textarea
            placeholder="Ej: Quiero lanzar mi programa de 8 semanas para mamás que quieren vender más. El precio es $197. Empieza el 15 de julio."
            value={comunicar} onChange={e => setComunicar(e.target.value)} rows={5}
          />
          <button className="studio-btn-primary" onClick={generar}>Generar campaña 📧</button>
        </div>
        <div className="studio-result-card">
          {!campania ? (
            <div className="studio-empty-state"><span>📧</span><p>Tu plan de campaña aparecerá aquí con asunto, propósito y CTA de cada email.</p></div>
          ) : (
            <>
              <div className="studio-result-header"><strong>{campania.objetivo}</strong> · {campania.emails.length} emails</div>
              <div className="studio-email-plan">
                {campania.emails.map((email, i) => (
                  <div className="studio-email-item" key={i}>
                    <div className="studio-email-num">Email {email.num}</div>
                    <div className="studio-email-body">
                      <div className="studio-email-asunto">
                        <span>Asunto:</span>
                        <strong>{email.asunto}</strong>
                        <button className="studio-copy-btn small" onClick={() => copiar(email.asunto, `as-${i}`)}>{copiado === `as-${i}` ? "✓" : "Copiar"}</button>
                      </div>
                      <p className="studio-email-prop"><strong>Propósito:</strong> {email.prop}</p>
                      <p className="studio-email-cta"><strong>CTA:</strong> {email.cta}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="studio-btn-save" onClick={() => onSave("campanias", { id: Date.now(), ...campania, fecha: new Date().toLocaleDateString("es") })}>Guardar campaña</button>
            </>
          )}
        </div>
      </div>

      {saved?.campanias?.length > 0 && (
        <div className="studio-bank">
          <h4>Campañas guardadas ({saved.campanias.length})</h4>
          {saved.campanias.slice().reverse().map(c => (
            <div className="studio-bank-item" key={c.id}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <strong>{c.objetivo}</strong><small style={{color:"var(--muted)"}}>{c.fecha}</small>
              </div>
              <p style={{fontSize:"13px",color:"var(--muted)",margin:0}}>{c.comunicar.slice(0, 80)}{c.comunicar.length > 80 ? "..." : ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── STUDIO PRINCIPAL ───────────────────────────────────────────
export default function Studio({ onBack }) {
  const [activeTab, setActiveTab] = useState("mensaje");
  const [data, setData] = useState(() => loadStudio());
  const [guionSeed, setGuionSeed] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => { saveStudio(data); }, [data]);

  const TOAST_LABELS = { mensajes: "Mensaje guardado ✦", ideas: "Idea guardada 💡", leads: "Lead magnet guardado 🎁", hooks: "Hook guardado 🪝", guiones: "Guión guardado 🎬", captions: "Caption guardado", campanias: "Campaña guardada 📧" };
  const showToast = (tipo) => { setToast(TOAST_LABELS[tipo] || "Guardado ✦"); setTimeout(() => setToast(null), 2500); };
  const handleSave = (tipo, item) => { setData(prev => ({ ...prev, [tipo]: [...(prev[tipo] || []), item] })); showToast(tipo); };
  const handleDelete = (tipo, id) => setData(prev => ({ ...prev, [tipo]: (prev[tipo] || []).filter(i => i.id !== id) }));
  const handleCrearGuion = (texto) => {
    setGuionSeed(texto);
    setActiveTab("guion");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };
  const tabProps = { saved: data, onSave: handleSave, onDelete: handleDelete };

  return (
    <div className="studio-shell">
      {toast && <div className="studio-toast">{toast}</div>}
      <header className="studio-header">
        <button className="studio-back-btn" onClick={onBack}>← Volver</button>
        <span className="studio-title-text">Studio de Contenido</span>
        <nav className="studio-tabs-nav">
          {TABS.map(tab => (
            <button key={tab.id} className={`studio-tab-btn ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
              <span className="studio-tab-icon">{tab.icon}</span>
              <span className="studio-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>
      <main className="studio-main">
        {activeTab === "mensaje"  && <MensajeTab    {...tabProps} />}
        {activeTab === "ideas"    && <IdeasTab      {...tabProps} onCrearGuion={handleCrearGuion} />}
        {activeTab === "lead"     && <LeadMagnetTab {...tabProps} />}
        {activeTab === "hooks"    && <HooksTab      {...tabProps} onCrearGuion={handleCrearGuion} />}
        {activeTab === "guion"    && <GuionTab      {...tabProps} seed={guionSeed} onSeedConsumed={() => setGuionSeed("")} />}
        {activeTab === "email"    && <EmailTab      {...tabProps} />}
      </main>
    </div>
  );
}
