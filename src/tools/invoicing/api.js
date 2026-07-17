import { callToolApi } from "../../lib/apiClient";

// TODO: reemplazar con la URL real una vez creada la Lambda — ver
// lambda/INVOICING-DEPLOY.md. Mismo formato que GEMINI_URL/PAYMENTS_URL en App.jsx.
const INVOICING_URL = "https://REEMPLAZAR.execute-api.us-east-1.amazonaws.com/default/mamaceo-invoicing";

export const listDocuments = () =>
  callToolApi(INVOICING_URL, { action: "list" });

export const createDocument = (doc) =>
  callToolApi(INVOICING_URL, { action: "create", ...doc });

export const updateDocument = (docId, changes) =>
  callToolApi(INVOICING_URL, { action: "update", docId, ...changes });

export const setDocumentStatus = (docId, status) =>
  callToolApi(INVOICING_URL, { action: "set-status", docId, status });

export const deleteDocument = (docId) =>
  callToolApi(INVOICING_URL, { action: "delete", docId });
