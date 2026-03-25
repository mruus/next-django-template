# Real-Time Permissions with Django, Redis & Next.js WebSocket

## What We're Building

Every time a user's permissions change in the DB, Django catches it instantly via signals, updates Redis (as a cache), and the WebSocket pushes the new permissions to the UI — without ever hitting the DB directly.

If Redis is down, the WebSocket falls back to a REST API that goes straight to the DB.

---

## The Full Flow

```
DB change happens
      ↓
Django Signal fires
      ↓
Channel Layer sends message
      ↓
Redis cache updated  ←──── WebSocket reads from here (happy path)
                                      ↓
                            If Redis is DOWN
                                      ↓
                            Fallback API → DB
                                      ↓
                                      UI
```

---

## What Redis Stores Per User

```json
{
  "version": 3,
  "permissions": ["can_edit", "can_view", "can_delete"]
}
```

- `version` increments every time permissions change
- WebSocket compares the version it has vs what Redis returns
- If different → permissions changed → update the UI

---

## Step 1 — Install Required Packages

```bash
pip install django-channels channels-redis redis djangorestframework
```

In `settings.py`:

```python
INSTALLED_APPS = [
    ...
    "channels",
    "rest_framework",
]

# Tell Django to use Channels instead of the default ASGI handler
ASGI_APPLICATION = "yourproject.asgi.application"

# Redis as the channel layer backend
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],
        },
    }
}

# Redis cache config (separate from channel layer)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
    }
}
```

> **Note:** We use two Redis "databases" — `/0` for the channel layer, `/1` for the permissions cache. This keeps them separate and clean.

---

## Step 2 — Set Up the Django Signal

This is what listens to any permission change on the DB and triggers everything else.

Create `signals.py` inside your app:

```python
# yourapp/signals.py

from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver
from django.contrib.auth.models import User, Permission
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .tasks import update_permissions_cache  # we'll make this next

channel_layer = get_channel_layer()

# Fires when a user is saved (e.g. is_staff, is_active changes)
@receiver(post_save, sender=User)
def user_saved(sender, instance, **kwargs):
    trigger_permission_update(instance.pk)

# Fires when permissions are added/removed from a user (ManyToMany)
@receiver(m2m_changed, sender=User.user_permissions.through)
def user_permissions_changed(sender, instance, **kwargs):
    if isinstance(instance, User):
        trigger_permission_update(instance.pk)

def trigger_permission_update(user_id):
    """
    Sends a message through the Channel Layer.
    The WebSocket consumer will pick this up.
    """
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}_perms",  # group name per user
        {
            "type": "permissions.update",  # maps to a method in the consumer
            "user_id": user_id,
        }
    )
```

Register the signals in your app's `apps.py`:

```python
# yourapp/apps.py

from django.apps import AppConfig

class YouAppConfig(AppConfig):
    name = "yourapp"

    def ready(self):
        import yourapp.signals  # noqa
```

---

## Step 3 — The Redis Cache Helper

This handles reading and writing permissions to Redis, including the version counter.

```python
# yourapp/cache.py

from django.core.cache import cache
from django.contrib.auth.models import User

CACHE_TIMEOUT = 60 * 60 * 24  # 24 hours
CACHE_KEY = "user_perms_{user_id}"

def get_user_permissions_list(user: User) -> list:
    """Get a clean list of permission codenames for a user."""
    return list(
        user.user_permissions.values_list("codename", flat=True)
    )

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
```

---

## Step 4 — The WebSocket Consumer

This is the Django Channels consumer. It:

1. On connect → checks Redis, if empty hits DB and populates Redis (cold start)
2. Listens to the signal via the channel group
3. On permission update → writes new cache, sends to UI

```python
# yourapp/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .cache import (
    get_cached_permissions,
    set_cached_permissions,
    get_user_permissions_list,
)

class PermissionsConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = self.scope["user"]

        # Reject unauthenticated connections
        if not self.user.is_authenticated:
            await self.close()
            return

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
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # Called by the signal (via group_send with type "permissions.update")
    async def permissions_update(self, event):
        user_id = event["user_id"]

        # Fetch fresh permissions from DB and update cache
        user = await database_sync_to_async(User.objects.get)(pk=user_id)
        perms_list = await database_sync_to_async(get_user_permissions_list)(user)
        new_cache = await database_sync_to_async(set_cached_permissions)(user_id, perms_list)

        # Push to frontend
        await self.send(json.dumps({
            "type": "update",
            "version": new_cache["version"],
            "permissions": new_cache["permissions"],
        }))

    @database_sync_to_async
    def get_or_populate_cache(self) -> dict:
        """
        Cold start: if Redis has nothing for this user,
        go to DB once, populate cache, and return.
        """
        cached = get_cached_permissions(self.user_id)
        if cached:
            return cached  # Redis hit — no DB needed

        # Redis miss — go to DB (only happens once per user session)
        user = User.objects.get(pk=self.user_id)
        perms_list = get_user_permissions_list(user)
        return set_cached_permissions(self.user_id, perms_list)
```

---

## Step 5 — The Fallback API (When Redis is Down)

A simple DRF endpoint the frontend can call if the WebSocket detects Redis is unavailable.

```python
# yourapp/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .cache import get_cached_permissions, set_cached_permissions, get_user_permissions_list

class UserPermissionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Try Redis first even in the API
        cached = get_cached_permissions(user.pk)
        if cached:
            return Response({
                "source": "cache",
                **cached
            })

        # Redis is down or cold — go straight to DB
        perms_list = get_user_permissions_list(user)

        # Try to repopulate Redis while we're here
        try:
            entry = set_cached_permissions(user.pk, perms_list)
        except Exception:
            # Redis still down — just return from DB directly
            entry = {"version": None, "permissions": perms_list}

        return Response({
            "source": "db",
            **entry
        })
```

Wire it up in `urls.py`:

```python
from yourapp.views import UserPermissionsView

urlpatterns = [
    path("api/permissions/", UserPermissionsView.as_view()),
]
```

---

## Step 6 — WebSocket Routing

```python
# yourproject/routing.py

from django.urls import path
from yourapp.consumers import PermissionsConsumer

websocket_urlpatterns = [
    path("ws/permissions/", PermissionsConsumer.as_asgi()),
]
```

```python
# yourproject/asgi.py

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from .routing import websocket_urlpatterns

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "yourproject.settings")

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
```

---

## Step 7 — Next.js WebSocket Hook

This hook connects, tracks the version, handles the fallback, and keeps permissions in state.

```typescript
// hooks/usePermissions.ts

import { useEffect, useRef, useState } from "react";

interface PermissionsState {
  permissions: string[];
  version: number | null;
  source: "ws" | "api" | null;
}

export function usePermissions() {
  const [state, setState] = useState<PermissionsState>({
    permissions: [],
    version: null,
    source: null,
  });

  const versionRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchFromAPI = async () => {
    try {
      const res = await fetch("/api/permissions/", {
        credentials: "include",
      });
      const data = await res.json();
      versionRef.current = data.version;
      setState({
        permissions: data.permissions,
        version: data.version,
        source: "api",
      });
    } catch (err) {
      console.error("Fallback API also failed:", err);
    }
  };

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket("ws://localhost:8000/ws/permissions/");
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // If version hasn't changed, do nothing
        if (
          data.type === "update" &&
          versionRef.current !== null &&
          data.version === versionRef.current
        ) {
          return;
        }

        // Version changed or initial load — update state
        versionRef.current = data.version;
        setState({
          permissions: data.permissions,
          version: data.version,
          source: "ws",
        });
      };

      ws.onerror = () => {
        console.warn("WebSocket failed — falling back to API");
        fetchFromAPI();
      };

      ws.onclose = () => {
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  return state;
}
```

Use it anywhere in your app:

```tsx
// components/SomeComponent.tsx

import { usePermissions } from "@/hooks/usePermissions";

export default function SomeComponent() {
  const { permissions, version, source } = usePermissions();

  const canEdit = permissions.includes("can_edit");

  return (
    <div>
      {canEdit && <button>Edit</button>}
      <small>
        Perms v{version} via {source}
      </small>
    </div>
  );
}
```

---

## How the Version Logic Works (Summary)

| Situation                 | What Happens                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------- |
| First WebSocket connect   | Redis empty → hit DB → populate Redis with version 1                                |
| Permissions change in DB  | Signal fires → group_send → consumer fetches DB → Redis version goes from N to N+1  |
| WebSocket receives update | Compares incoming version with stored version → different = update UI               |
| Same version received     | Do nothing — no unnecessary re-renders                                              |
| Redis is down             | WebSocket `onerror` fires → `fetchFromAPI()` hits Django REST endpoint → goes to DB |
| WebSocket reconnects      | Fetches current version from Redis again → if different from last known → update UI |

---

## Folder Structure

```
yourproject/
├── yourapp/
│   ├── apps.py          # registers signals
│   ├── signals.py       # listens to DB changes
│   ├── consumers.py     # WebSocket consumer
│   ├── cache.py         # Redis read/write helpers
│   ├── views.py         # fallback API
│   └── urls.py
├── yourproject/
│   ├── asgi.py          # Channels entry point
│   ├── routing.py       # WebSocket URL routing
│   └── settings.py
└── frontend/            # Next.js
    └── hooks/
        └── usePermissions.ts
```

---

## Quick Checklist

- [ ] Redis is running locally (`redis-server`)
- [ ] `channels` and `channels-redis` installed
- [ ] `ASGI_APPLICATION` set in settings
- [ ] `CHANNEL_LAYERS` configured in settings
- [ ] `CACHES` configured in settings (separate Redis DB)
- [ ] Signals registered in `apps.py`
- [ ] Consumer added to routing
- [ ] `asgi.py` updated to use `ProtocolTypeRouter`
- [ ] Next.js hook connected to the right WS URL
- [ ] Fallback API wired in `urls.py`
