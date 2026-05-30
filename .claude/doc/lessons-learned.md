# 经验教训库

## 类别：布局
<!-- 在此添加布局相关经验 -->

## 类别：API
<!-- 在此添加 API 相关经验 -->

## 类别：测试
- 使用 useI18n() 的组件在测试中必须包裹 PreferencesProvider，否则会抛出 "usePreferences must be used within PreferencesProvider" 错误

## 类别：前端

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
