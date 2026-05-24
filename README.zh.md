# XiaoC 博客

基于 **React 19** + **FastAPI** + **SQLite** 的全栈博客系统，注重排版、留白和流畅的写作体验。

## 功能特性

- **极简设计**: 专注于内容可读性，自定义设计系统
- **Markdown 支持**: 支持代码高亮、表格、嵌套 HTML 等，内置防 XSS 注入 (`rehype-sanitize`) 引擎
- **自动化聚合**: 集成 GitHub Trending 自动化周榜爬虫 (`Scrapling` & `APScheduler`)，自动同步至数据库并生成原生文章结构
- **响应式布局**: 适配超宽屏到移动设备，具备基于 DOM 实体验证的智能目录树与防抖 (`throttle`) 平滑滚动辅助
- **管理后台**: 安全的文章发布与管理，空分类自动隐藏
- **国际化**: 中英文一键切换，系统级深色/浅色自适应主题
- **平滑动画**: 基于 Framer Motion 的路由与组件过渡动画

## 技术栈

| 前端 | 后端 |
|------|------|
| React 19 | FastAPI |
| Vite | SQLite |
| Tailwind CSS 4.0 | Pydantic |
| React Router 7 | APScheduler (定时任务) |
| rehype / remark | Scrapling (自动化爬虫) |

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
