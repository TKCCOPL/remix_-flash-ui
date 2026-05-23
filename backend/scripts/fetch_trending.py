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
