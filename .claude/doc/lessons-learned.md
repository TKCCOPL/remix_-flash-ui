# 经验教训库

## 类别：布局
<!-- 在此添加布局相关经验 -->

## 类别：API
<!-- 在此添加 API 相关经验 -->

## 类别：测试
- 使用 useI18n() 的组件在测试中必须包裹 PreferencesProvider，否则会抛出 "usePreferences must be used within PreferencesProvider" 错误

## 类别：前端

### Gitee 图标显示错误

**问题描述**：登录弹窗中 Gitee 图标显示为错误的圆形图案

**根本原因**：
- `OAuthMenu.tsx` 中的 SVG path 数据错误
- 使用了错误的图标路径，不是官方 Gitee 图标

**解决方案**：
1. 从 Simple Icons 获取正确的 Gitee SVG path
2. 替换 `frontend/components/OAuthMenu.tsx` 中的 SVG path 数据

**经验总结**：
- 使用第三方图标时，应从官方或可信来源获取 SVG 数据
- 内联 SVG 图标需要验证 path 数据的正确性
- 推荐使用 [Simple Icons](https://simpleicons.org/) 获取品牌图标

**相关文件**：
- `frontend/components/OAuthMenu.tsx` - OAuth 登录菜单组件

---

### 个人主页登录方式显示

**问题描述**：个人主页显示通用的"登录"文本，而非具体的登录方式（GitHub/Gitee）

**根本原因**：
1. 后端 `/api/oauth/me` 端点未返回 `oauth_provider` 字段
2. 前端 `GuestUser` 类型缺少 `oauth_provider` 属性
3. `UserCard` 组件使用 `t.oauth.login` 而非 `t.profile.loginMethod()`

**解决方案**：
1. 后端：在 `oauth_router.py` 的 `/me` 响应中添加 `oauth_provider` 字段
2. 前端类型：在 `oauth.ts` 的 `GuestUser` 类型中添加 `oauth_provider: string`
3. 前端组件：在 `UserCard.tsx` 中使用 `t.profile.loginMethod(user.oauth_provider)`

**经验总结**：
- i18n 函数已定义但未使用时，应检查完整的数据流
- 后端 API 响应应包含前端需要的所有字段
- 类型定义应与后端响应保持同步

**相关文件**：
- `backend/routers/oauth_router.py` - OAuth 路由（/me 端点）
- `frontend/api/oauth.ts` - GuestUser 类型定义
- `frontend/components/UserCard.tsx` - 用户信息卡片组件
- `frontend/i18n.ts` - 国际化文本（loginMethod 函数）

---

### 动画闪烁问题
**问题描述**：页面切换时出现白屏闪烁

**根本原因**：
1. 页面组件使用 `initial={{ opacity: 0 }}` 动画，导致页面先以不可见状态渲染
2. CSS 动画（如 `fadeUp`）使用 `opacity: 0` 作为初始状态
3. `AnimatePresence` 配置不当，与 React Router 集成有问题

**解决方案**：
1. 移除所有页面组件的 `initial={{ opacity: 0 }}` 动画，改为 `opacity: 1`
2. 移除 CSS 动画的 `opacity: 0` 初始状态
3. 如果不需要页面切换过渡效果，可以移除 `AnimatePresence`

**经验总结**：
- 在 React Router + Framer Motion 项目中，谨慎使用 `AnimatePresence`
- 如果页面组件已经有自己的动画，不需要在 Layout 或 App 中再添加 `AnimatePresence`
- CSS 动画的初始状态会影响页面切换体验
- 测试页面切换时，要测试从不同页面切换回来的情况

**相关文件**：
- `frontend/pages/*.tsx` - 页面组件动画
- `frontend/index.css` - CSS 动画
- `frontend/App.tsx` - 路由配置

## 类别：数据库

### 本地开发与生产环境数据库分离

**问题描述**：本地开发时数据库为空，文章数据丢失

**根本原因**：
1. SQLite 数据库文件 `backend/data/blog.sqlite3` 被 `.gitignore` 忽略
2. 本地数据库与 VPS 生产数据库是独立的
3. 数据库结构变更时，`init_db()` 只创建表结构，不迁移数据

**解决方案**：
1. 创建种子数据脚本 `backend/seed.py`，本地开发时插入测试数据
2. 种子脚本有安全检查，数据已存在时跳过
3. 文档中明确说明本地/生产环境数据库分离策略

**经验总结**：
- 数据库文件不应通过 git 同步，避免生产数据泄露和冲突
- 本地开发环境需要独立的种子数据脚本
- 种子脚本应包含幂等性检查，避免重复插入
- 数据库迁移应使用增量式操作（CREATE IF NOT EXISTS, ALTER TABLE ADD COLUMN）
- 重要数据变更前应先备份数据库文件

**相关文件**：
- `backend/seed.py` - 种子数据脚本
- `backend/database.py` - 数据库初始化（自动迁移）
- `.gitignore` - 忽略数据库文件

## 类别：后端

### OAuth 实施经验

#### 1. config.py 必须手动加载 .env 文件
**问题**：`os.environ.get("GITHUB_CLIENT_ID")` 返回空字符串
**原因**：FastAPI 不会自动加载 `.env` 文件
**解决**：
```python
from pathlib import Path
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)
```

#### 2. FastAPI 路由顺序陷阱
**问题**：`/{provider}` 路由捕获了 `/me`、`/logout` 等路径
**原因**：FastAPI 按定义顺序匹配，参数路由会贪婪匹配
**解决**：固定路径路由必须定义在参数路由之前

#### 3. CSRF 保护阻止退出登录
**问题**：POST `/api/oauth/logout` 返回 403 Forbidden
**原因**：CSRF 中间件要求所有 POST 请求携带 CSRF token
**解决**：在 `backend/middleware.py` 中添加豁免路径 `CSRF_EXEMPT_PATHS = {"/api/oauth/logout"}`

#### 4. OAuth 回调 URL 端口问题
**问题**：OAuth 回调失败
**原因**：.env 文件中配置了错误的端口
**解决**：更新 .env 文件中的重定向 URI为实际使用的端口

#### 5. Claude Code 后台任务限制
**问题**：启动的 uvicorn 进程会自动退出
**原因**：Claude Code 的后台任务有超时和资源限制
**解决**：需要在系统终端中手动启动服务

### OAuth 技术决策
- **OAuth 提供商抽象层**：将 GitHub 和 Gitee 的 OAuth 逻辑抽象到统一接口
- **JWT + httponly Cookie**：选择 JWT (HS256) 作为 session token，存储在 httponly cookie 中
- **双重提交 Cookie CSRF 保护**：对非安全方法使用双重提交 Cookie 模式
- **数据库 UNIQUE 约束**：users 表的 `(oauth_provider, oauth_id)` 联合唯一索引防止重复注册
