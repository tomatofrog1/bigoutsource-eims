import { UserProfileModel } from '../models/userProfile.model.js';
import { AppError } from '../utils/apiResponse.js';

export const UserService = {
  list(filters = {}) {
    return UserProfileModel.findAll(filters);
  },

  async approve(id, actor) {
    const user = await UserProfileModel.findById(id);
    if (!user) throw new AppError('User not found', 404);
    if (user.status === 'disabled') throw new AppError('Disabled users cannot be approved directly', 400);
    if (user.role === 'super_admin') throw new AppError('Super Admin accounts are managed separately', 400);

    return UserProfileModel.update(id, {
      role: 'admin',
      status: 'active',
      approvedBy: actor.id,
      approvedAt: new Date().toISOString(),
    });
  },

  async disable(id) {
    const user = await UserProfileModel.findById(id);
    if (!user) throw new AppError('User not found', 404);
    if (user.role === 'super_admin') throw new AppError('Super Admin accounts cannot be disabled here', 400);

    return UserProfileModel.update(id, {
      status: 'disabled',
    });
  },
};
