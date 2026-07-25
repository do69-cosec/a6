# AgencyOS

All-in-one agency management platform for managing clients, projects, tasks, invoices, leads, content, HR, and more.

## Run & Operate

- `pnpm --filter @workspace/agency-os run build && SERVE_STATIC=true PORT=5000 pnpm --filter @workspace/api-server run dev` — build frontend + serve via Express on port 5000 (no Vite dev server; avoids HMR WebSocket issues in Replit)
- `PORT=8080 pnpm --filter @workspace/api-server run dev` — run the API server only on port 8080 (for API-only dev)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- DB schema: `lib/db/src/schema/` (source of truth for all tables)
- API contract: `lib/api-spec/openapi.yaml` (source of truth for all API shapes)
- Generated React hooks: `lib/api-client-react/src/generated/`
- Generated Zod schemas: `lib/api-zod/src/generated/`
- Frontend pages: `artifacts/agency-os/src/pages/`
- API routes: `artifacts/api-server/src/routes/`
- File uploads stored in: `artifacts/api-server/uploads/` (served at `/api/uploads/`)

## Architecture decisions

- Orval codegen from OpenAPI → both React hooks and Zod schemas; when codegen fails (Node version issue), update generated files in `lib/api-client-react/src/generated/api.schemas.ts` and `lib/api-zod/src/generated/types/` manually
- Vite proxies `/api` → Express on port 8080
- File uploads: POST multipart to `/api/uploads`, returns `{ url }`, then PATCH the resource with the URL
- Wouter routing: `Link` must NOT wrap `<a>` — use `<Link href="..." className="...">text</Link>` directly

## Product

Modules: Clients, Projects, Tasks (Kanban), Content Calendar, Invoices, Quotations, Proposals, Purchase Orders, Leads/Sales, HR (Attendance + Leave), Users/Team, Agency Settings, Client Portal.

## User preferences

- Build features one by one from the feature list, push to GitHub after each one completes
- GitHub push: `bash push-to-github.sh` (requires GITHUB_TOKEN secret set in Replit Secrets)

## Gotchas

- `pnpm install` from repo root times out in Replit agent shell; use `pnpm add --filter @workspace/xxx` per package instead
- `drizzle-kit` binary is at `lib/db/node_modules/.bin/drizzle-kit` — run DB push from `lib/db/` dir: `node_modules/.bin/drizzle-kit push --config ./drizzle.config.ts`
- Orval codegen fails with Node 20 (`js-yaml` ESM issue) — update generated files manually in `lib/api-client-react/src/generated/api.schemas.ts` and `lib/api-zod/src/generated/types/`
- After `pnpm store prune`, run `pnpm add --filter @workspace/agency-os @base-ui/react` to restore the package (pnpm store was corrupted)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
