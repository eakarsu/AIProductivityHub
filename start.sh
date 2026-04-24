#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "================================================"
echo "     AI Productivity Hub - Startup Script"
echo "================================================"
echo -e "${NC}"

# Function to clean up on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Step 1: Kill processes on required ports
echo -e "${YELLOW}Step 1: Cleaning up ports...${NC}"

# Kill process on port 3001 (backend)
PORT_3001_PID=$(lsof -ti:3001 2>/dev/null)
if [ ! -z "$PORT_3001_PID" ]; then
    echo "Killing process on port 3001 (PID: $PORT_3001_PID)"
    kill -9 $PORT_3001_PID 2>/dev/null
fi

# Kill process on port 3000 (frontend)
PORT_3000_PID=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$PORT_3000_PID" ]; then
    echo "Killing process on port 3000 (PID: $PORT_3000_PID)"
    kill -9 $PORT_3000_PID 2>/dev/null
fi

echo -e "${GREEN}Ports cleaned.${NC}"

# Step 2: Load environment variables
echo -e "\n${YELLOW}Step 2: Loading environment variables...${NC}"
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}Environment variables loaded.${NC}"
else
    echo -e "${RED}Warning: .env file not found. Using defaults.${NC}"
fi

# Step 3: Check PostgreSQL connection and create database
echo -e "\n${YELLOW}Step 3: Setting up database...${NC}"

DB_NAME=${DB_NAME:-ai_productivity_hub}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
    echo -e "${RED}PostgreSQL is not running. Please start PostgreSQL and try again.${NC}"
    echo -e "${YELLOW}On macOS: brew services start postgresql${NC}"
    echo -e "${YELLOW}On Linux: sudo systemctl start postgresql${NC}"
    exit 1
fi

# Create database if it doesn't exist
echo "Creating database '$DB_NAME' if it doesn't exist..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME"

echo -e "${GREEN}Database setup complete.${NC}"

# Step 4: Install dependencies
echo -e "\n${YELLOW}Step 4: Installing dependencies...${NC}"

# Backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install --silent
cd ..

# Frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install --silent
cd ..

echo -e "${GREEN}Dependencies installed.${NC}"

# Step 5: Seed the database
echo -e "\n${YELLOW}Step 5: Seeding database with sample data...${NC}"
cd backend
node seeds/seedAll.js
cd ..
echo -e "${GREEN}Database seeded successfully.${NC}"

# Step 6: Start the servers
echo -e "\n${YELLOW}Step 6: Starting servers...${NC}"

# Start backend with nodemon for hot reload
echo "Starting backend server on port 3001..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend (unset PORT so CRA uses default 3000 instead of backend's 3001)
echo "Starting frontend server on port 3000..."
cd frontend
BROWSER=none PORT=3000 npm start &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 5

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}     AI Productivity Hub is now running!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}Backend:${NC}  http://localhost:3001"
echo ""
echo -e "${YELLOW}Demo Login Credentials:${NC}"
echo "  Email: demo@example.com"
echo "  Password: demo123"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Keep script running and wait for both processes
wait $BACKEND_PID $FRONTEND_PID
