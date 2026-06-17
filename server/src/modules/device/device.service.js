import { DeviceModel } from './device.model.js';
import { AuditLogModel } from '../auditLog/auditLog.model.js';
import { AppError } from '../../utils/apiResponse.js';
import { auditActor } from '../../utils/auditActor.js';

export const DeviceService = {
  list() {
    return DeviceModel.findAll();
  },

  async get(id) {
    const device = await DeviceModel.findById(id);
    if (!device) throw new AppError('Device not found', 404);
    return device;
  },

  async create(data, user, meta = {}) {
    const device = await DeviceModel.create(data);
    await AuditLogModel.create({
      ...auditActor(user),
      action: 'device.create',
      entityType: 'devices',
      entityId: device.id,
      details: { assetTag: device.assetTag },
      ipAddress: meta.ipAddress,
    });
    return device;
  },

  async update(id, data, user, meta = {}) {
    const before = await DeviceModel.findById(id);
    const device = await DeviceModel.update(id, data);
    if (!device) throw new AppError('Device not found', 404);

    const trackedFields = ['pcName', 'biosDate', 'windowsKey', 'rustdeskId', 'esetStatus', 'activityWatchStatus'];
    const changes = trackedFields
      .map(field => ({
        field,
        from: String(before?.[field] || ''),
        to: String(device?.[field] || '')
      }))
      .filter(change => change.from !== change.to);

    await AuditLogModel.create({
      ...auditActor(user),
      action: 'device.update',
      entityType: 'employees',
      entityId: id,
      entityLabel: device.assigneeName || device.assetTag || id,
      details: { changes },
      ipAddress: meta.ipAddress,
    });
    return device;
  },

  async remove(id, user, meta = {}) {
    const removed = await DeviceModel.remove(id);
    if (!removed) throw new AppError('Device not found', 404);
    await AuditLogModel.create({
      ...auditActor(user),
      action: 'device.delete',
      entityType: 'devices',
      entityId: id,
      ipAddress: meta.ipAddress,
    });
  },

  async assign(data, user, meta = {}) {
    const assignment = await DeviceModel.assign(data);
    await AuditLogModel.create({
      ...auditActor(user),
      action: 'device.assign',
      entityType: 'device_assignments',
      entityId: assignment.id,
      details: { deviceId: data.deviceId, employeeId: data.employeeId },
      ipAddress: meta.ipAddress,
    });
    return assignment;
  },

  async returnAssignment(id, user, meta = {}) {
    const assignment = await DeviceModel.returnAssignment(id);
    if (!assignment) throw new AppError('Active assignment not found', 404);
    await AuditLogModel.create({
      ...auditActor(user),
      action: 'device.return',
      entityType: 'device_assignments',
      entityId: id,
      ipAddress: meta.ipAddress,
    });
    return assignment;
  },
};
