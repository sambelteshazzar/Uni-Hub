#!/bin/bash

# ============================================
# JERTS CART One-Command Startup
# ============================================

cd "$(dirname "$0")" || exit 1

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║ 🎓 JERTS CART Complete System Startup ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check prerequisites
echo -e "${BLUE}[1/4] Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
echo -e "${RED}✗ Node.js not found. Please install Node.js v18+${NC}"
exit 1
fi

if ! command -v npm &> /dev/null; then
echo -e "${RED}✗ npm not found. Please install npm${NC}"
exit 1
fi

echo -e "${GREEN}✓ Node $(node --version) found${NC}"
echo -e "${GREEN}✓ npm $(npm --version) found${NC}"

echo -e "${GREEN}✓ SQLite: zero-setup database (auto-created on first run)${NC}"

# Install dependencies
echo -e "${BLUE}[2/4] Installing dependencies...${NC}"

if [ ! -d "node_modules" ]; then
echo "Installing frontend dependencies..."
npm install --legacy-peer-deps > /dev/null 2>&1 || npm install > /dev/null 2>&1
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
fi

if [ ! -d "backend/node_modules" ]; then
echo "Installing backend dependencies..."
cd backend
npm install --legacy-peer-deps > /dev/null 2>&1 || npm install > /dev/null 2>&1
cd ..
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
echo -e "${GREEN}✓ Backend dependencies already installed${NC}"
fi

# Clear old logs
rm -f backend.log frontend.log 2>/dev/null || true

# Start services
echo -e "${BLUE}[3/4] Starting services...${NC}"

echo "Starting Backend (Port 5000)..."
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

sleep 3

if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
echo -e "${RED}✗ Backend failed to start${NC}"
echo "Check backend.log:"
cat backend.log
exit 1
fi

echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

echo "Starting Frontend (Port 8000)..."
npm start > frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 2

if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
echo -e "${RED}✗ Frontend failed to start${NC}"
echo "Check frontend.log:"
cat frontend.log
kill $BACKEND_PID 2>/dev/null || true
exit 1
fi

echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

# Display summary
echo ""
echo -e "${BLUE}[4/4] Setup complete!${NC}"
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║ ✅ SYSTEM IS RUNNING ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Frontend:${NC} http://localhost:8000"
echo -e "${GREEN}Backend API:${NC} http://localhost:5000/api"
echo -e "${GREEN}Database:${NC} SQLite (backend/data/jertscart.db)"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo " Backend: tail -f backend.log"
echo " Frontend: tail -f frontend.log"
echo ""
echo -e "${YELLOW}Test Credentials:${NC}"
echo " Admin: admin@unihub.local / Admin123!"
echo " Seller: john@student.ug.edu.gh / Student123!"
echo " Buyer: sarah@student.upsa.edu.gh / Student123!"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

cleanup() {
echo ""
echo -e "${BLUE}Shutting down...${NC}"
kill $BACKEND_PID 2>/dev/null || true
kill $FRONTEND_PID 2>/dev/null || true
wait $BACKEND_PID 2>/dev/null || true
wait $FRONTEND_PID 2>/dev/null || true
echo -e "${GREEN}All services stopped${NC}"
}

trap cleanup EXIT INT TERM

wait
