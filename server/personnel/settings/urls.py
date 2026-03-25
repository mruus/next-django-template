"""
URLs for personnel app.
"""

from django.urls import include, path

app_name = "personnel"

urlpatterns = [
    # Include labels URLs
    path("labels/", include("personnel.settings.labels.urls")),
    # Include qualifications URLs
    path(
        "qualifications/",
        include("personnel.settings.qualifications.urls"),
    ),
    # Include banks URLs
    path("banks/", include("personnel.settings.banks.urls")),
    # Include tribes URLs
    path("tribes/", include("personnel.settings.tribes.urls")),
    # Include locations URLs
    path("locations/", include("personnel.settings.locations.urls")),
    # Include ranks URLs
    path("ranks/", include("personnel.settings.ranks.urls")),
    # Include contract types URLs
    path(
        "contractTypes/",
        include("personnel.settings.contractTypes.urls"),
    ),
    # Include pay scale URLs
    path("payScale/", include("personnel.settings.payScale.urls")),
    # Include allowances URLs
    path("allowances/", include("personnel.settings.allowances.urls")),
    # Include job titles URLs
    path("jobTitles/", include("personnel.settings.jobTitles.urls")),
    # Include battalion tree URLs
    path("battalionTree/", include("personnel.settings.battalionTree.urls")),
]
