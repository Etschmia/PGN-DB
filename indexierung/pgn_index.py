#!/usr/bin/env python3
"""
pgn_index.py — PGN-Datei-Indexer nach SQLite
Debian 13: python3 pgn_index.py --pgn-dir /pfad/zu/pgn --db games.db

Abhängigkeiten:
  pip install python-chess
"""

import argparse
import os
import sqlite3
import sys
import time
from pathlib import Path

import chess.pgn


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

DDL = """
CREATE TABLE IF NOT EXISTS games (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    filename     TEXT    NOT NULL UNIQUE,
    file_mtime   REAL,

    -- PGN Standard-Header
    event        TEXT,
    site         TEXT,
    date         TEXT,           -- Format: YYYY.MM.DD  (PGN-Standard)
    round        TEXT,
    white        TEXT,
    black        TEXT,
    result       TEXT,           -- "1-0" | "0-1" | "1/2-1/2" | "*"

    -- Erweiterte Tags
    white_elo    INTEGER,
    black_elo    INTEGER,
    eco          TEXT,
    opening      TEXT,
    time_control TEXT,
    termination  TEXT,

    -- Berechnete Werte
    ply_count    INTEGER,        -- Halbzüge (direkt aus Tag oder gezählt)
    move_count   INTEGER,        -- Vollzüge (ply_count / 2, aufgerundet)

    -- Hilfsspalten
    indexed_at   TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%S','now'))
);

CREATE INDEX IF NOT EXISTS idx_date        ON games(date);
CREATE INDEX IF NOT EXISTS idx_white       ON games(white COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_black       ON games(black COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_result      ON games(result);
CREATE INDEX IF NOT EXISTS idx_time_ctrl   ON games(time_control);
CREATE INDEX IF NOT EXISTS idx_ply         ON games(ply_count);
CREATE INDEX IF NOT EXISTS idx_eco         ON games(eco);
"""


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------

def open_db(db_path: str) -> sqlite3.Connection:
    con = sqlite3.connect(db_path)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA synchronous=NORMAL")
    con.execute("PRAGMA cache_size=-32000")   # 32 MB Cache
    con.executescript(DDL)
    return con


def already_indexed(con: sqlite3.Connection, filename: str, mtime: float) -> bool:
    """Überspringt Dateien, die sich seit dem letzten Index nicht geändert haben."""
    row = con.execute(
        "SELECT file_mtime FROM games WHERE filename = ?", (filename,)
    ).fetchone()
    if row is None:
        return False
    return row[0] == mtime


def parse_pgn_file(path: Path) -> dict | None:
    """Liest eine PGN-Datei (immer genau eine Partie) und gibt ein Dict zurück."""
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            game = chess.pgn.read_game(f)
    except Exception as e:
        print(f"  WARN  {path.name}: {e}", file=sys.stderr)
        return None

    if game is None:
        return None

    h = game.headers

    # PlyCount: erst aus Tag, dann zählen
    ply = h.get("PlyCount")
    if ply and ply.isdigit():
        ply_count = int(ply)
    else:
        node = game
        ply_count = 0
        while node.variations:
            node = node.variations[0]
            ply_count += 1

    def safe_int(v):
        try:
            return int(v)
        except (TypeError, ValueError):
            return None

    return dict(
        event        = h.get("Event")       or None,
        site         = h.get("Site")        or None,
        date         = h.get("Date")        or None,
        round        = h.get("Round")       or None,
        white        = h.get("White")       or None,
        black        = h.get("Black")       or None,
        result       = h.get("Result")      or None,
        white_elo    = safe_int(h.get("WhiteElo")),
        black_elo    = safe_int(h.get("BlackElo")),
        eco          = h.get("ECO")         or None,
        opening      = h.get("Opening")     or None,
        time_control = h.get("TimeControl") or None,
        termination  = h.get("Termination") or None,
        ply_count    = ply_count,
        move_count   = (ply_count + 1) // 2,
    )


UPSERT_SQL = """
INSERT INTO games (
    filename, file_mtime,
    event, site, date, round, white, black, result,
    white_elo, black_elo, eco, opening, time_control, termination,
    ply_count, move_count
) VALUES (
    :filename, :file_mtime,
    :event, :site, :date, :round, :white, :black, :result,
    :white_elo, :black_elo, :eco, :opening, :time_control, :termination,
    :ply_count, :move_count
)
ON CONFLICT(filename) DO UPDATE SET
    file_mtime   = excluded.file_mtime,
    event        = excluded.event,
    site         = excluded.site,
    date         = excluded.date,
    round        = excluded.round,
    white        = excluded.white,
    black        = excluded.black,
    result       = excluded.result,
    white_elo    = excluded.white_elo,
    black_elo    = excluded.black_elo,
    eco          = excluded.eco,
    opening      = excluded.opening,
    time_control = excluded.time_control,
    termination  = excluded.termination,
    ply_count    = excluded.ply_count,
    move_count   = excluded.move_count,
    indexed_at   = strftime('%Y-%m-%dT%H:%M:%S','now')
"""


# ---------------------------------------------------------------------------
# Hauptschleife
# ---------------------------------------------------------------------------

def index_directory(pgn_dir: str, db_path: str, force: bool = False, verbose: bool = False):
    con = open_db(db_path)
    pgn_dir = Path(pgn_dir)

    files = sorted(pgn_dir.rglob("*.pgn"))
    total = len(files)
    print(f"Gefundene PGN-Dateien: {total}")

    added = updated = skipped = errors = 0
    batch = []
    BATCH_SIZE = 500
    t0 = time.time()

    def flush(batch):
        con.executemany(UPSERT_SQL, batch)
        con.commit()
        batch.clear()

    for i, path in enumerate(files, 1):
        rel = str(path.relative_to(pgn_dir.parent))
        mtime = path.stat().st_mtime

        if not force and already_indexed(con, rel, mtime):
            skipped += 1
            continue

        data = parse_pgn_file(path)
        if data is None:
            errors += 1
            continue

        exists = con.execute(
            "SELECT 1 FROM games WHERE filename = ?", (rel,)
        ).fetchone()

        data["filename"] = rel
        data["file_mtime"] = mtime
        batch.append(data)

        if exists:
            updated += 1
        else:
            added += 1

        if verbose:
            print(f"  [{i}/{total}] {rel}")
        elif i % 1000 == 0:
            elapsed = time.time() - t0
            rate = i / elapsed
            print(f"  {i}/{total} ({rate:.0f}/s) — neu:{added} upd:{updated} skip:{skipped} err:{errors}")

        if len(batch) >= BATCH_SIZE:
            flush(batch)

    if batch:
        flush(batch)

    elapsed = time.time() - t0
    print(f"\nFertig in {elapsed:.1f}s")
    print(f"  Neu:        {added}")
    print(f"  Aktualisiert:{updated}")
    print(f"  Übersprungen:{skipped}")
    print(f"  Fehler:     {errors}")
    print(f"  DB:         {db_path}")
    con.close()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PGN-Verzeichnis → SQLite indexieren")
    parser.add_argument("--pgn-dir", required=True, help="Verzeichnis mit .pgn-Dateien")
    parser.add_argument("--db",      default="games.db", help="SQLite-Datei (default: games.db)")
    parser.add_argument("--force",   action="store_true", help="Alle Dateien neu indexieren")
    parser.add_argument("--verbose", action="store_true", help="Jede Datei ausgeben")
    args = parser.parse_args()

    index_directory(args.pgn_dir, args.db, args.force, args.verbose)
