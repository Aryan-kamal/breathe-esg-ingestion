from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import EmissionRecord
from .serializers import EmissionRecordSerializer, EmissionRecordListSerializer
from review.models import ReviewLog


def _get_tenant(user):
    membership = user.memberships.first()
    return membership.tenant if membership else None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_records(request):
    tenant = _get_tenant(request.user)
    if not tenant:
        return Response({"results": [], "count": 0})

    qs = EmissionRecord.objects.filter(tenant=tenant).select_related("source", "raw_record")

    scope = request.query_params.get("scope")
    if scope:
        qs = qs.filter(scope=int(scope))

    source_type = request.query_params.get("source_type")
    if source_type:
        qs = qs.filter(source__source_type=source_type)

    record_status = request.query_params.get("status")
    if record_status:
        qs = qs.filter(status=record_status)

    suspicious = request.query_params.get("suspicious")
    if suspicious == "true":
        qs = qs.filter(is_suspicious=True)

    search = request.query_params.get("search")
    if search:
        qs = qs.filter(
            Q(activity_description__icontains=search)
            | Q(category__icontains=search)
        )

    count = qs.count()

    page = int(request.query_params.get("page", 1))
    page_size = int(request.query_params.get("page_size", 50))
    offset = (page - 1) * page_size
    records = qs[offset:offset + page_size]

    return Response({
        "count": count,
        "page": page,
        "page_size": page_size,
        "results": EmissionRecordListSerializer(records, many=True).data,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def record_detail(request, record_id):
    tenant = _get_tenant(request.user)
    try:
        record = EmissionRecord.objects.select_related("source", "raw_record").get(
            id=record_id, tenant=tenant
        )
    except EmissionRecord.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    logs = ReviewLog.objects.filter(record=record).values(
        "action", "old_status", "new_status", "changed_by", "comment", "timestamp"
    )

    data = EmissionRecordSerializer(record).data
    data["review_history"] = list(logs)
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def approve_record(request, record_id):
    return _change_status(request, record_id, "approved")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reject_record(request, record_id):
    return _change_status(request, record_id, "rejected")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def flag_record(request, record_id):
    return _change_status(request, record_id, "suspicious")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def lock_record(request, record_id):
    return _change_status(request, record_id, "locked")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_action(request):
    """Approve, reject, or flag multiple records at once."""
    tenant = _get_tenant(request.user)
    record_ids = request.data.get("record_ids", [])
    action = request.data.get("action", "")
    comment = request.data.get("comment", "")

    if action not in ("approved", "rejected", "suspicious", "locked"):
        return Response({"error": "Invalid action"}, status=400)

    records = EmissionRecord.objects.filter(id__in=record_ids, tenant=tenant).exclude(status="locked")
    updated = 0

    for record in records:
        old_status = record.status
        record.status = action
        record.reviewed_by = request.user.username
        record.reviewed_at = timezone.now()
        if action == "suspicious":
            record.is_suspicious = True
        record.save()
        ReviewLog.objects.create(
            record=record,
            action=f"bulk_{action}",
            old_status=old_status,
            new_status=action,
            changed_by=request.user.username,
            comment=comment,
        )
        updated += 1

    return Response({"updated": updated})


def _change_status(request, record_id, new_status):
    tenant = _get_tenant(request.user)
    try:
        record = EmissionRecord.objects.get(id=record_id, tenant=tenant)
    except EmissionRecord.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if record.status == "locked":
        return Response({"error": "Record is locked and cannot be modified"}, status=400)

    old_status = record.status
    record.status = new_status
    record.reviewed_by = request.user.username
    record.reviewed_at = timezone.now()
    if new_status == "suspicious":
        record.is_suspicious = True
    record.save()

    ReviewLog.objects.create(
        record=record,
        action=new_status,
        old_status=old_status,
        new_status=new_status,
        changed_by=request.user.username,
        comment=request.data.get("comment", ""),
    )

    return Response(EmissionRecordSerializer(record).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    tenant = _get_tenant(request.user)
    if not tenant:
        return Response({})

    qs = EmissionRecord.objects.filter(tenant=tenant)

    by_scope = list(
        qs.values("scope").annotate(
            total_co2e=Sum("co2e_kg"),
            count=Count("id"),
        ).order_by("scope")
    )

    by_status = list(
        qs.values("status").annotate(count=Count("id")).order_by("status")
    )

    by_source = list(
        qs.values("source__source_type").annotate(
            total_co2e=Sum("co2e_kg"),
            count=Count("id"),
        ).order_by("source__source_type")
    )

    by_category = list(
        qs.values("category").annotate(
            total_co2e=Sum("co2e_kg"),
            count=Count("id"),
        ).order_by("-total_co2e")
    )

    total_co2e = qs.aggregate(total=Sum("co2e_kg"))["total"] or 0
    total_records = qs.count()
    pending_review = qs.filter(status__in=["pending", "validated", "suspicious"]).count()

    return Response({
        "total_co2e_kg": total_co2e,
        "total_records": total_records,
        "pending_review": pending_review,
        "by_scope": by_scope,
        "by_status": by_status,
        "by_source": by_source,
        "by_category": by_category,
    })
