let dynamicBaseUrl = '/api';
let isTauriDetected = false;

async function resolveBackendUrl(): Promise<string> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const url = await invoke<string>('get_backend_url');
      if (url) {
        dynamicBaseUrl = url + '/api';
        isTauriDetected = true;
        return dynamicBaseUrl;
      }
    } catch {
      // Still initializing or fallback
    }
  }
  return dynamicBaseUrl;
}

resolveBackendUrl();

export class ApiError extends Error {
  constructor(public status: number, public message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function getBaseUrl(): Promise<string> {
  if (dynamicBaseUrl === '/api') {
    await resolveBackendUrl();
  }
  return dynamicBaseUrl;
}

export async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const base = await getBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  const url = base + cleanEndpoint;
  const headers = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: any = null;
      try {
        errorData = await response.json();
      } catch {
        // not JSON
      }
      const message = errorData?.detail || response.statusText || 'API Request Failed';
      throw new ApiError(response.status, message, errorData);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return null as unknown as T;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, err.message || 'Failed to connect to MEMEASY service');
  }
}

export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  }
  const str = searchParams.toString();
  return str ? '?' + str : '';
}
