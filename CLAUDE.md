# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GarlicMonkey is an AI-powered cooking learning app. It has two parts:
- **`backend/`** — FastAPI + Supabase backend (currently early-stage scaffold)
- **`user-flow/`** — React Native (Expo ~54) iOS app — fully built out

## Commands

### Backend setup
```bash
cd backend && python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Run backend
```bash
cd backend && source venv/bin/activate
uvicorn app.main:app --reload
```

### Mobile setup
```bash
cd user-flow && npm install
```

### Run mobile
```bash
cd user-flow && npx expo start --ios
```

### Reset onboarding state (iOS simulator)
```bash
make reset-onboarding
```

### Mobile debugging
```bash
cd user-flow && npx expo start --clear   # Clear cache before starting
```

## Architecture

### Backend (`backend/app/`)

FastAPI + Supabase backend for the GarlicMonkey learning platform. Core structure:
- `main.py` — FastAPI app entry point with health check (`GET /`)
- `database.py` — Supabase client initialization and basic queries (e.g., `get_waitlist_emails()`)
- `routers/` — endpoint handlers (currently empty; routers are imported but not yet defined)

**Database schema** (Supabase):
- `lessons` — stores lesson records with activity flow (ConceptBeat → MultipleChoice → FillBlank → ImageID → Sequence)
- `recipe_lessons` — recipe-focused variant with steps and photo checkpoints (added in Phase 2)
- `waitlist` — early access email collection

Lesson generation uses type-aware routing that selects appropriate activity types. Recipe lessons include step-by-step walkthroughs with photo submission and AI feedback cycles.

### Frontend (`user-flow/`)

React Native (Expo ~54) app, TypeScript. Despite `expo-router` being in `package.json`, navigation is a **manual state machine** in `App.tsx` — no file-based routing.

**Navigation model** (`App.tsx`): Boolean flags (`isOnboarding`, `isInLesson`, `isInRecipe`, `isInMission`) control which screen renders. Screen transitions use a `GridBackground` curtain animation (slide up/fade out via `Animated`).

**Screens** (under `src/screens/`):
- `onboarding/OnboardingFlow.tsx` — multi-step wizard; screens declared in `ONBOARDING_FLOW` array, progress bar and navigation derived automatically
- `trail/TrailScreen.tsx` — main roadmap view (zigzag lesson trail)
- `lesson/LessonFlowScreen.tsx` — activity player (ConceptBeat → MultipleChoice → FillBlank → ImageID → Sequence → LessonComplete)
- `recipe/RecipeFlowScreen.tsx` — recipe walkthrough (Intro → Ingredients → Steps → PhotoSubmission → PhotoFeedback)
- `kitchen/MissionFlowScreen.tsx` — kitchen mission flow; `KitchenScreen.tsx` is the entry point

**Design system** (`src/theme/index.ts`): exports `colors`, `fonts`, `spacing`, `borderRadius` — always use these tokens, never raw hex values or font name strings.
- Colors: `ink` (#1A1A1A), `canvas` (#FBF6E6), `amber` (#B35C1E)
- Fonts: Newsreader (headlines), BeVietnamPro (body), SpaceGrotesk (labels)

**Hooks**: `useButtonPress` (haptic press feedback), `useScreenTransition` (curtain animation helper)

**Types**: `src/types/lesson.ts`, `src/types/recipe.ts`

## Environment

Backend (`backend/.env`):
```
SUPABASE_URL=<your_supabase_project_url>
SUPABASE_KEY=<service_role_key>          # Full access for backend
SUPABASE_JWT_SECRET=<jwt_secret>
```

Mobile (`user-flow/.env`):
```
EXPO_PUBLIC_SUPABASE_URL=<your_supabase_project_url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_key>          # Limited public key for client
EXPO_PUBLIC_API_BASE=http://<local-ip>:8000      # Points to local backend; update IP for device testing
```

**Setup tip for device testing**: Use `make ip` to get your local IP, then manually update `EXPO_PUBLIC_API_BASE` in `user-flow/.env`.

> Note: The Makefile's `mobile`, `dev`, and `sync-ip` targets reference stale directory names and do not work. Use the direct commands in the Commands section above instead.

## Key Patterns & Constraints

### Frontend Navigation & State
- **No file-based routing**: Despite `expo-router` in `package.json`, navigation is a **manual state machine in `App.tsx`**. Boolean flags (`isOnboarding`, `isInLesson`, `isInRecipe`, `isInMission`) determine which screen renders.
- **Curtain animation**: Screen transitions use `GridBackground` with slide-up/fade-out animation via React Native `Animated`.
- **AsyncStorage**: Persistent state for onboarding completion and user preferences.

### Design System Compliance
- Always import and use tokens from `src/theme/index.ts` — never hardcode hex colors, font names, or spacing values.
- Core tokens: `colors` (ink, canvas, amber), `fonts` (Newsreader, BeVietnamPro, SpaceGrotesk), `spacing`, `borderRadius`.
- This ensures consistency and makes theme changes manageable.

### Lesson & Recipe Flow
- Lessons are activity sequences: `ConceptBeat` → `MultipleChoice` → `FillBlank` → `ImageID` → `Sequence` → `LessonComplete`.
- Recipe lessons add photo submission and feedback steps: `Intro` → `Ingredients` → `Steps` → `PhotoSubmission` → `PhotoFeedback`.
- Activities reference design system colors and the mascot `MonkeyMascot` component.

### Supabase Integration
- Backend connects via **service role key** (full permissions); frontend uses **anon key** (read-only or restricted RLS policies).
- Both authenticate via environment variables loaded at startup.
- Run database setup/migrations against a Supabase project (not documented here; managed via Supabase dashboard or migrations folder if one exists).
