# ── React Frontend — multi-stage build ────────────────────────────────────────

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies (cached layer)
COPY package.json package-lock.json* ./
RUN npm ci --silent

# Pass the production API base URL so Vite bakes it into the bundle.
# Nginx will proxy /api → backend, so we use an empty string (same-origin).
# Override with --build-arg VITE_API_URL=https://... for external deployments.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# ── Stage 2: serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove the default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy the Vite build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy a minimal nginx config that handles React Router (SPA fallback)
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
