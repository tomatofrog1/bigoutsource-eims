import { supabaseAdmin, supabaseAuth } from '../config/supabase.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/apiResponse.js';
import { UserProfileModel } from '../models/userProfile.model.js';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function publicUser(profile) {
  return {
    id: profile.id,
    uid: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    roles: [profile.role],
    status: profile.status,
    department: profile.department,
    site: profile.site,
    siteId: profile.site,
    approvedBy: profile.approvedBy,
    approvedAt: profile.approvedAt,
  };
}

function authErrorMessage(error) {
  const message = error?.message || '';
  if (/already|duplicate|registered/i.test(message)) return 'An account with this email already exists';
  return message || 'Authentication request failed';
}

async function findAuthUserByEmail(email) {
  const target = normalizeEmail(email);
  let page = 1;

  while (page < 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new AppError(error.message, 500);

    const user = data.users.find((item) => normalizeEmail(item.email) === target);
    if (user) return user;
    if (data.users.length < 1000) return null;
    page += 1;
  }

  return null;
}

async function createConfirmedAuthUser({ email, password, fullName, department, site }) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      department,
      site,
    },
  });

  if (error) throw new AppError(authErrorMessage(error), /already|duplicate|registered/i.test(error.message || '') ? 409 : 400);
  if (!data.user) throw new AppError('Unable to create user account', 500);
  return data.user;
}

async function assertActiveProfile(userId) {
  const profile = await UserProfileModel.findById(userId);

  if (!profile) {
    throw new AppError('Account profile not found. Please contact the Super Admin.', 403);
  }

  if (profile.status === 'pending') {
    throw new AppError('Your account is pending Super Admin approval.', 403);
  }

  if (profile.status === 'disabled') {
    throw new AppError('Your account has been disabled. Please contact the Super Admin.', 403);
  }

  return profile;
}

export const AuthService = {
  async register({ email, password, fullName, department = 'Unassigned', site = 'HQ' }) {
    const normalizedEmail = normalizeEmail(email);
    const existingProfile = await UserProfileModel.findByEmail(normalizedEmail);
    if (existingProfile) throw new AppError('An account with this email already exists', 409);

    const authUser = await createConfirmedAuthUser({
      email: normalizedEmail,
      password,
      fullName,
      department,
      site,
    });

    try {
      const profile = await UserProfileModel.create({
        id: authUser.id,
        email: normalizedEmail,
        fullName,
        role: 'viewer',
        status: 'pending',
        department,
        site,
      });

      return {
        user: publicUser(profile),
        message: 'Account created and pending Super Admin approval.',
      };
    } catch (error) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.id).catch(() => {});
      throw error;
    }
  },

  async login({ email, password }) {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });

    if (error || !data.session || !data.user) {
      throw new AppError('Invalid email or password', 401);
    }

    const profile = await assertActiveProfile(data.user.id);

    return {
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: publicUser(profile),
    };
  },

  me(user) {
    return publicUser(user);
  },

  async bootstrapSuperAdmin() {
    const email = normalizeEmail(env.seedSuperAdmin.email);
    const password = env.seedSuperAdmin.password;

    if (!email || !password) return;

    const existingProfile = await UserProfileModel.findByEmail(email);
    if (existingProfile) {
      if (existingProfile.role !== 'super_admin' || existingProfile.status !== 'active') {
        await UserProfileModel.update(existingProfile.id, {
          role: 'super_admin',
          status: 'active',
          approvedAt: existingProfile.approvedAt || new Date().toISOString(),
        });
      }
      return;
    }

    let authUser = await findAuthUserByEmail(email);
    if (!authUser) {
      authUser = await createConfirmedAuthUser({
        email,
        password,
        fullName: env.seedSuperAdmin.fullName,
        department: env.seedSuperAdmin.department,
        site: env.seedSuperAdmin.site,
      });
    }

    await UserProfileModel.create({
      id: authUser.id,
      email,
      fullName: env.seedSuperAdmin.fullName,
      role: 'super_admin',
      status: 'active',
      department: env.seedSuperAdmin.department,
      site: env.seedSuperAdmin.site,
      approvedAt: new Date().toISOString(),
    });
  },
};
