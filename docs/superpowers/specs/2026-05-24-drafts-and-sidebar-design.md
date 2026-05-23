# Article Drafts & Right Sidebar Settings

## Overview
This design document outlines the full-stack implementation for adding a "Save as Draft" functionality and moving the article settings (Category, Image) into a floating right sidebar.

## 1. Data & Backend Architecture (Status Enumeration)
**Goal:** Introduce a robust state management for articles (`draft` vs `published`).

### Database Changes (`backend/database.py`)
- Add a new column `status` to the `posts` table.
- Default value will be `'published'` for backward compatibility with existing data.
- SQLite Alter Statement: `ALTER TABLE posts ADD COLUMN status TEXT DEFAULT 'published'`

### Backend API Models (`backend/schemas.py`)
- Update `PostCreate`, `PostUpdate`, and `PostOut` schemas to include `status: Optional[str] = 'published'`.

### Repository Layer (`backend/repositories/posts_repository.py`)
- Modify the `create_post` and `update_post` methods to parse and store the `status` field.
- Update `list_posts` to only return `published` posts by default on public endpoints (if applicable).
- Keep Admin endpoints returning all posts, but expose the `status` field so the Admin Dashboard can show Draft/Published badges.

## 2. Frontend API & Data Models (`frontend/api/posts.ts`)
- Add `status: 'published' | 'draft'` to `ApiPost`.
- Update `PostCreatePayload` and `PostUpdatePayload` to accept `status`.

## 3. UI Design: The Floating Right Sidebar (`frontend/pages/AdminEdit.tsx`)
**Goal:** Redesign the settings drawer into a floating capsule that matches the aesthetics of the left navigation sidebar.

### Visual Specifications
- **Layout:** `fixed top-6 right-6 bottom-6 w-[320px]`.
- **Aesthetics:**
  - `bg-white/80 dark:bg-stone-900/80`
  - `backdrop-blur-xl`
  - `rounded-3xl`
  - `shadow-xl border border-stone-200/50 dark:border-stone-800/50`
- **Animation:** Slides in from the right (`x: 320` to `x: 0`) using `framer-motion` spring animation.
- **Interaction:** The backdrop will be removed so the user can keep the sidebar open while typing if they have a large enough screen, or it can behave as a modal overlay on smaller screens.

## 4. UI Design: Action Bar & Saving Drafts
- The `AdminEdit` bottom floating bar will be updated.
- **Primary Action (Save):** If it's a draft, "Publish". If it's published, "Update".
- **Secondary Action (Save Draft):** A new button next to the primary action: "存草稿" (Save as Draft). Clicking it sets `status = 'draft'`.

## 5. UI Design: Dashboard Updates (`frontend/pages/Admin.tsx`)
- Articles in the table will show a "草稿" (Draft) badge if their status is `'draft'`.
