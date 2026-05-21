import { apiRequest, clearAuthToken, setAuthToken } from './api';

export const authService = {
  async login(email, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setAuthToken(data.token);
    return data.user;
  },

  async register(input) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.user;
  },

  me() {
    return apiRequest('/auth/me');
  },

  async logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      // The client should still clear local auth state if the token is already gone or expired.
    } finally {
      clearAuthToken();
    }
  },
};
