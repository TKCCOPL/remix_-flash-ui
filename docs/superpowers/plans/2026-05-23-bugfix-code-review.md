# Bugfix: Code Review Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 bugs found during code review of the blog system.

**Architecture:** Frontend React fixes (6 tasks) + Backend FastAPI fixes (2 tasks). Each task is independent and can be committed separately.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, FastAPI, SQLite

---

### Task 1: Fix PostDetail error handling — non-404 errors show "not found"

**Files:**
- Modify: `src/pages/PostDetail.tsx:23,45-51,67-83`

The `catch` block treats all errors as 404. Need to add a separate `error` state for non-404 errors.

- [ ] **Step 1: Add error state and fix the catch block**

In `src/pages/PostDetail.tsx`, add an `error` state variable after `notFound`:

```tsx
const [notFound, setNotFound] = useState(false);
const [error, setError] = useState('');
```

Replace lines 45-51 (the catch block) with:

```tsx
} catch (requestError) {
  if (!cancelled) {
    if (requestError instanceof ApiError && requestError.status === 404) {
      setNotFound(true);
    } else {
      setError(requestError instanceof Error ? requestError.message : '加载失败');
    }
  }
}
```

- [ ] **Step 2: Add error display in the render**

Replace the `if (notFound || !post)` block (lines 75-83) with:

```tsx
if (error) {
  return (
    <div className="text-center py-24">
      <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">{error}</h2>
      <Link to="/" className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 underline">
        {t.post.returnHome}
      </Link>
    </div>
  );
}

if (notFound || !post) {
  return (
    <div className="text-center py-24">
      <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">{t.post.notFound}</h2>
      <Link to="/" className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 underline">
        {t.post.returnHome}
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/PostDetail.tsx
git commit -m "fix: distinguish 404 from other errors in PostDetail"
```

---

### Task 2: Fix HeroCanvas stale isMobile on initial render

**Files:**
- Modify: `src/components/HeroCanvas.tsx:60-137`

`isMobile` starts as `false`, but `resize()` corrects it in the same effect, causing a double-render flash on mobile. Fix: compute initial value synchronously and use a ref instead of state for blob configuration.

- [ ] **Step 1: Replace useState with synchronous initialization**

Replace the `isMobile` state declaration (line 60) and the effect (lines 63-137):

```tsx
const [isMobile, setIsMobile] = useState(() => {
  if (typeof window !== 'undefined') {
    return window.innerWidth < 768;
  }
  return false;
});
```

- [ ] **Step 2: Move blob creation after resize() call**

In the effect, move the `resize()` call before the blob creation. Replace lines 78-111:

```tsx
const resize = () => {
  width = container.offsetWidth;
  height = container.offsetHeight;
  canvas.width = width;
  canvas.height = height;
  setIsMobile(width < 768);
};
window.addEventListener('resize', resize);
resize();

let pointerX = width * 0.5;
let pointerY = height * 0.5;

const handlePointerMove = (e: PointerEvent | TouchEvent) => {
  const rect = container.getBoundingClientRect();
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  pointerX = clientX - rect.left;
  pointerY = clientY - rect.top;
};

container.addEventListener('pointermove', handlePointerMove);

// Use width directly instead of stale isMobile state
const blobs = width < 768
  ? [
      new Blob(pointerX, pointerY, 160, 0.2),
      new Blob(pointerX, pointerY, 240, 0.1, 40, 0.04),
    ]
  : [
      new Blob(pointerX, pointerY, 200, 0.35),
      new Blob(pointerX, pointerY, 300, 0.18),
      new Blob(pointerX, pointerY, 380, 0.08),
      new Blob(pointerX, pointerY, 240, 0.12, 100, 0.03),
    ];
```

- [ ] **Step 3: Remove isMobile from dependency array**

Change the dependency array at line 137 from `[isMobile]` to `[]` since we now use `width` directly:

```tsx
}, []);
```

- [ ] **Step 4: Commit**

```bash
git add src/components/HeroCanvas.tsx
git commit -m "fix: use synchronous width check to avoid stale isMobile flash on mobile"
```

---

### Task 3: Add onClick handler to category filter buttons

**Files:**
- Modify: `src/pages/Home.tsx:41-50,80-85,146-153`

Category buttons are rendered but have no click handler. Need to add filter state and wire it up.

- [ ] **Step 1: Add category filter state**

After `const postsPerPage = 10;` (line 50), add:

```tsx
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
```

- [ ] **Step 2: Filter posts by category**

Replace `const allListPosts = useMemo(() => posts.slice(1), [posts]);` (line 82) with:

```tsx
const allListPosts = useMemo(() => {
  const list = posts.slice(1);
  if (!selectedCategory || selectedCategory === t.home.all) return list;
  return list.filter((post) => (post.category || t.post.general) === selectedCategory);
}, [posts, selectedCategory, t.home.all, t.post.general]);
```

- [ ] **Step 3: Add onClick to category buttons**

Replace the category button block (lines 146-153) with:

```tsx
{[t.home.all, ...categories].map((cat) => (
  <button
    key={cat}
    onClick={() => setSelectedCategory(cat === t.home.all ? null : cat)}
    className={`px-4 py-2 text-sm rounded-xl transition-all text-left ${
      (cat === t.home.all && !selectedCategory) || selectedCategory === cat
        ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-900 font-medium'
        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900'
    }`}
  >
    {cat}
  </button>
))}
```

- [ ] **Step 4: Reset page on category change**

Update the `setSelectedCategory` call to also reset pagination:

```tsx
onClick={() => {
  setSelectedCategory(cat === t.home.all ? null : cat);
  setCurrentPage(1);
}}
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "fix: wire up category filter buttons on homepage"
```

---

### Task 4: Fix PostUpdate accepting empty body and empty strings

**Files:**
- Modify: `blog/schemas.py:13-17`
- Modify: `blog/repositories/posts_repository.py:42-57`

Two issues: (1) `PostUpdate` accepts `{}` with no validation, (2) empty strings `""` overwrite existing values via `COALESCE`.

- [ ] **Step 1: Add validator to PostUpdate schema**

Replace the `PostUpdate` class in `blog/schemas.py`:

```python
from pydantic import BaseModel, field_validator

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None

    @field_validator('title', 'content')
    @classmethod
    def non_empty_string(cls, v):
        if v is not None and v.strip() == '':
            return None
        return v
```

This converts empty strings to `None` so `COALESCE` preserves the existing value.

- [ ] **Step 2: Add model_validator to reject fully empty updates**

Add a model validator after the field validators:

```python
from pydantic import BaseModel, field_validator, model_validator

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None

    @field_validator('title', 'content')
    @classmethod
    def non_empty_string(cls, v):
        if v is not None and v.strip() == '':
            return None
        return v

    @model_validator(mode='after')
    def at_least_one_field(self):
        if all(
            getattr(self, f) is None
            for f in ('title', 'content', 'category', 'image_url')
        ):
            raise ValueError('At least one field must be provided')
        return self
```

- [ ] **Step 3: Commit**

```bash
git add blog/schemas.py
git commit -m "fix: validate PostUpdate rejects empty body and converts empty strings to None"
```

---

### Task 5: Fix AdminEdit sending empty strings on update

**Files:**
- Modify: `src/pages/AdminEdit.tsx:61-65`

The update path sends `image_url: normalizedImageUrl` which can be `""`. The create path (line 67) correctly uses `|| undefined`. Apply the same pattern to the update path.

- [ ] **Step 1: Fix the update call**

Replace line 65:

```tsx
await postsApi.update(id, { title, category, content, image_url: normalizedImageUrl });
```

With:

```tsx
await postsApi.update(id, {
  title,
  category: category || undefined,
  content,
  image_url: normalizedImageUrl || undefined,
});
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/AdminEdit.tsx
git commit -m "fix: convert empty strings to undefined in AdminEdit update path"
```

---

### Task 6: Add secure and samesite attributes to session cookie

**Files:**
- Modify: `blog/routers/auth_router.py:12`

- [ ] **Step 1: Add cookie security attributes**

Replace line 12:

```python
response.set_cookie("session", "admin_logged_in", httponly=True)
```

With:

```python
response.set_cookie(
    "session",
    "admin_logged_in",
    httponly=True,
    samesite="lax",
)
```

Note: `secure=True` is omitted because the dev server runs on HTTP. For production, set `secure=True` via environment variable.

- [ ] **Step 2: Commit**

```bash
git add blog/routers/auth_router.py
git commit -m "fix: add samesite attribute to session cookie"
```

---

### Task 7: Reduce homepage fetch limit and add server-side pagination awareness

**Files:**
- Modify: `src/pages/Home.tsx:57`
- Modify: `src/pages/Admin.tsx:76`

Currently fetching 500/200 posts with full content. Reduce to reasonable limits.

- [ ] **Step 1: Reduce Home page fetch limit**

In `src/pages/Home.tsx`, replace line 57:

```tsx
const response = await postsApi.list(0, 500);
```

With:

```tsx
const response = await postsApi.list(0, 100);
```

- [ ] **Step 2: Reduce Admin page fetch limit**

In `src/pages/Admin.tsx`, replace line 76:

```tsx
const result = await postsApi.list(0, 200);
```

With:

```tsx
const result = await postsApi.list(0, 100);
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Home.tsx src/pages/Admin.tsx
git commit -m "fix: reduce API fetch limits to 100 posts per page"
```

---

### Task 8: Remove dead status filter UI from Admin (or add backend support)

**Files:**
- Modify: `src/pages/Admin.tsx:24,44,103-110,112-118,195-228,244-253,286-295`

The backend has no `status` column. The status filter, draft count, and status badges are dead UI. Two options: (A) remove the dead UI, or (B) add `status` column to the backend. This plan takes approach (A) — remove dead UI — since adding a full draft system is out of scope.

- [ ] **Step 1: Remove PostStatus type and status from AdminPost**

In `src/pages/Admin.tsx`, remove lines 24 and 32:

```tsx
// Remove: type PostStatus = 'published' | 'draft';
// Remove from AdminPost: status: PostStatus;
```

- [ ] **Step 2: Remove status from mapApiPost**

In the `mapApiPost` function, remove line 44:

```tsx
// Remove: status: 'published',
```

- [ ] **Step 3: Remove status filter state and filteredPosts status logic**

Remove line 60:

```tsx
// Remove: const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
```

Update `filteredPosts` to remove status filtering:

```tsx
const filteredPosts = useMemo(() => {
  return posts.filter((post) => {
    return post.title.toLowerCase().includes(searchQuery.toLowerCase());
  });
}, [posts, searchQuery]);
```

- [ ] **Step 4: Simplify stats to remove draft count**

Replace the stats `useMemo` (lines 103-110):

```tsx
const stats = useMemo(() => {
  return {
    total: posts.length,
    categories: new Set(posts.map((post) => post.category)).size,
  };
}, [posts]);
```

- [ ] **Step 5: Update stats grid to show only total and categories**

Replace the stats grid (lines 195-228) with a 2-column grid:

```tsx
<div className="grid grid-cols-2 gap-4 mb-12">
  {[
    { label: t.admin.stats.total, value: stats.total, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    {
      label: t.admin.stats.categories,
      value: stats.categories,
      icon: LayoutGrid,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ].map((stat, i) => (
    <div key={i} className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
      <div className={`p-2 w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
        <stat.icon className="w-5 h-5" />
      </div>
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</p>
      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stat.value}</p>
    </div>
  ))}
</div>
```

- [ ] **Step 6: Remove status filter dropdown**

Remove the filter section (lines 242-253) that contains the status `<select>`. Keep only the search input.

- [ ] **Step 7: Remove status column from table**

Remove the status `<th>` (line 262) and status `<td>` (lines 286-295) from the table. Update `colSpan` on the empty row from 6 to 5.

- [ ] **Step 8: Remove unused imports**

Remove `CheckCircle2`, `BarChart3`, `Filter` from the lucide-react imports if no longer used.

- [ ] **Step 9: Commit**

```bash
git add src/pages/Admin.tsx
git commit -m "fix: remove dead status filter UI from admin dashboard"
```

---

### Task 9: Add API key guard to AIAssistant

**Files:**
- Modify: `src/components/AIAssistant.tsx:25-27`

When `GEMINI_API_KEY` is not set, `apiKey` is `"undefined"` and the request silently fails with a misleading error.

- [ ] **Step 1: Add API key check**

Replace lines 25-27 in the `handleSend` function:

```tsx
const apiKey = process.env.GEMINI_API_KEY as string;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
```

With:

```tsx
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  setMessages(prev => [...prev, { role: 'assistant', text: "AI assistant is not configured. Please set GEMINI_API_KEY." }]);
  return;
}
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AIAssistant.tsx
git commit -m "fix: guard against missing GEMINI_API_KEY in AIAssistant"
```
