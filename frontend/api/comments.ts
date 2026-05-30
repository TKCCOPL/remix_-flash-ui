import { apiFetch } from './client';

export type ApiComment = {
  id: number;
  post_id: number;
  content: string;
  created_at: string;
  post_title: string;
};

export const commentsApi = {
  list: (skip = 0, limit = 20) =>
    apiFetch<ApiComment[]>(`/api/users/me/comments?skip=${skip}&limit=${limit}`),
};
