#!/bin/bash
# 本地开发启动脚本
# 用法: ./scripts/dev.sh

set -e

echo "🚀 Starting local development..."

# 检查 .env.local 是否存在
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found"
    echo "📝 Creating .env.local from .env.local.example..."
    cp .env.local.example .env.local
    echo ""
    echo "✅ Created .env.local"
    echo "   Please edit .env.local with your OAuth credentials if needed"
    echo ""
fi

# 检查后端依赖
if [ ! -d "backend/__pycache__" ] && [ ! -d "backend/.venv" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && pip install -r requirements.txt && cd ..
fi

# 检查前端依赖
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo ""
echo "┌─────────────────────────────────────────────┐"
echo "│  Local Development Environment              │"
echo "├─────────────────────────────────────────────┤"
echo "│  Frontend:  http://localhost:3000           │"
echo "│  Backend:   http://localhost:8001           │"
echo "│  API Docs:  http://localhost:8001/docs      │"
echo "└─────────────────────────────────────────────┘"
echo ""

# 启动后端（后台，端口 8001 避免与 Docker 冲突）
echo "🔧 Starting backend..."
cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!
cd ..

# 启动前端（后台）
echo "🎨 Starting frontend..."
npm run dev &
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
