import { RoleModel } from './role.model.js';
import { UserProfileModel } from '../userProfile/userProfile.model.js';
import {
  capabilitiesForRole as fallbackCapabilities,
  ALL_CAPABILITIES,
  META_CAPABILITIES,
  CAPABILITIES,
} from '../../config/capabilities.js';
import { supabaseRequest } from '../../config/supabase.js';
import { AppError } from '../../utils/apiResponse.js';
import { emitUserAccessUpdated } from '../../realtime/accessEvents.js';
import { publicUserPayload } from '../../utils/publicUser.js';

/**
 * Roles live in the database. This service resolves a role slug to its
 * capabilities with a short in-memory cache so the hot path (auth middleware,
 * every request) doesn't hit the DB each time, and provides guard-railed CRUD
 * for the Super Admin role editor.
 */

const TTL_MS = 30_000;
let cache = { at: 0, bySlug: new Map() };

// Meta-capabilities are Super-Admin-only and never grantable to other roles.
const GRANTABLE_CAPABILITIES = ALL_CAPABILITIES.filter((cap) => !META_CAPABILITIES.includes(cap));

function inheritsRoleCapabilities(profile, slug) {
  return profile.role === slug && !Array.isArray(profile.capabilityOverrides);
}

async function loadRoles() {
  const now = Date.now();
  if (cache.bySlug.size && now - cache.at < TTL_MS) return cache.bySlug;
  try {
    const roles = await RoleModel.findAll();
    cache = { at: now, bySlug: new Map(roles.map((role) => [role.slug, role])) };
  } catch {
    // Keep serving the previous cache on transient DB errors.
  }
  return cache.bySlug;
}

function slugify(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function sanitizeCapabilities(input) {
  if (!Array.isArray(input)) throw new AppError('capabilities must be an array', 400);
  const set = new Set();
  for (const cap of input) {
    if (typeof cap !== 'string') continue;
    if (META_CAPABILITIES.includes(cap)) {
      throw new AppError(`"${cap}" is reserved for Super Admin and cannot be granted`, 400);
    }
    if (!GRANTABLE_CAPABILITIES.includes(cap)) {
      throw new AppError(`Unknown capability "${cap}"`, 400);
    }
    set.add(cap);
  }
  return [...set];
}

async function isInUse(slug) {
  const rows = await supabaseRequest('user_profiles', {
    searchParams: { select: 'id', role: `eq.${slug}`, limit: '1' },
  });
  return Array.isArray(rows) && rows.length > 0;
}

export const RoleService = {
  async list() {
    const roles = await RoleModel.findAll();
    return roles.map((role) => (role.slug === 'super_admin' ? { ...role, capabilities: [...ALL_CAPABILITIES] } : role));
  },

  /** The grantable capability catalog (key + label), for the role editor checklist. */
  catalog() {
    return GRANTABLE_CAPABILITIES.map((key) => ({ key, label: CAPABILITIES[key] }));
  },

  async resolveCapabilities(slug) {
    if (slug === 'super_admin') return [...ALL_CAPABILITIES];

    const roles = await loadRoles();
    const role = roles.get(slug);
    if (role) return role.capabilities;
    return fallbackCapabilities(slug);
  },

  /** Effective capabilities for an account: per-account override if set, else the role's. */
  async resolveUserCapabilities(profile) {
    if (profile?.role === 'super_admin') return [...ALL_CAPABILITIES];
    if (profile && Array.isArray(profile.capabilityOverrides)) return profile.capabilityOverrides;
    return this.resolveCapabilities(profile?.role);
  },

  async create({ name, capabilities }) {
    const cleanName = String(name || '').trim();
    if (cleanName.length < 2) throw new AppError('Role name is required', 400);

    const slug = slugify(cleanName);
    if (!slug) throw new AppError('Role name must contain letters or numbers', 400);

    const existing = await RoleModel.findBySlug(slug);
    if (existing) throw new AppError('A role with a similar name already exists', 409);

    const role = await RoleModel.create({
      slug,
      name: cleanName,
      isSystem: false,
      capabilities: sanitizeCapabilities(capabilities),
    });
    this.invalidate();
    return role;
  },

  async update(slug, { name, capabilities }) {
    const role = await RoleModel.findBySlug(slug);
    if (!role) throw new AppError('Role not found', 404);
    if (slug === 'super_admin') throw new AppError('The Super Admin role cannot be modified', 400);

    const updates = {};
    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (cleanName.length < 2) throw new AppError('Role name is required', 400);
      updates.name = cleanName;
    }
    if (capabilities !== undefined) {
      updates.capabilities = sanitizeCapabilities(capabilities);
    }
    if (!Object.keys(updates).length) throw new AppError('Nothing to update', 400);

    const updated = await RoleModel.update(slug, updates);
    this.invalidate();
    await this.emitRoleAccessChanged(slug, 'role.permissions_updated');
    return updated;
  },

  async remove(slug) {
    const role = await RoleModel.findBySlug(slug);
    if (!role) throw new AppError('Role not found', 404);
    if (role.isSystem) throw new AppError('Built-in roles cannot be deleted', 400);
    if (await isInUse(slug)) {
      throw new AppError('This role is assigned to one or more accounts. Reassign them first.', 400);
    }

    await RoleModel.remove(slug);
    this.invalidate();
    return { slug };
  },

  /** Call after creating/editing/deleting a role so changes take effect immediately. */
  invalidate() {
    cache = { at: 0, bySlug: new Map() };
  },

  async emitRoleAccessChanged(slug, reason) {
    const profiles = await UserProfileModel.findAll({ status: 'active' });
    const affectedProfiles = profiles.filter((profile) => inheritsRoleCapabilities(profile, slug));

    for (const profile of affectedProfiles) {
      const capabilities = await this.resolveUserCapabilities(profile);
      emitUserAccessUpdated(profile.id, publicUserPayload(profile, capabilities), reason);
    }
  },
};
