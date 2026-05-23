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

## 当前进度
- 正在执行：无
- 已完成：11/11

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
