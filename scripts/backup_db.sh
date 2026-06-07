#!/bin/bash
# Database backup script for XiaoC Blog
# Usage: ./scripts/backup_db.sh
# Cron: 0 3 * * * /path/to/scripts/backup_db.sh

set -euo pipefail

BACKUP_DIR="/var/backups/blog"
CONTAINER="blog-backend"
DB_PATH="/app/data/blog.sqlite3"
DATE=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."

# Use sqlite3 .backup for consistent snapshot (safe for WAL mode)
docker exec "$CONTAINER" sqlite3 "$DB_PATH" ".backup /tmp/backup.db"
docker cp "$CONTAINER:/tmp/backup.db" "$BACKUP_DIR/blog_${DATE}.sqlite3"
docker exec "$CONTAINER" rm /tmp/backup.db

# Compress
gzip "$BACKUP_DIR/blog_${DATE}.sqlite3"

# Cleanup old backups
find "$BACKUP_DIR" -name "*.gz" -mtime +$KEEP_DAYS -delete

echo "[$(date)] Backup completed: blog_${DATE}.sqlite3.gz"
echo "[$(date)] Backup size: $(du -h "$BACKUP_DIR/blog_${DATE}.sqlite3.gz" | cut -f1)"
