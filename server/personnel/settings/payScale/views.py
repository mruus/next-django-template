"""
Views for PayScale model CRUD operations.
"""

import uuid

from rest_framework import generics, permissions

from personnel.models import PayScale
from utils.defaults import APIResponse, flatten_errors, handle_exceptions, require_permissions
from utils.pagination import CustomPagination

from .serializers import PayScaleSerializer


class PayScaleListView(generics.ListAPIView):
    queryset = PayScale.objects.filter(is_deleted=False)
    """
    View for listing all pay scales.
    """

    serializer_class = PayScaleSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_payscale")
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(serializer.data)


class PayScaleCreateView(generics.CreateAPIView):
    """
    View for creating new pay scales.
    """

    serializer_class = PayScaleSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("add_payscale")
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if not data.get("slug") or not str(data.get("slug", "")).strip():
            data["slug"] = str(uuid.uuid4())[:12]
        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        serializer.save(created_by=request.user, updated_by=request.user)
        return APIResponse.created("Pay Scale created successfully")


class PayScaleRetrieveView(generics.RetrieveAPIView):
    queryset = PayScale.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for retrieving a specific pay scale.
    """

    serializer_class = PayScaleSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_payscale")
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return APIResponse.success(serializer.data)


class PayScaleUpdateView(generics.UpdateAPIView):
    queryset = PayScale.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for updating a specific pay scale.
    """

    serializer_class = PayScaleSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("change_payscale")
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        data = request.data.copy()
        if "slug" in data and not str(data.get("slug", "")).strip():
            data.pop("slug")
        serializer = self.get_serializer(
            instance, data=data, partial=partial
        )

        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        serializer.save(updated_by=request.user)
        return APIResponse.success("Pay Scale updated successfully")


class PayScaleDeleteView(generics.DestroyAPIView):
    queryset = PayScale.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for deleting a specific pay scale (soft delete).
    """

    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("delete_payscale")
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.updated_by = request.user
        instance.save()
        return APIResponse.success("Pay Scale deleted successfully")

