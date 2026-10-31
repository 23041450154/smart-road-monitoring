#!/usr/bin/env bash
set -e

echo "=== [DEVOPS] Starting Deployment at $(date) ==="
TARGET_DIR="/home/ubuntu/capstone"
if [ ! -d "$TARGET_DIR" ]; then
    TARGET_DIR="/root/capstone"
fi
cd "$TARGET_DIR"

echo "1. Fetching and pulling latest code..."
git fetch origin main
git reset --hard origin/main

echo "2. Building & restarting containers..."
COMPOSE_FILE="docker-compose.prod.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
    COMPOSE_FILE="docker-compose.yml"
fi
docker compose -f "$COMPOSE_FILE" up --build -d --remove-orphans

echo "3. Cleaning up old unused Docker images..."
docker image prune -f

echo "4. Checking container health..."
sleep 5
docker compose -f "$COMPOSE_FILE" ps

echo "=== [DEVOPS] Deployment Completed Successfully! ==="
