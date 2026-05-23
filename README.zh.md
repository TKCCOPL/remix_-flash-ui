# XiaoC 博客

基于 **React 19** + **FastAPI** + **SQLite** 的全栈博客系统，注重排版、留白和流畅的写作体验。

## 功能特性

- **极简设计**: 专注于内容可读性，自定义设计系统
- **Markdown 支持**: 代码高亮、表格、引用等
- **响应式布局**: 适配超宽屏到移动设备
- **管理后台**: 文章管理（创建、编辑、删除）
- **国际化**: 中英文切换，深色/浅色主题
- **平滑动画**: 基于 Framer Motion 的路由过渡

## 技术栈

| 前端 | 后端 |
|------|------|
| React 19 | FastAPI |
| Vite | SQLite |
| Tailwind CSS 4.0 | Pydantic |
| React Router 7 | |

## 项目结构

```
├── frontend/           # React 前端
│   ├── api/            # API 客户端 (认证、文章)
│   ├── components/     # 可复用组件
│   ├── context/        # 主题/语言上下文
│   └── pages/          # 页面组件
├── backend/            # FastAPI 后端
│   ├── routers/        # API 路由
│   ├── services/       # 业务逻辑
│   ├── repositories/   # 数据库访问
│   └── data/           # SQLite 数据库
└── index.html          # Vite 入口
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
| GET | `/api/auth/me` | 获取当前用户 |
| GET | `/api/posts/` | 获取文章列表 |
| GET | `/api/posts/:id` | 获取文章详情 |
| POST | `/api/posts/` | 创建文章 |
| PUT | `/api/posts/:id` | 更新文章 |
| DELETE | `/api/posts/:id` | 删除文章 |

## 管理后台

- **地址**: `/login`
- **用户名**: `admin`
- **密码**: `123456`

---

See [README.md](README.md) for English version.
