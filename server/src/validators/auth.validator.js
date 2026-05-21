export const loginValidator = {
  email: { required: true, type: 'string', email: true },
  password: { required: true, type: 'string', min: 1 },
};

export const registerValidator = {
  email: { required: true, type: 'string', email: true },
  password: { required: true, type: 'string', min: 8 },
  fullName: { required: true, type: 'string', min: 2 },
  department: { required: true, type: 'string', min: 2 },
  site: { required: true, type: 'string', min: 2 },
};
