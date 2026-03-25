from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerOauthRedirectView,  # ← for OAuth
    SpectacularSwaggerView,
)

urlpatterns = [
    # path('admin/', admin.site.urls),
    path("api/v2/", include("core.urls")),
    path("api/v2/personnel/", include("personnel.urls")),
    # 1. The schema endpoint (JSON) — Swagger UI needs this
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    # 2. Swagger UI served at ROOT /
    path(
        "",
        SpectacularSwaggerView.as_view(
            url_name="schema",  # tells it where to fetch the schema from
            # Optional: customize the page title
            template_name="drf_spectacular/swagger_ui.html",  # default anyway
        ),
        name="swagger-ui",
    ),
]
