"""
URLs for personnel app.
"""

from django.urls import include, path

app_name = "personnel"

urlpatterns = [
    # Include labels URLs
    path("settings/", include("personnel.settings.urls")),
]
