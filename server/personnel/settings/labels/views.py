"""
Views for Label model CRUD operations.
"""

from rest_framework import generics, permissions
from rest_framework.response import Response

from personnel.models import Label
from utils.defaults import APIResponse, flatten_errors, handle_exceptions, require_permissions
from utils.pagination import CustomPagination

from .serializers import LabelSerializer


class LabelListView(generics.ListAPIView):
    queryset = Label.objects.filter(is_deleted=False)
    """
    View for listing all labels.
    """

    serializer_class = LabelSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_label")
    def list(self, request, *args, **kwargs):
        """
        Handle label listing request with pagination.
        """
        queryset = self.filter_queryset(self.get_queryset())

        # Paginate the queryset
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(serializer.data)


class LabelCreateView(generics.CreateAPIView):
    """
    View for creating new labels.
    """

    serializer_class = LabelSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("add_label")
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        # Set created_by and updated_by to current user
        serializer.save(created_by=request.user, updated_by=request.user)
        return APIResponse.created("Label created successfully")


class LabelRetrieveView(generics.RetrieveAPIView):
    queryset = Label.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for retrieving a specific label.
    """

    serializer_class = LabelSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_label")
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return APIResponse.success(serializer.data)


class LabelUpdateView(generics.UpdateAPIView):
    queryset = Label.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for updating a specific label.
    """

    serializer_class = LabelSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("change_label")
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        # Set updated_by to current user
        serializer.save(updated_by=request.user)
        return APIResponse.success("Label updated successfully")


class LabelDeleteView(generics.DestroyAPIView):
    queryset = Label.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for deleting a specific label.
    """

    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("delete_label")
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Soft delete instead of hard delete
        instance.is_deleted = True
        instance.updated_by = request.user
        instance.save()
        return APIResponse.success("Label deleted successfully")
