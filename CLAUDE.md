# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

All primary commands are in the root `Makefile`:

```bash
make setup    # Install deps + start DB
make dev      # Start DB + backend + mobile concurrently
make backend  # FastAPI only (uvicorn --reload on :8000)
make mobile   # Expo dev server only
make db       # Start PostgreSQL container only
make db-stop  # Stop PostgreSQL
make ip       # Print local IP (for physical device testing)
make clean    # Stop DB, remove venv and node_modules
```

**Backend individually:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

**Type-check mobile:**
```bash
cd mobile && npx tsc --noEmit
```

## Architecture Overview

### High-Level Flow
User completes onboarding in the mobile app → ConfirmationScreen POSTs to `/roadmap/generate` → backend calls Ollama (swap point for Claude) → structured JSON roadmap returned → RoadmapScreen renders it as an interactive timeline.

### Backend (`backend/`)
- **FastAPI** with two routers: `/onboarding/submit` and `/roadmap/generate`
- **Database:** PostgreSQL 16 via Docker Compose. Credentials: `studbud:studbud_dev@localhost:5432/studbud`. SQLAlchemy session via `get_db()` dependency.
- **AI endpoint** (`app/routers/roadmap.py`): Streams NDJSON from Ollama (`http://localhost:11434`, model `llama3.2`, env vars `OLLAMA_BASE_URL`/`OLLAMA_MODEL`), assembles response, strips markdown fences, then `json.loads()`. A clearly marked `# SWAP:` comment indicates where to replace with Anthropic SDK.
- The roadmap JSON schema expected from the LLM: `{ title, chapters[{ id, title, emoji, lessons[{ id, title, type, emoji, estimatedMinutes, side }] }] }`

### Mobile (`mobile/`)
- **Expo SDK 54** React Native app (must match Expo Go 54.0.x — do not upgrade to SDK 55+)
- **Navigation:** `@react-navigation/stack`, 5 screens in order: Onboarding → BuddyNaming → GoalTuning → Confirmation → Roadmap
- **Fonts:** FredokaOne (headings) + Nunito (body), loaded in `App.tsx` via `@expo-google-fonts`
- **API base:** `API_BASE = 'http://localhost:8000'` hardcoded in `ConfirmationScreen.tsx` — use `make ip` to find local IP when testing on a physical device
- **Params flow:** Each screen passes accumulated params forward via `navigation.navigate()`. All onboarding fields (camelCase in RN, snake_case for the API) are bundled in `ConfirmationParams` and forwarded to `RoadmapScreen` alongside the `roadmap` object.

### Design System (`mobile/src/theme/index.ts`)
Always use theme tokens — never hardcode colors directly:
- `colors.background` (`#FFFDF7`) — page background
- `colors.mint` (`#A8E6C3`) — primary actions, active states
- `colors.peach` (`#FFCBA4`) — secondary actions
- `colors.golden` (`#FFE082`) — milestones, sparkles
- `colors.foreground` (`#3D2C1E`) — all text
- `colors.muted` (`#9E8E82`) — secondary text, back links
- `radius.sm/md/lg` (16/24/32) — border radii
- `shadows.mint/peach/golden` — color-matched elevation shadows

### Companion Component (`mobile/src/components/Companion.tsx`)
SVG mascot used on every screen. Props: `size`, `mood` (`idle`|`happy`|`excited`|`thinking`|`sad`). All animations use the React Native `Animated` API with `useNativeDriver: true`. The mouth SVG path changes per mood.

### RoadmapScreen Layout
- Vertical center line (absolute, 1.5px wide) divides screen into left/right halves
- Lesson nodes alternate sides per `lesson.side` field from the LLM
- Node sizes: regular = 58px, milestone = 68px, borderRadius: 16 (rounded square)
- States: done (mint bg), active (sky bg + pulse animation), locked (border color)
- Companion (size 48, `happy` mood) floats above the active node at `top: -40`

## LLM Swap Point
The roadmap router has a clearly marked comment for swapping Ollama with the Anthropic SDK. The model ID to use is `claude-opus-4-6`. The prompt instructs the model to return only valid JSON (no markdown), and the response parser already handles stripping markdown fences.
