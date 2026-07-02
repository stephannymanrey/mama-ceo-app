import React, { useState, useRef, useCallback } from "react";
import Logo from "./Logo";
import "./SilenceCutter.css";

const PRESETS = {
  conservadora: { noise: -45, duration: 0.8, label: "Conservadora", desc: "Solo silencios largos y obvios" },
  normal:       { noise: -35, duration: 0.5, label: "Normal",        desc: "Balance perfecto para redes sociales" },
  agresiva:     { noise: -28, duration: 0.3, label: "Agresiva",      desc: "Corta hasta las pausas más breves" },
};

const PADDING = 0.12; // segundos a conservar alrededor de cada corte

let ffmpegInstance = null;

function parseSilences(logs) {
  const silences = [];
  let currentStart = null;
  for (const line of logs) {
    const s = line.match(/silence_start:\s*([\d.]+)/);
    const e = line.match(/silence_end:\s*([\d.]+)/);
    if (s) currentStart = parseFloat(s[1]);
    if (e && currentStart !== null) {
      silences.push({ start: currentStart, end: parseFloat(e[1]) });
      currentStart = null;
    }
  }
  return silences;
}

function getKeepSegments(silences, duration) {
  const segments = [];
  let pos = 0;
  for (const { start, end } of silences) {
    const keepEnd = Math.max(0, start - PADDING);
    if (keepEnd > pos + 0.05) segments.push({ start: pos, end: keepEnd });
    pos = Math.min(duration, end + PADDING);
  }
  if (pos < duration - 0.05) segments.push({ start: pos, end: duration });
  return segments;
}

function buildConcatFile(segments, inputName = "input.mp4") {
  return segments
    .map(({ start, end }) => `file '${inputName}'\ninpoint ${start.toFixed(3)}\noutpoint ${end.toFixed(3)}`)
    .join("\n\n");
}

function getVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => { URL.revokeObjectURL(video.src); resolve(video.duration); };
    video.onerror = () => resolve(0);
  });
}

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SilenceCutter() {
  const [fase, setFase]       = useState("upload");
  const [file, setFile]       = useState(null);
  const [preset, setPreset]   = useState("normal");
  const [stepMsg, setStepMsg] = useState("");
  const [stepIdx, setStepIdx] = useState(0);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const STEPS = [
    "Cargando editor de video",
    "Analizando audio",
    "Calculando cortes",
    "Exportando video",
  ];

  const onFile = (f) => {
    if (!f) return;
    const validTypes = ["video/mp4", "video/quicktime", "video/x-m4v", "video/webm"];
    if (!validTypes.includes(f.type) && !f.name.match(/\.(mp4|mov|m4v|webm)$/i)) {
      setError("Formato no compatible. Usa .mp4, .mov o .m4v");
      return;
    }
    if (f.size > 2.5 * 1024 * 1024 * 1024) {
      setError("El archivo es demasiado grande (máximo 2.5 GB)");
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

  const processVideo = async () => {
    if (!file) return;
    setFase("processing");
    setError("");

    try {
      // Step 0 — cargar FFmpeg
      setStepIdx(0);
      setStepMsg(STEPS[0]);

      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

      if (!ffmpegInstance) {
        ffmpegInstance = new FFmpeg();
        const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
        try {
          await ffmpegInstance.load({
            coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
          });
        } catch (e) {
          ffmpegInstance = null;
          throw new Error(`No se pudo cargar el editor de video. Verifica tu conexión e intenta de nuevo. (${e.message})`);
        }
      }

      const ffmpeg = ffmpegInstance;
      const logs = [];
      const logHandler = ({ message }) => logs.push(message);
      ffmpeg.on("log", logHandler);

      // Escribir archivo en FS virtual
      setStepMsg("Cargando video...");
      const ext = file.name.match(/\.(mp4|mov|m4v|webm)$/i)?.[1]?.toLowerCase() || "mp4";
      const inputName = `input.${ext}`;
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // Step 1 — analizar audio
      setStepIdx(1);
      setStepMsg(STEPS[1]);

      const { noise, duration: minDur } = PRESETS[preset];
      await ffmpeg.exec([
        "-i", inputName,
        "-af", `silencedetect=noise=${noise}dB:d=${minDur}`,
        "-f", "null", "-",
      ]);

      // Step 2 — calcular cortes
      setStepIdx(2);
      const silences = parseSilences(logs);
      setStepMsg(`${STEPS[2]} · ${silences.length} silencio${silences.length !== 1 ? "s" : ""} encontrado${silences.length !== 1 ? "s" : ""}`);

      try { ffmpeg.off("log", logHandler); } catch (_) { /* ignorar si no existe */ }

      const duration = await getVideoDuration(file);

      if (silences.length === 0) {
        try { await ffmpeg.deleteFile(inputName); } catch (_) {}
        setResult({ noSilences: true, duration, filename: file.name });
        setFase("done");
        return;
      }

      const segments = getKeepSegments(silences, duration);
      const concatContent = buildConcatFile(segments, inputName);
      await ffmpeg.writeFile("concat.txt", concatContent);

      // Step 3 — exportar
      setStepIdx(3);
      setStepMsg(STEPS[3]);

      await ffmpeg.exec([
        "-f", "concat", "-safe", "0",
        "-i", "concat.txt",
        "-c", "copy",
        "output.mp4",
      ]);

      const data = await ffmpeg.readFile("output.mp4");
      const blob = new Blob([data.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);

      const savedTime = silences.reduce((sum, s) => sum + (s.end - s.start), 0);
      const editedDuration = Math.max(0, duration - savedTime + segments.length * PADDING * 2);

      try { await ffmpeg.deleteFile(inputName); } catch (_) {}
      try { await ffmpeg.deleteFile("concat.txt"); } catch (_) {}
      try { await ffmpeg.deleteFile("output.mp4"); } catch (_) {}

      setResult({
        url,
        originalDuration: duration,
        editedDuration,
        cuts: silences.length,
        savedTime,
        filename: file.name.replace(/\.[^/.]+$/i, "") + "_editado.mp4",
      });
      setFase("done");

    } catch (err) {
      console.error("SilenceCutter error:", err);
      setError(err.message || "Algo salió mal. Intenta de nuevo con un archivo .mp4.");
      setFase("upload");
      ffmpegInstance = null;
    }
  };

  const reset = () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setResult(null);
    setError("");
    setFase("upload");
    setStepIdx(0);
    setStepMsg("");
  };

  // ── UPLOAD ────────────────────────────────────────────────────────────────
  if (fase === "upload") return (
    <div className="sc-page">
      <nav className="sc-nav">
        <Logo width={110} />
        <a href="/" className="sc-nav-link">Ir a la app →</a>
      </nav>

      <div className="sc-hero">
        <span className="sc-badge">Herramienta gratuita · Funciona en tu dispositivo</span>
        <h1 className="sc-h1">Corta los silencios<br />en segundos</h1>
        <p className="sc-sub">Sube tu video y elimino automáticamente todos los silencios. El video nunca sale de tu dispositivo — todo ocurre aquí, en tu navegador.</p>
      </div>

      <div className="sc-card">
        <div
          className={`sc-drop${dragOver ? " sc-drop--over" : ""}${file ? " sc-drop--file" : ""}`}
          onClick={() => !file && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
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
              <button className="sc-file-remove" onClick={(e) => { e.stopPropagation(); setFile(null); }}>✕</button>
            </div>
          ) : (
            <>
              <span className="sc-drop-icon">✂️</span>
              <p className="sc-drop-title">Arrastra tu video aquí</p>
              <p className="sc-drop-hint">o haz clic para seleccionar</p>
              <p className="sc-drop-formats">.mp4 · .mov · .m4v · Máx. 2.5 GB · 20 min recomendado</p>
            </>
          )}
        </div>
        <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/x-m4v,.mp4,.mov,.m4v" style={{ display: "none" }} onChange={(e) => onFile(e.target.files[0])} />

        {/* Presets */}
        <div className="sc-presets">
          <p className="sc-presets-label">Intensidad de corte</p>
          <div className="sc-presets-row">
            {Object.entries(PRESETS).map(([key, p]) => (
              <button
                key={key}
                className={`sc-preset-btn${preset === key ? " active" : ""}`}
                onClick={() => setPreset(key)}
              >
                <span className="sc-preset-name">{p.label}</span>
                <span className="sc-preset-desc">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="sc-error">{error}</p>}

        <button className="sc-btn-primary" onClick={processVideo} disabled={!file}>
          ✂️ Cortar silencios
        </button>
        <p className="sc-privacy">Tu video no se sube a ningún servidor. Procesamiento 100% local.</p>
      </div>
    </div>
  );

  // ── PROCESSING ────────────────────────────────────────────────────────────
  if (fase === "processing") return (
    <div className="sc-page sc-page--center">
      <Logo width={100} />
      <div className="sc-processing">
        <div className="sc-proc-rings">
          <div className="sc-proc-ring sc-proc-ring--1" />
          <div className="sc-proc-ring sc-proc-ring--2" />
          <div className="sc-proc-ring sc-proc-ring--3" />
          <span className="sc-proc-icon">✂️</span>
        </div>
        <h2 className="sc-proc-title">Procesando tu video...</h2>
        <div className="sc-proc-steps">
          {STEPS.map((s, i) => (
            <div key={i} className={`sc-proc-step${i < stepIdx ? " done" : i === stepIdx ? " active" : ""}`}>
              <span className="sc-proc-dot">{i < stepIdx ? "✓" : i === stepIdx ? "◉" : "○"}</span>
              <span>{i === stepIdx ? stepMsg : s}</span>
            </div>
          ))}
        </div>
        <p className="sc-proc-note">No cierres esta ventana. Puede tomar 1-3 minutos.</p>
      </div>
    </div>
  );

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (fase === "done") return (
    <div className="sc-page">
      <nav className="sc-nav">
        <Logo width={110} />
        <a href="/" className="sc-nav-link">Ir a la app →</a>
      </nav>

      <div className="sc-done-wrap">
        {result?.noSilences ? (
          <div className="sc-no-silence">
            <span className="sc-done-emoji">✨</span>
            <h2 className="sc-done-title">¡Tu video ya está optimizado!</h2>
            <p className="sc-done-sub">No encontré silencios significativos. Tu video fluye bien tal como está.</p>
          </div>
        ) : (
          <>
            <span className="sc-done-emoji">🎉</span>
            <h2 className="sc-done-title">¡Tu video está listo!</h2>
            <div className="sc-stats-grid">
              <div className="sc-stat">
                <span className="sc-stat-num">{fmtTime(result.savedTime)}</span>
                <span className="sc-stat-label">Tiempo eliminado</span>
              </div>
              <div className="sc-stat">
                <span className="sc-stat-num">{result.cuts}</span>
                <span className="sc-stat-label">Cortes realizados</span>
              </div>
              <div className="sc-stat">
                <span className="sc-stat-num">{fmtTime(result.originalDuration)}</span>
                <span className="sc-stat-label">Duración original</span>
              </div>
              <div className="sc-stat sc-stat--highlight">
                <span className="sc-stat-num">{fmtTime(result.editedDuration)}</span>
                <span className="sc-stat-label">Duración editada</span>
              </div>
            </div>
            <a className="sc-btn-primary sc-btn-download" href={result.url} download={result.filename}>
              ⬇ Descargar video editado
            </a>
            <p className="sc-done-hint">Calidad idéntica al original · Sin marca de agua · Listo para subir</p>
          </>
        )}
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
