# Tradeoffs

Three things I deliberately did not build and why.

## 1. No Real API Integrations (SAP OData, Utility APIs, Concur API)

**What it would take:**
- SAP: Configure an OData service on the SAP side (or set up IDoc → middleware → webhook pipeline). Requires SAP BASIS team involvement, which takes weeks of coordination with the client's IT.
- Utility: Each utility provider has a different API (or none). Would need per-provider adapters. Most mid-market utilities in Europe/US don't expose APIs to third parties.
- Concur: OAuth2 flow with partner certification through SAP Concur's developer program. 2-4 week approval process.

**Why I chose file upload instead:**
File upload is what actually happens in practice. Sustainability leads email CSV exports, upload them to SharePoint, or drag them into a portal. The assignment says "you decide the ingestion mechanism" — I chose the one that reflects how enterprise ESG data actually moves between systems. The app is designed so swapping a file parser for an API adapter requires no changes to the data model or review workflow.

**What I'd build next:**
A scheduled pull architecture: the backend polls SAP OData / Concur API on a cron schedule, runs the same normalization pipeline, and presents results in the same review dashboard. File upload would remain as a fallback for sources without API access.

## 2. No PDF Bill OCR for Utility Data

**What it would take:**
- A document processing pipeline (Textract, Document AI, or Tesseract + custom layout parsing).
- Template matching for each utility provider's bill format — no two utilities produce the same PDF layout.
- Confidence scoring to flag low-confidence OCR extractions.
- A human-in-the-loop correction step where analysts fix OCR errors before data enters the pipeline.

**Why I didn't build it:**
OCR accuracy on utility bills is ~85-92% in practice, which means 1 in 10 values is wrong. For an ESG platform where data goes to auditors, unreliable data extraction is worse than no automation. The CSV portal export is a reliable alternative that most facilities teams can produce. Building OCR would consume the entire 4-day timeline and still produce unreliable results.

**What I'd build next:**
A two-phase approach: (1) Use a document AI service (Google Document AI or AWS Textract) with pre-trained invoice models. (2) Every OCR-extracted value enters the review dashboard as "suspicious" by default, requiring analyst confirmation before normalization. This treats OCR as a data entry accelerator, not a source of truth.

## 3. No Emission Factor Version Management or Auto-Updates

**What it would take:**
- A versioned emission factor database with effective date ranges.
- Integration with DEFRA's annual conversion factor spreadsheet and EPA's eGRID data.
- A migration pipeline that re-calculates historical records when factors change (or freezes old records with their original factors).
- A UI for sustainability managers to review and approve factor updates before they affect calculations.

**Why I didn't build it:**
The prototype uses hardcoded DEFRA 2024 factors. This is defensible for a demo because: (a) factors change annually, not daily, so hardcoding one year's factors is accurate for the data period covered; (b) the `emission_factor_used` field on every record captures which factor was applied, so historical calculations are always reproducible; (c) building factor version management is a data management product in itself.

**What I'd build next:**
Store factors in the `EmissionFactor` model (which already exists in the schema) with a `year` field. When calculating emissions, look up the factor matching the record's period year. Add a management command that imports DEFRA's annual spreadsheet into the database. Never retroactively change factors on existing records — instead, offer a "recalculate with updated factors" action that creates new review items.
