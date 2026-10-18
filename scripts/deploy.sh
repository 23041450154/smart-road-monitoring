#!/usr/bin/env bash
set -e

echo "=== [DEVOPS] Starting Deployment at $(date) ==="
cd /root/capstone

echo "1. Fetching and pulling latest code..."
git fetch origin main
git reset --hard origin/main

echo "2. Building & restarting containers..."
docker compose up --build -d --remove-orphans

echo "3. Cleaning up old unused Docker images..."
docker image prune -f

echo "4. Checking container health..."
sleep 5
docker compose ps

echo "=== [DEVOPS] Deployment Completed Successfully! ==="
