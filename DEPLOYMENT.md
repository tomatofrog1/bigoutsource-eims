# Self-Hosting Deployment Guide

If your company wants to host the application on their own infrastructure (like an AWS EC2 instance, a DigitalOcean Droplet, or an internal company server), you will use **Docker Compose**. 

The existing `docker-compose.yml` is specifically configured for **Local Development** (it watches for code changes and overrides files). For production, you need a setup that builds the final, optimized version of the code.

Here is the step-by-step process.

---

## Step 1: Prepare the Server
1. Provision a Linux server (Ubuntu 22.04 or 24.04 is recommended).
2. SSH into the server.
3. Install **Docker** and **Docker Compose** on the server.
4. Clone this repository to the server:
   ```bash
   git clone https://github.com/your-username/bigoutsource-eims.git
   cd bigoutsource-eims
   ```

## Step 2: Create the Production Configuration

Do not edit the existing `docker-compose.yml`. Instead, create a new file on the server named `docker-compose.prod.yml` and paste the following:

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    # Ensure Prisma generates the client and updates the database structure on startup
    command: sh -c "npx prisma generate && npx prisma db push && npm start"
    ports:
      - "5001:5001"
    env_file:
      - ./backend/.env
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/eims
    depends_on:
      - db
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      # Vite requires variables at BUILD time, so we pass them as args here
      args:
        - VITE_API_BASE_URL=https://api.yourcompany.com
        - VITE_SUPABASE_URL=https://your-project-ref.supabase.co
        - VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
    ports:
      - "3000:80" # Maps server port 3000 to the container's Nginx port 80
    depends_on:
      - backend
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    restart: always
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=eims
    volumes:
      - pgdata_prod:/var/lib/postgresql/data

volumes:
  pgdata_prod:
```

## Step 3: Set Up Environment Variables

Create the `.env` file for the backend on the server (`backend/.env`). 

```env
PORT=5001
NODE_ENV=production

# Database (Leave this exact string, it uses the Docker network)
DATABASE_URL=postgresql://postgres:postgres@db:5432/eims

# Supabase Auth
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
*(Note: The frontend variables are handled inside the `docker-compose.prod.yml` file under `args`, so you don't need a frontend `.env` file on the server.)*

## Step 4: Boot the Server

Run the following command to build the production images and start the system in the background:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

**What happens here?**
* The `frontend` Dockerfile builds the React app into static HTML/JS files and serves them using Nginx (which is blazing fast).
* The `backend` Dockerfile builds the Node.js API. It will automatically run `npx prisma db push` to make sure the production database tables are ready.
* The system is now live on the server! 
  * Frontend: `http://SERVER_IP:3000`
  * Backend API: `http://SERVER_IP:5001`

---

## Step 5: Domain Names and Security (HTTPS)

You should never serve a company app over raw HTTP with IP addresses. You need a domain name and an SSL certificate.

1. **DNS Setup:** Go to your domain provider and point two subdomains to your server's IP address:
   * `eims.yourcompany.com`
   * `api.yourcompany.com`
2. **Reverse Proxy:** Install a Reverse Proxy on your server. The easiest, most visual tool for this is **Nginx Proxy Manager** (which also runs on Docker).
3. **Routing Traffic:** 
   * Configure Nginx Proxy Manager to route traffic from `eims.yourcompany.com` to port `3000`.
   * Configure it to route `api.yourcompany.com` to port `5001`.
4. **SSL:** Click "Request Let's Encrypt Certificate" inside Nginx Proxy Manager to instantly secure your application with `https://`.

Your company's self-hosted deployment is now complete and secure!
