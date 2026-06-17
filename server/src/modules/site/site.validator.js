export const createSiteValidator = {
  name: { required: true, type: 'string' },
  code: { required: false, type: 'string' },
  address: { required: false, type: 'string' },
  isActive: { required: false, type: 'boolean' },
};

export const updateSiteValidator = {
  name: { required: false, type: 'string' },
  code: { required: false, type: 'string' },
  address: { required: false, type: 'string' },
  isActive: { required: false, type: 'boolean' },
};
