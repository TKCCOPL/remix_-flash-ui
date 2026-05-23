import { apiFetch } from './client';

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  post_count: number;
};

export type Post = {
  id: number;
  title: string;
  content: string;
  category: string | null;
  image_url: string | null;
  created_at: string;
};

export type CategoryPostsResponse = {
  category: Category;
  posts: Post[];
};

export const categoriesApi = {
  list: () => apiFetch<Category[]>('/api/categories'),
  getPosts: (slug: string) => apiFetch<CategoryPostsResponse>(`/api/categories/${slug}/posts`),
};
