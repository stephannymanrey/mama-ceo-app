import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;
env.useBrowserCache  = true;

let _asr = null;

// Todo el preproceso de audio corre aquí en el Worker para no bloquear el main thread.
// OfflineAudioContext y File.arrayBuffer() están disponibles en Workers.
async function extractAudio(file, silences) {
  const TARGET_SR = 16000;
  const buf = await file.arrayBuffer();

  // OfflineAudioContext funciona en Workers (AudioContext no, requiere window)
  const decodeCtx = new OfflineAudioContext(2, 1, 44100);
  const decoded   = await decodeCtx.decodeAudioData(buf);
  const dur       = decoded.duration;

  const cuts = (silences || []).filter(s => s.cut).sort((a, b) => a.start - b.start);
  const keptRanges = [];
  let pos = 0;
  for (const s of cuts) {
    if (s.start > pos + 0.05) keptRanges.push({ start: pos, end: s.start });
    pos = s.end;
  }
  if (pos < dur - 0.05) keptRanges.push({ start: pos, end: dur });
  if (!keptRanges.length) keptRanges.push({ start: 0, end: dur });

  const offline = new OfflineAudioContext(1, Math.ceil(dur * TARGET_SR), TARGET_SR);
  const src     = offline.createBufferSource();
  src.buffer    = decoded;
  src.connect(offline.destination);
  src.start();
  const resampled = await offline.startRendering();
  const fullData  = resampled.getChannelData(0);

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

self.addEventListener("message", async ({ data }) => {
  const { id, audio, file, silences } = data;
  try {
    let audioData    = audio;
    let mappingRanges = null;

    if (file) {
      // Preprocesar el audio en el Worker — el main thread queda libre
      self.postMessage({ id, type: "progress", info: { status: "loading" } });
      const extracted = await extractAudio(file, silences || []);
      audioData     = extracted.audio;
      mappingRanges = extracted.mappingRanges;
    }

    if (!_asr) {
      _asr = await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-base",
        { progress_callback: info => self.postMessage({ id, type: "progress", info }) }
      );
    }
    self.postMessage({ id, type: "progress", info: { status: "ready" } });
    const result = await _asr(audioData, {
      language: "spanish", task: "transcribe",
      return_timestamps: "word", chunk_length_s: 30, stride_length_s: 5,
    });
    self.postMessage({ id, type: "result", chunks: result.chunks || [], mappingRanges });
  } catch (err) {
    self.postMessage({ id, type: "error", message: err?.message || "Error en Whisper" });
  }
});
