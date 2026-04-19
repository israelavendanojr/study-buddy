"""
Type-aware lesson prompt builder.
Shared by both lesson.py and generate_lessons.py.
Builds prompts specific to lesson type (technique, food_science, recipe, minigame, concept).

Phase 3: Specialized builders for technique/food_science/recipe lessons.
- build_technique_lesson_prompt: 5-activity technique structure
- build_food_science_lesson_prompt: 4-activity food science structure (no photo)
- build_recipe_lesson_prompt: ingredient_list + steps structure (no activities, no card3)
- build_activity_prompt: fallback for concept/minigame (4-6 activities)
"""

import json
from .mission_rules import get_mission_rules
from .activity_rules import get_activity_types


def _build_rag_block(chunks: list[dict]) -> str:
    """
    Extract and format reference material for the prompt.
    Shared by all prompt builders.
    """
    if not chunks:
        return ""

    parts = []
    for c in chunks:
        header = f"[SOURCE: {c['source_id']}]"
        if c.get("source_title"):
            header += f" | Title: {c['source_title']}"
        if c.get("author"):
            header += f" | Author: {c['author']}"
        if c.get("quote_page") is not None:
            header += f" | Page: {c['quote_page']}"

        body = c["text"]
        if c.get("key_quote"):
            body = f'KEY QUOTE: "{c["key_quote"]}"\n\n{c["text"]}'

        parts.append(f"{header}\n{body}")

    return (
        "Reference material from culinary textbooks — cite SOURCE IDs inline:\n\n"
        + "\n\n---\n\n".join(parts)
        + "\n\n"
    )


def build_type_aware_prompt(
    lesson_title: str,
    chapter_title: str,
    goal: str,
    experience: int,
    lesson_type: str | None = None,
    completed_lesson_titles: list[str] | None = None,
    chunks: list[dict] | None = None,
) -> str:
    """
    Build a type-aware lesson prompt that branches based on lesson_type.
    Returns the full prompt string ready to send to Claude.
    """

    if not lesson_type:
        lesson_type = "technique"
    if not completed_lesson_titles:
        completed_lesson_titles = []
    if not chunks:
        chunks = []

    exp_label = (
        "total beginner"
        if experience <= 1
        else "some experience" if experience <= 3
        else "experienced"
    )

    completed_block = (
        f"They've already completed: {', '.join(completed_lesson_titles)}."
        if completed_lesson_titles
        else "This is one of their first lessons."
    )

    # Build RAG block
    rag_block = _build_rag_block(chunks)

    # Type-specific structure instructions
    mission_rules = get_mission_rules(lesson_type)
    structure_block = _build_structure_block(lesson_type, mission_rules)

    # Base prompt with rag + context + structure + schema
    base = f"""{rag_block}Generate a {lesson_type} lesson for a learning app. Return ONLY valid JSON — no markdown, no explanation.

Lesson context:
- Lesson title: {lesson_title}
- Chapter: {chapter_title}
- Goal: {goal}
- Experience: {experience}/5 ({exp_label})
- {completed_block}

{structure_block}

Return JSON matching this exact schema:

{{
  "card1": {{
    "motivation": "One verb-first sentence — why THIS skill matters for THIS goal",
    "learn_points": [
      {{
        "text": "Specific skill point 1 (≤12 words)",
        "source_ids": ["source_id_if_grounded"],
        "quote": "Exact quote text supporting this point, if available",
        "quote_author": "Author First Last",
        "quote_book": "Book Title",
        "quote_page": 42
      }},
      {{"text": "Point 2", "source_ids": []}},
      {{"text": "Point 3", "source_ids": []}}
    ],
    "images": null
  }},
  "card3": {{
    "headline": "The single most important insight in 1 sentence",
    "points": [
      {{
        "text": "Key point 1 — short and direct",
        "source_ids": ["source_id_if_grounded"],
        "quote": "Exact quote text supporting this point, if available",
        "quote_author": "Author First Last",
        "quote_book": "Book Title",
        "quote_page": 154
      }},
      {{"text": "Key point 2", "source_ids": []}},
      {{"text": "Key point 3", "source_ids": []}}
    ],
    "tell_me_more": "2-3 sentences deepening the concept",
    "images": null,
    "quiz_checkpoint": {{
      "question": "One concrete question testing the card3 headline",
      "options": ["Option A", "Option B", "Option C"],
      "correct_index": 0,
      "explanation": "1-2 sentences explaining why correct"
    }},
    "reflection_prompt": {{
      "prompt": "Open-ended personal question",
      "min_words": 30
    }}
  }},
  "missions": [
    {{
      "id": "mission_1",
      "mission_type": "mission_type_here",
      "title": "Short mission title",
      "description": "1-2 sentences max: the specific thing the learner will do",
      "why_it_matters": "1 sentence: why this task builds the skill",
      "is_required": true,
      "duration_minutes": 10
    }}
  ],
  "sources_cited": [
    {{"source_id": "source_id", "title": "Title", "author": "Author", "page_start": 42}}
  ]
}}

Rules for all lessons:
- learn_points and points are arrays of objects with text, source_ids, and optional quote fields
- Only add source_ids when the point is directly supported by reference material. Leave empty [] if not grounded
- sources_cited must ONLY include sources you actually referenced
- motivation and headline must remain plain strings — do NOT cite them
- images: Always emit null
- options in quiz_checkpoint must be exactly 3 items, ≤8 words each
- quote: Only include when a KEY QUOTE directly supports this point. Quote must be exact. If no key quote, omit entirely (do not set to null)
- Return ONLY the JSON object"""

    return base


def _build_structure_block(lesson_type: str, mission_rules: dict) -> str:
    """Build the type-specific structure guidance block."""

    if lesson_type == "technique":
        return """STRUCTURE FOR TECHNIQUE LESSONS:
- card1: Hook with motivation + 3 learn points (what they'll be able to do)
- card3: Deep dive on mechanics with quiz_checkpoint and reflection_prompt
- missions: photo_submission (required) + 1 optional (reflection_journal or minigame_image_id)

MISSION DETAILS:
- Photo submission: "Show your [technique] in action. What does proper [technique] look like?"
- Reflection journal: "What was hardest? What clicked?"
- Image ID game: "Pick the image showing correct [technique]" (3-4 image descriptions, user picks one)"""

    elif lesson_type == "food_science":
        return """STRUCTURE FOR FOOD SCIENCE LESSONS:
- card1: Hook with motivation + 3 conceptual points
- card3: Deep dive on the science with quiz_checkpoint and reflection_prompt
- missions: reflection_journal (required) + 1 optional (minigame_matching or minigame_fill_blank)

CRITICAL: NO photo submissions for food_science — this is conceptual learning.

MISSION DETAILS:
- Reflection journal: "How does [concept] change the way you cook? Give a specific example."
- Matching game: "Pair each cooking scenario with the science principle that explains it"
- Fill blank: "Complete this sentence: A proper [concept] requires ___"

Emphasize the science without requiring kitchen access."""

    elif lesson_type == "recipe":
        return """STRUCTURE FOR RECIPE LESSONS:
- card1: Ingredients list + mise visual layout
- card3: Step-by-step walkthrough with technique tips
- missions: 2-3 photo_submission missions (mise en place + final dish + optional reflection)

MISSION DETAILS:
- Mission 1 (required): "Show your ingredients prepped and ready. Proper mise en place."
- Mission 2 (required): "Final plated dish. Did you follow the steps? Does it look right?"
- Mission 3 (optional): "Reflection: What would you change next time?"

Multiple photo missions expected — this is the highest engagement mission type."""

    elif lesson_type == "minigame":
        return """STRUCTURE FOR MINIGAME LESSONS:
- No deep dive card — jump straight to interactive content
- card1: Brief hook explaining what you'll practice (2-3 sentences)
- card3: Can be minimal or empty
- missions: 2 minigame missions ONLY (minigame_matching, minigame_image_id, minigame_sequencing, minigame_fill_blank)

Make it fast (~5 min total), fun, and reinforcing previous lessons. No kitchen required.

MISSION DETAILS:
- minigame_matching: Provide 5 pairs of {"term": "...", "definition": "..."} items
- minigame_image_id: Provide 4 text descriptions in "images": ["desc1", "desc2", "desc3", "desc4"] with "correct_image_index"
- minigame_sequencing: Provide list of scrambled "steps" with correct "correct_order" as list of indices
- minigame_fill_blank: Provide "fill_blank_sentence" with ___ placeholder and "fill_blank_answer" for LLM grading"""

    else:  # concept
        return """STRUCTURE FOR CONCEPT LESSONS:
- card1: Hook with motivation + 3 key points
- card3: Deep dive with quiz_checkpoint and reflection_prompt
- missions: reflection_journal (required) + 1 optional (minigame_matching or pop_quiz)

Similar to food_science but slightly less rigorous. Ingredient knowledge, professional mindset, etc."""


def build_activity_prompt(
    lesson_title: str,
    chapter_title: str,
    goal: str,
    experience: int,
    lesson_type: str | None = None,
    completed_lesson_titles: list[str] | None = None,
    chunks: list[dict] | None = None,
) -> str:
    """
    Build a type-aware lesson prompt that generates ACTIVITIES instead of missions.
    Activities are 4-6 sequential mini-games: multiple_choice, image_id, matching, fill_blank, sequence.
    Returns the full prompt string ready to send to Claude.
    """

    if not lesson_type:
        lesson_type = "technique"
    if not completed_lesson_titles:
        completed_lesson_titles = []
    if not chunks:
        chunks = []

    exp_label = (
        "total beginner"
        if experience <= 1
        else "some experience" if experience <= 3
        else "experienced"
    )

    completed_block = (
        f"They've already completed: {', '.join(completed_lesson_titles)}."
        if completed_lesson_titles
        else "This is one of their first lessons."
    )

    # Build RAG block
    rag_block = _build_rag_block(chunks)

    # Type-specific structure instructions for activities
    activity_types = get_activity_types(lesson_type)
    structure_block = _build_activity_structure_block(lesson_type, activity_types)

    # Base prompt with rag + context + structure + schema
    base = f"""{rag_block}Generate a {lesson_type} lesson for a learning app. Return ONLY valid JSON — no markdown, no explanation.

Lesson context:
- Lesson title: {lesson_title}
- Chapter: {chapter_title}
- Goal: {goal}
- Experience: {experience}/5 ({exp_label})
- {completed_block}

{structure_block}

Return JSON matching this exact schema:

{{
  "card1": {{
    "motivation": "One verb-first sentence — why THIS skill matters for THIS goal",
    "learn_points": [
      {{
        "text": "Specific skill point 1 (≤12 words)",
        "source_ids": ["source_id_if_grounded"],
        "quote": "Exact quote text supporting this point, if available",
        "quote_author": "Author First Last",
        "quote_book": "Book Title",
        "quote_page": 42
      }},
      {{"text": "Point 2", "source_ids": []}},
      {{"text": "Point 3", "source_ids": []}}
    ],
    "images": null
  }},
  "card3": {{
    "headline": "The single most important insight in 1 sentence",
    "points": [
      {{
        "text": "Key point 1 — short and direct",
        "source_ids": ["source_id_if_grounded"],
        "quote": "Exact quote text supporting this point, if available",
        "quote_author": "Author First Last",
        "quote_book": "Book Title",
        "quote_page": 154
      }},
      {{"text": "Key point 2", "source_ids": []}},
      {{"text": "Key point 3", "source_ids": []}}
    ],
    "tell_me_more": "2-3 sentences deepening the concept",
    "images": null
  }},
  "activities": [
    {{
      "id": "act_1",
      "type": "multiple_choice",
      "question": "What does [technique] require?",
      "options": ["Option A (≤15 words)", "Option B (≤15 words)", "Option C (≤15 words)"],
      "correct_index": 0,
      "explanation": "1-2 sentences explaining why correct"
    }},
    {{
      "id": "act_2",
      "type": "image_id",
      "prompt": "Which image shows proper [technique]?",
      "options": ["Image description 1", "Image description 2", "Image description 3"],
      "correct_index": 1,
      "explanation": "1-2 sentences explaining why"
    }},
    {{
      "id": "act_3",
      "type": "matching",
      "prompt": "Match each term to its definition",
      "pairs": [
        {{"term": "Term 1", "definition": "Definition 1"}},
        {{"term": "Term 2", "definition": "Definition 2"}},
        {{"term": "Term 3", "definition": "Definition 3"}}
      ]
    }},
    {{
      "id": "act_4",
      "type": "fill_blank",
      "sentence": "To [technique], you need ___ on the surface.",
      "options": ["low moisture", "high heat", "sharp knife", "plenty of salt"],
      "correct_answer": "low moisture",
      "explanation": "1-2 sentences explaining the principle"
    }},
    {{
      "id": "act_5",
      "type": "sequence",
      "prompt": "Put these steps in the correct order",
      "steps": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
      "correct_order": [0, 1, 2, 3, 4]
    }}
  ],
  "sources_cited": [
    {{"source_id": "source_id", "title": "Title", "author": "Author", "page_start": 42}}
  ]
}}

Rules for all lessons:
- learn_points and points are arrays of objects with text, source_ids, and optional quote fields
- Only add source_ids when the point is directly supported by reference material. Leave empty [] if not grounded
- sources_cited must ONLY include sources you actually referenced
- motivation and headline must remain plain strings — do NOT cite them
- images: Always emit null
- activities: Generate 4-6 activities total. Activity IDs must be act_1, act_2, act_3, etc.
- Activity types: Use only the types specified in the STRUCTURE section
- question/prompt: 1 sentence, clear and specific. If matching, use "prompt" field instead of "question"
- options (for multiple_choice, image_id): exactly 3 items, each ≤15 words
- correct_index: 0-based index of the correct answer
- explanation (for multiple_choice, image_id, fill_blank): 1-2 sentences, explain the principle
- pairs (for matching): array of {{term, definition}} objects. 3-5 pairs. Definitions ≤15 words each
- steps (for sequence): array of steps as strings, in scrambled order
- correct_order (for sequence): array of indices showing the correct order (e.g., [2, 0, 1, 3])
- sentence (for fill_blank): use ___ as placeholder. ≤20 words
- options (for fill_blank): exactly 4 short words/phrases (1-3 words each). One must match correct_answer exactly; others are plausible distractors
- correct_answer (for fill_blank): 1-3 word answer or phrase. Must match exactly one item in options
- quote: Only include when a KEY QUOTE directly supports this point. Quote must be exact. If no key quote, omit entirely (do not set to null)
- Return ONLY the JSON object"""

    return base


def _build_activity_structure_block(lesson_type: str, activity_types: list[str]) -> str:
    """Build the type-specific structure guidance block for activities."""

    activity_types_str = ", ".join(activity_types)

    if lesson_type == "technique":
        return f"""STRUCTURE FOR TECHNIQUE LESSONS:
- card1: Hook with motivation + 3 learn points (what they'll be able to do)
- card3: Deep dive on mechanics (no quiz_checkpoint or reflection_prompt)
- activities: 4-6 activities mixing {activity_types_str}

These are mini-games done back-to-back. Each is on its own screen.
Focus on visual and procedural understanding of the technique."""

    elif lesson_type == "food_science":
        return f"""STRUCTURE FOR FOOD SCIENCE LESSONS:
- card1: Hook with motivation + 3 conceptual points
- card3: Deep dive on the science (no quiz_checkpoint or reflection_prompt)
- activities: 4-6 activities mixing {activity_types_str}

These are mini-games testing conceptual knowledge. No kitchen required.
Make them reinforcing and engaging."""

    elif lesson_type == "recipe":
        return f"""STRUCTURE FOR RECIPE LESSONS:
- card1: Ingredients list + mise visual layout + motivation
- card3: Step-by-step walkthrough with technique tips
- activities: 4-6 activities mixing {activity_types_str}

These mini-games should reinforce the recipe steps and technique mastery.
Focus on sequencing and ingredient knowledge."""

    elif lesson_type == "minigame":
        return f"""STRUCTURE FOR MINIGAME LESSONS:
- card1: Brief hook explaining what to practice (2-3 sentences)
- card3: Can be minimal
- activities: 4-6 activities, all game-like. Use {activity_types_str}

Make it fast (~5 min total), fun, and reinforcing. No kitchen required.
This is pure skill drill — keep it snappy."""

    else:  # concept
        return f"""STRUCTURE FOR CONCEPT LESSONS:
- card1: Hook with motivation + 3 key points
- card3: Deep dive with conceptual explanation
- activities: 4-6 activities mixing {activity_types_str}

Similar to food_science but focused on ingredient/technique concepts.
Make activities engaging and reflective."""


# ============================================================================
# PHASE 3: SPECIALIZED BUILDERS (called by lesson.py routing)
# ============================================================================


def build_technique_lesson_prompt(
    lesson_title: str,
    chapter_title: str,
    goal: str,
    experience: int,
    completed_lesson_titles: list[str] | None = None,
    chunks: list[dict] | None = None,
) -> str:
    """
    Build a technique lesson prompt with 5 specialized activities.
    Focus on visual/procedural understanding and technique execution.
    """
    if not completed_lesson_titles:
        completed_lesson_titles = []
    if not chunks:
        chunks = []

    exp_label = (
        "total beginner"
        if experience <= 1
        else "some experience" if experience <= 3
        else "experienced"
    )

    completed_block = (
        f"They've already completed: {', '.join(completed_lesson_titles)}."
        if completed_lesson_titles
        else "This is one of their first lessons."
    )

    rag_block = _build_rag_block(chunks)

    base = f"""{rag_block}Generate a technique lesson for a learning app. Return ONLY valid JSON — no markdown, no explanation.

Lesson context:
- Lesson title: {lesson_title}
- Chapter: {chapter_title}
- Goal: {goal}
- Experience: {experience}/5 ({exp_label})
- {completed_block}

STRUCTURE FOR TECHNIQUE LESSONS:
- card1: Hook with motivation + 3 learn points (what they'll be able to do)
- card3: Deep dive on mechanics (no quiz_checkpoint or reflection_prompt)
- activities: Exactly 5 activities in this order:
    1. multiple_choice — test a key decision point within the technique
    2. sequence — put technique steps in correct order (5-6 steps)
    3. image_id — identify the correct visual outcome of the technique
    4. multiple_choice — test a common mistake / what-not-to-do
    5. fill_blank or image_id — reinforce a mechanical principle

These are mini-games done back-to-back, one screen at a time.
Focus on physical mechanics, step order, and visual recognition.

Return JSON matching this exact schema:

{{
  "card1": {{
    "motivation": "One verb-first sentence — why THIS skill matters for THIS goal",
    "learn_points": [
      {{
        "text": "Specific skill point 1 (≤12 words)",
        "source_ids": ["source_id_if_grounded"],
        "quote": "Exact quote text supporting this point, if available",
        "quote_author": "Author First Last",
        "quote_book": "Book Title",
        "quote_page": 42
      }},
      {{"text": "Point 2", "source_ids": []}},
      {{"text": "Point 3", "source_ids": []}}
    ],
    "images": null
  }},
  "card3": {{
    "headline": "The single most important insight in 1 sentence",
    "points": [
      {{
        "text": "Key point 1 — short and direct",
        "source_ids": ["source_id_if_grounded"],
        "quote": "Exact quote text supporting this point, if available",
        "quote_author": "Author First Last",
        "quote_book": "Book Title",
        "quote_page": 154
      }},
      {{"text": "Key point 2", "source_ids": []}},
      {{"text": "Key point 3", "source_ids": []}}
    ],
    "tell_me_more": "2-3 sentences deepening the concept",
    "images": null
  }},
  "activities": [
    {{
      "id": "act_1",
      "type": "multiple_choice",
      "question": "What does [technique] require?",
      "options": ["Option A (≤15 words)", "Option B (≤15 words)", "Option C (≤15 words)"],
      "correct_index": 0,
      "explanation": "1-2 sentences explaining why correct"
    }},
    {{
      "id": "act_2",
      "type": "sequence",
      "prompt": "Put these technique steps in the correct order",
      "steps": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
      "correct_order": [0, 1, 2, 3, 4]
    }},
    {{
      "id": "act_3",
      "type": "image_id",
      "prompt": "Which image shows proper [technique]?",
      "options": ["Image description 1", "Image description 2", "Image description 3"],
      "correct_index": 1,
      "explanation": "1-2 sentences explaining why"
    }},
    {{
      "id": "act_4",
      "type": "multiple_choice",
      "question": "Common mistake: What NOT to do?",
      "options": ["Mistake A (≤15 words)", "Mistake B (≤15 words)", "Correct approach (≤15 words)"],
      "correct_index": 2,
      "explanation": "1-2 sentences explaining the principle"
    }},
    {{
      "id": "act_5",
      "type": "fill_blank",
      "sentence": "To [technique], you need ___ on the surface.",
      "options": ["low moisture", "high heat", "sharp knife", "plenty of salt"],
      "correct_answer": "low moisture",
      "explanation": "1-2 sentences explaining the mechanical principle"
    }}
  ],
  "sources_cited": [
    {{"source_id": "source_id", "title": "Title", "author": "Author", "page_start": 42}}
  ]
}}

Rules for all lessons:
- learn_points and points are arrays of objects with text, source_ids, and optional quote fields
- Only add source_ids when the point is directly supported by reference material. Leave empty [] if not grounded
- sources_cited must ONLY include sources you actually referenced
- motivation and headline must remain plain strings — do NOT cite them
- images: Always emit null
- activities: EXACTLY 5 activities in the exact order specified. Activity IDs must be act_1, act_2, act_3, act_4, act_5
- Activity types in order: multiple_choice, sequence, image_id, multiple_choice, fill_blank OR image_id
- question/prompt: 1 sentence, clear and specific
- options (for multiple_choice, image_id): exactly 3 items, each ≤15 words
- correct_index: 0-based index of the correct answer
- explanation: 1-2 sentences, explain the principle
- steps (for sequence): array of 5-6 steps in scrambled order
- correct_order (for sequence): array of indices showing the correct order (e.g., [2, 0, 1, 3, 4])
- sentence (for fill_blank): use ___ as placeholder. ≤20 words
- options (for fill_blank): exactly 4 short words/phrases (1-3 words each). One must match correct_answer; others are plausible distractors
- correct_answer (for fill_blank): 1-3 word answer or phrase. Must match exactly one item in options
- quote: Only include when a KEY QUOTE directly supports this point. Quote must be exact. If no key quote, omit entirely
- Return ONLY the JSON object"""

    return base


def build_food_science_lesson_prompt(
    lesson_title: str,
    chapter_title: str,
    goal: str,
    experience: int,
    completed_lesson_titles: list[str] | None = None,
    chunks: list[dict] | None = None,
) -> str:
    """
    Build a food science lesson prompt with 4 specialized activities.
    Conceptual only — no kitchen access required. No photo submissions.
    """
    if not completed_lesson_titles:
        completed_lesson_titles = []
    if not chunks:
        chunks = []

    exp_label = (
        "total beginner"
        if experience <= 1
        else "some experience" if experience <= 3
        else "experienced"
    )

    completed_block = (
        f"They've already completed: {', '.join(completed_lesson_titles)}."
        if completed_lesson_titles
        else "This is one of their first lessons."
    )

    rag_block = _build_rag_block(chunks)

    base = f"""{rag_block}Generate a food science lesson for a learning app. Return ONLY valid JSON — no markdown, no explanation.

Lesson context:
- Lesson title: {lesson_title}
- Chapter: {chapter_title}
- Goal: {goal}
- Experience: {experience}/5 ({exp_label})
- {completed_block}

STRUCTURE FOR FOOD SCIENCE LESSONS:
- card1: Explains the scientific principle in plain English — why knowing this chemistry makes you a better cook
- card3: Scientific mechanism (Maillard, denaturation, emulsification, etc.) in concrete, non-pretentious terms. Use kitchen analogies.
- activities: Exactly 4 activities in this order:
    1. multiple_choice — test understanding of the core mechanism
    2. matching — pair cooking scenarios to scientific explanations (4 pairs)
    3. fill_blank — complete a sentence about the principle with a technical term
    4. multiple_choice — apply the science to a practical cooking decision

CRITICAL CONSTRAINTS:
- DO NOT include photo missions or activities requiring kitchen access.
- This lesson is entirely conceptual — answerable from memory and comprehension.
- DO NOT use sequence or image_id activity types.

These are mini-games done back-to-back, one screen at a time.

Return JSON matching this exact schema:

{{
  "card1": {{
    "motivation": "One verb-first sentence — why THIS concept matters for THIS goal",
    "learn_points": [
      {{
        "text": "Specific concept point 1 (≤12 words)",
        "source_ids": ["source_id_if_grounded"],
        "quote": "Exact quote text supporting this point, if available",
        "quote_author": "Author First Last",
        "quote_book": "Book Title",
        "quote_page": 42
      }},
      {{"text": "Point 2", "source_ids": []}},
      {{"text": "Point 3", "source_ids": []}}
    ],
    "images": null
  }},
  "card3": {{
    "headline": "The single most important insight in 1 sentence",
    "points": [
      {{
        "text": "Key point 1 — short and direct",
        "source_ids": ["source_id_if_grounded"],
        "quote": "Exact quote text supporting this point, if available",
        "quote_author": "Author First Last",
        "quote_book": "Book Title",
        "quote_page": 154
      }},
      {{"text": "Key point 2", "source_ids": []}},
      {{"text": "Key point 3", "source_ids": []}}
    ],
    "tell_me_more": "2-3 sentences deepening the scientific concept",
    "images": null
  }},
  "activities": [
    {{
      "id": "act_1",
      "type": "multiple_choice",
      "question": "Which best explains [mechanism]?",
      "options": ["Explanation A (≤15 words)", "Explanation B (≤15 words)", "Explanation C (≤15 words)"],
      "correct_index": 0,
      "explanation": "1-2 sentences explaining the science"
    }},
    {{
      "id": "act_2",
      "type": "matching",
      "prompt": "Match each cooking scenario to the science principle that explains it",
      "pairs": [
        {{"term": "Scenario 1", "definition": "Science principle A"}},
        {{"term": "Scenario 2", "definition": "Science principle B"}},
        {{"term": "Scenario 3", "definition": "Science principle C"}},
        {{"term": "Scenario 4", "definition": "Science principle D"}}
      ]
    }},
    {{
      "id": "act_3",
      "type": "fill_blank",
      "sentence": "A proper [concept] requires ___ to occur.",
      "options": ["denaturing proteins", "maillard reaction", "emulsification", "caramelization"],
      "correct_answer": "denaturing proteins",
      "explanation": "1-2 sentences explaining the mechanism"
    }},
    {{
      "id": "act_4",
      "type": "multiple_choice",
      "question": "How would you apply this science to a real cooking decision?",
      "options": ["Decision A (≤15 words)", "Decision B (≤15 words)", "Decision C (≤15 words)"],
      "correct_index": 0,
      "explanation": "1-2 sentences explaining the application"
    }}
  ],
  "sources_cited": [
    {{"source_id": "source_id", "title": "Title", "author": "Author", "page_start": 42}}
  ]
}}

Rules for all lessons:
- learn_points and points are arrays of objects with text, source_ids, and optional quote fields
- Only add source_ids when the point is directly supported by reference material. Leave empty [] if not grounded
- sources_cited must ONLY include sources you actually referenced
- motivation and headline must remain plain strings — do NOT cite them
- images: Always emit null
- activities: EXACTLY 4 activities in the exact order specified. Activity IDs must be act_1, act_2, act_3, act_4
- Activity types: multiple_choice, matching, fill_blank, multiple_choice (NO sequence, NO image_id)
- question/prompt: 1 sentence, clear and specific
- options (for multiple_choice): exactly 3 items, each ≤15 words
- correct_index: 0-based index of the correct answer
- explanation: 1-2 sentences, explain the science
- pairs (for matching): exactly 4 pairs of {{term, definition}}. Definitions ≤15 words each
- sentence (for fill_blank): use ___ as placeholder. ≤20 words
- options (for fill_blank): exactly 4 short words/phrases (1-3 words each). One must match correct_answer; others are plausible distractors
- correct_answer (for fill_blank): 1-3 word answer or phrase. Must match exactly one item in options
- quote: Only include when a KEY QUOTE directly supports this point. Quote must be exact. If no key quote, omit entirely
- Return ONLY the JSON object"""

    return base


def build_recipe_lesson_prompt(
    recipe_json: dict | None,
    techniques_to_teach: list[str] | None,
    food_science_to_reinforce: list[str] | None,
    lesson_title: str,
    chapter_title: str,
    goal: str,
    experience: int,
    chunks: list[dict] | None = None,
) -> str:
    """
    Build a recipe lesson prompt with ingredient_list, steps, checkpoints, and photo prompts.
    NO card3. NO activities array.

    Args:
        recipe_json: dict with name, ingredients, steps, techniques, food_science, etc.
        techniques_to_teach: list of technique names to emphasize
        food_science_to_reinforce: list of food science concepts to reinforce
        lesson_title: the lesson title
        chapter_title: the chapter title
        goal: user's goal
        experience: experience level (1-5)
        chunks: RAG material chunks
    """
    if not techniques_to_teach:
        techniques_to_teach = []
    if not food_science_to_reinforce:
        food_science_to_reinforce = []
    if not chunks:
        chunks = []

    exp_label = (
        "total beginner"
        if experience <= 1
        else "some experience" if experience <= 3
        else "experienced"
    )

    rag_block = _build_rag_block(chunks)

    # Build recipe context or fallback
    if recipe_json:
        recipe_context = f"""Recipe context (use as source of truth — do not invent ingredients or steps):
- Recipe name: {recipe_json.get('name', 'Unknown')}
- Techniques being practiced: {', '.join(techniques_to_teach) if techniques_to_teach else 'general cooking'}
- Food science being reinforced: {', '.join(food_science_to_reinforce) if food_science_to_reinforce else 'none'}
- Raw ingredients: {json.dumps(recipe_json.get('ingredients', []))}
- Raw steps: {json.dumps(recipe_json.get('steps', []))}
"""
    else:
        recipe_context = f"""No specific recipe provided. Generate a simple beginner-appropriate recipe for:
- Lesson: {lesson_title}, Chapter: {chapter_title}
- Techniques: {', '.join(techniques_to_teach) if techniques_to_teach else 'general cooking'}
Use 4-6 simple ingredients and 5-7 steps.
"""

    base = f"""{rag_block}Generate a recipe lesson for a learning app. Return ONLY valid JSON — no markdown, no explanation.

Lesson context:
- Lesson title: {lesson_title}
- Chapter: {chapter_title}
- Goal: {goal}
- Experience: {experience}/5 ({exp_label})

{recipe_context}

STRUCTURE FOR RECIPE LESSONS:
- card1: One sentence on what they will cook and what skill they will nail. Must name the specific dish.
- ingredient_list: Parse raw ingredients into {{name, amount, unit}}. Cover every ingredient.
- steps: One structured step per major action. Each step has:
    - step_number: sequential from 1
    - title: short imperative phrase (3-5 words)
    - instruction: 1-3 sentences with coaching tip for the technique being learned
    - image_prompt: describe the visual cue the user should see at this step
    - checkpoint: REQUIRED on 2-3 of the most technique-critical steps. Use type "multiple_choice" with question, options (exactly 3), correct_index. Null on other steps.
- final_photo_prompt: ask for a photo of the finished dish showing the main technique result (the crust, color, texture). Be specific. Max 2 sentences.
- reflection_prompt: one open-ended question about what they'd do differently. Frame around the technique, not just "how did it go?"
- sources_cited: only if RAG material was referenced in card1 or step coaching.

CHECKPOINT RULES:
- Minimum 2, maximum 4 checkpoints across all steps.
- Place on the most technique-critical decision points.
- Exactly 3 options per checkpoint. Plausible distractors, not obviously wrong.
- correct_index is 0-based integer (0, 1, or 2).

Return JSON matching this exact schema:

{{
  "card1": {{
    "motivation": "One verb-first sentence naming the specific dish and skill outcome"
  }},
  "ingredient_list": [
    {{"name": "Butter", "amount": "2", "unit": "tablespoons"}},
    {{"name": "Chicken breast", "amount": "1", "unit": "piece"}}
  ],
  "steps": [
    {{
      "step_number": 1,
      "title": "Heat the pan",
      "instruction": "Place a heavy-bottomed skillet over medium-high heat. This distributes heat evenly across the surface, preventing hot spots that can burn your food. Wait 2 minutes until the pan is hot.",
      "image_prompt": "A skillet with a light shimmer on the surface, ready to cook",
      "checkpoint": null
    }},
    {{
      "step_number": 2,
      "title": "Sear the chicken",
      "instruction": "Place the chicken skin-side down on the hot pan. Don't move it — let it sit for 6-8 minutes. You're building a golden crust through the Maillard reaction, which locks in flavor and moisture.",
      "image_prompt": "Chicken skin turning golden brown, not dark or burnt",
      "checkpoint": {{
        "type": "multiple_choice",
        "question": "What's happening to the chicken skin right now?",
        "options": [
          "Proteins are denaturing and browning (Maillard reaction)",
          "The skin is absorbing water from the pan",
          "The meat is cooking through to the center"
        ],
        "correct_index": 0
      }}
    }},
    {{
      "step_number": 3,
      "title": "Finish cooking",
      "instruction": "Flip the chicken and cook for 4-5 more minutes until the internal temperature reaches 165°F (74°C). The residual heat will continue cooking the meat.",
      "image_prompt": "Chicken flipped, bottom side cooked golden brown",
      "checkpoint": null
    }}
  ],
  "final_photo_prompt": "Take a photo of your plated chicken showing the golden-brown crust and the juicy interior. The skin should be glossy and browned, not pale or burnt.",
  "reflection_prompt": "What was the trickiest part of getting the sear right? What would you change next time?",
  "sources_cited": [
    {{"source_id": "source_id", "title": "Title", "author": "Author", "page_start": 42}}
  ]
}}

Rules for recipe lessons:
- NO card3 field. NO activities array.
- card1.motivation: Exactly 1 verb-first sentence naming the dish.
- ingredient_list: Array of {{name, amount, unit}}. Cover ALL ingredients mentioned in the recipe.
- steps: Array of step objects, in order. Minimum 5 steps, maximum 10 steps.
- step_number: Sequential from 1 to the total number of steps.
- title: Imperative phrase (3-5 words). Examples: "Heat the pan", "Sear the meat", "Deglaze with wine"
- instruction: 1-3 sentences. Include a coaching tip explaining WHY each action matters (Maillard reaction, protein denaturation, etc.). NOT just "do this".
- image_prompt: Describe what the user should see at the end of this step. Be visual and specific. Examples: "golden-brown crust", "clear liquid dripping from the fork", "smooth, glossy emulsion"
- checkpoint: null OR {{type: "multiple_choice", question, options: [3 items], correct_index: 0-2}}
  - Place 2-4 checkpoints total, on the most technique-critical steps
  - question: 1 sentence, test understanding of the step's technique
  - options: Exactly 3 options, each ≤20 words. Plausible distractors.
  - correct_index: 0-based (0, 1, or 2)
- final_photo_prompt: 1-2 sentences asking for a specific visual result (texture, color, technique outcome)
- reflection_prompt: 1 open-ended question about technique, not just satisfaction
- sources_cited: Array of {{source_id, title, author, page_start}} — only include sources actually referenced in card1 or instruction text
- quote: Only include when a KEY QUOTE directly supports a point. Quote must be exact. If no key quote, omit entirely
- Return ONLY the JSON object"""

    return base
