import { apiFetch } from './client';

export type Category = {
  name: string;
  slug: string;
  post_count: number;
};

export const categoriesApi = {
  list: () => apiFetch<Category[]>('/api/categories'),
};
