import sqlite3
import os
import time
from scrapling import Fetcher

DB_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'blog.sqlite3')

def fetch_trending():
    print("Fetching GitHub trending (weekly)...")
    try:
        page = Fetcher.get('https://github.com/trending?since=weekly')
        repos = [a.attrib.get('href').strip('/') for a in page.css('article.Box-row h2.h3 a')][:10]
        return repos
    except Exception as e:
        print(f"Failed to fetch trending: {e}")
        return []

def fetch_readme(repo):
    branches = ['main', 'master']
    for branch in branches:
        url = f"https://raw.githubusercontent.com/{repo}/{branch}/README.md"
        try:
            res = Fetcher.get(url)
            if res.status == 200:
                try:
                    return res.body.decode('utf-8')
                except UnicodeDecodeError:
                    return res.body.decode('utf-8', errors='ignore')
        except Exception:
            continue
    return None

def save_to_db(repo, content):
    if not content:
        content = f"# {repo}\n\nNo README found for this repository."
        
    title = f"[GitHub Trending] {repo}"
    category = "GitHub"
    image_url = f"https://opengraph.githubassets.com/1/{repo}"
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Ensure category exists in categories table
    cursor.execute("SELECT id FROM categories WHERE name = ?", (category,))
    if not cursor.fetchone():
        cursor.execute("INSERT INTO categories (name, slug, description, post_count) VALUES (?, ?, ?, ?)", 
                       (category, category.lower(), 'Auto-generated category for GitHub trending repositories.', 0))

    # Check if already exists
    cursor.execute("SELECT id FROM posts WHERE title = ?", (title,))
    if cursor.fetchone():
        print(f"Article for {repo} already exists, skipping.")
        conn.close()
        return

    cursor.execute('''
        INSERT INTO posts (title, content, category, image_url, status)
        VALUES (?, ?, ?, ?, ?)
    ''', (title, content, category, image_url, 'published'))
    
    conn.commit()
    conn.close()
    print(f"Saved {repo} to database.")

def main():
    repos = fetch_trending()
    if not repos:
        print("No trending repositories found.")
        return
        
    print(f"Found {len(repos)} repositories.")
    for repo in repos:
        print(f"Fetching README for {repo}...")
        content = fetch_readme(repo)
        save_to_db(repo, content)
        # Add a delay so we don't spam requests
        time.sleep(1)

if __name__ == "__main__":
    main()
