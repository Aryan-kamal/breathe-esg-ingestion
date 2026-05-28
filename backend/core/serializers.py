from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Tenant, TenantMembership


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ["id", "name", "industry", "created_at"]


class UserSerializer(serializers.ModelSerializer):
    tenant = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "tenant"]

    def get_tenant(self, obj):
        membership = obj.memberships.first()
        if membership:
            return TenantSerializer(membership.tenant).data
        return None
