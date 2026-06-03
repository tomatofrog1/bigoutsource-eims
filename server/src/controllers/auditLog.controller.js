import { AuditLogModel } from '../models/auditLog.model.js';
import { success } from '../utils/apiResponse.js';

export const AuditLogController = {
  async list(req, res, next) {
    try {
      return success(res, await AuditLogModel.findAll(req.query));
    } catch (error) {
      return next(error);
    }
  },

  async undo(req, res, next) {
    try {
      const { id } = req.params;
      const log = await AuditLogModel.findById(id);
      
      if (!log) {
        return res.status(404).json({ success: false, message: 'Audit log not found' });
      }

      if (!log.action.endsWith('.update')) {
        return res.status(400).json({ success: false, message: 'Only update actions can be undone.' });
      }

      const revertedData = {};
      
      if (log.action === 'employee.update') {
        const changes = log.details?.changes || [];
        if (!changes.length) {
          return res.status(400).json({ success: false, message: 'No changes recorded to undo.' });
        }
        
        changes.forEach((change) => {
          revertedData[change.field] = change.from;
        });

        const { EmployeeService } = await import('../services/employee.service.js');
        await EmployeeService.update(log.entityId, revertedData, req.user, {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      } else if (log.action === 'account.update') {
        const from = log.details?.from;
        if (!from) {
          return res.status(400).json({ success: false, message: 'No previous state recorded to undo.' });
        }
        
        Object.assign(revertedData, from);

        const { AccountService } = await import('../services/account.service.js');
        await AccountService.update(log.entityId, revertedData, req.user, {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      } else {
        return res.status(400).json({ success: false, message: `Undo is not supported for ${log.action}` });
      }

      return success(res, { message: 'Action successfully undone.' });
    } catch (error) {
      return next(error);
    }
  },
};
