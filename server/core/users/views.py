from django.contrib.auth.models import Group
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.views import APIView

from core.models import User
from core.signals import trigger_permission_update
from utils.defaults import APIResponse, flatten_errors, handle_exceptions, require_permissions
from utils.pagination import CustomPagination

from .serializers import (
    UserGroupsDeltaSerializer,
    UserSearchHitSerializer,
    UserSerializer,
)


class UserSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_user")
    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        try:
            limit = int(request.query_params.get("limit", 20))
        except (TypeError, ValueError):
            limit = 20
        limit = max(1, min(limit, 50))

        if len(q) < 2:
            return APIResponse.success({"users": []})

        users = (
            User.objects.filter(is_deleted=False)
            .filter(
                Q(username__icontains=q)
                | Q(email__icontains=q)
                | Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
            )
            .distinct()
            .order_by("username")[:limit]
        )
        serializer = UserSearchHitSerializer(users, many=True)
        return APIResponse.success({"users": serializer.data})


class UserGroupIdsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_user")
    def get(self, request, id):
        user = User.objects.filter(id=id, is_deleted=False).first()
        if not user:
            return APIResponse.error("User not found", status.HTTP_404_NOT_FOUND)
        group_ids = list(user.groups.values_list("id", flat=True))
        return APIResponse.success({"group_ids": group_ids})


class UserGroupsDeltaView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("change_group")
    def post(self, request, id):
        user = User.objects.filter(id=id, is_deleted=False).first()
        if not user:
            return APIResponse.error("User not found", status.HTTP_404_NOT_FOUND)

        serializer = UserGroupsDeltaSerializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        data = serializer.validated_data
        add_ids = list(dict.fromkeys(data.get("add_group_ids") or []))
        remove_ids = list(dict.fromkeys(data.get("remove_group_ids") or []))

        if add_ids:
            groups = list(Group.objects.filter(id__in=add_ids))
            if len(groups) != len(set(add_ids)):
                return APIResponse.error(
                    "One or more add_group_ids are invalid.",
                    status.HTTP_400_BAD_REQUEST,
                )
            user.groups.add(*groups)

        if remove_ids:
            groups = list(Group.objects.filter(id__in=remove_ids))
            if len(groups) != len(set(remove_ids)):
                return APIResponse.error(
                    "One or more remove_group_ids are invalid.",
                    status.HTTP_400_BAD_REQUEST,
                )
            user.groups.remove(*groups)

        # Trigger permission update for WebSocket notification
        trigger_permission_update(user.pk)

        return APIResponse.success(
            {
                "user_id": str(user.id),
                "added_group_ids": add_ids,
                "removed_group_ids": remove_ids,
            }
        )


class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.filter(is_deleted=False)
    pagination_class = CustomPagination
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


class UserCreateView(generics.CreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("add_user")
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))
        serializer.save(created_by=request.user, updated_by=request.user)
        return APIResponse.created("User created successfully")


class UserRetrieveView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.filter(is_deleted=False)
    lookup_field = "id"
    lookup_url_kwarg = "id"
    @handle_exceptions
    @require_permissions("view_user")
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return APIResponse.success(serializer.data)


class UserUpdateView(generics.UpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.filter(is_deleted=False)
    lookup_field = "id"
    lookup_url_kwarg = "id"
    @handle_exceptions
    @require_permissions("change_user")
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))
        serializer.save(updated_by=request.user)
        return APIResponse.success("User updated successfully")


class UserDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.filter(is_deleted=False)
    lookup_field = "id"
    lookup_url_kwarg = "id"
    @handle_exceptions
    @require_permissions("delete_user")
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.updated_by = request.user
        instance.save()
        return APIResponse.success("User deleted successfully")
