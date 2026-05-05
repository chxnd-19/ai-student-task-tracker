# EduTracker — Student Task Tracker

A production-ready full-stack academic task management platform with role-based dashboards, real-time updates, and analytics.

---

## Features

### Authentication & Security
- JWT-based login/signup with role-based access (**Student** / **Instructor**)
- Token expiry handled globally — auto-redirect to `/login` on 401
- Bcrypt password hashing, role enforcement on every protected route
- Forgot password with reset link (dev mode: link shown in UI)

### Instructor Dashboard
- Create and manage classes with unique join codes
- Create, edit, delete assignments with **priority levels** (Low / Medium / High)
- Search and filter assignments by title or priority
- View student submissions per assignment
- **Analytics section**: completion rate, average grade, total tasks, student count
- Real-time activity feed via Socket.IO

### Student Dashboard
- Join classes using instructor-provided codes
- View assigned tasks with status badges (Pending / Submitted / Overdue / Late)
- Search and filter tasks by title or status
- Submit assignments (text or file upload)
- **Analytics section**: completion %, on-time rate, status breakdown bars
- Real-time activity feed

### UX
- Skeleton loaders on every loading state (no blank screens)
- Error states with retry buttons on every data fetch
- Toast notifications on every API success and failure
- Responsive glassmorphism dark UI

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
│                                                              │
│  pages/          → Route-level components                    │
│  components/     → Reusable UI (Toast, Skeleton, Error...)   │
│  services/       → All API calls (axios, no logic in pages)  │
│  hooks/          → useToast, useSocket                       │
│  context/        → AuthContext (JWT state)                   │
│  utils/          → taskStatus helpers                        │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP (axios + JWT Bearer)
                           │ WebSocket (Socket.IO)
┌──────────────────────────▼──────────────────────────────────┐
│                       BACKEND (FastAPI)                      │
│                                                              │
│  routes/auth.py  → Request/response only                     │
│  api/*.py        → Request/response only                     │
│  services/*.py   → All business logic                        │
│  schemas/*.py    → Pydantic validation                       │
│  utils/          → JWT, password, dependencies, responses    │
│  database/       → Motor async MongoDB client                │
└──────────────────────────┬──────────────────────────────────┘
                           │ Motor (async)
┌──────────────────────────▼──────────────────────────────────┐
│                        MongoDB Atlas                         │
│  Collections: users, tasks, submissions, classes,            │
│               notifications, profiles, activity_logs        │
│  Indexes: email(unique), dueDate, assignedTo, status,        │
│           priority, classId, createdBy                       │
└─────────────────────────────────────────────────────────────┘
```

### API Request Flow

```
Browser → axios (+ JWT header)
       → Vite proxy /api/* → localhost:5000 (dev)
       → FastAPI route handler
       → Pydantic schema validation
       → service function (business logic)
       → Motor → MongoDB
       → serialize_doc()
       → JSONResponse { success, data }
       → axios response interceptor
       → React state update → UI re-render
```

### Error Flow

```
Any exception in route/service
  → Global exception handler (main.py)
  → { success: false, message: "...", error: "HTTP_XXX" }
  → axios response interceptor
  → 401 → auto logout + redirect
  → other → showToast(message, 'error')
```

---

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React 18, Vite, Tailwind CSS, Framer Motion     |
| Backend   | FastAPI (Python 3.13+), Uvicorn                 |
| Database  | MongoDB (Motor async driver)                    |
| Auth      | JWT (python-jose), bcrypt (passlib)             |
| Realtime  | Socket.IO (python-socketio + socket.io-client)  |
| HTTP      | Axios with request/response interceptors        |

---

## Project Structure

```
student-task-tracker/
├── backend/
│   ├── app/
│   │   ├── api/           # Route handlers (request/response only)
│   │   │   ├── task.py
│   │   │   ├── workspace.py
│   │   │   ├── submission.py
│   │   │   ├── notification.py
│   │   │   └── user.py
│   │   ├── routes/
│   │   │   └── auth.py    # Auth routes (no rate limiter)
│   │   ├── services/      # Business logic layer
│   │   │   ├── auth_service.py
│   │   │   ├── task_service.py
│   │   │   ├── class_service.py
│   │   │   ├── submission_service.py
│   │   │   ├── notification_service.py
│   │   │   ├── activity_service.py
│   │   │   └── socket_service.py
│   │   ├── schemas/       # Pydantic models
│   │   ├── database/      # MongoDB connection (non-blocking)
│   │   ├── utils/         # JWT, password, dependencies, responses
│   │   ├── config/        # Settings (pydantic-settings + .env)
│   │   └── main.py        # FastAPI app + global error handlers
│   ├── run.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx          # Sidebar + TopBar + notifications
│   │   │   ├── Toast.jsx           # Auto-dismiss notification
│   │   │   ├── SkeletonLoader.jsx  # Loading placeholders
│   │   │   ├── ErrorState.jsx      # Error + retry UI
│   │   │   ├── SubmissionForm.jsx
│   │   │   └── SubmissionList.jsx
│   │   ├── pages/
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── TeacherDashboard.jsx
│   │   │   ├── ClassesPage.jsx
│   │   │   ├── ClassDetailsPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   └── ResetPassword.jsx
│   │   ├── services/      # All API calls (no logic in components)
│   │   ├── hooks/         # useToast, useSocket
│   │   ├── context/       # AuthContext
│   │   └── utils/         # taskStatus
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## Installation

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.13+
- **MongoDB** (local or Atlas)

### 1. Clone

```bash
git clone https://github.com/chxnd-19/student-task-tracker.git
cd student-task-tracker
```

### 2. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in MONGO_URI and JWT_SECRET
python run.py
```

Backend: `http://localhost:5000`  
Swagger docs: `http://localhost:5000/docs`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:3000`

---

## Environment Variables

### `backend/.env`

```env
MONGO_URI=mongodb://localhost:27017/taskdb
DB_NAME=taskdb
JWT_SECRET=your_secure_random_string_here
PORT=5000
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
```

### `frontend/.env.development`

```env
VITE_API_URL=http://localhost:5000
```

---

## API Endpoints

### Auth — `/api/auth`

| Method | Path                      | Auth | Description               |
|--------|---------------------------|------|---------------------------|
| POST   | `/signup`                 | No   | Register new user         |
| POST   | `/login`                  | No   | Login, returns JWT        |
| POST   | `/forgot-password`        | No   | Generate reset link       |
| POST   | `/reset-password/{token}` | No   | Reset password            |

### Classes — `/api/classes`

| Method | Path      | Role       | Description          |
|--------|-----------|------------|----------------------|
| GET    | `/`       | Any        | Get user's classes   |
| POST   | `/`       | Instructor | Create class         |
| POST   | `/join`   | Student    | Join by code         |
| DELETE | `/{id}`   | Instructor | Delete class         |

### Tasks — `/api/tasks`

| Method | Path          | Role       | Description          |
|--------|---------------|------------|----------------------|
| GET    | `/`           | Any        | List tasks (filtered)|
| POST   | `/`           | Instructor | Create task          |
| PUT    | `/{id}`       | Instructor | Update task          |
| DELETE | `/{id}`       | Instructor | Delete task          |
| GET    | `/summary`    | Student    | Status summary       |
| GET    | `/students`   | Instructor | List students        |

### Submissions — `/api/submissions`

| Method | Path                          | Role       | Description          |
|--------|-------------------------------|------------|----------------------|
| POST   | `/`                           | Student    | Submit assignment    |
| GET    | `/my`                         | Student    | Own submissions      |
| GET    | `/task/{task_id}`             | Instructor | Task submissions     |
| GET    | `/analytics/class/{class_id}` | Instructor | Class analytics      |
| GET    | `/analytics/student`          | Student    | Student analytics    |

---

## Error Response Format

All errors follow a consistent envelope:

```json
{
  "success": false,
  "message": "Human-readable description",
  "error": "HTTP_404 | VALIDATION_ERROR | INTERNAL_SERVER_ERROR"
}
```

Validation errors include a `details` array with per-field messages.

---

## Scripts

```bash
# Backend
python run.py                    # Start with auto-reload

# Frontend
npm run dev                      # Dev server (port 3000)
npm run build                    # Production build
npm run preview                  # Preview build
```

---

## Development Notes

### Forgot Password (Dev Mode)
No email service configured. The reset URL is returned in the API response and displayed as a clickable button in the UI. Replace with SendGrid/AWS SES for production.

### Database Resilience
Backend always starts even if MongoDB is down. Routes return `503` if DB is unavailable — no crash on startup.

### Task Priority
Three levels: **Low**, **Medium**, **High**. Stored in MongoDB, displayed as color-coded badges, filterable in both dashboards.

---

## Deployment

### Backend — Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables in the Render dashboard:
   ```
   MONGO_URI=mongodb+srv://...
   JWT_SECRET=your_secret_here
   ENVIRONMENT=production
   FRONTEND_URL=https://your-app.vercel.app
   PORT=10000
   DB_NAME=taskdb
   ```

### Frontend — Vercel

1. Import your GitHub repository on [vercel.com](https://vercel.com)
2. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add environment variables:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```
4. `vercel.json` is already included for SPA routing.

### Pre-deploy checklist

- [ ] `MONGO_URI` points to Atlas (not localhost)
- [ ] `JWT_SECRET` is a random 32+ character string
- [ ] `ENVIRONMENT=production`
- [ ] `FRONTEND_URL` matches your Vercel domain exactly
- [ ] `VITE_API_URL` matches your Render URL (no trailing slash)

---

## TanStack Query

Data fetching is managed by [TanStack Query v5](https://tanstack.com/query/latest):

| Hook | Purpose |
|------|---------|
| `useClasses()` | Fetch user's classes with caching + refetch on focus |
| `useJoinClass()` | Mutation — join class, update cache optimistically |
| `useCreateClass()` | Mutation — create class, append to cache |
| `useTasks(params)` | Fetch paginated tasks for a class |
| `useTaskSummary(classId)` | Fetch student task status counts |
| `useCreateTask()` | Mutation — create task, invalidate list |
| `useUpdateTask()` | Mutation — update task, invalidate list |
| `useDeleteTask()` | Mutation — delete task, remove from cache |

Cache configuration: `staleTime: 30s`, `gcTime: 5min`, `retry: 1`, `refetchOnWindowFocus: true`

---

- [ ] Email integration (SendGrid / AWS SES)
- [ ] Calendar view for task deadlines
- [ ] Push notifications for upcoming deadlines
- [ ] Bulk task assignment
- [ ] Export analytics as PDF/CSV
- [ ] Refresh token rotation
- [ ] Rate limiting on all endpoints

---

## License

MIT — see [LICENSE](LICENSE) for details.
