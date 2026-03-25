"""
URLs for JobTitles API endpoints.
"""

from django.urls import path

from . import views

app_name = "personnel_jobTitles"

urlpatterns = [
    path("", views.JobTitlesListView.as_view(), name="jobTitles-list"),
    path(
        "create/",
        views.JobTitlesCreateView.as_view(),
        name="jobTitles-create",
    ),
    path(
        "<uuid:id>/",
        views.JobTitlesRetrieveView.as_view(),
        name="jobTitles-retrieve",
    ),
    path(
        "<uuid:id>/update/",
        views.JobTitlesUpdateView.as_view(),
        name="jobTitles-update",
    ),
    path(
        "<uuid:id>/delete/",
        views.JobTitlesDeleteView.as_view(),
        name="jobTitles-delete",
    ),
]

