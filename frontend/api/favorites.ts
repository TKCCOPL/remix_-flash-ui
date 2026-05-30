import { apiFetch } from './client';

export type ApiFavorite = {
  id: number;
  post_id: number;
  user_id: number;
  created_at: string;
  title: string;
  category: string;
  image_url: string | null;
};

export const favoritesApi = {
  toggle: (postId: number | string) =>
    apiFetch<{ favorited: boolean }>(`/api/posts/${postId}/favorite`, { method: 'POST' }),
  check: (postId: number | string) =>
    apiFetch<{ favorited: boolean }>(`/api/posts/${postId}/is-favorited`),
  list: (skip = 0, limit = 20) =>
    apiFetch<ApiFavorite[]>(`/api/users/me/favorites?skip=${skip}&limit=${limit}`),
};
