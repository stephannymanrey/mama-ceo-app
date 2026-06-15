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
  { id: "mensaje",     icon: "✦",  label: "Mensaje"      },
  { id: "ideas",       icon: "💡", label: "Ideas"         },
  { id: "lead",        icon: "🎁", label: "Lead Magnet"   },
  { id: "hooks",       icon: "🪝", label: "Hooks"         },
  { id: "guion",       icon: "🎬", label: "Guión"         },
  { id: "reproposito", icon: "♻️", label: "Repropósito"   },
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

// ── BLUEPRINTS DE PRODUCTOS DIGITALES ─────────────────────────
const BLUEPRINTS = {
  "Mini-guía PDF": {
    emoji:"📄", color:"#C4526A", bg:"#FFF0F3",
    descripcion:"Un PDF de 10 a 20 páginas que resuelve un problema muy específico. Es el producto de entrada ideal: fácil de crear y fácil de comprar.",
    estructura:["Portada atractiva con tu marca","Introducción: el problema que resuelves y tu promesa","3 a 5 secciones de contenido accionable","Checklist o resumen de puntos clave","Página final con CTA (siguiente oferta o servicio)"],
    pasos:["Define el problema específico que resuelves en una sola línea","Escribe el contenido en Google Docs (máx. 15 páginas)","Diseña las páginas en Canva usando tus colores de marca","Exporta como PDF","Crea una página de venta en Stan Store, Gumroad o Payhip","Graba 1 reel mostrando el antes/después de quien lo aplique"],
    tiempo:"3 – 7 días", precio:"$9 – $27 USD",
    plataformas:["Gumroad","Stan Store","Payhip","Hotmart"],
    tip:"Precio de entrada perfecto para construir confianza. Si no lo compran a $9, tampoco comprarán tu curso de $197. Empieza aquí."
  },
  "Masterclass": {
    emoji:"🎓", color:"#C9903A", bg:"#FFF8ED",
    descripcion:"Una clase grabada de 60 a 90 minutos que enseña un resultado concreto. La asistente se va con claridad y un plan de acción.",
    estructura:["Introducción: quién eres y por qué eres la persona indicada (5 min)","El problema y por qué la mayoría falla (10 min)","Tu método paso a paso (40-60 min)","Resumen y ejercicio de cierre (10 min)","CTA final: siguiente paso o upsell a tu servicio"],
    pasos:["Define el resultado exacto que logra al terminar","Crea un outline de 4-6 partes (no más de 6 temas)","Graba con Loom, Zoom o tu cámara directamente","Edita en CapCut o DaVinci — solo corta las pausas largas","Sube a Hotmart, Kajabi o Google Drive + landing simple","Crea urgencia con precio de lanzamiento o acceso limitado"],
    tiempo:"1 – 2 semanas", precio:"$27 – $97 USD",
    plataformas:["Hotmart","Kajabi","Teachable","Stan Store"],
    tip:"No tienes que ser perfecta en cámara. La autenticidad vende más que la producción. Grábala en una sola sesión."
  },
  "Pack de plantillas": {
    emoji:"🗂️", color:"#27AE60", bg:"#EEFAF3",
    descripcion:"Un conjunto de 5 a 15 plantillas editables en Canva, Notion o Google Sheets que ahorran tiempo a tu cliente ideal.",
    estructura:["3 a 5 plantillas en Canva (diseño visual)","1 a 3 plantillas en Notion o Google Sheets (organización)","Instrucciones de uso en PDF o video corto de 5 min","Ejemplos de cómo usarlas completadas","Guía rápida de personalización con tu marca"],
    pasos:["Elige las plantillas que más te piden o más usas tú misma","Crea copias en Canva y habilita 'Compartir como plantilla'","Para Notion: duplícalas como página pública con instrucciones","Crea un PDF guía con capturas y links de acceso","Empaqueta en un ZIP o página de Notion con todos los links","Vende en Gumroad, Stan Store o Etsy (sí, Etsy funciona para digitales)"],
    tiempo:"2 – 5 días", precio:"$17 – $47 USD",
    plataformas:["Gumroad","Stan Store","Etsy","Payhip"],
    tip:"Las plantillas de Canva son las que más se venden. Si tu audiencia ya usa Canva, este es tu producto más fácil de crear."
  },
  "Mini-curso": {
    emoji:"🎬", color:"#4A90D9", bg:"#EEF5FF",
    descripcion:"Un curso de 3 a 5 módulos en video (15-30 min cada uno) enfocado en un resultado claro. Sin sobreproducción — enfocado en transformación.",
    estructura:["Módulo 0: Bienvenida y cómo aprovechar el curso","Módulos 1-3: El contenido principal dividido en pasos lógicos","Ejercicios o tareas prácticas por módulo","Módulo final: Plan de acción y siguientes pasos","Bonus: plantilla, guía o sesión Q&A grabada"],
    pasos:["Define el resultado en una sola frase: 'Al terminar podrás/sabrás/tendrás...'","Divide el proceso en 3 o 5 pasos lógicos (cada paso = un módulo)","Graba cada módulo por separado — más fácil de reeditar","Diseña las diapositivas en Canva o presenta desde pantalla con Loom","Súbelo a Hotmart o Kajabi y configura el acceso","Lanza primero como beta a precio reducido para conseguir testimonios"],
    tiempo:"2 – 4 semanas", precio:"$47 – $197 USD",
    plataformas:["Hotmart","Kajabi","Teachable","Podia"],
    tip:"Lanza primero a tu lista o comunidad a precio de beta. Los primeros testimonios valen más que cualquier marketing pagado."
  },
  "Ebook": {
    emoji:"📚", color:"#E8755A", bg:"#FFF5F0",
    descripcion:"Una guía completa de 30 a 60 páginas que cubre un tema en profundidad. Posiciona tu expertise y genera ingresos pasivos de largo plazo.",
    estructura:["Portada profesional + página de derechos de autor","Índice de contenido","Introducción: por qué escribiste esto y para quién es","4 a 8 capítulos con el contenido principal","Conclusión + plan de acción","Sobre la autora + recursos y links"],
    pasos:["Elige un tema donde tienes experiencia real y resultados comprobados","Escribe el índice completo antes de escribir una sola página","Redacta capítulo por capítulo — no intentes hacerlo de un tirón","Diseña en Canva Pro o contrata maquetación en Fiverr","Revisa y edita en 2-3 rondas","Publica en Amazon KDP (versión Kindle) + Gumroad (PDF)"],
    tiempo:"3 – 6 semanas", precio:"$15 – $37 USD",
    plataformas:["Amazon KDP","Gumroad","Payhip","Stan Store"],
    tip:"Amazon KDP te da alcance global sin esfuerzo extra. Publícalo también como PDF para márgenes más altos."
  },
  "Challenge": {
    emoji:"🏁", color:"#E67E22", bg:"#FFF5EB",
    descripcion:"Un programa de 5 a 7 días con una tarea diaria que guía al participante a un resultado concreto. Genera mucho engagement y comunidad.",
    estructura:["Día 0: Bienvenida, reglas y mentalidad","Días 1-5 (o 1-7): Una tarea diaria accionable de max. 30 min","Grupo de WhatsApp, Telegram o comunidad de soporte","Celebración de resultados al final del reto","Oferta especial al cierre para quienes lo completaron"],
    pasos:["Define el resultado del último día: ¿qué habrá logrado quien lo complete?","Diseña una tarea diaria que tome máximo 30 minutos","Prepara los materiales: videos cortos, PDFs o audios por día","Crea el grupo de comunidad antes de lanzar para generar expectativa","Lanza con inscripción previa — la anticipación aumenta el valor percibido","Prepara una oferta de cierre para quienes terminen el reto"],
    tiempo:"1 – 2 semanas de preparación", precio:"$17 – $57 USD",
    plataformas:["WhatsApp/Telegram + Hotmart","Stan Store","Kajabi Communities"],
    tip:"Los challenges tienen las tasas de completación más altas. Crea el grupo ANTES de lanzar — la comunidad es el motor del reto."
  },
  "Workshop": {
    emoji:"🛠️", color:"#8B6565", bg:"#FFF8F5",
    descripcion:"Una sesión grabada o en vivo de 2-3 horas muy práctica. Al terminar, el participante tiene algo creado o resuelto.",
    estructura:["Introducción y contexto (15 min)","Fundamentos clave antes de hacer (20 min)","Ejercicio práctico guiado (90 min)","Revisión de trabajo y preguntas (15 min)","Recursos adicionales y siguiente paso"],
    pasos:["Define qué van a crear o completar al terminar el workshop","Prepara los materiales de trabajo: plantillas, hojas de trabajo, etc.","Hazlo primero en vivo por Zoom y graba la sesión","Edita para quitar los momentos muertos y la configuración inicial","Sube con acceso de por vida para revenderlo continuamente","Crea un reel que muestre el 'antes y durante' del proceso"],
    tiempo:"1 semana", precio:"$37 – $127 USD",
    plataformas:["Zoom + Hotmart","Kajabi","Stan Store"],
    tip:"Hazlo primero en vivo, grábalo y véndelo para siempre. Un workshop bien ejecutado = semanas o meses de ingreso pasivo."
  },
  "Kit de recursos": {
    emoji:"🎁", color:"#C9A84C", bg:"#FBF5E0",
    descripcion:"Un paquete curado de plantillas, guías, checklists y herramientas sobre un tema. El valor está en la curaduría — no tienes que crear todo desde cero.",
    estructura:["3 a 5 plantillas editables (Canva, Notion, Word)","Guía de instrucciones en PDF","Checklists y listas de recursos","Ejemplos reales o swipe file","Bonus: recurso extra o descuento en tu servicio"],
    pasos:["Recopila lo que ya tienes y usas en tu propio negocio","Organiza los recursos en carpetas temáticas","Crea una guía PDF que explique cómo usar cada recurso","Empaqueta todo en un ZIP descargable","Crea una página de ventas describiendo cada elemento del kit","Graba un video de 3 min mostrando qué hay en el kit ('unboxing digital')"],
    tiempo:"2 – 4 días", precio:"$27 – $67 USD",
    plataformas:["Gumroad","Stan Store","Payhip"],
    tip:"El valor percibido de un kit es mayor que el de sus partes individuales. Ponle precio al paquete, no a cada pieza por separado."
  },
  "Membresía": {
    emoji:"💎", color:"#4A90D9", bg:"#EEF5FF",
    descripcion:"Un acceso recurrente mensual o anual a contenido, comunidad o acompañamiento. El modelo de ingresos más estable del negocio digital.",
    estructura:["Biblioteca de contenido (clases, guías, plantillas)","Comunidad privada (WhatsApp, Telegram o plataforma)","Contenido nuevo mensual: masterclass, Q&A en vivo o recursos","Acceso a grabaciones anteriores","Beneficios exclusivos: descuentos, acceso anticipado, sesiones grupales"],
    pasos:["Define el beneficio principal que justifica el pago mensual","Empieza con contenido mínimo: 3-5 recursos ya creados + comunidad","Elige la plataforma según tu presupuesto (WhatsApp es gratis para empezar)","Fija un precio de lanzamiento bajo para conseguir los primeros 10 miembros","Entrega valor inmediato en la primera semana — la retención es clave","Sube el precio con nuevos miembros; los actuales se quedan al precio de entrada"],
    tiempo:"2 – 4 semanas para lanzar", precio:"$19 – $67 USD / mes",
    plataformas:["WhatsApp / Telegram","Kajabi","Hotmart Club","Skool"],
    tip:"El primer mes es el más difícil de retener. Entrégalo todo ese mes — los que se queden serán tus mejores clientes para siempre."
  },
  "Guía de procesos": {
    emoji:"📋", color:"#27AE60", bg:"#EEFAF3",
    descripcion:"Un sistema documentado (SOP) que otros pueden seguir para replicar tus procesos. Valioso para coaches, consultoras y creadoras de contenido.",
    estructura:["Índice de procesos incluidos","Por cada proceso: objetivo, herramientas, pasos detallados","Capturas de pantalla o diagramas de flujo","Checklists de verificación por proceso","Instrucciones de adaptación y personalización"],
    pasos:["Documenta los 5 procesos que más te preguntan o que más usas","Escríbelos como si se los explicaras a alguien que no sabe nada","Añade capturas de pantalla reales de tus herramientas","Diseña en Notion (práctico) o en Canva/Word","Vende como 'sistema completo' — el precio se justifica por el tiempo que ahorra","Ofrece actualizaciones gratuitas para siempre como ventaja competitiva"],
    tiempo:"1 – 2 semanas", precio:"$37 – $97 USD",
    plataformas:["Gumroad","Notion (venta directa)","Payhip","Stan Store"],
    tip:"El cliente no compra el PDF — compra el tiempo que le ahorras. Calcula cuántas horas vale lo que documentas y ponle precio a eso."
  },
};

const detectProductType = (text) => {
  const t = text.toLowerCase();
  if (t.includes("mini-guía") || t.includes("mini guia") || t.includes("pdf")) return "Mini-guía PDF";
  if (t.includes("masterclass")) return "Masterclass";
  if (t.includes("plantilla")) return "Pack de plantillas";
  if (t.includes("mini-curso") || t.includes("mini curso") || t.includes("módulos") || t.includes("curso")) return "Mini-curso";
  if (t.includes("ebook") || t.includes("e-book")) return "Ebook";
  if (t.includes("challenge") || t.includes("reto")) return "Challenge";
  if (t.includes("workshop") || t.includes("taller")) return "Workshop";
  if (t.includes("kit")) return "Kit de recursos";
  if (t.includes("membresía") || t.includes("membresia")) return "Membresía";
  if (t.includes("proceso") || t.includes("sop")) return "Guía de procesos";
  return "Mini-guía PDF";
};

// ── IDEAS ──────────────────────────────────────────────────────
function IdeasTab({ saved, onSave, onDelete, onCrearGuion, brandProfile = {}, callGemini, plan = "free", onAiUsed }) {
  const [keyword,        setKeyword]        = useState(brandProfile.queOfreces || "");
  const [ideas,          setIdeas]          = useState(null);
  const [thinking,       setThinking]       = useState(false);
  const [copiado,        setCopiado]        = useState("");
  const [vistaBlueprint, setVistaBlueprint] = useState(null);
  const [aiLoading,      setAiLoading]      = useState(false);
  const [aiMsg,          setAiMsg]          = useState("");

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
        k => `3 errores que arruinan los resultados con ${k} (y cómo evitarlos)`,
        k => `Lo que nadie te dice sobre ${k} 👀`,
        k => `Cómo mejorar tus resultados con ${k} en solo 24 horas`,
        k => `POV: el día que todo cambió gracias a ${k}`,
        k => `El truco con ${k} que cambió todo para mí`,
        k => `¿Por qué ${k} aún no te está dando los resultados que quieres?`,
        k => `Antes vs después de trabajar con ${k}`,
        k => `Mini tutorial: cómo arrancar con ${k} en 60 segundos`,
        k => `Las 3 preguntas más frecuentes sobre ${k} — respondidas`,
        k => `La forma más fácil de empezar con ${k} aunque no tengas experiencia`,
        k => `Esto me pasó con ${k} y no lo esperaba 😳`,
        k => `${k}: mito vs realidad 🔥`,
        k => `5 señales de que ya es momento de dar el siguiente paso en ${k}`,
        k => `Así trabajo yo con ${k} — proceso completo en 60 segundos`,
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
        k => `Por qué ${k} es la pieza que le falta a tu negocio`,
        k => `De cero a experta en ${k}: episodio completo`,
        k => `Cómo una mamá transformó su negocio trabajando con ${k}`,
        k => `${k} paso a paso: el proceso completo que uso con mis clientas`,
        k => `Los mitos sobre ${k} que te están frenando — y cómo superarlos`,
        k => `Qué nadie te enseñó sobre ${k}`,
        k => `El episodio sobre ${k} que ojalá hubiera visto cuando empecé`,
        k => `Cómo trabajar con ${k} me ayudó a escalar sin quemarme`,
        k => `La estrategia con ${k} que funcionó para mis clientas este mes`,
        k => `${k} y bienestar: cómo equilibrar todo sin colapsar`,
      ],
    },
    carrusel: {
      label: "🎠 Carrusel", sub: "Instagram · Facebook",
      color: "#27AE60", bg: "#EEFAF3",
      templates: [
        k => `5 claves para dominar ${k} desde hoy`,
        k => `Antes vs después de trabajar con ${k}`,
        k => `Mi proceso con ${k}: paso a paso (lo que uso con mis clientas)`,
        k => `Errores vs soluciones: guía sobre ${k}`,
        k => `Las preguntas más frecuentes sobre ${k} — respondidas`,
        k => `Guarda este carrusel: todo sobre ${k} en un solo post`,
        k => `${k}: la guía visual que siempre quisiste tener`,
        k => `Lo que aprendí sobre ${k} en el último año`,
        k => `Checklist: ¿estás aprovechando bien ${k}?`,
        k => `Comparte si trabajar con ${k} también te ha costado 👇`,
        k => `3 formas de mejorar tus resultados con ${k} esta semana`,
        k => `El ABC de ${k} para emprendedoras`,
      ],
    },
    story: {
      label: "💬 Historia / Story", sub: "IG Stories · FB Stories",
      color: "#E8755A", bg: "#FFF5F0",
      templates: [
        k => `¿Cuál es tu mayor reto con ${k}? [encuesta]`,
        k => `Lo que aprendí sobre ${k} me tomó meses entenderlo`,
        k => `¿Ya probaste esto con ${k}? [encuesta sí/no]`,
        k => `Una cosa que haría diferente si empezara de cero con ${k}`,
        k => `Mi reflexión de hoy sobre ${k} — sigue viendo`,
        k => `¿Qué tanto sabes sobre ${k}? Ponlo a prueba [quiz]`,
        k => `Lo que me preguntan todo el tiempo sobre ${k}`,
        k => `Gracias a ${k} mi negocio cambió — te cuento cómo`,
        k => `Hoy hablamos de ${k} en el live. ¿Te unes?`,
        k => `Tip exprés sobre ${k} que puedes aplicar hoy mismo 🔥`,
        k => `Cuéntame: ¿${k} te ha traído algún reto? [caja de preguntas]`,
      ],
    },
    digital: {
      label: "💻 Producto Digital", sub: "Crea e ingresos pasivos",
      color: "#C9903A", bg: "#FFF8ED",
      templates: [
        k => `Mini-guía PDF: domina ${k} en 7 días`,
        k => `Masterclass grabada: ${k} desde cero`,
        k => `Pack de plantillas para optimizar ${k}`,
        k => `Mini-curso de 4 módulos: sistema para ${k}`,
        k => `Ebook: La guía completa de ${k}`,
        k => `Challenge de 7 días: transforma tu ${k}`,
        k => `Workshop: ${k} en una tarde`,
        k => `Kit de recursos sobre ${k}`,
        k => `Membresía: acompañamiento mensual en ${k}`,
        k => `Guía de procesos (SOP): sistema para ${k}`,
      ],
    },
    email: {
      label: "📧 Email", sub: "Newsletter · Nurturing",
      color: "#6366F1", bg: "#F0F0FF",
      templates: [
        k => `Lo que aprendí sobre ${k} este mes — y cómo lo aplico`,
        k => `El error más común con ${k} que me costó caro`,
        k => `Mi proceso con ${k}: lo que funciona y lo que no`,
        k => `La pregunta que más me hacen sobre ${k} — y mi respuesta honesta`,
        k => `3 cosas que nadie te dice sobre ${k}`,
        k => `Si empezara de cero con ${k}, haría esto diferente`,
        k => `Carta para la mamá que está comenzando con ${k}`,
        k => `Por qué ${k} no está funcionando para ti (y cómo arreglarlo)`,
        k => `Un consejo sobre ${k} que cambió cómo trabajo`,
        k => `Cómo cambió mi perspectiva sobre ${k}: te lo cuento sin filtros`,
      ],
    },
    whatsapp: {
      label: "💬 WhatsApp", sub: "Broadcast · Estado · DM",
      color: "#25D366", bg: "#EDFFF5",
      templates: [
        k => `Un tip rápido sobre ${k} que me hubiera gustado saber antes 🙌`,
        k => `¿Estás aprovechando bien ${k}? Tengo algo para ti 🎁`,
        k => `Tip del día: ${k} no tiene que ser complicado — te cuento 💡`,
        k => `Hola! Quería compartirte algo sobre ${k} que está funcionando mucho`,
        k => `Antes de que se me olvide — esto sobre ${k} puede cambiarlo todo`,
        k => `¿Tienes 2 minutos? Esto sobre ${k} vale la pena leerlo 👀`,
        k => `Lo que estoy aprendiendo sobre ${k} y quiero que tú también sepas`,
        k => `¿Sabías que ${k} puede ser más simple de lo que crees? 👇`,
        k => `Mensaje rápido: esto con ${k} me funcionó y creo que a ti también`,
        k => `¿Qué tan seguido te dedicas a ${k}? Te hago una pregunta 🤍`,
      ],
    },
  };

  const generar = (kw) => {
    const k = (typeof kw === "string" ? kw : keyword).trim();
    if (!k) return;
    setThinking(true); setIdeas(null); setAiMsg("");
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

  const generarConIA = async (kw) => {
    const k = (typeof kw === "string" ? kw : keyword).trim();
    if (!k || !callGemini) return;
    setAiLoading(true); setIdeas(null); setAiMsg("");
    const res = await callGemini("ideas", {
      keyword: k,
      nicho: brandProfile.clienteIdeal || "mamás emprendedoras",
      tono: brandProfile.tono || "Cercano",
    });
    setAiLoading(false);
    if (res?.error === "rate_limit") { setAiMsg("Muchas solicitudes en este momento. Intenta en 1 minuto."); return; }
    if (res?.error === "limite_alcanzado") { setAiMsg("Llegaste al límite de generaciones del mes."); return; }
    if (res?.error === "No autorizada" || res?.error?.includes("autent")) { setAiMsg("Inicia sesión para usar la IA."); return; }
    if (res?.error) { setAiMsg("Algo salió mal. Intenta de nuevo en unos segundos."); return; }
    onAiUsed?.({ used: res.usage, limit: res.limit, plan: res.plan });
    const aiResult = res.result || {};
    const CAT_KEYS = Object.keys(CATS);
    const gen = {};
    CAT_KEYS.forEach(catKey => {
      const aiArr = aiResult[catKey] || [];
      gen[catKey] = aiArr.length > 0
        ? aiArr.map((texto, i) => ({ id: `${catKey}-ai-${Date.now()}-${i}`, texto }))
        : shuffle([...CATS[catKey].templates]).slice(0, 5).map((f, i) => ({ id: `${catKey}-fb-${Date.now()}-${i}`, texto: f(k) }));
    });
    setIdeas({ keyword: k, ...gen, isAI: true });
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

  // ── VISTA BLUEPRINT ──────────────────────────────────────────
  if (vistaBlueprint) {
    const bp = BLUEPRINTS[vistaBlueprint.tipo] || BLUEPRINTS["Mini-guía PDF"];
    return (
      <div className="studio-tab-content">
        <div className="bp-topbar">
          <button className="mpm-wizard-back-btn" onClick={() => setVistaBlueprint(null)}>← Ideas</button>
        </div>

        <div className="bp-wrap">
          {/* Hero */}
          <div className="bp-hero">
            <div className="bp-emoji">{bp.emoji}</div>
            <div className="bp-hero-info">
              <span className="bp-tipo-badge" style={{background: bp.bg, color: bp.color}}>{vistaBlueprint.tipo}</span>
              <h2 className="bp-title">{vistaBlueprint.idea}</h2>
              {vistaBlueprint.keyword && <p className="bp-keyword">Tema: {vistaBlueprint.keyword}</p>}
            </div>
          </div>

          <p className="bp-descripcion">{bp.descripcion}</p>

          {/* Stats */}
          <div className="bp-stats-row">
            <div className="bp-stat" style={{borderColor: bp.color + "33", background: bp.bg}}>
              <div className="bp-stat-label">⏱ Tiempo para crearlo</div>
              <div className="bp-stat-value" style={{color: bp.color}}>{bp.tiempo}</div>
            </div>
            <div className="bp-stat" style={{borderColor: bp.color + "33", background: bp.bg}}>
              <div className="bp-stat-label">💰 Precio de venta</div>
              <div className="bp-stat-value" style={{color: bp.color}}>{bp.precio}</div>
            </div>
          </div>

          {/* Estructura */}
          <div className="bp-section">
            <div className="bp-section-title" style={{color: bp.color}}>📋 Qué incluye</div>
            <ul className="bp-list">
              {bp.estructura.map((item, i) => (
                <li key={i} className="bp-list-item">
                  <span className="bp-dot" style={{background: bp.color}} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Cómo crearlo */}
          <div className="bp-section">
            <div className="bp-section-title" style={{color: bp.color}}>🛠️ Cómo crearlo — paso a paso</div>
            <ol className="bp-steps">
              {bp.pasos.map((paso, i) => (
                <li key={i} className="bp-step">
                  <span className="bp-step-num" style={{background: bp.color, color:"#fff"}}>{i + 1}</span>
                  <span>{paso}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Dónde venderlo */}
          <div className="bp-section">
            <div className="bp-section-title" style={{color: bp.color}}>🛒 Dónde venderlo</div>
            <div className="bp-platforms">
              {bp.plataformas.map((p, i) => (
                <span key={i} className="bp-platform-chip" style={{background: bp.bg, color: bp.color, borderColor: bp.color + "44"}}>{p}</span>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div className="bp-tip" style={{borderColor: bp.color, background: bp.bg}}>
            <span className="bp-tip-icon">💡</span>
            <p>{bp.tip}</p>
          </div>

          {/* Acciones */}
          <div className="bp-actions">
            <button className="mpm-wizard-back-btn" onClick={() => setVistaBlueprint(null)}>← Volver a ideas</button>
            <button className="mpm-step-btn" style={{flex:1}} onClick={() => { setVistaBlueprint(null); onCrearGuion?.(vistaBlueprint.idea); }}>
              Crear guión de lanzamiento 🎬
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        <button
          className={`ideas-search-btn${callGemini ? " studio-ai-btn" : ""}`}
          onClick={() => callGemini ? generarConIA() : generar()}
          disabled={!keyword.trim() || thinking || aiLoading}
        >
          {(thinking || aiLoading) ? "Generando..." : callGemini ? "Generar ✨" : "Generar ✦"}
        </button>
      </div>
      {aiMsg && <p className="studio-ai-msg">{aiMsg}</p>}

      {!ideas && !thinking && !aiLoading && (
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

      {(thinking || aiLoading) && (
        <div className="ideas-thinking">
          <div className="ideas-orbit-container">
            <div className="ideas-brain-orbit">&#x1F9E0;</div>
            {["&#x1F4A1;","&#x1F3AC;","&#x1F4F1;","&#x1F3A0;","&#x1F4AC;","&#x2728;"].map((s, i) => (
              <div key={i} className={`ideas-orbit-item ideas-orbit-${i}`} dangerouslySetInnerHTML={{__html: s}} />
            ))}
          </div>
          <p className="ideas-thinking-text">{aiLoading ? "Gemini est\xe1 creando ideas para ti" : "Generando ideas para ti"}<span className="ideas-dots-anim">...</span></p>
          {aiLoading && <p className="studio-ai-thinking-sub">Ideas originales y espec\xedficas para tu nicho &#x2728;</p>}
        </div>
      )}

      {ideas && !thinking && !aiLoading && (
        <>
          <div className="ideas-result-header">
            <div>
              <span className="ideas-kw-label">Ideas para </span>
              <strong className="ideas-kw-value">"{ideas.keyword}"</strong>
              {ideas.isAI && <span className="studio-ai-badge">&#x2728; Generado con IA</span>}
            </div>
            <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
              <button className={`ideas-regen-btn${callGemini ? " studio-ai-regen-btn" : ""}`} onClick={() => callGemini ? generarConIA(ideas.keyword) : generar(ideas.keyword)}>🔄 Nuevas ideas {callGemini ? "✨" : ""}</button>
            </div>
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
                  <div
                    className={`ideas-card ideas-card--tap${catKey==="digital"?" ideas-card--digital":""}`}
                    key={idea.id}
                    style={{ animationDelay: `${i * 70}ms` }}
                    onClick={() => catKey === "digital"
                      ? setVistaBlueprint({ tipo: detectProductType(idea.texto), keyword: ideas.keyword, idea: idea.texto })
                      : onCrearGuion?.(idea.texto)
                    }
                  >
                    <p className="ideas-card-text">{idea.texto}</p>
                    <div className="ideas-card-footer">
                      <span className="ideas-card-cta-label">
                        {catKey === "digital" ? "Ver plan →" : "Crear guión →"}
                      </span>
                      <button className="ideas-card-bookmark"
                        title="Guardar idea"
                        onClick={e => {
                          e.stopPropagation();
                          onSave("ideas", {
                            id: Date.now(), titulo: idea.texto, tipo: cat.label,
                            plataforma: cat.sub, color: cat.color, keyword: ideas.keyword,
                            fecha: new Date().toLocaleDateString("es"),
                          });
                        }}>
                        💾
                      </button>
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
function LeadMagnetTab({ saved, onSave, onDelete, brandProfile = {}, callGemini, plan = "free", onAiUsed }) {
  const [view, setView]         = useState("inicio");
  const [keyword, setKeyword]   = useState("");
  const [lmIdeas, setLmIdeas]   = useState(null);
  const [thinking, setThinking] = useState(false);
  const [form, setForm]         = useState({ titulo: "", promesa: "", audiencia: "", tipo: "guia", secciones: ["", "", ""], cta: "", producto: "" });
  const [docData, setDocData]   = useState(null);
  const [copiado, setCopiado]   = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg,     setAiMsg]     = useState("");
  const [lmTema,    setLmTema]    = useState("");

  const savedIdeas = (saved?.ideas || []).slice(-8).reverse();
  const bancoLeads = saved?.leads || [];
  const shuffle    = (arr) => [...arr].sort(() => Math.random() - 0.5);
  const copiar     = (t, k) => { navigator.clipboard.writeText(t); setCopiado(k); setTimeout(() => setCopiado(""), 2000); };

  const generarConIA = async () => {
    const tema = (lmTema || keyword || "").trim();
    if (!tema || !callGemini) return;
    setAiLoading(true); setAiMsg("");
    const res = await callGemini("leadmagnet", {
      tipo: form.tipo,
      keyword: tema,
      nicho: brandProfile.clienteIdeal || "mamás emprendedoras",
      tono: brandProfile.tono || "Cercano",
    });
    setAiLoading(false);
    if (res?.error === "rate_limit")          { setAiMsg("Muchas solicitudes. Intenta en 1 minuto."); return; }
    if (res?.error === "limite_alcanzado")    { setAiMsg("Llegaste al límite de generaciones del mes."); return; }
    if (res?.error === "No autorizada" || res?.error?.includes("autent")) { setAiMsg("Inicia sesión para usar la IA."); return; }
    if (res?.error)                           { setAiMsg("Algo salió mal. Intenta de nuevo."); return; }
    onAiUsed?.({ used: res.usage, limit: res.limit, plan: res.plan });
    const r = res.result || {};
    const aiForm = {
      ...form,
      titulo:    r.titulo   || tema,
      promesa:   r.promesa  || "",
      secciones: r.secciones?.length ? r.secciones : ["Sección 1", "Sección 2", "Sección 3", "Sección 4", "Sección 5"],
      audiencia: brandProfile.clienteIdeal || "mamás emprendedoras",
    };
    setForm(aiForm);
    setDocData(buildDoc(aiForm));
    setView("preview");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

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

  const buildDoc = (data = form) => {
    const { tipo, titulo, promesa, audiencia, secciones, cta, producto } = data;
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

      {/* ── CREAR (solo IA) ─────────────────────────── */}
      {view === "crear" && (
        <div className="lm-crear-wrap">
          <div className="desc-header">
            <button className="mpm-wizard-back-btn" onClick={() => setView("inicio")}>← Inicio</button>
            <h2 className="desc-title">Crear Lead Magnet con IA</h2>
            <p className="desc-subtitle">Elige el tipo y cuéntale el tema — la IA construye el documento completo.</p>
          </div>

          <div className="lm-crear-form">
            <div className="lm-crear-section">
              <label className="lm-crear-label">¿Qué tipo de lead magnet?</label>
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

            <div className="lm-ai-block">
              <label className="lm-crear-label">¿Sobre qué tema?</label>
              <input className="gn2-input" autoFocus
                placeholder="ej: vender por WhatsApp, organizar el tiempo, conseguir clientas..."
                value={lmTema}
                onChange={e => setLmTema(e.target.value)}
                onKeyDown={e => e.key === "Enter" && lmTema.trim() && !aiLoading && generarConIA()}
              />
              {aiMsg && <p className="studio-ai-msg">{aiMsg}</p>}
              {aiLoading ? (
                <div className="ideas-thinking" style={{padding:"20px 0"}}>
                  <div className="ideas-thinking-dots"><span/><span/><span/></div>
                  <p style={{marginTop:"12px",color:"#9A7878",fontSize:"13px"}}>
                    Gemini está creando tu lead magnet completo...
                  </p>
                </div>
              ) : (
                <button className="mpm-step-btn studio-ai-btn"
                  style={{marginTop:"4px"}}
                  disabled={!lmTema.trim()}
                  onClick={generarConIA}>
                  ✨ Crear mi lead magnet completo
                </button>
              )}
            </div>
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
function HooksTab({ saved, onSave, onCrearGuion, brandProfile = {}, callGemini, plan = "free", onAiUsed }) {
  const [tema, setTema]       = useState("");
  const [nicho, setNicho]     = useState("");
  const [hooks, setHooks]     = useState(null);
  const [thinking, setThinking] = useState(false);
  const [copiado, setCopiado] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg]     = useState("");

  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
  const copiar  = (t, k) => { navigator.clipboard.writeText(t); setCopiado(k); setTimeout(() => setCopiado(""), 2000); };

  const HOOK_CATS = {
    curiosidad: {
      label: "🤔 Curiosidad", sub: "Detiene el scroll al instante",
      color: "#4A90D9", bg: "#EEF5FF",
      templates: [
        t => `Lo que nadie te dice sobre ${t}`,
        t => `El secreto sobre ${t} que las expertas se guardan`,
        t => `Por qué las emprendedoras exitosas hacen esto con ${t}`,
        t => `Lo que descubrí sobre ${t} que lo cambió todo`,
        t => `La razón por la que ${t} no te está dando los resultados que mereces`,
        t => `Existe una forma de trabajar con ${t} que casi nadie conoce`,
        t => `Esto es lo que realmente pasa cuando trabajas en ${t}`,
      ],
    },
    dolor: {
      label: "😩 Dolor / Frustración", sub: "Habla directo a lo que siente",
      color: "#C4526A", bg: "#FFF0F3",
      templates: [
        t => `¿Cansada de que ${t} no te dé los resultados que esperabas?`,
        t => `Si lo de ${t} te tiene abrumada, para y mira esto`,
        t => `Esto es exactamente lo que sientes cuando ${t} no avanza`,
        t => `Dejé de luchar con ${t} cuando entendí esto`,
        t => `El error que te está frenando con ${t} (y no lo sabías)`,
        t => `Para las que ya estamos hartas de que ${t} no funcione como queremos`,
        t => `Dedicarte a ${t} te está robando tiempo que no tienes — y esto lo para`,
      ],
    },
    promesa: {
      label: "✨ Promesa de Resultado", sub: "Le muestra lo que puede lograr",
      color: "#27AE60", bg: "#EEFAF3",
      templates: [
        t => `Cómo mejorar tus resultados con ${t} en menos de 30 días (sin complicarte)`,
        t => `La forma más rápida de dominar ${t} desde hoy`,
        t => `Más resultados con ${t} sin esfuerzo extra: el método que sí funciona`,
        t => `En 60 segundos te enseño lo más importante sobre ${t}`,
        t => `Así transformé mis resultados con ${t} — tú puedes hacer lo mismo`,
        t => `Después de este video, ${t} va a tener mucho más sentido para ti`,
        t => `Lo que cambié sobre ${t} que me dio resultados esta semana`,
      ],
    },
    pregunta: {
      label: "❓ Pregunta Directa", sub: "Las hace parar a pensar",
      color: "#E8755A", bg: "#FFF5F0",
      templates: [
        t => `¿Estás trabajando ${t} de la forma equivocada?`,
        t => `¿Sabes por qué los resultados con ${t} aún no despegan?`,
        t => `¿Y si ${t} fuera más fácil de lo que siempre creíste?`,
        t => `¿Cuánto tiempo llevas trabajando en ${t} sin ver los resultados que mereces?`,
        t => `¿Qué pasaría si resolvieras lo de ${t} esta semana?`,
        t => `¿Por qué ${t} funciona para otras y para ti todavía no?`,
        t => `¿Alguien más batalla con ${t} o soy solo yo?`,
      ],
    },
    historia: {
      label: "📖 Historia / POV", sub: "Emoción y conexión personal",
      color: "#8B6565", bg: "#FFF8F5",
      templates: [
        t => `POV: el día que todo cambió gracias a ${t}`,
        t => `Hace un año no entendía nada sobre ${t}. Hoy te cuento todo.`,
        t => `Una clienta me escribió llorando por sus resultados con ${t}. Esto es lo que hicimos.`,
        t => `Esto me pasó con ${t} y no lo esperaba para nada 😳`,
        t => `La historia de cómo ${t} cambió mi negocio completamente`,
        t => `Cuando estaba a punto de rendirme con ${t}, pasó esto`,
        t => `Nadie me contó esto sobre ${t} cuando empecé`,
      ],
    },
    numero: {
      label: "🔢 Número / Lista", sub: "Específico y escaneable",
      color: "#C9903A", bg: "#FFF8ED",
      templates: [
        t => `3 errores que arruinan los resultados con ${t} (y cómo evitarlos)`,
        t => `5 señales de que necesitas trabajar diferente tu ${t} — ya`,
        t => `Las 7 claves sobre ${t} que nadie te enseña`,
        t => `Solo necesitas estos 3 pasos para dominar ${t}`,
        t => `El 80% de las emprendedoras falla con ${t} por estas razones`,
        t => `Dedica 2 minutos a ${t} cada día — los resultados te van a sorprender`,
        t => `4 cosas que aprendí sobre ${t} que ojalá hubiera sabido antes`,
      ],
    },
    contraintuitivo: {
      label: "🔄 Contraintuitivo", sub: "Rompe lo que creen saber",
      color: "#E67E22", bg: "#FFF5EB",
      templates: [
        t => `Deja de hacer ${t} de esta forma. No es lo que crees.`,
        t => `Por qué hacer MÁS no te ayuda con ${t}`,
        t => `Lo que te enseñaron sobre ${t} está equivocado`,
        t => `Trabajar más duro en ${t} te está frenando — y aquí explico por qué`,
        t => `Esto que parece un error con ${t} es en realidad tu mayor ventaja`,
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
    setThinking(true); setHooks(null); setAiMsg("");
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

  const generarConIA = async (t) => {
    const k = (typeof t === "string" ? t : tema).trim();
    if (!k || !callGemini) return;
    setAiLoading(true); setHooks(null); setAiMsg("");
    const res = await callGemini("hooks", {
      tema: k, nicho: nicho.trim() || brandProfile.clienteIdeal || "mamás emprendedoras",
      tono: brandProfile.tono || "Cercano",
    });
    setAiLoading(false);
    if (res?.error === "rate_limit") { setAiMsg("Muchas solicitudes en este momento. Intenta en 1 minuto."); return; }
    if (res?.error === "limite_alcanzado") { setAiMsg("Llegaste al límite de generaciones del mes."); return; }
    if (res?.error) { setAiMsg("Algo salió mal. Intenta de nuevo."); return; }
    onAiUsed?.({ used: res.usage, limit: res.limit, plan: res.plan });
    const gen = {};
    Object.keys(HOOK_CATS).forEach(catKey => {
      const arr = res.result?.[catKey] || [];
      gen[catKey] = arr.length > 0
        ? arr.map((texto, i) => ({ id: `hook-${catKey}-ai-${Date.now()}-${i}`, texto }))
        : shuffle([...HOOK_CATS[catKey].templates]).slice(0, 3).map((f, i) => ({ id: `hook-${catKey}-fb-${Date.now()}-${i}`, texto: f(k) }));
    });
    setHooks({ tema: k, nicho: nicho.trim(), ...gen, isAI: true });
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

  const CAT_COLORS_BANCO = { curiosidad:"#4A90D9", dolor:"#C4526A", promesa:"#27AE60", pregunta:"#E8755A", historia:"#8B6565", numero:"#C9903A", contraintuitivo:"#E67E22", identidad:"#16A085" };

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
          <button
            className={`ideas-search-btn${callGemini ? " studio-ai-btn" : ""}`}
            onClick={() => callGemini ? generarConIA() : generar()}
            disabled={!tema.trim() || thinking || aiLoading}
          >
            {(thinking || aiLoading) ? "Generando..." : callGemini ? "Generar ✨" : "Generar ✦"}
          </button>
        </div>
        {aiMsg && <p className="studio-ai-msg">{aiMsg}</p>}
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
      {(thinking || aiLoading) && (
        <div className="ideas-thinking">
          <div className="ideas-orbit-container">
            <div className="ideas-brain-orbit">&#x1FA9D;</div>
            {["&#x1F914;","&#x1F629;","&#x2728;","&#x2753;","&#x1F4D6;","&#x1F522;","&#x1F504;","&#x1FA9E;"].map((s, i) => (
              <div key={i} className={`ideas-orbit-item ideas-orbit-${i}`} dangerouslySetInnerHTML={{__html: s}} />
            ))}
          </div>
          <p className="ideas-thinking-text">{aiLoading ? "Gemini est\xe1 escribiendo hooks para ti" : "Creando hooks para tu video"}<span className="ideas-dots-anim">...</span></p>
          {aiLoading && <p className="studio-ai-thinking-sub">Esto tarda unos segundos &#x2014; vale la pena &#x2728;</p>}
        </div>
      )}

      {/* ── RESULTADOS ───────────────────────────────── */}
      {hooks && !thinking && (
        <>
          <div className="ideas-result-header">
            <div>
              <span className="ideas-kw-label">Hooks para </span>
              <strong className="ideas-kw-value">"{hooks.tema}"</strong>
              {hooks.nicho && <span className="hooks-nicho-badge"> &middot; {hooks.nicho}</span>}
              {hooks.isAI && <span className="studio-ai-badge">&#x2728; Generado con IA</span>}
            </div>
            <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
              <span className="hooks-total-badge">{totalHooks} hooks</span>
              <button className={`ideas-regen-btn${callGemini ? " studio-ai-regen-btn" : ""}`} onClick={() => callGemini ? generarConIA(hooks.tema) : generar(hooks.tema)}>🔄 Nuevos hooks {callGemini ? "✨" : ""}</button>
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
function GuionTab({ saved, onSave, onDelete, seed, onSeedConsumed, brandProfile = {}, callGemini, plan = "free", onAiUsed }) {
  // ── Nuevo flujo tipo Claude ──────────────────────────────────
  const [subTab,   setSubTab]   = useState("guion");
  const [fase,     setFase]     = useState("tema");   // tema | elegir | generando | resultado
  const [topic,    setTopic]    = useState(seed || "");
  const [objetivo, setObjetivo] = useState("Vender");
  const [sel,      setSel]      = useState({ logro: "", dolor: "", cambio: "", cta: "Guardar el video" });
  const [custom,   setCustom]   = useState({ logro: false, dolor: false, cambio: false });
  const [script,   setScript]   = useState(null);    // {hook, interes, deseo, accion, isAI}
  const [copiado,  setCopiado]  = useState("");
  const [aiMsg,    setAiMsg]    = useState("");
  const [c,        setC]        = useState({ red: brandProfile.redPrincipal || "Instagram", tono: brandProfile.tono || "Cercano", tema: "", cta: "", hashtags: true });
  const [caption,       setCaption]       = useState(null);
  const [preguntaActual, setPreguntaActual] = useState(0);

  useEffect(() => { if (seed) { setTopic(seed); onSeedConsumed?.(); } }, []);

  const copiar = (t, k) => { navigator.clipboard.writeText(t); setCopiado(k); setTimeout(() => setCopiado(""), 2200); };

  // ── Sugestiones inteligentes basadas en el tema ─────────────
  const getSugestiones = () => {
    return {
      logros: [
        `Aprendí a hacerlo de forma simple y paso a paso, sin necesitar ser experta`,
        `Pasé de no saber por dónde empezar a tener un sistema que me funciona hoy`,
        `Descubrí que sí es posible tener resultados reales sin descuidar a mi familia`,
        `Lo implementé y cambió completamente la forma en que manejo mi negocio`,
      ],
      dolores: [
        `Sentía que era demasiado complicado para mí y que simplemente no era para todas`,
        `Probé todo y nada funcionaba — estaba agotada y a punto de rendirme`,
        `Me sentía perdida sin saber por dónde empezar, completamente sola y sin referentes`,
        `Dudaba si realmente podía lograrlo siendo mamá, emprendedora y sin tiempo`,
      ],
      cambios: [
        `Dejé de buscar la perfección y empecé a hacerlo a mi manera, desde mi realidad`,
        `Entendí que no necesito hacerlo perfecto — solo necesito ser consistente`,
        `Encontré un método que se adapta a mi vida real sin sacrificar lo que importa`,
        `Tomé la decisión de aprender paso a paso, sin presión y sin compararme con nadie`,
      ],
    };
  };

  const CTA_MAP = {
    "Guardar el video":     `Guarda este video — lo vas a querer cuando lo necesites.`,
    "Comentar":             `Cuéntame en comentarios: ¿te identificaste con algo? Te leo.`,
    "Escribirme por DM":    `Si esto te resonó, escríbeme por DM — me encantaría conocer tu historia.`,
    "Link en mi bio":       `Si quieres el siguiente paso, el link está en mi bio.`,
    "Compartirlo":          `¿Conoces a alguien que necesita escuchar esto hoy? Compárteselo.`,
    "Ir a mi página web":   `Si quieres saber más, el link está en la descripción.`,
  };

  const CTAS = [
    { k: "Guardar el video",  i: "🔖" },
    { k: "Comentar",          i: "💬" },
    { k: "Escribirme por DM", i: "✉️" },
    { k: "Link en mi bio",    i: "🔗" },
    { k: "Compartirlo",       i: "🤝" },
  ];
  const HOOK_MAP = {
    "Vender":   `¿Sientes que trabajas duro en tu negocio y algo todavía no está funcionando como quieres?`,
    "Conectar": `Quiero contarte algo que me costó mucho tiempo entender — y que cambió todo para mí.`,
    "Educar":   `Hay algo sobre este tema que ojalá alguien me hubiera dicho antes. Hoy te lo comparto.`,
    "Inspirar": `Hubo un momento en que creí que esto no era para mí. Hasta que pasó algo que lo cambió todo.`,
  };

  const buildCaptionFromGuion = (obj = objetivo) => {
    const hook = HOOK_MAP[obj] || HOOK_MAP["Conectar"];
    const interes = sel.dolor
      ? sel.dolor + `\n\nY lo peor es que sentías que las demás lo lograban y tú no. Eso es agotador.`
      : `A veces el mayor obstáculo no es la estrategia — es lo que cargamos por dentro.`;
    const deseo = sel.cambio
      ? sel.cambio + `\n\nY cuando eso pasó, todo empezó a fluir diferente. Eso mismo es posible para ti.`
      : `Ese lugar donde todo fluye y avanzas con calma existe. Y con la guía correcta, puedes llegar ahí.`;
    const accion = script?.accion || CTA_MAP[sel.cta] || `Guarda este video — lo vas a querer tener cuando lo necesites.`;
    return `${hook}\n\n${interes}\n\n${deseo}\n\n👉 ${accion}\n\n#mamáemprendedora #negociodigital #emprendimiento #mamáceo`;
  };

  const generar = async () => {
    if (!sel.logro.trim() || !sel.dolor.trim() || !sel.cambio.trim()) return;
    setFase("generando");
    setAiMsg("");
    const ctaTexto = CTA_MAP[sel.cta] || sel.cta;
    if (callGemini) {
      const res = await callGemini("guion", {
        objetivo, logro: sel.logro, dolor: sel.dolor, cambio: sel.cambio,
        queOfreces: topic, nicho: brandProfile.clienteIdeal || "mamás emprendedoras",
        tono: brandProfile.tono || "Cercano",
      });
      if (res?.error === "rate_limit")          { setAiMsg("Muchas solicitudes. Intenta en 1 minuto."); setFase("elegir"); return; }
      if (res?.error === "limite_alcanzado")    { setAiMsg("Llegaste al límite de generaciones del mes."); setFase("elegir"); return; }
      if (res?.error === "No autorizada" || res?.error?.includes("autent")) { setAiMsg("Inicia sesión para usar la IA."); setFase("elegir"); return; }
      if (res?.error)                           { setAiMsg("Algo salió mal. Intenta de nuevo."); setFase("elegir"); return; }
      onAiUsed?.({ used: res.usage, limit: res.limit, plan: res.plan });
      const r = res.result || {};
      setScript({
        hook:    r.hook?.[0]    || sel.logro,
        interes: r.interes?.[0] || sel.dolor,
        deseo:   r.deseo?.[0]   || sel.cambio,
        accion:  r.accion?.[0]  || ctaTexto,
        isAI: true,
      });
    } else {
      setScript({ hook: sel.logro, interes: sel.dolor, deseo: sel.cambio, accion: ctaTexto, isAI: false });
    }
    setFase("resultado");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
  };

  const reset = () => {
    setFase("tema"); setTopic(""); setObjetivo("Vender");
    setSel({ logro: "", dolor: "", cambio: "", cta: "Guardar el video" });
    setCustom({ logro: false, dolor: false, cambio: false });
    setScript(null); setAiMsg(""); setPreguntaActual(0);
  };

  const canContinue = topic.trim().length > 2;
  const canGenerate = !!(sel.logro.trim() && sel.dolor.trim() && sel.cambio.trim());
  const sugestiones = getSugestiones();

  const PREGUNTAS_SLIDE = [
    { num:"01", key:"logro",  pregunta:"¿Cuál es tu mayor logro o aprendizaje con este tema?", hint:"Entre más específica seas, más poderoso el guión", opciones: sugestiones.logros, placeholder:"Cuéntalo con detalle — qué lograste exactamente..." },
    { num:"02", key:"dolor",  pregunta:"¿Cómo te sentías ANTES de lograr eso?",                 hint:"Aquí conectas con tu audiencia — ellas están donde tú estabas", opciones: sugestiones.dolores, placeholder:"Describe cómo te sentías — honesta y específica..." },
    { num:"03", key:"cambio", pregunta:"¿Qué cambió o hiciste diferente?",                      hint:"No tiene que ser una estrategia — puede ser una decisión", opciones: sugestiones.cambios, placeholder:"¿Qué hiciste diferente que lo cambió todo?..." },
    { num:"04", key:"cta",    pregunta:"¿Qué quieres que hagan al terminar el video?",          hint:"Solo una acción — la más importante", opciones: null, placeholder:"" },
  ];
  const slideActual    = PREGUNTAS_SLIDE[preguntaActual];
  const esCTASlide     = slideActual?.key === "cta";
  const selActualSlide = esCTASlide ? sel.cta : sel[slideActual?.key];
  const customActualSlide = !esCTASlide && custom[slideActual?.key];
  const esFinalSlide   = preguntaActual === PREGUNTAS_SLIDE.length - 1;

  const handleElegirOpcion = (key, valor) => {
    setSel(p => ({ ...p, [key]: valor }));
    setCustom(p => ({ ...p, [key]: false }));
    if (!esFinalSlide) setTimeout(() => setPreguntaActual(n => n + 1), 420);
  };

  const scriptTexto = script
    ? [script.hook, script.interes, script.deseo, script.accion].filter(Boolean).join("\n\n")
    : "";

  return (
    <div className="studio-tab-content">
      <div className="studio-mode-toggle">
        <button className={subTab === "guion" ? "active" : ""} onClick={() => setSubTab("guion")}>Guión 🎬</button>
        <button className={subTab === "caption" ? "active" : ""} onClick={() => setSubTab("caption")}>Caption 📝</button>
      </div>

      {subTab === "guion" && (
        <>
          {/* ── FASE 1: TEMA ──────────────────────── */}
          {fase === "tema" && (
            <div className="gn2-wrap">
              <div className="gn2-hero">
                <div className="mpm-landing-badge" style={{margin:"0 auto 8px"}}>🎬</div>
                <h2>Crea tu guión</h2>
                <p>Cuéntame el tema — la IA escribe el guión completo por ti.</p>
              </div>
              <div className="gn2-field">
                <label className="gn2-label">¿Sobre qué es este video?</label>
                <input className="gn2-input" autoFocus
                  placeholder="Ej: guiones con IA, plan de contenido mensual, cobrar sin culpa..."
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && canContinue && setFase("elegir")}
                />
              </div>
              <div className="gn2-field">
                <label className="gn2-label">¿Cuál es el objetivo del video?</label>
                <div className="gn2-obj-grid">
                  {[{k:"Vender",i:"💰"},{k:"Conectar",i:"💙"},{k:"Educar",i:"📖"},{k:"Inspirar",i:"⚡"}].map(o => (
                    <button key={o.k} className={`gn2-obj-pill${objetivo===o.k?" active":""}`}
                      onClick={() => setObjetivo(o.k)}>{o.i} {o.k}</button>
                  ))}
                </div>
              </div>
              <button className={`mpm-step-btn${callGemini?" studio-ai-btn":""}`} style={{marginTop:"8px"}}
                disabled={!canContinue} onClick={() => setFase("elegir")}>
                Continuar →
              </button>
              {saved?.guiones?.length > 0 && (
                <div className="studio-bank" style={{marginTop:"20px"}}>
                  <h4>Guiones guardados ({saved.guiones.length})</h4>
                  {saved.guiones.slice().reverse().map(g => (
                    <div className="studio-bank-item" key={g.id}>
                      <div className="studio-bank-item-top">
                        <span className="studio-tipo-badge" style={{background:"#C4526A"}}>{g.tipo || "Guión"}</span>
                        <small>{g.fecha}</small>
                      </div>
                      <strong style={{fontSize:"13px"}}>{g.tema}</strong>
                      <div style={{display:"flex",gap:"6px",marginTop:"8px"}}>
                        <button className="studio-bank-action-copy" onClick={() => {
                          setCaption(buildCaptionFromGuion(g.objetivo));
                          setSubTab("caption");
                          setTimeout(() => window.scrollTo({top:0,behavior:"smooth"}),50);
                        }}>📝 Caption</button>
                        <button className="studio-bank-action-copy" style={{color:"#C4526A"}} onClick={() => onDelete?.("guiones", g.id)}>Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── FASE 2: ELEGIR (SLIDES) ──────────── */}
          {fase === "elegir" && (
            <div className="gn2-wrap">
              <div className="gn2-fase-hdr">
                <button className="mpm-wizard-back-btn" onClick={() => {
                  if (preguntaActual > 0) setPreguntaActual(n => n - 1);
                  else setFase("tema");
                }}>← {preguntaActual > 0 ? "Anterior" : "Cambiar tema"}</button>
                <span className="gn2-topic-badge">🎬 {topic}</span>
              </div>
              {aiMsg && <p className="studio-ai-msg">{aiMsg}</p>}

              {/* Dots de progreso */}
              <div className="gn2-dots">
                {PREGUNTAS_SLIDE.map((_, i) => (
                  <span key={i}
                    className={`gn2-dot${i === preguntaActual ? " active" : i < preguntaActual ? " done" : ""}`}
                    onClick={() => { if (i < preguntaActual) setPreguntaActual(i); }} />
                ))}
              </div>

              {/* Tarjeta del slide actual */}
              <div className="gn2-q-card gn2-q-card--slide">
                <div className="gn2-q-num">{slideActual.num}</div>
                <div className="gn2-q-content">
                  <div className="gn2-q-title">{slideActual.pregunta}</div>
                  <div className="gn2-q-hint">{slideActual.hint}</div>
                  <div className="gn2-options">
                    {esCTASlide ? (
                      CTAS.map(op => (
                        <button key={op.k}
                          className={`gn2-option${sel.cta === op.k ? " active" : ""}`}
                          onClick={() => setSel(p => ({...p, cta: op.k}))}>
                          {op.i} {op.k}
                        </button>
                      ))
                    ) : (
                      <>
                        {slideActual.opciones.map((s, i) => (
                          <button key={i}
                            className={`gn2-option${selActualSlide === s && !customActualSlide ? " active" : ""}`}
                            onClick={() => handleElegirOpcion(slideActual.key, s)}>
                            {s}
                          </button>
                        ))}
                        <button
                          className={`gn2-option gn2-option--custom${customActualSlide ? " active" : ""}`}
                          onClick={() => { setCustom(p=>({...p,[slideActual.key]:true})); setSel(p=>({...p,[slideActual.key]:""})); }}>
                          ✏ Escribir mi propia versión
                        </button>
                      </>
                    )}
                  </div>

                  {customActualSlide && (
                    <textarea className="gn2-custom-input" autoFocus rows={3}
                      placeholder={slideActual.placeholder}
                      value={sel[slideActual.key]}
                      onChange={e => setSel(p=>({...p,[slideActual.key]:e.target.value}))} />
                  )}

                  {/* Botón siguiente (solo slides 1-3 con custom o después de elegir) */}
                  {selActualSlide && !esFinalSlide && (customActualSlide || true) && (
                    <button className="mpm-step-btn" style={{marginTop:"14px"}}
                      onClick={() => setPreguntaActual(n => n + 1)}>
                      Siguiente →
                    </button>
                  )}

                  {/* Botón generar (último slide) */}
                  {esFinalSlide && (
                    <button className={`mpm-step-btn${callGemini?" studio-ai-btn":""}`}
                      style={{marginTop:"14px"}} disabled={!canGenerate} onClick={generar}>
                      {callGemini ? "✨ Generar mi guión completo" : "✦ Generar guión"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── GENERANDO ─────────────────────────── */}
          {fase === "generando" && (
            <div className="gn2-wrap" style={{paddingTop:"48px",textAlign:"center"}}>
              <div className="ideas-thinking">
                <div className="ideas-thinking-dots"><span/><span/><span/></div>
                <p style={{marginTop:"16px",color:"#9A7878",fontSize:"14px"}}>Escribiendo tu guión...</p>
              </div>
            </div>
          )}

          {/* ── FASE 3: RESULTADO ─────────────────── */}
          {fase === "resultado" && script && (
            <div className="gn2-wrap">
              <div className="gn2-resultado-hdr">
                <button className="mpm-wizard-back-btn" onClick={() => setFase("elegir")}>← Editar</button>
                <button className="mpm-wizard-back-btn" onClick={reset}>🔄 Nuevo</button>
                <button className="mpm-wizard-back-btn" onClick={() => onSave("guiones", {
                  id: Date.now(), tema: topic, tipo: "Reel (60s)", objetivo,
                  hook: script.hook, interes: script.interes,
                  deseo: script.deseo, ctaTxt: script.accion,
                  fecha: new Date().toLocaleDateString("es"),
                })}>💾 Guardar</button>
                {script.isAI && <span className="studio-ai-badge">✨ IA</span>}
              </div>

              <div className="gn2-script-card">
                <div className="gn2-script-title">
                  <span>🎬</span>
                  <div>
                    <strong>{topic}</strong>
                    <span className="gn2-script-obj"> · {objetivo}</span>
                  </div>
                </div>

                {[
                  {key:"hook",    label:"01 · HOOK",    sub:"Detiene el scroll · 0–3 seg",            color:"#C9903A"},
                  {key:"interes", label:"02 · INTERÉS", sub:"Nombra el dolor · 3–15 seg",             color:"#C4526A"},
                  {key:"deseo",   label:"03 · DESEO",   sub:"Pinta la transformación · 15–45 seg",    color:"#27AE60"},
                  {key:"accion",  label:"04 · ACCIÓN",  sub:"Una sola instrucción · últimos 10 seg",  color:"#6366F1"},
                ].map(({key, label, sub, color}) => (
                  <div key={key} className="gn2-section" style={{"--sc": color}}>
                    <div className="gn2-section-hdr">
                      <span className="gn2-section-label" style={{color}}>{label}</span>
                      <span className="gn2-section-sub">{sub}</span>
                    </div>
                    <textarea className="gn2-section-text"
                      value={script[key] || ""}
                      onChange={e => setScript(p => ({...p, [key]: e.target.value}))}
                      rows={3}
                    />
                  </div>
                ))}

                <div className="gn2-script-actions">
                  <button className="lm-dl-btn" style={{flex:1}} onClick={() => copiar(scriptTexto, "script")}>
                    {copiado === "script" ? "✓ Copiado" : "📋 Copiar guión completo"}
                  </button>
                  <button className="guion-caption-cta-btn" onClick={() => {
                    setC(p => ({...p, tema: topic}));
                    setCaption(buildCaptionFromGuion());
                    setSubTab("caption");
                    setTimeout(() => window.scrollTo({top:0,behavior:"smooth"}), 50);
                  }}>📝 Caption</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── CAPTION SUB-TAB ──────────────────────── */}
      {subTab === "caption" && (
        <div className="cap-wrap">
          <div className="guion-form-intro" style={{marginBottom:"4px"}}>
            <div className="mpm-landing-badge" style={{margin:"0 auto 4px"}}>📝</div>
            <h2>Captions para Redes</h2>
            <p>Tu caption se genera con cada guión. Edítalo o crea uno nuevo desde cero.</p>
          </div>
          {caption && (
            <div className="cap-auto-card">
              <div className="cap-auto-hdr">
                <div className="cap-auto-label">📽 Caption generado</div>
                {topic && <div className="cap-video-info"><span className="cap-video-tema">{topic}</span></div>}
              </div>
              <textarea className="studio-caption-edit" value={caption} onChange={e => setCaption(e.target.value)} rows={10} />
              <div className="cap-auto-actions">
                <button className="lm-dl-btn" onClick={() => copiar(caption, "cap-auto")}>{copiado === "cap-auto" ? "✓ Copiado" : "Copiar"}</button>
                <button className="lm-dl-btn lm-dl-btn--word" onClick={() => onSave("captions", { id: Date.now(), caption, red: c.red, tema: topic || c.tema, fecha: new Date().toLocaleDateString("es") })}>Guardar</button>
                <button className="lm-dl-btn" onClick={() => setCaption(null)} style={{marginLeft:"auto",color:"#9A7878",border:"none",background:"transparent",boxShadow:"none",padding:"6px 10px"}}>✕ Limpiar</button>
              </div>
            </div>
          )}
          {saved?.guiones?.length > 0 && (
            <div className="cap-history-section">
              <div className="cap-section-label">📽 Crea caption desde tus videos guardados</div>
              <div className="cap-guiones-grid">
                {saved.guiones.slice().reverse().slice(0, 6).map(g => (
                  <button key={g.id} className="cap-guion-card" onClick={() => {
                    setCaption(buildCaptionFromGuion(g.objetivo));
                    setC(p => ({ ...p, tema: g.tema }));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}>
                    <span className="cap-guion-tipo">{g.tipo?.split(" ")[0] || "🎬"}</span>
                    <div className="cap-guion-tema">{g.tema}</div>
                    <div className="cap-guion-foot"><span>{g.objetivo}</span><span className="cap-crear-lbl">Caption →</span></div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="cap-manual-card">
            <div className="cap-section-label">✍ Crear caption desde cero</div>
            <div className="cap-pills-group">
              <div className="cap-pills-label">Red social</div>
              <div className="cap-pills-row">
                {[{k:"Instagram",i:"📸"},{k:"TikTok",i:"🎵"},{k:"YouTube",i:"🎬"},{k:"Facebook",i:"💬"}].map(r => (
                  <button key={r.k} className={`cap-pill${c.red===r.k?" active":""}`} onClick={() => setC(p => ({...p, red: r.k}))}>{r.i} {r.k}</button>
                ))}
              </div>
            </div>
            <div className="cap-pills-group">
              <div className="cap-pills-label">Tono</div>
              <div className="cap-pills-row">
                {[{k:"Cercano",i:"💙"},{k:"Profesional",i:"💼"},{k:"Emotivo",i:"💫"},{k:"Directo",i:"⚡"},{k:"Divertido",i:"😄"}].map(t => (
                  <button key={t.k} className={`cap-pill${c.tono===t.k?" active":""}`} onClick={() => setC(p => ({...p, tono: t.k}))}>{t.i} {t.k}</button>
                ))}
              </div>
            </div>
            <div className={`desc-q-card${c.tema?" filled":""}`}>
              <div className="desc-q-num">📝</div>
              <div className="desc-q-body">
                <label className="desc-q-label">Tema del post</label>
                <input className="desc-q-input" placeholder="cómo le digo el precio sin miedo..." value={c.tema} onChange={e => setC(p => ({...p, tema: e.target.value}))} />
              </div>
            </div>
            <div className={`desc-q-card${c.cta?" filled":""}`}>
              <div className="desc-q-num">👉</div>
              <div className="desc-q-body">
                <label className="desc-q-label">CTA — llamada a la acción</label>
                <input className="desc-q-input" placeholder="Guarda este post / Comenta SÍ / Link en bio" value={c.cta} onChange={e => setC(p => ({...p, cta: e.target.value}))} />
              </div>
            </div>
            <label className="cap-checkbox-row">
              <input type="checkbox" checked={c.hashtags} onChange={e => setC(p => ({...p, hashtags: e.target.checked}))} />
              Incluir hashtags de mamá emprendedora
            </label>
            <button className="mpm-step-btn" disabled={!c.tema.trim()} onClick={() => {
              if (!c.tema) return;
              const intros = { "Cercano":`Oye, te cuento algo sobre ${c.tema} 👇`, "Profesional":`Hablemos de ${c.tema}. Esto es lo que necesitas saber:`, "Emotivo":`${c.tema} cambió algo en mí que quiero compartir contigo. 💙`, "Directo":`${c.tema}: aquí van los puntos clave. Sin rodeos.`, "Divertido":`${c.tema}... sí, vamos a hablar de eso 😅👇` };
              const body = `\n\n[Tu punto principal — 3 a 5 líneas cortas.]\n\n[Un detalle personal o pregunta que genere conversación.]\n\n`;
              const cta  = c.cta ? `👉 ${c.cta}\n\n` : `💬 Cuéntame en comentarios — te leo siempre.\n\n`;
              const tags = c.hashtags ? `#mamáemprendedora #negociodesdehogar #emprendimiento #mamáceo #marketingdigital` : "";
              setCaption(`${intros[c.tono]||intros["Cercano"]}${body}${cta}${tags}`.trim());
            }}>Generar caption ✦</button>
          </div>
          {saved?.captions?.length > 0 && (
            <div className="studio-bank">
              <h4>Captions guardados ({saved.captions.length})</h4>
              {saved.captions.slice().reverse().map(cp => (
                <div className="studio-bank-item" key={cp.id}>
                  <div className="studio-bank-item-top">
                    <span className="studio-tipo-badge" style={{background:"#C9903A"}}>{cp.red || "Instagram"}</span>
                    <small>{cp.fecha}</small>
                  </div>
                  {cp.tema && <strong style={{fontSize:"13px",display:"block",marginTop:"4px"}}>{cp.tema}</strong>}
                  <p style={{fontSize:"12px",color:"#9A7878",margin:"5px 0 8px",lineHeight:"1.5",whiteSpace:"pre-wrap"}}>{cp.caption?.substring(0,120)}…</p>
                  <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                    <button className="studio-bank-action-copy" onClick={() => { setCaption(cp.caption); window.scrollTo({top:0,behavior:"smooth"}); }}>Usar</button>
                    <button className="studio-bank-action-copy" onClick={() => copiar(cp.caption, `sc-${cp.id}`)}>{copiado===`sc-${cp.id}`?"✓ Copiado":"Copiar"}</button>
                    <button className="studio-bank-action-copy" style={{color:"#C4526A"}} onClick={() => onDelete?.("captions", cp.id)}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── EMAIL ──────────────────────────────────────────────────────
function EmailTab({ saved, onSave, onDelete, brandProfile = {} }) {
  const [view,      setView]      = useState("inicio");
  const [objetivo,  setObjetivo]  = useState("Lanzar producto");
  const [comunicar, setComunicar] = useState("");
  const [campana,   setCampana]   = useState(null);
  const [cuerpos,   setCuerpos]   = useState({});
  const [expandido, setExpandido] = useState({});
  const [thinking,  setThinking]  = useState(false);
  const [ef,        setEf]        = useState({ tipo: "Presentación", tono: brandProfile.tono || "Cercano", tema: brandProfile.queOfreces || "", cta: "" });
  const [draft,     setDraft]     = useState(null);
  const [copiado,   setCopiado]   = useState("");

  const copiar = (t, k) => { navigator.clipboard.writeText(t); setCopiado(k); setTimeout(() => setCopiado(""), 2000); };

  const OBJ_META = {
    "Lanzar producto":     { emoji: "🚀", color: "#C4526A", bg: "#FFF0F3", desc: "4 emails · Anuncia con emoción y urgencia" },
    "Nutrir lista":        { emoji: "💌", color: "#27AE60", bg: "#EEFAF3", desc: "3 emails · Valor puro sin vender" },
    "Bienvenida":          { emoji: "🎁", color: "#4A90D9", bg: "#EEF5FF", desc: "3 emails · Conecta con nuevas suscriptoras" },
    "Venta directa":       { emoji: "💰", color: "#E8755A", bg: "#FFF5F0", desc: "3 emails · Lleva directo a la compra" },
    "Recuperar inactivos": { emoji: "🔄", color: "#C9903A", bg: "#FFF8ED", desc: "3 emails · Reconecta con quienes dejaron de abrir" },
    "Compartir valor":     { emoji: "✨", color: "#E67E22", bg: "#FFF5EB", desc: "2 emails · Educa, inspira y posiciónate" },
  };

  const buildCampana = (obj, com) => {
    const c = com || "ayudar a mamás emprendedoras";
    const CAMPS = {
      "Lanzar producto": [
        { num: 1, dia: "Día 1 — Anuncio", asunto: "🎉 Por fin está aquí — [nombre del producto]",
          cuerpo: `Hola [nombre],\n\nEl día llegó. Y honestamente... estoy emocionada de contártelo.\n\n[Nombre del producto] está disponible ahora mismo — y lo creé pensando en ti.\n\n¿Por qué lo creé? Porque ${c}. Y vi que faltaba algo concreto para hacerlo posible.\n\nEsto es lo que vas a lograr:\n• [Resultado 1 — específico y emocional]\n• [Resultado 2]\n• [Resultado 3]\n\nNo es información que ya tienes. Es un proceso que te lleva de donde estás ahora a donde quieres estar, con mi acompañamiento.\n\n¿Quieres ver todos los detalles?\n\n👉 [Link a la página de ventas]\n\nHasta pronto,\n[Tu nombre]`,
          cta: "Ver todos los detalles →" },
        { num: 2, dia: "Día 3 — Educación", asunto: "¿Para quién es exactamente esto?",
          cuerpo: `Hola [nombre],\n\nHace dos días te conté sobre [nombre del producto].\n\nHoy quiero ser muy honesta contigo: esto no es para todo el mundo.\n\n[Nombre del producto] es para ti si:\n✅ Eres [descripción de tu clienta ideal]\n✅ Ya intentaste [lo que intentaron antes] sin los resultados que querías\n✅ Estás lista para [compromiso que requiere]\n✅ Quieres ${c} en [tiempo específico]\n\nNo es para ti si buscas resultados de la noche a la mañana. Hay proceso. Pero el proceso funciona — y yo voy contigo en cada paso.\n\n¿Te reconociste? Hay un lugar para ti. 💌\n\n👉 [Link]\n\n[Tu nombre]`,
          cta: "Sí, quiero ese lugar →" },
        { num: 3, dia: "Día 5 — Prueba social", asunto: "Esto dice alguien que ya lo vivió 💬",
          cuerpo: `Hola [nombre],\n\nA veces las palabras de otra persona dicen lo que yo no puedo decir.\n\n"[Testimonio real de una clienta — en sus palabras exactas. Qué logró, en cuánto tiempo, cómo se sintió. Si no tienes uno aún, escribe el resultado más concreto que has logrado con alguien.]"\n— [Nombre de la clienta]\n\nEso es lo que es posible cuando ${c}.\n\nY esa persona empezó exactamente donde tú estás ahora — con dudas, con miedo, preguntándose si funcionaría.\n\nFuncionó.\n\n¿Quieres ese resultado?\n\n👉 [Link]\n\n[Tu nombre]`,
          cta: "Quiero ese resultado →" },
        { num: 4, dia: "Día 7 — Cierre", asunto: "Últimas horas ⏰ — cierra hoy a las [hora]",
          cuerpo: `Hola [nombre],\n\nHoy es el último día.\n\nA las [hora] de hoy cierra [nombre del producto] — y no lo repetiré pronto.\n\nSé que a veces dudamos. Que pensamos "lo dejo para después". Pero "después" muchas veces significa perderse la oportunidad.\n\nTe pregunto esto desde el corazón: ¿qué sería diferente en tu negocio si pudieras ${c} en los próximos [tiempo]?\n\nEso es exactamente lo que está del otro lado de esta decisión.\n\nSi sientes que esto es para ti — confía en eso. No en el miedo.\n\n👉 [Link — último recordatorio]\n\nCon cariño,\n[Tu nombre]`,
          cta: "Entrar antes del cierre →" },
      ],
      "Nutrir lista": [
        { num: 1, dia: "Semana 1 — Tip", asunto: "Un tip rápido que puedes aplicar hoy 💡",
          cuerpo: `Hola [nombre],\n\nCorto, directo y útil — así me gusta.\n\nUna sola idea sobre ${c} que puedes aplicar hoy mismo:\n\n[Tip específico y accionable — 3 a 5 líneas. No teoría. Algo que puedan hacer en los próximos 30 minutos. Incluye el paso exacto.]\n\nPor qué funciona: [Explicación breve del principio detrás del tip — 2 líneas máximo.]\n\n¿Lo intentas esta semana y me cuentas cómo te fue?\n\nResponde este email — me encanta leerte. 💌\n\n[Tu nombre]`,
          cta: "Respóndeme aquí" },
        { num: 2, dia: "Semana 2 — Historia", asunto: "Mi historia con esto (te la cuento completa)",
          cuerpo: `Hola [nombre],\n\nHoy quiero contarte algo personal.\n\nHace [tiempo], yo también luchaba con ${c}.\n\n[Historia personal en 3 a 4 líneas. Sé específica, usa detalles reales. La vulnerabilidad genera conexión. Qué pasaba, cómo te sentías, qué hacías que no funcionaba.]\n\nLo que lo cambió fue [el momento clave — una decisión, un aprendizaje, una persona].\n\nY desde entonces, [cómo está diferente ahora — resultado concreto].\n\nTe cuento esto porque sé que tú también puedes estar en ese lugar. Y ese "antes" no tiene que ser para siempre.\n\n¿A ti te ha pasado algo parecido? Cuéntame. 💌\n\n[Tu nombre]`,
          cta: "Respóndeme →" },
        { num: 3, dia: "Semana 3 — Engagement", asunto: "Una pregunta para ti 🙋",
          cuerpo: `Hola [nombre],\n\nHoy no vengo a enseñarte nada. Vengo a preguntarte algo.\n\nLlevamos un tiempo juntas en esta lista y me importa saber cómo estás realmente.\n\n¿Cuál es el mayor obstáculo que tienes ahora mismo con ${c}?\n\n[ ] No sé por dónde empezar\n[ ] Falta de tiempo para implementar\n[ ] Miedo al rechazo o al juicio\n[ ] Me falta claridad en mi mensaje\n[ ] Necesito más clientas / ventas\n[ ] Otro: ___________\n\nResponde este email con tu respuesta — o simplemente escríbeme lo que está en tu mente ahora mismo.\n\nCada respuesta me ayuda a crear contenido que realmente te sirva. 💌\n\n[Tu nombre]`,
          cta: "Respóndeme aquí" },
      ],
      "Bienvenida": [
        { num: 1, dia: "Inmediato — Entrega", asunto: "🎁 ¡Bienvenida! Tu regalo te está esperando",
          cuerpo: `Hola [nombre],\n\n¡Bienvenida! Estoy muy contenta de que estés aquí.\n\nTu regalo está listo — solo haz clic abajo:\n\n👉 [Link de descarga del lead magnet]\n\nMi nombre es [tu nombre] y ayudo a [descripción de clienta ideal] a ${c}.\n\nEn los próximos días te enviaré [número] emails con [qué van a recibir]. Todo lo que desearía haber tenido cuando empecé.\n\nUna cosa importante: si tienes dudas o quieres contarme algo, responde este email. Sí, yo misma lo leo. 💌\n\nCon cariño,\n[Tu nombre]`,
          cta: "Descargar mi regalo →" },
        { num: 2, dia: "Día 2 — Conexión", asunto: "Por qué empecé todo esto... (mi historia real)",
          cuerpo: `Hola [nombre],\n\nAyer te mandé tu regalo. Espero que ya lo hayas podido explorar.\n\nHoy quiero contarte algo más personal: por qué hago lo que hago.\n\n[Tu historia de origen en 4 a 6 líneas. El momento en que decidiste hacer esto. Los obstáculos que superaste. Por qué te importa tanto ayudar a estas personas específicamente.]\n\nNo empecé con todo claro. Empecé con ganas, con miedo, y con la certeza de que lo que yo había aprendido podía ayudar a alguien más.\n\nHoy, [resultado concreto que puedes mencionar — clientas, transformaciones, lo que más te enorgullece].\n\nAquí eres bienvenida tal y como estás. 💌\n\n[Tu nombre]`,
          cta: "Seguir leyendo →" },
        { num: 3, dia: "Día 5 — Recursos", asunto: "Mis 3 mejores recursos — solo para ti",
          cuerpo: `Hola [nombre],\n\nAntes de terminar esta semana de bienvenida, quiero dejarte 3 recursos que sé que te van a servir:\n\n📌 [Título del recurso 1]\n[Descripción en una línea — por qué les será útil]\n👉 [Link]\n\n📌 [Título del recurso 2]\n[Descripción en una línea]\n👉 [Link]\n\n📌 [Título del recurso 3]\n[Descripción en una línea]\n👉 [Link]\n\nEsto es solo el principio. Cada semana voy a seguir compartiendo contigo cosas que realmente funcionan para ${c}.\n\nSi hay algo específico que quieres que comparta, responde este email. Esta lista existe para ti. 💌\n\nCon cariño,\n[Tu nombre]`,
          cta: "Ver los recursos →" },
      ],
      "Venta directa": [
        { num: 1, dia: "Día 1 — Oferta", asunto: "Una oportunidad especial, solo para ti 💌",
          cuerpo: `Hola [nombre],\n\nHoy quiero contarte algo que no he dicho públicamente todavía.\n\n${c}. Y antes de lanzarlo al mundo, quiero darte la oportunidad de entrar primero — porque llevas tiempo en esta lista y eso tiene valor.\n\nEsto es lo que te llevas:\n✦ [Beneficio 1 — en términos de resultado, no características]\n✦ [Beneficio 2]\n✦ [Beneficio 3]\n✦ [Bonus especial o lo que hace única esta oferta]\n\nInversión: [precio]\nDisponible hasta: [fecha / hora de cierre]\n\n¿Lista para el siguiente paso?\n\n👉 [Link]\n\n[Tu nombre]`,
          cta: "Ver la oferta completa →" },
        { num: 2, dia: "Día 3 — Objeciones", asunto: "Las dudas más frecuentes — las resuelvo aquí",
          cuerpo: `Hola [nombre],\n\nHace dos días te conté sobre [nombre del producto/servicio].\n\nSé que cuando vemos una oferta, surgen preguntas. Y quiero responderlas con total honestidad:\n\n❓ "¿Funciona si soy principiante?"\n→ [Respuesta honesta y específica]\n\n❓ "¿Cuánto tiempo necesito dedicarle?"\n→ [Respuesta honesta — no promesas vacías]\n\n❓ "¿Qué pasa si no me sirve?"\n→ [Tu garantía o política honesta]\n\n❓ "¿Por qué ahora?"\n→ ${c}. Y porque esperar tiene un costo que muchas no ven.\n\nSi tienes otra duda, responde este email. La respondo personalmente. 💌\n\n👉 [Link]\n\n[Tu nombre]`,
          cta: "Ya no tengo dudas, quiero entrar →" },
        { num: 3, dia: "Día 5 — Cierre", asunto: "Hoy es el último día ⏰",
          cuerpo: `Hola [nombre],\n\nNo te voy a escribir un email largo hoy.\n\nSolo quiero recordarte que hoy a las [hora] cierra esta oportunidad — y no la voy a repetir pronto.\n\nLo que se llevan:\n[Resumen en 3 líneas — resultado principal, precio, por qué ahora]\n\nPrecio hasta hoy: [precio]\nSube mañana a: [precio normal]\n\n${c}.\n\nSi sientes que esto es para ti — ese feeling importa. No lo ignores.\n\n👉 [Link]\n\nCon cariño,\n[Tu nombre]`,
          cta: "Entrar antes del cierre →" },
      ],
      "Recuperar inactivos": [
        { num: 1, dia: "Email 1 — Reconexión", asunto: "¿Sigues ahí? Te extrañé 🙋",
          cuerpo: `Hola [nombre],\n\nHace un tiempo que no me lees — y está bien. La vida se pone ocupada, los emails se acumulan, lo entiendo perfectamente.\n\nSolo quería asegurarme de que sigues recibiendo lo que te sirve.\n\nMi nombre es [tu nombre] y ayudo a [clienta ideal] a ${c}.\n\nDesde la última vez que hablamos, han pasado cosas:\n✦ [Novedad 1 — algo nuevo que tienes]\n✦ [Novedad 2 — recurso, servicio, resultado de clienta]\n✦ [Novedad 3 — lo que más te emociona compartir]\n\n¿Te quedas? Haz clic abajo para confirmar que sigues activa. 💌\n\n[Tu nombre]`,
          cta: "Sí, me quedo →" },
        { num: 2, dia: "Email 2 — Novedad", asunto: "Esto cambió y quería que lo supieras",
          cuerpo: `Hola [nombre],\n\nUna actualización rápida — porque creo que te interesa.\n\n${c}. Y eso cambió algo importante para las personas en esta comunidad.\n\n[Explica la novedad en 3 a 5 líneas. Qué es, por qué importa, cómo les beneficia.]\n\nNo te lo cuento para vender nada hoy. Te lo cuento porque creo que mereces saberlo antes que nadie.\n\n¿Quieres saber más? Responde con "SÍ" y te mando todos los detalles. 💌\n\n[Tu nombre]`,
          cta: "Quiero saber más →" },
        { num: 3, dia: "Email 3 — Honesto", asunto: "Una última pregunta — te la digo con honestidad",
          cuerpo: `Hola [nombre],\n\nSoy directa contigo porque te respeto.\n\nLlevo tiempo en tu bandeja de entrada. Y si mis emails no te aportan nada, lo mejor para las dos es que te des de baja — sin drama, sin rencor.\n\nPero si hay algo de valor aquí para ti, me encantaría seguir en contacto.\n\nUna pregunta: ¿qué necesitarías recibir de mi parte para que este espacio valga tu tiempo?\n\nResponde este email con tu respuesta. Me la leo completa.\n\nSi no respondo en [días], asumiré que prefieres darte de baja — y lo haré con respeto. 💌\n\n[Tu nombre]`,
          cta: "Me quedo y te cuento qué necesito →" },
      ],
      "Compartir valor": [
        { num: 1, dia: "Email 1 — Historia", asunto: "Esto me pasó esta semana y tenía que contarte",
          cuerpo: `Hola [nombre],\n\nEsta semana pasó algo que me pareció demasiado bueno para no compartirlo.\n\n[Historia o situación concreta que viviste — con tu clienta, en tu negocio, o aprendizaje personal. 3 a 5 líneas específicas. No genérico. Detalles reales.]\n\nLo que aprendí: ${c}.\n\nCómo puedes aplicarlo tú esta semana:\n1. [Acción concreta 1]\n2. [Acción concreta 2]\n3. [Acción concreta 3]\n\nEspero que esto te sirva tanto como a mí.\n\nSi te resonó, responde este email — me encanta saber que llegó al lugar correcto. 💌\n\n[Tu nombre]`,
          cta: "Respóndeme →" },
        { num: 2, dia: "Email 2 — Recurso", asunto: "El recurso que más me han pedido — aquí está",
          cuerpo: `Hola [nombre],\n\nEn los últimos [semanas/meses], la pregunta que más me hacen es:\n\n"[La pregunta más frecuente de tu audiencia relacionada a ${c}]"\n\nAsí que decidí crear algo concreto para responderla.\n\n[Describe el recurso: ¿es una guía? ¿un video? ¿un checklist? ¿una respuesta detallada?]\n\nEsto es lo que encuentras dentro:\n✦ [Punto 1]\n✦ [Punto 2]\n✦ [Punto 3]\n\nEs completamente gratuito — porque creo que esta información cambia cosas reales.\n\n👉 [Link al recurso]\n\nSi lo usas, cuéntame qué te pareció. 💌\n\n[Tu nombre]`,
          cta: "Acceder al recurso →" },
      ],
    };
    return CAMPS[obj] || CAMPS["Nutrir lista"];
  };

  const generarCampana = (obj, com) => {
    const o = obj || objetivo;
    const k = (typeof com === "string" ? com : comunicar).trim();
    if (!k) return;
    setThinking(true); setCampana(null); setCuerpos({}); setExpandido({});
    setTimeout(() => {
      const emails = buildCampana(o, k);
      setCampana({ objetivo: o, comunicar: k, emails });
      const ini = {};
      emails.forEach((e, i) => { ini[i] = e.cuerpo; });
      setCuerpos(ini);
      setExpandido({ 0: true });
      setThinking(false);
    }, 1000);
  };

  const downloadWordCampana = () => {
    if (!campana) return;
    const meta = OBJ_META[campana.objetivo];
    let emailsHtml = "";
    campana.emails.forEach((email, i) => {
      const txt = cuerpos[i] || email.cuerpo;
      emailsHtml += `<div style="border-left:5px solid ${meta.color};padding:20px 24px;margin:20px 0;background:${meta.bg};border-radius:0 12px 12px 0;">
        <div style="margin-bottom:10px;">
          <span style="font-size:10px;color:#9A7878;font-family:Arial;text-transform:uppercase;letter-spacing:0.5px;">${email.dia}</span>
          <div style="font-size:16px;font-weight:700;color:#2D1B1B;font-family:Arial;margin-top:3px;">${email.asunto}</div>
        </div>
        <div style="background:white;border-radius:8px;padding:16px 20px;border:1px solid rgba(0,0,0,0.07);">
          ${txt.split("\n").map(l => l.trim() ? `<p style="font-family:Arial;font-size:13px;line-height:1.75;margin:5px 0;color:#2D1B1B;">${l}</p>` : "<br/>").join("")}
        </div>
        <p style="font-size:12px;font-weight:700;color:${meta.color};font-family:Arial;margin:10px 0 0;">CTA → ${email.cta}</p>
      </div>`;
    });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Campaña: ${campana.objetivo}</title></head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;">
    <div style="background:linear-gradient(135deg,${meta.color},#E8755A);padding:36px 40px;color:white;">
      <p style="font-size:10px;color:rgba(255,255,255,0.55);margin:0 0 6px;letter-spacing:1.5px;text-transform:uppercase;">Mamá CEO · Studio de Contenido · EMAIL</p>
      <h1 style="color:white;margin:0 0 8px;font-size:24px;font-family:Arial;">${meta.emoji} Campaña: ${campana.objetivo}</h1>
      <p style="color:rgba(255,255,255,0.8);margin:0;font-size:13px;font-style:italic;">${campana.comunicar}</p>
    </div>
    <div style="max-width:700px;margin:0 auto;padding:32px 40px;">${emailsHtml}</div>
    <div style="border-top:1px solid #eee;padding:14px 40px;text-align:center;"><p style="font-size:11px;color:#ccc;font-family:Arial;">Creado con Studio de Contenido · Mamá CEO App</p></div>
    </body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Campaña - ${campana.objetivo}.doc`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const EMAIL_TIPOS = ["Presentación", "Valor / contenido", "Venta", "Seguimiento", "Gracias", "Re-engagement"];
  const EMAIL_TONOS = ["Cercano", "Profesional", "Emotivo", "Directo"];

  const buildDraft = ({ tipo, tono, tema, cta }) => {
    const TONOS_META = {
      "Cercano":     { abre: "Hola [nombre] 💌", cierra: "Con cariño,\n[Tu nombre]" },
      "Profesional": { abre: "Hola [nombre],",    cierra: "Saludos,\n[Tu nombre]" },
      "Emotivo":     { abre: "Hola [nombre] 💙",  cierra: "Con mucho cariño,\n[Tu nombre]" },
      "Directo":     { abre: "Hola [nombre],",    cierra: "Hasta pronto,\n[Tu nombre]" },
    };
    const { abre, cierra } = TONOS_META[tono] || TONOS_META["Cercano"];
    const ctaLine = cta ? `\n👉 ${cta}` : "\n👉 [CTA — qué quieres que hagan]";
    const DRAFTS = {
      "Presentación":     `${abre}\n\nMe da mucho gusto escribirte.\n\nMi nombre es [tu nombre] y ayudo a [descripción de clienta ideal] a ${tema || "[resultado que logras]"}.\n\n[2 a 3 líneas sobre tu enfoque o lo que te hace diferente. Sé específica, no genérica.]\n\nCreo que hay una posibilidad de [lo que podrían lograr juntas] — y me encantaría contarte más.${ctaLine}\n\n${cierra}`,
      "Valor / contenido":`${abre}\n\nHoy vengo a regalarte algo que sé que te va a servir.\n\nEl tema de hoy: ${tema || "[tu tema]"}.\n\n[Desarrolla en 3 a 5 párrafos. Incluye: el problema que resuelve, la idea central con un ejemplo concreto, y cómo pueden aplicarlo hoy mismo.]\n\n¿Te fue útil? Respóndeme — me encanta saber que llegó al lugar correcto. 💌${ctaLine}\n\n${cierra}`,
      "Venta":            `${abre}\n\nTengo algo que quiero contarte — y creo que llega en el momento justo.\n\n${tema || "[Lo que quieres comunicar sobre tu oferta]"}.\n\nEsto es lo que cambia para ti cuando dices sí:\n\n✦ [Beneficio 1 — en términos de resultado, no características]\n✦ [Beneficio 2]\n✦ [Beneficio 3]\n\nPrecio: [precio] · Disponible hasta: [fecha/hora]${ctaLine}\n\n${cierra}`,
      "Seguimiento":      `${abre}\n\nSolo quería hacer un seguimiento de ${tema || "[contexto — email anterior, conversación, interés que mostraron]"}.\n\nEntiendo que las decisiones toman su tiempo — y está bien.\n\nLo que quiero que sepas: [razón genuina por la que haces seguimiento — no presión, sino valor real que les aportarás].\n\nSi tienes preguntas, responde este email. Estoy aquí. 💌${ctaLine}\n\n${cierra}`,
      "Gracias":          `${abre}\n\nEste email tiene un solo propósito: decirte gracias.\n\nGracias por ${tema || "[lo que hicieron — comprar, asistir, confiar, responder]"}.\n\n[2 a 3 líneas genuinas sobre lo que significa para ti. No corporativo — desde el corazón.]\n\n[Si aplica: qué viene ahora, qué pueden esperar, cómo vas a acompañarlas]${ctaLine}\n\nGracias de verdad. 💌\n\n${cierra}`,
      "Re-engagement":    `${abre}\n\nHace un tiempo que no hablamos — y quería escribirte.\n\nNo para vender nada. Solo para ver cómo estás y recordarte que este espacio sigue aquí para ti.\n\n${tema ? `Desde la última vez, ${tema}.` : "[Algo nuevo que tienes, algo que cambió, algo valioso para ellas]"}\n\nSi hay algo en lo que pueda ayudarte ahora mismo, responde este email. Sigo aquí. 💌${ctaLine}\n\n${cierra}`,
    };
    return DRAFTS[tipo] || DRAFTS["Valor / contenido"];
  };

  const generarDraft = () => {
    if (!ef.tema.trim()) return;
    setDraft(buildDraft(ef));
  };

  const bancoEmails = saved?.campanias || [];
  const EJEMPLOS_COM = ["lanzar mi programa de 8 semanas", "mi mentoría 1:1 para mamás", "conseguir primeras clientas", "ventas por WhatsApp", "bienestar y negocio"];

  return (
    <div className="studio-tab-content">

      {/* ── LANDING ────────────────────────────────────── */}
      {view === "inicio" && (
        <div className="lm-landing">
          <div className="mpm-landing-header">
            <div className="mpm-landing-badge">📧</div>
            <h2 className="mpm-landing-title">Email Marketing</h2>
            <p className="mpm-landing-sub">El canal con mayor retorno de inversión — y el más personal. Habla directo al corazón de tu lista, sin algoritmo de por medio.</p>
          </div>

          <div className="lm-purpose-strip">
            <div className="lm-purpose-item">
              <span className="lm-purpose-num">1</span>
              <div><strong>Construye confianza</strong><p>En la bandeja de entrada no hay algoritmo. Tu mensaje llega directo — sin competir.</p></div>
            </div>
            <div className="lm-purpose-arrow">→</div>
            <div className="lm-purpose-item">
              <span className="lm-purpose-num">2</span>
              <div><strong>Educa y conecta</strong><p>Cada email es una conversación. La que más escucha, más compra.</p></div>
            </div>
            <div className="lm-purpose-arrow">→</div>
            <div className="lm-purpose-item lm-purpose-item--highlight">
              <span className="lm-purpose-num lm-purpose-num--highlight">3</span>
              <div><strong>Convierte y vende ✦</strong><p>Una lista caliente compra cuando la tratas bien. Consistencia + valor = ventas.</p></div>
            </div>
          </div>

          <div className="mpm-cards-row">
            <button className="mpm-card mpm-card--highlight" onClick={() => setView("campana")}>
              <div className="mpm-card-top">
                <span className="mpm-card-badge-ico">📨</span>
                <span className="mpm-card-tag mpm-card-tag--primary">Secuencia</span>
              </div>
              <strong className="mpm-card-name">Planificar campaña</strong>
              <p className="mpm-card-desc">Genera una secuencia completa con cuerpos de email listos para personalizar y enviar</p>
              <span className="mpm-card-link mpm-card-link--primary">Crear mi campaña →</span>
            </button>
            <button className="mpm-card" onClick={() => setView("redactar")}>
              <div className="mpm-card-top">
                <span className="mpm-card-emoji">✏️</span>
                <span className="mpm-card-tag">Individual</span>
              </div>
              <strong className="mpm-card-name">Redactar email</strong>
              <p className="mpm-card-desc">Escribe un email específico: presentación, venta, seguimiento, gracias, re-engagement</p>
              <span className="mpm-card-link">Redactar →</span>
            </button>
          </div>
        </div>
      )}

      {/* ── CAMPAÑA ─────────────────────────────────────── */}
      {view === "campana" && (
        <div>
          <div className="lm-gen-topbar">
            <button className="mpm-wizard-back-btn" onClick={() => { setView("inicio"); setCampana(null); }}>← Inicio</button>
            {campana && (
              <div style={{display:"flex",gap:"8px"}}>
                <button className="lm-dl-btn lm-dl-btn--word" onClick={downloadWordCampana}>⬇ Word</button>
                <button className="mpm-edit-btn" onClick={() => onSave("campanias", { id: Date.now(), objetivo: campana.objetivo, comunicar: campana.comunicar, fecha: new Date().toLocaleDateString("es") })}>Guardar 📧</button>
              </div>
            )}
          </div>

          <div className="email-obj-section">
            <label className="lm-crear-label" style={{marginBottom:"12px",display:"block"}}>¿Cuál es el objetivo de esta campaña?</label>
            <div className="email-obj-grid">
              {Object.entries(OBJ_META).map(([key, meta]) => (
                <button key={key}
                  className={`email-obj-pill${objetivo === key ? " active" : ""}`}
                  style={{"--obj-color": meta.color, "--obj-bg": meta.bg}}
                  onClick={() => setObjetivo(key)}>
                  <span className="email-obj-emoji">{meta.emoji}</span>
                  <div>
                    <div className="email-obj-label">{key}</div>
                    <div className="email-obj-desc">{meta.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="ideas-search-bar" style={{marginBottom:"8px"}}>
            <span className="ideas-search-icon">📧</span>
            <input
              className="ideas-search-input"
              placeholder="¿Qué quieres comunicar? Ej: lanzar mi mentoría 1:1 para mamás que quieren sus primeras clientas..."
              value={comunicar}
              onChange={e => setComunicar(e.target.value)}
              onKeyDown={e => e.key === "Enter" && generarCampana()}
            />
            <button className="ideas-search-btn" onClick={() => generarCampana()} disabled={!comunicar.trim() || thinking}>
              Generar campaña ✦
            </button>
          </div>
          {!campana && !thinking && (
            <div className="ideas-chips" style={{marginBottom:"24px"}}>
              {EJEMPLOS_COM.map(ej => (
                <button key={ej} className="ideas-chip" onClick={() => { setComunicar(ej); generarCampana(objetivo, ej); }}>{ej}</button>
              ))}
            </div>
          )}

          {thinking && (
            <div className="ideas-thinking">
              <div className="ideas-orbit-container">
                <div className="ideas-brain-orbit">📧</div>
                {["💌","🚀","🎁","💰","🔄","✨"].map((s, i) => (
                  <div key={i} className={`ideas-orbit-item ideas-orbit-${i}`}>{s}</div>
                ))}
              </div>
              <p className="ideas-thinking-text">Escribiendo tu campaña<span className="ideas-dots-anim">...</span></p>
            </div>
          )}

          {campana && !thinking && (
            <div className="email-campana-wrap">
              <div className="ideas-result-header">
                <div>
                  <span className="ideas-kw-label">{OBJ_META[campana.objetivo]?.emoji} Campaña: </span>
                  <strong className="ideas-kw-value">{campana.objetivo}</strong>
                </div>
                <span style={{fontSize:"12px",color:"#9A7878"}}>{campana.emails.length} emails · edita y copia cada uno</span>
              </div>
              {campana.emails.map((email, i) => {
                const meta = OBJ_META[campana.objetivo];
                const abierto = expandido[i];
                return (
                  <div key={i} className="email-campana-card" style={{"--ec-color": meta.color, "--ec-bg": meta.bg}}>
                    <div className="email-campana-header" onClick={() => setExpandido(p => ({...p, [i]: !p[i]}))}>
                      <div className="email-num-badge">{email.num}</div>
                      <div className="email-header-info">
                        <div className="email-dia-badge">{email.dia}</div>
                        <div className="email-subject-preview">{email.asunto}</div>
                      </div>
                      <div className="email-header-actions" onClick={e => e.stopPropagation()}>
                        <button className="guion-frase-copy"
                          onClick={() => copiar(cuerpos[i] || email.cuerpo, `email-q-${i}`)}>
                          {copiado === `email-q-${i}` ? "✓" : "Copiar"}
                        </button>
                        <span className="email-expand-ico">{abierto ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    {abierto && (
                      <div className="email-campana-body">
                        <div className="email-asunto-full">
                          <span className="email-asunto-label">Asunto:</span>
                          <strong>{email.asunto}</strong>
                        </div>
                        <div className="email-cuerpo-label">Cuerpo — edita con tu voz y tu historia:</div>
                        <textarea
                          className="email-cuerpo-textarea"
                          value={cuerpos[i] || ""}
                          onChange={e => setCuerpos(p => ({...p, [i]: e.target.value}))}
                          rows={14}
                        />
                        <div className="email-cta-row">
                          <span className="email-cta-label">CTA sugerido:</span>
                          <span className="email-cta-text">{email.cta}</span>
                          <button className="guion-frase-copy" onClick={() => copiar(email.cta, `cta-${i}`)}>{copiado === `cta-${i}` ? "✓" : "Copiar CTA"}</button>
                        </div>
                        <button className="ideas-card-copy" style={{width:"100%",marginTop:"10px",justifyContent:"center",padding:"10px"}}
                          onClick={() => copiar(cuerpos[i] || email.cuerpo, `email-full-${i}`)}>
                          {copiado === `email-full-${i}` ? "✓ Email completo copiado" : "📋 Copiar email completo"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── REDACTAR ────────────────────────────────────── */}
      {view === "redactar" && (
        <div>
          <div className="lm-gen-topbar">
            <button className="mpm-wizard-back-btn" onClick={() => { setView("inicio"); setDraft(null); }}>← Inicio</button>
          </div>

          <div className="desc-header" style={{marginBottom:"20px"}}>
            <h2 className="desc-title">Redactar email individual</h2>
            <p className="desc-subtitle">Genera el borrador completo listo para personalizar con tu voz y enviar.</p>
          </div>

          <div className="guion-obj-grid">
            <div className="guion-obj-group">
              <label className="lm-crear-label">Tipo de email</label>
              <div className="guion-obj-pills" style={{flexWrap:"wrap"}}>
                {EMAIL_TIPOS.map(t => (
                  <button key={t} className={`guion-obj-pill${ef.tipo===t?" active":""}`}
                    onClick={() => setEf(p => ({...p, tipo: t}))}>{t}</button>
                ))}
              </div>
            </div>
            <div className="guion-obj-group">
              <label className="lm-crear-label">Tono</label>
              <div className="guion-obj-pills">
                {EMAIL_TONOS.map(t => (
                  <button key={t} className={`guion-obj-pill${ef.tono===t?" active":""}`}
                    onClick={() => setEf(p => ({...p, tono: t}))}>{t}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="lm-crear-grid" style={{marginTop:"16px"}}>
            {[
              { num:"01", emoji:"✏️", label:"¿Sobre qué es el email?",  field:"tema", ph:"Lanzamiento de mi mentoría, tip sobre ventas, gracias por comprar...", hint:"Mientras más específico, mejor el borrador" },
              { num:"02", emoji:"🎯", label:"¿Cuál es tu llamada a acción?", field:"cta",  ph:"Agenda tu llamada / Escríbeme / Ver el link en mi bio", hint:"Una sola acción, concreta y fácil de hacer" },
            ].map(q => (
              <div key={q.field} className={`desc-q-card${ef[q.field]?" filled":""}`}>
                <div className="desc-q-num">{q.num}</div>
                <div className="desc-q-body">
                  <div className="desc-q-top">
                    <span className="desc-q-emoji">{q.emoji}</span>
                    <label className="desc-q-label">{q.label}</label>
                  </div>
                  <input className="desc-q-input" placeholder={q.ph} value={ef[q.field]}
                    onChange={e => setEf(p => ({...p, [q.field]: e.target.value}))} />
                  <span className="desc-q-hint">{q.hint}</span>
                </div>
              </div>
            ))}
          </div>

          <button className="mpm-step-btn" style={{marginTop:"16px"}} onClick={generarDraft} disabled={!ef.tema.trim()}>
            Generar email ✦
          </button>

          {draft && (
            <div className="email-draft-result">
              <div className="email-cuerpo-label" style={{padding:"0 0 8px"}}>Tu borrador — edita con tu voz y tu historia:</div>
              <textarea
                className="email-cuerpo-textarea"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={18}
              />
              <div className="studio-btn-row" style={{marginTop:"12px"}}>
                <button className="studio-copy-btn" onClick={() => copiar(draft, "draft")}>{copiado === "draft" ? "¡Copiado!" : "Copiar email"}</button>
                <button className="studio-btn-save" onClick={() => onSave("campanias", { id: Date.now(), objetivo: ef.tipo, comunicar: ef.tema, fecha: new Date().toLocaleDateString("es") })}>Guardar</button>
                <button className="ideas-regen-btn" onClick={generarDraft}>🔄 Regenerar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BANCO ───────────────────────────────────────── */}
      {bancoEmails.length > 0 && (
        <div className="studio-bank">
          <h4>Campañas y emails guardados ({bancoEmails.length})</h4>
          {bancoEmails.slice().reverse().map(item => {
            const meta = OBJ_META[item.objetivo];
            return (
              <div className="studio-bank-item" key={item.id}>
                <div className="studio-bank-item-top">
                  <span className="studio-tipo-badge" style={{ background: meta?.color || "#C4526A" }}>
                    {meta?.emoji || "📧"} {item.objetivo}
                  </span>
                  <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                    <small>{item.fecha}</small>
                    <button className="studio-delete-btn" onClick={() => onDelete?.("campanias", item.id)}>✕</button>
                  </div>
                </div>
                <p style={{fontSize:"13px",color:"#2D1B1B",margin:"4px 0 0"}}>{item.comunicar?.slice(0,80)}{item.comunicar?.length > 80 ? "…" : ""}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── WHATSAPP LANZAMIENTO ───────────────────────────────────────
function WhatsAppTab({ saved, onSave, onDelete, brandProfile = {} }) {
  const FORMATOS = ["Clase gratuita","Zoom cerrado","En vivo por Instagram","Solo por WhatsApp","Webinar","Otra modalidad"];
  const INIT = { producto: brandProfile.queOfreces || "", descripcion:"", precio:"", fecha:"", hora:"", formato:"Clase gratuita", promesa: brandProfile.transformacion || "", escasez:"" };
  const [form,     setForm]     = useState(INIT);
  const [plan,     setPlan]     = useState(null);
  const [thinking, setThinking] = useState(false);
  const [copiado,  setCopiado]  = useState("");

  const copiar = (t, k) => { navigator.clipboard.writeText(t); setCopiado(k); setTimeout(() => setCopiado(""), 2200); };
  const sf = (k, v) => setForm(p => ({...p, [k]: v}));

  const buildPlan = () => {
    const { producto, precio, fecha, hora, formato, promesa, escasez } = form;
    const p  = producto || "mi producto";
    const f  = fecha    || "[fecha]";
    const h  = hora     || "[hora]";
    const pr = promesa  || "lograr lo que deseas";
    const esc = escasez;
    const fmt = formato;

    const fase1 = [
      { dia:"3 – 4 días antes", label:"🌱 Intriga — crea la expectativa",
        texto:`Llevo semanas trabajando en algo — y ya casi está listo.\n\nSolo quiero que guardes esta fecha en tu agenda: ${f} a las ${h}.\n\nAlgo importante pasa ese día. Tú querrás estar aquí cuando pase. 👀\n\nTe cuento más pronto.`
      },
      { dia:"2 días antes", label:"🔥 Calentamiento — más contexto",
        texto:`Sé que te dejé con suspenso 😅 y está bien.\n\nPorque lo que viene lo merece.\n\nEl ${f} a las ${h} abro las puertas de ${p} — y quiero que seas de las primeras en conocer todos los detalles.\n\nEsto es para ti si quieres ${pr}.\n\n¿Estás lista? 🔥\n\nNos vemos el ${f}.`
      },
      { dia:"1 día antes", label:"🗓️ Recordatorio — confirma asistencia",
        texto:`Mañana es el día. 🗓️\n\nMañana ${f} a las ${h} arranca ${fmt} — y voy a estar aquí contándote todo sobre ${p}.\n\nSi quieres ${pr}, mañana es tu momento.\n\nGuarda la hora. No te vayas a ningún lado. Nos vemos aquí. 🙌`
      },
      { dia:"Noche anterior", label:"🌙 Último recordatorio — corto y directo",
        texto:`Mañana a las ${h}. 🌙\n\nSolo eso te quería decir esta noche.\n\nNos vemos aquí. 💌`
      },
    ];

    const fase2 = [
      { dia:"Mañana del lanzamiento", label:"🎉 ¡Llegó el día!",
        texto:`🎉 ¡El día llegó!\n\nHoy a las ${h} arranca ${fmt} — y estoy muy emocionada de finalmente contarte todo sobre ${p}.\n\nHoy vas a entender exactamente cómo ${pr}.\n\n${esc ? `📌 ${esc}` : "Y si decides entrar hoy, hay algo especial esperándote. 🎁"}\n\nNos vemos a las ${h}. ¡Aquí estaré! 🔥`
      },
      { dia:"1 – 2 horas antes", label:"⏰ Cuenta regresiva",
        texto:`¡Falta muy poco! ⏰\n\n${fmt} arranca en menos de 2 horas.\n\n¿Ya tienes tu espacio listo? Prepárate, acomódate y llega puntual — porque lo que compartiremos hoy puede cambiar cómo ves tu negocio.\n\nNos vemos a las ${h}. 🔥`
      },
      { dia:"A la hora exacta", label:"🔴 ¡Arrancamos!",
        texto:`🔴 ¡Arrancamos!\n\n[Agrega aquí el link de ${fmt} o instrucciones de acceso]\n\n¡Nos vemos adentro! 🎉`
      },
      { dia:"Inmediatamente después", label:"🚀 Apertura de ventas",
        texto:`Wow. 🥹\n\nLo que pasó hoy fue especial. Gracias a todas las que estuvieron presentes.\n\nY para las que no pudieron estar — no se preocupen. Lo más importante viene ahora.\n\n${p} está oficialmente abierto. 🎁\n\nEsto es lo que lograrás:\n✨ ${pr}\n\nInversión: ${precio || "[precio]"}\n${esc ? `📌 ${esc}\n` : ""}\nEl link está aquí 👇\n[Link de compra o inscripción]\n\n¿Tienes preguntas? Respóndeme aquí mismo. Estoy leyendo todo. 💌`
      },
      { dia:"2 – 4 horas después", label:"📊 Urgencia inicial",
        texto:`Ya son varias las que se animaron a entrar a ${p} en las últimas horas. 🔥\n\nTiene todo el sentido — porque esto fue creado exactamente para quienes quieren ${pr}.\n\n¿Todavía tienes preguntas? Respóndeme aquí y te doy todos los detalles.\n\nEl precio especial de lanzamiento es solo por este tiempo. Después cambia.\n\n👉 [Link]`
      },
    ];

    const fase3 = [
      { dia:"Al día siguiente", label:"☀️ Prueba social + urgencia suave",
        texto:`Buenos días ☀️\n\nAyer fue un día increíble. Gracias a todas las que estuvieron, las que preguntaron, las que se animaron.\n\nPara las que aún están pensando:\n\n${p} todavía está abierto — pero el precio de lanzamiento es solo hasta ${esc || "que se agoten los cupos"}.\n\n¿Qué necesitas saber para tomar la decisión? Respóndeme aquí. 💌`
      },
      { dia:"2 – 3 días antes del cierre", label:"⏳ Urgencia media",
        texto:`Quedan pocos días. ⏰\n\nEl acceso a ${p} al precio de lanzamiento cierra pronto — y no lo repetiré enseguida.\n\nSi quieres ${pr}... hoy es mejor que mañana. Y mañana es mejor que "ya no está disponible".\n\n${esc ? `📌 ${esc}\n` : ""}👉 [Link de compra]\n\n¿Dudas de último momento? Escríbeme. Estoy aquí para responderte. 💌`
      },
      { dia:"Últimas 24 horas", label:"🚨 Último aviso",
        texto:`🚨 Últimas horas.\n\nMañana cierra ${p}.\n\nNo voy a mandarte otro mensaje después de este. Solo quiero que sepas que el espacio todavía está ahí si lo quieres.\n\n${pr}\n\n👉 [Link]\n\nCon cariño,\n[Tu nombre]`
      },
      { dia:"Al momento del cierre", label:"🔐 Cierre oficial",
        texto:`Y... cerrado. 🔐\n\n${p} ya no está disponible.\n\nGracias a todas las que confiaron y se animaron. Las veo adentro. 🥹\n\nPara las que no pudieron esta vez — escríbanme aquí y las agrego a la lista de espera para la próxima apertura.\n\nHasta pronto. 💌`
      },
    ];

    return { fase1, fase2, fase3 };
  };

  const generarPlan = () => {
    if (!form.producto.trim()) return;
    setThinking(true); setPlan(null);
    setTimeout(() => {
      setPlan(buildPlan());
      setThinking(false);
      setTimeout(() => window.scrollTo({ top:0, behavior:"smooth" }), 50);
    }, 1200);
  };

  const FASES = [
    { key:"fase1", label:"📣 Pre-lanzamiento",        sub:"Crea expectativa antes del gran día",      color:"#E67E22", bg:"#FFF5EB" },
    { key:"fase2", label:"🚀 El día del lanzamiento",  sub:"Conecta, motiva y abre las ventas",        color:"#C4526A", bg:"#FFF0F3" },
    { key:"fase3", label:"🎯 Post-lanzamiento",        sub:"Genera urgencia y cierra con confianza",   color:"#27AE60", bg:"#EEFAF3" },
  ];

  const updateMensaje = (faseKey, idx, txt) => {
    setPlan(prev => {
      const msgs = [...prev[faseKey]];
      msgs[idx] = { ...msgs[idx], texto: txt };
      return { ...prev, [faseKey]: msgs };
    });
  };

  return (
    <div className="studio-tab-content">

      {/* ── FORMULARIO ── */}
      {!plan && !thinking && (
        <div className="wp-form-wrap">
          <div className="guion-form-intro">
            <div className="mpm-landing-badge" style={{margin:"0 auto 4px"}}>💬</div>
            <h2>Plan de Lanzamiento WhatsApp</h2>
            <p>Cuéntanos de qué trata tu lanzamiento y generaremos 13 mensajes listos para enviar: calentamiento, el gran día y el cierre.</p>
          </div>

          <div className={`desc-q-card${form.producto?" filled":""}`}>
            <div className="desc-q-num">🎁</div>
            <div className="desc-q-body">
              <label className="desc-q-label">¿Cómo se llama tu producto o servicio?</label>
              <input className="desc-q-input" autoFocus
                placeholder="Ej: Mini-curso de ventas, Membresía Mamá CEO, Consultoría VIP..."
                value={form.producto} onChange={e => sf("producto", e.target.value)} />
            </div>
          </div>

          <div className={`desc-q-card${form.promesa?" filled":""}`}>
            <div className="desc-q-num">✨</div>
            <div className="desc-q-body">
              <label className="desc-q-label">¿Qué resultado o transformación ofrece?</label>
              <input className="desc-q-input"
                placeholder="Ej: vender sin perseguir clientes, organizar su negocio en 4 semanas..."
                value={form.promesa} onChange={e => sf("promesa", e.target.value)} />
            </div>
          </div>

          <div className="wp-fecha-hora-row">
            <div className={`desc-q-card${form.fecha?" filled":""}`} style={{flex:1}}>
              <div className="desc-q-num">📅</div>
              <div className="desc-q-body">
                <label className="desc-q-label">Fecha del lanzamiento</label>
                <input className="desc-q-input" placeholder="Ej: 20 de junio" value={form.fecha} onChange={e => sf("fecha", e.target.value)} />
              </div>
            </div>
            <div className={`desc-q-card${form.hora?" filled":""}`} style={{flex:1}}>
              <div className="desc-q-num">🕐</div>
              <div className="desc-q-body">
                <label className="desc-q-label">Hora</label>
                <input className="desc-q-input" placeholder="Ej: 8pm hora Colombia" value={form.hora} onChange={e => sf("hora", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="wp-formato-group">
            <label className="lm-crear-label">¿Cómo lo vas a hacer?</label>
            <div className="guion-obj-pills" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
              {FORMATOS.map(f => (
                <button key={f} className={`guion-obj-pill${form.formato===f?" active":""}`}
                  onClick={() => sf("formato", f)}>{f}</button>
              ))}
            </div>
          </div>

          <div className="wp-precio-escasez-row">
            <div className={`desc-q-card${form.precio?" filled":""}`} style={{flex:1}}>
              <div className="desc-q-num">💰</div>
              <div className="desc-q-body">
                <label className="desc-q-label">Precio o inversión (opcional)</label>
                <input className="desc-q-input" placeholder="Ej: $97 USD, $350.000 COP" value={form.precio} onChange={e => sf("precio", e.target.value)} />
              </div>
            </div>
            <div className={`desc-q-card${form.escasez?" filled":""}`} style={{flex:1}}>
              <div className="desc-q-num">⏳</div>
              <div className="desc-q-body">
                <label className="desc-q-label">Escasez o urgencia (opcional)</label>
                <input className="desc-q-input" placeholder="Ej: Solo 30 cupos, precio especial 48h" value={form.escasez} onChange={e => sf("escasez", e.target.value)} />
              </div>
            </div>
          </div>

          <button className="mpm-step-btn" onClick={generarPlan} disabled={!form.producto.trim() || !form.promesa.trim()}>
            Generar plan de lanzamiento ✦
          </button>
        </div>
      )}

      {/* ── THINKING ── */}
      {thinking && (
        <div className="ideas-thinking">
          <div className="ideas-orb-container">
            <div className="ideas-orb ideas-orb-1" /><div className="ideas-orb ideas-orb-2" /><div className="ideas-orb ideas-orb-3" />
          </div>
          <p className="ideas-thinking-text">Creando tu plan de 13 mensajes<span className="ideas-dots-anim">...</span></p>
        </div>
      )}

      {/* ── PLAN ── */}
      {plan && !thinking && (
        <div className="wp-plan-wrap">

          {/* Topbar */}
          <div className="wp-plan-topbar">
            <button className="mpm-wizard-back-btn" onClick={() => setPlan(null)}>← Editar</button>
            <button className="mpm-wizard-back-btn" onClick={() => { setPlan(null); setForm(INIT); }}>🔄 Nuevo</button>
            <button className="mpm-edit-btn" style={{marginLeft:"auto"}} onClick={() => onSave("lanzamientos", { id: Date.now(), producto: form.producto, fecha: form.fecha, formato: form.formato, fecha_guardado: new Date().toLocaleDateString("es") })}>
              Guardar 💬
            </button>
          </div>

          {/* Header del plan */}
          <div className="wp-plan-header">
            <div className="wp-plan-titulo">{form.producto}</div>
            <div className="wp-plan-meta-row">
              {form.fecha && <span>📅 {form.fecha}</span>}
              {form.hora  && <span>🕐 {form.hora}</span>}
              <span>📍 {form.formato}</span>
              {form.precio && <span>💰 {form.precio}</span>}
            </div>
            <div className="wp-plan-total">13 mensajes · 3 fases</div>
          </div>

          {/* Las 3 fases */}
          {FASES.map(fase => (
            <div key={fase.key} className="wp-fase" style={{"--wf-color": fase.color, "--wf-bg": fase.bg}}>
              <div className="wp-fase-header">
                <div>
                  <div className="wp-fase-label">{fase.label}</div>
                  <div className="wp-fase-sub">{fase.sub}</div>
                </div>
                <span className="wp-fase-count">{plan[fase.key].length} mensajes</span>
              </div>

              <div className="wp-mensajes">
                {plan[fase.key].map((msg, i) => (
                  <div key={i} className="wp-mensaje-card">
                    <div className="wp-mensaje-head">
                      <span className="wp-dia-badge">{msg.dia}</span>
                      <span className="wp-msg-label">{msg.label}</span>
                      <button className="wp-copy-btn" onClick={() => copiar(msg.texto, `${fase.key}-${i}`)}>
                        {copiado === `${fase.key}-${i}` ? "✓ Copiado" : "Copiar"}
                      </button>
                    </div>
                    <textarea
                      className="wp-textarea"
                      value={msg.texto}
                      onChange={e => updateMensaje(fase.key, i, e.target.value)}
                      rows={Math.max(5, msg.texto.split("\n").length + 1)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Banco guardado */}
          {saved?.lanzamientos?.length > 0 && (
            <div className="studio-bank">
              <h4>Lanzamientos guardados ({saved.lanzamientos.length})</h4>
              {saved.lanzamientos.slice().reverse().map(l => (
                <div className="studio-bank-item" key={l.id}>
                  <div className="studio-bank-item-top">
                    <span className="studio-tipo-badge" style={{background:"#E67E22"}}>{l.formato}</span>
                    <small>{l.fecha_guardado}</small>
                  </div>
                  <strong style={{fontSize:"13px"}}>{l.producto}</strong>
                  {l.fecha && <span style={{fontSize:"11px",color:"#9A7878",marginLeft:"7px"}}>· {l.fecha}</span>}
                  <div style={{marginTop:"6px"}}>
                    <button className="studio-bank-action-copy" style={{color:"#C4526A"}} onClick={() => onDelete?.("lanzamientos", l.id)}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ── STUDIO PRINCIPAL ───────────────────────────────────────────
// ── REPROPÓSITO ────────────────────────────────────────────────────────────

function RepropositoTab({ saved, brandProfile = {} }) {
  const [selId,   setSelId]   = useState(null);
  const [copiado, setCopiado] = useState("");

  const copiar = (txt, key) => { navigator.clipboard.writeText(txt); setCopiado(key); setTimeout(() => setCopiado(""), 2200); };

  const guiones = (saved?.guiones || []).slice().reverse();
  const g = guiones.find(x => x.id === selId) || null;

  const line1 = (txt) => (txt || "").split("\n")[0].trim();
  const trunc = (txt, n = 120) => { const t = line1(txt); return t.length > n ? t.substring(0, n) + "..." : t; };

  const genCarrusel = () => {
    if (!g) return [];
    return [
      { num:"01", etq:"Portada",    txt: trunc(g.hook) || `Algo sobre ${g.tema} que necesitas escuchar hoy` },
      { num:"02", etq:"El dolor",   txt: trunc(g.interes) || `Lo que muchas vivimos con ${g.tema} — y que pocas dicen` },
      { num:"03", etq:"El cambio",  txt: trunc(g.deseo) || `Hasta que descubres que hay otra forma de verlo` },
      { num:"04", etq:"Resultado",  txt: g.logro ? `Cuando ${g.logro.toLowerCase().replace(/\.$/, "")}` : `Y cuando eso cambia, todo cambia` },
      { num:"05", etq:"CTA",        txt: trunc(g.ctaTxt) || `Guarda este carrusel — lo vas a querer tener cerca 📌` },
    ];
  };

  const genEmail = () => {
    if (!g) return { asunto: "", cuerpo: "" };
    const t = g.tema || "";
    const nombre = brandProfile?.nombreNegocio || "";
    return {
      asunto: `Algo sobre ${t} que no quiero que se te pase`,
      cuerpo: [
        `Hola 👋`,
        ``,
        g.hook || `Quiero contarte algo sobre ${t} que creo que te va a resonar.`,
        ``,
        g.interes ? g.interes + `\n` : "",
        g.deseo   ? g.deseo   + `\n` : "",
        g.logro   ? `Cuando ${g.logro.toLowerCase()}, todo empieza a fluir diferente.\n` : "",
        g.ctaTxt  || `Responde este email si quieres saber más — te leo con gusto.`,
        ``,
        `Con cariño,`,
        nombre || `[Tu nombre]`,
      ].filter(l => l !== "").join("\n"),
    };
  };

  const genWhatsApp = () => {
    if (!g) return [];
    const t = g.tema || "este tema";
    const dolor = g.dolor ? g.dolor.toLowerCase().replace(/\.$/, "") : `algo no estaba funcionando como querías`;
    const hook = g.hook ? `"${line1(g.hook)}"` : "";
    return [
      { label: "📣 Pre-publicación — antes de subir el reel",
        txt: `Hola 💛\n\nHoy publico algo que creo que te va a llegar directo.\n\nEs sobre ${t}.\n\nSi alguna vez has sentido que ${dolor}, este video es para ti.\n\nLo subo en un momento — estate pendiente. 👀` },
      { label: "🚀 El día que publicas",
        txt: `¡Ya está en el aire! 🎬\n\nAcabo de publicar un reel sobre ${t}.\n\n${hook}\n\nVe a verlo y cuéntame en comentarios si te resonó algo.\n\n👉 [link de tu perfil]`.replace(/\n\n\n/g, "\n\n") },
      { label: "🔁 Follow-up al día siguiente",
        txt: `Ayer publiqué algo sobre ${t} y la respuesta fue hermosa 🤍\n\nSi todavía no lo viste, te lo dejo aquí → [link]\n\nY si ya lo viste: ¿en qué parte te viste reflejada?\n\nTe leo con gusto 💬` },
    ];
  };

  const genStories = () => {
    if (!g) return [];
    const t = g.tema || "este tema";
    return [
      { num:"01", tipo:"Pregunta",       txt: g.hook    ? line1(g.hook)    : `¿Sientes que con ${t} algo todavía no está donde quieres?` },
      { num:"02", tipo:"El dolor",       txt: g.interes ? line1(g.interes) : `Muchas vivimos esto con ${t} — y se siente muy solitario.` },
      { num:"03", tipo:"La revelación",  txt: g.deseo   ? line1(g.deseo)   : `Hasta que descubres que no es falta de esfuerzo — es falta de sistema.` },
      { num:"04", tipo:"El resultado",   txt: g.logro   ? `Cuando ${g.logro.toLowerCase()}` : `Y cuando todo empieza a fluir, tu vida cambia de verdad.` },
      { num:"05", tipo:"CTA",            txt: g.ctaTxt  ? line1(g.ctaTxt)  : `Responde este story si quieres saber más — te cuento todo 💬` },
    ];
  };

  const slides  = genCarrusel();
  const email   = genEmail();
  const waMsgs  = genWhatsApp();
  const stories = genStories();

  const FORMAT_COLORS = {
    carrusel: { color:"#4A90D9", bg:"#EEF5FF" },
    email:    { color:"#C9A96E", bg:"#faf3e7" },
    wa:       { color:"#25D366", bg:"#f0faf5" },
    stories:  { color:"#C4526A", bg:"#FFF0F3" },
  };

  return (
    <div className="rp-wrap">
      <div className="rp-intro card">
        <h3 className="rp-intro-title">♻️ Repropósito de contenido</h3>
        <p className="rp-intro-sub">Elige un guión guardado y conviértelo en 4 formatos distintos — semana de contenido completa con un clic.</p>
      </div>

      {/* Guiones guardados */}
      {guiones.length === 0 ? (
        <div className="rp-empty">Aún no tienes guiones guardados. Crea uno en el tab Guión y guárdalo para reproponer su contenido aquí.</div>
      ) : (
        <div className="rp-guiones-grid">
          {guiones.map(gg => (
            <button key={gg.id}
              className={`rp-guion-card ${selId === gg.id ? "rp-guion-card--active" : ""}`}
              onClick={() => setSelId(selId === gg.id ? null : gg.id)}>
              <span className="rp-guion-obj">{gg.objetivo || "Guión"}</span>
              <span className="rp-guion-tema">{gg.tema}</span>
              <span className="rp-guion-fecha">{gg.fecha}</span>
              {selId === gg.id && <span className="rp-guion-check">✓ Seleccionado</span>}
            </button>
          ))}
        </div>
      )}

      {/* Formatos */}
      {g && (
        <>
          <div className="rp-sel-banner">
            <span>♻️ Reproponiéndolo como: <b>{g.tema}</b></span>
            <button className="rp-desel" onClick={() => setSelId(null)}>× Cambiar</button>
          </div>

          <div className="rp-formats-grid">

            {/* Carrusel */}
            <div className="rp-fcard" style={{"--rpc": FORMAT_COLORS.carrusel.color, "--rpb": FORMAT_COLORS.carrusel.bg}}>
              <div className="rp-fcard-header">
                <span className="rp-fcard-icon">📱</span>
                <span className="rp-fcard-title">Carrusel</span>
                <button className="rp-copy-all" onClick={() => copiar(slides.map((s,i) => `SLIDE ${i+1} — ${s.etq}\n${s.txt}`).join("\n\n---\n\n"), "carrusel")}>
                  {copiado === "carrusel" ? "✓ Copiado" : "Copiar todo"}
                </button>
              </div>
              <div className="rp-slides-list">
                {slides.map((s) => (
                  <div key={s.num} className="rp-slide-row">
                    <span className="rp-slide-num">{s.num}</span>
                    <div className="rp-slide-content">
                      <span className="rp-slide-etq">{s.etq}</span>
                      <p className="rp-slide-txt">{s.txt}</p>
                    </div>
                    <button className="rp-copy-item" onClick={() => copiar(s.txt, `s${s.num}`)}>
                      {copiado === `s${s.num}` ? "✓" : "📋"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Email */}
            <div className="rp-fcard" style={{"--rpc": FORMAT_COLORS.email.color, "--rpb": FORMAT_COLORS.email.bg}}>
              <div className="rp-fcard-header">
                <span className="rp-fcard-icon">📧</span>
                <span className="rp-fcard-title">Email</span>
                <button className="rp-copy-all" onClick={() => copiar(`Asunto: ${email.asunto}\n\n${email.cuerpo}`, "email")}>
                  {copiado === "email" ? "✓ Copiado" : "Copiar todo"}
                </button>
              </div>
              <div className="rp-email-wrap">
                <div className="rp-email-asunto">
                  <span className="rp-email-asunto-label">Asunto</span>
                  <span className="rp-email-asunto-txt">{email.asunto}</span>
                </div>
                <pre className="rp-email-body">{email.cuerpo}</pre>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="rp-fcard" style={{"--rpc": FORMAT_COLORS.wa.color, "--rpb": FORMAT_COLORS.wa.bg}}>
              <div className="rp-fcard-header">
                <span className="rp-fcard-icon">💬</span>
                <span className="rp-fcard-title">WhatsApp</span>
                <button className="rp-copy-all" onClick={() => copiar(waMsgs.map(m => `${m.label}\n\n${m.txt}`).join("\n\n━━━━━━━━\n\n"), "wa")}>
                  {copiado === "wa" ? "✓ Copiado" : "Copiar todo"}
                </button>
              </div>
              <div className="rp-wa-list">
                {waMsgs.map((m, i) => (
                  <div key={i} className="rp-wa-msg">
                    <div className="rp-wa-msg-header">
                      <span className="rp-wa-label">{m.label}</span>
                      <button className="rp-copy-item" onClick={() => copiar(m.txt, `wa${i}`)}>
                        {copiado === `wa${i}` ? "✓" : "📋"}
                      </button>
                    </div>
                    <pre className="rp-wa-txt">{m.txt}</pre>
                  </div>
                ))}
              </div>
            </div>

            {/* Stories */}
            <div className="rp-fcard" style={{"--rpc": FORMAT_COLORS.stories.color, "--rpb": FORMAT_COLORS.stories.bg}}>
              <div className="rp-fcard-header">
                <span className="rp-fcard-icon">📸</span>
                <span className="rp-fcard-title">Stories</span>
                <button className="rp-copy-all" onClick={() => copiar(stories.map(s => `Story ${s.num} — ${s.tipo}\n${s.txt}`).join("\n\n---\n\n"), "stories")}>
                  {copiado === "stories" ? "✓ Copiado" : "Copiar todo"}
                </button>
              </div>
              <div className="rp-stories-list">
                {stories.map((s) => (
                  <div key={s.num} className="rp-story-row">
                    <span className="rp-story-num">{s.num}</span>
                    <div className="rp-story-content">
                      <span className="rp-story-tipo">{s.tipo}</span>
                      <p className="rp-story-txt">{s.txt}</p>
                    </div>
                    <button className="rp-copy-item" onClick={() => copiar(s.txt, `st${s.num}`)}>
                      {copiado === `st${s.num}` ? "✓" : "📋"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

// ── CARRUSEL ───────────────────────────────────────────────────────────────

const CR_ESTRUCTURAS = [
  { id: "Educativo",   icon: "📚", sub: "Tips y consejos",     color: "#4A90D9", bg: "#EEF5FF" },
  { id: "Historia",    icon: "💫", sub: "Problema → Solución", color: "#C4526A", bg: "#FFF0F3" },
  { id: "Comparación", icon: "⚖️",  sub: "Antes vs Después",    color: "#C9A96E", bg: "#faf3e7" },
  { id: "Proceso",     icon: "🔢", sub: "Paso a paso",         color: "#2f9f70", bg: "#def3e8" },
];

const CR_CONTEXTO_META = {
  "Educativo":   { label: "¿Cuáles son tus tips o puntos clave? (uno por línea)", placeholder: "Bloquea 2 horas fijas para tu negocio cada día\nAgrupa tareas similares — no mezcles crear con responder\nDi no a lo que no mueve tu negocio hacia adelante\nDelega lo que no necesita tu cerebro\nRevisa tu semana cada domingo en 10 minutos" },
  "Historia":    { label: "Cuéntanos en 3 líneas: ¿cómo era el antes? → ¿qué cambió? → ¿cómo es el ahora?", placeholder: "Antes me sentía desbordada — todo urgente, sin tiempo para nada\nDescubrí que necesitaba un sistema, no más disciplina\nHoy trabajo con claridad y termino el día sin culpa" },
  "Comparación": { label: "Escribe 3 situaciones del ANTES (líneas 1-3) y 3 del AHORA (líneas 4-6)", placeholder: "Hacía de todo sin saber qué movía el negocio de verdad\nTrabajas reaccionando, apagando fuegos todo el día\nSentía que nunca era suficiente\nAhora tengo 3 prioridades claras cada semana\nTrabajo en bloques y termino lo que empiezo\nSé exactamente qué hacer cada mañana" },
  "Proceso":     { label: "¿Cuáles son los pasos de tu proceso? (uno por línea — mínimo 3, máximo 6)", placeholder: "Define qué quieres lograr esta semana con claridad\nBloquea tiempo en tu agenda antes de que lleguen los imprevistos\nAgrupa tareas por tipo de energía — crea en bloque, responde en bloque\nDi no a lo que no esté en tu lista de prioridades\nRevisa cada semana qué funcionó y qué ajustar" },
};

function buildCarruselSlides(estructura, t, ctx = "") {
  const cleanT = t.trim() || "este tema";
  const lines = ctx.split("\n").map(l => l.trim()).filter(Boolean);

  if (estructura === "Educativo") {
    const tips = lines.length >= 3 ? lines : [
      `El hábito más simple que más impacto tiene en ${cleanT}`,
      `El error que el 90% comete y que frena todo el proceso`,
      `Lo que funciona aunque no lo veas en redes — porque nadie lo muestra`,
      `La verdad incómoda que te libera cuando la aceptas`,
      `El cambio más pequeño que genera el resultado más grande`,
    ];
    return [
      { id:0, tipo:"portada",   etiqueta:"", principal:`${tips.length} claves sobre ${cleanT}\nque ojalá alguien me hubiera dicho antes`, apoyo:"Desliza para descubrirlas →" },
      ...tips.slice(0, 6).map((tip, i) => ({
        id: i+1, tipo:"contenido", etiqueta:`${String(i+1).padStart(2,"0")}`,
        principal: tip, apoyo: ""
      })),
      { id: tips.slice(0,6).length+1, tipo:"cta", etiqueta:"", principal:"¿Cuál de estas claves resonó más contigo?", apoyo:"Guarda este carrusel para cuando lo necesites 📌\nComenta el número de tu favorita 👇" },
    ];
  }

  if (estructura === "Historia") {
    const antes   = lines[0] || `Antes de entender ${cleanT}, sentía que algo no estaba funcionando`;
    const quiebre = lines[1] || `Hasta que encontré una forma diferente de verlo todo`;
    const ahora   = lines[2] || `Hoy tengo claridad, consistencia y resultados con ${cleanT}`;
    return [
      { id:0, tipo:"portada",   etiqueta:"",             principal:`Cómo ${cleanT}\ncambió todo para mí\n(y puede cambiarlo para ti)`, apoyo:"Una historia real →" },
      { id:1, tipo:"antes",     etiqueta:"El antes",     principal: antes, apoyo:"Era agotador. Trabajaba mucho y avanzaba poco." },
      { id:2, tipo:"problema",  etiqueta:"El dolor",     principal:"Lo que más me frustraba era...", apoyo:"Ver que otras lo lograban y preguntarme qué estaba haciendo mal." },
      { id:3, tipo:"quiebre",   etiqueta:"El quiebre",   principal: quiebre, apoyo:"Fue un momento pequeño. Pero lo cambió todo." },
      { id:4, tipo:"solucion",  etiqueta:"El cambio",    principal:"Lo que descubrí fue...", apoyo:"No era un secreto grande. Era algo que yo ya sabía pero no había aplicado de verdad." },
      { id:5, tipo:"resultado", etiqueta:"El resultado", principal: ahora, apoyo:"No fue de un día para otro. Pero cuando empezó a fluir, no lo pude parar." },
      { id:6, tipo:"cta",       etiqueta:"",             principal:"¿Te identificas con alguna de estas etapas?", apoyo:"Cuéntame en comentarios 💬\no escríbeme por DM — te leo 🤍" },
    ];
  }

  if (estructura === "Comparación") {
    const antesDefault = [
      `Hacía ${cleanT} sin un sistema claro — todo era caótico`,
      `Creía que necesitaba más tiempo, más energía o más recursos`,
      `Me comparaba constantemente y sentía que siempre iba atrasada`,
    ];
    const despuesDefault = [
      `Tengo un proceso claro que repito con consistencia`,
      `Trabajo con lo que tengo — y genera resultados reales`,
      `Me enfoco en mi propio camino — y eso lo cambió todo`,
    ];
    const antesItems   = lines.slice(0, 3).length >= 3 ? lines.slice(0, 3) : antesDefault;
    const despuesItems = lines.slice(3, 6).length >= 3 ? lines.slice(3, 6) : despuesDefault;
    return [
      { id:0, tipo:"portada",  etiqueta:"",           principal:`${cleanT}:\nantes vs. ahora`, apoyo:"Lo que cambió cuando lo hice diferente →" },
      { id:1, tipo:"antes",    etiqueta:"ANTES ✗",    principal: antesItems[0], apoyo:"Resultado: agotamiento, frustración, sin avance real" },
      { id:2, tipo:"antes",    etiqueta:"ANTES ✗",    principal: antesItems[1], apoyo:"" },
      { id:3, tipo:"antes",    etiqueta:"ANTES ✗",    principal: antesItems[2], apoyo:"" },
      { id:4, tipo:"vs",       etiqueta:"EL CAMBIO",  principal:"Lo que lo transformó todo:", apoyo:"Un cambio en cómo lo veía lo cambió todo." },
      { id:5, tipo:"despues",  etiqueta:"AHORA ✓",    principal: despuesItems[0], apoyo:"Resultado: claridad, consistencia, resultados reales" },
      { id:6, tipo:"despues",  etiqueta:"AHORA ✓",    principal: despuesItems[1], apoyo:"" },
      { id:7, tipo:"despues",  etiqueta:"AHORA ✓",    principal: despuesItems[2], apoyo:"" },
      { id:8, tipo:"cta",      etiqueta:"",           principal:"¿En cuál lado estás tú hoy?", apoyo:"Comenta ANTES o AHORA 👇\nTe leo en cada comentario" },
    ];
  }

  // Proceso
  const pasosDefault = [
    `Define con claridad qué quieres lograr con ${cleanT}`,
    `Crea un sistema simple que puedas repetir cada semana`,
    `Elimina lo que te frena sin que te des cuenta`,
    `Ejecuta en bloques — protege tu tiempo como una cita sagrada`,
    `Revisa, ajusta y vuelve a empezar — la consistencia gana`,
  ];
  const pasos = lines.length >= 3 ? lines.slice(0, 6) : pasosDefault;
  return [
    { id:0, tipo:"portada",   etiqueta:"",             principal:`Mi proceso para ${cleanT}\nen ${pasos.length} pasos que funcionan`, apoyo:"Desliza y aplícalos →" },
    ...pasos.map((paso, i) => ({
      id: i+1, tipo:"paso", etiqueta:`Paso ${String(i+1).padStart(2,"0")}`,
      principal: paso,
      apoyo: i === 0 ? "Aquí es donde la mayoría se salta — y por eso no llega al final." :
             i === Math.floor(pasos.length / 2) ? "Este es el paso más difícil. Y el más importante." : ""
    })),
    { id: pasos.length+1, tipo:"resultado", etiqueta:"El resultado", principal:`Cuando aplicas este proceso...`, apoyo:`Dejas de improvisar y empiezas a tener resultados consistentes con ${cleanT}.` },
    { id: pasos.length+2, tipo:"cta",       etiqueta:"", principal:"¿En qué paso estás tú ahora?", apoyo:"Comenta el número 👇\nTe doy un tip específico para ese paso" },
  ];
}

function getApoyoSuggestions(tipo) {
  const map = {
    contenido: [
      "Cuando lo apliqué por primera vez, fue un antes y un después.",
      "El error más común: hacer exactamente lo contrario sin darse cuenta.",
      "Empiézalo hoy: 5 minutos son suficientes para comenzar.",
    ],
    paso: [
      "Aquí es donde la mayoría se salta — y por eso no llega al final.",
      "El error que evita: querer ir al resultado sin pasar por este punto.",
      "Hazlo ahora: da el primer micro-paso y confírmate que empezaste.",
    ],
    antes: [
      "¿Te suena familiar? Es más común de lo que crees.",
      "Lo peor no era el cansancio. Era sentir que eso era normal.",
      "Si estás aquí ahora: lo que sientes tiene salida. De verdad.",
    ],
    problema: [
      "Y lo más duro: sentir que era la única a la que le pasaba.",
      "Eso agota más que el trabajo mismo — la sensación de no avanzar.",
      "¿Te identificas? Cuéntame en comentarios 👇",
    ],
    quiebre: [
      "Fue un momento pequeño. Pero lo cambió todo.",
      "No lo planeé. Llegó cuando más lo necesitaba.",
      "Desde ese día, empecé a ver las cosas diferente.",
    ],
    solucion: [
      "No era complicado. Era solo algo que no había aplicado de verdad.",
      "Lo había escuchado antes — pero esta vez lo entendí diferente.",
      "El resultado llegó más rápido de lo que esperaba.",
    ],
    resultado: [
      "No de un día para otro. Pero cuando llegó, fue real y duradero.",
      "Y lo más valioso: la paz que viene cuando las cosas fluyen.",
      "Si yo pude desde donde estaba, tú también puedes. En serio.",
    ],
    despues: [
      "Y lo mejor: una vez que lo tienes, ya no quieres volver atrás.",
      "No fue un gran cambio. Fue consistente y honesto.",
      "¿Cuánto tardé? Menos de lo que pensaba.",
    ],
    vs: [
      "No fue un accidente. Fue una decisión, aunque no lo pareciera.",
      "Pequeño giro. Gran diferencia.",
      "Ese 'algo' que cambió lo cambió todo.",
    ],
    portada: [
      "Esta es mi historia real — sin filtros ni versión perfecta.",
      "Desliza — hay algo aquí que es exactamente para ti.",
      "Lo que nadie muestra pero muchas vivimos.",
    ],
    cta: [
      "Te leo en comentarios. Cuéntame tu número favorito.",
      "No hay respuesta incorrecta — solo quiero saber cómo estás.",
      "Comparte esto con alguien que lo necesite hoy 🤍",
    ],
  };
  return map[tipo] || map.contenido;
}

function CarruselTab({ saved, onSave, onDelete, brandProfile = {} }) {
  const [tema,         setTema]         = useState("");
  const [estructura,   setEstructura]   = useState("Educativo");
  const [contexto,     setContexto]     = useState("");
  const [slides,       setSlides]       = useState(null);
  const [thinking,     setThinking]     = useState(false);
  const [copiado,      setCopiado]      = useState("");
  const [expandedApoyo,setExpandedApoyo]= useState(null);

  const copiar = (txt, key) => { navigator.clipboard.writeText(txt); setCopiado(key); setTimeout(() => setCopiado(""), 2200); };

  const meta = CR_ESTRUCTURAS.find(e => e.id === estructura) || CR_ESTRUCTURAS[0];
  const ctxMeta = CR_CONTEXTO_META[estructura];

  const generar = () => {
    if (!tema.trim()) return;
    setThinking(true);
    setTimeout(() => { setSlides(buildCarruselSlides(estructura, tema, contexto)); setThinking(false); }, 950);
  };

  const updateSlide = (id, field, val) =>
    setSlides(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));

  const copiarTodo = () => {
    if (!slides) return;
    const txt = slides.map((s, i) => {
      const header = `SLIDE ${i + 1}${s.etiqueta ? ` — ${s.etiqueta}` : s.tipo === "portada" ? " — PORTADA" : s.tipo === "cta" ? " — CTA" : ""}`;
      return [header, s.principal, s.apoyo ? `\n${s.apoyo}` : ""].filter(Boolean).join("\n");
    }).join("\n\n---\n\n");
    copiar(txt, "todo");
  };

  const slideStyle = (s) => {
    if (s.tipo === "portada") return { bg:`linear-gradient(145deg,${meta.color}bb,${meta.color})`, txt:"#fff", etqClr:"rgba(255,255,255,0.75)", dark:true };
    if (s.tipo === "cta")     return { bg:meta.bg, txt:"#2D1B1B", etqClr:meta.color, dark:false };
    if (s.tipo === "antes")   return { bg:"#FFF5F6", txt:"#2D1B1B", etqClr:"#C4526A", dark:false };
    if (s.tipo === "despues") return { bg:"#F0FAF5", txt:"#2D1B1B", etqClr:"#2f9f70", dark:false };
    if (s.tipo === "vs")      return { bg:"#FFFDF7", txt:"#2D1B1B", etqClr:"#C9A96E", dark:false };
    return { bg:"#fff", txt:"#2D1B1B", etqClr:meta.color, dark:false };
  };

  const savedCarruseles = saved?.carruseles || [];

  return (
    <div className="cr-wrap">

      {/* Formulario */}
      <div className="cr-form card">
        <div className="cr-form-header">
          <h3>Generador de Carrusel</h3>
          <p>Escribe tu contenido real y el sistema arma las slides por ti</p>
        </div>
        <div className="cr-field">
          <label className="cr-label">Tema del carrusel</label>
          <input className="cr-input" placeholder="Ej: organizar el tiempo cuando eres mamá y emprendes" value={tema} onChange={e => setTema(e.target.value)} />
        </div>
        <div className="cr-field">
          <label className="cr-label">Estructura</label>
          <div className="cr-estructura-grid">
            {CR_ESTRUCTURAS.map(e => (
              <button key={e.id} type="button"
                className={`cr-e-btn ${estructura === e.id ? "cr-e-btn--active" : ""}`}
                style={estructura === e.id ? {"--ec": e.color, "--eb": e.bg} : {}}
                onClick={() => { setEstructura(e.id); setContexto(""); setSlides(null); }}>
                <span className="cr-e-icon">{e.icon}</span>
                <span className="cr-e-name">{e.id}</span>
                <span className="cr-e-sub">{e.sub}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="cr-field">
          <label className="cr-label">{ctxMeta.label}</label>
          <textarea
            className="cr-input cr-textarea"
            placeholder={ctxMeta.placeholder}
            value={contexto}
            onChange={e => setContexto(e.target.value)}
            rows={5}
          />
          <span className="cr-ctx-hint">Si lo dejas vacío, usamos ejemplos genéricos que puedes editar después.</span>
        </div>
        <button className="primary-button" onClick={generar} disabled={thinking || !tema.trim()} style={{marginTop:"4px"}}>
          {thinking ? "Generando slides..." : "Generar slides 🎴"}
        </button>
      </div>

      {/* Thinking */}
      {thinking && (
        <div className="ideas-thinking" style={{marginTop:"16px"}}>
          <div className="ideas-thinking-dots"><span/><span/><span/></div>
          <p>Armando tu carrusel...</p>
        </div>
      )}

      {/* Resultado */}
      {slides && !thinking && (
        <div className="cr-result">
          <div className="cr-result-bar">
            <div className="cr-result-info">
              <span className="cr-result-count">{slides.length} slides</span>
              <span className="cr-result-sep">·</span>
              <span className="cr-result-tipo">{estructura}</span>
            </div>
            <div className="cr-result-actions">
              <button className="cr-btn cr-btn--secondary" onClick={copiarTodo}>
                {copiado === "todo" ? "✓ Copiado todo" : "📋 Copiar todo"}
              </button>
              <button className="cr-btn cr-btn--canva" onClick={() => window.open("https://www.canva.com/create/instagram-posts/", "_blank")}>
                Diseñar en Canva ↗
              </button>
              <button className="cr-btn cr-btn--save" onClick={() => onSave("carruseles", { id:Date.now(), tema, estructura, slides, fecha:new Date().toLocaleDateString("es") })}>
                Guardar 💾
              </button>
            </div>
          </div>

          <div className="cr-slides-grid">
            {slides.map((s, i) => {
              const ss = slideStyle(s);
              return (
                <div key={s.id} className="cr-card" style={{"--cr-bg": ss.bg, "--cr-border": meta.color}}>
                  <div className="cr-card-top">
                    {s.etiqueta
                      ? <span className="cr-card-etq" style={{color: ss.etqClr}}>{s.etiqueta}</span>
                      : <span/>
                    }
                    <span className="cr-card-num" style={{color: ss.dark ? "rgba(255,255,255,0.55)" : "var(--muted)"}}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="cr-card-body">
                    <textarea
                      className="cr-card-main"
                      style={{color: ss.txt}}
                      value={s.principal}
                      onChange={e => updateSlide(s.id, "principal", e.target.value)}
                      rows={4}
                    />
                    <div className="cr-apoyo-wrap">
                      <div className="cr-apoyo-label" style={{color: ss.dark ? "rgba(255,255,255,0.5)" : "var(--muted)"}}>
                        Texto de apoyo
                      </div>
                      <textarea
                        className="cr-card-apoyo"
                        style={{color: ss.dark ? "rgba(255,255,255,0.82)" : "var(--ink)"}}
                        value={s.apoyo}
                        onChange={e => updateSlide(s.id, "apoyo", e.target.value)}
                        placeholder="Escribe algo aquí o usa las ideas de abajo..."
                        rows={2}
                      />
                      <button
                        className={`cr-apoyo-trigger ${expandedApoyo === s.id ? "cr-apoyo-trigger--open" : ""}`}
                        style={{color: ss.dark ? "rgba(255,255,255,0.65)" : meta.color}}
                        onClick={() => setExpandedApoyo(expandedApoyo === s.id ? null : s.id)}>
                        💡 Ideas para este texto {expandedApoyo === s.id ? "↑" : "↓"}
                      </button>
                      {expandedApoyo === s.id && (
                        <div className="cr-apoyo-chips">
                          {getApoyoSuggestions(s.tipo).map((sug, j) => (
                            <button
                              key={j}
                              className="cr-apoyo-chip"
                              style={{"--chip-color": meta.color, "--chip-bg": meta.bg}}
                              onClick={() => { updateSlide(s.id, "apoyo", sug); setExpandedApoyo(null); }}>
                              {sug}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="cr-card-footer">
                    <button className="cr-card-copy"
                      style={{color: ss.dark ? "rgba(255,255,255,0.6)" : "var(--muted)"}}
                      onClick={() => copiar([s.principal, s.apoyo].filter(Boolean).join("\n\n"), `s${s.id}`)}>
                      {copiado === `s${s.id}` ? "✓ Copiado" : "📋 Copiar slide"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cr-canva-guide">
            <div className="cr-canva-guide-title">🎨 Cómo pasarlo a Canva en 5 minutos</div>
            <div className="cr-canva-steps">
              <div className="cr-canva-step">
                <span className="cr-step-num">1</span>
                <div>
                  <strong>Copia todo el texto</strong>
                  <p>Haz clic en "📋 Copiar todo" arriba para tener todo el contenido en tu portapapeles.</p>
                </div>
              </div>
              <div className="cr-canva-step">
                <span className="cr-step-num">2</span>
                <div>
                  <strong>Abre Canva y elige tu plantilla</strong>
                  <p>Busca "carrusel Instagram" o "presentación Instagram" — elige una que tenga entre {slides.length} y {slides.length + 2} slides.</p>
                </div>
              </div>
              <div className="cr-canva-step">
                <span className="cr-step-num">3</span>
                <div>
                  <strong>Pega el texto slide por slide</strong>
                  <p>Cada slide tiene un texto principal (título) y un texto de apoyo. Reemplaza el texto de muestra de Canva con el tuyo.</p>
                </div>
              </div>
              <div className="cr-canva-step">
                <span className="cr-step-num">4</span>
                <div>
                  <strong>Ajusta colores y fuentes a tu marca</strong>
                  <p>Usa tus colores de marca, tu foto o video en la portada, y el mismo estilo en todas las slides.</p>
                </div>
              </div>
            </div>
            <button className="cr-btn cr-btn--canva cr-canva-open-btn" onClick={() => window.open("https://www.canva.com/create/instagram-posts/", "_blank")}>
              Abrir Canva ↗
            </button>
          </div>
        </div>
      )}

      {/* Guardados */}
      {savedCarruseles.length > 0 && (
        <div className="cr-saved card">
          <h4 className="cr-saved-title">Carruseles guardados</h4>
          {savedCarruseles.map(c => (
            <div key={c.id} className="cr-saved-row">
              <div className="cr-saved-info">
                <strong>{c.tema}</strong>
                <span>{c.estructura} · {c.slides?.length} slides · {c.fecha}</span>
              </div>
              <div className="cr-saved-btns">
                <button className="cr-saved-load" onClick={() => { setTema(c.tema); setEstructura(c.estructura); setSlides(c.slides); window.scrollTo({top:0,behavior:"smooth"}); }}>Cargar</button>
                <button className="cr-saved-del" onClick={() => onDelete("carruseles", c.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

const EMPTY_BRAND = { queOfreces: "", clienteIdeal: "", transformacion: "", tono: "Cercano", redPrincipal: "Instagram", hashtags: "", nombreNegocio: "" };

function BrandProfileForm({ initial = {}, onSave, onCancel, isOnboarding = false }) {
  const [form, setForm] = useState({ ...EMPTY_BRAND, ...initial });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.queOfreces.trim() || !form.transformacion.trim()) return;
    onSave(form);
  };

  return (
    <form className="bp-form" onSubmit={handleSubmit}>
      {isOnboarding && (
        <div className="bp-onboarding-intro">
          <span className="bp-intro-icon">✦</span>
          <h2 className="bp-intro-title">Cuéntame de tu marca</h2>
          <p className="bp-intro-sub">Studio usa esto para pre-llenar todos los generadores con tu voz, tu nicho y tu estilo.</p>
        </div>
      )}

      <div className="bp-field">
        <label className="bp-label">¿Qué ofreces? <span className="bp-req">*</span></label>
        <textarea className="bp-textarea" rows={2} required value={form.queOfreces}
          onChange={e => upd("queOfreces", e.target.value)}
          placeholder="Ej: Coaching de maternidad consciente para mamás emprendedoras" />
      </div>

      <div className="bp-field">
        <label className="bp-label">¿A quién ayudas? (cliente ideal)</label>
        <textarea className="bp-textarea" rows={2} value={form.clienteIdeal}
          onChange={e => upd("clienteIdeal", e.target.value)}
          placeholder="Ej: Mamás de 28-40 años que quieren crecer sin descuidar su familia" />
      </div>

      <div className="bp-field">
        <label className="bp-label">¿Cuál es la transformación que logran contigo? <span className="bp-req">*</span></label>
        <textarea className="bp-textarea" rows={2} required value={form.transformacion}
          onChange={e => upd("transformacion", e.target.value)}
          placeholder="Ej: De agotada y desbordada a organizada, rentable y presente" />
      </div>

      <div className="bp-row-2">
        <div className="bp-field">
          <label className="bp-label">Tono de comunicación</label>
          <select className="bp-select" value={form.tono} onChange={e => upd("tono", e.target.value)}>
            <option>Cercano</option><option>Profesional</option><option>Inspirador</option><option>Directo</option>
          </select>
        </div>
        <div className="bp-field">
          <label className="bp-label">Red principal</label>
          <select className="bp-select" value={form.redPrincipal} onChange={e => upd("redPrincipal", e.target.value)}>
            <option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Spotify</option>
          </select>
        </div>
      </div>

      <div className="bp-field">
        <label className="bp-label">Hashtags (opcional)</label>
        <input className="bp-input" value={form.hashtags} onChange={e => upd("hashtags", e.target.value)} placeholder="#mamaceo #emprendedora" />
      </div>

      <div className="bp-actions">
        <button className="bp-save-btn" type="submit">
          {isOnboarding ? "Guardar y empezar ✦" : "Guardar perfil"}
        </button>
        {onCancel && (
          <button type="button" className="bp-cancel-btn" onClick={onCancel}>
            {isOnboarding ? "Saltar por ahora" : "Cancelar"}
          </button>
        )}
      </div>
    </form>
  );
}

export default function Studio({ onBack, brandProfile = {}, onSaveBrandProfile, callGemini, plan = "free" }) {
  const [activeTab, setActiveTab] = useState("mensaje");
  const [data, setData] = useState(() => loadStudio());
  const [guionSeed, setGuionSeed] = useState("");
  const [toast, setToast] = useState(null);
  const [aiUsage, setAiUsage] = useState(null);
  const [editingBrand, setEditingBrand] = useState(false);

  const hasBrand = !!(brandProfile.queOfreces && brandProfile.transformacion);
  const [skippedOnboarding, setSkippedOnboarding] = useState(hasBrand);

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

  const handleSaveBrand = (data) => {
    onSaveBrandProfile && onSaveBrandProfile(data);
    setEditingBrand(false);
    setSkippedOnboarding(true);
    setToast("Perfil de marca guardado ✦");
    setTimeout(() => setToast(null), 3000);
  };

  const tabProps = { saved: data, onSave: handleSave, onDelete: handleDelete, brandProfile, callGemini, plan, onAiUsed: setAiUsage };

  // Pantalla de bienvenida si no hay perfil y no saltó
  if (!hasBrand && !skippedOnboarding) {
    return (
      <div className="studio-shell">
        <header className="studio-header">
          <button className="studio-back-btn" onClick={onBack}>&#x2190; Volver</button>
          <span className="studio-title-text">Studio de Contenido</span>
        </header>
        <main className="studio-main studio-onboarding">
          <BrandProfileForm
            isOnboarding
            onSave={handleSaveBrand}
            onCancel={() => setSkippedOnboarding(true)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="studio-shell">
      {toast && <div className="studio-toast">{toast}</div>}
      <header className="studio-header">
        <button className="studio-back-btn" onClick={onBack}>&#x2190; Volver</button>
        <span className="studio-title-text">Studio de Contenido</span>
        {hasBrand && (
          <button className="studio-brand-edit-mini" onClick={() => setEditingBrand(true)} title="Editar perfil de marca">✦ Mi marca</button>
        )}
        {callGemini && aiUsage && (
          <span className="studio-ai-counter">
            ✨ {Math.max(0, aiUsage.limit - aiUsage.used)} de {aiUsage.limit} generaciones restantes
          </span>
        )}
        <nav className="studio-tabs-nav">
          {TABS.map(tab => (
            <button key={tab.id} className={`studio-tab-btn ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
              <span className="studio-tab-icon">{tab.icon}</span>
              <span className="studio-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Strip de perfil de marca */}
      {editingBrand ? (
        <div className="studio-brand-edit-panel">
          <BrandProfileForm
            initial={brandProfile}
            onSave={handleSaveBrand}
            onCancel={() => setEditingBrand(false)}
          />
        </div>
      ) : !hasBrand ? (
        <div className="studio-brand-strip studio-brand-strip--empty">
          <span className="sbs-star">💡</span>
          <span>Completa tu <b>Perfil de Marca</b> para que Studio use tu voz en todo</span>
          <button className="sbs-edit-btn" onClick={() => setEditingBrand(true)}>Completar →</button>
        </div>
      ) : null}

      <main className="studio-main">
        {activeTab === "mensaje"  && <MensajeTab    {...tabProps} />}
        {activeTab === "ideas"    && <IdeasTab      {...tabProps} onCrearGuion={handleCrearGuion} />}
        {activeTab === "lead"     && <LeadMagnetTab {...tabProps} />}
        {activeTab === "hooks"    && <HooksTab      {...tabProps} onCrearGuion={handleCrearGuion} />}
        {activeTab === "guion"    && <GuionTab      {...tabProps} seed={guionSeed} onSeedConsumed={() => setGuionSeed("")} />}
        {activeTab === "carrusel"    && <CarruselTab     {...tabProps} />}
        {activeTab === "reproposito" && <RepropositoTab  {...tabProps} />}
        {activeTab === "email"       && <EmailTab        {...tabProps} />}
        {activeTab === "whatsapp" && <WhatsAppTab   {...tabProps} />}
      </main>
    </div>
  );
}
