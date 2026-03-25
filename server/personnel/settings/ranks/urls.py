"""
URLs for Ranks API endpoints.
"""

from django.urls import path

from . import views

app_name = "personnel_ranks"

urlpatterns = [
    path("", views.RanksListView.as_view(), name="rank-list"),
    path("create/", views.RanksCreateView.as_view(), name="rank-create"),
    path("<uuid:id>/", views.RanksRetrieveView.as_view(), name="rank-retrieve"),
    path(
        "<uuid:id>/update/",
        views.RanksUpdateView.as_view(),
        name="rank-update",
    ),
    path(
        "<uuid:id>/delete/",
        views.RanksDeleteView.as_view(),
        name="rank-delete",
    ),
]

