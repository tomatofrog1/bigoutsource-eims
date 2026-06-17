import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { supabaseAuth } from '../config/supabase.js';
import { UserProfileModel } from '../modules/userProfile/userProfile.model.js';
import { RoleService } from '../modules/role/role.service.js';
import { setRealtimeServer } from './accessEvents.js';

const localDevOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):30\d{2}$/;

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return env.corsOrigins.includes(origin) || (env.nodeEnv === 'development' && localDevOriginPattern.test(origin));
}

function tokenFromHandshake(socket) {
  const authToken = socket.handshake.auth?.token;
  if (authToken) return authToken;

  const header = socket.handshake.headers?.authorization || '';
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
}

export function initRealtime(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = tokenFromHandshake(socket);
      if (!token) throw new Error('Authentication required');

      const { data, error } = await supabaseAuth.auth.getUser(token);
      if (error || !data.user) throw new Error('Invalid or expired token');

      const profile = await UserProfileModel.findById(data.user.id);
      if (!profile || profile.status !== 'active') throw new Error('Account is not active');

      socket.user = {
        id: profile.id,
        role: profile.role,
        capabilities: await RoleService.resolveUserCapabilities(profile),
      };

      next();
    } catch (error) {
      next(error);
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);
  });

  setRealtimeServer(io);
  return io;
}
