"""
Phase 2: Migrate lesson schema to support recipe lessons.

Adds recipe-specific columns (ingredient_list, steps, final_photo_prompt, reflection_prompt)
and updated_at to the lessons table. Idempotent — safe to re-run.
"""

import sys
import pathlib
from datetime import datetime, timezone

# Add project root to path
PROJECT_ROOT = pathlib.Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import create_engine, text
from scripts.config import DATABASE_URL


def run_migration():
    """Run the schema migration with transactional safety and validation."""
    engine = create_engine(DATABASE_URL)

    print("\n" + "=" * 70)
    print("LESSON SCHEMA MIGRATION (Phase 2)")
    print("=" * 70)

    with engine.connect() as conn:
        # ── PRE-FLIGHT CHECKS ────────────────────────────────────────────────
        print("\n[1/5] Pre-flight checks...")
        try:
            result = conn.execute(text("SELECT COUNT(*) FROM lessons"))
            before_count = result.scalar()
            print(f"  Lessons in DB: {before_count:,}")

            result = conn.execute(
                text("SELECT lesson_type, COUNT(*) FROM lessons GROUP BY lesson_type ORDER BY COUNT(*) DESC")
            )
            type_dist = result.fetchall()
            print("  By lesson_type:")
            for lesson_type, count in type_dist:
                print(f"    {lesson_type or 'NULL':20s}: {count:6,}")
        except Exception as e:
            print(f"  ERROR: {e}")
            return False

        # ── INVALID lesson_type CHECK ────────────────────────────────────────
        print("\n[2/5] Checking for invalid lesson_type values...")
        try:
            result = conn.execute(
                text("""
                    SELECT lesson_key, lesson_type FROM lessons
                    WHERE lesson_type IS NOT NULL
                    AND lesson_type NOT IN ('technique', 'food_science', 'recipe', 'concept', 'minigame')
                """)
            )
            invalid_rows = result.fetchall()
            if invalid_rows:
                print(f"  ERROR: Found {len(invalid_rows)} invalid lesson_type values:")
                for lesson_key, lesson_type in invalid_rows[:5]:
                    print(f"    {lesson_key}: {lesson_type}")
                if len(invalid_rows) > 5:
                    print(f"    ... and {len(invalid_rows) - 5} more")
                return False
            print("  OK — no invalid values found")
        except Exception as e:
            print(f"  ERROR: {e}")
            return False

        # ── SCHEMA MIGRATION (transactional) ──────────────────────────────────
        print("\n[3/5] Adding columns and constraints...")
        try:
            # ADD ingredient_list
            conn.execute(
                text("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name = 'lessons' AND column_name = 'ingredient_list'
                        ) THEN
                            ALTER TABLE lessons ADD COLUMN ingredient_list JSONB;
                        END IF;
                    END $$;
                """)
            )
            print("  ✓ ingredient_list column added (or already exists)")

            # ADD steps
            conn.execute(
                text("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name = 'lessons' AND column_name = 'steps'
                        ) THEN
                            ALTER TABLE lessons ADD COLUMN steps JSONB;
                        END IF;
                    END $$;
                """)
            )
            print("  ✓ steps column added (or already exists)")

            # ADD final_photo_prompt
            conn.execute(
                text("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name = 'lessons' AND column_name = 'final_photo_prompt'
                        ) THEN
                            ALTER TABLE lessons ADD COLUMN final_photo_prompt VARCHAR(500);
                        END IF;
                    END $$;
                """)
            )
            print("  ✓ final_photo_prompt column added (or already exists)")

            # ADD reflection_prompt
            conn.execute(
                text("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name = 'lessons' AND column_name = 'reflection_prompt'
                        ) THEN
                            ALTER TABLE lessons ADD COLUMN reflection_prompt VARCHAR(500);
                        END IF;
                    END $$;
                """)
            )
            print("  ✓ reflection_prompt column added (or already exists)")

            # ADD updated_at
            conn.execute(
                text("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name = 'lessons' AND column_name = 'updated_at'
                        ) THEN
                            ALTER TABLE lessons ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;
                        END IF;
                    END $$;
                """)
            )
            print("  ✓ updated_at column added (or already exists)")

            # ADD CHECK constraint
            conn.execute(
                text("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.table_constraints
                            WHERE table_name = 'lessons' AND constraint_name = 'lessons_lesson_type_check'
                        ) THEN
                            ALTER TABLE lessons
                            ADD CONSTRAINT lessons_lesson_type_check
                            CHECK (
                                lesson_type IS NULL OR
                                lesson_type IN ('technique', 'food_science', 'recipe', 'concept', 'minigame')
                            );
                        END IF;
                    END $$;
                """)
            )
            print("  ✓ CHECK constraint on lesson_type added (or already exists)")

            # Backfill updated_at
            result = conn.execute(
                text("""
                    UPDATE lessons
                    SET updated_at = COALESCE(generated_at, created_at)
                    WHERE updated_at IS NULL
                """)
            )
            updated_count = result.rowcount
            print(f"  ✓ Backfilled updated_at for {updated_count:,} rows")

            # Commit
            conn.commit()
        except Exception as e:
            print(f"  ERROR during migration: {e}")
            conn.rollback()
            return False

        # ── POST-FLIGHT VALIDATION ───────────────────────────────────────────
        print("\n[4/5] Post-flight validation...")
        try:
            # Count check
            result = conn.execute(text("SELECT COUNT(*) FROM lessons"))
            after_count = result.scalar()
            if after_count != before_count:
                print(f"  ERROR: Row count changed! Before: {before_count}, After: {after_count}")
                return False
            print(f"  ✓ Row count unchanged: {after_count:,}")

            # NULL updated_at check
            result = conn.execute(
                text("SELECT COUNT(*) FROM lessons WHERE updated_at IS NULL")
            )
            null_count = result.scalar()
            if null_count > 0:
                print(f"  ERROR: {null_count} rows have NULL updated_at")
                return False
            print("  ✓ No NULL updated_at rows")

            # Column existence check
            result = conn.execute(
                text("""
                    SELECT COUNT(*) FROM information_schema.columns
                    WHERE table_name = 'lessons'
                    AND column_name IN ('ingredient_list', 'steps', 'final_photo_prompt', 'reflection_prompt', 'updated_at')
                """)
            )
            col_count = result.scalar()
            if col_count != 5:
                print(f"  ERROR: Expected 5 new columns, found {col_count}")
                return False
            print("  ✓ All 5 new columns present")

            # Constraint check
            result = conn.execute(
                text("""
                    SELECT COUNT(*) FROM information_schema.table_constraints
                    WHERE table_name = 'lessons' AND constraint_name = 'lessons_lesson_type_check'
                """)
            )
            constraint_count = result.scalar()
            if constraint_count != 1:
                print(f"  ERROR: CHECK constraint not found")
                return False
            print("  ✓ CHECK constraint on lesson_type present")

        except Exception as e:
            print(f"  ERROR during validation: {e}")
            return False

        # ── FINAL REPORT ─────────────────────────────────────────────────────
        print("\n[5/5] Migration summary")
        print(f"  Total lessons: {after_count:,}")
        print(f"  All assertions passed ✓")

    print("\n" + "=" * 70)
    print("Migration completed successfully!")
    print("=" * 70 + "\n")
    return True


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
