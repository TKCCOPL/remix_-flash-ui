import { apiFetch } from './client';

export type ApiPost = {
  id: number;
  title: string;
  content: string;
  category?: string;
  image_url?: string;
  status: 'published' | 'draft';
  created_at: string;
  updated_at: string;
  view_count: number;
  comment_count: number;
  favorite_count: number;
};

type PostCreatePayload = {
  title: string;
  content: string;
  category?: string;
  image_url?: string;
  status?: 'published' | 'draft';
};

type PostUpdatePayload = {
  title?: string;
  content?: string;
  category?: string;
  image_url?: string;
  status?: 'published' | 'draft';
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
  get: (id: string | number) => apiFetch<ApiPost>(`/api/posts/${id}`),
  getArchive: (includeDrafts = false) => apiFetch<ArchiveData>(`/api/posts/archive${includeDrafts ? '?include_drafts=true' : ''}`),
  create: (payload: PostCreatePayload) =>
    apiFetch<ApiPost>('/api/posts', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string | number, payload: PostUpdatePayload) =>
    apiFetch<ApiPost>(`/api/posts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id: string | number) => apiFetch<{ detail: string }>(`/api/posts/${id}`, { method: 'DELETE' }),
  search: (query: string, includeDrafts = false) => apiFetch<SearchResponse>(`/api/posts/search?q=${encodeURIComponent(query)}${includeDrafts ? '&include_drafts=true' : ''}`),
};
