#!/bin/bash
set -e

# Fix permissions for mounted volumes
chown -R appuser:appuser /app/data /app/uploads 2>/dev/null || true

# Execute the main command
exec "$@"
