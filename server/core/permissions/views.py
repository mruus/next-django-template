"""
Views for user permission listing and assignable custom permissions.
"""

from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.views import APIView

from core.models import User
from utils.defaults import APIResponse, flatten_errors, handle_exceptions, require_permissions
from utils.effective_permission import (
    AssignableCustomPermissionsPermission,
)
from utils.pagination import CustomPagination

from .serializers import (
    AssignableCustomPermissionsQuerySerializer,
    GroupPermissionsDeltaSerializer,
    UserDirectPermissionsDeltaSerializer,
    UserWithPermissionsSerializer,
)
from .service import assignable_custom_permissions_service


class UsersWithPermissionsListView(generics.ListAPIView):
    serializer_class = UserWithPermissionsSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = CustomPagination

    def get_queryset(self):
        queryset = User.objects.filter(is_deleted=False, is_active=True)
        queryset = queryset.filter(
            Q(user_permissions__isnull=False)
            | Q(groups__permissions__isnull=False)
        ).distinct()
        queryset = queryset.prefetch_related(
            "user_permissions",
            "user_permissions__content_type",
            "groups",
            "groups__permissions",
            "groups__permissions__content_type",
        )
        return queryset.order_by("username", "id")
    @handle_exceptions
    @require_permissions("view_user")
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(serializer.data)


class AssignableCustomPermissionsView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        AssignableCustomPermissionsPermission,
    ]

    @handle_exceptions
    def get(self, request):
        serializer = AssignableCustomPermissionsQuerySerializer(
            data=request.query_params
        )
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        data = serializer.validated_data
        group_id = data.get("group_id")
        user_id = data.get("user_id")

        result = assignable_custom_permissions_service.get_assignable(
            group_id=group_id, user_id=user_id
        )
        if not result["success"]:
            return APIResponse.error(
                result["message"],
                result.get("status_code", status.HTTP_400_BAD_REQUEST),
            )
        return APIResponse.success(result["data"])


class GroupPermissionsDeltaView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("change_group")
    def post(self, request):
        serializer = GroupPermissionsDeltaSerializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        data = serializer.validated_data
        result = assignable_custom_permissions_service.apply_group_permission_delta(
            group_id=data["group_id"],
            add_permission_ids=data.get("add_permission_ids") or [],
            remove_permission_ids=data.get("remove_permission_ids") or [],
        )
        if not result["success"]:
            return APIResponse.error(
                result["message"],
                result.get("status_code", status.HTTP_400_BAD_REQUEST),
            )
        return APIResponse.success(result["data"])


class UserDirectPermissionsDeltaView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("change_user")
    def post(self, request):
        serializer = UserDirectPermissionsDeltaSerializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        data = serializer.validated_data
        result = assignable_custom_permissions_service.apply_user_direct_permission_delta(
            user_id=data["user_id"],
            add_permission_ids=data.get("add_permission_ids") or [],
            remove_permission_ids=data.get("remove_permission_ids") or [],
        )
        if not result["success"]:
            return APIResponse.error(
                result["message"],
                result.get("status_code", status.HTTP_400_BAD_REQUEST),
            )
        return APIResponse.success(result["data"])


class UserPermissionsView(APIView):
    """
    Fallback API endpoint for user permissions when Redis/WebSocket is unavailable.
    Returns user permissions with version tracking.
    """
    permission_classes = [permissions.IsAuthenticated]

    @handle_exceptions
    def get(self, request):
        user = request.user

        # Try Redis first (happy path)
        from utils.cache import (
            get_cached_permissions,
            get_user_permissions_list,
            set_cached_permissions,
        )

        current_perms = get_user_permissions_list(user)
        cached = get_cached_permissions(user.pk)
        if cached and cached.get("permissions") == current_perms:
            return APIResponse.success({
                "source": "cache",
                **cached
            })

        # Cache miss or stale cache — repopulate from current DB effective permissions.
        try:
            entry = set_cached_permissions(user.pk, current_perms)
            source = "db_cache_refreshed"
        except Exception:
            # Redis still down — just return from DB directly
            entry = {"version": None, "permissions": current_perms}
            source = "db"

        return APIResponse.success({
            "source": source,
            **entry
        })
