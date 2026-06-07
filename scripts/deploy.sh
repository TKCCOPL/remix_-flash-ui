#!/bin/bash
# Deployment script for XiaoC Blog
# Usage: ./scripts/deploy.sh

set -euo pipefail

echo "🚀 Starting deployment..."

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Build and restart containers
echo "🔨 Building containers..."
docker compose down
docker compose up -d --build

# Wait for health checks
echo "⏳ Waiting for services to be healthy..."
sleep 15

# Check health via frontend proxy (backend is not exposed to host)
echo "🏥 Checking service health..."
if curl -sf http://localhost:8080/api/health > /dev/null; then
    echo "✅ Backend is healthy (via frontend proxy)"
else
    echo "❌ Backend health check failed!"
    docker compose logs backend --tail=20
    exit 1
fi

if curl -sf http://localhost:8080/ > /dev/null; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend health check failed!"
    docker compose logs frontend --tail=20
    exit 1
fi

echo ""
echo "✅ Deployment completed successfully!"
echo "   Frontend: http://localhost:8080"
echo "   Backend:  http://localhost:8080/api/health (via proxy)"
