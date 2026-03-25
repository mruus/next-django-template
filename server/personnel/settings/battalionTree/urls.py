"""
URLs for BattalionTree API endpoints.
"""

from django.urls import path

from . import views

app_name = "personnel_battalionTree"

urlpatterns = [
    path("", views.BattalionTreeListView.as_view(), name="battalionTree-list"),
    path(
        "create/",
        views.BattalionTreeCreateView.as_view(),
        name="battalionTree-create",
    ),
    path(
        "<uuid:id>/",
        views.BattalionTreeRetrieveView.as_view(),
        name="battalionTree-retrieve",
    ),
    path(
        "<uuid:id>/update/",
        views.BattalionTreeUpdateView.as_view(),
        name="battalionTree-update",
    ),
    path(
        "<uuid:id>/delete/",
        views.BattalionTreeDeleteView.as_view(),
        name="battalionTree-delete",
    ),
]

