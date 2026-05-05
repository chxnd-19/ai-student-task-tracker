# ── FastAPI Backend ────────────────────────────────────────────────────────────
# python:3.11-slim keeps the image small while matching the dev Python version.
FROM python:3.11-slim

# Prevent .pyc files and enable unbuffered stdout/stderr (important for logs)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first — this layer is cached unless requirements.txt changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Create the uploads directory so the app can write files on first run
RUN mkdir -p uploads

EXPOSE 5000

# Run with uvicorn in production mode (no --reload)
# Workers=1 keeps the in-memory TTL cache consistent across requests.
# Scale horizontally via Docker Compose replicas + an external cache if needed.
# Use shell form to allow environment variable expansion
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-5000} --workers 1
