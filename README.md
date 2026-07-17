# ProfitPilot

Multi-tenant SaaS for merchants. Built phase-by-phase — through Phase 8
this is: auth, org/team management, a product catalog, a public storefront,
landing pages + lead capture, an AI Sales Agent, and a mocked workflow
engine (n8n), all running locally on Docker. Phase 9 adds a production
deployment story (VPS + domain + TLS — see "Deploying to a VPS" below), a
real Zoho CRM integration (see "Zoho CRM integration" below), and two
scalability/hardening changes: lead capture no longer blocks the response
on webhook/CRM calls, and public endpoints are rate-limited.

## What's here

- `frontend/` — Next.js 14 (TypeScript, App Router, Tailwind). The merchant
  dashboard: auth, org switcher, products, landing pages, leads, AI config,
  AI Sales Agent test chat, settings (including Zoho CRM connect).
- `storefront/` — separate Next.js app: the public-facing catalog site
  (headless, reads the backend's public API), themeable via one config
  object.
- `backend/` — FastAPI. JWT auth, org-scoped REST API, structured JSON
  logging, Anthropic-backed AI Sales Agent, n8n webhook triggers, real Zoho
  CRM OAuth integration, Redis-backed rate limiting.
- PostgreSQL — all app data, managed with Alembic migrations.
- Redis — rate limiting on public endpoints (Phase 9); still free for
  future use beyond that.
- `n8n/` — workflow definitions for the mocked automation engine (Phase 8).

Live Instagram/WhatsApp/real billing don't exist yet — those land in later
phases behind the mock interfaces already in place
(`backend/app/services/`). Zoho CRM is real as of Phase 9 (see below).

## Zoho CRM integration (Phase 9)

Each merchant connects their *own* Zoho account from **Dashboard > Settings
> Integrations** — there's no shared platform credential involved in a
merchant's data. Once connected, every new lead (storefront contact form or
a published landing page) is synced to that merchant's Zoho CRM as a Lead
record, in the background (doesn't slow down lead capture either way).

**To turn the feature on at all** (one-time, done by you as the platform
operator, not per-merchant):

1. Register a free OAuth client at https://api-console.zoho.com/ → *Add
   Client* → *Server-based Applications*.
2. Redirect URI must exactly match what the backend derives:
   - Local dev: `http://localhost:8000/api/integrations/zoho/callback`
   - Production: `https://api.<DOMAIN>/api/integrations/zoho/callback`
3. Put the generated Client ID/Secret in `.env` (dev) or `.env.production`
   (prod) as `ZOHO_CLIENT_ID` / `ZOHO_CLIENT_SECRET`.
4. Restart the backend. The "Connect Zoho CRM" button in Settings now
   redirects to a real Zoho consent screen instead of a broken URL.

Until step 3 is done, CRM sync silently stays mocked (logged, never sent) —
nothing else breaks, same as every other not-yet-configured integration in
this codebase.

**How a merchant connects:** Settings → Integrations → "Connect Zoho CRM" →
Zoho's consent screen → redirected back with a connected/error banner.
Tokens are Fernet-encrypted before being stored (`TOKEN_ENCRYPTION_KEY`) and
refreshed automatically ~5 minutes before they'd expire. Disconnecting just
deletes the stored connection — Zoho-side revocation is on the merchant to
do from their own Zoho account if they want it fully severed.

## Prerequisites

- Docker Desktop (with Docker Compose)

## Setup

1. Copy the env template:

   ```bash
   cp .env.example .env
   ```

   The defaults work out of the box for local development — no real
   secrets required for this phase.

2. Start everything:

   ```bash
   docker compose up --build
   ```

   This builds the frontend and backend images, starts Postgres and Redis,
   and runs Alembic migrations automatically before the API starts.

3. Open the app:

   - Frontend: http://localhost:3000
   - Backend API docs: http://localhost:8000/docs
   - Health check: http://localhost:8000/api/health

4. Sign up for an account at http://localhost:3000/signup. This creates a
   user, a personal organization, and an "owner" membership, then logs you
   into the dashboard.

## Workflow engine (n8n)

Phase 8 adds a self-hosted [n8n](https://n8n.io) instance for automation.
The backend calls n8n's webhooks when a lead is captured. Set up the two
workflows with one command — no manual "Import from File" clicking needed:

```bash
docker compose up -d
sh n8n/import-workflows.sh
```

The script waits for n8n's health check, imports both workflows from
`n8n/workflows/` via n8n's own CLI, and restarts n8n so their webhooks
register as active. Until a workflow is active, its webhook returns 404
and the backend just logs a "trigger failed" warning — lead capture is
never blocked by this either way.

To watch executions, open http://localhost:5678 (n8n will ask you to set
a local username/password on first visit — this is your own instance,
nothing external). Then submit a test lead (storefront Contact page, or a
published landing page) and check the **Executions** tab — both workflows
should show a run with the lead payload, ending in a "MOCK: would send..."
console log.

The webhook paths (`new-lead-whatsapp`, `new-lead-crm`) and n8n's base URL
are configurable via `N8N_WEBHOOK_PATH_LEAD_WHATSAPP` /
`N8N_WEBHOOK_PATH_LEAD_CRM` / `N8N_BASE_URL` if you rename things.

## Development notes

- Both `frontend/` and `backend/` are bind-mounted into their containers,
  so code changes hot-reload without rebuilding the image.
- To run a fresh migration after changing a model:

  ```bash
  docker compose exec backend alembic revision --autogenerate -m "describe change"
  docker compose exec backend alembic upgrade head
  ```

- Backend tests: `docker compose exec backend pytest`
- Public lead capture (`POST /api/public/{org_slug}/leads`) responds
  immediately - n8n and Zoho sync run afterward via a FastAPI background
  task, and are rate-limited per IP (`RATE_LIMIT_PUBLIC_LEADS_PER_MINUTE`,
  default 10/min) using the Redis instance already in the stack. Both fail
  open: a Redis outage doesn't 500 the storefront, it just stops limiting.

## Project structure

```
.
├── docker-compose.yml            local dev stack
├── docker-compose.prod.yml       production stack (Phase 9)
├── .env.example                  local dev env template
├── .env.production.example       production env template
├── backend/
│   ├── app/
│   │   ├── main.py            FastAPI app + router registration
│   │   ├── core/               config, security, logging, catalog/ai-agent business logic
│   │   ├── db/                 SQLAlchemy engine/session/base
│   │   ├── models/              org/catalog/marketing/AI-conversation tables
│   │   ├── schemas/            Pydantic request/response models
│   │   ├── api/routes/          auth, organizations, products, public, ai-agent, ...
│   │   └── services/            mock provider interfaces (billing, Instagram, WhatsApp, Zoho, n8n)
│   ├── alembic/                 migrations
│   └── tests/
├── frontend/                    merchant dashboard (Next.js)
├── storefront/                  public catalog site (separate Next.js app)
├── n8n/workflows/                importable n8n workflow definitions
├── nginx/                        reverse proxy config + TLS bootstrap (Phase 9)
└── scripts/                      VPS deploy/backup/renewal scripts (Phase 9)
```

## Deploying to a VPS (Phase 9)

Phase 9 adds a production Docker Compose stack (`docker-compose.prod.yml`)
fronted by nginx with Let's Encrypt TLS, for putting the app on a real
domain. It's a standalone compose file (not an override of the dev one) -
built images instead of bind-mounted source, no dev-only secret defaults,
and internal-only ports for Postgres/Redis/n8n.

### One-time setup on a fresh VPS

1. Point DNS at the VPS: A records for `@`, `www`, `app`, `api`, and
   `automation` subdomains, all to the VPS's IP.
2. Install Docker Engine + Compose plugin on the VPS, then clone this repo.
3. `cp .env.production.example .env.production` and fill in every value -
   see the comments in that file. `JWT_SECRET` and `N8N_ENCRYPTION_KEY` are
   each generated with `openssl rand -hex 32`.
4. Start the data layer first: `docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres redis`
5. Bootstrap TLS certs (handles the chicken-and-egg of nginx needing a cert
   to start but Let's Encrypt needing nginx running to issue one):
   `sh nginx/init-letsencrypt.sh`
6. Bring up everything else: `sh scripts/deploy.sh`
7. Import the n8n workflows against the prod stack:
   `COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production" sh n8n/import-workflows.sh`
8. On the VPS's crontab (`crontab -e`), add daily cert renewal and DB
   backups (see the header comments in each script for the exact lines):
   `scripts/renew-certs.sh` and `scripts/backup-postgres.sh`.

### Routing

- `https://<domain>` / `www.` - public storefront
- `https://app.<domain>` - merchant dashboard
- `https://api.<domain>` - backend API
- `https://automation.<domain>` - n8n editor + webhooks, gated by n8n's own
  basic auth (`N8N_BASIC_AUTH_USER`/`PASSWORD`). Note this does **not**
  cover `/webhook/*` paths - those stay open by design since that's the
  point of a webhook; lead capture still calls them from the backend
  container over the internal network either way.

### Redeploying

After the one-time setup, shipping a new version is just `sh scripts/deploy.sh`
on the VPS (pulls, rebuilds, restarts; Alembic migrations run automatically
on backend startup). Re-running `n8n/import-workflows.sh` is safe any time
workflow JSON changes - it looks up and removes any existing workflow with
the same name before importing, so it never leaves duplicates.

## What's intentionally not here yet

Real billing and real Instagram/WhatsApp are out of scope until their
phase - each is already stubbed behind a mock service interface in
`backend/app/services/` so swapping in the real thing later won't touch
calling code. Zoho CRM is the first of these to go live (Phase 9) - see
"Zoho CRM integration" above.
