"""
Seeds the database with a demo tenant, user, and ingests all 3 sample data files.
Run: python manage.py seed
"""

from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIRequestFactory

from core.models import Tenant, TenantMembership
from emissions.models import EmissionRecord


class Command(BaseCommand):
    help = "Seed database with demo tenant, user, and sample data"

    def handle(self, *args, **options):
        tenant, _ = Tenant.objects.get_or_create(
            name="Suraya Green Industries Pvt Ltd",
            defaults={"industry": "Manufacturing"},
        )
        self.stdout.write(f"Tenant: {tenant.name}")

        user, created = User.objects.get_or_create(
            username="analyst",
            defaults={"email": "analyst@suraya.example.com", "first_name": "Demo", "last_name": "Analyst"},
        )
        if created:
            user.set_password("analyst123")
            user.save()
            self.stdout.write("Created user: analyst / analyst123")

        TenantMembership.objects.get_or_create(
            user=user, tenant=tenant, defaults={"role": "analyst"}
        )

        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@suraya.example.com",
                "first_name": "Admin",
                "last_name": "User",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin_user.set_password("admin123")
            admin_user.save()
            self.stdout.write("Created admin: admin / admin123")

        TenantMembership.objects.get_or_create(
            user=admin_user, tenant=tenant, defaults={"role": "admin"}
        )

        if EmissionRecord.objects.filter(tenant=tenant).exists():
            self.stdout.write(
                self.style.WARNING(
                    "Emission records already exist for this tenant — skipping sample CSV ingestion."
                )
            )
            self.stdout.write(self.style.SUCCESS("Seed complete (users/tenant only)."))
            return

        sample_dir = Path(__file__).resolve().parent.parent.parent.parent / "sample_data"

        files = [
            ("sap", "sap_fuel_procurement.csv"),
            ("utility", "utility_electricity.csv"),
            ("travel", "travel_concur_export.csv"),
        ]

        from ingestion.views import _process_upload

        factory = APIRequestFactory()

        for source_type, filename in files:
            filepath = sample_dir / filename
            if not filepath.exists():
                self.stdout.write(self.style.WARNING(f"Sample file not found: {filepath}"))
                continue

            with open(filepath, "rb") as f:
                upload = SimpleUploadedFile(filename, f.read(), content_type="text/csv")

            request = factory.post(f"/api/upload/{source_type}/", {"file": upload}, format="multipart")
            request.user = user

            result = _process_upload(request, source_type)
            self.stdout.write(f"Ingested {filename}: {result.data}")

        self.stdout.write(self.style.SUCCESS("Seed complete!"))
