import sys
from scrapling import Fetcher

def get_trending():
    page = Fetcher.fetch("https://github.com/trending?since=weekly")
    # GitHub trending has article.Box-row
    repo_links = page.css("article.Box-row h2.h3 a")
    
    top_10 = []
    for link in repo_links[:10]:
        repo_name = link.attrib.get('href', '').strip('/')
        top_10.append(repo_name)
    
    print(top_10)

if __name__ == "__main__":
    get_trending()
