"""
Type-aware lesson prompt builder.
Shared by both lesson.py and generate_lessons.py.
Builds prompts specific to lesson type (technique, food_science, recipe, minigame, concept).
"""

from .mission_rules import get_mission_rules


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
    rag_block = ""
    if chunks:
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
        rag_block = (
            "Reference material from culinary textbooks — cite SOURCE IDs inline:\n\n"
            + "\n\n---\n\n".join(parts)
            + "\n\n"
        )

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
