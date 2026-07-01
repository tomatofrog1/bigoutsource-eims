# Profile Picture Upload Feature Documentation

This document explains the recent changes introduced to support employee profile picture (avatar) uploads and provides critical instructions for developers pulling this branch.

## 🌟 What Was Implemented

We have added the ability to upload and display profile pictures for employees, mimicking the Facebook-style avatar experience.

1. **Backend Improvements**:
   - **Multer Integration**: Added the `multer` library (`backend/package.json`) to handle `multipart/form-data` file uploads securely.
   - **Upload Configuration**: Configured `multer` in `backend/src/utils/upload.js` to restrict uploads to image files, set a maximum file size of **50MB**, and automatically save them in the `backend/uploads/avatars` directory.
   - **Database Storage**: Mapped the newly saved image path to the `avatarUrl` field in the Employee database model (`employee.model.js`).
   - **New Endpoint**: Created `POST /api/employees/:id/avatar` to handle the upload request.

2. **Frontend Improvements**:
   - **API Client**: Updated the global `apiRequest` (`frontend/src/lib/api.js`) to seamlessly support sending `FormData` without explicitly setting the `Content-Type` to JSON.
   - **Service Layer**: Added the `uploadAvatar` function in `employeeService.ts`.
   - **UI Experience**: Replaced the initial-based avatar in `EmployeeProfile.tsx` with a dynamic image viewer. Added a subtle "Camera" icon that appears when hovering over the avatar, allowing for immediate file selection and direct upload without needing to click "Save Changes".
   - **Image Rendering**: Configured the frontend to correctly pull images directly from the backend's static file server (`/uploads/avatars`).

---

## ⚠️ CRITICAL INSTRUCTION FOR DEVELOPERS PULLING THIS BRANCH

Because a new backend dependency (`multer`) was added to `backend/package.json`, **you will encounter an `ERR_MODULE_NOT_FOUND` or 500 Internal Server Error** if your Docker container is running off a cached image without this dependency installed.

### How to Fix / Avoid Errors

When you pull this branch, you **MUST** ensure the new Node dependencies are installed in your backend Docker container. 

You can do this using either of the following two methods:

#### Method 1: Rebuild the container (Recommended)
This will rebuild the backend Docker image and automatically run `npm install`:
```bash
docker compose up --build -d
```

#### Method 2: Install dependencies directly in the running container
If your container is already running and you want to install it on the fly:
```bash
# Exec into the running backend container and install dependencies
docker compose exec backend npm install
```
*(Note: Since `nodemon` is watching the files, the server might wait for file changes to restart if it crashed. You can simply run `docker compose restart backend` afterward to boot it up cleanly).*

---

### Folder Structure Note
The backend dynamically creates the `uploads/avatars` directory if it doesn't exist. All uploaded profile pictures will be stored there. Make sure not to commit this folder if it contains sensitive real-user images (it should generally be ignored in `.gitignore`).
