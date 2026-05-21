import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(__dirname, '../../.env'), quiet: true });
dotenv.config({ path: resolve(__dirname, '../../../.env'), quiet: true });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const required = [
  ['SUPABASE_URL', supabaseUrl],
  ['SUPABASE_SERVICE_ROLE_KEY', supabaseServiceRoleKey],
];

for (const [key, value] of required) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  supabase: {
    url: supabaseUrl,
    serviceRoleKey: supabaseServiceRoleKey,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'development-only-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  admin: {
    email: process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || 'admin@bigoutsource.com',
    password: process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || '',
  },
};
