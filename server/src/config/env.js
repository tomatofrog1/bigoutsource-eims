import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(__dirname, '../../.env'), quiet: true });
dotenv.config({ path: resolve(__dirname, '../../../.env'), quiet: true });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || supabaseServiceRoleKey;
const nodeEnv = process.env.NODE_ENV || 'development';
const useLocalSeedAdmin = nodeEnv !== 'production';

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
  nodeEnv,
  port: Number(process.env.PORT || 5001),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  supabase: {
    url: supabaseUrl,
    serviceRoleKey: supabaseServiceRoleKey,
    publishableKey: supabasePublishableKey,
  },
  seedSuperAdmin: {
    email: process.env.SEED_SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || (useLocalSeedAdmin ? 'kamote@gmail.com' : ''),
    password: process.env.SEED_SUPER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || (useLocalSeedAdmin ? 'kamote123' : ''),
    fullName: process.env.SEED_SUPER_ADMIN_FULL_NAME || (useLocalSeedAdmin ? 'Local Super Admin' : 'System Administrator'),
    department: process.env.SEED_SUPER_ADMIN_DEPARTMENT || 'Administration',
    site: process.env.SEED_SUPER_ADMIN_SITE || 'HQ',
  },
};
