# Blog 功能扩展实施方案

> 基于 blog.xiaocc.dev 现有架构（FastAPI + React 19 + Vite + Tailwind + SQLite），
> 结合实训周课程设计思路，规划 7 个值得引入的功能模块。

---

## 目录

1. [点赞系统](#1-点赞系统)
2. [草稿箱 + 内容状态](#2-草稿箱--内容状态)
3. [阅读量统计 + 数据可视化](#3-阅读量统计--数据可视化)
4. [评论回复邮件通知](#4-评论回复邮件通知)
5. [富文本编辑器](#5-富文本编辑器)
6. [文章目录导航 TOC](#6-文章目录导航-toc)
7. [多角色权限](#7-多角色权限)

---

## 现有代码事实

> 开发前必读。列出与后续模块相关的现有实现，避免重复建设。

- **认证**：双 cookie 体系（admin `session` + guest `guest_session`），`get_current_user()` 返回 `{user_id, username, is_admin}`，无 `role` 字段
- **文章路由**：`backend/routers/posts_router.py` 同时处理公开和管理端，无 `admin_posts_router.py`
- **草稿**：`posts.status` 字段已存在（默认 `'published'`），`AdminEdit.tsx` 已有"保存草稿"按钮
- **收藏**：`favorites` 表 + `toggle_favorite_atomic()` 模式（INSERT/IntegrityError→DELETE）
- **图片上传**：`POST /api/upload` 已实现，5MB 限制 + magic byte 校验
- **统计**：`stats_service.py` 已有 4 个函数（overview/comments-trend/popular-posts/category-distribution）
- **TOC**：PostDetail.tsx 已有完整 TOC 侧边栏（regex 提取 + throttled scroll 高亮）
- **阅读量**：`posts.view_count` 已存在，`get_post_with_stats(increment_view=True)` 已实现
- **Admin.tsx**：有分类筛选，无状态筛选 Tab（i18n 已有相关翻译键）

---

## 1. 点赞系统

### 1.1 需求说明

读者可以对文章点赞，点赞后按钮高亮并计数 +1，再次点击取消点赞。

**与收藏（favorites）的区别**：

| 维度 | 点赞 (likes) | 收藏 (favorites) |
|------|-------------|-----------------|
| 语义 | 公开社交信号 | 私人书签 |
| 图标 | Heart 心形 | Bookmark 书签 |
| UI 位置 | 文章卡片 + 详情页 | 仅详情页 |
| 现有实现 | ❌ 无 | ✅ 已有（`FavoriteButton.tsx`） |

### 1.2 数据库设计

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

迁移在 `database.py` 的 `init_db()` 中添加，使用 `SELECT name FROM sqlite_master` 检查表是否存在。

### 1.3 API 设计

#### 切换点赞状态

```
POST /api/posts/{post_id}/like
Cookie: guest_session 或 session
X-CSRF-Token: <token>

响应：
{
    "liked": true,
    "like_count": 42
}
```

逻辑：参考 `favorites_repository.toggle_favorite_atomic()` 的 INSERT/IntegrityError→DELETE 模式。

#### 单篇点赞状态

```
GET /api/posts/{post_id}/is-liked
Cookie: 可选（未登录返回 liked: false）

响应：
{
    "liked": true,
    "like_count": 42
}
```

#### 批量点赞状态

```
GET /api/posts/like-status?ids=1,2,3
Cookie: 可选

响应：
{
    "1": {"liked": true, "count": 42},
    "2": {"liked": false, "count": 15}
}
```

### 1.4 后端实现

**新增文件**：
- `backend/routers/likes_router.py`
- `backend/repositories/likes_repository.py`
- `backend/services/likes_service.py`
- `backend/tests/test_likes_api.py`

**likes_repository.py 核心方法**（参考 `favorites_repository.py`）：

```python
def toggle_like_atomic(conn, user_id: int, post_id: int) -> bool:
    """INSERT 成功→True，IntegrityError→DELETE→False"""

def count_likes(conn, post_id: int) -> int:

def check_is_liked(conn, post_id: int, user_id: int) -> bool:

def get_user_likes(conn, user_id: int, post_ids: list[int]) -> dict:
```

**likes_router.py 注册**：`main.py` 中 `app.include_router(likes_router.router, prefix="/api/posts", tags=["likes"])`

### 1.5 前端实现

**新增组件**：`frontend/components/LikeButton.tsx`

```tsx
interface LikeButtonProps {
    postId: number;
    initialLiked: boolean;
    initialCount: number;
    size?: 'sm' | 'md' | 'lg';
}
```

**交互流程**（参考 `FavoriteButton.tsx`）：
1. 点击 → 乐观更新 UI
2. 发送 `POST /api/posts/{id}/like`
3. 响应校正计数
4. 未登录 → `navigate('/login')`
5. `mountedRef` 防止卸载后 setState

**UI 设计**：
- 未点赞：Heart outline，`text-stone-400`
- 已点赞：Heart filled，`text-indigo-500`
- hover：`text-indigo-400`，轻微放大
- 图标：`Heart` from `lucide-react`

**集成位置**：
- `PostDetail.tsx`：文章标题下方（与 `FavoriteButton` 并列）
- `Home.tsx` 文章卡片：底部右侧

---

## 2. 草稿箱 + 内容状态

### 2.1 需求说明

文章支持三种状态：草稿（draft）、已发布（published）、已归档（archived）。

### 2.2 现有基础

**已有**：
- `posts.status` 字段，默认 `'published'`（`database.py` 第 67 行）
- `posts_repository.get_posts(include_drafts=False)` 已支持过滤
- `posts_router.py` 公开接口已过滤非 published 文章
- `AdminEdit.tsx` 已有"保存草稿"按钮（`t.admin.saveDraft`）
- i18n 已有 `admin.allStatus` / `admin.statusPublished` / `admin.statusDraft`

**需新增**：`archived` 状态、Admin.tsx 状态筛选 Tab、状态切换 API

### 2.3 数据库设计

**无需新建表**，利用现有 `posts.status` 字段。

```sql
-- 现有值：'published', 'draft'
-- 新增值：'archived'
-- 已有索引：idx_posts_status
```

**状态流转**：
```
草稿(draft) ──发布──→ 已发布(published) ──归档──→ 已归档(archived)
     ↑                    │
     └────重新编辑─────────┘
```

### 2.4 API 设计

#### 切换文章状态

在 `posts_router.py` 中新增端点。

```
PATCH /api/posts/{id}/status
Cookie: session（admin）
X-CSRF-Token: <token>

请求体：
{
    "status": "published"    // draft / published / archived
}

响应：
{
    "id": 15,
    "status": "published",
    "message": "文章已发布"
}
```

#### 按状态筛选

扩展现有 `GET /api/posts` 的 `include_drafts` 参数为 `status` 参数。

```
GET /api/posts?status=draft
Cookie: session（需要登录）

响应：
{
    "posts": [...],
    "total": 3
}
```

### 2.5 后端实现

**修改文件**：
- `backend/routers/posts_router.py`：新增 `PATCH /{post_id}/status`；`list_posts_route` 增加 `status` 参数
- `backend/repositories/posts_repository.py`：`get_posts()` 增加 `status` 过滤；新增 `update_post_status()`
- `backend/services/posts_service.py`：新增 `VALID_STATUSES` 校验

```python
VALID_STATUSES = {"draft", "published", "archived"}
```

### 2.6 前端实现

**AdminEdit.tsx 修改**（已有保存草稿按钮，增强）：
- 新增"归档"按钮（仅已发布文章显示）
- 状态标签：草稿黄色、已发布绿色、已归档灰色

**Admin.tsx 修改**（新增状态筛选 Tab）：
- 增加 Tab：`全部` | `已发布` | `草稿` | `已归档`
- 使用现有 i18n 键：`admin.allStatus` / `admin.statusPublished` / `admin.statusDraft`
- 草稿行：`发布` `编辑` `删除`
- 已发布行：`归档` `编辑`
- 已归档行：`重新发布` `编辑` `删除`

**Home.tsx**：无变更（后端已过滤）

---

## 3. 阅读量统计 + 数据可视化

### 3.1 需求说明

**增强**现有统计功能（非从零构建）：
- 新增阅读趋势折线图（现有只有评论趋势）
- 新增 `view_logs` 表支持趋势分析和防刷
- PostDetail 已有阅读量显示，无需修改

### 3.2 现有基础

- `posts.view_count` 字段已存在
- `get_post_with_stats(increment_view=True)` 已实现递增
- `PostDetail.tsx` 已显示 `👁 {post.view_count}`（第 241 行）
- `sessionStorage` 防重复计数已实现
- `stats_service.py` 已有 4 个函数
- Stats.tsx 使用手写 CSS 柱状图（非 recharts）

### 3.3 数据库设计

**新增表**：

```sql
CREATE TABLE IF NOT EXISTS view_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_ip_hash TEXT,           -- SHA-256 哈希，非明文
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_view_logs_post_date ON view_logs(post_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_view_logs_date ON view_logs(viewed_at);
```

> 隐私：`user_ip_hash` 存储哈希值，与 `search_logs.user_ip` 一致。

### 3.4 API 设计

#### 阅读趋势

在 `admin_stats_router.py` 中新增端点。

```
GET /api/admin/stats/views-trend?days=30
Cookie: session（admin）

响应：
{
    "trend": [
        {"date": "2026-06-01", "views": 45},
        {"date": "2026-06-02", "views": 62}
    ],
    "total_views": 1280,
    "avg_daily": 42.7
}
```

#### 热门文章排行（增强）

扩展现有 `GET /api/admin/stats/popular-posts`，增加 `like_count` 字段（需模块 1）。

### 3.5 后端实现

**修改文件**：
- `backend/database.py`：`init_db()` 新增 `view_logs` 表
- `backend/services/stats_service.py`：新增 `get_views_trend()`；`get_popular_posts()` 增加 like_count
- `backend/routers/admin_stats_router.py`：新增 `GET /views-trend`
- `backend/repositories/posts_repository.py`：`get_post_with_stats()` 增加 view_log 写入

**防刷策略**：

```python
# 同一 IP 哈希对同一篇文章，10 分钟内只计一次
SELECT 1 FROM view_logs
WHERE post_id = ? AND user_ip_hash = ?
AND viewed_at > datetime('now', '-10 minutes')
LIMIT 1
```

### 3.6 前端实现

**新增依赖**：`npm install recharts`

**Stats.tsx 增强**：
- 阅读趋势折线图（Recharts `<LineChart>`）
- 热门文章排行增加点赞和收藏数
- 保留现有评论趋势和分类分布

**PostDetail.tsx**：无变更（已有 `👁 {view_count}`）

---

## 4. 评论回复邮件通知

### 4.1 需求说明

当有人回复你的评论时，发送邮件通知被回复者。

### 4.2 数据库设计

**新增表**：

```sql
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,                  -- 'comment_reply' / 'new_post'
    reference_id INTEGER,
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

### 4.3 API 设计

#### 获取通知列表

```
GET /api/notifications?unread_only=true
Cookie: guest_session 或 session

响应：
{
    "notifications": [...],
    "unread_count": 3
}
```

#### 标记已读

```
PATCH /api/notifications/{id}/read
PATCH /api/notifications/read-all
```

#### 邮件偏好

```
PATCH /api/user/preferences
Cookie: guest_session 或 session

{
    "email_notifications": false
}
```

### 4.4 后端实现

**新增文件**：
- `backend/services/email_service.py`
- `backend/services/notification_service.py`
- `backend/repositories/notifications_repository.py`
- `backend/routers/notifications_router.py`
- `backend/templates/email_reply.html`

**邮件发送**（推荐 Resend API）：

```python
import httpx

async def send_email(to: str, subject: str, html: str):
    async with httpx.AsyncClient() as client:
        await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={"from": "blog@xiaocc.dev", "to": to, "subject": subject, "html": html}
        )
```

**触发时机**：在 `comments_service.py` 中，使用 FastAPI `BackgroundTasks`：

```python
# 重要：使用 BackgroundTasks 而非 asyncio.create_task()
# BackgroundTasks 在响应发送后执行，确保数据库连接可用
if parent_comment:
    parent_user = get_user(parent_comment.user_id)
    if parent_user.email and parent_user.email_notifications:
        background_tasks.add_task(send_reply_notification, parent_user, reply, post)
```

### 4.5 前端实现

**新增组件**：
- `frontend/components/NotificationBell.tsx`：导航栏铃铛 + 未读计数
- `frontend/pages/Notifications.tsx`：通知列表页

**Profile.tsx 增强**：邮件通知开关

---

## 5. 富文本编辑器

### 5.1 需求说明

将 AdminEdit 的纯 textarea 升级为富文本编辑器。

### 5.2 现有基础

- AdminEdit.tsx 使用 `<textarea>` + `react-markdown` 预览
- 图片上传已存在：`POST /api/upload`（5MB，magic byte 校验）
- `uploadApi.uploadImage(file)` 前端封装已存在

### 5.3 技术方案

推荐 **Tiptap**（React 原生，ProseMirror 底层）+ **tiptap-markdown**（Markdown 双向转换）。

> 详细设计见 `docs/superpowers/specs/2026-06-08-tiptap-rich-editor-design.md`

### 5.4 内容格式策略

**纯 Markdown 存储**：Tiptap 内部 WYSIWYG，输入输出均为 Markdown string。后端零改动。

**编辑器交互**：
- 浮动气泡工具栏（内联格式：加粗、斜体、标题、链接）
- / 斜杠命令菜单（块级操作：图片、代码块、引用、分割线）
- `</>` 源码模式（fallback：textarea 编辑原始 Markdown）

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

### 5.6 组件设计

**新增文件**：
- `frontend/components/editor/TiptapEditor.tsx` — 核心编辑器
- `frontend/components/editor/BubbleToolbar.tsx` — 浮动气泡工具栏
- `frontend/components/editor/SlashCommand.tsx` — / 斜杠命令菜单
- `frontend/components/editor/SourceMode.tsx` — 源码模式 textarea
- `frontend/components/editor/ImageUploadButton.tsx` — 图片上传
- `frontend/components/editor/LinkDialog.tsx` — 链接弹窗
- `frontend/components/editor/editor.css` — 编辑区样式

```tsx
interface TiptapEditorProps {
    content: string;              // Markdown 格式
    onChange: (md: string) => void; // 回调 Markdown string
    placeholder?: string;
}
```

**图片上传**：复用现有 `POST /api/upload`，拖拽/粘贴 → `uploadApi.uploadImage()` → 插入编辑器

**代码块高亮**：编辑器用 lowlight，读者端 PostDetail 加 rehype-highlight

### 5.7 AdminEdit.tsx 集成

```tsx
import TiptapEditor from '../components/editor/TiptapEditor';

<TiptapEditor
    content={content}
    onChange={(md) => setContent(md)}
    placeholder={t.editor.placeholderContent}
/>
```

**改造**：`viewMode` → `sourceMode`，移除 preview 模式，新增源码模式

---

## 6. 文章目录导航 TOC

### 6.1 现有实现

**PostDetail.tsx 已有完整 TOC**：
- `extractToc()`：regex 提取 h2/h3，`github-slugger` 生成 anchor
- 布局：`xl:grid xl:grid-cols-[1fr_250px] xl:gap-12`
- 滚动高亮：throttled scroll（lodash.throttle 100ms）
- `sticky top-24 max-h-[85vh] overflow-y-auto`

### 6.2 需求：增强现有 TOC

| 增强项 | 描述 |
|--------|------|
| 移动端抽屉 | 小屏幕隐藏 TOC，右下角 `📑` 浮动按钮，点击展开侧边抽屉 |
| IntersectionObserver | 替换 throttled scroll，性能更好 |
| 平滑滚动 | `scrollIntoView({ behavior: 'smooth' })` |

### 6.3 移动端抽屉

**新增组件**：`frontend/components/TOCDrawer.tsx`

- 浮动按钮：`fixed bottom-6 right-6 z-40 xl:hidden`
- 点击展开：右侧抽屉（参考 AdminEdit 设置面板的 `motion.aside` 动画）
- 遮罩层：半透明背景，点击关闭

### 6.4 IntersectionObserver 升级

```typescript
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActiveId(entry.target.id);
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

---

## 7. 多角色权限

### 7.1 需求说明

将现有二层权限（admin / guest）扩展为四层：admin / editor / author / guest。

### 7.2 现有认证架构

> **重要**：admin 身份由 cookie 类型决定，不是数据库字段。
> `get_current_user()` 返回 `{user_id, username, is_admin}`，admin 的 `user_id` 为 `None`。
> `resolve_user_id()` 按需在 `users` 表创建 admin 行（`oauth_provider='admin'`）。

### 7.3 数据库设计

**users 表扩展**：

```sql
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'guest';
```

**迁移**：

```python
# init_db() 中：
# 1. PRAGMA table_info(users) 检查 role 列
# 2. ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'guest'
# 3. 已有 admin 用户迁移
cursor.execute("UPDATE users SET role = 'admin' WHERE oauth_provider = 'admin'")
```

### 7.4 认证系统改造

`get_current_user()` 返回增加 `role` 字段：

```python
# 现有：{user_id, username, is_admin}
# 改造后：{user_id, username, is_admin, role}

# guest 用户：查询 users 表获取 role
# admin 用户：role 固定为 'admin'
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
| 查看统计 | ✅ | ✅ | ❌ | ❌ |

### 7.6 后端实现

**修改文件**：
- `backend/database.py`：`init_db()` 新增 `role` 列
- `backend/dependencies/auth.py`：`get_current_user()` 返回增加 `role`；新增 `require_role()`
- `backend/routers/admin_router.py`：新增 `PATCH /users/{id}/role`

**require_role 实现**：

```python
def require_role(*allowed_roles: str):
    """依赖 require_login，确保 user 不为 None。"""
    def dependency(user: dict = Depends(require_login)):
        role = user.get("role", "guest")
        if role not in allowed_roles:
            raise HTTPException(403, f"权限不足，需要角色: {allowed_roles}")
        return user
    return Depends(dependency)

VALID_ROLES = {"admin", "editor", "author", "guest"}
```

### 7.7 前端实现

**修改文件**：
- `frontend/context/AuthContext.tsx`：`GuestUser` 增加 `role` 字段
- `frontend/components/AdminLayout.tsx`：侧边栏菜单根据角色过滤
- `frontend/pages/Admin.tsx`：用户管理增加角色选择器
- `frontend/pages/Profile.tsx`：显示角色标签

**路由守卫**：

```tsx
const menuItems = [
  { path: '/admin', roles: ['admin', 'editor', 'author'] },
  { path: '/admin/comments', roles: ['admin', 'editor'] },
  { path: '/admin/stats', roles: ['admin', 'editor'] },
  { path: '/admin/users', roles: ['admin'] },
];
const visibleItems = menuItems.filter(item => item.roles.includes(user.role));
```

**角色标签**：admin 靛蓝、editor 翠绿、author 琥珀、guest 石板灰

---

## 实施优先级与排期

```
第 1 阶段（1-2 天）—— 核心社交
  ├── 1. 点赞系统          [4h]  新表 + API + LikeButton（参考 FavoriteButton）
  └── 2. 草稿箱            [3h]  扩展 archived + Admin 状态筛选 Tab

第 2 阶段（2-3 天）—— 内容增强
  ├── 3. 阅读量可视化      [6h]  view_logs + Recharts（增强现有 stats）
  ├── 5. 富文本编辑器      [8h]  Tiptap + 复用现有 upload API
  └── 6. 文章目录 TOC      [4h]  移动端抽屉 + IntersectionObserver（增强现有）

第 3 阶段（1-2 天）—— 系统完善
  ├── 4. 邮件通知          [6h]  通知表 + BackgroundTasks + 前端铃铛
  └── 7. 多角色权限        [6h]  认证改造 + role 字段 + require_role + 路由守卫
```

---

## 技术栈补充

| 功能 | 新增依赖 |
|------|----------|
| 图表 | `recharts` |
| 富文本 | `@tiptap/react` + `@tiptap/starter-kit` + 扩展 |
| 代码高亮 | `lowlight`（Tiptap code-block 依赖） |
| 邮件 | `resend`（推荐）或 `smtplib`（标准库） |
| 图标 | 已有 `lucide-react`（Heart、Bell、List 等图标） |

---

> **注意**：
> - 所有数据库变更使用 `ALTER TABLE ADD COLUMN`，在 `init_db()` 中先检查再执行
> - 收藏和点赞的 toggle 模式保持一致（INSERT/IntegrityError→DELETE）
> - 图片上传复用现有 `POST /api/upload`，不新建端点
> - 邮件发送使用 FastAPI `BackgroundTasks`，不使用 `asyncio.create_task()`
> - `require_role()` 内部依赖 `require_login()`，确保 `user` 不为 `None`
