export const createDeviceValidator = {
  assetTag: { required: true, type: 'string' },
  deviceType: { required: true, type: 'string' },
  pcName: { required: false, type: 'string' },
  serialNumber: { required: false, type: 'string' },
  biosDate: { required: false, type: 'string' },
  windowsKey: { required: false, type: 'string' },
  rustdeskId: { required: false, type: 'string' },
  esetStatus: { required: false, type: 'string', enum: ['active', 'inactive'] },
  activityWatchStatus: { required: false, type: 'string', enum: ['installed', 'missing'] },
  status: { required: false, type: 'string', enum: ['available', 'assigned', 'repair', 'retired'] },
  siteId: { required: false, type: 'string' },
};

export const updateDeviceValidator = {
  ...createDeviceValidator,
  assetTag: { required: false, type: 'string' },
  deviceType: { required: false, type: 'string' },
};

export const assignDeviceValidator = {
  deviceId: { required: true, type: 'string' },
  employeeId: { required: true, type: 'string' },
  notes: { required: false, type: 'string' },
};
