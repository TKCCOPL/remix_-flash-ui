import { apiFetch } from './client';

export type ApiPost = {
  id: number;
  title: string;
  content: string;
  category?: string;
  image_url?: string;
  status: 'published' | 'draft' | 'archived';
  created_at: string;
  updated_at: string;
  view_count: number;
  comment_count: number;
  favorite_count: number;
  like_count?: number;
  is_liked?: boolean;
};

type PostCreatePayload = {
  title: string;
  content: string;
  category?: string;
  image_url?: string;
  status?: 'published' | 'draft' | 'archived';
};

type PostUpdatePayload = {
  title?: string;
  content?: string;
  category?: string;
  image_url?: string;
  status?: 'published' | 'draft' | 'archived';
};

export type ArchivePost = {
  id: number;
  title: string;
  created_at: string;
  summary?: string;
};

export type ArchiveMonth = {
  month: string;
  posts: ArchivePost[];
};

export type ArchiveData = Record<string, ArchiveMonth[]>;

export type SearchResult = {
  id: number;
  title: string;
  summary: string;
  category: string | null;
  created_at: string;
};

export type SearchResponse = {
  results: SearchResult[];
  total: number;
};

export const postsApi = {
  list: (skip = 0, limit = 100, includeDrafts = false) => apiFetch<ApiPost[]>(`/api/posts?skip=${skip}&limit=${limit}${includeDrafts ? '&include_drafts=true' : ''}`),
  listByStatus: (status: string, skip = 0, limit = 100) => apiFetch<ApiPost[]>(`/api/posts?skip=${skip}&limit=${limit}&status=${status}`),
  get: (id: string | number) => apiFetch<ApiPost>(`/api/posts/${id}`),
  incrementView: (id: string | number) => apiFetch<{ ok: boolean }>(`/api/posts/${id}/view`, { method: 'POST' }),
  getArchive: (includeDrafts = false) => apiFetch<ArchiveData>(`/api/posts/archive${includeDrafts ? '?include_drafts=true' : ''}`),
  create: (payload: PostCreatePayload) =>
    apiFetch<ApiPost>('/api/posts', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string | number, payload: PostUpdatePayload) =>
    apiFetch<ApiPost>(`/api/posts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  updateStatus: (id: string | number, status: 'published' | 'draft' | 'archived') =>
    apiFetch<{ id: number; status: string; message: string }>(`/api/posts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  remove: (id: string | number) => apiFetch<{ detail: string }>(`/api/posts/${id}`, { method: 'DELETE' }),
  search: (query: string, includeDrafts = false) => apiFetch<SearchResponse>(`/api/posts/search?q=${encodeURIComponent(query)}${includeDrafts ? '&include_drafts=true' : ''}`),
};
