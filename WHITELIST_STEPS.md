# IP Whitelist Deployment Guide

This guide outlines the exact steps you need to take to deploy the new IP Whitelisting feature to your company's Linux server.

Because you are deploying via Portainer and PuTTY, follow these instructions carefully.

---

## Phase 1: Prepare the Configuration

1. **Ask your supervisor** for the exact IP Subnets (VLANs) used by the company. They will usually be formatted like `192.168.1.0/24` or `10.0.0.0/8`.
2. Open the `nginx/nginx.conf` file in your code editor.
3. Scroll to the **IP WHITELIST CONFIGURATION** section (around line 10).
4. Delete the example placeholder lines:
   ```nginx
   allow 192.168.10.0/24;
   allow 10.0.0.0/8;
   ```
5. Replace them with the real subnets your supervisor gave you.
   _(Note: Make sure to keep the `deny all;` line at the bottom! That is the line that actually blocks the VPNs and outside networks)._
6. Save the file.

---

## Phase 2: Send the Code to the Server

You need to push your local changes to your Git repository so the server can download them.

1. Open your local terminal.
2. Run the following Git commands:
   ```bash
   git add .
   git commit -m "feat: added Nginx reverse proxy with IP whitelisting"
   git push
   ```

---

## Phase 3: Deploy on the Linux Server

Now you need to update the server to use the new Docker configuration.

1. Open **PuTTY** and connect to your company's Linux server.
2. Navigate to the folder where your EIMS project is located:
   ```bash
   cd /path/to/your/eims/folder
   ```
3. Pull the latest code from Git:
   ```bash
   git pull
   ```
4. Restart the Docker containers so Portainer builds the new Nginx service:
   ```bash
   docker compose down
   docker compose up -d --build
   ```
   _(Alternatively, you can go into the Portainer Web UI, find your Stack, and click "Pull and redeploy")._

---

## Phase 4: Test the System

1. **Test for Success:** Connect to the company Wi-Fi (or use an office PC). Try to access the system via its IP address in your browser (e.g., `http://192.168.x.x`). The system should load perfectly.
2. **Test for Blocking (VPN Test):** Turn on a VPN, or disconnect from the Wi-Fi and use your phone's cellular data. Try to access the system again. You should immediately see a **403 Forbidden** error page from Nginx.

If both tests pass, you have successfully implemented the IP Whitelist!
