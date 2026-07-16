# Convención para herramientas nuevas (`src/tools/`)

`App.jsx` ya tiene ~8000 líneas y 200+ `useState`. Cada herramienta nueva
(facturas, contratos, CRM avanzado, lo que siga) vive en su propia carpeta
aquí — **no** dentro de `App.jsx` — con su propio estado local y su propio
archivo CSS. `App.jsx` solo la monta y le pasa lo que necesita, igual que ya
hace con `Studio` y `SilenceCutter`.

## Estructura de una herramienta

```
src/tools/<id>/
  <Nombre>Tool.jsx     ← componente principal, exportado default
  <Nombre>Tool.css
  api.js                ← llamadas a su Lambda (usa src/lib/apiClient.js)
```

## Contrato: qué le pasa `App.jsx` a la herramienta

Una herramienta recibe **solo** lo que necesita, no el estado completo de
la app. Props típicas (usa las que apliquen, no todas):

```jsx
<InvoicingTool
  onBack={() => setActiveView("dashboard")}
  plan={effectivePlan}                 // string: "free" | "mama" | "emprendedora" | "ceo"
  clients={clients}                    // array de clientas ya existente, para vincular documentos
  currency={currency}
  money={money}                        // Intl.NumberFormat ya configurado, para formato consistente
  brandProfile={brandProfile}          // nombre/logo del negocio, para membretes/PDFs
/>
```

Una herramienta **nunca** debería:
- Recibir `setX` de estados que no le pertenecen (si necesita escribir en
  `clients`, recibe una función específica tipo `onUpdateClient`, no el
  `setClients` crudo — así queda claro qué puede tocar y qué no).
- Leer/escribir `localStorage` directamente — su propio estado vive en su
  propia Lambda (ver `lambda/README.md`), no mezclado en el guardado
  gigante de `App.jsx`.

## Llamar a su backend

Cada herramienta con backend propio expone su Lambda vía una URL
`MAMACEO_<TOOL>_URL` (mismo patrón que `GEMINI_URL`/`PAYMENTS_URL`), y usa
`callToolApi` de `src/lib/apiClient.js`:

```js
// src/tools/invoicing/api.js
import { callToolApi } from "../../lib/apiClient";

const INVOICING_URL = "https://<api-id>.execute-api.us-east-1.amazonaws.com/default/mamaceo-invoicing";

export const createInvoice = (payload) => callToolApi(INVOICING_URL, { action: "create", ...payload });
export const listInvoices  = ()        => callToolApi(INVOICING_URL, { action: "list" });
```

`callToolApi` ya adjunta el JWT de Cognito y normaliza errores — no
reimplementes ese `fetch` a mano.

## Gating por plan

Si la herramienta requiere un plan mínimo, regístralo en
`src/lib/planGating.js` (`TOOL_MIN_PLAN`) en vez de comparar el plan a mano
dentro del componente:

```js
// src/lib/planGating.js
export const TOOL_MIN_PLAN = {
  business: "emprendedora",
  clients: "emprendedora",
  studio: "emprendedora",
  invoicing: "mama",   // ← agregar aquí
};
```

Y en `App.jsx`, el menú principal ya usa `isToolLocked(effectivePlan, item.id)`
— solo hace falta agregar la entrada del menú con el `id` correspondiente.

**Recuerda**: el gate de plan en el frontend es solo UX (mostrar el candado).
La Lambda de la herramienta debe volver a verificar el plan real antes de
hacer algo costoso — nunca confíes en que el candado del cliente es
suficiente (ver `lambda/README.md`, checklist de seguridad, punto 2).

## Checklist para dar por lista una herramienta nueva

- [ ] Vive en `src/tools/<id>/`, no dentro de `App.jsx`.
- [ ] Usa `callToolApi` para hablar con su Lambda.
- [ ] Registrada en `TOOL_MIN_PLAN` si requiere un plan pago.
- [ ] Su Lambda sigue el checklist de `lambda/README.md` (CORS, auth, rate
      limit, validación de input, rol IAM propio).
- [ ] `npm run build` pasa sin errores nuevos.
