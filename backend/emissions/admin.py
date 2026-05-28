from django.contrib import admin
from .models import EmissionRecord, EmissionFactor, UnitConversion

@admin.register(EmissionRecord)
class EmissionRecordAdmin(admin.ModelAdmin):
    list_display = ["id", "scope", "category", "co2e_kg", "status", "created_at"]
    list_filter = ["scope", "status", "category"]

admin.site.register(EmissionFactor)
admin.site.register(UnitConversion)
