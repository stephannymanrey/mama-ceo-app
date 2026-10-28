import { useState, useRef, useEffect } from "react";
import Landing from "./Landing";
import { trackEvent } from "./analytics";
import "./ClaseVSL.css";

const API_URL = "https://lq3avrfazlfuyaakkt5iwz54ym0aqxvv.lambda-url.us-east-1.on.aws/";
const YT_VIDEO_ID = "GpUXT5VfTk8";
const WHATSAPP_URL = "https://wa.me/573181751966?text=Hola%21+Tengo+una+duda+sobre+la+clase+gratuita";

export default function ClaseVSL({ onLogin, onTerminos, onPrivacidad, prices, hotmartLinks, hotmartLinksYear }) {
  const [step, setStep] = useState("form"); // "form" | "video"
  const [videoEnded, setVideoEnded] = useState(false);
  const [pipClosed, setPipClosed] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const playerHostRef = useRef(null);
  const playerRef = useRef(null);

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

    const createPlayer = () => {
      if (cancelled || !playerHostRef.current || playerRef.current) return;
      playerRef.current = new window.YT.Player(playerHostRef.current, {
        videoId: YT_VIDEO_ID,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          fs: 0,
          iv_load_policy: 3,
        },
        events: {
          onStateChange: (ev) => {
            if (ev.data === window.YT.PlayerState.ENDED) {
              trackEvent("clase_video_ended");
              setVideoEnded(true);
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      if (!document.getElementById("yt-iframe-api")) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevCallback?.();
        createPlayer();
      };
    }

    return () => { cancelled = true; };
  }, [step]);

  return (
    <div className="clase-page">
      {step === "form" && (
        <div className="clase-gate">
          <p className="clase-eyebrow">Clase gratuita</p>
          <h1 className="clase-title">Cómo organizarte siendo mamá y emprendedora</h1>
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
          {!pipClosed && (
            <div className={`clase-video-wrap${videoEnded ? " clase-video-wrap--pip" : ""}`}>
              <div className="clase-video-inner">
                <div ref={playerHostRef} className="clase-video-el" />
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
