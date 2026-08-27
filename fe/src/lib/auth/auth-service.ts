import { apiClient } from '../api/api-client';
import { ApiError } from '../api/api-error';
import type { AuthUser } from '../api/api-client';

export const authService = {
  login: apiClient.auth.login,
  logout: apiClient.auth.logout,
  refresh: apiClient.auth.refresh,
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return (await apiClient.auth.me()).data.data;
  } catch (error) {
    if (!(error instanceof ApiError) || ![401, 403].includes(error.status)) throw error;
    if (error.status === 403) return null;
    try {
      await apiClient.auth.refresh();
      return (await apiClient.auth.me()).data.data;
    } catch (refreshError) {
      if (refreshError instanceof ApiError && [401, 403].includes(refreshError.status)) return null;
      throw refreshError;
    }
  }
}
