# System Workflow & Architecture Guide

This document explains the development lifecycle, how code and data are managed, and how the application operates in a real-world production environment.

---

## 1. Adding Features and Pushing to GitHub

GitHub is a version control system designed to track changes to **code**, not data. 

When a developer adds a new feature (like a new button on the frontend or a new API route on the backend):
1. **Local Development:** The developer writes the code and tests it locally on their machine.
2. **Commit & Push:** They save (commit) these code changes and upload (push) them to GitHub.
3. **Pulling Updates:** Other developers on the team run a `git pull` command to download the newest code to their own computers. Their local servers will restart, and they will see the new button or new API route.

---

## 2. The Database: Does Data Sync via GitHub?

**Short Answer: No.**

It is a common point of confusion for newer developers, but **your local database is completely isolated from GitHub.**

Here is what happens if Developer A creates a new employee named "John Doe" on their local machine and then pushes their code to GitHub:
* GitHub **does not** receive "John Doe". GitHub only looks at files (like `.js`, `.css`, `.html`). The database lives entirely inside your local Docker container, not in the code files.
* When Developer B pulls from GitHub, they get any new code Developer A wrote, but their local database will **not** have "John Doe". Developer B's database remains exactly as they left it.

### What about Database *Structure*?
While the *data* (the employees, the logs) does not sync, the *structure* of the database does.
We use **Prisma** to manage our database structure. If a developer needs to add a new column to the database (e.g., adding a `phone_number` field to the Employee table):
1. They edit the `backend/prisma/schema.prisma` file.
2. Because this is a **file**, it gets pushed to GitHub.
3. Other developers pull the update, see the modified `schema.prisma` file, and run `npx prisma db push` to update the structure of their local databases to include the new `phone_number` column. Their existing data remains safe.

---

## 3. Production: Running on the Company Server

When the development is finished and the system is ready for real users, it is deployed to a **Production Server** (a computer owned by the company or hosted on the cloud like AWS, DigitalOcean, or an internal server).

### The Production Architecture
In production, the setup changes from "everyone has their own copy" to "everyone shares one copy":
1. **The Production Database:** There is only **one** central database running on the server.
2. **The Production Backend:** The Node.js API runs on the server and connects to that single central database.
3. **The Production Frontend:** The React app is built and hosted on the server (or a CDN).

### How Employees Access It
Employees do not need to install Git, Node.js, or Docker. They do not download the codebase. 

1. **The URL:** The company provides a web address (e.g., `https://eims.bigoutsource.com` or an internal IP address like `http://192.168.1.50`).
2. **The Browser:** An employee opens Google Chrome or Safari and types in that URL.
3. **The Connection:** 
   * Their browser downloads the Frontend User Interface directly from the server.
   * When they interact with the app (e.g., viewing the employee list), the Frontend sends a request over the internet/intranet to the company's Backend Server.
   * The Backend Server queries the single Production Database and returns the data to the user's screen.

**Because everyone is connecting to the same Production Server:**
If the HR Manager logs in and adds a new employee named "Jane Smith", that record is saved to the central production database. A second later, if another employee refreshes their browser, they will see "Jane Smith" on their screen, because they are both looking at the exact same database.
