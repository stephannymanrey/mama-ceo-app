import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './index.css'
import App from './App.jsx'
import PlanBuilder from './PlanBuilder.jsx'
import SilenceCutter from './SilenceCutter.jsx'
import StudioStandalone from './tools/studio/StudioStandalone.jsx'
import InvoicingStandalone from './tools/invoicing/InvoicingStandalone.jsx'

// Las herramientas independientes se resuelven ACÁ, antes de montar App().
// App() carga y guarda TODO el estado de negocio/hogar de la usuaria (ver
// el useEffect de guardado en App.jsx) — si estas rutas montaran App() por
// debajo solo para mostrar otra cosa encima, cada visita dispararía sin
// necesidad esa maquinaria de carga/guardado completa, con el riesgo de
// pisar datos reales si algo sale mal en el timing. Cada herramienta de acá
// maneja su propia autenticación y guarda/lee solo lo suyo (ver
// src/lib/userDataClient.js) — nunca el estado completo del dashboard.
const STANDALONE_ROUTES = {
  '/editor': SilenceCutter,
  // "/businessplan" es la URL nueva para los lead magnets; "/plan-de-negocio"
  // se mantiene como alias por si ya quedó compartida en algún lado.
  '/businessplan': PlanBuilder,
  '/plan-de-negocio': PlanBuilder,
  '/studio': StudioStandalone,
  '/facturas': InvoicingStandalone,
};

const StandaloneComponent = STANDALONE_ROUTES[window.location.pathname];
const RootComponent = StandaloneComponent || App;

function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // check for updates every 30 minutes while app is open
      r && setInterval(() => r.update(), 30 * 60 * 1000);
    },
  });
  if (!needRefresh) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      background: '#1A1A1A', color: '#fff', borderRadius: '14px',
      padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)', zIndex: 99999,
      fontFamily: 'Inter, ui-sans-serif, sans-serif', fontSize: '14px', whiteSpace: 'nowrap',
    }}>
      <span>✨ Hay una nueva versión</span>
      <button onClick={() => updateServiceWorker(true)} style={{
        background: '#D4687A', color: '#fff', border: 'none',
        borderRadius: '8px', padding: '8px 16px', cursor: 'pointer',
        fontSize: '13px', fontWeight: 700, fontFamily: 'inherit',
      }}>Actualizar</button>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootComponent />
    <UpdatePrompt />
  </StrictMode>,
)
