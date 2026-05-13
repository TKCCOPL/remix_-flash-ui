# 项目介绍

本项目由前端 React 应用与后端 FastAPI API 组成：

- 前端（`src/`）负责展示页面与 Admin 管理后台。
- 后端（`blog/`）提供纯 API（不再渲染服务端模板），数据持久化使用 SQLite。

## 项目结构

前端（`src/`）：

- `pages/`：`Home`、`PostDetail`、`Login`、`Admin`、`AdminEdit`
- `api/client.ts`：统一请求与错误处理
- `api/auth.ts`：登录态相关接口（`login/logout/me`）
- `api/posts.ts`：文章 CRUD API 封装
- `store.ts`：历史本地存储实现（当前页面读取已迁移至 API）

后端（`blog/`）：

- `main.py`：FastAPI 入口，挂载 `/api/auth` 与 `/api/posts`
- `routers/`：HTTP 路由层
- `services/`：业务逻辑层
- `repositories/`：SQLite 访问层
- `schemas.py`：Pydantic 模型
- `database.py`：数据库初始化与连接
- `tests/test_admin_api_workflow.py`：Admin API 工作流测试
- `data/blog.sqlite3`：SQLite 数据文件（首次运行自动创建）

## 环境要求

- Node.js 18+
- Python 3.8+ 与 pip

## 安装依赖

前端：

```bash
npm install
```

后端：

```bash
pip install -r blog/requirements.txt
```

## 开发启动

前端（项目根目录）：

```bash
npm run dev
```

后端（`blog/` 目录）：

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 访问地址

- 前端开发地址：http://localhost:3000/
- 后端 API 地址：http://localhost:8000/
- OpenAPI 文档：http://localhost:8000/docs

## 管理后台账号

- 用户名：admin
- 密码：123456

## 备注

- Home/PostDetail/Admin 页面均通过 API 读取后端文章数据。
- Admin 页面通过 Cookie 会话进行写操作鉴权。
- Admin 编辑页支持配置/清空文章封面图 URL，首页与详情页会按文章数据展示。
- 若 PowerShell 阻止 npm 脚本，可使用 `cmd /c npm install`、`cmd /c npm run build`。
