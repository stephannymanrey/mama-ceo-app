import { useState, useRef } from "react";
import "./WeeklyDump.css";

const CATEGORY_LABELS = { hogar: "🏠 Hogar", negocio: "💼 Negocio", cita: "📅 Cita/Agenda" };

export default function WeeklyDump({ onClose, callGemini, onDistribute }) {
  const [step, setStep] = useState("write"); // "write" | "review"
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setError("Tu navegador no soporta dictado por voz — escribe el texto."); return; }
    if (listening) { recognitionRef.current?.stop(); return; }
    const rec = new SpeechRecognition();
    rec.lang = "es-CO";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
      }
      if (finalText) setText((prev) => (prev ? prev.trim() + " " : "") + finalText.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    try { rec.start(); setListening(true); } catch { setError("No se pudo iniciar el micrófono."); }
  };

  const organize = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    const today = new Date().toISOString().slice(0, 10);
    const res = await callGemini("organizeWeek", { text: text.trim(), today });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    if (!res.items?.length) { setError("No encontré pendientes en el texto — intenta ser más específica."); return; }
    setItems(res.items.map((it, i) => ({ ...it, _id: i, include: true })));
    setStep("review");
  };

  const updateItem = (id, patch) => setItems((cur) => cur.map((it) => (it._id === id ? { ...it, ...patch } : it)));

  const confirm = () => {
    onDistribute(items.filter((it) => it.include));
    onClose();
  };

  return (
    <div className="wd-overlay" onClick={onClose}>
      <div className="wd-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="wd-close" onClick={onClose} aria-label="Cerrar">✕</button>

        {step === "write" ? (
          <>
            <div className="wd-header">
              <span className="wd-avatar">A</span>
              <div>
                <h2>Descarga mental de la semana</h2>
                <p>Escribe (o dicta) todo lo que tienes pendiente — hogar, negocio, lo que sea. Yo lo organizo por ti.</p>
              </div>
            </div>
            <textarea
              className="wd-textarea"
              rows={7}
              placeholder="Ej: el miércoles a las 4 cita de pediatra de Juan, comprar mercado, publicar el reel del lanzamiento, pagar el recibo de luz..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
            <div className="wd-actions">
              <button type="button" className={`wd-mic${listening ? " listening" : ""}`} onClick={toggleVoice}>
                🎙️ {listening ? "Escuchando..." : "Dictar"}
              </button>
              <button type="button" className="wd-primary" onClick={organize} disabled={loading || !text.trim()}>
                {loading ? "Organizando..." : "Organizar →"}
              </button>
            </div>
            {error && <p className="wd-error">{error}</p>}
          </>
        ) : (
          <>
            <div className="wd-header">
              <span className="wd-avatar">A</span>
              <div>
                <h2>Esto fue lo que entendí</h2>
                <p>Revisa y ajusta antes de confirmar — nada se guarda todavía.</p>
              </div>
            </div>
            <div className="wd-items">
              {items.map((it) => (
                <div key={it._id} className={`wd-item${it.include ? "" : " wd-item--off"}`}>
                  <input type="checkbox" checked={it.include} onChange={(e) => updateItem(it._id, { include: e.target.checked })} />
                  <div className="wd-item-body">
                    <input className="wd-item-title" value={it.title} onChange={(e) => updateItem(it._id, { title: e.target.value })} />
                    <div className="wd-item-meta">
                      <select value={it.category} onChange={(e) => updateItem(it._id, { category: e.target.value })}>
                        {Object.entries(CATEGORY_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                      </select>
                      {it.category === "cita" && (
                        <>
                          <input type="date" value={it.date || ""} onChange={(e) => updateItem(it._id, { date: e.target.value })} />
                          <input type="time" value={it.time || ""} onChange={(e) => updateItem(it._id, { time: e.target.value })} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {error && <p className="wd-error">{error}</p>}
            <div className="wd-actions">
              <button type="button" className="wd-ghost" onClick={() => setStep("write")}>← Volver</button>
              <button type="button" className="wd-primary" onClick={confirm}>Confirmar y distribuir →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
