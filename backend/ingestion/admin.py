from django.contrib import admin
from .models import DataSource, RawRecord

@admin.register(DataSource)
class DataSourceAdmin(admin.ModelAdmin):
    list_display = ["file_name", "source_type", "status", "row_count", "uploaded_at"]

admin.site.register(RawRecord)
