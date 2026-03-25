"""
Views for Ranks model CRUD operations.
"""

from rest_framework import generics, permissions

from personnel.models import Ranks
from utils.defaults import APIResponse, flatten_errors, handle_exceptions, require_permissions
from utils.pagination import CustomPagination

from .serializers import RanksSerializer


class RanksListView(generics.ListAPIView):
    queryset = Ranks.objects.filter(is_deleted=False)
    """
    View for listing all ranks.
    """

    serializer_class = RanksSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_ranks")
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(serializer.data)


class RanksCreateView(generics.CreateAPIView):
    """
    View for creating new ranks.
    """

    serializer_class = RanksSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("add_ranks")
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        serializer.save(created_by=request.user, updated_by=request.user)
        return APIResponse.created("Rank created successfully")


class RanksRetrieveView(generics.RetrieveAPIView):
    queryset = Ranks.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for retrieving a specific rank.
    """

    serializer_class = RanksSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_ranks")
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return APIResponse.success(serializer.data)


class RanksUpdateView(generics.UpdateAPIView):
    queryset = Ranks.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for updating a specific rank.
    """

    serializer_class = RanksSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("change_ranks")
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=partial
        )

        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        serializer.save(updated_by=request.user)
        return APIResponse.success("Rank updated successfully")


class RanksDeleteView(generics.DestroyAPIView):
    queryset = Ranks.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for deleting a specific rank (soft delete).
    """

    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("delete_ranks")
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.updated_by = request.user
        instance.save()
        return APIResponse.success("Rank deleted successfully")

