"""
Seed data for local development.
Run this script to populate the database with test data.

Usage:
    cd backend
    python seed.py
"""

import sqlite3
import os
from datetime import datetime, timedelta

DB_FILE = 'data/blog.sqlite3'

def seed_database():
    """Insert test data into the database."""
    os.makedirs('data', exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Check if data already exists
    cursor.execute('SELECT COUNT(*) FROM posts')
    if cursor.fetchone()[0] > 0:
        print("Database already has data. Skipping seed.")
        conn.close()
        return

    print("Seeding database with test data...")

    # Insert categories
    categories = [
        ('Technology', 'technology', 'Tech articles and tutorials'),
        ('Programming', 'programming', 'Programming tips and tricks'),
        ('DevOps', 'devops', 'Development operations and deployment'),
        ('AI & ML', 'ai-ml', 'Artificial Intelligence and Machine Learning'),
    ]
    cursor.executemany(
        'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
        categories
    )

    # Insert test posts
    posts = [
        (
            'Getting Started with React 19',
            '''# Getting Started with React 19

React 19 introduces several new features and improvements. In this article, we'll explore the key changes and how to get started.

## New Features

1. **Server Components** - Build server-rendered components
2. **Actions** - Simplified form handling
3. **useOptimistic** - Optimistic updates made easy

## Installation

```bash
npm install react@19 react-dom@19
```

## Example

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

Happy coding!''',
            'Technology',
            None,
            'published',
            (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d %H:%M:%S'),
        ),
        (
            'Building a Blog with FastAPI',
            '''# Building a Blog with FastAPI

FastAPI is a modern, fast web framework for building APIs with Python. Let's build a simple blog backend.

## Why FastAPI?

- **Fast**: Very high performance
- **Easy**: Simple to learn and use
- **Robust**: Production-ready code

## Basic Setup

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}
```

## Database Integration

```python
import sqlite3

def get_db():
    conn = sqlite3.connect("blog.db")
    conn.row_factory = sqlite3.Row
    return conn
```

Start building your API today!''',
            'Programming',
            None,
            'published',
            (datetime.now() - timedelta(days=3)).strftime('%Y-%m-%d %H:%M:%S'),
        ),
        (
            'Docker for Beginners',
            '''# Docker for Beginners

Docker simplifies application deployment using containers. This guide covers the basics.

## What is Docker?

Docker is a platform for developing, shipping, and running applications in containers.

## Key Concepts

- **Image**: A template for containers
- **Container**: A running instance of an image
- **Dockerfile**: Instructions to build an image

## Basic Commands

```bash
# Pull an image
docker pull nginx

# Run a container
docker run -d -p 80:80 nginx

# List containers
docker ps
```

## Example Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["uvicorn", "main:app"]
```

Start containerizing your apps!''',
            'DevOps',
            None,
            'published',
            (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d %H:%M:%S'),
        ),
        (
            'Introduction to Machine Learning',
            '''# Introduction to Machine Learning

Machine Learning is a subset of AI that enables systems to learn from data.

## Types of ML

1. **Supervised Learning**: Learn from labeled data
2. **Unsupervised Learning**: Find patterns in unlabeled data
3. **Reinforcement Learning**: Learn from rewards

## Python Libraries

- **scikit-learn**: Traditional ML algorithms
- **TensorFlow**: Deep learning framework
- **PyTorch**: Dynamic neural networks

## Simple Example

```python
from sklearn.linear_model import LinearRegression

model = LinearRegression()
model.fit(X_train, y_train)
predictions = model.predict(X_test)
```

Explore the world of ML!''',
            'AI & ML',
            None,
            'published',
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        ),
    ]

    cursor.executemany(
        '''INSERT INTO posts (title, content, category, image_url, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?)''',
        posts
    )

    # Update category post counts
    cursor.execute('''
        UPDATE categories SET post_count = (
            SELECT COUNT(*) FROM posts WHERE posts.category = categories.name
        )
    ''')

    conn.commit()
    conn.close()
    print(f"Seeded {len(posts)} posts and {len(categories)} categories.")

if __name__ == '__main__':
    seed_database()
