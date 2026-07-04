import React, { useState, useRef } from "react";
import Logo from "./Logo";
import "./PlanBuilder.css";

const API_URL = "https://lq3avrfazlfuyaakkt5iwz54ym0aqxvv.lambda-url.us-east-1.on.aws/";

const PREGUNTAS = [
  { id: "historia",    pregunta: "¿Cuál es tu historia?",                    sub: "¿Qué te llevó a querer emprender? ¿Qué momento de tu vida te hizo decir 'necesito cambiar algo'?",                         placeholder: "Cuéntame desde el corazón, no tiene que ser perfecto..." },
  { id: "habilidades", pregunta: "¿Qué sabes hacer?",                        sub: "Piensa en todo lo que has aprendido en tu vida, trabajo, estudios o como mamá. No te limites.",                             placeholder: "Ej: sé cocinar, enseñar, organizar, diseñar, comunicarme bien con la gente..." },
  { id: "pasion",      pregunta: "¿Qué te gusta hacer?",                     sub: "¿De qué podrías hablar horas? ¿Qué actividades te hacen olvidar el tiempo?",                                               placeholder: "Ej: me encanta enseñar a otras mujeres, el bienestar, la cocina saludable..." },
  { id: "problemas",   pregunta: "¿Qué problemas puedes resolver?",          sub: "¿A quién ayudas? ¿Qué dolor o necesidad sabes atender con lo que sabes y te gusta?",                                       placeholder: "Ej: ayudo a mamás a organizarse, a aprender a vender online, a cocinar sano sin tiempo..." },
  { id: "experiencia", pregunta: "¿Qué experiencia tienes?",                 sub: "Trabajo anterior, estudios, cursos, proyectos, crianza — todo cuenta.",                                                     placeholder: "Ej: 5 años en administración, cursos de marketing digital, 3 años como emprendedora..." },
  { id: "tiempo",      pregunta: "¿Cuánto tiempo puedes dedicar a tu negocio?", sub: "Sé honesta — un negocio construido sobre tu realidad funciona mejor.",                                                   placeholder: "Ej: 2 horas diarias en la mañana mientras los niños están en el colegio..." },
  { id: "ingresos",    pregunta: "¿Cuánto necesitas generar?",               sub: "¿Cuál es tu meta de ingresos mensuales? ¿Para qué necesitas ese dinero?",                                                   placeholder: "Ej: necesito $1.500 USD mensuales para cubrir mis gastos y empezar a ahorrar..." },
  { id: "estiloVida",  pregunta: "¿Qué estilo de vida quieres construir?",   sub: "Imagina tu vida ideal en 3 años. ¿Cómo se ve? ¿Cómo te sientes?",                                                          placeholder: "Ej: quiero trabajar desde casa, estar presente con mis hijos, viajar en familia..." },
];

const SECCIONES_PLAN = [
  { key: "resumenEjecutivo",        num: "01", titulo: "Resumen Ejecutivo" },
  { key: "problema",                num: "02", titulo: "El Problema" },
  { key: "solucion",                num: "03", titulo: "La Solución" },
  { key: "mercado",                 num: "04", titulo: "Mercado Objetivo" },
  { key: "modeloNegocio",           num: "05", titulo: "Modelo de Negocio" },
  { key: "ventajaCompetitiva",      num: "06", titulo: "Ventaja Competitiva" },
  { key: "estrategiaCrecimiento",   num: "07", titulo: "Estrategia de Crecimiento" },
  { key: "impacto",                 num: "08", titulo: "Impacto Social" },
  { key: "proyeccionesFinancieras", num: "09", titulo: "Proyecciones Financieras" },
  { key: "usoRecursos",             num: "10", titulo: "Uso de Recursos" },
];

// ── Datos de preview ──────────────────────────────────────────────────────

const MOCK_PLAN = {
  nombreNegocio: "Mamá Digital Pro",
  resumenEjecutivo: "Ofrecemos una plataforma de formación y mentoría digital diseñada para mamás emprendedoras de Latinoamérica que desean construir negocios rentables sin sacrificar su tiempo familiar. Nuestro modelo combina membresía mensual con cursos especializados y consultoría 1:1, generando ingresos predecibles desde el primer mes. Nos dirigimos a mamás de 28 a 42 años con habilidades digitales básicas, comprometidas con el crecimiento personal y profesional. Contamos con una metodología validada que integra estrategia de contenido, ventas éticas y gestión del tiempo para madres. Proyectamos alcanzar 150 clientas activas en el primer año con ingresos mensuales superiores a $6,000 USD.",
  problema: "El mercado latinoamericano carece de formación empresarial adaptada a la realidad de las madres. Las mamás emprendedoras enfrentan una triple barrera: tiempo fragmentado por las responsabilidades del hogar, falta de comunidad de apoyo y escasez de programas que combinen estrategia de negocio con gestión emocional. Las soluciones existentes son genéricas, no reconocen la especificidad del contexto materno y generan culpa en lugar de confianza.",
  solucion: {
    descripcion: "Desarrollamos un ecosistema educativo integral que combina formación en estrategia de negocios, marketing digital y mindset emprendedor, diseñado específicamente para las condiciones de tiempo y contexto de las madres latinoamericanas. Nuestra metodología 'Negocio con Propósito' estructura el aprendizaje en bloques de 20 minutos integrables en la rutina diaria.",
    productos: ["Membresía Mamá CEO — acceso mensual a biblioteca de cursos y sesiones grupales", "Curso intensivo Lanza tu Negocio — 6 semanas, modelo de ingresos y primeras clientas", "Mentoría 1:1 — 4 sesiones individuales de estrategia personalizada", "Reto Gratuito de 5 días — captación y entrada al embudo de conversión"],
    areas: ["Marketing digital", "Estrategia de negocios", "Mentoría y acompañamiento", "Comunidad y red de apoyo"],
  },
  mercado: {
    descripcion: "El mercado de formación online en Latinoamérica supera los $3,200 millones USD anuales con crecimiento proyectado del 18% anual. Nuestro segmento específico — mujeres entre 28 y 45 años con hijos menores de 12 años y conexión digital — representa aproximadamente 47 millones de personas en México, Colombia, Venezuela y Perú.",
    mercadoObjetivo: "Mamás latinoamericanas de 28 a 42 años, con hijos en edad escolar, nivel educativo medio-superior, usuarias activas de Instagram y WhatsApp, con motivación para generar ingresos propios desde casa.",
    clienteIdeal: ["Madre de 30-40 años con 1-3 hijos en edad escolar", "Tiene una habilidad o experiencia que no sabe cómo monetizar", "Invierte 1-3 horas diarias en formación cuando los niños duermen", "Usa activamente redes sociales y herramientas digitales básicas", "Busca independencia económica sin sacrificar la presencia en el hogar"],
  },
  modeloNegocio: {
    descripcion: "Operamos bajo un modelo de ingresos recurrentes sustentado en membresía mensual combinada con productos de alto valor. El 70% de los ingresos proviene de la membresía, garantizando flujo de caja predecible. El 30% restante corresponde a ventas de cursos y mentorías activadas mediante el embudo de contenido gratuito.",
    lineasIngreso: [
      { nombre: "Membresía Mamá CEO", precio: "$27/mes", clientes: "80-100", total: "$2,160-2,700/mes" },
      { nombre: "Curso Lanza tu Negocio", precio: "$197 único pago", clientes: "10-15/mes", total: "$1,970-2,955/mes" },
      { nombre: "Mentoría 1:1 (4 sesiones)", precio: "$350 paquete", clientes: "3-5/mes", total: "$1,050-1,750/mes" },
      { nombre: "Reto pago Premium", precio: "$47 evento", clientes: "20-30/evento", total: "$940-1,410/evento" },
    ],
    estructura: "Operamos 100% en línea desde plataformas digitales. La fundadora lidera la mentoría y la creación de contenido. Contamos con una asistente virtual para soporte y administración. Las clases grupales se realizan vía Zoom con grabación disponible.",
  },
  ventajaCompetitiva: "Nos diferenciamos por nuestra especialización exclusiva en el contexto materno: horarios partidos, metodología de bloques de 20 minutos y comunidad donde la maternidad es una ventaja, no un obstáculo. Combinamos estrategia de negocios real con acompañamiento emocional, algo que las plataformas genéricas no ofrecen. Nuestra tasa de retención supera el 78% gracias a resultados concretos en los primeros 60 días.",
  estrategiaCrecimiento: {
    embudo: [
      { paso: "Atracción orgánica", desc: "Contenido en Instagram y TikTok diario" },
      { paso: "Reto gratuito", desc: "5 días de valor intensivo para captar leads" },
      { paso: "Webinar de cierre", desc: "Oferta de membresía al terminar el reto" },
      { paso: "Upsell y retención", desc: "Cursos y mentoría para miembros activos" },
    ],
    fases: [
      "Fase 1 (meses 1-4): Validar membresía con 30 miembros activos, publicar contenido diario, realizar 2 retos gratuitos",
      "Fase 2 (meses 5-8): Escalar a 80 miembros, lanzar primer curso intensivo, incorporar asistente virtual",
      "Fase 3 (meses 9-12): Alcanzar 150 miembros, abrir mentoría grupal avanzada, iniciar programa de afiliados",
    ],
  },
  impacto: {
    economico: "Nuestras clientas logran sus primeros ingresos digitales en promedio dentro de los primeros 60 días. Generamos un impacto económico directo en familias latinoamericanas al diversificar sus fuentes de ingreso. El 65% de nuestras egresadas supera el ingreso mínimo de su país en menos de 6 meses.",
    familiar: "Facilitamos un modelo de trabajo que respeta los tiempos de la maternidad activa. Nuestras clientas construyen negocios desde casa con horarios adaptados al ciclo familiar, reduciendo la culpa asociada al emprendimiento materno y demostrando que presencia en el hogar y crecimiento profesional no son excluyentes.",
    educativo: "Entregamos formación práctica y aplicable en estrategia digital, marketing, ventas y finanzas personales. Nuestros programas están diseñados para que cada clienta termine con herramientas concretas, no solo conocimiento teórico, usando metodologías de aprendizaje activo adaptadas a adultas con tiempo limitado.",
    emocional: "Generamos un espacio de pertenencia donde las mamás emprendedoras dejan de sentirse solas en su proceso. La comunidad activa, el acompañamiento semanal y los logros compartidos fortalecen la confianza y la identidad profesional de cada mujer que trabaja con nosotros.",
  },
  proyeccionesFinancieras: {
    año1: { clientes: "30-150", ingresos: "$52,000 USD", costos: "$9,800 USD", utilidad: "$42,200 USD" },
    año2: { clientes: "150-400", ingresos: "$128,000 USD", costos: "$24,000 USD", utilidad: "$104,000 USD" },
    año3: { clientes: "400-800", ingresos: "$290,000 USD", costos: "$58,000 USD", utilidad: "$232,000 USD" },
    vision5anos: "Proyectamos consolidar una red de 2,000+ mamás empresarias activas en 8 países hispanohablantes, con ingresos superiores a $1.2M USD anuales y un equipo de 12 personas.",
  },
  usoRecursos: {
    descripcion: "La financiación solicitada se destinará a fortalecer nuestra infraestructura digital, ampliar el equipo de producción de contenido y ejecutar campañas de crecimiento acelerado. Estos recursos nos permitirán reducir el tiempo de adquisición de clientas en un 40% y escalar de 30 a 300 miembros en 12 meses.",
    categorias: [
      { categoria: "Tecnología y plataformas", descripcion: "LMS, CRM, herramientas", porcentaje: "30%", monto: "$6,000" },
      { categoria: "Marketing digital",        descripcion: "Meta Ads, contenido",    porcentaje: "35%", monto: "$7,000" },
      { categoria: "Equipo",                   descripcion: "Asistente virtual, diseñadora", porcentaje: "20%", monto: "$4,000" },
      { categoria: "Producción de contenido",  descripcion: "Equipos y edición",      porcentaje: "10%", monto: "$2,000" },
      { categoria: "Operaciones y legal",      descripcion: "Contador, trámites",     porcentaje: "5%",  monto: "$1,000" },
    ],
  },
};

// ── Renderers de secciones (display + inline edit) ─────────────────────────

function EditCell({ value, onChange, placeholder = "", style = {} }) {
  return (
    <input
      className="pb-edit-cell"
      value={value || ""}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={style}
    />
  );
}

function RenderLineasIngreso({ items, isEditing, onChange }) {
  if (!items?.length && !isEditing) return null;
  const rows = !items?.length ? [] : (typeof items[0] === "string"
    ? items.map(s => ({ nombre: s, precio: "", clientes: "", total: "" }))
    : items);

  const update = (i, field, val) => onChange(rows.map((r, j) => j === i ? { ...r, [field]: val } : r));

  return (
    <div className="pb-table-wrap">
      <table className={`pb-table${isEditing ? " pb-table--editing" : ""}`}>
        <thead>
          <tr>
            <th>Producto / Servicio</th>
            <th>Precio</th>
            <th>Clientes proyectados</th>
            <th>Total mensual</th>
            {isEditing && <th style={{ width: 28 }} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((item, i) => (
            <tr key={i}>
              {isEditing ? (
                <>
                  <td><EditCell value={item.nombre}   onChange={v => update(i, "nombre",   v)} placeholder="Nombre del producto" /></td>
                  <td><EditCell value={item.precio}   onChange={v => update(i, "precio",   v)} placeholder="$15/mes" /></td>
                  <td><EditCell value={item.clientes} onChange={v => update(i, "clientes", v)} placeholder="40-60" /></td>
                  <td><EditCell value={item.total}    onChange={v => update(i, "total",    v)} placeholder="$800/mes" /></td>
                  <td><button className="pb-row-del" onClick={() => onChange(rows.filter((_, j) => j !== i))}>✕</button></td>
                </>
              ) : (
                <>
                  <td><strong>{item.nombre}</strong></td>
                  <td>{item.precio}</td>
                  <td>{item.clientes}</td>
                  <td className="pb-table-total">{item.total}</td>
                </>
              )}
            </tr>
          ))}
          {isEditing && (
            <tr className="pb-row-add-row">
              <td colSpan={5}>
                <button className="pb-row-add" onClick={() => onChange([...rows, { nombre: "", precio: "", clientes: "", total: "" }])}>
                  + Agregar línea de ingreso
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RenderFunnel({ steps, isEditing, onChange }) {
  if (!steps && !isEditing) return null;
  const list = !steps ? [] : (typeof steps === "string" ? [] : steps);

  if (typeof steps === "string" && !isEditing) return <p className="pb-sec-text">{steps}</p>;

  const update = (i, field, val) => onChange(list.map((s, j) => j === i ? { ...s, [field]: val } : s));

  return (
    <div className={`pb-funnel${isEditing ? " pb-funnel--editing" : ""}`}>
      {list.map((step, i) => (
        <React.Fragment key={i}>
          <div className={`pb-funnel-step${isEditing ? " pb-funnel-step--editing" : ""}`}>
            <div className="pb-funnel-badge">{i + 1}</div>
            {isEditing ? (
              <div className="pb-funnel-edit">
                <EditCell value={step.paso} onChange={v => update(i, "paso", v)} placeholder="Nombre del paso" style={{ fontWeight: 700 }} />
                <EditCell value={step.desc} onChange={v => update(i, "desc", v)} placeholder="Descripción breve" />
                <button className="pb-row-del pb-funnel-del" onClick={() => onChange(list.filter((_, j) => j !== i))}>✕</button>
              </div>
            ) : (
              <>
                <p className="pb-funnel-paso">{step.paso}</p>
                {step.desc && <p className="pb-funnel-desc">{step.desc}</p>}
              </>
            )}
          </div>
          {!isEditing && i < list.length - 1 && (
            <div className="pb-funnel-arrow" aria-hidden="true">→</div>
          )}
        </React.Fragment>
      ))}
      {isEditing && (
        <button className="pb-row-add pb-funnel-add" onClick={() => onChange([...list, { paso: "", desc: "" }])}>
          + Paso
        </button>
      )}
    </div>
  );
}

function RenderFasesTable({ fases, isEditing, onChange }) {
  if (!fases?.length && !isEditing) return null;
  const rows = fases || [];

  const parseRow = (fase) => {
    if (typeof fase !== "string") return { name: "Fase", period: "", text: String(fase) };
    const m = fase.match(/^(Fase\s*\d+)\s*(\([^)]+\))?\s*:?\s*(.+)$/i);
    return m
      ? { name: m[1], period: m[2]?.replace(/[()]/g, "") ?? "", text: m[3] }
      : { name: "Fase", period: "", text: fase };
  };

  const recompose = ({ name, period, text }) =>
    `${name}${period ? ` (${period})` : ""}: ${text}`;

  return (
    <div className="pb-table-wrap">
      <table className={`pb-table${isEditing ? " pb-table--editing" : ""}`}>
        <thead>
          <tr>
            <th style={{ width: 70 }}>Fase</th>
            <th style={{ width: 120 }}>Período</th>
            <th>Objetivos</th>
            {isEditing && <th style={{ width: 28 }} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((fase, i) => {
            const { name, period, text } = parseRow(fase);
            return (
              <tr key={i}>
                {isEditing ? (
                  <>
                    <td><EditCell value={name}   onChange={v => onChange(rows.map((f, j) => j === i ? recompose({ name: v, period, text }) : f))} /></td>
                    <td><EditCell value={period} onChange={v => onChange(rows.map((f, j) => j === i ? recompose({ name, period: v, text }) : f))} placeholder="meses 1-4" /></td>
                    <td><EditCell value={text}   onChange={v => onChange(rows.map((f, j) => j === i ? recompose({ name, period, text: v }) : f))} /></td>
                    <td><button className="pb-row-del" onClick={() => onChange(rows.filter((_, j) => j !== i))}>✕</button></td>
                  </>
                ) : (
                  <>
                    <td><strong>{name}</strong></td>
                    <td className="pb-table-muted">{period}</td>
                    <td>{text}</td>
                  </>
                )}
              </tr>
            );
          })}
          {isEditing && (
            <tr className="pb-row-add-row">
              <td colSpan={4}>
                <button className="pb-row-add" onClick={() => onChange([...rows, `Fase ${rows.length + 1} (meses X-Y): `])}>
                  + Agregar fase
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const IMPACTO_CONFIG = [
  { k: "economico", label: "Económico", icon: "💰", mod: "eco" },
  { k: "familiar",  label: "Familiar",  icon: "🏠", mod: "fam" },
  { k: "educativo", label: "Educativo", icon: "📚", mod: "edu" },
  { k: "emocional", label: "Emocional", icon: "💙", mod: "emo" },
];

function RenderImpacto({ value, isEditing, onChange }) {
  if (!value) return null;
  return (
    <div className="pb-impact-grid">
      {IMPACTO_CONFIG.map(({ k, label, icon, mod }) => (
        <div key={k} className={`pb-impact-card pb-impact-card--${mod}`}>
          <span className="pb-impact-icon">{icon}</span>
          <h4 className="pb-impact-label">{label}</h4>
          {isEditing ? (
            <textarea
              className="pb-edit-area pb-edit-area--sm"
              value={value[k] || ""}
              onChange={e => onChange({ ...value, [k]: e.target.value })}
              rows={4}
            />
          ) : (
            <p className="pb-impact-text">{value[k]}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function RenderProyecciones({ value, isEditing, onChange }) {
  if (!value) return null;
  const isOld = typeof value.año1 === "string";
  if (isOld && !isEditing) return renderValor(value);

  const ANOS = [
    { k: "año1", label: "Año 1" },
    { k: "año2", label: "Año 2" },
    { k: "año3", label: "Año 3" },
  ];
  const upd = (k, field, val) => onChange({ ...value, [k]: { ...(value[k] || {}), [field]: val } });

  return (
    <div>
      <div className="pb-table-wrap">
        <table className={`pb-table pb-table--proyecciones${isEditing ? " pb-table--editing" : ""}`}>
          <thead>
            <tr>
              <th>Período</th>
              <th>Clientes</th>
              <th>Ingresos</th>
              <th>Costos</th>
              <th>Utilidad neta</th>
            </tr>
          </thead>
          <tbody>
            {ANOS.map(({ k, label }) => {
              const d = value[k] || {};
              return (
                <tr key={k}>
                  <td><strong>{label}</strong></td>
                  {isEditing ? (
                    <>
                      <td><EditCell value={d.clientes} onChange={v => upd(k, "clientes", v)} placeholder="30-50" /></td>
                      <td><EditCell value={d.ingresos} onChange={v => upd(k, "ingresos", v)} placeholder="$50,000" /></td>
                      <td><EditCell value={d.costos}   onChange={v => upd(k, "costos",   v)} placeholder="$10,000" /></td>
                      <td><EditCell value={d.utilidad} onChange={v => upd(k, "utilidad", v)} placeholder="$40,000" /></td>
                    </>
                  ) : (
                    <>
                      <td>{d.clientes ?? "—"}</td>
                      <td>{d.ingresos}</td>
                      <td className="pb-table-muted">{d.costos}</td>
                      <td className="pb-table-total">{d.utilidad}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="pb-vision-box">
        <h4 className="pb-subsec-title">Visión a 5 años</h4>
        {isEditing ? (
          <textarea
            className="pb-edit-area"
            value={value.vision5anos || ""}
            onChange={e => onChange({ ...value, vision5anos: e.target.value })}
            rows={2}
          />
        ) : (
          value.vision5anos && <p className="pb-sec-text">{value.vision5anos}</p>
        )}
      </div>
    </div>
  );
}

function RenderCategorias({ items, isEditing, onChange }) {
  if (!items?.length && !isEditing) return null;
  const rows = !items?.length ? [] : (typeof items[0] === "string"
    ? items.map(s => {
        const m = s.match(/^(.+?)\s*[—:]\s*(.+?)\s*[—:]\s*(\d+%)\s*\(([^)]+)\)$/);
        return m ? { categoria: m[1], descripcion: m[2], porcentaje: m[3], monto: m[4] } : { categoria: s, descripcion: "", porcentaje: "", monto: "" };
      })
    : items);

  const update = (i, field, val) => onChange(rows.map((r, j) => j === i ? { ...r, [field]: val } : r));

  return (
    <div className="pb-table-wrap">
      <table className={`pb-table${isEditing ? " pb-table--editing" : ""}`}>
        <thead>
          <tr>
            <th>Categoría</th>
            <th>Descripción</th>
            <th>%</th>
            <th>Monto</th>
            {isEditing && <th style={{ width: 28 }} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((item, i) => (
            <tr key={i}>
              {isEditing ? (
                <>
                  <td><EditCell value={item.categoria}   onChange={v => update(i, "categoria",   v)} placeholder="Categoría" /></td>
                  <td><EditCell value={item.descripcion} onChange={v => update(i, "descripcion", v)} placeholder="Qué incluye" /></td>
                  <td><EditCell value={item.porcentaje}  onChange={v => update(i, "porcentaje",  v)} placeholder="30%" style={{ width: 52 }} /></td>
                  <td><EditCell value={item.monto}       onChange={v => update(i, "monto",       v)} placeholder="$6,000" /></td>
                  <td><button className="pb-row-del" onClick={() => onChange(rows.filter((_, j) => j !== i))}>✕</button></td>
                </>
              ) : (
                <>
                  <td><strong>{item.categoria}</strong></td>
                  <td>{item.descripcion}</td>
                  <td className="pb-table-muted">{item.porcentaje}</td>
                  <td className="pb-table-total">{item.monto}</td>
                </>
              )}
            </tr>
          ))}
          {isEditing && (
            <tr className="pb-row-add-row">
              <td colSpan={5}>
                <button className="pb-row-add" onClick={() => onChange([...rows, { categoria: "", descripcion: "", porcentaje: "", monto: "" }])}>
                  + Agregar categoría
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

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

// ── renderSection — vista y edición inline ────────────────────────────────

function renderSection(key, value, { isEditing = false, buffer, onBufferChange } = {}) {
  if (!value && !isEditing) return null;
  const cur = isEditing && buffer !== undefined ? buffer : value;

  // Helper: textarea/párrafo para campos string en objetos
  const field = (fieldKey, rows = 4) => {
    const txt = (cur && typeof cur === "object") ? (cur[fieldKey] || "") : "";
    return isEditing ? (
      <textarea
        className="pb-edit-area"
        value={txt}
        onChange={e => onBufferChange({ ...cur, [fieldKey]: e.target.value })}
        rows={Math.max(2, Math.ceil(txt.length / 75) + 1)}
      />
    ) : (
      <p className="pb-sec-text">{value?.[fieldKey]}</p>
    );
  };

  // Helper: lista / textarea-por-líneas
  const listField = (fieldKey) => {
    const arr = (cur && typeof cur === "object") ? (cur[fieldKey] || []) : [];
    return isEditing ? (
      <textarea
        className="pb-edit-area pb-edit-area--sm"
        value={arr.join("\n")}
        onChange={e => onBufferChange({ ...cur, [fieldKey]: e.target.value.split("\n") })}
        rows={Math.max(3, arr.length + 1)}
      />
    ) : (
      <ul className="pb-list">{(value?.[fieldKey] || []).map((p, i) => <li key={i}>{p}</li>)}</ul>
    );
  };

  switch (key) {
    // Secciones string simples
    case "resumenEjecutivo":
    case "problema":
    case "ventajaCompetitiva": {
      const txt = String(cur || "");
      return isEditing ? (
        <textarea
          className="pb-edit-area"
          value={txt}
          onChange={e => onBufferChange(e.target.value)}
          rows={Math.max(4, Math.ceil(txt.length / 75) + 2)}
        />
      ) : (
        <p className="pb-sec-text">{value}</p>
      );
    }

    case "solucion":
      return (
        <div className="pb-subsections">
          <div className="pb-subsec"><h4 className="pb-subsec-title">Descripción</h4>{field("descripcion")}</div>
          <div className="pb-subsec"><h4 className="pb-subsec-title">Productos y Servicios</h4>{listField("productos")}</div>
          <div className="pb-subsec"><h4 className="pb-subsec-title">Áreas de Trabajo</h4>{listField("areas")}</div>
        </div>
      );

    case "mercado":
      return (
        <div className="pb-subsections">
          <div className="pb-subsec"><h4 className="pb-subsec-title">Descripción del Mercado</h4>{field("descripcion")}</div>
          <div className="pb-subsec"><h4 className="pb-subsec-title">Mercado Objetivo</h4>{field("mercadoObjetivo", 3)}</div>
          <div className="pb-subsec"><h4 className="pb-subsec-title">Cliente Ideal</h4>{listField("clienteIdeal")}</div>
        </div>
      );

    case "modeloNegocio":
      return (
        <div className="pb-subsections">
          <div className="pb-subsec"><h4 className="pb-subsec-title">Descripción</h4>{field("descripcion")}</div>
          <div className="pb-subsec">
            <h4 className="pb-subsec-title">Líneas de Ingreso</h4>
            <RenderLineasIngreso
              items={cur?.lineasIngreso}
              isEditing={isEditing}
              onChange={items => onBufferChange({ ...cur, lineasIngreso: items })}
            />
          </div>
          <div className="pb-subsec"><h4 className="pb-subsec-title">Estructura Operativa</h4>{field("estructura", 3)}</div>
        </div>
      );

    case "estrategiaCrecimiento":
      return (
        <div className="pb-subsections">
          <div className="pb-subsec">
            <h4 className="pb-subsec-title">Embudo de Conversión</h4>
            <RenderFunnel
              steps={cur?.embudo}
              isEditing={isEditing}
              onChange={embudo => onBufferChange({ ...cur, embudo })}
            />
          </div>
          <div className="pb-subsec">
            <h4 className="pb-subsec-title">Fases de Crecimiento</h4>
            <RenderFasesTable
              fases={cur?.fases}
              isEditing={isEditing}
              onChange={fases => onBufferChange({ ...cur, fases })}
            />
          </div>
        </div>
      );

    case "impacto":
      return (
        <RenderImpacto
          value={cur}
          isEditing={isEditing}
          onChange={onBufferChange}
        />
      );

    case "proyeccionesFinancieras":
      return (
        <RenderProyecciones
          value={cur}
          isEditing={isEditing}
          onChange={onBufferChange}
        />
      );

    case "usoRecursos":
      return (
        <div className="pb-subsections">
          <div className="pb-subsec"><h4 className="pb-subsec-title">Descripción</h4>{field("descripcion")}</div>
          <div className="pb-subsec">
            <h4 className="pb-subsec-title">Categorías de Inversión</h4>
            <RenderCategorias
              items={cur?.categorias}
              isEditing={isEditing}
              onChange={categorias => onBufferChange({ ...cur, categorias })}
            />
          </div>
        </div>
      );

    default:
      return renderValor(value);
  }
}

function getSectionText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value.descripcion) return value.descripcion;
  return Object.values(value).filter(v => typeof v === "string").slice(0, 3).join("\n\n");
}

// ── DOFA ─────────────────────────────────────────────────────────────────

const DOFA_QUADRANTS = [
  { k: "fortalezas",    label: "Fortalezas",    mod: "f", icon: "💪" },
  { k: "oportunidades", label: "Oportunidades",  mod: "o", icon: "🚀" },
  { k: "debilidades",   label: "Debilidades",    mod: "d", icon: "⚠️" },
  { k: "amenazas",      label: "Amenazas",       mod: "a", icon: "🛡️" },
];

function DofaSection({ dofa, loading, onGenerar }) {
  return (
    <div className="pb-sec">
      <div className="pb-sec-header">
        <div className="pb-sec-header-left">
          <span className="pb-sec-num pb-sec-num--dofa">★</span>
          <h2 className="pb-sec-title">Análisis DOFA</h2>
        </div>
        {!dofa && !loading && (
          <div className="pb-sec-actions no-print">
            <button className="pb-btn-mejorar" onClick={onGenerar}>✦ Generar DOFA</button>
          </div>
        )}
      </div>
      <div className="pb-sec-body">
        {loading && <p className="pb-dofa-placeholder">Analizando tu plan de negocio...</p>}
        {!loading && !dofa && (
          <>
            <p className="pb-dofa-placeholder">
              Identifica automáticamente Fortalezas, Oportunidades, Debilidades y Amenazas basado en toda la información de tu plan.
            </p>
            <button className="pb-btn-primary pb-btn-dofa no-print" onClick={onGenerar}>
              ✦ Generar Análisis DOFA automático
            </button>
          </>
        )}
        {dofa && (
          <div className="pb-dofa-grid">
            {DOFA_QUADRANTS.map(({ k, label, mod, icon }) => (
              <div key={k} className={`pb-dofa-quadrant pb-dofa-quadrant--${mod}`}>
                <h4 className="pb-dofa-q-title">{icon} {label}</h4>
                <ul className="pb-dofa-q-list">
                  {(dofa[k] || []).map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

export default function PlanBuilder() {
  const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview");

  const [fase, setFase]               = useState(isPreview ? "result" : "intro");
  const [paso, setPaso]               = useState(0);
  const [respuestas, setRespuestas]   = useState({});
  const [email, setEmail]             = useState(isPreview ? "preview@demo.co" : "");
  const [nombre, setNombre]           = useState(isPreview ? "Stephanny" : "");
  const [plan, setPlan]               = useState(isPreview ? MOCK_PLAN : null);
  const [editedPlan, setEditedPlan]   = useState(isPreview ? MOCK_PLAN : null);
  const [error, setError]             = useState("");
  const [emailSent, setEmailSent]     = useState(false);
  const [editMode, setEditMode]       = useState({});
  const [editBuffer, setEditBuffer]   = useState({});
  const [mejorando, setMejorando]     = useState({});
  const [mejorarErr, setMejorarErr]   = useState({});
  const [dofa, setDofa]               = useState(null);
  const [dofaLoading, setDofaLoading] = useState(false);
  const resultRef = useRef(null);

  const pregunta = PREGUNTAS[paso];
  const total    = PREGUNTAS.length;
  const progreso = Math.round(((paso + 1) / total) * 100);

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
    if (!emailClean || !emailClean.includes("@")) { setError("Por favor ingresa un correo válido."); return; }
    setError("");
    setFase("generating");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "planNegocio", publicEmail: emailClean, context: { nombre: nombre.trim(), ...respuestas } }),
      });
      if (!res.ok) {
        setError(res.status === 401 || res.status === 403 ? "Error de conexión. Contacta soporte." : "El servidor tardó demasiado. Intenta de nuevo.");
        setFase("email"); return;
      }
      const data = await res.json();
      if (data.error === "ya_generado") { setPlan(data.plan); setEditedPlan(data.plan); setFase("result"); return; }
      if (data.error === "limite_diario") { setError("El cupo de planes gratuitos de hoy está lleno. Vuelve mañana."); setFase("email"); return; }
      if (data.error === "limite_email")  { setError("Ya generaste un plan con este correo. Revisa tu bandeja."); setFase("email"); return; }
      if (data.error || !data.result)     { setError("Algo salió mal. Intenta de nuevo."); setFase("email"); return; }
      setPlan(data.result);
      setEditedPlan(data.result);
      setEmailSent(data.emailSent || false);
      setFase("result");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setFase("email");
    }
  };

  const toggleEdit = (key) => {
    if (editMode[key]) {
      setEditMode(m => ({ ...m, [key]: false }));
      setEditBuffer(b => { const n = { ...b }; delete n[key]; return n; });
    } else {
      setEditBuffer(b => ({ ...b, [key]: editedPlan[key] }));
      setEditMode(m => ({ ...m, [key]: true }));
    }
  };

  const saveEdit = (key) => {
    setEditedPlan(p => ({ ...p, [key]: editBuffer[key] ?? p[key] }));
    setEditMode(m => ({ ...m, [key]: false }));
    setEditBuffer(b => { const n = { ...b }; delete n[key]; return n; });
  };

  const mejorarSeccion = async (key, titulo) => {
    const texto = getSectionText(editedPlan[key]);
    if (!texto.trim()) return;
    setMejorando(m => ({ ...m, [key]: true }));
    setMejorarErr(e => ({ ...e, [key]: "" }));
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "mejorarSeccion", publicEmail: email, texto, seccion: titulo, negocio: editedPlan?.nombreNegocio || "" }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.resultado) throw new Error();
      setEditedPlan(p => {
        const current = p[key];
        if (typeof current === "string") return { ...p, [key]: data.resultado };
        return { ...p, [key]: { ...current, descripcion: data.resultado } };
      });
    } catch {
      setMejorarErr(e => ({ ...e, [key]: "Error al mejorar. Intenta de nuevo." }));
    } finally {
      setMejorando(m => ({ ...m, [key]: false }));
    }
  };

  const generarDofa = async () => {
    setDofaLoading(true);
    try {
      const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "dofa", publicEmail: email, plan: editedPlan }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.dofa) throw new Error();
      setDofa(data.dofa);
    } catch { /* silencioso */ } finally { setDofaLoading(false); }
  };

  // ── INTRO ─────────────────────────────────────────────────────────────────
  if (fase === "intro") return (
    <div className="pb-page">
      <div className="pb-hero">
        <nav className="pb-nav"><Logo width={110} /><a href="/" className="pb-nav-link">Ir a la app →</a></nav>
        <div className="pb-hero-body">
          <span className="pb-badge">100% gratis · Sin tarjeta de crédito</span>
          <h1 className="pb-h1">Tu plan de negocio,<br />hecho para tu realidad</h1>
          <p className="pb-hero-sub">Responde 8 preguntas sobre ti y tu idea — la IA construye un plan de negocio profesional, claro, realista y listo para convocatorias, inversionistas o simplemente para arrancar con dirección.</p>
          <div className="pb-features">
            {["Adaptado a tu historia y habilidades reales", "Listo para convocatorias de capital semilla", "Con proyecciones financieras y modelo de ingresos", "Te llega por correo y puedes guardarlo en tu cuenta"].map(f => (
              <div key={f} className="pb-feature-row"><span className="pb-check">✓</span><span>{f}</span></div>
            ))}
          </div>
          <button className="pb-btn-primary" onClick={() => setFase("form")}>Construir mi plan gratis →</button>
          <p className="pb-hero-note">Toma entre 10 y 15 minutos. Solo 8 preguntas.</p>
        </div>
      </div>
    </div>
  );

  // ── FORMULARIO ────────────────────────────────────────────────────────────
  if (fase === "form") return (
    <div className="pb-page pb-page--form">
      <div className="pb-form-wrap">
        <div className="pb-form-topbar">
          <button className="pb-back-btn" onClick={anterior}>← {paso === 0 ? "Inicio" : "Anterior"}</button>
          <span className="pb-paso-badge">{paso + 1} / {total}</span>
        </div>
        <div className="pb-progress-bg"><div className="pb-progress-fill" style={{ width: `${progreso}%` }} /></div>
        <div className="pb-question-wrap">
          <p className="pb-q-num">Pregunta {paso + 1}</p>
          <h2 className="pb-q-title">{pregunta.pregunta}</h2>
          <p className="pb-q-sub">{pregunta.sub}</p>
          <textarea className="pb-textarea" rows={5} placeholder={pregunta.placeholder} value={respuestas[pregunta.id] || ""} onChange={e => setRespuestas(r => ({ ...r, [pregunta.id]: e.target.value }))} autoFocus />
          <button className="pb-btn-primary" onClick={siguiente} disabled={!respuestas[pregunta.id]?.trim()}>
            {paso < total - 1 ? "Siguiente →" : "Continuar → ingresar correo"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── EMAIL ─────────────────────────────────────────────────────────────────
  if (fase === "email") return (
    <div className="pb-page pb-page--form">
      <div className="pb-form-wrap">
        <button className="pb-back-btn" onClick={() => { setPaso(total - 1); setFase("form"); }}>← Volver</button>
        <div className="pb-email-card">
          <div className="pb-email-icon">🎉</div>
          <h2 className="pb-email-title">¡Todo listo para generar tu plan!</h2>
          <p className="pb-email-sub">Ingresa tu correo y te enviamos el plan completo. También lo verás aquí en pantalla para descargarlo como PDF.</p>
          <input className="pb-input" type="text" placeholder="Tu nombre (opcional)" value={nombre} onChange={e => setNombre(e.target.value)} />
          <input className="pb-input" type="email" placeholder="Tu correo electrónico *" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && generarPlan()} />
          {error && <p className="pb-error">{error}</p>}
          <button className="pb-btn-primary" onClick={generarPlan} disabled={!email.trim()}>✨ Generar mi plan de negocio</button>
          <p className="pb-privacy-note">Sin spam. Solo tu plan y recursos útiles para mamás emprendedoras.</p>
        </div>
      </div>
    </div>
  );

  // ── GENERANDO ─────────────────────────────────────────────────────────────
  if (fase === "generating") return (
    <div className="pb-page pb-page--center">
      <div className="pb-generating">
        <div className="pb-gen-rings">
          <div className="pb-gen-ring pb-gen-ring--1" /><div className="pb-gen-ring pb-gen-ring--2" /><div className="pb-gen-ring pb-gen-ring--3" />
          <span className="pb-gen-icon">📋</span>
        </div>
        <h2 className="pb-gen-title">Construyendo tu plan de negocio...</h2>
        <div className="pb-gen-steps">
          {["Analizando tu historia y habilidades", "Identificando tu mercado y cliente ideal", "Definiendo tu modelo de ingresos", "Calculando proyecciones financieras", "Redactando plan completo"].map((s, i) => (
            <div key={i} className="pb-gen-step" style={{ animationDelay: `${i * 0.6}s` }}>
              <span className="pb-gen-dot" /><span>{s}</span>
            </div>
          ))}
        </div>
        <p className="pb-gen-note">Puede tomar hasta 25 segundos. No cierres esta ventana.</p>
      </div>
    </div>
  );

  // ── RESULTADO ─────────────────────────────────────────────────────────────
  if (fase === "result" && editedPlan) return (
    <div className="pb-page" ref={resultRef}>
      <div className="pb-result-header no-print">
        <nav className="pb-nav"><Logo width={110} /><a href="/" className="pb-nav-link">Crear mi cuenta gratis →</a></nav>
        <div className="pb-result-top">
          <div>
            <span className="pb-badge">Plan de Negocio · Generado con IA</span>
            {emailSent && <p className="pb-email-sent">✓ Te lo enviamos a <strong>{email}</strong></p>}
          </div>
          <button className="pb-btn-outline" onClick={() => window.print()}>⬇ Descargar PDF</button>
        </div>
      </div>

      <div className="pb-plan-wrap">
        {/* Portada PDF */}
        <div className="pb-cover print-only">
          <h1 className="pb-cover-main-title">Plan de Negocio</h1>
          <p className="pb-cover-negocio">{editedPlan.nombreNegocio || ""}</p>
          <p className="pb-cover-date">{new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</p>
          <hr className="pb-cover-hr" />
        </div>

        <h1 className="pb-plan-title no-print">{editedPlan.nombreNegocio || "Tu Plan de Negocio"}</h1>

        {SECCIONES_PLAN.map(({ key, num, titulo }) =>
          editedPlan[key] ? (
            <div key={key} className="pb-sec">
              <div className="pb-sec-header">
                <div className="pb-sec-header-left">
                  <span className="pb-sec-num">{num}</span>
                  <h2 className="pb-sec-title">{titulo}</h2>
                </div>
                <div className="pb-sec-actions no-print">
                  {mejorando[key] && <span className="pb-improving-badge">⏳ Mejorando...</span>}
                  {mejorarErr[key] && <span className="pb-err-badge">{mejorarErr[key]}</span>}
                  {!mejorando[key] && (
                    <>
                      <button className="pb-btn-mejorar" onClick={() => mejorarSeccion(key, titulo)}>✦ Mejorar</button>
                      <button className={`pb-btn-edit${editMode[key] ? " active" : ""}`} onClick={() => toggleEdit(key)}>
                        {editMode[key] ? "✕ Cancelar" : "✎ Editar"}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="pb-sec-body">
                {renderSection(key, editedPlan[key], editMode[key] ? {
                  isEditing: true,
                  buffer: editBuffer[key] ?? editedPlan[key],
                  onBufferChange: val => setEditBuffer(b => ({ ...b, [key]: val })),
                } : {})}
                {editMode[key] && (
                  <div className="pb-edit-btns">
                    <button className="pb-btn-save" onClick={() => saveEdit(key)}>✓ Guardar cambios</button>
                    <button className="pb-btn-cancel" onClick={() => toggleEdit(key)}>Cancelar</button>
                  </div>
                )}
              </div>
            </div>
          ) : null
        )}

        <DofaSection dofa={dofa} loading={dofaLoading} onGenerar={generarDofa} />

        <div className="pb-final-cta no-print">
          <h3 className="pb-final-title">¿Quieres llevar tu negocio al siguiente nivel?</h3>
          <p className="pb-final-sub">Crea tu cuenta en Mamá CEO y gestiona clientes, finanzas, contenido y tu plan — todo en un solo lugar.</p>
          <a className="pb-btn-primary" href="/">Crear mi cuenta gratis →</a>
        </div>
      </div>
    </div>
  );

  return null;
}
