import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://studbud:studbud_dev@localhost:5432/studbud",
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_lessons_by_type(db, lesson_type: str):
    """Return all Lesson rows matching the given lesson_type."""
    from .models import Lesson
    return db.query(Lesson).filter(Lesson.lesson_type == lesson_type).all()


def get_recipe_lesson(db, lesson_key: str):
    """Return a recipe Lesson by key, or None if not found or not a recipe."""
    from .models import Lesson
    return (
        db.query(Lesson)
        .filter(Lesson.lesson_key == lesson_key, Lesson.lesson_type == "recipe")
        .first()
    )
