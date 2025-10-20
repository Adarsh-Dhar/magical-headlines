#!/bin/bash

# Start both the Next.js app and Oracle service for development

echo "🚀 Starting Trade The News Development Environment..."

# Function to cleanup background processes on exit
cleanup() {
    echo "🛑 Shutting down services..."
    kill $APP_PID $ORACLE_PID 2>/dev/null
    exit
}

# Set up cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start Next.js app in background
echo "📱 Starting Next.js app..."
cd /Users/adarsh/Documents/trade-the-news
pnpm dev &
APP_PID=$!

# Wait a moment for the app to start
sleep 3

# Start Oracle service in background
echo "🔮 Starting Oracle service..."
cd /Users/adarsh/Documents/trade-the-news/oracle-service
pnpm build
pnpm start &
ORACLE_PID=$!

echo "✅ Both services started!"
echo "📱 App: http://localhost:3000"
echo "🔮 Oracle: Running in background"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for both processes
wait $APP_PID $ORACLE_PID
