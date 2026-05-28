from rest_framework import serializers
from .models import EmissionRecord


class EmissionRecordSerializer(serializers.ModelSerializer):
    source_type = serializers.CharField(source="source.source_type", read_only=True)
    source_file = serializers.CharField(source="source.file_name", read_only=True)
    raw_payload = serializers.JSONField(source="raw_record.raw_payload", read_only=True)

    class Meta:
        model = EmissionRecord
        fields = [
            "id", "tenant", "source", "source_type", "source_file",
            "scope", "category", "activity_description",
            "original_quantity", "original_unit",
            "normalized_quantity", "normalized_unit",
            "emission_factor_used", "co2e_kg",
            "period_start", "period_end",
            "status", "is_suspicious", "suspicion_reasons",
            "reviewed_by", "reviewed_at",
            "raw_payload",
            "created_at", "updated_at",
        ]


class EmissionRecordListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views (no raw_payload)."""
    source_type = serializers.CharField(source="source.source_type", read_only=True)
    source_file = serializers.CharField(source="source.file_name", read_only=True)

    class Meta:
        model = EmissionRecord
        fields = [
            "id", "source_type", "source_file",
            "scope", "category", "activity_description",
            "normalized_quantity", "normalized_unit",
            "co2e_kg", "period_start", "period_end",
            "status", "is_suspicious", "suspicion_reasons",
            "reviewed_by", "reviewed_at", "created_at",
        ]
