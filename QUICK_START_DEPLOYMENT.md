# Quick Start - Deploy to Proxmox VE

## ⚡ 30-Second Setup

```bash
# 1. SSH into your Proxmox container
ssh root@your-proxmox-ip
pct enter 100  # Your container ID

# 2. Install Docker (one-time)
apt-get update && apt-get install -y docker.io docker-compose git

# 3. Clone and setup
cd /opt
git clone https://github.com/your-username/employee-scheduler.git
cd employee-scheduler

# 4. Configure
cp .env.example .env
nano .env  # Edit: DB_PASSWORD, JWT_SECRET, domain names

# 5. Deploy!
docker-compose -f docker-compose.prod.yml --env-file .env up -d

# 6. Verify
curl http://localhost:5000/api/health
```

## 🚀 Deployment Checklist

### Before Deployment
- [ ] Code committed and pushed to `main` branch
- [ ] All tests passing
- [ ] `.env` file configured with production values
- [ ] Backup strategy confirmed (backups dir exists)
- [ ] DNS pointing to server IP

### Deployment Steps
- [ ] SSH into Proxmox container
- [ ] Pull latest code: `git pull origin main`
- [ ] Run upgrade: `bash upgrade.sh production`
- [ ] Check status: `docker-compose ps`
- [ ] Test health: `curl https://your-domain.com/api/health`

### Post-Deployment
- [ ] Verify frontend loads at https://your-domain.com
- [ ] Test login functionality
- [ ] Check email notifications (if applicable)
- [ ] Monitor logs: `docker-compose logs -f`
- [ ] Smoke test key features

## 🔄 Update Workflow

**Staging (Test First):**
```bash
git checkout testing
git pull origin testing
bash upgrade.sh staging
# Test at http://container-ip:3000
```

**Production (After Validation):**
```bash
git checkout main
git pull origin main
bash upgrade.sh production
# Verify at https://your-domain.com
```

## 📦 What's in the Box

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production deployment config |
| `.env.example` | Template for environment variables |
| `.env.staging` | Pre-configured staging environment |
| `upgrade.sh` | Zero-downtime deployment script |
| `rollback.sh` | Emergency rollback script |
| `DEPLOYMENT_GUIDE.md` | Comprehensive deployment docs |

## 🆘 Troubleshooting Quick Links

**Services won't start?**
```bash
docker-compose logs - f backend
```

**Need to rollback?**
```bash
bash rollback.sh production ./backups/db_backup_production_*.sql
```

**Forgot password?**
```bash
# Check DB credentials in .env
cat .env | grep DB_
```

**Want to access database?**
```bash
docker-compose exec postgres psql -U postgres -d employee_scheduling
```

## 📍 Key Ports

- Frontend: `80` (HTTP) / `443` (HTTPS)
- Backend API: `5000`
- PostgreSQL: `5432` (internal only)

## 🔐 Security Reminders

✅ **DO:**
- [ ] Generate unique `JWT_SECRET`: `openssl rand -base64 32`
- [ ] Use strong `DB_PASSWORD`
- [ ] Enable HTTPS on your domain
- [ ] Keep `.env` file secure (never commit to git)
- [ ] Regular backups (`./backups/` directory)

❌ **DON'T:**
- [ ] Use default/example secrets in production
- [ ] Commit `.env` to version control
- [ ] Expose ports 5432 (database) to internet
- [ ] Run as root user (use docker-compose security options)

## 📞 Need Help?

**Check logs first:**
```bash
docker-compose logs --tail=50 backend
```

**SSH into container to debug:**
```bash
docker-compose exec backend /bin/sh
docker-compose exec postgres psql -U postgres
```

**View resource usage:**
```bash
docker stats
```

---

**Remember:** Always test in staging before deploying to production! 🎯
