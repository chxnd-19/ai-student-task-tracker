# EduTracker — Student Task Tracker

A full-stack academic task management platform with role-based dashboards for students and instructors.

---

## Features

### Authentication
- JWT-based login and signup
- Role-based access: **Student** and **Instructor**
- Forgot password with reset link (dev mode: link shown in UI)
- Secure bcrypt password hashing

### Instructor Dashboard
- Create and manage classes with unique join codes
- Create, edit, and delete assignments with **priority levels** (Low / Medium / High)
- **Search and filter** assignments by title or priority
- View student submissions per assignment
- Class analytics: completion rate, average grade, submission counts
- Real-time activity feed via Socket.IO

### Student Dashboard
- Join classes using instructor-provided codes
- View assigned tasks with due dates and status badges
- **Search and filter** tasks by title or status
- Submit assignments (text or file upload)
- Track completion rate and overdue tasks
- Real-time activity feed

### General
- Responsive glassmorphism UI (dark theme)
- Toast notifications for all actions
- Real-time updates via Socket.IO
- AI-powered submission feedback (simulated)

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
│   │   ├── api/           # Feature route handlers
│   │   ├── routes/        # Auth routes (clean, no rate limiter)
│   │   ├── services/      # Business logic layer
│   │   ├── schemas/       # Pydantic request/response models
│   │   ├── database/      # MongoDB connection (non-blocking)
│   │   ├── utils/         # JWT, password, dependencies, responses
│   │   ├── config/        # Settings (pydantic-settings)
│   │   └── main.py        # FastAPI app entry point
│   ├── run.py             # Server startup script
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment variable template
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route-level page components
│   │   ├── services/      # API client + service modules
│   │   ├── context/       # Auth + Workspace React context
│   │   ├── hooks/         # Custom hooks (useSocket)
│   │   └── utils/         # Task status helpers
│   ├── package.json
│   ├── vite.config.js     # Dev proxy: /api → localhost:5000
│   └── .env.example
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

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set MONGO_URI and JWT_SECRET

# Start server
python run.py
```

Backend runs at `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

---

## Environment Variables

### Backend (`backend/.env`)

```env
MONGO_URI=mongodb://localhost:27017/taskdb
DB_NAME=taskdb
JWT_SECRET=your_secure_random_string_here
PORT=5000
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=5
```

### Frontend (`frontend/.env.development`)

```env
VITE_API_URL=http://localhost:5000
```

> In development, Vite proxies `/api/*` to `localhost:5000` automatically.

---

## API Endpoints

### Auth — `/api/auth`

| Method | Path                        | Description                  | Auth |
|--------|-----------------------------|------------------------------|------|
| POST   | `/signup`                   | Register new user            | No   |
| POST   | `/login`                    | Login, returns JWT           | No   |
| POST   | `/forgot-password`          | Generate reset link          | No   |
| POST   | `/reset-password/{token}`   | Reset password with token    | No   |

### Classes — `/api/classes`

| Method | Path          | Description                    | Role       |
|--------|---------------|--------------------------------|------------|
| GET    | `/`           | Get user's classes             | Any        |
| POST   | `/`           | Create class                   | Instructor |
| POST   | `/join`       | Join class by code             | Student    |
| DELETE | `/{id}`       | Delete class                   | Instructor |

### Tasks — `/api/tasks`

| Method | Path              | Description                    | Role       |
|--------|-------------------|--------------------------------|------------|
| GET    | `/`               | List tasks (filtered)          | Any        |
| POST   | `/`               | Create task                    | Instructor |
| PUT    | `/{id}`           | Update task                    | Instructor |
| DELETE | `/{id}`           | Delete task                    | Instructor |
| GET    | `/summary`        | Task status summary            | Student    |
| GET    | `/students`       | List all students              | Instructor |

### Submissions — `/api/submissions`

| Method | Path                          | Description                  | Role       |
|--------|-------------------------------|------------------------------|------------|
| POST   | `/`                           | Submit assignment            | Student    |
| GET    | `/my`                         | Get own submissions          | Student    |
| GET    | `/task/{task_id}`             | Get task submissions         | Instructor |
| GET    | `/analytics/class/{class_id}` | Class analytics              | Instructor |
| GET    | `/analytics/student`          | Student analytics            | Student    |

---

## Scripts

### Backend
```bash
python run.py                    # Start with auto-reload
python -m uvicorn app.main:app   # Direct uvicorn start
```

### Frontend
```bash
npm run dev        # Development server (port 3000)
npm run build      # Production build
npm run preview    # Preview production build
```

---

## Development Notes

### Forgot Password (Dev Mode)
No email service is configured. When a reset is requested:
- If the email exists, the reset URL is returned in the API response
- The frontend displays a clickable **"Open Reset Page"** button
- In production, replace this with SendGrid / AWS SES

### Database Resilience
The backend always starts even if MongoDB is unavailable. Routes return `503 Service Unavailable` if the DB is down — the app never crashes on startup.

### Task Priority
Tasks support three priority levels: **Low**, **Medium**, **High**. Priority is stored in MongoDB and displayed as a colored badge in both dashboards.

---

## Future Improvements

- [ ] Email integration for password reset (SendGrid / AWS SES)
- [ ] Calendar view (monthly/weekly) for task deadlines
- [ ] Push notifications for upcoming deadlines
- [ ] Bulk task assignment to multiple classes
- [ ] Export analytics as PDF/CSV
- [ ] Dark/light theme toggle
- [ ] Mobile app (React Native)

---

## License

MIT — see [LICENSE](LICENSE) for details.
