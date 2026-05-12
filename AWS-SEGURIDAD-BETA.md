# Seguridad necesaria antes de abrir la beta

Este proyecto ya envia el token de Cognito en cada llamada a la API:

- Header: `Authorization: Bearer <token>`
- Endpoint actual: `https://p5ftnawyxe.execute-api.us-east-1.amazonaws.com/default/mamaceo-user-data`
- User Pool: `us-east-1_ZvJgj7iG1`
- App Client ID: `5hjqj36u9oeud7cs8onj93d36j`

Para que las estudiantes no puedan leer o escribir datos de otras cuentas, la proteccion real debe quedar en AWS.

## Regla principal

La Lambda `mamaceo-user-data` no debe confiar en `event.queryStringParameters.userId`.

Debe tomar el usuario autenticado desde Cognito:

```js
function getAuthenticatedUserId(event) {
  const claims =
    event.requestContext?.authorizer?.jwt?.claims ||
    event.requestContext?.authorizer?.claims ||
    {};

  return claims.sub || null;
}
```

Si `getAuthenticatedUserId(event)` devuelve vacio, la Lambda debe responder `401 Unauthorized`.

## API Gateway

Configurar un authorizer JWT de Cognito para las rutas de esta API:

- Issuer: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ZvJgj7iG1`
- Audience: `5hjqj36u9oeud7cs8onj93d36j`
- Rutas protegidas: `GET`, `POST` y `DELETE` de `/mamaceo-user-data`

CORS debe permitir:

- Methods: `GET, POST, DELETE, OPTIONS`
- Headers: `Content-Type, Authorization`
- Origin: el dominio temporal de Amplify y luego el dominio real cuando exista

## Lambda

La Lambda debe hacer esto:

1. Leer el usuario autenticado desde `event.requestContext.authorizer`.
2. Usar ese valor como llave `userId` en DynamoDB.
3. Ignorar cualquier `userId` enviado por query string o body.
4. En `GET`, devolver solo el registro de ese `userId`.
5. En `POST`, guardar solo en el registro de ese `userId`.
6. En `DELETE`, borrar solo el registro de ese `userId`.

Ejemplo de estructura:

```js
export const handler = async (event) => {
  const userId = getAuthenticatedUserId(event);
  if (!userId) {
    return json(401, { error: "Unauthorized" });
  }

  const method = event.requestContext?.http?.method || event.httpMethod;

  if (method === "GET") {
    // Buscar en DynamoDB por { userId }
  }

  if (method === "POST") {
    const body = JSON.parse(event.body || "{}");
    // Guardar { userId, data: body.data, updatedAt: new Date().toISOString() }
  }

  if (method === "DELETE") {
    // Borrar en DynamoDB por { userId }
  }

  return json(405, { error: "Method not allowed" });
};
```

## Prompt para Amazon Q

Copia esto en Amazon Q dentro del contexto de tu Lambda:

```text
Modifica la Lambda existente mamaceo-user-data sin crear recursos nuevos ni cambiar la tabla DynamoDB actual.

Objetivo: cerrar seguridad para una beta con usuarias reales.

La API ya recibe un header Authorization con un token de Cognito. API Gateway debe proteger las rutas GET, POST y DELETE con un JWT authorizer de Cognito:
- issuer: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ZvJgj7iG1
- audience/client id: 5hjqj36u9oeud7cs8onj93d36j

En la Lambda, elimina la dependencia de queryStringParameters.userId. El userId debe salir exclusivamente de:
event.requestContext.authorizer.jwt.claims.sub
o, si es REST API, event.requestContext.authorizer.claims.sub.

Si no existe sub, responder 401.

GET debe leer solo el item de DynamoDB cuyo userId sea el sub autenticado.
POST debe guardar solo el item cuyo userId sea el sub autenticado, usando el body { data }.
DELETE debe borrar solo el item cuyo userId sea el sub autenticado.

No permitas que el cliente envie o sobrescriba userId.
Mantén CORS permitiendo Content-Type y Authorization.
No crees recursos nuevos y no cambies nombres de tabla, region ni permisos existentes salvo que sea estrictamente necesario.
```

## Prueba antes de invitar estudiantes

1. Crear cuenta A y guardar un dato unico.
2. Cerrar sesion.
3. Crear cuenta B y guardar otro dato unico.
4. Confirmar que B no ve nada de A.
5. Volver a A y confirmar que A conserva su propio dato.
6. En el navegador, abrir DevTools y confirmar que las llamadas a `mamaceo-user-data` llevan `Authorization`.
7. Confirmar que una llamada sin `Authorization` devuelve `401`.

