# ScholarOS

ScholarOS is an AI-powered academic workflow and evaluation platform designed to streamline assignment management, intelligent grading, instructor reviews, analytics, and student performance tracking.

> **Smarter Learning. Intelligent Evaluation.**

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
- **Analytics section**: completion rate, grade distribution, best/weakest assignment, class average
- Real-time activity feed via Socket.IO

### Student Dashboard
- Join classes using instructor-provided codes
- View assigned tasks with status badges (Pending / Submitted / Overdue / Late)
- Search and filter tasks by title or status
- Submit assignments (text or file upload)
- **Analytics section**: completion %, on-time rate, status breakdown bars
- Real-time activity feed

### AI Grading System
- Automatic Gemini-powered evaluation on every text submission
- Structured rubric scoring: Technical Accuracy, Implementation, Clarity, Innovation
- Returns: score (0–100), letter grade (A–F), summary, strengths, weaknesses, suggestions
- Confidence scoring: high / medium / low — low confidence flags instructor review
- Grading runs as a **background task** — submission returns instantly
- Instructor can approve AI grade or override with custom score and feedback
- Final grade clearly shows "AI Generated" vs "Instructor Reviewed"
- Retry grading available for failed evaluations

### Smart Study Planner (Student)
- AI-powered daily study schedule based on task priority and deadlines
- IST timezone-aware scheduling — never schedules past midnight
- Overdue tasks shown separately with intelligent reschedule suggestions
- Closed/submitted tasks never appear in the planner
- Confidence-based insights and workload warnings

### Profile System
- Structured student profiles: college, USN, department, semester, year, SGPA
- Structured instructor profiles: college, qualification, department, contact
- Profile completeness indicator
- Persistent across sessions — stored in MongoDB `profile.*` subdocument

### UX
- Skeleton loaders on every loading state (no blank screens)
- Error states with retry buttons on every data fetch
- Toast notifications on every API success and failure
- Grading timeline: Submitted → AI Graded → Instructor Reviewed → Finalized
- Responsive glassmorphism dark enterprise UI

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
git clone https://github.com/chxnd-19/scholar-os.git
cd scholar-os
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
MONGO_URI=mongodb://localhost:27017/scholaros
DB_NAME=scholaros
JWT_SECRET=your_secure_random_string_here_min_32_chars
PORT=5000
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Never commit `.env` to version control.** Use `.env.example` as a template.

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

### Demo Data (Seed Script)
Populate the database with realistic demo accounts, assignments, and AI-graded submissions:

```bash
cd backend
python seed.py          # seed demo data
python seed.py --wipe   # wipe and re-seed
```

Demo accounts created:

| Role | Email | Password |
|------|-------|----------|
| Instructor | priya.sharma@scholaros.demo | Demo@1234 |
| Student | arjun.mehta@scholaros.demo | Demo@1234 |
| Student | sneha.patel@scholaros.demo | Demo@1234 |
| Student | rahul.nair@scholaros.demo | Demo@1234 |

Class join code: **DEMO01**

### Forgot Password (Dev Mode)
No email service configured. The reset URL is printed to the backend console and returned in the API response. Replace with SendGrid/AWS SES for production.

### Database Resilience
Backend always starts even if MongoDB is down. Routes return `503` if DB is unavailable — no crash on startup.

### Task Priority
Three levels: **Low**, **Medium**, **High**. Stored in MongoDB, displayed as color-coded badges, filterable in both dashboards.

---

## Deployment

### Docker (Recommended)

```bash
docker-compose up --build
```

Services started:
- `backend` → http://localhost:5000
- `frontend` → http://localhost:3000
- MongoDB (if using local container)

### Manual Deployment

**Backend (e.g. Render / Railway):**
1. Set environment variables from `backend/.env.example`
2. Set `ENVIRONMENT=production`
3. Set `FRONTEND_URL=https://your-frontend-domain.com`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Frontend (e.g. Vercel / Netlify):**
1. Set `VITE_API_URL=https://your-backend-domain.com`
2. Build command: `npm run build`
3. Output directory: `dist`

---

## Future Improvements

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
