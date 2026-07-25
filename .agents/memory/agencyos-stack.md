---
name: AgencyOS Stack
description: Key facts about the AgencyOS pnpm workspace migration
---

## Critical runtime facts
- UI lib: @base-ui/react (not Radix) — already in package.json dependencies
- Frontend port: driven by PORT env var (Vite --host 0.0.0.0)
- API: artifact api-server at previewPath /api; uses Fastify + pino

## Decisions
- Wouter Link does not wrap <a> — use <Link href="..." className="..."> directly, never <Link><a>
**Why:** Nested <a> causes hydration errors in React 19.
**How to apply:** Any nav links or client links must use Link directly without inner <a>.
