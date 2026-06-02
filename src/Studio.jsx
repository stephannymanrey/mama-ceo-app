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
  const [mode, setMode] = useState("descubrir");
  const [desc, setDesc] = useState({ consejo: "", resultado: "", queja: "", audiencia: "", servicio: "No lo sé aún" });
  const [mision, setMision] = useState(null);
  const [mp, setMp] = useState({ cliente: "", problema: "", tiempo: "", producto: "" });
  const [mpResult, setMpResult] = useState(null);
  const [ep, setEp] = useState({ nombre: "", queHaces: "", quienAyudas: "", transformacion: "", diferente: "" });
  const [epResult, setEpResult] = useState(null);
  const [copiado, setCopiado] = useState("");

  const copiar = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiado(key);
    setTimeout(() => setCopiado(""), 2000);
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
    setMpResult(null);
    setMode("mensaje");
  };

  const crearElevatorDesdeMPM = () => {
    const nuevoEp = {
      nombre: "",
      queHaces: `Ofrezco ${mp.producto} para ${mp.cliente}`,
      quienAyudas: mp.cliente,
      transformacion: mp.problema,
      diferente: "",
    };
    setEp(nuevoEp);
    setEpResult(
      `${nuevoEp.queHaces}. Trabajo específicamente con ${nuevoEp.quienAyudas}, ayudándoles a ${nuevoEp.transformacion}. Lo que me diferencia es que combino estrategia y acompañamiento cercano para que logres resultados reales. Si eso resuena contigo, me encantaría que conversáramos.`
    );
    setMode("elevator");
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

  const generarMensaje = () => {
    const { cliente, problema, tiempo, producto } = mp;
    if (!cliente || !problema || !tiempo || !producto) return;
    setMpResult(buildMPMResult(mp));
  };

  const usarMensajeGuardado = (m) => {
    if (!m.campos) return;
    setMp({ ...m.campos });
    setMpResult(buildMPMResult(m.campos));
    setMode("mensaje");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const elevatorDesdeBanco = (m) => {
    const campos = m.campos || {};
    const nuevoEp = {
      nombre: "",
      queHaces: campos.producto ? `Ofrezco ${campos.producto} para ${campos.cliente}` : "",
      quienAyudas: campos.cliente || "",
      transformacion: campos.problema || "",
      diferente: "",
    };
    setEp(nuevoEp);
    if (nuevoEp.quienAyudas && nuevoEp.transformacion) {
      setEpResult(
        `${nuevoEp.queHaces ? nuevoEp.queHaces + ". " : ""}Trabajo específicamente con ${nuevoEp.quienAyudas}, ayudándoles a ${nuevoEp.transformacion}. Lo que me diferencia es que combino estrategia y acompañamiento cercano para que logres resultados reales. Si eso resuena contigo, me encantaría que conversáramos.`
      );
    }
    setMode("elevator");
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

  // ── ELEVATOR PITCH ────────────────────────────────────────────
  const generarElevator = () => {
    const { nombre, queHaces, quienAyudas, transformacion, diferente } = ep;
    if (!quienAyudas || !transformacion) return;
    setEpResult(`${nombre ? `Hola, soy ${nombre}. ` : ""}${queHaces ? `${queHaces}. ` : ""}Trabajo específicamente con ${quienAyudas}, ayudándoles a ${transformacion}. Lo que me diferencia es que ${diferente || "combino estrategia y acompañamiento cercano para que logres resultados reales"}. Si eso resuena contigo, me encantaría que conversáramos.`);
  };

  return (
    <div className="studio-tab-content">
      <div className="studio-mode-toggle">
        <button className={mode === "descubrir" ? "active" : ""} onClick={() => setMode("descubrir")}>🔍 Descubre tu mensaje</button>
        <button className={mode === "mensaje"   ? "active" : ""} onClick={() => setMode("mensaje")}>✦ Mensaje Perfecto</button>
        <button className={mode === "elevator"  ? "active" : ""} onClick={() => setMode("elevator")}>🎤 Elevator Pitch</button>
      </div>

      {/* ── DESCUBRIMIENTO ─────────────────────────────── */}
      {mode === "descubrir" && (
        <div className="studio-two-col">
          <div className="studio-form-card">
            <h3>Encuentra tu mensaje desde cero</h3>
            <p className="studio-helper">Responde desde lo que sabes hoy — no hay respuestas incorrectas. Esto es solo tu punto de partida.</p>

            <label>¿Con qué te piden consejo o ayuda más frecuentemente?</label>
            <input
              placeholder="Ej: organizar el tiempo, vender por WhatsApp, manejar el estrés, criar con calma..."
              value={desc.consejo} onChange={e => setDesc(p => ({...p, consejo: e.target.value}))}
            />

            <label>¿Qué resultado concreto has logrado — para alguien o para ti misma?</label>
            <input
              placeholder="Ej: ayudé a una amiga a conseguir sus primeras clientas, reorganicé mi negocio y bajé mi estrés..."
              value={desc.resultado} onChange={e => setDesc(p => ({...p, resultado: e.target.value}))}
            />

            <label>¿Cuál es la queja o dolor que más escuchas en las mujeres que te rodean?</label>
            <input
              placeholder="Ej: no tengo tiempo para nada, no sé cómo cobrar lo que valgo, siento que hago todo sola..."
              value={desc.queja} onChange={e => setDesc(p => ({...p, queja: e.target.value}))}
            />

            <label>¿A qué tipo de mujer te imaginas ayudando?</label>
            <input
              placeholder="Ej: mamás que quieren emprender, mujeres que venden desde casa, emprendedoras que están empezando..."
              value={desc.audiencia} onChange={e => setDesc(p => ({...p, audiencia: e.target.value}))}
            />

            <label>¿Tienes idea del servicio que quieres ofrecer?</label>
            <select value={desc.servicio} onChange={e => setDesc(p => ({...p, servicio: e.target.value}))}>
              {["No lo sé aún", "Mentoría / coaching 1:1", "Programa o curso", "Taller o masterclass", "Comunidad", "Consultoría", "Venta de productos"].map(s => <option key={s}>{s}</option>)}
            </select>

            <button className="studio-btn-primary" onClick={generarMision} disabled={!desc.consejo.trim() || !desc.queja.trim()}>
              Ver mi mapa de negocio ✦
            </button>
          </div>

          <div className="studio-result-card">
            {!mision ? (
              <div className="studio-empty-state">
                <span>🗺️</span>
                <p>Responde las preguntas y verás el mapa de tu negocio en borrador — honesto, editable y tuyo.</p>
              </div>
            ) : (
              <>
                <div className="studio-mapa-nota">
                  ✦ Este es tu punto de partida. No necesita ser perfecto — solo necesitas empezar.
                </div>

                <div className="studio-mapa-cards">
                  <div className="studio-mapa-card">
                    <div className="studio-mapa-card-header"><span>💎</span><strong>Tu zona de genialidad</strong></div>
                    <p>{mision.zonaGenialidad}</p>
                  </div>
                  <div className="studio-mapa-card">
                    <div className="studio-mapa-card-header"><span>👩‍💼</span><strong>Tu clienta probable</strong></div>
                    <p>{mision.clientaProb}</p>
                  </div>
                  <div className="studio-mapa-card">
                    <div className="studio-mapa-card-header"><span>🎯</span><strong>El problema que resuelves</strong></div>
                    <p>{mision.problemaTexto}</p>
                  </div>
                  <div className="studio-mapa-card studio-mapa-card--highlight">
                    <div className="studio-mapa-card-header"><span>✦</span><strong>Tu primer MPM borrador</strong></div>
                    <p className="studio-mapa-mpm">{mision.mpmBorrador}</p>
                    <button className="studio-copy-btn small" onClick={() => copiar(mision.mpmBorrador, "mpm-borrador")}>
                      {copiado === "mpm-borrador" ? "¡Copiado!" : "Copiar borrador"}
                    </button>
                  </div>
                </div>

                <div className="studio-sugerencias-box">
                  <div className="studio-sugerencias-label">Ajusta y luego genera tus 12 variaciones</div>
                  <p className="studio-helper" style={{margin: "0 0 8px"}}>Edita lo que no te convenza — esto es tuyo para moldearlo.</p>
                  <label>Ayudo a...</label>
                  <input value={mision.sugerencias.cliente} onChange={e => setMision(p => ({...p, sugerencias: {...p.sugerencias, cliente: e.target.value}}))} />
                  <label>...que quieren...</label>
                  <input value={mision.sugerencias.problema} onChange={e => setMision(p => ({...p, sugerencias: {...p.sugerencias, problema: e.target.value}}))} />
                  <label>...en...</label>
                  <input placeholder="Ej: 8 semanas, 3 meses, 30 días..." value={mision.sugerencias.tiempo} onChange={e => setMision(p => ({...p, sugerencias: {...p.sugerencias, tiempo: e.target.value}}))} />
                  <label>...con...</label>
                  <input value={mision.sugerencias.producto} onChange={e => setMision(p => ({...p, sugerencias: {...p.sugerencias, producto: e.target.value}}))} />
                </div>

                <button className="studio-btn-primary" onClick={usarEnMPM}>
                  Crear mi MPM con esto →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MENSAJE PERFECTO ────────────────────────────── */}
      {mode === "mensaje" && (
        <div className="studio-two-col">
          <div className="studio-form-card">
            <h3>Construye tu mensaje</h3>
            <p className="studio-helper">Completa los 4 campos y genera 12 variaciones listas para usar en cualquier plataforma.</p>
            <label>Ayudo a...</label>
            <input placeholder="mamás emprendedoras con hijos pequeños" value={mp.cliente} onChange={e => setMp(p => ({...p, cliente: e.target.value}))} />
            <label>...que quieren...</label>
            <input placeholder="vender más sin descuidar su familia" value={mp.problema} onChange={e => setMp(p => ({...p, problema: e.target.value}))} />
            <label>...en...</label>
            <input placeholder="8 semanas" value={mp.tiempo} onChange={e => setMp(p => ({...p, tiempo: e.target.value}))} />
            <label>...con...</label>
            <input placeholder="mi programa CEO en Casa" value={mp.producto} onChange={e => setMp(p => ({...p, producto: e.target.value}))} />
            <div className="studio-btn-row">
              <button className="studio-btn-secondary" onClick={() => setMode("descubrir")}>← Descubrimiento</button>
              <button className="studio-btn-primary" onClick={generarMensaje}>Generar ✦</button>
            </div>
          </div>
          <div className="studio-result-card">
            {!mpResult ? (
              <div className="studio-empty-state">
                <span>✦</span>
                <p>Tu mensaje aparecerá aquí con 12 variaciones listas para copiar en cualquier plataforma.</p>
              </div>
            ) : (
              <>
                <div className="studio-result-main">
                  <label>Mensaje completo</label>
                  <p className="studio-result-text">{mpResult.completo}</p>
                  <button className="studio-copy-btn" onClick={() => copiar(mpResult.completo, "completo")}>{copiado === "completo" ? "¡Copiado!" : "Copiar"}</button>
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
                <div className="studio-btn-row">
                  <button className="studio-btn-save" onClick={() => onSave("mensajes", { id: Date.now(), tipo: "Mensaje Perfecto", texto: mpResult.completo, campos: {...mp}, fecha: new Date().toLocaleDateString("es") })}>
                    Guardar en mi banco
                  </button>
                  <button className="studio-btn-secondary" onClick={crearElevatorDesdeMPM}>
                    Crear mi Elevator Pitch →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ELEVATOR PITCH ──────────────────────────────── */}
      {mode === "elevator" && (
        <div className="studio-two-col">
          <div className="studio-form-card">
            <h3>Elevator Pitch — Tu presentación de autoridad</h3>
            <p className="studio-helper">Para cuando te presentas ante inversionistas, proveedores, aliados estratégicos o personas de autoridad. Máximo 2 minutos, claro y profesional.</p>
            <label>Tu nombre (opcional)</label>
            <input placeholder="Ej: Stephanny" value={ep.nombre} onChange={e => setEp(p => ({...p, nombre: e.target.value}))} />
            <label>¿Qué haces en una frase?</label>
            <input placeholder="Soy coach de negocios para mamás" value={ep.queHaces} onChange={e => setEp(p => ({...p, queHaces: e.target.value}))} />
            <label>¿A quién ayudas específicamente?</label>
            <input placeholder="mamás emprendedoras que trabajan desde casa" value={ep.quienAyudas} onChange={e => setEp(p => ({...p, quienAyudas: e.target.value}))} />
            <label>¿Cuál es la transformación que logras?</label>
            <input placeholder="construir un negocio rentable sin sacrificar tiempo con sus hijos" value={ep.transformacion} onChange={e => setEp(p => ({...p, transformacion: e.target.value}))} />
            <label>¿Qué te hace diferente?</label>
            <input placeholder="mezclo estrategia de negocio con organización del hogar" value={ep.diferente} onChange={e => setEp(p => ({...p, diferente: e.target.value}))} />
            <button className="studio-btn-primary" onClick={generarElevator}>Generar pitch ✦</button>
          </div>
          <div className="studio-result-card">
            {!epResult ? (
              <div className="studio-empty-state">
                <span>🎤</span>
                <p>Tu pitch de 30 segundos aparecerá aquí, listo para memorizarlo o adaptarlo.</p>
              </div>
            ) : (
              <>
                <div className="studio-result-main">
                  <label>Tu Elevator Pitch</label>
                  <p className="studio-result-text">{epResult}</p>
                  <button className="studio-copy-btn" onClick={() => copiar(epResult, "ep")}>{copiado === "ep" ? "¡Copiado!" : "Copiar"}</button>
                </div>
                <button className="studio-btn-save" onClick={() => onSave("mensajes", { id: Date.now(), tipo: "Elevator Pitch", texto: epResult, fecha: new Date().toLocaleDateString("es") })}>
                  Guardar en mi banco
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
                <button className="studio-bank-action-copy" onClick={() => copiar(m.texto, `bank-${m.id}`)}>
                  {copiado === `bank-${m.id}` ? "¡Copiado!" : "Copiar"}
                </button>
                {m.campos && (
                  <>
                    <button className="studio-bank-action-mpm" onClick={() => usarMensajeGuardado(m)}>
                      Recrear mis 12 variaciones ✦
                    </button>
                    <button className="studio-bank-action-ep" onClick={() => elevatorDesdeBanco(m)}>
                      Generar Elevator Pitch →
                    </button>
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
function IdeasTab({ saved, onSave, onDelete }) {
  const [form, setForm] = useState({ titulo: "", tipo: "Hook", plataforma: "Instagram", notas: "" });
  const ideas = saved?.ideas || [];
  const TIPOS = ["Hook", "Educativo", "Venta", "Storytelling", "Tendencia", "Entretenimiento"];
  const PLATAFORMAS = ["Instagram", "TikTok", "YouTube", "WhatsApp", "Facebook", "Podcast"];
  const TIPO_COLORS = { "Hook": "#C4526A", "Educativo": "#4A90D9", "Venta": "#27AE60", "Storytelling": "#8B6565", "Tendencia": "#E8755A", "Entretenimiento": "#9B59B6" };

  const agregar = () => {
    if (!form.titulo.trim()) return;
    onSave("ideas", { id: Date.now(), ...form, titulo: form.titulo.trim(), fecha: new Date().toLocaleDateString("es") });
    setForm({ titulo: "", tipo: "Hook", plataforma: "Instagram", notas: "" });
  };

  return (
    <div className="studio-tab-content">
      <div className="studio-two-col">
        <div className="studio-form-card">
          <h3>Nueva idea</h3>
          <p className="studio-helper">Captura la idea antes de que se vaya. Los detalles vienen después.</p>
          <label>La idea</label>
          <input placeholder="Ej: Por qué las mamás necesitan un sistema, no más disciplina" value={form.titulo} onChange={e => setForm(p => ({...p, titulo: e.target.value}))}
            onKeyDown={e => e.key === "Enter" && agregar()} />
          <label>Tipo</label>
          <select value={form.tipo} onChange={e => setForm(p => ({...p, tipo: e.target.value}))}>
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
          <label>Plataforma</label>
          <select value={form.plataforma} onChange={e => setForm(p => ({...p, plataforma: e.target.value}))}>
            {PLATAFORMAS.map(p => <option key={p}>{p}</option>)}
          </select>
          <label>Notas (opcional)</label>
          <textarea placeholder="Ángulo, referencia, qué quieres comunicar..." value={form.notas} onChange={e => setForm(p => ({...p, notas: e.target.value}))} rows={3} />
          <button className="studio-btn-primary" onClick={agregar}>Guardar idea 💡</button>
        </div>
        <div className="studio-result-card">
          {ideas.length === 0 ? (
            <div className="studio-empty-state">
              <span>💡</span>
              <p>Aquí viven tus ideas. Agrégalas rápido y desarróllalas cuando tengas tiempo.</p>
            </div>
          ) : (
            <div className="studio-ideas-list">
              <h3>Banco de ideas ({ideas.length})</h3>
              {ideas.slice().reverse().map(idea => (
                <div className="studio-idea-item" key={idea.id}>
                  <div className="studio-idea-header">
                    <span className="studio-tipo-badge" style={{background: TIPO_COLORS[idea.tipo] || "#8B6565"}}>{idea.tipo}</span>
                    <span className="studio-plat-badge">{idea.plataforma}</span>
                    <small>{idea.fecha}</small>
                    <button className="studio-delete-btn" onClick={() => onDelete("ideas", idea.id)}>✕</button>
                  </div>
                  <p className="studio-idea-titulo">{idea.titulo}</p>
                  {idea.notas && <p className="studio-idea-notas">{idea.notas}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── LEAD MAGNET ────────────────────────────────────────────────
function LeadMagnetTab({ saved, onSave, onDelete }) {
  const [form, setForm] = useState({ titulo: "", promesa: "", audiencia: "", formato: "PDF / Guía", secciones: [""], cta: "", estado: "Idea" });
  const [resultado, setResultado] = useState(null);
  const items = saved?.leads || [];
  const FORMATOS = ["PDF / Guía", "Checklist", "Mini-curso (3-5 días)", "Reto", "Webinar / Masterclass", "Plantilla", "Quiz / Test", "Audio / Podcast"];
  const ESTADOS = ["Idea", "En creación", "Listo", "Publicado"];

  const updateSeccion = (i, val) => { const a = [...form.secciones]; a[i] = val; setForm(p => ({...p, secciones: a})); };

  const generar = () => {
    if (!form.titulo || !form.promesa) return;
    setResultado({
      titulos: [
        `El ${form.formato.split("/")[0].trim()} Gratuito: "${form.titulo}"`,
        `Descarga Gratis: ${form.titulo}`,
        `[GRATIS] ${form.titulo} para ${form.audiencia || "emprendedoras"}`,
        `Guía Rápida: ${form.titulo}`,
      ],
      descripcion: `¿Eres ${form.audiencia || "mamá emprendedora"}? Este ${form.formato.toLowerCase()} gratuito es para ti. ${form.promesa}. Sin costo, sin trampa — solo valor puro que puedes aplicar hoy.`,
    });
  };

  const guardar = () => {
    if (!form.titulo) return;
    onSave("leads", { id: Date.now(), ...form, fecha: new Date().toLocaleDateString("es") });
    setForm({ titulo: "", promesa: "", audiencia: "", formato: "PDF / Guía", secciones: [""], cta: "", estado: "Idea" });
    setResultado(null);
  };

  return (
    <div className="studio-tab-content">
      <div className="studio-two-col">
        <div className="studio-form-card">
          <h3>Planifica tu Lead Magnet</h3>
          <p className="studio-helper">Define la promesa antes del contenido. La promesa lo vende, el contenido lo cumple.</p>
          <label>Título</label>
          <input placeholder="Las 5 claves para vender sin sentirte pesada" value={form.titulo} onChange={e => setForm(p => ({...p, titulo: e.target.value}))} />
          <label>Promesa principal</label>
          <input placeholder="Aprenderás a vender de forma natural sin presionar" value={form.promesa} onChange={e => setForm(p => ({...p, promesa: e.target.value}))} />
          <label>¿Para quién es?</label>
          <input placeholder="Mamás que venden desde casa y odian el rechazo" value={form.audiencia} onChange={e => setForm(p => ({...p, audiencia: e.target.value}))} />
          <label>Formato</label>
          <select value={form.formato} onChange={e => setForm(p => ({...p, formato: e.target.value}))}>
            {FORMATOS.map(f => <option key={f}>{f}</option>)}
          </select>
          <label>Secciones / Módulos</label>
          {form.secciones.map((s, i) => (
            <div key={i} className="studio-seccion-row">
              <input placeholder={`Sección ${i + 1}`} value={s} onChange={e => updateSeccion(i, e.target.value)} />
              {form.secciones.length > 1 && <button className="studio-delete-btn" onClick={() => setForm(p => ({...p, secciones: p.secciones.filter((_, idx) => idx !== i)}))}>✕</button>}
            </div>
          ))}
          <button className="studio-add-btn" onClick={() => setForm(p => ({...p, secciones: [...p.secciones, ""]}))}>+ Agregar sección</button>
          <label>CTA — ¿qué sigue después?</label>
          <input placeholder="Agenda una llamada gratuita / Conoce mi programa" value={form.cta} onChange={e => setForm(p => ({...p, cta: e.target.value}))} />
          <label>Estado</label>
          <select value={form.estado} onChange={e => setForm(p => ({...p, estado: e.target.value}))}>
            {ESTADOS.map(e => <option key={e}>{e}</option>)}
          </select>
          <div className="studio-btn-row">
            <button className="studio-btn-secondary" onClick={generar}>Generar copy ✦</button>
            <button className="studio-btn-primary" onClick={guardar}>Guardar 🎁</button>
          </div>
        </div>
        <div className="studio-result-card">
          {!resultado && items.length === 0 ? (
            <div className="studio-empty-state">
              <span>🎁</span>
              <p>Define tu lead magnet y genera el copy de promoción listo para publicar.</p>
            </div>
          ) : (
            <>
              {resultado && (
                <div className="studio-result-main">
                  <h4>Títulos para promocionar</h4>
                  {resultado.titulos.map((t, i) => (
                    <div className="studio-variation-item" key={i}>
                      <p>{t}</p>
                      <button className="studio-copy-btn small" onClick={() => navigator.clipboard.writeText(t)}>Copiar</button>
                    </div>
                  ))}
                  <h4 style={{marginTop:"16px"}}>Descripción para publicar</h4>
                  <p className="studio-result-text">{resultado.descripcion}</p>
                  <button className="studio-copy-btn" onClick={() => navigator.clipboard.writeText(resultado.descripcion)}>Copiar descripción</button>
                </div>
              )}
              {items.length > 0 && (
                <div className={resultado ? "studio-bank" : ""} style={{marginTop: resultado ? "24px" : 0}}>
                  <h4>Mis Lead Magnets ({items.length})</h4>
                  {items.map(item => (
                    <div className="studio-bank-item" key={item.id}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                        <div>
                          <strong>{item.titulo}</strong>
                          <span className="studio-estado-badge">{item.estado}</span>
                        </div>
                        <button className="studio-delete-btn" onClick={() => onDelete("leads", item.id)}>✕</button>
                      </div>
                      <small style={{color:"var(--muted)"}}>{item.formato} · {item.fecha}</small>
                      {item.promesa && <p style={{marginTop:"6px",fontSize:"13px"}}>{item.promesa}</p>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── HOOKS ──────────────────────────────────────────────────────
function HooksTab({ saved, onSave }) {
  const [tema, setTema] = useState("");
  const [nicho, setNicho] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState("");

  const CATEGORIAS = ["Curiosidad", "Dolor", "Promesa", "Pregunta", "Historia", "Número", "Contraintuitivo"];
  const CAT_COLORS = { "Curiosidad": "#4A90D9", "Dolor": "#C4526A", "Promesa": "#27AE60", "Pregunta": "#E8755A", "Historia": "#8B6565", "Número": "#9B59B6", "Contraintuitivo": "#E67E22" };

  const FORMULAS = [
    { cat: "Curiosidad",      f: (t, n) => `Lo que nadie te dice sobre ${t} cuando eres ${n || "mamá emprendedora"}` },
    { cat: "Curiosidad",      f: (t, n) => `El secreto de ${t} que las ${n || "emprendedoras exitosas"} no publican` },
    { cat: "Dolor",           f: (t, n) => `¿Cansada de intentar ${t} sin ver resultados?` },
    { cat: "Dolor",           f: (t, n) => `Si ${t} te está costando tiempo, dinero o paz mental, esto es para ti` },
    { cat: "Promesa",         f: (t, n) => `Cómo lograr ${t} en menos de 30 días (sin complicarte la vida)` },
    { cat: "Promesa",         f: (t, n) => `El método más simple para ${t} que está funcionando ahora mismo` },
    { cat: "Pregunta",        f: (t, n) => `¿Sabías que el 80% de las ${n || "mamás emprendedoras"} comete este error con ${t}?` },
    { cat: "Pregunta",        f: (t, n) => `¿Y si ${t} fuera más fácil de lo que crees?` },
    { cat: "Historia",        f: (t, n) => `Hace 1 año yo tampoco creía que podía ${t}. Hoy te cuento cómo cambió todo.` },
    { cat: "Historia",        f: (t, n) => `Una clienta me escribió llorando porque por fin logró ${t}. Esto fue lo que hicimos.` },
    { cat: "Número",          f: (t, n) => `3 errores que te impiden ${t} (y cómo evitarlos desde hoy)` },
    { cat: "Número",          f: (t, n) => `5 señales de que ya estás lista para ${t}` },
    { cat: "Contraintuitivo", f: (t, n) => `Por qué hacer más no te va a ayudar a ${t}` },
    { cat: "Contraintuitivo", f: (t, n) => `Deja de intentar ${t} de esta forma. Hay un camino más corto.` },
  ];

  const generar = () => {
    if (!tema.trim()) return;
    const lista = categoria === "Todas" ? FORMULAS : FORMULAS.filter(f => f.cat === categoria);
    setResultado(lista.map(f => ({ cat: f.cat, hook: f.f(tema.trim(), nicho.trim()) })));
  };

  const copiar = (text, key) => { navigator.clipboard.writeText(text); setCopiado(key); setTimeout(() => setCopiado(""), 2000); };

  return (
    <div className="studio-tab-content">
      <div className="studio-two-col">
        <div className="studio-form-card">
          <h3>Generador de Hooks</h3>
          <p className="studio-helper">Escribe el tema y genera hooks probados para detener el scroll.</p>
          <label>¿Sobre qué es el contenido?</label>
          <input placeholder="organizar las ventas, vender sin presionar, criar y emprender" value={tema} onChange={e => setTema(e.target.value)} />
          <label>¿A quién le hablas? (opcional)</label>
          <input placeholder="mamás emprendedoras, coaches, vendedoras de catálogo" value={nicho} onChange={e => setNicho(e.target.value)} />
          <label>Categoría</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value)}>
            <option>Todas</option>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
          <button className="studio-btn-primary" onClick={generar}>Generar hooks 🪝</button>
        </div>
        <div className="studio-result-card">
          {!resultado ? (
            <div className="studio-empty-state">
              <span>🪝</span>
              <p>Genera hasta 14 hooks basados en fórmulas de marketing probadas.</p>
            </div>
          ) : (
            <div className="studio-hooks-list">
              <h4>{resultado.length} hooks generados</h4>
              {resultado.map((item, i) => (
                <div className="studio-hook-item" key={i}>
                  <span className="studio-tipo-badge" style={{background: CAT_COLORS[item.cat] || "#8B6565"}}>{item.cat}</span>
                  <p>{item.hook}</p>
                  <div className="studio-hook-actions">
                    <button className="studio-copy-btn small" onClick={() => copiar(item.hook, i)}>{copiado === i ? "¡Copiado!" : "Copiar"}</button>
                    <button className="studio-save-small" onClick={() => onSave("hooks", { id: Date.now(), hook: item.hook, cat: item.cat, tema, fecha: new Date().toLocaleDateString("es") })}>Guardar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {saved?.hooks?.length > 0 && (
        <div className="studio-bank">
          <h4>Hooks guardados ({saved.hooks.length})</h4>
          {saved.hooks.slice().reverse().map(h => (
            <div className="studio-hook-item" key={h.id}>
              <span className="studio-tipo-badge" style={{background: CAT_COLORS[h.cat] || "#8B6565"}}>{h.cat}</span>
              <p>{h.hook}</p>
              <button className="studio-copy-btn small" onClick={() => navigator.clipboard.writeText(h.hook)}>Copiar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── GUIÓN ──────────────────────────────────────────────────────
function GuionTab({ saved, onSave }) {
  const [subTab, setSubTab] = useState("guion");
  const [g, setG] = useState({ tipo: "Reel", tema: "", objetivo: "Vender", duracion: "30s" });
  const [guion, setGuion] = useState(null);
  const [c, setC] = useState({ red: "Instagram", tono: "Cercano", tema: "", cta: "", hashtags: true });
  const [caption, setCaption] = useState(null);
  const [copiado, setCopiado] = useState("");

  const copiar = (text, key) => { navigator.clipboard.writeText(text); setCopiado(key); setTimeout(() => setCopiado(""), 2000); };

  const generarGuion = () => {
    if (!g.tema) return;
    const hooks = { "Vender": `¿Sabías que ${g.tema} puede cambiar completamente tus resultados?`, "Educar": `Hoy te voy a enseñar algo sobre ${g.tema} que ojalá alguien me hubiera dicho antes.`, "Conectar": `Tengo que contarte algo que me pasó con ${g.tema}...`, "Entretener": `Lo que voy a hacer hoy con ${g.tema} nadie lo esperaba 😂` };
    const isShort = ["15s", "30s"].includes(g.duracion);

    const estructura = g.tipo === "Historia (3 partes)"
      ? [
          { parte: "Historia 1 — El gancho",       tiempo: "0-5s",   texto: `"¿${g.tema}? A ver, espérate..." [Apareces en cámara mostrando sorpresa o curiosidad]` },
          { parte: "Historia 2 — El desarrollo",    tiempo: "5-15s",  texto: `"El tema es que [explica el punto principal sobre ${g.tema}]. Esto aplica para ti si [condición de tu audiencia]."` },
          { parte: "Historia 3 — Cierre + CTA",     tiempo: "última", texto: `"Si quieres saber más sobre ${g.tema}, mándame un DM con la palabra [CLAVE] y te comparto más. 👇"` },
        ]
      : [
          { parte: "🎯 Hook",         tiempo: "0-3s",                        texto: hooks[g.objetivo] },
          { parte: "📖 Contexto",     tiempo: isShort ? "3-10s" : "3-15s",   texto: `"[Tu experiencia o la de una clienta con ${g.tema}. Haz que se identifiquen]"` },
          { parte: "💡 El valor",     tiempo: isShort ? "10-25s" : "15-50s", texto: `"Lo que aprendí / lo que funciona sobre ${g.tema}: [punto 1], [punto 2], [punto 3]"` },
          { parte: "🚀 CTA",          tiempo: "últimos 5s",                  texto: `"Si esto te resonó, [acción: guarda este video / escríbeme / link en bio / comenta con una palabra]"` },
        ];
    setGuion({ estructura, tipo: g.tipo, tema: g.tema, duracion: g.duracion, objetivo: g.objetivo });
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
        <button className={subTab === "guion" ? "active" : ""} onClick={() => setSubTab("guion")}>Guión</button>
        <button className={subTab === "caption" ? "active" : ""} onClick={() => setSubTab("caption")}>Caption</button>
      </div>

      {subTab === "guion" && (
        <div className="studio-two-col">
          <div className="studio-form-card">
            <h3>Estructura de Guión</h3>
            <p className="studio-helper">Define el tipo y el tema — te damos la estructura completa para grabar sin improvisar.</p>
            <label>Tipo de contenido</label>
            <select value={g.tipo} onChange={e => setG(p => ({...p, tipo: e.target.value}))}>
              {["Reel", "TikTok", "Historia (3 partes)", "YouTube Short", "Video largo"].map(t => <option key={t}>{t}</option>)}
            </select>
            <label>Tema del video</label>
            <input placeholder="cómo organizar tus ventas en WhatsApp" value={g.tema} onChange={e => setG(p => ({...p, tema: e.target.value}))} />
            <label>Objetivo</label>
            <select value={g.objetivo} onChange={e => setG(p => ({...p, objetivo: e.target.value}))}>
              {["Vender", "Educar", "Conectar", "Entretener"].map(o => <option key={o}>{o}</option>)}
            </select>
            <label>Duración</label>
            <select value={g.duracion} onChange={e => setG(p => ({...p, duracion: e.target.value}))}>
              {["15s", "30s", "60s", "90s", "3-5 min"].map(d => <option key={d}>{d}</option>)}
            </select>
            <button className="studio-btn-primary" onClick={generarGuion}>Generar guión 🎬</button>
          </div>
          <div className="studio-result-card">
            {!guion ? (
              <div className="studio-empty-state"><span>🎬</span><p>Tu guión estructurado aparecerá aquí con tiempos y texto guía para cada parte.</p></div>
            ) : (
              <>
                <div className="studio-result-header"><strong>{guion.tipo}</strong> · <span>{guion.duracion}</span> · <em>"{guion.tema}"</em></div>
                {guion.estructura.map((p, i) => (
                  <div className="studio-guion-parte" key={i}>
                    <div className="studio-guion-label">
                      <strong>{p.parte}</strong>
                      <span className="studio-guion-tiempo">{p.tiempo}</span>
                    </div>
                    <p>{p.texto}</p>
                  </div>
                ))}
                <button className="studio-copy-btn" onClick={() => copiar(guion.estructura.map(p => `${p.parte} (${p.tiempo})\n${p.texto}`).join("\n\n"), "guion")}>{copiado === "guion" ? "¡Copiado!" : "Copiar guión completo"}</button>
                <button className="studio-btn-save" style={{marginTop:"8px"}} onClick={() => onSave("guiones", { id: Date.now(), ...guion, fecha: new Date().toLocaleDateString("es") })}>Guardar guión</button>
              </>
            )}
          </div>
        </div>
      )}

      {subTab === "caption" && (
        <div className="studio-two-col">
          <div className="studio-form-card">
            <h3>Caption para Redes</h3>
            <p className="studio-helper">Genera la estructura de tu descripción lista para completar y publicar.</p>
            <label>Red social</label>
            <select value={c.red} onChange={e => setC(p => ({...p, red: e.target.value}))}>
              {["Instagram", "TikTok", "YouTube", "Facebook"].map(r => <option key={r}>{r}</option>)}
            </select>
            <label>Tono</label>
            <select value={c.tono} onChange={e => setC(p => ({...p, tono: e.target.value}))}>
              {["Cercano", "Profesional", "Emotivo", "Directo", "Divertido"].map(t => <option key={t}>{t}</option>)}
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

      {saved?.guiones?.length > 0 && subTab === "guion" && (
        <div className="studio-bank">
          <h4>Guiones guardados ({saved.guiones.length})</h4>
          {saved.guiones.slice().reverse().map(g => (
            <div className="studio-bank-item" key={g.id}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div><strong>{g.tema}</strong><span className="studio-plat-badge" style={{marginLeft:"8px"}}>{g.tipo}</span></div>
                <small style={{color:"var(--muted)"}}>{g.fecha}</small>
              </div>
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

  useEffect(() => { saveStudio(data); }, [data]);

  const handleSave = (tipo, item) => setData(prev => ({ ...prev, [tipo]: [...(prev[tipo] || []), item] }));
  const handleDelete = (tipo, id) => setData(prev => ({ ...prev, [tipo]: (prev[tipo] || []).filter(i => i.id !== id) }));
  const tabProps = { saved: data, onSave: handleSave, onDelete: handleDelete };

  return (
    <div className="studio-shell">
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
        {activeTab === "ideas"    && <IdeasTab      {...tabProps} />}
        {activeTab === "lead"     && <LeadMagnetTab {...tabProps} />}
        {activeTab === "hooks"    && <HooksTab      {...tabProps} />}
        {activeTab === "guion"    && <GuionTab      {...tabProps} />}
        {activeTab === "email"    && <EmailTab      {...tabProps} />}
      </main>
    </div>
  );
}
