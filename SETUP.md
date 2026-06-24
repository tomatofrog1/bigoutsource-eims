# Installation & Setup Guide

This guide provides step-by-step instructions on how to run the Employee Information Management System (EIMS) on different operating systems (Windows, macOS, Linux).

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:
- **Git** ([Download](https://git-scm.com/downloads))
- **Node.js** (v18 or higher) ([Download](https://nodejs.org/))
- **Docker Desktop** (Recommended for easiest database setup) ([Download](https://www.docker.com/products/docker-desktop/))

### OS-Specific Notes
- **Windows:** If using Docker, ensure **WSL 2** (Windows Subsystem for Linux) is installed and enabled in Docker Desktop settings.
- **macOS/Linux:** Ensure the Docker daemon is running before executing Docker commands.

---

## 🛠️ Step 1: Clone the Repository

Open your terminal or command prompt and run:

```bash
git clone https://github.com/your-username/bigoutsource-eims.git
cd bigoutsource-eims
```
*(Note: Replace the URL with your actual repository URL)*

---

## ⚙️ Step 2: Environment Variables Configuration

You need to set up environment variables for both the frontend and backend. 

### 1. Frontend Environment (`frontend/.env`)
Create a `.env` file inside the `frontend` folder:
```env
VITE_API_BASE_URL=http://localhost:5001/api
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

### 2. Backend Environment (`backend/.env`)
Create a `.env` file inside the `backend` folder:
```env
# Server
PORT=5001
NODE_ENV=development

# Database (Default uses the local Docker db service)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/eims

# Supabase Auth
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Super Admin Seed Data (Optional)
SEED_SUPER_ADMIN_EMAIL=admin@example.com
SEED_SUPER_ADMIN_PASSWORD=adminpassword
```
*(Note: If using Docker Compose, the `DATABASE_URL` is automatically overridden in `docker-compose.yml` to connect to the internal Docker network `db:5432`)*

---

## 🚀 Step 3: Running the Application

You have two ways to run the project. We highly recommend **Option A** (Docker) as it spins up the Database, Backend, and Frontend simultaneously without extra configuration.

### Option A: Using Docker Compose (Recommended)
This method works seamlessly across Windows, macOS, and Linux.

1. Ensure Docker Desktop is running.
2. From the root directory (`bigoutsource-eims`), run:
   ```bash
   docker compose up --build
   ```
3. Wait for the containers to build and start. Once running, access:
   - **Frontend UI:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:5001](http://localhost:5001)
   - **Database:** `localhost:5433` (Credentials: User=`postgres`, Pass=`postgres`, DB=`eims`)

To stop the application, press `Ctrl+C` in the terminal, or run:
```bash
docker compose down
```

### Option B: Manual Setup (Without Docker)

If you prefer running the Node applications directly on your host machine. You still need a PostgreSQL database running, which you can spin up via Docker or install locally.

#### 1. Setup the Database
If you only want to run the database via Docker:
```bash
docker compose up -d db
```

#### 2. Start the Backend
Open a new terminal window:
```bash
cd backend

# Install dependencies
npm install

# Run Prisma database migrations to create tables
npx prisma migrate dev
npx prisma generate

# Start the backend server
npm run dev
```
*The backend server will start on `http://localhost:5001`.*

#### 3. Start the Frontend
Open another terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start the React app
npm run dev
```
*The React app will start on `http://localhost:3000`.*

---

## 🔐 Super Admin Access & Seeding

In local development, the system automatically seeds a Super Admin account using the `SEED_SUPER_ADMIN_*` variables in `backend/.env`.
If you leave them blank, the default fallback is:
- **Email:** `kamote@gmail.com`
- **Password:** `kamote123`

You can use these credentials to log in on the frontend.
