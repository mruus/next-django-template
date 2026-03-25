"""
Views for Tribes model CRUD operations.
"""

from rest_framework import generics, permissions

from personnel.models import Tribes
from utils.defaults import APIResponse, flatten_errors, handle_exceptions, require_permissions

from .serializers import TribesSerializer


class TribesListView(generics.ListAPIView):
    queryset = Tribes.objects.filter(is_deleted=False)
    serializer_class = TribesSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_tribes")
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(serializer.data)


class TribesCreateView(generics.CreateAPIView):
    serializer_class = TribesSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("add_tribes")
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        serializer.save(created_by=request.user, updated_by=request.user)
        return APIResponse.created("Tribe created successfully")


class TribesRetrieveView(generics.RetrieveAPIView):
    queryset = Tribes.objects.filter(is_deleted=False)
    lookup_field = "id"
    serializer_class = TribesSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_tribes")
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return APIResponse.success(serializer.data)


class TribesUpdateView(generics.UpdateAPIView):
    queryset = Tribes.objects.filter(is_deleted=False)
    lookup_field = "id"
    serializer_class = TribesSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("change_tribes")
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)

        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        serializer.save(updated_by=request.user)
        return APIResponse.success("Tribe updated successfully")


class TribesDeleteView(generics.DestroyAPIView):
    queryset = Tribes.objects.filter(is_deleted=False)
    lookup_field = "id"
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("delete_tribes")
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.updated_by = request.user
        instance.save()
        return APIResponse.success("Tribe deleted successfully")

