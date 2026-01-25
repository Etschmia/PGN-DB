# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Schach PGN-Datenbank (Chess PGN Database) - A browser-based chess game database application built with React 19, TypeScript, and Vite. All code comments, documentation, and UI are in German.

## Build Commands

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build
npm run preview  # Preview production build
```

No test or lint commands are configured.

## Architecture

**Tech Stack:** React 19 + TypeScript + Vite, chess.js for move validation, react-chessboard for display, IndexedDB for local storage, Tailwind CSS (CDN), optional Google Gemini API for opening recognition.

**Core Structure:**
- `App.tsx` - Main component with React.lazy() code splitting
- `hooks/useChessGame.ts` - Chess logic, PGN parsing, move navigation. Contains complex preprocessing pipeline (lines 42-198) that normalizes PGN files, extracts comments with nested brace handling, and removes unsupported tags like `[%clk]`
- `hooks/usePgnDatabase.ts` - Database state, filtering, IndexedDB operations
- `services/indexedDBService.ts` - IndexedDB CRUD operations
- `services/geminiService.ts` - Gemini API integration for opening recognition
- `components/` - UI components (DatabaseList, MoveHistory, CommentEditor, etc.)

**Data Flow:**
1. PGN file uploaded via DatabaseControls
2. `usePgnDatabase.importPgnFile()` parses multi-game files
3. Games persisted to IndexedDB via indexedDBService
4. Game selection loads via `useChessGame.loadPgn()`
5. chess.js validates moves and generates FEN positions
6. react-chessboard renders the current position

## Environment Variables

Optional: Add `GEMINI_API_KEY` to `.env` file for AI-powered opening recognition.

## Known Issues

**React 19 + react-chessboard compatibility:** The chessboard position may not update correctly when navigating moves. See `Documentation/NAVIGATION_DEBUG.md` for detailed debugging notes. Potential solutions include downgrading to React 18.3.1 or creating a wrapper component.

**PGN Parsing:** Some malformed PGN files may fail despite preprocessing. See `Documentation/KNOWN_ISSUES.md` for edge cases and solutions.

## Debugging

Console logs throughout the codebase are prefixed with component/hook names in brackets (e.g., `[useChessGame]`, `[DatabaseList]`) for easy filtering.
