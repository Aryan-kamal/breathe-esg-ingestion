from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import ReviewLog


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def audit_log(request, record_id):
    logs = ReviewLog.objects.filter(record_id=record_id).values(
        "id", "action", "old_status", "new_status",
        "changed_by", "comment", "timestamp",
    )
    return Response(list(logs))
