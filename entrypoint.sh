#!/bin/bash
set -uo pipefail

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo "[entrypoint] Shutting down"
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null || true
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null || true
    wait
}
trap cleanup SIGTERM SIGINT

MIGRATE_URI="${MONGO_URI:-mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_CLUSTER}.${MONGO_HOST}/${MONGO_DB_NAME:-ghostmonk}?retryWrites=true&w=majority&appName=${MONGO_APP_NAME}}"

echo "[entrypoint] Running database migrations"
cd /app/backend && pymongo-migrate migrate -u "$MIGRATE_URI" -m migrations
cd /app

echo "[entrypoint] Starting FastAPI on :5001"
cd /app/backend && uvicorn app:app --host 0.0.0.0 --port 5001 &
BACKEND_PID=$!
cd /app

echo "[entrypoint] Waiting for backend health check"
for i in $(seq 1 30); do
    if curl -sf http://localhost:5001/health > /dev/null 2>&1; then
        echo "[entrypoint] Backend healthy"
        break
    fi
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "[entrypoint] Backend process exited unexpectedly"
        exit 1
    fi
    sleep 1
done

if ! curl -sf http://localhost:5001/health > /dev/null 2>&1; then
    echo "[entrypoint] Backend failed to become healthy after 30s"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

export BACKEND_URL=http://localhost:5001

NEXT_PORT="${PORT:-3000}"
echo "[entrypoint] Starting Next.js on :${NEXT_PORT}"
HOSTNAME=0.0.0.0 PORT=$NEXT_PORT node /app/frontend/server.js &
FRONTEND_PID=$!

# Wait for Next.js to be ready, then prime ISR cache
echo "[entrypoint] Waiting for Next.js to start"
for i in $(seq 1 30); do
    if curl -sf http://localhost:${NEXT_PORT}/ > /dev/null 2>&1; then
        echo "[entrypoint] Next.js ready, triggering ISR revalidation"
        for attempt in 1 2 3; do
            WARMUP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${NEXT_PORT}/api/warmup)
            if [ "$WARMUP_STATUS" = "200" ]; then
                echo "[entrypoint] ISR warmup succeeded (attempt $attempt)"
                break
            fi
            echo "[entrypoint] Warmup returned $WARMUP_STATUS (attempt $attempt), retrying in 2s..."
            sleep 2
        done
        break
    fi
    sleep 1
done

wait -n $BACKEND_PID $FRONTEND_PID
EXIT_CODE=$?

echo "[entrypoint] Process exited with code $EXIT_CODE, shutting down"
kill $BACKEND_PID 2>/dev/null || true
kill $FRONTEND_PID 2>/dev/null || true
wait
exit $EXIT_CODE
