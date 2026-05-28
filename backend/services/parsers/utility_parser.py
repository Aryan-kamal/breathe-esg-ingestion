"""
Parser for utility portal CSV exports (electricity billing data).

Handles:
- Multiple meters per facility
- Billing periods that don't align with calendar months
- kWh vs MWh unit variations
- Estimated vs actual meter reads
- Negative or zero consumption values
"""

import pandas as pd
from datetime import datetime
from decimal import Decimal, InvalidOperation

UNIT_MAP = {
    "kwh": "kWh",
    "mwh": "MWh",
    "gwh": "GWh",
    "kw": "kWh",
    "megawatt-hours": "MWh",
    "kilowatt-hours": "kWh",
}

TO_KWH_MULTIPLIER = {
    "kWh": Decimal("1"),
    "MWh": Decimal("1000"),
    "GWh": Decimal("1000000"),
}


class UtilityParser:
    """Parses utility electricity CSV portal exports."""

    def parse(self, file_content, file_name=""):
        try:
            df = pd.read_csv(file_content, dtype=str, keep_default_na=False)
        except Exception as e:
            return [], [{"row": 0, "error": f"Failed to read file: {e}"}]

        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        col_map = self._detect_columns(df.columns.tolist())

        rows = []
        errors = []

        for idx, raw in df.iterrows():
            row_num = idx + 1
            row_dict = raw.to_dict()
            row_errors = []

            consumption = self._parse_decimal(row_dict.get(col_map["consumption"], ""))
            if consumption is None:
                row_errors.append("Invalid or missing consumption value")

            unit_raw = row_dict.get(col_map["unit"], "").strip()
            unit = UNIT_MAP.get(unit_raw.lower(), unit_raw)
            if unit not in TO_KWH_MULTIPLIER:
                row_errors.append(f"Unknown electricity unit: {unit_raw}")

            normalized_kwh = None
            if consumption is not None and unit in TO_KWH_MULTIPLIER:
                normalized_kwh = consumption * TO_KWH_MULTIPLIER[unit]

            billing_start = self._parse_date(row_dict.get(col_map["billing_start"], ""))
            billing_end = self._parse_date(row_dict.get(col_map["billing_end"], ""))
            if billing_start is None:
                row_errors.append("Unparseable billing start date")

            read_type = row_dict.get(col_map.get("read_type", ""), "actual").strip().lower()
            is_estimated = read_type in ("estimated", "est", "e")

            rows.append({
                "row_number": row_num,
                "raw_payload": row_dict,
                "parse_errors": row_errors,
                "parsed": {
                    "meter_id": row_dict.get(col_map["meter_id"], ""),
                    "facility": row_dict.get(col_map.get("facility", ""), ""),
                    "consumption": str(consumption) if consumption else None,
                    "original_unit": unit_raw,
                    "normalized_unit": "kWh",
                    "normalized_quantity": str(normalized_kwh) if normalized_kwh else None,
                    "billing_start": billing_start.isoformat() if billing_start else None,
                    "billing_end": billing_end.isoformat() if billing_end else None,
                    "tariff": row_dict.get(col_map.get("tariff", ""), ""),
                    "is_estimated": is_estimated,
                    "scope": 2,
                    "category": "purchased_electricity",
                },
            })

        return rows, errors

    def _detect_columns(self, columns):
        """Flexible column detection for varied CSV header formats."""
        mapping = {
            "meter_id": "meter_id",
            "consumption": "consumption",
            "unit": "unit",
            "billing_start": "billing_start",
            "billing_end": "billing_end",
        }
        for col in columns:
            cl = col.lower()
            if "meter" in cl and ("id" in cl or "number" in cl or "no" in cl):
                mapping["meter_id"] = col
            elif "consumption" in cl or "usage" in cl or "kwh" in cl or "quantity" in cl:
                mapping["consumption"] = col
            elif "unit" in cl and "unit" not in mapping.values():
                mapping["unit"] = col
            elif ("start" in cl or "from" in cl) and "date" in cl or "billing_start" in cl or "period_start" in cl:
                mapping["billing_start"] = col
            elif ("end" in cl or "to" in cl) and "date" in cl or "billing_end" in cl or "period_end" in cl:
                mapping["billing_end"] = col
            elif "facility" in cl or "site" in cl or "location" in cl or "building" in cl:
                mapping["facility"] = col
            elif "tariff" in cl or "rate" in cl or "plan" in cl:
                mapping["tariff"] = col
            elif "type" in cl and "read" in cl or "estimated" in cl:
                mapping["read_type"] = col
        return mapping

    def _parse_decimal(self, val):
        if not val:
            return None
        val = val.strip().replace(",", "")
        try:
            return Decimal(val)
        except InvalidOperation:
            return None

    def _parse_date(self, val):
        if not val:
            return None
        val = val.strip()
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%d.%m.%Y", "%b %d, %Y", "%d-%b-%Y"):
            try:
                return datetime.strptime(val, fmt).date()
            except ValueError:
                continue
        return None
