"""
URLs for Group API endpoints.
"""

from django.urls import path

from . import views

app_name = "core_permissions_groups"

urlpatterns = [
    path("", views.GroupListView.as_view(), name="group-list"),
    path("create/", views.GroupCreateView.as_view(), name="group-create"),
    path("<int:id>/", views.GroupRetrieveView.as_view(), name="group-retrieve"),
    path("<int:id>/update/", views.GroupUpdateView.as_view(), name="group-update"),
    path("<int:id>/delete/", views.GroupDeleteView.as_view(), name="group-delete"),
]
