# Blog 功能扩展实施计划

> 基于项目现状分析，聚焦真正需要开发的功能模块

---

## 现状总结

### 已完整实现（无需开发）

| 模块 | 实现位置 | 说明 |
|------|---------|------|
| 富文本编辑器 | `frontend/components/editor/` | Tiptap + 气泡工具栏 + 斜杠命令 + 源码模式 |
| 基础草稿系统 | `AdminEdit.tsx` + `posts_router.py` | 支持 draft/published 状态 |
| 基础统计 | `Stats.tsx` + `stats_service.py` | 4个端点 + 仪表盘 |
| TOC 目录 | `PostDetail.tsx` | regex 提取 + scroll spy + 侧边栏 |
| 基础权限 | `auth.py` | admin/guest 双 cookie 体系 |

### 需要新增/增强

| 模块 | 工作类型 | 优先级 | 预估工时 |
|------|---------|--------|----------|
| 点赞系统 | 新建 | P0 高 | 4h |
| 草稿管理增强 | 小幅增强 | P1 中 | 2h |
| 阅读量统计增强 | 中等增强 | P1 中 | 4h |
| 多角色权限 | 中等扩展 | P1 中 | 6h |
| TOC 移动端增强 | 小幅增强 | P2 低 | 3h |
| 评论通知系统 | 新建 | P2 低 | 6h |

---

## 第一阶段：核心社交功能（1天）

### 1. 点赞系统 [4h]

#### 1.1 数据库

```sql
-- backend/database.py init_db() 中添加
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

#### 1.2 后端实现

**新增文件**：
- `backend/repositories/likes_repository.py`
- `backend/services/likes_service.py`
- `backend/routers/likes_router.py`

**核心方法**（参考 `favorites_repository.py`）：

```python
# likes_repository.py
def toggle_like_atomic(conn, user_id: int, post_id: int) -> bool:
    """INSERT 成功→True，IntegrityError→DELETE→False"""
    try:
        conn.execute(
            "INSERT INTO likes (user_id, post_id) VALUES (?, ?)",
            (user_id, post_id)
        )
        return True
    except sqlite3.IntegrityError:
        conn.execute(
            "DELETE FROM likes WHERE user_id = ? AND post_id = ?",
            (user_id, post_id)
        )
        return False

def count_likes(conn, post_id: int) -> int:
    """返回文章点赞数"""

def check_is_liked(conn, post_id: int, user_id: int) -> bool:
    """检查用户是否已点赞"""

def get_likes_for_posts(conn, user_id: int, post_ids: list[int]) -> dict:
    """批量获取多篇文章的点赞状态"""
```

**API 端点**：

```python
# likes_router.py
@router.post("/{post_id}/like")
async def toggle_like(post_id: int, user=Depends(require_login)):
    """切换点赞状态"""

@router.get("/{post_id}/is-liked")
async def check_liked(post_id: int, user=Depends(get_current_user_optional)):
    """获取单篇点赞状态"""

@router.get("/like-status")
async def get_like_status(ids: str, user=Depends(get_current_user_optional)):
    """批量获取点赞状态"""
```

**路由注册**（`main.py`）：

```python
app.include_router(likes_router.router, prefix="/api/posts", tags=["likes"])
```

#### 1.3 前端实现

**新增文件**：
- `frontend/components/LikeButton.tsx`
- `frontend/api/likes.ts`

**LikeButton 组件**：

```tsx
interface LikeButtonProps {
    postId: number;
    initialLiked: boolean;
    initialCount: number;
    size?: 'sm' | 'md' | 'lg';
}

// 交互流程（参考 FavoriteButton.tsx）：
// 1. 点击 → 乐观更新 UI
// 2. 发送 POST /api/posts/{id}/like
// 3. 响应校正计数
// 4. 未登录 → navigate('/login')
```

**集成位置**：
- `PostDetail.tsx`：文章标题下方（与 FavoriteButton 并列）
- `Home.tsx` 文章卡片：底部右侧

#### 1.4 验收标准

- [ ] 未登录用户点击点赞按钮，跳转登录页
- [ ] 已登录用户点击点赞，按钮高亮，计数+1
- [ ] 再次点击取消点赞，计数-1
- [ ] 文章详情页和列表页都显示点赞按钮
- [ ] 刷新页面后点赞状态保持

---

## 第二阶段：内容管理增强（1天）

### 2. 草稿管理增强 [2h]

#### 2.1 现有基础

- `posts.status` 字段已支持 `draft`/`published`
- `AdminEdit.tsx` 已有"保存草稿"按钮
- i18n 已有 `admin.allStatus`/`admin.statusPublished`/`admin.statusDraft`

#### 2.2 需要增强

**后端**（`posts_router.py`）：

```python
# 新增状态切换端点
@router.patch("/{post_id}/status")
async def update_post_status(post_id: int, status: PostStatus, admin=Depends(require_admin)):
    """切换文章状态：draft/published/archived"""
```

**前端**（`Admin.tsx`）：

```tsx
// 新增状态筛选 Tab
const statusTabs = [
    { key: 'all', label: t.admin.allStatus },
    { key: 'published', label: t.admin.statusPublished },
    { key: 'draft', label: t.admin.statusDraft },
    { key: 'archived', label: t.admin.statusArchived },  // 新增
];

// 每行操作按钮根据状态显示
// - draft: [发布] [编辑] [删除]
// - published: [归档] [编辑]
// - archived: [重新发布] [编辑] [删除]
```

**AdminEdit.tsx 增强**：

```tsx
// 已发布文章显示"归档"按钮
{postStatus === 'published' && (
    <button onClick={handleArchive}>{t.admin.archive}</button>
)}
```

#### 2.3 验收标准

- [ ] Admin 页面有状态筛选 Tab
- [ ] 可以将文章从 draft → published → archived
- [ ] 可以将 archived 文章重新发布
- [ ] 归档文章不在公开列表显示

---

### 3. 阅读量统计增强 [4h]

#### 3.1 现有基础

- `posts.view_count` 字段已存在
- `get_post_with_stats(increment_view=True)` 已实现
- `stats_service.py` 已有 4 个函数

#### 3.2 新增功能

**数据库**（`database.py`）：

```sql
CREATE TABLE IF NOT EXISTS view_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_ip_hash TEXT,           -- SHA-256 哈希
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_view_logs_post_date ON view_logs(post_id, viewed_at);
```

**后端**（`stats_service.py`）：

```python
def get_views_trend(conn, days: int = 30) -> dict:
    """获取阅读趋势数据"""
    # SELECT date(viewed_at) as date, COUNT(*) as views
    # FROM view_logs
    # WHERE viewed_at > datetime('now', ?)
    # GROUP BY date
    # ORDER BY date

def log_view(conn, post_id: int, user_ip_hash: str):
    """记录阅读日志（10分钟内同一IP不重复计数）"""
```

**前端**（`Stats.tsx`）：

```tsx
// 安装依赖：npm install recharts

// 新增阅读趋势折线图
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// 热门文章排行增加点赞数（需配合模块1）
```

#### 3.3 验收标准

- [ ] 统计页面显示阅读趋势折线图
- [ ] 同一 IP 10分钟内重复访问不重复计数
- [ ] 热门文章排行显示点赞和收藏数

---

## 第三阶段：权限系统扩展（1天）

### 4. 多角色权限 [6h]

#### 4.1 现有认证架构

```python
# backend/dependencies/auth.py
# admin 身份由 cookie 类型决定，不是数据库字段
# get_current_user() 返回 {user_id, username, is_admin}
# guest 用户通过 OAuth 登录，存储在 users 表
```

#### 4.2 数据库扩展

```sql
-- users 表新增 role 字段
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'guest';

-- 迁移已有 admin 用户
UPDATE users SET role = 'admin' WHERE oauth_provider = 'admin';
```

#### 4.3 权限矩阵

| 操作 | admin | editor | author | guest |
|------|:-----:|:------:|:------:|:-----:|
| 浏览文章 | ✅ | ✅ | ✅ | ✅ |
| 评论/点赞 | ✅ | ✅ | ✅ | ✅ |
| 创建草稿 | ✅ | ✅ | ✅ | ❌ |
| 编辑自己的草稿 | ✅ | ✅ | ✅ | ❌ |
| 编辑他人文章 | ✅ | ✅ | ❌ | ❌ |
| 发布/归档文章 | ✅ | ✅ | ❌ | ❌ |
| 管理评论 | ✅ | ✅ | ❌ | ❌ |
| 查看统计 | ✅ | ✅ | ❌ | ❌ |
| 管理用户/角色 | ✅ | ❌ | ❌ | ❌ |

#### 4.4 后端实现

**修改 `auth.py`**：

```python
def get_current_user() -> dict:
    # 返回值增加 role 字段
    # guest: 从 users 表查询 role
    # admin: role 固定为 'admin'

def require_role(*allowed_roles: str):
    """角色权限装饰器"""
    def dependency(user: dict = Depends(require_login)):
        role = user.get("role", "guest")
        if role not in allowed_roles:
            raise HTTPException(403, f"权限不足，需要角色: {allowed_roles}")
        return user
    return Depends(dependency)
```

**新增端点**（`admin_router.py`）：

```python
@router.patch("/users/{user_id}/role")
async def update_user_role(user_id: int, role: str, admin=Depends(require_admin)):
    """管理员修改用户角色"""
```

#### 4.5 前端实现

**AuthContext 增强**：

```tsx
interface GuestUser {
    id: number;
    username: string;
    avatar_url: string;
    role: 'admin' | 'editor' | 'author' | 'guest';  // 新增
}
```

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

#### 4.6 验收标准

- [ ] 用户 Profile 页面显示角色标签
- [ ] Admin 可以在用户管理页面修改用户角色
- [ ] 不同角色看到不同的管理菜单
- [ ] 低角色用户无法访问高权限功能

---

## 第四阶段：体验优化（1天）

### 5. TOC 移动端增强 [3h]

#### 5.1 现有实现

```tsx
// PostDetail.tsx
// - xl 断点显示右侧 TOC 侧边栏
// - throttled scroll 高亮
```

#### 5.2 新增移动端抽屉

**新增组件** `frontend/components/TOCDrawer.tsx`：

```tsx
export default function TOCDrawer({ headings }: { headings: TocItem[] }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* 浮动按钮 - 仅小屏幕显示 */}
            <button
                className="fixed bottom-6 right-6 z-40 xl:hidden 
                           bg-indigo-500 text-white rounded-full p-3 shadow-lg"
                onClick={() => setIsOpen(true)}
            >
                📑
            </button>

            {/* 抽屉 */}
            {isOpen && (
                <>
                    {/* 遮罩 */}
                    <div 
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* 内容 */}
                    <motion.aside
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        className="fixed right-0 top-0 h-full w-72 bg-white dark:bg-stone-800 z-50 p-4 overflow-y-auto"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold">目录</h3>
                            <button onClick={() => setIsOpen(false)}>✕</button>
                        </div>
                        <nav>
                            {headings.map(h => (
                                <a
                                    key={h.id}
                                    href={`#${h.id}`}
                                    className={`block py-1 ${h.level === 3 ? 'pl-4' : ''}`}
                                    onClick={() => setIsOpen(false)}
                                >
                                    {h.text}
                                </a>
                            ))}
                        </nav>
                    </motion.aside>
                </>
            )}
        </>
    );
}
```

**PostDetail.tsx 集成**：

```tsx
import TOCDrawer from '../components/TOCDrawer';

// 在 xl 断点隐藏 TOC，显示抽屉按钮
<div className="xl:hidden">
    <TOCDrawer headings={headings} />
</div>
```

#### 5.3 IntersectionObserver 升级

```tsx
// 替换 throttled scroll
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

#### 5.4 验收标准

- [ ] 移动端右下角显示目录浮动按钮
- [ ] 点击按钮打开右侧抽屉显示目录
- [ ] 点击目录项平滑滚动到对应位置
- [ ] 滚动时目录项高亮正确

---

### 6. 评论通知系统 [6h]

#### 6.1 数据库设计

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

-- users 表扩展
ALTER TABLE users ADD COLUMN email_notifications INTEGER DEFAULT 1;
```

#### 6.2 后端实现

**新增文件**：
- `backend/repositories/notifications_repository.py`
- `backend/services/notification_service.py`
- `backend/routers/notifications_router.py`

**API 端点**：

```python
@router.get("/notifications")
async def get_notifications(unread_only: bool = False, user=Depends(require_login)):
    """获取通知列表"""

@router.patch("/notifications/{id}/read")
async def mark_read(id: int, user=Depends(require_login)):
    """标记单条已读"""

@router.patch("/notifications/read-all")
async def mark_all_read(user=Depends(require_login)):
    """标记全部已读"""
```

**触发时机**（`comments_service.py`）：

```python
# 在创建评论时，如果是回复，通知被回复者
if parent_comment_id:
    background_tasks.add_task(
        notification_service.create_reply_notification,
        parent_user_id=parent_comment.user_id,
        reply_user=current_user,
        post=post,
        comment=comment
    )
```

#### 6.3 前端实现

**新增组件**：
- `frontend/components/NotificationBell.tsx`
- `frontend/pages/Notifications.tsx`

**NotificationBell**：

```tsx
export default function NotificationBell() {
    const { unreadCount } = useNotifications();
    
    return (
        <Link to="/notifications" className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount}
                </span>
            )}
        </Link>
    );
}
```

**集成到 Navbar**：

```tsx
// 在导航栏用户头像旁边
{user && <NotificationBell />}
```

#### 6.4 验收标准

- [ ] 有人回复评论时，被回复者看到通知铃铛红点
- [ ] 点击铃铛进入通知列表页
- [ ] 可以标记单条或全部已读
- [ ] 通知列表显示评论内容摘要

---

## 实施顺序与排期

```
第 1 天：核心社交
├── 上午：点赞系统（后端）
└── 下午：点赞系统（前端）+ 草稿管理增强

第 2 天：数据与权限
├── 上午：阅读量统计增强（后端 + view_logs）
└── 下午：多角色权限（数据库 + 后端）

第 3 天：权限与体验
├── 上午：多角色权限（前端 + 路由守卫）
└── 下午：TOC 移动端增强

第 4 天：通知系统
├── 上午：评论通知（后端）
└── 下午：评论通知（前端）+ 整体测试
```

---

## 依赖关系

```
点赞系统 ─────────────────────────────────┐
    │                                      │
    └──→ 阅读量统计增强 ──────────────────┤
                                          │
草稿管理增强 ─────────────────────────────┼──→ 整体测试
                                          │
多角色权限 ───────────────────────────────┤
                                          │
TOC 移动端增强 ───────────────────────────┤
                                          │
评论通知系统 ─────────────────────────────┘
```

> **注意**：点赞系统是阅读量统计增强的前置依赖（热门文章排行需要显示点赞数）

---

## 技术栈补充

| 功能 | 新增依赖 |
|------|----------|
| 图表 | `recharts` |
| 邮件 | `resend`（推荐）或标准库 `smtplib` |
| 图标 | 已有 `lucide-react`（Heart、Bell、List 等） |

---

## 风险与注意事项

1. **数据库迁移**：所有变更使用 `ALTER TABLE`，在 `init_db()` 中先检查再执行
2. **向后兼容**：新增字段设置默认值，不影响现有数据
3. **CSRF 保护**：所有 POST/PATCH/DELETE 请求需要 CSRF token
4. **性能考虑**：view_logs 表可能增长较快，考虑定期归档旧数据
5. **邮件发送**：使用 FastAPI BackgroundTasks，不使用 asyncio.create_task()

---

## 完成后的效果

- ✅ 读者可以点赞文章，增加社交互动
- ✅ 管理员可以更方便地管理文章状态（草稿/发布/归档）
- ✅ 统计页面展示阅读趋势，帮助分析内容表现
- ✅ 多角色权限系统，支持团队协作
- ✅ 移动端也能方便地查看文章目录
- ✅ 评论回复有通知，提升用户参与度
