import { useState, useRef, useEffect } from "react";
import Landing from "./Landing";
import { trackEvent } from "./analytics";
import "./ClaseVSL.css";

const API_URL = "https://lq3avrfazlfuyaakkt5iwz54ym0aqxvv.lambda-url.us-east-1.on.aws/";
const BUNNY_LIBRARY_ID = "689817";
const BUNNY_VIDEO_ID = "8e495465-8857-4b53-9927-eb7920c3c627";
const BUNNY_EMBED_URL = `https://player.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${BUNNY_VIDEO_ID}?autoplay=true&muted=false&loop=false&preload=true`;
const WHATSAPP_URL = "https://wa.me/573181751966?text=Hola%21+Tengo+una+duda+sobre+la+clase+gratuita";

export default function ClaseVSL({ onLogin, onTerminos, onPrivacidad, prices, hotmartLinks, hotmartLinksYear, startAtVideo = false }) {
  const [step, setStep] = useState(startAtVideo ? "video" : "form"); // "form" | "video"
  const [videoEnded, setVideoEnded] = useState(false);
  const [pipClosed, setPipClosed] = useState(false);
  const [showPlayer, setShowPlayer] = useState(true);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const playerHostRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Mi sistema diario para organizar hogar, hijos y negocio | Una mamá con propósito";
    return () => { document.title = prevTitle; };
  }, []);

  const submitForm = async (e) => {
    e.preventDefault();
    const emailClean = email.trim().toLowerCase();
    if (!nombre.trim()) { setError("Escribe tu nombre."); return; }
    if (!emailClean || !emailClean.includes("@")) { setError("Ingresa un correo válido."); return; }
    setError("");
    setSending(true);
    trackEvent("clase_lead_submit");
    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "captureLead", email: emailClean, nombre: nombre.trim() }),
      });
    } catch {
      // No bloquea el acceso a la clase si falla el registro en Brevo.
    }
    setSending(false);
    setStep("video");
  };

  useEffect(() => {
    if (step !== "video") return;
    let cancelled = false;

    const finishVideo = () => {
      setShowPlayer(false);
      trackEvent("clase_video_ended");
      setVideoEnded(true);
    };

    const attachPlayer = () => {
      if (cancelled || !playerHostRef.current || playerRef.current) return;
      const player = new window.playerjs.Player(playerHostRef.current);
      playerRef.current = player;
      player.on("ready", () => {
        player.on("ended", finishVideo);
      });
    };

    if (window.playerjs) {
      attachPlayer();
    } else {
      const existing = document.getElementById("bunny-playerjs");
      if (existing) {
        existing.addEventListener("load", attachPlayer, { once: true });
      } else {
        const tag = document.createElement("script");
        tag.id = "bunny-playerjs";
        tag.src = "https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js";
        tag.onload = attachPlayer;
        document.head.appendChild(tag);
      }
    }

    return () => {
      cancelled = true;
      playerRef.current = null;
    };
  }, [step]);

  return (
    <div className="clase-page">
      {step === "form" && (
        <div className="clase-gate">
          <img src="/stephanny.png" alt="Stephanny" className="clase-photo" />
          <p className="clase-eyebrow">Una mamá con propósito</p>
          <h1 className="clase-title">Mi sistema diario para organizar hogar, hijos y negocio</h1>
          <p className="clase-sub">Regístrate con tu correo y la ves ahora mismo, sin costo.</p>
          <form className="clase-form" onSubmit={submitForm}>
            <input
              type="text"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="clase-input"
            />
            <input
              type="email"
              placeholder="Tu correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="clase-input"
            />
            {error && <p className="clase-error">{error}</p>}
            <button type="submit" className="clase-cta" disabled={sending}>
              {sending ? "Un momento..." : "Ver la clase gratis →"}
            </button>
          </form>
          <p className="clase-privacy">No spam, solo te aviso sobre esta clase.</p>
          <div className="clase-legal-footer">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">¿Dudas? Escríbenos por WhatsApp</a>
            <span className="clase-legal-sep">·</span>
            <button type="button" onClick={onTerminos}>Términos y Condiciones</button>
            <span className="clase-legal-sep">·</span>
            <button type="button" onClick={onPrivacidad}>Política de Privacidad</button>
          </div>
        </div>
      )}

      {step === "video" && (
        <>
          <div className={`clase-backdrop${videoEnded ? " clase-backdrop--hidden" : ""}`} />
          {!videoEnded && (
            <p className="clase-backdrop-msg">✨ Esta clase te va a cambiar la vida — dura solo 5 minutos</p>
          )}
          {!pipClosed && (
            <div className={`clase-video-wrap${videoEnded ? " clase-video-wrap--pip" : ""}`}>
              <div className="clase-video-inner">
                {showPlayer ? (
                  <iframe
                    ref={playerHostRef}
                    src={BUNNY_EMBED_URL}
                    className="clase-video-el"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    title="Clase: Mi sistema diario para organizar hogar, hijos y negocio"
                  />
                ) : (
                  <div className="clase-video-done">
                    <span className="clase-video-done-icon">✓</span>
                    <span>Clase completada</span>
                  </div>
                )}
              </div>
              {videoEnded && (
                <button
                  type="button"
                  className="clase-video-close"
                  onClick={() => setPipClosed(true)}
                  aria-label="Cerrar video"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {videoEnded && (
            <div className="clase-sales-reveal">
              <Landing
                onLogin={onLogin}
                onTerminos={onTerminos}
                onPrivacidad={onPrivacidad}
                prices={prices}
                hotmartLinks={hotmartLinks}
                hotmartLinksYear={hotmartLinksYear}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
