import { apiRequest } from './api';

export const employeeService = {
  list: () => apiRequest('/employees'),
  summary: () => apiRequest('/employees/summary'),
  get: (id) => apiRequest(`/employees/${id}`),
  create: (input) => apiRequest('/employees', { method: 'POST', body: JSON.stringify(input) }),
  update: (id, input) => apiRequest(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  remove: (id) => apiRequest(`/employees/${id}`, { method: 'DELETE' }),
};
