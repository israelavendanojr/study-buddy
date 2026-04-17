"""Shared configuration and client factories for offline scripts."""
import os
import pathlib
import sys
from dotenv import load_dotenv

# Paths
BACKEND_ROOT = pathlib.Path(__file__).parent.parent
PROJECT_ROOT = BACKEND_ROOT.parent

# Add project root to path for imports
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Load .env from backend/
_ENV_PATH = BACKEND_ROOT / ".env"
load_dotenv(_ENV_PATH)

# ── DB ──────────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://studbud:studbud_dev@localhost:5432/studbud",
)

# ── Paths ───────────────────────────────────────────────────────────────────
RAG_RESOURCES_DIR = BACKEND_ROOT / "app" / "rag_resources"
CURRICULUM_TAXONOMY_PATH = BACKEND_ROOT / "CURRICULUM_TAXONOMY.json"

# ── Chunking ─────────────────────────────────────────────────────────────────
CHUNK_TOKENS = 800       # target tokens per chunk
CHUNK_OVERLAP = 100      # overlap between consecutive chunks
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_BATCH_SIZE = 100   # max texts per OpenAI embeddings API call

# ── AI Models ────────────────────────────────────────────────────────────────
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
RAG_TOP_K = 5            # number of chunks to retrieve per lesson

PEPPER_SYSTEM = (
    "You are Pepper, a self-taught home cook who spent years making expensive mistakes "
    "before things finally clicked. You're warm and encouraging but you have real opinions — "
    "you believe butter is almost always worth it, you get quietly excited about a good sear, "
    "and you're gently but firmly against skipping steps. You speak directly, use specific "
    "cooking language without being pretentious about it, and you always give the user one "
    "concrete thing to focus on rather than overwhelming them. When someone struggles, you "
    "normalize it with a specific story or analogy. You never say 'Great job!' without saying "
    "exactly what was great about it."
)


def get_db_engine():
    """Return a SQLAlchemy engine connected to the study-buddy DB."""
    from sqlalchemy import create_engine
    return create_engine(DATABASE_URL)


def get_anthropic_client():
    """Return an initialized Anthropic client."""
    import anthropic
    return anthropic.Anthropic()


def get_openai_client():
    """Return an initialized OpenAI client (used only for embeddings)."""
    from openai import OpenAI
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
