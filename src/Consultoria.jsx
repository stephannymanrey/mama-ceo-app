import { useEffect } from "react";
import Logo from "./Logo";
import "./Consultoria.css";

const CALENDLY_URL = "https://calendly.com/stephannyconsulta/negocios";
const WHATSAPP_URL = "https://wa.me/573181751966?text=Hola%21+Tengo+una+pregunta+antes+de+agendar+mi+asesor%C3%ADa+de+Mam%C3%A1+CEO+App";

/**
 * Página pública para agendar la asesoría de configuración de Mamá CEO App
 * (/consultoria). Se comparte como link directo, fuera del flujo normal de
 * la app — no requiere sesión iniciada.
 */
export default function Consultoria() {
  useEffect(() => {
    if (document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]')) return;
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div className="cons-wrap">
      <header className="cons-top">
        <a href="/" className="cons-logo-link"><Logo width={150} /></a>
      </header>
      <main className="cons-main">
        <div className="cons-intro">
          <span className="cons-badge">Asesoría personalizada</span>
          <h1>Agenda tu asesoría para configurar Mamá CEO App</h1>
          <p>
            Te acompaño a dejar tu cuenta lista para tu negocio: organizar tus clientas, tus
            finanzas y tu contenido desde el primer día. Elige el horario que mejor te funcione.
          </p>
        </div>
        <div className="cons-calendly-card">
          <div
            className="calendly-inline-widget"
            data-url={CALENDLY_URL}
            style={{ minWidth: 320, height: 700 }}
          ></div>
        </div>
        <div className="cons-support">
          <p>¿Tienes una pregunta antes de agendar?</p>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="cons-wa-btn">
            💬 Escríbenos por WhatsApp
          </a>
        </div>
      </main>
    </div>
  );
}
