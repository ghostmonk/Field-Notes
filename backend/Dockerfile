FROM python:3.13-slim

WORKDIR /app

# Install shared glogger package first
COPY shared/python/ ./shared/python/
RUN pip install --no-cache-dir ./shared/python

# Install remaining requirements
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

ENV PORT=8080

EXPOSE ${PORT}

CMD ["sh", "-c", "pymongo-migrate migrate -u \"$MONGO_URI\" -m migrations && uvicorn app:app --host 0.0.0.0 --port ${PORT}"]

