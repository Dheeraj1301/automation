# ProfitPilot

Multi-tenant SaaS for merchants. Built phase-by-phase (see the phase plan) —
through Phase 8 this is: auth, org/team management, a product catalog, a
public storefront, landing pages + lead capture, an AI Sales Agent, and a
mocked workflow engine (n8n), all running locally on Docker.

## What's here

- `frontend/` — Next.js 14 (TypeScript, App Router, Tailwind). The merchant
  dashboard: auth, org switcher, products, landing pages, leads, AI config,
  AI Sales Agent test chat, settings.
- `storefront/` — separate Next.js app: the public-facing catalog site
  (headless, reads the backend's public API), themeable via one config
  object.
- `backend/` — FastAPI. JWT auth, org-scoped REST API, structured JSON
  logging, Anthropic-backed AI Sales Agent, n8n webhook triggers.
- PostgreSQL — all app data, managed with Alembic migrations.
- Redis — wired up but not yet used for anything load-bearing.
- `n8n/` — workflow definitions for the mocked automation engine (Phase 8).

Live third-party integrations (Instagram, WhatsApp, Zoho CRM, real billing)
don't exist yet — those land in later phases behind the mock interfaces
already in place (`backend/app/services/`).

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

## Workflow engine (n8n) — one-time manual setup

Phase 8 adds a self-hosted [n8n](https://n8n.io) instance for automation.
The backend calls n8n's webhooks when a lead is captured; n8n itself is
not auto-provisioned, so after your first `docker compose up`:

1. Open http://localhost:5678 and create the local owner account n8n asks
   for on first run (this stays entirely on your machine — not a live
   n8n.io account).
2. In the n8n UI, **Import from File** and pick each file in
   `n8n/workflows/` (`new-lead-whatsapp.json`, `new-lead-crm.json`).
3. Open each imported workflow and toggle it **Active** (top-right). Until
   a workflow is active, its webhook returns 404 and the backend just logs
   a "trigger failed" warning — lead capture itself is never blocked by
   this.
4. Submit a test lead (storefront Contact page, or a published landing
   page) and check the **Executions** tab in n8n — both workflows should
   show a run with the lead payload, ending in a "MOCK: would send..."
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

## Project structure

```
.
├── docker-compose.yml
├── .env.example
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
└── n8n/workflows/                importable n8n workflow definitions
```

## What's intentionally not here yet

Real billing, real Instagram/WhatsApp/Zoho integrations, and full
end-to-end automation wiring are out of scope until their phase - each is
already stubbed behind a mock service interface in `backend/app/services/`
so swapping in the real thing later won't touch calling code. A live,
public URL also requires Phase 9 (VPS + domain).
