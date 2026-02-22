# CineVault Manager - Build Specification

## Project Overview

Build a web application called **CineVault Manager** that manages subscriptions for a hosted Plex server. Users subscribe via Stripe, and when they cancel (or payment fails), they automatically get removed from the Plex server. The admin (me) manages everything from a dashboard.

## Tech Stack

- **Frontend:** React (deployed to Cloudflare Pages)
- **Backend:** Cloudflare Worker (API + Stripe webhooks + Plex API calls)
- **Database:** Supabase (PostgreSQL)
- **Payments:** Stripe (subscriptions, checkout sessions, webhooks)
- **Plex Integration:** plex.tv REST API for managing shared users

## Project Structure

```
cinevault-manager/
├── worker/                    # Cloudflare Worker (backend API)
│   ├── src/
│   │   └── index.js           # Main worker entry point
│   ├── wrangler.toml
│   └── package.json
├── frontend/                  # React app (Cloudflare Pages)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── lib/
│   │   │   └── api.js         # API client helper
│   │   ├── components/
│   │   │   ├── UserTable.jsx
│   │   │   ├── AddUserModal.jsx
│   │   │   ├── ActivityLog.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── DashboardStats.jsx
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       └── Settings.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── supabase-schema.sql        # Database schema
└── README.md
```

## Database Schema (Supabase)

Create a file `supabase-schema.sql` with these tables:

### `users` table
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| display_name | TEXT NOT NULL | Friendly name |
| email | TEXT UNIQUE NOT NULL | For Stripe |
| plex_username | TEXT NOT NULL | Their Plex username or email |
| plex_user_id | TEXT | Plex account ID (populated after linking) |
| tier | TEXT | 'hd' or '4k' (default 'hd') |
| stripe_customer_id | TEXT | Stripe customer ID |
| stripe_subscription_id | TEXT | Stripe subscription ID |
| subscription_status | TEXT | 'pending', 'active', 'past_due', 'cancelled', 'kicked' (default 'pending') |
| current_period_end | TIMESTAMPTZ | When current billing period ends |
| library_ids | JSONB | Array of Plex library section IDs they have access to (default '[]') |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto |

### `activity_log` table
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK → users) | ON DELETE SET NULL |
| action | TEXT NOT NULL | e.g. 'plex_removed', 'payment_failed', 'subscription_started', 'manual_kick' |
| details | TEXT | Human readable description |
| created_at | TIMESTAMPTZ | Auto |

Add indexes on: `users.stripe_customer_id`, `users.subscription_status`, `users.plex_username`, `activity_log.user_id`, `activity_log.created_at DESC`.

Enable RLS on both tables with a permissive policy for the service role.

---

## Cloudflare Worker (Backend API)

### Environment Variables (Secrets)

These will be set via `wrangler secret put`:

- `STRIPE_SECRET_KEY` - Stripe secret API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `PLEX_TOKEN` - My Plex admin token
- `PLEX_SERVER_URL` - Happyville Plex server URL (e.g., `https://xxx.plex.direct:32400`)
- `PLEX_MACHINE_ID` - Plex server machine identifier
- `ADMIN_API_KEY` - Simple bearer token for admin dashboard auth
- `STRIPE_DEFAULT_PRICE_ID` - Default Stripe subscription price ID
- `FRONTEND_URL` - Frontend URL for Stripe checkout redirects

### Dependencies

- `stripe` (npm) — Stripe SDK has native Cloudflare Worker support now
- Use `Stripe.createFetchHttpClient()` and `Stripe.createSubtleCryptoProvider()` for Worker compatibility

### wrangler.toml

```toml
name = "cinevault-manager-api"
main = "src/index.js"
compatibility_date = "2024-12-01"
node_compat = true
```

### API Routes

All routes except the Stripe webhook require `Authorization: Bearer {ADMIN_API_KEY}` header.

#### Stripe Webhook
**`POST /api/webhook/stripe`** — No auth (verified via Stripe signature)

Handle these events:

1. **`checkout.session.completed`** — New subscriber completed checkout
   - Look up user by `metadata.user_id` from the session
   - Set their `stripe_customer_id` and `subscription_status = 'active'`
   - Log activity: "Subscription activated via checkout"

2. **`customer.subscription.created`** and **`customer.subscription.updated`**
   - Find user by `stripe_customer_id`
   - Update `subscription_status` based on Stripe status (map 'active'/'trialing' → 'active')
   - Store `stripe_subscription_id` and `current_period_end`

3. **`customer.subscription.deleted`** — **THIS IS THE KEY ONE**
   - Find user by `stripe_customer_id`
   - Set `subscription_status = 'cancelled'`
   - **Call Plex API to remove the friend** using their `plex_user_id`
   - Log activity: "Removed from Plex - subscription cancelled"
   - If Plex removal fails, log the error but still mark as cancelled

4. **`invoice.payment_failed`**
   - Find user by `stripe_customer_id`
   - Set `subscription_status = 'past_due'`
   - Log activity with invoice ID

#### User Management
- **`GET /api/users`** — List all users (ordered by created_at desc)
- **`POST /api/users`** — Create user. Body: `{ display_name, email, plex_username, tier }`
- **`PUT /api/users/:id`** — Update user fields
- **`DELETE /api/users/:id`** — Delete user (also remove from Plex if they have a plex_user_id)

#### Actions
- **`POST /api/users/:id/checkout`** — Generate a Stripe Checkout session URL for this user
  - Creates a Stripe customer if one doesn't exist
  - Returns `{ checkout_url }` that I can send to the friend
  - Uses `metadata.user_id` so the webhook can link back
- **`POST /api/users/:id/kick`** — Manually remove user from Plex
  - Calls Plex removeFriend API
  - Sets status to 'kicked', clears plex_user_id
  - Logs activity

#### Info Endpoints
- **`GET /api/activity`** — Get last 50 activity log entries (join with users for display_name)
- **`GET /api/plex/friends`** — List current Plex friends from plex.tv API
- **`GET /api/plex/libraries`** — List Plex server libraries
- **`GET /api/health`** — Simple health check

### Plex API Integration

All Plex API calls go to `https://plex.tv` (not the server directly) and need these headers:
```
X-Plex-Token: {PLEX_TOKEN}
X-Plex-Client-Identifier: cinevault-manager
Accept: application/json
```

Key endpoints:
- **Get friends:** `GET https://plex.tv/api/v2/friends`
- **Remove friend:** `DELETE https://plex.tv/api/v2/friends/{plex_user_id}` (200/204 = success)
- **Invite friend:** `POST https://plex.tv/api/v2/shared_servers` with body containing `machineIdentifier`, `invitedEmail`, and optionally `librarySectionIds`
- **Update friend libraries:** `PUT https://plex.tv/api/v2/shared_servers/{id}` with `librarySectionIds`

### Supabase Integration

Use raw REST API calls (no SDK needed in Workers):
- Base URL: `{SUPABASE_URL}/rest/v1/{table}`
- Headers: `apikey: {SUPABASE_ANON_KEY}`, `Authorization: Bearer {SUPABASE_SERVICE_KEY}`
- Use PostgREST query syntax for filters (e.g., `?stripe_customer_id=eq.cus_xxx`)
- Set `Prefer: return=representation` header for mutations to get data back

### CORS

Add CORS headers to all responses:
```
Access-Control-Allow-Origin: * (or lock to frontend domain in production)
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

Handle OPTIONS preflight requests.

---

## React Frontend (Admin Dashboard)

### Setup

- Vite + React
- Tailwind CSS for styling
- No React Router needed (single page is fine for now)

### Design Direction

Dark theme dashboard. Think: a sleek server management panel. Color scheme: dark slate background (#0f172a), with emerald green accents for active status, amber for warnings/past due, red for cancelled/kicked. Clean, functional, no frills — this is a tool, not a marketing site. Use a monospace font for data/stats and a clean sans-serif for headings.

### API Client (`src/lib/api.js`)

Create a helper module that:
- Has a configurable `API_BASE` URL (the Worker URL)
- Has a configurable `API_KEY` (the admin bearer token)
- Wraps fetch calls with the auth header
- Exports functions: `getUsers()`, `createUser(data)`, `updateUser(id, data)`, `deleteUser(id)`, `createCheckout(id, priceId)`, `kickUser(id)`, `getActivity()`, `getPlexFriends()`, `getPlexLibraries()`

**Important:** The API_BASE and API_KEY should be configurable. For now, use environment variables via Vite (`VITE_API_URL` and `VITE_API_KEY`).

### Dashboard Layout

Single page with these sections:

#### Stats Bar (top)
- Total users count
- Active subscribers count
- Past due count
- Cancelled/kicked count

#### User Table (main content)
Columns: Name, Email, Plex Username, Tier (HD/4K), Status, Billing Period End, Actions

**Status** should be a colored badge:
- active = green
- pending = gray
- past_due = amber/yellow
- cancelled = red
- kicked = dark red

**Actions** per row:
- "Send Checkout Link" button (only if status is 'pending') — calls createCheckout, then copies the URL to clipboard
- "Kick" button (only if status is 'active' or 'past_due') — confirms, then kicks from Plex
- "Delete" button — confirms, then deletes user entirely
- "Edit" — inline or modal edit for display_name, email, plex_username, tier

#### Add User Form/Modal
Fields: Display Name, Email, Plex Username, Tier (dropdown: HD / 4K)
On submit, creates the user via API.

#### Activity Log (bottom section)
Shows recent activity in a scrollable list. Each entry shows: timestamp, user name, action description. Color-coded by action type (red for kicks/removals, green for subscriptions, yellow for payment failures).

### Config / Settings Section

A simple section (can be a collapsible panel or tab) where the admin can see/verify:
- Worker URL (API health check — call `/api/health` and show status)
- Number of Plex friends currently shared (call `/api/plex/friends` and count)
- List of Plex libraries on the server (call `/api/plex/libraries`)

---

## Setup Instructions (README.md)

Write a clear README with:

### Prerequisites
- Cloudflare account
- Stripe account
- Supabase project
- Plex account with admin token
- Node.js + npm
- Wrangler CLI (`npm install -g wrangler`)

### Step-by-step Setup

1. **Supabase** — Create project, run the `supabase-schema.sql` in SQL editor, grab the URL, anon key, and service role key.

2. **Stripe** — Create a subscription product/price in Stripe dashboard. Note the price ID. Set up a webhook endpoint pointing to `https://your-worker.workers.dev/api/webhook/stripe` with events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Grab the webhook signing secret.

3. **Plex Token** — Explain how to get it: Open Plex web → play something → click ... → Get Info → View XML → grab `X-Plex-Token` from URL. Also explain getting machine identifier from `{PLEX_URL}/identity`.

4. **Worker Deployment**
   ```bash
   cd worker
   npm install
   wrangler login
   # Set all secrets:
   wrangler secret put STRIPE_SECRET_KEY
   wrangler secret put STRIPE_WEBHOOK_SECRET
   wrangler secret put SUPABASE_URL
   wrangler secret put SUPABASE_ANON_KEY
   wrangler secret put SUPABASE_SERVICE_KEY
   wrangler secret put PLEX_TOKEN
   wrangler secret put PLEX_SERVER_URL
   wrangler secret put PLEX_MACHINE_ID
   wrangler secret put ADMIN_API_KEY
   wrangler secret put STRIPE_DEFAULT_PRICE_ID
   wrangler secret put FRONTEND_URL
   wrangler deploy
   ```

5. **Frontend Deployment**
   ```bash
   cd frontend
   npm install
   # Create .env with:
   # VITE_API_URL=https://your-worker.workers.dev
   # VITE_API_KEY=your-admin-api-key
   npm run build
   wrangler pages deploy dist --project-name cinevault-manager
   ```

6. **Update Stripe webhook URL** — After deploying the worker, update the webhook endpoint URL in Stripe dashboard.

7. **Update FRONTEND_URL** — After deploying frontend, set the FRONTEND_URL secret in the worker to match.

---

## Key Behavior: The Auto-Kick Flow

This is the most important flow in the whole app:

```
Friend cancels subscription in Stripe
  → Stripe fires `customer.subscription.deleted` webhook
  → Worker receives it at POST /api/webhook/stripe
  → Worker looks up user in Supabase by stripe_customer_id
  → Worker sets subscription_status = 'cancelled'
  → Worker calls DELETE https://plex.tv/api/v2/friends/{plex_user_id}
  → Friend loses access to the Plex server immediately
  → Activity log records: "Removed from Plex - subscription cancelled"
```

Similar flow for `invoice.payment_failed`, except status becomes 'past_due' and we DON'T auto-kick (give them a chance to fix payment). The admin can manually kick past_due users from the dashboard.

---

## Notes

- The Plex server is a hosted/managed service called Happyville. The server name is "The CineVault". I don't have direct server access, but my Plex token has full API access (confirmed from previous Kometa setup work).
- This is Phase 1. Future phases will add: auto-invite to Plex on subscription start, library tier management (HD users get HD libraries, 4K users get 4K + HD), and a subscriber-facing portal where friends can see their own status.
- For now, I'll manually add users to the dashboard and send them checkout links. The webhook handles everything after that.
- Keep the code clean and well-commented. I'll be iterating on this.
