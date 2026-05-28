"""
Calculates CO2e emissions from normalized quantities using DEFRA/EPA factors.

Factors are intentionally hardcoded for the prototype — in production these
would come from the EmissionFactor database table with year versioning.
"""

from decimal import Decimal

EMISSION_FACTORS = {
    ("stationary_combustion", "diesel", "L"): Decimal("2.68"),
    ("stationary_combustion", "petrol", "L"): Decimal("2.31"),
    ("stationary_combustion", "natural_gas", "m3"): Decimal("2.02"),
    ("stationary_combustion", "lpg", "L"): Decimal("1.51"),
    ("stationary_combustion", "heating_oil", "L"): Decimal("2.54"),
    ("stationary_combustion", "fuel_oil", "L"): Decimal("3.17"),
    ("mobile_combustion", "diesel", "L"): Decimal("2.68"),
    ("mobile_combustion", "petrol", "L"): Decimal("2.31"),
    ("purchased_electricity", "grid", "kWh"): Decimal("0.417"),
    ("purchased_goods", "default", "kg"): Decimal("0.5"),
    ("business_travel_air", "economy", "km"): Decimal("0.255"),
    ("business_travel_air", "business", "km"): Decimal("0.740"),
    ("business_travel_air", "first", "km"): Decimal("1.020"),
    ("business_travel_air", "premium_economy", "km"): Decimal("0.408"),
    ("business_travel_hotel", "default", "night"): Decimal("20.6"),
    ("business_travel_ground", "car", "km"): Decimal("0.171"),
    ("business_travel_ground", "rail", "km"): Decimal("0.037"),
    ("business_travel_ground", "taxi", "km"): Decimal("0.171"),
    ("business_travel_ground", "bus", "km"): Decimal("0.089"),
}

FUEL_KEYWORD_MAP = {
    "diesel": "diesel",
    "biodiesel": "diesel",
    "petrol": "petrol",
    "gasoline": "petrol",
    "benzin": "petrol",
    "natural gas": "natural_gas",
    "erdgas": "natural_gas",
    "lpg": "lpg",
    "propane": "lpg",
    "heating oil": "heating_oil",
    "heizöl": "heating_oil",
    "fuel oil": "fuel_oil",
    "kerosene": "heating_oil",
}


class EmissionCalculator:
    """Looks up the right emission factor and computes kgCO2e."""

    def calculate(self, category, parsed_data):
        quantity_str = parsed_data.get("normalized_quantity") or parsed_data.get("quantity")
        if not quantity_str:
            return None, None

        quantity = Decimal(str(quantity_str))
        unit = parsed_data.get("normalized_unit", "")

        sub_key = self._determine_sub_key(category, parsed_data)
        factor = EMISSION_FACTORS.get((category, sub_key, unit))

        if factor is None:
            factor = self._fallback_factor(category, unit)

        if factor is None:
            return None, None

        co2e = quantity * factor
        return co2e, factor

    def _determine_sub_key(self, category, parsed_data):
        if category in ("stationary_combustion", "mobile_combustion"):
            desc = parsed_data.get("material_description", "").lower()
            for keyword, fuel_key in FUEL_KEYWORD_MAP.items():
                if keyword in desc:
                    return fuel_key
            return "diesel"

        if category == "purchased_electricity":
            return "grid"

        if category == "business_travel_air":
            return parsed_data.get("travel_class", "economy")

        if category == "business_travel_hotel":
            return "default"

        if category == "business_travel_ground":
            travel_type = parsed_data.get("travel_type", "car")
            if travel_type in ("rail", "train"):
                return "rail"
            if travel_type in ("taxi",):
                return "taxi"
            if travel_type in ("bus",):
                return "bus"
            return "car"

        return "default"

    def _fallback_factor(self, category, unit):
        for key, factor in EMISSION_FACTORS.items():
            if key[0] == category and key[2] == unit:
                return factor
        return None
