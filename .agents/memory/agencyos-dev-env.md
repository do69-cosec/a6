---
name: AgencyOS Dev Environment
description: Known quirks and fixes for the AgencyOS Replit development environment
---

## drizzle-kit location
- Binary is at `lib/db/node_modules/.bin/drizzle-kit` — NOT in root node_modules
- Run DB push: `cd lib/db && node_modules/.bin/drizzle-kit push --config ./drizzle.config.ts`

## pnpm install quirk
- `pnpm install` from repo root times out in Replit agent shell (bash timeout)
- Use `pnpm add --filter @workspace/xxx <package>` per workspace package instead
- Or run `pnpm install` as a background process

## Orval codegen Node20 issue
- `pnpm --filter @workspace/api-spec run codegen` fails with: `SyntaxError: The requested module 'js-yaml' does not provide an export named 'default'`
- Node 20.x is used for codegen but orval v8.9.1 expects ESM js-yaml
- Fix: Update generated files manually in:
  - `lib/api-client-react/src/generated/api.schemas.ts` (Client + ClientInput interfaces)
  - `lib/api-zod/src/generated/types/client.ts` and `clientInput.ts`

## @base-ui/react pnpm store fix
- After `pnpm store prune` was run, @base-ui/react was missing its `esm/` directory (incomplete package in store)
- Fix: `pnpm add --filter @workspace/agency-os @base-ui/react@1.5.0 --force` after `pnpm store prune`
- **Why:** pnpm store had a corrupted/partial download of @base-ui/react; force reinstall fetches fresh copy

## File upload pattern
- POST multipart/form-data to `/api/uploads` with field `file`
- Response: `{ url: "/api/uploads/<filename>", filename, size, mimetype }`
- Then PATCH the resource with the returned URL stored in a `logoUrl`/similar field

## GitHub push
- Script: `bash push-to-github.sh` — requires `GITHUB_TOKEN` secret in Replit Secrets
- Git username: nileshrajput203
