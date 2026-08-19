# Convención para herramientas nuevas (`src/tools/`)

`App.jsx` ya tiene ~8000 líneas y 200+ `useState`, con un único `useEffect`
que guarda TODO el estado de negocio/hogar en cada cambio, reemplazando el
documento completo en DynamoDB (no un merge parcial). Montar `App.jsx` solo
para mostrar otra cosa arriba dispara esa maquinaria de carga/guardado sin
necesidad, con riesgo real de pisar datos si algo falla en el timing —
esto pasó de verdad con `/editor` antes de aislarlo. Por eso toda
herramienta nueva **debe** vivir en su propia carpeta acá, ser una ruta
independiente que jamás monta `App.jsx`, y leer/guardar solo lo suyo.

## Regla no negociable: ruta independiente, nunca dentro de App()

1. La herramienta se monta en `src/main.jsx`, **antes** de `<App />`, vía el
   mapa `STANDALONE_ROUTES` — no como un `activeView` del dashboard:
   ```js
   // src/main.jsx
   const STANDALONE_ROUTES = {
     '/editor': SilenceCutter,
     '/studio': StudioStandalone,
     '/facturas': InvoicingStandalone,
     '/tu-herramienta': TuHerramientaStandalone,   // ← agregar acá
   };
   ```
2. Si necesita datos del perfil de la usuaria (marca, clientas, moneda...),
   los pide ella misma al montar con `getUserData()` de
   `src/lib/userDataClient.js` (una lectura, de solo lectura). **Nunca**
   recibe esos datos como prop desde `App.jsx` ni depende de que el
   dashboard esté abierto.
3. Si necesita guardar algo del perfil de la usuaria (no de su propia
   tabla/Lambda), usa `saveUserField(field, value)` — una actualización
   parcial de un solo campo en DynamoDB, no el guardado completo. El campo
   debe agregarse primero a `ALLOWED_PARTIAL_FIELDS` en
   `lambda/mamaceo-user-data.js`.
4. Maneja su propia autenticación con `getAwsAuthToken()` — si no hay
   sesión, muestra una pantalla simple de "inicia sesión" con link a `/`
   (ver `StudioStandalone.jsx`/`InvoicingStandalone.jsx` como ejemplo),
   nunca asume que ya hay un usuario logueado.
5. Si tiene su propio backend de datos (facturas, contratos...), esa parte
   ya estaba bien resuelta: su propia Lambda + tabla, ver abajo.

## Estructura de una herramienta

```
src/tools/<id>/
  <Nombre>Tool.jsx        ← componente principal, exportado default
  <Nombre>StandAlone.jsx  ← wrapper que resuelve auth + datos propios y monta <Nombre>Tool
  <Nombre>Tool.css
  api.js                   ← llamadas a su Lambda propia (usa src/lib/apiClient.js)
```

## Contrato: qué le pasa el wrapper standalone a la herramienta

La herramienta en sí (`<Nombre>Tool.jsx`) sigue recibiendo **solo** lo que
necesita como props simples — el wrapper standalone es quien las resuelve:

```jsx
// src/tools/invoicing/InvoicingStandalone.jsx
<InvoicingTool
  onBack={() => { window.location.href = "/"; }}
  plan={effectivePlan}                 // calculado localmente desde getUserData()
  clients={clients}                    // leído con getUserData(), no recibido de App.jsx
  currency={currency}
  money={money}
  profileSetup={profileSetup}
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

Como ahora la herramienta se abre por su propia URL (no por el menú del
dashboard), el candado hay que replicarlo en el wrapper standalone mismo,
leyendo el plan real desde `getUserData()` y comparando con
`toolMinPlan(id)` antes de renderizar la herramienta (ver el bloque
`if (!planMeetsMinimum(...))` en `StudioStandalone.jsx`).

**Recuerda**: el gate de plan en el frontend es solo UX (mostrar el candado
o el mensaje de upgrade). La Lambda de la herramienta debe volver a
verificar el plan real antes de hacer algo costoso — nunca confíes en que
el candado del cliente es suficiente (ver `lambda/README.md`, checklist de
seguridad, punto 2).

## Checklist para dar por lista una herramienta nueva

- [ ] Vive en `src/tools/<id>/`, no dentro de `App.jsx`.
- [ ] Tiene su propio `<Nombre>StandAlone.jsx` y está registrada en
      `STANDALONE_ROUTES` de `src/main.jsx` — se puede abrir en una pestaña
      nueva sin haber abierto antes el dashboard.
- [ ] Maneja su propia autenticación (`getAwsAuthToken()`), con pantalla de
      "inicia sesión" si no hay token — no asume que ya hay sesión.
- [ ] Lee datos del perfil de la usuaria con `getUserData()` y los guarda
      (si aplica) con `saveUserField()` — nunca recibe/reenvía el estado
      completo del dashboard.
- [ ] Usa `callToolApi` para hablar con su propia Lambda de datos.
- [ ] Registrada en `TOOL_MIN_PLAN`, y el wrapper standalone valida el plan
      antes de mostrar la herramienta.
- [ ] Su Lambda sigue el checklist de `lambda/README.md` (CORS, auth, rate
      limit, validación de input, rol IAM propio).
- [ ] `npm run build` pasa sin errores nuevos.
