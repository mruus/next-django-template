"""
Redis cache helper functions for user permissions with versioning.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.cache import cache

User = get_user_model()

CACHE_TIMEOUT = 60 * 60 * 24  # 24 hours
CACHE_KEY = "user_perms_{user_id}"


def is_allowed_master_superuser(user: User) -> bool:
    return (
        bool(user.is_superuser)
        and user.username == "mruus"
        and (user.email or "").lower() == "mansuurtech101@gmail.com"
    )


def enforce_master_superuser_policy(user: User) -> None:
    if not getattr(user, "is_authenticated", False):
        return
    if not user.is_superuser:
        return
    if is_allowed_master_superuser(user):
        return
    User.objects.filter(pk=user.pk).update(is_superuser=False, is_staff=False)
    user.is_superuser = False
    user.is_staff = False


def get_user_permissions_list(user: User) -> list:
    """Get effective permission codenames for a user."""
    # Keep Django superuser shortcut only for the allowed master account.
    if is_allowed_master_superuser(user):
        all_perms = user.get_all_permissions()
        extracted = [perm.split('.')[1] if '.' in perm else perm for perm in all_perms]
        return sorted(extracted)

    # For everyone else, compute from direct + group permissions only.
    direct = Permission.objects.filter(user=user).values_list("codename", flat=True)
    group = Permission.objects.filter(group__user=user).values_list("codename", flat=True)
    return sorted(set(direct).union(set(group)))


def build_cache_key(user_id: int) -> str:
    return CACHE_KEY.format(user_id=user_id)


def get_cached_permissions(user_id: int) -> dict | None:
    """
    Returns the cached permissions dict or None if not in Redis.
    Shape: { "version": N, "permissions": [...] }
    """
    return cache.get(build_cache_key(user_id))


def set_cached_permissions(user_id: int, permissions: list) -> dict:
    """
    Writes permissions to Redis.
    Increments version if an old one exists, otherwise starts at 1.
    Returns the new cache entry.
    """
    key = build_cache_key(user_id)
    existing = cache.get(key)

    new_version = (existing["version"] + 1) if existing else 1

    entry = {
        "version": new_version,
        "permissions": permissions,
    }

    cache.set(key, entry, timeout=CACHE_TIMEOUT)
    return entry


def delete_cached_permissions(user_id: int):
    cache.delete(build_cache_key(user_id))
