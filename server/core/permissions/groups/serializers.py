"""
Serializers for Django's Group model.
"""

from django.contrib.auth.models import Group, Permission
from rest_framework import serializers


class PermissionSerializer(serializers.ModelSerializer):
    """Serializer for Permission model."""

    class Meta:
        model = Permission
        fields = ["id", "name", "codename", "content_type"]
        read_only_fields = ["id", "name", "codename", "content_type"]


class GroupSerializer(serializers.ModelSerializer):
    """Serializer for Group model."""

    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Permission.objects.all(),
        source="permissions",
        write_only=True,
        required=False,
    )

    # Custom fields for display
    permissions_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = [
            "id",
            "name",
            "permissions",
            "permission_ids",
            "permissions_count",
        ]
        read_only_fields = ["id", "permissions", "permissions_count"]

    def get_permissions_count(self, obj):
        """Get the count of permissions in the group."""
        return obj.permissions.count()

    def create(self, validated_data):
        """Create a new group with permissions."""
        permissions = validated_data.pop("permissions", [])
        group = Group.objects.create(**validated_data)

        if permissions:
            group.permissions.set(permissions)

        return group

    def update(self, instance, validated_data):
        """Update an existing group with permissions."""
        permissions = validated_data.pop("permissions", [])

        # Update group fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update permissions if provided
        if permissions is not None:
            instance.permissions.set(permissions)

        return instance
