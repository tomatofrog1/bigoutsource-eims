import { apiRequest } from './api';

export const settingsService = {
  get: () => apiRequest('/settings'),
  update: (input) =>
    apiRequest('/settings', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
};
