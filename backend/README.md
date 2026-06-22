# Perspectra — Backend

FastAPI server for [Perspectra](../README.md), a multi-agent research-ideation system. It
orchestrates LLM "expert" personas with [AutoGen](https://github.com/microsoft/autogen), grounds
them in literature with [LightRAG](https://github.com/HKUDS/LightRAG) GraphRAG, retrieves papers
from Semantic Scholar / OpenAlex, and persists data in Supabase (with optional MongoDB). Auth is
Supabase JWT.

The API is mounted under `/api/v1` (`routers/base.py`) and `/api/v1/tasks` (`routers/tasks.py`,
progress streaming over NDJSON).

## Prerequisites

- Python 3.11
- A Supabase project (URL, service key, JWT secret)
- An OpenAI or Azure OpenAI API key

## Installation

```bash
# from the backend/ directory
python3.11 -m venv .venv && source .venv/bin/activate
# or: conda create -n perspectra python=3.11 && conda activate perspectra

pip install -r requirements.prod.txt
```

Two dependency files are provided:

- **`requirements.prod.txt`** — the complete, pinned set used by the Docker image. **Use this to
  run the app.**
- `requirements.txt` — a lighter development list.

## Configuration

Copy the template and fill in your values:

```bash
cp .env.example .env
```

All settings are read from environment variables in `settings.py`. The minimum to run is an LLM key
(`OPENAI_API_TYPE` + `OPENAI_API_KEY`) and a Supabase project (`SUPABASE_URL`,
`SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`). See the
[configuration table in the root README](../README.md#backend-backendenv) for the full list.

A couple of settings worth calling out:

- **`SESSION_SECRET_KEY`** — signs session cookies. Generate one with
  `python -c "import secrets; print(secrets.token_urlsafe(32))"`. If unset, an ephemeral key is
  generated at startup and a warning is logged (sessions won't persist across restarts/workers).
- **`ALLOWED_ORIGINS`** — comma-separated CORS origins (your frontend URL). Defaults to local dev
  ports.
- **`USER_STUDY_MODE`** — when `true`, enables user-study interaction logging (including verbose
  paper-search debug logs under `logs/`). Leave `false` for normal use.

### Database

The Supabase schema is in `db_utils/migrations/`. Apply
`migrations/20240906123045_create_user_forum_tables.sql` to your Supabase/Postgres instance to
create the forum tables.

## Running

Development (auto-reload):

```bash
uvicorn main:app --host 0.0.0.0 --port 8321 --reload
```

The app is available at `http://localhost:8321`; interactive API docs at
`http://localhost:8321/docs`.

Production (Gunicorn with Uvicorn workers), as used by the Docker image:

```bash
./start.sh
```

## Docker

```bash
docker build -f dockerfile -t perspectra-backend .
docker run --env-file .env -p 8321:8321 perspectra-backend
```

## Project layout

```
backend/
├── main.py            # FastAPI app: middleware, exception handlers, router mounting
├── settings.py        # pydantic-settings configuration (reads .env)
├── start.sh           # Gunicorn production launch (Docker entrypoint)
├── app/
│   ├── agents/        # persona agents, discussion manager, AutoGen agents/teams/tools
│   ├── chains/        # graph_rag.py — LightRAG GraphRAG wrapper
│   ├── prompts/       # persona / judge / search prompts
│   ├── templates/     # persona templates (YAML)
│   └── app_types/     # pydantic models
├── auth/              # Supabase JWT verification
├── db_utils/          # Supabase + MongoDB clients, SQL migrations
└── routers/           # base.py (API), tasks.py (progress streaming)
```

## Development notes

- **Logging:** standard library `logging` (console). Set `USER_STUDY_MODE=true` to also write
  paper-search debug logs to `logs/`.
- **Auth:** JWT-based via Supabase; tokens are verified with `SUPABASE_JWT_SECRET`.
- There is no automated test suite; endpoints under a `/testing/` prefix are part of the live API
  (the prefix is historical).
