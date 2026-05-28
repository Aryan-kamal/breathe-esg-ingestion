"""
Parser for corporate travel CSV exports (modeled on SAP Concur report exports).

Handles:
- Flight / Hotel / Rail / Car Rental categories
- IATA airport codes -> haversine distance when distance is missing
- Travel class affecting emission factors
- Missing or inconsistent distance data
"""

import math
import pandas as pd
from datetime import datetime
from decimal import Decimal, InvalidOperation

IATA_COORDINATES = {
    "DEL": (28.5562, 77.1000), "BOM": (19.0896, 72.8656), "BLR": (13.1986, 77.7066),
    "MAA": (12.9941, 80.1709), "HYD": (17.2403, 78.4294), "CCU": (22.6547, 88.4467),
    "JFK": (40.6413, -73.7781), "LAX": (33.9425, -118.4081), "ORD": (41.9742, -87.9073),
    "SFO": (37.6213, -122.3790), "LHR": (51.4700, -0.4543), "CDG": (49.0097, 2.5479),
    "FRA": (50.0379, 8.5622), "SIN": (1.3644, 103.9915), "DXB": (25.2532, 55.3657),
    "HND": (35.5494, 139.7798), "SYD": (-33.9461, 151.1772), "AMS": (52.3105, 4.7683),
    "MUC": (48.3537, 11.7750), "ZRH": (47.4647, 8.5492), "ICN": (37.4602, 126.4407),
    "PEK": (40.0799, 116.6031), "NRT": (35.7720, 140.3929), "ATL": (33.6407, -84.4277),
    "MIA": (25.7959, -80.2870), "SEA": (47.4502, -122.3088), "BOS": (42.3656, -71.0096),
    "YYZ": (43.6777, -79.6248), "MEL": (-37.6690, 144.8410), "DOH": (25.2731, 51.6082),
}

TRAVEL_TYPE_MAP = {
    "air": "business_travel_air",
    "flight": "business_travel_air",
    "flights": "business_travel_air",
    "hotel": "business_travel_hotel",
    "hotels": "business_travel_hotel",
    "lodging": "business_travel_hotel",
    "accommodation": "business_travel_hotel",
    "rail": "business_travel_ground",
    "train": "business_travel_ground",
    "car": "business_travel_ground",
    "car rental": "business_travel_ground",
    "taxi": "business_travel_ground",
    "ground": "business_travel_ground",
    "bus": "business_travel_ground",
}


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class TravelParser:
    """Parses corporate travel CSV exports (Concur-style)."""

    def parse(self, file_content, file_name=""):
        try:
            df = pd.read_csv(file_content, dtype=str, keep_default_na=False)
        except Exception as e:
            return [], [{"row": 0, "error": f"Failed to read file: {e}"}]

        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        rows = []
        errors = []

        for idx, raw in df.iterrows():
            row_num = idx + 1
            row_dict = raw.to_dict()
            row_errors = []

            travel_type_raw = row_dict.get("travel_type", row_dict.get("expense_type", "")).strip().lower()
            category = TRAVEL_TYPE_MAP.get(travel_type_raw, "business_travel_ground")

            origin = row_dict.get("origin", row_dict.get("departure", "")).strip().upper()
            destination = row_dict.get("destination", row_dict.get("arrival", "")).strip().upper()

            distance = self._parse_decimal(row_dict.get("distance_km", row_dict.get("distance", "")))
            distance_estimated = False

            if distance is None and origin and destination and category == "business_travel_air":
                distance = self._estimate_flight_distance(origin, destination)
                if distance is not None:
                    distance_estimated = True
                else:
                    row_errors.append(f"Cannot estimate distance: unknown airport code(s) {origin}/{destination}")

            travel_date = self._parse_date(row_dict.get("travel_date", row_dict.get("date", "")))
            if travel_date is None:
                row_errors.append("Unparseable travel date")

            travel_class = row_dict.get("class", row_dict.get("travel_class", "economy")).strip().lower()
            if travel_class not in ("economy", "business", "first", "premium_economy"):
                travel_class = "economy"

            rows.append({
                "row_number": row_num,
                "raw_payload": row_dict,
                "parse_errors": row_errors,
                "parsed": {
                    "employee": row_dict.get("employee", row_dict.get("traveler", "")),
                    "travel_type": travel_type_raw,
                    "category": category,
                    "origin": origin,
                    "destination": destination,
                    "distance_km": str(distance) if distance else None,
                    "distance_estimated": distance_estimated,
                    "travel_class": travel_class,
                    "travel_date": travel_date.isoformat() if travel_date else None,
                    "cost": row_dict.get("cost", row_dict.get("amount", "")),
                    "currency": row_dict.get("currency", "USD"),
                    "scope": 3,
                    "original_unit": "km",
                    "normalized_unit": "km",
                },
            })

        return rows, errors

    def _estimate_flight_distance(self, origin, destination):
        o = IATA_COORDINATES.get(origin)
        d = IATA_COORDINATES.get(destination)
        if o and d:
            return Decimal(str(round(haversine_km(o[0], o[1], d[0], d[1]), 1)))
        return None

    def _parse_decimal(self, val):
        if not val:
            return None
        val = val.strip().replace(",", "")
        try:
            d = Decimal(val)
            return d if d > 0 else None
        except InvalidOperation:
            return None

    def _parse_date(self, val):
        if not val:
            return None
        val = val.strip()
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%d.%m.%Y"):
            try:
                return datetime.strptime(val, fmt).date()
            except ValueError:
                continue
        return None
