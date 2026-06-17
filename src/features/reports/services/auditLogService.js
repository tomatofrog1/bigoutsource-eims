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

export const auditLogService = {
  list: (params) => apiRequest(`/audit-logs${toQuery(params)}`),
  undo: (id) => apiRequest(`/audit-logs/${id}/undo`, { method: 'POST' }),
};
