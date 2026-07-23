import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;
env.useBrowserCache  = true;

let _asr = null;

self.addEventListener("message", async ({ data }) => {
  const { id, audio } = data;
  try {
    if (!_asr) {
      // whisper-tiny (no "base"): la UI ya promete "Whisper Tiny" — usar el
      // modelo grande de verdad la contradecía y hacía la carga/transcripción
      // más lenta de lo necesario sin ganar nada, ya que la copia nunca cambió.
      _asr = await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny",
        { progress_callback: info => self.postMessage({ id, type: "progress", info }) }
      );
    }
    self.postMessage({ id, type: "progress", info: { status: "ready" } });
    const result = await _asr(audio, {
      language: "spanish", task: "transcribe",
      return_timestamps: "word", chunk_length_s: 30, stride_length_s: 5,
    });
    self.postMessage({ id, type: "result", chunks: result.chunks || [] });
  } catch (err) {
    self.postMessage({ id, type: "error", message: err?.message || "Error en Whisper" });
  }
});
