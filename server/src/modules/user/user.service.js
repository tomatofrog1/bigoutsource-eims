import { supabaseAdmin } from '../../config/supabase.js';
import { UserProfileModel } from '../userProfile/userProfile.model.js';
import { RoleModel } from '../role/role.model.js';
import { RoleService, sanitizeCapabilities } from '../role/role.service.js';
import { AppError } from '../../utils/apiResponse.js';
import { emitUserAccessRevoked, emitUserAccessUpdated } from '../../realtime/accessEvents.js';
import { publicUserPayload } from '../../utils/publicUser.js';

async function emitAccessUpdate(profile, reason) {
  const capabilities = await RoleService.resolveUserCapabilities(profile);
  emitUserAccessUpdated(profile.id, publicUserPayload(profile, capabilities), reason);

  if (profile.status !== 'active') {
    emitUserAccessRevoked(profile.id, reason);
  }
}

export const UserService = {
  list(filters = {}) {
    return UserProfileModel.findAll(filters);
  },

  async approve(id, actor) {
    const user = await UserProfileModel.findById(id);
    if (!user) throw new AppError('User not found', 404);
    if (user.status === 'disabled') throw new AppError('Disabled users cannot be approved directly', 400);
    if (user.role === 'super_admin') throw new AppError('Super Admin accounts are managed separately', 400);

    const updated = await UserProfileModel.update(id, {
      role: 'viewer',
      status: 'active',
      approvedBy: actor.id,
      approvedAt: new Date().toISOString(),
    });
    await emitAccessUpdate(updated, 'user.approved');
    return updated;
  },

  async disable(id) {
    const user = await UserProfileModel.findById(id);
    if (!user) throw new AppError('User not found', 404);
    if (user.role === 'super_admin') throw new AppError('Super Admin accounts cannot be disabled here', 400);

    const updated = await UserProfileModel.update(id, {
      status: 'disabled',
    });
    await emitAccessUpdate(updated, 'user.disabled');
    return updated;
  },

  async update(id, data = {}, actor) {
    const user = await UserProfileModel.findById(id);
    if (!user) throw new AppError('User not found', 404);
    if (user.role === 'super_admin') throw new AppError('Super Admin accounts cannot be edited here', 400);

    const updates = {};
    const allowedStatuses = ['active', 'disabled'];

    if (data.department !== undefined) {
      const department = String(data.department).trim();
      if (!department) throw new AppError('Department is required', 400);
      updates.department = department;
    }

    if (data.site !== undefined) {
      const site = String(data.site).trim();
      if (!site) throw new AppError('Site is required', 400);
      updates.site = site;
    }

    if (data.role !== undefined) {
      if (data.role === 'super_admin') {
        throw new AppError('Super Admin cannot be assigned here', 400);
      }
      const role = await RoleModel.findBySlug(data.role);
      if (!role) {
        throw new AppError('Unknown role', 400);
      }
      updates.role = data.role;

      if (user.role !== data.role) {
        updates.capabilityOverrides = null;
      }
    }

    if (data.status !== undefined) {
      if (!allowedStatuses.includes(data.status)) {
        throw new AppError('Status must be active or inactive', 400);
      }
      updates.status = data.status;
      if (data.status === 'active' && user.status === 'pending' && actor?.id) {
        updates.approvedBy = actor.id;
        updates.approvedAt = new Date().toISOString();
      }
    }

    if (!Object.keys(updates).length) throw new AppError('No valid fields to update', 400);

    const updated = await UserProfileModel.update(id, updates);
    await emitAccessUpdate(updated, 'user.updated');
    return updated;
  },

  /**
   * Sets per-account capability overrides. Pass `null` to clear the override and
   * revert the account to its role's default capabilities. Meta-capabilities are
   * never grantable (same guardrail as the role editor).
   */
  async setCapabilities(id, capabilities) {
    const user = await UserProfileModel.findById(id);
    if (!user) throw new AppError('User not found', 404);
    if (user.role === 'super_admin') throw new AppError('Super Admin permissions cannot be overridden', 400);

    const overrides = capabilities === null ? null : sanitizeCapabilities(capabilities);
    const updated = await UserProfileModel.update(id, { capabilityOverrides: overrides });
    await emitAccessUpdate(updated, 'user.permissions_updated');
    return updated;
  },

  async remove(id) {
    const user = await UserProfileModel.findById(id);
    if (!user) throw new AppError('User not found', 404);
    if (user.role === 'super_admin') throw new AppError('Super Admin accounts cannot be deleted here', 400);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw new AppError(error.message || 'Unable to delete user', 500);

    emitUserAccessRevoked(id, 'user.deleted');
    return { id };
  },
};
