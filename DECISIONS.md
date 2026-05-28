# Decisions

Every ambiguity I encountered and how I resolved it. Organized by source, then by system-level decisions.

## SAP Source

**Format: flat-file CSV export from SE16/ME2M, not IDoc or OData.**
Most mid-market SAP clients export data via transaction SE16 (table display) or ME2M (purchase order list) as tab/CSV flat files. IDoc requires middleware (SAP PI/PO), OData requires enabling specific services on the SAP side. A facilities or procurement team handing data to a carbon platform will almost always provide a flat-file export because it requires no IT involvement. I chose this because it's the most realistic format a PM would actually receive.

**German column headers with English mapping.**
SAP installations in German-speaking regions default to German field labels. Rather than requiring clients to reconfigure SAP, the parser includes a header mapping table (`Menge` → `quantity`, `Werk` → `plant_code`, etc.). This is a realistic real-world concern that most ESG platforms handle with configurable column mappings.

**Date format: DD.MM.YYYY.**
SAP's default date format in German locales. The parser tries multiple formats in order: DD.MM.YYYY, YYYY-MM-DD, MM/DD/YYYY, YYYYMMDD.

**Fuel vs. procurement classification by material description keyword matching.**
In a real deployment, you'd maintain a material-to-category mapping table maintained by the client. For the prototype, I use keyword detection on the material description (e.g., "Diesel", "Erdgas" → fuel → Scope 1; everything else → purchased goods → Scope 3). I'd ask the PM: "Does the client have a material master classification we can use, or do we need to build a mapping workflow?"

**Plant code lookup as a static dictionary.**
In production, this would be a configurable mapping table per tenant. The prototype hardcodes 8 plant codes → facility names.

## Utility Source

**Format: CSV portal export, not PDF bill or utility API.**
PDF bills require OCR, which is unreliable for a prototype and adds a large dependency. Utility APIs vary by provider and most don't offer one. CSV portal exports are the realistic middle ground — most utility portals (ConEdison, PG&E, EDF) offer a "Download Usage" CSV. I'd ask the PM: "Which utility providers does this client use? Do any of them provide an API, or is the facilities team downloading CSVs?"

**Billing periods that don't align with calendar months.**
Real utility bills are based on meter read dates, not month boundaries. A January bill might cover Jan 5 to Feb 3. The model stores `period_start` and `period_end` as separate date fields rather than a single "month" field to handle this correctly.

**kWh as the canonical unit for electricity.**
MWh and GWh are converted to kWh using simple multipliers. kWh is the most granular standard unit and avoids floating-point issues from dividing small values.

**Estimated vs. actual meter readings flagged as suspicious.**
Utilities sometimes estimate reads between actual meter visits. The parser detects the read type and flags estimated readings as suspicious, since estimated data may need to be revised later.

## Travel Source

**Format: CSV report export modeled on SAP Concur.**
Concur dominates enterprise travel management. Their standard report export is a CSV with columns for employee, travel type, origin, destination, class, cost. The Concur API requires OAuth and a partner certification process — unrealistic for a 4-day prototype. I'd ask the PM: "Does the client use Concur? Can we get a sample report export from their travel admin?"

**Haversine distance estimation from IATA codes when distance is missing.**
Concur exports often include origin/destination airport codes but not distance. The parser includes a lookup table of 30 major IATA airport coordinates and computes great-circle distance using the haversine formula. This is flagged as "distance_estimated" and marked suspicious so an analyst can review it. I'd ask the PM: "Is there a preferred distance database, or should we use great-circle with a correction factor?"

**Travel class affects emission factors.**
A business class seat has ~3x the carbon footprint of economy due to the space consumed. The parser extracts travel class and the emission calculator uses class-specific factors from DEFRA.

**Hotel nights as a quantity, not distance.**
Hotel emissions are per-night based on average hotel energy consumption. When the distance column contains a small number (e.g., "3") for a hotel row, it's interpreted as the number of nights.

## System-Level Decisions

**SQLite for development, PostgreSQL for production.**
The assignment requires deployment. SQLite works for local dev; the `dj-database-url` library allows switching to PostgreSQL via a single environment variable, which is what the deployed version uses.

**JWT authentication instead of session-based.**
The frontend and backend are deployed as separate services (different origins). JWT avoids the complexity of shared session cookies across domains. SimpleJWT handles token refresh transparently.

**Single upload endpoint per source type instead of one generic endpoint.**
`POST /api/upload/sap/`, `/api/upload/utility/`, `/api/upload/travel/` — each endpoint knows which parser to invoke. This makes the API self-documenting and avoids ambiguity about which parser handles which file.

**Validation as a dedicated layer, not embedded in parsers.**
Parsers extract data; validators check it. Separating these concerns means you can add new validation rules (e.g., "flag if CO2e exceeds last month by 200%") without touching parser code.

**Threshold-based anomaly detection, not ML.**
Simple threshold rules (e.g., "quantity exceeds 500,000 L for stationary combustion → suspicious") are transparent, explainable, and auditable. ML-based anomaly detection is a black box that auditors can't verify. For an ESG platform where auditability is a legal requirement, explainable rules are the right choice.

**Emission factors hardcoded in a Python dict, not a database table.**
For the prototype, factors are constants from DEFRA 2024. The `EmissionFactor` model exists in the schema for a production migration path, but the calculator reads from a Python dictionary for simplicity. In production, I'd load factors from the database with year versioning.

## Questions I'd Ask the PM

1. Does the client have a material-to-emission-category mapping, or do we need to build a classification workflow?
2. Which utility providers does the client use? Can we get sample exports from their portals?
3. Is the travel platform Concur or something else? Can we get a sample report export?
4. What's the expected data volume per upload? (Affects whether we need async processing.)
5. Do auditors need to see a diff when records are edited, or just the before/after state?
6. Should locked records be truly immutable at the database level (triggers/constraints), or is application-level enforcement sufficient?
7. Are there tenant-specific emission factors, or do all tenants use the same DEFRA/EPA defaults?
