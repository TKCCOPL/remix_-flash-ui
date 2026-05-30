import { apiFetch } from './client';

export type Comment = {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  status: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
};

export const commentsApi = {
  list: (postId: number | string, skip = 0, limit = 20) =>
    apiFetch<Comment[]>(`/api/posts/${postId}/comments?skip=${skip}&limit=${limit}`),
  create: (postId: number | string, content: string) =>
    apiFetch<Comment>(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  remove: (commentId: number) =>
    apiFetch<void>(`/api/posts/comments/${commentId}`, { method: 'DELETE' }),
};
