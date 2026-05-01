# 🎓 Student Task Tracker

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED.svg)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A premium, production-grade SaaS dashboard for managing student assignments, automated submissions, and class-level analytics. Built with a focus on **security**, **observability**, and **performance**.

---

## 🏛️ Architecture Overview

The system follows a modern microservices-lite architecture designed for scalability and clean separation of concerns:

```text
[ Client ] <---> [ Nginx Reverse Proxy ]
                        |
        +---------------+---------------+
        |               |               |
 [ React SPA ]   [ FastAPI App ]  [ Flask Service ]
 (Frontend)      (Primary API)    (ML Analytics)
        |               |               |
        +---------------+---------------+
                        |
                [ MongoDB Database ]
```

---

## ✨ Key Features

- **🚀 Modern SaaS UI**: Premium dark-mode interface with glassmorphism and Framer Motion spring animations.
- **🛡️ Hardened Security**: Environment-aware rate limiting, JWT authentication, and proxy-aware IP detection.
- **📊 Real-time Analytics**: Specialized Flask microservice for calculating student performance and class trends.
- **🕵️ Observability**: Full Prometheus & Grafana stack with custom invariant self-verification and anomaly detection.
- **📂 File Management**: Robust assignment submission system with automated file storage and status tracking.
- **🔔 Notification System**: Integrated event-based notifications for deadlines, grades, and class updates.

---

## 📂 Project Structure

```
student-task-tracker/
├── frontend/               # React + Vite (TailwindCSS, Framer Motion)
├── backend/                # FastAPI — Primary Backend Service
│   ├── app/                # Core application logic
│   ├── Dockerfile          # Optimized multi-stage build
│   └── .env.example        # Configuration template
├── flask_service/          # Flask — Analytics & Notifications Microservice
├── monitoring/             # Prometheus configuration
├── nginx/                  # Nginx — Reverse Proxy & Static Assets
└── docker-compose.yml      # Full-stack orchestration
```

---

## 🚀 Quick Start (Docker)

The entire stack can be launched in production mode with a single command:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/student-task-tracker.git
cd student-task-tracker

# 2. Start the services
docker-compose up --build
```

### Accessing the Services
- **Frontend**: [http://localhost](http://localhost)
- **API Documentation**: [http://localhost/docs](http://localhost/docs)
- **Prometheus UI**: [http://localhost:9090](http://localhost:9090)
- **Grafana Dashboards**: [http://localhost:3001](http://localhost:3001) (`admin` / `admin`)

---

## 🛰️ API Routing Rules (The Contract)

To ensure consistency across Docker and Production environments, the system follows a strict **Same-Origin Policy** via Nginx:

1.  **Frontend Calls**: All requests must use the relative `/api` prefix (handled automatically by `services/api.js`).
2.  **No Hardcoded URLs**: Never use `localhost:8000`, `127.0.0.1`, or `http://` in frontend services.
3.  **Routing Path**: `Frontend (/api) ──> Nginx (/api) ──> Backend (/api)`.
4.  **Why?**: This prevents CORS issues, simplifies environment configuration, and makes the system fully portable.

---

## 🛡️ API Contract Enforcement

The communication rules are automatically enforced via a static analysis script. Violations (like hardcoded URLs or direct HTTP calls) will fail the validation check.

### Run Validation Locally
```bash
cd frontend
npm run validate:api
```

---

## 🛡️ Pre-Commit Validation

To prevent architectural regressions, an automated git hook runs before every commit. This hook executes the API contract validator and will **block the commit** if any violations are found.

- **Emergency Bypass**: Use `git commit -m "..." --no-verify` (Only for emergency use).
- **Rule**: Never bypass this check to fix a "broken build"; fix the underlying API routing instead.

---

## ❓ If Your Commit is Blocked

The pre-commit hook is designed to protect the system's architecture. If your commit is blocked:

1.  **Check the Output**: The terminal will show the exact file and line causing the violation.
2.  **Fix the Issue**: Most common fixes:
    *   Remove `/api` from your service file (it's already handled by `baseURL`).
    *   Move any direct `axios` or `fetch` calls into `services/api.js`.
    *   Remove hardcoded URLs like `localhost:8000`.
3.  **Retry**: Once fixed, `git add` the changes and try the commit again.

---

## 🔖 Versioning Strategy

This project follows [Semantic Versioning (SemVer)](https://semver.org/):
- **MAJOR**: Breaking changes or structural architectural shifts.
- **MINOR**: New features or significant functional additions.
- **PATCH**: Bug fixes, security hardening, or documentation updates.

**Release Flow**:
1.  Complete work and update `CHANGELOG.md`.
2.  Pass the **[Release Checklist](RELEASE_CHECKLIST.md)**.
3.  Tag the release: `git tag -a v1.0.0 -m "Release description"`.

---

## 🛠️ Developer Setup (Manual)

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate on Windows
pip install -r requirements.txt
python run.py
```

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

---

## 📈 Monitoring & Health

The system continuously monitors its own integrity via custom invariant checks:
- **Health Probe**: `GET /api/health` returns status, DB connectivity, and environment validation.
- **Deep Self-Check**: `GET /api/system/self-check` verifies internal state (Teacher only).
- **Metrics**: Production metrics are exported to Prometheus at `/metrics`.

---

## 🗺️ Roadmap

- [ ] **Real-time Collaboration**: Live chat and shared document editing using WebSockets.
- [ ] **AI Grading**: Integration with LLMs for automated feedback on submissions.
- [ ] **Mobile App**: Dedicated React Native application for student reminders.

---

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
