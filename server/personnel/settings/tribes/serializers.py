"""
Serializers for Tribes model.
"""

from rest_framework import serializers

from personnel.models import Tribes
from utils.defaults import RobustDateTimeField


class TribesSerializer(serializers.ModelSerializer):
    created_at = RobustDateTimeField(read_only=True)
    updated_at = RobustDateTimeField(read_only=True)
    created_by_display = serializers.CharField(read_only=True)
    updated_by_display = serializers.CharField(read_only=True)

    class Meta:
        model = Tribes
        fields = [
            "id",
            "name",
            "tn_parent",
            "tn_level",
            "tn_priority",
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
            "tn_level",
            "tn_priority",
        ]

