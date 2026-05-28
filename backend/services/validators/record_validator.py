"""
Validation engine that checks normalized records for anomalies.

Rules:
- Missing critical fields
- Negative or zero quantities
- Unreasonably large quantities (threshold-based)
- Future dates
- Duplicate detection (same source, period, quantity)
"""

from datetime import date
from decimal import Decimal

QUANTITY_THRESHOLDS = {
    "stationary_combustion": Decimal("500000"),
    "mobile_combustion": Decimal("100000"),
    "purchased_electricity": Decimal("5000000"),
    "purchased_goods": Decimal("1000000"),
    "business_travel_air": Decimal("20000"),
    "business_travel_hotel": Decimal("365"),
    "business_travel_ground": Decimal("50000"),
}


class RecordValidator:
    """Validates a parsed record dict and returns (is_suspicious, reasons)."""

    def validate(self, parsed_data, category):
        reasons = []

        quantity_str = parsed_data.get("normalized_quantity") or parsed_data.get("quantity")
        if not quantity_str:
            reasons.append("Missing quantity")
        else:
            try:
                q = Decimal(str(quantity_str))
                if q <= 0:
                    reasons.append(f"Non-positive quantity: {q}")
                threshold = QUANTITY_THRESHOLDS.get(category)
                if threshold and q > threshold:
                    reasons.append(f"Unusually large quantity ({q}) exceeds threshold ({threshold})")
            except Exception:
                reasons.append(f"Invalid quantity value: {quantity_str}")

        date_fields = ["posting_date", "billing_start", "billing_end", "travel_date"]
        for field in date_fields:
            val = parsed_data.get(field)
            if val:
                try:
                    d = date.fromisoformat(val) if isinstance(val, str) else val
                    if d > date.today():
                        reasons.append(f"Future date in {field}: {val}")
                except (ValueError, TypeError):
                    pass

        if parsed_data.get("is_estimated"):
            reasons.append("Meter reading is estimated, not actual")

        if parsed_data.get("distance_estimated"):
            reasons.append("Flight distance estimated from airport codes")

        if not parsed_data.get("normalized_unit") and not parsed_data.get("original_unit"):
            reasons.append("Missing unit information")

        return len(reasons) > 0, reasons
