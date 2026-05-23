# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言偏好

- 始终使用中文进行对话和交流
- 代码注释和文档使用英文

## Project Overview

XiaoC Blog - A full-stack personal blog system built with React 19, FastAPI, and SQLite.

## Build & Test Commands

```bash
# Frontend (from project root)
npm install                  # Install dependencies
npm run dev                  # Start dev server (port 3000)
npm run build                # Production build
npm run test                 # Run tests

# Backend (from backend/ directory)
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
pytest                       # Run all tests
pytest tests/test_admin_api_workflow.py  # Run specific test
```

## Architecture

### Frontend (`frontend/`)

React 19 + Vite + Tailwind CSS 4.0 application.

- **Routing**: React Router 7. Routes: `/`, `/post/:id`, `/profile`, `/admin`, `/admin/edit[:id]`, `/login`
- **API layer** (`frontend/api/client.ts`): `apiFetch<T>()` wraps fetch with credentials, JSON handling, and `ApiError` for non-2xx responses. Vite proxies `/api` to `http://127.0.0.1:8000`.
- **Auth**: Cookie-based sessions. Credentials: `admin` / `123456`. Endpoints in `backend/routers/auth_router.py`.
- **State**: `frontend/context/Preferences.tsx` provides theme/language context. `frontend/store.ts` is legacy localStorage logic.
- **i18n**: `frontend/i18n.ts` contains UI strings in `zh`/`en`. Use `useI18n()` from Preferences context.
- **Styling**: Tailwind CSS 4 with Inter + JetBrains Mono fonts. Dark mode via `.dark` class selector.
- **Path alias**: `@/` maps to `frontend/` (configured in `tsconfig.json` and `vite.config.ts`).

### Backend (`backend/`)

FastAPI with layered architecture:

- `main.py`: App entry, mounts routers at `/api/auth` and `/api/posts`
- `routers/`: HTTP handlers → delegates to services
- `services/`: Business logic → delegates to repositories
- `repositories/`: SQLite access via `sqlite3` with `row_factory = sqlite3.Row`
- `database.py`: DB init with auto-migration
- `schemas.py`: Pydantic models for request/response validation
- Data stored in `backend/data/blog.sqlite3` (auto-created on first run)

## TypeScript Conventions

- API types co-located with API modules (`frontend/api/posts.ts` defines `ApiPost`)
