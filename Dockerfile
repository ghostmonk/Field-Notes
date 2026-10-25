# Combined frontend + backend Dockerfile for single Cloud Run container
# Multi-stage build: node deps → node build → python deps → production

# ---------- Stage 1: Node dependencies ----------
FROM node:22-slim AS node-deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --production=false

# ---------- Stage 2: Next.js build (standalone output) ----------
FROM node:22-slim AS node-build
WORKDIR /app
COPY --from=node-deps /app/node_modules ./node_modules
COPY frontend/ ./

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY}
ENV BACKEND_URL=http://localhost:5001

RUN npm run build

# ---------- Stage 3: Python dependencies ----------
FROM python:3.13-slim AS python-deps
WORKDIR /build

COPY shared/python/ ./shared/python/
RUN pip install --no-cache-dir ./shared/python

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ---------- Stage 4: Production ----------
FROM python:3.13-slim AS production
WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

# Python packages from deps stage
COPY --from=python-deps /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=python-deps /usr/local/bin /usr/local/bin

# Backend application code
COPY backend/ ./backend/
COPY shared/python/ ./shared/python/

# Next.js standalone output
COPY --from=node-build /app/.next/standalone ./frontend/
COPY --from=node-build /app/.next/static ./frontend/.next/static
COPY --from=node-build /app/public ./frontend/public

# Entrypoint script (created in Task 2)
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV PORT=8080
EXPOSE ${PORT}

CMD ["./entrypoint.sh"]
