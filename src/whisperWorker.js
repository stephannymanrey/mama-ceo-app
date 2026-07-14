import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;
env.useBrowserCache  = true;

let _asr = null;

self.addEventListener("message", async ({ data }) => {
  const { id, audio } = data;
  try {
    if (!_asr) {
      _asr = await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-base",
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
