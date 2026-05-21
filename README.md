# Academia Acceso

Panel de administración para control de acceso de academia de baile.

## Stack
- React + Vite + TypeScript
- Supabase (Auth + DB + Realtime)
- Tailwind CSS
- Vercel (deploy)

## Setup local

1. Clonar repo
2. `npm install`
3. Copiar `.env.example` a `.env` y llenar con tus credenciales de Supabase
4. `npm run dev`

## Deploy
Conectar repo a Vercel y agregar las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
