import api from './api';
import { CSRF_STORAGE_KEY } from '@/utils/authStorage';

function persistCsrfFromResponse(data) {
  if (typeof window === 'undefined' || !data?.csrfToken) return;
  try {
    window.sessionStorage.setItem(CSRF_STORAGE_KEY, String(data.csrfToken));
  } catch {
    /* ignore */
  }
}

export const authService = {
  async login(username, password, schoolId) {
    try {
      const response = await api.post('/auth/login', {
        username,
        schoolId,
        password,
      });

      if (response.success && response.data) {
        persistCsrfFromResponse(response.data);
        return {
          success: true,
          user: response.data.user,
        };
      }

      return {
        success: false,
        error: response.error || 'Login failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore - local auth state is cleared by the caller
    }
  },

  async verifySession() {
    try {
      const response = await api.get('/auth/verify');
      if (!response.success) return null;
      if (response.data) persistCsrfFromResponse(response.data);
      return response.data?.user || null;
    } catch (error) {
      return null;
    }
  },
};
