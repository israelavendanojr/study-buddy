# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GarlicMonkey** is an AI-powered cooking learning companion mobile app (Duolingo-style). Core focus: personalized lesson generation, structured learning paths, and recipe-based cooking challenges.

- **Mobile frontend**: React Native + Expo (TypeScript)
- **Backend API**: FastAPI (Python) with PostgreSQL
- **AI integration**: Anthropic Claude API for lesson generation + vision grading
- **Authentication**: Clerk OAuth

## Key Commands

### Initial Setup
```bash
make setup      # First-time setup: install dependencies + start DB
make install    # Install backend venv + mobile node_modules
```

### Development Services
```bash
make db         # Start PostgreSQL (docker compose)
make db-wait    # Start DB and wait until ready
make db-stop    # Stop PostgreSQL
make backend    # Start FastAPI server (requires DB running)
make mobile     # Start Expo iOS dev server (syncs IP first)
make mobile-expo # Start Expo dev server (web/any platform)
make dev        # Start all services (DB + backend + mobile)
```

### Database
```bash
make delete-roadmap    # Clear user roadmaps
make delete-lessons    # Clear lessons
```

### Utilities
```bash
make ip         # Print local IP for physical device testing
make sync-ip    # Write current IP to mobile/.env for API connection
make clean      # Stop DB and remove venv + node_modules
```

### iOS Native (when changing native dependencies)
```bash
# pod install requires UTF-8 locale — CocoaPods fails without it on this machine
LANG=en_US.UTF-8 pod install --repo-update   # run from mobile/ios/
# Or regenerate the entire native project cleanly:
cd mobile && npx expo prebuild --clean && LANG=en_US.UTF-8 pod install --repo-update
```

## Architecture

### Backend (`/backend`)

**Routers** (`app/routers/`):
- `onboarding.py` — User goal selection and preferences
- `roadmap.py` — AI-generated learning paths, curriculum injection, progress tracking
- `lesson.py` — Lesson generation (RAG + Claude), activity grading, vision-based photo validation
- `mission.py` — Legacy mission submission + grading
- `profile.py` — User stats (XP, streaks, chapter progress)

**Services** (`app/services/`):
- `lesson_prompt_builder.py` — Type-aware lesson prompt generation
- `activity_rules.py` — Maps lesson types to activity types
- `mission_rules.py` — Maps lesson types to required/optional missions

**Models** (only active):
- `Source`, `KbChunk` — RAG knowledge base indexing
- `Lesson` — Cached generated lessons
- `UserRoadmap` — User's generated curriculum
- `UserLessonProgress` — Completion tracking (`completed_activities`, `is_required_complete`, `is_fully_complete`)

**DB**: PostgreSQL with pgvector extension. Core tables: users (via Clerk), lessons, user_roadmaps, user_lesson_progress, sources, kb_chunks.

**Running the Backend:**
```bash
cd backend && venv/bin/uvicorn app.main:app --reload --host 0.0.0.0
```
Server: `http://localhost:8000`. Mobile connects via `EXPO_PUBLIC_API_BASE`.

### Mobile App (`/mobile`)

**Screens** (`src/screens/`):
- `auth/` — SignIn, SignUp, Loading
- `onboarding/` — 6-screen flow (Goal, Experience, Grading, Commitment, Coaching, Confirmation)
- `trail/` — `TrailScreen` (winding path visualization of the lesson roadmap)
- `lesson/` — `LessonFlowScreen` (orchestrates the lesson), `HookScreen`, `ConceptBeatScreen`, `MultipleChoiceScreen`, `FillBlankScreen`, `ImageIDScreen`, `SequenceScreen`, `LessonCompleteScreen`
- `recipe/` — Multi-step cooking flow: `RecipeIntroScreen` → `RecipeIngredientsScreen` → `RecipeStepScreen` → `RecipePhotoScreen` → `RecipeFeedbackLoadingScreen` → `RecipeFeedbackScreen`
- `kitchen/` — `KitchenScreen` (recipe browse/entry point)
- `profile/` — `ProfileScreen` (user stats)
- `mission/` — Legacy mission screens

**Key Components** (`src/components/`):
- `MonkeyMascot` — Animated mascot character
- `ui/InkButton`, `ui/InkCard` — Core design primitives (ink-border block-shadow style)
- `ui/BottomNav` — Bottom tab navigation
- `ui/GridBackground` — Background grid pattern
- `ui/LessonProgressBar` — Activity progress indicator

**API Client** (`src/api/client.ts`): Single typed `request<T>()` function. All backend calls are named exports in this one file — add new endpoints here.

**Theme** (`src/theme/index.ts`): GarlicMonkey design system — warm off-white canvas (`#F9F7F2`), amber primary (`#B35C1E`), ink black (`#1A1A1A`). Always use theme tokens, never hardcode colors.

## Core Learning Loop

1. **Onboarding** → User selects goal + preferences
2. **Roadmap Generation** → Claude generates personalized multi-chapter curriculum via `POST /roadmap/generate`
3. **Trail View** → User sees winding path of lessons (`TrailScreen`)
4. **Lesson Flow** → `LessonFlowScreen` orchestrates: hook → concept beats → activities → completion
   - Activity types: `multiple_choice`, `image_id`, `matching`, `fill_blank`, `sequence`
   - Photo submission: vision model grading for cooking photos
5. **Recipe Flow** → Separate cooking challenge flow with step-by-step guidance and AI photo feedback
6. **Progress Tracking** → `UserLessonProgress` updated; XP awarded per activity
7. **Profile** → Shows stats (lessons completed, total XP, roadmap progress)

## Key Concepts

### Lesson Generation
`POST /lesson/generate`:
1. Checks DB cache first (by `lesson_key`)
2. RAG retrieval via pgvector (OpenAI embeddings)
3. Type-aware Claude prompt (`technique`/`recipe`/`concept`/`food_science`/`minigame`)
4. Returns structured JSON: `{ card1: { motivation, learn_points }, card3: { headline, points, tell_me_more }, activities: [...], sources_cited: [...] }`
5. Caches in DB

### Activities
- **Sequential**: User swipes through in order
- **Types**: `multiple_choice`, `image_id`, `matching`, `fill_blank`, `sequence`
- **Grading**: Server-side; `fill_blank` uses Claude for fuzzy matching
- **Completion**: `completed_activities` list in `UserLessonProgress`; two states: `is_required_complete` and `is_fully_complete`

### Roadmap & Progress
- Structure: chapters → lessons (with `id`, `title`, `type`, `estimatedMinutes`)
- Active lesson tracked via `active_index` in `UserRoadmap`
- Progress is immutable: once an activity is marked complete, it stays complete

### Grading Modes
Set during onboarding, stored in roadmap `_meta._grading_mode`, used by `/lesson/validate`:
- `encouraging`: Generous 4–5 star ratings
- `strict`: High bar, honest 2–3 star ratings
- `balanced` (default): Honest ratings, lenient pass threshold

## Development Workflow

1. **Start all services**: `make dev`
2. **Backend iteration**: Edit routers/services — server hot-reloads automatically
3. **Mobile iteration**: Edit screens/components — Expo fast refresh works automatically
4. **Clear test data**: `make delete-roadmap` or `make delete-lessons`
5. **Reset fully**: `make clean` + `make setup`
6. **Physical device**: `make sync-ip` writes your current LAN IP to `mobile/.env`

## Common Patterns

- **Routers → Services → Models**: Routers parse HTTP, services hold business logic, models are DB schemas
- **Type-aware generation**: Lesson `type` field drives both the Claude prompt and which activity types are included
- **`buddy_name` is always `"Garlic"`**: Hardcoded throughout; no user-configurable buddy name
- **Caching by `lesson_key`**: Lesson JSON cached in DB; regenerated on demand if stale
- **No missions in new lessons**: New lessons use `activities` array only; `missions` are legacy
