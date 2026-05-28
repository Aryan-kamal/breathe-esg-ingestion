from rest_framework import serializers
from .models import DataSource, RawRecord


class DataSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataSource
        fields = [
            "id", "tenant", "source_type", "file_name",
            "uploaded_by", "uploaded_at", "status",
            "row_count", "error_count", "error_summary",
        ]
        read_only_fields = ["id", "tenant", "uploaded_by", "uploaded_at"]


class RawRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawRecord
        fields = ["id", "source", "row_number", "raw_payload", "parse_status", "parse_errors"]
