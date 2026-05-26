# Employee Tracker API

Node.js and Express backend for the Employee Tracking System, backed by the Supabase `employees` table.

## Setup

1. Install dependencies:

```bash
cd server
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Update `.env`:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
SEED_SUPER_ADMIN_EMAIL=kamote@gmail.com
SEED_SUPER_ADMIN_PASSWORD=kamote123
SEED_SUPER_ADMIN_FULL_NAME=Local Super Admin
SEED_SUPER_ADMIN_DEPARTMENT=Administration
SEED_SUPER_ADMIN_SITE=HQ
```

In local development, the API uses `kamote@gmail.com` / `kamote123` as the seeded super admin when the `SEED_SUPER_ADMIN_*` variables are unset. Production does not use this fallback.

Keep the service-role key only in `server/.env`. Do not expose it through a `VITE_` frontend variable.

4. Run `server/sql/auth_setup.sql` in the Supabase SQL Editor to create/update `public.user_profiles`.

5. Start the API:

```bash
npm run dev
```

Default API URL: `http://localhost:5001`

## Supabase Table

The server expects a single `employees` table with these columns:

```sql
id text primary key,
name text not null,
account text not null,
site text not null,
phone_number text,
address text,
bigoutsource_email text,
email_password text,
lms_account text,
status text,
pc_name text,
rustdesk_id text,
remote_id text,
eset text,
bios_date date,
activitywatch text,
windows_license_key text,
created_at timestamptz,
updated_at timestamptz
```

## Main Endpoints

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/users`
- `PUT /api/users/:id/approve`
- `GET /api/employees`
- `POST /api/employees`
- `PUT /api/employees/:id`
- `DELETE /api/employees/:id`
- `GET /api/sites`
- `GET /api/devices`
- `GET /api/audit-logs`
