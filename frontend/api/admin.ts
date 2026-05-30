import { apiFetch } from './client';

export type AdminUser = {
  id: number;
  oauth_provider: string;
  oauth_id: string;
  username: string;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
  comment_count: number;
  favorite_count: number;
};

export type AdminUserDetail = {
  user: {
    id: number;
    oauth_provider: string;
    oauth_id: string;
    username: string;
    avatar_url: string | null;
    email: string | null;
    created_at: string;
  };
  stats: {
    comment_count: number;
    favorite_count: number;
    active_days: number;
  };
  recent_comments: Array<{
    id: number;
    post_id: number;
    post_title: string;
    content: string;
    created_at: string;
  }>;
};

export type AdminUsersResponse = {
  users: AdminUser[];
  total: number;
  skip: number;
  limit: number;
};

export type AdminDeleteUserResponse = {
  message: string;
  deleted_comments: number;
  deleted_favorites: number;
};

export const adminApi = {
  getUsers: (params?: {
    skip?: number;
    limit?: number;
    search?: string;
    provider?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.set('skip', String(params.skip));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.provider) searchParams.set('provider', params.provider);
    const qs = searchParams.toString();
    return apiFetch<AdminUsersResponse>(`/api/admin/users${qs ? `?${qs}` : ''}`);
  },

  getUserDetail: (userId: number) =>
    apiFetch<AdminUserDetail>(`/api/admin/users/${userId}`),

  deleteUser: (userId: number) =>
    apiFetch<AdminDeleteUserResponse>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    }),
};
