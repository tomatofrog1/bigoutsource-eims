import { apiRequest } from './api';

export interface SystemAlert {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export const systemAlertService = {
  create: async (type: string, message: string): Promise<SystemAlert> => {
    const payload = await apiRequest('/system-alerts', {
      method: 'POST',
      body: JSON.stringify({ type, message }),
    });
    return payload.data;
  },

  getUnread: async (): Promise<SystemAlert[]> => {
    const payload = await apiRequest('/system-alerts');
    return payload.data;
  },

  markAsRead: async (id: string): Promise<SystemAlert> => {
    const payload = await apiRequest(`/system-alerts/${id}/read`, {
      method: 'PUT',
    });
    return payload.data;
  },
};
