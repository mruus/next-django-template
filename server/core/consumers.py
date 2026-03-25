"""
WebSocket consumer for real-time permission updates.
Handles WebSocket connections, permission caching, and real-time updates.
"""
import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

from utils.cache import (
    enforce_master_superuser_policy,
    get_cached_permissions,
    get_user_permissions_list,
    set_cached_permissions,
)


class PermissionsConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time permission updates."""

    async def connect(self):
        """Handle WebSocket connection."""
        self.user = self.scope["user"]

        # Reject unauthenticated connections
        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close()
            return

        await self._enforce_superuser_policy()

        self.user_id = self.user.pk
        self.group_name = f"user_{self.user_id}_perms"

        # Join the user's permission group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send current permissions immediately on connect
        perms = await self.get_or_populate_cache()
        await self.send(json.dumps({
            "type": "initial",
            "version": perms["version"],
            "permissions": perms["permissions"],
        }))

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        # Leave the group
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def permissions_update(self, event):
        """
        Handle permission update event from signals.
        Called by the signal (via group_send with type "permissions.update")
        """
        user_id = event["user_id"]

        # Only process if this update is for the connected user
        if user_id != self.user_id:
            return

        # Fetch fresh permissions and update cache
        perms = await self.get_or_populate_cache()

        # Send update to frontend
        await self.send(json.dumps({
            "type": "update",
            "version": perms["version"],
            "permissions": perms["permissions"],
        }))

    @database_sync_to_async
    def get_or_populate_cache(self) -> dict:
        """
        Read-through cache with correctness guard:
        compare cached permissions against current effective permissions
        and refresh Redis when stale.

        Returns:
            dict: {"version": N, "permissions": [...]}
        """
        User = get_user_model()
        user = User.objects.get(pk=self.user_id)
        current_perms = get_user_permissions_list(user)

        # Try cache first, but only return it if it matches current permissions.
        cached = get_cached_permissions(self.user_id)
        if cached and cached.get("permissions") == current_perms:
            return cached

        return set_cached_permissions(self.user_id, current_perms)

    @database_sync_to_async
    def _enforce_superuser_policy(self):
        enforce_master_superuser_policy(self.user)
