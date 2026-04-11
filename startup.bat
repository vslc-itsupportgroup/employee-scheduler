@echo off
REM Employee Scheduling System Startup Script for Windows

echo ================================
echo Employee Scheduling System Setup
echo ================================
echo.

REM Check for Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker not found. Please install Docker Desktop first.
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker Compose not found. Please install Docker Compose first.
    pause
    exit /b 1
)

echo ✓ Docker and Docker Compose found
echo.

REM Create .env file if it doesn't exist
if not exist "backend\.env" (
    echo Creating backend .env file...
    copy backend\.env.example backend\.env
    echo ✓ Environment file created. Update backend\.env if needed.
    echo.
)

echo Starting services with Docker Compose...
docker-compose up -d --build

echo.
echo Waiting for services to start (10 seconds)...
timeout /t 10 /nobreak

echo.
echo ================================
echo Setup Complete!
echo ================================
echo.
echo Open these URLs in your browser:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000/api/health
echo.
echo Useful commands:
echo   View logs:    docker-compose logs -f
echo   Stop services: docker-compose down
echo   View status:  docker-compose ps
echo.
pause
