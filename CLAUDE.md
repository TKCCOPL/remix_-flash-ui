# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

```bash
npm install                  # Install frontend dependencies
npm run dev                  # Start Vite dev server (port 3000)
npm run build                # Production build
npm run test                 # Run Vitest tests
```

**Backend** (from `blog/` directory):
```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
pytest                          # Run all backend tests
pytest tests/test_admin_api_workflow.py  # Run specific test file
```

## Architecture

This repo contains **two separate frontend apps** that share dependencies; only one is active at a time.

### Active app: Blog (`index.html` → `src/main.tsx` → `src/App.tsx`)

A minimalist blog with i18n (Chinese/English), dark/light theme, and admin dashboard.

- **Routing**: React Router 7 with a shared `<Layout>` wrapper. Routes: `/`, `/post/:id`, `/profile`, `/admin`, `/admin/edit[:id]`, `/login`
- **API layer** (`src/api/client.ts`): `apiFetch<T>()` wraps `fetch` with credentials, JSON content-type handling, and `ApiError` for non-2xx responses. The Vite dev server proxies `/api` to `http://127.0.0.1:8000`.
- **Auth**: Cookie-based sessions. Credentials: `admin` / `123456`. Endpoints in `blog/routers/auth_router.py`.
- **State**: `src/context/Preferences.tsx` provides theme/language context. `src/store.ts` is legacy localStorage logic; current pages use the API backend.
- **i18n**: `src/i18n.ts` contains all UI strings in `zh`/`en`. Use `useI18n()` from Preferences context to access translations.
- **Styling**: Tailwind CSS 4 with Inter + JetBrains Mono fonts. Dark mode via `.dark` class selector. Prose styles defined in `src/index.css`.
- **Path alias**: `@/` maps to repo root (configured in both `tsconfig.json` and `vite.config.ts`).

### Alternate app: Flash UI (`index.tsx` at repo root)

An AI-powered UI generator that streams HTML artifacts from Google Gemini.

- Not currently wired into `index.html`; self-mounts via its own `ReactDOM.createRoot`.
- Uses `GoogleGenAI` from `@google/genai`; requires `GEMINI_API_KEY` env var (set via Vite's `define` in config).
- Key state: sessions list, current session index, focused artifact index, streaming artifacts, variation drawer.
- `parseJsonStream()` is a custom streaming JSON parser that yields complete objects as they arrive from Gemini's streaming response.

### Backend (`blog/`)

FastAPI with layered architecture:

- `main.py`: App entry point, mounts routers at `/api/auth` and `/api/posts`
- `routers/`: Request handling → delegates to services
- `services/`: Business logic → delegates to repositories
- `repositories/`: Direct SQLite access via `sqlite3` with `row_factory = sqlite3.Row`
- `database.py`: DB init with auto-migration (adds `image_url` column if missing)
- `schemas.py`: Pydantic models for request/response validation
- Data stored in `blog/data/blog.sqlite3` (auto-created on first run)

## TypeScript Conventions

- `types.ts`: Shared interfaces (`Artifact`, `Session`, `ComponentVariation`, `LayoutOption`)
- `constants.ts`: Initial placeholder prompts for Flash UI
- `utils.ts`: Shared utilities (`generateId`)
- API types co-located with API modules (`src/api/posts.ts` defines `ApiPost`)
