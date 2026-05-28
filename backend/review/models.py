import uuid
from django.db import models
from emissions.models import EmissionRecord


class ReviewLog(models.Model):
    """Append-only audit log. Every status change on an EmissionRecord is recorded here."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    record = models.ForeignKey(EmissionRecord, on_delete=models.CASCADE, related_name="review_logs")
    action = models.CharField(max_length=30)
    old_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)
    changed_by = models.CharField(max_length=150)
    comment = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.record_id}: {self.old_status} -> {self.new_status} by {self.changed_by}"
