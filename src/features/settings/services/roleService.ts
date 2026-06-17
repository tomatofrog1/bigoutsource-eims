import { apiRequest } from '@/src/services/api';

export interface Role {
  slug: string;
  name: string;
  isSystem: boolean;
  capabilities: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CapabilityItem {
  key: string;
  label: string;
}

export interface RoleInput {
  name: string;
  capabilities: string[];
}

export const roleService = {
  list: (): Promise<Role[]> => apiRequest('/roles'),
  capabilities: (): Promise<CapabilityItem[]> => apiRequest('/roles/capabilities'),
  create: (input: RoleInput): Promise<Role> =>
    apiRequest('/roles', { method: 'POST', body: JSON.stringify(input) }),
  update: (slug: string, input: Partial<RoleInput>): Promise<Role> =>
    apiRequest(`/roles/${slug}`, { method: 'PUT', body: JSON.stringify(input) }),
  remove: (slug: string): Promise<void> => apiRequest(`/roles/${slug}`, { method: 'DELETE' }),
};
