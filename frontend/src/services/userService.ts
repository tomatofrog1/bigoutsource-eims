import { BaseService } from './BaseService';
import { apiRequest } from '../lib/api';
import { AppUser } from '../types';

class UserService extends BaseService<AppUser> {
  constructor() {
    super('/users');
  }

  async setCapabilities(id: string, capabilities: string[] | null) {
    return apiRequest(`${this.endpoint}/${id}/capabilities`, { 
      method: 'PUT', 
      body: JSON.stringify({ capabilities }) 
    });
  }

  async approve(id: string) {
    return apiRequest(`${this.endpoint}/${id}/approve`, { method: 'PUT' });
  }

  async disable(id: string) {
    return apiRequest(`${this.endpoint}/${id}/disable`, { method: 'PUT' });
  }
}

export const userService = new UserService();
