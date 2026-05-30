import { apiFetch } from './client';

export type GuestUser = {
  id: number;
  username: string;
  avatar_url: string | null;
  email: string | null;
  oauth_provider: string;
  is_admin: boolean;
};

export const oauthApi = {
  me: () => apiFetch<GuestUser>('/api/user/me'),
  logout: () => apiFetch<void>('/api/oauth/logout', { method: 'POST' }),
  login: (provider: 'github' | 'gitee') => {
    window.location.href = `/api/oauth/${provider}`;
  },
};
