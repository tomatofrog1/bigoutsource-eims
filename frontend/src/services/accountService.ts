import { BaseService } from './BaseService';
import { apiRequest } from '../lib/api';

class AccountService extends BaseService<any> {
  constructor() {
    super('/accounts');
  }

  async recent(limit = 4) {
    return apiRequest(`${this.endpoint}/recent?limit=${limit}`);
  }

  async touch(id: string | number) {
    return apiRequest(`${this.endpoint}/${id}/touch`, { method: 'POST' });
  }
}

export const accountService = new AccountService();
