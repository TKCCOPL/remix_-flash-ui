import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), '../../backend/data/blog.sqlite3')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.executescript('''
    INSERT OR IGNORE INTO categories (name, slug, description, post_count)
    VALUES ('React', 'react', 'React 相关文章', 2);

    INSERT OR IGNORE INTO categories (name, slug, description, post_count)
    VALUES ('Python', 'python', 'Python 相关文章', 1);

    INSERT INTO posts (title, content, category, image_url, created_at, updated_at)
    VALUES ('React Hooks 入门指南', 'React Hooks 是 React 16.8 新增的特性，让我们可以在函数组件中使用 state 和其他 React 特性。', 'React', 'https://example.com/react.png', '2026-05-20 10:00:00', '2026-05-20 10:00:00');

    INSERT INTO posts (title, content, category, image_url, created_at, updated_at)
    VALUES ('React 组件最佳实践', '在 React 开发中，遵循一些最佳实践可以让代码更加清晰和可维护。本文将介绍一些常用的 React 组件设计模式。', 'React', 'https://example.com/react2.png', '2026-05-22 14:30:00', '2026-05-22 14:30:00');

    INSERT INTO posts (title, content, category, image_url, created_at, updated_at)
    VALUES ('Python 数据分析入门', 'Python 是数据分析领域最流行的语言之一，本文将介绍如何使用 Python 进行基本的数据分析。', 'Python', 'https://example.com/python.png', '2026-05-23 09:00:00', '2026-05-23 09:00:00');
''')

conn.commit()
conn.close()
print('Test data seeded successfully.')
