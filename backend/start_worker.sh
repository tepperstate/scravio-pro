#!/bin/bash

echo "Starting dummy HTTP server for Render health checks on port $PORT..."
python -m http.server $PORT &

echo "Starting Celery worker..."
celery -A app.services.celery_tasks worker --loglevel=info
