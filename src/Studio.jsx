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
  { id: "mensaje",  icon: "âœ¦",  label: "Mensaje"    },
  { id: "ideas",    icon: "ðŸ’¡", label: "Ideas"       },
  { id: "lead",     icon: "ðŸŽ", label: "Lead Magnet" },
  { id: "hooks",    icon: "ðŸª", label: "Hooks"       },
  { id: "guion",    icon: "ðŸŽ¬", label: "GuiÃ³n"       },
  { id: "carrusel",   icon: "ðŸŽ´", label: "Carrusel"    },
  { id: "reproposito",icon: "â™»ï¸", label: "RepropÃ³sito" },
  { id: "email",    icon: "ðŸ“§", label: "Email"       },
  { id: "whatsapp", icon: "ðŸ’¬", label: "WhatsApp"    },
];

// â”€â”€ MENSAJE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MensajeTab({ saved, onSave }) {
  const [view, setView] = useState("inicio"); // inicio | wizard | descubrir | results
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState("fwd");
  const [desc, setDesc] = useState({ consejo: "", resultado: "", queja: "", audiencia: "", servicio: "No lo sÃ© aÃºn" });
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
    { field: "cliente",  emoji: "ðŸ‘©â€ðŸ’¼", pregunta: "Â¿A quiÃ©n ayudas?",                hint: "Piensa en la persona a quien mÃ¡s le cambiarÃ­as la vida.",                    placeholder: "mamÃ¡s emprendedoras con hijos pequeÃ±os",  ejemplo: "Ej: mujeres que venden desde casa, coaches que empiezan, mamÃ¡s online" },
    { field: "problema", emoji: "ðŸŽ¯",  pregunta: "Â¿QuÃ© resultado logran contigo?", hint: "No el problema â€” el resultado positivo que quieren conseguir.",                placeholder: "vender mÃ¡s sin descuidar su familia",     ejemplo: "Ej: organizar su negocio, conseguir sus primeras clientas, escalar online" },
    { field: "tiempo",   emoji: "â±ï¸", pregunta: "Â¿En cuÃ¡nto tiempo lo logran?",   hint: "Un tiempo especÃ­fico genera mÃ¡s confianza que uno vago.",                      placeholder: "8 semanas",                               ejemplo: "Ej: 30 dÃ­as, 3 meses, 6 semanas, 90 dÃ­as" },
    { field: "producto", emoji: "âœ¨",  pregunta: "Â¿Con quÃ© lo logran?",            hint: "Tu servicio, programa, mÃ©todo o herramienta de acompaÃ±amiento.",               placeholder: "mi programa CEO en Casa",                 ejemplo: "Ej: mi mentorÃ­a, mi curso online, mis consultorÃ­as 1:1" },
  ];

  const goNext = () => {
    const val = mp[PASOS[step].field];
    if (!val?.trim()) return;
    if (step < 3) { setDir("fwd"); setStep(s => s + 1); }
    else {
      const result = buildMPMResult(mp);
      const pitch = `Ofrezco ${mp.producto} para ${mp.cliente}. Trabajo especÃ­ficamente con ${mp.cliente}, ayudÃ¡ndoles a ${mp.problema}. Lo logramos en ${mp.tiempo} con acompaÃ±amiento cercano y estratÃ©gico. Si eso resuena contigo, me encantarÃ­a que conversÃ¡ramos.`;
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

  // â”€â”€ DESCUBRIMIENTO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    // "que no saben X" â†’ "aprender X"
    if (/^que no saben?/i.test(q)) return q.replace(/^que no saben?\s*/i, "aprender a ");
    // "no saben X" â†’ "aprender a X"
    if (/^no saben?\s/i.test(q)) return q.replace(/^no saben?\s*/i, "aprender a ");
    // "no tengo X" â†’ "tener X"
    if (/^no tengo\s/i.test(q)) return q.replace(/^no tengo\s*/i, "tener ");
    // "no puedo X" â†’ "poder X"
    if (/^no puedo\s/i.test(q)) return q.replace(/^no puedo\s*/i, "poder ");
    // "no sÃ© X" â†’ "aprender X"
    if (/^no sÃ©\s/i.test(q)) return q.replace(/^no sÃ©\s*/i, "aprender a ");
    // "me falta X" â†’ "conseguir X"
    if (/^me falta\s/i.test(q)) return q.replace(/^me falta\s*/i, "conseguir ");
    // "que no tienen X" â†’ "tener X"
    if (/^que no tienen?\s/i.test(q)) return q.replace(/^que no tienen?\s*/i, "tener ");
    // "siento que X" â†’ remove filler
    if (/^siento que\s/i.test(q)) return q.replace(/^siento que\s*/i, "");
    return q;
  };

  const generarMision = () => {
    const { consejo, resultado, queja, audiencia, servicio } = desc;
    if (!consejo.trim() || !queja.trim()) return;

    const habilidad = limpiarConsejo(consejo);
    const clientaProb = limpiarAudiencia(audiencia) || "mamÃ¡s emprendedoras que estÃ¡n comenzando";
    const deseo = transformarDeseo(queja);

    // Zona de genialidad
    const zonaGenialidad = resultado.trim()
      ? `Tu fuerte es ${habilidad}. Ya lo has demostrado: ${resultado.trim()}.`
      : `Tu fuerte natural es ${habilidad} â€” ese es tu punto de partida.`;

    // Producto sugerido
    const PRODUCTOS = {
      "MentorÃ­a / coaching 1:1": "mi mentorÃ­a personalizada",
      "Programa o curso":        "mi programa paso a paso",
      "Taller o masterclass":    "mi taller prÃ¡ctico",
      "Comunidad":               "mi comunidad de apoyo",
      "ConsultorÃ­a":             "mis consultorÃ­as",
      "Venta de productos":      "mis productos",
    };
    const productoSug = PRODUCTOS[servicio] || "mi acompaÃ±amiento";

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

  // â”€â”€ MENSAJE PERFECTO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const buildMPMResult = ({ cliente, problema, tiempo, producto }) => ({
    completo:      `Ayudo a ${cliente} que quieren ${problema} en ${tiempo} con ${producto}`,
    bio_ig:        `Ayudo a ${cliente} a ${problema} âœ¨\nðŸ“ ${producto} | Resultados en ${tiempo}`,
    bio_linkedin:  `Especialista en ${problema} para ${cliente}. A travÃ©s de ${producto}, acompaÃ±o a mis clientas a transformar su negocio en ${tiempo}.`,
    dm:            `Hola! ðŸ‘‹ Trabajo con ${cliente} y mi especialidad es ayudarles a ${problema}. Lo logramos en ${tiempo} con ${producto}. Â¿Te gustarÃ­a saber cÃ³mo podrÃ­a funcionar para ti?`,
    historia:      `Â¿Eres ${cliente}? ðŸ‘‡\nSi quieres ${problema} en ${tiempo}, tengo algo para ti.\nEs ${producto} y ya estÃ¡ ayudando a muchas como tÃº.\nÂ¡RespÃ³ndeme aquÃ­! ðŸ’Œ`,
    story_corta:   `${cliente} â†’ ${problema} en ${tiempo} âœ¨`,
    presencial:    `Hola, trabajo con ${cliente} ayudÃ¡ndoles a ${problema}, y lo logramos en ${tiempo} a travÃ©s de ${producto}. Â¿Es algo que estÃ¡s buscando?`,
    video_intro:   `Si eres ${cliente} y quieres ${problema}â€¦ este video es para ti.`,
    pagina_ventas: `Â¿Lista para ${problema}?\nAyudo a ${cliente} a lograrlo en ${tiempo} con ${producto}.`,
    email_intro:   `Hola [nombre],\n\nMe contacto porque trabajo con ${cliente} â€” especÃ­ficamente ayudÃ¡ndoles a ${problema}.\n\nA travÃ©s de ${producto}, hemos logrado esos resultados en tan solo ${tiempo}.\n\nÂ¿Tienes 15 minutos para conversar?\n\n[Tu nombre]`,
    whatsapp_bio:  `${producto} para ${cliente} ðŸ“² | ${problema} en ${tiempo}`,
    evento:        `Me llamo [tu nombre] y acompaÃ±o a ${cliente} a ${problema} en ${tiempo}, a travÃ©s de ${producto}. Si eso te resuena, con gusto te cuento mÃ¡s.`,
  });


  const usarMensajeGuardado = (m) => {
    if (!m.campos) return;
    const campos = m.campos;
    setMp({ ...campos });
    setMpResult(buildMPMResult(campos));
    setEpText(`Ofrezco ${campos.producto} para ${campos.cliente}. Trabajo especÃ­ficamente con ${campos.cliente}, ayudÃ¡ndoles a ${campos.problema}. Lo logramos en ${campos.tiempo} con acompaÃ±amiento cercano y estratÃ©gico. Si eso resuena contigo, me encantarÃ­a que conversÃ¡ramos.`);
    setView("results");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const elevatorDesdeBanco = (m) => {
    const campos = m.campos || {};
    if (campos.cliente && campos.problema) {
      setMp({ ...campos });
      setMpResult(buildMPMResult(campos));
      setEpText(`Ofrezco ${campos.producto || "mi servicio"} para ${campos.cliente}. Trabajo especÃ­ficamente con ${campos.cliente}, ayudÃ¡ndoles a ${campos.problema}. Lo logramos en ${campos.tiempo || "poco tiempo"} con acompaÃ±amiento cercano y estratÃ©gico. Si eso resuena contigo, me encantarÃ­a que conversÃ¡ramos.`);
    } else {
      setEpText(m.texto || "");
    }
    setView("results");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const VARIACIONES = [
    { key: "bio_ig",       label: "ðŸ“Œ Bio de Instagram" },
    { key: "bio_linkedin", label: "ðŸ’¼ Bio de LinkedIn" },
    { key: "dm",           label: "ðŸ’¬ DM / WhatsApp" },
    { key: "historia",     label: "ðŸ“¸ Historia de IG" },
    { key: "story_corta",  label: "âš¡ Story ultra-corta" },
    { key: "presencial",   label: "ðŸ¤ Networking presencial" },
    { key: "video_intro",  label: "ðŸŽ¬ Intro de video" },
    { key: "pagina_ventas",label: "ðŸ›’ PÃ¡gina de ventas" },
    { key: "email_intro",  label: "ðŸ“© Email de presentaciÃ³n" },
    { key: "whatsapp_bio", label: "ðŸ“² Bio de WhatsApp Business" },
    { key: "evento",       label: "ðŸŽ¤ PresentaciÃ³n en evento" },
  ];


  return (
    <div className="studio-tab-content">

      {/* â”€â”€ INICIO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {view === "inicio" && (
        <div className="mpm-landing">
          <div className="mpm-landing-header">
            <div className="mpm-landing-badge">âœ¦</div>
            <h2 className="mpm-landing-title">Tu Mensaje Perfecto de Marketing</h2>
            <p className="mpm-landing-sub">El mensaje que hace que tu clienta ideal diga "Â¡Eso es exactamente lo que necesito!"</p>
          </div>
          <div className="mpm-cards-row">
            <button className="mpm-card" onClick={() => setView("descubrir")}>
              <div className="mpm-card-top">
                <span className="mpm-card-emoji">ðŸ—ºï¸</span>
                <span className="mpm-card-tag">ExploraciÃ³n</span>
              </div>
              <strong className="mpm-card-name">Descubrir mi mensaje</strong>
              <p className="mpm-card-desc">No sÃ© aÃºn a quiÃ©n ayudo ni quÃ© ofrezco â€” quiero encontrar mi punto de partida</p>
              <span className="mpm-card-link">Comenzar â†’</span>
            </button>
            <button className="mpm-card mpm-card--highlight" onClick={() => setView("wizard")}>
              <div className="mpm-card-top">
                <span className="mpm-card-badge-ico">âœ¦</span>
                <span className="mpm-card-tag mpm-card-tag--primary">4 pasos</span>
              </div>
              <strong className="mpm-card-name">Crear mi MPM</strong>
              <p className="mpm-card-desc">Ya sÃ© a quiÃ©n ayudo y quiero construir mi mensaje con 12 variaciones listas</p>
              <span className="mpm-card-link mpm-card-link--primary">Empezar â†’</span>
            </button>
          </div>
        </div>
      )}

      {/* â”€â”€ WIZARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {view === "wizard" && (
        <div className="mpm-wizard-card">
          <div className="mpm-wizard-nav">
            <button className="mpm-wizard-back-btn" onClick={goBack}>â† {step === 0 ? "Inicio" : "Anterior"}</button>
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
            {step < 3 ? "Siguiente â†’" : "Â¡Generar mi mensaje! âœ¦"}
          </button>
        </div>
      )}

      {/* â”€â”€ DESCUBRIMIENTO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {view === "descubrir" && (
        <div className="desc-wrap">
          <div className="desc-header">
            <button className="mpm-wizard-back-btn" onClick={() => setView("inicio")}>â† Inicio</button>
            <h2 className="desc-title">Descubre tu punto de partida</h2>
            <p className="desc-subtitle">Responde desde lo que sabes hoy â€” no hay respuestas incorrectas. Esto es solo tu punto de partida.</p>
          </div>

          <div className="desc-questions">
            {[
              { num:"01", emoji:"ðŸ’¡", label:"Â¿Con quÃ© te piden consejo o ayuda mÃ¡s frecuentemente?",        field:"consejo",   placeholder:"organizar el tiempo, vender por WhatsApp, criar con calma...", hint:"Piensa en lo que tus amigas o conocidas te preguntan mÃ¡s." },
              { num:"02", emoji:"ðŸŒŸ", label:"Â¿QuÃ© resultado concreto has logrado â€” para alguien o para ti?",field:"resultado", placeholder:"ayudÃ© a una amiga a conseguir sus primeras clientas...",           hint:"No necesita ser perfecto. Un resultado pequeÃ±o tambiÃ©n cuenta." },
              { num:"03", emoji:"ðŸŽ¯", label:"Â¿CuÃ¡l es la queja o dolor que mÃ¡s escuchas a tu alrededor?",   field:"queja",     placeholder:"no tengo tiempo, no sÃ© cÃ³mo cobrar lo que valgo...",            hint:"La frustraciÃ³n mÃ¡s repetida entre mujeres de tu cÃ­rculo." },
              { num:"04", emoji:"ðŸ‘©â€ðŸ’¼", label:"Â¿A quÃ© tipo de mujer te imaginas ayudando?",                  field:"audiencia", placeholder:"mamÃ¡s que quieren emprender, mujeres que venden desde casa...", hint:"Puede ser amplio â€” lo afinarÃ¡s mÃ¡s adelante." },
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

            <div className={`desc-q-card${desc.servicio !== "No lo sÃ© aÃºn" ? " filled" : ""}`}>
              <div className="desc-q-num">05</div>
              <div className="desc-q-body">
                <div className="desc-q-top">
                  <span className="desc-q-emoji">âœ¨</span>
                  <label className="desc-q-label">Â¿Tienes idea del servicio que quieres ofrecer?</label>
                </div>
                <div className="desc-pills">
                  {["No lo sÃ© aÃºn","MentorÃ­a / coaching 1:1","Programa o curso","Taller o masterclass","Comunidad","ConsultorÃ­a","Venta de productos"].map(s => (
                    <button key={s} className={`desc-pill${desc.servicio === s ? " active" : ""}`} onClick={() => setDesc(p => ({...p, servicio: s}))}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button className="mpm-step-btn" onClick={generarMision} disabled={!desc.consejo.trim() || !desc.queja.trim()}>
            Ver mi mapa de negocio âœ¦
          </button>

          {mision && (
            <div className="desc-result-section">
              <div className="desc-result-nota">âœ¦ Este es tu punto de partida. No necesita ser perfecto â€” solo necesitas empezar.</div>
              <div className="desc-result-grid">
                <div className="desc-rc"><div className="desc-rc-ico">ðŸ’Ž</div><strong>Tu zona de genialidad</strong><p>{mision.zonaGenialidad}</p></div>
                <div className="desc-rc"><div className="desc-rc-ico">ðŸ‘©â€ðŸ’¼</div><strong>Tu clienta probable</strong><p>{mision.clientaProb}</p></div>
                <div className="desc-rc"><div className="desc-rc-ico">ðŸŽ¯</div><strong>El problema que resuelves</strong><p>{mision.problemaTexto}</p></div>
                <div className="desc-rc desc-rc--highlight">
                  <div className="desc-rc-ico">âœ¦</div>
                  <strong>Tu primer MPM borrador</strong>
                  <p className="desc-mpm-text">{mision.mpmBorrador}</p>
                  <button className="studio-copy-btn small" onClick={() => copiar(mision.mpmBorrador, "mpm-borrador")}>{copiado === "mpm-borrador" ? "Â¡Copiado!" : "Copiar borrador"}</button>
                </div>
              </div>

              <div className="desc-ajusta">
                <div className="desc-ajusta-label">Ajusta y luego genera tus 12 variaciones</div>
                <p className="studio-helper" style={{margin:"0 0 14px"}}>Edita lo que no te convenza â€” esto es tuyo para moldearlo.</p>
                <div className="desc-ajusta-grid">
                  <div className="desc-ajusta-field"><label>Ayudo a...</label><input value={mision.sugerencias.cliente} onChange={e => setMision(p => ({...p, sugerencias: {...p.sugerencias, cliente: e.target.value}}))} /></div>
                  <div className="desc-ajusta-field"><label>...que quieren...</label><input value={mision.sugerencias.problema} onChange={e => setMision(p => ({...p, sugerencias: {...p.sugerencias, problema: e.target.value}}))} /></div>
                  <div className="desc-ajusta-field"><label>...en...</label><input placeholder="Ej: 8 semanas, 3 meses..." value={mision.sugerencias.tiempo} onChange={e => setMision(p => ({...p, sugerencias: {...p.sugerencias, tiempo: e.target.value}}))} /></div>
                  <div className="desc-ajusta-field"><label>...con...</label><input value={mision.sugerencias.producto} onChange={e => setMision(p => ({...p, sugerencias: {...p.sugerencias, producto: e.target.value}}))} /></div>
                </div>
              </div>
              <button className="mpm-step-btn" onClick={usarEnMPM}>Crear mi MPM con esto â†’</button>
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ RESULTADOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {view === "results" && (
        <div className="mpm-results-wrap">
          <div className="mpm-results-topbar">
            <div>
              <h3 className="mpm-results-title">Tu Mensaje Perfecto âœ¦</h3>
              {mp.cliente && <p className="studio-helper" style={{margin:0}}>Para: <strong>{mp.cliente}</strong> Â· {mp.problema}</p>}
            </div>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
              <button className="mpm-edit-btn" onClick={() => { setView("wizard"); setStep(0); }}>âœï¸ Editar datos</button>
              <button className="mpm-edit-btn" onClick={() => setView("inicio")}>â† Inicio</button>
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
                      <button className="studio-copy-btn" onClick={() => copiar(mpResult.completo, "completo")}>{copiado === "completo" ? "Â¡Copiado!" : "Copiar"}</button>
                      <button className="studio-btn-save" onClick={() => onSave("mensajes", { id: Date.now(), tipo: "Mensaje Perfecto", texto: mpResult.completo, campos: {...mp}, fecha: new Date().toLocaleDateString("es") })}>Guardar</button>
                    </div>
                  </div>
                  <div className="studio-variations">
                    <h4>11 variaciones â€” un mensaje para cada contexto</h4>
                    {VARIACIONES.map(({ key, label }) => (
                      <div className="studio-variation-item" key={key}>
                        <span className="studio-variation-label">{label}</span>
                        <p>{mpResult[key]}</p>
                        <button className="studio-copy-btn small" onClick={() => copiar(mpResult[key], key)}>{copiado === key ? "Â¡Copiado!" : "Copiar"}</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="mpm-results-right">
              <h4 style={{margin:"0 0 6px",fontSize:"14px",fontWeight:700,color:"#2D1B1B"}}>ðŸŽ¤ Elevator Pitch</h4>
              <p className="studio-helper">Para inversionistas, proveedores o personas de autoridad. MÃ¡ximo 2 minutos.</p>
              <textarea className="mpm-ep-textarea" value={epText} onChange={e => setEpText(e.target.value)} rows={9} />
              <div className="studio-btn-row" style={{marginTop:"8px"}}>
                <button className="studio-copy-btn" onClick={() => copiar(epText, "ep")}>{copiado === "ep" ? "Â¡Copiado!" : "Copiar pitch"}</button>
                <button className="studio-btn-save" onClick={() => onSave("mensajes", { id: Date.now(), tipo: "Elevator Pitch", texto: epText, fecha: new Date().toLocaleDateString("es") })}>Guardar pitch</button>
              </div>
              <button className="mpm-new-btn" onClick={resetWizard}>âœ¦ Crear otro mensaje</button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ BANCO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                <button className="studio-bank-action-copy" onClick={() => copiar(m.texto, `bank-${m.id}`)}>{copiado === `bank-${m.id}` ? "Â¡Copiado!" : "Copiar"}</button>
                {m.campos && (
                  <>
                    <button className="studio-bank-action-mpm" onClick={() => usarMensajeGuardado(m)}>Recrear mis 12 variaciones âœ¦</button>
                    <button className="studio-bank-action-ep" onClick={() => elevatorDesdeBanco(m)}>Generar Elevator Pitch â†’</button>
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

// â”€â”€ BLUEPRINTS DE PRODUCTOS DIGITALES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BLUEPRINTS = {
  "Mini-guÃ­a PDF": {
    emoji:"ðŸ“„", color:"#C4526A", bg:"#FFF0F3",
    descripcion:"Un PDF de 10 a 20 pÃ¡ginas que resuelve un problema muy especÃ­fico. Es el producto de entrada ideal: fÃ¡cil de crear y fÃ¡cil de comprar.",
    estructura:["Portada atractiva con tu marca","IntroducciÃ³n: el problema que resuelves y tu promesa","3 a 5 secciones de contenido accionable","Checklist o resumen de puntos clave","PÃ¡gina final con CTA (siguiente oferta o servicio)"],
    pasos:["Define el problema especÃ­fico que resuelves en una sola lÃ­nea","Escribe el contenido en Google Docs (mÃ¡x. 15 pÃ¡ginas)","DiseÃ±a las pÃ¡ginas en Canva usando tus colores de marca","Exporta como PDF","Crea una pÃ¡gina de venta en Stan Store, Gumroad o Payhip","Graba 1 reel mostrando el antes/despuÃ©s de quien lo aplique"],
    tiempo:"3 â€“ 7 dÃ­as", precio:"$9 â€“ $27 USD",
    plataformas:["Gumroad","Stan Store","Payhip","Hotmart"],
    tip:"Precio de entrada perfecto para construir confianza. Si no lo compran a $9, tampoco comprarÃ¡n tu curso de $197. Empieza aquÃ­."
  },
  "Masterclass": {
    emoji:"ðŸŽ“", color:"#C9903A", bg:"#FFF8ED",
    descripcion:"Una clase grabada de 60 a 90 minutos que enseÃ±a un resultado concreto. La asistente se va con claridad y un plan de acciÃ³n.",
    estructura:["IntroducciÃ³n: quiÃ©n eres y por quÃ© eres la persona indicada (5 min)","El problema y por quÃ© la mayorÃ­a falla (10 min)","Tu mÃ©todo paso a paso (40-60 min)","Resumen y ejercicio de cierre (10 min)","CTA final: siguiente paso o upsell a tu servicio"],
    pasos:["Define el resultado exacto que logra al terminar","Crea un outline de 4-6 partes (no mÃ¡s de 6 temas)","Graba con Loom, Zoom o tu cÃ¡mara directamente","Edita en CapCut o DaVinci â€” solo corta las pausas largas","Sube a Hotmart, Kajabi o Google Drive + landing simple","Crea urgencia con precio de lanzamiento o acceso limitado"],
    tiempo:"1 â€“ 2 semanas", precio:"$27 â€“ $97 USD",
    plataformas:["Hotmart","Kajabi","Teachable","Stan Store"],
    tip:"No tienes que ser perfecta en cÃ¡mara. La autenticidad vende mÃ¡s que la producciÃ³n. GrÃ¡bala en una sola sesiÃ³n."
  },
  "Pack de plantillas": {
    emoji:"ðŸ—‚ï¸", color:"#27AE60", bg:"#EEFAF3",
    descripcion:"Un conjunto de 5 a 15 plantillas editables en Canva, Notion o Google Sheets que ahorran tiempo a tu cliente ideal.",
    estructura:["3 a 5 plantillas en Canva (diseÃ±o visual)","1 a 3 plantillas en Notion o Google Sheets (organizaciÃ³n)","Instrucciones de uso en PDF o video corto de 5 min","Ejemplos de cÃ³mo usarlas completadas","GuÃ­a rÃ¡pida de personalizaciÃ³n con tu marca"],
    pasos:["Elige las plantillas que mÃ¡s te piden o mÃ¡s usas tÃº misma","Crea copias en Canva y habilita 'Compartir como plantilla'","Para Notion: duplÃ­calas como pÃ¡gina pÃºblica con instrucciones","Crea un PDF guÃ­a con capturas y links de acceso","Empaqueta en un ZIP o pÃ¡gina de Notion con todos los links","Vende en Gumroad, Stan Store o Etsy (sÃ­, Etsy funciona para digitales)"],
    tiempo:"2 â€“ 5 dÃ­as", precio:"$17 â€“ $47 USD",
    plataformas:["Gumroad","Stan Store","Etsy","Payhip"],
    tip:"Las plantillas de Canva son las que mÃ¡s se venden. Si tu audiencia ya usa Canva, este es tu producto mÃ¡s fÃ¡cil de crear."
  },
  "Mini-curso": {
    emoji:"ðŸŽ¬", color:"#4A90D9", bg:"#EEF5FF",
    descripcion:"Un curso de 3 a 5 mÃ³dulos en video (15-30 min cada uno) enfocado en un resultado claro. Sin sobreproducciÃ³n â€” enfocado en transformaciÃ³n.",
    estructura:["MÃ³dulo 0: Bienvenida y cÃ³mo aprovechar el curso","MÃ³dulos 1-3: El contenido principal dividido en pasos lÃ³gicos","Ejercicios o tareas prÃ¡cticas por mÃ³dulo","MÃ³dulo final: Plan de acciÃ³n y siguientes pasos","Bonus: plantilla, guÃ­a o sesiÃ³n Q&A grabada"],
    pasos:["Define el resultado en una sola frase: 'Al terminar podrÃ¡s/sabrÃ¡s/tendrÃ¡s...'","Divide el proceso en 3 o 5 pasos lÃ³gicos (cada paso = un mÃ³dulo)","Graba cada mÃ³dulo por separado â€” mÃ¡s fÃ¡cil de reeditar","DiseÃ±a las diapositivas en Canva o presenta desde pantalla con Loom","SÃºbelo a Hotmart o Kajabi y configura el acceso","Lanza primero como beta a precio reducido para conseguir testimonios"],
    tiempo:"2 â€“ 4 semanas", precio:"$47 â€“ $197 USD",
    plataformas:["Hotmart","Kajabi","Teachable","Podia"],
    tip:"Lanza primero a tu lista o comunidad a precio de beta. Los primeros testimonios valen mÃ¡s que cualquier marketing pagado."
  },
  "Ebook": {
    emoji:"ðŸ“š", color:"#E8755A", bg:"#FFF5F0",
    descripcion:"Una guÃ­a completa de 30 a 60 pÃ¡ginas que cubre un tema en profundidad. Posiciona tu expertise y genera ingresos pasivos de largo plazo.",
    estructura:["Portada profesional + pÃ¡gina de derechos de autor","Ãndice de contenido","IntroducciÃ³n: por quÃ© escribiste esto y para quiÃ©n es","4 a 8 capÃ­tulos con el contenido principal","ConclusiÃ³n + plan de acciÃ³n","Sobre la autora + recursos y links"],
    pasos:["Elige un tema donde tienes experiencia real y resultados comprobados","Escribe el Ã­ndice completo antes de escribir una sola pÃ¡gina","Redacta capÃ­tulo por capÃ­tulo â€” no intentes hacerlo de un tirÃ³n","DiseÃ±a en Canva Pro o contrata maquetaciÃ³n en Fiverr","Revisa y edita en 2-3 rondas","Publica en Amazon KDP (versiÃ³n Kindle) + Gumroad (PDF)"],
    tiempo:"3 â€“ 6 semanas", precio:"$15 â€“ $37 USD",
    plataformas:["Amazon KDP","Gumroad","Payhip","Stan Store"],
    tip:"Amazon KDP te da alcance global sin esfuerzo extra. PublÃ­calo tambiÃ©n como PDF para mÃ¡rgenes mÃ¡s altos."
  },
  "Challenge": {
    emoji:"ðŸ", color:"#E67E22", bg:"#FFF5EB",
    descripcion:"Un programa de 5 a 7 dÃ­as con una tarea diaria que guÃ­a al participante a un resultado concreto. Genera mucho engagement y comunidad.",
    estructura:["DÃ­a 0: Bienvenida, reglas y mentalidad","DÃ­as 1-5 (o 1-7): Una tarea diaria accionable de max. 30 min","Grupo de WhatsApp, Telegram o comunidad de soporte","CelebraciÃ³n de resultados al final del reto","Oferta especial al cierre para quienes lo completaron"],
    pasos:["Define el resultado del Ãºltimo dÃ­a: Â¿quÃ© habrÃ¡ logrado quien lo complete?","DiseÃ±a una tarea diaria que tome mÃ¡ximo 30 minutos","Prepara los materiales: videos cortos, PDFs o audios por dÃ­a","Crea el grupo de comunidad antes de lanzar para generar expectativa","Lanza con inscripciÃ³n previa â€” la anticipaciÃ³n aumenta el valor percibido","Prepara una oferta de cierre para quienes terminen el reto"],
    tiempo:"1 â€“ 2 semanas de preparaciÃ³n", precio:"$17 â€“ $57 USD",
    plataformas:["WhatsApp/Telegram + Hotmart","Stan Store","Kajabi Communities"],
    tip:"Los challenges tienen las tasas de completaciÃ³n mÃ¡s altas. Crea el grupo ANTES de lanzar â€” la comunidad es el motor del reto."
  },
  "Workshop": {
    emoji:"ðŸ› ï¸", color:"#8B6565", bg:"#FFF8F5",
    descripcion:"Una sesiÃ³n grabada o en vivo de 2-3 horas muy prÃ¡ctica. Al terminar, el participante tiene algo creado o resuelto.",
    estructura:["IntroducciÃ³n y contexto (15 min)","Fundamentos clave antes de hacer (20 min)","Ejercicio prÃ¡ctico guiado (90 min)","RevisiÃ³n de trabajo y preguntas (15 min)","Recursos adicionales y siguiente paso"],
    pasos:["Define quÃ© van a crear o completar al terminar el workshop","Prepara los materiales de trabajo: plantillas, hojas de trabajo, etc.","Hazlo primero en vivo por Zoom y graba la sesiÃ³n","Edita para quitar los momentos muertos y la configuraciÃ³n inicial","Sube con acceso de por vida para revenderlo continuamente","Crea un reel que muestre el 'antes y durante' del proceso"],
    tiempo:"1 semana", precio:"$37 â€“ $127 USD",
    plataformas:["Zoom + Hotmart","Kajabi","Stan Store"],
    tip:"Hazlo primero en vivo, grÃ¡balo y vÃ©ndelo para siempre. Un workshop bien ejecutado = semanas o meses de ingreso pasivo."
  },
  "Kit de recursos": {
    emoji:"ðŸŽ", color:"#C9A84C", bg:"#FBF5E0",
    descripcion:"Un paquete curado de plantillas, guÃ­as, checklists y herramientas sobre un tema. El valor estÃ¡ en la curadurÃ­a â€” no tienes que crear todo desde cero.",
    estructura:["3 a 5 plantillas editables (Canva, Notion, Word)","GuÃ­a de instrucciones en PDF","Checklists y listas de recursos","Ejemplos reales o swipe file","Bonus: recurso extra o descuento en tu servicio"],
    pasos:["Recopila lo que ya tienes y usas en tu propio negocio","Organiza los recursos en carpetas temÃ¡ticas","Crea una guÃ­a PDF que explique cÃ³mo usar cada recurso","Empaqueta todo en un ZIP descargable","Crea una pÃ¡gina de ventas describiendo cada elemento del kit","Graba un video de 3 min mostrando quÃ© hay en el kit ('unboxing digital')"],
    tiempo:"2 â€“ 4 dÃ­as", precio:"$27 â€“ $67 USD",
    plataformas:["Gumroad","Stan Store","Payhip"],
    tip:"El valor percibido de un kit es mayor que el de sus partes individuales. Ponle precio al paquete, no a cada pieza por separado."
  },
  "MembresÃ­a": {
    emoji:"ðŸ’Ž", color:"#4A90D9", bg:"#EEF5FF",
    descripcion:"Un acceso recurrente mensual o anual a contenido, comunidad o acompaÃ±amiento. El modelo de ingresos mÃ¡s estable del negocio digital.",
    estructura:["Biblioteca de contenido (clases, guÃ­as, plantillas)","Comunidad privada (WhatsApp, Telegram o plataforma)","Contenido nuevo mensual: masterclass, Q&A en vivo o recursos","Acceso a grabaciones anteriores","Beneficios exclusivos: descuentos, acceso anticipado, sesiones grupales"],
    pasos:["Define el beneficio principal que justifica el pago mensual","Empieza con contenido mÃ­nimo: 3-5 recursos ya creados + comunidad","Elige la plataforma segÃºn tu presupuesto (WhatsApp es gratis para empezar)","Fija un precio de lanzamiento bajo para conseguir los primeros 10 miembros","Entrega valor inmediato en la primera semana â€” la retenciÃ³n es clave","Sube el precio con nuevos miembros; los actuales se quedan al precio de entrada"],
    tiempo:"2 â€“ 4 semanas para lanzar", precio:"$19 â€“ $67 USD / mes",
    plataformas:["WhatsApp / Telegram","Kajabi","Hotmart Club","Skool"],
    tip:"El primer mes es el mÃ¡s difÃ­cil de retener. EntrÃ©galo todo ese mes â€” los que se queden serÃ¡n tus mejores clientes para siempre."
  },
  "GuÃ­a de procesos": {
    emoji:"ðŸ“‹", color:"#27AE60", bg:"#EEFAF3",
    descripcion:"Un sistema documentado (SOP) que otros pueden seguir para replicar tus procesos. Valioso para coaches, consultoras y creadoras de contenido.",
    estructura:["Ãndice de procesos incluidos","Por cada proceso: objetivo, herramientas, pasos detallados","Capturas de pantalla o diagramas de flujo","Checklists de verificaciÃ³n por proceso","Instrucciones de adaptaciÃ³n y personalizaciÃ³n"],
    pasos:["Documenta los 5 procesos que mÃ¡s te preguntan o que mÃ¡s usas","EscrÃ­belos como si se los explicaras a alguien que no sabe nada","AÃ±ade capturas de pantalla reales de tus herramientas","DiseÃ±a en Notion (prÃ¡ctico) o en Canva/Word","Vende como 'sistema completo' â€” el precio se justifica por el tiempo que ahorra","Ofrece actualizaciones gratuitas para siempre como ventaja competitiva"],
    tiempo:"1 â€“ 2 semanas", precio:"$37 â€“ $97 USD",
    plataformas:["Gumroad","Notion (venta directa)","Payhip","Stan Store"],
    tip:"El cliente no compra el PDF â€” compra el tiempo que le ahorras. Calcula cuÃ¡ntas horas vale lo que documentas y ponle precio a eso."
  },
};

const detectProductType = (text) => {
  const t = text.toLowerCase();
  if (t.includes("mini-guÃ­a") || t.includes("mini guia") || t.includes("pdf")) return "Mini-guÃ­a PDF";
  if (t.includes("masterclass")) return "Masterclass";
  if (t.includes("plantilla")) return "Pack de plantillas";
  if (t.includes("mini-curso") || t.includes("mini curso") || t.includes("mÃ³dulos") || t.includes("curso")) return "Mini-curso";
  if (t.includes("ebook") || t.includes("e-book")) return "Ebook";
  if (t.includes("challenge") || t.includes("reto")) return "Challenge";
  if (t.includes("workshop") || t.includes("taller")) return "Workshop";
  if (t.includes("kit")) return "Kit de recursos";
  if (t.includes("membresÃ­a") || t.includes("membresia")) return "MembresÃ­a";
  if (t.includes("proceso") || t.includes("sop")) return "GuÃ­a de procesos";
  return "Mini-guÃ­a PDF";
};

// â”€â”€ IDEAS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      label: "ðŸ“± Video Vertical", sub: "Reels Â· TikTok",
      color: "#C4526A", bg: "#FFF0F3",
      templates: [
        k => `3 errores que arruinan los resultados con ${k} (y cÃ³mo evitarlos)`,
        k => `Lo que nadie te dice sobre ${k} ðŸ‘€`,
        k => `CÃ³mo mejorar tus resultados con ${k} en solo 24 horas`,
        k => `POV: el dÃ­a que todo cambiÃ³ gracias a ${k}`,
        k => `El truco con ${k} que cambiÃ³ todo para mÃ­`,
        k => `Â¿Por quÃ© ${k} aÃºn no te estÃ¡ dando los resultados que quieres?`,
        k => `Antes vs despuÃ©s de trabajar con ${k}`,
        k => `Mini tutorial: cÃ³mo arrancar con ${k} en 60 segundos`,
        k => `Las 3 preguntas mÃ¡s frecuentes sobre ${k} â€” respondidas`,
        k => `La forma mÃ¡s fÃ¡cil de empezar con ${k} aunque no tengas experiencia`,
        k => `Esto me pasÃ³ con ${k} y no lo esperaba ðŸ˜³`,
        k => `${k}: mito vs realidad ðŸ”¥`,
        k => `5 seÃ±ales de que ya es momento de dar el siguiente paso en ${k}`,
        k => `AsÃ­ trabajo yo con ${k} â€” proceso completo en 60 segundos`,
        k => `Si estÃ¡s comenzando con ${k}, ve este video primero`,
      ],
    },
    horizontal: {
      label: "ðŸŽ¬ Video Horizontal", sub: "YouTube Â· Podcast",
      color: "#4A90D9", bg: "#EEF5FF",
      templates: [
        k => `CÃ³mo dominar ${k}: guÃ­a completa para mamÃ¡s emprendedoras`,
        k => `Mi historia con ${k}: lo que aprendÃ­ en el camino`,
        k => `Todo lo que necesitas saber sobre ${k} â€” preguntas y respuestas`,
        k => `Por quÃ© ${k} es la pieza que le falta a tu negocio`,
        k => `De cero a experta en ${k}: episodio completo`,
        k => `CÃ³mo una mamÃ¡ transformÃ³ su negocio trabajando con ${k}`,
        k => `${k} paso a paso: el proceso completo que uso con mis clientas`,
        k => `Los mitos sobre ${k} que te estÃ¡n frenando â€” y cÃ³mo superarlos`,
        k => `QuÃ© nadie te enseÃ±Ã³ sobre ${k}`,
        k => `El episodio sobre ${k} que ojalÃ¡ hubiera visto cuando empecÃ©`,
        k => `CÃ³mo trabajar con ${k} me ayudÃ³ a escalar sin quemarme`,
        k => `La estrategia con ${k} que funcionÃ³ para mis clientas este mes`,
        k => `${k} y bienestar: cÃ³mo equilibrar todo sin colapsar`,
      ],
    },
    carrusel: {
      label: "ðŸŽ  Carrusel", sub: "Instagram Â· Facebook",
      color: "#27AE60", bg: "#EEFAF3",
      templates: [
        k => `5 claves para dominar ${k} desde hoy`,
        k => `Antes vs despuÃ©s de trabajar con ${k}`,
        k => `Mi proceso con ${k}: paso a paso (lo que uso con mis clientas)`,
        k => `Errores vs soluciones: guÃ­a sobre ${k}`,
        k => `Las preguntas mÃ¡s frecuentes sobre ${k} â€” respondidas`,
        k => `Guarda este carrusel: todo sobre ${k} en un solo post`,
        k => `${k}: la guÃ­a visual que siempre quisiste tener`,
        k => `Lo que aprendÃ­ sobre ${k} en el Ãºltimo aÃ±o`,
        k => `Checklist: Â¿estÃ¡s aprovechando bien ${k}?`,
        k => `Comparte si trabajar con ${k} tambiÃ©n te ha costado ðŸ‘‡`,
        k => `3 formas de mejorar tus resultados con ${k} esta semana`,
        k => `El ABC de ${k} para emprendedoras`,
      ],
    },
    story: {
      label: "ðŸ’¬ Historia / Story", sub: "IG Stories Â· FB Stories",
      color: "#E8755A", bg: "#FFF5F0",
      templates: [
        k => `Â¿CuÃ¡l es tu mayor reto con ${k}? [encuesta]`,
        k => `Lo que aprendÃ­ sobre ${k} me tomÃ³ meses entenderlo`,
        k => `Â¿Ya probaste esto con ${k}? [encuesta sÃ­/no]`,
        k => `Una cosa que harÃ­a diferente si empezara de cero con ${k}`,
        k => `Mi reflexiÃ³n de hoy sobre ${k} â€” sigue viendo`,
        k => `Â¿QuÃ© tanto sabes sobre ${k}? Ponlo a prueba [quiz]`,
        k => `Lo que me preguntan todo el tiempo sobre ${k}`,
        k => `Gracias a ${k} mi negocio cambiÃ³ â€” te cuento cÃ³mo`,
        k => `Hoy hablamos de ${k} en el live. Â¿Te unes?`,
        k => `Tip exprÃ©s sobre ${k} que puedes aplicar hoy mismo ðŸ”¥`,
        k => `CuÃ©ntame: Â¿${k} te ha traÃ­do algÃºn reto? [caja de preguntas]`,
      ],
    },
    digital: {
      label: "ðŸ’» Producto Digital", sub: "Crea e ingresos pasivos",
      color: "#C9903A", bg: "#FFF8ED",
      templates: [
        k => `Mini-guÃ­a PDF: domina ${k} en 7 dÃ­as`,
        k => `Masterclass grabada: ${k} desde cero`,
        k => `Pack de plantillas para optimizar ${k}`,
        k => `Mini-curso de 4 mÃ³dulos: sistema para ${k}`,
        k => `Ebook: La guÃ­a completa de ${k}`,
        k => `Challenge de 7 dÃ­as: transforma tu ${k}`,
        k => `Workshop: ${k} en una tarde`,
        k => `Kit de recursos sobre ${k}`,
        k => `MembresÃ­a: acompaÃ±amiento mensual en ${k}`,
        k => `GuÃ­a de procesos (SOP): sistema para ${k}`,
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
      nicho: brandProfile.clienteIdeal || "mamÃ¡s emprendedoras",
      tono: brandProfile.tono || "Cercano",
    });
    setAiLoading(false);
    if (res?.error === "rate_limit") { setAiMsg("Muchas solicitudes en este momento. Intenta en 1 minuto."); return; }
    if (res?.error === "limite_alcanzado") { setAiMsg("Llegaste al lÃ­mite de generaciones del mes."); return; }
    if (res?.error === "No autorizada" || res?.error?.includes("autent")) { setAiMsg("Inicia sesiÃ³n para usar la IA."); return; }
    if (res?.error) { setAiMsg("Algo saliÃ³ mal. Intenta de nuevo en unos segundos."); return; }
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

  // â”€â”€ VISTA BLUEPRINT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (vistaBlueprint) {
    const bp = BLUEPRINTS[vistaBlueprint.tipo] || BLUEPRINTS["Mini-guÃ­a PDF"];
    return (
      <div className="studio-tab-content">
        <div className="bp-topbar">
          <button className="mpm-wizard-back-btn" onClick={() => setVistaBlueprint(null)}>â† Ideas</button>
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
              <div className="bp-stat-label">â± Tiempo para crearlo</div>
              <div className="bp-stat-value" style={{color: bp.color}}>{bp.tiempo}</div>
            </div>
            <div className="bp-stat" style={{borderColor: bp.color + "33", background: bp.bg}}>
              <div className="bp-stat-label">ðŸ’° Precio de venta</div>
              <div className="bp-stat-value" style={{color: bp.color}}>{bp.precio}</div>
            </div>
          </div>

          {/* Estructura */}
          <div className="bp-section">
            <div className="bp-section-title" style={{color: bp.color}}>ðŸ“‹ QuÃ© incluye</div>
            <ul className="bp-list">
              {bp.estructura.map((item, i) => (
                <li key={i} className="bp-list-item">
                  <span className="bp-dot" style={{background: bp.color}} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* CÃ³mo crearlo */}
          <div className="bp-section">
            <div className="bp-section-title" style={{color: bp.color}}>ðŸ› ï¸ CÃ³mo crearlo â€” paso a paso</div>
            <ol className="bp-steps">
              {bp.pasos.map((paso, i) => (
                <li key={i} className="bp-step">
                  <span className="bp-step-num" style={{background: bp.color, color:"#fff"}}>{i + 1}</span>
                  <span>{paso}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* DÃ³nde venderlo */}
          <div className="bp-section">
            <div className="bp-section-title" style={{color: bp.color}}>ðŸ›’ DÃ³nde venderlo</div>
            <div className="bp-platforms">
              {bp.plataformas.map((p, i) => (
                <span key={i} className="bp-platform-chip" style={{background: bp.bg, color: bp.color, borderColor: bp.color + "44"}}>{p}</span>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div className="bp-tip" style={{borderColor: bp.color, background: bp.bg}}>
            <span className="bp-tip-icon">ðŸ’¡</span>
            <p>{bp.tip}</p>
          </div>

          {/* Acciones */}
          <div className="bp-actions">
            <button className="mpm-wizard-back-btn" onClick={() => setVistaBlueprint(null)}>â† Volver a ideas</button>
            <button className="mpm-step-btn" style={{flex:1}} onClick={() => { setVistaBlueprint(null); onCrearGuion?.(vistaBlueprint.idea); }}>
              Crear guiÃ³n de lanzamiento ðŸŽ¬
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-tab-content">
      <div className="ideas-search-bar">
        <span className="ideas-search-icon">ðŸ’¡</span>
        <input
          className="ideas-search-input"
          placeholder="Escribe un tema: ventas, reels, bienestar, organizaciÃ³n..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && generar()}
        />
        <button
          className={`ideas-search-btn${callGemini ? " studio-ai-btn" : ""}`}
          onClick={() => callGemini ? generarConIA() : generar()}
          disabled={!keyword.trim() || thinking || aiLoading}
        >
          {(thinking || aiLoading) ? "Generando..." : callGemini ? "Generar âœ¨" : "Generar âœ¦"}
        </button>
      </div>
      {aiMsg && <p className="studio-ai-msg">{aiMsg}</p>}

      {!ideas && !thinking && !aiLoading && (
        <div className="ideas-empty">
          <div className="ideas-brain-glow">ðŸ§ </div>
          <h3>Â¿Sobre quÃ© quieres crear contenido?</h3>
          <p>Escribe un tema y te genero ideas organizadas por formato â€” verticales, horizontales, carruseles y stories.</p>
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
              <button className={`ideas-regen-btn${callGemini ? " studio-ai-regen-btn" : ""}`} onClick={() => callGemini ? generarConIA(ideas.keyword) : generar(ideas.keyword)}>ðŸ”„ Nuevas ideas {callGemini ? "âœ¨" : ""}</button>
            </div>
          </div>
          {Object.entries(CATS).map(([catKey, cat]) => (
            <div className="ideas-cat-section" key={catKey} style={{ "--cat-color": cat.color, "--cat-bg": cat.bg }}>
              <div className="ideas-cat-header">
                <div className="ideas-cat-title">
                  <span className="ideas-cat-label">{cat.label}</span>
                  <span className="ideas-cat-sub">{cat.sub}</span>
                </div>
                <button className="ideas-mas-btn" onClick={() => masIdeas(catKey)}>+ MÃ¡s ideas</button>
              </div>
              <div className="ideas-cards-grid">
                {ideas[catKey].map((idea, i) => (
                  <div className={`ideas-card${catKey==="digital"?" ideas-card--digital":""}`} key={idea.id} style={{ animationDelay: `${i * 70}ms` }}>
                    <p className="ideas-card-text">{idea.texto}</p>
                    <div className="ideas-card-actions">
                      <button className="ideas-card-copy" onClick={() => copiar(idea.texto, idea.id)}>
                        {copiado === idea.id ? "âœ“ Copiado" : "Copiar"}
                      </button>
                      <button className="ideas-card-save" onClick={() => onSave("ideas", {
                        id: Date.now(), titulo: idea.texto, tipo: cat.label,
                        plataforma: cat.sub, color: cat.color, keyword: ideas.keyword,
                        fecha: new Date().toLocaleDateString("es"),
                      })}>Guardar</button>
                      {catKey === "digital" ? (
                        <button className="ideas-card-plan" onClick={() => setVistaBlueprint({ tipo: detectProductType(idea.texto), keyword: ideas.keyword, idea: idea.texto })}>
                          Ver plan â†’
                        </button>
                      ) : (
                        <button className="ideas-card-guion" onClick={() => onCrearGuion?.(idea.texto)}>GuiÃ³n ðŸŽ¬</button>
                      )}
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
                  <button className="studio-delete-btn" onClick={() => onDelete("ideas", idea.id)}>âœ•</button>
                </div>
              </div>
              <p className="studio-idea-titulo">{idea.titulo}</p>
              <div className="studio-bank-actions">
                <button className="studio-bank-action-copy" onClick={() => copiar(idea.titulo, `bank-${idea.id}`)}>
                  {copiado === `bank-${idea.id}` ? "Â¡Copiado!" : "Copiar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// â”€â”€ LEAD MAGNET â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LeadMagnetTab({ saved, onSave, onDelete, brandProfile = {} }) {
  const [view, setView]         = useState("inicio");
  const [keyword, setKeyword]   = useState(brandProfile.queOfreces || "");
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
      label: "ðŸ“„ GuÃ­a / Ebook", sub: "PDF descargable Â· Evergreen",
      color: "#C4526A", bg: "#FFF0F3",
      templates: [
        k => `La guÃ­a definitiva de ${k} para mamÃ¡s emprendedoras`,
        k => `${k}: los 5 pasos que nadie te ha explicado`,
        k => `De cero a resultados con ${k} â€” guÃ­a paso a paso`,
        k => `Todo lo que necesitas sobre ${k} en un solo lugar`,
        k => `El mÃ©todo de ${k} para empezar desde hoy`,
        k => `${k} sin complicarte: guÃ­a express de 10 minutos`,
        k => `Las 7 claves de ${k} que cambiarÃ¡n tu negocio`,
        k => `Mini guÃ­a: cÃ³mo aplicar ${k} esta misma semana`,
        k => `${k} para principiantes: empieza sin experiencia`,
      ],
    },
    checklist: {
      label: "âœ… Checklist / Plantilla", sub: "Listo para usar Â· Imprimible",
      color: "#27AE60", bg: "#EEFAF3",
      templates: [
        k => `Checklist: todo lo que necesitas para dominar ${k}`,
        k => `Plantilla lista: organiza tu ${k} paso a paso`,
        k => `El checklist de ${k} que uso con mis clientas`,
        k => `Lista de verificaciÃ³n: Â¿estÃ¡s lista para ${k}?`,
        k => `Plantilla gratuita: planifica tu ${k} en minutos`,
        k => `El checklist esencial de ${k} â€” descÃ¡rgalo gratis`,
        k => `Hoja de trabajo: domina ${k} en 7 acciones concretas`,
        k => `${k}: la plantilla que te ahorra horas cada semana`,
      ],
    },
    clase: {
      label: "ðŸŽ“ Mini-clase / Webinar", sub: "Video Â· Audio Â· Live",
      color: "#4A90D9", bg: "#EEF5FF",
      templates: [
        k => `Mini-clase gratuita: el mÃ©todo de ${k} que funciona`,
        k => `Masterclass: domina ${k} sin aÃ±os de experiencia`,
        k => `Clase exprÃ©s de ${k} en 20 minutos`,
        k => `Taller virtual: implementa ${k} esta semana`,
        k => `El webinar de ${k}: tu primera victoria rÃ¡pida`,
        k => `Live gratuito: ${k} para mamÃ¡s que empiezan desde cero`,
        k => `Video privado: mi proceso completo de ${k}`,
        k => `CapacitaciÃ³n express: ${k} en una sola sesiÃ³n`,
      ],
    },
    reto: {
      label: "ðŸ”¥ Reto / Challenge", sub: "3-7 dÃ­as de acciÃ³n",
      color: "#E8755A", bg: "#FFF5F0",
      templates: [
        k => `Reto de 5 dÃ­as: transforma tu ${k} con una acciÃ³n diaria`,
        k => `Challenge gratuito: ${k} en 7 dÃ­as`,
        k => `El reto de ${k} que cambiarÃ¡ tu negocio esta semana`,
        k => `3 dÃ­as para dominar ${k} â€” Ãºnete gratis`,
        k => `Reto express: tu primera victoria con ${k}`,
        k => `Challenge de ${k}: una acciÃ³n diaria durante 5 dÃ­as`,
        k => `El reto de ${k} que mis clientas llaman transformador`,
        k => `Mini reto de ${k}: empieza hoy, ve resultados en 3 dÃ­as`,
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
    { key: "guia",      emoji: "ðŸ“„", label: "GuÃ­a / Ebook",         desc: "PDF descargable" },
    { key: "checklist", emoji: "âœ…", label: "Checklist / Plantilla", desc: "Lista de acciones" },
    { key: "clase",     emoji: "ðŸŽ“", label: "Mini-clase / Webinar",  desc: "Video + guiÃ³n" },
    { key: "reto",      emoji: "ðŸ”¥", label: "Reto / Challenge",      desc: "3-7 dÃ­as" },
  ];

  const SECCIONES_META = {
    guia:      { label: "Secciones del documento",  add: "+ Agregar secciÃ³n", ph: (i) => `SecciÃ³n ${i+1}: ej. "CÃ³mo organizarte antes de vender"` },
    checklist: { label: "Ãtems del checklist",       add: "+ Agregar Ã­tem",    ph: (i) => `Ãtem ${i+1}: ej. "Identificar a tu clienta ideal"` },
    clase:     { label: "MÃ³dulos de la clase",       add: "+ Agregar mÃ³dulo",  ph: (i) => `MÃ³dulo ${i+1}: ej. "CÃ³mo encontrar tu primera clienta"` },
    reto:      { label: "DÃ­as / acciones del reto",  add: "+ Agregar dÃ­a",     ph: (i) => `DÃ­a ${i+1}: ej. "Define tu oferta principal"` },
  };

  const TIPO_LABELS  = { guia: "ðŸ“„ GuÃ­a",       checklist: "âœ… Checklist", clase: "ðŸŽ“ Mini-clase", reto: "ðŸ”¥ Reto" };
  const TIPO_COLORS  = { guia: "#C4526A",        checklist: "#27AE60",     clase: "#4A90D9",       reto: "#E8755A" };

  const buildDoc = () => {
    const { tipo, titulo, promesa, audiencia, secciones, cta, producto } = form;
    const aud    = audiencia || "mamÃ¡s emprendedoras";
    const prod   = producto  || "mi programa / servicio";
    const ctaTxt = cta       || `Conoce ${prod} â†’`;
    const secc   = secciones.filter(s => s.trim());

    let estructura = [];
    if (tipo === "guia") {
      estructura = [
        { tipo: "intro", label: "âœ¦ IntroducciÃ³n", content: `Hola! Soy [tu nombre] y creÃ© esta guÃ­a especialmente para ti.\n\nSi eres ${aud}, sÃ© exactamente el reto que estÃ¡s viviendo. Esta guÃ­a es tu punto de partida.\n\nAl terminar, vas a ${promesa || "tener claridad y pasos concretos para avanzar"}.` },
        ...(secc.length > 0 ? secc : ["SecciÃ³n 1", "SecciÃ³n 2", "SecciÃ³n 3"]).map((s, i) => ({
          tipo: "seccion", label: `SecciÃ³n ${i+1}: ${s}`,
          content: "[Desarrolla aquÃ­ el contenido â€” 3-5 pÃ¡rrafos con ejemplos concretos y pasos accionables]",
        })),
        { tipo: "cta", label: "ðŸŽ Â¿Lista para el siguiente nivel?", content: `Esta guÃ­a es solo el principio.\n\nCuando estÃ©s lista para ir mÃ¡s lejos, ${prod} fue diseÃ±ado exactamente para ti.\n\nðŸ‘‰ ${ctaTxt}` },
      ];
    } else if (tipo === "checklist") {
      const items = secc.length > 0 ? secc : ["Paso 1: [Describe la acciÃ³n]","Paso 2: [Describe la acciÃ³n]","Paso 3: [Describe la acciÃ³n]","Paso 4: [Describe la acciÃ³n]","Paso 5: [Describe la acciÃ³n]"];
      estructura = [
        { tipo: "intro", label: "Para quÃ© es este checklist", content: `Para ${aud} que quieren ${promesa || "avanzar con claridad y sin pasos perdidos"}.` },
        { tipo: "checklist-items", label: "Tu lista de acciones", items },
        { tipo: "cta", label: "ðŸŽ Â¿Completaste el checklist?", content: `Â¡Eso significa que estÃ¡s lista para el siguiente paso!\n\nðŸ‘‰ ${ctaTxt}` },
      ];
    } else if (tipo === "clase") {
      estructura = [
        { tipo: "guion-parte", label: "ðŸŽ¬ BIENVENIDA (2-3 min)", content: `"Â¡Hola! Soy [tu nombre] y bienvenida a esta mini-clase.\n\nHoy vamos a aprender: ${titulo}.\n\nAl terminar, vas a ${promesa || "tener una acciÃ³n clara para implementar hoy"}."\n\n[PresÃ©ntate brevemente: quiÃ©n eres y a quiÃ©n ayudas]` },
        ...(secc.length > 0 ? secc : ["MÃ³dulo 1","MÃ³dulo 2","MÃ³dulo 3"]).map((s, i) => ({
          tipo: "guion-parte", label: `ðŸ“– MÃ“DULO ${i+1}: ${s}`,
          content: `"[Desarrolla el contenido de este mÃ³dulo]\n\n[Incluye 1 ejemplo concreto o historia]\n\n[Da 1 acciÃ³n prÃ¡ctica que puedan tomar ahora mismo]"`,
        })),
        { tipo: "guion-parte", label: "ðŸš€ CIERRE + CTA (3-5 min)", content: `"Hemos llegado al final y ya tienes [resume lo aprendido].\n\nSi esto te fue Ãºtil y quieres ir mÃ¡s lejos, ${prod} fue creado para ti.\n\n${ctaTxt}\n\nÂ¡Gracias por estar aquÃ­! ðŸ’Œ"` },
      ];
    } else if (tipo === "reto") {
      const dias = secc.length > 0 ? secc : ["DÃ­a 1: Claridad","DÃ­a 2: AcciÃ³n","DÃ­a 3: RevisiÃ³n","DÃ­a 4: Profundidad","DÃ­a 5: CelebraciÃ³n"];
      estructura = [
        { tipo: "intro", label: "âœ¦ Bienvenida al Reto", content: `Â¡Hola! Soy [tu nombre] y diseÃ±Ã© este reto para ${aud}.\n\nDurante los prÃ³ximos dÃ­as, vas a ${promesa || "avanzar con una acciÃ³n pequeÃ±a cada dÃ­a"}.\n\nReglas simples: un dÃ­a a la vez, una acciÃ³n a la vez. Â¡TÃº puedes!` },
        { tipo: "reto-dias", label: "Tus dÃ­as de acciÃ³n", dias },
        { tipo: "cta", label: "ðŸŽ Â¡Completaste el reto!", content: `Â¡Felicidades! Eso dice mucho de ti.\n\nAhora imagina lo que puedes lograr con acompaÃ±amiento real.\n\nðŸ‘‰ ${ctaTxt}` },
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
          body += `<p style="font-family:Arial,sans-serif;margin:8px 0;font-size:14px;">â˜ &nbsp;${item}</p>`;
        });
      } else if (parte.tipo === "reto-dias") {
        parte.dias.forEach((dia, i) => {
          body += `<div style="border:1px solid #f0d0d8;border-radius:8px;padding:12px 16px;margin:10px 0;">`;
          body += `<p style="font-family:Arial,sans-serif;margin:0 0 6px;font-weight:bold;color:#2D1B1B;">DÃ­a ${i+1}: ${dia}</p>`;
          body += `<p style="font-family:Arial,sans-serif;margin:0;color:#9A7878;font-size:13px;">AcciÃ³n de hoy: _______________________________________</p>`;
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
  <p style="font-size:11px;color:rgba(255,255,255,0.65);margin:0 0 10px;letter-spacing:1px;text-transform:uppercase;">MamÃ¡ CEO Â· Studio de Contenido</p>
  <h1 style="color:white;margin:0 0 12px;font-size:28px;line-height:1.2;">${titulo}</h1>
  ${promesa ? `<p style="color:rgba(255,255,255,0.85);font-style:italic;margin:0 0 8px;font-size:15px;">"${promesa}"</p>` : ""}
  ${audiencia ? `<p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0;">Para: ${audiencia}</p>` : ""}
</div>
<div style="max-width:700px;margin:0 auto;padding:32px 40px;">${body}</div>
<div style="border-top:1px solid #f0d0d8;padding:16px 40px;text-align:center;">
  <p style="font-size:11px;color:#ccc;font-family:Arial,sans-serif;">Creado con Studio de Contenido Â· MamÃ¡ CEO App</p>
</div></body></html>`;

    const blob = new Blob([html], { type: "application/msword" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${titulo.replace(/[^\w\sÃ¡Ã©Ã­Ã³ÃºÃ±ÃÃ‰ÃÃ“ÃšÃ‘]/g, "").trim()}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="studio-tab-content">

      {/* â”€â”€ INICIO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {view === "inicio" && (
        <div className="lm-landing">
          <div className="mpm-landing-header">
            <div className="mpm-landing-badge">ðŸŽ</div>
            <h2 className="mpm-landing-title">Lead Magnet</h2>
            <p className="mpm-landing-sub">Tu regalo de bienvenida para personas que aÃºn no te conocen bien â€” la puerta de entrada a tu mundo.</p>
          </div>

          <div className="lm-purpose-strip">
            <div className="lm-purpose-item">
              <span className="lm-purpose-num">1</span>
              <div>
                <strong>Primera victoria rÃ¡pida</strong>
                <p>Resuelve un problema pequeÃ±o y concreto que tu clienta tiene ahora mismo.</p>
              </div>
            </div>
            <div className="lm-purpose-arrow">â†’</div>
            <div className="lm-purpose-item">
              <span className="lm-purpose-num">2</span>
              <div>
                <strong>Genera confianza</strong>
                <p>Ella experimenta tu estilo y tu forma de enseÃ±ar. Te empieza a conocer.</p>
              </div>
            </div>
            <div className="lm-purpose-arrow">â†’</div>
            <div className="lm-purpose-item lm-purpose-item--highlight">
              <span className="lm-purpose-num lm-purpose-num--highlight">3</span>
              <div>
                <strong>CTA a tu producto âœ¦</strong>
                <p>Siempre termina invitando a tu servicio o programa de pago.</p>
              </div>
            </div>
          </div>

          <div className="mpm-cards-row">
            <button className="mpm-card" onClick={() => setView("generar")}>
              <div className="mpm-card-top">
                <span className="mpm-card-emoji">ðŸ’¡</span>
                <span className="mpm-card-tag">Explorar</span>
              </div>
              <strong className="mpm-card-name">Generar ideas</strong>
              <p className="mpm-card-desc">Escribe un tema y te doy ideas de lead magnets: guÃ­as, checklists, mini-clases y retos</p>
              <span className="mpm-card-link">Explorar ideas â†’</span>
            </button>
            <button className="mpm-card mpm-card--highlight" onClick={() => setView("crear")}>
              <div className="mpm-card-top">
                <span className="mpm-card-badge-ico">ðŸŽ</span>
                <span className="mpm-card-tag mpm-card-tag--primary">Crear</span>
              </div>
              <strong className="mpm-card-name">Crear mi lead magnet</strong>
              <p className="mpm-card-desc">Ya tengo idea â€” quiero crear el documento o guiÃ³n de clase listo para exportar como PDF</p>
              <span className="mpm-card-link mpm-card-link--primary">Empezar â†’</span>
            </button>
          </div>

          {savedIdeas.length > 0 && (
            <div className="lm-inspiracion">
              <p className="lm-inspi-label">ðŸ’¡ Generar ideas desde tus contenidos guardados:</p>
              <div className="lm-inspi-chips">
                {savedIdeas.map(idea => (
                  <button key={idea.id} className="lm-inspi-chip"
                    onClick={() => { const kw = idea.titulo.slice(0, 45); setKeyword(kw); generar(kw); setView("generar"); }}>
                    {idea.titulo.length > 48 ? idea.titulo.slice(0, 48) + "â€¦" : idea.titulo}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ GENERAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {view === "generar" && (
        <div>
          <div className="lm-gen-topbar">
            <button className="mpm-wizard-back-btn" onClick={() => setView("inicio")}>â† Inicio</button>
          </div>

          <div className="ideas-search-bar">
            <span className="ideas-search-icon">ðŸŽ</span>
            <input
              className="ideas-search-input"
              placeholder="Â¿Sobre quÃ© tema serÃ¡ tu lead magnet? ventas, organizaciÃ³n, bienestar..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && generar()}
            />
            <button className="ideas-search-btn" onClick={() => generar()} disabled={!keyword.trim() || thinking}>
              Generar ideas âœ¦
            </button>
          </div>

          {savedIdeas.length > 0 && !lmIdeas && !thinking && (
            <div className="lm-inspiracion" style={{marginBottom:"24px"}}>
              <p className="lm-inspi-label">ðŸ’¡ Desde tus ideas guardadas:</p>
              <div className="lm-inspi-chips">
                {savedIdeas.map(idea => (
                  <button key={idea.id} className="lm-inspi-chip"
                    onClick={() => { const kw = idea.titulo.slice(0, 45); setKeyword(kw); generar(kw); }}>
                    {idea.titulo.length > 45 ? idea.titulo.slice(0, 45) + "â€¦" : idea.titulo}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!lmIdeas && !thinking && (
            <div className="ideas-empty">
              <div className="ideas-brain-glow">ðŸŽ</div>
              <h3>Â¿Sobre quÃ© quieres crear tu lead magnet?</h3>
              <p>Escribe un tema y te genero ideas organizadas por tipo: guÃ­as, checklists, mini-clases y retos de acciÃ³n.</p>
              <div className="ideas-chips">
                {["ventas en WhatsApp","organizar el tiempo","conseguir clientas","marketing de contenido","bienestar para mamÃ¡s"].map(ej => (
                  <button key={ej} className="ideas-chip" onClick={() => { setKeyword(ej); generar(ej); }}>{ej}</button>
                ))}
              </div>
            </div>
          )}

          {thinking && (
            <div className="ideas-thinking">
              <div className="ideas-orbit-container">
                <div className="ideas-brain-orbit">ðŸŽ</div>
                {["ðŸ“„","âœ…","ðŸŽ“","ðŸ”¥","ðŸ’¡","âœ¨"].map((s, i) => (
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
                <button className="ideas-regen-btn" onClick={() => generar(lmIdeas.keyword)}>ðŸ”„ Nuevas ideas</button>
              </div>
              {Object.entries(LM_CATS).map(([catKey, cat]) => (
                <div className="ideas-cat-section" key={catKey} style={{ "--cat-color": cat.color, "--cat-bg": cat.bg }}>
                  <div className="ideas-cat-header">
                    <div className="ideas-cat-title">
                      <span className="ideas-cat-label">{cat.label}</span>
                      <span className="ideas-cat-sub">{cat.sub}</span>
                    </div>
                    <button className="ideas-mas-btn" onClick={() => masIdeasLm(catKey)}>+ MÃ¡s ideas</button>
                  </div>
                  <div className="ideas-cards-grid">
                    {lmIdeas[catKey].map((idea, i) => (
                      <div className="ideas-card" key={idea.id} style={{ animationDelay: `${i * 70}ms` }}>
                        <p className="ideas-card-text">{idea.texto}</p>
                        <div className="ideas-card-actions">
                          <button className="ideas-card-copy" onClick={() => copiar(idea.texto, idea.id)}>
                            {copiado === idea.id ? "âœ“ Copiado" : "Copiar"}
                          </button>
                          <button className="ideas-card-guion lm-usar-btn" onClick={() => usarIdea(idea)}>
                            Crear este ðŸŽ
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

      {/* â”€â”€ CREAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {view === "crear" && (
        <div className="lm-crear-wrap">
          <div className="desc-header">
            <button className="mpm-wizard-back-btn" onClick={() => setView("inicio")}>â† Inicio</button>
            <h2 className="desc-title">Crea tu Lead Magnet</h2>
            <p className="desc-subtitle">La promesa lo vende â€” el contenido lo cumple. Define primero quÃ© victoria rÃ¡pida le vas a dar a tu clienta.</p>
          </div>

          <div className="lm-crear-form">
            <div className="lm-crear-section">
              <label className="lm-crear-label">Â¿QuÃ© tipo de lead magnet vas a crear?</label>
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
                { num:"01", emoji:"âœï¸", label:"TÃ­tulo de tu lead magnet",          field:"titulo",    ph:"Las 5 claves para vender sin sentirte pesada",                      hint:"Claro, especÃ­fico y con la victoria que promete" },
                { num:"02", emoji:"ðŸŽ¯", label:"Â¿QuÃ© victoria rÃ¡pida les das?",      field:"promesa",   ph:"AprenderÃ¡n a vender con confianza sin presionar",                   hint:"Lo que podrÃ¡n hacer o sentir al terminar" },
                { num:"03", emoji:"ðŸ‘©â€ðŸ’¼", label:"Â¿Para quiÃ©n es?",                  field:"audiencia", ph:"MamÃ¡s que venden desde casa y odian el rechazo",                    hint:"Mientras mÃ¡s especÃ­fico, mÃ¡s se identifica tu clienta ideal" },
                { num:"04", emoji:"ðŸš€", label:"Â¿A quÃ© producto lleva el CTA final?",field:"producto",  ph:"Mi mentorÃ­a CEO en Casa / Mi programa de ventas",                   hint:"El lead magnet siempre lleva a tu producto de pago" },
                { num:"05", emoji:"ðŸ’Œ", label:"Â¿CuÃ¡l es el CTA exacto?",            field:"cta",       ph:"Agenda una llamada gratuita / Conoce mi programa en [link]",         hint:"Texto exacto que aparecerÃ¡ al final del documento" },
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
              <p className="studio-helper" style={{marginTop:0,marginBottom:"12px"}}>No necesitan ser perfectos â€” son el esqueleto de tu documento.</p>
              {form.secciones.map((s, i) => (
                <div key={i} className="lm-seccion-row">
                  <span className="lm-seccion-num">{i+1}</span>
                  <input
                    className="lm-seccion-input"
                    placeholder={SECCIONES_META[form.tipo]?.ph(i) || `SecciÃ³n ${i+1}`}
                    value={s}
                    onChange={e => { const a = [...form.secciones]; a[i] = e.target.value; setForm(p => ({...p, secciones: a})); }}
                  />
                  {form.secciones.length > 1 && (
                    <button className="studio-delete-btn" onClick={() => setForm(p => ({...p, secciones: p.secciones.filter((_, idx) => idx !== i)}))}>âœ•</button>
                  )}
                </div>
              ))}
              <button className="studio-add-btn" onClick={() => setForm(p => ({...p, secciones: [...p.secciones, ""]}))}>
                {SECCIONES_META[form.tipo]?.add || "+ Agregar secciÃ³n"}
              </button>
            </div>

            <button className="mpm-step-btn" onClick={generarDoc} disabled={!form.titulo.trim()}>
              Generar documento âœ¦
            </button>
          </div>
        </div>
      )}

      {/* â”€â”€ PREVIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {view === "preview" && docData && (
        <div className="lm-preview-wrap">
          <div className="lm-preview-topbar">
            <button className="mpm-wizard-back-btn" onClick={() => setView("crear")}>â† Editar</button>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
              <button className="mpm-edit-btn" onClick={() => onSave("leads", { id: Date.now(), titulo: docData.titulo, tipo: docData.tipo, promesa: docData.promesa, audiencia: docData.audiencia, fecha: new Date().toLocaleDateString("es") })}>
                Guardar ðŸŽ
              </button>
              <button className="lm-dl-btn lm-dl-btn--word" onClick={() => downloadWord(docData)}>â¬‡ Word (.doc)</button>
              <button className="lm-dl-btn lm-dl-btn--pdf" onClick={() => window.print()}>ðŸ–¨ï¸ PDF</button>
            </div>
          </div>

          <div className="lm-export-strip">
            <div className="lm-export-item">
              <span className="lm-export-ico">ðŸ“„</span>
              <div>
                <strong>Word (.doc)</strong>
                <p>Descarga y edita en Microsoft Word â€” o sube a Google Drive y Ã¡brelo con Google Docs para editarlo online.</p>
              </div>
            </div>
            <div className="lm-export-sep" />
            <div className="lm-export-item">
              <span className="lm-export-ico">ðŸ–¨ï¸</span>
              <div>
                <strong>PDF (impresiÃ³n)</strong>
                <p>Al imprimir elige <strong>"Guardar como PDF"</strong> para obtener una versiÃ³n lista para compartir.</p>
              </div>
            </div>
          </div>

          <div className="lm-print-area">
            <div className="lm-doc-header">
              <div className="lm-doc-brand">MamÃ¡ CEO Â· Studio de Contenido</div>
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
                          <span className="lm-doc-checkbox">â˜</span>
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
                            <p className="lm-doc-dia-accion">AcciÃ³n de hoy: [Describe la acciÃ³n especÃ­fica que harÃ¡n este dÃ­a]</p>
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
              <p>Creado con Studio de Contenido Â· MamÃ¡ CEO App</p>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ BANCO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                  <button className="studio-delete-btn" onClick={() => onDelete("leads", item.id)}>âœ•</button>
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

// â”€â”€ HOOKS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HooksTab({ saved, onSave, onCrearGuion, brandProfile = {}, callGemini, plan = "free", onAiUsed }) {
  const [tema, setTema]       = useState(brandProfile.queOfreces || "");
  const [nicho, setNicho]     = useState(brandProfile.clienteIdeal || "");
  const [hooks, setHooks]     = useState(null);
  const [thinking, setThinking] = useState(false);
  const [copiado, setCopiado] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg]     = useState("");

  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
  const copiar  = (t, k) => { navigator.clipboard.writeText(t); setCopiado(k); setTimeout(() => setCopiado(""), 2000); };

  const HOOK_CATS = {
    curiosidad: {
      label: "ðŸ¤” Curiosidad", sub: "Detiene el scroll al instante",
      color: "#4A90D9", bg: "#EEF5FF",
      templates: [
        t => `Lo que nadie te dice sobre ${t}`,
        t => `El secreto sobre ${t} que las expertas se guardan`,
        t => `Por quÃ© las emprendedoras exitosas hacen esto con ${t}`,
        t => `Lo que descubrÃ­ sobre ${t} que lo cambiÃ³ todo`,
        t => `La razÃ³n por la que ${t} no te estÃ¡ dando los resultados que mereces`,
        t => `Existe una forma de trabajar con ${t} que casi nadie conoce`,
        t => `Esto es lo que realmente pasa cuando trabajas en ${t}`,
      ],
    },
    dolor: {
      label: "ðŸ˜© Dolor / FrustraciÃ³n", sub: "Habla directo a lo que siente",
      color: "#C4526A", bg: "#FFF0F3",
      templates: [
        t => `Â¿Cansada de que ${t} no te dÃ© los resultados que esperabas?`,
        t => `Si lo de ${t} te tiene abrumada, para y mira esto`,
        t => `Esto es exactamente lo que sientes cuando ${t} no avanza`,
        t => `DejÃ© de luchar con ${t} cuando entendÃ­ esto`,
        t => `El error que te estÃ¡ frenando con ${t} (y no lo sabÃ­as)`,
        t => `Para las que ya estamos hartas de que ${t} no funcione como queremos`,
        t => `Dedicarte a ${t} te estÃ¡ robando tiempo que no tienes â€” y esto lo para`,
      ],
    },
    promesa: {
      label: "âœ¨ Promesa de Resultado", sub: "Le muestra lo que puede lograr",
      color: "#27AE60", bg: "#EEFAF3",
      templates: [
        t => `CÃ³mo mejorar tus resultados con ${t} en menos de 30 dÃ­as (sin complicarte)`,
        t => `La forma mÃ¡s rÃ¡pida de dominar ${t} desde hoy`,
        t => `MÃ¡s resultados con ${t} sin esfuerzo extra: el mÃ©todo que sÃ­ funciona`,
        t => `En 60 segundos te enseÃ±o lo mÃ¡s importante sobre ${t}`,
        t => `AsÃ­ transformÃ© mis resultados con ${t} â€” tÃº puedes hacer lo mismo`,
        t => `DespuÃ©s de este video, ${t} va a tener mucho mÃ¡s sentido para ti`,
        t => `Lo que cambiÃ© sobre ${t} que me dio resultados esta semana`,
      ],
    },
    pregunta: {
      label: "â“ Pregunta Directa", sub: "Las hace parar a pensar",
      color: "#E8755A", bg: "#FFF5F0",
      templates: [
        t => `Â¿EstÃ¡s trabajando ${t} de la forma equivocada?`,
        t => `Â¿Sabes por quÃ© los resultados con ${t} aÃºn no despegan?`,
        t => `Â¿Y si ${t} fuera mÃ¡s fÃ¡cil de lo que siempre creÃ­ste?`,
        t => `Â¿CuÃ¡nto tiempo llevas trabajando en ${t} sin ver los resultados que mereces?`,
        t => `Â¿QuÃ© pasarÃ­a si resolvieras lo de ${t} esta semana?`,
        t => `Â¿Por quÃ© ${t} funciona para otras y para ti todavÃ­a no?`,
        t => `Â¿Alguien mÃ¡s batalla con ${t} o soy solo yo?`,
      ],
    },
    historia: {
      label: "ðŸ“– Historia / POV", sub: "EmociÃ³n y conexiÃ³n personal",
      color: "#8B6565", bg: "#FFF8F5",
      templates: [
        t => `POV: el dÃ­a que todo cambiÃ³ gracias a ${t}`,
        t => `Hace un aÃ±o no entendÃ­a nada sobre ${t}. Hoy te cuento todo.`,
        t => `Una clienta me escribiÃ³ llorando por sus resultados con ${t}. Esto es lo que hicimos.`,
        t => `Esto me pasÃ³ con ${t} y no lo esperaba para nada ðŸ˜³`,
        t => `La historia de cÃ³mo ${t} cambiÃ³ mi negocio completamente`,
        t => `Cuando estaba a punto de rendirme con ${t}, pasÃ³ esto`,
        t => `Nadie me contÃ³ esto sobre ${t} cuando empecÃ©`,
      ],
    },
    numero: {
      label: "ðŸ”¢ NÃºmero / Lista", sub: "EspecÃ­fico y escaneable",
      color: "#C9903A", bg: "#FFF8ED",
      templates: [
        t => `3 errores que arruinan los resultados con ${t} (y cÃ³mo evitarlos)`,
        t => `5 seÃ±ales de que necesitas trabajar diferente tu ${t} â€” ya`,
        t => `Las 7 claves sobre ${t} que nadie te enseÃ±a`,
        t => `Solo necesitas estos 3 pasos para dominar ${t}`,
        t => `El 80% de las emprendedoras falla con ${t} por estas razones`,
        t => `Dedica 2 minutos a ${t} cada dÃ­a â€” los resultados te van a sorprender`,
        t => `4 cosas que aprendÃ­ sobre ${t} que ojalÃ¡ hubiera sabido antes`,
      ],
    },
    contraintuitivo: {
      label: "ðŸ”„ Contraintuitivo", sub: "Rompe lo que creen saber",
      color: "#E67E22", bg: "#FFF5EB",
      templates: [
        t => `Deja de hacer ${t} de esta forma. No es lo que crees.`,
        t => `Por quÃ© hacer MÃS no te ayuda con ${t}`,
        t => `Lo que te enseÃ±aron sobre ${t} estÃ¡ equivocado`,
        t => `Trabajar mÃ¡s duro en ${t} te estÃ¡ frenando â€” y aquÃ­ explico por quÃ©`,
        t => `Esto que parece un error con ${t} es en realidad tu mayor ventaja`,
        t => `${t}: todo lo que crees que sabes estÃ¡ al revÃ©s`,
        t => `La estrategia de ${t} que parece incorrecta y funciona mejor que todo`,
      ],
    },
    identidad: {
      label: "ðŸªž Identidad / Tribu", sub: "Habla directo a mamÃ¡s como ella",
      color: "#16A085", bg: "#EDFAF6",
      templates: [
        t => `Este video es para las mamÃ¡s que luchan con ${t} en silencio`,
        t => `Si eres mamÃ¡ emprendedora y ${t} te pesa, esto es para ti`,
        t => `Para las que dijeron "ya no puedo con ${t}" â€” no estÃ¡s sola`,
        t => `Â¿MamÃ¡ emprendedora con problemas de ${t}? Para y mira esto`,
        t => `Solo las mamÃ¡s que se toman en serio ${t} entienden esto`,
        t => `Si combinas maternidad y ${t}, este video te va a resonar`,
        t => `Las mamÃ¡s que logran ${t} tienen algo en comÃºn â€” y te lo cuento aquÃ­`,
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
      tema: k, nicho: nicho.trim() || brandProfile.clienteIdeal || "mamÃ¡s emprendedoras",
      tono: brandProfile.tono || "Cercano",
    });
    setAiLoading(false);
    if (res?.error === "rate_limit") { setAiMsg("Muchas solicitudes en este momento. Intenta en 1 minuto."); return; }
    if (res?.error === "limite_alcanzado") { setAiMsg("Llegaste al lÃ­mite de generaciones del mes."); return; }
    if (res?.error) { setAiMsg("Algo saliÃ³ mal. Intenta de nuevo."); return; }
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

      {/* â”€â”€ BARRA DE BÃšSQUEDA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="hooks-search-area">
        <div className="ideas-search-bar">
          <span className="ideas-search-icon">ðŸª</span>
          <input
            className="ideas-search-input"
            placeholder="Â¿De quÃ© trata tu video? Ej: vender, organizarme, reels, cobrar sin miedo..."
            value={tema}
            onChange={e => setTema(e.target.value)}
            onKeyDown={e => e.key === "Enter" && generar()}
          />
          <button
            className={`ideas-search-btn${callGemini ? " studio-ai-btn" : ""}`}
            onClick={() => callGemini ? generarConIA() : generar()}
            disabled={!tema.trim() || thinking || aiLoading}
          >
            {(thinking || aiLoading) ? "Generando..." : callGemini ? "Generar âœ¨" : "Generar âœ¦"}
          </button>
        </div>
        {aiMsg && <p className="studio-ai-msg">{aiMsg}</p>}
        <input
          className="hooks-nicho-input"
          placeholder="Â¿A quiÃ©n le hablas? (opcional) â€” mamÃ¡s que venden desde casa, coaches, emprendedoras con hijos..."
          value={nicho}
          onChange={e => setNicho(e.target.value)}
        />
      </div>

      {/* â”€â”€ ESTADO VACÃO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {!hooks && !thinking && (
        <div className="ideas-empty">
          <div className="ideas-brain-glow">ðŸª</div>
          <h3>Â¿De quÃ© trata tu prÃ³ximo video?</h3>
          <p>Escribe el tema y te genero <strong>24+ hooks</strong> organizados en 8 tipos â€” para detener el scroll en los primeros 3 segundos.</p>
          <div className="ideas-chips">
            {EJEMPLOS.map(ej => (
              <button key={ej} className="ideas-chip" onClick={() => { setTema(ej); generar(ej); }}>{ej}</button>
            ))}
          </div>
        </div>
      )}

      {/* â”€â”€ PENSANDO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

      {/* â”€â”€ RESULTADOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
              <button className={`ideas-regen-btn${callGemini ? " studio-ai-regen-btn" : ""}`} onClick={() => callGemini ? generarConIA(hooks.tema) : generar(hooks.tema)}>ðŸ”„ Nuevos hooks {callGemini ? "âœ¨" : ""}</button>
            </div>
          </div>

          {Object.entries(HOOK_CATS).map(([catKey, cat]) => (
            <div className="ideas-cat-section" key={catKey} style={{ "--cat-color": cat.color, "--cat-bg": cat.bg }}>
              <div className="ideas-cat-header">
                <div className="ideas-cat-title">
                  <span className="ideas-cat-label">{cat.label}</span>
                  <span className="ideas-cat-sub">{cat.sub}</span>
                </div>
                <button className="ideas-mas-btn" onClick={() => masHooks(catKey)}>+ MÃ¡s hooks</button>
              </div>
              <div className="ideas-cards-grid">
                {hooks[catKey].map((hook, i) => (
                  <div className="ideas-card hooks-card" key={hook.id} style={{ animationDelay: `${i * 60}ms` }}>
                    <p className="hooks-card-text">{hook.texto}</p>
                    <div className="ideas-card-actions">
                      <button className="ideas-card-copy" onClick={() => copiar(hook.texto, hook.id)}>
                        {copiado === hook.id ? "âœ“ Copiado" : "Copiar"}
                      </button>
                      <button className="ideas-card-save" onClick={() => onSave("hooks", {
                        id: Date.now(), hook: hook.texto, cat: catKey,
                        tema: hooks.tema, fecha: new Date().toLocaleDateString("es"),
                      })}>Guardar</button>
                      <button className="ideas-card-guion" onClick={() => onCrearGuion?.(hook.texto)}>GuiÃ³n ðŸŽ¬</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* â”€â”€ BANCO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                {copiado === `bank-${h.id}` ? "Â¡Copiado!" : "Copiar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// â”€â”€ GUIÃ“N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function GuionTab({ saved, onSave, onDelete, seed, onSeedConsumed, brandProfile = {}, callGemini, plan = "free", onAiUsed }) {
  // â”€â”€ Nuevo flujo tipo Claude â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  const [caption,  setCaption]  = useState(null);

  useEffect(() => { if (seed) { setTopic(seed); onSeedConsumed?.(); } }, []);

  const copiar = (t, k) => { navigator.clipboard.writeText(t); setCopiado(k); setTimeout(() => setCopiado(""), 2200); };

  // â”€â”€ Sugestiones inteligentes basadas en el tema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getSugestiones = (t) => {
    const T = t?.trim() || "este tema";
    return {
      logros: [
        `AprendÃ­ a implementar ${T} de forma simple, sin necesitar ser experta`,
        `DescubrÃ­ que con ${T} logro resultados reales sin descuidar a mi familia`,
        `PasÃ© de no saber por dÃ³nde empezar con ${T} a tener un sistema que funciona hoy`,
        `ApliquÃ© ${T} y cambiÃ³ completamente la forma en que manejo mi negocio`,
      ],
      dolores: [
        `SentÃ­a que ${T} era demasiado complicado para mÃ­ y que no era para todas`,
        `ProbÃ© todo con ${T} y nada funcionaba â€” estaba agotada y a punto de rendirme`,
        `Me sentÃ­a perdida con ${T} sin saber por dÃ³nde empezar, sola y sin referentes`,
        `Dudaba si realmente podÃ­a hacer ${T} siendo mamÃ¡, emprendedora y sin tiempo`,
      ],
      cambios: [
        `DejÃ© de complicarlo y empecÃ© a hacer ${T} a mi manera, desde mi realidad`,
        `EntendÃ­ que con ${T} no necesito hacerlo perfecto â€” solo consistente`,
        `EncontrÃ© un mÃ©todo de ${T} que se adapta a mi vida real como mamÃ¡`,
        `TomÃ© la decisiÃ³n de aprender ${T} paso a paso, sin presiÃ³n y sin comparaciones`,
      ],
    };
  };

  const CTA_MAP = {
    "Guardar el video":     `Guarda este video â€” lo vas a querer cuando lo necesites.`,
    "Comentar":             `CuÃ©ntame en comentarios: Â¿te identificaste con algo? Te leo.`,
    "Escribirme por DM":    `Si esto te resonÃ³, escrÃ­beme por DM â€” me encantarÃ­a conocer tu historia.`,
    "Link en mi bio":       `Si quieres el siguiente paso, el link estÃ¡ en mi bio.`,
    "Compartirlo":          `Â¿Conoces a alguien que necesita escuchar esto hoy? CompÃ¡rteselo.`,
    "Ir a mi pÃ¡gina web":   `Si quieres saber mÃ¡s, el link estÃ¡ en la descripciÃ³n.`,
  };

  const CTAS = [
    { k: "Guardar el video",  i: "ðŸ”–" },
    { k: "Comentar",          i: "ðŸ’¬" },
    { k: "Escribirme por DM", i: "âœ‰ï¸" },
    { k: "Link en mi bio",    i: "ðŸ”—" },
    { k: "Compartirlo",       i: "ðŸ¤" },
  ];
  const HOOK_MAP = {
    "Vender":   `Â¿Sientes que trabajas duro en tu negocio y algo todavÃ­a no estÃ¡ funcionando como quieres?`,
    "Conectar": `Quiero contarte algo que me costÃ³ mucho tiempo entender â€” y que cambiÃ³ todo para mÃ­.`,
    "Educar":   `Hay algo sobre este tema que ojalÃ¡ alguien me hubiera dicho antes. Hoy te lo comparto.`,
    "Inspirar": `Hubo un momento en que creÃ­ que esto no era para mÃ­. Hasta que pasÃ³ algo que lo cambiÃ³ todo.`,
  };

  const buildCaptionFromGuion = (obj = objetivo) => {
    const hook = HOOK_MAP[obj] || HOOK_MAP["Conectar"];
    const interes = sel.dolor
      ? sel.dolor + `\n\nY lo peor es que sentÃ­as que las demÃ¡s lo lograban y tÃº no. Eso es agotador.`
      : `A veces el mayor obstÃ¡culo no es la estrategia â€” es lo que cargamos por dentro.`;
    const deseo = sel.cambio
      ? sel.cambio + `\n\nY cuando eso pasÃ³, todo empezÃ³ a fluir diferente. Eso mismo es posible para ti.`
      : `Ese lugar donde todo fluye y avanzas con calma existe. Y con la guÃ­a correcta, puedes llegar ahÃ­.`;
    const accion = script?.accion || CTA_MAP[sel.cta] || `Guarda este video â€” lo vas a querer tener cuando lo necesites.`;
    return `${hook}\n\n${interes}\n\n${deseo}\n\nðŸ‘‰ ${accion}\n\n#mamÃ¡emprendedora #negociodigital #emprendimiento #mamÃ¡ceo`;
  };

  const generar = async () => {
    if (!sel.logro.trim() || !sel.dolor.trim() || !sel.cambio.trim()) return;
    setFase("generando");
    setAiMsg("");
    const ctaTexto = CTA_MAP[sel.cta] || sel.cta;
    if (callGemini) {
      const res = await callGemini("guion", {
        objetivo, logro: sel.logro, dolor: sel.dolor, cambio: sel.cambio,
        queOfreces: topic, nicho: brandProfile.clienteIdeal || "mamÃ¡s emprendedoras",
        tono: brandProfile.tono || "Cercano",
      });
      if (res?.error === "rate_limit")          { setAiMsg("Muchas solicitudes. Intenta en 1 minuto."); setFase("elegir"); return; }
      if (res?.error === "limite_alcanzado")    { setAiMsg("Llegaste al lÃ­mite de generaciones del mes."); setFase("elegir"); return; }
      if (res?.error === "No autorizada" || res?.error?.includes("autent")) { setAiMsg("Inicia sesiÃ³n para usar la IA."); setFase("elegir"); return; }
      if (res?.error)                           { setAiMsg("Algo saliÃ³ mal. Intenta de nuevo."); setFase("elegir"); return; }
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
    setScript(null); setAiMsg("");
  };

  const canContinue = topic.trim().length > 2;
  const canGenerate = !!(sel.logro.trim() && sel.dolor.trim() && sel.cambio.trim());
  const sugestiones = getSugestiones(topic);
  const scriptTexto = script
    ? [script.hook, script.interes, script.deseo, script.accion].filter(Boolean).join("\n\n")
    : "";

  return (
    <div className="studio-tab-content">
      <div className="studio-mode-toggle">
        <button className={subTab === "guion" ? "active" : ""} onClick={() => setSubTab("guion")}>GuiÃ³n ðŸŽ¬</button>
        <button className={subTab === "caption" ? "active" : ""} onClick={() => setSubTab("caption")}>Caption ðŸ“</button>
      </div>

      {subTab === "guion" && (
        <>
          {/* â”€â”€ FASE 1: TEMA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {fase === "tema" && (
            <div className="gn2-wrap">
              <div className="gn2-hero">
                <div className="mpm-landing-badge" style={{margin:"0 auto 8px"}}>ðŸŽ¬</div>
                <h2>Crea tu guiÃ³n</h2>
                <p>CuÃ©ntame el tema â€” la IA escribe el guiÃ³n completo por ti.</p>
              </div>
              <div className="gn2-field">
                <label className="gn2-label">Â¿Sobre quÃ© es este video?</label>
                <input className="gn2-input" autoFocus
                  placeholder="Ej: guiones con IA, plan de contenido mensual, cobrar sin culpa..."
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && canContinue && setFase("elegir")}
                />
              </div>
              <div className="gn2-field">
                <label className="gn2-label">Â¿CuÃ¡l es el objetivo del video?</label>
                <div className="gn2-obj-grid">
                  {[{k:"Vender",i:"ðŸ’°"},{k:"Conectar",i:"ðŸ’™"},{k:"Educar",i:"ðŸ“–"},{k:"Inspirar",i:"âš¡"}].map(o => (
                    <button key={o.k} className={`gn2-obj-pill${objetivo===o.k?" active":""}`}
                      onClick={() => setObjetivo(o.k)}>{o.i} {o.k}</button>
                  ))}
                </div>
              </div>
              <button className={`mpm-step-btn${callGemini?" studio-ai-btn":""}`} style={{marginTop:"8px"}}
                disabled={!canContinue} onClick={() => setFase("elegir")}>
                Continuar â†’
              </button>
              {saved?.guiones?.length > 0 && (
                <div className="studio-bank" style={{marginTop:"20px"}}>
                  <h4>Guiones guardados ({saved.guiones.length})</h4>
                  {saved.guiones.slice().reverse().map(g => (
                    <div className="studio-bank-item" key={g.id}>
                      <div className="studio-bank-item-top">
                        <span className="studio-tipo-badge" style={{background:"#C4526A"}}>{g.tipo || "GuiÃ³n"}</span>
                        <small>{g.fecha}</small>
                      </div>
                      <strong style={{fontSize:"13px"}}>{g.tema}</strong>
                      <div style={{display:"flex",gap:"6px",marginTop:"8px"}}>
                        <button className="studio-bank-action-copy" onClick={() => {
                          setCaption(buildCaptionFromGuion(g.objetivo));
                          setSubTab("caption");
                          setTimeout(() => window.scrollTo({top:0,behavior:"smooth"}),50);
                        }}>ðŸ“ Caption</button>
                        <button className="studio-bank-action-copy" style={{color:"#C4526A"}} onClick={() => onDelete?.("guiones", g.id)}>Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* â”€â”€ FASE 2: ELEGIR OPCIONES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {fase === "elegir" && (
            <div className="gn2-wrap">
              <div className="gn2-fase-hdr">
                <button className="mpm-wizard-back-btn" onClick={() => setFase("tema")}>â† AtrÃ¡s</button>
                <span className="gn2-topic-badge">ðŸŽ¬ {topic}</span>
              </div>
              {aiMsg && <p className="studio-ai-msg">{aiMsg}</p>}

              {[
                { num:"01", key:"logro",  pregunta:"Â¿CuÃ¡l es tu mayor logro o aprendizaje con este tema?", hint:"Entre mÃ¡s especÃ­fica seas, mÃ¡s poderoso el guiÃ³n", opciones: sugestiones.logros, placeholder:"CuÃ©ntalo con detalle â€” quÃ© lograste exactamente..." },
                { num:"02", key:"dolor",  pregunta:"Â¿CÃ³mo te sentÃ­as ANTES de lograr eso?", hint:"AquÃ­ conectas con tu audiencia â€” ellas estÃ¡n donde tÃº estabas", opciones: sugestiones.dolores, placeholder:"Describe cÃ³mo te sentÃ­as â€” honesta y especÃ­fica..." },
                { num:"03", key:"cambio", pregunta:"Â¿QuÃ© cambiÃ³ o hiciste diferente?", hint:"No tiene que ser una estrategia â€” puede ser una decisiÃ³n", opciones: sugestiones.cambios, placeholder:"Â¿QuÃ© hiciste diferente que lo cambiÃ³ todo?..." },
              ].map(({ num, key, pregunta, hint, opciones, placeholder }) => (
                <div key={key} className="gn2-q-card">
                  <div className="gn2-q-num">{num}</div>
                  <div className="gn2-q-content">
                    <div className="gn2-q-title">{pregunta}</div>
                    <div className="gn2-q-hint">{hint}</div>
                    <div className="gn2-options">
                      {opciones.map((s, i) => (
                        <button key={i}
                          className={`gn2-option${sel[key] === s && !custom[key] ? " active" : ""}`}
                          onClick={() => { setSel(p=>({...p,[key]:s})); setCustom(p=>({...p,[key]:false})); }}>
                          {s}
                        </button>
                      ))}
                      <button className={`gn2-option gn2-option--custom${custom[key] ? " active" : ""}`}
                        onClick={() => { setCustom(p=>({...p,[key]:true})); setSel(p=>({...p,[key]:""})); }}>
                        âœ Escribir mi propia versiÃ³n
                      </button>
                    </div>
                    {custom[key] && (
                      <textarea className="gn2-custom-input" autoFocus rows={3}
                        placeholder={placeholder} value={sel[key]}
                        onChange={e => setSel(p=>({...p,[key]:e.target.value}))} />
                    )}
                    {sel[key] && <div className="gn2-selected-badge">âœ“ Listo</div>}
                  </div>
                </div>
              ))}

              <div className="gn2-q-card">
                <div className="gn2-q-num">04</div>
                <div className="gn2-q-content">
                  <div className="gn2-q-title">Â¿QuÃ© quieres que hagan al terminar el video?</div>
                  <div className="gn2-options">
                    {CTAS.map(op => (
                      <button key={op.k} className={`gn2-option${sel.cta === op.k ? " active" : ""}`}
                        onClick={() => setSel(p=>({...p,cta:op.k}))}>
                        {op.i} {op.k}
                      </button>
                    ))}
                  </div>
                  {sel.cta && <div className="gn2-selected-badge">âœ“ Listo</div>}
                </div>
              </div>

              <button className={`mpm-step-btn${callGemini ? " studio-ai-btn" : ""}`}
                style={{marginTop:"8px"}} disabled={!canGenerate} onClick={generar}>
                {callGemini ? "âœ¨ Generar mi guiÃ³n completo" : "âœ¦ Generar guiÃ³n"}
              </button>
            </div>
          )}

          {/* â”€â”€ GENERANDO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {fase === "generando" && (
            <div className="gn2-wrap" style={{paddingTop:"48px",textAlign:"center"}}>
              <div className="ideas-thinking">
                <div className="ideas-thinking-dots"><span/><span/><span/></div>
                <p style={{marginTop:"16px",color:"#9A7878",fontSize:"14px"}}>Escribiendo tu guiÃ³n...</p>
              </div>
            </div>
          )}

          {/* â”€â”€ FASE 3: RESULTADO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {fase === "resultado" && script && (
            <div className="gn2-wrap">
              <div className="gn2-resultado-hdr">
                <button className="mpm-wizard-back-btn" onClick={() => setFase("elegir")}>â† Editar</button>
                <button className="mpm-wizard-back-btn" onClick={reset}>ðŸ”„ Nuevo</button>
                <button className="mpm-wizard-back-btn" onClick={() => onSave("guiones", {
                  id: Date.now(), tema: topic, tipo: "Reel (60s)", objetivo,
                  hook: script.hook, interes: script.interes,
                  deseo: script.deseo, ctaTxt: script.accion,
                  fecha: new Date().toLocaleDateString("es"),
                })}>ðŸ’¾ Guardar</button>
                {script.isAI && <span className="studio-ai-badge">âœ¨ IA</span>}
              </div>

              <div className="gn2-script-card">
                <div className="gn2-script-title">
                  <span>ðŸŽ¬</span>
                  <div>
                    <strong>{topic}</strong>
                    <span className="gn2-script-obj"> Â· {objetivo}</span>
                  </div>
                </div>

                {[
                  {key:"hook",    label:"01 Â· HOOK",    sub:"Detiene el scroll Â· 0â€“3 seg",            color:"#C9903A"},
                  {key:"interes", label:"02 Â· INTERÃ‰S", sub:"Nombra el dolor Â· 3â€“15 seg",             color:"#C4526A"},
                  {key:"deseo",   label:"03 Â· DESEO",   sub:"Pinta la transformaciÃ³n Â· 15â€“45 seg",    color:"#27AE60"},
                  {key:"accion",  label:"04 Â· ACCIÃ“N",  sub:"Una sola instrucciÃ³n Â· Ãºltimos 10 seg",  color:"#6366F1"},
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
                    {copiado === "script" ? "âœ“ Copiado" : "ðŸ“‹ Copiar guiÃ³n completo"}
                  </button>
                  <button className="guion-caption-cta-btn" onClick={() => {
                    setC(p => ({...p, tema: topic}));
                    setCaption(buildCaptionFromGuion());
                    setSubTab("caption");
                    setTimeout(() => window.scrollTo({top:0,behavior:"smooth"}), 50);
                  }}>ðŸ“ Caption</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* â”€â”€ CAPTION SUB-TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {subTab === "caption" && (
        <div className="cap-wrap">
          <div className="guion-form-intro" style={{marginBottom:"4px"}}>
            <div className="mpm-landing-badge" style={{margin:"0 auto 4px"}}>ðŸ“</div>
            <h2>Captions para Redes</h2>
            <p>Tu caption se genera con cada guiÃ³n. EdÃ­talo o crea uno nuevo desde cero.</p>
          </div>
          {caption && (
            <div className="cap-auto-card">
              <div className="cap-auto-hdr">
                <div className="cap-auto-label">ðŸ“½ Caption generado</div>
                {topic && <div className="cap-video-info"><span className="cap-video-tema">{topic}</span></div>}
              </div>
              <textarea className="studio-caption-edit" value={caption} onChange={e => setCaption(e.target.value)} rows={10} />
              <div className="cap-auto-actions">
                <button className="lm-dl-btn" onClick={() => copiar(caption, "cap-auto")}>{copiado === "cap-auto" ? "âœ“ Copiado" : "Copiar"}</button>
                <button className="lm-dl-btn lm-dl-btn--word" onClick={() => onSave("captions", { id: Date.now(), caption, red: c.red, tema: topic || c.tema, fecha: new Date().toLocaleDateString("es") })}>Guardar</button>
                <button className="lm-dl-btn" onClick={() => setCaption(null)} style={{marginLeft:"auto",color:"#9A7878",border:"none",background:"transparent",boxShadow:"none",padding:"6px 10px"}}>âœ• Limpiar</button>
              </div>
            </div>
          )}
          {saved?.guiones?.length > 0 && (
            <div className="cap-history-section">
              <div className="cap-section-label">ðŸ“½ Crea caption desde tus videos guardados</div>
              <div className="cap-guiones-grid">
                {saved.guiones.slice().reverse().slice(0, 6).map(g => (
                  <button key={g.id} className="cap-guion-card" onClick={() => {
                    setCaption(buildCaptionFromGuion(g.objetivo));
                    setC(p => ({ ...p, tema: g.tema }));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}>
                    <span className="cap-guion-tipo">{g.tipo?.split(" ")[0] || "ðŸŽ¬"}</span>
                    <div className="cap-guion-tema">{g.tema}</div>
                    <div className="cap-guion-foot"><span>{g.objetivo}</span><span className="cap-crear-lbl">Caption â†’</span></div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="cap-manual-card">
            <div className="cap-section-label">âœ Crear caption desde cero</div>
            <div className="cap-pills-group">
              <div className="cap-pills-label">Red social</div>
              <div className="cap-pills-row">
                {[{k:"Instagram",i:"ðŸ“¸"},{k:"TikTok",i:"ðŸŽµ"},{k:"YouTube",i:"ðŸŽ¬"},{k:"Facebook",i:"ðŸ’¬"}].map(r => (
                  <button key={r.k} className={`cap-pill${c.red===r.k?" active":""}`} onClick={() => setC(p => ({...p, red: r.k}))}>{r.i} {r.k}</button>
                ))}
              </div>
            </div>
            <div className="cap-pills-group">
              <div className="cap-pills-label">Tono</div>
              <div className="cap-pills-row">
                {[{k:"Cercano",i:"ðŸ’™"},{k:"Profesional",i:"ðŸ’¼"},{k:"Emotivo",i:"ðŸ’«"},{k:"Directo",i:"âš¡"},{k:"Divertido",i:"ðŸ˜„"}].map(t => (
                  <button key={t.k} className={`cap-pill${c.tono===t.k?" active":""}`} onClick={() => setC(p => ({...p, tono: t.k}))}>{t.i} {t.k}</button>
                ))}
              </div>
            </div>
            <div className={`desc-q-card${c.tema?" filled":""}`}>
              <div className="desc-q-num">ðŸ“</div>
              <div className="desc-q-body">
                <label className="desc-q-label">Tema del post</label>
                <input className="desc-q-input" placeholder="cÃ³mo le digo el precio sin miedo..." value={c.tema} onChange={e => setC(p => ({...p, tema: e.target.value}))} />
              </div>
            </div>
            <div className={`desc-q-card${c.cta?" filled":""}`}>
              <div className="desc-q-num">ðŸ‘‰</div>
              <div className="desc-q-body">
                <label className="desc-q-label">CTA â€” llamada a la acciÃ³n</label>
                <input className="desc-q-input" placeholder="Guarda este post / Comenta SÃ / Link en bio" value={c.cta} onChange={e => setC(p => ({...p, cta: e.target.value}))} />
              </div>
            </div>
            <label className="cap-checkbox-row">
              <input type="checkbox" checked={c.hashtags} onChange={e => setC(p => ({...p, hashtags: e.target.checked}))} />
              Incluir hashtags de mamÃ¡ emprendedora
            </label>
            <button className="mpm-step-btn" disabled={!c.tema.trim()} onClick={() => {
              if (!c.tema) return;
              const intros = { "Cercano":`Oye, te cuento algo sobre ${c.tema} ðŸ‘‡`, "Profesional":`Hablemos de ${c.tema}. Esto es lo que necesitas saber:`, "Emotivo":`${c.tema} cambiÃ³ algo en mÃ­ que quiero compartir contigo. ðŸ’™`, "Directo":`${c.tema}: aquÃ­ van los puntos clave. Sin rodeos.`, "Divertido":`${c.tema}... sÃ­, vamos a hablar de eso ðŸ˜…ðŸ‘‡` };
              const body = `\n\n[Tu punto principal â€” 3 a 5 lÃ­neas cortas.]\n\n[Un detalle personal o pregunta que genere conversaciÃ³n.]\n\n`;
              const cta  = c.cta ? `ðŸ‘‰ ${c.cta}\n\n` : `ðŸ’¬ CuÃ©ntame en comentarios â€” te leo siempre.\n\n`;
              const tags = c.hashtags ? `#mamÃ¡emprendedora #negociodesdehogar #emprendimiento #mamÃ¡ceo #marketingdigital` : "";
              setCaption(`${intros[c.tono]||intros["Cercano"]}${body}${cta}${tags}`.trim());
            }}>Generar caption âœ¦</button>
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
                  <p style={{fontSize:"12px",color:"#9A7878",margin:"5px 0 8px",lineHeight:"1.5",whiteSpace:"pre-wrap"}}>{cp.caption?.substring(0,120)}â€¦</p>
                  <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                    <button className="studio-bank-action-copy" onClick={() => { setCaption(cp.caption); window.scrollTo({top:0,behavior:"smooth"}); }}>Usar</button>
                    <button className="studio-bank-action-copy" onClick={() => copiar(cp.caption, `sc-${cp.id}`)}>{copiado===`sc-${cp.id}`?"âœ“ Copiado":"Copiar"}</button>
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

// â”€â”€ EMAIL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EmailTab({ saved, onSave, onDelete, brandProfile = {} }) {
  const [view,      setView]      = useState("inicio");
  const [objetivo,  setObjetivo]  = useState("Lanzar producto");
  const [comunicar, setComunicar] = useState("");
  const [campana,   setCampana]   = useState(null);
  const [cuerpos,   setCuerpos]   = useState({});
  const [expandido, setExpandido] = useState({});
  const [thinking,  setThinking]  = useState(false);
  const [ef,        setEf]        = useState({ tipo: "PresentaciÃ³n", tono: brandProfile.tono || "Cercano", tema: brandProfile.queOfreces || "", cta: "" });
  const [draft,     setDraft]     = useState(null);
  const [copiado,   setCopiado]   = useState("");

  const copiar = (t, k) => { navigator.clipboard.writeText(t); setCopiado(k); setTimeout(() => setCopiado(""), 2000); };

  const OBJ_META = {
    "Lanzar producto":     { emoji: "ðŸš€", color: "#C4526A", bg: "#FFF0F3", desc: "4 emails Â· Anuncia con emociÃ³n y urgencia" },
    "Nutrir lista":        { emoji: "ðŸ’Œ", color: "#27AE60", bg: "#EEFAF3", desc: "3 emails Â· Valor puro sin vender" },
    "Bienvenida":          { emoji: "ðŸŽ", color: "#4A90D9", bg: "#EEF5FF", desc: "3 emails Â· Conecta con nuevas suscriptoras" },
    "Venta directa":       { emoji: "ðŸ’°", color: "#E8755A", bg: "#FFF5F0", desc: "3 emails Â· Lleva directo a la compra" },
    "Recuperar inactivos": { emoji: "ðŸ”„", color: "#C9903A", bg: "#FFF8ED", desc: "3 emails Â· Reconecta con quienes dejaron de abrir" },
    "Compartir valor":     { emoji: "âœ¨", color: "#E67E22", bg: "#FFF5EB", desc: "2 emails Â· Educa, inspira y posiciÃ³nate" },
  };

  const buildCampana = (obj, com) => {
    const c = com || "ayudar a mamÃ¡s emprendedoras";
    const CAMPS = {
      "Lanzar producto": [
        { num: 1, dia: "DÃ­a 1 â€” Anuncio", asunto: "ðŸŽ‰ Por fin estÃ¡ aquÃ­ â€” [nombre del producto]",
          cuerpo: `Hola [nombre],\n\nEl dÃ­a llegÃ³. Y honestamente... estoy emocionada de contÃ¡rtelo.\n\n[Nombre del producto] estÃ¡ disponible ahora mismo â€” y lo creÃ© pensando en ti.\n\nÂ¿Por quÃ© lo creÃ©? Porque ${c}. Y vi que faltaba algo concreto para hacerlo posible.\n\nEsto es lo que vas a lograr:\nâ€¢ [Resultado 1 â€” especÃ­fico y emocional]\nâ€¢ [Resultado 2]\nâ€¢ [Resultado 3]\n\nNo es informaciÃ³n que ya tienes. Es un proceso que te lleva de donde estÃ¡s ahora a donde quieres estar, con mi acompaÃ±amiento.\n\nÂ¿Quieres ver todos los detalles?\n\nðŸ‘‰ [Link a la pÃ¡gina de ventas]\n\nHasta pronto,\n[Tu nombre]`,
          cta: "Ver todos los detalles â†’" },
        { num: 2, dia: "DÃ­a 3 â€” EducaciÃ³n", asunto: "Â¿Para quiÃ©n es exactamente esto?",
          cuerpo: `Hola [nombre],\n\nHace dos dÃ­as te contÃ© sobre [nombre del producto].\n\nHoy quiero ser muy honesta contigo: esto no es para todo el mundo.\n\n[Nombre del producto] es para ti si:\nâœ… Eres [descripciÃ³n de tu clienta ideal]\nâœ… Ya intentaste [lo que intentaron antes] sin los resultados que querÃ­as\nâœ… EstÃ¡s lista para [compromiso que requiere]\nâœ… Quieres ${c} en [tiempo especÃ­fico]\n\nNo es para ti si buscas resultados de la noche a la maÃ±ana. Hay proceso. Pero el proceso funciona â€” y yo voy contigo en cada paso.\n\nÂ¿Te reconociste? Hay un lugar para ti. ðŸ’Œ\n\nðŸ‘‰ [Link]\n\n[Tu nombre]`,
          cta: "SÃ­, quiero ese lugar â†’" },
        { num: 3, dia: "DÃ­a 5 â€” Prueba social", asunto: "Esto dice alguien que ya lo viviÃ³ ðŸ’¬",
          cuerpo: `Hola [nombre],\n\nA veces las palabras de otra persona dicen lo que yo no puedo decir.\n\n"[Testimonio real de una clienta â€” en sus palabras exactas. QuÃ© logrÃ³, en cuÃ¡nto tiempo, cÃ³mo se sintiÃ³. Si no tienes uno aÃºn, escribe el resultado mÃ¡s concreto que has logrado con alguien.]"\nâ€” [Nombre de la clienta]\n\nEso es lo que es posible cuando ${c}.\n\nY esa persona empezÃ³ exactamente donde tÃº estÃ¡s ahora â€” con dudas, con miedo, preguntÃ¡ndose si funcionarÃ­a.\n\nFuncionÃ³.\n\nÂ¿Quieres ese resultado?\n\nðŸ‘‰ [Link]\n\n[Tu nombre]`,
          cta: "Quiero ese resultado â†’" },
        { num: 4, dia: "DÃ­a 7 â€” Cierre", asunto: "Ãšltimas horas â° â€” cierra hoy a las [hora]",
          cuerpo: `Hola [nombre],\n\nHoy es el Ãºltimo dÃ­a.\n\nA las [hora] de hoy cierra [nombre del producto] â€” y no lo repetirÃ© pronto.\n\nSÃ© que a veces dudamos. Que pensamos "lo dejo para despuÃ©s". Pero "despuÃ©s" muchas veces significa perderse la oportunidad.\n\nTe pregunto esto desde el corazÃ³n: Â¿quÃ© serÃ­a diferente en tu negocio si pudieras ${c} en los prÃ³ximos [tiempo]?\n\nEso es exactamente lo que estÃ¡ del otro lado de esta decisiÃ³n.\n\nSi sientes que esto es para ti â€” confÃ­a en eso. No en el miedo.\n\nðŸ‘‰ [Link â€” Ãºltimo recordatorio]\n\nCon cariÃ±o,\n[Tu nombre]`,
          cta: "Entrar antes del cierre â†’" },
      ],
      "Nutrir lista": [
        { num: 1, dia: "Semana 1 â€” Tip", asunto: "Un tip rÃ¡pido que puedes aplicar hoy ðŸ’¡",
          cuerpo: `Hola [nombre],\n\nCorto, directo y Ãºtil â€” asÃ­ me gusta.\n\nUna sola idea sobre ${c} que puedes aplicar hoy mismo:\n\n[Tip especÃ­fico y accionable â€” 3 a 5 lÃ­neas. No teorÃ­a. Algo que puedan hacer en los prÃ³ximos 30 minutos. Incluye el paso exacto.]\n\nPor quÃ© funciona: [ExplicaciÃ³n breve del principio detrÃ¡s del tip â€” 2 lÃ­neas mÃ¡ximo.]\n\nÂ¿Lo intentas esta semana y me cuentas cÃ³mo te fue?\n\nResponde este email â€” me encanta leerte. ðŸ’Œ\n\n[Tu nombre]`,
          cta: "RespÃ³ndeme aquÃ­" },
        { num: 2, dia: "Semana 2 â€” Historia", asunto: "Mi historia con esto (te la cuento completa)",
          cuerpo: `Hola [nombre],\n\nHoy quiero contarte algo personal.\n\nHace [tiempo], yo tambiÃ©n luchaba con ${c}.\n\n[Historia personal en 3 a 4 lÃ­neas. SÃ© especÃ­fica, usa detalles reales. La vulnerabilidad genera conexiÃ³n. QuÃ© pasaba, cÃ³mo te sentÃ­as, quÃ© hacÃ­as que no funcionaba.]\n\nLo que lo cambiÃ³ fue [el momento clave â€” una decisiÃ³n, un aprendizaje, una persona].\n\nY desde entonces, [cÃ³mo estÃ¡ diferente ahora â€” resultado concreto].\n\nTe cuento esto porque sÃ© que tÃº tambiÃ©n puedes estar en ese lugar. Y ese "antes" no tiene que ser para siempre.\n\nÂ¿A ti te ha pasado algo parecido? CuÃ©ntame. ðŸ’Œ\n\n[Tu nombre]`,
          cta: "RespÃ³ndeme â†’" },
        { num: 3, dia: "Semana 3 â€” Engagement", asunto: "Una pregunta para ti ðŸ™‹",
          cuerpo: `Hola [nombre],\n\nHoy no vengo a enseÃ±arte nada. Vengo a preguntarte algo.\n\nLlevamos un tiempo juntas en esta lista y me importa saber cÃ³mo estÃ¡s realmente.\n\nÂ¿CuÃ¡l es el mayor obstÃ¡culo que tienes ahora mismo con ${c}?\n\n[ ] No sÃ© por dÃ³nde empezar\n[ ] Falta de tiempo para implementar\n[ ] Miedo al rechazo o al juicio\n[ ] Me falta claridad en mi mensaje\n[ ] Necesito mÃ¡s clientas / ventas\n[ ] Otro: ___________\n\nResponde este email con tu respuesta â€” o simplemente escrÃ­beme lo que estÃ¡ en tu mente ahora mismo.\n\nCada respuesta me ayuda a crear contenido que realmente te sirva. ðŸ’Œ\n\n[Tu nombre]`,
          cta: "RespÃ³ndeme aquÃ­" },
      ],
      "Bienvenida": [
        { num: 1, dia: "Inmediato â€” Entrega", asunto: "ðŸŽ Â¡Bienvenida! Tu regalo te estÃ¡ esperando",
          cuerpo: `Hola [nombre],\n\nÂ¡Bienvenida! Estoy muy contenta de que estÃ©s aquÃ­.\n\nTu regalo estÃ¡ listo â€” solo haz clic abajo:\n\nðŸ‘‰ [Link de descarga del lead magnet]\n\nMi nombre es [tu nombre] y ayudo a [descripciÃ³n de clienta ideal] a ${c}.\n\nEn los prÃ³ximos dÃ­as te enviarÃ© [nÃºmero] emails con [quÃ© van a recibir]. Todo lo que desearÃ­a haber tenido cuando empecÃ©.\n\nUna cosa importante: si tienes dudas o quieres contarme algo, responde este email. SÃ­, yo misma lo leo. ðŸ’Œ\n\nCon cariÃ±o,\n[Tu nombre]`,
          cta: "Descargar mi regalo â†’" },
        { num: 2, dia: "DÃ­a 2 â€” ConexiÃ³n", asunto: "Por quÃ© empecÃ© todo esto... (mi historia real)",
          cuerpo: `Hola [nombre],\n\nAyer te mandÃ© tu regalo. Espero que ya lo hayas podido explorar.\n\nHoy quiero contarte algo mÃ¡s personal: por quÃ© hago lo que hago.\n\n[Tu historia de origen en 4 a 6 lÃ­neas. El momento en que decidiste hacer esto. Los obstÃ¡culos que superaste. Por quÃ© te importa tanto ayudar a estas personas especÃ­ficamente.]\n\nNo empecÃ© con todo claro. EmpecÃ© con ganas, con miedo, y con la certeza de que lo que yo habÃ­a aprendido podÃ­a ayudar a alguien mÃ¡s.\n\nHoy, [resultado concreto que puedes mencionar â€” clientas, transformaciones, lo que mÃ¡s te enorgullece].\n\nAquÃ­ eres bienvenida tal y como estÃ¡s. ðŸ’Œ\n\n[Tu nombre]`,
          cta: "Seguir leyendo â†’" },
        { num: 3, dia: "DÃ­a 5 â€” Recursos", asunto: "Mis 3 mejores recursos â€” solo para ti",
          cuerpo: `Hola [nombre],\n\nAntes de terminar esta semana de bienvenida, quiero dejarte 3 recursos que sÃ© que te van a servir:\n\nðŸ“Œ [TÃ­tulo del recurso 1]\n[DescripciÃ³n en una lÃ­nea â€” por quÃ© les serÃ¡ Ãºtil]\nðŸ‘‰ [Link]\n\nðŸ“Œ [TÃ­tulo del recurso 2]\n[DescripciÃ³n en una lÃ­nea]\nðŸ‘‰ [Link]\n\nðŸ“Œ [TÃ­tulo del recurso 3]\n[DescripciÃ³n en una lÃ­nea]\nðŸ‘‰ [Link]\n\nEsto es solo el principio. Cada semana voy a seguir compartiendo contigo cosas que realmente funcionan para ${c}.\n\nSi hay algo especÃ­fico que quieres que comparta, responde este email. Esta lista existe para ti. ðŸ’Œ\n\nCon cariÃ±o,\n[Tu nombre]`,
          cta: "Ver los recursos â†’" },
      ],
      "Venta directa": [
        { num: 1, dia: "DÃ­a 1 â€” Oferta", asunto: "Una oportunidad especial, solo para ti ðŸ’Œ",
          cuerpo: `Hola [nombre],\n\nHoy quiero contarte algo que no he dicho pÃºblicamente todavÃ­a.\n\n${c}. Y antes de lanzarlo al mundo, quiero darte la oportunidad de entrar primero â€” porque llevas tiempo en esta lista y eso tiene valor.\n\nEsto es lo que te llevas:\nâœ¦ [Beneficio 1 â€” en tÃ©rminos de resultado, no caracterÃ­sticas]\nâœ¦ [Beneficio 2]\nâœ¦ [Beneficio 3]\nâœ¦ [Bonus especial o lo que hace Ãºnica esta oferta]\n\nInversiÃ³n: [precio]\nDisponible hasta: [fecha / hora de cierre]\n\nÂ¿Lista para el siguiente paso?\n\nðŸ‘‰ [Link]\n\n[Tu nombre]`,
          cta: "Ver la oferta completa â†’" },
        { num: 2, dia: "DÃ­a 3 â€” Objeciones", asunto: "Las dudas mÃ¡s frecuentes â€” las resuelvo aquÃ­",
          cuerpo: `Hola [nombre],\n\nHace dos dÃ­as te contÃ© sobre [nombre del producto/servicio].\n\nSÃ© que cuando vemos una oferta, surgen preguntas. Y quiero responderlas con total honestidad:\n\nâ“ "Â¿Funciona si soy principiante?"\nâ†’ [Respuesta honesta y especÃ­fica]\n\nâ“ "Â¿CuÃ¡nto tiempo necesito dedicarle?"\nâ†’ [Respuesta honesta â€” no promesas vacÃ­as]\n\nâ“ "Â¿QuÃ© pasa si no me sirve?"\nâ†’ [Tu garantÃ­a o polÃ­tica honesta]\n\nâ“ "Â¿Por quÃ© ahora?"\nâ†’ ${c}. Y porque esperar tiene un costo que muchas no ven.\n\nSi tienes otra duda, responde este email. La respondo personalmente. ðŸ’Œ\n\nðŸ‘‰ [Link]\n\n[Tu nombre]`,
          cta: "Ya no tengo dudas, quiero entrar â†’" },
        { num: 3, dia: "DÃ­a 5 â€” Cierre", asunto: "Hoy es el Ãºltimo dÃ­a â°",
          cuerpo: `Hola [nombre],\n\nNo te voy a escribir un email largo hoy.\n\nSolo quiero recordarte que hoy a las [hora] cierra esta oportunidad â€” y no la voy a repetir pronto.\n\nLo que se llevan:\n[Resumen en 3 lÃ­neas â€” resultado principal, precio, por quÃ© ahora]\n\nPrecio hasta hoy: [precio]\nSube maÃ±ana a: [precio normal]\n\n${c}.\n\nSi sientes que esto es para ti â€” ese feeling importa. No lo ignores.\n\nðŸ‘‰ [Link]\n\nCon cariÃ±o,\n[Tu nombre]`,
          cta: "Entrar antes del cierre â†’" },
      ],
      "Recuperar inactivos": [
        { num: 1, dia: "Email 1 â€” ReconexiÃ³n", asunto: "Â¿Sigues ahÃ­? Te extraÃ±Ã© ðŸ™‹",
          cuerpo: `Hola [nombre],\n\nHace un tiempo que no me lees â€” y estÃ¡ bien. La vida se pone ocupada, los emails se acumulan, lo entiendo perfectamente.\n\nSolo querÃ­a asegurarme de que sigues recibiendo lo que te sirve.\n\nMi nombre es [tu nombre] y ayudo a [clienta ideal] a ${c}.\n\nDesde la Ãºltima vez que hablamos, han pasado cosas:\nâœ¦ [Novedad 1 â€” algo nuevo que tienes]\nâœ¦ [Novedad 2 â€” recurso, servicio, resultado de clienta]\nâœ¦ [Novedad 3 â€” lo que mÃ¡s te emociona compartir]\n\nÂ¿Te quedas? Haz clic abajo para confirmar que sigues activa. ðŸ’Œ\n\n[Tu nombre]`,
          cta: "SÃ­, me quedo â†’" },
        { num: 2, dia: "Email 2 â€” Novedad", asunto: "Esto cambiÃ³ y querÃ­a que lo supieras",
          cuerpo: `Hola [nombre],\n\nUna actualizaciÃ³n rÃ¡pida â€” porque creo que te interesa.\n\n${c}. Y eso cambiÃ³ algo importante para las personas en esta comunidad.\n\n[Explica la novedad en 3 a 5 lÃ­neas. QuÃ© es, por quÃ© importa, cÃ³mo les beneficia.]\n\nNo te lo cuento para vender nada hoy. Te lo cuento porque creo que mereces saberlo antes que nadie.\n\nÂ¿Quieres saber mÃ¡s? Responde con "SÃ" y te mando todos los detalles. ðŸ’Œ\n\n[Tu nombre]`,
          cta: "Quiero saber mÃ¡s â†’" },
        { num: 3, dia: "Email 3 â€” Honesto", asunto: "Una Ãºltima pregunta â€” te la digo con honestidad",
          cuerpo: `Hola [nombre],\n\nSoy directa contigo porque te respeto.\n\nLlevo tiempo en tu bandeja de entrada. Y si mis emails no te aportan nada, lo mejor para las dos es que te des de baja â€” sin drama, sin rencor.\n\nPero si hay algo de valor aquÃ­ para ti, me encantarÃ­a seguir en contacto.\n\nUna pregunta: Â¿quÃ© necesitarÃ­as recibir de mi parte para que este espacio valga tu tiempo?\n\nResponde este email con tu respuesta. Me la leo completa.\n\nSi no respondo en [dÃ­as], asumirÃ© que prefieres darte de baja â€” y lo harÃ© con respeto. ðŸ’Œ\n\n[Tu nombre]`,
          cta: "Me quedo y te cuento quÃ© necesito â†’" },
      ],
      "Compartir valor": [
        { num: 1, dia: "Email 1 â€” Historia", asunto: "Esto me pasÃ³ esta semana y tenÃ­a que contarte",
          cuerpo: `Hola [nombre],\n\nEsta semana pasÃ³ algo que me pareciÃ³ demasiado bueno para no compartirlo.\n\n[Historia o situaciÃ³n concreta que viviste â€” con tu clienta, en tu negocio, o aprendizaje personal. 3 a 5 lÃ­neas especÃ­ficas. No genÃ©rico. Detalles reales.]\n\nLo que aprendÃ­: ${c}.\n\nCÃ³mo puedes aplicarlo tÃº esta semana:\n1. [AcciÃ³n concreta 1]\n2. [AcciÃ³n concreta 2]\n3. [AcciÃ³n concreta 3]\n\nEspero que esto te sirva tanto como a mÃ­.\n\nSi te resonÃ³, responde este email â€” me encanta saber que llegÃ³ al lugar correcto. ðŸ’Œ\n\n[Tu nombre]`,
          cta: "RespÃ³ndeme â†’" },
        { num: 2, dia: "Email 2 â€” Recurso", asunto: "El recurso que mÃ¡s me han pedido â€” aquÃ­ estÃ¡",
          cuerpo: `Hola [nombre],\n\nEn los Ãºltimos [semanas/meses], la pregunta que mÃ¡s me hacen es:\n\n"[La pregunta mÃ¡s frecuente de tu audiencia relacionada a ${c}]"\n\nAsÃ­ que decidÃ­ crear algo concreto para responderla.\n\n[Describe el recurso: Â¿es una guÃ­a? Â¿un video? Â¿un checklist? Â¿una respuesta detallada?]\n\nEsto es lo que encuentras dentro:\nâœ¦ [Punto 1]\nâœ¦ [Punto 2]\nâœ¦ [Punto 3]\n\nEs completamente gratuito â€” porque creo que esta informaciÃ³n cambia cosas reales.\n\nðŸ‘‰ [Link al recurso]\n\nSi lo usas, cuÃ©ntame quÃ© te pareciÃ³. ðŸ’Œ\n\n[Tu nombre]`,
          cta: "Acceder al recurso â†’" },
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
        <p style="font-size:12px;font-weight:700;color:${meta.color};font-family:Arial;margin:10px 0 0;">CTA â†’ ${email.cta}</p>
      </div>`;
    });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>CampaÃ±a: ${campana.objetivo}</title></head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;">
    <div style="background:linear-gradient(135deg,${meta.color},#E8755A);padding:36px 40px;color:white;">
      <p style="font-size:10px;color:rgba(255,255,255,0.55);margin:0 0 6px;letter-spacing:1.5px;text-transform:uppercase;">MamÃ¡ CEO Â· Studio de Contenido Â· EMAIL</p>
      <h1 style="color:white;margin:0 0 8px;font-size:24px;font-family:Arial;">${meta.emoji} CampaÃ±a: ${campana.objetivo}</h1>
      <p style="color:rgba(255,255,255,0.8);margin:0;font-size:13px;font-style:italic;">${campana.comunicar}</p>
    </div>
    <div style="max-width:700px;margin:0 auto;padding:32px 40px;">${emailsHtml}</div>
    <div style="border-top:1px solid #eee;padding:14px 40px;text-align:center;"><p style="font-size:11px;color:#ccc;font-family:Arial;">Creado con Studio de Contenido Â· MamÃ¡ CEO App</p></div>
    </body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `CampaÃ±a - ${campana.objetivo}.doc`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const EMAIL_TIPOS = ["PresentaciÃ³n", "Valor / contenido", "Venta", "Seguimiento", "Gracias", "Re-engagement"];
  const EMAIL_TONOS = ["Cercano", "Profesional", "Emotivo", "Directo"];

  const buildDraft = ({ tipo, tono, tema, cta }) => {
    const TONOS_META = {
      "Cercano":     { abre: "Hola [nombre] ðŸ’Œ", cierra: "Con cariÃ±o,\n[Tu nombre]" },
      "Profesional": { abre: "Hola [nombre],",    cierra: "Saludos,\n[Tu nombre]" },
      "Emotivo":     { abre: "Hola [nombre] ðŸ’™",  cierra: "Con mucho cariÃ±o,\n[Tu nombre]" },
      "Directo":     { abre: "Hola [nombre],",    cierra: "Hasta pronto,\n[Tu nombre]" },
    };
    const { abre, cierra } = TONOS_META[tono] || TONOS_META["Cercano"];
    const ctaLine = cta ? `\nðŸ‘‰ ${cta}` : "\nðŸ‘‰ [CTA â€” quÃ© quieres que hagan]";
    const DRAFTS = {
      "PresentaciÃ³n":     `${abre}\n\nMe da mucho gusto escribirte.\n\nMi nombre es [tu nombre] y ayudo a [descripciÃ³n de clienta ideal] a ${tema || "[resultado que logras]"}.\n\n[2 a 3 lÃ­neas sobre tu enfoque o lo que te hace diferente. SÃ© especÃ­fica, no genÃ©rica.]\n\nCreo que hay una posibilidad de [lo que podrÃ­an lograr juntas] â€” y me encantarÃ­a contarte mÃ¡s.${ctaLine}\n\n${cierra}`,
      "Valor / contenido":`${abre}\n\nHoy vengo a regalarte algo que sÃ© que te va a servir.\n\nEl tema de hoy: ${tema || "[tu tema]"}.\n\n[Desarrolla en 3 a 5 pÃ¡rrafos. Incluye: el problema que resuelve, la idea central con un ejemplo concreto, y cÃ³mo pueden aplicarlo hoy mismo.]\n\nÂ¿Te fue Ãºtil? RespÃ³ndeme â€” me encanta saber que llegÃ³ al lugar correcto. ðŸ’Œ${ctaLine}\n\n${cierra}`,
      "Venta":            `${abre}\n\nTengo algo que quiero contarte â€” y creo que llega en el momento justo.\n\n${tema || "[Lo que quieres comunicar sobre tu oferta]"}.\n\nEsto es lo que cambia para ti cuando dices sÃ­:\n\nâœ¦ [Beneficio 1 â€” en tÃ©rminos de resultado, no caracterÃ­sticas]\nâœ¦ [Beneficio 2]\nâœ¦ [Beneficio 3]\n\nPrecio: [precio] Â· Disponible hasta: [fecha/hora]${ctaLine}\n\n${cierra}`,
      "Seguimiento":      `${abre}\n\nSolo querÃ­a hacer un seguimiento de ${tema || "[contexto â€” email anterior, conversaciÃ³n, interÃ©s que mostraron]"}.\n\nEntiendo que las decisiones toman su tiempo â€” y estÃ¡ bien.\n\nLo que quiero que sepas: [razÃ³n genuina por la que haces seguimiento â€” no presiÃ³n, sino valor real que les aportarÃ¡s].\n\nSi tienes preguntas, responde este email. Estoy aquÃ­. ðŸ’Œ${ctaLine}\n\n${cierra}`,
      "Gracias":          `${abre}\n\nEste email tiene un solo propÃ³sito: decirte gracias.\n\nGracias por ${tema || "[lo que hicieron â€” comprar, asistir, confiar, responder]"}.\n\n[2 a 3 lÃ­neas genuinas sobre lo que significa para ti. No corporativo â€” desde el corazÃ³n.]\n\n[Si aplica: quÃ© viene ahora, quÃ© pueden esperar, cÃ³mo vas a acompaÃ±arlas]${ctaLine}\n\nGracias de verdad. ðŸ’Œ\n\n${cierra}`,
      "Re-engagement":    `${abre}\n\nHace un tiempo que no hablamos â€” y querÃ­a escribirte.\n\nNo para vender nada. Solo para ver cÃ³mo estÃ¡s y recordarte que este espacio sigue aquÃ­ para ti.\n\n${tema ? `Desde la Ãºltima vez, ${tema}.` : "[Algo nuevo que tienes, algo que cambiÃ³, algo valioso para ellas]"}\n\nSi hay algo en lo que pueda ayudarte ahora mismo, responde este email. Sigo aquÃ­. ðŸ’Œ${ctaLine}\n\n${cierra}`,
    };
    return DRAFTS[tipo] || DRAFTS["Valor / contenido"];
  };

  const generarDraft = () => {
    if (!ef.tema.trim()) return;
    setDraft(buildDraft(ef));
  };

  const bancoEmails = saved?.campanias || [];
  const EJEMPLOS_COM = ["lanzar mi programa de 8 semanas", "mi mentorÃ­a 1:1 para mamÃ¡s", "conseguir primeras clientas", "ventas por WhatsApp", "bienestar y negocio"];

  return (
    <div className="studio-tab-content">

      {/* â”€â”€ LANDING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {view === "inicio" && (
        <div className="lm-landing">
          <div className="mpm-landing-header">
            <div className="mpm-landing-badge">ðŸ“§</div>
            <h2 className="mpm-landing-title">Email Marketing</h2>
            <p className="mpm-landing-sub">El canal con mayor retorno de inversiÃ³n â€” y el mÃ¡s personal. Habla directo al corazÃ³n de tu lista, sin algoritmo de por medio.</p>
          </div>

          <div className="lm-purpose-strip">
            <div className="lm-purpose-item">
              <span className="lm-purpose-num">1</span>
              <div><strong>Construye confianza</strong><p>En la bandeja de entrada no hay algoritmo. Tu mensaje llega directo â€” sin competir.</p></div>
            </div>
            <div className="lm-purpose-arrow">â†’</div>
            <div className="lm-purpose-item">
              <span className="lm-purpose-num">2</span>
              <div><strong>Educa y conecta</strong><p>Cada email es una conversaciÃ³n. La que mÃ¡s escucha, mÃ¡s compra.</p></div>
            </div>
            <div className="lm-purpose-arrow">â†’</div>
            <div className="lm-purpose-item lm-purpose-item--highlight">
              <span className="lm-purpose-num lm-purpose-num--highlight">3</span>
              <div><strong>Convierte y vende âœ¦</strong><p>Una lista caliente compra cuando la tratas bien. Consistencia + valor = ventas.</p></div>
            </div>
          </div>

          <div className="mpm-cards-row">
            <button className="mpm-card mpm-card--highlight" onClick={() => setView("campana")}>
              <div className="mpm-card-top">
                <span className="mpm-card-badge-ico">ðŸ“¨</span>
                <span className="mpm-card-tag mpm-card-tag--primary">Secuencia</span>
              </div>
              <strong className="mpm-card-name">Planificar campaÃ±a</strong>
              <p className="mpm-card-desc">Genera una secuencia completa con cuerpos de email listos para personalizar y enviar</p>
              <span className="mpm-card-link mpm-card-link--primary">Crear mi campaÃ±a â†’</span>
            </button>
            <button className="mpm-card" onClick={() => setView("redactar")}>
              <div className="mpm-card-top">
                <span className="mpm-card-emoji">âœï¸</span>
                <span className="mpm-card-tag">Individual</span>
              </div>
              <strong className="mpm-card-name">Redactar email</strong>
              <p className="mpm-card-desc">Escribe un email especÃ­fico: presentaciÃ³n, venta, seguimiento, gracias, re-engagement</p>
              <span className="mpm-card-link">Redactar â†’</span>
            </button>
          </div>
        </div>
      )}

      {/* â”€â”€ CAMPAÃ‘A â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {view === "campana" && (
        <div>
          <div className="lm-gen-topbar">
            <button className="mpm-wizard-back-btn" onClick={() => { setView("inicio"); setCampana(null); }}>â† Inicio</button>
            {campana && (
              <div style={{display:"flex",gap:"8px"}}>
                <button className="lm-dl-btn lm-dl-btn--word" onClick={downloadWordCampana}>â¬‡ Word</button>
                <button className="mpm-edit-btn" onClick={() => onSave("campanias", { id: Date.now(), objetivo: campana.objetivo, comunicar: campana.comunicar, fecha: new Date().toLocaleDateString("es") })}>Guardar ðŸ“§</button>
              </div>
            )}
          </div>

          <div className="email-obj-section">
            <label className="lm-crear-label" style={{marginBottom:"12px",display:"block"}}>Â¿CuÃ¡l es el objetivo de esta campaÃ±a?</label>
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
            <span className="ideas-search-icon">ðŸ“§</span>
            <input
              className="ideas-search-input"
              placeholder="Â¿QuÃ© quieres comunicar? Ej: lanzar mi mentorÃ­a 1:1 para mamÃ¡s que quieren sus primeras clientas..."
              value={comunicar}
              onChange={e => setComunicar(e.target.value)}
              onKeyDown={e => e.key === "Enter" && generarCampana()}
            />
            <button className="ideas-search-btn" onClick={() => generarCampana()} disabled={!comunicar.trim() || thinking}>
              Generar campaÃ±a âœ¦
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
                <div className="ideas-brain-orbit">ðŸ“§</div>
                {["ðŸ’Œ","ðŸš€","ðŸŽ","ðŸ’°","ðŸ”„","âœ¨"].map((s, i) => (
                  <div key={i} className={`ideas-orbit-item ideas-orbit-${i}`}>{s}</div>
                ))}
              </div>
              <p className="ideas-thinking-text">Escribiendo tu campaÃ±a<span className="ideas-dots-anim">...</span></p>
            </div>
          )}

          {campana && !thinking && (
            <div className="email-campana-wrap">
              <div className="ideas-result-header">
                <div>
                  <span className="ideas-kw-label">{OBJ_META[campana.objetivo]?.emoji} CampaÃ±a: </span>
                  <strong className="ideas-kw-value">{campana.objetivo}</strong>
                </div>
                <span style={{fontSize:"12px",color:"#9A7878"}}>{campana.emails.length} emails Â· edita y copia cada uno</span>
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
                          {copiado === `email-q-${i}` ? "âœ“" : "Copiar"}
                        </button>
                        <span className="email-expand-ico">{abierto ? "â–²" : "â–¼"}</span>
                      </div>
                    </div>
                    {abierto && (
                      <div className="email-campana-body">
                        <div className="email-asunto-full">
                          <span className="email-asunto-label">Asunto:</span>
                          <strong>{email.asunto}</strong>
                        </div>
                        <div className="email-cuerpo-label">Cuerpo â€” edita con tu voz y tu historia:</div>
                        <textarea
                          className="email-cuerpo-textarea"
                          value={cuerpos[i] || ""}
                          onChange={e => setCuerpos(p => ({...p, [i]: e.target.value}))}
                          rows={14}
                        />
                        <div className="email-cta-row">
                          <span className="email-cta-label">CTA sugerido:</span>
                          <span className="email-cta-text">{email.cta}</span>
                          <button className="guion-frase-copy" onClick={() => copiar(email.cta, `cta-${i}`)}>{copiado === `cta-${i}` ? "âœ“" : "Copiar CTA"}</button>
                        </div>
                        <button className="ideas-card-copy" style={{width:"100%",marginTop:"10px",justifyContent:"center",padding:"10px"}}
                          onClick={() => copiar(cuerpos[i] || email.cuerpo, `email-full-${i}`)}>
                          {copiado === `email-full-${i}` ? "âœ“ Email completo copiado" : "ðŸ“‹ Copiar email completo"}
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

      {/* â”€â”€ REDACTAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {view === "redactar" && (
        <div>
          <div className="lm-gen-topbar">
            <button className="mpm-wizard-back-btn" onClick={() => { setView("inicio"); setDraft(null); }}>â† Inicio</button>
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
              { num:"01", emoji:"âœï¸", label:"Â¿Sobre quÃ© es el email?",  field:"tema", ph:"Lanzamiento de mi mentorÃ­a, tip sobre ventas, gracias por comprar...", hint:"Mientras mÃ¡s especÃ­fico, mejor el borrador" },
              { num:"02", emoji:"ðŸŽ¯", label:"Â¿CuÃ¡l es tu llamada a acciÃ³n?", field:"cta",  ph:"Agenda tu llamada / EscrÃ­beme / Ver el link en mi bio", hint:"Una sola acciÃ³n, concreta y fÃ¡cil de hacer" },
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
            Generar email âœ¦
          </button>

          {draft && (
            <div className="email-draft-result">
              <div className="email-cuerpo-label" style={{padding:"0 0 8px"}}>Tu borrador â€” edita con tu voz y tu historia:</div>
              <textarea
                className="email-cuerpo-textarea"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={18}
              />
              <div className="studio-btn-row" style={{marginTop:"12px"}}>
                <button className="studio-copy-btn" onClick={() => copiar(draft, "draft")}>{copiado === "draft" ? "Â¡Copiado!" : "Copiar email"}</button>
                <button className="studio-btn-save" onClick={() => onSave("campanias", { id: Date.now(), objetivo: ef.tipo, comunicar: ef.tema, fecha: new Date().toLocaleDateString("es") })}>Guardar</button>
                <button className="ideas-regen-btn" onClick={generarDraft}>ðŸ”„ Regenerar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ BANCO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {bancoEmails.length > 0 && (
        <div className="studio-bank">
          <h4>CampaÃ±as y emails guardados ({bancoEmails.length})</h4>
          {bancoEmails.slice().reverse().map(item => {
            const meta = OBJ_META[item.objetivo];
            return (
              <div className="studio-bank-item" key={item.id}>
                <div className="studio-bank-item-top">
                  <span className="studio-tipo-badge" style={{ background: meta?.color || "#C4526A" }}>
                    {meta?.emoji || "ðŸ“§"} {item.objetivo}
                  </span>
                  <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                    <small>{item.fecha}</small>
                    <button className="studio-delete-btn" onClick={() => onDelete?.("campanias", item.id)}>âœ•</button>
                  </div>
                </div>
                <p style={{fontSize:"13px",color:"#2D1B1B",margin:"4px 0 0"}}>{item.comunicar?.slice(0,80)}{item.comunicar?.length > 80 ? "â€¦" : ""}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// â”€â”€ WHATSAPP LANZAMIENTO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      { dia:"3 â€“ 4 dÃ­as antes", label:"ðŸŒ± Intriga â€” crea la expectativa",
        texto:`Llevo semanas trabajando en algo â€” y ya casi estÃ¡ listo.\n\nSolo quiero que guardes esta fecha en tu agenda: ${f} a las ${h}.\n\nAlgo importante pasa ese dÃ­a. TÃº querrÃ¡s estar aquÃ­ cuando pase. ðŸ‘€\n\nTe cuento mÃ¡s pronto.`
      },
      { dia:"2 dÃ­as antes", label:"ðŸ”¥ Calentamiento â€” mÃ¡s contexto",
        texto:`SÃ© que te dejÃ© con suspenso ðŸ˜… y estÃ¡ bien.\n\nPorque lo que viene lo merece.\n\nEl ${f} a las ${h} abro las puertas de ${p} â€” y quiero que seas de las primeras en conocer todos los detalles.\n\nEsto es para ti si quieres ${pr}.\n\nÂ¿EstÃ¡s lista? ðŸ”¥\n\nNos vemos el ${f}.`
      },
      { dia:"1 dÃ­a antes", label:"ðŸ—“ï¸ Recordatorio â€” confirma asistencia",
        texto:`MaÃ±ana es el dÃ­a. ðŸ—“ï¸\n\nMaÃ±ana ${f} a las ${h} arranca ${fmt} â€” y voy a estar aquÃ­ contÃ¡ndote todo sobre ${p}.\n\nSi quieres ${pr}, maÃ±ana es tu momento.\n\nGuarda la hora. No te vayas a ningÃºn lado. Nos vemos aquÃ­. ðŸ™Œ`
      },
      { dia:"Noche anterior", label:"ðŸŒ™ Ãšltimo recordatorio â€” corto y directo",
        texto:`MaÃ±ana a las ${h}. ðŸŒ™\n\nSolo eso te querÃ­a decir esta noche.\n\nNos vemos aquÃ­. ðŸ’Œ`
      },
    ];

    const fase2 = [
      { dia:"MaÃ±ana del lanzamiento", label:"ðŸŽ‰ Â¡LlegÃ³ el dÃ­a!",
        texto:`ðŸŽ‰ Â¡El dÃ­a llegÃ³!\n\nHoy a las ${h} arranca ${fmt} â€” y estoy muy emocionada de finalmente contarte todo sobre ${p}.\n\nHoy vas a entender exactamente cÃ³mo ${pr}.\n\n${esc ? `ðŸ“Œ ${esc}` : "Y si decides entrar hoy, hay algo especial esperÃ¡ndote. ðŸŽ"}\n\nNos vemos a las ${h}. Â¡AquÃ­ estarÃ©! ðŸ”¥`
      },
      { dia:"1 â€“ 2 horas antes", label:"â° Cuenta regresiva",
        texto:`Â¡Falta muy poco! â°\n\n${fmt} arranca en menos de 2 horas.\n\nÂ¿Ya tienes tu espacio listo? PrepÃ¡rate, acomÃ³date y llega puntual â€” porque lo que compartiremos hoy puede cambiar cÃ³mo ves tu negocio.\n\nNos vemos a las ${h}. ðŸ”¥`
      },
      { dia:"A la hora exacta", label:"ðŸ”´ Â¡Arrancamos!",
        texto:`ðŸ”´ Â¡Arrancamos!\n\n[Agrega aquÃ­ el link de ${fmt} o instrucciones de acceso]\n\nÂ¡Nos vemos adentro! ðŸŽ‰`
      },
      { dia:"Inmediatamente despuÃ©s", label:"ðŸš€ Apertura de ventas",
        texto:`Wow. ðŸ¥¹\n\nLo que pasÃ³ hoy fue especial. Gracias a todas las que estuvieron presentes.\n\nY para las que no pudieron estar â€” no se preocupen. Lo mÃ¡s importante viene ahora.\n\n${p} estÃ¡ oficialmente abierto. ðŸŽ\n\nEsto es lo que lograrÃ¡s:\nâœ¨ ${pr}\n\nInversiÃ³n: ${precio || "[precio]"}\n${esc ? `ðŸ“Œ ${esc}\n` : ""}\nEl link estÃ¡ aquÃ­ ðŸ‘‡\n[Link de compra o inscripciÃ³n]\n\nÂ¿Tienes preguntas? RespÃ³ndeme aquÃ­ mismo. Estoy leyendo todo. ðŸ’Œ`
      },
      { dia:"2 â€“ 4 horas despuÃ©s", label:"ðŸ“Š Urgencia inicial",
        texto:`Ya son varias las que se animaron a entrar a ${p} en las Ãºltimas horas. ðŸ”¥\n\nTiene todo el sentido â€” porque esto fue creado exactamente para quienes quieren ${pr}.\n\nÂ¿TodavÃ­a tienes preguntas? RespÃ³ndeme aquÃ­ y te doy todos los detalles.\n\nEl precio especial de lanzamiento es solo por este tiempo. DespuÃ©s cambia.\n\nðŸ‘‰ [Link]`
      },
    ];

    const fase3 = [
      { dia:"Al dÃ­a siguiente", label:"â˜€ï¸ Prueba social + urgencia suave",
        texto:`Buenos dÃ­as â˜€ï¸\n\nAyer fue un dÃ­a increÃ­ble. Gracias a todas las que estuvieron, las que preguntaron, las que se animaron.\n\nPara las que aÃºn estÃ¡n pensando:\n\n${p} todavÃ­a estÃ¡ abierto â€” pero el precio de lanzamiento es solo hasta ${esc || "que se agoten los cupos"}.\n\nÂ¿QuÃ© necesitas saber para tomar la decisiÃ³n? RespÃ³ndeme aquÃ­. ðŸ’Œ`
      },
      { dia:"2 â€“ 3 dÃ­as antes del cierre", label:"â³ Urgencia media",
        texto:`Quedan pocos dÃ­as. â°\n\nEl acceso a ${p} al precio de lanzamiento cierra pronto â€” y no lo repetirÃ© enseguida.\n\nSi quieres ${pr}... hoy es mejor que maÃ±ana. Y maÃ±ana es mejor que "ya no estÃ¡ disponible".\n\n${esc ? `ðŸ“Œ ${esc}\n` : ""}ðŸ‘‰ [Link de compra]\n\nÂ¿Dudas de Ãºltimo momento? EscrÃ­beme. Estoy aquÃ­ para responderte. ðŸ’Œ`
      },
      { dia:"Ãšltimas 24 horas", label:"ðŸš¨ Ãšltimo aviso",
        texto:`ðŸš¨ Ãšltimas horas.\n\nMaÃ±ana cierra ${p}.\n\nNo voy a mandarte otro mensaje despuÃ©s de este. Solo quiero que sepas que el espacio todavÃ­a estÃ¡ ahÃ­ si lo quieres.\n\n${pr}\n\nðŸ‘‰ [Link]\n\nCon cariÃ±o,\n[Tu nombre]`
      },
      { dia:"Al momento del cierre", label:"ðŸ” Cierre oficial",
        texto:`Y... cerrado. ðŸ”\n\n${p} ya no estÃ¡ disponible.\n\nGracias a todas las que confiaron y se animaron. Las veo adentro. ðŸ¥¹\n\nPara las que no pudieron esta vez â€” escrÃ­banme aquÃ­ y las agrego a la lista de espera para la prÃ³xima apertura.\n\nHasta pronto. ðŸ’Œ`
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
    { key:"fase1", label:"ðŸ“£ Pre-lanzamiento",        sub:"Crea expectativa antes del gran dÃ­a",      color:"#E67E22", bg:"#FFF5EB" },
    { key:"fase2", label:"ðŸš€ El dÃ­a del lanzamiento",  sub:"Conecta, motiva y abre las ventas",        color:"#C4526A", bg:"#FFF0F3" },
    { key:"fase3", label:"ðŸŽ¯ Post-lanzamiento",        sub:"Genera urgencia y cierra con confianza",   color:"#27AE60", bg:"#EEFAF3" },
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

      {/* â”€â”€ FORMULARIO â”€â”€ */}
      {!plan && !thinking && (
        <div className="wp-form-wrap">
          <div className="guion-form-intro">
            <div className="mpm-landing-badge" style={{margin:"0 auto 4px"}}>ðŸ’¬</div>
            <h2>Plan de Lanzamiento WhatsApp</h2>
            <p>CuÃ©ntanos de quÃ© trata tu lanzamiento y generaremos 13 mensajes listos para enviar: calentamiento, el gran dÃ­a y el cierre.</p>
          </div>

          <div className={`desc-q-card${form.producto?" filled":""}`}>
            <div className="desc-q-num">ðŸŽ</div>
            <div className="desc-q-body">
              <label className="desc-q-label">Â¿CÃ³mo se llama tu producto o servicio?</label>
              <input className="desc-q-input" autoFocus
                placeholder="Ej: Mini-curso de ventas, MembresÃ­a MamÃ¡ CEO, ConsultorÃ­a VIP..."
                value={form.producto} onChange={e => sf("producto", e.target.value)} />
            </div>
          </div>

          <div className={`desc-q-card${form.promesa?" filled":""}`}>
            <div className="desc-q-num">âœ¨</div>
            <div className="desc-q-body">
              <label className="desc-q-label">Â¿QuÃ© resultado o transformaciÃ³n ofrece?</label>
              <input className="desc-q-input"
                placeholder="Ej: vender sin perseguir clientes, organizar su negocio en 4 semanas..."
                value={form.promesa} onChange={e => sf("promesa", e.target.value)} />
            </div>
          </div>

          <div className="wp-fecha-hora-row">
            <div className={`desc-q-card${form.fecha?" filled":""}`} style={{flex:1}}>
              <div className="desc-q-num">ðŸ“…</div>
              <div className="desc-q-body">
                <label className="desc-q-label">Fecha del lanzamiento</label>
                <input className="desc-q-input" placeholder="Ej: 20 de junio" value={form.fecha} onChange={e => sf("fecha", e.target.value)} />
              </div>
            </div>
            <div className={`desc-q-card${form.hora?" filled":""}`} style={{flex:1}}>
              <div className="desc-q-num">ðŸ•</div>
              <div className="desc-q-body">
                <label className="desc-q-label">Hora</label>
                <input className="desc-q-input" placeholder="Ej: 8pm hora Colombia" value={form.hora} onChange={e => sf("hora", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="wp-formato-group">
            <label className="lm-crear-label">Â¿CÃ³mo lo vas a hacer?</label>
            <div className="guion-obj-pills" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
              {FORMATOS.map(f => (
                <button key={f} className={`guion-obj-pill${form.formato===f?" active":""}`}
                  onClick={() => sf("formato", f)}>{f}</button>
              ))}
            </div>
          </div>

          <div className="wp-precio-escasez-row">
            <div className={`desc-q-card${form.precio?" filled":""}`} style={{flex:1}}>
              <div className="desc-q-num">ðŸ’°</div>
              <div className="desc-q-body">
                <label className="desc-q-label">Precio o inversiÃ³n (opcional)</label>
                <input className="desc-q-input" placeholder="Ej: $97 USD, $350.000 COP" value={form.precio} onChange={e => sf("precio", e.target.value)} />
              </div>
            </div>
            <div className={`desc-q-card${form.escasez?" filled":""}`} style={{flex:1}}>
              <div className="desc-q-num">â³</div>
              <div className="desc-q-body">
                <label className="desc-q-label">Escasez o urgencia (opcional)</label>
                <input className="desc-q-input" placeholder="Ej: Solo 30 cupos, precio especial 48h" value={form.escasez} onChange={e => sf("escasez", e.target.value)} />
              </div>
            </div>
          </div>

          <button className="mpm-step-btn" onClick={generarPlan} disabled={!form.producto.trim() || !form.promesa.trim()}>
            Generar plan de lanzamiento âœ¦
          </button>
        </div>
      )}

      {/* â”€â”€ THINKING â”€â”€ */}
      {thinking && (
        <div className="ideas-thinking">
          <div className="ideas-orb-container">
            <div className="ideas-orb ideas-orb-1" /><div className="ideas-orb ideas-orb-2" /><div className="ideas-orb ideas-orb-3" />
          </div>
          <p className="ideas-thinking-text">Creando tu plan de 13 mensajes<span className="ideas-dots-anim">...</span></p>
        </div>
      )}

      {/* â”€â”€ PLAN â”€â”€ */}
      {plan && !thinking && (
        <div className="wp-plan-wrap">

          {/* Topbar */}
          <div className="wp-plan-topbar">
            <button className="mpm-wizard-back-btn" onClick={() => setPlan(null)}>â† Editar</button>
            <button className="mpm-wizard-back-btn" onClick={() => { setPlan(null); setForm(INIT); }}>ðŸ”„ Nuevo</button>
            <button className="mpm-edit-btn" style={{marginLeft:"auto"}} onClick={() => onSave("lanzamientos", { id: Date.now(), producto: form.producto, fecha: form.fecha, formato: form.formato, fecha_guardado: new Date().toLocaleDateString("es") })}>
              Guardar ðŸ’¬
            </button>
          </div>

          {/* Header del plan */}
          <div className="wp-plan-header">
            <div className="wp-plan-titulo">{form.producto}</div>
            <div className="wp-plan-meta-row">
              {form.fecha && <span>ðŸ“… {form.fecha}</span>}
              {form.hora  && <span>ðŸ• {form.hora}</span>}
              <span>ðŸ“ {form.formato}</span>
              {form.precio && <span>ðŸ’° {form.precio}</span>}
            </div>
            <div className="wp-plan-total">13 mensajes Â· 3 fases</div>
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
                        {copiado === `${fase.key}-${i}` ? "âœ“ Copiado" : "Copiar"}
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
                  {l.fecha && <span style={{fontSize:"11px",color:"#9A7878",marginLeft:"7px"}}>Â· {l.fecha}</span>}
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

// â”€â”€ STUDIO PRINCIPAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€ REPROPÃ“SITO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      { num:"02", etq:"El dolor",   txt: trunc(g.interes) || `Lo que muchas vivimos con ${g.tema} â€” y que pocas dicen` },
      { num:"03", etq:"El cambio",  txt: trunc(g.deseo) || `Hasta que descubres que hay otra forma de verlo` },
      { num:"04", etq:"Resultado",  txt: g.logro ? `Cuando ${g.logro.toLowerCase().replace(/\.$/, "")}` : `Y cuando eso cambia, todo cambia` },
      { num:"05", etq:"CTA",        txt: trunc(g.ctaTxt) || `Guarda este carrusel â€” lo vas a querer tener cerca ðŸ“Œ` },
    ];
  };

  const genEmail = () => {
    if (!g) return { asunto: "", cuerpo: "" };
    const t = g.tema || "";
    const nombre = brandProfile?.nombreNegocio || "";
    return {
      asunto: `Algo sobre ${t} que no quiero que se te pase`,
      cuerpo: [
        `Hola ðŸ‘‹`,
        ``,
        g.hook || `Quiero contarte algo sobre ${t} que creo que te va a resonar.`,
        ``,
        g.interes ? g.interes + `\n` : "",
        g.deseo   ? g.deseo   + `\n` : "",
        g.logro   ? `Cuando ${g.logro.toLowerCase()}, todo empieza a fluir diferente.\n` : "",
        g.ctaTxt  || `Responde este email si quieres saber mÃ¡s â€” te leo con gusto.`,
        ``,
        `Con cariÃ±o,`,
        nombre || `[Tu nombre]`,
      ].filter(l => l !== "").join("\n"),
    };
  };

  const genWhatsApp = () => {
    if (!g) return [];
    const t = g.tema || "este tema";
    const dolor = g.dolor ? g.dolor.toLowerCase().replace(/\.$/, "") : `algo no estaba funcionando como querÃ­as`;
    const hook = g.hook ? `"${line1(g.hook)}"` : "";
    return [
      { label: "ðŸ“£ Pre-publicaciÃ³n â€” antes de subir el reel",
        txt: `Hola ðŸ’›\n\nHoy publico algo que creo que te va a llegar directo.\n\nEs sobre ${t}.\n\nSi alguna vez has sentido que ${dolor}, este video es para ti.\n\nLo subo en un momento â€” estate pendiente. ðŸ‘€` },
      { label: "ðŸš€ El dÃ­a que publicas",
        txt: `Â¡Ya estÃ¡ en el aire! ðŸŽ¬\n\nAcabo de publicar un reel sobre ${t}.\n\n${hook}\n\nVe a verlo y cuÃ©ntame en comentarios si te resonÃ³ algo.\n\nðŸ‘‰ [link de tu perfil]`.replace(/\n\n\n/g, "\n\n") },
      { label: "ðŸ” Follow-up al dÃ­a siguiente",
        txt: `Ayer publiquÃ© algo sobre ${t} y la respuesta fue hermosa ðŸ¤\n\nSi todavÃ­a no lo viste, te lo dejo aquÃ­ â†’ [link]\n\nY si ya lo viste: Â¿en quÃ© parte te viste reflejada?\n\nTe leo con gusto ðŸ’¬` },
    ];
  };

  const genStories = () => {
    if (!g) return [];
    const t = g.tema || "este tema";
    return [
      { num:"01", tipo:"Pregunta",       txt: g.hook    ? line1(g.hook)    : `Â¿Sientes que con ${t} algo todavÃ­a no estÃ¡ donde quieres?` },
      { num:"02", tipo:"El dolor",       txt: g.interes ? line1(g.interes) : `Muchas vivimos esto con ${t} â€” y se siente muy solitario.` },
      { num:"03", tipo:"La revelaciÃ³n",  txt: g.deseo   ? line1(g.deseo)   : `Hasta que descubres que no es falta de esfuerzo â€” es falta de sistema.` },
      { num:"04", tipo:"El resultado",   txt: g.logro   ? `Cuando ${g.logro.toLowerCase()}` : `Y cuando todo empieza a fluir, tu vida cambia de verdad.` },
      { num:"05", tipo:"CTA",            txt: g.ctaTxt  ? line1(g.ctaTxt)  : `Responde este story si quieres saber mÃ¡s â€” te cuento todo ðŸ’¬` },
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
        <h3 className="rp-intro-title">â™»ï¸ RepropÃ³sito de contenido</h3>
        <p className="rp-intro-sub">Elige un guiÃ³n guardado y conviÃ©rtelo en 4 formatos distintos â€” semana de contenido completa con un clic.</p>
      </div>

      {/* Guiones guardados */}
      {guiones.length === 0 ? (
        <div className="rp-empty">AÃºn no tienes guiones guardados. Crea uno en el tab GuiÃ³n y guÃ¡rdalo para reproponer su contenido aquÃ­.</div>
      ) : (
        <div className="rp-guiones-grid">
          {guiones.map(gg => (
            <button key={gg.id}
              className={`rp-guion-card ${selId === gg.id ? "rp-guion-card--active" : ""}`}
              onClick={() => setSelId(selId === gg.id ? null : gg.id)}>
              <span className="rp-guion-obj">{gg.objetivo || "GuiÃ³n"}</span>
              <span className="rp-guion-tema">{gg.tema}</span>
              <span className="rp-guion-fecha">{gg.fecha}</span>
              {selId === gg.id && <span className="rp-guion-check">âœ“ Seleccionado</span>}
            </button>
          ))}
        </div>
      )}

      {/* Formatos */}
      {g && (
        <>
          <div className="rp-sel-banner">
            <span>â™»ï¸ ReproponiÃ©ndolo como: <b>{g.tema}</b></span>
            <button className="rp-desel" onClick={() => setSelId(null)}>Ã— Cambiar</button>
          </div>

          <div className="rp-formats-grid">

            {/* Carrusel */}
            <div className="rp-fcard" style={{"--rpc": FORMAT_COLORS.carrusel.color, "--rpb": FORMAT_COLORS.carrusel.bg}}>
              <div className="rp-fcard-header">
                <span className="rp-fcard-icon">ðŸ“±</span>
                <span className="rp-fcard-title">Carrusel</span>
                <button className="rp-copy-all" onClick={() => copiar(slides.map((s,i) => `SLIDE ${i+1} â€” ${s.etq}\n${s.txt}`).join("\n\n---\n\n"), "carrusel")}>
                  {copiado === "carrusel" ? "âœ“ Copiado" : "Copiar todo"}
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
                      {copiado === `s${s.num}` ? "âœ“" : "ðŸ“‹"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Email */}
            <div className="rp-fcard" style={{"--rpc": FORMAT_COLORS.email.color, "--rpb": FORMAT_COLORS.email.bg}}>
              <div className="rp-fcard-header">
                <span className="rp-fcard-icon">ðŸ“§</span>
                <span className="rp-fcard-title">Email</span>
                <button className="rp-copy-all" onClick={() => copiar(`Asunto: ${email.asunto}\n\n${email.cuerpo}`, "email")}>
                  {copiado === "email" ? "âœ“ Copiado" : "Copiar todo"}
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
                <span className="rp-fcard-icon">ðŸ’¬</span>
                <span className="rp-fcard-title">WhatsApp</span>
                <button className="rp-copy-all" onClick={() => copiar(waMsgs.map(m => `${m.label}\n\n${m.txt}`).join("\n\nâ”â”â”â”â”â”â”â”\n\n"), "wa")}>
                  {copiado === "wa" ? "âœ“ Copiado" : "Copiar todo"}
                </button>
              </div>
              <div className="rp-wa-list">
                {waMsgs.map((m, i) => (
                  <div key={i} className="rp-wa-msg">
                    <div className="rp-wa-msg-header">
                      <span className="rp-wa-label">{m.label}</span>
                      <button className="rp-copy-item" onClick={() => copiar(m.txt, `wa${i}`)}>
                        {copiado === `wa${i}` ? "âœ“" : "ðŸ“‹"}
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
                <span className="rp-fcard-icon">ðŸ“¸</span>
                <span className="rp-fcard-title">Stories</span>
                <button className="rp-copy-all" onClick={() => copiar(stories.map(s => `Story ${s.num} â€” ${s.tipo}\n${s.txt}`).join("\n\n---\n\n"), "stories")}>
                  {copiado === "stories" ? "âœ“ Copiado" : "Copiar todo"}
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
                      {copiado === `st${s.num}` ? "âœ“" : "ðŸ“‹"}
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

// â”€â”€ CARRUSEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CR_ESTRUCTURAS = [
  { id: "Educativo",   icon: "ðŸ“š", sub: "Tips y consejos",     color: "#4A90D9", bg: "#EEF5FF" },
  { id: "Historia",    icon: "ðŸ’«", sub: "Problema â†’ SoluciÃ³n", color: "#C4526A", bg: "#FFF0F3" },
  { id: "ComparaciÃ³n", icon: "âš–ï¸",  sub: "Antes vs DespuÃ©s",    color: "#C9A96E", bg: "#faf3e7" },
  { id: "Proceso",     icon: "ðŸ”¢", sub: "Paso a paso",         color: "#2f9f70", bg: "#def3e8" },
];

const CR_CONTEXTO_META = {
  "Educativo":   { label: "Â¿CuÃ¡les son tus tips o puntos clave? (uno por lÃ­nea)", placeholder: "Bloquea 2 horas fijas para tu negocio cada dÃ­a\nAgrupa tareas similares â€” no mezcles crear con responder\nDi no a lo que no mueve tu negocio hacia adelante\nDelega lo que no necesita tu cerebro\nRevisa tu semana cada domingo en 10 minutos" },
  "Historia":    { label: "CuÃ©ntanos en 3 lÃ­neas: Â¿cÃ³mo era el antes? â†’ Â¿quÃ© cambiÃ³? â†’ Â¿cÃ³mo es el ahora?", placeholder: "Antes me sentÃ­a desbordada â€” todo urgente, sin tiempo para nada\nDescubrÃ­ que necesitaba un sistema, no mÃ¡s disciplina\nHoy trabajo con claridad y termino el dÃ­a sin culpa" },
  "ComparaciÃ³n": { label: "Escribe 3 situaciones del ANTES (lÃ­neas 1-3) y 3 del AHORA (lÃ­neas 4-6)", placeholder: "HacÃ­a de todo sin saber quÃ© movÃ­a el negocio de verdad\nTrabajas reaccionando, apagando fuegos todo el dÃ­a\nSentÃ­a que nunca era suficiente\nAhora tengo 3 prioridades claras cada semana\nTrabajo en bloques y termino lo que empiezo\nSÃ© exactamente quÃ© hacer cada maÃ±ana" },
  "Proceso":     { label: "Â¿CuÃ¡les son los pasos de tu proceso? (uno por lÃ­nea â€” mÃ­nimo 3, mÃ¡ximo 6)", placeholder: "Define quÃ© quieres lograr esta semana con claridad\nBloquea tiempo en tu agenda antes de que lleguen los imprevistos\nAgrupa tareas por tipo de energÃ­a â€” crea en bloque, responde en bloque\nDi no a lo que no estÃ© en tu lista de prioridades\nRevisa cada semana quÃ© funcionÃ³ y quÃ© ajustar" },
};

function buildCarruselSlides(estructura, t, ctx = "") {
  const cleanT = t.trim() || "este tema";
  const lines = ctx.split("\n").map(l => l.trim()).filter(Boolean);

  if (estructura === "Educativo") {
    const tips = lines.length >= 3 ? lines : [
      `El hÃ¡bito mÃ¡s simple que mÃ¡s impacto tiene en ${cleanT}`,
      `El error que el 90% comete y que frena todo el proceso`,
      `Lo que funciona aunque no lo veas en redes â€” porque nadie lo muestra`,
      `La verdad incÃ³moda que te libera cuando la aceptas`,
      `El cambio mÃ¡s pequeÃ±o que genera el resultado mÃ¡s grande`,
    ];
    return [
      { id:0, tipo:"portada",   etiqueta:"", principal:`${tips.length} claves sobre ${cleanT}\nque ojalÃ¡ alguien me hubiera dicho antes`, apoyo:"Desliza para descubrirlas â†’" },
      ...tips.slice(0, 6).map((tip, i) => ({
        id: i+1, tipo:"contenido", etiqueta:`${String(i+1).padStart(2,"0")}`,
        principal: tip, apoyo: ""
      })),
      { id: tips.slice(0,6).length+1, tipo:"cta", etiqueta:"", principal:"Â¿CuÃ¡l de estas claves resonÃ³ mÃ¡s contigo?", apoyo:"Guarda este carrusel para cuando lo necesites ðŸ“Œ\nComenta el nÃºmero de tu favorita ðŸ‘‡" },
    ];
  }

  if (estructura === "Historia") {
    const antes   = lines[0] || `Antes de entender ${cleanT}, sentÃ­a que algo no estaba funcionando`;
    const quiebre = lines[1] || `Hasta que encontrÃ© una forma diferente de verlo todo`;
    const ahora   = lines[2] || `Hoy tengo claridad, consistencia y resultados con ${cleanT}`;
    return [
      { id:0, tipo:"portada",   etiqueta:"",             principal:`CÃ³mo ${cleanT}\ncambiÃ³ todo para mÃ­\n(y puede cambiarlo para ti)`, apoyo:"Una historia real â†’" },
      { id:1, tipo:"antes",     etiqueta:"El antes",     principal: antes, apoyo:"Era agotador. Trabajaba mucho y avanzaba poco." },
      { id:2, tipo:"problema",  etiqueta:"El dolor",     principal:"Lo que mÃ¡s me frustraba era...", apoyo:"Ver que otras lo lograban y preguntarme quÃ© estaba haciendo mal." },
      { id:3, tipo:"quiebre",   etiqueta:"El quiebre",   principal: quiebre, apoyo:"Fue un momento pequeÃ±o. Pero lo cambiÃ³ todo." },
      { id:4, tipo:"solucion",  etiqueta:"El cambio",    principal:"Lo que descubrÃ­ fue...", apoyo:"No era un secreto grande. Era algo que yo ya sabÃ­a pero no habÃ­a aplicado de verdad." },
      { id:5, tipo:"resultado", etiqueta:"El resultado", principal: ahora, apoyo:"No fue de un dÃ­a para otro. Pero cuando empezÃ³ a fluir, no lo pude parar." },
      { id:6, tipo:"cta",       etiqueta:"",             principal:"Â¿Te identificas con alguna de estas etapas?", apoyo:"CuÃ©ntame en comentarios ðŸ’¬\no escrÃ­beme por DM â€” te leo ðŸ¤" },
    ];
  }

  if (estructura === "ComparaciÃ³n") {
    const antesDefault = [
      `HacÃ­a ${cleanT} sin un sistema claro â€” todo era caÃ³tico`,
      `CreÃ­a que necesitaba mÃ¡s tiempo, mÃ¡s energÃ­a o mÃ¡s recursos`,
      `Me comparaba constantemente y sentÃ­a que siempre iba atrasada`,
    ];
    const despuesDefault = [
      `Tengo un proceso claro que repito con consistencia`,
      `Trabajo con lo que tengo â€” y genera resultados reales`,
      `Me enfoco en mi propio camino â€” y eso lo cambiÃ³ todo`,
    ];
    const antesItems   = lines.slice(0, 3).length >= 3 ? lines.slice(0, 3) : antesDefault;
    const despuesItems = lines.slice(3, 6).length >= 3 ? lines.slice(3, 6) : despuesDefault;
    return [
      { id:0, tipo:"portada",  etiqueta:"",           principal:`${cleanT}:\nantes vs. ahora`, apoyo:"Lo que cambiÃ³ cuando lo hice diferente â†’" },
      { id:1, tipo:"antes",    etiqueta:"ANTES âœ—",    principal: antesItems[0], apoyo:"Resultado: agotamiento, frustraciÃ³n, sin avance real" },
      { id:2, tipo:"antes",    etiqueta:"ANTES âœ—",    principal: antesItems[1], apoyo:"" },
      { id:3, tipo:"antes",    etiqueta:"ANTES âœ—",    principal: antesItems[2], apoyo:"" },
      { id:4, tipo:"vs",       etiqueta:"EL CAMBIO",  principal:"Lo que lo transformÃ³ todo:", apoyo:"Un cambio en cÃ³mo lo veÃ­a lo cambiÃ³ todo." },
      { id:5, tipo:"despues",  etiqueta:"AHORA âœ“",    principal: despuesItems[0], apoyo:"Resultado: claridad, consistencia, resultados reales" },
      { id:6, tipo:"despues",  etiqueta:"AHORA âœ“",    principal: despuesItems[1], apoyo:"" },
      { id:7, tipo:"despues",  etiqueta:"AHORA âœ“",    principal: despuesItems[2], apoyo:"" },
      { id:8, tipo:"cta",      etiqueta:"",           principal:"Â¿En cuÃ¡l lado estÃ¡s tÃº hoy?", apoyo:"Comenta ANTES o AHORA ðŸ‘‡\nTe leo en cada comentario" },
    ];
  }

  // Proceso
  const pasosDefault = [
    `Define con claridad quÃ© quieres lograr con ${cleanT}`,
    `Crea un sistema simple que puedas repetir cada semana`,
    `Elimina lo que te frena sin que te des cuenta`,
    `Ejecuta en bloques â€” protege tu tiempo como una cita sagrada`,
    `Revisa, ajusta y vuelve a empezar â€” la consistencia gana`,
  ];
  const pasos = lines.length >= 3 ? lines.slice(0, 6) : pasosDefault;
  return [
    { id:0, tipo:"portada",   etiqueta:"",             principal:`Mi proceso para ${cleanT}\nen ${pasos.length} pasos que funcionan`, apoyo:"Desliza y aplÃ­calos â†’" },
    ...pasos.map((paso, i) => ({
      id: i+1, tipo:"paso", etiqueta:`Paso ${String(i+1).padStart(2,"0")}`,
      principal: paso,
      apoyo: i === 0 ? "AquÃ­ es donde la mayorÃ­a se salta â€” y por eso no llega al final." :
             i === Math.floor(pasos.length / 2) ? "Este es el paso mÃ¡s difÃ­cil. Y el mÃ¡s importante." : ""
    })),
    { id: pasos.length+1, tipo:"resultado", etiqueta:"El resultado", principal:`Cuando aplicas este proceso...`, apoyo:`Dejas de improvisar y empiezas a tener resultados consistentes con ${cleanT}.` },
    { id: pasos.length+2, tipo:"cta",       etiqueta:"", principal:"Â¿En quÃ© paso estÃ¡s tÃº ahora?", apoyo:"Comenta el nÃºmero ðŸ‘‡\nTe doy un tip especÃ­fico para ese paso" },
  ];
}

function getApoyoSuggestions(tipo) {
  const map = {
    contenido: [
      "Cuando lo apliquÃ© por primera vez, fue un antes y un despuÃ©s.",
      "El error mÃ¡s comÃºn: hacer exactamente lo contrario sin darse cuenta.",
      "EmpiÃ©zalo hoy: 5 minutos son suficientes para comenzar.",
    ],
    paso: [
      "AquÃ­ es donde la mayorÃ­a se salta â€” y por eso no llega al final.",
      "El error que evita: querer ir al resultado sin pasar por este punto.",
      "Hazlo ahora: da el primer micro-paso y confÃ­rmate que empezaste.",
    ],
    antes: [
      "Â¿Te suena familiar? Es mÃ¡s comÃºn de lo que crees.",
      "Lo peor no era el cansancio. Era sentir que eso era normal.",
      "Si estÃ¡s aquÃ­ ahora: lo que sientes tiene salida. De verdad.",
    ],
    problema: [
      "Y lo mÃ¡s duro: sentir que era la Ãºnica a la que le pasaba.",
      "Eso agota mÃ¡s que el trabajo mismo â€” la sensaciÃ³n de no avanzar.",
      "Â¿Te identificas? CuÃ©ntame en comentarios ðŸ‘‡",
    ],
    quiebre: [
      "Fue un momento pequeÃ±o. Pero lo cambiÃ³ todo.",
      "No lo planeÃ©. LlegÃ³ cuando mÃ¡s lo necesitaba.",
      "Desde ese dÃ­a, empecÃ© a ver las cosas diferente.",
    ],
    solucion: [
      "No era complicado. Era solo algo que no habÃ­a aplicado de verdad.",
      "Lo habÃ­a escuchado antes â€” pero esta vez lo entendÃ­ diferente.",
      "El resultado llegÃ³ mÃ¡s rÃ¡pido de lo que esperaba.",
    ],
    resultado: [
      "No de un dÃ­a para otro. Pero cuando llegÃ³, fue real y duradero.",
      "Y lo mÃ¡s valioso: la paz que viene cuando las cosas fluyen.",
      "Si yo pude desde donde estaba, tÃº tambiÃ©n puedes. En serio.",
    ],
    despues: [
      "Y lo mejor: una vez que lo tienes, ya no quieres volver atrÃ¡s.",
      "No fue un gran cambio. Fue consistente y honesto.",
      "Â¿CuÃ¡nto tardÃ©? Menos de lo que pensaba.",
    ],
    vs: [
      "No fue un accidente. Fue una decisiÃ³n, aunque no lo pareciera.",
      "PequeÃ±o giro. Gran diferencia.",
      "Ese 'algo' que cambiÃ³ lo cambiÃ³ todo.",
    ],
    portada: [
      "Esta es mi historia real â€” sin filtros ni versiÃ³n perfecta.",
      "Desliza â€” hay algo aquÃ­ que es exactamente para ti.",
      "Lo que nadie muestra pero muchas vivimos.",
    ],
    cta: [
      "Te leo en comentarios. CuÃ©ntame tu nÃºmero favorito.",
      "No hay respuesta incorrecta â€” solo quiero saber cÃ³mo estÃ¡s.",
      "Comparte esto con alguien que lo necesite hoy ðŸ¤",
    ],
  };
  return map[tipo] || map.contenido;
}

function CarruselTab({ saved, onSave, onDelete, brandProfile = {} }) {
  const [tema,         setTema]         = useState(brandProfile.queOfreces || "");
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
      const header = `SLIDE ${i + 1}${s.etiqueta ? ` â€” ${s.etiqueta}` : s.tipo === "portada" ? " â€” PORTADA" : s.tipo === "cta" ? " â€” CTA" : ""}`;
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
          <input className="cr-input" placeholder="Ej: organizar el tiempo cuando eres mamÃ¡ y emprendes" value={tema} onChange={e => setTema(e.target.value)} />
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
          <span className="cr-ctx-hint">Si lo dejas vacÃ­o, usamos ejemplos genÃ©ricos que puedes editar despuÃ©s.</span>
        </div>
        <button className="primary-button" onClick={generar} disabled={thinking || !tema.trim()} style={{marginTop:"4px"}}>
          {thinking ? "Generando slides..." : "Generar slides ðŸŽ´"}
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
              <span className="cr-result-sep">Â·</span>
              <span className="cr-result-tipo">{estructura}</span>
            </div>
            <div className="cr-result-actions">
              <button className="cr-btn cr-btn--secondary" onClick={copiarTodo}>
                {copiado === "todo" ? "âœ“ Copiado todo" : "ðŸ“‹ Copiar todo"}
              </button>
              <button className="cr-btn cr-btn--canva" onClick={() => window.open("https://www.canva.com/create/instagram-posts/", "_blank")}>
                DiseÃ±ar en Canva â†—
              </button>
              <button className="cr-btn cr-btn--save" onClick={() => onSave("carruseles", { id:Date.now(), tema, estructura, slides, fecha:new Date().toLocaleDateString("es") })}>
                Guardar ðŸ’¾
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
                        placeholder="Escribe algo aquÃ­ o usa las ideas de abajo..."
                        rows={2}
                      />
                      <button
                        className={`cr-apoyo-trigger ${expandedApoyo === s.id ? "cr-apoyo-trigger--open" : ""}`}
                        style={{color: ss.dark ? "rgba(255,255,255,0.65)" : meta.color}}
                        onClick={() => setExpandedApoyo(expandedApoyo === s.id ? null : s.id)}>
                        ðŸ’¡ Ideas para este texto {expandedApoyo === s.id ? "â†‘" : "â†“"}
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
                      {copiado === `s${s.id}` ? "âœ“ Copiado" : "ðŸ“‹ Copiar slide"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cr-canva-guide">
            <div className="cr-canva-guide-title">ðŸŽ¨ CÃ³mo pasarlo a Canva en 5 minutos</div>
            <div className="cr-canva-steps">
              <div className="cr-canva-step">
                <span className="cr-step-num">1</span>
                <div>
                  <strong>Copia todo el texto</strong>
                  <p>Haz clic en "ðŸ“‹ Copiar todo" arriba para tener todo el contenido en tu portapapeles.</p>
                </div>
              </div>
              <div className="cr-canva-step">
                <span className="cr-step-num">2</span>
                <div>
                  <strong>Abre Canva y elige tu plantilla</strong>
                  <p>Busca "carrusel Instagram" o "presentaciÃ³n Instagram" â€” elige una que tenga entre {slides.length} y {slides.length + 2} slides.</p>
                </div>
              </div>
              <div className="cr-canva-step">
                <span className="cr-step-num">3</span>
                <div>
                  <strong>Pega el texto slide por slide</strong>
                  <p>Cada slide tiene un texto principal (tÃ­tulo) y un texto de apoyo. Reemplaza el texto de muestra de Canva con el tuyo.</p>
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
              Abrir Canva â†—
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
                <span>{c.estructura} Â· {c.slides?.length} slides Â· {c.fecha}</span>
              </div>
              <div className="cr-saved-btns">
                <button className="cr-saved-load" onClick={() => { setTema(c.tema); setEstructura(c.estructura); setSlides(c.slides); window.scrollTo({top:0,behavior:"smooth"}); }}>Cargar</button>
                <button className="cr-saved-del" onClick={() => onDelete("carruseles", c.id)}>âœ•</button>
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
          <span className="bp-intro-icon">âœ¦</span>
          <h2 className="bp-intro-title">CuÃ©ntame de tu marca</h2>
          <p className="bp-intro-sub">Studio usa esto para pre-llenar todos los generadores con tu voz, tu nicho y tu estilo.</p>
        </div>
      )}

      <div className="bp-field">
        <label className="bp-label">Â¿QuÃ© ofreces? <span className="bp-req">*</span></label>
        <textarea className="bp-textarea" rows={2} required value={form.queOfreces}
          onChange={e => upd("queOfreces", e.target.value)}
          placeholder="Ej: Coaching de maternidad consciente para mamÃ¡s emprendedoras" />
      </div>

      <div className="bp-field">
        <label className="bp-label">Â¿A quiÃ©n ayudas? (cliente ideal)</label>
        <textarea className="bp-textarea" rows={2} value={form.clienteIdeal}
          onChange={e => upd("clienteIdeal", e.target.value)}
          placeholder="Ej: MamÃ¡s de 28-40 aÃ±os que quieren crecer sin descuidar su familia" />
      </div>

      <div className="bp-field">
        <label className="bp-label">Â¿CuÃ¡l es la transformaciÃ³n que logran contigo? <span className="bp-req">*</span></label>
        <textarea className="bp-textarea" rows={2} required value={form.transformacion}
          onChange={e => upd("transformacion", e.target.value)}
          placeholder="Ej: De agotada y desbordada a organizada, rentable y presente" />
      </div>

      <div className="bp-row-2">
        <div className="bp-field">
          <label className="bp-label">Tono de comunicaciÃ³n</label>
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
          {isOnboarding ? "Guardar y empezar âœ¦" : "Guardar perfil"}
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

  const TOAST_LABELS = { mensajes: "Mensaje guardado âœ¦", ideas: "Idea guardada ðŸ’¡", leads: "Lead magnet guardado ðŸŽ", hooks: "Hook guardado ðŸª", guiones: "GuiÃ³n guardado ðŸŽ¬", captions: "Caption guardado", campanias: "CampaÃ±a guardada ðŸ“§" };
  const showToast = (tipo) => { setToast(TOAST_LABELS[tipo] || "Guardado âœ¦"); setTimeout(() => setToast(null), 2500); };
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
  };

  const tabProps = { saved: data, onSave: handleSave, onDelete: handleDelete, brandProfile, callGemini, plan, onAiUsed: setAiUsage };

  // Pantalla de bienvenida si no hay perfil y no saltÃ³
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
        {callGemini && aiUsage && (
          <span className="studio-ai-counter">
            âœ¨ {Math.max(0, aiUsage.limit - aiUsage.used)} de {aiUsage.limit} generaciones restantes
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
      ) : hasBrand ? (
        <div className="studio-brand-strip">
          <span className="sbs-star">âœ¦</span>
          <span className="sbs-info">
            <b>{brandProfile.queOfreces}</b>
            <span className="sbs-meta"> Â· Tono: {brandProfile.tono} Â· Red: {brandProfile.redPrincipal}</span>
          </span>
          <button className="sbs-edit-btn" onClick={() => setEditingBrand(true)}>Editar perfil âœï¸</button>
        </div>
      ) : (
        <div className="studio-brand-strip studio-brand-strip--empty">
          <span className="sbs-star">ðŸ’¡</span>
          <span>Completa tu <b>Perfil de Marca</b> para que Studio use tu voz en todo</span>
          <button className="sbs-edit-btn" onClick={() => setEditingBrand(true)}>Completar â†’</button>
        </div>
      )}

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
