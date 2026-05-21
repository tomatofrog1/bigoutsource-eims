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
JWT_SECRET=replace_with_a_long_random_secret
ADMIN_EMAIL=admin@bigoutsource.com
ADMIN_PASSWORD=Admin123!
```

Keep the service-role key only in `server/.env`. Do not expose it through a `VITE_` frontend variable.

4. Start the API:

```bash
npm run dev
```

Default API URL: `http://localhost:5000`

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
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/employees`
- `POST /api/employees`
- `PUT /api/employees/:id`
- `DELETE /api/employees/:id`
- `GET /api/sites`
- `GET /api/devices`
- `GET /api/audit-logs`
