#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load port overrides
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-5001}"
MONGO_PORT="${MONGO_PORT:-27017}"
QDRANT_PORT="${QDRANT_PORT:-6333}"

if [ -f .env.local ]; then
  eval "$(grep '^FRONTEND_PORT=' .env.local 2>/dev/null)" || true
  eval "$(grep '^BACKEND_PORT=' .env.local 2>/dev/null)" || true
  eval "$(grep '^MONGO_PORT=' .env.local 2>/dev/null)" || true
  eval "$(grep '^QDRANT_PORT=' .env.local 2>/dev/null)" || true
fi

export FRONTEND_PORT BACKEND_PORT MONGO_PORT QDRANT_PORT

VENV_PATH="${VENV_PATH:-$HOME/Documents/venvs/field-notes}"

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  wait $BACKEND_PID 2>/dev/null || true
  wait $FRONTEND_PID 2>/dev/null || true
  echo "Done."
}
trap cleanup EXIT INT TERM

# 1. Start infrastructure (mongo + qdrant only)
echo "Starting mongo and qdrant..."
docker compose up -d mongo qdrant

echo "Waiting for MongoDB on port $MONGO_PORT..."
for i in $(seq 1 30); do
  if mongosh --quiet --port "$MONGO_PORT" --eval "db.runCommand({ping:1})" >/dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Error: MongoDB did not start within 30 seconds" >&2
    exit 1
  fi
  sleep 1
done
echo "MongoDB ready."

# 2. Run migrations
echo "Running migrations..."
(
  . "$VENV_PATH/bin/activate"
  set -a; . ./.env; [ -f .env.local ] && . ./.env.local; set +a
  export ALLOW_DEV_AUTH=true
  export MONGO_URI="mongodb://localhost:$MONGO_PORT/${MONGO_DB_NAME:-ghostmonk}"
  cd backend && pymongo-migrate migrate -u "$MONGO_URI" -m migrations
)

# 3. Seed data
echo "Seeding data..."
(
  . "$VENV_PATH/bin/activate"
  python scripts/seed.py --mongo-uri "mongodb://localhost:$MONGO_PORT" --db-name "${MONGO_DB_NAME:-ghostmonk}"
)

# 4. Start backend
echo "Starting backend on port $BACKEND_PORT..."
(
  . "$VENV_PATH/bin/activate"
  set -a; . ./.env; [ -f .env.local ] && . ./.env.local; set +a
  export ALLOW_DEV_AUTH=true
  export MONGO_URI="mongodb://localhost:$MONGO_PORT/${MONGO_DB_NAME:-ghostmonk}"
  export QDRANT_URL="http://localhost:$QDRANT_PORT"
  cd backend && uvicorn app:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload
) &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "Error: backend process exited" >&2
    exit 1
  fi
  if [ "$i" -eq 30 ]; then
    echo "Warning: backend health check timed out, continuing anyway..."
  fi
  sleep 1
done
echo "Backend ready."

# 5. Start frontend
echo "Starting frontend on port $FRONTEND_PORT..."
(
  set -a; . ./.env; [ -f .env.local ] && . ./.env.local; set +a
  export NEXT_PUBLIC_API_URL="http://localhost:$BACKEND_PORT"
  export BACKEND_URL="http://localhost:$BACKEND_PORT"
  export NEXT_PUBLIC_DEV_AUTH=true
  cd frontend && npx next dev --port "$FRONTEND_PORT"
) &
FRONTEND_PID=$!

echo ""
echo "================================================"
echo "  Frontend:  http://localhost:$FRONTEND_PORT"
echo "  Backend:   http://localhost:$BACKEND_PORT"
echo "  MongoDB:   localhost:$MONGO_PORT"
echo "  Qdrant:    localhost:$QDRANT_PORT"
echo "================================================"
echo "  Press Ctrl+C to stop all services"
echo ""

wait
