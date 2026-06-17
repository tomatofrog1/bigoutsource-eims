import { supabaseAuth } from '../config/supabase.js';
import { UserProfileModel } from '../modules/userProfile/userProfile.model.js';
import { AppError } from '../utils/apiResponse.js';
import { userHasCapability, userHasAnyCapability } from '../config/capabilities.js';
import { RoleService } from '../modules/role/role.service.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = header.slice('Bearer '.length);
    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (error || !data.user) {
      throw new AppError('Invalid or expired token', 401);
    }

    const profile = await UserProfileModel.findById(data.user.id);
    if (!profile) throw new AppError('Account profile not found', 403);
    if (profile.status === 'pending') throw new AppError('Account pending approval', 403);
    if (profile.status === 'disabled') throw new AppError('Account disabled', 403);

    const metaName =
      data.user.user_metadata?.full_name ||
      data.user.user_metadata?.name ||
      data.user.user_metadata?.display_name ||
      '';

    req.user = {
      ...profile,
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName || metaName,
      roles: [profile.role],
      capabilities: await RoleService.resolveUserCapabilities(profile),
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!allowedRoles.includes(req.user.role)) return next(new AppError('You do not have permission to perform this action', 403));
    return next();
  };
}

/** Require a single capability. */
export function requirePermission(capability) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!userHasCapability(req.user, capability)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    return next();
  };
}

/** Require at least one of the given capabilities (e.g. any tier of employee editing). */
export function requireAnyPermission(capabilities) {
  const needed = Array.isArray(capabilities) ? capabilities : [capabilities];
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!userHasAnyCapability(req.user, needed)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    return next();
  };
}
