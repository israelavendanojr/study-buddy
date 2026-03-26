# StudBud

Gamified AI learning companion mobile app.

## Stack

| Layer | Tech |
|-------|------|
| Mobile | React Native (Expo) + TypeScript |
| Backend | FastAPI + SQLAlchemy |
| Database | PostgreSQL 16 (Docker) |

## Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- Expo Go on your phone **or** iOS Simulator / Android Emulator

## Quick Start

```bash
# First time — install everything + start DB
make setup

# Start all services (Postgres + FastAPI + Expo)
make dev
```

Verify the backend is connected to the database:

```bash
curl http://localhost:8000/health
# → {"status":"ok","message":"hello from StudBud"}
```

## Available Commands

```
make setup      First-time setup: install deps + start DB
make dev        Start all services (DB + backend + mobile)
make db         Start PostgreSQL only
make backend    Start FastAPI only
make mobile     Start Expo only
make ip         Print your local IP for physical device testing
make clean      Stop DB + remove venv and node_modules
make help       Show all commands
```



```
study-buddy/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + /health endpoint
│   │   └── database.py      # SQLAlchemy engine & session
│   └── requirements.txt
├── mobile/
│   ├── App.tsx               # Home screen — fetches /health
│   └── package.json
├── docker-compose.yml        # PostgreSQL
├── Makefile                  # Dev commands
└── README.md
```

