import app from './app.js';
import { env } from './config/env.js';
import { AuthService } from './services/auth.service.js';

let server;

try {
  await AuthService.bootstrapSuperAdmin();
  server = app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
  });
} catch (error) {
  console.error('Unable to initialize authentication:', error.message);
  process.exit(1);
}

async function shutdown(signal) {
  console.log(`${signal} received. Closing server.`);
  if (!server) {
    process.exit(0);
    return;
  }
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
