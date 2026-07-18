import { callToolApi } from "../../lib/apiClient";

// TODO: reemplazar con la URL real una vez creada la Lambda — ver
// lambda/MOVEMENTS-SYNC-DEPLOY.md.
const MOVEMENTS_SYNC_URL = "https://REEMPLAZAR.execute-api.us-east-1.amazonaws.com/default/mamaceo-movements-sync";

export const getMyAddress = () =>
  callToolApi(MOVEMENTS_SYNC_URL, { action: "get-my-address" });

export const listPending = () =>
  callToolApi(MOVEMENTS_SYNC_URL, { action: "list-pending" });

export const resolvePending = (itemId, confirmed) =>
  callToolApi(MOVEMENTS_SYNC_URL, { action: confirmed ? "confirm" : "discard", itemId });
