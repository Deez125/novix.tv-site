# CineVault Manager

Subscription management for a hosted Plex server. Users subscribe via Stripe, and when they cancel (or payment fails), they automatically get removed from the Plex server.

## Prerequisites

- [Cloudflare account](https://cloudflare.com)
- [Stripe account](https://stripe.com)
- [Supabase project](https://supabase.com)
- Plex account with admin token
- Node.js + npm
- Wrangler CLI: `npm install -g wrangler`

## Setup

### 1. Supabase Database

1. Create a new Supabase project
2. Go to SQL Editor and run the contents of `supabase-schema.sql`
3. Note your project URL, anon key, and service role key from Settings → API

### 2. Stripe Configuration

1. Create a subscription product with a price in Stripe Dashboard → Products
2. Note the price ID (starts with `price_`)
3. Create a webhook endpoint at `https://your-worker.workers.dev/api/webhook/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Note the webhook signing secret

### 3. Plex Token

Get your Plex token:
1. Open Plex Web app and play any media
2. Click `...` → Get Info → View XML
3. Look for `X-Plex-Token` in the URL

Get your server machine identifier:
```
curl -H "X-Plex-Token: YOUR_TOKEN" "https://YOUR_PLEX_URL/identity"
```

### 4. Deploy Worker (Backend)

```bash
cd worker
npm install
wrangler login

# Set all secrets
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

# Deploy
wrangler deploy
```

Generate a strong random string for `ADMIN_API_KEY`:
```bash
openssl rand -hex 32
```

### 5. Deploy Frontend

```bash
cd frontend
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=https://your-worker.workers.dev
VITE_API_KEY=your-admin-api-key
EOF

# Build and deploy
npm run build
wrangler pages deploy dist --project-name cinevault-manager
```

### 6. Post-Deploy

1. Update the Stripe webhook URL to your deployed worker URL
2. Update `FRONTEND_URL` secret to your deployed frontend URL:
   ```bash
   cd worker
   wrangler secret put FRONTEND_URL
   ```

## Local Development

### Worker
```bash
cd worker
npm install
wrangler dev
```

Create a `.dev.vars` file with your secrets for local development.

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Create a `.env` file:
```
VITE_API_URL=http://localhost:8787
VITE_API_KEY=your-dev-api-key
```

## Architecture

```
User cancels subscription
  → Stripe webhook: customer.subscription.deleted
  → Worker updates user status to 'cancelled'
  → Worker calls Plex API to remove friend
  → User loses Plex access immediately
```

### Subscription Statuses
- `pending` - Created but not subscribed
- `active` - Paying subscriber
- `past_due` - Payment failed (not auto-kicked)
- `cancelled` - Subscription ended (auto-kicked)
- `kicked` - Manually removed by admin
