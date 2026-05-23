export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
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
  if (!headers.has('Content-Type') && shouldUseJsonContentType(init?.body)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(resolveApiUrl(path), {
    credentials: 'include',
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
