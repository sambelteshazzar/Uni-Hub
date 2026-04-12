#!/bin/bash

# ============================================
# Uni-Hub Quick Start Script
# ============================================
# Start both frontend and backend servers
# Usage: ./QUICK_START.sh

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   🎓 Uni-Hub Complete Setup                               ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18+"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

# Check if MongoDB is running
echo "🔍 Checking MongoDB connection..."
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        echo "✅ MongoDB is running"
    else
        echo "⚠️  MongoDB connection failed. Make sure MongoDB is running!"
        echo "   • Start with: mongod"
        echo "   • Or Docker: docker run -d --name uni-hub-mongo -p 27017:27017 mongo:latest"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
elif command -v mongo &> /dev/null; then
    if mongo --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        echo "✅ MongoDB is running"
    else
        echo "⚠️  MongoDB connection failed"
    fi
else
    echo "⚠️  MongoDB tools not found. Make sure MongoDB is running on localhost:27017"
fi

echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install --legacy-peer-deps > /dev/null 2>&1 || npm install > /dev/null 2>&1
echo "✅ Frontend dependencies installed"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --legacy-peer-deps > /dev/null 2>&1 || npm install > /dev/null 2>&1
echo "✅ Backend dependencies installed"
cd ..

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          Ready to Start Services!                          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "Starting services..."
echo ""

# Start backend in background
echo "🚀 Starting Backend (Port 5000)..."
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Give backend time to start
sleep 3

# Check if backend started successfully
if ! ps -p $BACKEND_PID > /dev/null; then
    echo "❌ Backend failed to start. Check backend.log"
    cat backend.log
    exit 1
fi

echo "✅ Backend started (PID: $BACKEND_PID)"
echo ""

# Start frontend in background
echo "🚀 Starting Frontend (Port 8000)..."
npm run start > frontend.log 2>&1 &
FRONTEND_PID=$!

# Give frontend time to start
sleep 2

# Check if frontend started successfully
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
echo "║   ✅ Uni-Hub is Running!                                  ║"
echo "║                                                           ║"
echo "║   🌐 Frontend: http://localhost:8000                       ║"
echo "║   🔌 Backend API: http://localhost:5000/api               ║"
echo "║   💾 Database: MongoDB at localhost:27017                 ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
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

# Wait for both processes
wait $BACKEND_PID
wait $FRONTEND_PID
