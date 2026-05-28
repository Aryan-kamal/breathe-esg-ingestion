#!/usr/bin/env bash
set -o errexit

echo "Running migrations..."
python manage.py migrate --no-input

echo "Seeding database (skips if data already exists)..."
python manage.py seed

echo "Starting Gunicorn..."
exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}"
