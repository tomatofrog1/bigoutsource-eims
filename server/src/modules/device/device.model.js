import { randomUUID } from 'node:crypto';
import { EmployeeModel } from '../employee/employee.model.js';

function toDevice(employee) {
  return {
    id: employee.id,
    assetTag: employee.pcName || employee.id,
    deviceType: 'computer',
    pcName: employee.pcName,
    serialNumber: '',
    biosDate: employee.biosDate,
    windowsKey: employee.windowsKey,
    rustdeskId: employee.rustdeskId,
    esetStatus: employee.esetStatus,
    activityWatchStatus: employee.activityWatchStatus,
    status: employee.pcName ? 'assigned' : 'available',
    siteId: employee.site,
    site: employee.site,
    assigneeId: employee.id,
    assigneeName: employee.fullName,
    assigneeStatus: employee.status,
    assigneeAccount: employee.accountAssignment || employee.account || '',
    isArchived: employee.isArchived,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}

export const DeviceModel = {
  async findAll() {
    const employees = await EmployeeModel.findAll();
    return employees.map(toDevice);
  },

  async findById(id) {
    const employee = await EmployeeModel.findById(id);
    return employee ? toDevice(employee) : null;
  },

  async create(data) {
    return {
      id: data.assetTag || randomUUID(),
      ...data,
      status: data.status || 'available',
    };
  },

  async update(id, data) {
    const employee = await EmployeeModel.findById(id);
    if (!employee) return null;

    const updated = await EmployeeModel.update(id, {
      pcName: data.pcName,
      biosDate: data.biosDate,
      windowsKey: data.windowsKey,
      rustdeskId: data.rustdeskId,
      esetStatus: data.esetStatus,
      activityWatchStatus: data.activityWatchStatus,
    });
    return updated ? toDevice(updated) : null;
  },

  async remove() {
    return true;
  },

  async assign(data) {
    return {
      id: randomUUID(),
      ...data,
      assignedAt: new Date().toISOString(),
      returnedAt: null,
    };
  },

  async returnAssignment(id) {
    return {
      id,
      returnedAt: new Date().toISOString(),
    };
  },
};
