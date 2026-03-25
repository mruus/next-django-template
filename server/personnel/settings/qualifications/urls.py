"""
URLs for Qualification API endpoints.
"""

from django.urls import path

from . import views

app_name = "personnel_qualifications"

urlpatterns = [
    path("", views.QualificationListView.as_view(), name="qualification-list"),
    path(
        "create/",
        views.QualificationCreateView.as_view(),
        name="qualification-create",
    ),
    path(
        "<uuid:id>/",
        views.QualificationRetrieveView.as_view(),
        name="qualification-retrieve",
    ),
    path(
        "<uuid:id>/update/",
        views.QualificationUpdateView.as_view(),
        name="qualification-update",
    ),
    path(
        "<uuid:id>/delete/",
        views.QualificationDeleteView.as_view(),
        name="qualification-delete",
    ),
]

