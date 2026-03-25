"""
Serializers for menu sync functionality.
"""

from typing import Any, Dict, List, Optional

from rest_framework import serializers

from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import Q

from core.models import CustomPermissions, User

from .registry import APPS_MODELS_REGISTRY, get_content_type_id


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


class PermissionService:
    """Service for managing Django permissions."""

    def search_permissions(self, query, limit=20):
        """
        Search permissions by codename or name.

        Args:
            query: Search string
            limit: Maximum number of results

        Returns:
            List of permission dictionaries with app_label and model info
        """
        if not query:
            return []

        # Search in codename and name fields
        permissions = (
            Permission.objects.filter(
                Q(codename__icontains=query) | Q(name__icontains=query)
            )
            .select_related("content_type")[:limit]
        )

        result = []
        for perm in permissions:
            result.append(
                {
                    "id": perm.id,
                    "name": perm.name,
                    "codename": perm.codename,
                    "content_type": {
                        "id": perm.content_type.id,
                        "app_label": perm.content_type.app_label,
                        "model": perm.content_type.model,
                    },
                    "app_label": perm.content_type.app_label,
                    "model": perm.content_type.model,
                }
            )

        return result

    def get_permission_by_codename(self, codename):
        """
        Get permission by exact codename.

        Args:
            codename: Exact permission codename

        Returns:
            Permission dictionary or None
        """
        try:
            perm = Permission.objects.select_related("content_type").get(
                codename=codename
            )
            return {
                "id": perm.id,
                "name": perm.name,
                "codename": perm.codename,
                "content_type": {
                    "id": perm.content_type.id,
                    "app_label": perm.content_type.app_label,
                    "model": perm.content_type.model,
                },
                "app_label": perm.content_type.app_label,
                "model": perm.content_type.model,
            }
        except Permission.DoesNotExist:
            return None

    def create_permission(self, name, codename, app_label, model):
        """
        Create a new Django permission.

        Args:
            name: Permission display name
            codename: Permission codename (unique per content_type)
            app_label: App label
            model: Model name

        Returns:
            Created permission dictionary

        Raises:
            ValueError: If content_type doesn't exist or permission already exists
        """
        # Get content type
        try:
            content_type = ContentType.objects.get(
                app_label=app_label, model=model.lower()
            )
        except ContentType.DoesNotExist:
            raise ValueError(
                f"ContentType not found for app_label='{app_label}', model='{model}'"
            )

        # Check if permission already exists
        if Permission.objects.filter(
            codename=codename, content_type=content_type
        ).exists():
            raise ValueError(
                f"Permission with codename '{codename}' already exists "
                f"for {app_label}.{model}"
            )

        # Create permission
        with transaction.atomic():
            permission = Permission.objects.create(
                name=name, codename=codename, content_type=content_type
            )

        return {
            "id": permission.id,
            "name": permission.name,
            "codename": permission.codename,
            "content_type": {
                "id": content_type.id,
                "app_label": content_type.app_label,
                "model": content_type.model,
            },
            "app_label": app_label,
            "model": model,
        }

    def get_all_apps_with_models(self):
        """
        Get all available apps and their models.

        Returns:
            Dictionary of {app_label: [model_names]}
        """
        # Start with manual registry
        apps_models = APPS_MODELS_REGISTRY.copy()

        # Add any additional apps from Django
        for app_config in ContentType.objects.values_list(
            "app_label", flat=True
        ).distinct():
            if app_config not in apps_models:
                # Get models for this app
                models = ContentType.objects.filter(app_label=app_config).values_list(
                    "model", flat=True
                )
                # Convert to proper case
                models = [m.capitalize() for m in models]
                apps_models[app_config] = models

        return apps_models

    def get_models_for_app(self, app_label):
        """
        Get all models for a specific app.

        Args:
            app_label: App label

        Returns:
            List of model names
        """
        apps_models = self.get_all_apps_with_models()
        return apps_models.get(app_label, [])

    def get_existing_permissions_for_model(self, app_label, model):
        """
        Get all existing permissions for a specific model.

        Args:
            app_label: App label
            model: Model name

        Returns:
            List of permission dictionaries
        """
        try:
            content_type = ContentType.objects.get(
                app_label=app_label, model=model.lower()
            )
        except ContentType.DoesNotExist:
            return []

        permissions = Permission.objects.filter(
            content_type=content_type
        ).select_related("content_type")

        return [
            {
                "id": perm.id,
                "name": perm.name,
                "codename": perm.codename,
                "content_type": {
                    "id": content_type.id,
                    "app_label": content_type.app_label,
                    "model": content_type.model,
                },
            }
            for perm in permissions
        ]

    def batch_create_permissions(self, permissions_data):
        """
        Create multiple permissions in a batch.

        Args:
            permissions_data: List of dicts with keys:
                - name: Permission display name
                - codename: Permission codename
                - app_label: App label
                - model: Model name

        Returns:
            List of created permission dictionaries

        Raises:
            ValueError: If any permission creation fails
        """
        created_permissions = []

        with transaction.atomic():
            for data in permissions_data:
                permission = self.create_permission(
                    name=data["name"],
                    codename=data["codename"],
                    app_label=data["app_label"],
                    model=data["model"],
                )
                created_permissions.append(permission)

        return created_permissions


class AssignableCustomPermissionsService:
    def get_assignable(self, *, group_id=None, user_id=None):
        target_group = None
        target_user = None

        if group_id is not None:
            target_group = (
                Group.objects.filter(id=group_id)
                .prefetch_related("permissions")
                .first()
            )
            if not target_group:
                return {
                    "success": False,
                    "message": "Group not found",
                    "status_code": 404,
                }

        if user_id is not None:
            target_user = (
                User.objects.filter(id=user_id, is_deleted=False)
                .prefetch_related(
                    "user_permissions", "groups", "groups__permissions"
                )
                .first()
            )
            if not target_user:
                return {
                    "success": False,
                    "message": "User not found",
                    "status_code": 404,
                }

        custom_permissions = (
            CustomPermissions.objects.filter(is_deleted=False)
            .select_related("permission", "permission__content_type")
            .order_by("tn_level", "tn_order")
        )

        group_permission_ids = set()
        user_direct_permission_ids = set()
        user_group_permission_sources = {}

        if target_group:
            group_permission_ids = set(
                target_group.permissions.values_list("id", flat=True)
            )

        if target_user:
            user_direct_permission_ids = set(
                target_user.user_permissions.values_list("id", flat=True)
            )

            for group in target_user.groups.all():
                for perm in group.permissions.all():
                    user_group_permission_sources.setdefault(perm.id, []).append(
                        {"id": group.id, "name": group.name}
                    )

        items = []
        for node in custom_permissions:
            permission = node.permission
            permission_id = permission.id if permission else None

            checked = False
            direct_checked = False
            inherited_checked = False
            inherited_from_groups = []
            removable = False

            if permission_id:
                if target_group:
                    checked = permission_id in group_permission_ids
                    removable = checked

                if target_user:
                    direct_checked = permission_id in user_direct_permission_ids
                    inherited_from_groups = user_group_permission_sources.get(
                        permission_id, []
                    )
                    inherited_checked = bool(inherited_from_groups)
                    checked = direct_checked or inherited_checked
                    removable = direct_checked

            items.append(
                {
                    "id": str(node.id),
                    "name": node.name,
                    "codename": node.codename,
                    "tn_parent_id": str(node.tn_parent_id)
                    if node.tn_parent_id
                    else None,
                    "tn_level": node.tn_level,
                    "tn_order": node.tn_order,
                    "permission": (
                        {
                            "id": permission.id,
                            "name": permission.name,
                            "codename": permission.codename,
                            "content_type": {
                                "id": permission.content_type.id,
                                "app_label": permission.content_type.app_label,
                                "model": permission.content_type.model,
                            },
                        }
                        if permission
                        else None
                    ),
                    "checked": checked,
                    "direct_checked": direct_checked,
                    "inherited_checked": inherited_checked,
                    "inherited_from_groups": inherited_from_groups,
                    "removable": removable,
                }
            )

        return {
            "success": True,
            "data": {
                "target_type": "group" if target_group else "user",
                "target_id": target_group.id if target_group else str(target_user.id),
                "permissions": items,
                "total": len(items),
            },
        }

    def apply_group_permission_delta(
        self, *, group_id, add_permission_ids, remove_permission_ids
    ):
        group = Group.objects.filter(id=group_id).first()
        if not group:
            return {
                "success": False,
                "message": "Group not found",
                "status_code": 404,
            }

        add_ids = list(dict.fromkeys(add_permission_ids or []))
        remove_ids = list(dict.fromkeys(remove_permission_ids or []))

        if set(add_ids) & set(remove_ids):
            return {
                "success": False,
                "message": "add_permission_ids and remove_permission_ids must not overlap.",
                "status_code": 400,
            }

        with transaction.atomic():
            if remove_ids:
                perms = list(Permission.objects.filter(id__in=remove_ids))
                if len(perms) != len(set(remove_ids)):
                    return {
                        "success": False,
                        "message": "One or more remove_permission_ids are invalid.",
                        "status_code": 400,
                    }
                group.permissions.remove(*perms)

            if add_ids:
                perms = list(Permission.objects.filter(id__in=add_ids))
                if len(perms) != len(set(add_ids)):
                    return {
                        "success": False,
                        "message": "One or more add_permission_ids are invalid.",
                        "status_code": 400,
                    }
                group.permissions.add(*perms)

        return {
            "success": True,
            "data": {
                "group_id": group_id,
                "added_permission_ids": add_ids,
                "removed_permission_ids": remove_ids,
            },
        }

    def apply_user_direct_permission_delta(
        self, *, user_id, add_permission_ids, remove_permission_ids
    ):
        user = User.objects.filter(id=user_id, is_deleted=False).first()
        if not user:
            return {
                "success": False,
                "message": "User not found",
                "status_code": 404,
            }

        add_ids = list(dict.fromkeys(add_permission_ids or []))
        remove_ids = list(dict.fromkeys(remove_permission_ids or []))

        if set(add_ids) & set(remove_ids):
            return {
                "success": False,
                "message": "add_permission_ids and remove_permission_ids must not overlap.",
                "status_code": 400,
            }

        with transaction.atomic():
            if remove_ids:
                perms = list(Permission.objects.filter(id__in=remove_ids))
                if len(perms) != len(set(remove_ids)):
                    return {
                        "success": False,
                        "message": "One or more remove_permission_ids are invalid.",
                        "status_code": 400,
                    }
                user.user_permissions.remove(*perms)

            if add_ids:
                perms = list(Permission.objects.filter(id__in=add_ids))
                if len(perms) != len(set(add_ids)):
                    return {
                        "success": False,
                        "message": "One or more add_permission_ids are invalid.",
                        "status_code": 400,
                    }
                user.user_permissions.add(*perms)

        return {
            "success": True,
            "data": {
                "user_id": str(user.id),
                "added_permission_ids": add_ids,
                "removed_permission_ids": remove_ids,
            },
        }


permission_service = PermissionService()
assignable_custom_permissions_service = AssignableCustomPermissionsService()
