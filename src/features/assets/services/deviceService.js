import { apiRequest } from './api';

export const deviceService = {
  list: () => apiRequest('/devices'),
  get: (id) => apiRequest(`/devices/${id}`),
  create: (input) => apiRequest('/devices', { method: 'POST', body: JSON.stringify(input) }),
  update: (id, input) => apiRequest(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  remove: (id) => apiRequest(`/devices/${id}`, { method: 'DELETE' }),
  assign: (input) => apiRequest('/device-assignments', { method: 'POST', body: JSON.stringify(input) }),
  returnAssignment: (id) => apiRequest(`/device-assignments/${id}/return`, { method: 'PUT' }),
};
