"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from channels.db import database_sync_to_async
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from urllib.parse import parse_qs

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

# Import after Django settings are configured.
from .routing import websocket_urlpatterns

class JWTQueryAuthMiddleware:
    """
    Authenticate websocket connections using a JWT passed via query-string.

    Expected query params:
    - token
    - access_token
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        from django.contrib.auth.models import AnonymousUser
        from core.auth.services.tokens import TokenService

        scope["user"] = AnonymousUser()

        try:
            query_string = scope.get("query_string", b"").decode("utf-8")
            params = parse_qs(query_string)
            token = (params.get("token") or params.get("access_token") or [None])[0]

            if token:
                user, _err = await database_sync_to_async(
                    TokenService.get_user_from_token
                )(token)
                if user:
                    scope["user"] = user
        except Exception:
            # If token parsing/validation fails, keep AnonymousUser.
            pass

        return await self.inner(scope, receive, send)

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTQueryAuthMiddleware(URLRouter(websocket_urlpatterns)),
})
