import { apiRequest } from '../lib/api';

export function toQuery(params: Record<string, any> = {}): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

export class BaseService<T> {
  constructor(protected endpoint: string) {}

  async list(params?: Record<string, any>): Promise<T[]> {
    return apiRequest(`${this.endpoint}${toQuery(params)}`);
  }

  async get(id: string | number): Promise<T> {
    return apiRequest(`${this.endpoint}/${id}`);
  }

  async create(data: Partial<T>): Promise<T> {
    return apiRequest(this.endpoint, { method: 'POST', body: JSON.stringify(data) });
  }

  async update(id: string | number, data: Partial<T>): Promise<T> {
    return apiRequest(`${this.endpoint}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async remove(id: string | number): Promise<void> {
    return apiRequest(`${this.endpoint}/${id}`, { method: 'DELETE' });
  }
}
