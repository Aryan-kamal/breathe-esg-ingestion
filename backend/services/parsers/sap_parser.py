"""
Parser for SAP flat-file exports (tab/CSV from SE16/ME2M transactions).

Handles:
- German column headers via a mapping table
- DD.MM.YYYY date formats
- Inconsistent unit abbreviations (Ltr, L, KG, m3, etc.)
- Plant codes that need facility lookup
"""

import pandas as pd
from datetime import datetime
from decimal import Decimal, InvalidOperation

GERMAN_HEADER_MAP = {
    "Werk": "plant_code",
    "Materialnummer": "material_number",
    "Materialbeschreibung": "material_description",
    "Menge": "quantity",
    "Mengeneinheit": "unit",
    "Buchungsdatum": "posting_date",
    "Lieferant": "supplier",
    "Kostenstelle": "cost_center",
    "Belegtyp": "document_type",
    "Belegnummer": "document_number",
    "Einkaufsorganisation": "purchasing_org",
    # English fallbacks
    "Plant": "plant_code",
    "Material Number": "material_number",
    "Material Description": "material_description",
    "Quantity": "quantity",
    "Unit": "unit",
    "Posting Date": "posting_date",
    "Supplier": "supplier",
    "Cost Center": "cost_center",
    "Document Type": "document_type",
    "Document Number": "document_number",
}

UNIT_NORMALIZATION = {
    "ltr": "L",
    "l": "L",
    "liters": "L",
    "litres": "L",
    "liter": "L",
    "litre": "L",
    "kg": "kg",
    "kilogram": "kg",
    "kilograms": "kg",
    "m3": "m3",
    "cbm": "m3",
    "kubikmeter": "m3",
    "gal": "gal",
    "gallons": "gal",
    "gallon": "gal",
    "ton": "t",
    "tonne": "t",
    "tonnes": "t",
    "t": "t",
}

FUEL_KEYWORDS = {
    "diesel", "biodiesel", "petrol", "gasoline", "benzin",
    "natural gas", "erdgas", "lpg", "propane", "heating oil",
    "heizöl", "cng", "fuel oil", "kerosene",
}

PLANT_CODE_LOOKUP = {
    "PLT_001": "Frankfurt Main Plant",
    "PLT_002": "Munich Logistics Hub",
    "PLT_003": "Hamburg Warehouse",
    "PLT_004": "Berlin Office",
    "PLT_005": "Stuttgart Factory",
    "DE01": "Frankfurt Main Plant",
    "DE02": "Munich Logistics Hub",
    "DE03": "Hamburg Warehouse",
}


class SAPParser:
    """Parses SAP flat-file export into structured row dicts."""

    def parse(self, file_content, file_name=""):
        sep = "\t" if file_name.endswith(".txt") else ","
        try:
            df = pd.read_csv(file_content, sep=sep, dtype=str, keep_default_na=False)
        except Exception as e:
            return [], [{"row": 0, "error": f"Failed to read file: {e}"}]

        df.columns = [GERMAN_HEADER_MAP.get(c.strip(), c.strip().lower().replace(" ", "_")) for c in df.columns]

        rows = []
        errors = []

        for idx, raw in df.iterrows():
            row_num = idx + 1
            row_dict = raw.to_dict()
            row_errors = []

            quantity = self._parse_quantity(row_dict.get("quantity", ""))
            if quantity is None:
                row_errors.append("Invalid or missing quantity")

            unit_raw = row_dict.get("unit", "").strip()
            unit = UNIT_NORMALIZATION.get(unit_raw.lower(), unit_raw)
            if not unit:
                row_errors.append("Missing unit")

            posting_date = self._parse_date(row_dict.get("posting_date", ""))
            if posting_date is None:
                row_errors.append(f"Unparseable date: {row_dict.get('posting_date', '')}")

            description = row_dict.get("material_description", "").lower()
            is_fuel = any(kw in description for kw in FUEL_KEYWORDS)

            plant = row_dict.get("plant_code", "")
            facility = PLANT_CODE_LOOKUP.get(plant, f"Unknown ({plant})")

            rows.append({
                "row_number": row_num,
                "raw_payload": row_dict,
                "parse_errors": row_errors,
                "parsed": {
                    "plant_code": plant,
                    "facility_name": facility,
                    "material_number": row_dict.get("material_number", ""),
                    "material_description": row_dict.get("material_description", ""),
                    "quantity": str(quantity) if quantity else None,
                    "original_unit": unit_raw,
                    "normalized_unit": unit,
                    "posting_date": posting_date.isoformat() if posting_date else None,
                    "supplier": row_dict.get("supplier", ""),
                    "cost_center": row_dict.get("cost_center", ""),
                    "document_number": row_dict.get("document_number", ""),
                    "is_fuel": is_fuel,
                    "scope": 1 if is_fuel else 3,
                    "category": (
                        "stationary_combustion" if is_fuel
                        else "purchased_goods"
                    ),
                },
            })

        return rows, errors

    def _parse_quantity(self, val):
        if not val:
            return None
        val = val.strip().replace(",", ".")
        try:
            return Decimal(val)
        except InvalidOperation:
            return None

    def _parse_date(self, val):
        val = val.strip()
        for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y%m%d"):
            try:
                return datetime.strptime(val, fmt).date()
            except ValueError:
                continue
        return None
