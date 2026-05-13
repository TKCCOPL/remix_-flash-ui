import { apiFetch } from './client';

export const authApi = {
  login: (username: string, password: string) =>
    apiFetch<{ ok: boolean }>('/api/auth/login', {
      method: 'POST',
      body: new URLSearchParams({ username, password }),
    }),
  logout: () => apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => apiFetch<{ username: string }>('/api/auth/me'),
};
