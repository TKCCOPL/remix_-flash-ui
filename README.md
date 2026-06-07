# XiaoC Blog

A full-stack personal blog system built with **React 19**, **FastAPI**, and **SQLite**. Prioritizes typography, whitespace, and a seamless writing experience.

## Features

- **Minimalist Design**: Content-focused with a custom design system
- **Markdown Support**: Code highlighting, tables, embedded HTML with built-in XSS sanitization (`rehype-sanitize`)
- **Automated Aggregation**: Integrated GitHub Trending automated weekly crawler (`Scrapling` & `APScheduler`) that syncs to DB and generates native posts
- **Responsive Layout**: Fluid design from ultra-wide to mobile, equipped with DOM-validated intelligent TOC and throttled smooth scrolling
- **Admin Dashboard**: Secure post management (CRUD) with auto-hiding for empty categories
- **OAuth Guest Login**: GitHub and Gitee OAuth integration for guest comments and favorites
- **Comments & Favorites**: Authenticated users can comment on posts and favorite articles
- **i18n & Themes**: Chinese/English toggle with system-adaptive dark/light theme
- **Animations**: Smooth page and component transitions via Framer Motion

## Tech Stack

| Frontend | Backend |
|----------|---------|
| React 19 | FastAPI |
| Vite | SQLite |
| Tailwind CSS 4.0 | Pydantic |
| React Router 7 | APScheduler (Cron Jobs) |
| rehype / remark | Scrapling (Web Scraping)|

## Project Structure

```
├── frontend/           # React frontend
│   ├── api/            # API client (auth, posts)
│   ├── components/     # Reusable components
│   ├── context/        # Theme & language context
│   └── pages/          # Page components
├── backend/            # FastAPI backend
│   ├── routers/        # API routes
│   ├── services/       # Business logic
│   ├── repositories/   # Database access
│   └── data/           # SQLite database
└── index.html          # Vite entry
```

## Development Setup

### Frontend

```bash
npm install
npm run dev          # Start dev server at http://localhost:3000
```

### Backend

```bash
cd backend
pip install -r requirements.txt

# First time - seed test data
python seed.py

# Start dev server
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

### Database Management

The SQLite database (`backend/data/blog.sqlite3`) is gitignored to keep production data separate.

| Environment | Database | Purpose |
|-------------|----------|---------|
| Local | `backend/data/blog.sqlite3` | Testing with seed data |
| VPS Production | Docker container DB | Real user data |

```bash
# Seed local database with test data
cd backend
python seed.py

# Reset local database
rm data/blog.sqlite3
python seed.py
```

> **Note**: Production database is managed separately on VPS. Do not sync database files via git.

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Admin login |
| POST | `/api/auth/logout` | Admin logout |
| GET | `/api/auth/me` | Current admin user |

### Posts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/posts/` | List posts |
| GET | `/api/posts/:id` | Get post |
| POST | `/api/posts/` | Create post |
| PUT | `/api/posts/:id` | Update post |
| DELETE | `/api/posts/:id` | Delete post |

### OAuth Guest Login
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/oauth/:provider` | Get OAuth authorize URL |
| GET | `/api/oauth/:provider/callback` | OAuth callback handler |
| GET | `/api/oauth/me` | Current guest user |
| POST | `/api/oauth/logout` | Guest logout |

### Comments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/comments/post/:post_id` | Get comments for post |
| POST | `/api/comments/` | Create comment |
| DELETE | `/api/comments/:id` | Delete comment |

### Favorites
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/favorites/toggle` | Toggle favorite |
| GET | `/api/favorites/check/:post_id` | Check if favorited |
| GET | `/api/favorites/list` | List user favorites |

## Deployment

### Quick Start (Docker)

```bash
# Build and start
docker compose up -d --build

# Check status
docker compose ps

# Health check
curl http://localhost:8080/api/health
```

### Environment Configuration

| File | Purpose |
|------|---------|
| `.env.example` | Template for production config |
| `.env.local.example` | Template for local development |
| `.env` | Production config (create from `.env.example`) |
| `.env.local` | Local dev config (create from `.env.local.example`) |

### Port Allocation

| Environment | Frontend | Backend |
|-------------|----------|---------|
| Local dev | 3000 | 8001 |
| Production | 8080 | 8000 (internal) |

### Database Backup

```bash
# Manual backup
./scripts/backup_db.sh

# Auto backup (add to crontab)
0 3 * * * /path/to/scripts/backup_db.sh
```

## Admin

- **URL**: `/admin`
- **Username**: Set in `.env` (`ADMIN_USER`)
- **Password**: Set in `.env` (`ADMIN_PASS`)

---

See [README.zh.md](README.zh.md) for Chinese version.
