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
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const cookie of cookies) {
    const [cookieName, ...rest] = cookie.split('=');
    if (cookieName === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
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

/**
 * Ensure the CSRF cookie is set by making a lightweight HEAD request.
 * The backend middleware sets the cookie on any safe method response.
 */
async function ensureCsrfCookie(): Promise<void> {
  if (getCookieValue(CSRF_COOKIE_NAME)) return;
  try {
    await fetch(resolveApiUrl('/api/posts'), {
      method: 'HEAD',
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    // Best effort — if this fails, the main request will surface the error
  }
}

/**
 * Extract the raw token from a signed CSRF cookie value.
 * Cookie format: "{raw_token}.{hmac_signature}"
 */
function extractRawCsrfToken(signedToken: string): string {
  const lastDot = signedToken.lastIndexOf('.');
  return lastDot > 0 ? signedToken.substring(0, lastDot) : signedToken;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const method = (init?.method ?? 'GET').toUpperCase();
  if (!headers.has('Content-Type') && shouldUseJsonContentType(init?.body)) {
    headers.set('Content-Type', 'application/json');
  }

  // For unsafe methods, ensure CSRF cookie exists and inject header
  if (!SAFE_METHODS.has(method)) {
    await ensureCsrfCookie();
    const csrfToken = getCookieValue(CSRF_COOKIE_NAME);
    if (csrfToken && !headers.has(CSRF_HEADER_NAME)) {
      headers.set(CSRF_HEADER_NAME, extractRawCsrfToken(csrfToken));
    }
  }

  const response = await fetch(resolveApiUrl(path), {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    headers,
  });

  // Auto-retry on CSRF failure (token may have expired or rotated)
  if (response.status === 403 && !SAFE_METHODS.has(method)) {
    try {
      const body = await response.clone().json().catch(() => null);
      if (body?.detail?.includes('CSRF')) {
        // Force-refresh: make a HEAD request to get a fresh CSRF cookie
        await fetch(resolveApiUrl('/api/posts'), {
          method: 'HEAD',
          credentials: 'include',
          cache: 'no-store',
        });
        // Re-read the (possibly refreshed) cookie and retry
        const freshToken = getCookieValue(CSRF_COOKIE_NAME);
        if (freshToken) {
          headers.set(CSRF_HEADER_NAME, extractRawCsrfToken(freshToken));
        }
        // Retry once with fresh token
        const retryResponse = await fetch(resolveApiUrl(path), {
          credentials: 'include',
          cache: 'no-store',
          ...init,
          headers,
        });
        if (retryResponse.ok) {
          return handleResponse<T>(retryResponse);
        }
      }
    } catch {
      // Retry failed, fall through to normal error handling
    }
  }

  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
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
