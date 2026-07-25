---
name: AgencyOS Feature Set
description: Features implemented — SearchBar, Finance tabbed page, Excel export (xlsx), Dashboard overhaul; notes on DB gaps
---

## Implemented features

### SearchBar
- `artifacts/agency-os/src/components/common/SearchBar.tsx` — reusable controlled input with clear button, Escape key, lucide Search icon.
- Added to: tasks.tsx, sales.tsx, content.tsx (filteredPosts), hawan.tsx (Social Handles tab).
- Pattern: add `searchQuery` state, compute `filtered*` before render, add `<SearchBar>` in header.

### Finance & Docs (tabbed page)
- `artifacts/agency-os/src/pages/finance.tsx` — tab bar (Invoices / Quotations / POs / Proposals), URL param `?tab=` synced via `window.history.pushState`, Excel export via `xlsx`.
- Old sidebar links (4 items) replaced with single `/finance` entry using `Wallet` icon.
- Old routes `/invoices`, `/quotations`, `/purchase-orders`, `/proposals` all redirect to `/finance?tab=<tab>`.
- Excel export fetches data from each tab's API hook independently (all 4 hooks always mounted for instant export readiness).

### Dashboard overhaul
- `artifacts/agency-os/src/pages/dashboard.tsx` — 4 stat cards (border-l accent), AreaChart revenue (range toggle 3M/6M/12M/YTD), PieChart project health donut, sales pipeline bars, content calendar week strip (handles month boundary by fetching adjacent month), activity feed timeline.
- `artifacts/api-server/src/routes/dashboard.ts` — replaced with new file adding `GET /dashboard/project-health` (onTrack/atRisk/delayed/completed) and `GET /dashboard/revenue-chart?range=` alongside existing stats + recent-activity endpoints.

### AI writing assistant (site-wide)
- Backend: `artifacts/api-server/src/routes/ai.ts` — `POST /api/ai/generate` using `OPENAI_API_KEY` (user-provided secret, not the Replit blueprint) + `gpt-4o-mini`, context-aware system prompts keyed by a `context` field (proposal/quotation/invoice/content-caption/task/client-notes/lead/email/general).
- Frontend: `artifacts/agency-os/src/components/common/AiAssistButton.tsx` — reusable Popover+Sparkles button; pass `context`, `currentValue`, `onResult(text)`. Drop it next to any Textarea/rich-text field.
- Wired into: quotations, invoices, content captions, tasks, client activity notes, proposals (Tiptap — wraps output in `<p>` tags via `field.onChange`).
- Pattern for react-hook-form fields: needs `watch` and `setValue` destructured from `useForm` (not just `register`) to read/write the field value for the AI button.

## Pre-existing DB gaps (NOT caused by these features)
- `leads` table: `probability`, `expected_close_date`, `source` columns missing from DB
- `projects` table: `priority` column missing from DB
- These cause 500 errors on `/api/leads` and `/api/projects` — needs a DB migration to add columns.

**Why important:** The Sales Pipeline widget on the dashboard shows empty because `/api/leads` returns 500. Running `pnpm -w drizzle-kit push` should add the missing columns.
