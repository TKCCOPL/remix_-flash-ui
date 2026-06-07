# XiaoC 博客

基于 **React 19** + **FastAPI** + **SQLite** 的全栈博客系统，注重排版、留白和流畅的写作体验。

## 功能特性

- **极简设计**: 专注于内容可读性，自定义设计系统
- **Markdown 支持**: 支持代码高亮、表格、嵌套 HTML 等，内置防 XSS 注入 (`rehype-sanitize`) 引擎
- **自动化聚合**: 集成 GitHub Trending 自动化周榜爬虫 (`Scrapling` & `APScheduler`)，自动同步至数据库并生成原生文章结构
- **响应式布局**: 适配超宽屏到移动设备，具备基于 DOM 实体验证的智能目录树与防抖 (`throttle`) 平滑滚动辅助
- **管理后台**: 安全的文章发布与管理，空分类自动隐藏
- **OAuth 访客登录**: 支持 GitHub 和 Gitee 第三方登录，访客可评论和收藏文章
- **评论与收藏**: 登录用户可对文章进行评论和收藏操作
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

## 开发环境搭建

### 前端

```bash
npm install
npm run dev          # 启动开发服务器 http://localhost:3000
```

### 后端

```bash
cd backend
pip install -r requirements.txt

# 首次运行 - 初始化测试数据
python seed.py

# 启动开发服务器
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

### 数据库管理

SQLite 数据库文件 (`backend/data/blog.sqlite3`) 已加入 `.gitignore`，生产数据与本地测试数据分离。

| 环境 | 数据库 | 用途 |
|------|--------|------|
| 本地开发 | `backend/data/blog.sqlite3` | 测试数据（可重置） |
| VPS 生产 | Docker 容器内数据库 | 真实用户数据 |

```bash
# 初始化本地测试数据
cd backend
python seed.py

# 重置本地数据库
rm data/blog.sqlite3
python seed.py
```

> **注意**: 生产环境数据库在 VPS 上独立管理，不要通过 git 同步数据库文件。

## API 端点

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 管理员登录 |
| POST | `/api/auth/logout` | 管理员登出 |
| GET | `/api/auth/me` | 获取当前管理员用户 |

### 文章
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/posts/` | 获取文章列表 |
| GET | `/api/posts/:id` | 获取文章详情 |
| POST | `/api/posts/` | 创建文章 |
| PUT | `/api/posts/:id` | 更新文章 |
| DELETE | `/api/posts/:id` | 删除文章 |

### OAuth 访客登录
| 方法 | 路径 | 说明 |
|------|------|-------------|
| GET | `/api/oauth/:provider` | 获取 OAuth 授权 URL |
| GET | `/api/oauth/:provider/callback` | OAuth 回调处理 |
| GET | `/api/oauth/me` | 获取当前访客用户 |
| POST | `/api/oauth/logout` | 访客登出 |

### 评论
| 方法 | 路径 | 说明 |
|------|------|-------------|
| GET | `/api/comments/post/:post_id` | 获取文章评论 |
| POST | `/api/comments/` | 创建评论 |
| DELETE | `/api/comments/:id` | 删除评论 |

### 收藏
| 方法 | 路径 | 说明 |
|------|------|-------------|
| POST | `/api/favorites/toggle` | 切换收藏状态 |
| GET | `/api/favorites/check/:post_id` | 检查是否已收藏 |
| GET | `/api/favorites/list` | 获取用户收藏列表 |

## 部署

### 快速开始 (Docker)

```bash
# 构建并启动
docker compose up -d --build

# 查看状态
docker compose ps

# 健康检查
curl http://localhost:8080/api/health
```

### 环境配置

| 文件 | 用途 |
|------|------|
| `.env.example` | 生产环境配置模板 |
| `.env.local.example` | 本地开发配置模板 |
| `.env` | 生产环境配置（从 `.env.example` 创建） |
| `.env.local` | 本地开发配置（从 `.env.local.example` 创建） |

### 端口分配

| 环境 | 前端 | 后端 |
|------|------|------|
| 本地开发 | 3000 | 8001 |
| 生产环境 | 8080 | 8000 (内部) |

### 数据库备份

```bash
# 手动备份
./scripts/backup_db.sh

# 自动备份（添加到 crontab）
0 3 * * * /path/to/scripts/backup_db.sh
```

## 管理后台

- **地址**: `/admin`
- **用户名**: 在 `.env` 中设置 (`ADMIN_USER`)
- **密码**: 在 `.env` 中设置 (`ADMIN_PASS`)

---

See [README.md](README.md) for English version.
