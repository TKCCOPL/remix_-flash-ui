# Blog Admin Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the blog's theme (stone + indigo), add admin sidebar layout, and implement practical features (Markdown preview, stats, filters, batch ops).

**Architecture:** Incremental enhancement on existing React 19 + Vite + Tailwind CSS 4 codebase. New `AdminLayout` component wraps admin routes with a collapsible sidebar. Editor gets split-pane Markdown preview. All pages receive the new stone/indigo color scheme.

**Tech Stack:** React 19, Vite 6, Tailwind CSS 4, Framer Motion, Lucide React, react-markdown, remark-gfm, date-fns

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/index.css` | Modify | Add indigo color tokens, replace zinc with stone, update prose |
| `src/i18n.ts` | Modify | Brand name "XiaoC'blog", Alex→XiaoC, new filter/batch/stats keys |
| `src/components/Layout.tsx` | Modify | Stone/indigo colors, mobile hamburger nav, active indicator |
| `src/components/AdminLayout.tsx` | Create | Sidebar + content area wrapper for admin routes |
| `src/App.tsx` | Modify | Wrap admin routes in AdminLayout |
| `src/pages/Admin.tsx` | Modify | Stats, filters, sort, batch ops, new theme |
| `src/pages/AdminEdit.tsx` | Modify | Split editor/preview, word count, reading time |
| `src/pages/Home.tsx` | Modify | Zinc→stone, indigo accent |
| `src/pages/Profile.tsx` | Modify | Zinc→stone, indigo accent |
| `src/pages/Login.tsx` | Modify | Zinc→stone, indigo accent |
| `src/pages/PostDetail.tsx` | Modify | Zinc→stone |

---

### Task 1: Theme Color System — index.css

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add indigo color tokens and replace zinc with stone in index.css**

Replace the entire content of `src/index.css` with:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}

@layer base {
  body {
    @apply bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100 antialiased font-sans flex flex-col min-h-screen selection:bg-indigo-200 dark:selection:bg-indigo-900;
    margin: 0;
  }
}

/* ── Prose ── */
.prose h1 { @apply text-3xl font-bold tracking-tight mb-4 mt-8 text-stone-900 dark:text-stone-100; }
.prose h2 { @apply text-2xl font-semibold tracking-tight mb-3 mt-8 text-stone-900 dark:text-stone-100; }
.prose h3 { @apply text-xl font-semibold tracking-tight mb-3 mt-6 text-stone-900 dark:text-stone-100; }
.prose p { @apply mb-6 leading-relaxed text-stone-600 dark:text-stone-300 text-lg; }
.prose ul { @apply list-disc list-outside mb-6 pl-5 space-y-2 text-stone-600 dark:text-stone-300 text-lg; }
.prose ol { @apply list-decimal list-outside mb-6 pl-5 space-y-2 text-stone-600 dark:text-stone-300 text-lg; }
.prose li { @apply text-stone-600 dark:text-stone-300; }
.prose img { @apply rounded-xl max-w-full h-auto my-10 border border-stone-200/50 dark:border-stone-800 shadow-sm; }
.prose blockquote { @apply border-l-4 border-indigo-300 dark:border-indigo-700 pl-6 italic text-stone-500 dark:text-stone-400 my-8 bg-indigo-50/50 dark:bg-indigo-950/30 py-4 pr-4 rounded-r-xl; }
.prose pre { @apply bg-stone-900 text-stone-100 p-6 rounded-xl overflow-x-auto my-8 font-mono text-sm leading-relaxed; }
.prose code { @apply bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-1.5 py-0.5 rounded-md font-mono text-sm; }
.prose pre code { @apply bg-transparent text-inherit p-0; }
.prose a { @apply text-indigo-600 dark:text-indigo-400 underline decoration-indigo-200 dark:decoration-indigo-800 hover:decoration-indigo-500 underline-offset-4 transition-all font-medium; }
.prose hr { @apply border-stone-200 dark:border-stone-800 my-10; }
.prose strong { @apply text-stone-900 dark:text-stone-100 font-semibold; }

textarea {
  @apply font-mono text-base leading-relaxed resize-y;
}

/* ── Hero Canvas ── */
@keyframes fadeUp {
  0%   { opacity: 0; transform: translateY(30px); }
  100% { opacity: 1; transform: translateY(0); }
}

.hero-canvas-container {
  position: relative;
  width: calc(100% + 3rem);
  min-height: calc(100vh - 3rem);
  margin-left: -1.5rem;
  margin-right: -1.5rem;
  margin-top: -3rem;
  overflow: hidden;
  background: #fafaf9;
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
}

.dark .hero-canvas-container {
  background: #0c0a09;
}

.hero-canvas-pattern {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.8;
}

.hero-canvas-fluid {
  filter: url(#fluid-mask);
  mix-blend-mode: difference;
  position: absolute;
  inset: 0;
  z-index: 30;
  pointer-events: none;
}

.hero-canvas-text {
  position: relative;
  z-index: 20;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  pointer-events: none;
  padding-bottom: 5rem;
}

.hero-canvas-title {
  opacity: 0;
  animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 200ms;
  font-size: clamp(3rem, 7vw, 6rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.05;
  margin-bottom: 1.5rem;
  color: #1c1917;
}

.dark .hero-canvas-title {
  color: #fafaf9;
}

.hero-canvas-subtitle {
  opacity: 0;
  animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 300ms;
  max-width: 42rem;
  font-size: clamp(1.125rem, 2vw, 1.25rem);
  color: #78716c;
  font-weight: 500;
  line-height: 1.6;
}

.dark .hero-canvas-subtitle {
  color: #a8a29e;
}

/* ── Scrollbar ── */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: oklch(0.7 0.01 270);
  border-radius: 3px;
}

.dark ::-webkit-scrollbar-thumb {
  background: oklch(0.35 0.01 270);
}
```

- [ ] **Step 2: Verify the dev server compiles without errors**

Run: `cd /home/freudom/文档/project-local/ljr/blog/remix_-flash-ui && npm run dev`
Expected: Server starts on port 3000, no compilation errors in terminal.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(theme): add indigo accent color tokens and replace zinc with stone"
```

---

### Task 2: Update i18n — Brand Name & New Keys

**Files:**
- Modify: `src/i18n.ts`

- [ ] **Step 1: Update i18n.ts with brand name, Alex→XiaoC, and new translation keys**

Replace the `translations` object in `src/i18n.ts`. Keep the existing structure but make these changes:
- `brand.name`: "博客" → "XiaoC'" (zh), "Blog" → "XiaoC'" (en)
- `brand.suffix`: "." → "blog" (both)
- `profile.title`: "Alex Dev" → "XiaoC Dev" (both)
- `profile.intro1-3`: Replace "Alex" with "XiaoC" in both languages
- `home.heroTitle`: "你好，我是 Alex" → "你好，我是 XiaoC" (zh), "Hi, I am Alex" → "Hi, I am XiaoC" (en)
- Add new keys under `admin`:
  ```
  stats.monthly: '本月新增' / 'This Month'
  filter.allCategories: '全部分类' / 'All Categories'
  sort.newest: '最新优先' / 'Newest First'
  sort.oldest: '最早优先' / 'Oldest First'
  sort.titleAsc: '标题 A-Z' / 'Title A-Z'
  sort.titleDesc: '标题 Z-A' / 'Title Z-A'
  batch.selected: '已选 {count} 篇' / '{count} selected'
  batch.delete: '批量删除' / 'Batch Delete'
  batch.confirm: '确定删除选中的 {count} 篇文章吗？' / 'Delete {count} selected posts?'
  table.wordCount: '字数' / 'Words'
  ```
- Add new keys under `editor`:
  ```
  preview: '预览' / 'Preview'
  edit: '编辑' / 'Edit'
  wordCount: '字数' / 'Words'
  readingTime: '预计阅读 {min} 分钟' / '{min} min read'
  created: '创建时间' / 'Created'
  updated: '更新时间' / 'Updated'
  ```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/freudom/文档/project-local/ljr/blog/remix_-flash-ui && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/i18n.ts
git commit -m "feat(i18n): update brand to XiaoC'blog, add filter/batch/stats keys"
```

---

### Task 3: Layout — Stone/Indigo Colors + Mobile Nav

**Files:**
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Rewrite Layout.tsx with new theme and mobile hamburger nav**

Replace the entire content of `src/components/Layout.tsx` with:

```tsx
import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, Sun, Moon, Languages, Menu, X } from 'lucide-react';
import { useI18n, usePreferences } from '../context/Preferences';

export default function Layout() {
  const location = useLocation();
  const { language, theme, toggleLanguage, toggleTheme } = usePreferences();
  const t = useI18n();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const showLanguageLabel = language === 'zh' ? t.actions.languageEn : t.actions.languageZh;
  const themeLabel = theme === 'dark' ? t.actions.themeLight : t.actions.themeDark;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      onClick={() => setMobileNavOpen(false)}
      className={`px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium border-b-2 ${
        isActive(to)
          ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-600 dark:border-indigo-400'
          : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100/50 dark:hover:bg-stone-900/60 border-transparent'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-stone-950/70 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {t.brand.name}<span className="text-indigo-500">{t.brand.suffix}</span>
            </Link>
            <nav className="hidden md:flex space-x-1">
              {navLink('/', t.nav.home)}
              {navLink('/profile', t.nav.profile)}
              {navLink('/admin', t.nav.admin)}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-stone-100/50 dark:bg-stone-900/60 border border-stone-200/50 dark:border-stone-800/70 rounded-lg text-stone-400 text-xs cursor-text hover:bg-stone-100 dark:hover:bg-stone-900/80 transition-colors">
              <Search className="w-3.5 h-3.5" />
              <span>{t.search.placeholder}</span>
              <kbd className="flex items-center gap-1 font-sans text-[10px] font-medium border border-stone-200 dark:border-stone-700 px-1.5 py-0.5 rounded bg-white dark:bg-stone-950 text-stone-300 dark:text-stone-400 ml-2">
                <Command className="w-2.5 h-2.5" />
                K
              </kbd>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleLanguage}
                aria-label={t.actions.switchLanguage}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-900/70 transition-colors"
              >
                <Languages className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-medium">{showLanguageLabel}</span>
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={t.actions.switchTheme}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-900/70 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="hidden sm:inline text-xs font-medium">{themeLabel}</span>
              </button>
            </div>

            <button
              aria-label={t.search.mobileAria}
              className="md:hidden p-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-900/70 rounded-lg transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-900/70 rounded-lg transition-colors"
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-stone-200/60 dark:border-stone-800/60"
            >
              <nav className="px-6 py-3 space-y-1 bg-stone-50 dark:bg-stone-950">
                {navLink('/', t.nav.home)}
                {navLink('/profile', t.nav.profile)}
                {navLink('/admin', t.nav.admin)}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-6xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mt-auto border-t border-stone-200/60 dark:border-stone-800/60 bg-stone-100/30 dark:bg-stone-950/50">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between text-sm text-stone-500 dark:text-stone-400">
          <p>
            © {new Date().getFullYear()} {t.brand.name}{t.brand.suffix} {t.footer.rights}
          </p>
          <div className="mt-4 md:mt-0 space-x-4">
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{t.footer.twitter}</a>
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{t.footer.github}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Run: `cd /home/freudom/文档/project-local/ljr/blog/remix_-flash-ui && npm run dev`
Open http://localhost:3000 — check: stone background, indigo accent on active nav, mobile hamburger menu works.

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat(layout): redesign header with stone/indigo theme, mobile hamburger nav"
```

---

### Task 4: AdminLayout — Sidebar Component

**Files:**
- Create: `src/components/AdminLayout.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create AdminLayout.tsx**

Create `src/components/AdminLayout.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Tag,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { useI18n } from '../context/Preferences';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED = 64;

const sidebarItems = [
  { key: 'overview', icon: LayoutDashboard, path: '/admin', labelKey: 'admin.sidebar.overview' },
  { key: 'posts', icon: FileText, path: '/admin', labelKey: 'admin.sidebar.posts' },
  { key: 'categories', icon: Tag, path: '/admin', labelKey: 'admin.sidebar.categories' },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useI18n();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        await authApi.me();
        if (!cancelled) setAuthenticated(true);
      } catch {
        if (!cancelled) {
          navigate('/login');
        }
      }
    };
    void check();
    return () => { cancelled = true; };
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem('admin_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  if (authenticated === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-stone-400">...</div>
      </div>
    );
  }

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className={`p-4 border-b border-stone-200/60 dark:border-stone-800/60 ${collapsed ? 'px-3' : ''}`}>
        {!collapsed && (
          <Link to="/" className="text-lg font-bold text-stone-900 dark:text-stone-100 block truncate">
            {t.brand.name}<span className="text-indigo-500">{t.brand.suffix}</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex mt-3 p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors w-full justify-center"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.path && item.key === 'overview'
            ? location.pathname === '/admin'
            : false;
          return (
            <Link
              key={item.key}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? t[item.labelKey as keyof typeof t] || item.key : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{t[item.labelKey as keyof typeof t] || item.key}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-stone-200/60 dark:border-stone-800/60">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all w-full ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? t.admin.logout : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{t.admin.logout}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full flex min-h-[calc(100vh-3rem)] -my-12">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:block shrink-0 bg-white dark:bg-stone-900 border-r border-stone-200/60 dark:border-stone-800/60 transition-all duration-300"
        style={{ width: sidebarWidth }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/30"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 w-[280px] bg-white dark:bg-stone-900 shadow-xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center px-4 py-3 border-b border-stone-200/60 dark:border-stone-800/60">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 p-6 md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx to wrap admin routes in AdminLayout**

Replace `src/App.tsx` with:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import AdminEdit from './pages/AdminEdit';
import Login from './pages/Login';
import AIAssistant from './components/AIAssistant';

function App() {
  return (
    <BrowserRouter>
      <AIAssistant />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="post/:id" element={<PostDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route path="login" element={<Login />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Admin />} />
          <Route path="edit" element={<AdminEdit />} />
          <Route path="edit/:id" element={<AdminEdit />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 3: Add sidebar translation keys to i18n.ts**

Add to both `zh` and `en` under `admin`:
```typescript
sidebar: {
  overview: '概览' / 'Overview',
  posts: '文章管理' / 'Posts',
  categories: '分类管理' / 'Categories',
},
```

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`, login at `/login`, verify sidebar appears on `/admin` with collapse toggle.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminLayout.tsx src/App.tsx src/i18n.ts
git commit -m "feat(admin): add sidebar layout with collapsible nav for admin routes"
```

---

### Task 5: Admin Page — Stats, Filters, Sort, Batch Ops

**Files:**
- Modify: `src/pages/Admin.tsx`

- [ ] **Step 1: Rewrite Admin.tsx with stats, filters, sort, and batch operations**

Replace the entire content of `src/pages/Admin.tsx` with the new version that includes:
- 3 stat cards (total posts, categories, this month) with indigo accent icons
- Filter bar: search + category dropdown + sort dropdown
- Table with checkbox column for batch selection
- Floating batch action bar when items are selected
- Updated stone/indigo theme colors throughout

Key implementation details:
- `useMemo` for filtered/sorted posts based on search, category, sort
- `useState` for `selectedIds: Set<string>`, `categoryFilter`, `sortBy`
- Sort options: `newest` (default), `oldest`, `title-asc`, `title-desc`
- Category extracted from unique post categories
- Batch delete calls `postsApi.remove()` for each selected post, then refreshes
- Stats: total = posts.length, categories = unique categories count, thisMonth = posts created in current month

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`, login, verify:
- 3 stat cards display correctly
- Search, category filter, sort dropdown work
- Checkboxes select/deselect, batch bar appears
- Batch delete with confirmation works

- [ ] **Step 3: Commit**

```bash
git add src/pages/Admin.tsx
git commit -m "feat(admin): add stats cards, category filter, sorting, and batch operations"
```

---

### Task 6: AdminEdit — Split Editor with Markdown Preview

**Files:**
- Modify: `src/pages/AdminEdit.tsx`

- [ ] **Step 1: Rewrite AdminEdit.tsx with split editor/preview**

Replace the entire content of `src/pages/AdminEdit.tsx` with the new version that includes:
- CSS Grid `grid-cols-1 md:grid-cols-2` for editor/preview split
- Left pane: existing form fields (title, category, image URL, markdown textarea)
- Right pane: `react-markdown` + `remark-gfm` preview with `.prose` styling
- Tab switcher on mobile (Edit / Preview toggle)
- Bottom bar with word count, reading time, created/updated timestamps
- Synced scrolling between editor and preview

Key implementation details:
- Import `Markdown` from `react-markdown` and `remarkGfm` from `remark-gfm`
- Word count function: detect Chinese characters (CJK range) vs English words
- Reading time: Chinese chars / 400 per minute, English words / 200 per minute
- Preview pane uses `prose prose-sm max-w-none` classes
- Mobile tab state: `const [previewTab, setPreviewTab] = useState<'edit' | 'preview'>('edit')`

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`, create/edit a post, verify:
- Split view works on desktop
- Tab switch works on mobile
- Markdown preview renders correctly
- Word count and reading time display

- [ ] **Step 3: Commit**

```bash
git add src/pages/AdminEdit.tsx
git commit -m "feat(editor): add split-pane Markdown preview, word count, reading time"
```

---

### Task 7: Update Remaining Pages — Home, Profile, Login, PostDetail

**Files:**
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/Profile.tsx`
- Modify: `src/pages/Login.tsx`
- Modify: `src/pages/PostDetail.tsx`

- [ ] **Step 1: Update Home.tsx — replace zinc with stone, add indigo accent**

In `src/pages/Home.tsx`, use find-and-replace to update colors:
- `zinc-900` → `stone-900`
- `zinc-100` → `stone-100`
- `zinc-50` → `stone-50`
- `zinc-800` → `stone-800`
- `zinc-400` → `stone-400`
- `zinc-600` → `stone-600`
- `zinc-200` → `stone-200`
- `zinc-300` → `stone-300`
- `zinc-950` → `stone-950`
- Category filter active state: `text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-900` → `text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50`
- Featured post hover: `group-hover:text-zinc-600` → `group-hover:text-indigo-600`

- [ ] **Step 2: Update Profile.tsx — replace zinc with stone, add indigo accent**

Same zinc→stone replacement. Additional changes:
- Avatar border: `border-white dark:border-zinc-900` → `border-white dark:border-stone-900`
- Social link hover: keep brand colors for Twitter/LinkedIn, change default hover to `hover:bg-indigo-600 hover:text-white`

- [ ] **Step 3: Update Login.tsx — replace zinc with stone, add indigo accent**

Same zinc→stone replacement. Additional changes:
- Submit button: `bg-zinc-900` → `bg-indigo-600`, `hover:bg-zinc-800` → `hover:bg-indigo-700`
- Focus ring: `focus:ring-zinc-900` → `focus:ring-indigo-600`

- [ ] **Step 4: Update PostDetail.tsx — replace zinc with stone, add indigo accent**

Same zinc→stone replacement. Additional changes:
- Back link hover: `hover:text-zinc-900` → `hover:text-indigo-600`
- Category badge: `bg-zinc-100 dark:bg-zinc-900` → `bg-indigo-50 dark:bg-indigo-950/50`, `text-zinc-600` → `text-indigo-600`

- [ ] **Step 5: Verify all pages in browser**

Run: `npm run dev`, check each page:
- `/` — Home with stone bg, indigo category highlight
- `/profile` — Profile with stone colors
- `/login` — Login with indigo button
- `/post/:id` — Post detail with indigo accents

- [ ] **Step 6: Commit**

```bash
git add src/pages/Home.tsx src/pages/Profile.tsx src/pages/Login.tsx src/pages/PostDetail.tsx
git commit -m "feat(theme): apply stone/indigo color scheme to all frontend pages"
```

---

### Task 8: Final Verification & Cleanup

- [ ] **Step 1: Run full build to check for errors**

Run: `cd /home/freudom/文档/project-local/ljr/blog/remix_-flash-ui && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Manual smoke test of all routes**

Visit and verify each route:
- `/` — Home page loads, hero animation works, posts list displays
- `/profile` — Profile page loads with correct colors
- `/login` — Login form works, can authenticate
- `/admin` — Sidebar visible, stats cards, filter/sort work, batch select works
- `/admin/edit` — Split editor, markdown preview renders, word count shows
- `/admin/edit/:id` — Edit mode loads existing post data
- `/post/:id` — Post detail renders markdown correctly

- [ ] **Step 3: Test dark mode toggle on all pages**

Toggle dark mode and verify all pages render correctly with stone-950 background and indigo accents.

- [ ] **Step 4: Test mobile responsive behavior**

Resize browser to 375px width and verify:
- Hamburger menu opens/closes on Home/Layout
- Admin sidebar becomes drawer on mobile
- Editor switches to tab view on mobile

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: blog redesign — stone/indigo theme, admin sidebar, markdown preview, batch ops"
```
