import { apiRequest, clearAuthToken, setAuthToken } from '@/src/lib/api';

export const authService = {
  internalDepartments() {
    return apiRequest('/auth/internal-departments');
  },

  async login(email, password) {
    const trustedDeviceToken = localStorage.getItem('eims_mfa_trusted');
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, trustedDeviceToken }),
    });

    if (data.requiresMfa) {
      return data;
    }

    setAuthToken(data.token);
    if (data.trustedDeviceToken) {
      localStorage.setItem('eims_mfa_trusted', data.trustedDeviceToken);
    }
    return data.user;
  },

  async loginMfa(mfaToken, code) {
    const data = await apiRequest('/auth/login/mfa', {
      method: 'POST',
      body: JSON.stringify({ mfaToken, code }),
    });

    setAuthToken(data.token);
    if (data.trustedDeviceToken) {
      localStorage.setItem('eims_mfa_trusted', data.trustedDeviceToken);
    }
    return data.user;
  },

  async setupMfa() {
    return apiRequest('/auth/mfa/setup', { method: 'POST' });
  },

  async verifyMfa(secret, code) {
    return apiRequest('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ secret, code }),
    });
  },

  async disableMfa(code) {
    return apiRequest('/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
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

  changePassword(currentPassword, newPassword) {
    return apiRequest('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};
