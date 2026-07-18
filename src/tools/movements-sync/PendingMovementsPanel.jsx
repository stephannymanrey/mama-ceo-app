import { useState, useEffect } from "react";
import { getMyAddress, listPending, resolvePending } from "./api";
import "./PendingMovementsPanel.css";

/**
 * Bandeja de movimientos detectados por correo, pendientes de confirmar.
 * Sigue el contrato de src/tools/README.md: no toca localStorage ni el
 * guardado general — recibe onConfirmToHome/onConfirmToBusiness de App.jsx
 * para que la creación del movimiento real reuse la forma de datos que ya
 * usan homeBudget/movements.
 *
 * Diseñada para incrustarse dentro de una pantalla existente (Mis Finanzas),
 * no es una vista de página completa como InvoicingTool.
 */
export default function PendingMovementsPanel({ money, currency, onConfirmToHome, onConfirmToBusiness }) {
  const [address, setAddress] = useState("");
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resolving, setResolving] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    const [addrRes, pendingRes] = await Promise.all([getMyAddress(), listPending()]);
    if (addrRes.error || pendingRes.error) setError(addrRes.error || pendingRes.error);
    else {
      setAddress(addrRes.address || "");
      setPending(pendingRes.pending || []);
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial al montar
  useEffect(() => { load(); }, []);

  const copyAddress = async () => {
    try { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* clipboard no disponible, no es crítico */ }
  };

  const resolve = async (item, destination) => {
    setResolving(item.item_id);
    // onConfirmTo* puede devolver false si el plan de la usuaria bloqueó la
    // creación (ej. límite de movimientos) — en ese caso lo dejamos en la
    // bandeja para que lo intente de nuevo, no lo marcamos como resuelto.
    let created = true;
    if (destination === "home") created = onConfirmToHome?.(item) !== false;
    else if (destination === "business") created = onConfirmToBusiness?.(item) !== false;
    if (!created) { setResolving(null); return; }
    const res = await resolvePending(item.item_id, destination !== "discard");
    setResolving(null);
    if (res.error) { setError(res.error); return; }
    setPending((prev) => prev.filter((p) => p.item_id !== item.item_id));
  };

  const fmt = (n) => (money ? money.format(n) : `${currency} ${Number(n || 0).toFixed(2)}`);

  if (loading) return null; // no ocupar espacio mientras carga, no es una pantalla principal

  return (
    <div className="pms-panel">
      <div className="pms-head">
        <p className="pms-title">📧 Movimientos por correo {pending.length > 0 && <span className="pms-count">{pending.length}</span>}</p>
        <button type="button" className="pms-config-btn" onClick={() => setShowInstructions((v) => !v)}>
          {showInstructions ? "Ocultar" : "Configurar"}
        </button>
      </div>

      {error && <p className="pms-error">{error}</p>}

      {showInstructions && (
        <div className="pms-instructions">
          <p>Reenvía las notificaciones de tu banco a esta dirección — nosotros nunca accedemos a tu correo, tú decides qué reenviar:</p>
          <div className="pms-address-row">
            <code className="pms-address">{address}</code>
            <button type="button" onClick={copyAddress}>{copied ? "✓ Copiado" : "Copiar"}</button>
          </div>
          <p className="pms-hint">
            En Gmail: Configuración → Ver todos los ajustes → Filtros y direcciones bloqueadas → Crear un filtro
            (De: el correo de notificaciones de tu banco) → Reenviar a → agrega esta dirección.
            Los movimientos detectados aparecerán aquí para que los confirmes con un toque — nunca se agregan solos.
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="pms-list">
          {pending.map((item) => (
            <div key={item.item_id} className="pms-item">
              <div className="pms-item-info">
                <span className={`pms-badge pms-badge--${item.type}`}>{item.type === "income" ? "Ingreso" : "Gasto"}</span>
                <span className="pms-item-amount">{fmt(item.amount)}</span>
                <span className="pms-item-desc">{item.description}</span>
                {item.date && <span className="pms-item-date">{item.date}</span>}
              </div>
              {item.fromAddress && <p className="pms-item-source">de {item.fromAddress}</p>}
              <div className="pms-item-actions">
                <button type="button" disabled={resolving === item.item_id} onClick={() => resolve(item, "home")}>Agregar a Hogar</button>
                <button type="button" disabled={resolving === item.item_id} onClick={() => resolve(item, "business")}>Agregar a Negocio</button>
                <button type="button" className="pms-discard" disabled={resolving === item.item_id} onClick={() => resolve(item, "discard")}>Descartar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
