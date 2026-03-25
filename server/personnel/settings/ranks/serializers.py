"""
Serializers for Ranks model.
"""

from rest_framework import serializers

from personnel.models import Ranks
from utils.defaults import RobustDateTimeField


class RanksSerializer(serializers.ModelSerializer):
    created_at = RobustDateTimeField(read_only=True)
    updated_at = RobustDateTimeField(read_only=True)
    created_by_display = serializers.CharField(read_only=True)
    updated_by_display = serializers.CharField(read_only=True)

    class Meta:
        model = Ranks
        fields = [
            "id",
            "name",
            "months_of_service",
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
            "created_at",
            "updated_at",
        ]

