"""
Serializers for Allowances model.
"""

from rest_framework import serializers

from personnel.models import Allowances
from utils.defaults import RobustDateTimeField


class AllowancesSerializer(serializers.ModelSerializer):
    created_at = RobustDateTimeField(read_only=True)
    updated_at = RobustDateTimeField(read_only=True)
    created_by_display = serializers.CharField(read_only=True)
    updated_by_display = serializers.CharField(read_only=True)

    contract_type_display = serializers.CharField(
        source="contract_type.name", read_only=True
    )

    class Meta:
        model = Allowances
        fields = [
            "id",
            "contract_type",
            "contract_type_display",
            "name",
            "amount",
            "description",
            "year",
            "month",
            "language",
            "is_active",
            "is_deleted",
            "created_by",
            "created_by_display",
            "updated_by",
            "updated_by_display",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "year",
            "month",
            "created_by",
            "updated_by",
            "created_by_display",
            "updated_by_display",
            "created_at",
            "updated_at",
            "contract_type_display",
        ]

