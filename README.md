# Breathe ESG — Data Ingestion Platform

Django REST + React prototype for ingesting SAP, utility, and travel data; normalizing emissions (Scope 1/2/3); and analyst review before audit lock.

**Author:** Tech intern assignment submission for Breathe ESG.

## Assignment deliverables (checklist)

| Deliverable | Location |
|-------------|----------|
| Working deployed app | See [Deployment](#deployment) — live URL goes in submission email |
| Data model doc | [MODEL.md](MODEL.md) |
| Decisions doc | [DECISIONS.md](DECISIONS.md) |
| Tradeoffs doc (3 items) | [TRADEOFFS.md](TRADEOFFS.md) |
| Sources research doc | [SOURCES.md](SOURCES.md) |

**Submission email:** GitHub repo link, live app URL, login credentials. Share the repo with `saurav@breatheesg.com`, `rahul@breatheesg.com`, `shivang@breatheesg.com`.

## What the app does

- **Ingest** three source types via file upload (SAP CSV, utility CSV, travel CSV)
- **Normalize** units and compute kgCO2e using DEFRA-style factors
- **Validate** and flag suspicious rows (thresholds, missing data, estimated reads)
- **Review** dashboard: filter by scope/source/status, approve/reject/flag, lock for audit
- **Audit trail** per record (`ReviewLog`) + immutable raw payloads (`RawRecord`)

Demo tenant: **Suraya Green Industries Pvt Ltd**

## Quick start (local)

From the project root:

```bash
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed
python manage.py runserver
```

Second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — login: `analyst` / `analyst123` (admin: `admin` / `admin123`).

Vite proxies `/api` to the backend in dev; no `VITE_API_URL` needed locally.

## Project layout

```
backend/           Django API, parsers, sample_data/
frontend/          React UI
MODEL.md           Data model (35% of grade)
DECISIONS.md       Design decisions
TRADEOFFS.md       Three deliberate omissions
SOURCES.md         Per-source research and sample data rationale
```

## Demo credentials

| User | Password | Role |
|------|----------|------|
| analyst | analyst123 | Analyst (main demo) |
| admin | admin123 | Django admin |

## Deployment

Use **PostgreSQL** in production (SQLite is local-only). Deploy backend and frontend separately; wire them with env vars.

### Backend (Render example)

1. Push repo to GitHub.
2. Render → **New** → **PostgreSQL** (free) → create DB.
3. Render → **New** → **Web Service** → connect repo.
4. **Root directory:** `backend`
5. **Build command:** `./build.sh` (install deps + collectstatic only — no DB needed)
6. **Start command** (either works):
   - `bash start.sh` — requires `backend/start.sh` committed to git
   - Or one line: `python manage.py migrate --no-input && python manage.py seed && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
7. **Environment** → add:

   | Key | Value |
   |-----|--------|
   | `PYTHON_VERSION` | `3.12.3` (important — avoids Render default 3.14) |
   | `DATABASE_URL` | Link from your Postgres service |
   | `DEBUG` | `False` |
   | `DJANGO_SECRET_KEY` | Generate |
   | `ALLOWED_HOSTS` | `.onrender.com` (or your exact `*.onrender.com` host) |
   | `CORS_ALLOWED_ORIGINS` | Set after frontend deploy |

8. After deploy, note the API URL (e.g. `https://breathe-esg-api.onrender.com`).

`seed` runs on start; re-deploys skip duplicate CSV ingestion if records already exist.

### Frontend (Vercel example)

1. Import repo → **Root directory:** `frontend`
2. **Build:** `npm run build` — **Output:** `dist`
3. Environment variable:  
   `VITE_API_URL=https://your-api.onrender.com` (no trailing slash)
4. Redeploy after changing `VITE_API_URL`.

### Verify production

- Login works
- Dashboard shows ~85 records (after first seed)
- Upload page ingests a sample CSV from `backend/sample_data/`
- Review → open a row → approve → lock
- CORS: if API calls fail in browser, fix `CORS_ALLOWED_ORIGINS`

## API overview

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/token/` | Login (JWT) |
| `POST /api/upload/sap/` | Upload SAP CSV |
| `POST /api/upload/utility/` | Upload utility CSV |
| `POST /api/upload/travel/` | Upload travel CSV |
| `GET /api/records/` | List/filter emission records |
| `POST /api/records/<id>/approve/` | Approve record |
| `POST /api/records/<id>/lock/` | Lock for audit |
| `GET /api/dashboard/` | Summary stats |

## Documentation

- [MODEL.md](MODEL.md) — Multi-tenancy, scopes, audit trail, normalization
- [DECISIONS.md](DECISIONS.md) — Format choices and PM questions
- [TRADEOFFS.md](TRADEOFFS.md) — No real APIs, no OCR, no factor versioning
- [SOURCES.md](SOURCES.md) — SAP / utility / travel research and sample data
