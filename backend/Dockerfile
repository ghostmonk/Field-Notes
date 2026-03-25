FROM python:3.13-slim

WORKDIR /app

# Install ffmpeg for video poster frame extraction
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

# Install shared glogger package first
COPY shared/python/ ./shared/python/
RUN pip install --no-cache-dir ./shared/python

# Install remaining requirements
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

ENV PORT=8080

EXPOSE ${PORT}

CMD ["sh", "-c", "MIGRATE_URI=\"${MONGO_URI:-mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_CLUSTER}.${MONGO_HOST}/${MONGO_DB_NAME:-ghostmonk}?retryWrites=true&w=majority&appName=${MONGO_APP_NAME}}\" && pymongo-migrate migrate -u \"$MIGRATE_URI\" -m migrations && uvicorn app:app --host 0.0.0.0 --port ${PORT}"]

