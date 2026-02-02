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

## Deployment

Static SPA hosted via Caddy at `pgn.martuni.de`. Build output in `dist/` is served directly — no application server needed. Caddy config at `/etc/caddy/sites/pgn.martuni.de.caddy`.

## Architecture

**Tech Stack:** React 19 + TypeScript + Vite, chess.js for move validation, react-chessboard for display, IndexedDB for local storage, Tailwind CSS (CDN).

**Core Structure:**
- `App.tsx` - Main component with React.lazy() code splitting
- `hooks/useChessGame.ts` - Chess logic, PGN parsing, move navigation. Contains complex preprocessing pipeline (lines 42-198) that normalizes PGN files, extracts comments with nested brace handling, and removes unsupported tags like `[%clk]`
- `hooks/usePgnDatabase.ts` - Database state, filtering, IndexedDB operations
- `hooks/useOpeningLookup.ts` - Opening recognition: loads Schachmentor tree + ECO database, provides dynamic per-move lookup, inline-edit, and batch enrichment after import
- `services/indexedDBService.ts` - IndexedDB CRUD operations
- `services/openingLookupService.ts` - Opening lookup logic: Schachmentor tree traversal (whitelist filter), ECO longest-prefix match, PGN header fallback. Also handles saving opening names to Schachmentor.
- `data/eco-openings.json` - Static ECO database (3641 entries from lichess/chess-openings, German translations for common openings)
- `components/` - UI components (DatabaseList, MoveHistory, CommentEditor, OpeningDisplay, etc.)

**Opening Recognition (Eröffnungserkennung):**
- Two-tier lookup: Schachmentor tree (primary, via GET localhost:3001/api/moves/slim) → static ECO database (fallback) → PGN header (last resort)
- Schachmentor tree entries are filtered by whitelist (only entries with Wikipedia/Wikibooks link count as confirmed)
- Dynamic: opening name updates as user navigates through moves
- Inline editing: clicking the opening name allows setting/changing names via POST to Schachmentor API
- After PGN import, a background enrichment process updates opening/eco fields in IndexedDB

**Data Flow:**
1. PGN file uploaded via DatabaseControls
2. `usePgnDatabase.importPgnFile()` parses multi-game files
3. Games persisted to IndexedDB via indexedDBService
4. Background enrichment updates opening names from tree/ECO data
5. Game selection loads via `useChessGame.loadPgn()`
6. chess.js validates moves and generates FEN positions
7. react-chessboard renders the current position
8. Opening name updates dynamically via `useOpeningLookup` as user navigates moves

## External Dependencies

**Schachmentor** (optional, running on localhost:3001): Provides the curated opening tree via `/api/moves/slim`. If unavailable, the app falls back to the static ECO database. A status indicator (green/gray dot) shows connectivity.

## Known Issues

**PGN Parsing:** Some malformed PGN files may fail despite preprocessing.

## Debugging

Console logs throughout the codebase are prefixed with component/hook names in brackets (e.g., `[useChessGame]`, `[DatabaseList]`) for easy filtering.
