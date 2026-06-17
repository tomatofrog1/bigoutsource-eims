import { NotificationModel } from './notification.model.js';
import { UserProfileModel } from '../userProfile/userProfile.model.js';
import { RoleService } from '../role/role.service.js';

const EMPLOYEE_ADDED_CAPABILITY = 'notifications.employee_added';
const EMPLOYEE_ADDED_TYPE = 'employee.added';

function hasCapability(capabilities, capability) {
  return Array.isArray(capabilities) && capabilities.includes(capability);
}

function roleLabel(role = '') {
  return String(role)
    .split('_')
    .filter(Boolean)
    .map((part) => {
      if (part === 'it') return 'IT';
      if (part === 'hr') return 'HR';
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function actorIdForDatabase(actor) {
  const id = actor?.userId;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''))
    ? id
    : null;
}

export const NotificationService = {
  async listForUser(user, { limit } = {}) {
    const notifications = await NotificationModel.findForRecipient(user.id, { limit });

    return notifications.filter((notification) => {
      if (notification.type === EMPLOYEE_ADDED_TYPE) {
        return hasCapability(user.capabilities, EMPLOYEE_ADDED_CAPABILITY);
      }
      return true;
    });
  },

  markAllReadForUser(user) {
    return NotificationModel.markAllReadForRecipient(user.id);
  },

  clearAllForUser(user) {
    return NotificationModel.clearAllForRecipient(user.id);
  },

  async notifyEmployeeAdded({ employee, actor }) {
    const recipients = await UserProfileModel.findAll({ status: 'active' });
    const eligibleRecipients = [];

    for (const recipient of recipients) {
      if (String(recipient.id) === String(actor.userId)) continue;

      const capabilities = await RoleService.resolveUserCapabilities(recipient);
      if (hasCapability(capabilities, EMPLOYEE_ADDED_CAPABILITY)) {
        eligibleRecipients.push(recipient);
      }
    }

    const employeeLabel = employee.fullName || employee.employeeNumber || employee.id;
    const actorName = actor.userName || actor.userEmail || 'Someone';
    const actorRole = roleLabel(actor.userRole);
    const message = `${actorName} added ${employeeLabel} to employee records.`;

    return NotificationModel.createMany(
      eligibleRecipients.map((recipient) => ({
        recipientId: recipient.id,
        type: EMPLOYEE_ADDED_TYPE,
        actorId: actorIdForDatabase(actor),
        actorName,
        actorRole,
        message,
        entityType: 'employees',
        entityId: employee.id,
        entityLabel: employeeLabel,
        actionUrl: `/employee/${employee.id}`,
        details: {
          employeeNumber: employee.employeeNumber,
          fullName: employee.fullName,
          accountAssignment: employee.accountAssignment,
          site: employee.site,
        },
      }))
    );
  },
};
