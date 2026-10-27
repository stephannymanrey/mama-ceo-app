import Logo from "./Logo";
import "./ThankYou.css";

const PLAN_NAMES = { mama: "Mamá", emprendedora: "Emprendedora", ceo: "CEO" };
const WHATSAPP_URL = "https://wa.me/573181751966?text=Hola%21+Acabo+de+comprar+Mam%C3%A1+CEO+App+y+necesito+ayuda+para+activar+mi+cuenta";

/**
 * Página de agradecimiento post-compra (Hotmart redirige aquí). Vive como
 * ruta pública, igual que /businessplan o /editor — se abre sin sesión
 * iniciada. El botón de "Crear mi cuenta" entra al flujo normal de registro
 * de App.jsx vía onCreateAccount; la activación del plan es automática
 * (check-pending-hotmart) en cuanto inicia sesión con el mismo correo del
 * pago — no depende de nada de esta página.
 */
export default function ThankYou({ isLoggedIn, onCreateAccount, onLogin, onGoToApp }) {
  const params = new URLSearchParams(window.location.search);
  const planName = PLAN_NAMES[params.get("plan")] || null;

  return (
    <div className="ty-wrap">
      <div className="ty-card">
        <Logo width={150} />
        <p className="ty-emoji">🎉</p>
        <h1 className="ty-title">¡Gracias por tu compra!</h1>
        <p className="ty-sub">
          {planName ? `Tu plan ${planName} está confirmado.` : "Tu compra quedó confirmada."}{" "}
          {isLoggedIn ? "Ya puedes seguir usando Mamá CEO App." : "Solo falta un paso para empezar a usar Mamá CEO App."}
        </p>

        {isLoggedIn ? (
          <p className="ty-sub" style={{ marginBottom: 28 }}>
            Como ya tienes sesión iniciada, tu plan {planName || "nuevo"} debería estar activo — si acabas de pagar, puede tardar unos segundos. Si no se ve activo, cierra sesión y vuelve a entrar.
          </p>
        ) : (
          <div className="ty-steps">
            <div className="ty-step ty-step--done">
              <span className="ty-step-num">✓</span>
              <div>
                <strong>Ya pagaste</strong>
                <p>Tu compra quedó registrada con éxito.</p>
              </div>
            </div>
            <div className="ty-step">
              <span className="ty-step-num">2</span>
              <div>
                <strong>Crea tu cuenta</strong>
                <p>Usa el <u>mismo correo</u> con el que acabas de comprar — es muy importante para que tu plan se active solo.</p>
              </div>
            </div>
            <div className="ty-step">
              <span className="ty-step-num">3</span>
              <div>
                <strong>Listo, a organizarte</strong>
                <p>Apenas inicies sesión, tu plan {planName || "pagado"} queda activo automáticamente — sin pasos extra.</p>
              </div>
            </div>
          </div>
        )}

        {isLoggedIn ? (
          <button type="button" className="ty-cta" onClick={onGoToApp}>Ir a mi app →</button>
        ) : (
          <>
            <button type="button" className="ty-cta" onClick={onCreateAccount}>Crear mi cuenta →</button>
            <button type="button" className="ty-login-link" onClick={onLogin}>Ya tengo cuenta, iniciar sesión</button>
          </>
        )}

        <div className="ty-support">
          <p>¿Tuviste algún problema con el pago o no te queda claro algo?</p>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="ty-wa-btn">💬 Escríbenos por WhatsApp</a>
        </div>
      </div>
    </div>
  );
}
