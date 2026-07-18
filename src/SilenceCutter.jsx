import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Logo from "./Logo";
import { getAwsAuthToken } from "./lib/awsClient";
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
  { id: "none",       icon: "—", label: "Sin efecto"    },
  { id: "fade",       icon: "◐", label: "Fundido"       },
  { id: "flash",      icon: "✦", label: "Flash"         },
  { id: "zoom",       icon: "⊕", label: "Zoom"          },
  { id: "slideLeft",  icon: "←", label: "Deslizar ←"   },
  { id: "slideRight", icon: "→", label: "Deslizar →"   },
  { id: "slideUp",    icon: "↑", label: "Deslizar ↑"   },
  { id: "slideDown",  icon: "↓", label: "Deslizar ↓"   },
  { id: "flash", icon: "✦", label: "Flash blanco"   },
];
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
// bokeh: 0 = apagado, 1–100 → blur de fondo 4–30px
function bokehBlurPx(bokeh) { return bokeh > 0 ? 4 + (bokeh / 100) * 26 : 0; }

// Biblioteca de música sin derechos de autor (solo instrumental)
const MUSIC_LIBRARY = [
  // Motivacional
  { id: "m1", name: "Impulso",       genre: "motivacional", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: "m2", name: "Confianza",     genre: "motivacional", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3" },
  { id: "m3", name: "Avanza",        genre: "motivacional", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3" },
  { id: "m4", name: "Determinación", genre: "motivacional", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3" },
  { id: "m5", name: "Empuje",        genre: "motivacional", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  // Tranquila
  { id: "t1", name: "Mañana Suave",  genre: "tranquila",    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { id: "t2", name: "Serenidad",     genre: "tranquila",    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
  { id: "t3", name: "Calma",         genre: "tranquila",    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3" },
  { id: "t4", name: "Paz Interior",  genre: "tranquila",    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" },
  { id: "t5", name: "Descanso",      genre: "tranquila",    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
  // Energética
  { id: "e1", name: "Potencia",      genre: "energetica",   url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  { id: "e2", name: "Alta Vibra",    genre: "energetica",   url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3" },
  { id: "e3", name: "Sin Límites",   genre: "energetica",   url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3" },
  { id: "e4", name: "Chispa",        genre: "energetica",   url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  { id: "e5", name: "Fuego",         genre: "energetica",   url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3" },
  // Enfocada / lo-fi
  { id: "f1", name: "Modo Foco",     genre: "enfocada",     url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
  { id: "f2", name: "Flujo",         genre: "enfocada",     url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3" },
  { id: "f3", name: "Concentración", genre: "enfocada",     url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
  { id: "f4", name: "Claridad",      genre: "enfocada",     url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" },
  { id: "f5", name: "Deep Work",     genre: "enfocada",     url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  // Inspiracional
  { id: "i1", name: "Amanecer",      genre: "inspiracional", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3" },
  { id: "i2", name: "Sueños",        genre: "inspiracional", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
  { id: "i3", name: "Esperanza",     genre: "inspiracional", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3" },
  { id: "i4", name: "Posibilidades", genre: "inspiracional", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  // Emprendedora
  { id: "p1", name: "CEO Energy",    genre: "emprendedora", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3" },
  { id: "p2", name: "Negocio",       genre: "emprendedora", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3" },
  { id: "p3", name: "Liderazgo",     genre: "emprendedora", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: "p4", name: "Éxito",         genre: "emprendedora", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  // Contenido
  { id: "c1", name: "Lifestyle",     genre: "contenido",    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3" },
  { id: "c2", name: "Vlog Vibes",    genre: "contenido",    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3" },
  { id: "c3", name: "Tutorial",      genre: "contenido",    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3" },
  { id: "c4", name: "Behind Scenes", genre: "contenido",    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
];
const MUSIC_GENRES = [
  { id: "motivacional",  label: "🔥 Motivacional" },
  { id: "tranquila",     label: "🌙 Tranquila" },
  { id: "energetica",    label: "⚡ Energética" },
  { id: "enfocada",      label: "🎯 Lo-fi / Foco" },
  { id: "inspiracional", label: "✨ Inspiracional" },
  { id: "emprendedora",  label: "💼 Emprendedora" },
  { id: "contenido",     label: "📱 Contenido" },
];

// ── Efectos de sonido (síntesis Web Audio) ────────────────────────────────
const SFX_CATALOG = [
  { id: "click",      emoji: "🖱️",  label: "Click",      desc: "Clic de UI rápido" },
  { id: "ding",       emoji: "🔔",  label: "Ding",       desc: "Campanilla positiva" },
  { id: "pop",        emoji: "💬",  label: "Pop",        desc: "Burbuja / notificación" },
  { id: "swoosh",     emoji: "💨",  label: "Swoosh",     desc: "Barrido rápido" },
  { id: "swing",      emoji: "🌊",  label: "Swing",      desc: "Barrido suave" },
  { id: "cut",        emoji: "✂️",  label: "Corte",      desc: "Sonido de corte" },
  { id: "failure",    emoji: "❌",  label: "Error",      desc: "Fallo / equivocación" },
  { id: "success",    emoji: "✅",  label: "Éxito",      desc: "Logro / correcto" },
  { id: "select",     emoji: "⭐",  label: "Selección",  desc: "Seleccionar opción" },
  { id: "typewriter", emoji: "⌨️",  label: "Máquina",    desc: "Teclas de máquina de escribir" },
  { id: "sorry",      emoji: "😬",  label: "Ups",        desc: "Ups / lo siento" },
  { id: "wind",       emoji: "🍃",  label: "Viento",     desc: "Ráfaga de viento" },
];

function synthSfx(type, actx, dest, when = 0) {
  try {
    const out = dest || actx.destination;
    const g = actx.createGain();
    g.connect(out);
    if (type === "click" || type === "select") {
      const osc = actx.createOscillator();
      osc.connect(g);
      osc.frequency.setValueAtTime(1400, when);
      osc.frequency.exponentialRampToValueAtTime(600, when + 0.05);
      g.gain.setValueAtTime(0.45, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.07);
      osc.start(when); osc.stop(when + 0.08);
    } else if (type === "ding") {
      const osc = actx.createOscillator(); osc.type = "sine";
      osc.connect(g);
      osc.frequency.setValueAtTime(880, when);
      g.gain.setValueAtTime(0.55, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 1.1);
      osc.start(when); osc.stop(when + 1.2);
    } else if (type === "pop") {
      const osc = actx.createOscillator();
      osc.connect(g);
      osc.frequency.setValueAtTime(280, when);
      osc.frequency.exponentialRampToValueAtTime(70, when + 0.09);
      g.gain.setValueAtTime(0.5, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.12);
      osc.start(when); osc.stop(when + 0.13);
    } else if (type === "swoosh" || type === "cut") {
      const bufLen = Math.floor(actx.sampleRate * 0.28);
      const buf = actx.createBuffer(1, bufLen, actx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.8);
      const src = actx.createBufferSource(); src.buffer = buf;
      const bpf = actx.createBiquadFilter(); bpf.type = "bandpass";
      bpf.frequency.setValueAtTime(4500, when);
      bpf.frequency.exponentialRampToValueAtTime(900, when + 0.28);
      bpf.Q.value = 0.6;
      src.connect(bpf); bpf.connect(g);
      g.gain.setValueAtTime(0.38, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
      src.start(when); src.stop(when + 0.32);
    } else if (type === "swing") {
      const bufLen = Math.floor(actx.sampleRate * 0.5);
      const buf = actx.createBuffer(1, bufLen, actx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2);
      const src = actx.createBufferSource(); src.buffer = buf;
      const bpf = actx.createBiquadFilter(); bpf.type = "bandpass";
      bpf.frequency.setValueAtTime(800, when);
      bpf.frequency.exponentialRampToValueAtTime(200, when + 0.5);
      bpf.Q.value = 0.9;
      src.connect(bpf); bpf.connect(g);
      g.gain.setValueAtTime(0.35, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.52);
      src.start(when); src.stop(when + 0.55);
    } else if (type === "failure" || type === "sorry") {
      const osc = actx.createOscillator();
      osc.connect(g);
      osc.frequency.setValueAtTime(440, when);
      osc.frequency.setValueAtTime(330, when + 0.15);
      osc.frequency.setValueAtTime(220, when + 0.3);
      g.gain.setValueAtTime(0.38, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.5);
      osc.start(when); osc.stop(when + 0.52);
    } else if (type === "success") {
      const osc = actx.createOscillator(); osc.type = "sine";
      osc.connect(g);
      osc.frequency.setValueAtTime(660, when);
      osc.frequency.setValueAtTime(880, when + 0.1);
      osc.frequency.setValueAtTime(1100, when + 0.2);
      g.gain.setValueAtTime(0.4, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.5);
      osc.start(when); osc.stop(when + 0.52);
    } else if (type === "typewriter") {
      for (let i = 0; i < 4; i++) {
        const gg = actx.createGain(); gg.connect(out);
        const osc = actx.createOscillator();
        osc.connect(gg);
        const f = 1800 + Math.random() * 600;
        osc.frequency.setValueAtTime(f, when + i * 0.09);
        osc.frequency.exponentialRampToValueAtTime(f * 0.5, when + i * 0.09 + 0.055);
        gg.gain.setValueAtTime(0.3, when + i * 0.09);
        gg.gain.exponentialRampToValueAtTime(0.001, when + i * 0.09 + 0.06);
        osc.start(when + i * 0.09); osc.stop(when + i * 0.09 + 0.07);
      }
    } else if (type === "wind") {
      const bufLen = Math.floor(actx.sampleRate * 0.7);
      const buf = actx.createBuffer(1, bufLen, actx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        const env = Math.sin((i / bufLen) * Math.PI);
        d[i] = (Math.random() * 2 - 1) * env;
      }
      const src = actx.createBufferSource(); src.buffer = buf;
      const bpf = actx.createBiquadFilter(); bpf.type = "bandpass";
      bpf.frequency.value = 350; bpf.Q.value = 1.2;
      src.connect(bpf); bpf.connect(g);
      g.gain.setValueAtTime(0.32, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.72);
      src.start(when); src.stop(when + 0.75);
    }
  } catch (_) {}
}

const CARD_BG_OPTIONS = [
  { idx: 0,  bg: "#C4526A", text: "#FFFFFF", kw: "#FFE44D" },
  { idx: 1,  bg: "#4A90BF", text: "#FFFFFF", kw: "#FFE44D" },
  { idx: 2,  bg: "#1a1a2e", text: "#FFFFFF", kw: "#C4526A" },
  { idx: 3,  bg: "#FFE44D", text: "#1a1a2e", kw: "#C4526A" },
  { idx: 4,  bg: "#5FB87A", text: "#1a1a2e", kw: "#FFFFFF" },
  { idx: 5,  bg: "#FF7043", text: "#FFFFFF", kw: "#FFE44D" },
  { idx: 6,  bg: "#7C3AED", text: "#FFFFFF", kw: "#FFE44D" },
  { idx: 7,  bg: "#FFFFFF", text: "#1a1a2e", kw: "#C4526A" },
  { idx: 8,  bg: "#000000", text: "#FFFFFF", kw: "#FFE44D" },
  { idx: 9,  bg: "#E91E63", text: "#FFFFFF", kw: "#FFFFFF" },
  { idx: 10, bg: "#00BCD4", text: "#1a1a2e", kw: "#7C3AED" },
  { idx: 11, bg: "#3D5A80", text: "#FFFFFF", kw: "#FFE44D" },
];
const CARD_KW_COLORS = [
  "#FFE44D", "#C4526A", "#FF7043", "#5FB87A",
  "#FFFFFF", "#1a1a2e", "#00BCD4", "#7C3AED", "#E91E63",
];
const CARD_ANIMS = [
  { id: "slideUp",    label: "↑ Subir"   },
  { id: "fade",       label: "◐ Fade"    },
  { id: "typewriter", label: "⌨ Máquina" },
  { id: "zoom",       label: "⊕ Zoom"    },
];
const CARD_FONTS = [
  { id: "Poppins",          label: "Redondeada", weight: 800, preview: "Aa" },
  { id: "Anton",            label: "Impacto",    weight: 400, preview: "Aa" },
  { id: "Permanent Marker", label: "Manuscrita", weight: 400, preview: "Aa" },
];

// Estilos de edición predefinidos: eligiendo uno, la herramienta aplica
// automáticamente tarjetas (vía IA) con la tipografía/color/animación del
// estilo. "none" preserva el editor 100% manual.
const STYLE_TEMPLATES = [
  {
    id: "none",
    emoji: "✂️",
    label: "Editor libre",
    desc: "Corta silencios y edita todo a tu manera, sin tarjetas automáticas.",
    autoCards: false,
  },
  {
    id: "editorial",
    emoji: "📰",
    label: "Editorial / Documental",
    desc: "Tarjetas de texto a pantalla completa entre cada punto clave, tipografía bold y sonido de clic — como una revista.",
    autoCards: true,
    format: "portrait",
    cardFont: "Anton",
    cardAnimation: "zoom",
    cardPosition: "fullscreen",
    cardColorCycle: [2, 0, 1, 3],
    cardDuration: 3,
  },
];

// Formatea transcripción con timestamp cada 8 palabras — formato que espera
// el prompt del backend para generar tarjetas automáticas.
function buildTimestampedTranscript(segments) {
  const parts = [];
  segments.forEach((s, i) => {
    if (i % 8 === 0) parts.push(`[${Math.round(s.start)}s]`);
    parts.push(s.word);
  });
  return parts.join(" ");
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
    if (onProgress) onProgress(1);
    return {
      duration: audioBuf.duration,
      waveform: buildWaveform(channelData, 900),
      silences: detectSilences(channelData, audioBuf.sampleRate, noiseDb, minDuration, audioBuf.duration),
    };
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

      // Conectar video → AnalyserNode (silencioso, sin speakers)
      const source = audioCtx.createMediaElementSource(video);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      // NO conectar a audioCtx.destination → análisis mudo

      const fftData = new Float32Array(analyser.fftSize);
      const sampleRms = [];   // [{ t, rms }]

      let raf;
      const collect = () => {
        analyser.getFloatTimeDomainData(fftData);
        let sumSq = 0;
        for (let i = 0; i < fftData.length; i++) sumSq += fftData[i] * fftData[i];
        sampleRms.push({ t: video.currentTime, rms: Math.sqrt(sumSq / fftData.length) });
        if (onProgress) onProgress(video.currentTime / duration);
        raf = requestAnimationFrame(collect);
      };

      // iOS max playbackRate = 2; Chrome permite más
      video.playbackRate = Math.min(
        typeof video.playbackRate !== "undefined" ? 16 : 2,
        2   // seguro en iOS
      );

      video.play().then(() => { collect(); }).catch(err => {
        cancelAnimationFrame(raf);
        audioCtx.close();
        URL.revokeObjectURL(url);
        reject(err);
      });

      video.onended = () => {
        cancelAnimationFrame(raf);
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
        cancelAnimationFrame(raf);
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

// ── Transcripción (Whisper Base — Web Worker) ─────────────────────────────
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

// Envía el File directamente al Worker — el preproceso (arrayBuffer + decode + resample)
// ocurre off-thread para no congelar la UI.
async function transcribeClip(file, silences, onModelProgress) {
  return new Promise((resolve, reject) => {
    const worker = getWhisperWorker();
    const id = uid();
    const onMsg = ({ data }) => {
      if (data.id !== id) return;
      if (data.type === "progress") {
        onModelProgress?.(data.info);
      } else if (data.type === "result") {
        worker.removeEventListener("message", onMsg);
        const mr = data.mappingRanges;
        const segs = (data.chunks || []).map(c => {
          const cs = c.timestamp?.[0] ?? 0;
          const ce = c.timestamp?.[1] ?? (cs + 0.5);
          return {
            word:  c.text.replace(/^\s+/, ""),
            start: mr ? mapCondensedToOriginal(cs, mr) : cs,
            end:   mr ? mapCondensedToOriginal(ce, mr) : ce,
          };
        }).filter(s => s.word);
        resolve(segs);
      } else if (data.type === "error") {
        worker.removeEventListener("message", onMsg);
        reject(new Error(data.message));
      }
    };
    worker.addEventListener("message", onMsg);
    // File es structured-cloneable → va al Worker sin copiar datos en el heap del main thread
    worker.postMessage({ id, file, silences: silences || [] });
  });
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
  const font      = style.font    || "Poppins";
  const hlColor   = style.hlColor || "#FFE44D";
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

  // Franja semitransparente detrás de todas las palabras
  ctx.fillStyle = "rgba(0,0,0,0.52)";
  ctx.beginPath();
  ctx.roundRect(x - padX - 5, y - fs - padY - 5, totalW + (padX + 5) * 2, fs + (padY + 5) * 2, 12);
  ctx.fill();

  group.forEach((w, i) => {
    const isCurrent = time >= w.start && time <= w.end;
    const wordText  = w.word + (i < group.length - 1 ? " " : "");
    const wordW     = ctx.measureText(w.word).width;
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
    ctx.fillText(wordText, x, y);
    ctx.shadowBlur = 0;
    x += wMeasures[i];
  });
  ctx.restore();
}

// Envolvente de zoom: entra en "pop" (0.85→1.0) y se contrae un poco antes
// de salir — imita el estilo "tarjeta editorial".
function cardZoomScale(elapsed, duration) {
  const growEase = 1 - (1 - Math.min(1, elapsed / 0.3)) ** 3;
  const shrinkStart = duration - 0.3;
  const shrinkT = elapsed > shrinkStart ? Math.min(1, (elapsed - shrinkStart) / 0.3) : 0;
  return (0.85 + growEase * 0.15) * (1 - shrinkT * 0.08);
}

function drawCards(ctx, W, H, effectiveTime, cards) {
  if (!cards?.length) return;
  for (const card of cards) {
    const elapsed = effectiveTime - card.startTime;
    if (elapsed < 0 || elapsed > card.duration + 0.3) continue;
    const alpha = Math.min(Math.min(1, elapsed / 0.25), Math.min(1, (card.duration - elapsed + 0.25) / 0.25));
    if (alpha <= 0) continue;

    const colors = CARD_BG_OPTIONS[card.colorIdx ?? 0] ?? CARD_BG_OPTIONS[0];
    const font = card.font || "Poppins";
    const fontWeight = CARD_FONTS.find(f => f.id === font)?.weight ?? 800;
    const kwFont = card.keywordFont || font;
    const kwFontWeight = CARD_FONTS.find(f => f.id === kwFont)?.weight ?? fontWeight;
    const kwColor = card.kwColor || colors.kw;
    const isFullscreen = card.position === "fullscreen";
    const kw = (card.keyword || "").toLowerCase().trim();

    let visibleText = card.text || "";
    if (card.animation === "typewriter") visibleText = visibleText.slice(0, Math.floor(elapsed * 28));
    if (!visibleText.trim()) continue;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textBaseline = "middle";

    let slideY = 0, scale = 1;
    if (card.animation === "slideUp") {
      const ease = 1 - (1 - Math.min(1, elapsed / 0.35)) ** 3;
      slideY = (1 - ease) * 50;
    } else if (card.animation === "zoom") {
      scale = cardZoomScale(elapsed, card.duration);
    }

    if (isFullscreen) {
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, W, H);

      const maxW = W * 0.82;
      const maxBlockH = H * 0.55;
      let fs = Math.floor(H / 6.2);
      let lines = [];
      while (fs > 24) {
        ctx.font = `${fontWeight} ${fs}px "${font}", sans-serif`;
        const words = visibleText.split(/\s+/).filter(Boolean);
        lines = []; let line = [], lineW = 0;
        for (const w of words) {
          const ww = ctx.measureText(w + " ").width;
          if (lineW + ww > maxW && line.length) { lines.push(line); line = [w]; lineW = ww; }
          else { line.push(w); lineW += ww; }
        }
        if (line.length) lines.push(line);
        const lh2 = fs * 1.18;
        if (lines.length * lh2 <= maxBlockH) break;
        fs -= 4;
      }
      if (!lines.length) { ctx.restore(); continue; }
      const lh = fs * 1.18;
      const totalH = lines.length * lh;
      const cx = W / 2, cy = H / 2 + slideY;

      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);

      lines.forEach((lineWords, li) => {
        const lineText = lineWords.join(" ");
        const lineW2 = ctx.measureText(lineText).width;
        let tx = cx - lineW2 / 2;
        const ty = cy - totalH / 2 + li * lh + lh / 2;
        for (let wi = 0; wi < lineWords.length; wi++) {
          const word = lineWords[wi];
          const clean = word.toLowerCase().replace(/[¿?¡!.,;:]/g, "");
          const isKw = kw && clean === kw;
          const wordText = word + (wi < lineWords.length - 1 ? " " : "");
          if (isKw && kwFont !== font) ctx.font = `${kwFontWeight} ${fs}px "${kwFont}", sans-serif`;
          const ww = ctx.measureText(wordText).width;
          ctx.fillStyle = isKw ? kwColor : colors.text;
          ctx.fillText(wordText, tx, ty);
          if (isKw && kwFont !== font) ctx.font = `${fontWeight} ${fs}px "${font}", sans-serif`;
          tx += ww;
        }
      });
      ctx.restore();
      continue;
    }

    // Modo píldora flotante
    const fs = Math.max(18, Math.floor(H / 11));
    const lh = Math.round(fs * 1.45);
    const padX = 22, padY = 14, borderR = 14;
    const maxW = W * 0.86;
    ctx.font = `${fontWeight} ${fs}px "${font}", sans-serif`;

    const words = visibleText.split(/\s+/).filter(Boolean);
    const lines = [];
    let line = [], lineW = 0;
    for (const w of words) {
      const ww = ctx.measureText(w + " ").width;
      if (lineW + ww > maxW && line.length) { lines.push([...line]); line = [w]; lineW = ww; }
      else { line.push(w); lineW += ww; }
    }
    if (line.length) lines.push(line);
    if (!lines.length) { ctx.restore(); continue; }

    const maxLineW = Math.max(...lines.map(l => ctx.measureText(l.join(" ")).width));
    const cardW = Math.min(maxW, maxLineW) + padX * 2;
    const totalH = lines.length * lh + padY * 2;
    const yCenter = card.position === "top" ? H * 0.18 : card.position === "center" ? H * 0.50 : H * 0.78;
    const cardX = (W - cardW) / 2;
    const cardY = yCenter - totalH / 2 + slideY;

    if (scale !== 1) {
      const scx = cardX + cardW / 2, scy = cardY + totalH / 2;
      ctx.translate(scx, scy); ctx.scale(scale, scale); ctx.translate(-scx, -scy);
    }

    ctx.fillStyle = colors.bg;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, totalH, borderR);
    ctx.fill();

    lines.forEach((lineWords, li) => {
      const lineW2 = ctx.measureText(lineWords.join(" ")).width;
      let tx = cardX + (cardW - lineW2) / 2;
      const ty = cardY + padY + li * lh + lh / 2;
      for (let wi = 0; wi < lineWords.length; wi++) {
        const word = lineWords[wi];
        const clean = word.toLowerCase().replace(/[¿?¡!.,;:]/g, "");
        const isKw = kw && clean === kw;
        const wordText = word + (wi < lineWords.length - 1 ? " " : "");
        const ww = ctx.measureText(wordText).width;
        if (isKw) {
          const kwPad = 4;
          if (kwFont !== font) ctx.font = `${kwFontWeight} ${fs}px "${kwFont}", sans-serif`;
          ctx.fillStyle = kwColor;
          ctx.beginPath();
          ctx.roundRect(tx - kwPad, ty - fs / 2 - kwPad + 2, ctx.measureText(word).width + kwPad * 2, fs + kwPad * 2 - 4, 5);
          ctx.fill();
          ctx.fillStyle = colors.bg;
        } else {
          if (kwFont !== font) ctx.font = `${fontWeight} ${fs}px "${font}", sans-serif`;
          ctx.fillStyle = colors.text;
        }
        ctx.fillText(wordText, tx, ty);
        tx += ww;
      }
    });
    ctx.restore();
  }
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
async function recordAllClips(clips, onProgress, abortRef, subtitleStyle = {}, format = "landscape", effects = {}, clipTransitions = {}, music = {}, cards = [], sfxList = []) {
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

  // Música de fondo — se mezcla con el audio del video
  if (music?.url) {
    try {
      const musicEl = new Audio(music.url);
      musicEl.crossOrigin = "anonymous";
      musicEl.loop = music.loop ?? true;
      const musicSrc = audioCtx.createMediaElementSource(musicEl);
      const musicGain = audioCtx.createGain();
      musicGain.gain.value = music.duck ? (music.volume ?? 0.35) * 0.3 : (music.volume ?? 0.35);
      musicSrc.connect(musicGain);
      musicGain.connect(destination);
      await musicEl.play();
    } catch (e) { console.warn("Music export:", e); }
  }

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
        try { source = audioCtx.createMediaElementSource(videoEl); source.connect(destination); } catch {}
        const vW = videoEl.videoWidth || W, vH = videoEl.videoHeight || H;
        const scale = Math.min(outW / vW, outH / vH);
        const dW = vW * scale, dH = vH * scale;

        const { autoZoom = false, zoomInterval = 4 } = effects;
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
            // Auto-zoom rítmico
            const z = autoZoom ? 1 + 0.07 * Math.abs(Math.sin(videoEl.currentTime * Math.PI / zoomInterval)) : 1;
            const zdX = (outW - dW * z) / 2, zdY = (outH - dH * z) / 2;
            // Pass 1: corrección de color
            const { brightness = 0, contrast = 0, saturation = 0, skin = 0, temperature = 0 } = effects;
            const vf = buildVidFilter(brightness, contrast, saturation);
            if (vf) { ctx.save(); ctx.filter = vf; }
            ctx.drawImage(videoEl, zdX, zdY, dW * z, dH * z);
            if (vf) ctx.restore();
            // Pass 2: overlay de suavizante de piel
            applySkinOverlay(ctx, videoEl, zdX, zdY, dW * z, dH * z, skin);
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
            drawCards(ctx, outW, outH, elapsed + videoEl.currentTime, cards);
          }
          animId = requestAnimationFrame(drawLoop);
        };

        videoEl.currentTime = 0;
        await new Promise(r => { videoEl.onseeked = r; });
        const toRemove = (clip.silences || []).filter(s => s.cut);
        let inCut = false;
        videoEl.play();
        animId = requestAnimationFrame(drawLoop);
        let prevExportEt = elapsed;

        const interval = setInterval(() => {
          if (abortRef.current) { clearInterval(interval); cancelAnimationFrame(animId); videoEl.pause(); resolve(); return; }
          const ct = videoEl.currentTime;
          const dur = clip.duration || videoEl.duration;
          onProgress((elapsed + ct) / totalDuration, `Procesando clip ${ci + 1} de ${clips.length}: ${clip.name}`);
          const inSilence = toRemove.some(s => ct >= s.start && ct < s.end);
          if (inSilence && !inCut) { inCut = true; videoEl.playbackRate = 16; videoEl.volume = 0; }
          else if (!inSilence && inCut) { inCut = false; videoEl.playbackRate = 1; videoEl.volume = 1; }

          // Disparar SFX en export
          const curExportEt = elapsed + ct;
          for (const sfx of sfxList) {
            if (sfx.time > prevExportEt && sfx.time <= curExportEt) {
              synthSfx(sfx.type, audioCtx, destination, audioCtx.currentTime);
            }
          }
          prevExportEt = curExportEt;

          if (videoEl.ended || ct >= dur - 0.1) {
            clearInterval(interval); cancelAnimationFrame(animId); videoEl.pause();
            if (source) try { source.disconnect(); } catch {}
            URL.revokeObjectURL(url); resolve();
          }
        }, 60);
      });
      videoEl.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    });
    elapsed += clip.duration || 0;

    // Transición entre clips en exportación (per-clip override o global)
    const clipTrans = clipTransitions[clip.id] ?? effects.transition ?? "none";
    const { transitionSecs = 0.4 } = effects;
    const transition = clipTrans;
    if (!abortRef.current && transition !== "none" && ci < clips.length - 1) {
      await new Promise(resolve => {
        if (transition === "fade") {
          // Fade a negro
          const t0 = performance.now();
          const dur = transitionSecs / 2;
          const step = () => {
            const t = Math.min(1, (performance.now() - t0) / 1000 / dur);
            ctx.fillStyle = `rgba(0,0,0,${t})`; ctx.fillRect(0, 0, outW, outH);
            if (t < 1) requestAnimationFrame(step); else resolve();
          };
          requestAnimationFrame(step);
        } else if (transition === "flash") {
          const t0 = performance.now();
          const step = () => {
            const t = Math.min(1, (performance.now() - t0) / 1000 / 0.12);
            ctx.fillStyle = `rgba(255,255,255,${t})`; ctx.fillRect(0, 0, outW, outH);
            if (t < 1) requestAnimationFrame(step); else resolve();
          };
          requestAnimationFrame(step);
        } else if (transition.startsWith("slide")) {
          createImageBitmap(canvas).then(bitmap => {
            const t0 = performance.now();
            const dur = transitionSecs * 0.6;
            const step = () => {
              const t = Math.min(1, (performance.now() - t0) / 1000 / dur);
              const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
              ctx.fillStyle = "#000"; ctx.fillRect(0, 0, outW, outH);
              const ox = transition === "slideLeft" ? -outW * ease : transition === "slideRight" ? outW * ease : 0;
              const oy = transition === "slideUp"   ? -outH * ease : transition === "slideDown"  ? outH * ease : 0;
              ctx.drawImage(bitmap, ox, oy, outW, outH);
              if (t < 1) requestAnimationFrame(step);
              else { bitmap.close(); resolve(); }
            };
            requestAnimationFrame(step);
          });
        } else {
          resolve();
        }
      });
    }
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
  const vf = buildVidFilter(brightness, contrast, saturation);

  await new Promise(resolve => {
    const vid = document.createElement("video");
    const url = URL.createObjectURL(clip.file);
    vid.src = url; vid.crossOrigin = "anonymous";
    vid.addEventListener("loadedmetadata", async () => {
      let src;
      try { src = audioCtx.createMediaElementSource(vid); src.connect(destination); } catch {}
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

// ── MusicPanel ────────────────────────────────────────────────────────────
function MusicPanel({ music, onMusicChange }) {
  const fileRef    = useRef(null);
  const previewRef = useRef(null);
  const [dragOver,    setDragOver]    = useState(false);
  const [genreFilter, setGenreFilter] = useState("motivacional");
  const [previewing,  setPreviewing]  = useState(null);
  const [selecting,   setSelecting]   = useState(null);

  const stopPreview = () => {
    if (previewRef.current) { previewRef.current.pause(); previewRef.current.src = ""; previewRef.current = null; }
    setPreviewing(null);
  };
  useEffect(() => stopPreview, []);

  const togglePreview = (track) => {
    if (previewing === track.id) { stopPreview(); return; }
    stopPreview();
    const audio = new Audio(track.url);
    audio.volume = 0.5;
    audio.play().catch(() => {});
    audio.onended = () => { setPreviewing(null); previewRef.current = null; };
    previewRef.current = audio;
    setPreviewing(track.id);
  };

  const selectTrack = async (track) => {
    if (selecting) return;
    setSelecting(track.id);
    stopPreview();
    if (music.url && !music.fromLibrary) URL.revokeObjectURL(music.url);
    try {
      const res = await fetch(track.url);
      if (!res.ok) throw new Error("fetch");
      const blob = await res.blob();
      onMusicChange({ ...music, url: URL.createObjectURL(blob), name: track.name, fromLibrary: true });
    } catch {
      onMusicChange({ ...music, url: track.url, name: track.name, fromLibrary: true });
    }
    setSelecting(null);
  };

  const handleFile = (file) => {
    if (!file) return;
    const ok = file.type.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name);
    if (!ok) return;
    stopPreview();
    if (music.url && !music.fromLibrary) URL.revokeObjectURL(music.url);
    onMusicChange({ ...music, url: URL.createObjectURL(file), name: file.name.replace(/\.[^/.]+$/, ""), fromLibrary: false });
  };

  const clearMusic = () => {
    stopPreview();
    if (music.url && !music.fromLibrary) URL.revokeObjectURL(music.url);
    onMusicChange({ ...music, url: null, name: "", fromLibrary: false });
  };

  const filtered = MUSIC_LIBRARY.filter(t => t.genre === genreFilter);

  return (
    <div className="sce-music-panel">
      {/* Track activo */}
      {music.url && (
        <div className="sce-music-loaded">
          <span style={{ fontSize: 16 }}>🎵</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="sce-music-track-name">{music.name}</p>
            <p className="sce-music-track-sub">Activa · se mezcla al exportar</p>
          </div>
          <button className="sce-music-clear" onClick={clearMusic} title="Quitar">✕</button>
        </div>
      )}
      {music.url && (
        <div className="sce-music-controls">
          <div className="sce-music-row">
            <span className="sce-music-row-label">🔊 Volumen</span>
            <input type="range" min="0" max="1" step="0.05" className="sce-fx-slider"
              value={music.volume} onChange={e => onMusicChange({ ...music, volume: +e.target.value })} />
            <span className="sce-music-row-val">{Math.round(music.volume * 100)}%</span>
          </div>
          <div className="sce-music-toggle-row">
            <div>
              <p className="sce-fx-section-label" style={{ marginBottom: 2 }}>AUTO-DUCKING</p>
              <p className="sce-fx-hint" style={{ margin: 0 }}>Baja al hablar</p>
            </div>
            <button className={`sce-fx-toggle${music.duck ? " active" : ""}`}
              onClick={() => onMusicChange({ ...music, duck: !music.duck })}>
              {music.duck ? "ON" : "OFF"}
            </button>
          </div>
          <div className="sce-music-toggle-row">
            <p className="sce-fx-section-label">BUCLE</p>
            <button className={`sce-fx-toggle${music.loop ? " active" : ""}`}
              onClick={() => onMusicChange({ ...music, loop: !music.loop })}>
              {music.loop ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      )}

      {/* Biblioteca */}
      <div className="sce-music-lib">
        <p className="sce-music-lib-title">🎧 Sin derechos · Solo instrumentales</p>
        <div className="sce-genre-tabs">
          {MUSIC_GENRES.map(g => (
            <button key={g.id}
              className={`sce-genre-tab${genreFilter === g.id ? " active" : ""}`}
              onClick={() => setGenreFilter(g.id)}>{g.label}</button>
          ))}
        </div>
        <div className="sce-track-list">
          {filtered.map(track => {
            const isSelected = music.url && music.name === track.name && music.fromLibrary;
            const isPrev     = previewing === track.id;
            const isLoading  = selecting === track.id;
            return (
              <div key={track.id} className={`sce-track-item${isSelected ? " selected" : ""}`}>
                <button className="sce-track-preview-btn" onClick={() => togglePreview(track)}
                  title={isPrev ? "Detener" : "Escuchar"}>
                  {isPrev ? "⏸" : "▶"}
                </button>
                <span className="sce-track-name">{track.name}</span>
                <button
                  className={`sce-track-select-btn${isSelected ? " active" : ""}`}
                  onClick={() => isSelected ? clearMusic() : selectTrack(track)}
                  disabled={!!selecting && !isLoading}>
                  {isLoading ? "···" : isSelected ? "✓ Usando" : "Usar"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subir audio propio */}
      <div className="sce-music-upload-section">
        <p className="sce-music-upload-label">O sube tu propio audio</p>
        <div
          className={`sce-music-drop-mini${dragOver ? " over" : ""}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}>
          ↑ MP3 · WAV · M4A · Arrastra o haz clic
        </div>
        <input ref={fileRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
          style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
      </div>
    </div>
  );
}

// ── CardsPanel ────────────────────────────────────────────────────────────
function CardsPanel({ cards, onCardsChange, currentTime }) {
  const [expandedId, setExpandedId] = useState(null);

  const addCard = () => {
    const c = {
      id: uid(), text: "Escribe tu punto clave aquí", keyword: "",
      startTime: Math.round((currentTime ?? 0) * 10) / 10,
      duration: 3, colorIdx: 0, font: "Poppins", position: "bottom", animation: "slideUp",
    };
    onCardsChange([...cards, c]);
    setExpandedId(c.id);
  };
  const update = (id, patch) => onCardsChange(cards.map(c => c.id === id ? { ...c, ...patch } : c));
  const remove = (id) => { onCardsChange(cards.filter(c => c.id !== id)); if (expandedId === id) setExpandedId(null); };
  const toggle = (id) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div className="sce-cards-panel">
      <button className="sce-add-card-btn" onClick={addCard}>＋ Nueva tarjeta</button>

      {cards.length === 0 && (
        <div className="sce-cards-empty">
          <p>Crea tarjetas animadas con tus puntos clave</p>
          <p className="sce-cards-hint">Aparecen sobre el video con transición profesional</p>
        </div>
      )}

      {cards.map((card) => {
        const colors = CARD_BG_OPTIONS[card.colorIdx ?? 0] ?? CARD_BG_OPTIONS[0];
        const isOpen = expandedId === card.id;
        const kw = (card.keyword || "").toLowerCase().trim();

        return (
          <div key={card.id} className={`sce-card-item${isOpen ? " open" : ""}`}>

            {/* Fila colapsada — siempre visible */}
            <div className="sce-card-collapsed" onClick={() => toggle(card.id)}>
              <div className="sce-card-color-badge" style={{ background: colors.bg }} />
              <div className="sce-card-collapsed-info">
                <span className="sce-card-collapsed-text">{card.text.slice(0, 30)}{card.text.length > 30 ? "…" : ""}</span>
                <span className="sce-card-collapsed-meta">{fmtTime(card.startTime)} · {card.duration}s · {CARD_ANIMS.find(a => a.id === card.animation)?.label}</span>
              </div>
              <span className="sce-card-chevron">{isOpen ? "▲" : "▼"}</span>
              <button className="sce-card-remove" onClick={e => { e.stopPropagation(); remove(card.id); }}>✕</button>
            </div>

            {/* Editor expandido */}
            {isOpen && (
              <div className="sce-card-editor">

                {/* Preview visual */}
                <div className={`sce-card-preview-wrap${card.position === "fullscreen" ? " sce-card-preview-wrap--full" : ""}`} style={{ background: colors.bg }}>
                  <p className="sce-card-preview-text" style={{ color: colors.text, fontFamily: `"${card.font || "Poppins"}", sans-serif`, fontWeight: CARD_FONTS.find(f => f.id === (card.font || "Poppins"))?.weight ?? 800 }}>
                    {(card.text || "Texto de la tarjeta").split(/\s+/).map((word, i) => {
                      const clean = word.toLowerCase().replace(/[¿?¡!.,;:]/g, "");
                      return kw && clean === kw
                        ? <mark key={i} style={{ background: colors.kw, color: colors.bg, borderRadius: 3, padding: "0 3px" }}>{word}{" "}</mark>
                        : <span key={i}>{word}{" "}</span>;
                    })}
                  </p>
                </div>

                <div className="sce-card-field">
                  <label className="sce-card-label">Texto</label>
                  <textarea className="sce-card-textarea" rows={2} value={card.text}
                    onChange={e => update(card.id, { text: e.target.value })} />
                </div>

                <div className="sce-card-field">
                  <label className="sce-card-label">Palabra clave <span className="sce-card-label--hint">(se resalta en el preview)</span></label>
                  <input className="sce-card-input" value={card.keyword} placeholder="ej: 3 pasos"
                    onChange={e => update(card.id, { keyword: e.target.value })} />
                </div>

                <div className="sce-card-row">
                  <div className="sce-card-field" style={{ flex: 1 }}>
                    <label className="sce-card-label">Inicio</label>
                    <div className="sce-card-time-row">
                      <input type="number" className="sce-card-input-num" step="0.1" min="0"
                        value={card.startTime.toFixed(1)} onChange={e => update(card.id, { startTime: +e.target.value })} />
                      <button className="sce-card-now-btn" title="Capturar tiempo actual"
                        onClick={() => update(card.id, { startTime: Math.round((currentTime ?? 0) * 10) / 10 })}>⊙</button>
                    </div>
                  </div>
                  <div className="sce-card-field" style={{ flex: 1 }}>
                    <label className="sce-card-label">Duración (s)</label>
                    <input type="number" className="sce-card-input-num" step="0.5" min="0.5" max="10"
                      value={card.duration} onChange={e => update(card.id, { duration: +e.target.value })} />
                  </div>
                </div>

                <div className="sce-card-field">
                  <label className="sce-card-label">Color</label>
                  <div className="sce-card-colors">
                    {CARD_BG_OPTIONS.map(opt => (
                      <button key={opt.idx}
                        className={`sce-card-color-dot${card.colorIdx === opt.idx ? " active" : ""}`}
                        style={{ "--dot-bg": opt.bg }}
                        onClick={() => update(card.id, { colorIdx: opt.idx })} />
                    ))}
                  </div>
                </div>

                <div className="sce-card-field">
                  <label className="sce-card-label">Tipografía principal</label>
                  <div className="sce-card-pills">
                    {CARD_FONTS.map(f => (
                      <button key={f.id} className={`sce-card-pill${(card.font || "Poppins") === f.id ? " active" : ""}`}
                        style={{ fontFamily: `"${f.id}", sans-serif`, fontWeight: f.weight }}
                        onClick={() => update(card.id, { font: f.id })}>{f.label}</button>
                    ))}
                  </div>
                </div>

                <div className="sce-card-field">
                  <label className="sce-card-label">Tipografía de la palabra clave</label>
                  <div className="sce-card-pills">
                    {CARD_FONTS.map(f => (
                      <button key={f.id} className={`sce-card-pill${(card.keywordFont || card.font || "Poppins") === f.id ? " active" : ""}`}
                        style={{ fontFamily: `"${f.id}", sans-serif`, fontWeight: f.weight }}
                        onClick={() => update(card.id, { keywordFont: f.id })}>{f.label}</button>
                    ))}
                  </div>
                </div>

                <div className="sce-card-field">
                  <label className="sce-card-label">Color de resaltado</label>
                  <div className="sce-card-colors">
                    {CARD_KW_COLORS.map(color => (
                      <button key={color}
                        className={`sce-card-color-dot${(card.kwColor || (CARD_BG_OPTIONS[card.colorIdx ?? 0]?.kw)) === color ? " active" : ""}`}
                        style={{ "--dot-bg": color }}
                        onClick={() => update(card.id, { kwColor: color })} />
                    ))}
                  </div>
                </div>

                <div className="sce-card-2col">
                  <div className="sce-card-field">
                    <label className="sce-card-label">Animación</label>
                    <div className="sce-card-pills">
                      {CARD_ANIMS.map(a => (
                        <button key={a.id} className={`sce-card-pill${card.animation === a.id ? " active" : ""}`}
                          onClick={() => update(card.id, { animation: a.id })}>{a.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="sce-card-field">
                    <label className="sce-card-label">Posición</label>
                    <div className="sce-card-pills">
                      {[["top","↑"],["center","·"],["bottom","↓"],["fullscreen","⛶ Completa"]].map(([p, l]) => (
                        <button key={p} className={`sce-card-pill${card.position === p ? " active" : ""}`}
                          onClick={() => update(card.id, { position: p })}>{l}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <button className="sce-card-done-btn" onClick={() => setExpandedId(null)}>✓ Listo</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SubtitlePanel ─────────────────────────────────────────────────────────
function SubtitlePanel({ clips, setClips, currentClipId, localTime, subtitleStyle, onStyleChange,
    onTranscribe, onSeekInClip, listRef, transcribing, transcribeMsg }) {
  const hasSubtitles = clips.some(c => c.transcribed && c.segments?.length);
  const failedClips  = clips.filter(c => c.transcribed && c.transcribeError);
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
          <p className="sce-trans-hint">Whisper Base · Español · Primera vez ~145 MB</p>
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
              <div className="sce-sub-pos-row">
                <span className="sce-sub-pos-label">Posición</span>
                <div className="sce-sub-pos-btns">
                  {[["top","↑ Arriba"],["bottom","↓ Abajo"]].map(([pos, lbl]) => (
                    <button key={pos}
                      className={`sce-sub-pos-btn${(subtitleStyle.position || "bottom") === pos ? " active" : ""}`}
                      onClick={() => onStyleChange({ ...subtitleStyle, position: pos })}>{lbl}</button>
                  ))}
                </div>
              </div>
              <div className="sce-sub-pos-row">
                <span className="sce-sub-pos-label">Tamaño</span>
                <div className="sce-sub-pos-btns">
                  {[["small","Chico"],["medium","Normal"],["large","Grande"]].map(([s, l]) => (
                    <button key={s}
                      className={`sce-sub-pos-btn${(subtitleStyle.size || "medium") === s ? " active" : ""}`}
                      onClick={() => onStyleChange({ ...subtitleStyle, size: s })}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {failedClips.length > 0 && (
            <div className="sce-trans-error">
              <p>⚠ No se pudo transcribir {failedClips.length > 1 ? `${failedClips.length} clips` : `"${failedClips[0].name.replace(/\.[^/.]+$/, "")}"`}</p>
              <p className="sce-trans-error-hint">Asegúrate de usar Chrome en escritorio. El video debe tener audio. <button className="sce-trans-retry-btn" onClick={onTranscribe}>Reintentar</button></p>
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
function ClipTimeline({ keptSegs, totalKept, effectiveTime, onSeek, allClips, onMoveClip, onRemoveClip, onAddFiles, onCutSeg, clipTransitions = {}, onSetClipTransition, activePreset, defaultTransition = "none", music = null, sfxList = [], onSfxChange, cards = [], onCardsChange }) {
  const pct = totalKept > 0 ? Math.min(100, (effectiveTime / totalKept) * 100) : 0;
  const [hoveredSeg, setHoveredSeg] = useState(null);
  const [transPickerClipId, setTransPickerClipId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const trackWrapRef = useRef(null);
  const seekDragRef  = useRef(false);
  const cardDragRef  = useRef(null);
  const sfxDragRef   = useRef(null);

  useEffect(() => {
    const el = trackWrapRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom(z => Math.max(1, Math.min(10, z * (e.deltaY > 0 ? 0.85 : 1.18))));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Scrubber drag — se arrastra en tiempo real con el puntero
  const SKIP_DRAG = [".sce-tl-seg-del",".sce-tl-trans-btn",".sce-tl-card-block",".sce-tl-sfx-dot",".sce-tl-trans-marker",".sce-tl-seg-toolbar"];
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

  // Card drag — arrastra tarjetas para reposicionarlas en el timeline
  const handleCardDragStart = (e, card) => {
    e.stopPropagation();
    cardDragRef.current = {
      cardId: card.id, startX: e.clientX, startTime: card.startTime,
      trackWidth: e.currentTarget.parentElement.getBoundingClientRect().width,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleCardDragMove = (e) => {
    const d = cardDragRef.current;
    if (!d) return;
    const dt = ((e.clientX - d.startX) / d.trackWidth) * totalKept;
    const t  = Math.max(0, Math.min(totalKept - 0.5, d.startTime + dt));
    onCardsChange(cards.map(c => c.id === d.cardId ? { ...c, startTime: Math.round(t * 10) / 10 } : c));
  };
  const handleCardDragEnd = () => { cardDragRef.current = null; };

  // SFX drag
  const handleSfxDragStart = (e, sfx) => {
    e.stopPropagation();
    sfxDragRef.current = {
      sfxId: sfx.id, startX: e.clientX, startTime: sfx.time,
      trackWidth: e.currentTarget.parentElement.getBoundingClientRect().width,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleSfxDragMove = (e) => {
    const d = sfxDragRef.current;
    if (!d) return;
    const dt = ((e.clientX - d.startX) / d.trackWidth) * totalKept;
    const t  = Math.max(0, Math.min(totalKept, d.startTime + dt));
    onSfxChange?.(prev => prev.map(s => s.id === d.sfxId ? { ...s, time: Math.round(t * 10) / 10 } : s));
  };
  const handleSfxDragEnd = () => { sfxDragRef.current = null; };

  // Agrupar segmentos consecutivos del mismo clip para saber dónde terminan los clips
  const clipBoundaries = useMemo(() => {
    const bounds = [];
    let cumW = 0;
    for (let i = 0; i < keptSegs.length; i++) {
      const seg = keptSegs[i];
      const w = (seg.end - seg.start) / (totalKept || 1) * 100;
      const nextSeg = keptSegs[i + 1];
      const isLastOfClip = !nextSeg || nextSeg.clip.id !== seg.clip.id;
      if (isLastOfClip && nextSeg) {
        bounds.push({ clipId: seg.clip.id, leftPct: cumW + w });
      }
      cumW += w;
    }
    return bounds;
  }, [keptSegs, totalKept]);

  const presetInfo = VIDEO_PRESETS.find(p => p.id === activePreset);

  return (
    <div className="sce-timeline">
      <div className="sce-tl-header">
        <span className="sce-tl-label">TIMELINE</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {presetInfo && activePreset !== "none" && (
            <span className="sce-tl-preset-badge">{presetInfo.icon} {presetInfo.label}</span>
          )}
          <span className="sce-tl-duration">{fmtTime(effectiveTime)} / {fmtTime(totalKept)}</span>
          {zoom > 1.05 && <button className="sce-tl-zoom-reset" onClick={() => setZoom(1)} title="Restablecer zoom">×{zoom.toFixed(1)}</button>}
        </div>
      </div>
      <div className="sce-tl-body">
        {/* Labels de pista — fijos, no scrollean */}
        <div className="sce-tl-labels">
          <div className="sce-tl-label-row"><span>🎬</span><span>Video</span></div>
          <div className="sce-tl-label-row"><span>🎵</span><span>Música</span></div>
          <div className="sce-tl-label-row"><span>🔊</span><span>SFX</span></div>
          <div className="sce-tl-label-row"><span>📝</span><span>Tarjetas</span></div>
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

          {/* Pista 1 — Video */}
          <div className="sce-tl-track">
            {keptSegs.length === 0 && (
              <div className="sce-tl-empty">Analiza los clips para ver el timeline</div>
            )}
            {keptSegs.map((seg, i) => {
              const w = (seg.end - seg.start) / (totalKept || 1) * 100;
              const clipIdx = allClips.findIndex(c => c.id === seg.clip.id);
              const color = CLIP_COLORS[clipIdx % CLIP_COLORS.length] || "#C4526A";
              const isHov = hoveredSeg === i;
              return (
                <div key={i} className={`sce-tl-seg${isHov ? " hovered" : ""}`}
                  style={{ width: `${w}%`, "--seg-color": color }}
                  title={`${seg.clip.name.replace(/\.[^/.]+$/, "")} · ${fmtTime(seg.start)}–${fmtTime(seg.end)}`}
                  onMouseEnter={() => setHoveredSeg(i)} onMouseLeave={() => setHoveredSeg(null)}>
                  <span className="sce-tl-seg-label">{seg.clip.name.replace(/\.[^/.]+$/, "").slice(0, 14)}</span>
                  {isHov && onCutSeg && (
                    <div className="sce-tl-seg-toolbar">
                      <button className="sce-tl-seg-del" title="Eliminar este fragmento"
                        onClick={e => { e.stopPropagation(); onCutSeg(seg.clip.id, seg.start, seg.end); }}>🗑</button>
                      <button className="sce-tl-seg-play" title="Reproducir desde aquí"
                        onClick={e => { e.stopPropagation(); onSeek(keptSegs.slice(0,i).reduce((t,s)=>t+s.end-s.start,0)); }}>▶</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pista 2 — Música */}
          <div className="sce-tl-music-track">
            {music?.url
              ? <div className="sce-tl-music-bar" title={music.name}>
                  <span className="sce-tl-music-wave">♫♫♫♫♫♫♫♫♫♫♫♫♫♫♫♫♫♫♫♫♫♫♫♫</span>
                  <span className="sce-tl-music-name">{music.name}</span>
                </div>
              : <span className="sce-tl-track-hint">Agrega música en el panel →</span>
            }
          </div>

          {/* Pista 3 — SFX (arrastrables) */}
          <div className="sce-tl-sfx-track">
            {sfxList.length === 0
              ? <span className="sce-tl-track-hint">Agrega SFX en el panel 🔊 →</span>
              : sfxList.map(sfx => {
                  const pctPos = totalKept > 0 ? Math.min(99, (sfx.time / totalKept) * 100) : 0;
                  return (
                    <span key={sfx.id} className="sce-tl-sfx-dot"
                      style={{ left: `${pctPos}%` }}
                      title={`${sfx.emoji} ${sfx.label} @ ${sfx.time.toFixed(1)}s — arrastra para mover`}
                      onPointerDown={e => handleSfxDragStart(e, sfx)}
                      onPointerMove={handleSfxDragMove}
                      onPointerUp={handleSfxDragEnd}
                      onPointerCancel={handleSfxDragEnd}
                    >{sfx.emoji}</span>
                  );
                })
            }
          </div>

          {/* Pista 4 — Tarjetas (arrastrables) */}
          <div className="sce-tl-cards-track">
            {cards.length === 0
              ? <span className="sce-tl-track-hint">Las tarjetas aparecen aquí — arrástralas para moverlas</span>
              : cards.map(card => {
                  const leftPct = totalKept > 0 ? Math.min(97, (card.startTime / totalKept) * 100) : 0;
                  const widPct  = totalKept > 0 ? Math.max(1.5, (card.duration / totalKept) * 100) : 2;
                  const clr     = CARD_BG_OPTIONS[card.colorIdx ?? 0] ?? CARD_BG_OPTIONS[0];
                  return (
                    <div key={card.id} className="sce-tl-card-block"
                      style={{ left: `${leftPct}%`, width: `${widPct}%`, background: clr.bg, color: clr.text }}
                      title={`${card.text.slice(0, 50)} @ ${card.startTime}s — arrastra para mover`}
                      onPointerDown={e => handleCardDragStart(e, card)}
                      onPointerMove={handleCardDragMove}
                      onPointerUp={handleCardDragEnd}
                      onPointerCancel={handleCardDragEnd}
                    >
                      <span className="sce-tl-card-label">{card.text.slice(0, 22)}</span>
                    </div>
                  );
                })
            }
          </div>

          {/* Marcadores de transición entre clips */}
          {clipBoundaries.map(({ clipId, leftPct }) => {
            const transType = clipTransitions[clipId] ?? defaultTransition;
            const transInfo = TRANSITIONS.find(t => t.id === transType) || TRANSITIONS[0];
            const showPicker = transPickerClipId === clipId;
            return (
              <div key={clipId} className="sce-tl-trans-marker" style={{ left: `${leftPct}%` }}>
                <button
                  className={`sce-tl-trans-btn${transType !== "none" ? " has-trans" : ""}`}
                  title={`Transición: ${transInfo.label}`}
                  onClick={e => { e.stopPropagation(); setTransPickerClipId(showPicker ? null : clipId); }}>
                  {transInfo.icon}
                </button>
                {showPicker && (
                  <div className="sce-tl-trans-picker" onClick={e => e.stopPropagation()}>
                    <p className="sce-tl-trans-picker-title">Transición aquí</p>
                    <div className="sce-tl-trans-picker-grid">
                      {TRANSITIONS.filter((t,i,a) => a.findIndex(x=>x.id===t.id)===i).map(t => (
                        <button key={t.id}
                          className={`sce-tl-trans-option${(clipTransitions[clipId] ?? defaultTransition) === t.id ? " active" : ""}`}
                          onClick={() => { onSetClipTransition(clipId, t.id); setTransPickerClipId(null); }}>
                          <span>{t.icon}</span>
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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

// ── SfxPanel ─────────────────────────────────────────────────────────────
function SfxPanel({ sfxList, onSfxChange, currentTime, onPreview }) {
  const fmtT = (t) => {
    const m = Math.floor(t / 60), s = (t % 60).toFixed(1).padStart(4, "0");
    return `${m}:${s}`;
  };
  const addSfx = (type) => {
    const cat = SFX_CATALOG.find(c => c.id === type);
    if (!cat) return;
    const id = `sfx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    onSfxChange(prev => [...prev, { id, type, time: currentTime, label: cat.label, emoji: cat.emoji }]);
    onPreview(type);
  };
  const removeSfx = (id) => onSfxChange(prev => prev.filter(s => s.id !== id));

  return (
    <div className="sfx-panel">
      <div className="sfx-catalog">
        <p className="sfx-hint">Toca un efecto para agregarlo en la posición actual del scrubber</p>
        <div className="sfx-grid">
          {SFX_CATALOG.map(sfx => (
            <button key={sfx.id} className="sfx-btn" onClick={() => addSfx(sfx.id)} title={sfx.desc}>
              <span className="sfx-emoji">{sfx.emoji}</span>
              <span className="sfx-label">{sfx.label}</span>
            </button>
          ))}
        </div>
      </div>
      {sfxList.length > 0 && (
        <div className="sfx-timeline-list">
          <p className="sfx-section-title">En la línea de tiempo</p>
          {[...sfxList].sort((a, b) => a.time - b.time).map(sfx => (
            <div key={sfx.id} className="sfx-row">
              <span className="sfx-row-emoji">{sfx.emoji}</span>
              <span className="sfx-row-name">{sfx.label}</span>
              <span className="sfx-row-time">{fmtT(sfx.time)}</span>
              <button className="sfx-row-del" onClick={() => removeSfx(sfx.id)} title="Eliminar">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TransitionsPanel ─────────────────────────────────────────────────────
function TransitionsPanel({ effects, onEffectChange }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div className="sce-effects-panel">
      <div className="sce-fx-section">
        <p className="sce-fx-section-label">TRANSICIÓN ENTRE CLIPS</p>
        <div className="sce-trans-cards-grid">
          {TRANSITIONS.map(t => (
            <button key={t.id}
              className={`sce-trans-card${effects.transition === t.id ? " active" : ""}`}
              onClick={() => onEffectChange({ ...effects, transition: t.id })}
              onMouseEnter={() => setHovered(t.id)} onMouseLeave={() => setHovered(null)}>
              <div className={`sce-trans-preview sce-trans-prev--${t.id}${hovered === t.id ? " play" : ""}`}>
                <div className="sce-tprev-a">A</div>
                <div className="sce-tprev-b">B</div>
              </div>
              <span className="sce-trans-card-label">{t.icon} {t.label}</span>
            </button>
          ))}
        </div>
        {effects.transition !== "none" && (
          <div className="sce-fx-slider-row" style={{ marginTop: 10 }}>
            <span>Duración</span>
            <input type="range" min="0.2" max="1.5" step="0.1" className="sce-fx-slider"
              value={effects.transitionSecs}
              onChange={e => onEffectChange({ ...effects, transitionSecs: +e.target.value })} />
            <span>{effects.transitionSecs}s</span>
          </div>
        )}
      </div>

      {/* Auto-zoom de retención */}
      <div className="sce-fx-section">
        <div className="sce-fx-row">
          <div>
            <p className="sce-fx-section-label" style={{ marginBottom: 2 }}>AUTO-ZOOM DE RETENCIÓN</p>
            <p className="sce-fx-hint" style={{ margin: 0 }}>
              Zoom sutil cada {effects.zoomInterval || 4}s · Aumenta la retención del espectador
            </p>
          </div>
          <button className={`sce-fx-toggle${effects.autoZoom ? " active" : ""}`}
            onClick={() => onEffectChange({ ...effects, autoZoom: !effects.autoZoom })}>
            {effects.autoZoom ? "ON" : "OFF"}
          </button>
        </div>
        {effects.autoZoom && (
          <div className="sce-fx-slider-row" style={{ marginTop: 8 }}>
            <span style={{ minWidth: 64 }}>Intervalo</span>
            <input type="range" min="2" max="8" step="1" className="sce-fx-slider"
              value={effects.zoomInterval || 4}
              onChange={e => onEffectChange({ ...effects, zoomInterval: +e.target.value })} />
            <span>cada {effects.zoomInterval || 4}s</span>
          </div>
        )}
        <div className="sce-trans-zoom-demo">
          <div className={`sce-tzoom-box${effects.autoZoom ? " active" : ""}`}>
            <span>Vista previa del zoom</span>
          </div>
        </div>
      </div>
      <p className="sce-fx-footer">Las transiciones y el auto-zoom se exportan automáticamente.</p>
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
      skin: effects.skin,              // piel es independiente del preset — el preset nunca la pisa
      _preset: preset.id,
    });
  };

  const setFine = (key, val) => onEffectChange({ ...effects, [key]: val, _preset: "custom" });
  const setSkin = (val) => onEffectChange({ ...effects, skin: val }); // no cambia _preset

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

      {/* Suavizante de piel — independiente del estilo */}
      <div className="sce-fx-section">
        <div className="sce-fx-row">
          <p className="sce-fx-section-label">✨ SUAVIZANTE DE PIEL</p>
          <span style={{fontSize:"12px",fontWeight:700,color:effects.skin>0?"#C4526A":"#999",minWidth:"34px",textAlign:"right"}}>
            {effects.skin > 0 ? `${effects.skin}%` : "—"}
          </span>
        </div>
        <div className="sce-fx-slider-row" style={{marginTop:8}}>
          <span style={{fontSize:10,color:"#aaa",flexShrink:0}}>0</span>
          <input type="range" min="0" max="100" step="1"
            value={effects.skin}
            onChange={e => setSkin(Number(e.target.value))}
            className="sce-fx-slider"/>
          <span style={{fontSize:10,color:"#aaa",flexShrink:0}}>100</span>
        </div>
        <p className="sce-fx-hint">
          {effects.skin === 0
            ? "Sin efecto · desliza para activar"
            : effects.skin < 30 ? "Toque natural"
            : effects.skin < 55 ? "Piel suavizada"
            : effects.skin < 78 ? "Alta definición"
            : "Máximo airbrush"}
        </p>
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
          <div className="sce-fx-slider-row" style={{marginTop:8}}>
            <span style={{fontSize:10,color:"#aaa",flexShrink:0}}>0</span>
            <input type="range" min="1" max="100" step="1"
              value={effects.bokeh}
              onChange={e => onEffectChange({ ...effects, bokeh: Number(e.target.value) })}
              className="sce-fx-slider"/>
            <span style={{fontSize:10,color:"#aaa",flexShrink:0,minWidth:34,textAlign:"right"}}>{effects.bokeh}%</span>
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
function EditorScreen({ clips, setClips, subtitleStyle, onStyleChange, onExport, onAddFiles, moveClip, removeClip, onAnalyze, format, onFormatChange, onExtractReels, onCutSeg, style }) {
  const canvasRef    = useRef(null);
  const playRef      = useRef(false);
  const subListRef   = useRef(null);
  const fileInputRef = useRef(null);

  // Efectos — refs para que drawFrame/runPlay lean siempre el valor actual sin re-crearse
  const segRef      = useRef(null);   // MediaPipe SelfieSegmentation instance
  const maskRef     = useRef(null);   // último segmentation mask
  const maskCbRef   = useRef(null);   // resolve pendiente para drawFrame blocking
  const _nat        = VIDEO_PRESETS[0].values;
  const effectsRef  = useRef({ transition: "none", transitionSecs: 0.4, bokeh: 0, autoZoom: false, zoomInterval: 4, ..._nat, _preset: "natural" });
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
  const [effects,      setEffects]      = useState(() => ({ transition: "none", transitionSecs: 0.4, bokeh: 0, autoZoom: false, zoomInterval: 4, ...VIDEO_PRESETS[0].values, _preset: "natural" }));
  const [bokehLoading, setBokehLoading] = useState(false);
  const [clipTransitions, setClipTransitions] = useState({});
  const [music, setMusic] = useState({ url: null, name: "", volume: 0.35, duck: true, loop: true, fromLibrary: false });
  const musicRef = useRef({ url: null, name: "", volume: 0.35, duck: true, loop: true, fromLibrary: false });
  useEffect(() => { musicRef.current = music; }, [music]);
  const [cards, setCards] = useState([]);
  const cardsRef = useRef([]);
  useEffect(() => { cardsRef.current = cards; }, [cards]);

  const [sfxList, setSfxList] = useState([]); // [{id, type, time}]
  const sfxRef = useRef([]);
  useEffect(() => { sfxRef.current = sfxList; }, [sfxList]);
  const [sfxPanelOpen, setSfxPanelOpen] = useState(false);
  const sfxActxRef = useRef(null);

  // Estado de generación automática de tarjetas (estilo editorial)
  const autoCardTriedRef = useRef(false);
  const prevKeptLenRef  = useRef(0); // para el primer dibujado al abrir editor
  const [autoCardState, setAutoCardState] = useState("idle"); // idle|needsAuth|working|done|error
  const [autoCardMsg, setAutoCardMsg] = useState("");

  // Sync effects state → ref (para que callbacks estables lo lean sin deps)
  useEffect(() => { effectsRef.current = effects; }, [effects]);
  useEffect(() => { formatRef.current = format; }, [format]);

  // Renderiza un frame de `vid` al canvas ctx con todos los efectos activos.
  // blocking=true → espera el mask de bokeh (para seekTo); false → usa último mask (animation loop).
  const applyFrame = useCallback(async (ctx, vid, dX, dY, dW, dH, W, H, blocking = false) => {
    const { skin, bokeh, brightness = 0, contrast = 0, saturation = 0, temperature = 0 } = effectsRef.current;
    const vidFilter  = buildVidFilter(brightness, contrast, saturation);
    const bgBlur     = bokehBlurPx(bokeh);
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
          try { seg.send({ image: vid }); } catch { res(null); }
        });
      } else {
        mask = maskRef.current;
        try { seg.send({ image: vid }); } catch {}
      }

      // Persona (sharp + color) + overlay de piel, todo recortado con mask
      const mc = new OffscreenCanvas(W, H);
      const mctx = mc.getContext("2d");
      if (vidFilter) { mctx.save(); mctx.filter = vidFilter; }
      mctx.drawImage(vid, zdX, zdY, zdW, zdH);
      if (vidFilter) mctx.restore();
      applySkinOverlay(mctx, vid, zdX, zdY, zdW, zdH, skin);
      if (mask) {
        mctx.globalCompositeOperation = "destination-in";
        mctx.drawImage(mask, 0, 0, W, H);
        mctx.globalCompositeOperation = "source-over";
      }
      ctx.drawImage(mc, 0, 0);

      // Glow cinemático en el foreground (estilo CapCut bokeh):
      // version borrosa + brillante del sujeto en modo "screen" → los brillos
      // se expanden ligeramente y dan aureola/halación de lente de cine.
      const glowIntensity = (bokeh / 100) * 0.22;
      if (glowIntensity > 0) {
        const gc = new OffscreenCanvas(W, H);
        const gctx = gc.getContext("2d");
        gctx.filter = `blur(14px) brightness(1.7) saturate(1.25)`;
        gctx.drawImage(mc, 0, 0);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = glowIntensity;
        ctx.drawImage(gc, 0, 0);
        ctx.restore();
      }

    } else {
      if (vidFilter) { ctx.save(); ctx.filter = vidFilter; }
      ctx.drawImage(vid, zdX, zdY, zdW, zdH);
      if (vidFilter) ctx.restore();
      applySkinOverlay(ctx, vid, zdX, zdY, zdW, zdH, skin);
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
    if (segRef.current) { setEffects(e => ({ ...e, bokeh: 50 })); return; }
    setBokehLoading(true);
    try {
      const seg = await loadBokehSegmenter();
      seg.onResults(r => {
        maskRef.current = r.segmentationMask;
        if (maskCbRef.current) { maskCbRef.current(r.segmentationMask); maskCbRef.current = null; }
      });
      segRef.current = seg;
      setEffects(e => ({ ...e, bokeh: 50 }));
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

  // Ctrl+B: divide el segmento actual en la posición del playhead (como CapCut)
  const splitAtPlayhead = useCallback(() => {
    const native = effectiveToNative(keptSegs, effectiveTime);
    if (!native) return;
    const { clip, localTime } = native;
    const seg = keptSegs.find(s => s.clip.id === clip.id && localTime >= s.start && localTime <= s.end);
    if (!seg || localTime - seg.start < 0.06 || seg.end - localTime < 0.06) return;
    setClips(prev => prev.map(c => {
      if (c.id !== clip.id) return c;
      const newSilences = [...(c.silences || []), { id: uid(), start: localTime, end: localTime + 0.001, cut: true }]
        .sort((a, b) => a.start - b.start);
      return { ...c, silences: newSilences };
    }));
  }, [keptSegs, effectiveTime]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        splitAtPlayhead();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [splitAtPlayhead]);

  // Dimensiones de salida según formato seleccionado (dims = dimensiones nativas del video)
  const outDims = useMemo(() => {
    const { W: vW, H: vH } = dims;
    if (format === "portrait") return { W: Math.round(vH * 9 / 16), H: vH };
    if (format === "square")   return { W: Math.min(vW, vH), H: Math.min(vW, vH) };
    return { W: vW, H: vH };
  }, [format, dims]);

  // Slide: congela canvas actual y lo anima saliendo en la dirección indicada
  const animSlide = useCallback((dir, dur) => {
    const canvas = canvasRef.current;
    if (!canvas) return Promise.resolve();
    const ctx = canvas.getContext("2d");
    const { W, H } = outDims;
    return createImageBitmap(canvas).then(bitmap => new Promise(resolve => {
      const t0 = performance.now();
      const tick = () => {
        const t = Math.min(1, (performance.now() - t0) / 1000 / dur);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
        const ox = dir === "slideLeft" ? -W * ease : dir === "slideRight" ? W * ease : 0;
        const oy = dir === "slideUp"   ? -H * ease : dir === "slideDown"  ? H * ease : 0;
        ctx.drawImage(bitmap, ox, oy, W, H);
        if (t < 1) requestAnimationFrame(tick);
        else { bitmap.close(); resolve(); }
      };
      requestAnimationFrame(tick);
    }));
  }, [outDims]);
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
  const drawFrame = useCallback(async (clip, lt, et = 0) => {
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
          drawCards(ctx, W, H, et, cardsRef.current);
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
    await drawFrame(native.clip, native.localTime, clamped);
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
            setTranscribeMsg(`Descargando modelo Whisper... ${p}% (solo la primera vez)`);
          } else if (info.status === "loading") {
            setTranscribeMsg("Cargando modelo en memoria...");
          } else if (info.status === "ready") {
            setTranscribeMsg(`Transcribiendo clip ${i + 1}/${ready.length}...`);
          }
        });
        setClips(prev => prev.map(c => c.id === clip.id ? { ...c, segments, transcribed: true } : c));
      } catch (err) {
        setClips(prev => prev.map(c => c.id === clip.id
          ? { ...c, segments: [], transcribed: true, transcribeError: err?.message || "Error desconocido" } : c));
      }
    }
    setTranscribing(false);
    setTranscribeMsg("");
  }, [clips, setClips]);

  // Genera tarjetas automáticas con IA según el estilo elegido
  const runAutoCards = useCallback(async () => {
    autoCardTriedRef.current = true;
    setAutoCardState("working"); setAutoCardMsg("Comprobando tu sesión...");
    const token = await getAwsAuthToken();
    if (!token) { setAutoCardState("needsAuth"); setAutoCardMsg(""); return; }

    const ready = clips.filter(c => c.analyzed && !c.error);
    if (!ready.length) { autoCardTriedRef.current = false; setAutoCardState("idle"); return; }

    // Si el usuario está previsualizando, esperar a que pare antes de cargar Whisper en memoria
    if (playRef.current) {
      setAutoCardMsg("Previsualiza el video — generamos las tarjetas automáticamente cuando pares ⏸");
      await new Promise(resolve => {
        const id = setInterval(() => { if (!playRef.current) { clearInterval(id); resolve(); } }, 600);
      });
    }

    const generated = [];
    let colorStep = 0;
    for (const clip of ready) {
      let segments = clip.segments?.length ? clip.segments : null;
      if (!segments) {
        setAutoCardMsg(`Transcribiendo ${clip.name.slice(0, 30)}...`);
        try {
          segments = await transcribeClip(clip.file, clip.silences || [], info => {
            if (info.status === "downloading") setAutoCardMsg(`Descargando modelo Whisper... ${Math.round(info.progress || 0)}%`);
          });
          setClips(prev => prev.map(c => c.id === clip.id ? { ...c, segments, transcribed: true } : c));
        } catch { continue; }
      }
      if (!segments?.length) continue;

      setAutoCardMsg("Generando tarjetas con IA para tu estilo...");
      try {
        const res = await fetch(REELS_API, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            type: "generateCards",
            transcription: buildTimestampedTranscript(segments),
            duration: clip.duration || 0,
          }),
        });
        const data = await res.json();
        if (res.status === 429) {
          setAutoCardState("error");
          setAutoCardMsg(data.message || "Llegaste al límite de generaciones de tu plan este mes.");
          return;
        }
        for (const t of data.tarjetas || []) {
          const et = nativeToEffective(keptSegs, clip.id, t.startTime);
          if (et === null) continue;
          generated.push({
            id: uid(), text: t.texto, keyword: t.keyword || "",
            startTime: Math.round(et * 10) / 10,
            duration: style?.cardDuration || 3,
            colorIdx: style?.cardColorCycle?.[colorStep % style.cardColorCycle.length] ?? 0,
            font: style?.cardFont || "Poppins",
            position: style?.cardPosition || "bottom",
            animation: style?.cardAnimation || "slideUp",
          });
          colorStep++;
        }
      } catch (err) { console.error("[autoCards]", err.message); }
    }

    if (generated.length) {
      generated.sort((a, b) => a.startTime - b.startTime);
      setCards(generated);
      setAutoCardState("done");
      setAutoCardMsg(`✨ ${generated.length} tarjeta${generated.length !== 1 ? "s" : ""} generada${generated.length !== 1 ? "s" : ""} con tu estilo — revísalas antes de exportar.`);
    } else {
      setAutoCardState("error");
      setAutoCardMsg("No se pudieron generar tarjetas automáticas. Puedes crearlas manualmente.");
    }
  }, [clips, keptSegs, setClips, style]);

  useEffect(() => {
    if (!style?.autoCards || cards.length > 0 || autoCardTriedRef.current) return;
    if (clips.some(c => c.analyzed && !c.error)) runAutoCards();
  }, [style, clips, cards.length, runAutoCards]);

  // Dibujar primer frame cuando los segmentos están listos → evita canvas negro al abrir editor
  useEffect(() => {
    if (keptSegs.length > 0 && prevKeptLenRef.current === 0 && !isPlaying) {
      seekToEffective(0);
    }
    prevKeptLenRef.current = keptSegs.length;
  }, [keptSegs.length, isPlaying, seekToEffective]);

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

    // Posición desde la que reproducir (respeta scrubbing)
    const totalEt = keptSegs.reduce((s, seg) => s + seg.end - seg.start, 0);
    const startEt = effectiveTime >= totalEt ? 0 : effectiveTime;

    // Música de fondo en preview
    let musicEl = null;
    const mu = musicRef.current;
    if (mu?.url) {
      musicEl = new Audio(mu.url);
      musicEl.loop = mu.loop ?? true;
      musicEl.volume = mu.duck ? (mu.volume ?? 0.35) * 0.22 : (mu.volume ?? 0.35);
      if (startEt > 0 && musicEl.duration) musicEl.currentTime = startEt % musicEl.duration;
      musicEl.play().catch(() => {});
    }

    for (const clipId of uniqueClipIds) {
      if (!playRef.current) break;
      const clipSegs = keptSegs.filter(s => s.clip.id === clipId);
      const clip = clipSegs[0].clip;

      // Saltar clips que están completamente antes del punto de inicio
      const clipDur = clipSegs.reduce((sum, s) => sum + s.end - s.start, 0);
      if (etOffset + clipDur <= startEt) {
        etOffset += clipDur;
        continue;
      }

      await new Promise(resolve => {
        const vid = document.createElement("video");
        const url = URL.createObjectURL(clip.file);
        vid.src = url;
        vid.addEventListener("loadedmetadata", async () => {
          const vW = vid.videoWidth || dims.W, vH = vid.videoHeight || dims.H;
          const scale = Math.min(W / vW, H / vH);
          const dW = vW * scale, dH = vH * scale, dX = (W - dW) / 2, dY = (H - dH) / 2;
          let animId;
          let currentEt = etOffset;
          const draw = () => {
            const efx = effectsRef.current;
            if (efx.autoZoom) {
              zoomFactor.current = 1 + 0.07 * Math.abs(Math.sin(vid.currentTime * Math.PI / (efx.zoomInterval || 4)));
            }
            applyFrame(ctx, vid, dX, dY, dW, dH, W, H, false); // no-await, non-blocking
            drawSubtitle(ctx, W, H, vid.currentTime, clip.segments, subtitleStyle);
            drawCards(ctx, W, H, currentEt, cardsRef.current);
            animId = requestAnimationFrame(draw);
          };
          animId = requestAnimationFrame(draw);

          for (const seg of clipSegs) {
            if (!playRef.current) break;
            const segEtStart = etOffset;
            const segDur = seg.end - seg.start;

            // Saltar segmentos completamente antes del punto de inicio
            if (segEtStart + segDur <= startEt) {
              etOffset += segDur;
              continue;
            }

            // Si startEt cae dentro de este segmento, buscar ahí
            const skipInSeg = Math.max(0, startEt - segEtStart);
            vid.currentTime = seg.start + skipInSeg;
            await new Promise(r => { vid.onseeked = r; });
            if (!playRef.current) break;
            vid.playbackRate = 1;
            vid.play().catch(() => {});
            let prevEt = segEtStart + skipInSeg;
            await new Promise(segDone => {
              const tick = setInterval(() => {
                if (!playRef.current) { clearInterval(tick); vid.pause(); segDone(); return; }
                const ct = vid.currentTime;
                const newEt = segEtStart + Math.max(0, ct - seg.start);
                setEffectiveTime(newEt);
                currentEt = newEt;

                // Disparar SFX si alguno cae entre prevEt y newEt
                const sfxes = sfxRef.current;
                if (sfxes.length) {
                  for (const sfx of sfxes) {
                    if (sfx.time > prevEt && sfx.time <= newEt) {
                      if (!sfxActxRef.current) sfxActxRef.current = new AudioContext();
                      const a = sfxActxRef.current;
                      if (a.state === "suspended") a.resume();
                      synthSfx(sfx.type, a, null, a.currentTime);
                    }
                  }
                }
                prevEt = newEt;

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
            else if (transition.startsWith("slide")) await animSlide(transition, transitionSecs * 0.6);
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
        // slides: canvas ya está negro tras animSlide, el nuevo clip arranca directo
      }
    }

    if (musicEl) { musicEl.pause(); musicEl.src = ""; }
    if (playRef.current) { setDone(true); setEffectiveTime(totalKept); }
    setIsPlaying(false); playRef.current = false;
  }, [keptSegs, outDims, dims, subtitleStyle, totalKept, isPlaying, transcribing, animFade, startZoom, animSlide, effectiveTime]);

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
          <button className="sc-btn-primary sc-btn-sm" onClick={() => onExport(effects, clipTransitions, music, cards)}>✂️ Exportar</button>
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

        {/* Panel derecho con tabs: Subtítulos | Transiciones | Efectos */}
        <div className="sce-right-panel">
          <div className="sce-tab-bar">
            <button className={`sce-tab${tab === "subs"  ? " active" : ""}`} onClick={() => setTab("subs")}>💬 Subs</button>
            <button className={`sce-tab${tab === "music" ? " active" : ""}`} onClick={() => setTab("music")}>🎵 Música</button>
            <button className={`sce-tab${tab === "cards" ? " active" : ""}`} onClick={() => setTab("cards")}>🃏 Tarjetas</button>
            <button className={`sce-tab${tab === "sfx"   ? " active" : ""}`} onClick={() => setTab("sfx")}>🔊 SFX</button>
            <button className={`sce-tab${tab === "trans" ? " active" : ""}`} onClick={() => setTab("trans")}>✂️ Cortes</button>
            <button className={`sce-tab${tab === "fx"    ? " active" : ""}`} onClick={() => setTab("fx")}>✨ Efectos</button>
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
            : tab === "music"
            ? <MusicPanel music={music} onMusicChange={setMusic} />
            : tab === "cards"
            ? <>
                {style?.autoCards && autoCardState !== "idle" && (
                  <div className={`sce-autocards-banner sce-autocards-banner--${autoCardState}`}>
                    {autoCardState === "working" && <><span className="sce-autocards-spinner" />{autoCardMsg}</>}
                    {autoCardState === "done" && <span>{autoCardMsg}</span>}
                    {autoCardState === "error" && <span>{autoCardMsg}</span>}
                    {autoCardState === "needsAuth" && (
                      <span>
                        ✨ Tu estilo incluye tarjetas automáticas con IA — inicia sesión para generarlas.{" "}
                        <a href="/" target="_blank" rel="noopener noreferrer">Iniciar sesión →</a>
                        {" · "}
                        <button className="sce-autocards-retry" onClick={() => { autoCardTriedRef.current = false; runAutoCards(); }}>Ya inicié sesión, reintentar</button>
                      </span>
                    )}
                  </div>
                )}
                <CardsPanel cards={cards} onCardsChange={setCards} currentTime={effectiveTime} />
              </>
            : tab === "sfx"
            ? <SfxPanel
                sfxList={sfxList}
                onSfxChange={setSfxList}
                currentTime={effectiveTime}
                onPreview={(type) => {
                  if (!sfxActxRef.current) sfxActxRef.current = new AudioContext();
                  const a = sfxActxRef.current;
                  if (a.state === "suspended") a.resume();
                  synthSfx(type, a, null, a.currentTime + 0.05);
                }}
              />
            : tab === "trans"
            ? <TransitionsPanel effects={effects} onEffectChange={setEffects} />
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
        onCutSeg={onCutSeg}
        clipTransitions={clipTransitions}
        onSetClipTransition={(clipId, type) => setClipTransitions(p => ({ ...p, [clipId]: type }))}
        activePreset={effects._preset}
        defaultTransition={effects.transition}
        music={music}
        sfxList={sfxList}
        onSfxChange={setSfxList}
        cards={cards}
        onCardsChange={setCards}
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
          if (info.status === "downloading")
            setMsg(`Descargando modelo Whisper... ${Math.round(info.progress || 0)}%`);
        });
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
      // Clamp timestamps to clip duration
      const dur = clip.duration || Infinity;
      setFragments(data.fragmentos.map(f => ({
        ...f,
        inicio: Math.max(0, Math.min(f.inicio, dur - 5)),
        fin:    Math.max(f.inicio + 5, Math.min(f.fin, dur)),
      })));
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

// ── Selector de estilo (pantalla previa a subir el video) ─────────────────
function StylePickerScreen({ onSelect }) {
  return (
    <div className="sc-page">
      <nav className="sc-nav"><Logo width={110} /><a href="/" className="sc-nav-link">Ir a la app →</a></nav>
      <div className="sce-style-wrap">
        <h1 className="sc-editor-title">¿Qué estilo quieres para tu video?</h1>
        <p className="sc-editor-sub">Elige un estilo y el editor lo aplicará automáticamente a tu clip. Puedes ajustar todo después.</p>
        <div className="sce-style-grid">
          {STYLE_TEMPLATES.map(tmpl => (
            <button key={tmpl.id} className="sce-style-card" onClick={() => onSelect(tmpl)}>
              <span className="sce-style-emoji">{tmpl.emoji}</span>
              <span className="sce-style-label">{tmpl.label}</span>
              <span className="sce-style-desc">{tmpl.desc}</span>
              {tmpl.autoCards && <span className="sce-style-badge">✨ Requiere cuenta (IA)</span>}
            </button>
          ))}
        </div>
      </div>
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
  const [selectedStyle, setSelectedStyle] = useState(null);
  const chooseStyle = useCallback((tmpl) => {
    setSelectedStyle(tmpl);
    if (tmpl.format) setFormat(tmpl.format);
  }, []);
  const [sensitivity, setSensitivity] = useState("conservadora");
  const inputRef = useRef(null);
  const abortRef = useRef(false);
  const { noise: noiseDb, duration: minDur } = PRESETS[sensitivity];

  const analyzingRef = useRef(false);

  const analizarClips = useCallback(async (toAnalyze) => {
    if (analyzingRef.current || !toAnalyze.length) return;
    analyzingRef.current = true;
    setFase("analyzing"); setError("");
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
        setClips(prev => prev.map(c => c.id === clip.id ? { ...c, analyzed: true, error: "No se pudo analizar el audio" } : c));
      }
    }
    setFase("editor");
    analyzingRef.current = false;
  }, [noiseDb, minDur]);

  const analizarTodos = useCallback(() =>
    analizarClips(clips.filter(c => !c.analyzed)), [clips, analizarClips]);

  const reanalizar = useCallback((newSensitivity) => {
    setSensitivity(newSensitivity);
    const reset = clips.map(c => ({ ...c, analyzed: false, silences: [], waveform: null }));
    setClips(reset);
    analizarClips(reset);
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

  const exportar = async (effects = {}, clipTransitions = {}, music = {}, cards = []) => {
    const ready = clips.filter(c => c.analyzed && !c.error);
    if (!ready.length) { setError("Analiza los clips primero."); return; }
    abortRef.current = false;
    setFase("cutting"); setProgress(0); setError("");
    try {
      const blob = await recordAllClips(ready, (p, msg) => { setProgress(Math.round(p * 100)); setProgressMsg(msg); }, abortRef, subtitleStyle, format, effects, clipTransitions, music, cards, sfxList);
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
      onExtractReels={() => setShowReels(true)}
      sensitivity={sensitivity} onReanalyze={reanalizar}
      onCutSeg={cutSeg} style={selectedStyle} />
  );

  // Selector de estilo — antes de subir el primer video
  if (fase === "editor" && clips.length === 0 && !selectedStyle) {
    return <StylePickerScreen onSelect={chooseStyle} />;
  }

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
          {selectedStyle && selectedStyle.id !== "none" ? (
            <button className="sc-badge sc-badge--style" onClick={() => setSelectedStyle(null)} title="Cambiar estilo">
              {selectedStyle.emoji} {selectedStyle.label} · cambiar
            </button>
          ) : (
            <span className="sc-badge">Herramienta gratuita · En tu dispositivo</span>
          )}
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
