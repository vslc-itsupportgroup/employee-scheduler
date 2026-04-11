#!/bin/bash

echo "================================"
echo "Employee Scheduling System Setup"
echo "================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

echo "✓ Docker and Docker Compose found"

# Create environment file if doesn't exist
if [ ! -f backend/.env ]; then
    echo "Creating backend .env file..."
    cp backend/.env.example backend/.env
    echo "✓ Environment file created. Update backend/.env if needed."
fi

echo ""
echo "Starting services..."
docker-compose up -d --build

echo ""
echo "Waiting for services to start..."
sleep 5

# Check if services are running
if docker-compose ps | grep -q "healthy"; then
    echo "✓ Services started successfully!"
    echo ""
    echo "================================"
    echo "Application is ready!"
    echo "================================"
    echo "Frontend: http://localhost:3000"
    echo "Backend:  http://localhost:5000"
    echo "Database: localhost:5432"
    echo ""
    echo "First user registration:"
    echo "1. Open http://localhost:3000"
    echo "2. Click 'Register here'"
    echo "3. Create your account"
    echo ""
    echo "View logs:"
    echo "  docker-compose logs -f"
    echo ""
    echo "Stop services:"
    echo "  docker-compose down"
else
    echo "⚠️  Services may still be starting..."
    echo "Check status with: docker-compose ps"
    echo "View logs with: docker-compose logs -f"
fi
