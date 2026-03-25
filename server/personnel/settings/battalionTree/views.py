"""
Views for BattalionTree model CRUD operations.
"""

from rest_framework import generics, permissions

from personnel.models import BattalionTree
from utils.defaults import APIResponse, flatten_errors, handle_exceptions, require_permissions

from .serializers import BattalionTreeSerializer


class BattalionTreeListView(generics.ListAPIView):
    queryset = BattalionTree.objects.filter(is_deleted=False)
    """
    View for listing all battalion tree nodes.
    """

    serializer_class = BattalionTreeSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_battaliontree")
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(serializer.data)


class BattalionTreeCreateView(generics.CreateAPIView):
    """
    View for creating a battalion tree node.
    """

    serializer_class = BattalionTreeSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("add_battaliontree")
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        serializer.save(created_by=request.user, updated_by=request.user)
        return APIResponse.created("Battalion Tree created successfully")


class BattalionTreeRetrieveView(generics.RetrieveAPIView):
    queryset = BattalionTree.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for retrieving a battalion tree node.
    """

    serializer_class = BattalionTreeSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("view_battaliontree")
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return APIResponse.success(serializer.data)


class BattalionTreeUpdateView(generics.UpdateAPIView):
    queryset = BattalionTree.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for updating a battalion tree node.
    """

    serializer_class = BattalionTreeSerializer
    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("change_battaliontree")
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=partial
        )

        if not serializer.is_valid():
            return APIResponse.error(flatten_errors(serializer.errors))

        serializer.save(updated_by=request.user)
        return APIResponse.success("Battalion Tree updated successfully")


class BattalionTreeDeleteView(generics.DestroyAPIView):
    queryset = BattalionTree.objects.filter(is_deleted=False)
    lookup_field = "id"
    """
    View for deleting a battalion tree node (soft delete).
    """

    permission_classes = [permissions.IsAuthenticated]
    @handle_exceptions
    @require_permissions("delete_battaliontree")
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.updated_by = request.user
        instance.save()
        return APIResponse.success("Battalion Tree deleted successfully")

