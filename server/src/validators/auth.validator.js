export const loginValidator = {
  email: { required: true, type: 'string', email: true },
  password: { required: true, type: 'string', min: 1 },
};
