import { apiRequest } from './api';

export const accountService = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.type) query.set('type', params.type);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/accounts${suffix}`);
  },
  recent: (limit = 4) => apiRequest(`/accounts/recent?limit=${limit}`),
  create: (input) => apiRequest('/accounts', { method: 'POST', body: JSON.stringify(input) }),
  update: (id, input) => apiRequest(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  remove: (id) => apiRequest(`/accounts/${id}`, { method: 'DELETE' }),
  touch: (id) => apiRequest(`/accounts/${id}/touch`, { method: 'POST' }),
};
