# Desplegar el endpoint de admin (mamaceo-admin-data)

Esta ruta es para que **ump-admin** (tu panel de administración, otro proyecto) pueda
leer plan/suscripción, conteos de actividad y uso por pestaña de todas las usuarias —
de solo lectura, sin tocar el contenido de negocio de nadie.

A diferencia de `mamaceo-user-data`, esta ruta **no usa el Cognito de las usuarias**.
La protege un autorizador `AWS_IAM` de API Gateway: solo quien tenga las credenciales
IAM dedicadas (`ump-admin-readonly`, creadas más abajo) puede invocarla.

## 1. Crear la Lambda

1. Consola AWS → Lambda → Crear función.
2. Nombre: `mamaceo-admin-data`. Runtime: Node.js 22.x.
3. Subir el código de `lambda/mamaceo-admin-data.js` de este repo (como `index.mjs`, igual que las otras Lambdas del proyecto).
4. Variables de entorno (opcionales, ya tienen default): `AWS_REGION=us-east-1`, `DYNAMODB_TABLE=user_states`.
5. Rol de ejecución: crear uno nuevo (`mamaceo-admin-data-role`) con **solo** este permiso (no reutilices el rol de `mamaceo-user-data`, que tiene permisos de escritura):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "dynamodb:Scan",
      "Resource": "arn:aws:dynamodb:us-east-1:<TU_ACCOUNT_ID>:table/user_states"
    }
  ]
}
```

## 2. Agregar la ruta en API Gateway

En la misma API HTTP donde ya viven `mamaceo-user-data`, `mamaceo-gemini` y `mamaceo-payments`:

1. Crear ruta `GET /mamaceo-admin-data` → integración con la Lambda `mamaceo-admin-data`.
2. **Authorization: AWS_IAM** (no el JWT authorizer de Cognito que usan las otras rutas — elegí "IAM" en el dropdown de autorización de esa ruta específica).
3. No hace falta configurar CORS en esta ruta: nadie la llama desde un navegador, la llama el backend de ump-admin firmando con SigV4.

## 3. Crear el usuario IAM para ump-admin

1. IAM → Usuarios → Crear usuario `ump-admin-readonly`. Acceso solo programático (access key), sin consola.
2. Policy inline, solo permite invocar esta ruta exacta (reemplazá `<API_ID>` por el id real de tu API Gateway, visible en su URL):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-east-1:<TU_ACCOUNT_ID>:<API_ID>/*/GET/mamaceo-admin-data"
    }
  ]
}
```

3. Guardá el `Access Key ID` y `Secret Access Key` generados — son las credenciales que usará ump-admin. **No los pongas en ningún repo como texto plano**; van como variables de entorno de la Lambda `ump-admin-mamaceo` (ver `ump-admin/UMP-ADMIN-DEPLOY.md`).

## 4. Probar la ruta firmada con SigV4

Con `awscurl` (`pip install awscurl`) usando esas credenciales:

```bash
awscurl --service execute-api --region us-east-1 \
  --access_key <ACCESS_KEY_ID> --secret_key <SECRET_ACCESS_KEY> \
  "https://<API_ID>.execute-api.us-east-1.amazonaws.com/default/mamaceo-admin-data"
```

Debería devolver `{ "summary": {...}, "users": [...] }`.

## 5. Confirmar que quedó bien acotado

- Llamar la misma ruta con un JWT de Cognito de una usuaria normal (header `Authorization: Bearer <token>`) en vez de SigV4 → debe dar **403** (el autorizador IAM no acepta JWT).
- Intentar usar las credenciales de `ump-admin-readonly` para llamar `mamaceo-user-data` o `mamaceo-payments` → debe dar **403** (la policy solo permite esa ruta).

## 6. Acciones de escritura (mamaceo-admin-actions) — opcional, para editar/restablecer usuarias desde ump-admin

Separada a propósito de `mamaceo-admin-data` (que sigue siendo de solo lectura):
esta Lambda nueva permite editar el plan de una usuaria o restablecer sus datos
desde ump-admin. Tiene su propio rol y su propia credencial IAM — si las
credenciales de lectura se filtran, no alcanzan para escribir nada.

1. Crear Lambda `mamaceo-admin-actions`, código `lambda/mamaceo-admin-actions.js`. Variables de entorno: `DYNAMODB_TABLE=user_states`.
2. Rol de ejecución nuevo (no reutilizar ninguno existente) con **solo**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:UpdateItem", "dynamodb:DeleteItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:<TU_ACCOUNT_ID>:table/user_states"
    }
  ]
}
```

3. Ruta `POST /mamaceo-admin-actions` → Lambda `mamaceo-admin-actions`, **Authorization: AWS_IAM**.
4. Crear usuario IAM `ump-admin-write-mamaceo` (solo access key, sin consola), policy inline acotada a esta ruta:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-east-1:<TU_ACCOUNT_ID>:<API_ID>/*/POST/mamaceo-admin-actions"
    }
  ]
}
```

5. Guardá `Access Key ID`/`Secret Access Key` — van como `MAMACEO_WRITE_ACCESS_KEY`/`MAMACEO_WRITE_SECRET_KEY` en la Lambda `ump-admin-mamaceo`, junto con la URL de esta ruta como `MAMACEO_ADMIN_ACTIONS_URL` (ver `ump-admin/UMP-ADMIN-DEPLOY.md`).
6. Probar con `awscurl` (`-X POST` + `-d '{"action":"set-plan","userId":"...","userPlan":"ceo"}'`) y confirmar que las credenciales de `ump-admin-readonly` (lectura) NO pueden invocar esta ruta nueva, y que `ump-admin-write-mamaceo` no puede invocar `mamaceo-admin-data`.

## Prompt para Amazon Q

Si preferís que Amazon Q te guíe paso a paso en la consola:

```text
Tengo una API HTTP de API Gateway en us-east-1 con rutas existentes
(mamaceo-user-data, mamaceo-gemini, mamaceo-payments) protegidas con un JWT
authorizer de Cognito (user pool us-east-1_ZvJgj7iG1).

Quiero agregar una ruta nueva GET /mamaceo-admin-data, conectada a una Lambda
nueva llamada mamaceo-admin-data (ya creada, código ya subido), protegida
con un authorizer AWS_IAM (no JWT) — distinto del que usan las demás rutas.

Necesito:
1. Crear el rol de ejecución de la Lambda con permiso dynamodb:Scan solo sobre
   la tabla user_states, nada más.
2. Crear la ruta GET /mamaceo-admin-data con autorización IAM.
3. Crear un usuario IAM "ump-admin-readonly" (solo access key, sin consola) con
   una policy que únicamente permita execute-api:Invoke sobre esa ruta exacta.
4. No modifiques las rutas ni roles existentes de mamaceo-user-data,
   mamaceo-gemini ni mamaceo-payments.
```
