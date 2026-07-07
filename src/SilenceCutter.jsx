import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Logo from "./Logo";
import "./SilenceCutter.css";

const REELS_API = "https://lq3avrfazlfuyaakkt5iwz54ym0aqxvv.lambda-url.us-east-1.on.aws/";

// ── Constantes ────────────────────────────────────────────────────────────
const PRESETS = {
  conservadora: { noise: -45, duration: 0.8 },
  normal:       { noise: -35, duration: 0.5 },
  agresiva:     { noise: -28, duration: 0.3 },
};
const PADDING = 0.03;
const FONTS   = ["Poppins", "Montserrat", "Arial"];
const HL_COLORS = [
  { label: "Amarillo", c: "#FFE44D" },
  { label: "Rosa",     c: "#FF6B8A" },
  { label: "Blanco",   c: "#FFFFFF" },
  { label: "Verde",    c: "#4ADE80" },
];
const CLIP_COLORS   = ["#C4526A","#4A90BF","#5FB87A","#B07FD4","#D4955F","#5FB8B0"];
const TRANSITIONS   = [
  { id: "none",  icon: "—", label: "Sin efecto"     },
  { id: "fade",  icon: "◐", label: "Fundido negro"  },
  { id: "zoom",  icon: "⊕", label: "Zoom suave"     },
  { id: "flash", icon: "✦", label: "Flash blanco"   },
];
const SKIN_FILTERS  = [
  "blur(0.35px) contrast(1.05) saturate(1.05)",
  "blur(0.65px) contrast(1.08) saturate(1.07) brightness(1.01)",
  "blur(1.0px)  contrast(1.10) saturate(1.09) brightness(1.02)",
];
const BOKEH_BLUR    = [8, 14, 22];

// Presets de edición automática
const VIDEO_PRESETS = [
  { id: "natural",  icon: "🌿", label: "Natural",  values: { brightness: 8,  contrast: 5,  saturation: 5,   skin: 1, temperature: 0   } },
  { id: "warm",     icon: "☀️", label: "Cálida",   values: { brightness: 5,  contrast: 5,  saturation: 10,  skin: 1, temperature: 35  } },
  { id: "vibrant",  icon: "✨", label: "Vibrante", values: { brightness: 5,  contrast: 12, saturation: 25,  skin: 1, temperature: 0   } },
  { id: "fresh",    icon: "❄️", label: "Fresca",   values: { brightness: 5,  contrast: 10, saturation: 5,   skin: 0, temperature: -30 } },
  { id: "cinema",   icon: "🎬", label: "Cinema",   values: { brightness: -5, contrast: 18, saturation: -12, skin: 0, temperature: -15 } },
  { id: "none",     icon: "—",  label: "Sin efecto", values: { brightness: 0, contrast: 0,  saturation: 0,   skin: 0, temperature: 0, bokeh: 0 } },
];

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

// Construye el filtro CSS combinado: corrección de color + suavizante de piel
function buildVidFilter(brightness, contrast, saturation, skin) {
  const parts = [];
  if (brightness) parts.push(`brightness(${(1 + brightness / 100).toFixed(2)})`);
  if (contrast)   parts.push(`contrast(${(1 + contrast / 100).toFixed(2)})`);
  if (saturation) parts.push(`saturate(${(1 + saturation / 100).toFixed(2)})`);
  if (skin > 0)   parts.push(SKIN_FILTERS[skin - 1]);
  return parts.length ? parts.join(" ") : null;
}

function getSupportedMimeType() {
  return ["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm","video/mp4"]
    .find(t => MediaRecorder.isTypeSupported(t)) || "video/webm";
}

// ── Segmentos conservados ─────────────────────────────────────────────────
function buildKeptSegments(clips) {
  return clips
    .filter(c => c.analyzed && !c.error)
    .flatMap(clip => {
      const dur  = clip.duration || 0;
      const cuts = (clip.silences || []).filter(s => s.cut).sort((a, b) => a.start - b.start);
      const segs = [];
      let pos = 0;
      for (const s of cuts) {
        if (s.start > pos + 0.05) segs.push({ clip, start: pos, end: s.start });
        pos = s.end;
      }
      if (pos < dur - 0.05) segs.push({ clip, start: pos, end: dur });
      if (!segs.length) segs.push({ clip, start: 0, end: dur });
      return segs;
    });
}

function effectiveToNative(keptSegs, et) {
  let elapsed = 0;
  for (const seg of keptSegs) {
    const d = seg.end - seg.start;
    if (et <= elapsed + d) return { clip: seg.clip, localTime: seg.start + (et - elapsed) };
    elapsed += d;
  }
  const last = keptSegs[keptSegs.length - 1];
  return last ? { clip: last.clip, localTime: last.end } : null;
}

function nativeToEffective(keptSegs, clipId, lt) {
  let elapsed = 0;
  for (const seg of keptSegs) {
    const d = seg.end - seg.start;
    if (seg.clip.id === clipId && lt >= seg.start && lt < seg.end)
      return elapsed + (lt - seg.start);
    elapsed += d;
  }
  return null;
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

// ── Transcripción (Whisper Tiny) ──────────────────────────────────────────
let _asr = null;
async function loadTranscriber(onProgress) {
  if (_asr) return _asr;
  const { pipeline } = await import("@xenova/transformers");
  _asr = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", {
    progress_callback: onProgress,
  });
  return _asr;
}

// Extrae solo los segmentos conservados (sin silencios eliminados) y resamplea a 16kHz.
// Devuelve {audio, mappingRanges} donde mappingRanges permite convertir el tiempo
// condensado que devuelve Whisper al tiempo real del video original.
async function getKeptAudioMono16k(file, silences) {
  const TARGET_SR = 16000;
  const buf = await file.arrayBuffer();
  const audioCtx = new AudioContext();
  const decoded = await audioCtx.decodeAudioData(buf);
  audioCtx.close();
  const dur = decoded.duration;

  // Rangos conservados = todo lo que NO está marcado como cut
  const cuts = (silences || []).filter(s => s.cut).sort((a, b) => a.start - b.start);
  const keptRanges = [];
  let pos = 0;
  for (const s of cuts) {
    if (s.start > pos + 0.05) keptRanges.push({ start: pos, end: s.start });
    pos = s.end;
  }
  if (pos < dur - 0.05) keptRanges.push({ start: pos, end: dur });
  if (!keptRanges.length) keptRanges.push({ start: 0, end: dur });

  // Resamplear el audio completo a 16 kHz
  const offline = new OfflineAudioContext(1, Math.ceil(dur * TARGET_SR), TARGET_SR);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const resampled = await offline.startRendering();
  const fullData = resampled.getChannelData(0);

  // Concatenar solo los tramos conservados
  const parts = [];
  let condensedSamples = 0;
  for (const r of keptRanges) {
    const from = Math.floor(r.start * TARGET_SR);
    const to   = Math.min(Math.ceil(r.end * TARGET_SR), fullData.length);
    parts.push({ data: fullData.slice(from, to), originalStart: r.start, condensedStart: condensedSamples / TARGET_SR });
    condensedSamples += to - from;
  }
  const combined = new Float32Array(condensedSamples);
  let off = 0;
  for (const p of parts) { combined.set(p.data, off); off += p.data.length; }

  const mappingRanges = parts.map(p => ({
    originalStart:  p.originalStart,
    originalEnd:    p.originalStart + p.data.length / TARGET_SR,
    condensedStart: p.condensedStart,
  }));
  return { audio: combined, mappingRanges };
}

// Convierte tiempo condensado (en el audio sin silencios) → tiempo real del video
function mapCondensedToOriginal(t, mappingRanges) {
  for (const r of mappingRanges) {
    const dur = r.originalEnd - r.originalStart;
    if (t >= r.condensedStart && t <= r.condensedStart + dur + 0.001)
      return r.originalStart + (t - r.condensedStart);
  }
  const last = mappingRanges[mappingRanges.length - 1];
  return last ? last.originalEnd : t;
}

// silences: array de silencios del clip — pasarlos siempre para evitar
// que Whisper alucine sobre zonas de silencio y repita frases.
async function transcribeClip(file, silences, onModelProgress) {
  const asr = await loadTranscriber(onModelProgress);
  const { audio, mappingRanges } = await getKeptAudioMono16k(file, silences);
  const result = await asr(audio, {
    language: "spanish", task: "transcribe",
    return_timestamps: "word", chunk_length_s: 30, stride_length_s: 5,
  });
  return (result.chunks || []).map(c => {
    const cs = c.timestamp[0] ?? 0;
    const ce = c.timestamp[1] ?? (cs + 0.5);
    return {
      word:  c.text.replace(/^\s+/, ""),
      start: mapCondensedToOriginal(cs, mappingRanges),
      end:   mapCondensedToOriginal(ce, mappingRanges),
    };
  }).filter(s => s.word);
}

// ── Bokeh (MediaPipe Selfie Segmentation) ─────────────────────────────────
async function loadBokehSegmenter() {
  if (!window.SelfieSegmentation) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/selfie_segmentation.js";
      s.crossOrigin = "anonymous";
      s.onload = resolve;
      s.onerror = () => reject(new Error("No se pudo cargar el modelo de fondo"));
      document.head.appendChild(s);
    });
  }
  const seg = new window.SelfieSegmentation({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/${f}`,
  });
  seg.setOptions({ modelSelection: 1 }); // landscape model = mejor calidad
  await seg.initialize();
  return seg;
}

// ── Subtítulos ────────────────────────────────────────────────────────────
function drawSubtitle(ctx, W, H, time, words, style = {}) {
  if (!words?.length) return;
  const font    = style.font    || "Poppins";
  const hlColor = style.hlColor || "#FFE44D";
  const fs      = Math.max(24, Math.floor(H / 17));
  const GROUP   = 5;

  let idx = words.findIndex(w => time >= w.start && time <= w.end);
  if (idx === -1) {
    const prev = [...words].reverse().find(w => time > w.end);
    if (!prev) return;
    idx = words.indexOf(prev);
    const nextGroup = Math.floor(idx / GROUP) * GROUP + GROUP;
    if (nextGroup < words.length && words[nextGroup].start - time > 1.2) return;
  }
  const groupStart = Math.floor(idx / GROUP) * GROUP;
  const group = words.slice(groupStart, groupStart + GROUP);

  ctx.save();
  ctx.font = `800 ${fs}px "${font}", sans-serif`;
  ctx.textBaseline = "alphabetic";

  const wMeasures = group.map((w, i) =>
    ctx.measureText(w.word + (i < group.length - 1 ? " " : "")).width
  );
  let totalW = wMeasures.reduce((a, b) => a + b, 0);
  const maxW = W * 0.84;
  if (totalW > maxW) {
    const newFs = Math.floor(fs * (maxW / totalW));
    ctx.font = `800 ${newFs}px "${font}", sans-serif`;
    wMeasures.forEach((_, i) => {
      wMeasures[i] = ctx.measureText(group[i].word + (i < group.length - 1 ? " " : "")).width;
    });
    totalW = wMeasures.reduce((a, b) => a + b, 0);
  }

  const y = H - Math.floor(H / 10);
  let x = W / 2 - totalW / 2;

  group.forEach((w, i) => {
    const isCurrent = time >= w.start && time <= w.end;
    const isPast    = time > w.end;
    const wordText  = w.word + (i < group.length - 1 ? " " : "");
    const wordW     = ctx.measureText(w.word).width;
    if (isCurrent) {
      const bPadX = fs * 0.22, bPadY = fs * 0.15;
      ctx.fillStyle = hlColor;
      ctx.beginPath();
      ctx.roundRect(x - bPadX, y - fs - bPadY, wordW + bPadX * 2, fs + bPadY * 2, 6);
      ctx.fill();
      ctx.fillStyle = "#1a1a2e";
    } else {
      ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 6;
      ctx.fillStyle = isPast ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.95)";
    }
    ctx.fillText(wordText, x, y);
    ctx.shadowBlur = 0;
    x += wMeasures[i];
  });
  ctx.restore();
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

function groupSegments(words, perLine = 5) {
  if (!words?.length) return [];
  const lines = [];
  for (let i = 0; i < words.length; i += perLine) {
    const g = words.slice(i, i + perLine);
    lines.push({ id: i, startIdx: i, endIdx: i + g.length,
      start: g[0].start, end: g[g.length - 1].end,
      text: g.map(w => w.word).join(" "), words: g });
  }
  return lines;
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
  useEffect(() => { draw(); }, [draw]);
  const handleClick = e => {
    const rect = canvasRef.current.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    const hit = silences.find(s => t >= s.start && t <= s.end);
    if (hit) onToggle(hit.id);
  };
  return (
    <canvas ref={canvasRef} className="sc-mini-waveform" width={900} height={72}
      onClick={handleClick} style={{ cursor: "pointer" }} />
  );
}

// ── ClipCard ──────────────────────────────────────────────────────────────
function ClipCard({ clip, index, total, onMove, onRemove, onToggle }) {
  const [open, setOpen] = useState(true);
  const cutCount  = clip.silences?.filter(s => s.cut).length ?? 0;
  const savedTime = clip.silences?.filter(s => s.cut).reduce((t, s) => t + s.end - s.start, 0) ?? 0;
  return (
    <div className={`sc-clip-card${clip.error ? " sc-clip-card--error" : ""}`}>
      <div className="sc-clip-header">
        <div className="sc-clip-order">
          <button className="sc-order-btn" disabled={index === 0} onClick={() => onMove(clip.id, -1)}>↑</button>
          <span className="sc-order-num">{index + 1}</span>
          <button className="sc-order-btn" disabled={index === total - 1} onClick={() => onMove(clip.id, 1)}>↓</button>
        </div>
        {clip.thumbnail
          ? <img className="sc-clip-thumb" src={clip.thumbnail} alt="" />
          : <div className="sc-clip-thumb sc-clip-thumb--placeholder">🎬</div>}
        <div className="sc-clip-info">
          <p className="sc-clip-name">{clip.name}</p>
          <p className="sc-clip-meta">{fmtSize(clip.size)}{clip.duration ? ` · ${fmtTime(clip.duration)}` : " · Cargando..."}</p>
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
          <button className="sc-remove-btn" onClick={() => onRemove(clip.id)}>✕</button>
        </div>
      </div>
      {clip.analyzed && !clip.error && open && (
        <div className="sc-clip-body">
          {clip.waveform && (
            <MiniWaveform waveform={clip.waveform} duration={clip.duration}
              silences={clip.silences} onToggle={sid => onToggle(clip.id, sid)} />
          )}
          {clip.silences?.length > 0 ? (
            <div className="sc-silence-items">
              {clip.silences.map(s => (
                <button key={s.id}
                  className={`sc-silence-item${s.cut ? " sc-silence-item--cut" : " sc-silence-item--keep"}`}
                  onClick={() => onToggle(clip.id, s.id)}>
                  <span className="sc-silence-range">{fmtTime(s.start)}–{fmtTime(s.end)}</span>
                  <span className="sc-silence-dur">{(s.end - s.start).toFixed(1)}s</span>
                  <span className="sc-silence-status">{s.cut ? "✕" : "✓"}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="sc-no-silences-msg">✨ No se detectaron silencios.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Grabación multi-clip ──────────────────────────────────────────────────
async function recordAllClips(clips, onProgress, abortRef, subtitleStyle = {}, format = "landscape", effects = {}) {
  const firstVid = document.createElement("video");
  const firstUrl = URL.createObjectURL(clips[0].file);
  firstVid.src = firstUrl;
  await new Promise(r => { firstVid.onloadedmetadata = r; firstVid.onerror = r; });
  const W = firstVid.videoWidth || 1280, H = firstVid.videoHeight || 720;
  URL.revokeObjectURL(firstUrl);

  // Dimensiones de salida según formato
  const outW = format === "portrait" ? Math.round(H * 9 / 16)
             : format === "square"   ? Math.min(W, H)
             : W;
  const outH = format === "square"   ? Math.min(W, H) : H;

  const canvas = document.createElement("canvas");
  canvas.width = outW; canvas.height = outH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, outW, outH);

  const audioCtx = new AudioContext();
  const destination = audioCtx.createMediaStreamDestination();
  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    canvasStream.getVideoTracks()[0],
    destination.stream.getAudioTracks()[0],
  ]);
  const mimeType = getSupportedMimeType();
  const recorder = new MediaRecorder(combinedStream, {
    mimeType, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 192_000,
  });
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start(100);

  const totalDuration = clips.reduce((t, c) => t + (c.duration || 0), 0);
  let elapsed = 0;

  for (let ci = 0; ci < clips.length; ci++) {
    if (abortRef.current) break;
    const clip = clips[ci];
    onProgress(elapsed / totalDuration, `Procesando clip ${ci + 1} de ${clips.length}: ${clip.name}`);

    await new Promise(resolve => {
      const videoEl = document.createElement("video");
      const url = URL.createObjectURL(clip.file);
      videoEl.src = url; videoEl.crossOrigin = "anonymous";

      videoEl.addEventListener("loadedmetadata", async () => {
        let source;
        try { source = audioCtx.createMediaElementSource(videoEl); source.connect(destination); } catch (_) {}
        const vW = videoEl.videoWidth || W, vH = videoEl.videoHeight || H;
        const scale = Math.min(outW / vW, outH / vH);
        const dW = vW * scale, dH = vH * scale, dX = (outW - dW) / 2, dY = (outH - dH) / 2;

        let animId;
        const drawLoop = () => {
          ctx.fillStyle = "#000"; ctx.fillRect(0, 0, outW, outH);
          if (!videoEl.paused && !videoEl.ended) {
            if (format !== "landscape") {
              const bgS = Math.max(outW / vW, outH / vH);
              const bgW = vW * bgS, bgH = vH * bgS;
              const bgX = (outW - bgW) / 2, bgY = (outH - bgH) / 2;
              ctx.save(); ctx.filter = "blur(20px) brightness(0.6) saturate(1.4)";
              ctx.drawImage(videoEl, bgX, bgY, bgW, bgH);
              ctx.restore();
            }
            // Aplicar corrección de color + skin al frame principal
            const { brightness = 0, contrast = 0, saturation = 0, skin = 0, temperature = 0 } = effects;
            const vf = buildVidFilter(brightness, contrast, saturation, skin);
            if (vf) { ctx.save(); ctx.filter = vf; }
            ctx.drawImage(videoEl, dX, dY, dW, dH);
            if (vf) ctx.restore();
            // Temperatura
            if (temperature !== 0) {
              ctx.save();
              ctx.globalCompositeOperation = "overlay";
              ctx.globalAlpha = Math.abs(temperature) / 250;
              ctx.fillStyle = temperature > 0 ? "rgb(255,140,0)" : "rgb(30,100,255)";
              ctx.fillRect(0, 0, outW, outH);
              ctx.restore();
            }
            drawSubtitle(ctx, outW, outH, videoEl.currentTime, clip.segments, subtitleStyle);
          }
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
            clearInterval(interval); cancelAnimationFrame(animId); videoEl.pause();
            if (source) try { source.disconnect(); } catch (_) {}
            URL.revokeObjectURL(url); resolve();
          }
        }, 60);
      });
      videoEl.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    });
    elapsed += clip.duration || 0;
  }

  await new Promise(r => setTimeout(r, 400));
  return new Promise(resolve => {
    recorder.onstop = () => { audioCtx.close(); resolve(new Blob(chunks, { type: mimeType })); };
    recorder.stop();
  });
}

// ── Exportar un fragmento individual ─────────────────────────────────────
async function recordSingleFragment(clip, start, end, onProgress, subtitleStyle = {}, format = "portrait", effects = {}) {
  const firstVid = document.createElement("video");
  const firstUrl = URL.createObjectURL(clip.file);
  firstVid.src = firstUrl;
  await new Promise(r => { firstVid.onloadedmetadata = r; firstVid.onerror = r; });
  const W = firstVid.videoWidth || 1280, H = firstVid.videoHeight || 720;
  URL.revokeObjectURL(firstUrl);

  const outW = format === "portrait" ? Math.round(H * 9 / 16) : format === "square" ? Math.min(W, H) : W;
  const outH = format === "square" ? Math.min(W, H) : H;

  const canvas = document.createElement("canvas");
  canvas.width = outW; canvas.height = outH;
  const ctx = canvas.getContext("2d");

  const audioCtx = new AudioContext();
  const destination = audioCtx.createMediaStreamDestination();
  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([canvasStream.getVideoTracks()[0], destination.stream.getAudioTracks()[0]]);
  const mimeType = getSupportedMimeType();
  const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 192_000 });
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start(100);

  const segDuration = Math.max(0.1, end - start);
  const { brightness = 0, contrast = 0, saturation = 0, skin = 0, temperature = 0 } = effects;
  const vf = buildVidFilter(brightness, contrast, saturation, skin);

  await new Promise(resolve => {
    const vid = document.createElement("video");
    const url = URL.createObjectURL(clip.file);
    vid.src = url; vid.crossOrigin = "anonymous";
    vid.addEventListener("loadedmetadata", async () => {
      let src;
      try { src = audioCtx.createMediaElementSource(vid); src.connect(destination); } catch (_) {}
      const vW = vid.videoWidth || W, vH = vid.videoHeight || H;
      const scale = Math.min(outW / vW, outH / vH);
      const dW = vW * scale, dH = vH * scale, dX = (outW - dW) / 2, dY = (outH - dH) / 2;

      let animId;
      const drawLoop = () => {
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, outW, outH);
        if (!vid.paused && !vid.ended) {
          if (format !== "landscape") {
            const bgS = Math.max(outW / vW, outH / vH);
            const bgW = vW * bgS, bgH = vH * bgS;
            ctx.save(); ctx.filter = "blur(20px) brightness(0.6) saturate(1.4)";
            ctx.drawImage(vid, (outW - bgW) / 2, (outH - bgH) / 2, bgW, bgH);
            ctx.restore();
          }
          if (vf) { ctx.save(); ctx.filter = vf; }
          ctx.drawImage(vid, dX, dY, dW, dH);
          if (vf) ctx.restore();
          if (temperature !== 0) {
            ctx.save(); ctx.globalCompositeOperation = "overlay";
            ctx.globalAlpha = Math.abs(temperature) / 250;
            ctx.fillStyle = temperature > 0 ? "rgb(255,140,0)" : "rgb(30,100,255)";
            ctx.fillRect(0, 0, outW, outH); ctx.restore();
          }
          drawSubtitle(ctx, outW, outH, vid.currentTime, clip.segments, subtitleStyle);
        }
        animId = requestAnimationFrame(drawLoop);
      };

      vid.currentTime = Math.max(0, start);
      await new Promise(r => { vid.onseeked = r; });
      vid.play().catch(() => {});
      animId = requestAnimationFrame(drawLoop);

      const interval = setInterval(() => {
        const ct = vid.currentTime;
        if (onProgress) onProgress(Math.min(1, (ct - start) / segDuration));
        if (ct >= end - 0.05 || vid.ended) {
          clearInterval(interval); cancelAnimationFrame(animId); vid.pause();
          if (src) try { src.disconnect(); } catch (_) {}
          URL.revokeObjectURL(url); resolve();
        }
      }, 50);
    });
    vid.onerror = () => { URL.revokeObjectURL(url); resolve(); };
  });

  recorder.stop();
  return new Promise(res => {
    recorder.onstop = () => { audioCtx.close(); res(new Blob(chunks, { type: mimeType })); };
  });
}

// ── SegmentRow ────────────────────────────────────────────────────────────
function SegmentRow({ line, isActive, onEdit, onSeek }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(line.text);
  const ref = useRef(null);
  useEffect(() => { setVal(line.text); }, [line.text]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const commit = () => {
    setEditing(false);
    if (val.trim() && val.trim() !== line.text) onEdit(val.trim());
  };
  return (
    <div className={`sce-seg-row${isActive ? " sce-seg-row--active" : ""}`}>
      <button className="sce-seg-time" onClick={() => onSeek(line.start)}>{fmtTime(line.start)}</button>
      {editing ? (
        <input ref={ref} className="sce-seg-input" value={val}
          onChange={e => setVal(e.target.value)} onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(line.text); setEditing(false); } }} />
      ) : (
        <button className="sce-seg-text" onClick={() => setEditing(true)}>{line.text}</button>
      )}
    </div>
  );
}

// ── SubtitlePanel ─────────────────────────────────────────────────────────
function SubtitlePanel({ clips, setClips, currentClipId, localTime, subtitleStyle, onStyleChange,
    onTranscribe, onSeekInClip, listRef, transcribing, transcribeMsg }) {
  const hasSubtitles = clips.some(c => c.transcribed && c.segments?.length);
  const handleEdit = (clip, line, newText) => {
    const words = newText.trim().split(/\s+/);
    const dur   = line.end - line.start;
    const newWords = words.map((w, i) => ({
      word: w, start: line.start + (i / words.length) * dur, end: line.start + ((i + 1) / words.length) * dur,
    }));
    setClips(prev => prev.map(c => c.id !== clip.id ? c : {
      ...c, segments: [...(c.segments || []).slice(0, line.startIdx), ...newWords, ...(c.segments || []).slice(line.endIdx)],
    }));
  };
  const transcribedClips = clips.filter(c => c.transcribed && c.segments?.length);

  return (
    <div className="sce-sub-panel">
      <div className="sce-panel-header">
        <span className="sce-panel-title">Subtítulos</span>
        {!transcribing && (
          <button className={`sc-btn-subs sc-btn-sm sc-btn-outline${hasSubtitles ? " sce-regen-btn" : ""}`}
            onClick={onTranscribe}>
            {hasSubtitles ? "↺ Re-generar" : "💬 Generar"}
          </button>
        )}
      </div>

      {transcribing ? (
        <div className="sce-transcribing">
          <div className="sce-trans-spinner" />
          <p className="sce-trans-msg">{transcribeMsg || "Generando subtítulos..."}</p>
          <p className="sce-trans-hint">Whisper Tiny · Español · Primera vez ~77 MB</p>
        </div>
      ) : (
        <>
          {hasSubtitles && (
            <div className="sce-sub-style">
              <div className="sc-font-pills">
                {FONTS.map(f => (
                  <button key={f} className={`sc-font-pill${subtitleStyle.font === f ? " active" : ""}`}
                    style={{ fontFamily: f }} onClick={() => onStyleChange({ ...subtitleStyle, font: f })}>{f}</button>
                ))}
              </div>
              <div className="sc-color-swatches">
                {HL_COLORS.map(opt => (
                  <button key={opt.c} className={`sc-color-swatch${subtitleStyle.hlColor === opt.c ? " active" : ""}`}
                    style={{ "--sw": opt.c }} onClick={() => onStyleChange({ ...subtitleStyle, hlColor: opt.c })} title={opt.label}>
                    <span className="sc-swatch-dot" />{opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="sce-seg-list" ref={listRef}>
            {transcribedClips.map(clip => {
              const lines = groupSegments(clip.segments);
              return (
                <React.Fragment key={clip.id}>
                  {transcribedClips.length > 1 && (
                    <p className="sce-seg-clip-label">{clip.name.replace(/\.[^/.]+$/, "")}</p>
                  )}
                  {lines.map((line, li) => {
                    const isActive = clip.id === currentClipId && localTime >= line.start && localTime <= line.end;
                    return (
                      <SegmentRow key={li} line={line} isActive={isActive}
                        onSeek={t => onSeekInClip(clip.id, t)}
                        onEdit={newText => handleEdit(clip, line, newText)} />
                    );
                  })}
                </React.Fragment>
              );
            })}
            {!hasSubtitles && (
              <div className="sce-no-subs">
                <p>Genera subtítulos automáticos con IA</p>
                <p className="sce-no-subs-hint">Whisper Tiny · sincronizado palabra por palabra</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Timeline contraído ────────────────────────────────────────────────────
function ClipTimeline({ keptSegs, totalKept, effectiveTime, onSeek, allClips, onMoveClip, onRemoveClip, onAddFiles }) {
  const pct = totalKept > 0 ? Math.min(100, (effectiveTime / totalKept) * 100) : 0;

  const handleTrackClick = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(p * totalKept);
  };

  return (
    <div className="sce-timeline">
      <div className="sce-tl-header">
        <span className="sce-tl-label">TIMELINE</span>
        <span className="sce-tl-duration">{fmtTime(effectiveTime)} / {fmtTime(totalKept)}</span>
      </div>
      <div className="sce-tl-body">
        {/* Track contraído */}
        <div className="sce-tl-track" onClick={handleTrackClick}>
          {keptSegs.length === 0 && (
            <div className="sce-tl-empty">Analiza los clips para ver el timeline</div>
          )}
          {keptSegs.map((seg, i) => {
            const w = (seg.end - seg.start) / (totalKept || 1) * 100;
            const clipIdx = allClips.findIndex(c => c.id === seg.clip.id);
            const color = CLIP_COLORS[clipIdx % CLIP_COLORS.length] || "#C4526A";
            return (
              <div key={i} className="sce-tl-seg"
                style={{ width: `${w}%`, "--seg-color": color }}
                title={`${seg.clip.name.replace(/\.[^/.]+$/, "")} · ${fmtTime(seg.start)}–${fmtTime(seg.end)}`}>
                <span className="sce-tl-seg-label">{seg.clip.name.replace(/\.[^/.]+$/, "").slice(0, 14)}</span>
              </div>
            );
          })}
          {totalKept > 0 && <div className="sce-tl-ph" style={{ left: `${pct}%` }} />}
        </div>

        {/* Sidebar de clips */}
        <div className="sce-tl-mgmt">
          {allClips.map((clip, i) => (
            <div key={clip.id} className="sce-tl-clip-row">
              <span className="sce-tl-clip-idx"
                style={{ "--ci-color": CLIP_COLORS[i % CLIP_COLORS.length] }}>{i + 1}</span>
              <span className="sce-tl-clip-title">{clip.name.replace(/\.[^/.]+$/, "")}</span>
              {clip.duration && <span className="sce-tl-clip-dur">{fmtTime(clip.duration)}</span>}
              <div className="sce-tl-btns">
                <button disabled={i === 0} onClick={e => { e.stopPropagation(); onMoveClip(clip.id, -1); }}>↑</button>
                <button disabled={i === allClips.length - 1} onClick={e => { e.stopPropagation(); onMoveClip(clip.id, 1); }}>↓</button>
                <button className="sce-tl-rm" onClick={e => { e.stopPropagation(); onRemoveClip(clip.id); }}>✕</button>
              </div>
            </div>
          ))}
          <button className="sce-tl-add-clip" onClick={onAddFiles}>＋ Agregar clip</button>
        </div>
      </div>
    </div>
  );
}

// ── EffectsPanel ─────────────────────────────────────────────────────────
function EffectsPanel({ effects, onEffectChange, bokehLoading, onToggleBokeh, bokehReady }) {
  const [showFine, setShowFine] = useState(false);

  const applyPreset = (preset) => {
    onEffectChange({
      transition: effects.transition, transitionSecs: effects.transitionSecs,
      bokeh: effects.bokeh,
      ...preset.values,
      _preset: preset.id,
    });
  };

  const setFine = (key, val) => onEffectChange({ ...effects, [key]: val, _preset: "custom" });

  return (
    <div className="sce-effects-panel">

      {/* Presets de estilo */}
      <div className="sce-fx-section">
        <p className="sce-fx-section-label">ESTILO DE VIDEO</p>
        <div className="sce-preset-grid">
          {VIDEO_PRESETS.map(p => (
            <button key={p.id}
              className={`sce-preset-card${effects._preset === p.id ? " active" : ""}`}
              onClick={() => applyPreset(p)}>
              <span className="sce-preset-icon">{p.icon}</span>
              <span className="sce-preset-label">{p.label}</span>
            </button>
          ))}
        </div>
        {effects._preset === "natural" && (
          <p className="sce-fx-hint" style={{ color: "#5FB87A" }}>✓ Edición base aplicada — listo para exportar</p>
        )}
      </div>

      {/* Transiciones */}
      <div className="sce-fx-section">
        <p className="sce-fx-section-label">TRANSICIÓN ENTRE CLIPS</p>
        <div className="sce-fx-trans-grid">
          {TRANSITIONS.map(t => (
            <button key={t.id}
              className={`sce-fx-trans${effects.transition === t.id ? " active" : ""}`}
              onClick={() => onEffectChange({ ...effects, transition: t.id })}>
              <span className="sce-fx-trans-icon">{t.icon}</span>
              <span className="sce-fx-trans-label">{t.label}</span>
            </button>
          ))}
        </div>
        {effects.transition !== "none" && (
          <div className="sce-fx-slider-row" style={{ marginTop: 8 }}>
            <span>Duración</span>
            <input type="range" min="0.2" max="1.2" step="0.1" className="sce-fx-slider"
              value={effects.transitionSecs}
              onChange={e => onEffectChange({ ...effects, transitionSecs: +e.target.value })} />
            <span>{effects.transitionSecs}s</span>
          </div>
        )}
      </div>

      {/* Bokeh */}
      <div className="sce-fx-section">
        <div className="sce-fx-row">
          <p className="sce-fx-section-label">BOKEH DE FONDO</p>
          <button className={`sce-fx-toggle${effects.bokeh ? " active" : ""}${bokehLoading ? " loading" : ""}`}
            onClick={onToggleBokeh} disabled={bokehLoading}>
            {bokehLoading ? "..." : effects.bokeh ? "ON" : "OFF"}
          </button>
        </div>
        {effects.bokeh > 0 && (
          <div className="sce-fx-levels">
            {["Suave", "Medio", "Fuerte"].map((l, i) => (
              <button key={i} className={`sce-fx-level${effects.bokeh === i+1 ? " active" : ""}`}
                onClick={() => onEffectChange({ ...effects, bokeh: i + 1 })}>{l}</button>
            ))}
          </div>
        )}
        {!bokehReady && !bokehLoading && <p className="sce-fx-hint">Primera activación descarga modelo IA (~2 MB)</p>}
        {bokehLoading && <p className="sce-fx-hint">Cargando modelo...</p>}
      </div>

      {/* Ajuste fino (colapsable) */}
      <div className="sce-fx-section">
        <button className="sce-fine-toggle" onClick={() => setShowFine(v => !v)}>
          🎛 Ajuste fino {showFine ? "▲" : "▼"}
        </button>
        {showFine && (
          <div style={{ marginTop: 10 }}>
            {/* Suavizante de piel */}
            <div className="sce-fx-row" style={{ marginBottom: 6 }}>
              <p className="sce-fx-section-label" style={{ margin: 0 }}>SUAVIZANTE DE PIEL</p>
              <button className={`sce-fx-toggle${effects.skin ? " active" : ""}`}
                onClick={() => setFine("skin", effects.skin ? 0 : 1)}>
                {effects.skin ? "ON" : "OFF"}
              </button>
            </div>
            {effects.skin > 0 && (
              <div className="sce-fx-levels" style={{ marginBottom: 10 }}>
                {["Suave", "Medio", "Fuerte"].map((l, i) => (
                  <button key={i} className={`sce-fx-level${effects.skin === i+1 ? " active" : ""}`}
                    onClick={() => setFine("skin", i + 1)}>{l}</button>
                ))}
              </div>
            )}
            {/* Sliders de color */}
            {[
              ["brightness", "Brillo",     -100, 100],
              ["contrast",   "Contraste",  -100, 100],
              ["saturation", "Saturación", -100, 100],
              ["temperature","Temperatura",-100, 100],
            ].map(([key, label, min, max]) => (
              <div key={key} className="sce-fx-slider-row" style={{ marginTop: 7 }}>
                <span style={{ minWidth: 76 }}>{label}</span>
                <input type="range" min={min} max={max} step="1" className="sce-fx-slider"
                  value={effects[key] ?? 0}
                  onChange={e => setFine(key, +e.target.value)} />
                <span style={{ minWidth: 30, textAlign: "right", color: effects[key] ? "#C4526A" : "#bbb" }}>
                  {(effects[key] ?? 0) > 0 ? "+" : ""}{effects[key] ?? 0}
                </span>
              </div>
            ))}
            <div className="sce-fx-temp-labels"><span>❄ Frío</span><span>☀ Cálido</span></div>
          </div>
        )}
      </div>

      <p className="sce-fx-footer">Los efectos se ven en preview y se exportan automáticamente.</p>
    </div>
  );
}

// ── EditorScreen ──────────────────────────────────────────────────────────
function EditorScreen({ clips, setClips, subtitleStyle, onStyleChange, onExport, onAddFiles, moveClip, removeClip, toggleSilence, onAnalyze, format, onFormatChange, onExtractReels }) {
  const canvasRef    = useRef(null);
  const playRef      = useRef(false);
  const subListRef   = useRef(null);
  const fileInputRef = useRef(null);

  // Efectos — refs para que drawFrame/runPlay lean siempre el valor actual sin re-crearse
  const segRef      = useRef(null);   // MediaPipe SelfieSegmentation instance
  const maskRef     = useRef(null);   // último segmentation mask
  const maskCbRef   = useRef(null);   // resolve pendiente para drawFrame blocking
  const _nat        = VIDEO_PRESETS[0].values;
  const effectsRef  = useRef({ transition: "none", transitionSecs: 0.4, bokeh: 0, ..._nat, _preset: "natural" });
  const formatRef   = useRef("landscape");
  const transAlpha  = useRef(0);      // 0-1 overlay negro/blanco para transiciones
  const transColor  = useRef("0,0,0");
  const zoomFactor  = useRef(1.0);    // >1 = zoom out from, animates to 1.0

  const [isPlaying,    setIsPlaying]    = useState(false);
  const [effectiveTime, setEffectiveTime] = useState(0);
  const [done,         setDone]         = useState(false);
  const [seeking,      setSeeking]      = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeMsg, setTranscribeMsg] = useState("");
  const [cutMark,      setCutMark]      = useState(null);
  const [dims,         setDims]         = useState({ W: 1280, H: 720 });
  const [tab,          setTab]          = useState("subs");
  const [effects,      setEffects]      = useState(() => ({ transition: "none", transitionSecs: 0.4, bokeh: 0, ...VIDEO_PRESETS[0].values, _preset: "natural" }));
  const [bokehLoading, setBokehLoading] = useState(false);

  // Sync effects state → ref (para que callbacks estables lo lean sin deps)
  useEffect(() => { effectsRef.current = effects; }, [effects]);
  useEffect(() => { formatRef.current = format; }, [format]);

  // Renderiza un frame de `vid` al canvas ctx con todos los efectos activos.
  // blocking=true → espera el mask de bokeh (para seekTo); false → usa último mask (animation loop).
  const applyFrame = useCallback(async (ctx, vid, dX, dY, dW, dH, W, H, blocking = false) => {
    const { skin, bokeh, brightness = 0, contrast = 0, saturation = 0, temperature = 0 } = effectsRef.current;
    const vidFilter  = buildVidFilter(brightness, contrast, saturation, skin);
    const bgBlur     = bokeh > 0 ? BOKEH_BLUR[bokeh - 1] : 0;
    const seg        = segRef.current;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    // Portrait / square: blur-fill de fondo antes del foreground
    if (formatRef.current !== "landscape") {
      const vW = vid.videoWidth || W, vH = vid.videoHeight || H;
      const bgS = Math.max(W / vW, H / vH);
      const bgW = vW * bgS, bgH = vH * bgS;
      const bgX = (W - bgW) / 2, bgY = (H - bgH) / 2;
      ctx.save();
      ctx.filter = "blur(20px) brightness(0.6) saturate(1.4)";
      ctx.drawImage(vid, bgX, bgY, bgW, bgH);
      ctx.restore();
    }

    // Zoom (transición zoom-in: zoomFactor va de 1.08 → 1.0)
    const z = zoomFactor.current;
    const [zdX, zdY, zdW, zdH] = z !== 1
      ? [(W - dW * z) / 2, (H - dH * z) / 2, dW * z, dH * z]
      : [dX, dY, dW, dH];

    if (bgBlur && seg) {
      // Fondo desenfocado
      ctx.save(); ctx.filter = `blur(${bgBlur}px)`;
      ctx.drawImage(vid, zdX, zdY, zdW, zdH);
      ctx.restore();

      // Obtener mask
      let mask;
      if (blocking) {
        mask = await new Promise(res => {
          maskCbRef.current = res;
          try { seg.send({ image: vid }); } catch (_) { res(null); }
        });
      } else {
        mask = maskRef.current;
        try { seg.send({ image: vid }); } catch (_) {}
      }

      // Persona (sharp + filtros color + skin) recortada con el mask
      const mc = new OffscreenCanvas(W, H);
      const mctx = mc.getContext("2d");
      if (vidFilter) { mctx.save(); mctx.filter = vidFilter; }
      mctx.drawImage(vid, zdX, zdY, zdW, zdH);
      if (vidFilter) mctx.restore();
      if (mask) {
        mctx.globalCompositeOperation = "destination-in";
        mctx.drawImage(mask, 0, 0, W, H);
        mctx.globalCompositeOperation = "source-over";
      }
      ctx.drawImage(mc, 0, 0);

    } else if (vidFilter) {
      ctx.save(); ctx.filter = vidFilter;
      ctx.drawImage(vid, zdX, zdY, zdW, zdH);
      ctx.restore();
    } else {
      ctx.drawImage(vid, zdX, zdY, zdW, zdH);
    }

    // Temperatura: tinte cálido/frío sobre el frame ya dibujado
    if (temperature !== 0) {
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = Math.abs(temperature) / 250;
      ctx.fillStyle = temperature > 0 ? "rgb(255,140,0)" : "rgb(30,100,255)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Overlay de transición (fade/flash)
    if (transAlpha.current > 0) {
      ctx.fillStyle = `rgba(${transColor.current},${transAlpha.current})`;
      ctx.fillRect(0, 0, W, H);
    }
  }, []); // sin deps — lee refs siempre actualizados

  // Inicializar / toggle bokeh
  const initBokeh = useCallback(async () => {
    if (effects.bokeh) { setEffects(e => ({ ...e, bokeh: 0 })); return; }
    if (segRef.current) { setEffects(e => ({ ...e, bokeh: 1 })); return; }
    setBokehLoading(true);
    try {
      const seg = await loadBokehSegmenter();
      seg.onResults(r => {
        maskRef.current = r.segmentationMask;
        if (maskCbRef.current) { maskCbRef.current(r.segmentationMask); maskCbRef.current = null; }
      });
      segRef.current = seg;
      setEffects(e => ({ ...e, bokeh: 1 }));
    } catch (err) {
      console.error("Bokeh:", err);
    } finally {
      setBokehLoading(false);
    }
  }, [effects.bokeh]);

  // Anima el overlay de transición (await = bloquea hasta completar)
  const animFade = useCallback((from, to, dur, color = "0,0,0") => {
    transColor.current = color;
    return new Promise(resolve => {
      const t0 = performance.now();
      const tick = () => {
        const t = Math.min(1, (performance.now() - t0) / 1000 / dur);
        transAlpha.current = from + (to - from) * (t < 0.5 ? 2*t*t : 1-(-2*t+2)**2/2);
        if (t < 1) requestAnimationFrame(tick);
        else { transAlpha.current = to; resolve(); }
      };
      requestAnimationFrame(tick);
    });
  }, []);

  // Inicia animación de zoom-in no bloqueante (1.08 → 1.0)
  const startZoom = useCallback((dur) => {
    zoomFactor.current = 1.08;
    const t0 = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / 1000 / dur);
      zoomFactor.current = 1.08 - 0.08 * t;
      if (t < 1) requestAnimationFrame(tick); else zoomFactor.current = 1.0;
    };
    requestAnimationFrame(tick);
  }, []);

  // Valores derivados
  const keptSegs   = useMemo(() => buildKeptSegments(clips), [clips]);
  const totalKept  = useMemo(() => Math.max(0.001, keptSegs.reduce((t, s) => t + s.end - s.start, 0)), [keptSegs]);
  const nativePos  = useMemo(() => effectiveToNative(keptSegs, effectiveTime), [keptSegs, effectiveTime]);

  // Dimensiones de salida según formato seleccionado (dims = dimensiones nativas del video)
  const outDims = useMemo(() => {
    const { W: vW, H: vH } = dims;
    if (format === "portrait") return { W: Math.round(vH * 9 / 16), H: vH };
    if (format === "square")   return { W: Math.min(vW, vH), H: Math.min(vW, vH) };
    return { W: vW, H: vH };
  }, [format, dims]);
  const currentClipId = nativePos?.clip.id ?? null;
  const localTime     = nativePos?.localTime ?? 0;
  const pct = Math.min(100, (effectiveTime / totalKept) * 100);

  const analyzedClips = useMemo(() => clips.filter(c => c.analyzed && !c.error), [clips]);
  const unanalyzed    = clips.filter(c => !c.analyzed);

  // Detectar dimensiones
  useEffect(() => {
    const first = clips.find(c => c.analyzed && !c.error);
    if (!first) return;
    const v = document.createElement("video");
    const u = URL.createObjectURL(first.file);
    v.src = u;
    v.onloadedmetadata = () => { if (v.videoWidth) setDims({ W: v.videoWidth, H: v.videoHeight }); URL.revokeObjectURL(u); };
  }, []); // solo al montar

  // Parar reproducción al desmontar
  useEffect(() => () => { playRef.current = false; }, []);

  // Auto-scroll subtítulos al activo
  useEffect(() => {
    const el = subListRef.current?.querySelector(".sce-seg-row--active");
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [effectiveTime]);

  // Dibujar un frame estático (seek) — aplica efectos en modo blocking
  const drawFrame = useCallback(async (clip, lt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { W, H } = outDims;
    canvas.width = W; canvas.height = H;
    await new Promise(resolve => {
      const vid = document.createElement("video");
      const url = URL.createObjectURL(clip.file);
      vid.src = url;
      vid.onloadedmetadata = () => {
        vid.currentTime = Math.min(lt, vid.duration - 0.01);
        vid.onseeked = async () => {
          const vW = vid.videoWidth || dims.W, vH = vid.videoHeight || dims.H;
          const scale = Math.min(W / vW, H / vH);
          const dW = vW * scale, dH = vH * scale, dX = (W - dW) / 2, dY = (H - dH) / 2;
          await applyFrame(ctx, vid, dX, dY, dW, dH, W, H, true);
          drawSubtitle(ctx, W, H, lt, clip.segments, subtitleStyle);
          URL.revokeObjectURL(url); resolve();
        };
      };
      vid.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    });
  }, [outDims, dims, subtitleStyle, applyFrame]);

  // Seek a effective time
  const seekToEffective = useCallback(async (et) => {
    const clamped = Math.max(0, Math.min(et, totalKept));
    const native = effectiveToNative(keptSegs, clamped);
    if (!native) return;
    setSeeking(true);
    setEffectiveTime(clamped);
    await drawFrame(native.clip, native.localTime);
    setSeeking(false);
  }, [keptSegs, totalKept, drawFrame]);

  // Seek desde panel de subtítulos (clip + localTime)
  const handleSeekInClip = useCallback((clipId, lt) => {
    if (isPlaying) { playRef.current = false; setTimeout(() => {}, 80); }
    const et = nativeToEffective(keptSegs, clipId, lt);
    if (et !== null) seekToEffective(et);
  }, [isPlaying, keptSegs, seekToEffective]);

  // Transcripción inline (sin salir del editor)
  const handleTranscribeInline = useCallback(async () => {
    playRef.current = false;
    setIsPlaying(false);
    await new Promise(r => setTimeout(r, 120));
    setTranscribing(true);
    const ready = clips.filter(c => c.analyzed && !c.error);
    for (let i = 0; i < ready.length; i++) {
      const clip = ready[i];
      setTranscribeMsg(`Clip ${i + 1}/${ready.length}: ${clip.name.slice(0, 30)}...`);
      try {
        const segments = await transcribeClip(clip.file, clip.silences, info => {
          if (info.status === "downloading") {
            const p = info.progress ? Math.round(info.progress) : 0;
            setTranscribeMsg(`Descargando modelo Whisper... ${p}%`);
          }
        });
        setClips(prev => prev.map(c => c.id === clip.id ? { ...c, segments, transcribed: true } : c));
      } catch (_) {
        setClips(prev => prev.map(c => c.id === clip.id
          ? { ...c, segments: [], transcribed: true, transcribeError: "No se pudo transcribir" } : c));
      }
    }
    setTranscribing(false);
    setTranscribeMsg("");
  }, [clips, setClips]);

  // Cortador manual
  const handleMarkStart = useCallback(() => {
    if (!currentClipId) return;
    setCutMark({ clipId: currentClipId, time: localTime });
  }, [currentClipId, localTime]);

  const handleMarkEnd = useCallback(() => {
    if (!cutMark || !currentClipId || cutMark.clipId !== currentClipId) { setCutMark(null); return; }
    const start = Math.min(cutMark.time, localTime);
    const end   = Math.max(cutMark.time, localTime);
    if (end - start < 0.1) { setCutMark(null); return; }
    const newSilence = { id: uid(), start, end, cut: true };
    setClips(prev => prev.map(c => c.id !== cutMark.clipId ? c : {
      ...c, silences: [...c.silences, newSilence].sort((a, b) => a.start - b.start),
    }));
    setCutMark(null);
  }, [cutMark, currentClipId, localTime, setClips]);

  // Reproducción
  const runPlay = useCallback(async () => {
    if (isPlaying || transcribing || !keptSegs.length) return;
    setIsPlaying(true); setDone(false);
    playRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) { setIsPlaying(false); playRef.current = false; return; }
    const ctx = canvas.getContext("2d");
    const { W, H } = outDims;
    canvas.width = W; canvas.height = H;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);

    // Agrupar keptSegs por clip manteniendo orden global
    const uniqueClipIds = [...new Set(keptSegs.map(s => s.clip.id))];
    let etOffset = 0;

    for (const clipId of uniqueClipIds) {
      if (!playRef.current) break;
      const clipSegs = keptSegs.filter(s => s.clip.id === clipId);
      const clip = clipSegs[0].clip;

      await new Promise(resolve => {
        const vid = document.createElement("video");
        const url = URL.createObjectURL(clip.file);
        vid.src = url;
        vid.addEventListener("loadedmetadata", async () => {
          const vW = vid.videoWidth || dims.W, vH = vid.videoHeight || dims.H;
          const scale = Math.min(W / vW, H / vH);
          const dW = vW * scale, dH = vH * scale, dX = (W - dW) / 2, dY = (H - dH) / 2;
          let animId;
          const draw = () => {
            applyFrame(ctx, vid, dX, dY, dW, dH, W, H, false); // no-await, non-blocking
            drawSubtitle(ctx, W, H, vid.currentTime, clip.segments, subtitleStyle);
            animId = requestAnimationFrame(draw);
          };
          animId = requestAnimationFrame(draw);

          for (const seg of clipSegs) {
            if (!playRef.current) break;
            const segEtStart = etOffset;
            const segDur = seg.end - seg.start;
            vid.currentTime = seg.start;
            await new Promise(r => { vid.onseeked = r; });
            if (!playRef.current) break;
            vid.playbackRate = 1;
            vid.play().catch(() => {});
            await new Promise(segDone => {
              const tick = setInterval(() => {
                if (!playRef.current) { clearInterval(tick); vid.pause(); segDone(); return; }
                const ct = vid.currentTime;
                setEffectiveTime(segEtStart + Math.max(0, ct - seg.start));
                if (ct >= seg.end - 0.04 || vid.ended) {
                  clearInterval(tick); vid.pause(); segDone();
                }
              }, 50);
            });
            etOffset += segDur;
          }

          cancelAnimationFrame(animId);

          // Transición de salida (solo si hay otro clip después y se sigue reproduciendo)
          const clipIdx = uniqueClipIds.indexOf(clipId);
          const { transition, transitionSecs } = effectsRef.current;
          if (playRef.current && transition !== "none" && clipIdx < uniqueClipIds.length - 1) {
            if (transition === "fade") await animFade(0, 1, transitionSecs / 2);
            else if (transition === "flash") await animFade(0, 1, 0.08, "255,255,255");
          }

          URL.revokeObjectURL(url);
          resolve();
        });
        vid.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      });

      // Transición de entrada al clip siguiente
      const clipIdx = uniqueClipIds.indexOf(clipId);
      const { transition, transitionSecs } = effectsRef.current;
      if (playRef.current && transition !== "none" && clipIdx < uniqueClipIds.length - 1) {
        if (transition === "fade") await animFade(1, 0, transitionSecs / 2);
        else if (transition === "flash") await animFade(1, 0, 0.08, "255,255,255");
        else if (transition === "zoom") startZoom(transitionSecs);
      }
    }

    if (playRef.current) { setDone(true); setEffectiveTime(totalKept); }
    setIsPlaying(false); playRef.current = false;
  }, [keptSegs, outDims, dims, subtitleStyle, totalKept, isPlaying, transcribing, animFade, startZoom]);

  const togglePlay = useCallback(() => {
    if (isPlaying) { playRef.current = false; } else { runPlay(); }
  }, [isPlaying, runPlay]);

  return (
    <div className="sce-layout">
      <input ref={fileInputRef} type="file" accept="video/*,.mov,.mp4,.m4v,.webm" multiple
        style={{ display: "none" }} onChange={e => onAddFiles(e.target.files)} />

      {/* Top bar */}
      <div className="sce-topbar">
        <Logo width={88} />
        <div className="sce-topbar-center">
          {unanalyzed.length > 0 ? (
            <button className="sce-analyze-pill" onClick={onAnalyze}>
              🔍 Analizar {unanalyzed.length} clip{unanalyzed.length > 1 ? "s" : ""} nuevo{unanalyzed.length > 1 ? "s" : ""}
            </button>
          ) : (
            <span className="sce-clip-info-tag">
              {analyzedClips.length} clip{analyzedClips.length !== 1 ? "s" : ""} · {fmtTime(totalKept)} final
            </span>
          )}
        </div>

        {/* Selector de formato de salida */}
        <div className="sce-fmt-group">
          {[["landscape","16:9"],["portrait","9:16"],["square","1:1"]].map(([f, label]) => (
            <button key={f} className={`sce-fmt-btn${format === f ? " active" : ""}`}
              onClick={() => onFormatChange(f)} title={
                f === "landscape" ? "Paisaje — YouTube / horizontal"
              : f === "portrait"  ? "Vertical — Reels / TikTok / Stories"
              :                     "Cuadrado — Instagram Feed"
              }>{label}</button>
          ))}
        </div>

        <div className="sce-topbar-right">
          {onExtractReels && (
            <button className="sce-reel-pill" onClick={onExtractReels} title="Extractor de Reels">🎯 Reels</button>
          )}
          <button className="sc-btn-primary sc-btn-sm" onClick={() => onExport(effects)}>✂️ Exportar</button>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="sce-body">
        {/* Canvas + controles */}
        <div className="sce-canvas-col">
          <div className="sce-canvas-wrap" onClick={!isPlaying && !seeking ? togglePlay : undefined}>
            <canvas ref={canvasRef} className="sce-canvas" width={dims.W} height={dims.H} />
            {!isPlaying && !seeking && (
              <div className="sce-canvas-overlay">
                <button className="sc-play-big-btn" onClick={e => { e.stopPropagation(); togglePlay(); }}>
                  {done ? "↺" : "▶"}
                </button>
              </div>
            )}
            {seeking && (
              <div className="sce-canvas-overlay"><div className="sce-seeking-spinner" /></div>
            )}
          </div>

          {/* Playbar con scrubber clicable y cortador manual */}
          <div className="sce-playbar">
            <button className="sce-playbtn" onClick={togglePlay}>
              {isPlaying ? "⏸" : done ? "↺" : "▶"}
            </button>

            {/* Scrubber clicable */}
            <div className="sce-scrubber" onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              seekToEffective(p * totalKept);
            }}>
              <div className="sce-scrubber-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="sce-pct-label">{fmtTime(effectiveTime)}</span>

            {/* Cortador manual */}
            <div className="sce-cut-mark">
              {!cutMark ? (
                <button className="sce-cut-btn" disabled={!currentClipId} onClick={handleMarkStart}
                  title="Marcar inicio del corte manual">✂ Inicio</button>
              ) : (
                <>
                  <span className="sce-cut-info">desde {fmtTime(cutMark.time)}</span>
                  <button className="sce-cut-btn sce-cut-btn--end" onClick={handleMarkEnd}
                    title="Cortar hasta aquí">Cortar</button>
                  <button className="sce-cut-cancel" onClick={() => setCutMark(null)}>✕</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Panel derecho con tabs: Subtítulos | Efectos */}
        <div className="sce-right-panel">
          <div className="sce-tab-bar">
            <button className={`sce-tab${tab === "subs" ? " active" : ""}`} onClick={() => setTab("subs")}>💬 Subtítulos</button>
            <button className={`sce-tab${tab === "fx"   ? " active" : ""}`} onClick={() => setTab("fx")}>✨ Efectos</button>
          </div>
          {tab === "subs"
            ? <SubtitlePanel
                clips={clips} setClips={setClips}
                currentClipId={currentClipId} localTime={localTime}
                subtitleStyle={subtitleStyle} onStyleChange={onStyleChange}
                onTranscribe={handleTranscribeInline}
                onSeekInClip={handleSeekInClip}
                listRef={subListRef}
                transcribing={transcribing} transcribeMsg={transcribeMsg}
              />
            : <EffectsPanel
                effects={effects} onEffectChange={setEffects}
                bokehLoading={bokehLoading}
                bokehReady={!!segRef.current}
                onToggleBokeh={initBokeh}
              />
          }
        </div>
      </div>

      {/* Timeline contraído */}
      <ClipTimeline
        keptSegs={keptSegs} totalKept={totalKept} effectiveTime={effectiveTime}
        onSeek={seekToEffective}
        allClips={clips} onMoveClip={moveClip} onRemoveClip={removeClip}
        onAddFiles={() => fileInputRef.current?.click()}
      />
    </div>
  );
}

// ── Extractor de Reels ───────────────────────────────────────────────────
const REELS_FMT_DEFAULT = "portrait";
const REELS_EFFECTS_DEFAULT = { ...VIDEO_PRESETS[0].values };

function ReelsExtractorScreen({ clips, onBack, subtitleStyle }) {
  const [phase,       setPhase]       = useState("idle");
  const [msg,         setMsg]         = useState("");
  const [fragments,   setFragments]   = useState([]);
  const [reelFmt,     setReelFmt]     = useState(REELS_FMT_DEFAULT);
  const [reelEffects, setReelEffects] = useState(REELS_EFFECTS_DEFAULT);
  const [exporting,   setExporting]   = useState(null); // idx | null
  const [progMap,     setProgMap]     = useState({});
  const [urlMap,      setUrlMap]      = useState({});

  const clip = clips.find(c => c.analyzed && !c.error);

  const run = useCallback(async () => {
    if (!clip) return;
    setPhase("transcribing"); setMsg("Transcribiendo video con IA...");

    // 1. Transcribir si no hay segmentos
    let segments = clip.segments?.length ? clip.segments : null;
    if (!segments) {
      try {
        const asr = await loadTranscriber(info => {
          if (info.status === "downloading")
            setMsg(`Descargando modelo Whisper... ${Math.round(info.progress || 0)}%`);
        });
        setMsg("Transcribiendo...");
        const { audio, mappingRanges } = await getKeptAudioMono16k(clip.file, clip.silences || []);
        const result = await asr(audio, { language: "spanish", task: "transcribe", return_timestamps: "word", chunk_length_s: 30, stride_length_s: 5 });
        segments = (result.chunks || []).map(c => ({
          word: c.text.replace(/^\s+/, ""),
          start: mapCondensedToOriginal(c.timestamp[0] ?? 0, mappingRanges),
          end:   mapCondensedToOriginal(c.timestamp[1] ?? ((c.timestamp[0] ?? 0) + 0.5), mappingRanges),
        })).filter(s => s.word);
      } catch {
        setPhase("error"); setMsg("Error en la transcripción. Intenta de nuevo."); return;
      }
    }
    if (!segments.length) { setPhase("error"); setMsg("No se pudo transcribir el video."); return; }

    // 2. Formatear transcripción con timestamps cada 8 palabras
    setPhase("analyzing"); setMsg("Analizando con IA para encontrar los mejores momentos para Reels...");
    const parts = [];
    segments.forEach((s, i) => {
      if (i % 8 === 0) parts.push(`[${Math.round(s.start)}s]`);
      parts.push(s.word);
    });

    // 3. Llamar a la lambda
    try {
      const res = await fetch(REELS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "extractReels",
          publicEmail: "app@mamaceo.co",
          transcription: parts.join(" "),
          duration: clip.duration || 0,
        }),
      });
      const data = await res.json();
      if (!data.fragmentos?.length) throw new Error("Sin fragmentos");
      // Clamp timestamps to clip duration
      const dur = clip.duration || Infinity;
      setFragments(data.fragmentos.map(f => ({
        ...f,
        inicio: Math.max(0, Math.min(f.inicio, dur - 5)),
        fin:    Math.max(f.inicio + 5, Math.min(f.fin, dur)),
      })));
      setPhase("ready"); setMsg("");
    } catch {
      setPhase("error"); setMsg("Error al analizar. Intenta de nuevo.");
    }
  }, [clip]);

  const exportFragment = useCallback(async (idx) => {
    if (exporting !== null) return;
    const f = fragments[idx];
    if (!f || !clip) return;
    setExporting(idx);
    setProgMap(p => ({ ...p, [idx]: 0 }));
    try {
      const blob = await recordSingleFragment(
        clip, f.inicio, f.fin,
        p => setProgMap(prev => ({ ...prev, [idx]: Math.round(p * 100) })),
        subtitleStyle, reelFmt, reelEffects
      );
      setUrlMap(u => ({ ...u, [idx]: URL.createObjectURL(blob) }));
    } catch (e) { console.error(e); }
    setExporting(null);
    setProgMap(p => { const n = { ...p }; delete n[idx]; return n; });
  }, [exporting, fragments, clip, subtitleStyle, reelFmt, reelEffects]);

  return (
    <div className="sce-reel-screen">
      {/* Top bar */}
      <div className="sce-reel-topbar">
        <button className="sce-reel-back" onClick={onBack}>← Editor</button>
        <h2 className="sce-reel-title">🎯 Extractor de Reels</h2>
        <div className="sce-fmt-group" style={{ marginLeft: "auto" }}>
          {[["portrait","9:16 ▲"],["landscape","16:9 ▷"],["square","1:1 □"]].map(([f, label]) => (
            <button key={f} className={`sce-fmt-btn${reelFmt === f ? " active" : ""}`}
              onClick={() => setReelFmt(f)}>{label}</button>
          ))}
        </div>
      </div>

      {/* Pantalla de inicio */}
      {phase === "idle" && (
        <div className="sce-reel-intro">
          <div className="sce-reel-intro-icon">🎯</div>
          <h3 className="sce-reel-intro-h">Convierte tu video largo en Reels virales</h3>
          <p className="sce-reel-intro-p">
            La IA transcribe tu video, detecta los 6 momentos más valiosos y te los entrega listos para descargar uno a uno.
          </p>
          <div className="sce-reel-preset-row">
            {VIDEO_PRESETS.slice(0,4).map(p => (
              <button key={p.id}
                className={`sce-preset-card${reelEffects === VIDEO_PRESETS.find(x=>x.id===p.id)?.values ? " active" : ""} sce-preset-card--sm`}
                onClick={() => setReelEffects(p.values)}>
                <span className="sce-preset-icon">{p.icon}</span>
                <span className="sce-preset-label">{p.label}</span>
              </button>
            ))}
          </div>
          <button className="sce-reel-start-btn" onClick={run} disabled={!clip}>
            ✨ Analizar con IA
          </button>
          {!clip && <p style={{ color: "#C4526A", marginTop: 8, fontSize: 13 }}>Analiza un clip en el editor primero.</p>}
        </div>
      )}

      {/* Cargando */}
      {(phase === "transcribing" || phase === "analyzing") && (
        <div className="sce-reel-loading">
          <div className="sce-reel-spinner" />
          <p className="sce-reel-loading-msg">{msg}</p>
          <p className="sce-reel-loading-hint">Esto puede tardar 1-2 minutos según la duración del video.</p>
        </div>
      )}

      {/* Error */}
      {phase === "error" && (
        <div className="sce-reel-loading">
          <p style={{ color: "#C4526A" }}>{msg}</p>
          <button className="sce-reel-start-btn" onClick={() => setPhase("idle")}>Intentar de nuevo</button>
        </div>
      )}

      {/* Resultados */}
      {phase === "ready" && (
        <div className="sce-reel-results">
          <p className="sce-reel-results-subtitle">
            Se encontraron {fragments.length} fragmentos · Exporta los que te gusten en {reelFmt === "portrait" ? "9:16 (Reels)" : reelFmt === "square" ? "1:1 (Feed)" : "16:9 (YouTube)"}
          </p>
          <div className="sce-reel-grid">
            {fragments.map((f, idx) => {
              const dur = f.fin - f.inicio;
              const prog = progMap[idx];
              const url = urlMap[idx];
              return (
                <div key={idx} className="sce-reel-card">
                  <div className="sce-reel-num">#{idx + 1}</div>
                  <div className="sce-reel-card-title">{f.titulo}</div>
                  <div className="sce-reel-meta">
                    {fmtTime(f.inicio)} → {fmtTime(f.fin)} · <strong>{fmtTime(dur)}</strong>
                  </div>
                  <div className="sce-reel-hook">"{f.hook}"</div>
                  <div className="sce-reel-why">📌 {f.por_que}</div>
                  <div className="sce-reel-actions">
                    {url ? (
                      <a href={url}
                        download={`reel-${idx+1}-${f.titulo.replace(/\s+/g,"-").toLowerCase()}.webm`}
                        className="sce-reel-download">
                        ⬇ Descargar Reel
                      </a>
                    ) : prog !== undefined ? (
                      <div className="sce-reel-prog-wrap">
                        <div className="sce-reel-prog-bar" style={{ width: `${prog}%` }} />
                        <span className="sce-reel-prog-pct">{prog}%</span>
                      </div>
                    ) : (
                      <button className="sce-reel-export-btn"
                        onClick={() => exportFragment(idx)}
                        disabled={exporting !== null}>
                        ✂️ Exportar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export default function SilenceCutter() {
  const [clips, setClips]           = useState([]);
  const [fase, setFase]             = useState("editor");
  const [progress, setProgress]     = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState("");
  const [dragOver, setDragOver]     = useState(false);
  const [subtitleStyle, setSubtitleStyle] = useState({ font: "Poppins", hlColor: "#FFE44D" });
  const [format, setFormat] = useState("landscape"); // "landscape" | "portrait" | "square"
  const [showReels, setShowReels] = useState(false);
  const inputRef = useRef(null);
  const abortRef = useRef(false);
  const { noise: noiseDb, duration: minDur } = PRESETS["normal"];

  const analyzingRef = useRef(false);

  const analizarClips = useCallback(async (toAnalyze) => {
    if (analyzingRef.current || !toAnalyze.length) return;
    analyzingRef.current = true;
    setFase("analyzing"); setError("");
    for (let i = 0; i < toAnalyze.length; i++) {
      const clip = toAnalyze[i];
      setProgressMsg(`Analizando ${i + 1} de ${toAnalyze.length}: ${clip.name}`);
      setProgress(Math.round((i / toAnalyze.length) * 100));
      try {
        const { duration, waveform, silences } = await analyzeClip(clip.file, noiseDb, minDur);
        setClips(prev => prev.map(c => c.id === clip.id ? { ...c, duration, waveform, silences, analyzed: true, error: null } : c));
      } catch (_) {
        setClips(prev => prev.map(c => c.id === clip.id ? { ...c, analyzed: true, error: "No se pudo analizar el audio" } : c));
      }
    }
    setFase("editor");
    analyzingRef.current = false;
  }, [noiseDb, minDur]);

  const analizarTodos = useCallback(() =>
    analizarClips(clips.filter(c => !c.analyzed)), [clips, analizarClips]);

  const addFiles = useCallback(async (files) => {
    const valid = Array.from(files).filter(f => /\.(mp4|mov|m4v|webm|avi)$/i.test(f.name) || f.type.startsWith("video/"));
    if (!valid.length) { setError("No se encontraron archivos de video válidos."); return; }
    setError("");
    const newClips = valid.map(f => ({
      id: uid(), file: f, name: f.name, size: f.size,
      thumbnail: null, duration: null, waveform: null, silences: [],
      analyzed: false, error: null, segments: null, transcribed: false, transcribeError: null,
    }));
    setClips(prev => [...prev, ...newClips]);
    newClips.forEach(async clip => {
      const thumb = await generateThumbnail(clip.file);
      setClips(prev => prev.map(c => c.id === clip.id ? { ...c, thumbnail: thumb } : c));
    });
    // Auto-análisis inmediato al subir
    analizarClips(newClips);
  }, [analizarClips]);

  const toggleSilence = (clipId, silenceId) => {
    setClips(prev => prev.map(c => c.id !== clipId ? c : {
      ...c, silences: c.silences.map(s => s.id === silenceId ? { ...s, cut: !s.cut } : s),
    }));
  };
  const moveClip   = (id, dir) => setClips(prev => {
    const idx = prev.findIndex(c => c.id === id), newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= prev.length) return prev;
    const arr = [...prev]; [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]; return arr;
  });
  const removeClip = id => setClips(prev => prev.filter(c => c.id !== id));

  const exportar = async (effects = {}) => {
    const ready = clips.filter(c => c.analyzed && !c.error);
    if (!ready.length) { setError("Analiza los clips primero."); return; }
    abortRef.current = false;
    setFase("cutting"); setProgress(0); setError("");
    try {
      const blob = await recordAllClips(ready, (p, msg) => { setProgress(Math.round(p * 100)); setProgressMsg(msg); }, abortRef, subtitleStyle, format, effects);
      const totalOriginal = ready.reduce((t, c) => t + (c.duration || 0), 0);
      const totalCut = ready.reduce((t, c) => t + c.silences.filter(s => s.cut).reduce((s, si) => s + si.end - si.start, 0), 0);
      const totalCuts = ready.reduce((t, c) => t + c.silences.filter(s => s.cut).length, 0);
      setResult({ url: URL.createObjectURL(blob), filename: (clips[0]?.name.replace(/\.[^/.]+$/, "") || "video") + "_editado.webm",
        totalOriginal, totalKept: totalOriginal - totalCut, totalCut, totalCuts, clipsCount: ready.length });
      setFase("done");
    } catch (err) {
      if (err.message !== "Cancelado") setError("Error al exportar: " + err.message);
      setFase("editor");
    }
  };

  const analyzedCount = clips.filter(c => c.analyzed && !c.error).length;

  // Pantallas de proceso
  if (fase === "analyzing") return (
    <div className="sc-page sc-page--center"><Logo width={100} />
      <div className="sc-processing">
        <div className="sc-proc-rings"><div className="sc-proc-ring sc-proc-ring--1" /><div className="sc-proc-ring sc-proc-ring--2" /><div className="sc-proc-ring sc-proc-ring--3" /><span className="sc-proc-icon">🔍</span></div>
        <h2 className="sc-proc-title">Analizando clips...</h2>
        <div className="sc-progress-bar-wrap" style={{ width: 320 }}><div className="sc-progress-bar" style={{ width: `${progress}%` }} /></div>
        <p className="sc-proc-note">{progressMsg}</p>
      </div>
    </div>
  );

  if (fase === "cutting") return (
    <div className="sc-page sc-page--center"><Logo width={100} />
      <div className="sc-processing">
        <div className="sc-proc-rings"><div className="sc-proc-ring sc-proc-ring--1" /><div className="sc-proc-ring sc-proc-ring--2" /><div className="sc-proc-ring sc-proc-ring--3" /><span className="sc-proc-icon">✂️</span></div>
        <h2 className="sc-proc-title">Exportando video...</h2>
        <div className="sc-progress-bar-wrap" style={{ width: 320 }}><div className="sc-progress-bar" style={{ width: `${progress}%` }} /></div>
        <p className="sc-proc-note">{progressMsg}</p>
        <p className="sc-proc-note sc-proc-note--small">El procesamiento ocurre en tiempo real. No cierres esta ventana.</p>
        <button className="sc-btn-ghost" style={{ marginTop: 16 }} onClick={() => { abortRef.current = true; }}>Cancelar</button>
      </div>
    </div>
  );

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

  if (fase === "editor" && analyzedCount > 0 && showReels) return (
    <ReelsExtractorScreen
      clips={clips}
      subtitleStyle={subtitleStyle}
      onBack={() => setShowReels(false)}
    />
  );

  if (fase === "editor" && analyzedCount > 0) return (
    <EditorScreen clips={clips} setClips={setClips}
      subtitleStyle={subtitleStyle} onStyleChange={setSubtitleStyle}
      onExport={exportar} onAddFiles={addFiles}
      moveClip={moveClip} removeClip={removeClip} toggleSilence={toggleSilence}
      onAnalyze={analizarTodos}
      format={format} onFormatChange={setFormat}
      onExtractReels={() => setShowReels(true)} />
  );

  // Pantalla de subida
  return (
    <div className="sc-page">
      <nav className="sc-nav"><Logo width={110} /><a href="/" className="sc-nav-link">Ir a la app →</a></nav>
      <div className="sc-editor-wrap">
        <div className="sc-editor-header">
          <div>
            <h1 className="sc-editor-title">Editor de video</h1>
            <p className="sc-editor-sub">Agrega tus clips, detecta silencios automáticamente y exporta un solo video limpio.</p>
          </div>
          <span className="sc-badge">Herramienta gratuita · En tu dispositivo</span>
        </div>
        <div className={`sc-drop sc-drop--compact${dragOver ? " sc-drop--over" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
          <span className="sc-drop-icon" style={{ fontSize: 28 }}>＋</span>
          <div>
            <p className="sc-drop-title" style={{ fontSize: 16, margin: 0 }}>Agrega clips de video</p>
            <p className="sc-drop-formats" style={{ margin: "4px 0 0" }}>Arrastra o haz clic · .mp4, .mov, .webm · Múltiples archivos</p>
          </div>
        </div>
        <input ref={inputRef} type="file" accept="video/*,.mov,.mp4,.m4v,.webm" multiple
          style={{ display: "none" }} onChange={e => addFiles(e.target.files)} />
        {clips.length > 0 && (
          <div className="sc-toolbar">
            <span className="sc-toolbar-left">{clips.length} clip{clips.length !== 1 ? "s" : ""}</span>
            <button className="sc-btn-outline sc-btn-sm" onClick={analizarTodos}>🔍 Analizar todos</button>
          </div>
        )}
        {error && <p className="sc-error">{error}</p>}
        {clips.length === 0 ? (
          <div className="sc-empty-state"><span>🎬</span><p>Agrega tus clips arriba para empezar</p><p className="sc-empty-hint">Puedes agregar múltiples videos y se combinarán en el orden que definas</p></div>
        ) : (
          <div className="sc-clips-list">
            {clips.map((clip, i) => (
              <ClipCard key={clip.id} clip={clip} index={i} total={clips.length}
                onMove={moveClip} onRemove={removeClip} onToggle={toggleSilence} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
