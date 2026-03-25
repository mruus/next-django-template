from django.urls import include, path

from . import views
from .sync_views import (
    AppsModelsListView,
    CurrentCustomPermissionsView,
    CustomPermissionsCreateView,
    CustomPermissionsDeleteView,
    CustomPermissionsListView,
    CustomPermissionsUpdateView,
    MenuStructureView,
    MenuSyncExecuteView,
    MenuSyncPreviewView,
    PermissionCreateView,
    PermissionSearchView,
)

app_name = "core_permissions"

urlpatterns = [
    path(
        "",
        views.UsersWithPermissionsListView.as_view(),
        name="users-with-permissions-list",
    ),
    path(
        "assignable-custom-permissions/",
        views.AssignableCustomPermissionsView.as_view(),
        name="assignable-custom-permissions",
    ),
    path(
        "assignable-custom-permissions/apply-group/",
        views.GroupPermissionsDeltaView.as_view(),
        name="assignable-custom-permissions-apply-group",
    ),
    path(
        "assignable-custom-permissions/apply-user-direct/",
        views.UserDirectPermissionsDeltaView.as_view(),
        name="assignable-custom-permissions-apply-user-direct",
    ),
    path("groups/", include("core.permissions.groups.urls")),
    # Sync endpoints
    path("sync/preview/", MenuSyncPreviewView.as_view(), name="menu-sync-preview"),
    path("sync/execute/", MenuSyncExecuteView.as_view(), name="menu-sync-execute"),
    path(
        "sync/current-permissions/",
        CurrentCustomPermissionsView.as_view(),
        name="current-custom-permissions",
    ),
    path("sync/menu-structure/", MenuStructureView.as_view(), name="menu-structure"),
    # CustomPermissions CRUD
    path("custom-permissions/", CustomPermissionsListView.as_view(), name="custom-permissions-list"),
    path("custom-permissions/create/", CustomPermissionsCreateView.as_view(), name="custom-permissions-create"),
    path(
        "custom-permissions/<uuid:id>/update/",
        CustomPermissionsUpdateView.as_view(),
        name="custom-permissions-update",
    ),
    path(
        "custom-permissions/<uuid:id>/delete/",
        CustomPermissionsDeleteView.as_view(),
        name="custom-permissions-delete",
    ),
    # Permission management endpoints
    path("search/", PermissionSearchView.as_view(), name="permission-search"),
    path("create/", PermissionCreateView.as_view(), name="permission-create"),
    path("apps-models/", AppsModelsListView.as_view(), name="apps-models-list"),
    # Fallback API for real-time permissions system
    path("current/", views.UserPermissionsView.as_view(), name="current-permissions"),
]
