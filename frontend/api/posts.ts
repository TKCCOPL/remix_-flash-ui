import { apiFetch } from './client';

export type ApiPost = {
  id: number;
  title: string;
  content: string;
  category?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
};

type PostCreatePayload = {
  title: string;
  content: string;
  category?: string;
  image_url?: string;
};

type PostUpdatePayload = {
  title?: string;
  content?: string;
  category?: string;
  image_url?: string;
};

export const postsApi = {
  list: (skip = 0, limit = 100) => apiFetch<ApiPost[]>(`/api/posts?skip=${skip}&limit=${limit}`),
  get: (id: string | number) => apiFetch<ApiPost>(`/api/posts/${id}`),
  create: (payload: PostCreatePayload) =>
    apiFetch<ApiPost>('/api/posts', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string | number, payload: PostUpdatePayload) =>
    apiFetch<ApiPost>(`/api/posts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id: string | number) => apiFetch<{ detail: string }>(`/api/posts/${id}`, { method: 'DELETE' }),
};
