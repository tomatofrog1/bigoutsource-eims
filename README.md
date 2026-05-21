# Employee Tracking System

React + Vite frontend with a Node.js and Express API backed by Supabase.

## Project Layout

```text
eims/
├── src/                 # React + Vite frontend
├── server/              # Express API for Supabase
├── package.json         # Frontend scripts
└── README.md
```

The frontend remains at the repository root. Backend code lives in `server/`.

## Frontend Setup

```bash
npm install
copy .env.example .env
npm run dev
```

Set the backend URL and browser-safe Supabase credentials in `.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

Default frontend URL: `http://localhost:3000`

## Backend Setup

```bash
cd server
npm install
copy .env.example .env
```

Set the Supabase server credentials in `server/.env`:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
SEED_SUPER_ADMIN_EMAIL=admin@bigoutsource.com
SEED_SUPER_ADMIN_PASSWORD=replace_with_a_strong_temporary_password
SEED_SUPER_ADMIN_FULL_NAME=System Administrator
SEED_SUPER_ADMIN_DEPARTMENT=Administration
SEED_SUPER_ADMIN_SITE=HQ
```

Keep the service-role key out of root `.env` and out of any `VITE_` variable.

Run `server/sql/auth_setup.sql` in the Supabase SQL Editor before starting the API. It creates/updates `public.user_profiles` for pending account approvals.

Start the API:

```bash
npm run dev
```

Default backend URL: `http://localhost:5000`
