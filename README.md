# Student Task Tracker

A full-stack web application for managing student assignments and submissions with role-based access control.

## Features

### Authentication & Authorization
- **Secure JWT-based authentication** with role-based access (Student / Instructor)
- **Forgot password system** with reset link generation (development mode — link shown in UI)
- **Role-specific dashboards** with tailored views for students and instructors

### Student Features
- View assigned tasks with due dates and status tracking
- Submit assignments with text and file uploads
- Track submission history and completion rates
- Real-time notifications for new assignments and feedback
- Personal analytics dashboard

### Instructor Features
- Create and manage classes with unique join codes
- Assign tasks to students with deadlines and descriptions
- Review student submissions and provide feedback
- Class-level analytics and progress tracking
- Student performance monitoring

### Technical Features
- **Real-time updates** via Socket.IO
- **AI-powered feedback** (simulated) for submissions
- **Responsive UI** with glassmorphism design
- **MongoDB** for data persistence
- **FastAPI** backend with async support
- **React** frontend with Vite

---

## Tech Stack

### Frontend
- **React 18** with React Router
- **Vite** for fast development and builds
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Axios** for API calls
- **Lucide React** for icons

### Backend
- **FastAPI** (Python 3.13+)
- **MongoDB** with Motor (async driver)
- **JWT** for authentication
- **Socket.IO** for real-time features
- **Bcrypt** for password hashing
- **Pydantic** for data validation

---

## Setup Instructions

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.13+
- **MongoDB** (local or Atlas)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/student-task-tracker.git
cd student-task-tracker
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Run the server
python run.py
```

Backend will start on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment (optional)
cp .env.example .env.development

# Run development server
npm run dev
```

Frontend will start on `http://localhost:3000`

---

## Environment Variables

### Backend (`.env`)
```env
MONGO_URI=mongodb://localhost:27017/taskdb
DB_NAME=taskdb
JWT_SECRET=your_secure_random_string_here
PORT=5000
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
```

### Frontend (`.env.development`)
```env
VITE_API_URL=http://localhost:5000
```

---

## Project Structure

```
student-task-tracker/
├── backend/
│   ├── app/
│   │   ├── api/           # Legacy API routes
│   │   ├── routes/        # Clean auth routes
│   │   ├── services/      # Business logic
│   │   ├── schemas/       # Pydantic models
│   │   ├── utils/         # Helpers (JWT, password, etc.)
│   │   ├── database/      # MongoDB connection
│   │   └── main.py        # FastAPI app entry point
│   ├── run.py             # Server startup script
│   └── requirements.txt   # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── services/      # API client
│   │   ├── context/       # React context (auth)
│   │   └── App.jsx        # Main app component
│   ├── package.json       # Node dependencies
│   └── vite.config.js     # Vite configuration
│
└── README.md
```

---

## API Endpoints

### Authentication
- `POST /api/auth/signup` — Register new user
- `POST /api/auth/login` — Login with email/password
- `POST /api/auth/forgot-password` — Generate password reset link
- `POST /api/auth/reset-password/{token}` — Reset password with token

### Classes (Workspaces)
- `GET /api/classes` — Get user's classes
- `POST /api/classes` — Create new class (instructor only)
- `POST /api/classes/join` — Join class with code (student only)

### Tasks
- `GET /api/tasks` — List tasks
- `POST /api/tasks` — Create task (instructor only)
- `GET /api/tasks/{id}` — Get task details
- `PUT /api/tasks/{id}` — Update task (instructor only)
- `DELETE /api/tasks/{id}` — Delete task (instructor only)

### Submissions
- `POST /api/submissions` — Submit assignment (student only)
- `GET /api/submissions/my` — Get own submissions (student only)
- `GET /api/submissions/task/{task_id}` — Get task submissions (instructor only)

---

## Development Notes

### Forgot Password Flow (Development Mode)
- When a user requests a password reset, the backend generates a secure token
- **In development**, the reset link is displayed directly in the UI (no email sent)
- Click "Open Reset Page" to navigate to the reset form
- **In production**, integrate an email service (SendGrid, AWS SES, etc.)

### Database Stability
- The app **always starts** even if MongoDB is unavailable
- Routes return `503 Service Unavailable` if DB is down
- No import-time side effects — all DB calls are inside route handlers

### Testing Accounts
Create test accounts via the signup page:
- **Instructor**: Use role "Instructor" during signup
- **Student**: Use role "Student" during signup

---

## Scripts

### Backend
```bash
python run.py              # Start server
python -m pytest           # Run tests (if configured)
```

### Frontend
```bash
npm run dev                # Development server
npm run build              # Production build
npm run preview            # Preview production build
npm run lint               # Run ESLint
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Built with FastAPI and React
- UI inspired by modern SaaS dashboards (Vercel, Linear)
- Glassmorphism design trend

---

## Support

For issues or questions, please open an issue on GitHub.
