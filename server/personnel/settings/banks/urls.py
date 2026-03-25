"""
URLs for Banks API endpoints.
"""

from django.urls import path

from . import views

app_name = "personnel_banks"

urlpatterns = [
    path("", views.BanksListView.as_view(), name="bank-list"),
    path("create/", views.BanksCreateView.as_view(), name="bank-create"),
    path("<uuid:id>/", views.BanksRetrieveView.as_view(), name="bank-retrieve"),
    path("<uuid:id>/update/", views.BanksUpdateView.as_view(), name="bank-update"),
    path("<uuid:id>/delete/", views.BanksDeleteView.as_view(), name="bank-delete"),
]

