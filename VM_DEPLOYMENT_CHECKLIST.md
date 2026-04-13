# VM Deployment Checklist - Complete Setup Guide

## 🔍 Critical Findings & Fixes Applied

### ✅ Fixed Issues
1. **Updated .env files** - Now configured for production on VM
   - DB_HOST: Changed from `postgresql.local` to `localhost` (adjust if DB on different host)
   - NODE_ENV: Changed from `development` to `production`
   - CORS and API URLs: Updated with placeholders for your domain/IP

2. **Database Configuration Fixed**
   - `docker-compose.prod.yml` does NOT include a PostgreSQL service
   - You must have PostgreSQL running on your VM separately
   - Backend will connect to external database via TCP/IP

3. **CORS and API Configuration**
   - `BACKEND_CORS_ORIGIN` - Frontend requests will come from this domain
   - `FRONTEND_API_URL` - Built into frontend during Docker build

---

## 📋 Pre-Deployment Checklist

### Step 1: VM Prerequisites (One-time setup)

**On your Proxmox VM, run:**
```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker & Docker Compose
sudo apt-get install -y docker.io docker-compose curl git nano

# Add your user to docker group (optional, for non-root docker commands)
sudo usermod -aG docker $USER
newgrp docker

# Verify installations
docker --version
docker-compose --version
```

### Step 2: PostgreSQL Setup

**Option A: PostgreSQL as a Docker Container (Recommended)**
```bash
# Create a docker-compose file for PostgreSQL
cat > docker-compose.db.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: employee_scheduler_db
    environment:
      POSTGRES_DB: employee_scheduling
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: CHANGE_ME_SECURE_PASSWORD
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
EOF

# Start PostgreSQL
docker-compose -f docker-compose.db.yml up -d

# Verify
docker-compose -f docker-compose.db.yml ps
```

**Option B: PostgreSQL Installed Directly on VM**
```bash
# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify
sudo -u postgres psql --version
```

### Step 3: Clone Your Repository

```bash
cd /opt  # or your preferred location
git clone https://github.com/your-username/employee-scheduler.git
cd employee-scheduler
```

### Step 4: Configure Environment Variables

**Copy the template:**
```bash
cp .env.example .env
nano .env
```

**Edit these values with your actual production data:**

```env
# Database: Must match your PostgreSQL setup
DB_HOST=localhost             # localhost if PostgreSQL on same host
DB_PORT=5432
DB_NAME=employee_scheduling
DB_USER=postgres
DB_PASSWORD=GENERATE_SECURE_PASSWORD  # Use: openssl rand -base64 32

# JWT Secret: MUST change for security
JWT_SECRET=GENERATE_JWT_SECRET        # Use: openssl rand -base64 32
JWT_EXPIRATION=7d

# Replace with your actual domain or VM IP
BACKEND_CORS_ORIGIN=https://192.168.1.100    # or https://schedule.company.com
FRONTEND_API_URL=https://192.168.1.100/api   # or https://schedule.company.com/api

# Email Configuration
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@your-domain.com

NODE_ENV=production
```

### Step 5: Generate Secure Passwords & Secrets

```bash
# Generate a secure database password
openssl rand -base64 32
# Copy output to DB_PASSWORD in .env

# Generate a secure JWT secret
openssl rand -base64 32
# Copy output to JWT_SECRET in .env
```

### Step 6: Verify .env File

```bash
# Verify all required variables are set
grep -E "CHANGE_ME|GENERATE" .env

# If output shows anything, edit .env until all are removed
nano .env
```

---

## 🚀 Deployment Steps

### Step 1: Build and Start Services

```bash
# From the project root directory
# Make sure you're using docker-compose.prod.yml for production!

docker-compose -f docker-compose.prod.yml --env-file .env up -d

# Monitor the build (takes 5-10 minutes)
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 2: Verify Services are Running

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Output should show:
# - employee-scheduler-api (backend)   HEALTHY
# - employee-scheduler-web (frontend) UP
```

### Step 3: Test Health Endpoints

```bash
# Test backend API
curl http://localhost:5000/api/health

# Expected response:
# {"status":"ok"}

# Test frontend (if using direct IP)
curl http://localhost

# Expected response: HTML page
```

---

## 🔧 Troubleshooting

### Issue: Backend container exits immediately
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Common causes:
# 1. Database not running
# 2. Wrong DB_HOST value
# 3. Wrong DB credentials
# 4. Missing environment variables
```

### Issue: Database connection refused
```bash
# Verify PostgreSQL is running
docker ps | grep postgres
# or
sudo systemctl status postgresql

# Check if PostgreSQL is accessible
psql -h localhost -U postgres -c "SELECT 1"
# or
nc -zv localhost 5432
```

### Issue: Frontend shows blank or "Cannot GET /"
```bash
# Check nginx configuration
docker-compose -f docker-compose.prod.yml logs frontend

# The nginx.conf must exist at: ./frontend/nginx.conf
ls -la frontend/nginx.conf

# Verify FRONTEND_API_URL is set and used in .env
grep FRONTEND_API_URL .env
```

### Issue: CORS errors in browser console
```bash
# Verify BACKEND_CORS_ORIGIN matches your domain/IP
grep BACKEND_CORS_ORIGIN .env

# If wrong, update and redeploy:
nano .env
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 📊 After Deployment Validation

### Test These Features:
- [ ] Frontend loads at your domain/IP
- [ ] Can navigate pages without errors
- [ ] Backend health check: `curl http://localhost:5000/api/health`
- [ ] API responds to requests
- [ ] Email notifications work (if configured)
- [ ] Database queries are working

### Monitor Logs:
```bash
# Real-time backend logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Real-time frontend logs
docker-compose -f docker-compose.prod.yml logs -f frontend

# View last 100 lines of logs
docker-compose -f docker-compose.prod.yml logs --tail 100
```

---

## 🛑 Rollback / Stop Services

```bash
# Stop all services (data persists)
docker-compose -f docker-compose.prod.yml down

# Stop AND remove containers
docker-compose -f docker-compose.prod.yml down --volumes

# View stopped/running services
docker-compose -f docker-compose.prod.yml ps -a
```

---

## 🔐 Security Reminders

1. **Never commit .env file** - Already in .gitignore ✓
2. **Use HTTPS** - Configure reverse proxy (nginx/Apache) with SSL
3. **Change default passwords** - All CHANGE_ME values must be updated
4. **Backup database regularly** - Set up automated PostgreSQL backups
5. **Monitor logs** - Watch for errors and suspicious activity

---

## 📞 Quick Reference Commands

```bash
# View current environment
cat .env | grep -v "^#"

# Restart services
docker-compose -f docker-compose.prod.yml restart

# View resource usage
docker stats

# Check specific container
docker logs -f employee-scheduler-api

# Access database from CLI
psql -h localhost -U postgres -d employee_scheduling
```

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Proxmox VM                      │
├─────────────────────────────────────────┤
│  ┌────────────┐      ┌──────────────┐  │
│  │  Frontend  │◄────►│   Backend    │  │
│  │ (nginx:80) │      │ (node:5000)  │  │
│  └────────────┘      └──────────────┘  │
│         ▲                    │          │
│         │                    │          │
│         └────────┬───────────┘          │
│                  ▼                      │
│         ┌──────────────────┐            │
│         │   PostgreSQL     │            │
│         │    (port 5432)   │            │
│         └──────────────────┘            │
└─────────────────────────────────────────┘
         All in Docker Network
    (employee-scheduler-net)
```

---

**Last Updated:** April 13, 2026
**Status:** Ready for Production Deployment
