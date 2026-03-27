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
1. **Authentication**: User signs in/up via Clerk → LoadingScreen validates auth state
2. **Main App**: TabBar navigation provides access to Home, Badges, Settings screens
3. **Onboarding**: From HomeScreen, users can start onboarding: OnboardingScreen → BuddyNamingScreen → GoalTuningScreen (5 fixed steps + 3-4 LLM-generated follow-up questions) → ConfirmationScreen POSTs to `/roadmap/generate` → Claude returns personalized roadmap → RoadmapScreen renders interactive timeline
4. **Persistence**: Roadmap stored in PostgreSQL (UserRoadmap table) indexed by clerk_user_id; active_index tracks progress

### Backend (`backend/`)
- **FastAPI** with routers: `/onboarding/submit`, `/roadmap/generate`, and `/roadmap/coach`
- **Database:** PostgreSQL 16 via Docker Compose. Credentials: `studbud:studbud_dev@localhost:5432/studbud`. SQLAlchemy session via `get_db()` dependency.
  - **UserRoadmap model** (`app/models.py`): Stores `roadmap_json` (JSONB), `active_index` (progress tracking), `clerk_user_id` (auth reference). Auto-timestamps: `created_at`, `updated_at`.
- **AI endpoints** (`app/routers/roadmap.py`): Uses the Anthropic SDK (`anthropic.Anthropic().messages.create`). Model is set via `ANTHROPIC_MODEL` env var (default `claude-haiku-4-5-20251001`). Responses are stripped of markdown fences then `json.loads()`'d via `_strip_and_parse()`.
  - `/roadmap/coach`: Inline coaching endpoint called from GoalTuningScreen after fixed steps. Takes `goal`, `buddy_name`, `conversation_history`, plus onboarding context fields. Returns `{ message, ready, coaching_result }`. Generates short (≤10 word) form-style questions. When `ready=true`, `coaching_result` contains refined goal, motivation, learning style, etc.
  - `/roadmap/generate`: Generates the roadmap. Accepts optional `coaching_result` to enrich the prompt with personalized context (chapter titles, lesson theming, obstacle resilience lessons).
- **Env vars** (`backend/.env`): `ANTHROPIC_API_KEY` (required), `ANTHROPIC_MODEL` (optional override). Loaded at startup via `python-dotenv`.
- The roadmap JSON schema expected from the LLM: `{ title, chapters[{ id, title, emoji, lessons[{ id, title, type, emoji, estimatedMinutes, side }] }] }`

### Mobile (`mobile/`)
- **Expo SDK 54** React Native app (must match Expo Go 54.0.x — do not upgrade to SDK 55+)
- **Authentication:** Clerk integration (`@clerk/clerk-expo`). Tokens cached in `expo-secure-store`. CLERK_PUBLISHABLE_KEY set in `App.tsx`. Initial LoadingScreen validates `useAuth()` before routing.
- **Navigation:** Stack navigator with conditional routing based on auth state:
  - **Authenticated**: LoadingScreen → HomeScreen + TabBar (Home, Badges, Settings tabs)
  - **Onboarding flow** (from HomeScreen): OnboardingScreen → BuddyNaming → GoalTuning → Confirmation → Roadmap
  - **Auth flow** (when unauthenticated): SignInScreen / SignUpScreen
- **Fonts:** FredokaOne (headings) + Nunito (body), loaded in `App.tsx` via `@expo-google-fonts`
- **API base:** `API_BASE = 'http://localhost:8000'` hardcoded in `ConfirmationScreen.tsx` and `GoalTuningScreen.tsx` — use `make ip` to find local IP when testing on a physical device
- **Params flow:** Onboarding screens pass accumulated params forward via `navigation.navigate()`. GoalTuning generates `coachingResult` internally via the `/roadmap/coach` API, then passes it to Confirmation → API as `coaching_result`. All onboarding fields (camelCase in RN, snake_case for the API) are bundled in `ConfirmationParams`.
- **GoalTuning dynamic steps:** After 5 fixed steps (experience, session time, days/week, duration, success vision), the screen calls `/roadmap/coach` to generate 3-4 short follow-up questions that appear as additional steps with the same card UI. A "Skip →" link lets users bypass coaching.
- **TabBar component** (`mobile/src/components/TabBar.tsx`): Provides navigation between Home, Badges, Settings. Rendered on main app screens.

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
- **PathTrail** (`mobile/src/components/PathTrail.tsx`) and **PathNode** (`mobile/src/components/PathNode.tsx`): Render the interactive roadmap timeline
- Vertical center line (absolute, 1.5px wide) divides screen into left/right halves
- Lesson nodes alternate sides per `lesson.side` field from the LLM
- Node sizes: regular = 58px, milestone = 68px, borderRadius: 16 (rounded square)
- States: done (mint bg), active (sky bg + pulse animation), locked (border color)
- Companion (size 48, `happy` mood) floats above the active node at `top: -40`

## Available Claude Models
Only Claude 4.x models are available on this API key. The cheapest is `claude-haiku-4-5-20251001`. To use a different model, set `ANTHROPIC_MODEL` in `backend/.env`.
