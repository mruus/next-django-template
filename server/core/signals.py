"""
Signals for real-time permission updates via WebSocket.
Listens for user and permission changes, updates Redis cache, and notifies WebSocket consumers.
"""
from asgiref.sync import async_to_sync
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.db.models.signals import m2m_changed, post_delete, post_save
from django.dispatch import receiver

User = get_user_model()

from utils.cache import get_user_permissions_list, set_cached_permissions

# Channel layer will be loaded lazily to avoid import issues during Django startup
_channel_layer = None


def get_channel_layer():
    """Lazy loader for channel layer to avoid import issues."""
    global _channel_layer
    if _channel_layer is None:
        try:
            from channels.layers import get_channel_layer as _get_channel_layer
            _channel_layer = _get_channel_layer()
        except ImportError:
            # Channel layer might not be available (e.g., during tests or initial setup)
            _channel_layer = None
    return _channel_layer


def trigger_permission_update(user_id):
    """
    Sends a message through the Channel Layer to notify WebSocket consumers.
    The WebSocket consumer will then fetch updated permissions from Redis.
    """
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return  # Channel layer not available

    try:
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}_perms",  # group name per user
            {
                "type": "permissions.update",  # maps to permissions_update method in consumer
                "user_id": user_id,
            }
        )
    except Exception:
        # Channel layer might not be available (e.g., during tests or Redis down)
        pass


# Signal when a User is saved (e.g., is_staff, is_active, is_superuser changes)
@receiver(post_save, sender=User)
def user_saved(sender, instance, **kwargs):
    """
    Fires when a user is saved.
    Updates Redis cache and notifies WebSocket.
    """
    # Only update if it's not a raw save (e.g., during fixtures loading)
    if not kwargs.get('raw', False):
        # Update Redis cache with current permissions
        perms_list = get_user_permissions_list(instance)
        set_cached_permissions(instance.pk, perms_list)

        # Notify WebSocket
        trigger_permission_update(instance.pk)


# Signal when permissions are added/removed from a user (ManyToMany)
@receiver(m2m_changed, sender=User.user_permissions.through)
def user_permissions_changed(sender, instance, action, **kwargs):
    """
    Fires when permissions are added to or removed from a user.
    Updates Redis cache and notifies WebSocket.
    """
    if isinstance(instance, User) and action in ["post_add", "post_remove", "post_clear"]:
        # Update Redis cache with current permissions
        perms_list = get_user_permissions_list(instance)
        set_cached_permissions(instance.pk, perms_list)

        # Notify WebSocket
        trigger_permission_update(instance.pk)


# Signal when a user is added/removed from a group
@receiver(m2m_changed, sender=User.groups.through)
def user_groups_changed(sender, instance, action, **kwargs):
    """
    Fires when a user is added to or removed from a group.
    Updates Redis cache and notifies WebSocket.
    """
    if isinstance(instance, User) and action in ["post_add", "post_remove", "post_clear"]:
        # Update Redis cache with current permissions
        perms_list = get_user_permissions_list(instance)
        set_cached_permissions(instance.pk, perms_list)

        # Notify WebSocket
        trigger_permission_update(instance.pk)


# Signal when a Group is saved (e.g., group permissions change)
@receiver(post_save, sender=Group)
def group_saved(sender, instance, **kwargs):
    """
    Fires when a group is saved (e.g., group permissions changed).
    Updates Redis cache for all users in the group and notifies their WebSockets.
    """
    # Only update if it's not a raw save (e.g., during fixtures loading)
    if not kwargs.get('raw', False):
        # Get all users in this group
        users = instance.custom_user_set.all()

        for user in users:
            # Update Redis cache for each user
            perms_list = get_user_permissions_list(user)
            set_cached_permissions(user.pk, perms_list)

            # Notify WebSocket for each user
            trigger_permission_update(user.pk)


# Signal when permissions are added/removed from a group
@receiver(m2m_changed, sender=Group.permissions.through)
def group_permissions_changed(sender, instance, action, **kwargs):
    """
    Fires when permissions are added to or removed from a group.
    Updates Redis cache for all users in the group and notifies their WebSockets.
    """
    if isinstance(instance, Group) and action in ["post_add", "post_remove", "post_clear"]:
        # Get all users in this group
        users = instance.custom_user_set.all()

        for user in users:
            # Update Redis cache for each user
            perms_list = get_user_permissions_list(user)
            set_cached_permissions(user.pk, perms_list)

            # Notify WebSocket for each user
            trigger_permission_update(user.pk)
