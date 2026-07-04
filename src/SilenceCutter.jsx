import React, { useState, useRef, useEffect, useCallback } from "react";
import Logo from "./Logo";
import "./SilenceCutter.css";

// ── Configuración de presets ───────────────────────────────────────────────
const PRESETS = {
  conservadora: { noise: -45, duration: 0.8, label: "Conservadora", desc: "Solo silencios largos y obvios" },
  normal:       { noise: -35, duration: 0.5, label: "Normal",        desc: "Balance ideal para redes sociales" },
  agresiva:     { noise: -28, duration: 0.3, label: "Agresiva",      desc: "Corta hasta las pausas más breves" },
};

const PADDING = 0.08; // segundos de margen alrededor de cada corte

// ── Utilidades de audio ───────────────────────────────────────────────────

function buildWaveform(channelData, points = 1200) {
  const step = Math.floor(channelData.length / points);
  const waveform = new Float32Array(points);
  for (let i = 0; i < points; i++) {
    let max = 0;
    const from = i * step;
    const to = Math.min(from + step, channelData.length);
    for (let j = from; j < to; j++) max = Math.max(max, Math.abs(channelData[j]));
    waveform[i] = max;
  }
  return waveform;
}

function detectSilences(channelData, sampleRate, noiseDb, minDuration) {
  const windowSamples = Math.floor(sampleRate * 0.04); // ventanas de 40ms
  const silences = [];
  let inSilence = false;
  let silenceStart = 0;
  const duration = channelData.length / sampleRate;

  for (let i = 0; i < channelData.length; i += windowSamples) {
    let sumSq = 0;
    const count = Math.min(windowSamples, channelData.length - i);
    for (let j = 0; j < count; j++) sumSq += channelData[i + j] ** 2;
    const rms = Math.sqrt(sumSq / count);
    const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
    const t = i / sampleRate;

    if (db < noiseDb) {
      if (!inSilence) { inSilence = true; silenceStart = t; }
    } else {
      if (inSilence) {
        inSilence = false;
        const dur = t - silenceStart;
        if (dur >= minDuration) silences.push({ id: silences.length, start: Math.max(0, silenceStart + PADDING), end: Math.min(duration, t - PADDING), cut: true });
      }
    }
  }
  if (inSilence) {
    const dur = duration - silenceStart;
    if (dur >= minDuration) silences.push({ id: silences.length, start: Math.max(0, silenceStart + PADDING), end: duration, cut: true });
  }
  return silences;
}

function getKeepSegments(silences, duration) {
  const toRemove = silences.filter(s => s.cut).sort((a, b) => a.start - b.start);
  const segments = [];
  let pos = 0;
  for (const { start, end } of toRemove) {
    if (start > pos + 0.05) segments.push({ start: pos, end: start });
    pos = end;
  }
  if (pos < duration - 0.05) segments.push({ start: pos, end: duration });
  return segments;
}

function fmtTime(s) {
  if (isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function getSupportedMimeType() {
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return types.find(t => MediaRecorder.isTypeSupported(t)) || "video/webm";
}

// ── Componente de forma de onda ───────────────────────────────────────────

function Waveform({ waveform, duration, silences, onToggle, currentTime }) {
  const canvasRef = useRef(null);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveform) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const midY = H / 2;

    ctx.clearRect(0, 0, W, H);

    // Fondo
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, W, H);

    // Zonas de silencio marcadas para corte
    silences.forEach(({ start, end, cut }) => {
      const x1 = (start / duration) * W;
      const x2 = (end / duration) * W;
      ctx.fillStyle = cut ? "rgba(196,82,106,0.35)" : "rgba(34,197,94,0.15)";
      ctx.fillRect(x1, 0, x2 - x1, H);
    });

    // Forma de onda
    const barW = W / waveform.length;
    for (let i = 0; i < waveform.length; i++) {
      const x = i * barW;
      const amp = waveform[i] * (H * 0.42);
      const t = (i / waveform.length) * duration;
      const inCut = silences.some(s => s.cut && t >= s.start && t <= s.end);
      ctx.fillStyle = inCut ? "rgba(196,82,106,0.7)" : "rgba(255,255,255,0.75)";
      ctx.fillRect(x, midY - amp, Math.max(1, barW - 0.5), amp * 2);
    }

    // Línea de tiempo actual
    if (currentTime > 0) {
      const cx = (currentTime / duration) * W;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, H);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Etiquetas de tiempo
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "10px system-ui";
    const steps = Math.min(8, Math.floor(duration / 30));
    for (let i = 1; i <= steps; i++) {
      const t = (i / (steps + 1)) * duration;
      const x = (t / duration) * W;
      ctx.fillText(fmtTime(t), x + 2, H - 4);
    }
  }, [waveform, duration, silences, currentTime]);

  const getTimeAtX = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    return ratio * duration;
  };

  const handleClick = (e) => {
    const t = getTimeAtX(e);
    const clicked = silences.find(s => t >= s.start && t <= s.end);
    if (clicked) onToggle(clicked.id);
  };

  const handleMouseMove = (e) => {
    const t = getTimeAtX(e);
    const over = silences.find(s => t >= s.start && t <= s.end);
    setHover(over ? { ...over, x: e.clientX } : null);
  };

  return (
    <div className="sc-waveform-wrap" onMouseLeave={() => setHover(null)}>
      <canvas
        ref={canvasRef}
        className="sc-waveform"
        width={1200}
        height={120}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        style={{ cursor: silences.length ? "pointer" : "default" }}
      />
      {hover && (
        <div className="sc-waveform-tooltip" style={{ left: Math.min(hover.x - 40, window.innerWidth - 140) }}>
          {hover.cut ? "✕ Cortar" : "✓ Conservar"}<br />
          {fmtTime(hover.start)} – {fmtTime(hover.end)}<br />
          <span className="sc-tooltip-hint">Clic para cambiar</span>
        </div>
      )}
      <div className="sc-waveform-legend">
        <span><span className="sc-legend-dot sc-legend-dot--cut" /> Se elimina</span>
        <span><span className="sc-legend-dot sc-legend-dot--keep" /> Se conserva</span>
        <span className="sc-legend-hint">Toca cualquier zona para cambiar la decisión</span>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

export default function SilenceCutter() {
  const [fase, setFase]           = useState("upload");
  const [file, setFile]           = useState(null);
  const [preset, setPreset]       = useState("normal");
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [waveform, setWaveform]   = useState(null);
  const [silences, setSilences]   = useState([]);
  const [duration, setDuration]   = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress]   = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState("");
  const [dragOver, setDragOver]   = useState(false);
  const inputRef = useRef(null);
  const abortRef = useRef(false);

  const { noise: noiseDb, duration: minDur } = PRESETS[preset];

  // ── Validar y cargar archivo ───────────────────────────────────────────

  const onFile = (f) => {
    if (!f) return;
    const validTypes = ["video/mp4", "video/quicktime", "video/x-m4v", "video/webm", "video/avi", "video/mov"];
    const validExts = /\.(mp4|mov|m4v|webm|avi)$/i;
    if (!validTypes.includes(f.type) && !validExts.test(f.name)) {
      setError("Formato no compatible. Usa .mp4, .mov, .m4v o .webm");
      return;
    }
    if (f.size > 2 * 1024 * 1024 * 1024) {
      setError("El archivo supera el límite de 2 GB.");
      return;
    }
    setError("");
    setFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    onFile(e.dataTransfer.files[0]);
  }, []);

  // ── Análisis de audio ──────────────────────────────────────────────────

  const analizar = async () => {
    if (!file) return;
    setFase("analyzing");
    setError("");

    try {
      setProgressMsg("Decodificando audio...");
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuf = await audioCtx.decodeAudioData(arrayBuffer);

      setProgressMsg("Analizando silencios...");
      const channelData = audioBuf.getChannelData(0);
      const dur = audioBuf.duration;

      const wave = buildWaveform(channelData, 1200);
      const sils = detectSilences(channelData, audioBuf.sampleRate, noiseDb, minDur);

      setAudioBuffer(audioBuf);
      setWaveform(wave);
      setSilences(sils);
      setDuration(dur);
      setFase("review");
    } catch (err) {
      setError("No se pudo decodificar el audio. Asegúrate de que el archivo tenga sonido.");
      setFase("upload");
    }
  };

  // ── Toggle de silencios ────────────────────────────────────────────────

  const toggleSilence = (id) => {
    setSilences(prev => prev.map(s => s.id === id ? { ...s, cut: !s.cut } : s));
  };

  const toggleAll = (cut) => setSilences(prev => prev.map(s => ({ ...s, cut })));

  // ── Cortar video ───────────────────────────────────────────────────────

  const cortar = async () => {
    const segments = getKeepSegments(silences, duration);
    if (!segments.length) { setError("No quedaría contenido después de cortar. Conserva al menos una sección."); return; }

    abortRef.current = false;
    setFase("cutting");
    setProgress(0);
    setError("");

    try {
      const mimeType = getSupportedMimeType();
      const blob = await recordSegments(file, segments, duration, (p, msg) => {
        if (abortRef.current) throw new Error("Cancelado");
        setProgress(Math.round(p * 100));
        if (msg) setProgressMsg(msg);
      });

      const totalKept = segments.reduce((s, g) => s + (g.end - g.start), 0);
      const removed = duration - totalKept;

      setResult({
        url: URL.createObjectURL(blob),
        filename: file.name.replace(/\.[^/.]+$/, "") + "_editado.webm",
        originalDuration: duration,
        keptDuration: totalKept,
        removedDuration: removed,
        cuts: silences.filter(s => s.cut).length,
      });
      setFase("done");
    } catch (err) {
      if (err.message !== "Cancelado") setError("Error al procesar el video: " + err.message);
      setFase("review");
    }
  };

  // ── Grabación por segmentos con pause/resume ───────────────────────────

  function recordSegments(file, segments, totalDuration, onProgress) {
    return new Promise((resolve, reject) => {
      const videoEl = document.createElement("video");
      videoEl.src = URL.createObjectURL(file);
      videoEl.preload = "auto";
      videoEl.muted = false;
      videoEl.volume = 1;

      videoEl.addEventListener("error", () => reject(new Error("No se pudo cargar el video para procesar.")));

      videoEl.addEventListener("loadedmetadata", async () => {
        try {
          const mimeType = getSupportedMimeType();
          const stream = videoEl.captureStream ? videoEl.captureStream() : videoEl.mozCaptureStream();
          const recorder = new MediaRecorder(stream, { mimeType });
          const chunks = [];

          recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
          recorder.onstop = () => {
            URL.revokeObjectURL(videoEl.src);
            resolve(new Blob(chunks, { type: mimeType }));
          };

          const totalKept = segments.reduce((s, g) => s + (g.end - g.start), 0);
          let processedTime = 0;

          for (let i = 0; i < segments.length; i++) {
            const { start, end } = segments[i];
            onProgress(processedTime / totalKept, `Procesando segmento ${i + 1} de ${segments.length}...`);

            // Seek to segment start
            videoEl.currentTime = start;
            await new Promise((res, rej) => {
              const timeout = setTimeout(() => rej(new Error("Timeout en seek")), 10000);
              videoEl.onseeked = () => { clearTimeout(timeout); res(); };
            });

            // Pause recorder between segments to avoid gaps
            if (recorder.state === "recording") recorder.pause();
            if (recorder.state === "inactive") {
              recorder.start(100);
            } else {
              recorder.resume();
            }

            // Play segment
            videoEl.play();

            await new Promise((res, rej) => {
              const interval = setInterval(() => {
                if (abortRef.current) { clearInterval(interval); rej(new Error("Cancelado")); return; }
                const ct = videoEl.currentTime;
                const segProgress = (ct - start) / (end - start);
                setCurrentTime(ct);
                onProgress((processedTime + (ct - start)) / totalKept, `Procesando segmento ${i + 1} de ${segments.length}...`);

                if (ct >= end - 0.05 || videoEl.ended) {
                  clearInterval(interval);
                  videoEl.pause();
                  res();
                }
              }, 80);
            });

            processedTime += (end - start);
          }

          // Stop recording
          if (recorder.state === "paused") recorder.resume();
          setTimeout(() => recorder.stop(), 300);

        } catch (err) {
          URL.revokeObjectURL(videoEl.src);
          reject(err);
        }
      });
    });
  }

  const reset = () => {
    abortRef.current = true;
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null); setAudioBuffer(null); setWaveform(null);
    setSilences([]); setDuration(0); setCurrentTime(0);
    setProgress(0); setProgressMsg(""); setResult(null); setError("");
    setFase("upload");
  };

  // ── Cálculos para la pantalla de revisión ─────────────────────────────

  const totalCut   = silences.filter(s => s.cut).reduce((t, s) => t + (s.end - s.start), 0);
  const totalKeep  = duration - totalCut;
  const cutCount   = silences.filter(s => s.cut).length;
  const keepCount  = silences.filter(s => !s.cut).length;

  // ── UPLOAD ────────────────────────────────────────────────────────────

  if (fase === "upload") return (
    <div className="sc-page">
      <nav className="sc-nav"><Logo width={110} /><a href="/" className="sc-nav-link">Ir a la app →</a></nav>
      <div className="sc-hero">
        <span className="sc-badge">Herramienta gratuita · Funciona en tu dispositivo</span>
        <h1 className="sc-h1">Corta los silencios<br />en segundos</h1>
        <p className="sc-sub">Detecta y elimina los silencios de tus videos automáticamente. Todo ocurre en tu navegador — tu video nunca sale de tu dispositivo.</p>
      </div>

      <div className="sc-card">
        <div
          className={`sc-drop${dragOver ? " sc-drop--over" : ""}${file ? " sc-drop--file" : ""}`}
          onClick={() => !file && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {file ? (
            <div className="sc-file-info">
              <span className="sc-file-icon">🎬</span>
              <div>
                <p className="sc-file-name">{file.name}</p>
                <p className="sc-file-size">{(file.size / (1024 * 1024)).toFixed(0)} MB</p>
              </div>
              <button className="sc-file-remove" onClick={e => { e.stopPropagation(); setFile(null); setError(""); }}>✕</button>
            </div>
          ) : (
            <>
              <span className="sc-drop-icon">✂️</span>
              <p className="sc-drop-title">Arrastra tu video aquí</p>
              <p className="sc-drop-hint">o haz clic para seleccionar</p>
              <p className="sc-drop-formats">.mp4 · .mov · .m4v · .webm · Hasta 2 GB</p>
            </>
          )}
        </div>
        <input ref={inputRef} type="file" accept="video/*,.mov,.mp4,.m4v,.webm" style={{ display: "none" }} onChange={e => onFile(e.target.files[0])} />

        <div className="sc-presets">
          <p className="sc-presets-label">Intensidad de detección</p>
          <div className="sc-presets-row">
            {Object.entries(PRESETS).map(([key, p]) => (
              <button key={key} className={`sc-preset-btn${preset === key ? " active" : ""}`} onClick={() => setPreset(key)}>
                <span className="sc-preset-name">{p.label}</span>
                <span className="sc-preset-desc">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="sc-error">{error}</p>}
        <button className="sc-btn-primary" onClick={analizar} disabled={!file}>✦ Analizar video</button>
        <p className="sc-privacy">Tu video no se sube a ningún servidor. Procesamiento 100% local.</p>
      </div>
    </div>
  );

  // ── ANALYZING ─────────────────────────────────────────────────────────

  if (fase === "analyzing") return (
    <div className="sc-page sc-page--center">
      <Logo width={100} />
      <div className="sc-processing">
        <div className="sc-proc-rings">
          <div className="sc-proc-ring sc-proc-ring--1" />
          <div className="sc-proc-ring sc-proc-ring--2" />
          <div className="sc-proc-ring sc-proc-ring--3" />
          <span className="sc-proc-icon">🔍</span>
        </div>
        <h2 className="sc-proc-title">Analizando audio...</h2>
        <p className="sc-proc-note">{progressMsg}</p>
        <p className="sc-proc-note">Solo toma unos segundos.</p>
      </div>
    </div>
  );

  // ── REVIEW ────────────────────────────────────────────────────────────

  if (fase === "review") return (
    <div className="sc-page">
      <nav className="sc-nav"><Logo width={110} /><a href="/" className="sc-nav-link">Ir a la app →</a></nav>

      <div className="sc-review-wrap">
        <div className="sc-review-header">
          <div>
            <h2 className="sc-review-title">Revisa los cortes detectados</h2>
            <p className="sc-review-sub">Toca cualquier zona roja para conservarla, o verde para cortarla.</p>
          </div>
          <button className="sc-btn-outline sc-btn-sm" onClick={reset}>← Nuevo video</button>
        </div>

        {/* Stats bar */}
        <div className="sc-stats-bar">
          <div className="sc-stat-item">
            <span className="sc-stat-val">{fmtTime(duration)}</span>
            <span className="sc-stat-lbl">Duración original</span>
          </div>
          <div className="sc-stat-item sc-stat-item--cut">
            <span className="sc-stat-val">{fmtTime(totalCut)}</span>
            <span className="sc-stat-lbl">{cutCount} silencios a eliminar</span>
          </div>
          <div className="sc-stat-item sc-stat-item--keep">
            <span className="sc-stat-val">{fmtTime(totalKeep)}</span>
            <span className="sc-stat-lbl">Video final estimado</span>
          </div>
        </div>

        {/* Waveform */}
        {waveform && silences.length > 0 ? (
          <Waveform
            waveform={waveform}
            duration={duration}
            silences={silences}
            onToggle={toggleSilence}
            currentTime={currentTime}
          />
        ) : waveform && (
          <div className="sc-no-silences-box">
            <span>✨</span>
            <p>No se detectaron silencios con la sensibilidad actual. Prueba con la opción <strong>Agresiva</strong>.</p>
          </div>
        )}

        {/* Controles */}
        <div className="sc-review-controls">
          <div className="sc-bulk-btns">
            <button className="sc-btn-ghost" onClick={() => toggleAll(true)}>Cortar todos</button>
            <button className="sc-btn-ghost" onClick={() => toggleAll(false)}>Conservar todos</button>
          </div>
          <div className="sc-preset-switch">
            <span className="sc-preset-switch-label">Sensibilidad:</span>
            {Object.entries(PRESETS).map(([key, p]) => (
              <button
                key={key}
                className={`sc-preset-mini${preset === key ? " active" : ""}`}
                onClick={() => { setPreset(key); analizar(); }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de silencios */}
        {silences.length > 0 && (
          <div className="sc-silence-list">
            <p className="sc-silence-list-title">Silencios detectados</p>
            <div className="sc-silence-items">
              {silences.map(s => (
                <button
                  key={s.id}
                  className={`sc-silence-item${s.cut ? " sc-silence-item--cut" : " sc-silence-item--keep"}`}
                  onClick={() => toggleSilence(s.id)}
                >
                  <span className="sc-silence-range">{fmtTime(s.start)} – {fmtTime(s.end)}</span>
                  <span className="sc-silence-dur">{(s.end - s.start).toFixed(1)}s</span>
                  <span className="sc-silence-status">{s.cut ? "✕ Cortar" : "✓ Conservar"}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="sc-error">{error}</p>}

        <div className="sc-review-footer">
          <div className="sc-review-summary">
            {cutCount > 0 ? (
              <p>Se eliminarán <strong>{cutCount} silencios</strong> ({fmtTime(totalCut)}). El video final durará ~<strong>{fmtTime(totalKeep)}</strong>.</p>
            ) : (
              <p>No hay silencios marcados para cortar. El video se exportará sin cambios.</p>
            )}
          </div>
          <button className="sc-btn-primary sc-btn-cut" onClick={cortar} disabled={cutCount === 0}>
            ✂️ Cortar {cutCount} silencios
          </button>
        </div>
      </div>
    </div>
  );

  // ── CUTTING ───────────────────────────────────────────────────────────

  if (fase === "cutting") return (
    <div className="sc-page sc-page--center">
      <Logo width={100} />
      <div className="sc-processing">
        <div className="sc-proc-rings">
          <div className="sc-proc-ring sc-proc-ring--1" />
          <div className="sc-proc-ring sc-proc-ring--2" />
          <div className="sc-proc-ring sc-proc-ring--3" />
          <span className="sc-proc-icon">✂️</span>
        </div>
        <h2 className="sc-proc-title">Cortando tu video...</h2>
        <div className="sc-progress-bar-wrap">
          <div className="sc-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <p className="sc-proc-note">{progressMsg}</p>
        <p className="sc-proc-note sc-proc-note--small">El procesamiento ocurre en tiempo real. No cierres esta ventana.</p>
        <button className="sc-btn-ghost sc-btn-cancel-cut" onClick={() => { abortRef.current = true; }}>Cancelar</button>
      </div>
    </div>
  );

  // ── DONE ──────────────────────────────────────────────────────────────

  if (fase === "done" && result) return (
    <div className="sc-page">
      <nav className="sc-nav"><Logo width={110} /><a href="/" className="sc-nav-link">Ir a la app →</a></nav>
      <div className="sc-done-wrap">
        <span className="sc-done-emoji">🎉</span>
        <h2 className="sc-done-title">¡Tu video está listo!</h2>

        <div className="sc-stats-grid">
          <div className="sc-stat">
            <span className="sc-stat-num">{result.cuts}</span>
            <span className="sc-stat-label">Silencios eliminados</span>
          </div>
          <div className="sc-stat">
            <span className="sc-stat-num">{fmtTime(result.removedDuration)}</span>
            <span className="sc-stat-label">Tiempo eliminado</span>
          </div>
          <div className="sc-stat">
            <span className="sc-stat-num">{fmtTime(result.originalDuration)}</span>
            <span className="sc-stat-label">Duración original</span>
          </div>
          <div className="sc-stat sc-stat--highlight">
            <span className="sc-stat-num">{fmtTime(result.keptDuration)}</span>
            <span className="sc-stat-label">Duración final</span>
          </div>
        </div>

        <a className="sc-btn-primary sc-btn-download" href={result.url} download={result.filename}>
          ⬇ Descargar video editado
        </a>
        <p className="sc-done-hint">Formato WebM · Compatible con YouTube, Instagram y WhatsApp</p>
        <button className="sc-btn-outline" onClick={reset}>✂️ Editar otro video</button>

        <div className="sc-done-cta">
          <p>¿Quieres gestionar tu negocio, contenido y clientes en un solo lugar?</p>
          <a href="/">Crear mi cuenta en Mamá CEO →</a>
        </div>
      </div>
    </div>
  );

  return null;
}
