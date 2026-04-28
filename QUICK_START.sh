#!/bin/bash

# ============================================
# Uni-Hub Quick Start Script
# ============================================

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║ 🎓 Uni-Hub Complete Setup                                ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

if ! command -v node &> /dev/null; then
echo "❌ Node.js is not installed. Please install Node.js v18+"
exit 1
fi

echo "✅ Node.js version: $(node --version)"

if ! command -v npm &> /dev/null; then
echo "❌ npm is not installed"
exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""
echo "✅ SQLite: zero-setup database (auto-created on first run)"

echo ""
echo "📦 Installing frontend dependencies..."
npm install --legacy-peer-deps > /dev/null 2>&1 || npm install > /dev/null 2>&1
echo "✅ Frontend dependencies installed"

echo "📦 Installing backend dependencies..."
cd backend
npm install --legacy-peer-deps > /dev/null 2>&1 || npm install > /dev/null 2>&1
echo "✅ Backend dependencies installed"
cd ..

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║ Ready to Start Services!                                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "Starting services..."
echo ""

echo "🚀 Starting Backend (Port 5000)..."
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

sleep 3

if ! ps -p $BACKEND_PID > /dev/null; then
echo "❌ Backend failed to start. Check backend.log"
cat backend.log
exit 1
fi

echo "✅ Backend started (PID: $BACKEND_PID)"
echo ""

echo "🚀 Starting Frontend (Port 8000)..."
npm run start > frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 2

if ! ps -p $FRONTEND_PID > /dev/null; then
echo "❌ Frontend failed to start. Check frontend.log"
cat frontend.log
kill $BACKEND_PID 2>/dev/null || true
exit 1
fi

echo "✅ Frontend started (PID: $FRONTEND_PID)"
echo ""

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║ ✅ Uni-Hub is Running!                                   ║"
echo "║                                                           ║"
echo "║ 🌐 Frontend: http://localhost:8000                       ║"
echo "║ 🔌 Backend API: http://localhost:5000/api                ║"
echo "║ 💾 Database: SQLite (backend/data/unihub.db)             ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

cleanup() {
echo ""
echo "Stopping services..."
kill $BACKEND_PID 2>/dev/null || true
kill $FRONTEND_PID 2>/dev/null || true
wait $BACKEND_PID 2>/dev/null || true
wait $FRONTEND_PID 2>/dev/null || true
echo "✅ All services stopped"
}

trap cleanup EXIT

wait $BACKEND_PID
wait $FRONTEND_PID
