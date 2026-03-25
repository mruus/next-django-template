"""
Serializers for Locations model.
"""

from rest_framework import serializers

from personnel.models import Locations
from utils.defaults import RobustDateTimeField


class LocationsSerializer(serializers.ModelSerializer):
    created_at = RobustDateTimeField(read_only=True)
    updated_at = RobustDateTimeField(read_only=True)
    created_by_display = serializers.CharField(read_only=True)
    updated_by_display = serializers.CharField(read_only=True)

    label_display = serializers.CharField(source="label.name", read_only=True)

    class Meta:
        model = Locations
        fields = [
            "id",
            "name",
            "label",
            "label_display",
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
            "label_display",
        ]

