import { apiFetch } from './client';

export const favoritesApi = {
  toggle: (postId: number | string) =>
    apiFetch<{ favorited: boolean }>(`/api/posts/${postId}/favorite`, { method: 'POST' }),
  check: (postId: number | string) =>
    apiFetch<{ favorited: boolean }>(`/api/posts/${postId}/is-favorited`),
  list: (skip = 0, limit = 20) =>
    apiFetch<{ favorites: any[] }>(`/api/users/me/favorites?skip=${skip}&limit=${limit}`),
};
