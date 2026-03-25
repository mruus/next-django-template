# Redis with Docker — Step by Step

## What We're Setting Up

A Redis instance running in Docker, persistent (data survives restarts),
password protected, and ready for Django to connect to.

---

## Step 1 — Install Docker

If you don't have Docker yet:

- **Mac:** https://docs.docker.com/desktop/install/mac-install/
- **Windows:** https://docs.docker.com/desktop/install/windows-install/
- **Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker

# Allow running docker without sudo (log out and back in after this)
sudo usermod -aG docker $USER
```

Verify it works:

```bash
docker --version
docker compose version
```

---

## Step 2 — Project Folder Structure

Inside your Django project root, create a `docker/` folder:

```
yourproject/
├── docker/
│   ├── redis/
│   │   └── redis.conf       ← Redis config file
│   └── docker-compose.yml   ← defines the Redis container
├── yourapp/
├── manage.py
└── ...
```

---

## Step 3 — Create the Redis Config File

This file controls how Redis behaves.

```bash
mkdir -p docker/redis
touch docker/redis/redis.conf
```

Paste this into `docker/redis/redis.conf`:

```conf
# Bind to all interfaces inside Docker
bind 0.0.0.0

# Default port
port 6379

# Password — change this to something strong
requirepass your_strong_password_here

# Persistence — save to disk every 60 seconds if at least 1 key changed
save 60 1

# Where to store the dump file
dir /data
dbfilename dump.rdb

# Max memory (adjust to your machine — 256mb is fine for dev)
maxmemory 256mb

# When max memory is hit, remove least recently used keys
maxmemory-policy allkeys-lru

# How many databases (we use 0 and 1 in our setup)
databases 16

# Log level
loglevel notice
```

> **Important:** Change `your_strong_password_here` to a real password.
> This same password goes into your Django settings later.

---

## Step 4 — Create the Docker Compose File

```bash
touch docker/docker-compose.yml
```

Paste this into `docker/docker-compose.yml`:

```yaml
version: "3.9"

services:
  redis:
    image: redis:7-alpine # lightweight, production-grade image
    container_name: redis_perms
    restart: unless-stopped # auto-restart on crash or reboot
    ports:
      - "6379:6379" # host:container — exposes Redis to Django
    volumes:
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf # mount our config
      - redis_data:/data # persist data across restarts
    command: redis-server /usr/local/etc/redis/redis.conf # use our config
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "your_strong_password_here", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  redis_data:
    driver: local
```

> **Remember:** Update the password in `healthcheck` to match `redis.conf`.

---

## Step 5 — Start Redis

```bash
cd docker
docker compose up -d
```

- `-d` means detached (runs in background)

Check it's running:

```bash
docker ps
```

You should see something like:

```
CONTAINER ID   IMAGE          STATUS         PORTS                    NAMES
a1b2c3d4e5f6   redis:7-alpine Up 2 minutes   0.0.0.0:6379->6379/tcp   redis_perms
```

---

## Step 6 — Test Redis is Working

Connect to Redis inside the container and ping it:

```bash
docker exec -it redis_perms redis-cli -a your_strong_password_here
```

Then inside the Redis CLI:

```
127.0.0.1:6379> ping
PONG

127.0.0.1:6379> set test "hello"
OK

127.0.0.1:6379> get test
"hello"

127.0.0.1:6379> exit
```

If you got `PONG` — Redis is running and reachable.

---

## Step 7 — Connect Django to Redis

Update your `settings.py` (or better, use a `.env` file — see Step 8):

```python
# settings.py

REDIS_HOST = "127.0.0.1"
REDIS_PORT = 6379
REDIS_PASSWORD = "your_strong_password_here"

# Channel Layer (database 0)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [{
                "host": REDIS_HOST,
                "port": REDIS_PORT,
                "password": REDIS_PASSWORD,
                "db": 0,
            }],
        },
    }
}

# Permissions Cache (database 1 — separate from channel layer)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/1",
    }
}
```

---

## Step 8 — Use a .env File (Recommended)

Never hardcode passwords. Use environment variables instead.

Create `.env` in your project root:

```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_strong_password_here
```

Add `.env` to `.gitignore`:

```bash
echo ".env" >> .gitignore
```

Install `python-dotenv`:

```bash
pip install python-dotenv
```

Update `settings.py`:

```python
import os
from dotenv import load_dotenv

load_dotenv()

REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [{
                "host": REDIS_HOST,
                "port": REDIS_PORT,
                "password": REDIS_PASSWORD,
                "db": 0,
            }],
        },
    }
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/1",
    }
}
```

Also update the Docker Compose healthcheck to read from env:

```yaml
# docker-compose.yml
services:
  redis:
    ...
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
```

---

## Useful Docker Commands

| What               | Command                                                  |
| ------------------ | -------------------------------------------------------- |
| Start Redis        | `docker compose up -d`                                   |
| Stop Redis         | `docker compose down`                                    |
| Restart Redis      | `docker compose restart redis`                           |
| View logs          | `docker compose logs -f redis`                           |
| Open Redis CLI     | `docker exec -it redis_perms redis-cli -a your_password` |
| Check memory usage | `docker stats redis_perms`                               |
| Wipe all data      | `docker compose down -v` (deletes the volume too)        |

---

## Quick Checklist

- [ ] Docker installed and running
- [ ] `docker/redis/redis.conf` created with password set
- [ ] `docker/docker-compose.yml` created with password matching
- [ ] `docker compose up -d` ran successfully
- [ ] `docker ps` shows `redis_perms` as Up
- [ ] Redis CLI `ping` returns `PONG`
- [ ] `.env` file created with Redis credentials
- [ ] `.env` added to `.gitignore`
- [ ] `settings.py` reads from environment variables
- [ ] Django `CHANNEL_LAYERS` pointing to DB 0
- [ ] Django `CACHES` pointing to DB 1
