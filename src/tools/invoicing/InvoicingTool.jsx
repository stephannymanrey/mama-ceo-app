import { useState, useEffect, useMemo } from "react";
import { listDocuments, createDocument, updateDocument, setDocumentStatus, deleteDocument } from "./api";
import "./InvoicingTool.css";

const EMPTY_ITEM = { description: "", quantity: 1, unitPrice: "" };

const TYPE_LABELS = { quote: "Cotización", invoice: "Factura" };

const STATUS_LABELS = {
  draft: "Borrador", sent: "Enviada", paid: "Pagada", overdue: "Vencida", canceled: "Cancelada",
  accepted: "Aceptada", rejected: "Rechazada", expired: "Expirada",
};

const STATUS_OPTIONS = {
  quote: ["draft", "sent", "accepted", "rejected", "expired"],
  invoice: ["draft", "sent", "paid", "overdue", "canceled"],
};

const STATUS_TONE = {
  draft: "muted", sent: "blue", paid: "green", accepted: "green",
  overdue: "pink", rejected: "pink", canceled: "pink", expired: "muted",
};

function blankForm(type = "quote") {
  return {
    type,
    clientId: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    notes: "",
    items: [{ ...EMPTY_ITEM }],
  };
}

/**
 * Herramienta de Facturas / Cotizaciones. Sigue el contrato de src/tools/README.md:
 * recibe solo lo que necesita del resto de la app (clientas, moneda, formateador
 * de dinero, datos del negocio) y habla con su propia Lambda vía api.js — no
 * toca localStorage ni el guardado general de App.jsx.
 */
export default function InvoicingTool({ onBack, clients = [], currency = "USD", money, profileSetup }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blankForm());

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await listDocuments();
    if (res.error) setError(res.error);
    else setDocuments(res.documents || []);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar, patrón estándar de fetch-on-mount
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => (filterType === "all" ? documents : documents.filter((d) => d.type === filterType)),
    [documents, filterType]
  );

  const openCreate = (type) => {
    setForm(blankForm(type));
    setEditingId(null);
    setError("");
    setShowForm(true);
  };

  const openEdit = (doc) => {
    setForm({
      type: doc.type,
      clientId: doc.clientId ?? "",
      clientName: doc.clientName,
      clientEmail: doc.clientEmail || "",
      clientPhone: doc.clientPhone || "",
      issueDate: doc.issueDate,
      dueDate: doc.dueDate || "",
      notes: doc.notes || "",
      items: doc.items.length ? doc.items.map((i) => ({ ...i })) : [{ ...EMPTY_ITEM }],
    });
    setEditingId(doc.doc_id);
    setError("");
    setShowForm(true);
  };

  const pickClient = (id) => {
    const c = clients.find((cl) => String(cl.id) === String(id));
    setForm((f) => ({
      ...f,
      clientId: id,
      clientName: c ? c.name : f.clientName,
      clientPhone: c?.phone || f.clientPhone,
    }));
  };

  const updateItem = (idx, field, value) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = (idx) =>
    setForm((f) => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, i) => i !== idx) : f.items }));

  const formTotal = useMemo(
    () => form.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0),
    [form.items]
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!form.clientName.trim()) { setError("Escribe el nombre de la clienta."); return; }
    const items = form.items
      .filter((it) => it.description.trim() && Number(it.quantity) > 0)
      .map((it) => ({ description: it.description.trim(), quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) || 0 }));
    if (!items.length) { setError("Agrega al menos un ítem con descripción y cantidad."); return; }

    setSaving(true);
    setError("");
    const payload = { ...form, items, currency };
    const res = editingId ? await updateDocument(editingId, payload) : await createDocument(payload);
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    setShowForm(false);
    await load();
  };

  const changeStatus = async (doc, status) => {
    const res = await setDocumentStatus(doc.doc_id, status);
    if (res.error) { setError(res.error); return; }
    setDocuments((prev) => prev.map((d) => (d.doc_id === doc.doc_id ? { ...d, status } : d)));
  };

  const remove = async (doc) => {
    if (!window.confirm(`¿Eliminar ${doc.number}? No se puede deshacer.`)) return;
    const res = await deleteDocument(doc.doc_id);
    if (res.error) { setError(res.error); return; }
    setDocuments((prev) => prev.filter((d) => d.doc_id !== doc.doc_id));
  };

  const fmt = (n) => (money ? money.format(n) : `${currency} ${Number(n || 0).toFixed(2)}`);

  if (viewingDoc) {
    return <DocumentPrintView doc={viewingDoc} profileSetup={profileSetup} money={money} currency={currency} onClose={() => setViewingDoc(null)} />;
  }

  return (
    <div className="inv-tool">
      <div className="inv-header">
        <div>
          <button type="button" className="inv-back" onClick={onBack}>← Volver</button>
          <h2 className="inv-title">Facturas y Cotizaciones</h2>
        </div>
        <div className="inv-header-actions">
          <button type="button" className="inv-btn inv-btn--ghost" onClick={() => openCreate("quote")}>+ Cotización</button>
          <button type="button" className="inv-btn inv-btn--primary" onClick={() => openCreate("invoice")}>+ Factura</button>
        </div>
      </div>

      {error && <p className="inv-error" role="alert">{error}</p>}

      <div className="inv-filters">
        {[["all", "Todas"], ["quote", "Cotizaciones"], ["invoice", "Facturas"]].map(([key, label]) => (
          <button key={key} type="button"
            className={`inv-filter-chip${filterType === key ? " inv-filter-chip--active" : ""}`}
            onClick={() => setFilterType(key)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="inv-empty">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="inv-empty-state">
          <p className="inv-empty-icon">🧾</p>
          <p className="inv-empty">Aún no tienes documentos. Crea tu primera cotización o factura.</p>
        </div>
      ) : (
        <div className="inv-list">
          {filtered.map((doc) => (
            <div key={doc.doc_id} className="inv-card">
              <div className="inv-card-top">
                <span className="inv-card-number">{doc.number}</span>
                <span className={`inv-badge inv-badge--${STATUS_TONE[doc.status] || "muted"}`}>{STATUS_LABELS[doc.status] || doc.status}</span>
              </div>
              <p className="inv-card-client">{doc.clientName}</p>
              <p className="inv-card-meta">{TYPE_LABELS[doc.type]} · {doc.issueDate}{doc.dueDate ? ` · vence ${doc.dueDate}` : ""}</p>
              <p className="inv-card-total">{fmt(doc.total)}</p>
              <div className="inv-card-actions">
                <button type="button" onClick={() => setViewingDoc(doc)}>Ver / PDF</button>
                <button type="button" onClick={() => openEdit(doc)}>Editar</button>
                <select value={doc.status} onChange={(e) => changeStatus(doc, e.target.value)}>
                  {(STATUS_OPTIONS[doc.type] || []).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <button type="button" className="inv-card-del" onClick={() => remove(doc)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="inv-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="inv-modal">
            <div className="inv-modal-head">
              <p>{editingId ? "Editar" : "Nueva"} {TYPE_LABELS[form.type].toLowerCase()}</p>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar">✕</button>
            </div>
            <form onSubmit={submit} className="inv-form">
              {error && <p className="inv-error" role="alert">{error}</p>}

              <label className="inv-label">Clienta</label>
              {clients.length > 0 && (
                <select value={form.clientId} onChange={(e) => pickClient(e.target.value)} className="inv-input">
                  <option value="">— Escribir manualmente —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <input className="inv-input" placeholder="Nombre de la clienta" value={form.clientName}
                onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} required />
              <div className="inv-form-row">
                <input className="inv-input" type="email" placeholder="Email (opcional)" value={form.clientEmail}
                  onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))} />
                <input className="inv-input" placeholder="Teléfono (opcional)" value={form.clientPhone}
                  onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))} />
              </div>

              <div className="inv-form-row">
                <div>
                  <label className="inv-label">Fecha</label>
                  <input className="inv-input" type="date" value={form.issueDate}
                    onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} />
                </div>
                <div>
                  <label className="inv-label">{form.type === "invoice" ? "Vence" : "Válida hasta"}</label>
                  <input className="inv-input" type="date" value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>

              <label className="inv-label">Ítems</label>
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
              <button type="button" className="inv-btn inv-btn--ghost inv-add-item" onClick={addItem}>+ Agregar ítem</button>

              <label className="inv-label">Notas (opcional)</label>
              <textarea className="inv-input" rows={3} value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />

              <div className="inv-form-total">Total: <strong>{fmt(formTotal)}</strong></div>

              <div className="inv-form-actions">
                <button type="button" className="inv-btn inv-btn--ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="inv-btn inv-btn--primary" disabled={saving}>
                  {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentPrintView({ doc, profileSetup, money, currency, onClose }) {
  const fmt = (n) => (money ? money.format(n) : `${currency} ${Number(n || 0).toFixed(2)}`);
  return (
    <div className="inv-print-wrap">
      <div className="inv-print-toolbar">
        <button type="button" onClick={onClose}>← Volver</button>
        <button type="button" className="inv-btn inv-btn--primary" onClick={() => window.print()}>Descargar PDF</button>
      </div>
      <div className="inv-print-doc">
        <div className="inv-print-head">
          <div>
            <p className="inv-print-business">{profileSetup?.businessName || "Tu negocio"}</p>
            <p className="inv-print-owner">{profileSetup?.name || ""}</p>
          </div>
          <div className="inv-print-doc-info">
            <p className="inv-print-doc-type">{TYPE_LABELS[doc.type]}</p>
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
            {doc.dueDate && (
              <>
                <p className="inv-print-meta-label">{doc.type === "invoice" ? "Vence" : "Válida hasta"}</p>
                <p>{doc.dueDate}</p>
              </>
            )}
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
