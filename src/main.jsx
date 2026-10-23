import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('Error de render capturado por ErrorBoundary:', error, info);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '32px', fontFamily: 'Inter, ui-sans-serif, sans-serif',
        background: '#FFF8F6', color: '#1A1A1A',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>😮‍💨</div>
        <h1 style={{ fontSize: '20px', marginBottom: '8px' }}>Algo falló al mostrar la app</h1>
        <p style={{ fontSize: '15px', color: '#555', maxWidth: '360px', marginBottom: '20px' }}>
          Tus datos guardados están a salvo. Solo necesitamos recargar la página para que vuelva a funcionar.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#D4687A', color: '#fff', border: 'none',
            borderRadius: '10px', padding: '12px 24px', cursor: 'pointer',
            fontSize: '15px', fontWeight: 700, fontFamily: 'inherit',
          }}
        >
          Recargar la app
        </button>
      </div>
    );
  }
}

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
    <ErrorBoundary>
      <App />
      <UpdatePrompt />
    </ErrorBoundary>
  </StrictMode>,
)
