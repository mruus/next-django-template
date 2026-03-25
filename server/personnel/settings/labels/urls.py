"""
URLs for Label API endpoints.
"""

from django.urls import path

from . import views

app_name = "personnel_labels"

urlpatterns = [
    path("", views.LabelListView.as_view(), name="label-list"),
    path("create/", views.LabelCreateView.as_view(), name="label-create"),
    path("<uuid:id>/", views.LabelRetrieveView.as_view(), name="label-retrieve"),
    path("<uuid:id>/update/", views.LabelUpdateView.as_view(), name="label-update"),
    path("<uuid:id>/delete/", views.LabelDeleteView.as_view(), name="label-delete"),
]
