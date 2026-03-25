"""
URLs for Locations API endpoints.
"""

from django.urls import path

from . import views

app_name = "personnel_locations"

urlpatterns = [
    path("", views.LocationsListView.as_view(), name="locations-list"),
    path("create/", views.LocationsCreateView.as_view(), name="locations-create"),
    path("<uuid:id>/", views.LocationsRetrieveView.as_view(), name="locations-retrieve"),
    path(
        "<uuid:id>/update/",
        views.LocationsUpdateView.as_view(),
        name="locations-update",
    ),
    path(
        "<uuid:id>/delete/",
        views.LocationsDeleteView.as_view(),
        name="locations-delete",
    ),
]

