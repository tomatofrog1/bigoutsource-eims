import { io } from 'socket.io-client';
import { getAuthToken } from '../lib/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function socketBaseUrl() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return String(API_BASE_URL || '').replace(/\/api\/?$/, '');
  }
}

let socketInstance = null;
let connectionCount = 0;

function getSocket() {
  if (!socketInstance) {
    const token = getAuthToken();
    if (!token) return null;
    
    socketInstance = io(socketBaseUrl(), {
      auth: { token },
      transports: ['websocket'],
    });

    socketInstance.on('disconnect', () => {
      // Optional logging or reconnection logic
    });
  }
  return socketInstance;
}

function retainSocket() {
  const socket = getSocket();
  if (socket) connectionCount++;
  return socket;
}

function releaseSocket() {
  if (connectionCount > 0) {
    connectionCount--;
  }
  
  if (connectionCount === 0 && socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export function connectAccessSocket({ onAccessUpdated, onAccessRevoked }) {
  const socket = retainSocket();
  if (!socket) return () => {};

  socket.on('access:updated', onAccessUpdated);
  socket.on('access:revoked', onAccessRevoked);

  return () => {
    socket.off('access:updated', onAccessUpdated);
    socket.off('access:revoked', onAccessRevoked);
    releaseSocket();
  };
}

export function connectPresenceSocket({ onSync, onJoin, onLeave }) {
  const socket = retainSocket();
  if (!socket) return () => {};

  socket.on('presence:sync', onSync);
  socket.on('presence:join', onJoin);
  socket.on('presence:leave', onLeave);

  return () => {
    socket.off('presence:sync', onSync);
    socket.off('presence:join', onJoin);
    socket.off('presence:leave', onLeave);
    releaseSocket();
  };
}
