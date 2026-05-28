# Breathe ESG — Data Ingestion Prototype

A small full-stack app for onboarding enterprise emissions data: upload files from three messy sources, normalize them into comparable records, and let an analyst review and sign off before anything is locked for audit.

Built with Django REST and React as part of the Breathe ESG tech intern assignment.

## What it does

Enterprise clients keep fuel, electricity, and travel data in different systems and formats. This prototype accepts those exports as CSV uploads, parses the quirks (German SAP headers, non-calendar billing periods, missing flight distances), assigns GHG scopes, estimates CO₂e, and puts everything in one review queue.

An analyst can see what came in, what failed parsing, what looks suspicious, and approve or reject rows. Approved records can be locked so they stay auditable.

**Sources handled**

| Source | How data arrives | Scope |
|--------|------------------|-------|
| SAP (fuel & procurement) | Flat-file CSV export | 1 and 3 |
| Utility (electricity) | Portal CSV export | 2 |
| Corporate travel | Concur-style CSV export | 3 |

Sample files live in `backend/sample_data/` if you want to try uploads without preparing your own.

## Stack

- **Backend:** Django, Django REST Framework, PostgreSQL (SQLite for local dev), pandas
- **Frontend:** React, Vite, Tailwind CSS, TanStack Table, Recharts

## Running locally

**Backend** (from project root):

```bash
python3 -m venv venv
source venv/bin/activate
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed
python manage.py runserver
```

**Frontend** (separate terminal):

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The dev server proxies API calls to Django on port 8000.

**Demo login**

| Username | Password |
|----------|----------|
| `analyst` | `analyst123` |
| `admin` | `admin123` |

The seed command creates a demo tenant (**Suraya Green Industries Pvt Ltd**) and loads the three sample CSVs (~85 emission records).

## Repository layout

```
backend/          API, models, parsers, sample_data/
frontend/         React app
MODEL.md          Data model and rationale
DECISIONS.md      Design choices and open questions
TRADEOFFS.md      What was intentionally not built
SOURCES.md        Research notes per data source
```

The four markdown files above are part of the assignment write-up. Start with `MODEL.md` if you want to understand how tenancy, raw data, normalization, and the audit trail fit together.

## Author

Aryan Kamal — Breathe ESG tech intern assignment.
