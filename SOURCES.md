# Sources

For each of the three data sources: what I researched, what real-world formats look like, what my sample data models, and what would break in production.

---

## 1. SAP — Fuel & Procurement

### What I Researched
- SAP transaction codes for procurement data: ME2M (purchase order list), ME2L (by vendor), SE16 (direct table export from EKPO/EKKO tables).
- SAP export formats: IDoc (XML-based EDI), OData (RESTful API), BAPI (function module calls), and flat-file exports (CSV/TSV via background jobs or clipboard export).
- SAP field naming conventions in German locales: `Menge` (quantity), `Mengeneinheit` (unit of measure), `Werk` (plant), `Buchungsdatum` (posting date), `Materialbeschreibung` (material description), `Lieferant` (supplier), `Kostenstelle` (cost center).
- SAP date format: `DD.MM.YYYY` in German locales, `YYYYMMDD` in internal format.
- SAP unit of measure codes: documented in T006 table — `L`, `KG`, `M3`, `ST` (Stück = pieces).

### What Real-World Exports Look Like
A typical SAP flat-file export from ME2M:
- Tab-separated or CSV, depending on the export method
- Column headers in the language of the SAP installation (often German)
- Plant codes like "PLT_001" or "DE01" that are meaningless without the T001W table
- Material numbers that follow internal numbering schemes
- Units that vary between exports (someone types "Ltr" in one system, "L" in another)
- Dates in DD.MM.YYYY format
- May include cost centers, document numbers, purchasing organizations

### What My Sample Data Models
- 25 rows covering both fuel purchases (diesel, petrol, natural gas, heating oil, LPG) and non-fuel procurement (office furniture, laptops, cleaning supplies, paper, servers, catering).
- German column headers (`Werk`, `Materialbeschreibung`, `Menge`, `Mengeneinheit`, `Buchungsdatum`).
- Mixed unit formats: `Ltr`, `L`, `Liters`, `KG`, `m3`, `kubikmeter`, `Stück`, `Pauschal` (lump sum).
- Multiple plant codes: `PLT_001` through `PLT_005` and alternate format `DE01`-`DE03`.
- Deliberate data quality issues:
  - Row 13: missing quantity (empty field) — tests parser error handling.
  - Row 18: absurdly large quantity (99,999 liters of petrol) — tests suspicious value detection.
  - Row 23: non-quantifiable unit (`Pauschal` for catering) — tests how the system handles non-emission-relevant items.
  - Mixed date formats and unit abbreviations throughout.

### What Would Break in Production
- Plant code lookup would need to be configurable per tenant (load from T001W export or maintain a mapping table).
- Material-to-emission-category classification needs a proper mapping workflow — keyword matching on description is fragile. "Diesel Kraftstoff" works but "Ottokraftstoff" (another word for petrol) wouldn't match.
- SAP exports can contain thousands of line items. The synchronous file parsing would need to move to a Celery task queue for files over ~1000 rows.
- Character encoding issues: SAP exports sometimes use Windows-1252 or ISO-8859-1, not UTF-8. The parser handles UTF-8 with BOM but would need encoding detection for other formats.
- Some SAP configurations include subtotal rows or header rows that aren't data — the parser would need to detect and skip these.

---

## 2. Utility — Electricity

### What I Researched
- Utility portal CSV exports from providers like ConEdison (US), PG&E (US), EDF (France/UK), E.ON (Germany), and Vattenfall (Nordic).
- Common CSV structures: meter ID, billing period start/end, consumption, unit, tariff type, read type (actual vs estimated).
- Billing period behavior: utility bills are based on meter read dates, not calendar months. A "January" bill typically covers late December to late January.
- Unit conventions: kWh for residential/commercial, MWh for industrial, sometimes GWh for large portfolios.
- Estimated vs. actual reads: utilities estimate consumption between physical meter reads (typically quarterly or biannual). Estimated reads are less reliable and may be corrected retroactively.

### What Real-World Exports Look Like
A typical utility portal CSV:
- One row per meter per billing period
- Meter ID (alphanumeric, unique per meter point)
- Billing period as two date columns (start, end)
- Consumption value and unit
- Tariff or rate plan name
- Read type indicator (Actual, Estimated, or abbreviated as A/E)
- Sometimes includes cost, peak/off-peak breakdown, or demand charges

### What My Sample Data Models
- 25 rows across 4 meters at 4 facilities, covering 6 months of data (Jan-June 2024).
- Billing periods that don't align with months (e.g., Jan 5 to Feb 3, Feb 4 to Mar 5).
- Two unit formats: kWh and MWh (the Hamburg warehouse reports in MWh while others use kWh).
- Different tariff types: Commercial Standard, Industrial Peak, Small Business, Office Rate.
- Mix of Actual and Estimated reads.
- Deliberate data quality issues:
  - Row 22: negative consumption (-500 kWh) — tests validation for impossible values. This happens in real data when a meter correction or credit is applied.
  - Row 25: exact duplicate of row 1 (same meter, same period, same consumption) — tests duplicate detection.
  - Several estimated reads flagged as suspicious.

### What Would Break in Production
- Multiple meters per facility complicates aggregation. Need clear facility-to-meter mapping.
- Billing period overlaps between estimated and actual reads: when an actual read replaces an estimate, the old row should be superseded. The current model doesn't handle row replacement.
- Some utilities provide peak/off-peak breakdowns as separate rows. The parser would need to aggregate these.
- Demand charges (kW, not kWh) are a different unit entirely and don't map to energy consumption emission factors.
- Time-of-use data and grid emission factor variation by hour would require a much more granular model than monthly totals.

---

## 3. Corporate Travel — Flights, Hotels, Ground Transport

### What I Researched
- SAP Concur report export format: CSV with columns for employee, expense type, origin, destination, amount, travel date, travel class.
- Navan (formerly TripActions) export format: similar CSV structure, sometimes includes booking ID and trip ID.
- IATA airport code database for flight distance calculation.
- GHG Protocol Scope 3, Category 6 (Business Travel) methodology.
- DEFRA emission factors for air travel by class: economy (0.255 kgCO2e/km), premium economy (0.408), business (0.740), first (1.020).
- Hotel emission factors: DEFRA gives per-night averages (~20.6 kgCO2e/night) varying by country.
- Ground transport factors: car (0.171), rail (0.037), taxi (0.171), bus (0.089) kgCO2e/km.

### What Real-World Exports Look Like
A Concur report export typically includes:
- Employee name or ID
- Expense/travel type (Air, Hotel, Rail, Car Rental, Taxi, Meals, etc.)
- Origin and destination (IATA codes for flights, city names for ground transport)
- Travel date
- Amount and currency
- Travel class (for flights)
- Sometimes: booking reference, trip ID, project/cost center

Key challenges:
- Distances are often missing — you get airport codes but not km.
- Hotel stays give cost but not night count (need to infer from check-in/check-out or treat cost as the line item).
- Mixed currencies require exchange rate handling.
- Non-travel expenses (meals, parking) may be mixed in.

### What My Sample Data Models
- 35 rows covering 6 employees over 6 months.
- Travel types: Flight (22 rows), Hotel (9 rows), Rail (2 rows), Taxi (2 rows), Car Rental (1 row).
- Airport codes for flights without distance — parser estimates via haversine.
- Hotel rows use the distance column for night count (e.g., "2" = 2 nights).
- Different travel classes: Economy (most), Business (Thomas Mueller's trips).
- All amounts in EUR.
- Deliberate data quality issues:
  - Row 35: impossibly large distance (99,999 km from FRA to SFO) — actual great-circle distance is ~9,144 km. Tests anomaly detection.
  - Several flights where distance must be estimated from IATA codes — flagged as suspicious.
  - Hotel rows where "distance" field is repurposed as night count — parser handles this contextually.

### What Would Break in Production
- IATA lookup table has 30 airports. A real deployment needs the full IATA database (~9,000 airports).
- Haversine gives great-circle distance, not actual flight distance. Real flights follow air routes that are 5-15% longer. A correction factor of 1.1 should be applied.
- Exchange rate handling: the prototype ignores currency (all EUR in sample data). Real data would have mixed currencies needing conversion for cost reporting.
- Hotel emission factors vary significantly by country and hotel category. The DEFRA per-night average is a rough proxy.
- Concur exports may include non-travel line items (meals, incidentals) that don't have emission factors and should be filtered out.
- Connecting flights vs. direct flights: Concur may report legs separately or as a single trip. The parser treats each row as independent.
