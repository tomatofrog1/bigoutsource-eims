import { apiRequest } from '@/src/lib/api';

export const employeeService = {
  list: () => apiRequest('/employees'),
  summary: () => apiRequest('/employees/summary'),
  get: (id) => apiRequest(`/employees/${id}`),
  create: (input) => apiRequest('/employees', { method: 'POST', body: JSON.stringify(input) }),
  update: (id, input) => apiRequest(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  remove: (id) => apiRequest(`/employees/${id}`, { method: 'DELETE' }),
  uploadAvatar: (id, file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiRequest(`/employees/${id}/avatar`, { method: 'POST', body: formData });
  },
};
