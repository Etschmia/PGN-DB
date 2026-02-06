#!/bin/bash
# Als postgres-User ausführen:
#   sudo -u postgres bash docs/setup-db.sh
#
# Falls librechat ein Passwort braucht, DATABASE_URL in server/.env.local anpassen:
#   DATABASE_URL=postgresql://librechat:DEIN_PASSWORT@localhost:5432/pgn_db

set -e

# Rolle erstellen mit Login-Berechtigung
psql -c "CREATE ROLE librechat WITH LOGIN;" 2>/dev/null || echo "Rolle librechat existiert bereits"

# Datenbank erstellen
psql -c "CREATE DATABASE pgn_db OWNER librechat;" 2>/dev/null || echo "Datenbank pgn_db existiert bereits"

# Schema ausführen
psql -d pgn_db -f server/schema.sql

echo "Datenbank pgn_db eingerichtet!"
