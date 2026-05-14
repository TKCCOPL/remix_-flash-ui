# Trending News Fetcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从 GitHub Trending 和 Hacker News 抓取每日热门新闻，通过博客 API 自动创建 10 篇 Markdown 文章。

**Architecture:** 单个 Python 脚本 `blog/scripts/fetch_trending.py`——用 `httpx` 调用 Firecrawl API 抓取两个页面，解析 Markdown 提取标题/链接/简介，登录博客 API 获取 session cookie，逐条 POST 创建文章。

**Tech Stack:** Python 3, httpx（已在 requirements.txt）, Firecrawl API, 博客 FastAPI 后端

---

## File Structure

- Create: `blog/scripts/fetch_trending.py` — 抓取 + 解析 + 创建文章
- 无其他文件变更

---

### Task: 实现 fetch_trending.py 完整脚本

**Files:**
- Create: `blog/scripts/fetch_trending.py`

- [ ] **Step 1: 创建脚本骨架——抓取 GitHub Trending**

```python
"""Fetch trending news from GitHub Trending and Hacker News, write to blog."""

import os
import re
import sys
import httpx

FIRECRAWL_API_KEY = os.environ.get("FIRECRAWL_API_KEY", "")
BLOG_BASE = os.environ.get("BLOG_API_BASE", "http://127.0.0.1:8000")
USERNAME = os.environ.get("BLOG_USERNAME", "admin")
PASSWORD = os.environ.get("BLOG_PASSWORD", "123456")

FIRECRAWL_URL = "https://api.firecrawl.dev/v1/scrape"


def scrape_page(url: str) -> str:
    """Scrape a URL with Firecrawl, return markdown content."""
    resp = httpx.post(
        FIRECRAWL_URL,
        json={"url": url, "formats": ["markdown"]},
        headers={"Authorization": f"Bearer {FIRECRAWL_API_KEY}"},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if not data.get("success"):
        raise RuntimeError(f"Firecrawl failed: {data}")
    return data["data"]["markdown"]


def parse_github_trending(markdown: str) -> list[dict]:
    """Parse GitHub Trending markdown, return list of {title, content, category}."""
    # GitHub Trending markdown has repo names as headings like "## owner / repo"
    repos = re.findall(
        r"##\s+(\S+)\s*/\s*(\S+)[\s\S]*?"
        r"(?=##\s+\S+\s*/\s*\S+|$)",
        markdown,
    )
    results = []
    for owner, name in repos[:5]:
        full_name = f"{owner}/{name}"
        url = f"https://github.com/{full_name}"
        content = f"## [{full_name}]({url})\n\n"
        content += f"今日 GitHub Trending 热门仓库。\n\n"
        content += f"> 来源: [GitHub Trending](https://github.com/trending)\n"
        results.append({
            "title": full_name,
            "content": content,
            "category": "GitHub Trending",
        })
    return results


def parse_hn_top(markdown: str) -> list[dict]:
    """Parse Hacker News markdown, return list of {title, content, category}."""
    # HN markdown lists stories as numbered items with links
    lines = markdown.split("\n")
    results = []
    story_pattern = re.compile(r'^\d+\.\s*\[(.+?)\]\((https?://[^)]+)\)')
    for line in lines:
        m = story_pattern.match(line.strip())
        if m:
            title = m.group(1).strip()
            url = m.group(2).strip()
            content = f"## [{title}]({url})\n\n"
            content += f"Hacker News 今日热门讨论。\n\n"
            content += f"> 来源: [Hacker News](https://news.ycombinator.com/)\n"
            results.append({
                "title": title,
                "content": content,
                "category": "Hacker News",
            })
        if len(results) >= 5:
            break
    return results
```

- [ ] **Step 2: 验证抓取+解析——本地测试**

Run: 确保 `FIRECRAWL_API_KEY` 已设置后执行：
```bash
cd blog && python -c "
import sys; sys.path.insert(0, 'scripts')
from fetch_trending import scrape_page, parse_github_trending, parse_hn_top

github_md = scrape_page('https://github.com/trending')
repos = parse_github_trending(github_md)
print(f'GitHub: {len(repos)} repos')
print(repos[0] if repos else 'NONE')

hn_md = scrape_page('https://news.ycombinator.com/')
stories = parse_hn_top(hn_md)
print(f'HN: {len(stories)} stories')
print(stories[0] if stories else 'NONE')
"
```
Expected: 输出 GitHub 仓库数和 HN 文章数（各 5 条或接近 5 条）。

- [ ] **Step 3: 添加博客 API 登录 + 创建文章逻辑**

```python
def login() -> httpx.Client:
    """Login to blog API, return an authenticated httpx.Client with cookies."""
    client = httpx.Client()
    resp = client.post(
        f"{BLOG_BASE}/api/auth/login",
        data={"username": USERNAME, "password": PASSWORD},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    if not data.get("ok"):
        raise RuntimeError(f"Login failed: {data}")
    return client


def create_post(client: httpx.Client, item: dict) -> dict:
    """Create a blog post via API, return the created post."""
    resp = client.post(
        f"{BLOG_BASE}/api/posts",
        json={
            "title": item["title"],
            "content": item["content"],
            "category": item.get("category", ""),
        },
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def main():
    if not FIRECRAWL_API_KEY:
        print("ERROR: FIRECRAWL_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    print("Scraping GitHub Trending...")
    github_md = scrape_page("https://github.com/trending")
    github_repos = parse_github_trending(github_md)
    print(f"  Found {len(github_repos)} repos")

    print("Scraping Hacker News...")
    hn_md = scrape_page("https://news.ycombinator.com/")
    hn_stories = parse_hn_top(hn_md)
    print(f"  Found {len(hn_stories)} stories")

    items = github_repos + hn_stories
    if len(items) < 3:
        print(f"ERROR: Too few items ({len(items)}), aborting", file=sys.stderr)
        sys.exit(1)

    print(f"Logging in to {BLOG_BASE}...")
    client = login()

    created = 0
    for item in items:
        try:
            post = create_post(client, item)
            print(f"  Created: [{item['category']}] {item['title']} (id={post['id']})")
            created += 1
        except Exception as e:
            print(f"  FAILED: {item['title']} — {e}", file=sys.stderr)

    client.close()
    print(f"Done: {created}/{len(items)} posts created")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: 完整运行验证**

确保后端已启动：
```bash
cd blog && uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

另开终端：
```bash
set FIRECRAWL_API_KEY=你的key
cd blog && python scripts/fetch_trending.py
```
Expected: 输出 10 条 `Created:` 日志，`Done: 10/10 posts created`。

- [ ] **Step 5: 前端验收**

- 打开 `http://localhost:3000/` 确认首页出现 10 篇新文章
- 打开 `http://localhost:3000/admin` 确认后台可见全部文章
- 点入任意文章确认 Markdown 格式渲染正常

- [ ] **Step 6: 提交**

```bash
git add blog/scripts/fetch_trending.py
git commit -m "feat(scripts): add trending news fetcher for GitHub and HN

Creates 10 blog posts from GitHub Trending and Hacker News front page
via Firecrawl API + blog API.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

## Manual Acceptance Checklist

- [ ] `FIRECRAWL_API_KEY` 未设置时脚本报错退出
- [ ] GitHub Trending 抓取 5 条仓库并写入
- [ ] Hacker News 抓取 5 条话题并写入
- [ ] 文章分类正确（"GitHub Trending" / "Hacker News"）
- [ ] 首页可见新文章，Markdown 正常渲染
- [ ] Admin 后台可管理新文章
