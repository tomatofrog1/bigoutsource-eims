export function publicUserPayload(profile, capabilities = []) {
  let overrides = null;
  if (profile.capabilityOverrides === null) {
    overrides = null;
  } else if (Array.isArray(profile.capabilityOverrides)) {
    if (profile.capabilityOverrides.length === 0 || profile.capabilityOverrides.includes('__INHERIT__')) {
      overrides = null;
    } else if (profile.capabilityOverrides.length === 1 && profile.capabilityOverrides[0] === '__NONE__') {
      overrides = [];
    } else {
      overrides = profile.capabilityOverrides;
    }
  }

  return {
    id: profile.id,
    uid: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    roles: [profile.role],
    capabilities,
    capabilityOverrides: overrides,
    status: profile.status,
    department: profile.department,
    site: profile.site,
    siteId: profile.site,
    approvedBy: profile.approvedBy,
    approvedAt: profile.approvedAt,
    mfaEnabled: profile.mfaEnabled || false,
  };
}
