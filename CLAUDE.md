# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**StudBud** is an AI-powered learning companion mobile app (Duolingo-style for cooking). Core focus: personalized lesson generation and structured learning paths.

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
make mobile     # Start Expo iOS dev server
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

## Architecture

### Backend (`/backend`)

**Core Routers** (only essential features):
- `app/routers/onboarding.py` - User goal selection and preferences
- `app/routers/roadmap.py` - AI-generated learning paths, curriculum injection, progress tracking
- `app/routers/lesson.py` - Lesson generation (RAG + Claude), activity grading, vision-based photo validation

**Services** (business logic):
- `app/services/lesson_prompt_builder.py` - Type-aware lesson prompt generation
- `app/services/activity_rules.py` - Maps lesson types to activity types
- `app/services/mission_rules.py` - Maps lesson types to required/optional missions

**Models** (only active):
- `Source`, `KbChunk` - RAG knowledge base indexing
- `Lesson` - Cached generated lessons
- `UserRoadmap` - User's generated curriculum
- `UserLessonProgress` - Completion tracking (completed_activities, is_required_complete, is_fully_complete)

**DB**: PostgreSQL with pgvector extension. Core tables: users (via Clerk), lessons, user_roadmaps, user_lesson_progress, sources, kb_chunks.

**Key Dependencies:**
- FastAPI + Uvicorn
- SQLAlchemy + pgvector
- Anthropic SDK (Claude API)
- python-dotenv

**Running the Backend:**
```bash
cd backend && venv/bin/uvicorn app.main:app --reload --host 0.0.0.0
```
Server: `http://localhost:8000`. Mobile connects via EXPO_PUBLIC_API_BASE.

### Mobile App (`/mobile`)

**Core Screens**:
- `src/screens/auth/` - SignIn, SignUp, Loading
- `src/screens/onboarding/` - 6-screen flow (Goal, Experience, Grading, Commitment, Coaching, Confirmation)
- `src/screens/roadmap/` - RoadmapScreen (winding path visualization), LessonScreen (lesson cards + activities)
- `src/screens/main/` - ProfileScreen (user stats), SettingsScreen (sign out)

**Key Components**:
- `TabBar` - 2-tab navigation (Roadmap, Profile)
- `PathNode` - Individual lesson node on roadmap
- `PathTrail` - SVG winding path visualization
- `AnnotatedText` - Text with inline citation badges (RAG sources)

**Theme** (`src/theme/`): Unified color palette, typography, spacing, shadows.

**Key Dependencies:**
- React Native 0.81.5 + Expo 54
- React Navigation (Stack navigator)
- Clerk OAuth
- TypeScript

**Running the Mobile App:**
```bash
cd mobile && npx expo start      # Web browser
cd mobile && npx expo run:ios    # iOS
cd mobile && npx expo run:android # Android
```

## Core Learning Loop

The app's primary user journey:
1. **Onboarding** → User selects goal + preferences (ExperienceScreen, GradingScreen, CommitmentScreen)
2. **Roadmap Generation** → Claude generates personalized multi-chapter curriculum via `/roadmap/generate`
3. **Lesson View** → User sees winding path of lessons (RoadmapScreen)
4. **Lesson Completion** → User works through lesson cards (hook → deep dive → activities → completion)
   - Activities: multiple_choice, image_id, matching, fill_blank, sequence
   - Photo submission: vision model grading for cooking photos
   - Missions deprecated (replaced by activities)
5. **Progress Tracking** → UserLessonProgress updated; XP awarded per activity
6. **Profile** → Shows stats (lessons completed, total XP, roadmap progress)

## Key Concepts

### Lesson Generation
`POST /lesson/generate` endpoint:
1. Checks DB cache first
2. RAG retrieval via pgvector (OpenAI embeddings)
3. Type-aware Claude prompt (technique/recipe/concept/food_science/minigame)
4. Returns structured lesson JSON with activities (not missions)
5. Caches in DB

Lesson structure: `{ card1: { motivation, learn_points }, card3: { headline, points, tell_me_more }, activities: [...], sources_cited: [...] }`

### Activities (not Missions)
- **Sequential**: User swipes through activities in order
- **Types**: multiple_choice, image_id, matching, fill_blank, sequence
- **Grading**: Server-side (activities marked passed/failed)
- **Vision grading**: Claude 4 vision model for photo submission activities
- **Completion**: All activities must be done; progression to next lesson only when all completed

### Roadmap & Progress
- Roadmap structure: chapters → lessons (with id, title, type, estimatedMinutes)
- Progress tracking: `UserLessonProgress` tracks `completed_activities` (list of activity IDs)
- Two completion states: `is_required_complete` (all required activities done), `is_fully_complete` (all activities done)
- Active lesson advances via `active_index` in `UserRoadmap`

### Grading Modes
User's grading preference (from onboarding) affects AI feedback tone:
- `encouraging`: Generous 4–5 star ratings, positive feedback
- `strict`: High bar, honest 2–3 star ratings when criteria missed
- `balanced` (default): Honest ratings, lenient pass threshold

Controlled in `/lesson/validate` endpoint via `_grading_mode` in roadmap `_meta`.

### API Base URL
Mobile app uses `EXPO_PUBLIC_API_BASE` env var to connect to backend. Set via `make sync-ip` for development.

## Development Workflow

1. **Start all services**: `make dev` (DB + backend + mobile dev server)
2. **Backend iteration**: Edit routers/services, server hot-reloads
3. **Mobile iteration**: Edit screens/components, fast refresh works automatically
4. **Clear test data**: `make delete-roadmap` or `make delete-lessons`
5. **Reset fully**: `make clean` + `make setup`

## Common Patterns

- **Routers → Services → Models**: Routers parse HTTP, services contain business logic, models are DB schemas
- **Activity-based lessons**: All new lessons use `activities` array, not deprecated `missions`
- **Type-aware generation**: Lesson type (technique/recipe/etc) drives prompt and activity selection
- **XP tracking**: Awarded per activity completion, no pet/companion system attached
- **Progress is immutable**: Once activity marked complete, it stays complete (no undo)
- **Caching by lesson_key**: Lesson JSON cached in DB; stale lessons regenerated on demand
