
reset-onboarding: ## Reset onboarding state in user-flow iOS simulator (Expo Go)
	@BOOTED=$$(xcrun simctl list devices booted 2>/dev/null | grep -oE '[A-F0-9-]{36}' | head -1); \
	if [ -z "$$BOOTED" ]; then echo "No booted simulator found."; exit 1; fi; \
	EXPO_DATA=~/Library/Developer/CoreSimulator/Devices/$$BOOTED/data/Containers/Data/Application; \
	STORAGE=$$(find "$$EXPO_DATA" -path "*/ExponentExperienceData/@anonymous/user-flow*/RCTAsyncLocalStorage" -type d 2>/dev/null | head -1); \
	if [ -z "$$STORAGE" ]; then echo "AsyncStorage not found — open the user-flow app in Expo Go first."; exit 1; fi; \
	rm -rf "$$STORAGE"/*; \
	echo "Onboarding reset. Restart the app."

ip: ## Print your local IP for physical device testing
	@ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $$1}'

sync-ip: ## Write current IP into mobile/.env
	$(eval IP := $(shell ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $$1}'))
	@sed -i '' 's|^EXPO_PUBLIC_API_BASE=.*|EXPO_PUBLIC_API_BASE=http://$(IP):8000|' mobile/.env
	@echo "API base set to http://$(IP):8000"

