# XiaoC Blog

A full-stack personal blog system built with **React 19**, **FastAPI**, and **SQLite**. Prioritizes typography, whitespace, and a seamless writing experience.

## Features

- **Minimalist Design**: Content-focused with a custom design system
- **Markdown Support**: Code highlighting, tables, blockquotes
- **Responsive Layout**: Fluid design from ultra-wide to mobile
- **Admin Dashboard**: Secure post management (CRUD)
- **i18n**: Chinese/English with dark/light theme
- **Animations**: Smooth transitions via Framer Motion

## Tech Stack

| Frontend | Backend |
|----------|---------|
| React 19 | FastAPI |
| Vite | SQLite |
| Tailwind CSS 4.0 | Pydantic |
| React Router 7 | |

## Project Structure

```
├── src/                # React frontend
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

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| GET | `/api/posts/` | List posts |
| GET | `/api/posts/:id` | Get post |
| POST | `/api/posts/` | Create post |
| PUT | `/api/posts/:id` | Update post |
| DELETE | `/api/posts/:id` | Delete post |

## Admin

- **URL**: `/login`
- **Username**: `admin`
- **Password**: `123456`

---

See [README.zh.md](README.zh.md) for Chinese version.
