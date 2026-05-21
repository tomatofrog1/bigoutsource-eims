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
  approve: (id) => apiRequest(`/users/${id}/approve`, { method: 'PUT' }),
  disable: (id) => apiRequest(`/users/${id}/disable`, { method: 'PUT' }),
};
