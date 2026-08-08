import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './index.css'
import App from './App.jsx'

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
    <App />
    <UpdatePrompt />
  </StrictMode>,
)
