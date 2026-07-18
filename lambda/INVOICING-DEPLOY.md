# Desplegar mamaceo-invoicing (Facturas / Cotizaciones)

Sigue el patrón "SDK + `_shared/`" de `lambda/README.md`. A diferencia de
`mamaceo-user-data`, esta Lambda usa su **propia tabla** (`mamaceo_invoicing`)
en vez de `user_states`, porque son documentos que se acumulan sin límite
claro por usuaria (facturas, cotizaciones) — no tiene sentido reescribir todo
el historial de documentos cada vez que se guarda cualquier otro cambio.

## 1. Crear la tabla DynamoDB

Consola AWS → DynamoDB → Crear tabla:

- Nombre: `mamaceo_invoicing`
- Partition key: `user_id` (String)
- Sort key: `doc_id` (String)
- Modo de capacidad: On-demand (igual que `user_states`)

## 2. Crear la Lambda

1. Consola AWS → Lambda → Crear función. Nombre: `mamaceo-invoicing`. Runtime: Node.js 22.x.
2. Preparar el .zip (ver `lambda/README.md`, sección "Cómo desplegar"):

```bash
cd lambda
cp mamaceo-invoicing.js /tmp/index.mjs
zip -j /tmp/mamaceo-invoicing.zip /tmp/index.mjs
cd _shared && zip -r /tmp/mamaceo-invoicing.zip . -x "*.md"
```

3. Subir `/tmp/mamaceo-invoicing.zip` en Lambda → Código → Cargar desde → archivo .zip.
4. Variables de entorno: `DYNAMODB_TABLE=mamaceo_invoicing` (opcional, ya es el default).
5. Rol de ejecución nuevo (`mamaceo-invoicing-role`), **no reutilices** el rol de
   `mamaceo-user-data` — cada Lambda con su propio rol acotado a su propia tabla:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:Query", "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:<TU_ACCOUNT_ID>:table/mamaceo_invoicing"
    }
  ]
}
```

## 3. Ruta en API Gateway

En la misma API HTTP donde ya viven las demás rutas de usuaria:

1. Crear ruta `POST /mamaceo-invoicing` → integración con la Lambda `mamaceo-invoicing`.
2. **Authorization**: el mismo JWT authorizer de Cognito que usan
   `mamaceo-user-data`/`mamaceo-payments` (no el `AWS_IAM` de las rutas de admin).
3. CORS: ya lo maneja la Lambda misma vía `_shared/cors.mjs` — no hace falta
   configurar CORS aparte en API Gateway para esta ruta si usas integración
   Lambda proxy (recomendado).

## 4. Configurar la URL en el frontend

`src/tools/invoicing/api.js` tiene una constante `INVOICING_URL` — actualízala
con la URL real de esta ruta una vez creada (mismo formato que `GEMINI_URL`/
`PAYMENTS_URL` en `src/App.jsx`).

## 5. Probar

1. Con sesión iniciada en la app, ve a Facturas/Cotizaciones y crea una cotización de prueba.
2. Confirma que aparece con número `COT-0001`.
3. Crea una segunda — debe salir `COT-0002` (numeración atómica, sin duplicados
   aunque se cree rápido dos veces seguidas).
4. Cierra sesión, intenta llamar la ruta sin `Authorization` → debe dar `401`.
