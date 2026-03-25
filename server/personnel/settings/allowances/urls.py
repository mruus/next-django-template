"""
URLs for Allowances API endpoints.
"""

from django.urls import path

from . import views

app_name = "personnel_allowances"

urlpatterns = [
    path("", views.AllowancesListView.as_view(), name="allowances-list"),
    path(
        "create/",
        views.AllowancesCreateView.as_view(),
        name="allowances-create",
    ),
    path("<uuid:id>/", views.AllowancesRetrieveView.as_view(), name="allowances-retrieve"),
    path(
        "<uuid:id>/update/",
        views.AllowancesUpdateView.as_view(),
        name="allowances-update",
    ),
    path(
        "<uuid:id>/delete/",
        views.AllowancesDeleteView.as_view(),
        name="allowances-delete",
    ),
]

