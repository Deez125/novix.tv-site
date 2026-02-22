# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PandaTV - a subscription management system for a hosted Plex server. Users subscribe via Stripe, and when they cancel (or payment fails), they are automatically removed from the Plex server.

**GitHub:** https://github.com/Deez125/PandaTV-Site

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS (deployed to Cloudflare Pages)
- **Backend:** Cloudflare Worker (API + Stripe webhooks + Plex API)
- **Database:** Supabase (PostgreSQL via REST API)
- **Payments:** Stripe subscriptions
- **Plex:** plex.tv REST API (not direct server access)
- **Monitoring:** Tautulli (optional, for user cleanup)

## Project Structure

```
worker/              # Cloudflare Worker backend
  src/index.js       # Main entry point (all routes + business logic)
  wrangler.toml      # Worker config (uses [vars] for local dev)
frontend/            # React admin dashboard
  src/
    lib/api.js       # API client with bearer auth
    components/      # UserTable, AddUserModal, ActivityLog, StatusBadge, DashboardStats
    pages/           # Dashboard, Settings
```

## Development Commands

### Worker (Backend)
```bash
cd worker
npm install
wrangler dev                    # Local development (uses wrangler.toml [vars])
wrangler deploy                 # Deploy to production
wrangler secret put SECRET_NAME # Set production secrets
```

### Frontend
```bash
cd frontend
npm install
npm run dev                     # Local dev server (http://localhost:6969)
npm run build                   # Production build
wrangler pages deploy dist --project-name panda-tv
```

## Architecture

### API Routes

**Public routes (no auth):**
- `POST /api/plex/auth/start` - Start Plex PIN auth flow
- `GET /api/plex/auth/check` - Check if PIN was claimed
- `POST /api/signup` - Customer self-signup with Plex account
- `GET /api/user/subscription` - Get subscription status by plex_user_id
- `GET /api/checkout/success` - Handle successful checkout, invite to Plex
- `POST /api/subscription/change` - Change tier (upgrade/downgrade)
- `POST /api/subscription/cancel` - Cancel subscription
- `POST /api/webhook/stripe` - Stripe webhook (verified via signature)
- `GET /api/health`, `GET /api/stats` - Public status endpoints

**Admin routes (require `Authorization: Bearer {ADMIN_API_KEY}`):**
- `GET/POST /api/users` - List/create users
- `PUT/DELETE /api/users/:id` - Update/delete user
- `POST /api/users/:id/checkout` - Generate Stripe checkout URL
- `POST /api/users/:id/kick` - Manually remove from Plex
- `GET /api/activity` - Activity log
- `GET /api/plex/friends`, `GET /api/plex/libraries` - Plex server info

### Tiered Library Access

Users have different Plex library access based on tier:
- `hd` - Standard HD libraries (configured via `LIBRARY_IDS_HD`)
- `4k` - 4K + HD libraries (configured via `LIBRARY_IDS_4K`)
- `admin` - All libraries (configured via `LIBRARY_IDS_ADMIN`)

Library IDs are local Plex keys (e.g., 1, 3, 4). The worker converts these to plex.tv section IDs when making API calls.

### Core Flow (Auto-Kick)
1. User cancels in Stripe → `customer.subscription.deleted` webhook fires
2. Worker looks up user by `stripe_customer_id` in Supabase
3. Worker sets `subscription_status = 'cancelled'`
4. Worker removes library access, then shared server, then friend relationship
5. Worker removes user from Tautulli (if configured)
6. Activity logged

### Stripe Webhook Events
- `checkout.session.completed` - Activate subscription, set tier from price
- `customer.subscription.created/updated` - Sync status and period end
- `customer.subscription.deleted` - Cancel + remove from Plex
- `invoice.payment_failed` - Set to past_due (no auto-kick)

### Plex API
All calls go to `https://plex.tv` with headers:
```
X-Plex-Token: {PLEX_TOKEN}
X-Plex-Client-Identifier: panda-tv
Accept: application/json
```

Key operations:
- Invite: `POST /api/servers/{machineId}/shared_servers`
- Update libraries: `PUT /api/servers/{machineId}/shared_servers/{shareId}`
- Remove: Delete shared server + friend relationship

### Supabase
Use raw REST API (no SDK in Workers):
- Base: `{SUPABASE_URL}/rest/v1/{table}`
- Headers: `apikey`, `Authorization: Bearer {SERVICE_KEY}`
- Use PostgREST query syntax (e.g., `?stripe_customer_id=eq.cus_xxx`)

### Subscription Statuses
- `pending` - User created, awaiting checkout
- `active` - Paying subscriber
- `past_due` - Payment failed (manual kick decision)
- `cancelled` - Subscription ended (auto-kicked from Plex)
- `kicked` - Manually removed by admin

## Environment Variables

### Worker Variables
For local dev, set in `wrangler.toml` under `[vars]`. For production, use `wrangler secret put`:

**Stripe:**
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `STRIPE_DEFAULT_PRICE_ID`, `STRIPE_PRICE_HD`, `STRIPE_PRICE_4K`

**Supabase:**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`

**Plex:**
- `PLEX_TOKEN`, `PLEX_SERVER_URL`, `PLEX_MACHINE_ID`
- `LIBRARY_IDS_HD`, `LIBRARY_IDS_4K`, `LIBRARY_IDS_ADMIN` (JSON arrays of library keys)

**App:**
- `ADMIN_API_KEY`, `FRONTEND_URL`

**Tautulli (optional):**
- `TAUTULLI_URL`, `TAUTULLI_API_KEY`

### Frontend (via `.env`)
- `VITE_API_URL` - Worker URL (default: http://localhost:8787)
- `VITE_API_KEY` - Admin bearer token

## Design Guidelines

Dark theme dashboard with:
- Background: #0f172a (dark slate)
- Active: emerald green
- Warnings/past_due: amber
- Cancelled/kicked: red
- Monospace font for data, sans-serif for headings
