import { useState, useEffect, useMemo } from "react";
import { listDocuments, createDocument, deleteDocument, getSettings, saveSettings } from "./api";
import "./InvoicingTool.css";

const EMPTY_ITEM = { description: "", quantity: 1, unitPrice: "" };

function blankForm() {
  return {
    clientId: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    issueDate: new Date().toISOString().slice(0, 10),
    notes: "",
    items: [],
  };
}

function resizeImage(file, size = 320) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, size / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png", 0.9));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Cotizaciones — sube logo, define tu catálogo de servicios/productos una vez,
 * y arma cada cotización en menos de 2 minutos eligiendo de ese catálogo.
 * Sigue el contrato de src/tools/README.md: estado propio, habla con su
 * propia Lambda (mamaceo-invoicing) vía api.js.
 */
export default function InvoicingTool({ onBack, clients = [], currency = "USD", money, profileSetup }) {
  const [documents, setDocuments] = useState([]);
  const [settings, setSettings] = useState({ logo: "", catalog: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [setupSaving, setSetupSaving] = useState(false);
  const [logoDraft, setLogoDraft] = useState("");
  const [catalogDraft, setCatalogDraft] = useState([{ name: "", price: "" }]);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    const [docsRes, settingsRes] = await Promise.all([listDocuments(), getSettings()]);
    if (docsRes.error) setError(docsRes.error);
    else setDocuments(docsRes.documents || []);
    if (!settingsRes.error) {
      const s = settingsRes.settings || { logo: "", catalog: [] };
      setSettings(s);
      if (!s.logo && (!s.catalog || s.catalog.length === 0)) {
        setLogoDraft("");
        setCatalogDraft([{ name: "", price: "" }]);
        setShowSetup(true);
        setSetupStep(1);
      }
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar, patrón estándar de fetch-on-mount
  useEffect(() => { load(); }, []);

  const fmt = (n) => (money ? money.format(n) : `${currency} ${Number(n || 0).toFixed(2)}`);

  // ── Configuración: logo + catálogo ──────────────────────────────────────
  const openSetup = () => {
    setLogoDraft(settings.logo || "");
    setCatalogDraft(settings.catalog?.length ? settings.catalog.map((c) => ({ ...c })) : [{ name: "", price: "" }]);
    setSetupStep(1);
    setShowSetup(true);
  };

  const handleLogoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Selecciona un archivo de imagen."); return; }
    try {
      setLogoDraft(await resizeImage(file));
    } catch {
      setError("No se pudo leer esa imagen. Intenta con otra.");
    }
  };

  const updateCatalogDraft = (idx, field, value) =>
    setCatalogDraft((c) => c.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  const addCatalogRow = () => setCatalogDraft((c) => [...c, { name: "", price: "" }]);
  const removeCatalogRow = (idx) => setCatalogDraft((c) => (c.length > 1 ? c.filter((_, i) => i !== idx) : c));

  const finishSetup = async () => {
    setSetupSaving(true);
    setError("");
    const catalog = catalogDraft
      .filter((c) => c.name.trim())
      .map((c, i) => ({ id: `cat-${Date.now()}-${i}`, name: c.name.trim(), price: Number(c.price) || 0 }));
    const res = await saveSettings({ logo: logoDraft, catalog });
    setSetupSaving(false);
    if (res.error) { setError(res.error); return; }
    setSettings(res.settings);
    setShowSetup(false);
  };

  // ── Asistente de nueva cotización ───────────────────────────────────────
  const openWizard = () => {
    setForm(blankForm());
    setWizardStep(1);
    setError("");
    setShowWizard(true);
  };

  const pickClient = (id) => {
    const c = clients.find((cl) => String(cl.id) === String(id));
    setForm((f) => ({ ...f, clientId: id, clientName: c ? c.name : f.clientName, clientPhone: c?.phone || f.clientPhone }));
  };

  const addFromCatalog = (catItem) => {
    setForm((f) => ({ ...f, items: [...f.items, { description: catItem.name, quantity: 1, unitPrice: catItem.price }] }));
  };
  const addCustomItem = () => setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const updateItem = (idx, field, value) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)) }));
  const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const formTotal = useMemo(
    () => form.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0),
    [form.items]
  );

  const canGoStep2 = form.clientName.trim().length > 0;
  const canGoStep3 = form.items.some((it) => it.description.trim() && Number(it.quantity) > 0);

  const submitQuote = async () => {
    const items = form.items
      .filter((it) => it.description.trim() && Number(it.quantity) > 0)
      .map((it) => ({ description: it.description.trim(), quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) || 0 }));
    if (!items.length) { setError("Agrega al menos un ítem."); return; }
    setSaving(true);
    setError("");
    const res = await createDocument({ type: "quote", ...form, items, currency });
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    setShowWizard(false);
    setDocuments((prev) => [res.document, ...prev]);
    setViewingDoc(res.document); // va directo a la vista de descarga — menos clics, más rápido
  };

  const remove = async (doc) => {
    if (!window.confirm(`¿Eliminar ${doc.number}? No se puede deshacer.`)) return;
    const res = await deleteDocument(doc.doc_id);
    if (res.error) { setError(res.error); return; }
    setDocuments((prev) => prev.filter((d) => d.doc_id !== doc.doc_id));
  };

  if (viewingDoc) {
    return <DocumentPrintView doc={viewingDoc} logo={settings.logo} profileSetup={profileSetup} money={money} currency={currency} onClose={() => setViewingDoc(null)} />;
  }

  return (
    <div className="inv-tool">
      <div className="inv-header">
        <div>
          <button type="button" className="inv-back" onClick={onBack}>← Volver</button>
          <h2 className="inv-title">✦ Cotizaciones</h2>
        </div>
        <div className="inv-header-actions">
          <button type="button" className="inv-btn inv-btn--ghost" onClick={openSetup}>
            {settings.logo ? <img src={settings.logo} alt="" className="inv-logo-mini" /> : "⚙️"} Mi negocio
          </button>
          <button type="button" className="inv-btn inv-btn--primary" onClick={openWizard}>+ Nueva cotización</button>
        </div>
      </div>

      {error && <p className="inv-error" role="alert">{error}</p>}

      {loading ? (
        <p className="inv-empty">Cargando...</p>
      ) : documents.length === 0 ? (
        <div className="inv-empty-state">
          <p className="inv-empty-icon">🧾</p>
          <p className="inv-empty">Aún no tienes cotizaciones. Crea la primera — te toma menos de 2 minutos.</p>
          <button type="button" className="inv-btn inv-btn--primary" style={{ marginTop: 12 }} onClick={openWizard}>+ Nueva cotización</button>
        </div>
      ) : (
        <div className="inv-list">
          {documents.map((doc) => (
            <div key={doc.doc_id} className="inv-card">
              <div className="inv-card-top">
                <span className="inv-card-number">{doc.number}</span>
              </div>
              <p className="inv-card-client">{doc.clientName}</p>
              <p className="inv-card-meta">{doc.issueDate}</p>
              <p className="inv-card-total">{fmt(doc.total)}</p>
              <div className="inv-card-actions">
                <button type="button" onClick={() => setViewingDoc(doc)}>Ver / PDF</button>
                <button type="button" className="inv-card-del" onClick={() => remove(doc)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Configuración: logo + catálogo ── */}
      {showSetup && (
        <div className="inv-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowSetup(false)}>
          <div className="inv-modal">
            <div className="inv-modal-head">
              <p>Tu negocio ({setupStep}/2)</p>
              <button type="button" onClick={() => setShowSetup(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="inv-form">
              {error && <p className="inv-error" role="alert">{error}</p>}

              {setupStep === 1 && (
                <>
                  <p className="inv-setup-hint">Este logo aparece en todas tus cotizaciones en PDF. Puedes saltarte este paso y agregarlo después.</p>
                  <label className="inv-logo-upload">
                    {logoDraft ? <img src={logoDraft} alt="Tu logo" /> : <span className="inv-logo-placeholder">📷<br />Subir logo</span>}
                    <input type="file" accept="image/*" onChange={handleLogoFile} style={{ display: "none" }} />
                  </label>
                  {logoDraft && <button type="button" className="inv-btn inv-btn--ghost" onClick={() => setLogoDraft("")} style={{ alignSelf: "center" }}>Quitar logo</button>}
                  <div className="inv-form-actions">
                    <button type="button" className="inv-btn inv-btn--primary" onClick={() => setSetupStep(2)}>Siguiente →</button>
                  </div>
                </>
              )}

              {setupStep === 2 && (
                <>
                  <p className="inv-setup-hint">Agrega los servicios o productos que más cotizas, con su precio. Así, al armar una cotización, solo tocas y listo — no vuelves a escribirlo.</p>
                  <div className="inv-items">
                    {catalogDraft.map((it, idx) => (
                      <div key={idx} className="inv-catalog-row">
                        <input className="inv-input" placeholder="Ej: Sesión de mentoría 1:1" value={it.name}
                          onChange={(e) => updateCatalogDraft(idx, "name", e.target.value)} />
                        <input className="inv-input inv-input--num" type="number" min="0" step="0.01" placeholder="Precio" value={it.price}
                          onChange={(e) => updateCatalogDraft(idx, "price", e.target.value)} />
                        <button type="button" className="inv-item-del" onClick={() => removeCatalogRow(idx)} aria-label="Quitar">×</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="inv-btn inv-btn--ghost inv-add-item" onClick={addCatalogRow}>+ Agregar otro</button>
                  <div className="inv-form-actions">
                    <button type="button" className="inv-btn inv-btn--ghost" onClick={() => setSetupStep(1)}>← Atrás</button>
                    <button type="button" className="inv-btn inv-btn--primary" disabled={setupSaving} onClick={finishSetup}>
                      {setupSaving ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Asistente de nueva cotización (3 pasos) ── */}
      {showWizard && (
        <div className="inv-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowWizard(false)}>
          <div className="inv-modal">
            <div className="inv-modal-head">
              <p>Nueva cotización ({wizardStep}/3)</p>
              <button type="button" onClick={() => setShowWizard(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="inv-wizard-steps">
              {[1, 2, 3].map((s) => <span key={s} className={`inv-step-dot${s <= wizardStep ? " inv-step-dot--active" : ""}`} />)}
            </div>
            <div className="inv-form">
              {error && <p className="inv-error" role="alert">{error}</p>}

              {wizardStep === 1 && (
                <>
                  <label className="inv-label">¿Para quién es esta cotización?</label>
                  {clients.length > 0 && (
                    <select value={form.clientId} onChange={(e) => pickClient(e.target.value)} className="inv-input">
                      <option value="">— Escribir manualmente —</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                  <input className="inv-input" placeholder="Nombre de la clienta" value={form.clientName}
                    onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} autoFocus />
                  <div className="inv-form-row">
                    <input className="inv-input" type="email" placeholder="Email (opcional)" value={form.clientEmail}
                      onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))} />
                    <input className="inv-input" placeholder="Teléfono (opcional)" value={form.clientPhone}
                      onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))} />
                  </div>
                  <div className="inv-form-actions">
                    <button type="button" className="inv-btn inv-btn--primary" disabled={!canGoStep2} onClick={() => setWizardStep(2)}>Siguiente →</button>
                  </div>
                </>
              )}

              {wizardStep === 2 && (
                <>
                  <label className="inv-label">Toca para agregar de tu catálogo</label>
                  {settings.catalog.length > 0 ? (
                    <div className="inv-catalog-chips">
                      {settings.catalog.map((c) => (
                        <button type="button" key={c.id} className="inv-catalog-chip" onClick={() => addFromCatalog(c)}>
                          {c.name} <small>{fmt(c.price)}</small>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="helper-copy">Aún no tienes catálogo guardado — agrega los ítems a mano abajo, o ve a "Mi negocio" para guardarlos y reutilizarlos la próxima vez.</p>
                  )}

                  {form.items.length > 0 && (
                    <>
                      <label className="inv-label">Ítems de esta cotización</label>
                      <div className="inv-items">
                        {form.items.map((it, idx) => (
                          <div key={idx} className="inv-item-row">
                            <input className="inv-input" placeholder="Descripción" value={it.description}
                              onChange={(e) => updateItem(idx, "description", e.target.value)} />
                            <input className="inv-input inv-input--num" type="number" min="0" step="1" placeholder="Cant." value={it.quantity}
                              onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
                            <input className="inv-input inv-input--num" type="number" min="0" step="0.01" placeholder="Precio" value={it.unitPrice}
                              onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} />
                            <button type="button" className="inv-item-del" onClick={() => removeItem(idx)} aria-label="Quitar ítem">×</button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <button type="button" className="inv-btn inv-btn--ghost inv-add-item" onClick={addCustomItem}>+ Ítem fuera de catálogo</button>

                  <div className="inv-form-total">Total: <strong>{fmt(formTotal)}</strong></div>
                  <div className="inv-form-actions">
                    <button type="button" className="inv-btn inv-btn--ghost" onClick={() => setWizardStep(1)}>← Atrás</button>
                    <button type="button" className="inv-btn inv-btn--primary" disabled={!canGoStep3} onClick={() => setWizardStep(3)}>Siguiente →</button>
                  </div>
                </>
              )}

              {wizardStep === 3 && (
                <>
                  <label className="inv-label">Revisa y genera</label>
                  <div className="inv-review">
                    <p><strong>{form.clientName}</strong></p>
                    {form.items.map((it, i) => (
                      <p key={i} className="inv-review-item">{it.description} × {it.quantity} — {fmt((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))}</p>
                    ))}
                  </div>
                  <textarea className="inv-input" rows={2} placeholder="Notas (opcional — ej: validez de la oferta, forma de pago)" value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                  <div className="inv-form-total">Total: <strong>{fmt(formTotal)}</strong></div>
                  <div className="inv-form-actions">
                    <button type="button" className="inv-btn inv-btn--ghost" onClick={() => setWizardStep(2)}>← Atrás</button>
                    <button type="button" className="inv-btn inv-btn--primary" disabled={saving} onClick={submitQuote}>
                      {saving ? "Generando..." : "✦ Generar cotización"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentPrintView({ doc, logo, profileSetup, money, currency, onClose }) {
  const fmt = (n) => (money ? money.format(n) : `${currency} ${Number(n || 0).toFixed(2)}`);
  return (
    <div className="inv-print-wrap">
      <div className="inv-print-toolbar">
        <button type="button" onClick={onClose}>← Volver</button>
        <div style={{ textAlign: "right" }}>
          <button type="button" className="inv-btn inv-btn--primary" onClick={() => window.print()}>Descargar PDF</button>
          <p className="inv-print-hint">Se abrirá para imprimir — elige "Guardar como PDF".</p>
        </div>
      </div>
      <div className="inv-print-doc">
        <div className="inv-print-head">
          <div className="inv-print-brand">
            {logo && <img src={logo} alt="" className="inv-print-logo" />}
            <div>
              <p className="inv-print-business">{profileSetup?.businessName || "Tu negocio"}</p>
              <p className="inv-print-owner">{profileSetup?.name || ""}</p>
            </div>
          </div>
          <div className="inv-print-doc-info">
            <p className="inv-print-doc-type">Cotización</p>
            <p className="inv-print-doc-number">{doc.number}</p>
          </div>
        </div>

        <div className="inv-print-meta">
          <div>
            <p className="inv-print-meta-label">Para</p>
            <p>{doc.clientName}</p>
            {doc.clientEmail && <p>{doc.clientEmail}</p>}
            {doc.clientPhone && <p>{doc.clientPhone}</p>}
          </div>
          <div>
            <p className="inv-print-meta-label">Fecha</p>
            <p>{doc.issueDate}</p>
          </div>
        </div>

        <table className="inv-print-table">
          <thead>
            <tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr>
          </thead>
          <tbody>
            {doc.items.map((it, i) => (
              <tr key={i}>
                <td>{it.description}</td>
                <td>{it.quantity}</td>
                <td>{fmt(it.unitPrice)}</td>
                <td>{fmt(it.quantity * it.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="inv-print-total-row">
          <span>Total</span>
          <strong>{fmt(doc.total)}</strong>
        </div>

        {doc.notes && (
          <div className="inv-print-notes">
            <p className="inv-print-meta-label">Notas</p>
            <p>{doc.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
