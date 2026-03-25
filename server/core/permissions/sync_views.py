"""
Views for menu sync functionality.
"""

from django.contrib.auth.models import Permission
from rest_framework import generics, permissions, status
from rest_framework.views import APIView

from core.models import CustomPermissions
from utils.defaults import APIResponse, flatten_errors, handle_exceptions, require_permissions
from utils.pagination import CustomPagination

from .service import permission_service
from .sync_serializers import (
    AppsModelsSerializer,
    CustomPermissionSerializer,
    CustomPermissionWriteSerializer,
    CreatePermissionSerializer,
    PermissionSearchResultSerializer,
    PermissionSearchSerializer,
    SyncExecuteSerializer,
    SyncPreviewSerializer,
    SyncResultSerializer,
)
from .sync_service import menu_sync_service


class PermissionSearchView(APIView):
    """
    Search for existing Django permissions.
    """

    permission_classes = [permissions.IsAuthenticated]

    @require_permissions(["change_permission"])
    @handle_exceptions
    def post(self, request):
        """
        Search permissions by codename or name.
        """
        serializer = PermissionSearchSerializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(
                flatten_errors(serializer.errors),
                status.HTTP_400_BAD_REQUEST,
            )

        query = serializer.validated_data["query"]
        limit = serializer.validated_data["limit"]

        # Search permissions
        permissions = permission_service.search_permissions(query, limit)

        result_serializer = PermissionSearchResultSerializer(
            {
                "permissions": permissions,
                "total": len(permissions),
                "query": query,
            }
        )

        return APIResponse.success(result_serializer.data)


class AppsModelsListView(APIView):
    """
    Get all available apps and models for permission creation.
    """

    permission_classes = [permissions.IsAuthenticated]

    @require_permissions(["change_permission"])
    @handle_exceptions
    def get(self, request):
        """
        List all apps and their models.
        """
        apps_models = permission_service.get_all_apps_with_models()

        # Convert to list format for serializer
        apps_list = [
            {"app_label": app_label, "models": models}
            for app_label, models in apps_models.items()
        ]

        serializer = AppsModelsSerializer({"apps": apps_list})
        return APIResponse.success(serializer.data)


class PermissionCreateView(APIView):
    """
    Create a new Django permission.
    """

    permission_classes = [permissions.IsAuthenticated]

    @require_permissions(["add_permission"])
    @handle_exceptions
    def post(self, request):
        """
        Create a new permission.
        """
        serializer = CreatePermissionSerializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(
                flatten_errors(serializer.errors),
                status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Create permission
            permission = permission_service.create_permission(
                name=serializer.validated_data["name"],
                codename=serializer.validated_data["codename"],
                app_label=serializer.validated_data["app_label"],
                model=serializer.validated_data["model"],
            )

            return APIResponse.success(
                {
                    "permission": permission,
                    "message": "Permission created successfully",
                }
            )

        except ValueError as e:
            return APIResponse.error(str(e), status.HTTP_400_BAD_REQUEST)


class MenuSyncPreviewView(APIView):
    """
    Get preview of menu sync with current state.
    """

    permission_classes = [permissions.IsAuthenticated]

    @require_permissions(["change_permission"])
    @handle_exceptions
    def get(self, request):
        """
        Get sync preview.
        """
        preview_data = menu_sync_service.get_sync_preview()

        if not preview_data["success"]:
            return APIResponse.error(
                preview_data.get("error", "Failed to generate preview"),
                status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        serializer = SyncPreviewSerializer(instance=preview_data)
        return APIResponse.success(serializer.data)


class MenuSyncExecuteView(APIView):
    """
    Execute menu-permissions synchronization.
    """

    permission_classes = [permissions.IsAuthenticated]

    @require_permissions(["change_permission"])
    @handle_exceptions
    def post(self, request):
        """
        Execute sync with provided mappings.
        """
        serializer = SyncExecuteSerializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(
                flatten_errors(serializer.errors),
                status.HTTP_400_BAD_REQUEST,
            )

        mappings = serializer.validated_data["mappings"]
        dry_run = serializer.validated_data["dry_run"]

        # Execute sync
        result = menu_sync_service.execute_sync(mappings, dry_run)

        if not result["success"]:
            return APIResponse.error(
                result.get("error", "Sync failed"),
                status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        result_serializer = SyncResultSerializer(result)
        return APIResponse.success(result_serializer.data)


class CurrentCustomPermissionsView(APIView):
    """
    Get current CustomPermissions tree.
    """

    permission_classes = [permissions.IsAuthenticated]

    @require_permissions(["change_permission"])
    @handle_exceptions
    def get(self, request):
        """
        Get current CustomPermissions as tree.
        """
        current_permissions = menu_sync_service._get_current_custom_permissions_tree()

        return APIResponse.success(
            {
                "current_permissions": current_permissions,
                "total": len(current_permissions),
            }
        )


class MenuStructureView(APIView):
    """
    Get parsed menu structure from TypeScript file.
    """

    permission_classes = [permissions.IsAuthenticated]

    @require_permissions(["change_permission"])
    @handle_exceptions
    def get(self, request):
        """
        Get menu structure with translations.
        """
        from .menu_parser import menu_parser

        menu_data = menu_parser.get_menu_structure()

        if not menu_data["success"]:
            return APIResponse.error(
                menu_data.get("error", "Failed to parse menu"),
                status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return APIResponse.success(menu_data)


class CustomPermissionsListView(generics.ListAPIView):
    """
    List CustomPermissions nodes (tree nodes).
    """

    serializer_class = CustomPermissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = (
        CustomPermissions.objects.filter(is_deleted=False)
        .select_related("permission")
        .order_by("tn_level", "tn_order")
    )
    pagination_class = CustomPagination

    @require_permissions(["view_custompermissions"])
    @handle_exceptions
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(serializer.data)


class CustomPermissionsCreateView(generics.CreateAPIView):
    """
    Create CustomPermissions node.
    """

    serializer_class = CustomPermissionWriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    @require_permissions(["add_custompermissions"])
    @handle_exceptions
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        validated = serializer.validated_data
        permission_instance = None
        if validated.get("permission_id") is not None:
            permission_instance = Permission.objects.get(
                id=validated["permission_id"]
            )

        node = CustomPermissions.objects.create(
            name=validated["name"],
            codename=permission_instance.codename if permission_instance else None,
            permission=permission_instance,
        )

        tn_parent_id = validated.get("tn_parent")
        if tn_parent_id:
            node.tn_parent_id = tn_parent_id
            node.save()

        node.created_by = request.user
        node.updated_by = request.user
        node.save()

        return APIResponse.created("Custom Permission created successfully")


class CustomPermissionsUpdateView(generics.UpdateAPIView):
    """
    Update CustomPermissions node.
    """

    serializer_class = CustomPermissionWriteSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = CustomPermissions.objects.filter(is_deleted=False)
    lookup_field = "id"

    @require_permissions(["change_custompermissions"])
    @handle_exceptions
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)

        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        validated = serializer.validated_data
        instance.name = validated.get("name", instance.name)

        if "permission_id" in validated:
            permission_instance = None
            if validated.get("permission_id") is not None:
                permission_instance = Permission.objects.get(id=validated["permission_id"])
            instance.permission = permission_instance
            instance.codename = permission_instance.codename if permission_instance else None

        if "tn_parent" in validated:
            tn_parent_id = validated.get("tn_parent")
            instance.tn_parent_id = tn_parent_id

        instance.updated_by = request.user
        instance.save()
        return APIResponse.success("Custom Permission updated successfully")


class CustomPermissionsDeleteView(generics.DestroyAPIView):
    """
    Soft delete CustomPermissions node.
    """

    permission_classes = [permissions.IsAuthenticated]
    queryset = CustomPermissions.objects.filter(is_deleted=False)
    lookup_field = "id"

    @require_permissions(["delete_custompermissions"])
    @handle_exceptions
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        permission_instance = instance.permission

        if permission_instance:
            # Unlink first to keep soft-delete behavior on CustomPermissions.
            instance.permission = None
            instance.codename = None
        instance.is_deleted = True
        instance.updated_by = request.user
        instance.save()

        if permission_instance:
            permission_instance.delete()

        return APIResponse.success("Custom Permission deleted successfully")