# Gestoría Canarias — Boletines Oficiales

App para asesorías y gestorías que monitoriza automáticamente las novedades normativas del BOE, BOC y BOP (Las Palmas y Tenerife), con sincronización diaria automática a las 08:00.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/gestoria-canarias run dev` — run the frontend (port 20210)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TailwindCSS, Recharts, Wouter routing
- API: Express 5 with pino logging
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Scheduler: node-cron (daily sync at 08:00)
- XML parsing: xml2js (for BOE XML API and RSS feeds)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/entries.ts` — DB schema: `entries` and `sync_logs` tables
- `artifacts/api-server/src/lib/sync.ts` — Bulletin fetchers for BOE, BOC, BOP_LPA, BOP_TFE
- `artifacts/api-server/src/routes/` — entries, sync, stats route handlers
- `artifacts/api-server/src/app.ts` — Express app + cron job setup
- `artifacts/gestoria-canarias/src/` — React frontend

## Architecture decisions

- BOE is fetched via its official XML API (`boe.es/diario_boe/xml.php`). BOC and BOP are fetched via RSS feeds.
- Each entry is deduplicated by `(source, external_id)` — re-syncing never creates duplicates.
- The sync runs as a cron at 08:00 daily via `node-cron`; it can also be triggered manually from the UI.
- `sync_logs` table tracks every sync run, its duration, new entry count, and any errors.
- Backend uses `req.log` (pino-http) for structured request logging; non-request code uses the singleton `logger`.

## Product

- **Dashboard**: KPI cards (total, hoy, no leídas, guardadas) + feed de hoy + gráfico por categoría
- **Boletines**: Lista paginada con filtros por fuente, fecha, categoría y búsqueda de texto
- **Detalle**: Ficha completa del artículo con enlace al documento oficial; se marca como leído automáticamente
- **Sincronización**: Estado del último sync, próxima ejecución programada, trigger manual

## Bulletin sources

| ID | Fuente | URL |
|---|---|---|
| BOE | Boletín Oficial del Estado | https://www.boe.es |
| BOC | Boletín Oficial de Canarias | https://www.gobiernodecanarias.org/boc/ |
| BOP_LPA | BOP Las Palmas | https://www.laprovincia.es/bop/ |
| BOP_TFE | BOP Santa Cruz de Tenerife | https://www.tenerife.es/portalcapeco/ |

## User preferences

- UI in Spanish throughout
- No emojis in the UI
- Institutional color palette: Canary Navy blue + Gold accent

## Gotchas

- After schema changes, run `pnpm --filter @workspace/db run push` then `pnpm run typecheck:libs` before typechecking the API server.
- The BOE XML API URL format is `boe.es/diario_boe/xml.php?id=BOE-S-YYYYMMDD`.
- External RSS/XML feeds may be unavailable on weekends (bulletins aren't published every day).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
