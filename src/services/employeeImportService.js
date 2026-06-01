import { apiRequest } from './api';

export const employeeImportService = {
  summary: () => apiRequest('/employee-imports/summary'),
  list: (params = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
    });

    const query = search.toString();
    return apiRequest(`/employee-imports${query ? `?${query}` : ''}`);
  },
  stage: (rows) => apiRequest('/employee-imports/stage', { method: 'POST', body: JSON.stringify({ rows }) }),
  resolveDuplicate: (input) => (
    apiRequest('/employee-imports/duplicates/resolve', { method: 'POST', body: JSON.stringify(input) })
  ),
  updateRow: (id, input) => apiRequest(`/employee-imports/rows/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteRow: (id) => apiRequest(`/employee-imports/rows/${id}`, { method: 'DELETE' }),
  deleteMany: (input) => apiRequest('/employee-imports/delete-many', { method: 'POST', body: JSON.stringify(input) }),
  importReady: (importBatchId) => apiRequest(`/employee-imports/${importBatchId}/import-ready`, { method: 'POST' }),
};
