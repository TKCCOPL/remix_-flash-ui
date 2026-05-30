# 个人主页与登录优化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构个人主页，集成收藏和评论功能，优化登录退出逻辑

**Architecture:** 前端采用组件化设计，将用户卡片、标签页、收藏列表、评论列表拆分为独立组件。后端新增获取用户评论的 API 接口。

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, FastAPI, SQLite

---

## 文件结构

### 后端文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/repositories/comments_repository.py` | 修改 | 添加 `get_comments_by_user_id()` 函数 |
| `backend/services/comments_service.py` | 修改 | 添加 `get_comments_by_user()` 函数 |
| `backend/routers/comments_router.py` | 修改 | 添加 `GET /users/me/comments` 路由 |
| `backend/main.py` | 修改 | 注册 comments_user_router |

### 前端文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/components/UserCard.tsx` | 新建 | 用户信息卡片组件 |
| `frontend/components/ProfileTabs.tsx` | 新建 | 标签页切换组件 |
| `frontend/components/FavoritesList.tsx` | 新建 | 收藏列表组件 |
| `frontend/components/CommentsList.tsx` | 新建 | 评论列表组件 |
| `frontend/components/EmptyState.tsx` | 新建 | 空状态提示组件 |
| `frontend/pages/Profile.tsx` | 修改 | 重构为新设计 |
| `frontend/components/UserMenu.tsx` | 修改 | 移除收藏链接，优化退出逻辑 |
| `frontend/i18n.ts` | 修改 | 添加新翻译键 |
| `frontend/api/comments.ts` | 新建 | 评论 API 客户端 |

---

## Task 1: 后端 - 实现获取用户评论 API

**Files:**
- Modify: `backend/repositories/comments_repository.py`
- Modify: `backend/services/comments_service.py`
- Modify: `backend/routers/comments_router.py`
- Modify: `backend/main.py`

- [ ] **Step 1: 在 comments_repository.py 添加 get_comments_by_user_id 函数**

```python
def get_comments_by_user_id(conn, user_id, skip=0, limit=20):
    """Get comments by user id with post info."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT c.id, c.post_id, c.content, c.created_at, p.title as post_title
        FROM comments c
        JOIN posts p ON c.post_id = p.id
        WHERE c.user_id = ? AND c.status = 'approved'
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
        """,
        (user_id, limit, skip),
    )
    return [dict(row) for row in cursor.fetchall()]
```

- [ ] **Step 2: 在 comments_service.py 添加 get_comments_by_user 函数**

```python
def get_comments_by_user(conn, user_id, skip=0, limit=20):
    """Get comments by user id."""
    return comments_repository.get_comments_by_user_id(conn, user_id, skip, limit)
```

- [ ] **Step 3: 在 comments_router.py 添加 user_router**

在文件顶部添加新的 router 实例：

```python
user_router = APIRouter()
```

在文件末尾添加新路由：

```python
@user_router.get("/users/me/comments")
async def get_my_comments(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """Get current user's comments."""
    user = require_login(request)
    conn = get_db()
    try:
        user_id = resolve_user_id(user, conn)
        comments = comments_service.get_comments_by_user(conn, user_id, skip, limit)
        return comments
    finally:
        conn.close()
```

- [ ] **Step 4: 在 main.py 注册 user_router**

在 import 部分添加：

```python
from routers.comments_router import router as comments_api_router, user_router as comments_user_router
```

在路由注册部分添加：

```python
app.include_router(comments_user_router, prefix="/api", tags=["comments"])
```

- [ ] **Step 5: 测试 API**

启动后端服务并测试：

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

使用 curl 测试（需要先登录获取 cookie）：

```bash
curl -X GET "http://localhost:8001/api/users/me/comments" -H "Cookie: guest_token=xxx"
```

- [ ] **Step 6: 提交**

```bash
git add backend/repositories/comments_repository.py backend/services/comments_service.py backend/routers/comments_router.py backend/main.py
git commit -m "feat(backend): add GET /api/users/me/comments endpoint"
```

---

## Task 2: 前端 - 添加 i18n 翻译键

**Files:**
- Modify: `frontend/i18n.ts`

- [ ] **Step 1: 在中文翻译的 profile 对象中添加新键**

在 `frontend/i18n.ts` 中找到 `zh` 的 `profile` 对象（约第 90 行），在 `tags` 之后添加：

```typescript
editProfile: '编辑资料',
logout: '退出登录',
favorites: '收藏文章',
comments: '我的评论',
noFavorites: '还没有收藏的文章',
noFavoritesDesc: '浏览文章时点击收藏按钮，就可以在这里找到它们',
noComments: '还没有发表过评论',
noCommentsDesc: '阅读文章时留下你的想法',
browseArticles: '去浏览文章',
loginMethod: (provider: string) => `通过 ${provider} 登录`,
```

- [ ] **Step 2: 在英文翻译的 profile 对象中添加新键**

在 `frontend/i18n.ts` 中找到 `en` 的 `profile` 对象（约第 283 行），在 `tags` 之后添加：

```typescript
editProfile: 'Edit Profile',
logout: 'Logout',
favorites: 'Favorites',
comments: 'My Comments',
noFavorites: 'No favorites yet',
noFavoritesDesc: 'Click the favorite button on articles to save them here',
noComments: 'No comments yet',
noCommentsDesc: 'Share your thoughts when reading articles',
browseArticles: 'Browse Articles',
loginMethod: (provider: string) => `Logged in via ${provider}`,
```

- [ ] **Step 3: 提交**

```bash
git add frontend/i18n.ts
git commit -m "feat(i18n): add profile page translation keys"
```

---

## Task 3: 前端 - 创建评论 API 客户端

**Files:**
- Create: `frontend/api/comments.ts`

- [ ] **Step 1: 创建 comments.ts**

```typescript
import { apiFetch } from './client';

export type ApiComment = {
  id: number;
  post_id: number;
  content: string;
  created_at: string;
  post_title: string;
};

export const commentsApi = {
  list: (skip = 0, limit = 20) =>
    apiFetch<ApiComment[]>(`/api/users/me/comments?skip=${skip}&limit=${limit}`),
};
```

- [ ] **Step 2: 提交**

```bash
git add frontend/api/comments.ts
git commit -m "feat(api): add comments API client"
```

---

## Task 4: 前端 - 创建 EmptyState 组件

**Files:**
- Create: `frontend/components/EmptyState.tsx`

- [ ] **Step 1: 创建 EmptyState.tsx**

```typescript
import { ReactNode } from 'react';

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-6 max-w-sm mx-auto">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/components/EmptyState.tsx
git commit -m "feat(components): add EmptyState component"
```

---

## Task 5: 前端 - 创建 UserCard 组件

**Files:**
- Create: `frontend/components/UserCard.tsx`

- [ ] **Step 1: 创建 UserCard.tsx**

```typescript
import { LogOut } from 'lucide-react';
import { useI18n } from '../context/Preferences';
import { useAuth } from '../context/AuthContext';
import type { GuestUser } from '../api/oauth';

type UserCardProps = {
  user: GuestUser;
  favoritesCount: number;
  commentsCount: number;
  onLogout: () => void;
};

export default function UserCard({ user, favoritesCount, commentsCount, onLogout }: UserCardProps) {
  const t = useI18n();

  return (
    <div className="animate-fade-in-up">
      {/* User Info */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.username}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-white">
              {user.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight truncate">
            {user.username}
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {t.profile.loginMethod('GitHub')}
          </p>
        </div>
        <button
          onClick={onLogout}
          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
          aria-label={t.profile.logout}
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-stone-100 dark:bg-stone-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {favoritesCount}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {t.profile.favorites}
          </div>
        </div>
        <div className="bg-stone-100 dark:bg-stone-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {commentsCount}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {t.profile.comments}
          </div>
        </div>
      </div>

      {/* Edit Profile Button */}
      <button className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">
        {t.profile.editProfile}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/components/UserCard.tsx
git commit -m "feat(components): add UserCard component"
```

---

## Task 6: 前端 - 创建 ProfileTabs 组件

**Files:**
- Create: `frontend/components/ProfileTabs.tsx`

- [ ] **Step 1: 创建 ProfileTabs.tsx**

```typescript
type ProfileTabsProps = {
  activeTab: 'favorites' | 'comments';
  onTabChange: (tab: 'favorites' | 'comments') => void;
  favoritesLabel: string;
  commentsLabel: string;
};

export default function ProfileTabs({
  activeTab,
  onTabChange,
  favoritesLabel,
  commentsLabel,
}: ProfileTabsProps) {
  return (
    <div className="flex gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
      <button
        onClick={() => onTabChange('favorites')}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          activeTab === 'favorites'
            ? 'bg-indigo-600 text-white'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
        }`}
      >
        {favoritesLabel}
      </button>
      <button
        onClick={() => onTabChange('comments')}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          activeTab === 'comments'
            ? 'bg-indigo-600 text-white'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
        }`}
      >
        {commentsLabel}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/components/ProfileTabs.tsx
git commit -m "feat(components): add ProfileTabs component"
```

---

## Task 7: 前端 - 创建 FavoritesList 组件

**Files:**
- Create: `frontend/components/FavoritesList.tsx`

- [ ] **Step 1: 创建 FavoritesList.tsx**

```typescript
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../context/Preferences';
import { Bookmark } from 'lucide-react';
import type { ApiFavorite } from '../api/favorites';
import EmptyState from './EmptyState';

type FavoritesListProps = {
  favorites: ApiFavorite[];
  loading: boolean;
};

export default function FavoritesList({ favorites, loading }: FavoritesListProps) {
  const t = useI18n();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex gap-4 p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 animate-pulse"
          >
            <div className="w-20 h-16 bg-stone-200 dark:bg-stone-700 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4" />
              <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <EmptyState
        icon={<Bookmark className="w-8 h-8 text-stone-400" />}
        title={t.profile.noFavorites}
        description={t.profile.noFavoritesDesc}
        action={{
          label: t.profile.browseArticles,
          onClick: () => navigate('/'),
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {favorites.map((fav) => (
        <div
          key={fav.id}
          onClick={() => navigate(`/post/${fav.post_id}`)}
          className="flex gap-4 p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer transition-colors"
        >
          {fav.image_url ? (
            <img
              src={fav.image_url}
              alt={fav.title}
              className="w-20 h-16 object-cover rounded-lg"
            />
          ) : (
            <div className="w-20 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm truncate">
              {fav.title}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {fav.category}
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
              {new Date(fav.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/components/FavoritesList.tsx
git commit -m "feat(components): add FavoritesList component"
```

---

## Task 8: 前端 - 创建 CommentsList 组件

**Files:**
- Create: `frontend/components/CommentsList.tsx`

- [ ] **Step 1: 创建 CommentsList.tsx**

```typescript
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../context/Preferences';
import { MessageCircle } from 'lucide-react';
import type { ApiComment } from '../api/comments';
import EmptyState from './EmptyState';

type CommentsListProps = {
  comments: ApiComment[];
  loading: boolean;
};

export default function CommentsList({ comments, loading }: CommentsListProps) {
  const t = useI18n();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 animate-pulse"
          >
            <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/3 mb-2" />
            <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-full" />
            <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-2/3 mt-1" />
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <EmptyState
        icon={<MessageCircle className="w-8 h-8 text-stone-400" />}
        title={t.profile.noComments}
        description={t.profile.noCommentsDesc}
        action={{
          label: t.profile.browseArticles,
          onClick: () => navigate('/'),
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800"
        >
          <div
            onClick={() => navigate(`/post/${comment.post_id}`)}
            className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer mb-2"
          >
            {comment.post_title}
          </div>
          <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
            {comment.content}
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">
            {new Date(comment.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/components/CommentsList.tsx
git commit -m "feat(components): add CommentsList component"
```

---

## Task 9: 前端 - 重构 Profile 页面

**Files:**
- Modify: `frontend/pages/Profile.tsx`

- [ ] **Step 1: 重写 Profile.tsx**

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../context/Preferences';
import { useAuth } from '../context/AuthContext';
import { favoritesApi, type ApiFavorite } from '../api/favorites';
import { commentsApi, type ApiComment } from '../api/comments';
import UserCard from '../components/UserCard';
import ProfileTabs from '../components/ProfileTabs';
import FavoritesList from '../components/FavoritesList';
import CommentsList from '../components/CommentsList';

export default function Profile() {
  const t = useI18n();
  const navigate = useNavigate();
  const { user, logout, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'favorites' | 'comments'>('favorites');
  const [favorites, setFavorites] = useState<ApiFavorite[]>([]);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Fetch favorites
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchFavorites = async () => {
      try {
        const data = await favoritesApi.list();
        if (!cancelled) setFavorites(data);
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoadingFavorites(false);
      }
    };

    void fetchFavorites();
    return () => { cancelled = true; };
  }, [user]);

  // Fetch comments
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchComments = async () => {
      try {
        const data = await commentsApi.list();
        if (!cancelled) setComments(data);
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoadingComments(false);
      }
    };

    void fetchComments();
    return () => { cancelled = true; };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (authLoading || !user) {
    return (
      <div className="w-full max-w-2xl mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-stone-200 dark:bg-stone-800 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-stone-200 dark:bg-stone-800 rounded w-1/3" />
              <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-1/4" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-stone-200 dark:bg-stone-800 rounded-xl" />
            <div className="h-20 bg-stone-200 dark:bg-stone-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-8 space-y-8">
      {/* User Card */}
      <UserCard
        user={user}
        favoritesCount={favorites.length}
        commentsCount={comments.length}
        onLogout={handleLogout}
      />

      {/* Tabs and Content */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          favoritesLabel={t.profile.favorites}
          commentsLabel={t.profile.comments}
        />

        <div className="mt-6">
          {activeTab === 'favorites' ? (
            <FavoritesList favorites={favorites} loading={loadingFavorites} />
          ) : (
            <CommentsList comments={comments} loading={loadingComments} />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/pages/Profile.tsx
git commit -m "feat(pages): refactor Profile page with UserCard, tabs, favorites and comments"
```

---

## Task 10: 前端 - 优化 UserMenu 组件

**Files:**
- Modify: `frontend/components/UserMenu.tsx`

- [ ] **Step 1: 修改 UserMenu.tsx**

移除 `/favorites` 链接和 `Heart` 图标导入，添加导航功能：

```typescript
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut } from 'lucide-react';
import { useI18n } from '../context/Preferences';
import { useAuth } from '../context/AuthContext';

export default function UserMenu() {
  const t = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate('/');
  };

  if (!user) return null;

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full overflow-hidden border-2 border-stone-200 dark:border-stone-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors ml-1"
      >
        <img
          src={user.avatar_url || '/avatar.png'}
          alt={user.username}
          className="w-full h-full object-cover"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-[calc(100%+0.5rem)] right-0 w-48 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-stone-200/60 dark:border-stone-800/60 rounded-2xl shadow-xl z-50 overflow-hidden py-1"
          >
            <div className="px-4 py-3 border-b border-stone-200/60 dark:border-stone-800/60">
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                {user.username}
              </p>
            </div>

            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100/80 dark:hover:bg-stone-800/80 transition-colors"
            >
              <User className="w-4 h-4" />
              {t.nav.profile}
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-stone-600 dark:text-stone-300 hover:bg-red-50/80 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t.userMenu.logout}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/components/UserMenu.tsx
git commit -m "fix(components): remove broken favorites link and add profile link to UserMenu"
```

---

## Task 11: 清理 i18n 中的冗余翻译

**Files:**
- Modify: `frontend/i18n.ts`

- [ ] **Step 1: 移除 userMenu.favorites 翻译键**

在 `frontend/i18n.ts` 中找到 `userMenu` 对象，移除 `favorites` 键：

中文：
```typescript
userMenu: {
  // 移除 favorites: '我的收藏',
  logout: '退出登录',
},
```

英文：
```typescript
userMenu: {
  // 移除 favorites: 'My Favorites',
  logout: 'Logout',
},
```

- [ ] **Step 2: 提交**

```bash
git add frontend/i18n.ts
git commit -m "refactor(i18n): remove unused userMenu.favorites translation key"
```

---

## Task 12: 最终测试和验证

- [ ] **Step 1: 启动后端服务**

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

- [ ] **Step 2: 启动前端服务**

```bash
npm run dev
```

- [ ] **Step 3: 测试登录流程**

1. 访问 http://localhost:3000
2. 点击登录按钮，测试 OAuth 登录（GitHub/Gitee）
3. 验证登录成功后显示用户菜单
4. 测试退出登录功能

- [ ] **Step 4: 测试个人主页**

1. 登录后点击用户头像，选择"简介"
2. 验证用户卡片显示正确（头像、用户名、登录方式）
3. 验证统计数据正确（收藏数、评论数）
4. 测试标签页切换（收藏/评论）
5. 测试空状态显示

- [ ] **Step 5: 测试收藏功能**

1. 浏览文章，点击收藏按钮
2. 进入个人主页，验证收藏列表显示
3. 点击收藏的文章，验证跳转正确

- [ ] **Step 6: 测试评论功能**

1. 浏览文章，发表评论
2. 进入个人主页，切换到"我的评论"标签
3. 验证评论列表显示
4. 点击评论所属文章，验证跳转正确

- [ ] **Step 7: 测试响应式布局**

1. 调整浏览器窗口大小，验证移动端适配
2. 测试深色/浅色模式切换

- [ ] **Step 8: 提交最终代码**

```bash
git add -A
git commit -m "feat: complete profile page redesign with favorites and comments integration"
```

---

## 自我审查清单

### 1. 规格覆盖检查

| 规格要求 | 对应任务 | 状态 |
|---------|---------|------|
| 分离登录模式 | 无需修改 | ✅ |
| 修复 Gitee 图标 | 已修复，无需处理 | ✅ |
| 用户卡片组件 | Task 5 | ✅ |
| 标签页切换 | Task 6 | ✅ |
| 收藏列表 | Task 7 | ✅ |
| 评论列表 | Task 8 | ✅ |
| 空状态组件 | Task 4 | ✅ |
| 重构 Profile 页面 | Task 9 | ✅ |
| 移除 /favorites 链接 | Task 10 | ✅ |
| 实现评论 API | Task 1 | ✅ |
| 添加 i18n 翻译 | Task 2 | ✅ |
| 评论 API 客户端 | Task 3 | ✅ |

### 2. 占位符扫描

- 无 TBD、TODO 或"实现 later"
- 所有代码步骤都包含完整代码
- 所有测试步骤都包含具体命令

### 3. 类型一致性检查

- `ApiComment` 类型在 `api/comments.ts` 中定义，在 `CommentsList.tsx` 中使用
- `ApiFavorite` 类型从 `api/favorites.ts` 导入，在 `FavoritesList.tsx` 中使用
- `GuestUser` 类型从 `api/oauth.ts` 导入，在 `UserCard.tsx` 中使用
- 所有组件 Props 类型定义一致
