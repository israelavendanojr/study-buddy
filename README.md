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

## Running on a Physical Device

Your phone and computer must be on the **same Wi-Fi network**.

1. Get your local IP:

   ```bash
   make ip
   ```

2. Update `API_URL` in `mobile/App.tsx`:

   ```ts
   const API_URL = "http://YOUR_LOCAL_IP:8000";
   ```

3. Scan the QR code with Expo Go.

## Project Structure

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

## Database

PostgreSQL runs on `localhost:5432` with:

| Field | Value |
|-------|-------|
| User | `studbud` |
| Password | `studbud_dev` |
| Database | `studbud` |

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Queries the DB, returns `{"status": "ok", "message": "hello from StudBud"}` |
