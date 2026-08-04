#!/bin/bash
# Khanom House — Database Restore Script
# Usage: bun run restore:db -- backups/khanom_house_20240101_120000.db
# WARNING: Overwrites the current database. Requires --confirm flag.

set -euo pipefail

CONFIRM="--confirm"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: bun run restore:db -- <backup-file> $CONFIRM"
  echo "Example: bun run restore:db -- backups/khanom_house_20240101_120000.db --confirm"
  exit 1
fi

if [ "$2" != "$CONFIRM" ]; then
  echo "⚠️  This will OVERWRITE the current database."
  echo "   Add --confirm to proceed: bun run restore:db -- $BACKUP_FILE --confirm"
  exit 1
fi

DB_PATH="${DATABASE_URL#file:}"
if [ -z "$DB_PATH" ]; then
  DB_PATH="/home/z/my-project/db/custom.db"
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Backup current DB before restore
CURRENT_BACKUP="/home/z/my-project/backups/pre-restore_$(date +%Y%m%d_%H%M%S).db"
mkdir -p /home/z/my-project/backups
cp "$DB_PATH" "$CURRENT_BACKUP"
echo "📦 Current DB backed up to: $CURRENT_BACKUP"

# Restore
echo "🔄 Restoring from: $BACKUP_FILE"
cp "$BACKUP_FILE" "$DB_PATH"

# Verify
INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>/dev/null || echo "error")
if [ "$INTEGRITY" = "ok" ]; then
  echo "✅ Restore successful. Integrity: OK"
  echo "   To undo: bun run restore:db -- $CURRENT_BACKUP --confirm"
else
  echo "❌ Restore completed but integrity check failed!"
  echo "   To undo: bun run restore:db -- $CURRENT_BACKUP --confirm"
  exit 1
fi
