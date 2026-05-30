# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言偏好

- 始终使用中文进行对话和交流
- 代码注释和文档使用英文

## Project Overview

XiaoC Blog - A full-stack personal blog system built with React 19, FastAPI, and SQLite. Features include OAuth guest login (GitHub/Gitee), comments, and favorites.

## Build & Test Commands

```bash
# Frontend (from project root)
npm install                  # Install dependencies
npm run dev                  # Start dev server (port 3000)
npm run build                # Production build
npm run test                 # Run tests

# Backend (from backend/ directory)
pip install -r requirements.txt
# Local development (port 8001, Docker uses 8000)
uvicorn main:app --reload --host 0.0.0.0 --port 8001
pytest                       # Run all tests
pytest tests/test_admin_api_workflow.py  # Run specific test
```

## ⚠️ VPS 生产环境测试规则

当通过 SSH 连接到 VPS 开发时：
- **Docker 容器占用 8000 端口**，绝对不要修改或重启 Docker 容器
- **本地开发后端使用 8001 端口**：`uvicorn main:app --reload --host 0.0.0.0 --port 8001`
- **前端 Vite 使用 3000 端口**，通过代理将 `/api` 转发到 `localhost:8001`
- **OAuth 回调 URL** 必须配置为 8001 端口（在 `.env` 文件中设置）


## Architecture

### Frontend (`frontend/`)

React 19 + Vite + Tailwind CSS 4.0 application.

- **Routing**: React Router 7. Routes: `/`, `/post/:id`, `/profile`, `/admin`, `/admin/edit[:id]`, `/login`
- **API layer** (`frontend/api/client.ts`): `apiFetch<T>()` wraps fetch with credentials, JSON handling, and `ApiError` for non-2xx responses. Vite proxies `/api` to `http://127.0.0.1:8001`.
- **Auth**: Cookie-based sessions. Credentials: `admin` / (通过环境变量 `ADMIN_PASS` 设置). Endpoints in `backend/routers/auth_router.py`.
- **OAuth Guest Login**: GitHub and Gitee OAuth integration. JWT tokens in httponly cookies. Endpoints in `backend/routers/oauth_router.py`.
- **Comments & Favorites**: Guest users can comment on posts and favorite articles. Endpoints in `backend/routers/comments_router.py` and `backend/routers/favorites_router.py`.
- **State**: `frontend/context/Preferences.tsx` provides theme/language context. `frontend/store.ts` is legacy localStorage logic.
- **i18n**: `frontend/i18n.ts` contains UI strings in `zh`/`en`. Use `useI18n()` from Preferences context.
- **Styling**: Tailwind CSS 4 with Inter + JetBrains Mono fonts. Dark mode via `.dark` class selector.
- **Path alias**: `@/` maps to `frontend/` (configured in `tsconfig.json` and `vite.config.ts`).

### Backend (`backend/`)

FastAPI with layered architecture:

- `main.py`: App entry, mounts routers at `/api/auth`, `/api/posts`, `/api/oauth`, `/api/comments`, `/api/favorites`
- `routers/`: HTTP handlers → delegates to services
- `services/`: Business logic → delegates to repositories
- `repositories/`: SQLite access via `sqlite3` with `row_factory = sqlite3.Row`
- `database.py`: DB init with auto-migration (includes users, comments, favorites tables)
- `schemas.py`: Pydantic models for request/response validation
- `oauth_providers.py`: OAuth provider abstraction (GitHub, Gitee)
- `middleware.py`: CSRF protection with exempt paths for OAuth logout
- Data stored in `backend/data/blog.sqlite3` (auto-created on first run)

## TypeScript Conventions

- API types co-located with API modules (`frontend/api/posts.ts` defines `ApiPost`)

## Git Workflow

- **必须在功能分支上开发**：开始任何开发任务之前，先创建分支
  - 新功能：`git checkout -b feature/xxx`
  - Bug 修复：`git checkout -b bugfix/xxx`
  - 重构：`git checkout -b refactor/xxx`
- **提交信息规范**：
  - `feat:` 新功能
  - `fix:` Bug 修复
  - `refactor:` 重构
  - `docs:` 文档更新
  - `test:` 测试相关
  - `chore:` 构建/工具相关
- **保持 main 分支稳定**：所有开发工作在功能分支上进行，完成后合并到 main
