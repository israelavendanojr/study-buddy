"""
Mission type rules engine.
Centralized rules for which mission types are required, optional, or forbidden per lesson type.
Imported by lesson.py and generate_lessons.py for prompt constraints.
"""

LESSON_TYPE_MISSIONS = {
    "technique": {
        "required": ["photo_submission"],
        "optional": ["reflection_journal", "minigame_image_id"],
        "forbidden": [],
    },
    "food_science": {
        "required": ["reflection_journal"],
        "optional": ["minigame_matching", "minigame_fill_blank"],
        "forbidden": ["photo_submission"],
    },
    "recipe": {
        "required": ["photo_submission", "photo_submission"],  # 2 required: mise + final dish
        "optional": ["reflection_journal"],
        "forbidden": [],
    },
    "minigame": {
        "required": ["minigame_matching"],  # one of the four minigame types
        "optional": ["minigame_image_id", "minigame_fill_blank", "minigame_sequencing"],
        "forbidden": ["photo_submission", "reflection_journal"],
    },
    "concept": {
        "required": ["reflection_journal"],
        "optional": ["minigame_matching", "pop_quiz"],
        "forbidden": ["photo_submission"],
    },
}


def get_mission_rules(lesson_type: str | None) -> dict:
    """
    Return mission rules for a given lesson type.
    Falls back to 'technique' rules if lesson_type is None or unrecognized.
    """
    if not lesson_type or lesson_type not in LESSON_TYPE_MISSIONS:
        lesson_type = "technique"
    return LESSON_TYPE_MISSIONS[lesson_type]
