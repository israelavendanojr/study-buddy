# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

All primary commands are in the root `Makefile`:

```bash
make setup       # First-time: install deps + start DB
make dev         # Start DB + backend + mobile (expo run:ios) concurrently
make backend     # FastAPI only (uvicorn --reload on :8000, binds 0.0.0.0)
make mobile      # Build and run on iOS simulator (expo run:ios)
make mobile-expo # Start Expo Go dev server (expo start)
make db          # Start PostgreSQL container only
make db-stop     # Stop PostgreSQL
make ip          # Print local IP for physical device testing
make clean       # Stop DB, remove venv and node_modules
```

**Backend individually:**
```bash
cd backend && source venv/bin/activate
uvicorn app.main:app --reload
```

**Type-check mobile:**
```bash
cd mobile && npx tsc --noEmit
```

**Install new native packages** (use `expo install`, not `npm install`, to get SDK-compatible versions):
```bash
cd mobile && npx expo install <package-name>
```

## Architecture Overview

### High-Level User Flow
1. **Auth**: SignIn/SignUp via Clerk → LoadingScreen validates auth state
2. **Onboarding**: HomeScreen → OnboardingScreen → BuddyNaming → GoalTuning → Confirmation → Roadmap
3. **Lesson flow**: RoadmapScreen (tap a node) → modal → "Start Lesson →" → LessonScreen (6-card tap flow) → back to RoadmapScreen with `completedLessonId` param → confetti + progress advance
4. **Persistence**: Roadmap in `user_roadmaps` (PostgreSQL), lesson content cached in `lesson_cache`, progress tracked via `active_index`

### Backend (`backend/`)

**Stack:** FastAPI + SQLAlchemy + PostgreSQL 16 (Docker). DB credentials: `studbud:studbud_dev@localhost:5432/studbud`. Session via `get_db()` dependency.

**Routers:**
- `app/routers/onboarding.py` — `/onboarding/submit`
- `app/routers/roadmap.py` — `/roadmap/generate`, `/roadmap/coach`, `/roadmap/summarize`, `/roadmap/{user_id}`, `/roadmap/{user_id}/progress`
- `app/routers/lesson.py` — `/lesson/generate`, `/lesson/validate`
- `app/routers/companion.py` — `/companion/{user_id}`, `/companion/{user_id}/stats`, `/companion/{user_id}/initialize`, `/companion/{user_id}/add-xp`, `/companion/{user_id}/progress`, `/companion/{user_id}/mood-breakdown`, `/companion/{user_id}/update-mood`
- `app/routers/cosmetics.py` — `/cosmetics` (list with optional `?item_type=`), `/cosmetics/{user_id}/inventory`, `/cosmetics/{user_id}/equipped`, `/cosmetics/{user_id}/purchase`, `/cosmetics/{user_id}/equip`, `/cosmetics/{user_id}/unequip`

**Models (`app/models.py`):**
- `UserRoadmap` — `clerk_user_id` (unique), `roadmap_json` (JSONB), `active_index`, timestamps
- `LessonCache` — `cache_key` (unique, indexed as `"{lesson_title}::{goal}::{experience}"`), `lesson_json` (JSONB), `created_at`
- `Lesson` — `lesson_key` (unique), `title`, `chapter_title`, `domain`, `lesson_json` (JSONB), `created_at`
- `UserLessonProgress` — `clerk_user_id`, `lesson_key`, `completed_missions` (JSONB), `is_required_complete`, `is_fully_complete`, timestamps
- `CompanionState` — `clerk_user_id` (unique), `level`, `xp`, `mood` (0–100), `streak_days`, `coins`, `gems`, `last_practice_date`, `last_mood_update`, timestamps
- `CosmeticItem` — `item_key` (unique), `name`, `item_type` (`ItemType` enum: `color|accessory|outfit|room_decoration`), `cost_coins`, `cost_gems`, `rarity` (`Rarity` enum: `common|uncommon|rare|legendary`), `unlock_condition`
- `UserInventory` — `clerk_user_id` + `cosmetic_item_id` (unique pair), `is_equipped`, `owned_date`
- `CompanionEquipped` — `clerk_user_id` (unique), `equipped_color_id` (FK), `equipped_outfit_id` (FK), `equipped_accessories` (JSONB list of item_keys), `equipped_room_decorations` (JSONB list of `{item_id, x, y}`)

**AI pattern:** All Claude calls use `anthropic.Anthropic().messages.create`. Model from `ANTHROPIC_MODEL` env var (default `claude-haiku-4-5-20251001`). Responses parsed via `_strip_and_parse()` in `roadmap.py` — import it from there, never duplicate it. Vision calls in `/lesson/validate` hardcode `claude-sonnet-4-6`.

**Companion service (`app/services/companion_service.py`):** All companion business logic lives here — XP/leveling (`add_xp_to_companion` uses `SELECT FOR UPDATE` for concurrency safety), mood calculation (`calculate_mood` is pure/side-effect-free), streak tracking, initialization. XP formula: `xp_needed = 100 * current_level`. Mood = base 50 ± streak bonus (−30 to +20) + cosmetic bonus (up to +20) + room decoration bonus (up to +15). Milestone levels: 5, 10, 25, 50, 100.

**Env vars (`backend/.env`):** `ANTHROPIC_API_KEY` (required), `ANTHROPIC_MODEL` (optional override).

**Error handling pattern:** `HTTPException(status_code=503, ...)` for `APIConnectionError` and `APIStatusError` — follow this in all routers.

**Roadmap JSON schema from LLM:**
```
{ title, chapters[{ id, title, lessons[{ id, title, type: "lesson"|"practice"|"milestone", estimatedMinutes }] }] }
```

**Lesson JSON schema from LLM (6 cards):**
```
{ card1: { companion_message }, card2: { companion_tip, video_key }, card3: { explanation, tell_me_more },
  card4: { description, duration_minutes, focus_point }, card5: { prompt, reflection_choices[] } }
```

### RAG System (`backend/app/rag_resources/`)

Domain-scoped: scan `rag_resources/{domain}/` first; fall back to `rag_resources/` root if the folder doesn't exist. `video_mapping.json` always lives at the root (not inside a domain folder). Current domain: `cooking/` (with subfolders `proteins/`, `knife_skills/`, `sauces/`, `flavor/`, `heat_control/`). To add a new domain, create `rag_resources/{domain}/` with `.md` files — no code changes needed.

XP values: `lesson=50`, `practice=75`, `milestone=150`.

### Mobile (`mobile/`)

**Stack:** Expo SDK 54 React Native + TypeScript. Do not upgrade to SDK 55+.

**Auth:** Clerk (`@clerk/clerk-expo`). Tokens in `expo-secure-store`. `CLERK_PUBLISHABLE_KEY` set directly in `App.tsx`.

**Fonts:** `FredokaOne_400Regular` (headings/numbers), `Nunito_400Regular`, `Nunito_600SemiBold`, `Nunito_700Bold` (body/labels). Loaded via `@expo-google-fonts` in `App.tsx`.

**Navigation (`App.tsx`):** Single `createStackNavigator`. Authenticated stack: Loading, Onboarding, BuddyNaming, GoalTuning, Confirmation, Roadmap, LessonScreen, Home, **CompanionHome**, Badges, Settings, **CompanionShop**. Unauthenticated stack: SignIn, SignUp. All screens `headerShown: false`. Roadmap/Home/CompanionHome/Badges/Settings use `forFade` interpolator; CompanionShop uses default slide.

**API base:** `const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'` — set `EXPO_PUBLIC_API_BASE` in `mobile/.env` or use `make ip` for physical device.

**Params flow:**
- Onboarding screens chain params forward via `navigation.navigate()`
- GoalTuning → Confirmation passes `coachingResult` (from `/roadmap/coach`)
- RoadmapScreen → LessonScreen passes `{ lessonTitle, lessonType, chapterTitle, goal, buddyName, experience, completedLessonTitles, domain, userId, lessonId }`
- LessonScreen → RoadmapScreen navigates back with `{ completedLessonId }` param, which the Roadmap focus listener picks up to fire confetti and advance `active_index`

**LessonScreen card flow (6 cards):**
1. Hook — companion message, shown immediately with loading state until API responds
2. Concept + Video — YouTube embed via `react-native-webview`, falls back to placeholder if `video_key` is empty
3. Why It Matters — explanation + expandable "Tell me more"
4. Mission — task description, focus callout, elapsed timer starts on "I'm ready →"
5. Submission — photo (`expo-image-picker`) + reflection choice; base64 via `expo-file-system`; submits to `/lesson/validate`
6. Feedback — validation result with companion scale pulse, feedback fade-in, XP spring animation

Card transitions: fade out 150ms → set index + reset translateX to 20px → fade+slide in 250ms. Progress bar (animated width) + dots at top, rendered at screen level above card wrapper.

### Design System (`mobile/src/theme/index.ts`)

Always use theme tokens — never hardcode colors:
- `colors.background` (`#FFFDF7`) — page background
- `colors.card` (`#F7F3EC`) — soft card backgrounds
- `colors.mint` (`#A8E6C3`) — primary actions, active states, progress
- `colors.peach` (`#FFCBA4`) — secondary actions (e.g. "Complete" button)
- `colors.golden` (`#FFE082`) — milestones, XP badges, focus callouts
- `colors.sky` (`#B8D8F8`) — active node state on roadmap
- `colors.foreground` (`#3D2C1E`) — all text
- `colors.muted` (`#9E8E82`) — secondary text, back links, placeholders
- `colors.border` (`#EDE7DF`) — borders, inactive dots, progress bar bg
- `radius.sm/md/lg` (16/24/32) — border radii
- `shadows.mint/peach/golden` — color-matched elevation shadows (spread onto button styles)

### Companion Component (`mobile/src/components/Companion.tsx`)

SVG mascot on every screen. Props: `size`, `mood` (`idle`|`happy`|`excited`|`thinking`|`sad`). Animations use `Animated` API with `useNativeDriver: true`. Wrap in `<Animated.View>` to apply external scale/transform animations on top.

### TabBar Component (`mobile/src/components/TabBar.tsx`)

Bottom tab bar shared across main app tabs. Accepts `activeTab` prop (`'home'|'roadmap'|'buddy'|'badges'|'settings'`). Navigates using `useNavigation` internally.

### CompanionHomeScreen (`mobile/src/screens/CompanionHomeScreen.tsx`)

Buddy tab showing companion level/XP bar, mood gauge (0–100 score mapped to color + emoji), streak card, and shortcuts to CompanionShop. Fetches `/companion/{user_id}/stats` + `/companion/{user_id}/progress` in parallel. XP bar width uses `Animated.Value` (cannot use native driver — pixel width). Companion bounces on mood change between fetches. Handles "not initialized" state with an "Wake Up Buddy" CTA that calls `POST /companion/{user_id}/initialize`.

### CompanionShopScreen (`mobile/src/screens/CompanionShopScreen.tsx`)

Cosmetics shop. Fetches `/cosmetics` catalog + `/cosmetics/{user_id}/inventory` + `/companion/{user_id}/stats` (for coin/gem balances). Purchase via `POST /cosmetics/{user_id}/purchase`; equip via `POST /cosmetics/{user_id}/equip`. Item types: `color`, `accessory`, `outfit`, `room_decoration`.

### RoadmapScreen

- `computePathLayout()` builds the SVG winding path and node positions from `roadmap.chapters`
- `PathTrail` renders the SVG path with animated progress fill; `PathNode` renders each lesson node
- Active node: sky bg + pulse animation + Companion floating above at `top: -40`
- `indexMap` (ref) maps `lesson.id → globalIndex` for O(1) progress lookup
- Progress saved to `/roadmap/{user_id}/progress` (fire-and-forget PATCH)
- Confetti triggered via `confettiTriggerRef`; milestone = full 50 pieces, lesson/practice = 20

## Available Claude Models

Only Claude 4.x models are available on this API key. Default (cheapest): `claude-haiku-4-5-20251001`. Override via `ANTHROPIC_MODEL` in `backend/.env`. Vision endpoint always uses `claude-sonnet-4-6` regardless of env var.
