"""
URLs for Tribes API endpoints.
"""

from django.urls import path

from . import views

app_name = "personnel_tribes"

urlpatterns = [
    path("", views.TribesListView.as_view(), name="tribes-list"),
    path("create/", views.TribesCreateView.as_view(), name="tribes-create"),
    path("<uuid:id>/", views.TribesRetrieveView.as_view(), name="tribes-retrieve"),
    path("<uuid:id>/update/", views.TribesUpdateView.as_view(), name="tribes-update"),
    path("<uuid:id>/delete/", views.TribesDeleteView.as_view(), name="tribes-delete"),
]

