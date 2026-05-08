.PHONY: help db db-stop backend mobile setup install dev ip clean reset-onboarding

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
	
db-stop: ## Stop PostgreSQL
	docker compose down

reset-onboarding: ## Reset onboarding state in user-flow iOS simulator (Expo Go)
	@BOOTED=$$(xcrun simctl list devices booted 2>/dev/null | grep -oE '[A-F0-9-]{36}' | head -1); \
	if [ -z "$$BOOTED" ]; then echo "No booted simulator found."; exit 1; fi; \
	EXPO_DATA=~/Library/Developer/CoreSimulator/Devices/$$BOOTED/data/Containers/Data/Application; \
	STORAGE=$$(find "$$EXPO_DATA" -path "*/ExponentExperienceData/@anonymous/user-flow*/RCTAsyncLocalStorage" -type d 2>/dev/null | head -1); \
	if [ -z "$$STORAGE" ]; then echo "AsyncStorage not found — open the user-flow app in Expo Go first."; exit 1; fi; \
	rm -rf "$$STORAGE"/*; \
	echo "Onboarding reset. Restart the app."

delete-roadmap:
	psql -h localhost -U studbud studbud -c "DELETE FROM user_roadmaps;"

delete-lessons:
	psql -h localhost -p 5432 -U studbud -d studbud -c "DELETE FROM lessons;"

backend: ## Start FastAPI (requires DB running)
	cd backend && venv/bin/uvicorn app.main:app --reload --host 0.0.0.0

mobile: sync-ip ## Start Expo dev server (iOS)
	cd user && npx run start --clear

dev: sync-ip ## Start all services (DB + backend + mobile)
	@$(MAKE) db-wait
	@echo "Starting backend and mobile..."
	@cd backend && venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 & \
	cd mobile && npx expo run:ios & \
	wait

ip: ## Print your local IP for physical device testing
	@ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $$1}'

sync-ip: ## Write current IP into mobile/.env
	$(eval IP := $(shell ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $$1}'))
	@sed -i '' 's|^EXPO_PUBLIC_API_BASE=.*|EXPO_PUBLIC_API_BASE=http://$(IP):8000|' mobile/.env
	@echo "API base set to http://$(IP):8000"

clean: db-stop ## Stop DB and remove venv + node_modules
	rm -rf backend/venv mobile/node_modules
	@echo "Cleaned."
