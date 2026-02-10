#!/bin/bash
set -e

# Determine the project root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

if [ -f "$PROJECT_ROOT/server/.env.local" ]; then
    # Extract DB variables from .env.local
    DB_HOST=$(grep '^DB_HOST=' "$PROJECT_ROOT/server/.env.local" | cut -d '=' -f 2-)
    DB_PORT=$(grep '^DB_PORT=' "$PROJECT_ROOT/server/.env.local" | cut -d '=' -f 2-)
    DB_NAME=$(grep '^DB_NAME=' "$PROJECT_ROOT/server/.env.local" | cut -d '=' -f 2-)
    DB_USER=$(grep '^DB_USER=' "$PROJECT_ROOT/server/.env.local" | cut -d '=' -f 2-)
    DB_PASSWORD=$(grep '^DB_PASSWORD=' "$PROJECT_ROOT/server/.env.local" | cut -d '=' -f 2-)
else
    echo "Error: .env.local file not found at $PROJECT_ROOT/server/.env.local"
    exit 1
fi

if [ -z "$DB_NAME" ]; then
    echo "Error: DB_NAME is not set in .env.local"
    exit 1
fi

# Create dump directory
DUMP_DIR="/home/librechat/gdrive/srv_Martuni/sql_dumps"
mkdir -p "$DUMP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
DUMP_FILE="$DUMP_DIR/${TIMESTAMP}_pgn.sql"

echo "Creating database dump at $DUMP_FILE..."

# Create the dump using PGPASSWORD (avoids URL encoding issues)
# --clean: Include DROP commands
# --if-exists: Use IF EXISTS when dropping objects
# --no-owner: Do not output commands to set ownership of objects to the original database owner
# --no-acl: Prevent privilege items (GRANT/REVOKE) from being dumped
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=plain --no-owner --no-acl --clean --if-exists > "$DUMP_FILE"

echo "Dump created successfully."
