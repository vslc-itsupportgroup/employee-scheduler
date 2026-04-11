#!/bin/bash

# Employee Scheduler - Rollback Script

set -e

ENVIRONMENT=${1:-production}
BACKUP_FILE=$2

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./rollback.sh <production|staging> <backup_file>"
  echo ""
  echo "Available backups:"
  ls -lh ./backups/
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [ "$ENVIRONMENT" = "production" ]; then
  COMPOSE_FILE="docker-compose.prod.yml"
  ENV_FILE=".env"
else
  COMPOSE_FILE="docker-compose.yml"
  ENV_FILE=".env.staging"
fi

echo "⚠️  Rolling back $ENVIRONMENT environment..."
echo "📂 Using backup: $BACKUP_FILE"
echo ""

# Stop services
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down

# Start postgres only
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres
sleep 5

# Restore database
echo "🗄️  Restoring database..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres psql -U postgres employee_scheduling < "$BACKUP_FILE"
echo "✅ Database restored"

# Restart all services
echo "🔄 Restarting services..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "✅ Rollback completed!"
