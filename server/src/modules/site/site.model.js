import { SITE_OPTIONS } from '../employee/employee.model.js';

export const SiteModel = {
  async findAll() {
    return SITE_OPTIONS.map((name) => ({
      id: name,
      name,
      code: name.toUpperCase().replace(/\s+/g, '_'),
      address: null,
      isActive: true,
    }));
  },

  async create(data) {
    return {
      id: data.name,
      name: data.name,
      code: data.code || data.name?.toUpperCase().replace(/\s+/g, '_'),
      address: data.address || null,
      isActive: data.isActive ?? true,
    };
  },

  async update(id, data) {
    return {
      id,
      name: data.name || id,
      code: data.code || id.toUpperCase().replace(/\s+/g, '_'),
      address: data.address || null,
      isActive: data.isActive ?? true,
    };
  },

  async remove() {
    return true;
  },
};
