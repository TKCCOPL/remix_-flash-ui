import { apiFetch } from './client';

// Original comment type for blog post comments
export type Comment = {
  id: number;
  post_id: number;
  user_id: number;
  username: string;
  avatar_url: string | null;
  oauth_provider: string | null;
  content: string;
  parent_id: number | null;
  replies: Comment[];
  created_at: string;
};

// Type for user's comment history (profile page)
export type ApiComment = {
  id: number;
  post_id: number;
  content: string;
  created_at: string;
  post_title: string;
};

export const commentsApi = {
  // Blog post comments
  list: (postId: number | string, skip = 0, limit = 20) =>
    apiFetch<Comment[]>(`/api/posts/${postId}/comments?skip=${skip}&limit=${limit}`),
  create: (postId: number | string, content: string, parentId?: number) =>
    apiFetch<Comment>(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parent_id: parentId }),
    }),
  remove: (commentId: number | string) =>
    apiFetch<void>(`/api/posts/comments/${commentId}`, { method: 'DELETE' }),

  // User's comment history (for profile page)
  listByUser: (skip = 0, limit = 20) =>
    apiFetch<ApiComment[]>(`/api/users/me/comments?skip=${skip}&limit=${limit}`),
};
