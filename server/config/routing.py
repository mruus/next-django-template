"""
WebSocket URL routing for the application.
Defines WebSocket URL patterns for real-time features.
"""

from django.urls import path

from core.consumers import PermissionsConsumer

websocket_urlpatterns = [
    # WebSocket endpoint for real-time permission updates
    path("ws/permissions/", PermissionsConsumer.as_asgi(), name="ws-permissions"),
]
