"""
URLs for ContractTypes API endpoints.
"""

from django.urls import path

from . import views

app_name = "personnel_contractTypes"

urlpatterns = [
    path(
        "",
        views.ContractTypesListView.as_view(),
        name="contractType-list",
    ),
    path(
        "create/",
        views.ContractTypesCreateView.as_view(),
        name="contractType-create",
    ),
    path(
        "<uuid:id>/",
        views.ContractTypesRetrieveView.as_view(),
        name="contractType-retrieve",
    ),
    path(
        "<uuid:id>/update/",
        views.ContractTypesUpdateView.as_view(),
        name="contractType-update",
    ),
    path(
        "<uuid:id>/delete/",
        views.ContractTypesDeleteView.as_view(),
        name="contractType-delete",
    ),
]

