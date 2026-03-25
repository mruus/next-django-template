"""
Views for Qualification model CRUD operations.
"""

from rest_framework import generics, permissions

from personnel.models import Qualification
from utils.defaults import APIResponse, flatten_errors, handle_exceptions, require_permissions
from utils.pagination import CustomPagination

from .serializers import QualificationSerializer


class QualificationListView(generics.ListAPIView):
    queryset = Qualification.objects.filter(is_deleted=False)
    """
    View for listing all qualifications.
    """

    serializer_class = QualificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_qualification")
    def list(self, request, *args, **kwargs):
        """
        Handle qualification listing request with pagination.
        """
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(serializer.data)


class QualificationCreateView(generics.CreateAPIView):
    """
    View for creating new qualifications.
    """

    serializer_class = QualificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("add_qualification")
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        serializer.save(created_by=request.user, updated_by=request.user)
        return APIResponse.created("Qualification created successfully")


class QualificationRetrieveView(generics.RetrieveAPIView):
    queryset = Qualification.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for retrieving a specific qualification.
    """

    serializer_class = QualificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_qualification")
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return APIResponse.success(serializer.data)


class QualificationUpdateView(generics.UpdateAPIView):
    queryset = Qualification.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for updating a specific qualification.
    """

    serializer_class = QualificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("change_qualification")
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=partial
        )

        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        serializer.save(updated_by=request.user)
        return APIResponse.success("Qualification updated successfully")


class QualificationDeleteView(generics.DestroyAPIView):
    queryset = Qualification.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for deleting a specific qualification.
    """

    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("delete_qualification")
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.updated_by = request.user
        instance.save()
        return APIResponse.success("Qualification deleted successfully")

