#!/bin/bash

# Employee Scheduler - Health Monitor Script
# Run weekly to monitor container health and disk space

ENVIRONMENT=${1:-production}
ALERT_EMAIL=${2:-admin@domain.com}

if [ "$ENVIRONMENT" = "production" ]; then
  COMPOSE_FILE="docker-compose.prod.yml"
  ENV_FILE=".env"
else
  COMPOSE_FILE="docker-compose.yml"
  ENV_FILE=".env.staging"
fi

echo "🏥 Employee Scheduler Health Monitor - $ENVIRONMENT"
echo "=================================================="
echo ""

# Check 1: Container Status
echo "1️⃣  Container Status:"
docker-compose -f "$COMPOSE_FILE" ps
STATUS_CODE=$?
if [ $STATUS_CODE -eq 0 ]; then
  echo "   ✅ All containers running"
else
  echo "   ❌ Container issue detected!"
fi
echo ""

# Check 2: Disk Usage
echo "2️⃣  Disk Usage:"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
echo "   Root: $DISK_USAGE% used"
if [ "$DISK_USAGE" -gt 80 ]; then
  echo "   ⚠️  WARNING: Disk usage above 80%"
fi

BACKUP_SIZE=$(du -sh ./backups 2>/dev/null | awk '{print $1}')
echo "   Backups: $BACKUP_SIZE"
echo ""

# Check 3: Database Health
echo "3️⃣  Database Health:"
docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U postgres > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ PostgreSQL responding"
  BACKUP_COUNT=$(ls -1 ./backups/db_backup_${ENVIRONMENT}_* 2>/dev/null | wc -l)
  echo "   📦 Backups: $BACKUP_COUNT"
else
  echo "   ❌ PostgreSQL not responding!"
fi
echo ""

# Check 4: Backend Health
echo "4️⃣  Backend API Health:"
HEALTH=$(docker-compose -f "$COMPOSE_FILE" exec -T backend curl -s http://localhost:5000/api/health 2>/dev/null)
if [ ! -z "$HEALTH" ]; then
  echo "   ✅ Backend responding: $HEALTH"
else
  echo "   ❌ Backend not responding!"
fi
echo ""

# Check 5: Memory Usage
echo "5️⃣  Memory & Resources:"
docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.CPUPerc}}"
echo ""

# Check 6: Log Warnings
echo "6️⃣  Recent Errors in Logs (last 20 lines with ERROR or WARN):"
docker-compose -f "$COMPOSE_FILE" logs --tail=100 backend | grep -i "error\|warn" | tail -5
if [ $? -ne 0 ]; then
  echo "   ✅ No errors found"
fi
echo ""

# Check 7: Network Health
echo "7️⃣  Network Health:"
docker network ls | grep employee-scheduler
echo ""

echo "=================================================="
echo "✅ Health check complete!"
echo ""
echo "📋 Maintenance Tips:"
echo "   - Backups found: Review age and count"
echo "   - Disk usage: Clean old Docker images if > 80%"
echo "   - Errors: Check full logs with 'docker-compose logs backend'"
echo ""
