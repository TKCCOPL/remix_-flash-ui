---
version: beta
name: blog-features
description: Blog.xiaocc.dev 功能扩展规范 — 7 个模块的结构化实施方案
project: remix-flash-ui
stack:
  frontend: React 19 + Vite + Tailwind CSS 4.0
  backend: FastAPI + SQLite
  deploy: Docker + Nginx + Cloudflare Tunnel
phases:
  - id: social
    name: 核心社交
    priority: high
    estimated_days: 2
    features: [likes, drafts]
  - id: content
    name: 内容增强
    priority: medium
    estimated_days: 3
    features: [stats, rich-editor, toc]
  - id: system
    name: 系统完善
    priority: low
    estimated_days: 2
    features: [email-notify, roles]
---

# Blog 功能扩展规范

> 基于 blog.xiaocc.dev 现有架构，结合实训周课程设计思路，规划 7 个功能模块。
> 每个模块包含：数据库设计、API 契约、后端实现、前端实现、验收标准。

---

## 目录

1. [点赞系统 (likes)](#1-点赞系统-likes)
2. [草稿箱 + 内容状态 (drafts)](#2-草稿箱--内容状态-drafts)
3. [阅读量统计 (stats)](#3-阅读量统计-stats)
4. [评论回复邮件通知 (email-notify)](#4-评论回复邮件通知-email-notify)
5. [富文本编辑器 (rich-editor)](#5-富文本编辑器-rich-editor)
6. [文章目录导航 (toc)](#6-文章目录导航-toc)
7. [多角色权限 (roles)](#7-多角色权限-roles)

---

## 现有架构速查

> 本节记录开发前需要了解的现有代码事实，后续模块会引用。

| 维度 | 现状 |
|------|------|
| 认证 | 双 cookie 体系：admin `session` + guest `guest_session`，`get_current_user()` 返回 `{user_id, username, is_admin}`，无 role 字段 |
| 文章路由 | `backend/routers/posts_router.py` 同时处理公开和管理端操作，无独立 `admin_posts_router.py` |
| 草稿支持 | `posts.status` 字段已存在（默认 `'published'`），`get_posts(include_drafts=False)` 已支持过滤 |
| AdminEdit | 已有"保存草稿"按钮，状态变量 `postStatus: 'published' \| 'draft'` |
| Admin.tsx | 无状态筛选 Tab，有分类筛选；i18n 已有 `admin.allStatus` / `admin.statusPublished` / `admin.statusDraft` 翻译键 |
| 收藏系统 | `favorites` 表 + `toggle_favorite_atomic()`（INSERT/IntegrityError→DELETE 模式） |
| 图片上传 | `POST /api/upload`，5MB 限制，magic byte 校验，存储到 `backend/uploads/` |
| 统计 | `stats_service.py` 已有 overview / comments-trend / popular-posts / category-distribution |
| TOC | PostDetail.tsx 已有 TOC 侧边栏（regex 提取 h2/h3，throttled scroll 高亮，xl 断点显示） |
| 阅读量 | `posts.view_count` 字段已存在，`get_post_with_stats(increment_view=True)` 已实现 |
| 数据库迁移 | `PRAGMA table_info()` + `ALTER TABLE ADD COLUMN` 模式，无 Alembic |
| i18n | 自定义方案，`frontend/i18n.ts` 中 zh/en 翻译对象 |

---

## 1. 点赞系统 (likes)

```yaml
id: likes
phase: social
priority: high
estimated_hours: 4
dependencies: []
status: pending
```

### 1.1 需求

读者可以对文章点赞，点赞后按钮高亮并计数 +1，再次点击取消点赞。

**与收藏的区别**：
| 维度 | 点赞 (likes) | 收藏 (favorites) |
|------|-------------|-----------------|
| 语义 | 公开社交信号，表达"喜欢" | 私人书签，表示"稍后阅读" |
| UI 位置 | 文章卡片底部、详情页标题下方 | 仅详情页 |
| 图标 | Heart 心形 | Bookmark 书签 |
| 可见性 | 计数公开显示 | 计数仅自己可见 |

### 1.2 数据库

```sql
CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
```

**迁移策略**：在 `database.py` 的 `init_db()` 中添加，用 `cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='likes'")` 检查表是否存在后再建表。与现有 `CREATE TABLE IF NOT EXISTS` 模式一致。

### 1.3 API 契约

#### `POST /api/posts/{post_id}/like`

切换点赞状态。已点赞则取消，未点赞则点赞。

```
请求：
  Cookie: guest_session 或 session（需要登录）
  X-CSRF-Token: <token>
  Body: 无

响应 200:
  {
    "liked": true,
    "like_count": 42
  }

响应 401: 未登录
响应 404: 文章不存在
```

**业务逻辑**：
1. 校验用户登录状态（`require_login`）
2. 校验文章存在
3. 使用 `toggle_like_atomic()` 模式（参考 `favorites_repository.py` 的 INSERT/IntegrityError→DELETE）
4. 查询 `SELECT COUNT(*) FROM likes WHERE post_id = ?` 返回总数

#### `GET /api/posts/{post_id}/is-liked`

单篇文章点赞状态查询。

```
请求：
  Cookie: 可选（未登录返回 liked: false）

响应 200:
  {
    "liked": true,
    "like_count": 42
  }
```

#### `GET /api/posts/like-status?ids=1,2,3`

批量获取当前用户对多篇文章的点赞状态。用于列表页加载。

```
请求：
  Cookie: 可选（未登录返回全部 false）
  Query: ids（逗号分隔的文章 ID，最多 50 个）

响应 200:
  {
    "1": {"liked": true, "count": 42},
    "2": {"liked": false, "count": 15}
  }
```

### 1.4 后端实现

**新增文件**：

| 文件 | 职责 |
|------|------|
| `backend/repositories/likes_repository.py` | 数据库操作 |
| `backend/services/likes_service.py` | 业务逻辑 |
| `backend/routers/likes_router.py` | 路由定义 |
| `backend/tests/test_likes_api.py` | API 测试 |

**likes_repository.py 核心方法**（参考 `favorites_repository.py` 的实现模式）：

```python
def toggle_like_atomic(conn, user_id: int, post_id: int) -> bool:
    """切换点赞，INSERT 成功返回 True，IntegrityError 时 DELETE 返回 False。
    与 favorites_repository.toggle_favorite_atomic() 模式一致。"""

def count_likes(conn, post_id: int) -> int:
    """获取文章点赞总数"""

def check_is_liked(conn, post_id: int, user_id: int) -> bool:
    """检查用户是否已点赞，参考 favorites_repository.check_is_favorited()"""

def get_user_likes(conn, user_id: int, post_ids: list[int]) -> dict:
    """批量查询，返回 {post_id: bool}"""
```

**likes_router.py 注册**：在 `main.py` 中 `app.include_router(likes_router.router, prefix="/api/posts", tags=["likes"])`

### 1.5 前端实现

**新增组件**：`frontend/components/LikeButton.tsx`

```tsx
interface LikeButtonProps {
  postId: number;
  initialLiked: boolean;
  initialCount: number;
  size?: 'sm' | 'md' | 'lg';  // 列表页用 sm，详情页用 lg
}
```

**交互流程**（参考 `FavoriteButton.tsx` 的实现模式）：
1. 点击 → 乐观更新 UI（先改状态，不等响应）
2. 发送 `POST /api/posts/{id}/like`
3. 响应返回后校正计数（防止网络延迟导致数据不一致）
4. 未登录点击 → `navigate('/login')`
5. 使用 `mountedRef` 防止卸载后 setState（参考 FavoriteButton）

**UI 规范**：

| 状态 | 图标 | 颜色 | 动画 |
|------|------|------|------|
| 未点赞 | Heart outline (lucide-react) | `text-stone-400` | hover: `text-indigo-400` |
| 已点赞 | Heart filled | `text-indigo-500` | 点击时 pulse |
| 加载中 | Loader2 spinner | `text-stone-300` | spin |

**集成位置**：
- `Home.tsx` 文章卡片：`size="sm"`，卡片底部右侧
- `PostDetail.tsx` 文章详情：`size="lg"`，文章标题下方（与 FavoriteButton 并列）

**i18n 新增**：
```ts
likes: { liked: '已点赞', like: '点赞', loginToLike: '登录后点赞' }
```

### 1.6 验收标准

- [ ] 登录用户点击点赞，按钮变实心 indigo，计数 +1
- [ ] 再次点击取消点赞，按钮变描边灰，计数 -1
- [ ] 未登录点击，跳转登录页
- [ ] 列表页正确显示每篇文章的点赞状态和计数
- [ ] 刷新页面后点赞状态保持
- [ ] API 测试覆盖：正常点赞、取消点赞、未登录、文章不存在

---

## 2. 草稿箱 + 内容状态 (drafts)

```yaml
id: drafts
phase: social
priority: high
estimated_hours: 3
dependencies: []
status: pending
```

### 2.1 需求

文章支持三种状态：草稿（draft）、已发布（published）、已归档（archived）。
作者可以先保存草稿，稍后发布；已发布文章可以归档（下架但不删除）。

### 2.2 现有基础

**已有功能**（无需重复实现）：
- `posts.status` 字段已存在，默认值 `'published'`（`database.py` 第 67 行）
- `posts_repository.py` 的 `get_posts(include_drafts=False)` 已支持状态过滤
- `posts_router.py` 的公开接口已过滤非 published 文章（`include_drafts` 参数需登录）
- `AdminEdit.tsx` 已有"保存草稿"按钮（`t.admin.saveDraft`）
- i18n 已有 `admin.allStatus` / `admin.statusPublished` / `admin.statusDraft` 翻译

**需要新增**：
- `archived` 状态支持（状态流转完整性）
- Admin.tsx 的状态筛选 Tab
- 状态切换 API（发布/归档操作）

### 2.3 数据库

**无需新建表**，利用现有 `posts.status` 字段。

```sql
-- 现有值：'published', 'draft'
-- 新增值：'archived'
-- 已有索引：idx_posts_status
```

**状态流转**：

```
draft ──发布──→ published ──归档──→ archived
  ↑                │
  └──重新编辑──────┘
```

**约束**：status 只能是 `draft` / `published` / `archived`，在后端校验。

### 2.4 API 契约

#### `PATCH /api/posts/{id}/status`

切换文章状态。在现有 `posts_router.py` 中新增端点。

```
请求：
  Cookie: session（需要登录，仅 admin 角色）
  X-CSRF-Token: <token>
  Body:
    {
      "status": "published"    // draft / published / archived
    }

响应 200:
    {
      "id": 15,
      "status": "published",
      "message": "文章已发布"
    }

响应 400: 无效状态值
响应 401: 未登录
响应 403: 权限不足
响应 404: 文章不存在
```

#### `GET /api/posts?status=draft`

在现有 `list_posts_route` 基础上增加 `status` 查询参数（替代 `include_drafts`）。

```
请求：
  Cookie: session（需要登录）
  Query: status（可选，值: draft/published/archived，不传返回全部）

响应 200:
    {
      "posts": [...],
      "total": 3
    }
```

### 2.5 后端实现

**修改文件**：

| 文件 | 变更 |
|------|------|
| `backend/routers/posts_router.py` | 新增 `PATCH /{post_id}/status` 路由；`list_posts_route` 增加 `status` 参数 |
| `backend/repositories/posts_repository.py` | `get_posts()` 增加 `status` 过滤参数；新增 `update_post_status()` |
| `backend/services/posts_service.py` | 新增 `VALID_STATUSES` 校验 |

**新增校验**：

```python
VALID_STATUSES = {"draft", "published", "archived"}

def validate_status(status: str) -> str:
    if status not in VALID_STATUSES:
        raise HTTPException(400, f"无效状态: {status}，可选值: {VALID_STATUSES}")
    return status
```

**公开接口过滤**：`GET /api/posts` 和 `GET /api/posts/{id}` 保持现有行为——只返回 `status = 'published'` 的文章（已有实现）。

### 2.6 前端实现

**AdminEdit.tsx 修改**（现有基础：已有保存草稿按钮）：

```
┌─────────────────────────────────────────────┐
│  状态：[草稿 ●]         [保存草稿] [发布]   │
│─────────────────────────────────────────────│
│  标题：[________________________]           │
│  分类：[下拉选择]                           │
│  内容：[Markdown 编辑器]                    │
└─────────────────────────────────────────────┘
```

- 新增"归档"按钮（仅已发布文章显示，灰色描边）
- 状态标签颜色：草稿黄色、已发布绿色、已归档灰色

**Admin.tsx 修改**（新增状态筛选 Tab）：

- 增加状态筛选 Tab：`全部` | `已发布` | `草稿` | `已归档`（使用现有 i18n 键：`admin.allStatus` / `admin.statusPublished` / `admin.statusDraft`）
- 草稿条目标签：黄色 `bg-amber-100 text-amber-700`
- 已发布标签：绿色 `bg-emerald-100 text-emerald-700`
- 已归档标签：灰色 `bg-stone-100 text-stone-500`
- 草稿行操作按钮：`发布` `编辑` `删除`
- 已发布行操作按钮：`归档` `编辑`
- 已归档行操作按钮：`重新发布` `编辑` `删除`

**Home.tsx**：无变更，后端已过滤只返回 published（已有实现）。

**i18n 新增**：
```ts
admin.statusArchived: '已归档' / 'Archived'
admin.archive: '归档' / 'Archive'
admin republish: '重新发布' / 'Republish'
```

### 2.7 验收标准

- [ ] 创建文章时选择"保存草稿"，文章不出现在首页
- [ ] 草稿列表页能看到未发布的草稿（Admin 状态筛选 Tab）
- [ ] 点击"发布"后文章出现在首页
- [ ] 点击"归档"后文章从首页消失
- [ ] 归档文章可以在 Admin 面板看到并重新编辑发布
- [ ] 无效状态值返回 400 错误
- [ ] API 测试覆盖：创建草稿、发布、归档、状态筛选

---

## 3. 阅读量统计 (stats)

```yaml
id: stats
phase: content
priority: medium
estimated_hours: 6
dependencies: []
status: pending
```

### 3.1 需求

**增强**现有统计功能（非从零构建）：
- 新增阅读趋势折线图（现有只有评论趋势）
- 新增 `view_logs` 表支持趋势分析和防刷
- PostDetail 页面已有阅读量显示（`👁 {view_count}`），无需修改
- Stats 页面增加阅读趋势图表和热门文章排行增强

### 3.2 现有基础

**已有功能**：
- `posts.view_count` 字段已存在（`database.py` 第 69 行）
- `get_post_with_stats(increment_view=True)` 已实现阅读量递增
- `PostDetail.tsx` 已显示 `👁 {post.view_count}`
- `sessionStorage` 防重复计数已实现（`viewed_${id}`）
- `stats_service.py` 已有：`get_overview()`（含 total_views）、`get_popular_posts()`（按评论数排序）、`get_comments_trend()`、`get_category_distribution()`
- `admin_stats_router.py` 已有 4 个端点

**需要新增**：
- `view_logs` 表（趋势分析 + IP 级防刷）
- `GET /api/admin/stats/views-trend` 端点
- Stats.tsx 的阅读趋势折线图
- 热门文章排行增加点赞数（需模块 1 完成后）

### 3.3 数据库

**新增表**：阅读记录（用于趋势分析和防刷）

```sql
CREATE TABLE IF NOT EXISTS view_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_ip_hash TEXT,           -- IP 哈希值，非明文（与 search_logs.user_ip 一致）
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_view_logs_post_date ON view_logs(post_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_view_logs_date ON view_logs(viewed_at);
```

> **隐私说明**：`user_ip_hash` 存储 IP 的 SHA-256 哈希值，与现有 `search_logs.user_ip` 字段的处理方式一致。不存储明文 IP。

### 3.4 API 契约

#### `GET /api/admin/stats/views-trend?days=30`

阅读趋势数据。在现有 `admin_stats_router.py` 中新增端点。

```
请求：
  Cookie: session（admin）
  Query: days（可选，默认 30，最大 90）

响应 200:
    {
      "trend": [
        {"date": "2026-06-01", "views": 45},
        {"date": "2026-06-02", "views": 62}
      ],
      "total_views": 1280,
      "avg_daily": 42.7
    }
```

#### `GET /api/admin/stats/top-posts?limit=10`

热门文章排行。**扩展现有** `popular-posts` 端点，增加 `like_count` 字段（需模块 1 完成）。

```
响应 200:
    {
      "posts": [
        {
          "id": 1,
          "title": "文章标题",
          "views": 320,
          "like_count": 15,      -- 新增（需 likes 表）
          "favorite_count": 8,
          "comment_count": 12,
          "created_at": "2026-05-01"
        }
      ]
    }
```

### 3.5 后端实现

**修改文件**：

| 文件 | 变更 |
|------|------|
| `backend/database.py` | `init_db()` 中新增 `view_logs` 表 |
| `backend/services/stats_service.py` | 新增 `get_views_trend()`；`get_popular_posts()` 增加 like_count |
| `backend/routers/admin_stats_router.py` | 新增 `GET /views-trend` 路由 |
| `backend/repositories/posts_repository.py` | `get_post_with_stats()` 增加 view_log 写入逻辑 |

**防刷策略**：

```python
# 同一 IP（哈希）对同一篇文章，10 分钟内只计一次
# 检查 view_logs 表：
SELECT 1 FROM view_logs
WHERE post_id = ? AND user_ip_hash = ?
AND viewed_at > datetime('now', '-10 minutes')
LIMIT 1

# 不存在记录时：
INSERT INTO view_logs (post_id, user_ip_hash) VALUES (?, ?)
UPDATE posts SET view_count = view_count + 1 WHERE id = ?
```

### 3.6 前端实现

**新增依赖**：`npm install recharts`

**Stats.tsx 增强**（现有：手写 CSS 柱状图 + 统计卡片）：

```
┌──────────────────────────────────────────────┐
│  [总阅读量]  [今日阅读]  [文章数]  [评论数]  │
│──────────────────────────────────────────────│
│  📈 阅读趋势折线图（最近 30 天）             │
│  ┌──────────────────────────────────────┐    │
│  │    ╱╲                                │    │
│  │   ╱  ╲    ╱╲                         │    │
│  │  ╱    ╲╱╱  ╲                         │    │
│  └──────────────────────────────────────┘    │
│──────────────────────────────────────────────│
│  📊 评论趋势（现有，保留）                   │
│──────────────────────────────────────────────│
│  🏆 热门文章排行（增强：增加点赞和收藏数）   │
│  #1  文章标题     320 阅读  15 ❤️  8 🔖  12💬│
│  #2  文章标题     280 阅读  12 ❤️  5 🔖  8 💬│
└──────────────────────────────────────────────┘
```

**图表组件**：使用 Recharts 的 `<LineChart>` + `<ResponsiveContainer>` 替换现有手写 CSS 柱状图

**PostDetail.tsx**：**无变更**，已有 `👁 {post.view_count}` 显示（第 241 行）

### 3.7 验收标准

- [ ] 打开文章详情页，view_count +1（已有，验证即可）
- [ ] 同一 IP 10 分钟内重复访问不重复计数
- [ ] Stats 页面显示最近 30 天阅读趋势图
- [ ] Stats 页面显示热门文章排行（含点赞和评论数）
- [ ] PostDetail 正确显示阅读量（已有）
- [ ] 图表在移动端自适应宽度

---

## 4. 评论回复邮件通知 (email-notify)

```yaml
id: email-notify
phase: system
priority: medium
estimated_hours: 6
dependencies: []
status: pending
```

### 4.1 需求

当有人回复你的评论时，发送邮件通知被回复者。
邮件内容包含：回复者昵称、回复内容摘要、文章链接。

### 4.2 数据库

**新增表**：通知记录

```sql
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,                  -- 'comment_reply' / 'new_post'
    reference_id INTEGER,                -- 关联的评论/文章 ID
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at);
```

**users 表扩展**：

```sql
ALTER TABLE users ADD COLUMN email_notifications INTEGER DEFAULT 1;
```

> 迁移使用现有 `PRAGMA table_info()` 模式，在 `init_db()` 中检查 `email_notifications` 列是否存在后再添加。

### 4.3 API 契约

#### `GET /api/notifications?unread_only=true`

```
响应 200:
    {
      "notifications": [
        {
          "id": 1,
          "type": "comment_reply",
          "message": "xxx 回复了你的评论",
          "post_id": 5,
          "post_title": "文章标题",
          "is_read": false,
          "created_at": "2026-06-08T10:30:00"
        }
      ],
      "unread_count": 3
    }
```

#### `PATCH /api/notifications/{id}/read`

标记单条通知为已读。

#### `PATCH /api/notifications/read-all`

全部标记已读。

#### `PATCH /api/user/preferences`

```
请求体：
    {
      "email_notifications": false
    }
```

### 4.4 后端实现

**新增文件**：

| 文件 | 职责 |
|------|------|
| `backend/services/email_service.py` | 邮件发送封装 |
| `backend/services/notification_service.py` | 通知创建 + 触发邮件 |
| `backend/repositories/notifications_repository.py` | 通知 CRUD |
| `backend/routers/notifications_router.py` | 通知 API |
| `backend/templates/email_reply.html` | 邮件 HTML 模板 |

**邮件发送**（推荐 Resend API，备选 QQ 邮箱 SMTP）：

```python
# 方案 A：Resend API（推荐）
import httpx

async def send_email(to: str, subject: str, html: str):
    async with httpx.AsyncClient() as client:
        await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={"from": "blog@xiaocc.dev", "to": to, "subject": subject, "html": html}
        )

# 方案 B：QQ 邮箱 SMTP（标准库，无需额外依赖）
import smtplib
from email.mime.text import MIMEText
```

**触发时机**：在 `comments_service.py` 的评论创建逻辑中：

```python
# 创建评论后，如果是回复，通知被回复者
if parent_comment:
    parent_user = get_user(parent_comment.user_id)
    if parent_user.email and parent_user.email_notifications:
        # 使用 FastAPI BackgroundTasks 非阻塞发送
        background_tasks.add_task(send_reply_notification, parent_user, reply, post)
```

> **重要**：使用 FastAPI 内置的 `BackgroundTasks` 而非 `asyncio.create_task()`。
> `BackgroundTasks` 在响应发送后执行，确保数据库连接可用，且异常会被正确记录。

### 4.5 前端实现

**新增组件**：

| 组件 | 位置 | 功能 |
|------|------|------|
| `NotificationBell.tsx` | 导航栏 | 铃铛图标 + 未读红点计数 |
| `Notifications.tsx` | 页面 | 通知列表 |

**NotificationBell 交互**：
- 未读 > 0：铃铛 + 红色数字角标
- 点击展开下拉面板显示最近 5 条
- 底部"查看全部"链接跳转通知页

**Profile.tsx 增强**：增加邮件通知开关 toggle

**i18n 新增**：
```ts
notifications: {
  title: '通知' / 'Notifications',
  unread: '未读' / 'Unread',
  markAllRead: '全部标为已读' / 'Mark all as read',
  commentReply: '{user} 回复了你的评论' / '{user} replied to your comment',
  noNotifications: '暂无通知' / 'No notifications',
  emailNotification: '邮件通知' / 'Email notifications',
}
```

### 4.6 验收标准

- [ ] 回复他人评论后，被回复者收到站内通知
- [ ] 如果被回复者有 email 且开启通知，收到邮件
- [ ] 导航栏铃铛显示未读计数
- [ ] 点击通知跳转到对应文章
- [ ] 标记已读后红点消失
- [ ] 关闭邮件偏好后不再发送邮件

---

## 5. 富文本编辑器 (rich-editor)

```yaml
id: rich-editor
phase: content
priority: medium
estimated_hours: 8
dependencies: []
status: pending
```

### 5.1 需求

将 AdminEdit 页面的纯 textarea 升级为富文本编辑器，支持：
- 标题（h2/h3）、加粗、斜体、代码块
- 图片上传（拖拽/粘贴）
- 链接插入
- Markdown 快捷键

### 5.2 现有基础

- AdminEdit.tsx 当前使用纯 `<textarea>` + `react-markdown` 预览
- 图片上传 API 已存在：`POST /api/upload`（5MB 限制，magic byte 校验）
- `uploadApi.uploadImage(file)` 前端封装已存在

### 5.3 技术选型

| 方案 | 优点 | 缺点 | 推荐 |
|------|------|------|------|
| **Tiptap** | React 原生、ProseMirror 底层、可扩展 | 学习曲线 | ✅ 推荐 |
| Plate | 基于 Tiptap、开箱即用 | 包体积大 | 备选 |
| MDX Editor | Markdown 优先、轻量 | 自定义能力弱 | 备选 |

### 5.4 内容格式策略

> **决策：纯 Markdown 存储**（使用 `tiptap-markdown` 双向转换）

Tiptap 编辑器内部是 WYSIWYG，但输入输出均为纯 Markdown string。后端数据库 `content` 字段格式不变，读者端 `react-markdown` 渲染零改动。

**编辑器交互模式**：
- **WYSIWYG 模式**（默认）：浮动气泡工具栏（内联格式）+ / 斜杠命令菜单（块级操作）
- **源码模式**（fallback）：`</>` 按钮切换到 textarea 编辑原始 Markdown

> 详细设计见 `docs/superpowers/specs/2026-06-08-tiptap-rich-editor-design.md`

### 5.5 依赖安装

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image \
    @tiptap/extension-link @tiptap/extension-code-block-lowlight \
    @tiptap/extension-placeholder @tiptap/extension-highlight \
    @tiptap/extension-underline @tiptap/extension-typography \
    @tiptap/extension-task-list @tiptap/extension-task-item \
    @tiptap/suggestion \
    tiptap-markdown lowlight highlight.js rehype-highlight
```

### 5.6 新增文件

| 文件 | 职责 |
|------|------|
| `frontend/components/editor/TiptapEditor.tsx` | 核心编辑器组件 |
| `frontend/components/editor/BubbleToolbar.tsx` | 浮动气泡工具栏（内联格式） |
| `frontend/components/editor/SlashCommand.tsx` | / 斜杠命令菜单（块级操作） |
| `frontend/components/editor/SourceMode.tsx` | 源码模式 textarea |
| `frontend/components/editor/ImageUploadButton.tsx` | 图片上传按钮 |
| `frontend/components/editor/LinkDialog.tsx` | 链接插入弹窗 |
| `frontend/components/editor/editor.css` | Tiptap 编辑区补充样式 |

### 5.7 组件 API

```tsx
interface TiptapEditorProps {
  content: string;                     // Markdown 格式的初始内容
  onChange: (md: string) => void;       // 内容变化时回调 Markdown string
  placeholder?: string;
}
```

### 5.8 编辑器交互

**浮动气泡工具栏**（选中文本时浮现）：
- **B** *I* ~~S~~ | H1 H2 H3 | `代码` | 🔗链接

**/ 斜杠命令菜单**（输入 `/` 时弹出）：
- 图片、代码块、引用、分割线、任务列表、无序/有序列表、标题 1-3

**源码模式**（`</>` 按钮切换）：
- 切换到 textarea 显示原始 Markdown，作为 tiptap-markdown 转换异常的 fallback

### 5.9 图片上传

**复用现有 API**：`POST /api/upload`（`backend/routers/upload_router.py`）

```
POST /api/upload
Cookie: session（需要登录）
Content-Type: multipart/form-data

请求：file（图片文件，限制 5MB）
      ↑ 注意：现有限制为 5MB，非文档早期版本中的 2MB

响应 200:
    {
      "url": "/api/uploads/{uuid}.{ext}"
    }

响应 400: 格式不支持 / magic byte 校验失败
响应 413: 文件过大
```

**允许格式**：jpg, jpeg, png, gif, webp（与现有 `ALLOWED_EXTENSIONS` 一致）

**图片拖拽上传**：
1. 监听编辑器 `drop` 事件
2. 校验文件类型和大小
3. 调用 `uploadApi.uploadImage(file)`（现有封装）
4. 获取 URL 后插入编辑器 `<img src="...">`

### 5.10 AdminEdit.tsx 集成

```tsx
// 替换 textarea
import TiptapEditor from '../components/editor/TiptapEditor';

<TiptapEditor
  content={content}
  onChange={(md) => setContent(md)}
  placeholder={t.editor.placeholderContent}
/>
```

**改造要点**：
- `viewMode` ('edit' | 'preview') → `sourceMode` (boolean)
- 移除 preview 模式（Tiptap 是 WYSIWYG）
- 新增源码模式（`</>` 按钮）
- 保存逻辑改为 `editor.storage.markdown.getMarkdown()`

### 5.11 验收标准

- [ ] 选中文本时浮现气泡工具栏，内联格式化功能正常
- [ ] 输入 `/` 弹出命令菜单，块级操作功能正常
- [ ] 代码块在编辑器内有语法高亮（lowlight）
- [ ] 代码块在读者端 PostDetail 有语法高亮（rehype-highlight）
- [ ] 图片可通过 / 命令、拖拽、粘贴三种方式上传
- [ ] 图片超过 5MB 提示错误
- [ ] 编辑器输出纯 Markdown，后端数据库格式不变
- [ ] 存量 Markdown 文章加载到编辑器后正确渲染为富文本
- [ ] `</>` 源码模式可正常切换，修改后内容同步
- [ ] 暗色模式下编辑器样式正确

---

## 6. 文章目录导航 (toc)

```yaml
id: toc
phase: content
priority: low
estimated_hours: 4
dependencies: []
status: pending
```

### 6.1 现有实现

**PostDetail.tsx 已有完整 TOC 功能**：
- `extractToc()` 函数：regex 提取 h2/h3，`github-slugger` 生成 anchor id
- 布局：`xl:grid xl:grid-cols-[1fr_250px] xl:gap-12`，TOC 在 xl 以上断点显示
- 滚动高亮：throttled scroll 事件（`lodash.throttle` 100ms），检查 `getBoundingClientRect().top <= 150`
- 样式：`sticky top-24`，`max-h-[85vh] overflow-y-auto`，按标题级别缩进

### 6.2 需求：增强现有 TOC

| 增强项 | 描述 | 优先级 |
|--------|------|--------|
| 移动端抽屉 | 小屏幕下 TOC 隐藏，右下角浮动按钮 `📑` 点击展开侧边抽屉 | 高 |
| IntersectionObserver | 替换 throttled scroll 为 IntersectionObserver，性能更好 | 中 |
| 平滑滚动 | 点击目录项 `scrollIntoView({ behavior: 'smooth' })` | 中 |

### 6.3 移动端抽屉实现

**新增组件**：`frontend/components/TOCDrawer.tsx`

```tsx
interface TOCDrawerProps {
  items: TOCItem[];
  activeId: string;
  onItemClick: (id: string) => void;
}
```

**交互**：
- 浮动按钮：`fixed bottom-6 right-6 z-40`，`xl:hidden`（桌面端隐藏）
- 点击展开：右侧抽屉 `motion.aside`（参考 AdminEdit 的设置面板动画）
- 遮罩层：半透明背景，点击关闭
- 抽屉内：复用现有 TOC 样式

### 6.4 IntersectionObserver 升级

替换现有 throttled scroll 逻辑：

```typescript
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    },
    { rootMargin: '-80px 0px -80% 0px' }
  );

  headings.forEach(h => {
    const el = document.getElementById(h.id);
    if (el) observer.observe(el);
  });

  return () => observer.disconnect();
}, [headings]);
```

### 6.5 验收标准

- [ ] 桌面端 TOC 功能保持不变（现有功能不退化）
- [ ] 移动端右下角浮动按钮可见
- [ ] 点击浮动按钮展开抽屉式目录
- [ ] 点击目录项平滑滚动到对应标题
- [ ] 滚动时当前章节自动高亮
- [ ] 文章无标题时浮动按钮不显示

---

## 7. 多角色权限 (roles)

```yaml
id: roles
phase: system
priority: low
estimated_hours: 6
dependencies: [drafts]
status: pending
```

### 7.1 需求

将现有二层权限（admin / guest）扩展为四层：admin / editor / author / guest。

### 7.2 现有认证架构

**重要**：当前 admin 身份由 cookie 类型决定（`session` cookie = admin），不是数据库字段。
`get_current_user()` 返回 `{user_id, username, is_admin}`，admin 用户的 `user_id` 为 `None`。
`resolve_user_id()` 会按需在 `users` 表中创建 admin 用户行（`oauth_provider='admin'`）。

**角色系统需要扩展认证基础设施**，不仅是添加一个字段。

### 7.3 数据库

**users 表扩展**：

```sql
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'guest';
-- 枚举值：'admin' / 'editor' / 'author' / 'guest'
```

**数据迁移**：

```python
# 在 init_db() 中：
# 1. PRAGMA table_info(users) 检查 role 列是否存在
# 2. ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'guest'
# 3. 将 oauth_provider='admin' 的用户 role 设为 'admin'
cursor.execute("UPDATE users SET role = 'admin' WHERE oauth_provider = 'admin'")
```

### 7.4 认证系统改造

**`get_current_user()` 改造**：

```python
# 现有返回：{user_id, username, is_admin}
# 改造后返回：{user_id, username, is_admin, role}

async def get_current_user(request: Request) -> dict | None:
    # ... 现有 cookie 解析逻辑 ...

    if guest_user:
        # 查询 users 表获取 role
        user_row = get_user_by_id(conn, guest_user["user_id"])
        return {**guest_user, "role": user_row["role"] or "guest"}

    if admin_user:
        # admin 角色固定为 admin
        return {**admin_user, "role": "admin"}

    return None
```

### 7.5 权限矩阵

| 操作 | admin | editor | author | guest |
|------|:-----:|:------:|:------:|:-----:|
| 浏览文章 | ✅ | ✅ | ✅ | ✅ |
| 评论/点赞 | ✅ | ✅ | ✅ | ✅ |
| 创建草稿 | ✅ | ✅ | ✅ | ❌ |
| 编辑自己的草稿 | ✅ | ✅ | ✅ | ❌ |
| 编辑他人文章 | ✅ | ✅ | ❌ | ❌ |
| 发布/归档文章 | ✅ | ✅ | ❌ | ❌ |
| 管理评论 | ✅ | ✅ | ❌ | ❌ |
| 管理用户/角色 | ✅ | ❌ | ❌ | ❌ |
| 管理分类 | ✅ | ✅ | ❌ | ❌ |
| 查看统计 | ✅ | ✅ | ❌ | ❌ |
| 系统设置 | ✅ | ❌ | ❌ | ❌ |

### 7.6 API 契约

#### `GET /api/admin/users`

用户列表（含角色信息）。扩展现有 `admin_router.py` 端点，返回中增加 `role` 字段。

#### `PATCH /api/admin/users/{id}/role`

修改用户角色。在 `admin_router.py` 中新增端点。

```
请求：
  Cookie: session（仅 admin 角色）
  X-CSRF-Token: <token>
  Body:
    {
      "role": "editor"
    }

响应 200:
    {
      "id": 5,
      "role": "editor",
      "message": "角色已更新"
    }

响应 400: 无效角色值
响应 403: 非管理员不能修改角色
响应 404: 用户不存在
```

### 7.7 后端实现

**修改文件**：

| 文件 | 变更 |
|------|------|
| `backend/database.py` | `init_db()` 中新增 `role` 列迁移 |
| `backend/dependencies/auth.py` | `get_current_user()` 返回增加 `role`；新增 `require_role()` |
| `backend/routers/admin_router.py` | 新增 `PATCH /users/{id}/role` 路由 |
| `backend/services/admin_service.py` | 新增 `update_user_role()` |

**require_role 实现**：

```python
def require_role(*allowed_roles: str):
    """角色权限依赖注入。
    注意：必须先确保用户已登录，user 不会为 None。"""
    def dependency(user: dict = Depends(require_login)):
        role = user.get("role", "guest")
        if role not in allowed_roles:
            raise HTTPException(403, f"权限不足，需要角色: {allowed_roles}")
        return user
    return Depends(dependency)

VALID_ROLES = {"admin", "editor", "author", "guest"}

# 使用示例
@router.post("/api/posts")
async def create_post(user = require_role('admin', 'editor', 'author')):
    ...

@router.patch("/api/posts/{id}/status")
async def change_status(user = require_role('admin', 'editor')):
    ...
```

> **关键**：`require_role()` 内部依赖 `require_login()`，确保 `user` 不为 `None`。
> 这解决了早期版本中 `user['role']` 可能 KeyError 的问题。

### 7.8 前端实现

**修改文件**：

| 文件 | 变更 |
|------|------|
| `frontend/context/AuthContext.tsx` | `GuestUser` 类型增加 `role` 字段 |
| `frontend/components/AdminLayout.tsx` | 侧边栏菜单根据角色过滤 |
| `frontend/pages/Admin.tsx` | 用户管理页面增加角色下拉选择器 |
| `frontend/pages/Profile.tsx` | 显示当前角色标签 |

**AdminLayout 路由守卫**：

```tsx
const menuItems = [
  { path: '/admin', label: t.admin.dashboard, icon: LayoutDashboard, roles: ['admin', 'editor', 'author'] },
  { path: '/admin/edit', label: t.admin.newPost, icon: Plus, roles: ['admin', 'editor', 'author'] },
  { path: '/admin/comments', label: t.admin.comments, icon: MessageCircle, roles: ['admin', 'editor'] },
  { path: '/admin/stats', label: t.admin.stats, icon: BarChart3, roles: ['admin', 'editor'] },
  { path: '/admin/users', label: t.admin.users, icon: Users, roles: ['admin'] },
];

// 过滤：只显示当前用户角色有权访问的菜单
const visibleItems = menuItems.filter(item => item.roles.includes(user.role));
```

**角色标签 UI**：

| 角色 | 标签样式 |
|------|----------|
| admin | `bg-indigo-100 text-indigo-700` |
| editor | `bg-emerald-100 text-emerald-700` |
| author | `bg-amber-100 text-amber-700` |
| guest | `bg-stone-100 text-stone-500` |

**i18n 新增**：
```ts
roles: {
  admin: '管理员' / 'Admin',
  editor: '编辑' / 'Editor',
  author: '作者' / 'Author',
  guest: '访客' / 'Guest',
  updateRole: '修改角色' / 'Update role',
}
```

### 7.9 验收标准

- [ ] 新注册 OAuth 用户默认角色为 `guest`
- [ ] 已有 admin 用户自动迁移为 `admin` 角色
- [ ] admin 可以在用户管理页面修改他人角色
- [ ] editor 可以发布/归档文章，author 不能
- [ ] author 可以创建草稿但不能直接发布
- [ ] guest 看不到 Admin 菜单
- [ ] 未授权操作返回 403
- [ ] API 测试覆盖：各角色的权限边界

---

## 技术依赖汇总

| 功能 | 新增 npm 包 | 新增 Python 包 |
|------|------------|----------------|
| 图表 | `recharts` | — |
| 富文本 | `@tiptap/react` `@tiptap/starter-kit` `@tiptap/extension-image` `@tiptap/extension-link` `@tiptap/extension-code-block-lowlight` `@tiptap/extension-placeholder` `lowlight` | — |
| 邮件 | — | `resend`（推荐）或标准库 `smtplib` |
| 图标 | 已有 `lucide-react` | — |

---

## 实施排期

```
第 1 阶段（1-2 天）—— 核心社交
  ├── likes     点赞系统        [4h]  新表 + API + LikeButton 组件
  └── drafts    草稿箱          [3h]  扩展 status + Admin 状态筛选 Tab

第 2 阶段（2-3 天）—— 内容增强
  ├── stats     阅读量可视化    [6h]  view_logs + Recharts 图表（增强现有）
  ├── rich-editor 富文本编辑器  [8h]  Tiptap 集成 + 复用现有 upload API
  └── toc       文章目录增强    [4h]  移动端抽屉 + IntersectionObserver 升级

第 3 阶段（1-2 天）—— 系统完善
  ├── email-notify 邮件通知     [6h]  通知表 + BackgroundTasks + 前端铃铛
  └── roles     多角色权限      [6h]  认证改造 + role 字段 + require_role + 路由守卫
```

---

## 注意事项

- 所有数据库变更使用 `ALTER TABLE ADD COLUMN` 方式，在 `init_db()` 中先检查列/表是否存在再执行
- 保持与现有迁移模式一致（参考 `database.py` 中的 `PRAGMA table_info` 检查模式）
- 新增 API 路由统一注册到 `main.py`
- 前端组件遵循现有 Tailwind + indigo 主题风格
- 所有新增功能编写对应的 `test_*.py` 测试
- 收藏（favorites）和点赞（likes）的 toggle 模式保持一致（INSERT/IntegrityError→DELETE）
- 图片上传复用现有 `POST /api/upload`，不新建 admin 专属端点
- 邮件发送使用 FastAPI `BackgroundTasks`，不使用 `asyncio.create_task()`
