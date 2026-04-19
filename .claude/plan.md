PROMPT 1: Foundation & Context (Read First)
This goes in a README or as the initial prompt. Claude Code reads this once, understands the whole vision, then works on individual tasks.
markdown# Garlic: Recipe Dataset Pipeline & Lesson Restructuring

## Project Vision

Garlic is a structured cooking learning app with three core lesson types:

1. **Technique Lessons** - Teach practical skills (knife skills, searing, deglazing)
   - Structure: Hook → Deep Dive → 4-6 minigames → Optional photo mission
   - Goal: User learns mechanics, sees visual examples, practices recognition

2. **Food Science Lessons** - Teach conceptual understanding (Maillard reaction, emulsification)
   - Structure: Hook → Deep Dive → 3-4 minigames → Optional photo mission
   - Goal: User understands *why*, applies concept across recipes

3. **Recipe Lessons** - Guided walkthrough applying techniques (pan-seared chicken)
   - Structure: Hook → Ingredients → Step-by-step cards (each with checkpoint) → Photo mission
   - Goal: User applies learned techniques, proves competency with photo

## Current State

- **Backend:** FastAPI + PostgreSQL + Supabase + Claude API for lesson generation
- **Frontend:** React Native (mobile), currently broken/misaligned with design
- **Curriculum:** ~150 lessons planned (textbook-based), no recipes yet
- **RAG Sources:** LibreTexts cookbooks (techniques, food science)

## What We're Doing Now

### Phase 1: Recipe Dataset Curation (THIS TASK)

**Goal:** Create a foundation of 10,000-20,000 viable recipes, auto-linked to techniques + food science concepts.

**Process:**
1. Download RecipeNLG dataset from Kaggle
2. Filter recipes (5-15 steps, 5-10 ingredients, no obscure equipment)
3. Use Claude to auto-link each recipe to:
   - Which techniques it teaches/reinforces
   - Which food science concepts it demonstrates
   - Difficulty level + estimated time
4. Store in database (PostgreSQL) with structure:
```json
   {
     "name": "Pan-Seared Chicken",
     "ingredients": [...],
     "steps": [...],
     "techniques": ["searing", "deglazing"],
     "primary_technique": "searing",
     "food_science": ["maillard_reaction"],
     "difficulty": "medium",
     "estimated_minutes": 25
   }
```

**Output:** Curated recipe dataset in PostgreSQL, ready for lesson generation.

### Phase 2: Lesson Data Structure Redesign (AFTER Phase 1)

**Goal:** Restructure lessons to match the three lesson types defined above.

**Current schema:** Uses generic `missions` + `activities` that don't distinguish lesson types.

**New schema:**
```python
{
  "lesson_type": "technique" | "food_science" | "recipe",
  "lesson_key": "unique_id",
  
  # All lessons
  "card1": { "motivation", "learn_points", "image" },
  
  # Technique + Food Science
  "card3": { "headline", "points", "tell_me_more", "images" },
  "activities": [ { "type", "question", "options", ... } ],
  
  # Recipe ONLY
  "ingredient_list": [ { "name", "amount", "unit" } ],
  "steps": [
    {
      "step_number",
      "title",
      "instruction",
      "image_prompt",
      "checkpoint": { "type", "question", "options" }
    }
  ],
  "final_photo_prompt",
  "reflection_prompt"
}
```

**Output:** Updated PostgreSQL schema + migration script.

### Phase 3: Lesson Generation Pipeline Rewrite (AFTER Phase 2)

**Goal:** Create three specialized prompt builders (one per lesson type) that generate lessons matching the new schema.

**Current state:** Single `build_activity_prompt` that generates activities generically.

**New state:**
- `build_technique_lesson_prompt()` - Generates hook + deep dive + 4-6 activities
- `build_food_science_lesson_prompt()` - Generates hook + deep dive + 3-4 activities
- `build_recipe_lesson_prompt()` - Generates ingredients + step-by-step cards + photo prompt

**Inputs to each prompt:**
- Recipe JSON (from Phase 1 dataset)
- RAG-retrieved food science concepts
- User's completed techniques/food science
- Curriculum progression rules

**Output:** Lesson JSON matching Phase 2 schema.

### Phase 4: Frontend Redesign (AFTER Phase 3)

**Goal:** Replace current broken React Native UI with polished design from Figma/Claude Design.

**Inputs:**
- Figma file (GarlicMonkey design)
- New lesson schema (from Phase 2)
- Lesson generation outputs (from Phase 3)

**New components needed:**
- Hook card
- Deep dive card
- Minigame card (multiple choice, image ID, matching, fill blank, sequencing)
- Step-by-step card (recipe only)
- Photo submission + preview

**Output:** Working React Native UI that renders all three lesson types correctly.

---

## Technical Stack

- **Backend:** FastAPI, PostgreSQL, Supabase, Claude API
- **Frontend:** React Native (Expo)
- **Data pipeline:** Python scripts (for dataset curation + lesson generation)
- **Database schema:** PostgreSQL (lessons, users, progress, recipes)

## Success Criteria

- [ ] Phase 1: 10k+ recipes in DB, auto-linked to techniques + food science
- [ ] Phase 2: New lesson schema in DB, migration complete, no data loss
- [ ] Phase 3: Three specialized prompt builders generating valid lesson JSON
- [ ] Phase 4: Frontend renders all three lesson types, user can complete full loop (onboard → learn → do → reflect)

## Next Steps

Start with **Phase 1: Recipe Dataset Curation**. This is the foundation everything else builds on.