import { callToolApi } from "../../lib/apiClient";

const INVOICING_URL = "https://p5ftnawyxe.execute-api.us-east-1.amazonaws.com/default/mamaceo-invoicing";

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

export const getSettings = () =>
  callToolApi(INVOICING_URL, { action: "get-settings" });

export const saveSettings = (settings) =>
  callToolApi(INVOICING_URL, { action: "save-settings", ...settings });
