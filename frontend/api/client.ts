export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function getCookieValue(name: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function shouldUseJsonContentType(body: BodyInit | null | undefined): boolean {
  if (!body) {
    return false;
  }
  return !(body instanceof FormData) && !(body instanceof URLSearchParams);
}

function resolveApiUrl(path: string): string {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!baseUrl) {
    return path;
  }
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const method = (init?.method ?? 'GET').toUpperCase();
  if (!headers.has('Content-Type') && shouldUseJsonContentType(init?.body)) {
    headers.set('Content-Type', 'application/json');
  }
  if (!SAFE_METHODS.has(method)) {
    const csrfToken = getCookieValue(CSRF_COOKIE_NAME);
    if (csrfToken && !headers.has(CSRF_HEADER_NAME)) {
      headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  const response = await fetch(resolveApiUrl(path), {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    headers,
  });

  const contentType = response.headers.get('content-type') ?? '';

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    if (contentType.includes('application/json')) {
      const data = (await response.json()) as { detail?: string };
      if (typeof data.detail === 'string' && data.detail.trim()) {
        message = data.detail;
      }
    } else {
      const text = await response.text();
      if (text.trim()) {
        message = text;
      }
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!contentType.includes('application/json')) {
    throw new ApiError(response.status, `Invalid response content type (HTTP ${response.status})`);
  }

  return (await response.json()) as T;
}
