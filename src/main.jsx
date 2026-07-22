import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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
  '/plan-de-negocio': PlanBuilder,
  '/studio': StudioStandalone,
  '/facturas': InvoicingStandalone,
};

const StandaloneComponent = STANDALONE_ROUTES[window.location.pathname];
const RootComponent = StandaloneComponent || App;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>,
)
