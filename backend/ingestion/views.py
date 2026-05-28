import io
from decimal import Decimal
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from .models import DataSource, RawRecord
from .serializers import DataSourceSerializer
from emissions.models import EmissionRecord
from services.parsers import PARSER_MAP
from services.normalizers import EmissionCalculator
from services.validators import RecordValidator


def _get_tenant(user):
    membership = user.memberships.first()
    return membership.tenant if membership else None


def _process_upload(request, source_type):
    tenant = _get_tenant(request.user)
    if not tenant:
        return Response({"error": "User has no tenant assigned"}, status=400)

    file = request.FILES.get("file")
    if not file:
        return Response({"error": "No file provided"}, status=400)

    parser_cls = PARSER_MAP.get(source_type)
    if not parser_cls:
        return Response({"error": f"Unknown source type: {source_type}"}, status=400)

    ds = DataSource.objects.create(
        tenant=tenant,
        source_type=source_type,
        file_name=file.name,
        uploaded_by=request.user,
    )

    try:
        content = io.StringIO(file.read().decode("utf-8-sig"))
        parser = parser_cls()
        rows, global_errors = parser.parse(content, file.name)
    except Exception as e:
        ds.status = "failed"
        ds.error_summary = [{"error": str(e)}]
        ds.save()
        return Response({"error": f"Parse failed: {e}"}, status=400)

    calculator = EmissionCalculator()
    validator = RecordValidator()

    error_count = 0
    created_records = []

    for row in rows:
        parse_ok = len(row["parse_errors"]) == 0
        raw = RawRecord.objects.create(
            source=ds,
            row_number=row["row_number"],
            raw_payload=row["raw_payload"],
            parse_status="ok" if parse_ok else "error",
            parse_errors=row["parse_errors"],
        )

        if not parse_ok:
            error_count += 1

        parsed = row["parsed"]
        category = parsed.get("category", "")
        scope = parsed.get("scope", 3)

        quantity = parsed.get("normalized_quantity") or parsed.get("quantity")
        if not quantity and parsed.get("distance_km"):
            quantity = parsed["distance_km"]
        if category == "business_travel_hotel" and parsed.get("distance_km"):
            quantity = parsed["distance_km"]
            parsed["normalized_unit"] = "night"
            parsed["original_unit"] = "night"

        if quantity:
            parsed["normalized_quantity"] = str(quantity)

        original_unit = parsed.get("original_unit", "")
        normalized_unit = parsed.get("normalized_unit", original_unit)

        co2e, factor = calculator.calculate(category, parsed)
        is_suspicious, suspicion_reasons = validator.validate(parsed, category)

        from datetime import date as date_type
        period_start = None
        period_end = None
        for key in ("posting_date", "billing_start", "travel_date"):
            val = parsed.get(key)
            if val:
                try:
                    period_start = date_type.fromisoformat(val)
                except (ValueError, TypeError):
                    pass
                break
        for key in ("billing_end",):
            val = parsed.get(key)
            if val:
                try:
                    period_end = date_type.fromisoformat(val)
                except (ValueError, TypeError):
                    pass

        if period_start and not period_end:
            period_end = period_start

        record_status = "pending"
        if not parse_ok:
            record_status = "rejected"
        elif is_suspicious:
            record_status = "suspicious"
        else:
            record_status = "validated"

        try:
            er = EmissionRecord.objects.create(
                tenant=tenant,
                source=ds,
                raw_record=raw,
                scope=scope,
                category=category,
                activity_description=parsed.get("material_description", "")
                    or parsed.get("facility", "")
                    or f"{parsed.get('origin', '')} -> {parsed.get('destination', '')}",
                original_quantity=Decimal(str(quantity)) if quantity else Decimal("0"),
                original_unit=original_unit,
                normalized_quantity=Decimal(str(quantity)) if quantity else Decimal("0"),
                normalized_unit=normalized_unit,
                emission_factor_used=factor,
                co2e_kg=co2e,
                period_start=period_start,
                period_end=period_end,
                status=record_status,
                is_suspicious=is_suspicious,
                suspicion_reasons=suspicion_reasons,
            )
            created_records.append(er.id)
        except Exception:
            error_count += 1

    ds.row_count = len(rows)
    ds.error_count = error_count
    ds.error_summary = global_errors
    ds.status = "completed"
    ds.save()

    return Response({
        "source_id": str(ds.id),
        "file_name": ds.file_name,
        "rows_processed": len(rows),
        "errors": error_count,
        "records_created": len(created_records),
    }, status=201)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_sap(request):
    return _process_upload(request, "sap")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_utility(request):
    return _process_upload(request, "utility")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_travel(request):
    return _process_upload(request, "travel")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_sources(request):
    tenant = _get_tenant(request.user)
    if not tenant:
        return Response([], status=200)
    sources = DataSource.objects.filter(tenant=tenant)
    return Response(DataSourceSerializer(sources, many=True).data)
