export const loginValidator = {
  email: { required: true, type: 'string', email: true },
  password: { required: true, type: 'string', min: 1 },
};

export const registerValidator = {
  email: { required: true, type: 'string', email: true },
  password: {
    required: true,
    type: 'string',
    min: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
    message: 'password must include uppercase, lowercase, number, and special character',
  },
  fullName: { required: true, type: 'string', min: 2 },
  department: { required: true, type: 'string', min: 2 },
  site: { required: true, type: 'string', min: 2 },
};

export const changePasswordValidator = {
  currentPassword: { required: true, type: 'string', min: 1 },
  newPassword: { required: true, type: 'string', min: 8 },
};
