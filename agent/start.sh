#!/bin/bash

# Automatically set UID, GID, and USER for docker compose
# UID is readonly but needs to be exported as environment variable
export UID
export GID=$(id -g)
export USER=$(whoami)

# Get LangSmith project name from .env
LANGCHAIN_PROJECT=$(grep LANGCHAIN_PROJECT .env | cut -d '=' -f2)

echo "=========================================="
echo "🚀 Starting Hackathon Interview Analysis"
echo "=========================================="
echo ""
echo "📊 LangSmith Monitoring:"
echo "   https://smith.langchain.com/o/default/projects/p/$LANGCHAIN_PROJECT"
echo ""
echo "🔗 API Endpoints:"
echo "   Admin:    http://localhost:8000"
echo "   PDF:      http://localhost:8001"
echo "   Question: http://localhost:8002"
echo "   Face:     http://localhost:8003"
echo "   Voice:    http://localhost:8004"
echo ""
echo "🎨 LangGraph Visualization:"
echo "   Studio UI: https://smith.langchain.com/studio/?baseUrl=http://localhost:2024"
echo "   API: http://localhost:2024"
echo ""
echo "=========================================="
echo ""

# Start Docker services in background
docker compose up --build -d "$@"

# Wait a bit for services to start
sleep 2

echo ""
echo "🎨 Starting LangGraph Dev Server..."
echo ""
echo "💡 TIP: In LangGraph Studio, just input:"
echo '   {"pdf_path": "/app/uploads/introduce.pdf"}'
echo ""
echo "   Session ID will be auto-generated!"
echo ""

# Start langgraph dev
langgraph dev --tunnel --allow-blocking
