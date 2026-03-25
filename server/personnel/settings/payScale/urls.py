"""
URLs for PayScale API endpoints.
"""

from django.urls import path

from . import views

app_name = "personnel_payScale"

urlpatterns = [
    path("", views.PayScaleListView.as_view(), name="payScale-list"),
    path("create/", views.PayScaleCreateView.as_view(), name="payScale-create"),
    path(
        "<uuid:id>/",
        views.PayScaleRetrieveView.as_view(),
        name="payScale-retrieve",
    ),
    path(
        "<uuid:id>/update/",
        views.PayScaleUpdateView.as_view(),
        name="payScale-update",
    ),
    path(
        "<uuid:id>/delete/",
        views.PayScaleDeleteView.as_view(),
        name="payScale-delete",
    ),
]

