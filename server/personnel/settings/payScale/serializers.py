"""
Serializers for PayScale model.
"""

from rest_framework import serializers

from personnel.models import PayScale
from utils.defaults import RobustDateTimeField


class PayScaleSerializer(serializers.ModelSerializer):
    created_at = RobustDateTimeField(read_only=True)
    updated_at = RobustDateTimeField(read_only=True)
    created_by_display = serializers.CharField(read_only=True)
    updated_by_display = serializers.CharField(read_only=True)

    rank_display = serializers.CharField(source="rank.name", read_only=True)
    contract_type_display = serializers.CharField(
        source="contract_type.name", read_only=True
    )
    slug = serializers.SlugField(required=False, allow_blank=True)

    class Meta:
        model = PayScale
        fields = [
            "id",
            "rank",
            "rank_display",
            "contract_type",
            "contract_type_display",
            "salary",
            "iida",
            "deduction",
            "insurance",
            "age_of_retirement",
            "slug",
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
            "rank_display",
            "contract_type_display",
            "created_at",
            "updated_at",
        ]

