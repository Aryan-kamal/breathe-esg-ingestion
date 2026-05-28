from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from core.views import me, register
from ingestion.views import upload_sap, upload_utility, upload_travel, list_sources
from emissions.views import (
    list_records, record_detail,
    approve_record, reject_record, flag_record, lock_record,
    bulk_action, dashboard_stats,
)
from review.views import audit_log

urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/register/", register, name="register"),
    path("api/auth/me/", me, name="me"),

    # Ingestion
    path("api/upload/sap/", upload_sap, name="upload_sap"),
    path("api/upload/utility/", upload_utility, name="upload_utility"),
    path("api/upload/travel/", upload_travel, name="upload_travel"),
    path("api/sources/", list_sources, name="list_sources"),

    # Emission records
    path("api/records/", list_records, name="list_records"),
    path("api/records/<uuid:record_id>/", record_detail, name="record_detail"),
    path("api/records/<uuid:record_id>/approve/", approve_record, name="approve_record"),
    path("api/records/<uuid:record_id>/reject/", reject_record, name="reject_record"),
    path("api/records/<uuid:record_id>/flag/", flag_record, name="flag_record"),
    path("api/records/<uuid:record_id>/lock/", lock_record, name="lock_record"),
    path("api/records/bulk/", bulk_action, name="bulk_action"),

    # Dashboard
    path("api/dashboard/", dashboard_stats, name="dashboard_stats"),

    # Audit
    path("api/audit/<uuid:record_id>/", audit_log, name="audit_log"),
]
