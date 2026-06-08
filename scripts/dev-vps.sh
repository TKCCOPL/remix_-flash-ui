#!/bin/bash
# VPS 开发环境启动脚本（使用不同端口，不影响生产环境）
# 用法: ./scripts/dev-vps.sh

set -e

echo "🚀 Starting VPS development environment..."
echo "   This uses port 3001/8001 to avoid conflicts with production (8080/8000)"
echo ""

# 强制使用开发配置（通过环境变量覆盖）
export ENVIRONMENT=development
export FRONTEND_URL=http://localhost:3001
export ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001
export TRUST_PROXY_HEADERS=false
export GITHUB_REDIRECT_URI=http://localhost:8001/api/oauth/github/callback
export GITEE_REDIRECT_URI=http://localhost:8001/api/oauth/gitee/callback
export LOG_LEVEL=DEBUG

echo "┌─────────────────────────────────────────────┐"
echo "│  VPS Development Environment                │"
echo "├─────────────────────────────────────────────┤"
echo "│  Frontend:  http://localhost:3001           │"
echo "│  Backend:   http://localhost:8001           │"
echo "│  API Docs:  http://localhost:8001/docs      │"
echo "│                                             │"
echo "│  Production (Docker) still running on:      │"
echo "│  Frontend:  http://localhost:8080           │"
echo "│  Backend:   http://localhost:8000           │"
echo "└─────────────────────────────────────────────┘"
echo ""

# 检查端口是否被占用
if lsof -Pi :8001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "❌ Port 8001 is already in use. Stop it first or use a different port."
    exit 1
fi

if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "❌ Port 3001 is already in use. Stop it first or use a different port."
    exit 1
fi

# 启动后端（端口 8001）
echo "🔧 Starting backend on port 8001..."
(cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8001) &
BACKEND_PID=$!

# 启动前端（端口 3001，代理到 8001）
echo "🎨 Starting frontend on port 3001..."
VITE_API_TARGET=http://127.0.0.1:8001 npm run dev -- --port 3001 &
FRONTEND_PID=$!

# 等待退出信号
trap cleanup EXIT INT TERM

cleanup() {
    echo ""
    echo "🛑 Stopping development servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ Done"
}

echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# 保持前台运行
wait
