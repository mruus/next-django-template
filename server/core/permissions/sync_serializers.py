"""
Serializers for menu sync functionality.
"""

from typing import Any, Dict, List, Optional

from rest_framework import serializers


class PermissionSerializer(serializers.Serializer):
    """Serializer for Django Permission."""

    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    codename = serializers.CharField(read_only=True)
    # Django Permission.content_type is a ContentType model instance (not a dict).
    # Serialize manually to avoid DRF DictField expecting `.items()`.
    content_type = serializers.SerializerMethodField(read_only=True)
    app_label = serializers.SerializerMethodField(read_only=True)
    model = serializers.SerializerMethodField(read_only=True)

    def get_content_type(self, obj):
        ct = getattr(obj, "content_type", None)
        if ct is not None:
            return {"id": ct.id, "app_label": ct.app_label, "model": ct.model}

        if isinstance(obj, dict):
            return obj.get("content_type") or {}

        return {}

    def get_app_label(self, obj):
        ct = getattr(obj, "content_type", None)
        if ct is not None:
            return ct.app_label

        if isinstance(obj, dict):
            return obj.get("app_label") or (obj.get("content_type") or {}).get("app_label")

        return None

    def get_model(self, obj):
        ct = getattr(obj, "content_type", None)
        if ct is not None:
            return ct.model

        if isinstance(obj, dict):
            return obj.get("model") or (obj.get("content_type") or {}).get("model")

        return None


class CustomPermissionSerializer(serializers.Serializer):
    """Serializer for CustomPermissions."""

    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    codename = serializers.CharField(read_only=True)
    permission = PermissionSerializer(read_only=True, allow_null=True)
    tn_parent_id = serializers.UUIDField(read_only=True, allow_null=True)
    tn_level = serializers.IntegerField(read_only=True)
    tn_order = serializers.IntegerField(read_only=True)


class CustomPermissionWriteSerializer(serializers.Serializer):
    """Serializer for creating/updating CustomPermissions nodes."""

    name = serializers.CharField(required=True, max_length=255)
    tn_parent = serializers.UUIDField(required=False, allow_null=True)
    permission_id = serializers.IntegerField(required=False, allow_null=True)


class MenuNodeSerializer(serializers.Serializer):
    """Serializer for menu node from TypeScript."""

    id = serializers.CharField()
    type = serializers.CharField()  # group, menu, child
    title_key = serializers.CharField()
    title = serializers.CharField()
    href = serializers.CharField(allow_null=True, allow_blank=True)
    has_children = serializers.BooleanField(required=False)
    translations = serializers.DictField(child=serializers.CharField(), required=False)
    children = serializers.ListField(child=serializers.DictField(), required=False)


class PreviewNodeSerializer(serializers.Serializer):
    """Serializer for preview node in sync preview."""

    id = serializers.CharField()
    type = serializers.CharField()
    title_key = serializers.CharField()
    title = serializers.CharField()
    href = serializers.CharField(allow_null=True, allow_blank=True)
    has_children = serializers.BooleanField(required=False)
    status = serializers.CharField()  # new, existing, modified
    current_permission = CustomPermissionSerializer(allow_null=True)
    suggestions = serializers.DictField()
    translations = serializers.DictField(child=serializers.CharField(), required=False)
    children = serializers.ListField(child=serializers.DictField(), required=False)


class SyncPreviewSerializer(serializers.Serializer):
    """Serializer for sync preview response."""

    success = serializers.BooleanField()
    preview = serializers.ListField(child=PreviewNodeSerializer())
    menu_hierarchy = serializers.ListField(child=MenuNodeSerializer())
    current_permissions = serializers.ListField(child=serializers.DictField())
    stats = serializers.DictField()


class PermissionSearchSerializer(serializers.Serializer):
    """Serializer for permission search request."""

    query = serializers.CharField(required=True)
    limit = serializers.IntegerField(default=20, min_value=1, max_value=100)


class PermissionSearchResultSerializer(serializers.Serializer):
    """Serializer for permission search results."""

    permissions = serializers.ListField(child=PermissionSerializer())
    total = serializers.IntegerField()
    query = serializers.CharField()


class AppModelSerializer(serializers.Serializer):
    """Serializer for app and model information."""

    app_label = serializers.CharField()
    models = serializers.ListField(child=serializers.CharField())


class AppsModelsSerializer(serializers.Serializer):
    """Serializer for all available apps and models."""

    apps = serializers.ListField(child=AppModelSerializer())


class CreatePermissionSerializer(serializers.Serializer):
    """Serializer for creating a new permission."""

    name = serializers.CharField(required=True, max_length=255)
    codename = serializers.CharField(required=True, max_length=255)
    app_label = serializers.CharField(required=True, max_length=100)
    model = serializers.CharField(required=True, max_length=100)

    def validate_codename(self, value):
        """Validate codename format."""
        if not value.replace("_", "").isalnum():
            raise serializers.ValidationError(
                "Codename can only contain alphanumeric characters and underscores."
            )
        return value.lower()

    def validate(self, data):
        """Validate that app_label and model exist."""
        from django.contrib.contenttypes.models import ContentType

        app_label = data["app_label"]
        model = data["model"]

        # Check if content type exists
        if not ContentType.objects.filter(
            app_label=app_label, model=model.lower()
        ).exists():
            raise serializers.ValidationError(
                f"ContentType not found for app_label='{app_label}', model='{model}'"
            )

        # Check if permission already exists
        from django.contrib.auth.models import Permission

        content_type = ContentType.objects.get(app_label=app_label, model=model.lower())

        if Permission.objects.filter(
            codename=data["codename"], content_type=content_type
        ).exists():
            raise serializers.ValidationError(
                f"Permission with codename '{data['codename']}' already exists "
                f"for {app_label}.{model}"
            )

        return data


class MenuPermissionMappingSerializer(serializers.Serializer):
    """Serializer for mapping a menu to a permission."""

    menu_id = serializers.CharField(required=True)

    # Either provide an existing permission ID
    permission_id = serializers.IntegerField(required=False, allow_null=True)

    # Or provide data to create a new permission
    or_create = CreatePermissionSerializer(required=False)

    def validate(self, data):
        """Validate that either permission_id or or_create is provided."""
        has_permission_id = (
            "permission_id" in data and data["permission_id"] is not None
        )
        has_or_create = "or_create" in data and data["or_create"] is not None

        if not (has_permission_id or has_or_create):
            raise serializers.ValidationError(
                "Either 'permission_id' or 'or_create' must be provided."
            )

        if has_permission_id and has_or_create:
            raise serializers.ValidationError(
                "Only one of 'permission_id' or 'or_create' can be provided."
            )

        return data


class SyncExecuteSerializer(serializers.Serializer):
    """Serializer for executing sync."""

    mappings = serializers.DictField(
        child=MenuPermissionMappingSerializer(), required=True
    )
    dry_run = serializers.BooleanField(default=False)


class SyncResultSerializer(serializers.Serializer):
    """Serializer for sync execution result."""

    success = serializers.BooleanField()
    dry_run = serializers.BooleanField()
    results = serializers.DictField(required=False)
    changes = serializers.DictField()
    error = serializers.CharField(required=False, allow_null=True)


class ErrorResponseSerializer(serializers.Serializer):
    """Serializer for error responses."""

    success = serializers.BooleanField(default=False)
    error = serializers.CharField()
    detail = serializers.CharField(required=False, allow_null=True)
