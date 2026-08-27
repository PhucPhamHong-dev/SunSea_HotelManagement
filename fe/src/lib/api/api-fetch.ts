import { appEnv } from '../config/env';
import { ApiError, type ApiErrorBody } from './api-error';

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(url.startsWith('http') ? url : `${appEnv.apiBaseUrl}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    let body: ApiErrorBody;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = {
        success: false,
        error: { code: 'HTTP_ERROR', message: 'Request failed' },
      };
    }
    throw new ApiError(response.status, body);
  }
  if (response.status === 204) return { data: undefined, status: response.status, headers: response.headers } as T;
  return { data: await response.json(), status: response.status, headers: response.headers } as T;
}
