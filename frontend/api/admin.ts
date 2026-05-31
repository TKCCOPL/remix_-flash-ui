import { apiFetch } from './client';

// Comment Management Types
export type AdminComment = {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  username: string;
  avatar_url: string | null;
  oauth_provider: string;
  post_title: string;
};

export type AdminCommentsResponse = {
  comments: AdminComment[];
  total: number;
  skip: number;
  limit: number;
};

// User Management Types
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

// Comment Management API
export const adminCommentsApi = {
  list: (params?: { skip?: number; limit?: number; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.set('skip', String(params.skip));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return apiFetch<AdminCommentsResponse>(`/api/admin/comments${qs ? `?${qs}` : ''}`);
  },
  updateStatus: (id: number, status: string) =>
    apiFetch<{ message: string }>(`/api/admin/comments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  remove: (id: number) =>
    apiFetch<{ message: string }>(`/api/admin/comments/${id}`, { method: 'DELETE' }),
  batchDelete: (ids: number[]) =>
    apiFetch<{ message: string }>('/api/admin/comments/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
};

// Statistics Types
export type StatsOverview = {
  post_count: number;
  user_count: number;
  comment_count: number;
  category_count: number;
  total_views: number;
  total_favorites: number;
};

export type CommentsTrend = {
  date: string;
  count: number;
};

export type PopularPost = {
  id: number;
  title: string;
  comment_count: number;
};

export type CategoryDistribution = {
  category: string;
  count: number;
};

// Statistics API
export const adminStatsApi = {
  overview: () => apiFetch<StatsOverview>('/api/admin/stats/overview'),
  commentsTrend: () => apiFetch<{ trend: CommentsTrend[] }>('/api/admin/stats/comments-trend'),
  popularPosts: () => apiFetch<{ posts: PopularPost[] }>('/api/admin/stats/popular-posts'),
  categoryDistribution: () => apiFetch<{ categories: CategoryDistribution[] }>('/api/admin/stats/category-distribution'),
};

// User Management API
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
