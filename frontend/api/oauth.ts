import { apiFetch } from './client';

export type GuestUser = {
  id: number;
  username: string;
  avatar_url: string | null;
  email: string | null;
};

export const oauthApi = {
  me: () => apiFetch<GuestUser>('/api/oauth/me'),
  logout: () => apiFetch<void>('/api/oauth/logout', { method: 'POST' }),
  login: (provider: 'github' | 'gitee') => {
    window.location.href = `/api/oauth/${provider}`;
  },
};
