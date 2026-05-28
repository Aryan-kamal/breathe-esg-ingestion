import uuid
from django.db import models
from core.models import Tenant
from ingestion.models import DataSource, RawRecord


class EmissionFactor(models.Model):
    """Lookup table for emission factors. Sourced from DEFRA / US EPA."""

    activity_type = models.CharField(max_length=100)
    fuel_or_category = models.CharField(max_length=100)
    unit = models.CharField(max_length=50)
    factor_kg_co2e = models.DecimalField(max_digits=12, decimal_places=6)
    source_reference = models.CharField(max_length=255)
    year = models.IntegerField(default=2024)

    class Meta:
        unique_together = ("activity_type", "fuel_or_category", "unit", "year")

    def __str__(self):
        return f"{self.activity_type}/{self.fuel_or_category}: {self.factor_kg_co2e} kgCO2e/{self.unit}"


class UnitConversion(models.Model):
    """Maps messy real-world unit strings to canonical units."""

    from_unit = models.CharField(max_length=50)
    to_unit = models.CharField(max_length=50)
    multiplier = models.DecimalField(max_digits=15, decimal_places=8)

    class Meta:
        unique_together = ("from_unit", "to_unit")

    def __str__(self):
        return f"{self.from_unit} -> {self.to_unit} (x{self.multiplier})"


class EmissionRecord(models.Model):
    """Normalized emission record — the core business entity."""

    SCOPE_CHOICES = [(1, "Scope 1"), (2, "Scope 2"), (3, "Scope 3")]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("validated", "Validated"),
        ("suspicious", "Suspicious"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("locked", "Locked"),
    ]
    CATEGORY_CHOICES = [
        ("stationary_combustion", "Stationary Combustion"),
        ("mobile_combustion", "Mobile Combustion"),
        ("purchased_electricity", "Purchased Electricity"),
        ("purchased_goods", "Purchased Goods & Services"),
        ("business_travel_air", "Business Travel - Air"),
        ("business_travel_hotel", "Business Travel - Hotel"),
        ("business_travel_ground", "Business Travel - Ground Transport"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="emission_records")
    source = models.ForeignKey(DataSource, on_delete=models.CASCADE, related_name="emission_records")
    raw_record = models.OneToOneField(RawRecord, on_delete=models.CASCADE, related_name="emission_record")

    scope = models.IntegerField(choices=SCOPE_CHOICES)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    activity_description = models.CharField(max_length=500, blank=True)

    original_quantity = models.DecimalField(max_digits=15, decimal_places=4)
    original_unit = models.CharField(max_length=50)
    normalized_quantity = models.DecimalField(max_digits=15, decimal_places=4)
    normalized_unit = models.CharField(max_length=50)

    emission_factor_used = models.DecimalField(max_digits=12, decimal_places=6, null=True, blank=True)
    co2e_kg = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)

    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    is_suspicious = models.BooleanField(default=False)
    suspicion_reasons = models.JSONField(default=list, blank=True)

    reviewed_by = models.CharField(max_length=150, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "scope"]),
            models.Index(fields=["source"]),
        ]

    def __str__(self):
        return f"[Scope {self.scope}] {self.category} — {self.co2e_kg} kgCO2e"
