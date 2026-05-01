# 🆘 Demo Fallback & Recovery Guide

Live demos can be unpredictable. Use this guide to handle technical hiccups with confidence and professional composure.

---

## 1. 🛠️ The "Nuclear" Recovery Commands
If the system hangs or behaves inconsistently, run these in order:

```bash
# 1. Full Reset (stops and removes containers + networks)
docker-compose down

# 2. Rebuild & Start (ensures fresh layers)
docker-compose up --build
```

**Specific Service Restarts**:
- If just the API is slow: `docker-compose restart backend`
- If metrics aren't showing: `docker-compose restart prometheus grafana`

---

## 2. 🕵️ Handling Common Failures (The "Pivot" Strategy)

### A. Docker Fails to Start
*   **The Issue**: Likely a port conflict (e.g., port 80 or 3000 already in use).
*   **The Move**: "This environment has a port conflict. While I resolve it, let me walk you through the **Architecture Overview** in the README and the **Docker Compose service mapping** which defines how these isolated containers communicate."

### B. Database Not Connecting
*   **The Issue**: MongoDB container still initializing.
*   **The Move**: Check `http://localhost/api/health`. If it shows `database: unreachable`, say: "The backend's health-check system has correctly identified that the database is still initializing. This demonstrates the **self-verification layer** I implemented to prevent cascading failures."

### C. Frontend Not Loading
*   **The Issue**: Browser cache or Nginx upstream delay.
*   **The Move**: Open the **FastAPI Swagger Docs** (`http://localhost/docs`). Say: "While the frontend UI renders, let's look at the **API Contract**. The entire system is API-first, meaning the backend logic is fully decoupled and can be verified independently."

---

## 📽️ The "Talk-Through" Scripts
Never apologize for the technology; explain the system behavior.

*   **If an endpoint returns an error**: "This response is being caught by the **Global Exception Handler**. It ensures that the system fails gracefully with a structured JSON error rather than crashing the server."
*   **If the rate limit blocks you**: "This is actually a successful demonstration of the **Rate Limiting Invariant**. The system has detected multiple rapid requests and is protecting the backend from a potential DoS scenario."
*   **If Grafana is empty**: "Metrics are collected every 5 seconds. This delay is expected in a production-scraping interval to minimize the performance impact on the primary API."

---

## 📐 Backup Assets (The "Safety Net")
If the environment is completely broken, pivot to a "Code Walkthrough":

1.  **Architecture**: Show the diagram in `README.md`.
2.  **API Design**: Show `backend/app/main.py` (Middleware & Rate Limiting).
3.  **Data Safety**: Show `backend/app/utils/rate_limit.py` (Proxy-aware IP detection).
4.  **Monitoring**: Show `monitoring/prometheus.yml` (Scraping configuration).

---

## 💡 Final Closing (If things went wrong)
> "While live environments can vary, the system is designed to be **fully containerized and reproducible**. The modular architecture ensures that even if one component degrades, the rest of the system maintains its integrity through health probes and isolation."
