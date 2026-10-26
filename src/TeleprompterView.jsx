import { useState, useRef, useEffect, useCallback } from "react";
import "./TeleprompterView.css";

/**
 * Teleprompter de pantalla completa: pega o reutiliza un guión, elige cuánto
 * quieres que dure la lectura, y el texto se desplaza solo a ese ritmo.
 * Al terminar, pregunta si grabaste — si sí, el padre decide qué hacer con
 * el texto (típicamente: mandarlo a Mi Contenido con status "Por editar").
 */
export default function TeleprompterView({ initialText = "", onClose, onMarkRecorded }) {
  const [text, setText] = useState(initialText);
  const [minutes, setMinutes] = useState(2);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [finished, setFinished] = useState(false);
  const [askRecorded, setAskRecorded] = useState(false);

  const scrollRef = useRef(null);
  const rafRef = useRef(null);
  const lastTsRef = useRef(null);
  const pxPerMsRef = useRef(0);
  const tickRef = useRef(null); // guarda la última versión de `tick` para que pueda reprogramarse a sí misma sin referenciarse en su propia declaración
  // El navegador redondea scrollTop a enteros, así que un avance menor a 1px
  // por cuadro (normal en lecturas de varios minutos) se pierde si se lee y
  // se vuelve a escribir scrollTop cada vez. Este acumulador guarda el valor
  // exacto con decimales por fuera, y solo se escribe el redondeado.
  const scrollAccumRef = useRef(0);

  const stopLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastTsRef.current = null;
  };

  const tick = useCallback((ts) => {
    const el = scrollRef.current;
    if (!el) return;
    if (lastTsRef.current == null) lastTsRef.current = ts;
    const dt = ts - lastTsRef.current;
    lastTsRef.current = ts;
    scrollAccumRef.current += pxPerMsRef.current * speed * dt;
    el.scrollTop = Math.round(scrollAccumRef.current);
    if (scrollAccumRef.current + el.clientHeight >= el.scrollHeight - 2) {
      setFinished(true);
      setRunning(false);
      stopLoop();
      return;
    }
    rafRef.current = requestAnimationFrame(tickRef.current);
  }, [speed]);

  useEffect(() => { tickRef.current = tick; }, [tick]);

  // El contenedor con scroll solo existe en el DOM una vez `running` es true
  // (es una pantalla distinta a la de configuración), así que medirlo tiene
  // que pasar DESPUÉS de montarse, en un efecto — no en el clic de "Iniciar".
  useEffect(() => {
    if (!running) return;
    const el = scrollRef.current;
    if (!el) return;
    const totalMs = Math.max(10, Number(minutes) || 2) * 60 * 1000;
    const distance = Math.max(1, el.scrollHeight - el.clientHeight);
    pxPerMsRef.current = distance / totalMs;
    scrollAccumRef.current = 0;
    el.scrollTop = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe medir una vez al arrancar, no en cada cambio de minutes
  }, [running]);

  useEffect(() => {
    if (running && !paused) {
      lastTsRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      stopLoop();
    }
    return stopLoop;
  }, [running, paused, tick]);

  const start = () => {
    if (!text.trim()) return;
    setFinished(false);
    setPaused(false);
    setRunning(true);
  };

  const finish = () => {
    setRunning(false);
    stopLoop();
    setAskRecorded(true);
  };

  if (askRecorded) {
    return (
      <div className="tp-overlay">
        <div className="tp-confirm-card">
          <p className="tp-confirm-icon">🎬</p>
          <h3>¿Grabaste esto?</h3>
          <p className="tp-confirm-sub">Si sí, lo mandamos directo a Mi Contenido, en la columna "Por editar".</p>
          <div className="tp-confirm-actions">
            <button type="button" className="tp-btn tp-btn--ghost" onClick={onClose}>No, solo estaba practicando</button>
            <button type="button" className="tp-btn tp-btn--primary" onClick={() => onMarkRecorded?.(text)}>✓ Sí, lo grabé</button>
          </div>
        </div>
      </div>
    );
  }

  if (!running && !finished) {
    return (
      <div className="tp-overlay">
        <div className="tp-setup-card">
          <div className="tp-setup-head">
            <h3>🎥 Teleprompter</h3>
            <button type="button" className="tp-close" onClick={onClose} aria-label="Cerrar">✕</button>
          </div>
          <p className="tp-setup-hint">Pega o revisa tu guión, elige cuánto quieres que dure la lectura, y el texto se desliza solo mientras grabas.</p>
          <textarea className="tp-textarea" rows={10} placeholder="Pega aquí tu guión..." value={text} onChange={(e) => setText(e.target.value)} />
          <div className="tp-setup-row">
            <label className="tp-setup-label">
              ¿Cuánto quieres que dure? (minutos)
              <input type="number" min="1" max="60" step="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="tp-minutes-input" />
            </label>
            <button type="button" className="tp-btn tp-btn--primary tp-btn--start" disabled={!text.trim()} onClick={start}>▶ Iniciar teleprompter</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tp-overlay tp-overlay--full">
      <div className="tp-bar">
        <button type="button" className="tp-bar-btn" onClick={() => setPaused((p) => !p)}>{paused ? "▶ Reanudar" : "⏸ Pausar"}</button>
        <div className="tp-speed">
          <button type="button" className="tp-bar-btn" onClick={() => setSpeed((s) => Math.max(0.3, +(s - 0.1).toFixed(1)))}>− Más lento</button>
          <span>{Math.round(speed * 100)}%</span>
          <button type="button" className="tp-bar-btn" onClick={() => setSpeed((s) => Math.min(2.5, +(s + 0.1).toFixed(1)))}>+ Más rápido</button>
        </div>
        <button type="button" className="tp-bar-btn tp-bar-btn--end" onClick={finish}>⏹ Terminar</button>
      </div>
      <div className="tp-scroll" ref={scrollRef}>
        <div className="tp-spacer-top" />
        <p className="tp-text">{text}</p>
        <div className="tp-spacer-bottom" />
      </div>
      <div className="tp-center-line" />
    </div>
  );
}
