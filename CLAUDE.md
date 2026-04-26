# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NovixTV web — companion site + admin dashboard for the Novix Android TV app. Three concurrent surfaces:

1. **Customer site** (Home/Signup/Login/Account) — Supabase-Auth users link Plex / Jellyfin / Emby / IPTV connections to their account.
2. **TV-app pairing + content backend** — `/link` page completes a device-code flow from the TV app; per-user Plex proxy endpoints feed the TV app's home screen.
3. **Operator admin dashboard** (`/admin`) — manage paying Plex subscribers, generate Stripe checkouts, manually kick users.

Naming is inconsistent across the repo (`panda-worker` in [worker/wrangler.toml](worker/wrangler.toml), `novixtv-frontend` in [frontend/package.json](frontend/package.json), "CineVault Manager" in [README.md](README.md), Pages project named `novix-tv` in one doc and `cinevault-manager` in another). Treat the product as **NovixTV** unless touching deploy config — then verify the actual deployed name.

## Tech Stack

- **Frontend** ([frontend/](frontend/)): React 18 + Vite + Tailwind, Cloudflare Pages. Dev server on port 6969.
- **Worker** ([worker/](worker/)): single Cloudflare Worker, monolithic [worker/src/index.js](worker/src/index.js) (~2.3k lines — all handlers, helpers, and the route table live in one file).
- **Database**: Supabase Postgres. Worker uses raw PostgREST (no SDK); frontend uses `@supabase/supabase-js` for auth + RLS-protected reads.
- **Payments**: Stripe (operator subscription side only — see "Two parallel models").

## Development Commands

```bash
# Worker
cd worker && wrangler dev                    # http://localhost:8787 (uses [vars] in wrangler.toml + .dev.vars for secrets)
cd worker && wrangler deploy
cd worker && wrangler secret put SECRET_NAME

# Frontend
cd frontend && npm run dev                   # http://localhost:6969
cd frontend && npm run build
cd frontend && wrangler pages deploy dist --project-name <pages-project-name>

# Stripe webhook testing
stripe listen --forward-to localhost:8787/api/webhook/stripe
```

No tests, no linter config — manual testing only.

## Architecture: Two parallel user models live in this repo

This is the most important thing to understand before editing the worker. There are **two unrelated user models** that both exist in the codebase:

### Model A — Supabase-Auth users (customer site + TV app)

- `users` table is keyed to `auth.users` via `auth_id`. Created automatically by the `handle_new_user` trigger on signup ([supabase-schema.sql:222](supabase-schema.sql#L222)).
- Connection tables (`plex_connections`, `jellyfin_connections`, `emby_connections`, `iptv_connections`) hold per-user credentials/tokens. RLS scoped to `auth.uid()`.
- `subscription_tier` is just `'free' | 'basic'` (CHECK constraint).
- Frontend auth in [frontend/src/lib/auth.jsx](frontend/src/lib/auth.jsx) (`AuthProvider`).
- Worker authenticates these users by validating their Supabase JWT (`getAuthenticatedUser` helper) on `/api/plex/featured`, `/recently-added`, `/continue-watching`, and `/api/device/activate`.
- The Plex proxy endpoints hit **the user's own Plex server** (`plex_connections.plex_server_url` + `plex_token`), not the operator's.

### Model B — Stripe-billed Plex subscribers (`/admin` dashboard, legacy)

- Assumes a `users` table with `stripe_customer_id`, `plex_user_id`, `subscription_status` (`pending`/`active`/`past_due`/`cancelled`/`kicked`), and a separate `activity_log` table.
- **None of those columns or that table exist in the current [supabase-schema.sql](supabase-schema.sql).** The admin routes will fail unless that schema is restored. Treat this as an unmigrated legacy surface — verify the live DB before working on admin endpoints.
- Auto-kick flow: Stripe webhook `customer.subscription.deleted` → operator's `PLEX_TOKEN` removes the user's library access, then their shared-server entry, then the friend relationship; optionally deletes from Tautulli; logs to `activity_log`.
- Tier-based library access via `LIBRARY_IDS_HD` / `LIBRARY_IDS_4K` / `LIBRARY_IDS_ADMIN` env vars (JSON arrays of local Plex library keys; Worker converts to plex.tv section IDs). These tier names (`hd`/`4k`/`admin`) are **independent** of Model A's `'free' | 'basic'`.
- Admin-route auth: `Authorization: Bearer {ADMIN_API_KEY}` (`requireAuth` helper).

When adding features, identify which model you're in. Customer-facing site or TV app → Model A. Admin dashboard or Stripe webhook → Model B.

## TV App Device Pairing Flow

1. TV app calls `POST /api/device/code` → worker generates a short code, stores in `device_auth_codes`.
2. TV app polls `GET /api/device/poll?code=...`.
3. User opens `/link` on the website (logged in via Supabase Auth), enters the code, frontend calls `POST /api/device/activate`.
4. Worker marks the row `activated=true` and attaches `user_id` + a generated `auth_token` (UUID).
5. Next poll returns the auth_token; TV app stores it and uses it for subsequent calls.

## Worker Route Map

Routing is a flat if/else chain at [worker/src/index.js:2113](worker/src/index.js#L2113). Three auth tiers, checked in order:

**Public** (no auth):
- `/api/health`, `/api/stats`
- `/api/webhook/stripe` (signature-verified inside handler)
- `/api/plex/auth/{start,check}`, `/api/plex/servers`, `/api/plex/save-server`
- `/api/device/{code,poll,activate}`
- `/api/signup`, `/api/user/subscription`, `/api/checkout/success`, `/api/subscription/{change,cancel}`
- `/api/jellyfin/auth`, `/api/emby/auth` — proxy auth to work around browser CORS against self-hosted servers

**Supabase JWT required** (Model A — checked inside each handler via `getAuthenticatedUser`):
- `/api/plex/{featured,recently-added,continue-watching}`

**Admin bearer required** (Model B — gate at [worker/src/index.js:2210](worker/src/index.js#L2210)):
- `/api/users` (CRUD), `/api/users/:id/{checkout,kick}`
- `/api/activity`, `/api/plex/{friends,libraries}`

CORS is wide open (`Access-Control-Allow-Origin: *`).

## Supabase Conventions

- Worker calls Supabase via PostgREST: `${SUPABASE_URL}/rest/v1/<table>?<filter>` with `apikey` + `Authorization: Bearer SERVICE_KEY`. Filters use PostgREST syntax (`?id=eq.${id}`).
- For single-row reads, pass `single: true` to the `supabase()` helper — it sets `Accept: application/vnd.pgrst.object+json` so PostgREST returns an object, not an array.
- All tables have RLS enabled; Worker bypasses with the service key, frontend reads honor RLS via the anon key.
- Schema changes go in [supabase-schema.sql](supabase-schema.sql) (full reset — drops tables) or as additive migration files like [add-plex-server-columns.sql](add-plex-server-columns.sql).

## Plex API Notes

Two distinct Plex API surfaces are used:

- **plex.tv** (operator-managed sharing) — `https://plex.tv` with `X-Plex-Token: PLEX_TOKEN` (operator's token), client identifier `novix-tv`. Used by Model B for invite/share/kick.
  - Invite: `POST /api/servers/{machineId}/shared_servers`
  - Update libraries: `PUT /api/servers/{machineId}/shared_servers/{shareId}`
  - Remove: delete shared server + friend relationship
- **User's own Plex Media Server** (Model A) — direct fetch to `plex_connections.plex_server_url` with that user's `plex_token`. Used by the TV-app proxy endpoints to fetch library content.

Episode handling in the proxy endpoints is non-obvious: use `grandparentTitle` + `grandparentArt` + `grandparentThumb` instead of episode-level fields, and fall back to fetching the show's metadata for genres/logos. Canonical pattern at [worker/src/index.js:1734](worker/src/index.js#L1734) (`handleGetPlexFeatured`).

## Environment Variables

**Worker** — set in `wrangler.toml [vars]` for dev, `wrangler secret put` for prod:

- Stripe (Model B): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_DEFAULT_PRICE_ID`, `STRIPE_PRICE_HD`, `STRIPE_PRICE_4K`
- Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- Plex (Model B operator side): `PLEX_TOKEN`, `PLEX_SERVER_URL`, `PLEX_MACHINE_ID`, `LIBRARY_IDS_HD`, `LIBRARY_IDS_4K`, `LIBRARY_IDS_ADMIN`
- App: `ADMIN_API_KEY`, `FRONTEND_URL`
- Tautulli (optional, Model B cleanup): `TAUTULLI_URL`, `TAUTULLI_API_KEY`

**Frontend** ([frontend/.env](frontend/.env)):
- `VITE_API_URL` (worker URL, defaults to `http://localhost:8787`)
- `VITE_API_KEY` (admin bearer for the admin dashboard)
- Supabase URL/anon key (in [frontend/src/lib/supabase.js](frontend/src/lib/supabase.js))

## Known Issues

See [TODO.md](TODO.md). Notably:
- Tautulli `delete_user` returns 403 from the Worker (works from curl) — likely a network path issue from Cloudflare edge to the Tautulli host.
- Plex invite logs a harmless XML-parse error and an "already sharing" error when the success page is hit twice.

## Design

Dark theme. Background `#0f172a` (slate-950). Accents: violet for headings, emerald for active subscribers, amber for `past_due`, red for `cancelled`/`kicked`. Monospace for data tables, sans-serif elsewhere.
