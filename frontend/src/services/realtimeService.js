import { io } from 'socket.io-client';
import { getAuthToken } from '../lib/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function socketBaseUrl() {
  try {
    const origin = new URL(API_BASE_URL).origin;
    // If the origin is localhost but we are accessing the site via a network IP,
    // we should use the current window's hostname to avoid connecting to the wrong localhost.
    if (origin.includes('localhost') && typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
      return `http://${window.location.hostname}:5001`;
    }
    return origin;
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
    
    const url = socketBaseUrl();
    fetch(`${API_BASE_URL.replace(/\/api\/?$/, '')}/health?socket_error=Connecting_to_${encodeURIComponent(url)}`).catch(() => {});
    
    socketInstance = io(url, {
      auth: { token },
      transports: ['websocket'],
    });

    socketInstance.on('disconnect', () => {
      // Optional logging or reconnection logic
    });

    socketInstance.on('connect_error', (error) => {
      fetch(`${API_BASE_URL.replace(/\/api\/?$/, '')}/health?socket_error=${encodeURIComponent(error.message)}`).catch(() => {});
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

  // Request sync immediately in case we missed the initial broadcast upon connection
  if (socket.connected) {
    socket.emit('presence:request_sync');
  } else {
    socket.once('connect', () => {
      socket.emit('presence:request_sync');
    });
  }

  return () => {
    socket.off('presence:sync', onSync);
    socket.off('presence:join', onJoin);
    socket.off('presence:leave', onLeave);
    releaseSocket();
  };
}
