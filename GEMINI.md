# 极简数字花园 (Minimalist Digital Garden) - 项目指令

本项目是一个全栈博客系统，采用 React 19 前端和 FastAPI 后端。它优先考虑极简主义审美、高质量排版和无缝的写作体验。

## 项目概览

- **前端 (`src/`)**: 基于 React 19、Vite 和 Tailwind CSS 4.0 构建。包含公开博客视图和安全的管理后台。
- **后端 (`blog/`)**: 使用 FastAPI 构建的 Python API。处理身份验证（基于 Cookie 的会话）和文章的 CRUD 操作。
- **数据库**: SQLite，存储在 `blog/data/blog.sqlite3`。

## 架构与规范

### 前端 (`src/`)
- **路由**: React Router 7。
- **样式**: 使用 Tailwind CSS 4.0 进行原子化样式设计，使用 Framer Motion 处理动画。
- **API 通信**: 所有请求应通过 `src/api/client.ts` 使用 `apiFetch`。它负责基础 URL 解析、请求头处理（默认为 JSON）和错误管理。
- **组件**: 可复用 UI 组件位于 `src/components/`，页面组件位于 `src/pages/`。
- **状态管理**: `src/store.ts` 包含旧版的本地存储逻辑；现代页面通过 `src/api/` 使用 FastAPI 后端。

### 后端 (`blog/`)
- **分层模式**:
  - `routers/`: HTTP 端点和请求处理。
  - `services/`: 业务逻辑。
  - `repositories/`: 使用 `sqlite3` 直接进行数据库访问。
- **验证**: `schemas.py` 中的 Pydantic 模型用于请求/响应验证。
- **数据库**: 在 `database.py` 中初始化。使用原生 SQL 和 `sqlite3.Row` 以实现类字典访问。

## 构建与运行

### 前置条件
- Node.js 18+
- Python 3.8+

### 安装设置
1. **前端**:
   ```bash
   npm install
   ```
2. **后端**:
   ```bash
   pip install -r blog/requirements.txt
   ```

### 开发环境
1. **前端** (在根目录运行):
   ```bash
   npm run dev
   ```
   运行在 `http://localhost:3000`。
2. **后端** (在 `blog/` 目录运行):
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   API 运行在 `http://localhost:8000`。Swagger 文档位于 `/docs`。

### 测试
- **前端**: `npm run test` (Vitest)。
- **后端**: `pytest` (例如：`pytest blog/tests/test_admin_api_workflow.py`)。

## 管理员访问
- **路径**: `/login`
- **用户名**: `admin`
- **密码**: `123456`

## 开发准则
- **API 优先**: 所有数据驱动的功能应优先考虑后端 API 集成。
- **类型安全**: 前端保持严格的 TypeScript 类型定义，后端使用 Pydantic 模型。
- **一致性**: 后端遵循既定的 Repository/Service 模式，前端遵循组件化结构。
- **设计**: 严格遵守 `src/index.css` 中定义的极简、注重留白的设计语言。
