#!/bin/bash

echo "=========================================="
echo "🛑 Stopping Hackathon Interview Analysis"
echo "=========================================="
echo ""

# Stop LangGraph dev server (running on port 2024)
echo "🎨 Stopping LangGraph Dev Server..."
LANGGRAPH_PID=$(lsof -ti:2024)
if [ ! -z "$LANGGRAPH_PID" ]; then
    kill $LANGGRAPH_PID 2>/dev/null
    echo "   ✓ LangGraph dev server stopped"
else
    echo "   ℹ  LangGraph dev server not running"
fi
echo ""

# Stop Docker services
echo "🐳 Stopping Docker services..."
docker compose down

echo ""
echo "=========================================="
echo "✅ All services stopped successfully!"
echo "=========================================="
