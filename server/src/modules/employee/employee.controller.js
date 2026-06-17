import { EmployeeService } from './employee.service.js';
import { success } from '../../utils/apiResponse.js';
import { redactEmployeeForUser } from '../../utils/employeeSecurity.js';

export const EmployeeController = {
  async list(req, res, next) {
    try {
      const employees = await EmployeeService.list();
      return success(res, employees.map((employee) => redactEmployeeForUser(employee, req.user)));
    } catch (error) {
      return next(error);
    }
  },

  async summary(req, res, next) {
    try {
      return success(res, await EmployeeService.summary());
    } catch (error) {
      return next(error);
    }
  },

  async get(req, res, next) {
    try {
      const employee = await EmployeeService.get(req.params.id);
      return success(res, redactEmployeeForUser(employee, req.user));
    } catch (error) {
      return next(error);
    }
  },

  async create(req, res, next) {
    try {
      return success(
        res,
        await EmployeeService.create(req.body, req.user, {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }),
        'Employee created',
        201
      );
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      return success(
        res,
        await EmployeeService.update(req.params.id, req.body, req.user, {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }),
        'Employee updated'
      );
    } catch (error) {
      return next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await EmployeeService.remove(req.params.id, req.user, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      return success(res, null, 'Employee deleted');
    } catch (error) {
      return next(error);
    }
  },
};
