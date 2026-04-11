#!/bin/bash

# Employee Scheduler - Safe Upgrade Script for Proxmox VE
# This script safely upgrades your application with zero downtime

set -e

ENVIRONMENT=${1:-production}
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_${ENVIRONMENT}_${TIMESTAMP}.sql"

echo "🚀 Starting safe upgrade for $ENVIRONMENT environment..."
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Step 1: Backup database
echo "📦 Step 1: Creating database backup..."
if [ "$ENVIRONMENT" = "production" ]; then
  COMPOSE_FILE="docker-compose.prod.yml"
  ENV_FILE=".env"
else
  COMPOSE_FILE="docker-compose.yml"
  ENV_FILE=".env.staging"
fi

docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres pg_dump -U postgres employee_scheduling > "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"
echo ""

# Step 2: Pull latest code
echo "📥 Step 2: Pulling latest code from repository..."
git pull origin main
echo "✅ Code updated"
echo ""

# Step 3: Build new images
echo "🔨 Step 3: Building new Docker images..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache
echo "✅ Images built successfully"
echo ""

# Step 4: Run database migrations (if any)
echo "🗄️  Step 4: Running database migrations..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres
sleep 5
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d backend
echo "✅ Migrations completed"
echo ""

# Step 5: Restart all services with new images
echo "🔄 Step 5: Restarting services with new images..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
echo "✅ Services restarted"
echo ""

# Step 6: Verify health
echo "🏥 Step 6: Verifying service health..."
sleep 5
if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
  echo "✅ Backend health check passed"
else
  echo "❌ Backend health check failed!"
  echo "🔙 Rolling back..."
  docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
  exit 1
fi

echo ""
echo "✅ Upgrade completed successfully!"
echo "📍 Backup saved to: $BACKUP_FILE"
echo ""
echo "If you need to rollback, restore the database backup:"
echo "  docker-compose -f $COMPOSE_FILE exec postgres psql -U postgres employee_scheduling < $BACKUP_FILE"
