# Authentication & Security Documentation

This document summarizes the recent changes made to the EIMS authentication flow, the purpose of these features, and troubleshooting steps for common errors.

---

## 1. What We Changed

### A. Mandatory Email OTP Login
- We completely removed the old Authenticator App MFA system (which required QR codes).
- We implemented a mandatory **Email-based OTP** for all users logging in.
- **Super Admin Exception:** The Super Admin role completely bypasses the OTP requirement and is logged in immediately with a password.

### B. Domain Restrictions for Registration
- The system now strictly enforces domain restrictions when creating new accounts.
- The only allowed domains are:
  - `@bigoutsource.com`
  - `@outlook.com`
  - `@bigoutsource.ph`
- The frontend `RegisterForm` blocks users from progressing past the first step if they enter an unauthorized domain (e.g., `@gmail.com` or `@yahoo.com`).

### C. Live Email Existence Check
- Before proceeding to the second step of registration, the system automatically checks the database to see if the email address is already registered. If it is, it stops the registration immediately.

---

## 2. Purpose of Features

- **Domain Whitelisting (Account Not Allowed):** 
  To ensure that only legitimate, authorized employees or specific contractors within the BigOutsource ecosystem can access the EIMS. This prevents random external users from registering.
- **Email OTP (MFA):** 
  Provides robust Two-Factor Authentication without forcing employees to download third-party authenticator apps. It securely relies on the company's internal email infrastructure (Outlook/Snappy).
- **Super Admin Bypass:** 
  Ensures that the core administrator always has a "break-glass" way to access the system, even if the company's email servers experience an outage and cannot deliver OTP emails.

### D. Time Limits & Session Expiration
- **OTP Code Lifespan:** Once requested, the 6-digit OTP code is valid for exactly **5 minutes**. If it is not used in that time, it expires and the user must request a new one.
- **Session Lifespan (Next OTP Requirement):** After a successful login, the user's session—and their device's "trusted" status—is valid for **30 minutes**. This means they can stay logged in, or log out and log back in without an OTP, for 30 minutes. Once 30 minutes have passed, the session expires and the next login will require a fresh OTP.

---

## 3. Common Errors & Troubleshooting

### Registration Errors

**Error:** `Only @bigoutsource.com, @outlook.com, and @bigoutsource.ph emails are allowed.`
* **Cause:** The user attempted to register with an unauthorized email provider (like Gmail).
* **Fix:** Instruct the user to use their official company-provided email address.

**Error:** `This email is already registered.`
* **Cause:** An account with this email address already exists in the database.
* **Fix:** The user should navigate to the Login page instead of creating a new account.

### Login & OTP Errors

**Error:** `Invalid email or password`
* **Cause:** The user typed the wrong credentials, or their account hasn't been created yet.
* **Fix:** Verify that IT or an Admin has actually registered the account.

**Error:** `Invalid verification code`
* **Cause:** The user typed the 6-digit OTP incorrectly, OR the 5-minute timer expired.
* **Fix:** The user must go back to the login screen, enter their password again to generate a *new* 6-digit code, and enter it within 5 minutes.

**Error:** `Too many login attempts. Try again later.`
* **Cause:** The user attempted to log in or guess an OTP more than 10 times in a 15-minute window. This is an automated security lock.
* **Fix:** Wait 15 minutes for the rate-limiter to reset.

**Error:** `Failed to send verification email` (Backend Error)
* **Cause:** The EIMS backend could not connect to the SMTP server (Mailpit or Outlook), OR the destination email address bounced the message immediately.
* **Fix:** 
  1. Check if the `SMTP_HOST` and `SMTP_PORT` environment variables are correct.
  2. Verify that the employee's email inbox actually exists and has been fully activated by IT.

---

## 4. Deploying Updates (Pulling from GitHub)

When new changes are pushed to the GitHub repository (like new dependencies or updated features), follow these steps on the server to safely pull the changes and restart the system.

### Step 1: Pull Latest Code
Open your terminal in the project root directory (`bigoutsource-eims`) and run:
```bash
git pull origin main
```
*(Note: Change `main` if you are using a different branch).*

### Step 2: Check for Environment Variable Updates
Because `.env` files are not tracked by GitHub (for security), check if any new environment variables were added to `.env.example`. If so, manually add them to your local `backend/.env` or `frontend/.env` files before rebuilding.

### Step 3: Update Dependencies & Rebuild Containers
Because this project runs on Docker Compose, the safest way to install new dependencies (like new NPM packages in the frontend or backend) is to completely rebuild the Docker images. Run this command:
```bash
docker compose up -d --build
```
This command will:
- Read the updated `package.json` files.
- Automatically run `npm install` inside the secure Docker containers.
- Restart the backend, frontend, and database seamlessly in the background (`-d`).

### Step 4: Verify the System
Once the containers are built and started, verify everything is running smoothly:
```bash
docker compose ps
```
You can also check the backend logs to ensure it connected to the database and didn't crash:
```bash
docker compose logs --tail=50 -f backend
```
