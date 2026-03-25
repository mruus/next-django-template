"""
Views for ContractTypes model CRUD operations.
"""

from rest_framework import generics, permissions

from personnel.models import ContractTypes
from utils.defaults import APIResponse, flatten_errors, handle_exceptions, require_permissions
from utils.pagination import CustomPagination

from .serializers import ContractTypesSerializer


class ContractTypesListView(generics.ListAPIView):
    queryset = ContractTypes.objects.filter(is_deleted=False)
    """
    View for listing all contract types.
    """

    serializer_class = ContractTypesSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_contracttypes")
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(serializer.data)


class ContractTypesCreateView(generics.CreateAPIView):
    """
    View for creating new contract types.
    """

    serializer_class = ContractTypesSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("add_contracttypes")
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        serializer.save(created_by=request.user, updated_by=request.user)
        return APIResponse.created("Contract Type created successfully")


class ContractTypesRetrieveView(generics.RetrieveAPIView):
    queryset = ContractTypes.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for retrieving a specific contract type.
    """

    serializer_class = ContractTypesSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_contracttypes")
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return APIResponse.success(serializer.data)


class ContractTypesUpdateView(generics.UpdateAPIView):
    queryset = ContractTypes.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for updating a specific contract type.
    """

    serializer_class = ContractTypesSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("change_contracttypes")
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=partial
        )

        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        serializer.save(updated_by=request.user)
        return APIResponse.success("Contract Type updated successfully")


class ContractTypesDeleteView(generics.DestroyAPIView):
    queryset = ContractTypes.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for deleting a specific contract type (soft delete).
    """

    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("delete_contracttypes")
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.updated_by = request.user
        instance.save()
        return APIResponse.success("Contract Type deleted successfully")

