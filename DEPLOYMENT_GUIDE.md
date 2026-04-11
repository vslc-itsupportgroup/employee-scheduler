# Employee Scheduler - Proxmox VE Deployment Guide

## Architecture

```
Proxmox VE Host
├── Staging Container (testing)
│   ├── PostgreSQL (staging_db)
│   ├── Backend (staging-api)
│   └── Frontend (staging-web)
└── Production Container (live)
    ├── PostgreSQL (prod_db)
    ├── Backend (prod-api)
    └── Frontend (prod-web)
```

## Initial Setup (First Time Only)

### 1. SSH into Proxmox Container

```bash
# Login to your Proxmox node
ssh root@proxmox-ip

# Enter the container
lxc-attach -n your-container-name
# or
pct enter 100  # Replace 100 with your container ID
```

### 2. Install Prerequisites

```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Docker
apt-get install -y docker.io docker-compose curl git

# Start Docker service
systemctl start docker
systemctl enable docker

# Verify installation
docker --version
docker-compose --version
```

### 3. Clone Your Repository

```bash
# Navigate to a suitable directory
cd /opt
# or
cd /home/username

# Clone your repo
git clone https://github.com/your-username/employee-scheduler.git
cd employee-scheduler
```

### 4. Configure Environment

**For Production:**
```bash
# Copy and edit the environment file
cp .env.example .env

# Edit with your secure values
nano .env
```

**For Staging:**
```bash
# Staging uses .env.staging (already configured)
# But update the IPs to match your Proxmox container IPs
nano .env.staging
```

**Required Changes in .env:**
- `DB_PASSWORD`: Generate with `openssl rand -base64 32`
- `JWT_SECRET`: Generate with `openssl rand -base64 32`
- `BACKEND_CORS_ORIGIN`: Your domain (e.g., https://schedule.company.com)
- `FRONTEND_API_URL`: Your backend URL (e.g., https://schedule.company.com/api)
- `SMTP_*`: Configure your email provider

### 5. Initial Deployment - Production

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml --env-file .env up -d

# Check status
docker-compose -f docker-compose.prod.yml --env-file .env ps

# View logs
docker-compose -f docker-compose.prod.yml --env-file .env logs -f backend
```

### 6. Initial Deployment - Staging

```bash
# Build and start staging services
docker-compose -f docker-compose.yml --env-file .env.staging up -d

# Check status
docker-compose ps
```

## Testing the Deployment

### Access the Application

- **Production Frontend**: https://your-domain.com
- **Production API**: https://your-domain.com/api/health
- **Staging Frontend**: http://container-ip:3000
- **Staging API**: http://container-ip:5000/api/health

### Quick Healthcheck

```bash
# Check backend health
curl -s http://localhost:5000/api/health

# Check database connection
docker-compose -f docker-compose.prod.yml exec postgres pg_isready
```

## Upgrade Workflow

### 1. Test in Staging First

```bash
# SSH into container
ssh root@proxmox-ip
cd /opt/employee-scheduler

# Make your changes locally and commit to a feature branch
git checkout -b feature/your-feature
git add .
git commit -m "Your changes"
git push origin feature/your-feature

# Or pull latest from testing branch
git checkout testing
git pull origin testing

# Run upgrade script on staging
bash upgrade.sh staging

# Test the application
# Visit http://container-ip:3000 and verify all features work
```

### 2. Once Validated, Deploy to Production

```bash
# Merge changes to main branch
git checkout main
git pull origin main

# Run upgrade script on production (with zero downtime)
bash upgrade.sh production

# Verify health
curl -s https://your-domain.com/api/health
```

## Safe Upgrade Process Explained

The `upgrade.sh` script does the following:

1. **Backup Database**: Creates timestamped backup before any changes
2. **Pull Code**: Gets latest code from your git repository
3. **Build Images**: Rebuilds Docker images with new code
4. **Run Migrations**: Executes any database migrations
5. **Blue-Green Deploy**: Stops old services and starts new ones
6. **Health Check**: Verifies both backend and frontend are responding
7. **Auto-Rollback**: If health check fails, everything rolls back automatically

**Backup Location**: `./backups/db_backup_production_YYYYMMDD_HHMMSS.sql`

## Rolling Back (If Needed)

```bash
# List available backups
ls -lh ./backups/

# Restore a specific backup
bash rollback.sh production ./backups/db_backup_production_20260411_143022.sql

# Or staging
bash rollback.sh staging ./backups/db_backup_staging_20260411_143022.sql
```

## Container Management

### View Logs

```bash
# All logs
docker-compose -f docker-compose.prod.yml logs

# Just backend
docker-compose -f docker-compose.prod.yml logs backend

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Stop Services

```bash
# Stop all (keeps data)
docker-compose -f docker-compose.prod.yml stop

# Stop and remove containers (data persists in volumes)
docker-compose -f docker-compose.prod.yml down
```

### Restart Services

```bash
# Restart all (useful after config changes)
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Database Access

```bash
# Connect to PostgreSQL CLI
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d employee_scheduling

# Common commands in psql:
# \dt                  - List all tables
# \d users             - Describe users table
# SELECT * FROM users; - Query data
# \q                   - Quit
```

### Execute Commands in Container

```bash
# Run npm commands in backend
docker-compose -f docker-compose.prod.yml exec backend npm list

# Check Node version
docker-compose -f docker-compose.prod.yml exec backend node --version

# View backend .env
docker-compose -f docker-compose.prod.yml exec backend env | grep DB_
```

## Monitoring & Maintenance

### Daily

- Check logs for errors: `docker-compose logs --tail=50`
- Verify health: `curl https://your-domain.com/api/health`

### Weekly

- Review disk usage: `docker system df`
- Check for updates: `git fetch && git log origin/main -5`

### Monthly

- Test backup restoration process
- Update Docker images: `docker-compose pull && docker-compose up -d`

## Performance Optimization

### 1. Limit Log Files

Docker logs are already configured in docker-compose.prod.yml:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### 2. Prune Old Data (Optional)

```bash
# Remove unused Docker objects
docker system prune -a

# WARNING: This removes all stopped containers and unused images
```

### 3. Monitor Resource Usage

```bash
# View container stats
docker stats

# View disk usage
docker system df
```

## Troubleshooting

### Backend not connecting to database

```bash
# Check if postgres is running and healthy
docker-compose ps

# Check postgres logs
docker-compose logs postgres

# Verify connection
docker-compose exec backend curl -s http://postgres:5432
```

### Frontend showing blank page

```bash
# Check frontend logs
docker-compose logs frontend

# Verify API connection
# Open browser console (F12) and check network tab
# Ensure FRONTEND_API_URL is correct in .env
```

### Services not starting

```bash
# Check logs for specific service
docker-compose logs backend

# Rebuild images
docker-compose build --no-cache

# Try again
docker-compose up -d
```

### Port already in use

```bash
# Find what's using port 5000
netstat -tlnp | grep 5000

# Or for Docker
docker ps --all

# Kill process if needed
kill -9 <PID>
```

## Proxmox-Specific Notes

### Container Backup Strategy

In addition to database backups, backup your container:

```bash
# From Proxmox host (not inside container)
# Set full container backup
pct backup 100 /backup/path

# Or with vzdump
vzdump lxc 100 --dumpdir /backup/path
```

### Container Snapshots

```bash
# Create snapshot before major upgrades
pct snapshot 100 pre-upgrade-20260411

# Restore if needed
pct rollback 100 pre-upgrade-20260411

# Delete snapshot
pct delsnapshot 100 pre-upgrade-20260411
```

### Network Configuration

If container needs custom IP:

```bash
# Edit container config on Proxmox host
nano /etc/pve/lxc/100.conf

# Add or modify:
net0: name=eth0,hwaddr=...,ip=192.168.1.100/24,gw=192.168.1.1,type=veth

# Then restart container
pct reboot 100
```

## Git Workflow for Deployment

### Development Branch
```bash
git checkout develop
git pull origin develop
bash upgrade.sh staging
# Test thoroughly
```

### Production Branch
```bash
# Only merge to main after staging validation
git checkout main
git merge develop
git push origin main
bash upgrade.sh production
```

## Summary of Commands

| Task | Command |
|------|---------|
| Deploy Production | `bash upgrade.sh production` |
| Deploy Staging | `bash upgrade.sh staging` |
| View Logs | `docker-compose logs -f backend` |
| Access Database | `docker-compose exec postgres psql -U postgres` |
| Rollback | `bash rollback.sh production ./backups/...` |
| Restart Services | `docker-compose restart` |
| Stop Services | `docker-compose down` |
| View Status | `docker-compose ps` |

## Support & Questions

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment: `cat .env`
3. Check network: `docker network ls`
4. Inspect containers: `docker inspect container-name`

---

**Last Updated**: April 11, 2026
**Tested On**: Proxmox VE with Docker Compose v3.8
