# Data Model

## Overview

The data model is designed around three principles:

1. **Immutable raw data** — every ingested row is preserved verbatim in `RawRecord`, never modified after creation.
2. **Normalized canonical records** — `EmissionRecord` is the single source of truth for normalized emissions, always linked back to its raw origin.
3. **Append-only audit trail** — every status change is logged in `ReviewLog`, providing a complete history for auditors.

## Entity Relationship Diagram

```
Tenant
  ├── TenantMembership → User (Django auth)
  ├── DataSource
  │     ├── RawRecord (verbatim ingested rows)
  │     └── EmissionRecord (normalized, computed)
  │           └── ReviewLog (append-only audit entries)
  ├── EmissionFactor (lookup table)
  └── UnitConversion (lookup table)
```

## Tables

### Tenant
| Field       | Type         | Purpose |
|-------------|-------------|---------|
| id          | UUID (PK)   | Immutable identifier |
| name        | varchar(255)| Client company name |
| industry    | varchar(100)| For context in emission factor selection |
| created_at  | timestamp   | When onboarded |

Multi-tenancy is enforced at the application layer: every query filters by the requesting user's tenant. This is simpler than schema-per-tenant and sufficient for a platform where tenants don't share data.

### TenantMembership
Links Django `User` to `Tenant` with a role (`admin`, `analyst`, `viewer`). A user belongs to exactly one tenant in this prototype. The join table exists so the model can extend to multi-tenant users later without migration pain.

### DataSource
| Field         | Type         | Purpose |
|---------------|-------------|---------|
| id            | UUID (PK)   | |
| tenant        | FK → Tenant | Isolation |
| source_type   | enum (sap/utility/travel) | Which parser handled this file |
| file_name     | varchar     | Original filename for traceability |
| uploaded_by   | FK → User   | Who initiated the upload |
| uploaded_at   | timestamp   | When |
| status        | enum (processing/completed/failed) | Ingestion outcome |
| row_count     | int         | Total rows parsed |
| error_count   | int         | Rows that failed parsing |
| error_summary | JSONB       | Structured parse errors |

One `DataSource` per file upload. This is the "which source produced this data" tracking the assignment requires.

### RawRecord
| Field        | Type    | Purpose |
|-------------|---------|---------|
| id          | UUID (PK) | |
| source      | FK → DataSource | Which upload this came from |
| row_number  | int     | Position in the original file |
| raw_payload | JSONB   | Verbatim row data, never modified |
| parse_status| enum    | ok / error |
| parse_errors| JSONB   | List of parse-time errors |

The raw payload is stored as JSONB to accommodate any column structure across SAP, utility, and travel formats. This table is **never updated after creation** — it's the source-of-truth for what was actually in the file.

### EmissionRecord
| Field                | Type            | Purpose |
|---------------------|-----------------|---------|
| id                  | UUID (PK)       | |
| tenant              | FK → Tenant     | Multi-tenancy |
| source              | FK → DataSource | Provenance |
| raw_record          | OneToOne → RawRecord | Link to original data |
| scope               | int (1/2/3)     | GHG Protocol scope |
| category            | enum            | Activity category |
| activity_description| varchar         | Human-readable description |
| original_quantity   | decimal         | As-parsed value |
| original_unit       | varchar         | Unit from the source file |
| normalized_quantity | decimal         | Converted to standard unit |
| normalized_unit     | varchar         | Standard unit (L, kWh, km) |
| emission_factor_used| decimal         | Factor applied (kgCO2e/unit) |
| co2e_kg             | decimal         | Computed emissions |
| period_start        | date            | Activity period start |
| period_end          | date            | Activity period end |
| status              | enum            | Workflow state (see below) |
| is_suspicious       | boolean         | Flagged by validation engine |
| suspicion_reasons   | JSONB           | Why it was flagged |
| reviewed_by         | varchar         | Username of reviewer |
| reviewed_at         | timestamp       | When reviewed |

**Scope assignment logic:**
- SAP fuel purchases → Scope 1 (direct combustion)
- SAP procurement (non-fuel) → Scope 3, Category 1 (purchased goods & services)
- Utility electricity → Scope 2 (purchased electricity)
- Corporate travel → Scope 3, Category 6 (business travel)

**Status workflow:**
```
PENDING → VALIDATED → APPROVED → LOCKED
                ↘ SUSPICIOUS ↗       (immutable)
                      ↘ REJECTED
```

- **Pending**: just ingested, not yet validated
- **Validated**: passed all validation checks
- **Suspicious**: flagged by threshold-based anomaly detection
- **Approved**: analyst has reviewed and signed off
- **Rejected**: analyst has marked as invalid
- **Locked**: approved and locked for audit — immutable, cannot be changed

### ReviewLog
| Field      | Type         | Purpose |
|-----------|-------------|---------|
| id        | UUID (PK)   | |
| record    | FK → EmissionRecord | Which record was acted on |
| action    | varchar     | What happened |
| old_status| varchar     | Status before |
| new_status| varchar     | Status after |
| changed_by| varchar     | Who did it |
| comment   | text        | Optional reviewer note |
| timestamp | timestamp   | When |

Append-only. Never updated or deleted. This is the audit trail auditors need: who changed what, when, and why.

### Source-of-truth and “was it edited?”

| Question | How the model answers it |
|----------|---------------------------|
| Which source produced this row? | `EmissionRecord.source` → `DataSource` (type, file name, upload time, uploader) |
| What did the file actually say? | `RawRecord.raw_payload` (immutable JSONB, never updated) |
| When was it ingested? | `DataSource.uploaded_at`, `RawRecord.created_at` |
| Was it edited after ingestion? | **Raw data:** no — `RawRecord` is write-once. **Review decisions:** yes — every approve/reject/flag/lock is logged in `ReviewLog` with user and timestamp. **Normalized field values** (quantity, CO2e): not editable in the UI in this prototype; only workflow status changes. Field-level edit diffs could be added to `ReviewLog` in production. |

### EmissionFactor
Lookup table mapping (activity_type, fuel/category, unit) → kgCO2e per unit. Factors sourced from DEFRA 2024 and US EPA. Versioned by year so factors can be updated without retroactively changing historical calculations.

### UnitConversion
Maps messy real-world unit strings (e.g., "Ltr", "kubikmeter", "Liters") to canonical units with a multiplier. Keeps the normalization logic transparent and auditable rather than buried in code.

## Why These Choices

**JSONB for raw_payload**: SAP exports have different columns than utility CSVs. Rather than creating three separate raw tables with rigid schemas, a single JSONB column handles any shape. The tradeoff is you can't do SQL queries on individual raw fields efficiently, but that's acceptable — queries operate on the normalized `EmissionRecord`, not raw data.

**UUID primary keys**: prevents enumeration attacks and makes it safe to expose IDs in URLs/APIs without leaking information about record counts.

**Separate RawRecord from EmissionRecord**: the assignment specifically asks for source-of-truth tracking. By keeping raw data in its own immutable table, we guarantee the original data is always recoverable regardless of how many times the normalized record is updated or reviewed.

**Indexed on (tenant, status) and (tenant, scope)**: the two most common query patterns are "show me all pending records for this tenant" and "show me Scope 1 emissions for this tenant."
