import { apiRequest } from './api';

function toQuery(params = {}) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

export const userService = {
  list: (params) => apiRequest(`/users${toQuery(params)}`),
  update: (id, input) => apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  // capabilities: an array to override, or null to reset to the account's role defaults.
  setCapabilities: (id, capabilities) =>
    apiRequest(`/users/${id}/capabilities`, { method: 'PUT', body: JSON.stringify({ capabilities }) }),
  approve: (id) => apiRequest(`/users/${id}/approve`, { method: 'PUT' }),
  disable: (id) => apiRequest(`/users/${id}/disable`, { method: 'PUT' }),
  remove: (id) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
};
