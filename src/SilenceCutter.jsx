import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Logo from "./Logo";
import "./SilenceCutter.css";

// ── Constantes ────────────────────────────────────────────────────────────
const PRESETS = {
  conservadora: { noise: -45, duration: 0.8 },
  normal:       { noise: -35, duration: 0.5 },
  agresiva:     { noise: -28, duration: 0.3 },
};
const PADDING   = 0.03;
const FONTS     = ["Poppins", "Montserrat", "Arial"];
const HL_COLORS = [
  { label: "Amarillo", c: "#FFE44D" },
  { label: "Rosa",     c: "#FF6B8A" },
  { label: "Blanco",   c: "#FFFFFF" },
  { label: "Verde",    c: "#4ADE80" },
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
async function getAudioMono16k(file) {
  const buf = await file.arrayBuffer();
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(buf);
  ctx.close();
  if (decoded.sampleRate === 16000) return decoded.getChannelData(0);
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
  const src = offline.createBufferSource();
  src.buffer = decoded; src.connect(offline.destination); src.start();
  const resampled = await offline.startRendering();
  return resampled.getChannelData(0);
}
async function transcribeClip(file, onModelProgress) {
  const asr = await loadTranscriber(onModelProgress);
  const audio = await getAudioMono16k(file);
  const result = await asr(audio, {
    language: "spanish", task: "transcribe",
    return_timestamps: "word", chunk_length_s: 30, stride_length_s: 5,
  });
  return (result.chunks || []).map(c => ({
    word: c.text.replace(/^\s+/, ""),
    start: c.timestamp[0] ?? 0,
    end: c.timestamp[1] ?? ((c.timestamp[0] ?? 0) + 0.5),
  })).filter(s => s.word);
}

// ── Subtítulos estilo CapCut ──────────────────────────────────────────────
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
    const ratio = maxW / totalW;
    const newFs = Math.floor(fs * ratio);
    ctx.font = `800 ${newFs}px "${font}", sans-serif`;
    wMeasures.forEach((_, i) => {
      wMeasures[i] = ctx.measureText(group[i].word + (i < group.length - 1 ? " " : "")).width;
    });
    totalW = wMeasures.reduce((a, b) => a + b, 0);
  }

  const y = H - Math.floor(H / 10);
  const startX = W / 2 - totalW / 2;
  let x = startX;

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
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur  = 6;
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

// ── Agrupar palabras en líneas de subtítulo ───────────────────────────────
function groupSegments(words, perLine = 5) {
  if (!words?.length) return [];
  const lines = [];
  for (let i = 0; i < words.length; i += perLine) {
    const group = words.slice(i, i + perLine);
    lines.push({
      id: i,
      startIdx: i,
      endIdx: i + group.length,
      start: group[0].start,
      end: group[group.length - 1].end,
      text: group.map(w => w.word).join(" "),
      words: group,
    });
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
      onClick={handleClick} title="Clic en zona roja/verde para cambiar" style={{ cursor: "pointer" }} />
  );
}

// ── ClipCard (fase de subida) ──────────────────────────────────────────────
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
          <p className="sc-clip-meta">
            {fmtSize(clip.size)}{clip.duration ? ` · ${fmtTime(clip.duration)}` : " · Cargando..."}
          </p>
          {clip.analyzed && !clip.error && (
            <div className="sc-clip-badges">
              <span className="sc-badge-cut">{cutCount} silencios · {fmtTime(savedTime)} ahorrados</span>
              {clip.transcribed && !clip.transcribeError && (
                <span className="sc-badge-subs">💬 {clip.segments?.length ?? 0} palabras</span>
              )}
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
            <p className="sc-no-silences-msg">✨ No se detectaron silencios en este clip.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Grabación multi-clip ──────────────────────────────────────────────────
async function recordAllClips(clips, onProgress, abortRef, subtitleStyle = {}) {
  const firstVid = document.createElement("video");
  const firstUrl = URL.createObjectURL(clips[0].file);
  firstVid.src = firstUrl;
  await new Promise(r => { firstVid.onloadedmetadata = r; firstVid.onerror = r; });
  const W = firstVid.videoWidth || 1280, H = firstVid.videoHeight || 720;
  URL.revokeObjectURL(firstUrl);

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

    await new Promise((resolve) => {
      const videoEl = document.createElement("video");
      const url = URL.createObjectURL(clip.file);
      videoEl.src = url; videoEl.crossOrigin = "anonymous";

      videoEl.addEventListener("loadedmetadata", async () => {
        let source;
        try {
          source = audioCtx.createMediaElementSource(videoEl);
          source.connect(destination);
        } catch (_) {}

        const vW = videoEl.videoWidth || W, vH = videoEl.videoHeight || H;
        const scale = Math.min(W / vW, H / vH);
        const dW = vW * scale, dH = vH * scale, dX = (W - dW) / 2, dY = (H - dH) / 2;

        let animId;
        const drawLoop = () => {
          ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
          if (!videoEl.paused && !videoEl.ended) {
            ctx.drawImage(videoEl, dX, dY, dW, dH);
            drawSubtitle(ctx, W, H, videoEl.currentTime, clip.segments, subtitleStyle);
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

// ── SegmentRow ────────────────────────────────────────────────────────────
function SegmentRow({ line, isActive, onEdit, onSeek }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(line.text);
  const ref = useRef(null);

  useEffect(() => { setVal(line.text); }, [line.text]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (val.trim() && val.trim() !== line.text) onEdit(val.trim());
  };
  return (
    <div className={`sce-seg-row${isActive ? " sce-seg-row--active" : ""}`}>
      <button className="sce-seg-time" onClick={() => onSeek(line.start)} title="Saltar a este punto">
        {fmtTime(line.start)}
      </button>
      {editing ? (
        <input ref={ref} className="sce-seg-input" value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setVal(line.text); setEditing(false); }
          }}
        />
      ) : (
        <button className="sce-seg-text" onClick={() => setEditing(true)} title="Clic para editar">
          {line.text}
        </button>
      )}
    </div>
  );
}

// ── Panel de subtítulos ───────────────────────────────────────────────────
function SubtitlePanel({ clips, setClips, currentClipId, localTime, subtitleStyle, onStyleChange, onTranscribe, onSeekInClip, listRef }) {
  const hasSubtitles = clips.some(c => c.transcribed && c.segments?.length);

  const handleEdit = (clip, line, newText) => {
    const words = newText.trim().split(/\s+/);
    const dur   = line.end - line.start;
    const newWords = words.map((w, i) => ({
      word: w,
      start: line.start + (i / words.length) * dur,
      end:   line.start + ((i + 1) / words.length) * dur,
    }));
    const newSegs = [
      ...(clip.segments || []).slice(0, line.startIdx),
      ...newWords,
      ...(clip.segments || []).slice(line.endIdx),
    ];
    setClips(prev => prev.map(c => c.id !== clip.id ? c : { ...c, segments: newSegs }));
  };

  const transcribedClips = clips.filter(c => c.transcribed && c.segments?.length);

  return (
    <div className="sce-sub-panel">
      <div className="sce-panel-header">
        <span className="sce-panel-title">Subtítulos</span>
        <button
          className={`sc-btn-subs sc-btn-sm sc-btn-outline${hasSubtitles ? " sce-regen-btn" : ""}`}
          onClick={onTranscribe}
        >
          {hasSubtitles ? "↺ Re-generar" : "💬 Generar"}
        </button>
      </div>

      {hasSubtitles && (
        <div className="sce-sub-style">
          <div className="sc-font-pills">
            {FONTS.map(f => (
              <button key={f}
                className={`sc-font-pill${subtitleStyle.font === f ? " active" : ""}`}
                style={{ fontFamily: f }}
                onClick={() => onStyleChange({ ...subtitleStyle, font: f })}>{f}</button>
            ))}
          </div>
          <div className="sc-color-swatches">
            {HL_COLORS.map(opt => (
              <button key={opt.c}
                className={`sc-color-swatch${subtitleStyle.hlColor === opt.c ? " active" : ""}`}
                style={{ "--sw": opt.c }}
                onClick={() => onStyleChange({ ...subtitleStyle, hlColor: opt.c })}
                title={opt.label}>
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
                const isActive = clip.id === currentClipId &&
                  localTime >= line.start && localTime <= line.end;
                return (
                  <SegmentRow key={li} line={line} isActive={isActive}
                    onSeek={(t) => onSeekInClip(clip.id, t)}
                    onEdit={(newText) => handleEdit(clip, line, newText)}
                  />
                );
              })}
            </React.Fragment>
          );
        })}
        {!hasSubtitles && (
          <div className="sce-no-subs">
            <p>Genera subtítulos automáticos con IA</p>
            <p className="sce-no-subs-hint">Whisper Tiny transcribe en español<br/>sincronizando palabra por palabra</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Timeline de clips ─────────────────────────────────────────────────────
function ClipTimeline({ clips, currentClipId, localTime, onSeekByClip, onToggleSilence, onMoveClip, onRemoveClip, onAddFiles }) {
  const total = clips.reduce((t, c) => t + (c.duration || 0.0001), 0);
  return (
    <div className="sce-timeline">
      <div className="sce-tl-label">TIMELINE</div>
      <div className="sce-tl-inner">
        {clips.map((clip, i) => {
          const pct      = (clip.duration || 0.0001) / total * 100;
          const isCurrent = clip.id === currentClipId;
          const localPct  = isCurrent && clip.duration ? (localTime / clip.duration) * 100 : null;

          return (
            <div key={clip.id}
              className={`sce-tl-clip${isCurrent ? " sce-tl-clip--active" : ""}${!clip.analyzed ? " sce-tl-clip--pending" : ""}`}
              style={{ width: `${pct}%` }}
              onClick={() => clip.analyzed && onSeekByClip(clip.id, 0)}
              title={clip.name}
            >
              {/* Zonas de silencio */}
              {(clip.silences || []).map(s => (
                <div key={s.id}
                  className={`sce-tl-zone${s.cut ? " sce-tl-zone--cut" : " sce-tl-zone--keep"}`}
                  style={{
                    left:  `${(s.start / (clip.duration || 1)) * 100}%`,
                    width: `${((s.end - s.start) / (clip.duration || 1)) * 100}%`,
                  }}
                  onClick={e => { e.stopPropagation(); onToggleSilence(clip.id, s.id); }}
                  title={`${s.cut ? "Silencio a cortar" : "Silencio conservado"} · Clic para cambiar`}
                />
              ))}

              {/* Playhead */}
              {localPct !== null && (
                <div className="sce-tl-playhead" style={{ left: `${localPct}%` }} />
              )}

              {/* Info */}
              <div className="sce-tl-clip-meta">
                <span className="sce-tl-num">{i + 1}</span>
                <span className="sce-tl-name">{clip.name.replace(/\.[^/.]+$/, "")}</span>
                {clip.duration && <span className="sce-tl-dur">{fmtTime(clip.duration)}</span>}
              </div>

              {/* Botones */}
              <div className="sce-tl-btns" onClick={e => e.stopPropagation()}>
                <button disabled={i === 0} onClick={() => onMoveClip(clip.id, -1)} title="Mover atrás">‹</button>
                <button disabled={i === clips.length - 1} onClick={() => onMoveClip(clip.id, 1)} title="Mover adelante">›</button>
                <button className="sce-tl-rm" onClick={() => onRemoveClip(clip.id)} title="Quitar">✕</button>
              </div>
            </div>
          );
        })}

        <button className="sce-tl-add" onClick={onAddFiles} title="Agregar clips">＋</button>
      </div>
    </div>
  );
}

// ── EditorScreen (interfaz principal tipo CapCut) ─────────────────────────
function EditorScreen({ clips, setClips, subtitleStyle, onStyleChange, onTranscribe, onExport, onAddFiles, moveClip, removeClip, toggleSilence, onAnalyze }) {
  const canvasRef   = useRef(null);
  const playRef     = useRef(false);
  const subListRef  = useRef(null);
  const fileInputRef = useRef(null);

  const [isPlaying,     setIsPlaying]     = useState(false);
  const [pct,           setPct]           = useState(0);
  const [clipInfo,      setClipInfo]      = useState("");
  const [done,          setDone]          = useState(false);
  const [currentClipId, setCurrentClipId] = useState(null);
  const [localTime,     setLocalTime]     = useState(0);
  const [dims,          setDims]          = useState({ W: 1280, H: 720 });
  const [seeking,       setSeeking]       = useState(false);

  const analyzedClips = useMemo(() => clips.filter(c => c.analyzed && !c.error), [clips]);
  const unanalyzed    = clips.filter(c => !c.analyzed);

  const totalKept = useMemo(() => analyzedClips.reduce((t, c) => {
    const cut = (c.silences || []).filter(s => s.cut).reduce((s, si) => s + si.end - si.start, 0);
    return t + (c.duration || 0) - cut;
  }, 0) || 1, [analyzedClips]);

  // Detectar dimensiones del video del primer clip
  useEffect(() => {
    const first = clips.find(c => c.analyzed && !c.error);
    if (!first) return;
    const v = document.createElement("video");
    const u = URL.createObjectURL(first.file);
    v.src = u;
    v.onloadedmetadata = () => {
      if (v.videoWidth) setDims({ W: v.videoWidth, H: v.videoHeight });
      URL.revokeObjectURL(u);
    };
  }, []); // Solo al montar

  // Auto-scroll del panel de subtítulos a la línea activa
  useEffect(() => {
    if (!subListRef.current) return;
    const active = subListRef.current.querySelector(".sce-seg-row--active");
    if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [localTime, currentClipId]);

  // Dibujar un frame estático en el canvas (para seeking)
  const seekTo = useCallback(async (clipId, lt) => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip || !canvasRef.current) return;
    setSeeking(true);
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const { W, H } = dims;

    await new Promise(resolve => {
      const vid = document.createElement("video");
      const url = URL.createObjectURL(clip.file);
      vid.src = url;
      vid.onloadedmetadata = () => {
        vid.currentTime = Math.min(lt, vid.duration - 0.01);
        vid.onseeked = () => {
          const vW = vid.videoWidth || W, vH = vid.videoHeight || H;
          const scale = Math.min(W / vW, H / vH);
          const dW = vW * scale, dH = vH * scale, dX = (W - dW) / 2, dY = (H - dH) / 2;
          ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
          ctx.drawImage(vid, dX, dY, dW, dH);
          drawSubtitle(ctx, W, H, lt, clip.segments, subtitleStyle);
          URL.revokeObjectURL(url);
          resolve();
        };
      };
      vid.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    });

    setCurrentClipId(clipId);
    setLocalTime(lt);
    setSeeking(false);
  }, [clips, dims, subtitleStyle]);

  // Reproducción (segmento por segmento, sin silencio)
  const runPlay = useCallback(async () => {
    if (isPlaying || !analyzedClips.length) return;
    setIsPlaying(true); setDone(false); setPct(0);
    playRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) { setIsPlaying(false); playRef.current = false; return; }
    const ctx    = canvas.getContext("2d");
    const { W, H } = dims;
    canvas.width = W; canvas.height = H;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);

    let keptPlayed = 0;

    for (let ci = 0; ci < analyzedClips.length && playRef.current; ci++) {
      const clip = analyzedClips[ci];
      setCurrentClipId(clip.id);
      setClipInfo(`Clip ${ci + 1} / ${analyzedClips.length} — ${clip.name.replace(/\.[^/.]+$/, "")}`);

      const cuts = (clip.silences || []).filter(s => s.cut).sort((a, b) => a.start - b.start);
      const dur  = clip.duration || 0;
      const segs = [];
      let pos = 0;
      for (const s of cuts) {
        if (s.start > pos + 0.05) segs.push({ start: pos, end: s.start });
        pos = s.end;
      }
      if (pos < dur - 0.05) segs.push({ start: pos, end: dur });
      if (!segs.length) segs.push({ start: 0, end: dur });

      await new Promise(resolve => {
        const vid = document.createElement("video");
        const url = URL.createObjectURL(clip.file);
        vid.src = url;

        vid.addEventListener("loadedmetadata", async () => {
          const vW = vid.videoWidth || W, vH = vid.videoHeight || H;
          const scale = Math.min(W / vW, H / vH);
          const dW = vW * scale, dH = vH * scale, dX = (W - dW) / 2, dY = (H - dH) / 2;

          let animId;
          const draw = () => {
            ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
            ctx.drawImage(vid, dX, dY, dW, dH);
            drawSubtitle(ctx, W, H, vid.currentTime, clip.segments, subtitleStyle);
            animId = requestAnimationFrame(draw);
          };
          animId = requestAnimationFrame(draw);

          for (const seg of segs) {
            if (!playRef.current) break;
            vid.currentTime = seg.start;
            await new Promise(r => { vid.onseeked = r; });
            if (!playRef.current) break;
            vid.playbackRate = 1;
            vid.play().catch(() => {});
            const segKeptStart = keptPlayed;
            const segDur = seg.end - seg.start;

            await new Promise(segDone => {
              const tick = setInterval(() => {
                if (!playRef.current) { clearInterval(tick); vid.pause(); segDone(); return; }
                const ct = vid.currentTime;
                setLocalTime(ct);
                const played = Math.max(0, ct - seg.start);
                setPct(Math.round(Math.min(99, ((segKeptStart + played) / totalKept) * 100)));
                if (ct >= seg.end - 0.04 || vid.ended) {
                  clearInterval(tick); vid.pause();
                  keptPlayed += segDur;
                  segDone();
                }
              }, 50);
            });
          }

          cancelAnimationFrame(animId);
          URL.revokeObjectURL(url);
          resolve();
        });
        vid.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      });
    }

    if (playRef.current) { setDone(true); setClipInfo("Vista previa completa ✓"); setPct(100); }
    setIsPlaying(false); playRef.current = false;
  }, [analyzedClips, dims, subtitleStyle, totalKept, isPlaying]);

  const togglePlay = useCallback(() => {
    if (isPlaying) { playRef.current = false; }
    else { runPlay(); }
  }, [isPlaying, runPlay]);

  const handleSeekInClip = useCallback((clipId, lt) => {
    if (isPlaying) playRef.current = false;
    setTimeout(() => seekTo(clipId, lt), isPlaying ? 80 : 0);
  }, [isPlaying, seekTo]);

  return (
    <div className="sce-layout">
      {/* Input oculto para agregar más archivos */}
      <input ref={fileInputRef} type="file" accept="video/*,.mov,.mp4,.m4v,.webm" multiple
        style={{ display: "none" }} onChange={e => onAddFiles(e.target.files)} />

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="sce-topbar">
        <Logo width={88} />
        <div className="sce-topbar-center">
          {unanalyzed.length > 0 ? (
            <button className="sce-analyze-pill" onClick={onAnalyze}>
              🔍 Analizar {unanalyzed.length} clip{unanalyzed.length > 1 ? "s" : ""} nuevo{unanalyzed.length > 1 ? "s" : ""}
            </button>
          ) : clipInfo ? (
            <span className="sce-clip-info-tag">{clipInfo}</span>
          ) : (
            <span className="sce-clip-info-tag">Editor · {analyzedClips.length} clip{analyzedClips.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="sce-topbar-right">
          <button className="sc-btn-primary sc-btn-sm" onClick={onExport}>✂️ Exportar</button>
        </div>
      </div>

      {/* ── Cuerpo principal ─────────────────────────────────────────────── */}
      <div className="sce-body">
        {/* Canvas + barra de reproducción */}
        <div className="sce-canvas-col">
          <div className="sce-canvas-wrap" onClick={!isPlaying && !seeking ? togglePlay : undefined}>
            <canvas ref={canvasRef} className="sce-canvas" width={dims.W} height={dims.H} />

            {!isPlaying && !seeking && (
              <div className="sce-canvas-overlay">
                <button className="sc-play-big-btn"
                  onClick={e => { e.stopPropagation(); togglePlay(); }}>
                  {done ? "↺" : "▶"}
                </button>
              </div>
            )}
            {seeking && (
              <div className="sce-canvas-overlay">
                <div className="sce-seeking-spinner" />
              </div>
            )}
          </div>

          <div className="sce-playbar">
            <button className="sce-playbtn" onClick={togglePlay}>
              {isPlaying ? "⏸" : done ? "↺" : "▶"}
            </button>
            <div className="sce-scrubber">
              <div className="sce-scrubber-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="sce-pct-label">{pct}%</span>
          </div>
        </div>

        {/* Panel de subtítulos */}
        <SubtitlePanel
          clips={clips}
          setClips={setClips}
          currentClipId={currentClipId}
          localTime={localTime}
          subtitleStyle={subtitleStyle}
          onStyleChange={onStyleChange}
          onTranscribe={onTranscribe}
          onSeekInClip={handleSeekInClip}
          listRef={subListRef}
        />
      </div>

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      <ClipTimeline
        clips={clips}
        currentClipId={currentClipId}
        localTime={localTime}
        onSeekByClip={handleSeekInClip}
        onToggleSilence={toggleSilence}
        onMoveClip={moveClip}
        onRemoveClip={removeClip}
        onAddFiles={() => fileInputRef.current?.click()}
      />
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
  const inputRef  = useRef(null);
  const abortRef  = useRef(false);
  const preset    = "normal";
  const { noise: noiseDb, duration: minDur } = PRESETS[preset];

  // ── Agregar archivos ──────────────────────────────────────────────────
  const addFiles = useCallback(async (files) => {
    const valid = Array.from(files).filter(f =>
      /\.(mp4|mov|m4v|webm|avi)$/i.test(f.name) || f.type.startsWith("video/")
    );
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
  }, []);

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  // ── Analizar ──────────────────────────────────────────────────────────
  const analizarTodos = async () => {
    const toAnalyze = clips.filter(c => !c.analyzed);
    if (!toAnalyze.length) return;
    setFase("analyzing"); setError("");
    for (let i = 0; i < toAnalyze.length; i++) {
      const clip = toAnalyze[i];
      setProgressMsg(`Analizando clip ${i + 1} de ${toAnalyze.length}: ${clip.name}`);
      setProgress(Math.round((i / toAnalyze.length) * 100));
      try {
        const { duration, waveform, silences } = await analyzeClip(clip.file, noiseDb, minDur);
        setClips(prev => prev.map(c => c.id === clip.id
          ? { ...c, duration, waveform, silences, analyzed: true, error: null } : c));
      } catch (_) {
        setClips(prev => prev.map(c => c.id === clip.id
          ? { ...c, analyzed: true, error: "No se pudo analizar el audio" } : c));
      }
    }
    setFase("editor");
  };

  // ── Toggle silencios ──────────────────────────────────────────────────
  const toggleSilence = (clipId, silenceId) => {
    setClips(prev => prev.map(c => c.id !== clipId ? c : {
      ...c, silences: c.silences.map(s => s.id === silenceId ? { ...s, cut: !s.cut } : s),
    }));
  };

  // ── Reordenar / quitar ────────────────────────────────────────────────
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

  // ── Transcribir ───────────────────────────────────────────────────────
  const transcribeAll = async () => {
    const ready = clips.filter(c => c.analyzed && !c.error);
    if (!ready.length) return;
    setFase("transcribing"); setError("");
    for (let i = 0; i < ready.length; i++) {
      const clip = ready[i];
      setProgressMsg(`Transcribiendo clip ${i + 1} de ${ready.length}: ${clip.name}`);
      setProgress(Math.round((i / ready.length) * 100));
      try {
        const segments = await transcribeClip(clip.file, info => {
          if (info.status === "downloading") {
            const pct = info.progress ? Math.round(info.progress) : 0;
            setProgressMsg(`Descargando modelo Whisper... ${pct}%`);
          }
        });
        setClips(prev => prev.map(c => c.id === clip.id ? { ...c, segments, transcribed: true } : c));
      } catch (_) {
        setClips(prev => prev.map(c => c.id === clip.id
          ? { ...c, segments: [], transcribed: true, transcribeError: "No se pudo transcribir" } : c));
      }
    }
    setFase("editor");
  };

  // ── Exportar ──────────────────────────────────────────────────────────
  const exportar = async () => {
    const ready = clips.filter(c => c.analyzed && !c.error);
    if (!ready.length) { setError("Analiza los clips primero."); return; }
    abortRef.current = false;
    setFase("cutting"); setProgress(0); setError("");
    try {
      const blob = await recordAllClips(ready, (p, msg) => {
        setProgress(Math.round(p * 100)); setProgressMsg(msg);
      }, abortRef, subtitleStyle);
      const totalOriginal = ready.reduce((t, c) => t + (c.duration || 0), 0);
      const totalCut = ready.reduce((t, c) =>
        t + c.silences.filter(s => s.cut).reduce((s, si) => s + si.end - si.start, 0), 0);
      const totalCuts = ready.reduce((t, c) => t + c.silences.filter(s => s.cut).length, 0);
      setResult({
        url: URL.createObjectURL(blob),
        filename: (clips[0]?.name.replace(/\.[^/.]+$/, "") || "video") + "_editado.webm",
        totalOriginal, totalKept: totalOriginal - totalCut, totalCut, totalCuts,
        clipsCount: ready.length,
      });
      setFase("done");
    } catch (err) {
      if (err.message !== "Cancelado") setError("Error al exportar: " + err.message);
      setFase("editor");
    }
  };

  // ── Cálculos globales ─────────────────────────────────────────────────
  const analyzedCount = clips.filter(c => c.analyzed && !c.error).length;
  const totalCutTime  = clips.reduce((t, c) =>
    t + (c.silences?.filter(s => s.cut).reduce((s, si) => s + si.end - si.start, 0) ?? 0), 0);
  const totalCuts     = clips.reduce((t, c) => t + (c.silences?.filter(s => s.cut).length ?? 0), 0);

  // ── Pantallas de proceso ──────────────────────────────────────────────
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

  if (fase === "transcribing") return (
    <div className="sc-page sc-page--center">
      <Logo width={100} />
      <div className="sc-processing">
        <div className="sc-proc-rings">
          <div className="sc-proc-ring sc-proc-ring--1" /><div className="sc-proc-ring sc-proc-ring--2" /><div className="sc-proc-ring sc-proc-ring--3" />
          <span className="sc-proc-icon">💬</span>
        </div>
        <h2 className="sc-proc-title">Generando subtítulos...</h2>
        <div className="sc-progress-bar-wrap" style={{ width: 320 }}>
          <div className="sc-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <p className="sc-proc-note">{progressMsg}</p>
        <p className="sc-proc-note sc-proc-note--small">La primera vez descarga el modelo Whisper (~77 MB). Luego queda guardado.</p>
      </div>
    </div>
  );

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
        <button className="sc-btn-outline" onClick={() => {
          if (result?.url) URL.revokeObjectURL(result.url);
          setResult(null); setFase("editor");
        }}>✂️ Editar más clips</button>
        <div className="sc-done-cta">
          <p>¿Quieres gestionar tu negocio, contenido y clientes en un solo lugar?</p>
          <a href="/">Crear mi cuenta en Mamá CEO →</a>
        </div>
      </div>
    </div>
  );

  // ── EDITOR con clips analizados → interfaz de 3 paneles ───────────────
  if (fase === "editor" && analyzedCount > 0) return (
    <EditorScreen
      clips={clips}
      setClips={setClips}
      subtitleStyle={subtitleStyle}
      onStyleChange={setSubtitleStyle}
      onTranscribe={transcribeAll}
      onExport={exportar}
      onAddFiles={addFiles}
      moveClip={moveClip}
      removeClip={removeClip}
      toggleSilence={toggleSilence}
      onAnalyze={analizarTodos}
    />
  );

  // ── EDITOR sin clips analizados → pantalla de subida ─────────────────
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
          <div className="sc-empty-state">
            <span>🎬</span>
            <p>Agrega tus clips arriba para empezar</p>
            <p className="sc-empty-hint">Puedes agregar múltiples videos y se combinarán en el orden que definas</p>
          </div>
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
