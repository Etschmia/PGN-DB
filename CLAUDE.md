# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Schach PGN-Datenbank (Chess PGN Database) - A browser-based chess game database application built with React 19, TypeScript, and Vite. All code comments, documentation, and UI are in German.

## Build Commands

```bash
bun run dev      # Start dev server on port 3000
bun run build    # Production build
bun run preview  # Preview production build
```

Uses **bun** as package manager and script runner (instead of npm). No test or lint commands are configured.

### Backend (server/)

```bash
cd server && bun install   # Dependencies installieren
bun run dev                # Dev-Server mit --watch auf Port 3003
bun run start              # Production-Start
```

## Deployment

**Frontend:** Static SPA hosted via Caddy at `pgn.martuni.de`. Build output in `dist/` is served directly.

**Backend:** Express-Server auf Port 3003, verwaltet via systemd (`pgn-db-server.service`). Caddy routet `/api/pgn/*` → Port 3003, `/api/*` → Port 3001 (Schachmentor).

**Konfigurationsdateien:**
- Caddy: `/etc/caddy/sites/pgn.martuni.de.caddy` (Vorlage: `docs/pgn.martuni.de.caddy`)
- systemd: `/etc/systemd/system/pgn-db-server.service` (Vorlage: `docs/pgn-db-server.service`)
- DB-Setup: `docs/setup-db.sh` (als `sudo -u postgres` ausführen)
- Server-Config: `server/.env.local` (DB_HOST, DB_PASSWORD, JWT_SECRET, RESEND_API_KEY)

## Architecture

**Tech Stack:** React 19 + TypeScript + Vite, chess.js for move validation, react-chessboard for display, Tailwind CSS (CDN). Backend: Express v5 + PostgreSQL + Bun.

**Storage:** Dual-Mode — eingeloggte User speichern auf dem Server (PostgreSQL, 10 MB Limit), nicht-eingeloggte nutzen IndexedDB. `storageService.ts` delegiert automatisch je nach Auth-Status.

**Core Structure:**
- `App.tsx` - Main component with React.lazy() code splitting, Auth-Integration
- `hooks/useChessGame.ts` - Chess logic, PGN parsing, move navigation. Contains complex preprocessing pipeline (lines 42-198) that normalizes PGN files, extracts comments with nested brace handling, and removes unsupported tags like `[%clk]`
- `hooks/usePgnDatabase.ts` - Database state, filtering, Storage-Operationen (via storageService)
- `hooks/useOpeningLookup.ts` - Opening recognition: loads Schachmentor tree + ECO database, provides dynamic per-move lookup, inline-edit, and batch enrichment after import
- `hooks/useAuth.ts` - Auth-State (user, isAuthenticated), Session-Check beim App-Start, schaltet storageMode
- `services/storageService.ts` - Proxy-Modul: delegiert an IndexedDB oder Server je nach Auth-Status
- `services/indexedDBService.ts` - IndexedDB CRUD operations (Offline/nicht-eingeloggt)
- `services/serverStorageService.ts` - Server-API CRUD operations (eingeloggt, `/api/pgn/games`)
- `services/authService.ts` - Auth-API: register(), login(), logout(), getMe()
- `services/openingLookupService.ts` - Opening lookup logic: Schachmentor tree traversal (whitelist filter), ECO longest-prefix match, PGN header fallback. Also handles saving opening names to Schachmentor.
- `services/lichessImportService.ts` - Online-Import: `fetchPgnFromLichess()` (Streaming via ReadableStream mit Live-Partiezähler) und `fetchPgnFromChessCom()` (paralleler Monatsarchiv-Download mit Fortschritt)
- `data/eco-openings.json` - Static ECO database (3641 entries from lichess/chess-openings, German translations for common openings)
- `components/AuthBar.tsx` - Login/Register-Formulare, User-Info, Speicheranzeige im Header
- `components/` - UI components (DatabaseList, MoveHistory, CommentEditor, OpeningDisplay, etc.)

**Backend (`server/`):**
- `server.js` - Express-App auf Port 3003, trust proxy für Caddy
- `db.js` - PostgreSQL Pool (einzelne ENV-Variablen: DB_HOST, DB_PASSWORD, etc.)
- `schema.sql` - users + games Tabellen mit Indices
- `routes/auth.js` - Register (Rate-Limited), Verify (Email-Link), Login, Logout, Me
- `routes/games.js` - CRUD, Bulk-Import (Transaktion), Storage-Info
- `middleware/auth.js` - JWT aus HttpOnly-Cookie (`pgn_token`, 30 Tage)
- `middleware/storage.js` - 10 MB Speicherlimit pro User
- `utils/email.js` - Verifizierungs-Email via Resend

**Opening Recognition (Eröffnungserkennung):**
- Two-tier lookup: Schachmentor tree (primary, via GET localhost:3001/api/moves/slim) → static ECO database (fallback) → PGN header (last resort)
- Schachmentor tree entries are filtered by whitelist (only entries with Wikipedia/Wikibooks link count as confirmed)
- Dynamic: opening name updates as user navigates through moves
- Inline editing: clicking the opening name allows setting/changing names via POST to Schachmentor API
- After PGN import, a background enrichment process updates opening/eco fields in storage

**Data Flow:**
1. App-Start: `useAuth` prüft Session via `GET /api/pgn/auth/me` → setzt `storageMode` (Server oder IndexedDB)
2. PGN input via DatabaseControls: either file upload or online import (Lichess/Chess.com per username)
3. Online import: Lichess streams PGN via ReadableStream (live game counter), Chess.com fetches monthly archives in parallel (progress per archive)
4. `usePgnDatabase.importPgnFile()` parses multi-game files
5. Games persisted via `storageService` → Server (PostgreSQL) oder IndexedDB je nach Auth-Status
6. Background enrichment updates opening names from tree/ECO data
7. Game selection loads via `useChessGame.loadPgn()`
8. chess.js validates moves and generates FEN positions
9. react-chessboard renders the current position
10. Opening name updates dynamically via `useOpeningLookup` as user navigates moves

**Auth-Flow:**
1. Registrierung: Email + Passwort → Verifizierungs-Email via Resend
2. Email-Link klicken → `GET /api/pgn/auth/verify?token=` → automatisch eingeloggt, Redirect zu `/?verified=1`
3. Login setzt HttpOnly-Cookie `pgn_token` (JWT, 30 Tage)
4. `storageService` schaltet auf Server-Modus → alle CRUD-Operationen gehen an PostgreSQL
5. Logout löscht Cookie → zurück zu IndexedDB-Modus

## External Dependencies

**Schachmentor** (optional, running on localhost:3001): Provides the curated opening tree via `/api/moves/slim`. If unavailable, the app falls back to the static ECO database. A status indicator (green/gray dot) shows connectivity.

**PostgreSQL** (required for auth/server storage): Database `pgn_db` with `users` and `games` tables. Connection via `server/.env.local`.

**Resend** (required for email verification): API key in `server/.env.local`, sends from `noreply@martuni.de`.

## Known Issues

**PGN Parsing:** Some malformed PGN files may fail despite preprocessing.

## Debugging

Console logs throughout the codebase are prefixed with component/hook names in brackets (e.g., `[useChessGame]`, `[DatabaseList]`) for easy filtering.
