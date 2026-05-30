import { apiFetch } from './client';

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

export type StatsOverview = {
  post_count: number;
  user_count: number;
  comment_count: number;
  category_count: number;
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

export const adminStatsApi = {
  overview: () => apiFetch<StatsOverview>('/api/admin/stats/overview'),
  commentsTrend: () => apiFetch<{ trend: CommentsTrend[] }>('/api/admin/stats/comments-trend'),
  popularPosts: () => apiFetch<{ posts: PopularPost[] }>('/api/admin/stats/popular-posts'),
  categoryDistribution: () => apiFetch<{ categories: CategoryDistribution[] }>('/api/admin/stats/category-distribution'),
};
