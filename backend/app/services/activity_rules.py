"""
Activity type rules by lesson type.
Used by the activity prompt builder to determine which activities to generate for each lesson type.
"""

LESSON_TYPE_ACTIVITIES = {
    "technique": ["multiple_choice", "sequence", "image_id"],
    "food_science": ["multiple_choice", "matching", "fill_blank"],
    "recipe": ["multiple_choice", "sequence", "fill_blank"],
    "minigame": ["matching", "image_id", "fill_blank", "multiple_choice"],
    "concept": ["multiple_choice", "matching", "fill_blank"],
}


def get_activity_types(lesson_type: str | None) -> list[str]:
    """
    Get the suggested activity types for a given lesson type.
    Falls back to 'technique' rules if the lesson type is unknown or None.
    """
    if not lesson_type or lesson_type not in LESSON_TYPE_ACTIVITIES:
        lesson_type = "technique"
    return LESSON_TYPE_ACTIVITIES[lesson_type]
