PROJECT_NAME := sna-v2

BACKEND_DIR := server
FRONTEND_DIR := .

# Ports (override if needed)
client ?= 3000
server ?= 8000

# Log files (THIS IS IMPORTANT)
FRONTEND_LOG := /tmp/$(PROJECT_NAME)-frontend.log
BACKEND_LOG  := /tmp/$(PROJECT_NAME)-backend.log


FRONTEND_START = PORT=$(client) pnpm dev
FRONTEND_INSTALL = pnpm install
FRONTEND_ADD = pnpm add $(pkg)


BACKEND_START = cd $(BACKEND_DIR) && uv run uvicorn config.asgi:application \
	--host 127.0.0.1 --port $(server) --reload

BACKEND_INSTALL = cd $(BACKEND_DIR) && uv sync
COLLECTSTATIC = cd $(BACKEND_DIR) && uv run python manage.py collectstatic --clear --no-input
BACKEND_ADD = cd $(BACKEND_DIR) && uv add $(pkg)

MIGRATE = cd $(BACKEND_DIR) && uv run python manage.py migrate
MAKEMIGRATIONS = cd $(BACKEND_DIR) && uv run python manage.py makemigrations
SYNC_TRANSLATION_FIELDS = cd $(BACKEND_DIR) && uv run python manage.py sync_translation_fields
UPDATE_TRANSLATION_FIELDS = cd $(BACKEND_DIR) && uv run python manage.py update_translation_fields
FLUSH = cd $(BACKEND_DIR) && uv run python manage.py flush --noinput
CREATESUPERUSER = cd $(BACKEND_DIR) && uv run python manage.py createsuperuser
RESET= cd $(BACKEND_DIR) && uv run python manage.py flush --no-input && uv run python manage.py migrate
CLEAN_MIGRATIONS= cd $(BACKEND_DIR) && find . -type d -name migrations -not -path "*/.venv/*" -exec sh -c 'find "$$1" -name "*.py" ! -name "__init__.py" -delete && rm -rf "$$1/__pycache__" 2>/dev/null || true' _ {} \;
BULK_PERMISSIONS = cd $(BACKEND_DIR) && uv run python bulk-permissions.py

start:
	@echo "🚀 Starting Access Gateway..."
	@echo "🔪 Killing ports $(client) and $(server)..."
	@for p in $(client) $(server); do \
		lsof -ti:$$p | xargs kill -9 2>/dev/null || true; \
	done
	@echo "📦 Installing backend dependencies..."
	@$(BACKEND_INSTALL)
	@echo "📦 Installing frontend dependencies..."
	@$(FRONTEND_INSTALL)
	@echo "▶️  Starting frontend..."
	@nohup sh -c "$(FRONTEND_START)" > $(FRONTEND_LOG) 2>&1 &
	@echo "▶️  Starting backend..."
	@nohup sh -c "$(BACKEND_START)" > $(BACKEND_LOG) 2>&1 &
	@echo ""
	@echo "✅ Access Gateway started"
	@echo "🌐 Frontend: http://localhost:$(client)"
	@echo "🔧 Backend:  http://localhost:$(server)"
	@echo ""
	@echo "📋 Logs:"
	@echo "  make logs"

stop:
	@echo "🛑 Stopping Access Gateway..."
	@lsof -ti:$(client) | xargs kill -9 2>/dev/null || true
	@lsof -ti:$(server) | xargs kill -9 2>/dev/null || true
	@echo "✅ Services stopped"

restart: stop start

status:
	@echo "📊 Status:"
	@if curl -s http://localhost:$(client) >/dev/null 2>&1; then \
		echo "✅ Frontend running"; else echo "❌ Frontend stopped"; fi
	@if curl -s http://localhost:$(server) >/dev/null 2>&1; then \
		echo "✅ Backend running"; else echo "❌ Backend stopped"; fi

collectstatic:
	@echo "📦 Collecting static files..."
	@$(COLLECTSTATIC)


logs:
	@echo "📋 Watching all logs (Ctrl+C to stop)..."
	@tail -f $(FRONTEND_LOG) $(BACKEND_LOG)

logs-frontend:
	@tail -f $(FRONTEND_LOG)

logs-backend:
	@tail -f $(BACKEND_LOG)


install: install-frontend install-backend

install-frontend:
	@$(FRONTEND_INSTALL)

install-backend:
	@$(BACKEND_INSTALL)

add-backend:
	@if [ -z "$(pkg)" ]; then \
		echo "❌ Please provide a package name. Example:"; \
		echo "   make add-backend pkg=django-filter"; \
		exit 1; \
	fi
	@$(BACKEND_ADD)

add-frontend:
	@if [ -z "$(pkg)" ]; then \
		echo "❌ Please provide a package name. Example:"; \
		echo "   make add-frontend pkg=axios"; \
		exit 1; \
	fi
	@$(FRONTEND_ADD)

bulk-permissions:
	@echo "🔄 Bulk permissions..."
	@$(BULK_PERMISSIONS)

migrate:
	@$(MIGRATE)

makemigrations:
	@$(MAKEMIGRATIONS)

sync-translation-fields:
	@$(SYNC_TRANSLATION_FIELDS)

update-translation-fields:
	@$(UPDATE_TRANSLATION_FIELDS)

createsuperuser:
	@$(CREATESUPERUSER)

flush:
	@$(FLUSH)

reset:
	@$(RESET)

clean-migrations:
	@echo "🗑️ Cleaning migrations..."
	@$(CLEAN_MIGRATIONS)
	@echo "✅ Migrations cleaned"


kill-ports-linux:
	@echo "💀 Killing ports $(client) and $(server) (Linux)..."
	@sudo fuser -k $(client)/tcp 2>/dev/null || true
	@sudo fuser -k $(server)/tcp 2>/dev/null || true
	@echo "🧹 Clearing logs..."
	@rm -f $(FRONTEND_LOG) $(BACKEND_LOG)
	@echo "✅ Ports killed and logs cleared"


kill-ports-mac:
	@echo "💀 Killing ports $(client) and $(server) (macOS)..."
	@lsof -ti tcp:$(client) | xargs kill -9 2>/dev/null || true
	@lsof -ti tcp:$(server) | xargs kill -9 2>/dev/null || true
	@echo "🧹 Clearing logs..."
	@rm -f $(FRONTEND_LOG) $(BACKEND_LOG)
	@echo "✅ Ports killed and logs cleared"


kill-ports:
	@if [ "$(os)" = "linux" ]; then \
		$(MAKE) kill-ports-linux; \
	elif [ "$(os)" = "mac" ]; then \
		$(MAKE) kill-ports-mac; \
	else \
		echo "❌ Specify OS: make kill-ports os=linux | os=mac"; \
		exit 1; \
	fi
