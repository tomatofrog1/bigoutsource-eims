import { prisma } from '../config/db.js';

function normalize(row) {
  if (!row) return null;

  return {
    id: row.id,
    uid: row.id,
    email: row.email,
    fullName: row.fullName || '',
    role: row.role || 'viewer',
    roles: [row.role || 'viewer'],
    status: row.status || 'pending',
    department: row.department || 'Unassigned',
    site: row.site || 'HQ',
    capabilityOverrides: Array.isArray(row.capabilityOverrides) ? row.capabilityOverrides : null,
    approvedBy: row.approvedById || null,
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    createdAt: row.createdAt ? row.createdAt.toISOString() : '',
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : '',
  };
}

export const UserProfileModel = {
  async findAll(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;

    const rows = await prisma.userProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(normalize);
  },

  async findById(id) {
    const row = await prisma.userProfile.findUnique({
      where: { id },
    });
    return normalize(row);
  },

  async findByEmail(email) {
    const row = await prisma.userProfile.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });
    return normalize(row);
  },

  async create(data) {
    const row = await prisma.userProfile.create({
      data: {
        id: data.id,
        email: String(data.email).trim().toLowerCase(),
        fullName: String(data.fullName).trim(),
        role: data.role,
        status: data.status,
        department: String(data.department || 'Unassigned').trim() || 'Unassigned',
        site: String(data.site || 'HQ').trim() || 'HQ',
        approvedById: data.approvedBy,
        approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined,
        capabilityOverrides: Array.isArray(data.capabilityOverrides) ? data.capabilityOverrides : [],
        passwordHash: data.passwordHash || '',
      },
    });
    return normalize(row);
  },

  async update(id, data) {
    const updateData = {};
    if (data.email !== undefined) updateData.email = String(data.email).trim().toLowerCase();
    if (data.fullName !== undefined) updateData.fullName = String(data.fullName).trim();
    if (data.role !== undefined) updateData.role = data.role;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.department !== undefined) updateData.department = String(data.department || 'Unassigned').trim() || 'Unassigned';
    if (data.site !== undefined) updateData.site = String(data.site || 'HQ').trim() || 'HQ';
    if (data.approvedBy !== undefined) updateData.approvedById = data.approvedBy;
    if (data.approvedAt !== undefined) updateData.approvedAt = data.approvedAt ? new Date(data.approvedAt) : null;
    if (data.capabilityOverrides !== undefined) updateData.capabilityOverrides = Array.isArray(data.capabilityOverrides) ? data.capabilityOverrides : [];
    if (data.passwordHash !== undefined) updateData.passwordHash = data.passwordHash;

    const row = await prisma.userProfile.update({
      where: { id },
      data: updateData,
    });
    return normalize(row);
  },

  async remove(id) {
    await prisma.userProfile.delete({ where: { id } });
    return true;
  }
};
