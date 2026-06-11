import { apiRequest } from './api';

export const notificationService = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/notifications${suffix}`);
  },
  markAllRead: () => apiRequest('/notifications/read-all', { method: 'POST' }),
};
