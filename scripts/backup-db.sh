#!/bin/bash
# Khanom House — Database Backup Script
# Usage: bun run backup:db
# Creates a timestamped backup of the SQLite database.

set -euo pipefail

DB_PATH="${DATABASE_URL#file:}"
if [ -z "$DB_PATH" ]; then
  DB_PATH="/home/z/my-project/db/custom.db"
fi

BACKUP_DIR="/home/z/my-project/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/khanom_house_${TIMESTAMP}.db"

if [ ! -f "$DB_PATH" ]; then
  echo "❌ Database file not found: $DB_PATH"
  exit 1
fi

# Copy with integrity check
echo "📦 Backing up $DB_PATH → $BACKUP_FILE"
cp "$DB_PATH" "$BACKUP_FILE"

# Verify backup integrity (SQLite PRAGMA integrity_check)
INTEGRITY=$(sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" 2>/dev/null || echo "error")
if [ "$INTEGRITY" = "ok" ]; then
  echo "✅ Backup created: $BACKUP_FILE"
  echo "   Size: $(du -h "$BACKUP_FILE" | cut -f1)"
  echo "   Integrity: OK"
else
  echo "⚠️  Backup created but integrity check failed: $INTEGRITY"
fi

# Keep only last 30 backups
ls -t "$BACKUP_DIR"/khanom_house_*.db 2>/dev/null | tail -n +31 | xargs -r rm
echo "   Retention: last 30 backups kept"
