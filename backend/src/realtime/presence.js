// In-memory store for tracking online users.
// Keys are user IDs (string).
// Values are objects: { profile: { id, email, fullName, role }, socketIds: Set<string> }
const onlineUsers = new Map();

/**
 * Adds a user connection to the presence tracking.
 * Returns true if this is the user's first connection (i.e., they just came online).
 */
export function addConnection(userProfile, socketId) {
  const userId = userProfile.id;
  if (onlineUsers.has(userId)) {
    const data = onlineUsers.get(userId);
    data.socketIds.add(socketId);
    return false; // Already online
  } else {
    onlineUsers.set(userId, {
      profile: {
        user_id: userProfile.id,
        email: userProfile.email,
        full_name: userProfile.fullName,
        online_at: new Date().toISOString()
      },
      socketIds: new Set([socketId])
    });
    return true; // Just came online
  }
}

/**
 * Removes a user connection from the presence tracking.
 * Returns the user's profile if this was their last connection (i.e., they just went offline), otherwise null.
 */
export function removeConnection(userId, socketId) {
  if (!onlineUsers.has(userId)) return null;

  const data = onlineUsers.get(userId);
  data.socketIds.delete(socketId);

  if (data.socketIds.size === 0) {
    const profile = data.profile;
    onlineUsers.delete(userId);
    return profile; // Went offline
  }

  return null; // Still online in other tabs
}

/**
 * Returns an array of all currently online user profiles.
 */
export function getOnlineUsers() {
  return Array.from(onlineUsers.values()).map(data => data.profile);
}
