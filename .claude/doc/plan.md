# 开发计划

## 项目概述
XiaoC Blog - 基于 React 19、FastAPI 和 SQLite 的全栈个人博客系统。

## 任务列表
| # | 任务 | 状态 | 开发ID | 测试ID | 备注 |
|---|------|------|--------|--------|------|
| 0 | 搭建框架和公共代码 | ✅ 已完成 | - | - | 初始搭建 |
| 1 | Database Schema Update | ✅ 已完成 | - | test_database_schema.py | 添加 categories 和 search_logs 表 |
| 2 | Archive API Endpoint | ✅ 已完成 | - | test_archive_api.py | 归档接口按年月分组返回文章 |
| 3 | Categories API Endpoint | ✅ 已完成 | - | test_categories_api.py | 分类接口返回分类列表和按slug查询 |
| 4 | Search API Endpoint | ✅ 已完成 | - | test_search_api.py | 搜索接口按标题/内容/分类模糊搜索，记录日志 |
| 5 | Frontend Archive Page | ✅ 已完成 | - | ArchivePage.test.tsx | 归档页面按年月分组展示文章时间线 |
| 6 | Frontend Categories Page | ✅ 已完成 | - | CategoriesPage.test.tsx | 分类页面标签云布局，按文章数调整字体大小 |
| 7 | Frontend Category Page | ✅ 已完成 | - | CategoryPage.test.tsx | 分类详情页，显示该分类下的文章列表 |
| 8 | Navigation Integration | ✅ 已完成 | - | Layout.test.tsx | 添加导航链接和搜索功能 |
| 9 | Final Integration and Polish | ✅ 已完成 | - | - | 响应式设计、暗色模式、i18n修复 |
| 10 | Bug Fixes | ✅ 已完成 | - | - | 返回按钮、搜索、分类、动画闪烁修复 |
| 11 | OAuth 访客登录功能 | ✅ 已完成 | - | - | GitHub/Gitee OAuth、评论、收藏 |
| 12 | OAuth 功能修复与优化 | ✅ 已完成 | - | - | Gitee 图标、登录方式显示 |
| 13 | 本地开发数据库管理 | ✅ 已完成 | - | - | 种子脚本、数据恢复、文档更新 |

## 当前进度
- 正在执行：无
- 已完成：14/14

## Bug 修复记录

### 1. 返回按钮问题
- **问题**：从归档页进入文章后，点击返回按钮总是回到首页
- **修复**：将 `<Link to="/">` 改为 `navigate(-1)`，支持返回来源页面
- **文件**：`frontend/pages/PostDetail.tsx`

### 2. 搜索功能重复
- **问题**：搜索页面与导航栏搜索框功能重复
- **修复**：删除搜索页面，将导航栏搜索框改为可用的实时搜索（带下拉结果）
- **文件**：`frontend/components/Layout.tsx`, `frontend/App.tsx`

### 3. 分类页面无显示
- **问题**：点击分类标签后显示空白页面
- **修复**：添加 `/categories/:slug` 路由和 API 端点，创建分类详情页
- **文件**：`frontend/pages/CategoryPage.tsx`, `backend/routers/categories_router.py`

### 4. 页面切换闪烁
- **问题**：点击导航链接切换页面时，页面会闪烁一下
- **根本原因**：
  - 各页面组件使用 `initial={{ opacity: 0 }}` 动画
  - Home 页面的 `container/item` 动画使用 `opacity: 0`
  - HeroCanvas 的 CSS `fadeUp` 动画使用 `opacity: 0`
  - `AnimatePresence` 配置不当
- **修复**：
  - 移除所有页面组件的 `initial={{ opacity: 0 }}` 动画
  - 移除 Home 页面的 `container/item` 动画的 opacity: 0
  - 移除 HeroCanvas 的 CSS `fadeUp` 动画
  - 移除 App.tsx 中的 `AnimatePresence`
- **文件**：`frontend/pages/*.tsx`, `frontend/index.css`, `frontend/App.tsx`

## OAuth 访客登录功能 (2026-05-30)

### 任务列表
| # | 任务 | 状态 | 文件 |
|---|------|------|------|
| 1 | OAuth 提供商抽象层 | ✅ 已完成 | `backend/oauth_providers.py` |
| 2 | OAuth 路由实现 | ✅ 已完成 | `backend/routers/oauth_router.py` |
| 3 | JWT 服务 | ✅ 已完成 | `backend/services/oauth_service.py` |
| 4 | 用户仓库 | ✅ 已完成 | `backend/repositories/users_repository.py` |
| 5 | 评论功能 | ✅ 已完成 | `backend/routers/comments_router.py` |
| 6 | 收藏功能 | ✅ 已完成 | `backend/routers/favorites_router.py` |
| 7 | 前端 AuthContext | ✅ 已完成 | `frontend/context/AuthContext.tsx` |
| 8 | OAuth 菜单组件 | ✅ 已完成 | `frontend/components/OAuthMenu.tsx` |
| 9 | 用户菜单组件 | ✅ 已完成 | `frontend/components/UserMenu.tsx` |
| 10 | 评论组件 | ✅ 已完成 | `frontend/components/CommentSection.tsx` |
| 11 | 收藏按钮组件 | ✅ 已完成 | `frontend/components/FavoriteButton.tsx` |
| 12 | 修复 Gitee 图标 | ✅ 已完成 | `frontend/components/OAuthMenu.tsx` |
| 13 | /me 端点返回 oauth_provider | ✅ 已完成 | `backend/routers/oauth_router.py` |
| 14 | GuestUser 类型添加 oauth_provider | ✅ 已完成 | `frontend/api/oauth.ts` |
| 15 | 显示登录方式 | ✅ 已完成 | `frontend/components/UserCard.tsx` |

### 测试结果
- 87 个后端测试全部通过
- GitHub/Gitee OAuth 重定向正常
- 评论和收藏 API 正常
- Gitee 图标显示正确
- 个人主页显示登录方式（GitHub/Gitee）

### Bug 修复记录

#### 1. Gitee 图标显示错误
- **问题**：登录弹窗中 Gitee 图标显示为错误的圆形图案
- **原因**：SVG path 数据错误，不是官方 Gitee 图标
- **修复**：从 Simple Icons 获取正确的 SVG path 数据
- **文件**：`frontend/components/OAuthMenu.tsx`

#### 2. 个人主页登录方式显示
- **问题**：个人主页显示通用的"登录"文本，而非具体的登录方式
- **原因**：
  - 后端 `/api/oauth/me` 未返回 `oauth_provider` 字段
  - 前端 `GuestUser` 类型缺少 `oauth_provider` 属性
  - `UserCard` 组件使用 `t.oauth.login` 而非 `t.profile.loginMethod()`
- **修复**：
  - 后端：在 `/me` 响应中添加 `oauth_provider` 字段
  - 前端类型：添加 `oauth_provider: string`
  - 前端组件：使用 `t.profile.loginMethod(user.oauth_provider)`
- **文件**：
  - `backend/routers/oauth_router.py`
  - `frontend/api/oauth.ts`
  - `frontend/components/UserCard.tsx`

## Bug 修复与功能优化 (2026-05-30)

### 1. 修复 Gitee 图标错误
- **问题**：登录弹窗中 Gitee 图标显示为错误的圆形图案
- **修复**：从 Simple Icons 获取正确的 SVG path 数据并替换
- **文件**：`frontend/components/OAuthMenu.tsx`

### 2. 个人主页登录方式显示
- **问题**：个人主页显示通用的"登录"文本，而非具体的登录方式
- **修复**：
  - 后端 `/api/oauth/me` 端点添加 `oauth_provider` 字段
  - 前端 `GuestUser` 类型添加 `oauth_provider` 属性
  - `UserCard` 组件使用 `t.profile.loginMethod(user.oauth_provider)`
- **文件**：
  - `backend/routers/oauth_router.py`
  - `frontend/api/oauth.ts`
  - `frontend/components/UserCard.tsx`

### 3. 本地开发数据库管理
- **问题**：本地开发时数据库为空，文章数据丢失
- **修复**：
  - 创建种子数据脚本 `backend/seed.py`
  - 从 git 历史恢复 10 篇文章和 4 个分类
  - 更新项目文档说明数据库分离策略
- **文件**：
  - `backend/seed.py` - 种子数据脚本
  - `CLAUDE.md` - 添加本地开发数据库说明
  - `README.md` / `README.zh.md` - 添加开发环境搭建说明

### 数据库分离策略
- **本地开发**：使用种子数据脚本 `python seed.py` 初始化测试数据
- **VPS 生产**：数据库独立管理，不通过 git 同步
- **数据恢复**：从 git 历史中提取旧数据库文件恢复数据

### 种子数据脚本功能
```bash
# 首次运行 - 插入测试数据
cd backend
python seed.py

# 重置数据库
rm data/blog.sqlite3
python seed.py
```

**种子数据内容**：
- 4 篇测试文章（React 19、FastAPI、Docker、Machine Learning）
- 4 个分类（Technology、Programming、DevOps、AI & ML）
- 幂等性检查：数据已存在时跳过插入

## 提交记录
1. `feat: add categories and search_logs tables to database schema`
2. `fix: improve database schema tests to verify actual code and column attributes`
3. `feat: add archive API endpoint with year/month grouping`
4. `feat: add categories API endpoints`
5. `feat: add search API endpoint with query logging`
6. `feat: add archive page with timeline layout`
7. `feat: add categories page with tag cloud layout`
8. `feat: add search page with smart search features`
9. `feat: add navigation links for new pages`
10. `test: add E2E tests for new pages`
11. `feat: finalize integration with responsive design, dark mode, and i18n fixes`
12. `fix: 返回按钮使用 history.back() 支持返回来源页面`
13. `refactor: 删除搜索页面，将导航栏搜索框改为可用的实时搜索`
14. `feat: 添加分类详情页面，支持按分类查看文章列表，添加点击反馈`
15. `fix: 修复代码审查问题 - 国际化、测试修复`
16. `fix: 修复种子脚本 post_count 和页面切换闪烁问题`
17. `fix: 修复页面切换闪烁问题 - 移除 initial opacity: 0 动画`
18. `fix: 修复首页动画导致的页面切换闪烁`
19. `fix: 修复页面切换闪烁 - 正确配置 AnimatePresence 包裹 Routes`
20. `fix: 移除 AnimatePresence 以彻底解决页面切换闪烁`
21. `fix: 移除 HeroCanvas CSS fadeUp 动画以解决首页切换闪烁`
22. `feat: implement OAuth guest login with GitHub and Gitee providers`
23. `feat: add comments and favorites modules`
24. `fix: exempt OAuth logout from CSRF validation`
25. `fix: correct Gitee SVG icon in OAuthMenu component`
26. `feat: add oauth_provider to /api/oauth/me response`
27. `feat: display login method on profile page`
28. `feat: add seed script for local development test data`
29. `docs: add local development database management documentation`
30. `fix: restore lost articles and categories data`
