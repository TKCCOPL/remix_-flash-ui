# Blog Admin Redesign — Design Spec

## Overview

Redesign the personal blog's theme color system, admin management layout, and add practical features. Approach: incremental enhancement on existing codebase (Approach A).

**Scope:** All frontend pages (Home, Profile, Login, Admin, AdminEdit).

---

## 1. Theme Color System

### Strategy: Restrained

- **Base palette:** stone (warm neutral with subtle yellow undertone), replacing zinc
- **Accent:** indigo, used for links, primary buttons, active states, highlights
- **Dark mode:** stone-950 background + indigo-400/500 accent

### Color Tokens

| Usage | Light | Dark |
|-------|-------|------|
| Page background | `stone-50` | `stone-950` |
| Card/surface | `white` | `stone-900` |
| Primary text | `stone-900` | `stone-100` |
| Secondary text | `stone-500` | `stone-400` |
| Link/accent | `indigo-600` | `indigo-400` |
| Primary button | `indigo-600` bg, white text | `indigo-500` bg |
| Secondary button | `stone-100` bg | `stone-800` bg |
| Border | `stone-200/60` | `stone-800/60` |
| Active/selected bg | `indigo-50` | `indigo-950/50` |
| Code block bg | `stone-900` | `stone-900` |
| Blockquote | `indigo-50` left border | `indigo-950` left border |
| Scrollbar | `oklch(0.7 0.01 270)` | `oklch(0.35 0.01 270)` |

### Implementation

- Add indigo OKLCH color variables in `@theme` block of `src/index.css`
- Replace all zinc-* classes with stone-* across all components
- Add indigo-* classes for accent usage
- Update prose styles, hero canvas colors, and selection colors

---

## 2. Header Navigation Redesign

### Current Issues

- Nav items have no clear active indicator beyond background tint
- Search bar is non-functional (placeholder only)
- Mobile nav has no hamburger menu (nav is hidden on mobile)
- No visual hierarchy between brand and nav items

### Redesigned Header

```
┌──────────────────────────────────────────────────┐
│ Logo/Brand    Home  Profile  Admin    🔍  🌐 ☀️  │
└──────────────────────────────────────────────────┘
```

**Changes:**
- **Active indicator:** Combined — `indigo-50`/`indigo-950` background tint + `indigo-600` bottom border (2px) for double emphasis
- **Brand name:** Change from "博客." / "Blog." to "XiaoC'blog" — the `'blog` part uses `indigo-500` accent color
- **Search:** Keep as visual placeholder (non-functional), but style it as a proper search trigger button that could be wired up later
- **Mobile:** Add hamburger menu button that opens a slide-down nav panel
- **Spacing:** Tighter, more polished spacing between nav items
- **Border:** Subtle `stone-200/60` bottom border (softer than current)

**Mobile nav behavior:**
- Hamburger icon appears below `md` breakpoint
- Tapping opens a dropdown panel with nav links stacked vertically
- Panel has `stone-50` bg with `stone-200` border, rounded corners, shadow
- Tapping a link closes the panel

---

## 3. Admin Layout — Sidebar Navigation

### Structure

```
┌─────────────────────────────────────────┐
│  Header (shared, full-width)            │
├──────────┬──────────────────────────────┤
│ Sidebar  │  Content Area               │
│          │                              │
│ Overview │  [current page content]      │
│ Posts    │                              │
│ Categories│                             │
│          │                              │
│ ─────── │                              │
│ Settings │                              │
│ Logout   │                              │
└──────────┴──────────────────────────────┘
```

### Sidebar Design

- **Width:** 240px expanded / 64px collapsed (icon-only)
- **Background:** `white` / `stone-900` (dark mode)
- **Active item:** `indigo-50` bg + `indigo-600` text
- **Top:** Blog brand name
- **Bottom (fixed):** Logout button
- **Toggle:** Hamburger icon to collapse/expand
- **Responsive:** On mobile, sidebar becomes a slide-over drawer

### Admin Content Area

- **Top:** Page title + "New Post" button (indigo-600)
- **Stats row:** 3 cards (total posts, categories, posts this month)
- **Filter bar:** Search input + category dropdown + sort dropdown
- **Table:** Checkbox column (batch select), status column, existing columns
- **Bottom:** Floating batch action bar (appears on selection) + pagination

### Route Handling

- Admin routes (`/admin`, `/admin/edit`, `/admin/edit/:id`) wrapped in `AdminLayout`
- `AdminLayout` component: sidebar + content area, separate from main `Layout`
- Main `Layout` continues to serve Home, Profile, Login pages

### New Component: `AdminLayout.tsx`

- Manages sidebar collapsed/expanded state (localStorage persisted)
- Renders sidebar navigation + `<Outlet />` for child routes
- Auth check: redirects to `/login` if not authenticated

---

## 3. Practical Features

### 3a. Markdown Live Preview

**Editor page layout (AdminEdit.tsx):**

- CSS Grid `1fr 1fr` split: left = editor, right = preview
- Divider: 1px `stone-200` line between panes
- Preview renders markdown using existing `.prose` styles via `react-markdown` + `remark-gfm`
- **Synced scrolling:** editor scroll position maps proportionally to preview scroll
- **Mobile:** Tab switcher (Edit / Preview) instead of side-by-side
- Preview pane header: "Preview" label
- Preview pane footer: word count + estimated reading time

### 3b. Article Statistics

Displayed in:
- **Admin table:** Word count column (optional, compact display)
- **Editor bottom bar:** Word count + reading time + created/updated timestamps

**Calculation:**
- Chinese: count characters (excluding spaces/punctuation) / 400 chars per minute
- English: count words (split by whitespace) / 200 words per minute
- Reading time: show as "X min read"

### 3c. Category Filter & Sorting

**Filter bar above admin table:**
- Search input (existing, retained)
- Category dropdown: extracted from unique categories across all posts, with "All" option
- Sort dropdown: Newest first (default), Oldest first, Title A-Z, Title Z-A
- Filter/sort changes reset pagination to page 1

### 3d. Batch Operations

- Each table row gets a checkbox; header row has select-all checkbox
- When items are selected, a floating action bar appears at the bottom of the table:
  - Shows "N selected" count
  - "Batch Delete" button (red, with confirmation dialog)
- Confirmation dialog shows count of selected articles
- After operation: refresh list, clear selection, show success toast

---

## 4. Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Add indigo color tokens, replace zinc with stone, update prose styles |
| `src/components/Layout.tsx` | Update colors to stone/indigo, keep as main layout |
| `src/components/AdminLayout.tsx` | **New file** — sidebar + content area wrapper |
| `src/pages/Admin.tsx` | Rewrite: sidebar layout integration, stats, filters, batch ops |
| `src/pages/AdminEdit.tsx` | Rewrite: split editor/preview, word count, reading time |
| `src/pages/Home.tsx` | Update colors: zinc → stone, add indigo accent |
| `src/pages/Profile.tsx` | Update colors: zinc → stone, add indigo accent |
| `src/pages/Login.tsx` | Update colors: zinc → stone, add indigo accent |
| `src/pages/PostDetail.tsx` | Update colors: zinc → stone |
| `src/App.tsx` | Wrap admin routes in `AdminLayout` |
| `src/i18n.ts` | Add new translation keys for filters, batch ops, stats; update brand name to "XiaoC'blog"; replace all "Alex" with "XiaoC" |

---

## 5. Constraints

- No new npm dependencies (react-markdown already available for preview)
- Maintain existing API contract (no backend changes needed)
- Keep i18n support (zh/en) for all new UI text
- Dark mode must work for all new components
- Mobile responsive: sidebar becomes drawer, editor switches to tab view
