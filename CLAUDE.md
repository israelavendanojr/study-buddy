# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GarlicMonkey is an AI-powered cooking learning app. It has two parts:
- **`backend/`** — FastAPI + Supabase backend (currently early-stage scaffold)
- **`user-flow/`** — React Native (Expo ~54) iOS app — fully built out

The buddy/mascot is named **Garlic** and is hardcoded everywhere (not configurable).

## Commands

### Backend setup
```bash
cd backend && python3 -m venv venv
cd backend && venv/bin/pip install -r requirements.txt
```

### Run backend
```bash
cd backend && venv/bin/uvicorn app.main:app --reload
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

## Architecture

### Backend (`backend/app/`)

Currently an early-stage scaffold. The app has:
- `main.py` — FastAPI app with a single `GET /` health check
- `database.py` — Supabase client initialized from env vars (`SUPABASE_URL`, `SUPABASE_KEY`)

All business logic (routers, models, lesson generation) is yet to be built.

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
SUPABASE_URL=...
SUPABASE_KEY=...          # service role key
SUPABASE_JWT_SECRET=...
```

Mobile (`user-flow/.env`):
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_BASE=http://<local-ip>:8000
```

> Note: The Makefile's `mobile`, `dev`, and `sync-ip` targets reference stale directory names (`mobile/`, `user/`) and do not work. Use the direct commands above instead.
