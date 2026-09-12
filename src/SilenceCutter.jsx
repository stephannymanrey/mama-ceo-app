import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Logo from "./Logo";
import { getAwsAuthToken, awsAuth } from "./lib/awsClient";
import RegisterGate from "./RegisterGate";
import "./SilenceCutter.css";

const REELS_API = "https://lq3avrfazlfuyaakkt5iwz54ym0aqxvv.lambda-url.us-east-1.on.aws/";

// ── Constantes ────────────────────────────────────────────────────────────
const PRESETS = {
  conservadora: { noise: -45, duration: 0.8 },
  normal:       { noise: -35, duration: 0.5 },
  agresiva:     { noise: -28, duration: 0.3 },
};
const PADDING = 0.03;
const CLIP_COLORS   = ["#C4526A","#4A90BF","#5FB87A","#B07FD4","#D4955F","#5FB8B0"];
// Segundo pass de suavizante: overlay borroso semitransparente sobre el frame
// ya dibujado. El frame original da definición de bordes (ojos, labios, contorno);
// este overlay solo suaviza texturas finas (poros, líneas pequeñas).
// Técnica usada por apps de belleza: blend de versión borrosa a baja opacidad.
function applySkinOverlay(ctx, source, x, y, w, h, skin) {
  if (!skin) return;
  const t = skin / 100;
  ctx.save();
  ctx.globalAlpha = t * 0.55;
  ctx.filter = `blur(${(1 + t * 1.5).toFixed(1)}px) brightness(${(1 + t * 0.05).toFixed(2)}) saturate(${(1 + t * 0.10).toFixed(2)})`;
  ctx.drawImage(source, x, y, w, h);
  ctx.restore();
}


// Presets de edición automática
const VIDEO_PRESETS = [
  { id: "natural",  icon: "🌿", label: "Natural",  values: { brightness: 8,  contrast: 5,  saturation: 5,   skin: 30, temperature: 0   } },
  { id: "warm",     icon: "☀️", label: "Cálida",   values: { brightness: 5,  contrast: 5,  saturation: 10,  skin: 30, temperature: 35  } },
  { id: "vibrant",  icon: "✨", label: "Vibrante", values: { brightness: 5,  contrast: 12, saturation: 25,  skin: 30, temperature: 0   } },
  { id: "fresh",    icon: "❄️", label: "Fresca",   values: { brightness: 5,  contrast: 10, saturation: 5,   skin: 0,  temperature: -30 } },
  { id: "cinema",   icon: "🎬", label: "Cinema",   values: { brightness: -5, contrast: 18, saturation: -12, skin: 0,  temperature: -15 } },
  { id: "none",     icon: "—",  label: "Sin efecto", values: { brightness: 0, contrast: 0,  saturation: 0,   skin: 0,  temperature: 0, bokeh: 0 } },
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

// Corrección de color — skin es un pass separado (applySkinOverlay)
function buildVidFilter(brightness, contrast, saturation) {
  const parts = [];
  if (brightness) parts.push(`brightness(${(1 + brightness / 100).toFixed(2)})`);
  if (contrast)   parts.push(`contrast(${(1 + contrast / 100).toFixed(2)})`);
  if (saturation) parts.push(`saturate(${(1 + saturation / 100).toFixed(2)})`);
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

// ── Audio / análisis ──────────────────────────────────────────────────────
// Ambas funciones ceden el hilo cada cierto número de ventanas: con un video
// de 30-40 min hay decenas de millones de muestras, y recorrerlas en un solo
// bloque síncrono congela la pestaña varios segundos. Cediendo con
// setTimeout(0) cada tantas ventanas, la UI (barra de progreso, botones)
// sigue respondiendo mientras se analiza.
async function buildWaveform(channelData, points = 900, onProgress) {
  const step = Math.floor(channelData.length / points) || 1;
  const w = new Float32Array(points);
  const CHUNK_POINTS = 40;
  for (let i = 0; i < points; i++) {
    let max = 0;
    const from = i * step, to = Math.min(from + step, channelData.length);
    for (let j = from; j < to; j++) { const v = channelData[j]; const av = v < 0 ? -v : v; if (av > max) max = av; }
    w[i] = max;
    if (i % CHUNK_POINTS === 0) {
      onProgress?.(i / points);
      await new Promise(r => setTimeout(r, 0));
    }
  }
  return w;
}
async function detectSilences(channelData, sampleRate, noiseDb, minDuration, duration, onProgress) {
  const ws = Math.floor(sampleRate * 0.04);
  const silences = [];
  let inSilence = false, silenceStart = 0;
  const totalWindows = Math.ceil(channelData.length / ws) || 1;
  const CHUNK_WINDOWS = 3000;
  let windowIdx = 0;
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
    windowIdx++;
    if (windowIdx % CHUNK_WINDOWS === 0) {
      onProgress?.(windowIdx / totalWindows);
      await new Promise(r => setTimeout(r, 0));
    }
  }
  if (inSilence && duration - silenceStart >= minDuration)
    silences.push({ id: uid(), start: Math.max(0, silenceStart + PADDING), end: duration, cut: true });
  return silences;
}
async function analyzeClip(file, noiseDb, minDuration, onProgress) {
  // PATH RÁPIDO: decodeAudioData (desktop, Android Chrome, FF)
  // Falla en iOS Safari porque no puede extraer audio de un contenedor de video
  try {
    const arrayBuffer = await file.arrayBuffer();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    const audioBuf = await new Promise((res, rej) => audioCtx.decodeAudioData(arrayBuffer, res, rej));
    audioCtx.close();
    const channelData = audioBuf.getChannelData(0);
    onProgress?.(0.1);
    const silences = await detectSilences(
      channelData, audioBuf.sampleRate, noiseDb, minDuration, audioBuf.duration,
      (p) => onProgress?.(0.1 + p * 0.55)
    );
    const waveform = await buildWaveform(channelData, 900, (p) => onProgress?.(0.65 + p * 0.35));
    onProgress?.(1);
    return { duration: audioBuf.duration, waveform, silences };
  } catch {
    // PATH MOBILE: análisis en tiempo real vía <video> + AnalyserNode
    // Funciona en iOS Safari — el video.muted=true permite autoplay sin gesto adicional
    return analyzeViaVideoElement(file, noiseDb, minDuration, onProgress);
  }
}

function analyzeViaVideoElement(file, noiseDb, minDuration, onProgress) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;          // muted permite autoplay en iOS sin gesto
    video.playsInline = true;
    video.preload = "auto";

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      if (!isFinite(duration) || duration <= 0) {
        URL.revokeObjectURL(url);
        reject(new Error("Video sin duración válida"));
        return;
      }

      try { await audioCtx.resume(); } catch {}

      // Conectar video → ScriptProcessorNode (silencioso, sin speakers, gain 0).
      // Antes se usaba un AnalyserNode muestreado con requestAnimationFrame —
      // pero rAF (y setInterval) se frena drásticamente cuando la pestaña
      // pasa a segundo plano (algo muy probable durante los ~12 min que
      // toma reproducir un video de 24 min al doble de velocidad), y como
      // esta ruta nunca reproduce audio real, Chrome no la exime del
      // throttling — el resultado era casi sin muestras y "0 silencios"
      // aunque el video sí los tuviera. onaudioprocess corre en el hilo de
      // audio, that keeps firing sí la pestaña está oculta.
      const source = audioCtx.createMediaElementSource(video);
      const BUFFER_SIZE = 4096;
      const processor = audioCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);
      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(audioCtx.destination);

      const WIN = Math.floor(audioCtx.sampleRate * 0.04); // mismas ventanas de 40ms que detectSilences
      const sampleRms = [];   // [{ t, rms }]
      let sampleCount = 0;
      let lastProgressT = 0;

      processor.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i += WIN) {
          const count = Math.min(WIN, data.length - i);
          let sumSq = 0;
          for (let j = 0; j < count; j++) sumSq += data[i + j] * data[i + j];
          const t = sampleCount / audioCtx.sampleRate;
          sampleRms.push({ t, rms: Math.sqrt(sumSq / count) });
          sampleCount += count;
        }
        const t = sampleCount / audioCtx.sampleRate;
        if (onProgress && t - lastProgressT > 0.2) { lastProgressT = t; onProgress(Math.min(1, t / duration)); }
      };

      // iOS max playbackRate = 2; Chrome permite más
      video.playbackRate = Math.min(
        typeof video.playbackRate !== "undefined" ? 16 : 2,
        2   // seguro en iOS
      );

      video.play().catch(err => {
        processor.disconnect(); source.disconnect();
        audioCtx.close();
        URL.revokeObjectURL(url);
        reject(err);
      });

      video.onended = () => {
        processor.disconnect(); source.disconnect();
        audioCtx.close();
        URL.revokeObjectURL(url);

        const n = sampleRms.length;
        if (n === 0) { reject(new Error("Sin muestras de audio")); return; }

        // Waveform normalizado de 900 puntos
        const waveform = Array.from({ length: 900 }, (_, wi) => {
          const idx = Math.min(n - 1, Math.floor(wi / 900 * n));
          return sampleRms[idx]?.rms ?? 0;
        });
        const maxR = Math.max(...waveform, 1e-6);
        const waveformNorm = waveform.map(v => v / maxR);

        // Detectar silencios desde muestras rms
        const silences = [];
        let inSilence = false, silStart = 0;
        for (const { t, rms } of sampleRms) {
          const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
          if (db < noiseDb) {
            if (!inSilence) { inSilence = true; silStart = t; }
          } else if (inSilence) {
            inSilence = false;
            const dur = t - silStart;
            if (dur >= minDuration)
              silences.push({ id: uid(), start: Math.max(0, silStart + PADDING), end: Math.min(duration, t - PADDING), cut: true });
          }
        }
        if (inSilence && duration - silStart >= minDuration)
          silences.push({ id: uid(), start: Math.max(0, silStart + PADDING), end: duration, cut: true });

        resolve({ duration, waveform: waveformNorm, silences });
      };

      video.onerror = () => {
        processor.disconnect(); source.disconnect();
        audioCtx.close();
        URL.revokeObjectURL(url);
        reject(new Error("Error cargando el video"));
      };
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo abrir el archivo de video"));
    };
  });
}

// ── Transcripción (Whisper Tiny — Web Worker) ─────────────────────────────
// El decode/resample de audio corre aquí en el hilo principal: OfflineAudioContext
// no está garantizado dentro de un Worker (rompía la transcripción con
// "OfflineAudioContext is not defined" en Chrome desktop). Solo el modelo Whisper
// —la parte realmente pesada— corre en el Worker.
//
// decodeAudioData(arrayBuffer) directo sobre el archivo original falla con
// "Unable to decode audio data" en varios videos grabados con celular (MOV/MP4
// con estructuras de contenedor que el decoder estricto de Web Audio rechaza,
// aunque el mismo archivo se reproduzca perfecto en un <video>). Reproducimos
// el video real y grabamos su audio (misma técnica que ya usa la exportación
// en recordAllClips) — así heredamos el decoder mucho más tolerante que usa
// el elemento <video>, y solo al final decodificamos el audio ya grabado
// (webm/opus), que sí es un formato que decodeAudioData maneja sin problema.
async function extractAudioViaPlayback(file, onProgress, knownDuration) {
  const url = URL.createObjectURL(file);
  const videoEl = document.createElement("video");
  videoEl.src = url;
  videoEl.preload = "auto";
  await new Promise((resolve, reject) => {
    videoEl.onloadedmetadata = resolve;
    videoEl.onerror = () => reject(new Error("No se pudo abrir el video para extraer el audio"));
  });
  // Algunos videos de celular reportan duration=Infinity hasta que el navegador
  // termina de escanear el archivo — usamos la duración que la app ya conoce
  // (calculada antes, al analizar silencios) para que el progreso no se quede en 0%.
  const dur = knownDuration || (Number.isFinite(videoEl.duration) ? videoEl.duration : 0);

  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaElementSource(videoEl);
  const destination = audioCtx.createMediaStreamDestination();
  source.connect(destination);

  const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
    .find(t => window.MediaRecorder?.isTypeSupported(t)) || "audio/webm";
  const recorder = new MediaRecorder(destination.stream, { mimeType });
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  const stopped = new Promise(resolve => { recorder.onstop = resolve; });

  // Vigía anti-cuelgue: si currentTime deja de avanzar (pestaña en segundo
  // plano, política de autoplay que "resuelve" sin reproducir de verdad,
  // etc.), esto fallaba en silencio para siempre esperando "ended". Si no
  // avanza nada en 10s seguidos, abortamos con un error claro en vez de
  // dejar a la usuaria esperando indefinidamente.
  const STALL_MS = 10000;
  let lastCurrentTime = -1;
  let lastAdvanceAt = Date.now();
  const progressTimer = setInterval(() => {
    if (videoEl.currentTime !== lastCurrentTime) {
      lastCurrentTime = videoEl.currentTime;
      lastAdvanceAt = Date.now();
    }
    if (dur) onProgress?.(Math.min(99, Math.round((videoEl.currentTime / dur) * 100)));
  }, 250);

  let watchdog;
  try {
    recorder.start(250);
    await videoEl.play();
    await Promise.race([
      new Promise(resolve => { videoEl.onended = resolve; }),
      new Promise((_, reject) => {
        watchdog = setInterval(() => {
          if (Date.now() - lastAdvanceAt > STALL_MS) {
            reject(new Error("El video dejó de reproducirse (¿la pestaña estaba en segundo plano?). Mantén esta pestaña visible mientras se procesa e intenta de nuevo."));
          }
        }, 1000);
      }),
    ]);
    recorder.stop();
    await stopped;
    onProgress?.(100);
  } finally {
    clearInterval(progressTimer);
    clearInterval(watchdog);
    if (recorder.state !== "inactive") { try { recorder.stop(); } catch {} }
    try { videoEl.pause(); } catch {}
    try { source.disconnect(); } catch {}
    URL.revokeObjectURL(url);
    try { await audioCtx.close(); } catch {}
  }

  const blob = new Blob(chunks, { type: mimeType });
  const buf = await blob.arrayBuffer();
  const decodeCtx = new AudioContext();
  const decoded = await decodeCtx.decodeAudioData(buf);
  await decodeCtx.close();
  return decoded;
}

async function getKeptAudioMono16k(file, silences, onExtractProgress, knownDuration) {
  const TARGET_SR = 16000;

  // Camino rápido primero: decodeAudioData directo es instantáneo y funciona
  // para la mayoría de videos. Solo si falla (algunos MOV/MP4 de celular con
  // contenedores que el decoder estricto de Web Audio rechaza) caemos al
  // método lento pero tolerante de reproducir + grabar en tiempo real.
  let decoded;
  try {
    const buf = await file.arrayBuffer();
    const fastCtx = new AudioContext();
    decoded = await fastCtx.decodeAudioData(buf);
    await fastCtx.close();
    onExtractProgress?.(100);
  } catch (err) {
    console.warn("[getKeptAudioMono16k] decodeAudioData directo falló, usando extracción por reproducción:", err?.message);
    decoded = await extractAudioViaPlayback(file, onExtractProgress, knownDuration);
  }
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

let _whisperWorker = null;
function getWhisperWorker() {
  if (!_whisperWorker) {
    _whisperWorker = new Worker(
      new URL("./whisperWorker.js", import.meta.url),
      { type: "module" }
    );
  }
  return _whisperWorker;
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

// Extrae y resamplea el audio en el hilo principal, luego envía solo el
// Float32Array (transferible) al Worker — este ya no toca OfflineAudioContext.
async function transcribeClip(file, silences, onModelProgress, knownDuration) {
  onModelProgress?.({ status: "extracting", progress: 0 });
  const { audio, mappingRanges } = await getKeptAudioMono16k(file, silences,
    pct => onModelProgress?.({ status: "extracting", progress: pct }), knownDuration);
  return new Promise((resolve, reject) => {
    const worker = getWhisperWorker();
    const id = uid();
    const onMsg = ({ data }) => {
      if (data.id !== id) return;
      if (data.type === "progress") {
        onModelProgress?.(data.info);
      } else if (data.type === "result") {
        worker.removeEventListener("message", onMsg);
        const segs = (data.chunks || []).map(c => {
          const cs = c.timestamp?.[0] ?? 0;
          const ce = c.timestamp?.[1] ?? (cs + 0.5);
          return {
            word:  c.text.replace(/^\s+/, ""),
            start: mapCondensedToOriginal(cs, mappingRanges),
            end:   mapCondensedToOriginal(ce, mappingRanges),
          };
        }).filter(s => s.word);
        resolve(segs);
      } else if (data.type === "error") {
        worker.removeEventListener("message", onMsg);
        reject(new Error(data.message));
      }
    };
    const onErr = (e) => {
      worker.removeEventListener("message", onMsg);
      worker.removeEventListener("error", onErr);
      _whisperWorker = null; // reset para que el siguiente intento cree un Worker fresco
      reject(new Error(`Worker error: ${e.message || "fallo al cargar el modelo Whisper"}`));
    };
    worker.addEventListener("message", onMsg);
    worker.addEventListener("error", onErr);
    worker.postMessage({ id, audio }, [audio.buffer]);
  });
}

// ── Subtítulos ────────────────────────────────────────────────────────────
function drawSubtitle(ctx, W, H, time, words, style = {}) {
  if (!words?.length) return;
  const font      = style.font    || "Poppins";
  const hlColor   = style.hlColor || "#FFE44D";
  const variant   = style.variant || "highlight"; // highlight|classic|bold|outline
  const sizeScale = style.size === "small" ? 0.72 : style.size === "large" ? 1.35 : 1.0;
  let fs          = Math.max(22, Math.floor(H / 13 * sizeScale));
  const GROUP     = 4;

  let idx = words.findIndex(w => time >= w.start && time <= w.end);
  if (idx === -1) {
    const prev = [...words].reverse().find(w => time > w.end);
    if (!prev) return;
    idx = words.indexOf(prev);
    const nextGroup = Math.floor(idx / GROUP) * GROUP + GROUP;
    if (nextGroup < words.length && words[nextGroup].start - time > 3.0) return;
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
  const maxW = W * 0.86;
  if (totalW > maxW) {
    fs = Math.floor(fs * (maxW / totalW));
    ctx.font = `800 ${fs}px "${font}", sans-serif`;
    wMeasures.forEach((_, i) => {
      wMeasures[i] = ctx.measureText(group[i].word + (i < group.length - 1 ? " " : "")).width;
    });
    totalW = wMeasures.reduce((a, b) => a + b, 0);
  }

  const pos  = style.position || "bottom";
  const y    = Math.round(pos === "top" ? H * 0.10 : pos === "center" ? H * 0.50 : H * 0.87);
  let x      = W / 2 - totalW / 2;
  const padX = 5, padY = 3;

  group.forEach((w, i) => {
    const isCurrent = time >= w.start && time <= w.end;
    const wordText  = w.word + (i < group.length - 1 ? " " : "");
    const wordW     = ctx.measureText(w.word).width;

    if (variant === "outline") {
      // Contorno negro + relleno blanco (color en la palabra activa) — sin caja de fondo.
      ctx.lineWidth = Math.max(2, fs * 0.09);
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineJoin = "round";
      ctx.strokeText(wordText, x, y);
      ctx.fillStyle = isCurrent ? hlColor : "#fff";
    } else if (variant === "bold") {
      // La palabra activa cambia de color (sin caja) en vez de resaltarse con fondo.
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = isCurrent ? 8 : 4;
      ctx.fillStyle = isCurrent ? hlColor : "rgba(255,255,255,0.95)";
    } else if (variant === "classic") {
      // Texto blanco simple con sombra — sin ningún resaltado por palabra.
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 4;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
    } else {
      // "highlight" (default): caja de color detrás de la palabra activa.
      if (isCurrent) {
        ctx.fillStyle = hlColor;
        ctx.beginPath();
        ctx.roundRect(x - padX, y - fs - padY, wordW + padX * 2, fs + padY * 2, 6);
        ctx.fill();
        ctx.fillStyle = "#1a1a2e";
      } else {
        ctx.shadowColor = "rgba(0,0,0,0.9)";
        ctx.shadowBlur = 4;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
      }
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
async function recordAllClips(clips, onProgress, abortRef, format = "landscape") {
  const keptSegs = buildKeptSegments(clips);
  const uniqueClipIds = [...new Set(keptSegs.map(s => s.clip.id))];
  const firstClip = keptSegs[0]?.clip || clips[0];

  const firstVid = document.createElement("video");
  const firstUrl = URL.createObjectURL(firstClip.file);
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
    mimeType, videoBitsPerSecond: 12_000_000, audioBitsPerSecond: 192_000,
  });
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start(100);

  const totalKept = keptSegs.reduce((t, s) => t + s.end - s.start, 0) || 1;
  let elapsed = 0; // tiempo efectivo (post-corte) ya grabado

  for (let ci = 0; ci < uniqueClipIds.length; ci++) {
    if (abortRef.current) break;
    const clipId = uniqueClipIds[ci];
    const clipSegs = keptSegs.filter(s => s.clip.id === clipId);
    const clip = clipSegs[0].clip;
    onProgress(elapsed / totalKept, `Procesando clip ${ci + 1} de ${uniqueClipIds.length}: ${clip.name}`);

    await new Promise(resolve => {
      const videoEl = document.createElement("video");
      const url = URL.createObjectURL(clip.file);
      videoEl.src = url; videoEl.crossOrigin = "anonymous";

      videoEl.addEventListener("loadedmetadata", async () => {
        let source;
        try { source = audioCtx.createMediaElementSource(videoEl); source.connect(destination); } catch {}
        const vW = videoEl.videoWidth || W, vH = videoEl.videoHeight || H;
        // Recorte a llenar (crop-to-fill): el sujeto ocupa todo el cuadro,
        // sin barras borrosas arriba/abajo en vertical/cuadrado.
        const scale = Math.max(outW / vW, outH / vH);
        const dW = vW * scale, dH = vH * scale;
        const dX = (outW - dW) / 2, dY = (outH - dH) / 2;

        let animId;
        const drawLoop = () => {
          if (!videoEl.paused && !videoEl.ended) {
            ctx.fillStyle = "#000"; ctx.fillRect(0, 0, outW, outH);
            ctx.drawImage(videoEl, dX, dY, dW, dH);
          }
          animId = requestAnimationFrame(drawLoop);
        };
        animId = requestAnimationFrame(drawLoop);

        for (let si = 0; si < clipSegs.length; si++) {
          if (abortRef.current) break;
          const seg = clipSegs[si];
          const segEtStart = elapsed;

          videoEl.currentTime = seg.start;
          await new Promise(r => { videoEl.onseeked = r; });
          if (abortRef.current) break;
          videoEl.playbackRate = 1; videoEl.volume = 1;
          videoEl.play().catch(() => {});

          await new Promise(segDone => {
            const interval = setInterval(() => {
              if (abortRef.current) { clearInterval(interval); videoEl.pause(); segDone(); return; }
              const ct = videoEl.currentTime;
              const newEt = segEtStart + Math.max(0, ct - seg.start);
              onProgress(newEt / totalKept, `Procesando clip ${ci + 1} de ${uniqueClipIds.length}: ${clip.name}`);
              if (videoEl.ended || ct >= seg.end - 0.05) {
                clearInterval(interval); videoEl.pause(); segDone();
              }
            }, 60);
          });
          elapsed = segEtStart + (seg.end - seg.start);
        }

        cancelAnimationFrame(animId);
        if (source) try { source.disconnect(); } catch {}
        URL.revokeObjectURL(url);
        resolve();
      });
      videoEl.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    });
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
  const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 12_000_000, audioBitsPerSecond: 192_000 });
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start(100);

  const segDuration = Math.max(0.1, end - start);
  const { brightness = 0, contrast = 0, saturation = 0, skin = 0, temperature = 0 } = effects;
  const vf = buildVidFilter(brightness, contrast, saturation);

  await new Promise(resolve => {
    const vid = document.createElement("video");
    const url = URL.createObjectURL(clip.file);
    vid.src = url; vid.crossOrigin = "anonymous";
    vid.addEventListener("loadedmetadata", async () => {
      let src;
      try { src = audioCtx.createMediaElementSource(vid); src.connect(destination); } catch {}
      const vW = vid.videoWidth || W, vH = vid.videoHeight || H;
      // Recorte a llenar (crop-to-fill): el sujeto ocupa todo el cuadro, sin
      // barras borrosas arriba/abajo — clave en vertical para que no se vea "encogido".
      const scale = Math.max(outW / vW, outH / vH);
      const dW = vW * scale, dH = vH * scale, dX = (outW - dW) / 2, dY = (outH - dH) / 2;

      let animId;
      const drawLoop = () => {
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, outW, outH);
        if (!vid.paused && !vid.ended) {
          if (vf) { ctx.save(); ctx.filter = vf; }
          ctx.drawImage(vid, dX, dY, dW, dH);
          if (vf) ctx.restore();
          applySkinOverlay(ctx, vid, dX, dY, dW, dH, skin);
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
          if (src) try { src.disconnect(); } catch {}
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


// ── Timeline contraído ────────────────────────────────────────────────────
function ClipTimeline({ keptSegs, totalKept, effectiveTime, onSeek, allClips, onMoveClip, onRemoveClip, onAddFiles, onCutSeg, selectedSeg = null, onSelectSeg }) {
  const pct = totalKept > 0 ? Math.min(100, (effectiveTime / totalKept) * 100) : 0;
  const [hoveredSeg, setHoveredSeg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const trackWrapRef = useRef(null);
  const seekDragRef  = useRef(false);

  useEffect(() => {
    const el = trackWrapRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom(z => Math.max(1, Math.min(60, z * (e.deltaY > 0 ? 0.85 : 1.18))));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Scrubber drag — se arrastra en tiempo real con el puntero
  const SKIP_DRAG = [".sce-tl-seg-del",".sce-tl-seg-toolbar"];
  const doSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(p * totalKept);
  };
  const handleSeekDown = (e) => {
    if (SKIP_DRAG.some(s => e.target.closest(s))) return;
    seekDragRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    doSeek(e);
  };
  const handleSeekMove = (e) => { if (seekDragRef.current) doSeek(e); };
  const handleSeekUp   = ()  => { seekDragRef.current = false; };

  return (
    <div className="sce-timeline">
      <div className="sce-tl-header">
        <span className="sce-tl-label">TIMELINE</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="sce-tl-duration">{fmtTime(effectiveTime)} / {fmtTime(totalKept)}</span>
          <div className="sce-tl-zoom-controls">
            <button className="sce-tl-zoom-btn" title="Alejar (Ctrl + rueda del mouse)"
              onClick={() => setZoom(z => Math.max(1, z * 0.8))} disabled={zoom <= 1.05}>−</button>
            <span className="sce-tl-zoom-value">×{zoom.toFixed(1)}</span>
            <button className="sce-tl-zoom-btn" title="Acercar para cortar con más precisión (Ctrl + rueda del mouse)"
              onClick={() => setZoom(z => Math.min(60, z * 1.25))} disabled={zoom >= 60}>+</button>
            {zoom > 1.05 && <button className="sce-tl-zoom-reset" onClick={() => setZoom(1)} title="Restablecer zoom">Reset</button>}
          </div>
        </div>
      </div>
      <div className="sce-tl-body">
        {/* Labels de pista — fijos, no scrollean */}
        <div className="sce-tl-labels">
          <div className="sce-tl-label-row"><span>🎬</span><span>Video</span></div>
        </div>

        {/* Pistas — scroll horizontal + zoom trackpad */}
        <div ref={trackWrapRef} className="sce-tl-scroll-wrap">
          <div style={{ position: "relative", width: zoom > 1 ? `${zoom * 100}%` : "100%", display: "flex", flexDirection: "column", gap: 2, padding: "4px 0" }}
            onPointerDown={handleSeekDown}
            onPointerMove={handleSeekMove}
            onPointerUp={handleSeekUp}
            onPointerCancel={handleSeekUp}
          >

          {/* Playhead que atraviesa todas las pistas */}
          {totalKept > 0 && <div className="sce-tl-ph-all" style={{ left: `${pct}%` }} />}

          {/* Pista — Video */}
          <div className="sce-tl-track">
            {keptSegs.length === 0 && (
              <div className="sce-tl-empty">Analiza los clips para ver el timeline</div>
            )}
            {keptSegs.map((seg, i) => {
              const w = (seg.end - seg.start) / (totalKept || 1) * 100;
              const clipIdx = allClips.findIndex(c => c.id === seg.clip.id);
              const color = CLIP_COLORS[clipIdx % CLIP_COLORS.length] || "#C4526A";
              const isHov = hoveredSeg === i;
              const isSel = selectedSeg && selectedSeg.clipId === seg.clip.id && selectedSeg.start === seg.start && selectedSeg.end === seg.end;
              return (
                <div key={i}
                  className={`sce-tl-seg${isHov ? " hovered" : ""}${isSel ? " selected" : ""}`}
                  style={{ width: `${w}%`, "--seg-color": color }}
                  title={isSel ? "Seleccionado — pulsa Delete para eliminar" : `${seg.clip.name.replace(/\.[^/.]+$/, "")} · ${fmtTime(seg.start)}–${fmtTime(seg.end)} — clic para seleccionar`}
                  onClick={e => {
                    if (e.target.closest(".sce-tl-seg-toolbar")) return;
                    onSelectSeg?.(isSel ? null : { clipId: seg.clip.id, start: seg.start, end: seg.end });
                  }}
                  onMouseEnter={() => setHoveredSeg(i)} onMouseLeave={() => setHoveredSeg(null)}>
                  <span className="sce-tl-seg-label">{seg.clip.name.replace(/\.[^/.]+$/, "").slice(0, 14)}</span>
                  {(isHov || isSel) && onCutSeg && (
                    <div className="sce-tl-seg-toolbar">
                      <button className="sce-tl-seg-del" title="Eliminar fragmento (Delete)"
                        onClick={e => { e.stopPropagation(); onCutSeg(seg.clip.id, seg.start, seg.end); onSelectSeg?.(null); }}>🗑</button>
                      <button className="sce-tl-seg-play" title="Reproducir desde aquí"
                        onClick={e => { e.stopPropagation(); onSeek(keptSegs.slice(0,i).reduce((t,s)=>t+s.end-s.start,0)); }}>▶</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </div>{/* /inner zoom div */}
        </div>{/* /scroll-wrap */}

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


// ── GuidePanel: siguiente paso + flujo Cortar → Reels → Claude Code → CapCut
function GuidePanel({ onExtractReels, hasCuts }) {
  const [videoOk, setVideoOk] = useState(true);
  return (
    <div className="sce-guide-panel">
      <div className="sce-guide-card">
        <h3 className="sce-guide-title">🎯 Siguiente paso: tus Reels</h3>
        <p className="sce-guide-text">
          Cuando termines de cortar, la IA lee tu video y encuentra tus mejores
          consejos, momentos de inspiración y oportunidades de venta — listos
          en vertical para Reels y TikTok.
        </p>
        <button className="sc-btn-primary sce-guide-cta" onClick={onExtractReels} disabled={!hasCuts}>
          ✨ Extraer Reels con IA
        </button>
        {!hasCuts && <p className="sce-guide-hint">Analiza y corta un clip primero.</p>}
      </div>

      <div className="sce-guide-card">
        <h3 className="sce-guide-title">📚 Cómo usar esta herramienta</h3>
        <ol className="sce-guide-steps">
          <li><strong>Corta</strong> silencios y muletillas aquí.</li>
          <li><strong>Extrae tus Reels</strong> con IA (consejos, inspiración, venta).</li>
          <li>Lleva esos clips a <strong>Claude Code</strong> para pulir la edición.</li>
          <li>Dale el acabado final en <strong>CapCut</strong> antes de publicar.</li>
        </ol>
        <div className="sce-guide-video-wrap">
          {videoOk ? (
            <video className="sce-guide-video" src="/tutorial-editor.mp4" controls
              onError={() => setVideoOk(false)} />
          ) : (
            <div className="sce-guide-video-empty">🎬 Video tutorial próximamente</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── EditorScreen ──────────────────────────────────────────────────────────
function EditorScreen({ clips, setClips, onExport, onAddFiles, moveClip, removeClip, onAnalyze, format, onFormatChange, onExtractReels, onCutSeg, sensitivity, onReanalyze }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("sce-theme") || "dark"; } catch { return "dark"; }
  });
  useEffect(() => { try { localStorage.setItem("sce-theme", theme); } catch {} }, [theme]);
  const canvasRef    = useRef(null);
  const playRef      = useRef(false);
  const fileInputRef = useRef(null);

  const [isPlaying,    setIsPlaying]    = useState(false);
  const [effectiveTime, setEffectiveTime] = useState(0);
  const [done,         setDone]         = useState(false);
  const [seeking,      setSeeking]      = useState(false);
  const [selectedSeg,  setSelectedSeg]  = useState(null); // {clipId, start, end} del fragmento seleccionado
  const [dims,         setDims]         = useState({ W: 1280, H: 720 });

  // Refs para atajos de teclado — evitan re-registrar el listener en cada render
  const effectiveTimeRef = useRef(0);
  const totalKeptRef     = useRef(0);
  const selectedSegRef   = useRef(null);
  const playbarScrubDrag = useRef(false);
  const togglePlayRef       = useRef(null); // sincronizado durante render — evita TDZ en deps del useEffect de teclado
  const seekToEffectiveRef  = useRef(null); // ídem
  useEffect(() => { effectiveTimeRef.current = effectiveTime; }, [effectiveTime]);
  useEffect(() => { selectedSegRef.current = selectedSeg; }, [selectedSeg]);

  // Valores derivados
  const keptSegs   = useMemo(() => buildKeptSegments(clips), [clips]);
  const totalKept  = useMemo(() => Math.max(0.001, keptSegs.reduce((t, s) => t + s.end - s.start, 0)), [keptSegs]);
  totalKeptRef.current = totalKept; // sync ref durante render (definición antes que uso)
  const nativePos  = useMemo(() => effectiveToNative(keptSegs, effectiveTime), [keptSegs, effectiveTime]);

  // Ctrl+B: divide el segmento actual en la posición del playhead (como CapCut)
  const splitAtPlayhead = useCallback(() => {
    const native = effectiveToNative(keptSegs, effectiveTime);
    if (!native) return;
    const { clip, localTime } = native;
    const seg = keptSegs.find(s => s.clip.id === clip.id && localTime >= s.start && localTime <= s.end);
    if (!seg || localTime - seg.start < 0.06 || seg.end - localTime < 0.06) return;
    setClips(prev => prev.map(c => {
      if (c.id !== clip.id) return c;
      const newSilences = [...(c.silences || []), { id: uid(), start: localTime, end: localTime + 0.001, cut: true, manual: true }]
        .sort((a, b) => a.start - b.start);
      return { ...c, silences: newSilences };
    }));
  }, [keptSegs, effectiveTime]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        splitAtPlayhead();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlayRef.current?.();
      } else if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        seekToEffectiveRef.current?.(Math.max(0, effectiveTimeRef.current - 5));
      } else if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        seekToEffectiveRef.current?.(Math.min(totalKeptRef.current, effectiveTimeRef.current + 5));
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const sel = selectedSegRef.current;
        if (sel) { e.preventDefault(); onCutSeg(sel.clipId, sel.start, sel.end); setSelectedSeg(null); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [splitAtPlayhead, onCutSeg]); // togglePlay y seekToEffective removidos — accedidos via refs para evitar TDZ

  // Dimensiones de salida según formato seleccionado (dims = dimensiones nativas del video)
  const outDims = useMemo(() => {
    const { W: vW, H: vH } = dims;
    if (format === "portrait") return { W: Math.round(vH * 9 / 16), H: vH };
    if (format === "square")   return { W: Math.min(vW, vH), H: Math.min(vW, vH) };
    return { W: vW, H: vH };
  }, [format, dims]);

  const currentClipId = nativePos?.clip.id ?? null;
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

  // Dibuja un frame de `vid` recortado a llenar (crop-to-fill) el cuadro de
  // salida — el sujeto ocupa todo el cuadro, sin barras borrosas arriba/abajo.
  const drawVideoFrame = useCallback((ctx, vid, W, H) => {
    const vW = vid.videoWidth || dims.W, vH = vid.videoHeight || dims.H;
    const scale = Math.max(W / vW, H / vH);
    const dW = vW * scale, dH = vH * scale, dX = (W - dW) / 2, dY = (H - dH) / 2;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(vid, dX, dY, dW, dH);
  }, [dims]);

  // Dibujar un frame estático (seek)
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
        vid.onseeked = () => {
          drawVideoFrame(ctx, vid, W, H);
          URL.revokeObjectURL(url); resolve();
        };
      };
      vid.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    });
  }, [outDims, drawVideoFrame]);

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
  seekToEffectiveRef.current = seekToEffective; // sync ref durante render

  // Dibujar primer frame cuando los segmentos están listos → evita canvas negro al abrir editor
  const prevKeptLenRef = useRef(0);
  useEffect(() => {
    if (keptSegs.length > 0 && prevKeptLenRef.current === 0 && !isPlaying) {
      seekToEffective(0);
    }
    prevKeptLenRef.current = keptSegs.length;
  }, [keptSegs.length, isPlaying, seekToEffective]);

  // Borrar fragmento seleccionado desde el timeline
  const deleteSelectedSeg = useCallback(() => {
    const sel = selectedSegRef.current;
    if (sel) { onCutSeg(sel.clipId, sel.start, sel.end); setSelectedSeg(null); }
  }, [onCutSeg]);

  // Reproducción
  const runPlay = useCallback(async () => {
    if (isPlaying || !keptSegs.length) return;
    setIsPlaying(true); setDone(false);
    playRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) { setIsPlaying(false); playRef.current = false; return; }
    const ctx = canvas.getContext("2d");
    const { W, H } = outDims;
    canvas.width = W; canvas.height = H;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);

    const uniqueClipIds = [...new Set(keptSegs.map(s => s.clip.id))];
    let etOffset = 0;
    const totalEt = keptSegs.reduce((s, seg) => s + seg.end - seg.start, 0);
    const startEt = effectiveTime >= totalEt ? 0 : effectiveTime;

    for (const clipId of uniqueClipIds) {
      if (!playRef.current) break;
      const clipSegs = keptSegs.filter(s => s.clip.id === clipId);
      const clip = clipSegs[0].clip;

      const clipDur = clipSegs.reduce((sum, s) => sum + s.end - s.start, 0);
      if (etOffset + clipDur <= startEt) { etOffset += clipDur; continue; }

      await new Promise(resolve => {
        const vid = document.createElement("video");
        const url = URL.createObjectURL(clip.file);
        vid.src = url;
        vid.addEventListener("loadedmetadata", async () => {
          let animId;
          const draw = () => {
            drawVideoFrame(ctx, vid, W, H);
            animId = requestAnimationFrame(draw);
          };
          animId = requestAnimationFrame(draw);

          for (let si = 0; si < clipSegs.length; si++) {
            if (!playRef.current) break;
            const seg = clipSegs[si];
            const segEtStart = etOffset;
            const segDur = seg.end - seg.start;
            if (segEtStart + segDur <= startEt) { etOffset += segDur; continue; }

            const skipInSeg = Math.max(0, startEt - segEtStart);
            vid.currentTime = seg.start + skipInSeg;
            await new Promise(r => { vid.onseeked = r; });
            if (!playRef.current) break;
            vid.playbackRate = 1;
            vid.play().catch(() => {});
            await new Promise(segDone => {
              const tick = setInterval(() => {
                if (!playRef.current) { clearInterval(tick); vid.pause(); segDone(); return; }
                const ct = vid.currentTime;
                const newEt = segEtStart + Math.max(0, ct - seg.start);
                setEffectiveTime(newEt);
                if (ct >= seg.end - 0.04 || vid.ended) { clearInterval(tick); vid.pause(); segDone(); }
              }, 50);
            });
            etOffset += segDur;
          }

          cancelAnimationFrame(animId);
          URL.revokeObjectURL(url);
          resolve();
        });
        vid.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      });
    }

    if (playRef.current) { setDone(true); setEffectiveTime(totalKept); }
    setIsPlaying(false); playRef.current = false;
  }, [keptSegs, outDims, totalKept, isPlaying, effectiveTime, drawVideoFrame]);

  const togglePlay = useCallback(() => {
    if (isPlaying) { playRef.current = false; } else { runPlay(); }
  }, [isPlaying, runPlay]);
  togglePlayRef.current = togglePlay; // sync ref durante render (declaración antes que uso en teclado)

  return (
    <div className="sce-layout" data-theme={theme}>
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

        {/* Sensibilidad del corte de silencios */}
        <div className="sce-sens-group">
          {[["conservadora","Suave"],["normal","Normal"],["agresiva","Agresiva"]].map(([s, label]) => (
            <button key={s} className={`sce-sens-btn${sensitivity === s ? " active" : ""}`}
              onClick={() => onReanalyze(s)} title={
                s === "conservadora" ? "Corta solo silencios largos y muy claros — más seguro, menos corte"
              : s === "normal"      ? "Balance entre cortar silencios y no perder palabras"
              :                       "Corta silencios más cortos y sutiles — más agresivo, revisa el resultado"
              }>{label}</button>
          ))}
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
          <button className="sce-theme-toggle" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button className="sc-btn-primary sc-btn-sm" onClick={onExport}>✂️ Exportar</button>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="sce-body">
        {/* Canvas + controles */}
        <div className="sce-canvas-col">
          <div className="sce-canvas-wrap"
            onClick={!isPlaying && !seeking ? togglePlay : undefined}>
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

          {/* Playbar — estilo CapCut */}
          <div className="sce-playbar">
            <button className="sce-playbtn" onClick={togglePlay} title="Play / Pausa (Espacio)">
              {isPlaying ? "⏸" : done ? "↺" : "▶"}
            </button>
            <button className="sce-seekstep" onClick={() => seekToEffective(Math.max(0, effectiveTime - 5))} title="Retroceder 5s (←)">‹5s</button>

            {/* Scrubber con drag en tiempo real */}
            <div className="sce-scrubber"
              onPointerDown={e => {
                playbarScrubDrag.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                const r = e.currentTarget.getBoundingClientRect();
                seekToEffective(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * totalKept);
              }}
              onPointerMove={e => {
                if (!playbarScrubDrag.current) return;
                const r = e.currentTarget.getBoundingClientRect();
                seekToEffective(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * totalKept);
              }}
              onPointerUp={() => { playbarScrubDrag.current = false; }}
              onPointerCancel={() => { playbarScrubDrag.current = false; }}>
              <div className="sce-scrubber-fill" style={{ width: `${pct}%` }} />
              <div className="sce-scrubber-thumb" style={{ left: `${pct}%` }} />
            </div>

            <button className="sce-seekstep" onClick={() => seekToEffective(Math.min(totalKept, effectiveTime + 5))} title="Avanzar 5s (→)">5s›</button>
            <span className="sce-pct-label">{fmtTime(effectiveTime)}<span className="sce-pct-total"> / {fmtTime(totalKept)}</span></span>

            {/* Botón Dividir — equivalente a Ctrl+B */}
            <button className="sce-split-btn" onClick={splitAtPlayhead} disabled={!currentClipId}
              title="Dividir aquí (Ctrl+B) — luego clic en el fragmento + Delete para eliminarlo">
              ✂ Dividir
            </button>

            {/* Eliminar fragmento seleccionado */}
            {selectedSeg && (
              <button className="sce-delete-seg-btn" onClick={deleteSelectedSeg}
                title="Eliminar fragmento seleccionado (Delete)">
                🗑 Eliminar
              </button>
            )}
          </div>

          {/* Atajos de teclado */}
          <div className="sce-shortcuts-hint">
            <kbd>Espacio</kbd> play · <kbd>Ctrl+B</kbd> dividir · clic en fragmento y <kbd>Delete</kbd> eliminar · <kbd>← →</kbd> saltar 5s
          </div>
        </div>

        {/* Panel derecho: siguiente paso (Reels) + guía de uso */}
        <div className="sce-right-panel">
          <GuidePanel onExtractReels={onExtractReels} hasCuts={analyzedClips.length > 0} />
        </div>
      </div>

      {/* Timeline contraído */}
      <ClipTimeline
        keptSegs={keptSegs} totalKept={totalKept} effectiveTime={effectiveTime}
        onSeek={seekToEffective}
        allClips={clips} onMoveClip={moveClip} onRemoveClip={removeClip}
        onAddFiles={() => fileInputRef.current?.click()}
        onCutSeg={onCutSeg}
        selectedSeg={selectedSeg}
        onSelectSeg={setSelectedSeg}
      />
    </div>
  );
}

// ── Extractor de Reels ───────────────────────────────────────────────────
const REELS_FMT_DEFAULT = "portrait";
const REELS_EFFECTS_DEFAULT = { ...VIDEO_PRESETS[0].values };
const REEL_MAX_SECONDS = 60;
// Estilo de subtítulos fijo para los Reels — ya no hay panel de personalización
// en el editor, así que los clips salen siempre con captions legibles por defecto.
const REEL_SUBTITLE_STYLE = { font: "Poppins", hlColor: "#FFE44D", size: "small" };
const REEL_CATEGORIES = {
  consejo:     { label: "Consejo",     emoji: "💡" },
  inspiracion: { label: "Inspiración", emoji: "✨" },
  venta:       { label: "Venta",       emoji: "🛒" },
};

function ReelsExtractorScreen({ clips, onBack }) {
  const [phase,       setPhase]       = useState("idle");
  const [msg,         setMsg]         = useState("");
  const [fragments,   setFragments]   = useState([]);
  const [reelFmt,     setReelFmt]     = useState(REELS_FMT_DEFAULT);
  const [reelEffects, setReelEffects] = useState(REELS_EFFECTS_DEFAULT);
  const [exporting,   setExporting]   = useState(null); // idx | null
  const [progMap,     setProgMap]     = useState({});
  const [urlMap,      setUrlMap]      = useState({});
  const [catFilter,   setCatFilter]   = useState("todas");

  const clip = clips.find(c => c.analyzed && !c.error);

  const run = useCallback(async () => {
    if (!clip) return;
    // Extraer Reels llama a un modelo de IA que cuesta dinero por uso — a
    // diferencia de cortar silencios/exportar (100% en el navegador, gratis
    // para nosotros), esto sí requiere sesión para que cuente contra el
    // límite mensual real del plan de la usuaria, no un tope genérico
    // compartido entre cualquiera que abra la app.
    const token = await getAwsAuthToken();
    if (!token) { setPhase("needsAuth"); return; }
    setPhase("transcribing"); setMsg("Transcribiendo video con IA...");

    // 1. Transcribir si no hay segmentos
    let segments = clip.segments?.length ? clip.segments : null;
    if (!segments) {
      try {
        setMsg("Transcribiendo...");
        segments = await transcribeClip(clip.file, clip.silences || [], info => {
          if (info.status === "extracting") setMsg(`Extrayendo audio... ${info.progress}%`);
          else if (info.status === "downloading")
            setMsg(`Descargando modelo Whisper... ${Math.round(info.progress || 0)}%`);
        }, clip.duration);
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: "extractReels",
          transcription: parts.join(" "),
          duration: clip.duration || 0,
        }),
      });
      const data = await res.json();
      if (res.status === 429) throw new Error(data.message || "Llegaste al límite de generaciones de tu plan este mes.");
      if (!data.fragmentos?.length) throw new Error("Sin fragmentos");
      // Clamp timestamps a la duración del clip y a un máximo de 60s — no
      // confiamos solo en que la IA respete el límite pedido en el prompt.
      const dur = clip.duration || Infinity;
      setFragments(data.fragmentos.map(f => {
        const inicio = Math.max(0, Math.min(f.inicio, dur - 5));
        const finRaw = Math.max(inicio + 5, Math.min(f.fin, dur));
        const fin = Math.min(finRaw, inicio + REEL_MAX_SECONDS);
        const categoria = REEL_CATEGORIES[f.categoria] ? f.categoria : "consejo";
        return { ...f, inicio, fin, categoria };
      }));
      setPhase("ready"); setMsg("");
    } catch (err) {
      setPhase("error"); setMsg(err.message || "Error al analizar. Intenta de nuevo.");
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
        REEL_SUBTITLE_STYLE, reelFmt, reelEffects
      );
      setUrlMap(u => ({ ...u, [idx]: URL.createObjectURL(blob) }));
    } catch (e) { console.error(e); }
    setExporting(null);
    setProgMap(p => { const n = { ...p }; delete n[idx]; return n; });
  }, [exporting, fragments, clip, reelFmt, reelEffects]);

  return (
    <div className="sce-reel-screen">
      {/* Top bar */}
      <div className="sce-reel-topbar">
        <button className="sce-reel-back" onClick={onBack}>← ReelCut</button>
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
            La IA lee tu video ya cortado y encuentra tus mejores 💡 consejos, ✨ momentos de inspiración
            y 🛒 oportunidades de venta — clips de máximo 60s en vertical, listos para descargar.
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

      {/* Requiere sesión — Extraer Reels usa IA que cuesta por uso, a diferencia
          del resto del editor que es gratis y corre en tu navegador */}
      {phase === "needsAuth" && (
        <div className="sce-reel-intro">
          <div className="sce-reel-intro-icon">🔒</div>
          <h3 className="sce-reel-intro-h">Inicia sesión para usar Extraer Reels con IA</h3>
          <p className="sce-reel-intro-p">
            Cortar silencios y exportar tu video siguen siendo gratis. Extraer Reels con IA es parte de tu cuenta de MamáCEO —
            inicia sesión (se abre en una pestaña nueva para no perder tu edición actual) y vuelve a intentarlo.
          </p>
          <a className="sce-reel-start-btn" href="/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "inline-block" }}>
            Iniciar sesión →
          </a>
          <button type="button" onClick={() => setPhase("idle")} style={{ display: "block", margin: "12px auto 0", border: "none", background: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13 }}>
            Volver
          </button>
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
            Se encontraron {fragments.length} fragmentos (máx. 60s) · Exporta los que te gusten en {reelFmt === "portrait" ? "9:16 (Reels)" : reelFmt === "square" ? "1:1 (Feed)" : "16:9 (YouTube)"}
          </p>
          <div className="sce-reel-cat-filter">
            <button className={`sce-reel-cat-btn${catFilter === "todas" ? " active" : ""}`} onClick={() => setCatFilter("todas")}>Todas</button>
            {Object.entries(REEL_CATEGORIES).map(([id, c]) => (
              <button key={id} className={`sce-reel-cat-btn${catFilter === id ? " active" : ""}`} onClick={() => setCatFilter(id)}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
          <div className="sce-reel-grid">
            {fragments.map((f, idx) => {
              if (catFilter !== "todas" && f.categoria !== catFilter) return null;
              const dur = f.fin - f.inicio;
              const prog = progMap[idx];
              const url = urlMap[idx];
              const cat = REEL_CATEGORIES[f.categoria] || REEL_CATEGORIES.consejo;
              return (
                <div key={idx} className="sce-reel-card">
                  <div className="sce-reel-num">#{idx + 1}</div>
                  <span className={`sce-reel-cat-badge sce-reel-cat-badge--${f.categoria}`}>{cat.emoji} {cat.label}</span>
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
  const [format, setFormat] = useState("landscape"); // "landscape" | "portrait" | "square"
  const [showReels, setShowReels] = useState(false);
  const [sensitivity, setSensitivity] = useState("conservadora");
  const inputRef = useRef(null);
  const abortRef = useRef(false);

  // Gate de cuenta: cortar/previsualizar es libre (gancho de lead magnet);
  // solo al EXPORTAR se pide crear cuenta si no hay sesión iniciada.
  const [hasAccount, setHasAccount] = useState(false);
  const [showRegisterGate, setShowRegisterGate] = useState(false);
  useEffect(() => {
    awsAuth.getSession().then(({ data }) => setHasAccount(!!data?.session));
  }, []);

  const analyzingRef = useRef(false);

  // Recibe el preset explícito (en vez de leer noiseDb/minDur del cierre) —
  // reanalizar() cambia la sensibilidad y re-analiza en el mismo tick, y
  // setSensitivity es asíncrono: si esta función leyera el estado en vez de
  // un parámetro, la primera vez que se cambiaba de sensibilidad se
  // analizaba igual con el umbral VIEJO (el cambio solo se notaba al
  // volver a hacer clic una segunda vez).
  const analizarClips = useCallback(async (toAnalyze, preset = PRESETS[sensitivity]) => {
    if (analyzingRef.current || !toAnalyze.length) return;
    analyzingRef.current = true;
    setFase("analyzing"); setError("");
    const { noise: noiseDb, duration: minDur } = preset;
    for (let i = 0; i < toAnalyze.length; i++) {
      const clip = toAnalyze[i];
      const baseProgress = Math.round((i / toAnalyze.length) * 100);
      setProgressMsg(`Analizando ${i + 1} de ${toAnalyze.length}: ${clip.name.replace(/\.[^.]+$/, "")}`);
      setProgress(baseProgress);
      try {
        const { duration, waveform, silences } = await analyzeClip(
          clip.file, noiseDb, minDur,
          (p) => {
            // progreso dentro del clip (0-1) → progreso global
            const clipSlice = 100 / toAnalyze.length;
            setProgress(Math.round(baseProgress + p * clipSlice));
          }
        );
        setClips(prev => prev.map(c => c.id === clip.id ? { ...c, duration, waveform, silences, analyzed: true, error: null } : c));
      } catch (err) {
        console.error("Error analizando audio:", err);
        const detail = err?.message ? `: ${err.message}` : "";
        setClips(prev => prev.map(c => c.id === clip.id ? { ...c, analyzed: true, error: `No se pudo analizar el audio${detail}` } : c));
      }
    }
    setFase("editor");
    analyzingRef.current = false;
  }, [sensitivity]);

  const analizarTodos = useCallback(() =>
    analizarClips(clips.filter(c => !c.analyzed)), [clips, analizarClips]);

  const reanalizar = useCallback((newSensitivity) => {
    setSensitivity(newSensitivity);
    const reset = clips.map(c => ({ ...c, analyzed: false, silences: [], waveform: null }));
    setClips(reset);
    // Pasa el preset explícito — setSensitivity aún no se refleja en este
    // mismo tick, así que analizarClips no puede depender de leerlo del estado.
    analizarClips(reset, PRESETS[newSensitivity]);
  }, [clips, analizarClips]);

  const cutSeg = useCallback((clipId, segStart, segEnd) => {
    setClips(prev => prev.map(c => {
      if (c.id !== clipId) return c;
      const newSilences = [...(c.silences || []), { start: segStart, end: segEnd, cut: true }]
        .sort((a, b) => a.start - b.start);
      return { ...c, silences: newSilences };
    }));
  }, []);

  const addFiles = useCallback(async (files) => {
    const isVideo = f => /\.(mp4|mov|m4v|webm|avi)$/i.test(f.name) || f.type.startsWith("video/");
    const valid = Array.from(files).filter(isVideo);
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
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); };

  const exportar = async () => {
    const ready = clips.filter(c => c.analyzed && !c.error);
    if (!ready.length) { setError("Analiza los clips primero."); return; }
    if (!hasAccount) {
      // Cortar y previsualizar es libre — el gate solo aparece al querer
      // exportar de verdad, para no perder a quien solo está probando.
      setShowRegisterGate(true);
      return;
    }
    abortRef.current = false;
    setFase("cutting"); setProgress(0); setError("");
    try {
      const blob = await recordAllClips(ready, (p, msg) => { setProgress(Math.round(p * 100)); setProgressMsg(msg); }, abortRef, format);
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
        <div className="sc-progress-bar-wrap" style={{ width: "min(320px,80vw)" }}><div className="sc-progress-bar" style={{ width: `${progress}%` }} /></div>
        <p className="sc-proc-note">{progressMsg}</p>
        <p className="sc-proc-note" style={{ fontSize: 12, color: "#bbb", marginTop: 6 }}>
          En móvil el análisis corre en tiempo real — por favor espera sin cerrar la pantalla
        </p>
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
      onBack={() => setShowReels(false)}
    />
  );

  if (fase === "editor" && analyzedCount > 0) return (
    <>
      <EditorScreen clips={clips} setClips={setClips}
        onExport={exportar} onAddFiles={addFiles}
        moveClip={moveClip} removeClip={removeClip} toggleSilence={toggleSilence}
        onAnalyze={analizarTodos}
        format={format} onFormatChange={setFormat}
        onExtractReels={() => setShowReels(true)}
        sensitivity={sensitivity} onReanalyze={reanalizar}
        onCutSeg={cutSeg} />
      {showRegisterGate && (
        <RegisterGate
          title="Crea tu cuenta para exportar tu video"
          subtitle="Cortar y previsualizar es libre — crea tu cuenta gratis (14 días, sin tarjeta) para exportar tu video editado."
          ctaLabel="Crear cuenta y exportar"
          onClose={() => setShowRegisterGate(false)}
          onSuccess={() => {
            setHasAccount(true); setShowRegisterGate(false);
            exportar();
          }}
        />
      )}
    </>
  );

  // Pantalla de subida
  return (
    <div className="sc-page">
      <nav className="sc-nav"><Logo width={110} /><a href="/" className="sc-nav-link">Ir a la app →</a></nav>
      <div className="sc-editor-wrap">
        <div className="sc-editor-header">
          <div>
            <h1 className="sc-editor-title">ReelCut</h1>
            <p className="sc-editor-sub">Agrega tus clips, corta silencios automáticamente y extrae tus mejores Reels con IA.</p>
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
