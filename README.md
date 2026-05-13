# Minimalist Digital Garden

A polished, production-ready personal blog system built with **React 19**, **Vite**, and **Tailwind CSS**. This project prioritizes typography, whitespace, and a seamless writing experience.

## ✨ Features

- **Modern UI/UX**: Minimalist aesthetic focusing on content readability with a custom-crafted design system.
- **Markdown Support**: Write your posts in standard Markdown with full support for code highlighting, tables, and blockquotes.
- **Responsive Design**: Fully fluid layout that looks beautiful on everything from ultra-wide monitors to mobile devices.
- **Admin Dashboard**: Secure management interface for creating, editing, and deleting blog posts.
- **Animated Transitions**: Smooth route transitions and micro-interactions powered by `framer-motion`.
- **Local Persistence**: Uses browser local storage for data, making it a perfect tool for local-first journaling or a lightweight portfolio.

## 🚀 Tech Stack

- **Framework**: React 19 (Functional Components & Hooks)
- **Styling**: Tailwind CSS 4.0
- **Routing**: React Router 6
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Markdown Rendering**: react-markdown + remark-gfm

## 🛠️ Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

## 🔐 Admin Access
To manage your posts, navigate to the `/login` route.
- **Username**: `admin`
- **Password**: `123456`

## 📁 Project Structure

- `src/pages/`: Page components (Home, PostDetail, Admin, etc.)
- `src/components/`: Reusable UI components and layout wrappers.
- `src/store.ts`: Lightweight data persistence layer using LocalStorage.
- `src/index.css`: Global design tokens and Tailwind configuration.

---

Built with focus on craftsmanship and simplicity.
