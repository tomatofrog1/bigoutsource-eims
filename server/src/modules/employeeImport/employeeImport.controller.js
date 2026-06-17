import { EmployeeImportService } from './employeeImport.service.js';
import { success } from '../../utils/apiResponse.js';

export const EmployeeImportController = {
  async stage(req, res, next) {
    try {
      return success(res, await EmployeeImportService.stage(req.body, req.user), 'Import staged', 201);
    } catch (error) {
      return next(error);
    }
  },

  async list(req, res, next) {
    try {
      return success(res, await EmployeeImportService.list(req.query));
    } catch (error) {
      return next(error);
    }
  },

  async summary(req, res, next) {
    try {
      return success(res, await EmployeeImportService.summary());
    } catch (error) {
      return next(error);
    }
  },

  async resolveDuplicate(req, res, next) {
    try {
      return success(res, await EmployeeImportService.resolveDuplicate(req.body, req.user), 'Duplicate resolved');
    } catch (error) {
      return next(error);
    }
  },

  async updateRow(req, res, next) {
    try {
      return success(res, await EmployeeImportService.updateRow(req.params.id, req.body, req.user), 'Import row updated');
    } catch (error) {
      return next(error);
    }
  },

  async deleteRows(req, res, next) {
    try {
      return success(res, await EmployeeImportService.deleteRows(req.body, req.user), 'Import rows deleted');
    } catch (error) {
      return next(error);
    }
  },

  async deleteRow(req, res, next) {
    try {
      return success(res, await EmployeeImportService.deleteRow(req.params.id, req.user), 'Import row deleted');
    } catch (error) {
      return next(error);
    }
  },

  async deleteMany(req, res, next) {
    try {
      return success(res, await EmployeeImportService.deleteMany(req.body, req.user), 'Import rows deleted');
    } catch (error) {
      return next(error);
    }
  },

  async importReady(req, res, next) {
    try {
      return success(
        res,
        await EmployeeImportService.importReady(
          req.params.importBatchId,
          req.user,
          { ipAddress: req.ip },
          req.body?.newDepartments
        ),
        'Ready rows imported'
      );
    } catch (error) {
      return next(error);
    }
  },
};
