import uuid
from django.db import models
from django.contrib.auth.models import User
from core.models import Tenant


class DataSource(models.Model):
    """Tracks each file upload / ingestion event."""

    SOURCE_TYPE_CHOICES = [
        ("sap", "SAP Fuel & Procurement"),
        ("utility", "Utility Electricity"),
        ("travel", "Corporate Travel"),
    ]
    STATUS_CHOICES = [
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="data_sources")
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES)
    file_name = models.CharField(max_length=500)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="processing")
    row_count = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    error_summary = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.source_type}: {self.file_name}"


class RawRecord(models.Model):
    """Stores verbatim ingested rows before normalization. Immutable after creation."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source = models.ForeignKey(DataSource, on_delete=models.CASCADE, related_name="raw_records")
    row_number = models.IntegerField()
    raw_payload = models.JSONField()
    parse_status = models.CharField(
        max_length=20,
        choices=[("ok", "OK"), ("error", "Error")],
        default="ok",
    )
    parse_errors = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["row_number"]
        unique_together = ("source", "row_number")

    def __str__(self):
        return f"Row {self.row_number} from {self.source.file_name}"
