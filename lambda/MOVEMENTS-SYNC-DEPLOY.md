# Desplegar "Movimientos por correo" (sincronización bancaria)

Deja que la usuaria reenvíe las notificaciones de su banco a una dirección
única, una IA extrae el movimiento, y cae en una bandeja de revisión — nunca
se crea un movimiento real sin que ella lo confirme. Ver el modelo de
confianza completo en el encabezado de `lambda/mamaceo-inbound-mail.js`.

⚠️ **Usa un subdominio dedicado (`mov.mamaceoapp.co`), nunca el dominio raíz
`mamaceoapp.co`.** Si `mamaceoapp.co` ya recibe correo tuyo (`hola@...`,
Google Workspace, etc.), cambiar su registro MX rompería ese correo. Un
subdominio nuevo tiene su propio MX independiente y no toca nada existente.

## 1. Verificar el subdominio en Amazon SES

1. Consola AWS → SES → Identities → Create identity → Domain: `mov.mamaceoapp.co`.
2. SES te da registros DNS (TXT de verificación + DKIM). Agrégalos donde
   administras el DNS de `mamaceoapp.co`.
3. Agrega además el registro **MX** que exige la recepción de correo de SES
   (SES te lo muestra al activar "Receiving"), algo como:
   ```
   mov.mamaceoapp.co.   MX   10 inbound-smtp.us-east-1.amazonaws.com.
   ```
4. Espera a que el identity quede "Verified" (puede tardar minutos a horas
   según tu proveedor de DNS).
5. SES → Email receiving → confirma que tu cuenta está fuera del sandbox de
   recepción para la región `us-east-1` (si es cuenta nueva, puede requerir
   salir del sandbox general de SES).

## 2. Bucket S3 para el correo crudo

1. S3 → Crear bucket, ej. `mamaceo-inbound-mail` (nombre único global).
2. Bucket policy — permitir que SES escriba ahí (reemplaza `<ACCOUNT_ID>`):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowSESPuts",
    "Effect": "Allow",
    "Principal": { "Service": "ses.amazonaws.com" },
    "Action": "s3:PutObject",
    "Resource": "arn:aws:s3:::mamaceo-inbound-mail/*",
    "Condition": { "StringEquals": { "aws:Referer": "<ACCOUNT_ID>" } }
  }]
}
```

3. No lo hagas público — solo SES (por la policy) y la Lambda (por su rol
   IAM) deben poder leer/escribir ahí.

## 3. Regla de recepción de SES

1. SES → Email receiving → Rule sets → crear/activar un rule set.
2. Nueva regla dentro del rule set:
   - Recipient condition: `mov.mamaceoapp.co` (cualquier dirección de ese dominio).
   - Action 1: **Deliver to S3 bucket** → `mamaceo-inbound-mail`, prefix `raw/`.
   - (No agregues acción de Lambda aquí — es más simple y confiable disparar
     la Lambda desde el evento S3 ObjectCreated, ver paso 6.)
3. Activa el rule set (SES solo procesa correo con un rule set *activo*).

## 4. Tablas DynamoDB

**`mamaceo_inbound_tokens`**
- Partition key: `token` (String)
- On-demand. Sin TTL.

**`mamaceo_pending_movements`**
- Partition key: `user_id` (String), Sort key: `item_id` (String)
- On-demand.
- Habilita **TTL** sobre el atributo `ttl` (DynamoDB → tabla → Additional
  settings → Time to Live) — así los pendientes que nunca se revisan se
  autoeliminan a los 30 días, no se acumula contenido de correos bancarios
  indefinidamente.

## 5. Lambda `mamaceo-movements-sync` (HTTP, la que llama el navegador)

Sigue el patrón estándar de `lambda/README.md` ("SDK + `_shared/`"):

```bash
cd lambda
cp mamaceo-movements-sync.js /tmp/index.mjs
zip -j /tmp/mamaceo-movements-sync.zip /tmp/index.mjs
cd _shared && zip -r /tmp/mamaceo-movements-sync.zip . -x "*.md"
```

- Rol de ejecución nuevo, con permisos **solo** sobre sus 2 tablas:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query", "dynamodb:DeleteItem"],
    "Resource": [
      "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/mamaceo_inbound_tokens",
      "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/mamaceo_pending_movements"
    ]
  }]
}
```

- Variables de entorno: `MAIL_DOMAIN=mov.mamaceoapp.co` (opcional, ya es el default).
- Ruta en API Gateway: `POST /mamaceo-movements-sync`, **Authorization: JWT de Cognito** (igual que las demás rutas de usuaria).

## 6. Lambda `mamaceo-inbound-mail` (disparada por S3, NO por API Gateway)

Esta Lambda usa `mailparser`, que **no** viene incluido en el runtime de
Lambda (a diferencia del SDK de AWS) — hay que empaquetar `node_modules`:

```bash
cd lambda
mkdir -p /tmp/inbound-build && cp mamaceo-inbound-mail.js /tmp/inbound-build/index.mjs
cp -r _shared /tmp/inbound-build/_shared
cd /tmp/inbound-build
npm init -y >/dev/null && npm install mailparser @aws-sdk/client-s3 @aws-sdk/client-dynamodb @aws-sdk/util-dynamodb
zip -r /tmp/mamaceo-inbound-mail.zip . -x "package*.json"
```

- Handler: `index.handler`. Runtime: Node.js 22.x.
- Rol de ejecución nuevo (no reutilices el de `mamaceo-movements-sync`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::mamaceo-inbound-mail/*"
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/mamaceo_inbound_tokens"
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem", "dynamodb:UpdateItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/mamaceo_pending_movements"
    }
  ]
}
```

- Variables de entorno: `ANTHROPIC_API_KEY` (la misma que usa `index.mjs`/mamaceo-gemini).
- **Trigger**: S3 → el bucket `mamaceo-inbound-mail` → Event type "PUT" /
  `s3:ObjectCreated:*`, prefix `raw/` → destino: esta Lambda. Configúralo
  desde la consola de Lambda (Add trigger → S3) o desde el bucket
  (Properties → Event notifications).
- Timeout: sube a 30s (la llamada a Claude puede tardar unos segundos).

## 7. Probar

1. Reenvía manualmente un correo de notificación bancaria real (o uno de
   prueba con texto similar) a `<tu-token>@mov.mamaceoapp.co`.
2. Revisa CloudWatch Logs de `mamaceo-inbound-mail` — debe loguear
   "Movimiento pendiente creado para <userId>" (o la razón de descarte si
   no lo reconoció).
3. Desde la app, la bandeja "Por confirmar" de Mis Finanzas debe mostrar el
   movimiento extraído.
4. Manda un correo que NO sea de un banco (ej. un boletín cualquiera) — debe
   descartarse sin crear nada (`is_transaction: false` en los logs).
5. Confirma que sin el token correcto (a una dirección inventada del mismo
   dominio) no se crea nada — debe loguear "Token no asociado a ninguna usuaria".
