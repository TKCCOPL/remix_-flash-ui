# Trending News Fetcher Design

## Problem

需要自动化方式从网络抓取每日科技热门新闻，并写入博客系统。手动粘贴内容效率低下，应通过脚本自动完成抓取、解析、创建文章的全流程。

## Scope

In scope:
- 从 GitHub Trending 抓取 5 条热门仓库
- 从 Hacker News 首页抓取 5 条热门话题
- 生成 Markdown 格式文章内容
- 通过 API 认证后逐条创建博客文章
- 单次脚本运行，非定时任务

Out of scope:
- Twitter/X 爬取（反爬不可行）
- 定时/后台运行
- 重复文章去重检测
- 前端 UI 变动

## Architecture

```
blog/scripts/fetch_trending.py  (新增)
  ├── Firecrawl CLI 或 SDK 抓取 GitHub Trending + HN
  ├── 解析 HTML/Markdown 提取标题、简介、链接
  ├── httpx 调用 POST /api/auth/login (admin/123456) 获取 cookie
  └── 逐条 POST /api/posts 创建文章
```

### 数据流

1. `firecrawl scrape` 获取 GitHub Trending 页面 Markdown
2. 正则/文本解析提取 5 个仓库名称、描述、语言、星数
3. `firecrawl scrape` 获取 Hacker News 首页 Markdown
4. 解析提取前 5 条标题、链接
5. 组装为 Markdown 格式内容
6. 用 `httpx` 登录 API，获取 session cookie
7. 逐条 `POST /api/posts`（category: "GitHub Trending" / "Hacker News"）

### 文章格式示例

```markdown
## [owner/repo](https://github.com/owner/repo)

**Language:** Python | **Stars:** 12,345

An awesome description of what this project does.
```

### 文件变更

- Create: `blog/scripts/fetch_trending.py`
- 依赖：`firecrawl` CLI（`npm install -g firecrawl`）或 `httpx`（已在 blog/requirements.txt）

### 运行

```bash
cd blog && python scripts/fetch_trending.py
```

## 错误处理

- Firecrawl 抓取失败：输出错误信息，终止
- 解析不到足够条目：有多少写多少（不低于 3 条）
- API 登录失败：输出 HTTP 状态码和响应，终止
- 单篇文章创建失败：记录错误，继续创建剩余文章

## Verification

- 运行脚本后检查 `http://localhost:3000/` 首页是否出现新文章
- 检查 Admin 后台 `http://localhost:3000/admin` 文章列表
- 查看 `blog/data/blog.sqlite3` 中 posts 表确认数据写入
