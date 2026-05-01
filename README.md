# 📚 Student Task Tracker

A full-stack MERN application for managing student tasks with user authentication.
Each user can create, view, edit, complete, and delete their own tasks — no one else can see them.

---

## Features

- JWT-based signup and login
- Protected routes — dashboard only accessible when logged in
- Create tasks with title, subject, deadline, status, and description
- Edit tasks via a modal dialog
- Mark tasks as completed (or undo)
- Delete tasks with confirmation
- Filter tasks by status and subject (persisted across reloads)
- Overdue task highlighting
- Pagination with next/prev controls
- Stats bar showing live task counts
- Optimistic UI updates with rollback on failure
- Toast notifications for all actions
- Input validation with per-field error messages
- Auto-logout on expired token

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, Vite, React Router v6     |
| Backend   | Node.js, Express, Helmet, Rate Limit|
| Database  | MongoDB Atlas, Mongoose             |
| Auth      | JWT (jsonwebtoken), bcryptjs        |
| HTTP      | Axios (with interceptors)           |
| Styling   | Plain CSS (no UI library)           |
| Deploy    | Render (backend) + Vercel (frontend)|

---

## Folder Structure

```
student-task-tracker/
├── backend/
│   ├── config/
│   │   ├── constants.js          # Centralised limits & JWT expiry
│   │   └── db.js                 # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js     # signup, login
│   │   └── taskController.js     # CRUD (scoped per user)
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification
│   │   └── errorHandler.js      # Global error handler
│   ├── models/
│   │   ├── User.js               # User schema + bcrypt hooks
│   │   └── Task.js               # Task schema + indexes
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── taskRoutes.js
│   ├── .env                      # Local dev only (git-ignored)
│   ├── .env.example              # Template — safe to commit
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── AddTask.jsx
    │   │   ├── EditModal.jsx
    │   │   ├── Navbar.jsx
    │   │   ├── Spinner.jsx
    │   │   ├── TaskCard.jsx
    │   │   └── Toast.jsx
    │   ├── pages/
    │   │   ├── Home.jsx           # Dashboard
    │   │   ├── Login.jsx
    │   │   ├── Signup.jsx
    │   │   └── TaskDetail.jsx     # Redirect fallback
    │   ├── services/
    │   │   ├── api.js             # Axios instance + interceptors
    │   │   ├── authService.js     # Auth API calls + token helpers
    │   │   └── taskService.js     # Task API calls
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── .env.development           # VITE_API_URL= (empty, uses proxy)
    ├── .env.production            # VITE_API_URL=<render-url> placeholder
    ├── .env.example               # Template — safe to commit
    ├── vercel.json                # SPA routing rewrite
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## Local Development

### Prerequisites
- Node.js v18+
- MongoDB running locally **or** a MongoDB Atlas URI

### 1. Clone

```bash
git clone <your-repo-url>
cd student-task-tracker
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env   # then edit .env with your values
npm install
npm run dev            # runs on http://localhost:5000
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev            # runs on http://localhost:3000
```

> Vite proxies all `/api/*` requests to `localhost:5000` automatically — no CORS config needed locally.

---

## API Endpoints

### Auth
| Method | Endpoint         | Description       |
|--------|------------------|-------------------|
| POST   | /api/auth/signup | Register new user |
| POST   | /api/auth/login  | Login, get token  |

### Tasks — require `Authorization: Bearer <token>`
| Method | Endpoint       | Description                        |
|--------|----------------|------------------------------------|
| GET    | /api/tasks     | Get tasks (paginated, filterable)  |
| POST   | /api/tasks     | Create task                        |
| PUT    | /api/tasks/:id | Update task                        |
| DELETE | /api/tasks/:id | Delete task                        |

### Other
| Method | Endpoint    | Description  |
|--------|-------------|--------------|
| GET    | /api/health | Health check |

---

## Deployment

### Step 1 — Create a MongoDB Atlas Cluster

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account
2. Click **Build a Database** → choose **M0 Free Tier** → pick a region close to your Render server
3. Create a database user:
   - **Database Access** → **Add New Database User**
   - Username: `tasktracker-user` (or any name)
   - Password: click **Autogenerate Secure Password** — copy it now
   - Role: **Read and write to any database**
4. Allow network access:
   - **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`)
   - This is required for Render's dynamic IPs
5. Get your connection string:
   - **Database** → **Connect** → **Drivers**
   - Copy the URI — it looks like:
     ```
     mongodb+srv://tasktracker-user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with the password you copied in step 3
   - Add your database name before the `?`:
     ```
     mongodb+srv://tasktracker-user:<password>@cluster0.xxxxx.mongodb.net/student-task-tracker?retryWrites=true&w=majority
     ```

---

### Step 2 — Deploy Backend to Render

1. Push your project to GitHub (the whole `student-task-tracker/` folder or a monorepo)
2. Go to [render.com](https://render.com) → **New** → **Web Service**
3. Connect your GitHub repo
4. Configure the service:

   | Setting        | Value            |
   |----------------|------------------|
   | Name           | `student-task-tracker-api` |
   | Root Directory | `backend`        |
   | Runtime        | Node             |
   | Build Command  | `npm install`    |
   | Start Command  | `node server.js` |

5. Under **Environment Variables**, add:

   | Key            | Value                                      |
   |----------------|--------------------------------------------|
   | `MONGO_URI`    | Your Atlas connection string from Step 1   |
   | `JWT_SECRET`   | A long random string (see tip below)       |
   | `FRONTEND_URL` | Leave blank for now — fill in after Step 3 |
   | `NODE_ENV`     | `production`                               |

   > **Tip — generate a strong JWT_SECRET:**
   > ```bash
   > node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   > ```

6. Click **Create Web Service** — Render will build and deploy
7. Copy your Render URL: `https://student-task-tracker-api.onrender.com`
8. Go back to **Environment Variables** and set:
   - `FRONTEND_URL` = your Vercel URL (you'll get this in Step 3 — come back and update it)

---

### Step 3 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Configure the project:

   | Setting        | Value           |
   |----------------|-----------------|
   | Framework      | Vite            |
   | Root Directory | `frontend`      |
   | Build Command  | `npm run build` |
   | Output Dir     | `dist`          |

4. Under **Environment Variables**, add:

   | Key            | Value                                          |
   |----------------|------------------------------------------------|
   | `VITE_API_URL` | Your Render URL from Step 2 (e.g. `https://student-task-tracker-api.onrender.com`) |

5. Click **Deploy**
6. Copy your Vercel URL: `https://student-task-tracker.vercel.app`
7. Go back to Render → **Environment Variables** → update `FRONTEND_URL` with this Vercel URL
8. Trigger a **Manual Deploy** on Render so the new CORS origin takes effect

> The included `vercel.json` rewrites all routes to `index.html` so React Router works on direct URL access and page refresh.

---

### Step 4 — Final Verification Checklist

- [ ] `MONGO_URI` points to Atlas (not `localhost`)
- [ ] `JWT_SECRET` is a long random string (not the placeholder)
- [ ] `FRONTEND_URL` on Render = exact Vercel URL (no trailing slash)
- [ ] `VITE_API_URL` on Vercel = exact Render URL (no trailing slash)
- [ ] `NODE_ENV=production` set on Render
- [ ] Visit `https://your-backend.onrender.com/api/health` → should return `{"success":true}`
- [ ] Test full flow: **Signup → Login → Add task → Edit → Complete → Delete → Logout → Expired token redirect**

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable       | Required | Description                              |
|----------------|----------|------------------------------------------|
| `MONGO_URI`    | Yes      | MongoDB Atlas connection string          |
| `JWT_SECRET`   | Yes      | Secret for signing JWT tokens            |
| `FRONTEND_URL` | Yes (prod)| Vercel frontend URL for CORS             |
| `NODE_ENV`     | No       | `development` or `production`            |
| `PORT`         | No       | Defaults to 5000; Render sets this auto  |

### Frontend (`frontend/.env.production`)

| Variable       | Required | Description                              |
|----------------|----------|------------------------------------------|
| `VITE_API_URL` | Yes (prod)| Render backend URL (empty in dev)        |

---

## Screenshots

> _Add screenshots here after running the project._

| Page      | Screenshot |
|-----------|------------|
| Login     | ![Login](#) |
| Signup    | ![Signup](#) |
| Dashboard | ![Dashboard](#) |
| Add Task  | ![Add Task](#) |
| Edit Task | ![Edit Modal](#) |

---

## License

MIT
