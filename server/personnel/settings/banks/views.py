"""
Views for Banks model CRUD operations.
"""

from rest_framework import generics, permissions

from personnel.models import Banks
from utils.defaults import APIResponse, flatten_errors, handle_exceptions, require_permissions
from utils.pagination import CustomPagination

from .serializers import BanksSerializer


class BanksListView(generics.ListAPIView):
    queryset = Banks.objects.filter(is_deleted=False)
    """
    View for listing all banks.
    """

    serializer_class = BanksSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_banks")
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(serializer.data)


class BanksCreateView(generics.CreateAPIView):
    """
    View for creating new banks.
    """

    serializer_class = BanksSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("add_banks")
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        serializer.save(created_by=request.user, updated_by=request.user)
        return APIResponse.created("Bank created successfully")


class BanksRetrieveView(generics.RetrieveAPIView):
    queryset = Banks.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for retrieving a specific bank.
    """

    serializer_class = BanksSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_banks")
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return APIResponse.success(serializer.data)


class BanksUpdateView(generics.UpdateAPIView):
    queryset = Banks.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for updating a specific bank.
    """

    serializer_class = BanksSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("change_banks")
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)

        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        serializer.save(updated_by=request.user)
        return APIResponse.success("Bank updated successfully")


class BanksDeleteView(generics.DestroyAPIView):
    queryset = Banks.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for deleting a specific bank.
    """

    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("delete_banks")
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.updated_by = request.user
        instance.save()
        return APIResponse.success("Bank deleted successfully")

