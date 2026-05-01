# 📽️ Project Demo & Verification Script

Follow this script to verify the project and perform a flawless demonstration for evaluators.

---

## 1. 🚀 One-Command Launch
Prove that the system is fully containerized and easy to set up.

```bash
# Wipe any old data (optional)
docker-compose down -v

# Start the full stack
docker-compose up --build
```

**Verification**:
- [ ] No build errors in logs.
- [ ] `stt_mongodb`, `stt_backend`, `stt_flask`, `stt_frontend`, `stt_nginx`, `stt_prometheus`, `stt_grafana` are all running.

---

## 2. 🛡️ Security & Reliability (The "Hardened" Backend)
Showcase the engineering depth of the FastAPI implementation.

### A. IP Detection & Rate Limiting
1. Open **Postman** or **cURL**.
2. Trigger the login endpoint `/api/auth/login` repeatedly.
3. **Verify**:
   - In `ENVIRONMENT=production`, you should receive `429 Too Many Requests` after 5 attempts.
   - Check backend logs: `[RATE LIMIT] <your-ip> exceeded limit on /api/auth/login`.

### B. Self-Verification Invariants
1. Access `GET http://localhost/api/health`.
   - **Verify**: Correct JSON structure with `database: connected` and `checks`.
2. Access `GET http://localhost/api/system/self-check` (requires Teacher JWT).
   - **Verify**: `overall_ok: true`.

---

## 3. 📊 Observability (Prometheus + Grafana)
Demonstrate production-grade monitoring.

1. Open **Prometheus**: [http://localhost:9090](http://localhost:9090)
   - Search for `app_requests_total`. Execute query.
2. Open **Grafana**: [http://localhost:3001](http://localhost:3001) (`admin` / `admin`)
   - Show the live dashboard (after adding the Prometheus data source at `http://prometheus:9090`).
   - Watch metrics climb as you interact with the app.

---

## 🏗️ Core Application Workflow

### Flow 1: The Instructor Experience
1. **Signup/Login**: Create a Teacher account.
2. **Class Management**: Create a new Class (note the join code).
3. **Task Creation**: Create an Assignment with a due date.

### Flow 2: The Student Experience
1. **Join Class**: Login as a Student and join using the code.
2. **Submission**: Submit a response (text or file) to the assignment.
3. **Dashboard**: Verify the "Submitted" count increases and the "Pending" count decreases.

---

## 🚨 Failure Mode Test (Resilience)
Prove the system handles degradation gracefully.

1. Stop the MongoDB container: `docker stop stt_mongodb`
2. Access `http://localhost/api/health`.
   - **Verify**: Returns `503 Service Unavailable`.
   - **Verify**: `database: unreachable`.
3. Restart MongoDB: `docker start stt_mongodb`
   - **Verify**: Health check returns `200 OK` automatically.

---

## 📁 Repository Integrity
- [ ] No `node_modules` or `__pycache__` in the folder tree.
- [ ] `backend/` is the only FastAPI folder.
- [ ] `README.md` and `LICENSE` are present and professional.
