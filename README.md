# Vertikal Finanzas

SaaS ERP/finanzas orientado al mercado chileno. El repositorio unifica frontend, backend API y esquema Prisma en una sola base de código.

## Arquitectura real

- Frontend: `React 19` + `Vite 6`
- Backend: `Express 5` + `tsx`
- Base de datos: `PostgreSQL` + `Prisma 6`
- Build productivo: el backend sirve `dist/` en producción

## Estructura principal

- `App.tsx`, `components/`, `pages/`: interfaz principal
- `server/`: API, middlewares, servicios y arranque
- `prisma/`: esquema y migraciones
- `types.ts`: contratos compartidos de UI

## Scripts

- `npm run dev`: frontend Vite
- `npm run server`: backend en modo watch
- `npm run dev:all`: frontend + backend
- `npm run build`: build del frontend
- `npm run typecheck`: chequeo TypeScript
- `npm run smoke:api`: smoke test de API

## Variables de entorno mínimas

- `DATABASE_URL`: conexión PostgreSQL
- `SESSION_SECRET`: obligatorio en producción
- `CORS_ALLOWED_ORIGINS`: lista separada por comas para CORS

## Notas operativas

- La app usa contexto de empresa activa mediante header `x-company-id`.
- En producción, `API_URL` es relativa (`/api`) porque Express sirve el frontend.
- El proyecto todavía contiene deuda histórica; antes de refactors grandes, valida los flujos críticos con `npm run typecheck`.
