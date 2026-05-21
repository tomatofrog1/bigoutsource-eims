const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const TOKEN_KEY = 'eims_auth_token';

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    throw new Error(payload.message || 'API request failed');
  }

  if (!contentType.includes('application/json')) {
    throw new Error('API returned a non-JSON response. Check VITE_API_BASE_URL and backend routing.');
  }

  if (payload.success === false) {
    throw new Error(payload.message || 'API request failed');
  }

  return payload.data;
}
