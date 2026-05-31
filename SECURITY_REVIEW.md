# 安全审查报告

**审查日期**: 2026-05-31 (更新)
**审查范围**: `main...HEAD` (104个文件, +9107/-1286 行)
**审查模式**: 最大努力级别 (recall-focused)
**分支**: feature/favorite-button-style
**审查状态**: ⚠️ 需要修复

---

## 发现汇总

| 严重程度 | 数量 | 关键问题 |
|---------|------|----------|
| 严重 | 4 | 权限绕过、事务缺失、外键约束、测试失败 |
| 中等 | 3 | 竞态条件、子评论级联、权限检查 |
| 轻微 | 3 | Token 黑名单、外键启用、日志事务 |

---

## 严重问题 (4个)

### 1. admin 路由缺少 is_admin 权限检查

**文件**: `backend/dependencies/auth.py:44`
**风险等级**: 🔴 严重

**问题描述**:
`require_login()` 函数仅检查用户是否为非 None，不检查 `is_admin` 标志。任何通过 GitHub/Gitee OAuth 登录的访客用户都可访问所有管理端点。

**攻击路径**:
1. 访客通过 GitHub/Gitee OAuth 登录
2. 请求携带 `guest_session` cookie
3. `get_current_user()` 优先匹配 guest session，返回 `{"is_admin": False}`
4. `require_login()` 仅检查用户是否为非 None，通过鉴权
5. 访客用户可执行管理操作（查看/删除用户、管理评论、查看统计数据）

**受影响端点**:
- `GET /api/admin/users` - 列出所有用户
- `GET /api/admin/users/{user_id}` - 查看用户详情
- `DELETE /api/admin/users/{user_id}` - 删除用户账号
- `GET /api/admin/comments` - 列出所有评论
- `PUT /api/admin/comments/{comment_id}/status` - 修改评论状态
- `DELETE /api/admin/comments/{comment_id}` - 删除评论
- `POST /api/admin/comments/batch-delete` - 批量删除评论
- `GET /api/admin/stats/*` - 查看统计数据

**修复建议**:
```python
# backend/dependencies/auth.py
def require_admin(request: Request) -> dict:
    """Return current admin user or raise 403."""
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="unauthorized")
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="admin access required")
    return user
```

然后将 admin 路由中的 `Depends(require_login)` 替换为 `Depends(require_admin)`。

---

### 2. delete_post() 多步删除操作无事务包装

**文件**: `backend/repositories/posts_repository.py:61`
**风险等级**: 🔴 严重

**问题描述**:
删除帖子时先删 comments，再删 favorites，最后删 posts。三个 DELETE 操作后才调用一次 `conn.commit()`，中间无回滚点。

**当前代码**:
```python
def delete_post(conn, post_id: int):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM comments WHERE post_id = ?", (post_id,))
    cursor.execute("DELETE FROM favorites WHERE post_id = ?", (post_id,))
    cursor.execute("DELETE FROM posts WHERE id = ?", (post_id,))
    conn.commit()
    return cursor.rowcount > 0
```

**失败场景**:
如果程序在删除过程中崩溃（如 comments 已删但 posts 未删），会导致数据不一致。

**修复建议**:
```python
def delete_post(conn, post_id: int):
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM comments WHERE post_id = ?", (post_id,))
        cursor.execute("DELETE FROM favorites WHERE post_id = ?", (post_id,))
        cursor.execute("DELETE FROM posts WHERE id = ?", (post_id,))
        conn.commit()
        return cursor.rowcount > 0
    except Exception:
        conn.rollback()
        raise
```

---

### 3. 数据库外键缺少 ON DELETE CASCADE 约束

**文件**: `backend/database.py:86`
**风险等级**: 🔴 严重

**问题描述**:
comments 和 favorites 表的外键定义缺少 `ON DELETE CASCADE`，依赖手动级联删除。

**当前 Schema**:
```sql
CREATE TABLE comments (
    ...
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE favorites (
    ...
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**失败场景**:
当使用 DELETE FROM 直接删除帖子时，不会自动删除关联的评论和收藏，导致孤立数据。

**修复建议**:
```sql
CREATE TABLE comments (
    ...
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE favorites (
    ...
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**注意**: 需要同时执行 `PRAGMA foreign_keys = ON` 才能生效。

---

### 4. Layout 测试缺少 AuthProvider 包裹

**文件**: `frontend/components/__tests__/Layout.test.tsx:8`
**风险等级**: 🔴 严重 (测试失败)

**问题描述**:
Layout 组件内部调用 `useAuth()`，但测试未包裹 `AuthProvider`。

**失败信息**:
```
useAuth must be used within AuthProvider
```

**当前代码**:
```tsx
render(
  <BrowserRouter>
    <PreferencesProvider>
      <Layout />
    </PreferencesProvider>
  </BrowserRouter>
);
```

**修复建议**:
```tsx
import { AuthProvider } from '../../context/AuthContext';

render(
  <BrowserRouter>
    <AuthProvider>
      <PreferencesProvider>
        <Layout />
      </PreferencesProvider>
    </AuthProvider>
  </BrowserRouter>
);
```

**违反经验**: `lessons-learned.md` 中明确指出"使用 useAuth 的组件在测试中必须包裹 AuthProvider"

---

## 中等问题 (3个)

### 5. CommentSection 缺少竞态条件防护

**文件**: `frontend/components/CommentSection.tsx:34`
**风险等级**: 🟡 中等

**问题描述**:
`loadComments` 函数没有 cleanup 机制，组件卸载后仍可能调用 `setState`。

**对比**:
- `CategoryPage.tsx` 和 `PostDetail.tsx` 都有 `cancelled` flag
- `CommentSection.tsx` 缺少此防护

**失败场景**:
用户快速切换文章或离开页面时，组件可能已卸载但异步请求仍会返回并调用 `setComments`，导致内存泄漏警告。

**修复建议**:
```typescript
useEffect(() => {
  let cancelled = false;
  const load = async () => {
    try {
      const data = await commentsApi.list(postId);
      if (!cancelled) setComments(data);
    } catch {
      if (!cancelled) setError('Failed to load comments');
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
  void load();
  return () => { cancelled = true; };
}, [postId]);
```

---

### 6. delete_comment_by_id 未处理子评论级联删除

**文件**: `backend/repositories/comments_admin_repository.py:68`
**风险等级**: 🟡 中等

**问题描述**:
管理员删除父评论时，`delete_comment_by_id()` 只删除指定评论，不删除子评论。

**对比**:
- `comments_repository.py` 的 `delete_comment_record()` 会先删子评论
- `comments_admin_repository.py` 的 `delete_comment_by_id()` 不处理子评论

**失败场景**:
管理员批量删除时可能产生孤立子评论（`parent_id` 指向已删除的评论）。

**修复建议**:
```python
def delete_comment_by_id(conn, comment_id: int):
    cursor = conn.cursor()
    # 先删除子评论
    cursor.execute("DELETE FROM comments WHERE parent_id = ?", (comment_id,))
    # 再删除父评论
    cursor.execute("DELETE FROM comments WHERE id = ?", (comment_id,))
    conn.commit()
    return cursor.rowcount > 0
```

---

### 7. admin 路由使用 require_login 而非 require_admin

**文件**: `backend/routers/admin_router.py:18`
**风险等级**: 🟡 中等

**问题描述**:
所有 admin 端点均使用 `Depends(require_login)`，但 `require_login` 不检查 `is_admin` 标志。

**受影响端点**:
- `backend/routers/admin_router.py`
- `backend/routers/admin_comments_router.py`
- `backend/routers/admin_stats_router.py`

**修复建议**:
修复 #1 后，将所有 admin 路由中的 `Depends(require_login)` 替换为 `Depends(require_admin)`。

---

## 轻微问题 (3个)

### 8. Token 黑名单使用内存存储

**文件**: `backend/services/oauth_service.py:1`
**风险等级**: 🟢 轻微

**问题描述**:
`GUEST_BLACKLISTED_TOKENS` 和 `BLACKLISTED_TOKENS` 均为进程内字典。服务重启后黑名单清空，已撤销的 token 在过期前可再次使用。

**影响范围**:
对于个人博客项目可接受，但应在文档中说明此行为。

**建议**:
在 README 或 CLAUDE.md 中说明此限制。

---

### 9. init_db() 未启用 PRAGMA foreign_keys = ON

**文件**: `backend/database.py:20`
**风险等级**: 🟢 轻微

**问题描述**:
`init_db()` 函数未执行 `PRAGMA foreign_keys = ON`，而 `get_db()` 中有启用。

**影响范围**:
数据库迁移时外键约束不生效，可能导致孤立数据。

**修复建议**:
```python
def init_db():
    os.makedirs('data', exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    conn.execute("PRAGMA foreign_keys = ON")  # 添加此行
    cursor = conn.cursor()
    # ...
```

---

### 10. 搜索日志记录无事务保护

**文件**: `backend/repositories/posts_repository.py:150`
**风险等级**: 🟢 轻微

**问题描述**:
`log_search()` 独立 commit，搜索结果返回和日志记录不是原子操作。

**影响范围**:
日志丢失不影响核心功能，但可能导致搜索统计不准确。

---

## 代码质量亮点

以下安全实践值得肯定：

- **恒定时间比较**: `auth_service.py` 使用 `secrets.compare_digest` 防止时序攻击
- **fail-closed 设计**: `ADMIN_PASS` 未设置时拒绝所有登录，而非使用默认密码
- **OAuth state 参数**: 使用 `secrets.token_urlsafe(32)` 生成高熵 state，数据库存储并验证，10 分钟过期清理
- **LIKE 转义**: `posts_repository.py` 中的 `_escape_like` 函数正确转义 `%`、`_`、`\` 特殊字符
- **GDPR 合规**: 搜索日志对 IP 进行 SHA-256 单向哈希处理
- **文件上传安全**: 大小限制、扩展名白名单、魔数验证、UUID 文件名
- **Pydantic 输入验证**: 所有请求体使用 Pydantic 模型，有字段长度和格式约束
- **CSRF 保护**: 双重提交 Cookie 模式实现正确，前端 apiFetch 自动处理
- **安全响应头**: 完整的 CSP/HSTS/X-Frame-Options 等

---

## 修复优先级

| 优先级 | 问题 | 预计工作量 |
|--------|------|-----------|
| P0 - 立即修复 | #1 admin 权限绕过 | 30 分钟 |
| P0 - 立即修复 | #2 事务包装 | 30 分钟 |
| P1 - 高优先级 | #3 ON DELETE CASCADE | 1 小时 |
| P1 - 高优先级 | #4 测试修复 | 15 分钟 |
| P2 - 中优先级 | #5 竞态条件 | 15 分钟 |
| P2 - 中优先级 | #6 子评论级联 | 15 分钟 |
| P2 - 中优先级 | #7 require_admin | 30 分钟 |
| P3 - 低优先级 | #8-#10 轻微问题 | 30 分钟 |

---

## 审查结论

**整体评估**: ⚠️ 需要修复

代码在 CSRF 保护、SQL 注入防护、OAuth 流程等方面的安全实现质量较高。但存在一个严重的授权漏洞：admin 管理路由缺少 `is_admin` 权限检查，导致任何 OAuth 登录的访客用户都可以执行管理操作。

**建议**:
1. **立即修复** admin 权限绕过问题
2. **尽快修复** 事务和级联删除问题
3. **安排时间** 修复竞态条件和测试问题

---

## 历史审查记录

### 2026-05-24 审查 (已完成)

| 风险等级 | 数量 | 状态 |
|---------|------|------|
| Critical | 2 | ✅ 已修复 |
| High | 3 | ✅ 已修复 |
| Medium | 3 | ✅ 已修复 |
| Low | 2 | ✅ 已修复 |

**已修复问题**:
1. 硬编码弱密码 → 环境变量配置
2. Session Cookie 可伪造 → JWT 签名
3. 文件上传无大小限制 → 5MB 限制
4. 文件类型验证不严格 → 魔数验证
5. 缺少 CORS 配置 → 白名单配置
6. 搜索日志记录用户 IP → SHA-256 哈希
7. 前端无效的 Bearer Token → 删除
8. 缺少请求频率限制 → slowapi 限制
9. 密码暴露在文档中 → 移除
10. 数据库文件权限 → chmod 600

---

*报告生成时间: 2026-05-31*
*审查工具: Claude Code (mimo-v2.5[1m])*
