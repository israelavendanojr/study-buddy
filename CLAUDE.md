# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GarlicMonkey is an AI-powered cooking learning app. It has two parts:
- **`backend/`** — FastAPI + PostgreSQL backend that uses Claude to generate personalized learning roadmaps and lessons
- **`user-flow/`** — React Native (Expo) iOS app for the user-facing experience

The buddy/mascot is named **Garlic** and is hardcoded everywhere (not configurable).

## Commands

### First-time setup
```bash
make setup        # install deps + start DB
```

### Daily development
```bash
make db           # start PostgreSQL (Docker)
make backend      # start FastAPI on :8000 (requires DB)
make dev          # start DB + backend + mobile together
```

### Mobile
```bash
cd user-flow && npx expo start --ios   # start Expo dev server
make reset-onboarding                  # wipe AsyncStorage onboarding state in iOS simulator
```

### Utilities
```bash
make ip           # print local IP for physical device testing
make sync-ip      # update mobile/.env with current IP (auto-called by dev/mobile)
make clean        # stop DB + remove venv and node_modules
make delete-roadmap / delete-lessons  # psql shortcuts to wipe DB tables
```

### Backend: run directly
```bash
cd backend && venv/bin/uvicorn app.main:app --reload --host 0.0.0.0
```

### Mobile: install deps
```bash
cd user-flow && npm install
```

## Architecture

### Backend (`backend/app/`)

**Entry point:** `main.py` — creates FastAPI app, runs `Base.metadata.create_all`, applies inline `ALTER TABLE` migrations, registers routers.

**Routers** (all under `/app/routers/`):
- `roadmap.py` — `/roadmap/generate`, `/roadmap/coach`, `/roadmap/summarize`, and CRUD. Calls Claude to generate JSON roadmaps. Post-processes roadmaps to inject `recipe` and `minigame` lesson nodes into each chapter.
- `lesson.py` — `/lesson/generate`, `/lesson/progress`, photo grading via Claude Vision (`VISION_MODEL = claude-sonnet-4-6`). Routes lesson generation to specialized prompt builders based on `lesson_type`.
- `mission.py` — `/mission/*` — manages kitchen missions (photo submission + AI grading)
- `profile.py` — `/profile/*` — streak tracking, XP
- `onboarding.py` — `/onboarding/submit` — lightweight submission endpoint

**Lesson types** (`LessonType` enum): `technique`, `recipe`, `concept`, `food_science`, `minigame`

**Prompt builders** (`services/lesson_prompt_builder.py`):
- `build_technique_lesson_prompt` — 5-activity structure
- `build_food_science_lesson_prompt` — 4-activity structure (no photo mission)
- `build_recipe_lesson_prompt` — `ingredient_list` + `steps` structure (no activities)
- `build_activity_prompt` — fallback for concept/minigame

**Database** (`database.py`): SQLAlchemy with PostgreSQL. Default URL: `postgresql://studbud:studbud_dev@localhost:5432/studbud`. pgvector extension used for RAG embeddings on `kb_chunks`.

**Key models** (`models.py`):
- `Lesson` — stores generated lesson JSON + recipe-specific columns (`ingredient_list`, `steps`, `final_photo_prompt`, `reflection_prompt`)
- `UserRoadmap` — per-user roadmap JSON, `active_index`, streak
- `UserLessonProgress` — per-user per-lesson completion, XP
- `UserMission` — kitchen missions with photo submission/grading lifecycle (`unlocked → submitted → graded`)
- `KbChunk` + `Source` — RAG knowledge base with 1536-dim embeddings

**Claude usage**: Model defaults to `claude-haiku-4-5-20251001` (overridable via `ANTHROPIC_MODEL` env var). Vision grading uses `claude-sonnet-4-6` hardcoded. The Anthropic client is instantiated per-request (not a singleton).

**RAG resources**: `app/rag_resources/` contains culinary textbook chunks used to ground lesson generation.

### Frontend (`user-flow/`)

React Native (Expo ~54) app, TypeScript. No Expo Router file-based routing — navigation is manual state in `App.tsx`.

**Navigation model** (`App.tsx`): Single-level state machine with `isOnboarding`, `isInLesson`, `isInRecipe`, `isInMission` booleans. Screen transitions use a `GridBackground` curtain animation (slide up/fade out).

**Top-level screens:**
- `OnboardingFlow` — 7-step wizard: Welcome → GoalSelection → CookingFrequency → ExperienceLevel → GradingMode → Commitment → RoadmapLoading. Screens are declared in `ONBOARDING_FLOW` array in `OnboardingFlow.tsx`; progress bar and back/forward are derived automatically.
- `TrailScreen` — the main roadmap view (zigzag lesson trail)
- `LessonFlowScreen` — lesson activity player (ConceptBeat → MultipleChoice → FillBlank → ImageID → Sequence → LessonComplete)
- `RecipeFlowScreen` — recipe walkthrough (Intro → Ingredients → Steps → PhotoSubmission → PhotoFeedback)
- `MissionFlowScreen` — kitchen mission flow

**Design system** (`src/theme/index.ts`):
- Colors: `ink` (#1A1A1A), `canvas` (#FBF6E6 warm cream), `amber` (#B35C1E)
- Fonts: Newsreader (headlines), BeVietnamPro (body), SpaceGrotesk (labels)
- All UI uses these tokens — do not introduce arbitrary hex values or font names

**Key components**: `MonkeyMascot`, `InkButton`, `GridBackground`, `SelectableCard`, `PressableCard`, `XPBanner`, `PhotoUploadArea`, `FlowHeader`

**API base URL**: Set via `EXPO_PUBLIC_API_BASE` in `user-flow/.env` (auto-updated by `make sync-ip`).

**AsyncStorage**: Used to persist onboarding state. Reset with `make reset-onboarding` during development.

## Environment

Backend requires `backend/.env` with at minimum:
```
ANTHROPIC_API_KEY=...
DATABASE_URL=postgresql://studbud:studbud_dev@localhost:5432/studbud
```

Mobile requires `user-flow/.env`:
```
EXPO_PUBLIC_API_BASE=http://<local-ip>:8000
```
