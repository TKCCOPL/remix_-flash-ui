import { format } from 'date-fns';

export type PostStatus = 'published' | 'draft';

export interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'blog_posts';

const getInitialData = (): Post[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    const parsed = JSON.parse(data);
    // Migration: ensure all posts have a status
    return parsed.map((p: any) => ({
      ...p,
      status: p.status || 'published'
    }));
  }
  const defaultPosts: Post[] = [
    {
      id: '1',
      title: 'Building a Minimalist React Blog',
      category: 'Web Development',
      status: 'published',
      content: `Welcome to my new blog! This post is written in **Markdown**. 

## Why a custom blog?
I wanted a lightweight, fast, and beautiful space to share my thoughts. Using React and Tailwind CSS made it a breeze.

### Features
- Minimalist design
- Responsive layout
- Markdown support
- Fast loading

Here is some code:
\`\`\`javascript
const greet = () => console.log("Hello, world!");
greet();
\`\`\`

Thanks for reading!`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'The Art of Simplicity in UI Design',
      category: 'Design',
      status: 'published',
      content: `Simple UIs are often the hardest to design. 

Every element on the screen demands attention. By reducing the number of elements, we increase the importance of the ones that remain.

1. **Focus on Typography**: A good font hierarchy does 80% of the work.
2. **Embrace Whitespace**: Let your content breathe.
3. **Consistency**: Use a small set of colors, margins, and padding values.

> "Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away." - Antoine de Saint-Exupéry
`,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    }
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPosts));
  return defaultPosts;
};

export const blogStore = {
  getPosts: (): Post[] => {
    return getInitialData().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  
  getPost: (id: string): Post | undefined => {
    return getInitialData().find(p => p.id === id);
  },
  
  savePost: (post: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => {
    const posts = getInitialData();
    const now = new Date().toISOString();
    
    if (id) {
      const index = posts.findIndex(p => p.id === id);
      if (index !== -1) {
        posts[index] = { 
          ...posts[index], 
          ...post, 
          status: post.status || 'published',
          updatedAt: now 
        };
      }
    } else {
      const newPost: Post = {
        ...post,
        status: post.status || 'published',
        id: Math.random().toString(36).substr(2, 9),
        createdAt: now,
        updatedAt: now,
      };
      posts.push(newPost);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  },
  
  deletePost: (id: string) => {
    const posts = getInitialData().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }
};
