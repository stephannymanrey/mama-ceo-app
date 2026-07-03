import { cpSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

const src = resolve("node_modules/@ffmpeg/core/dist/umd");

if (!existsSync(src)) {
  console.error("No se encontró @ffmpeg/core en node_modules. Ejecuta npm install.");
  process.exit(1);
}

mkdirSync("public/ffmpeg", { recursive: true });
cpSync(`${src}/ffmpeg-core.js`,   "public/ffmpeg/ffmpeg-core.js");
cpSync(`${src}/ffmpeg-core.wasm`, "public/ffmpeg/ffmpeg-core.wasm");
console.log("✓ FFmpeg core copiado a public/ffmpeg/");
