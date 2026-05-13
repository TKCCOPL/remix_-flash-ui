# Admin 后台接入 FastAPI + SQLite 与代码整理设计

## 1. 目标与范围

### 1.1 目标
- 将前端 Admin 管理后台（登录、文章管理）从本地 `localStorage` 迁移为调用 FastAPI 后端。
- 后端改为纯 API 服务（无模板渲染），数据持久化使用 SQLite。
- 在不做激进重构的前提下，整理前后端代码结构，降低耦合与重复逻辑。

### 1.2 范围内
- 前端：`Login/Admin/AdminEdit` 相关逻辑改为 API 驱动。
- 后端：删除模板页面路由与模板依赖，新增/调整鉴权 API 与文章 API。
- 代码结构：引入前端 API 层；后端按 router/service/repository 分层。

### 1.3 范围外
- 前台首页/详情/简介页面不切换到后端数据源（保持现状）。
- 不进行大规模目录迁移与 UI 重设计。

## 2. 现状问题

- 前端 Admin 目前使用 `localStorage`（`admin_token` + `blog_posts`）与后端数据完全分离。
- 后端同时承载 API 与 Jinja 页面渲染，职责混杂。
- 前端页面中存在“请求 + 业务 + 页面状态”混写，复用性较差。
- 登录态实现不一致（前端 localStorage、后端 cookie）导致维护成本高。

## 3. 目标架构

## 3.1 前端（React）
- 保留页面结构，仅重构数据访问路径：
  - `src/api/client.ts`：统一请求函数、错误解析、`credentials: 'include'`
  - `src/api/auth.ts`：`login/logout/me`
  - `src/api/posts.ts`：文章 CRUD
- 页面职责：
  - `Login.tsx`：提交登录与错误展示
  - `Admin.tsx`：列表/筛选/分页/删除
  - `AdminEdit.tsx`：文章加载、编辑、保存

## 3.2 后端（FastAPI）
- 仅保留 API，不再返回模板页面。
- 分层职责：
  - `routers/`：路由与 HTTP 协议细节（参数、状态码、响应模型）
  - `services/`：业务规则（鉴权、校验、错误转换）
  - `repositories/`：SQLite CRUD
  - `schemas/`：Pydantic 模型（可由现有 `models.py` 演进）

## 4. API 设计

## 4.1 鉴权 API（Cookie 会话）
- `POST /api/auth/login`：账号密码登录，成功后设置 HttpOnly Cookie
- `POST /api/auth/logout`：清理会话 Cookie
- `GET /api/auth/me`：返回当前登录态与基础用户信息；未登录返回 401

## 4.2 文章 API
- `GET /api/posts?skip=&limit=`：分页列表
- `GET /api/posts/{id}`：单篇详情
- `POST /api/posts`：新建文章
- `PUT /api/posts/{id}`：更新文章
- `DELETE /api/posts/{id}`：删除文章

## 4.3 状态码约定
- `200/201`：成功
- `401`：未登录/会话无效
- `404`：资源不存在
- `422`：请求参数非法
- `500`：未预期错误（保留统一错误信息，不暴露内部细节）

## 5. 关键数据流

## 5.1 登录流
1. `Login.tsx` 调 `authApi.login(username, password)`
2. 后端鉴权成功后写入 HttpOnly Cookie
3. 前端跳转 `/admin`
4. 后续请求通过 Cookie 自动携带会话

## 5.2 Admin 页面加载流
1. `Admin/AdminEdit` 挂载时先调 `authApi.me()`
2. 若 401，统一跳回 `/login`
3. 鉴权通过后加载文章列表或文章详情

## 5.3 编辑与删除流
- 编辑：`GET /api/posts/{id}` -> 表单编辑 -> `PUT /api/posts/{id}`
- 新建：表单提交 -> `POST /api/posts`
- 删除：确认后 `DELETE /api/posts/{id}` -> 局部刷新列表

## 6. 代码整理策略（最小但清晰）

## 6.1 后端整理
- 删除模板渲染相关路由：`/`、`/post/{id}`、`/admin`、`/admin/edit`、`/login` 页面路由。
- 清理模板依赖资源：`blog/templates/*`、仅模板使用的静态编辑脚本（如 `blog/static/editor.js`）。
- 保留并整理纯 API 入口与模块边界。

## 6.2 前端整理
- 移除 `admin_token` 本地鉴权分支。
- 将页面内直接 `fetch`/存储操作迁移至 `src/api/*`。
- `src/store.ts` 对 Admin 数据职责降级或拆分，避免与后端双写冲突。

## 6.3 命名与边界约束
- 页面组件不直接拼接 URL 与解析错误文案。
- 所有网络请求经过 `client.ts`。
- Repository 不包含 HTTP 语义，Router 不包含 SQL 语句。

## 7. 迁移步骤

1. 新建后端 API 路由与会话接口（保留现有文章 API 能力并统一到 `/api` 前缀）。
2. 前端引入 API 层并替换 Login/Admin/AdminEdit 调用链。
3. 移除后端模板路由与模板资源。
4. 清理前端旧鉴权与多余数据通道。
5. 回归验证（登录、列表、创建、编辑、删除、退出）。

## 8. 验收标准

- Admin 登录成功后可进入管理页，未登录访问 Admin 会被拦截到登录页。
- Admin 的文章 CRUD 全部落在后端 SQLite，刷新后数据保持一致。
- 后端仅对外提供 API，不再渲染模板页面。
- 前台页面保持当前行为不变（不接后端）。
- 代码结构中请求、业务、数据访问边界清晰，重复逻辑显著减少。

## 9. 风险与缓解

- 风险：前端仍保留本地文章存储逻辑导致后台数据源混淆。  
  缓解：Admin 路径强制只走 API，前台继续走旧逻辑但标注边界。

- 风险：会话失效时页面状态不一致。  
  缓解：统一在 API client 处理 401，并在页面层做统一跳转。

- 风险：删除模板后误伤静态资源。  
  缓解：以“仅模板依赖文件”为删除条件，删除前做引用检查。
