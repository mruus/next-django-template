"""
Views for Django's Group model CRUD operations.
"""

from django.contrib.auth.models import Group
from rest_framework import generics, permissions

from utils.defaults import APIResponse, flatten_errors, handle_exceptions, require_permissions
from utils.pagination import CustomPagination

from .serializers import GroupSerializer


class GroupListView(generics.ListAPIView):
    """
    View for listing all groups.
    """

    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Group.objects.all()
    pagination_class = CustomPagination
    @handle_exceptions
    @require_permissions("view_group")
    def list(self, request, *args, **kwargs):
        """
        Handle group listing request with pagination.
        """
        queryset = self.filter_queryset(self.get_queryset())

        # Paginate the queryset
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(serializer.data)


class GroupCreateView(generics.CreateAPIView):
    """
    View for creating new groups.
    """

    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("add_group")
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        serializer.save()
        return APIResponse.created("Group created successfully")


class GroupRetrieveView(generics.RetrieveAPIView):
    """
    View for retrieving a specific group.
    """

    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Group.objects.all()
    lookup_field = "id"
    @handle_exceptions
    @require_permissions("view_group")
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return APIResponse.success(serializer.data)


class GroupUpdateView(generics.UpdateAPIView):
    """
    View for updating a specific group.
    """

    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Group.objects.all()
    lookup_field = "id"
    @handle_exceptions
    @require_permissions("change_group")
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        serializer.save()
        return APIResponse.success("Group updated successfully")


class GroupDeleteView(generics.DestroyAPIView):
    """
    View for deleting a specific group.
    """

    permission_classes = [permissions.IsAuthenticated]
    queryset = Group.objects.all()
    lookup_field = "id"
    @handle_exceptions
    @require_permissions("delete_group")
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return APIResponse.success("Group deleted successfully")
