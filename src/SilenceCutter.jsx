import React, { useState, useRef, useCallback } from "react";
import Logo from "./Logo";
import "./SilenceCutter.css";

// ── Constantes ────────────────────────────────────────────────────────────
const PRESETS = {
  conservadora: { noise: -45, duration: 0.8, label: "Conservadora", desc: "Solo silencios largos" },
  normal:       { noise: -35, duration: 0.5, label: "Normal",        desc: "Ideal para redes sociales" },
  agresiva:     { noise: -28, duration: 0.3, label: "Agresiva",      desc: "Corta pausas breves" },
};
const PADDING = 0.08;

// ── Utilidades ────────────────────────────────────────────────────────────
function fmtTime(s) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
function fmtSize(b) {
  if (b > 1024 ** 3) return (b / 1024 ** 3).toFixed(1) + " GB";
  if (b > 1024 ** 2) return (b / 1024 ** 2).toFixed(0) + " MB";
  return (b / 1024).toFixed(0) + " KB";
}
function uid() { return Math.random().toString(36).slice(2); }
function getSupportedMimeType() {
  return ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
    .find(t => MediaRecorder.isTypeSupported(t)) || "video/webm";
}

// ── Audio / análisis ──────────────────────────────────────────────────────
function buildWaveform(channelData, points = 900) {
  const step = Math.floor(channelData.length / points);
  const w = new Float32Array(points);
  for (let i = 0; i < points; i++) {
    let max = 0;
    const from = i * step, to = Math.min(from + step, channelData.length);
    for (let j = from; j < to; j++) max = Math.max(max, Math.abs(channelData[j]));
    w[i] = max;
  }
  return w;
}
function detectSilences(channelData, sampleRate, noiseDb, minDuration, duration) {
  const ws = Math.floor(sampleRate * 0.04);
  const silences = [];
  let inSilence = false, silenceStart = 0;
  for (let i = 0; i < channelData.length; i += ws) {
    let sumSq = 0;
    const count = Math.min(ws, channelData.length - i);
    for (let j = 0; j < count; j++) sumSq += channelData[i + j] ** 2;
    const db = sumSq > 0 ? 20 * Math.log10(Math.sqrt(sumSq / count)) : -Infinity;
    const t = i / sampleRate;
    if (db < noiseDb) {
      if (!inSilence) { inSilence = true; silenceStart = t; }
    } else if (inSilence) {
      inSilence = false;
      const dur = t - silenceStart;
      if (dur >= minDuration)
        silences.push({ id: uid(), start: Math.max(0, silenceStart + PADDING), end: Math.min(duration, t - PADDING), cut: true });
    }
  }
  if (inSilence && duration - silenceStart >= minDuration)
    silences.push({ id: uid(), start: Math.max(0, silenceStart + PADDING), end: duration, cut: true });
  return silences;
}

async function analyzeClip(file, noiseDb, minDuration) {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuf = await audioCtx.decodeAudioData(arrayBuffer);
  const channelData = audioBuf.getChannelData(0);
  const duration = audioBuf.duration;
  return {
    duration,
    waveform: buildWaveform(channelData, 900),
    silences: detectSilences(channelData, audioBuf.sampleRate, noiseDb, minDuration, duration),
  };
}

async function generateThumbnail(file) {
  return new Promise(resolve => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    v.src = url; v.muted = true; v.preload = "metadata";
    v.onloadeddata = () => { v.currentTime = Math.min(1, v.duration * 0.1); };
    v.onseeked = () => {
      const c = document.createElement("canvas");
      c.width = 160; c.height = 90;
      c.getContext("2d").drawImage(v, 0, 0, 160, 90);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.7));
    };
    v.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
  });
}

// ── Mini waveform ─────────────────────────────────────────────────────────
function MiniWaveform({ waveform, duration, silences, onToggle }) {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveform) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height, mid = H / 2;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, W, H);
    silences.forEach(({ start, end, cut }) => {
      ctx.fillStyle = cut ? "rgba(196,82,106,0.35)" : "rgba(34,197,94,0.15)";
      ctx.fillRect((start / duration) * W, 0, ((end - start) / duration) * W, H);
    });
    const bw = W / waveform.length;
    for (let i = 0; i < waveform.length; i++) {
      const t = (i / waveform.length) * duration;
      const inCut = silences.some(s => s.cut && t >= s.start && t <= s.end);
      ctx.fillStyle = inCut ? "rgba(196,82,106,0.8)" : "rgba(255,255,255,0.7)";
      const amp = waveform[i] * (H * 0.42);
      ctx.fillRect(i * bw, mid - amp, Math.max(1, bw - 0.4), amp * 2);
    }
  }, [waveform, duration, silences]);

  React.useEffect(() => { draw(); }, [draw]);

  const handleClick = e => {
    const rect = canvasRef.current.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    const hit = silences.find(s => t >= s.start && t <= s.end);
    if (hit) onToggle(hit.id);
  };

  return (
    <canvas
      ref={canvasRef}
      className="sc-mini-waveform"
      width={900} height={72}
      onClick={handleClick}
      title="Clic en zona roja/verde para cambiar"
      style={{ cursor: "pointer" }}
    />
  );
}

// ── ClipCard ──────────────────────────────────────────────────────────────
function ClipCard({ clip, index, total, onMove, onRemove, onToggle }) {
  const [open, setOpen] = useState(true);
  const cutCount = clip.silences?.filter(s => s.cut).length ?? 0;
  const savedTime = clip.silences?.filter(s => s.cut).reduce((t, s) => t + s.end - s.start, 0) ?? 0;

  return (
    <div className={`sc-clip-card${clip.error ? " sc-clip-card--error" : ""}`}>
      <div className="sc-clip-header">
        <div className="sc-clip-order">
          <button className="sc-order-btn" disabled={index === 0} onClick={() => onMove(clip.id, -1)} title="Subir">↑</button>
          <span className="sc-order-num">{index + 1}</span>
          <button className="sc-order-btn" disabled={index === total - 1} onClick={() => onMove(clip.id, 1)} title="Bajar">↓</button>
        </div>

        {clip.thumbnail
          ? <img className="sc-clip-thumb" src={clip.thumbnail} alt="" />
          : <div className="sc-clip-thumb sc-clip-thumb--placeholder">🎬</div>}

        <div className="sc-clip-info">
          <p className="sc-clip-name">{clip.name}</p>
          <p className="sc-clip-meta">
            {fmtSize(clip.size)}
            {clip.duration ? ` · ${fmtTime(clip.duration)}` : " · Cargando..."}
          </p>
          {clip.analyzed && !clip.error && (
            <div className="sc-clip-badges">
              <span className="sc-badge-cut">{cutCount} silencios · {fmtTime(savedTime)} ahorrados</span>
            </div>
          )}
          {clip.error && <p className="sc-clip-err">⚠ {clip.error}</p>}
        </div>

        <div className="sc-clip-actions">
          {clip.analyzed && !clip.error && (
            <button className="sc-expand-btn" onClick={() => setOpen(o => !o)}>{open ? "▲" : "▼"}</button>
          )}
          <button className="sc-remove-btn" onClick={() => onRemove(clip.id)} title="Quitar">✕</button>
        </div>
      </div>

      {clip.analyzed && !clip.error && open && (
        <div className="sc-clip-body">
          {clip.waveform && (
            <MiniWaveform
              waveform={clip.waveform}
              duration={clip.duration}
              silences={clip.silences}
              onToggle={sid => onToggle(clip.id, sid)}
            />
          )}
          {clip.silences?.length > 0 ? (
            <div className="sc-silence-items sc-silence-items--compact">
              {clip.silences.map(s => (
                <button key={s.id}
                  className={`sc-silence-item${s.cut ? " sc-silence-item--cut" : " sc-silence-item--keep"}`}
                  onClick={() => onToggle(clip.id, s.id)}
                >
                  <span className="sc-silence-range">{fmtTime(s.start)} – {fmtTime(s.end)}</span>
                  <span className="sc-silence-dur">{(s.end - s.start).toFixed(1)}s</span>
                  <span className="sc-silence-status">{s.cut ? "✕ Cortar" : "✓ Conservar"}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="sc-no-silences-msg">✨ No se detectaron silencios en este clip.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Grabación multi-clip en canvas ────────────────────────────────────────
async function recordAllClips(clips, onProgress, abortRef) {
  // Detectar resolución del primer clip
  const firstVid = document.createElement("video");
  const firstUrl = URL.createObjectURL(clips[0].file);
  firstVid.src = firstUrl;
  await new Promise(r => { firstVid.onloadedmetadata = r; firstVid.onerror = r; });
  const W = firstVid.videoWidth || 1280;
  const H = firstVid.videoHeight || 720;
  URL.revokeObjectURL(firstUrl);

  // Canvas + audio
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);

  const audioCtx = new AudioContext();
  const destination = audioCtx.createMediaStreamDestination();

  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    canvasStream.getVideoTracks()[0],
    destination.stream.getAudioTracks()[0],
  ]);

  const mimeType = getSupportedMimeType();
  const recorder = new MediaRecorder(combinedStream, { mimeType });
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start(100);

  const totalDuration = clips.reduce((t, c) => t + (c.duration || 0), 0);
  let elapsed = 0;

  for (let ci = 0; ci < clips.length; ci++) {
    if (abortRef.current) break;
    const clip = clips[ci];
    onProgress(elapsed / totalDuration, `Procesando clip ${ci + 1} de ${clips.length}: ${clip.name}`);

    await new Promise((resolve, reject) => {
      const videoEl = document.createElement("video");
      const url = URL.createObjectURL(clip.file);
      videoEl.src = url;
      videoEl.crossOrigin = "anonymous";

      videoEl.addEventListener("loadedmetadata", async () => {
        // Conectar audio
        let source;
        try {
          source = audioCtx.createMediaElementSource(videoEl);
          source.connect(destination);
        } catch (e) { /* silencioso — puede fallar si ya fue conectado */ }

        // Calcular letterbox
        const vW = videoEl.videoWidth || W;
        const vH = videoEl.videoHeight || H;
        const scale = Math.min(W / vW, H / vH);
        const dW = vW * scale, dH = vH * scale;
        const dX = (W - dW) / 2, dY = (H - dH) / 2;

        let animId;
        const drawLoop = () => {
          ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
          if (!videoEl.paused && !videoEl.ended) ctx.drawImage(videoEl, dX, dY, dW, dH);
          animId = requestAnimationFrame(drawLoop);
        };

        videoEl.currentTime = 0;
        await new Promise(r => { videoEl.onseeked = r; });

        const toRemove = (clip.silences || []).filter(s => s.cut);
        let inCut = false;

        videoEl.play();
        animId = requestAnimationFrame(drawLoop);

        const interval = setInterval(() => {
          if (abortRef.current) { clearInterval(interval); cancelAnimationFrame(animId); videoEl.pause(); resolve(); return; }

          const ct = videoEl.currentTime;
          const dur = clip.duration || videoEl.duration;
          onProgress((elapsed + ct) / totalDuration, `Procesando clip ${ci + 1} de ${clips.length}: ${clip.name}`);

          const inSilence = toRemove.some(s => ct >= s.start && ct < s.end);
          if (inSilence && !inCut) { inCut = true; videoEl.playbackRate = 16; videoEl.volume = 0; }
          else if (!inSilence && inCut) { inCut = false; videoEl.playbackRate = 1; videoEl.volume = 1; }

          if (videoEl.ended || ct >= dur - 0.1) {
            clearInterval(interval);
            cancelAnimationFrame(animId);
            videoEl.pause();
            if (source) try { source.disconnect(); } catch (_) {}
            URL.revokeObjectURL(url);
            resolve();
          }
        }, 60);
      });

      videoEl.onerror = () => { URL.revokeObjectURL(url); resolve(); }; // skip clip on error
    });

    elapsed += clip.duration || 0;
  }

  await new Promise(r => setTimeout(r, 400));

  return new Promise(resolve => {
    recorder.onstop = () => {
      audioCtx.close();
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.stop();
  });
}

// ── Componente principal ───────────────────────────────────────────────────
export default function SilenceCutter() {
  const [clips, setClips]         = useState([]);
  const [fase, setFase]           = useState("editor");
  const [preset, setPreset]       = useState("normal");
  const [progress, setProgress]   = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState("");
  const [dragOver, setDragOver]   = useState(false);
  const inputRef  = useRef(null);
  const abortRef  = useRef(false);

  const { noise: noiseDb, duration: minDur } = PRESETS[preset];

  // ── Agregar archivos ────────────────────────────────────────────────────
  const addFiles = useCallback(async (files) => {
    const valid = Array.from(files).filter(f =>
      /\.(mp4|mov|m4v|webm|avi)$/i.test(f.name) || f.type.startsWith("video/")
    );
    if (!valid.length) { setError("No se encontraron archivos de video válidos."); return; }
    setError("");

    const newClips = valid.map(f => ({
      id: uid(), file: f, name: f.name, size: f.size,
      thumbnail: null, duration: null, waveform: null, silences: [], analyzed: false, error: null,
    }));

    setClips(prev => [...prev, ...newClips]);

    // Generar thumbnails en paralelo
    newClips.forEach(async clip => {
      const thumb = await generateThumbnail(clip.file);
      setClips(prev => prev.map(c => c.id === clip.id ? { ...c, thumbnail: thumb } : c));
    });
  }, []);

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  // ── Analizar todos ──────────────────────────────────────────────────────
  const analizarTodos = async () => {
    if (!clips.length) return;
    setFase("analyzing");
    setError("");

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      setProgressMsg(`Analizando clip ${i + 1} de ${clips.length}: ${clip.name}`);
      setProgress(Math.round((i / clips.length) * 100));
      try {
        const { duration, waveform, silences } = await analyzeClip(clip.file, noiseDb, minDur);
        setClips(prev => prev.map(c => c.id === clip.id
          ? { ...c, duration, waveform, silences, analyzed: true, error: null }
          : c));
      } catch (err) {
        setClips(prev => prev.map(c => c.id === clip.id
          ? { ...c, analyzed: true, error: "No se pudo analizar el audio" }
          : c));
      }
    }

    setFase("editor");
  };

  // ── Toggle silencios ────────────────────────────────────────────────────
  const toggleSilence = (clipId, silenceId) => {
    setClips(prev => prev.map(c => c.id !== clipId ? c : {
      ...c, silences: c.silences.map(s => s.id === silenceId ? { ...s, cut: !s.cut } : s),
    }));
  };

  const toggleAllInClip = (clipId, cut) => {
    setClips(prev => prev.map(c => c.id !== clipId ? c : {
      ...c, silences: c.silences.map(s => ({ ...s, cut })),
    }));
  };

  // ── Reordenar ───────────────────────────────────────────────────────────
  const moveClip = (id, dir) => {
    setClips(prev => {
      const idx = prev.findIndex(c => c.id === id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const removeClip = (id) => setClips(prev => prev.filter(c => c.id !== id));

  // ── Exportar ────────────────────────────────────────────────────────────
  const exportar = async () => {
    const ready = clips.filter(c => c.analyzed && !c.error);
    if (!ready.length) { setError("Analiza los clips primero."); return; }

    abortRef.current = false;
    setFase("cutting");
    setProgress(0);
    setError("");

    try {
      const blob = await recordAllClips(ready, (p, msg) => {
        setProgress(Math.round(p * 100));
        setProgressMsg(msg);
      }, abortRef);

      const totalOriginal = ready.reduce((t, c) => t + (c.duration || 0), 0);
      const totalCut = ready.reduce((t, c) =>
        t + c.silences.filter(s => s.cut).reduce((s, silence) => s + silence.end - silence.start, 0), 0);
      const totalCuts = ready.reduce((t, c) => t + c.silences.filter(s => s.cut).length, 0);

      setResult({
        url: URL.createObjectURL(blob),
        filename: (clips[0]?.name.replace(/\.[^/.]+$/, "") || "video") + "_editado.webm",
        totalOriginal,
        totalKept: totalOriginal - totalCut,
        totalCut,
        totalCuts,
        clipsCount: ready.length,
      });
      setFase("done");
    } catch (err) {
      if (err.message !== "Cancelado") setError("Error al exportar: " + err.message);
      setFase("editor");
    }
  };

  // ── Cálculos globales ───────────────────────────────────────────────────
  const analyzedCount = clips.filter(c => c.analyzed && !c.error).length;
  const totalCutTime  = clips.reduce((t, c) =>
    t + (c.silences?.filter(s => s.cut).reduce((s, si) => s + si.end - si.start, 0) ?? 0), 0);
  const totalCuts     = clips.reduce((t, c) => t + (c.silences?.filter(s => s.cut).length ?? 0), 0);

  // ── ANALYZING ────────────────────────────────────────────────────────────
  if (fase === "analyzing") return (
    <div className="sc-page sc-page--center">
      <Logo width={100} />
      <div className="sc-processing">
        <div className="sc-proc-rings">
          <div className="sc-proc-ring sc-proc-ring--1" /><div className="sc-proc-ring sc-proc-ring--2" /><div className="sc-proc-ring sc-proc-ring--3" />
          <span className="sc-proc-icon">🔍</span>
        </div>
        <h2 className="sc-proc-title">Analizando clips...</h2>
        <div className="sc-progress-bar-wrap" style={{ width: 320 }}>
          <div className="sc-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <p className="sc-proc-note">{progressMsg}</p>
      </div>
    </div>
  );

  // ── CUTTING ───────────────────────────────────────────────────────────────
  if (fase === "cutting") return (
    <div className="sc-page sc-page--center">
      <Logo width={100} />
      <div className="sc-processing">
        <div className="sc-proc-rings">
          <div className="sc-proc-ring sc-proc-ring--1" /><div className="sc-proc-ring sc-proc-ring--2" /><div className="sc-proc-ring sc-proc-ring--3" />
          <span className="sc-proc-icon">✂️</span>
        </div>
        <h2 className="sc-proc-title">Exportando video...</h2>
        <div className="sc-progress-bar-wrap" style={{ width: 320 }}>
          <div className="sc-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <p className="sc-proc-note">{progressMsg}</p>
        <p className="sc-proc-note sc-proc-note--small">El procesamiento ocurre en tiempo real. No cierres esta ventana.</p>
        <button className="sc-btn-ghost" style={{ marginTop: 16 }} onClick={() => { abortRef.current = true; }}>Cancelar</button>
      </div>
    </div>
  );

  // ── DONE ─────────────────────────────────────────────────────────────────
  if (fase === "done" && result) return (
    <div className="sc-page">
      <nav className="sc-nav"><Logo width={110} /><a href="/" className="sc-nav-link">Ir a la app →</a></nav>
      <div className="sc-done-wrap">
        <span className="sc-done-emoji">🎉</span>
        <h2 className="sc-done-title">¡Tu video está listo!</h2>
        <div className="sc-stats-grid">
          <div className="sc-stat"><span className="sc-stat-num">{result.clipsCount}</span><span className="sc-stat-label">Clips combinados</span></div>
          <div className="sc-stat"><span className="sc-stat-num">{result.totalCuts}</span><span className="sc-stat-label">Silencios eliminados</span></div>
          <div className="sc-stat"><span className="sc-stat-num">{fmtTime(result.totalCut)}</span><span className="sc-stat-label">Tiempo eliminado</span></div>
          <div className="sc-stat sc-stat--highlight"><span className="sc-stat-num">{fmtTime(result.totalKept)}</span><span className="sc-stat-label">Duración final</span></div>
        </div>
        <a className="sc-btn-primary sc-btn-download" href={result.url} download={result.filename}>⬇ Descargar video editado</a>
        <p className="sc-done-hint">Formato WebM · Compatible con YouTube, Instagram y WhatsApp</p>
        <button className="sc-btn-outline" onClick={() => { if (result?.url) URL.revokeObjectURL(result.url); setResult(null); setFase("editor"); }}>✂️ Editar más clips</button>
        <div className="sc-done-cta">
          <p>¿Quieres gestionar tu negocio, contenido y clientes en un solo lugar?</p>
          <a href="/">Crear mi cuenta en Mamá CEO →</a>
        </div>
      </div>
    </div>
  );

  // ── EDITOR ────────────────────────────────────────────────────────────────
  return (
    <div className="sc-page">
      <nav className="sc-nav"><Logo width={110} /><a href="/" className="sc-nav-link">Ir a la app →</a></nav>

      <div className="sc-editor-wrap">
        {/* Header */}
        <div className="sc-editor-header">
          <div>
            <h1 className="sc-editor-title">Editor de video</h1>
            <p className="sc-editor-sub">Agrega tus clips, detecta silencios automáticamente y exporta un solo video limpio.</p>
          </div>
          <span className="sc-badge">Herramienta gratuita · En tu dispositivo</span>
        </div>

        {/* Upload zone */}
        <div
          className={`sc-drop sc-drop--compact${dragOver ? " sc-drop--over" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <span className="sc-drop-icon" style={{ fontSize: 28 }}>＋</span>
          <div>
            <p className="sc-drop-title" style={{ fontSize: 16, margin: 0 }}>Agrega clips de video</p>
            <p className="sc-drop-formats" style={{ margin: "4px 0 0" }}>Arrastra o haz clic · .mp4, .mov, .webm · Múltiples archivos</p>
          </div>
        </div>
        <input ref={inputRef} type="file" accept="video/*,.mov,.mp4,.m4v,.webm" multiple style={{ display: "none" }}
          onChange={e => addFiles(e.target.files)} />

        {/* Controles globales */}
        {clips.length > 0 && (
          <div className="sc-toolbar">
            <div className="sc-toolbar-left">
              <span className="sc-toolbar-count">{clips.length} clip{clips.length !== 1 ? "s" : ""}</span>
              {analyzedCount > 0 && (
                <span className="sc-toolbar-summary">
                  · {totalCuts} silencios · {fmtTime(totalCutTime)} a eliminar
                </span>
              )}
            </div>
            <div className="sc-toolbar-right">
              <div className="sc-presets-row sc-presets-row--compact">
                {Object.entries(PRESETS).map(([key, p]) => (
                  <button key={key} className={`sc-preset-btn${preset === key ? " active" : ""}`} onClick={() => setPreset(key)}>
                    <span className="sc-preset-name">{p.label}</span>
                  </button>
                ))}
              </div>
              <button className="sc-btn-outline sc-btn-sm" onClick={analizarTodos}>
                🔍 Analizar {clips.length > 1 ? "todos" : ""}
              </button>
            </div>
          </div>
        )}

        {error && <p className="sc-error">{error}</p>}

        {/* Lista de clips */}
        {clips.length === 0 ? (
          <div className="sc-empty-state">
            <span>🎬</span>
            <p>Agrega tus clips arriba para empezar</p>
            <p className="sc-empty-hint">Puedes agregar múltiples videos y se combinarán en el orden que definas</p>
          </div>
        ) : (
          <div className="sc-clips-list">
            {clips.map((clip, i) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                index={i}
                total={clips.length}
                onMove={moveClip}
                onRemove={removeClip}
                onToggle={toggleSilence}
              />
            ))}
          </div>
        )}

        {/* Footer de acción */}
        {analyzedCount > 0 && (
          <div className="sc-export-footer">
            <div className="sc-export-summary">
              <p>
                <strong>{analyzedCount}</strong> clip{analyzedCount !== 1 ? "s" : ""} listos ·{" "}
                <strong>{totalCuts}</strong> silencios a cortar ·{" "}
                <strong>{fmtTime(totalCutTime)}</strong> eliminados
              </p>
            </div>
            <button className="sc-btn-primary sc-btn-export" onClick={exportar} disabled={totalCuts === 0 && analyzedCount > 0}>
              ✂️ Exportar video final
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
