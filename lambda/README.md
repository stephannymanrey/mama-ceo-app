# Lambdas de MamáCEO — guía de arquitectura y deploy

Este proyecto no tiene CI/CD ni IaC (Terraform/CDK/SAM): cada Lambda se sube
a mano desde la consola de AWS. Esta guía documenta el patrón para que cada
Lambda nueva empiece segura desde el primer commit, en vez de reinventar
CORS/auth/rate-limit cada vez (y arriesgarse a que alguna quede desactualizada,
como pasó antes con el CORS `"*"` de `mamaceo-payments`).

## Los 3 patrones de este repo

| Patrón | Cuándo usarlo | Ejemplos | Deploy |
|---|---|---|---|
| **SDK + `_shared/`** | Cualquier Lambda nueva que hable con DynamoDB desde el navegador (JWT de Cognito) | `mamaceo-user-data`, `mamaceo-payments`, (nuevas herramientas) | **.zip** con el archivo renombrado a `index.mjs` + la carpeta `_shared/` |
| **Zero-dependencias** | Endpoints de IA de alto volumen donde importa el cold-start (usa `fetch` nativo + SigV4 manual, sin `npm install`) | `index.mjs` (mamaceo-gemini / Claude) | Pegar el archivo directo en el editor inline de la consola, sin zip |
| **AWS_IAM (sin CORS)** | Rutas que solo llama tu propio backend/admin, nunca un navegador | `mamaceo-admin-data`, `mamaceo-admin-actions` | Ver `ADMIN-DEPLOY.md` |

No conviertas el patrón zero-dependencias a `_shared/` — es una decisión
deliberada para minimizar cold start en la ruta de IA más usada. Sí usa
`_shared/` para todo lo demás.

## `_shared/` — qué hay y qué NO hay que duplicar nunca más

- `cors.mjs` — allowlist de orígenes + `corsHeaders(event, methods)`. Si agregas
  un dominio nuevo, se agrega **aquí**, una sola vez.
- `respond.mjs` — `respond(statusCode, body, event, methods)`. Siempre devuelve
  el objeto `{statusCode, headers, body}` correcto con CORS incluido.
- `auth.mjs` — `getMethod(event)` y `getUserId(event)` (lee el `sub` del JWT
  que ya validó el authorizer de API Gateway). **Nunca** leas un `userId` que
  venga en el body/query — eso es lo que permitiría a cualquiera tocar datos
  de otra cuenta con solo cambiar un parámetro.
- `rateLimit.mjs` — `checkAndIncrDailyLimit` (límite global por recurso) y
  `checkAndIncrUserDailyLimit` (límite por usuaria). Cualquier endpoint que
  cueste dinero (llamadas a un LLM, envío de emails, generación de PDF pesada)
  debe tener un límite desde el día 1.
- `validate.mjs` — helpers mínimos de validación de input (`isNonEmptyString`,
  `isPositiveNumber`, `isEmail`, etc.). El servidor nunca confía en la forma
  de lo que mandó el cliente.

## Cómo desplegar una Lambda que usa `_shared/`

```bash
cd lambda
cp mamaceo-invoicing.js /tmp/index.mjs   # renombrar al nombre que exige Lambda
zip -r /tmp/mamaceo-invoicing.zip -j /tmp/index.mjs   # el archivo suelto
cd _shared && zip -r /tmp/mamaceo-invoicing.zip . -x "*.md"  # + la carpeta _shared/ al lado
```

El .zip final debe verse así por dentro:

```
index.mjs
_shared/
  cors.mjs
  respond.mjs
  auth.mjs
  rateLimit.mjs
  validate.mjs
```

Subir ese .zip en Lambda → Código → Cargar desde → archivo .zip. El resto
del flujo (rol de ejecución, ruta en API Gateway con JWT authorizer de
Cognito, variables de entorno) es igual al de `mamaceo-user-data`.

## Checklist de seguridad para una Lambda nueva

Antes de dar por lista una herramienta nueva, confirma:

1. **CORS** — usa `corsHeaders`/`respond` de `_shared`, nunca `"*"`.
2. **Auth** — usa `getUserId(event)` de `_shared/auth.mjs`; si vuelve `null`,
   responde `401` antes de tocar cualquier dato.
3. **Autorización por dueño del dato** — toda lectura/escritura en DynamoDB
   usa el `userId` del JWT como parte de la Key, nunca un id que mande el
   cliente.
4. **Rate limit** — si el endpoint cuesta dinero o puede abusarse (IA, envío
   de email, generación de PDF), usa `checkAndIncrUserDailyLimit`.
5. **Validación de input** — usa `_shared/validate.mjs` (o similar) en cada
   campo antes de guardarlo o de interpolarlo en un prompt/HTML/PDF.
6. **Rol IAM acotado** — la Lambda tiene su propio rol de ejecución con
   *solo* los permisos DynamoDB/S3 que necesita sobre *su* tabla/prefijo,
   nunca reutiliza el rol de otra Lambda (mismo criterio que
   `mamaceo-admin-actions` vs `mamaceo-admin-data`).
7. **Sin PII en logs** — no seas `console.log` de emails/nombres completos en
   texto plano; usa un helper tipo `maskEmail` si necesitas depurar.
8. **Sin secretos en el cliente** — cualquier API key/secreto vive solo en
   variables de entorno de la Lambda, nunca en `src/`.

## Agregar una herramienta nueva — receta completa

1. **Backend**: `lambda/mamaceo-<herramienta>.js`, sigue el checklist de
   arriba, usa `_shared/`. Tabla propia en DynamoDB si el dato no encaja en
   `user_states` (ver ejemplo en `mamaceo-invoicing.js`).
2. **Frontend**: `src/tools/<herramienta>/` — ver `src/tools/README.md` para
   el contrato de props/contexto que recibe del resto de la app.
3. **Gating de plan**: agrega la herramienta a `src/lib/planGating.js` en vez
   de escribir un `if (userPlan === ...)` suelto dentro del componente.
4. **Deploy**: sigue "Cómo desplegar" de arriba, agrega la ruta en API
   Gateway con el JWT authorizer de Cognito (igual que las demás rutas de
   usuaria — no el `AWS_IAM` de las rutas de admin).
