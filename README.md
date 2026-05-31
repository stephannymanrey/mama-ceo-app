# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Supabase setup

To enable authenticated cloud storage and sync, create a Supabase project and add the following values to a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-api-key
```

The project needs a table named `user_states` with these columns:

- `user_id` (text, primary key)
- `data` (jsonb)

You can create this table in Supabase SQL editor with:

```sql
create table if not exists user_states (
  user_id text primary key,
  data jsonb not null
);
```

When Supabase is not configured, the app runs in local mode using `localStorage`.

## Despliegue en AWS

Este proyecto puede desplegarse como sitio estático en AWS S3. Asegúrate de tener instalado y configurado el AWS CLI con tus credenciales y un bucket S3 preparado para hosting estático.

1. Configura el bucket S3:
   - Habilita `Static website hosting` en el bucket.
   - Configura el documento de índice en `index.html`.
   - Añade una política de lectura pública si deseas que el sitio sea público.

2. Exporta la variable de entorno del bucket:

```powershell
$env:AWS_S3_BUCKET = "mi-bucket-estatico"
```

3. (Opcional) Si usas CloudFront y quieres invalidar la caché:

```powershell
$env:AWS_CLOUDFRONT_DISTRIBUTION_ID = "EJEMPLOID123"
```

4. Ejecuta el despliegue:

```powershell
npm run deploy:aws
```

Si necesitas usar un perfil específico de AWS CLI, define también:

```powershell
$env:AWS_PROFILE = "mi-perfil"
```

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
