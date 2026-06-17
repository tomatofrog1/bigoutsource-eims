export const createAccountValidator = {
  name: { required: true, type: 'string', min: 2 },
  accountType: { required: true, type: 'string', enum: ['internal', 'external'] },
  departmentCode: {
    required: false,
    type: 'string',
    pattern: /^[A-Za-z]+$/,
    message: 'departmentCode must contain letters only',
  },
};

export const updateAccountValidator = {
  name: { required: true, type: 'string', min: 2 },
  accountType: { required: false, type: 'string', enum: ['internal', 'external'] },
  departmentCode: {
    required: false,
    type: 'string',
    pattern: /^[A-Za-z]+$/,
    message: 'departmentCode must contain letters only',
  },
};
