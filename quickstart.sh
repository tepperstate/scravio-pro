#!/bin/bash

# Scravio Email Scraper - Quick Start Script

echo "🚀 Scravio Email Scraper - Setting up..."
echo ""

# Check prerequisites
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "📋 Checking prerequisites..."

if command_exists python3; then
    echo "✓ Python 3 found"
else
    echo "✗ Python 3 not found. Please install Python 3.10+"
    exit 1
fi

if command_exists node; then
    echo "✓ Node.js found"
else
    echo "✗ Node.js not found. Please install Node.js 18+"
    exit 1
fi

if command_exists docker; then
    echo "✓ Docker found"
else
    echo "⚠ Docker not found. You can still run services manually."
fi

echo ""
echo "🎯 Choose installation method:"
echo ""
echo "1. Docker (Recommended - Everything in one command)"
echo "2. Manual Setup (Backend + Frontend separately)"
echo "3. Backend Only"
echo "4. Frontend Only"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🐳 Starting with Docker Compose..."
        docker-compose up -d
        echo ""
        echo "✅ Services starting!"
        echo "   - Frontend: http://localhost:3000"
        echo "   - API: http://localhost:8000"
        echo "   - Docs: http://localhost:8000/docs"
        ;;
    2)
        echo ""
        echo "🔧 Setting up Backend..."
        cd backend
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        echo "✓ Backend dependencies installed"
        echo ""
        echo "🔧 Setting up Frontend..."
        cd ../frontend
        npm install
        echo "✓ Frontend dependencies installed"
        echo ""
        echo "✅ Setup complete!"
        echo ""
        echo "To start the backend:"
        echo "  cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
        echo ""
        echo "To start the frontend:"
        echo "  cd frontend && npm run dev"
        ;;
    3)
        echo ""
        echo "🔧 Setting up Backend only..."
        cd backend
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        echo ""
        echo "✅ Backend ready!"
        echo "Start with: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
        ;;
    4)
        echo ""
        echo "🔧 Setting up Frontend only..."
        cd frontend
        npm install
        echo ""
        echo "✅ Frontend ready!"
        echo "Start with: cd frontend && npm run dev"
        ;;
    *)
        echo "Invalid choice. Please run the script again."
        ;;
esac

echo ""
echo "📚 Documentation:"
echo "   - API Docs: http://localhost:8000/docs"
echo "   - Project README: ./README.md"
echo ""
echo "🎉 Happy scraping!"