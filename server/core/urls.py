from django.urls import include, path

from .auth import urls as auth_urls
from .permissions import urls as permissions_urls
from .users import urls as users_urls

urlpatterns = [
    path("auth/", include(auth_urls)),
    path("permissions/", include(permissions_urls)),
    path("users/", include(users_urls)),
]
