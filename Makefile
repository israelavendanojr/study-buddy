.PHONY: help db db-stop backend mobile setup install dev ip clean

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# ---------- Setup ----------

setup: install db-wait ## First-time setup: install deps + start DB
	@echo "Ready! Run 'make dev' to start all services."

install: ## Install all dependencies
	@echo "Setting up backend..."
	@test -d backend/venv || python3 -m venv backend/venv
	@backend/venv/bin/pip install -q -r backend/requirements.txt
	@echo "Setting up mobile..."
	@cd mobile && npm install --silent 2>/dev/null
	@echo "Dependencies installed."

# ---------- Services ----------

db: ## Start PostgreSQL
	docker compose up -d
	@echo "PostgreSQL starting on localhost:5432"

db-wait: db ## Start PostgreSQL and wait until ready
	@echo "Waiting for PostgreSQL..."
	@until docker exec studbud-db pg_isready -U studbud -q 2>/dev/null; do sleep 1; done
	@echo "PostgreSQL is ready."

db-stop: ## Stop PostgreSQL
	docker compose down

backend: ## Start FastAPI (requires DB running)
	cd backend && venv/bin/uvicorn app.main:app --reload --host 0.0.0.0

mobile: ## Start Expo dev server (iOS)
	cd mobile && npx expo run:ios

dev: ## Start all services (DB + backend + mobile)
	@$(MAKE) db-wait
	@echo "Starting backend and mobile..."
	@cd backend && venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 & \
	cd mobile && npx expo run:ios & \
	wait

ip: ## Print your local IP for physical device testing
	@ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $$1}'

clean: db-stop ## Stop DB and remove venv + node_modules
	rm -rf backend/venv mobile/node_modules
	@echo "Cleaned."
