#!/usr/bin/env python3
"""
pgn_query.py — Vorgefertigte Queries auf der PGN-SQLite-Datenbank
Debian 13: python3 pgn_query.py --db games.db <BEFEHL> [OPTIONEN]

Beispiele:
  python3 pgn_query.py --db games.db losses --player "Magnus Carlsen" --from 2023.01.01 --to 2023.12.31 --blitz
  python3 pgn_query.py --db games.db stats --player "Magnus Carlsen"
  python3 pgn_query.py --db games.db openings --player "Magnus Carlsen" --as black
  python3 pgn_query.py --db games.db sql "SELECT white, black, ply_count FROM games LIMIT 5"
"""

import argparse
import sqlite3
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------

def open_db(db_path: str) -> sqlite3.Connection:
    if not Path(db_path).exists():
        print(f"Fehler: Datenbank '{db_path}' nicht gefunden.", file=sys.stderr)
        sys.exit(1)
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    return con


def print_table(rows, headers=None):
    if not rows:
        print("  (keine Ergebnisse)")
        return

    rows = [dict(r) for r in rows]
    if headers is None:
        headers = list(rows[0].keys())

    col_widths = {h: len(str(h)) for h in headers}
    for row in rows:
        for h in headers:
            col_widths[h] = max(col_widths[h], len(str(row.get(h) or "")))

    sep = "+-" + "-+-".join("-" * col_widths[h] for h in headers) + "-+"
    fmt = "| " + " | ".join(f"{{:<{col_widths[h]}}}" for h in headers) + " |"

    print(sep)
    print(fmt.format(*headers))
    print(sep)
    for row in rows:
        print(fmt.format(*[str(row.get(h) or "") for h in headers]))
    print(sep)
    print(f"  {len(rows)} Zeile(n)")


# ---------------------------------------------------------------------------
# Blitz-Erkennung
# ---------------------------------------------------------------------------

BLITZ_SECONDS = (180, 299)   # 3:00 – 4:59 Grundzeit

def blitz_condition() -> str:
    """
    Gibt eine SQL-Bedingung zurück, die Blitzpartien identifiziert.
    TimeControl-Format: "Sekunden+Inkrement" z.B. "180+2", "300+0"
    Auch Lichess-Formate wie "180" (ohne Inkrement) werden berücksichtigt.
    Passe BLITZ_SECONDS an deinen Verwendungszweck an.
    """
    lo, hi = BLITZ_SECONDS
    return f"""(
        CAST(SUBSTR(time_control, 1,
            CASE WHEN INSTR(time_control, '+') > 0
                 THEN INSTR(time_control, '+') - 1
                 ELSE LENGTH(time_control) END
        ) AS INTEGER) BETWEEN {lo} AND {hi}
    )"""


# ---------------------------------------------------------------------------
# Subkommandos
# ---------------------------------------------------------------------------

def cmd_losses(args, con):
    """Alle Partien, die ein Spieler verloren hat — gefiltert und sortiert."""
    params = []

    player_cond = """(
        (LOWER(white) = LOWER(?) AND result = '0-1')
        OR
        (LOWER(black) = LOWER(?) AND result = '1-0')
    )"""
    params += [args.player, args.player]

    date_cond = ""
    if args.from_date or args.to_date:
        clauses = []
        if args.from_date:
            clauses.append("date >= ?")
            params.append(args.from_date.replace("-", "."))
        if args.to_date:
            clauses.append("date <= ?")
            params.append(args.to_date.replace("-", "."))
        date_cond = "AND " + " AND ".join(clauses)

    blitz_cond = f"AND {blitz_condition()}" if args.blitz else ""

    sql = f"""
        SELECT
            date,
            white,
            black,
            result,
            time_control,
            ply_count,
            move_count,
            eco,
            filename
        FROM games
        WHERE {player_cond}
        {date_cond}
        {blitz_cond}
        ORDER BY ply_count ASC
    """

    rows = con.execute(sql, params).fetchall()
    print(f"\nNiederlagen von '{args.player}'"
          + (f" [{args.from_date} – {args.to_date}]" if args.from_date or args.to_date else "")
          + (" (nur Blitz)" if args.blitz else ""))
    print()
    print_table(rows, ["date", "white", "black", "result", "time_control",
                        "ply_count", "move_count", "eco"])

    if args.files:
        print("\nDateipfade:")
        for r in rows:
            print(f"  {r['filename']}")


def cmd_stats(args, con):
    """Statistik eines Spielers."""
    p = args.player

    sql = """
        SELECT
            COUNT(*) AS partien,
            SUM(CASE WHEN (LOWER(white)=LOWER(?) AND result='1-0')
                       OR (LOWER(black)=LOWER(?) AND result='0-1') THEN 1 ELSE 0 END) AS siege,
            SUM(CASE WHEN result='1/2-1/2' THEN 1 ELSE 0 END) AS remis,
            SUM(CASE WHEN (LOWER(white)=LOWER(?) AND result='0-1')
                       OR (LOWER(black)=LOWER(?) AND result='1-0') THEN 1 ELSE 0 END) AS niederlagen,
            ROUND(AVG(ply_count),1) AS avg_zuege,
            MIN(ply_count) AS min_zuege,
            MAX(ply_count) AS max_zuege,
            MIN(date) AS erste_partie,
            MAX(date) AS letzte_partie
        FROM games
        WHERE LOWER(white) = LOWER(?) OR LOWER(black) = LOWER(?)
    """
    row = con.execute(sql, [p]*6).fetchone()
    print(f"\nStatistik für: {p}\n")
    for k in row.keys():
        print(f"  {k:<20} {row[k]}")


def cmd_openings(args, con):
    """Häufigste Eröffnungen eines Spielers."""
    color_cond = ""
    params = [args.player]
    if args.color == "white":
        color_cond = "AND LOWER(white) = LOWER(?)"
    elif args.color == "black":
        color_cond = "AND LOWER(black) = LOWER(?)"
    else:
        color_cond = "AND (LOWER(white) = LOWER(?) OR LOWER(black) = LOWER(?))"
        params.append(args.player)

    sql = f"""
        SELECT eco, opening, COUNT(*) AS anzahl,
               SUM(CASE WHEN (LOWER(white)=LOWER('{args.player}') AND result='1-0')
                          OR (LOWER(black)=LOWER('{args.player}') AND result='0-1') THEN 1 ELSE 0 END) AS siege,
               SUM(CASE WHEN result='1/2-1/2' THEN 1 ELSE 0 END) AS remis,
               SUM(CASE WHEN (LOWER(white)=LOWER('{args.player}') AND result='0-1')
                          OR (LOWER(black)=LOWER('{args.player}') AND result='1-0') THEN 1 ELSE 0 END) AS niederlagen
        FROM games
        WHERE 1=1 {color_cond}
        GROUP BY eco, opening
        ORDER BY anzahl DESC
        LIMIT ?
    """
    params.append(args.limit)
    rows = con.execute(sql, params).fetchall()
    print(f"\nTop-{args.limit} Eröffnungen von '{args.player}' ({args.color})\n")
    print_table(rows, ["eco", "opening", "anzahl", "siege", "remis", "niederlagen"])


def cmd_games(args, con):
    """Flexible Partien-Liste mit beliebig kombinierbaren Filtern."""
    where = ["1=1"]
    params = []

    if args.player:
        where.append("(LOWER(white) = LOWER(?) OR LOWER(black) = LOWER(?))")
        params += [args.player, args.player]

    if args.opponent:
        # Gegner auf der jeweils anderen Seite als --player (oder beide Seiten falls --player fehlt)
        if args.player:
            where.append("""(
                (LOWER(white) = LOWER(?) AND LOWER(black) = LOWER(?))
                OR
                (LOWER(black) = LOWER(?) AND LOWER(white) = LOWER(?))
            )""")
            params += [args.player, args.opponent, args.player, args.opponent]
        else:
            where.append("(LOWER(white) = LOWER(?) OR LOWER(black) = LOWER(?))")
            params += [args.opponent, args.opponent]

    if args.color and args.player:
        if args.color == "white":
            where.append("LOWER(white) = LOWER(?)")
            params.append(args.player)
        elif args.color == "black":
            where.append("LOWER(black) = LOWER(?)")
            params.append(args.player)

    if args.result:
        # 'win'/'loss'/'draw' relativ zu --player, oder wörtliches Ergebnis
        if args.result in ("win", "loss") and not args.player:
            print("Fehler: --result win/loss benötigt --player.", file=sys.stderr)
            sys.exit(1)
        if args.result == "win":
            where.append("""(
                (LOWER(white)=LOWER(?) AND result='1-0')
                OR (LOWER(black)=LOWER(?) AND result='0-1')
            )""")
            params += [args.player, args.player]
        elif args.result == "loss":
            where.append("""(
                (LOWER(white)=LOWER(?) AND result='0-1')
                OR (LOWER(black)=LOWER(?) AND result='1-0')
            )""")
            params += [args.player, args.player]
        elif args.result == "draw":
            where.append("result = '1/2-1/2'")
        else:
            where.append("result = ?")
            params.append(args.result)

    if args.eco:
        where.append("eco LIKE ?")
        params.append(args.eco + "%")

    if args.opening_like:
        where.append("LOWER(opening) LIKE LOWER(?)")
        params.append(f"%{args.opening_like}%")

    if args.from_date:
        where.append("date >= ?")
        params.append(args.from_date.replace("-", "."))
    if args.to_date:
        where.append("date <= ?")
        params.append(args.to_date.replace("-", "."))

    if args.blitz:
        where.append(blitz_condition())

    order = {
        "date":  "date DESC",
        "moves": "ply_count ASC",
        "elo":   "COALESCE(white_elo, black_elo) DESC",
    }.get(args.order, "date DESC")

    sql = f"""
        SELECT id, date, white, black, result, time_control,
               ply_count, eco, opening, filename
        FROM games
        WHERE {' AND '.join(where)}
        ORDER BY {order}
        LIMIT ?
    """
    params.append(args.limit)
    rows = con.execute(sql, params).fetchall()

    cols = ["date", "white", "black", "result", "time_control",
            "ply_count", "eco", "opening"]
    if args.files:
        cols.append("filename")
    print_table(rows, cols)


def cmd_show(args, con):
    """Gibt die PGN-Datei einer Partie auf stdout aus (id oder Substring im Dateinamen)."""
    if args.id.isdigit():
        row = con.execute("SELECT filename FROM games WHERE id = ?", (int(args.id),)).fetchone()
    else:
        row = con.execute(
            "SELECT filename FROM games WHERE filename LIKE ? LIMIT 1",
            (f"%{args.id}%",),
        ).fetchone()

    if not row:
        print(f"Keine Partie gefunden für '{args.id}'.", file=sys.stderr)
        sys.exit(1)

    # Filename ist relativ zum Parent von --pgn-dir (siehe pgn_index.py)
    base = Path(args.pgn_root) if args.pgn_root else Path.cwd()
    full = base / row["filename"]
    if not full.exists():
        # Fallback: nur Basename im pgn_root suchen
        candidates = list(base.rglob(Path(row["filename"]).name))
        if candidates:
            full = candidates[0]
        else:
            print(f"Datei nicht gefunden: {full}", file=sys.stderr)
            sys.exit(1)

    sys.stdout.write(full.read_text(encoding="utf-8", errors="replace"))


def cmd_sql(args, con):
    """Beliebiges SQL direkt ausführen."""
    try:
        rows = con.execute(args.query).fetchall()
        print_table(rows)
    except sqlite3.Error as e:
        print(f"SQL-Fehler: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_info(args, con):
    """DB-Übersicht."""
    total = con.execute("SELECT COUNT(*) FROM games").fetchone()[0]
    oldest = con.execute("SELECT MIN(date) FROM games").fetchone()[0]
    newest = con.execute("SELECT MAX(date) FROM games").fetchone()[0]
    print(f"\nDatenbank-Übersicht")
    print(f"  Partien gesamt : {total:,}")
    print(f"  Älteste Partie : {oldest}")
    print(f"  Neueste Partie : {newest}")

    print("\nTop-10 Spieler (Partien):")
    rows = con.execute("""
        SELECT name, COUNT(*) AS cnt FROM (
            SELECT white AS name FROM games
            UNION ALL
            SELECT black AS name FROM games
        ) GROUP BY name ORDER BY cnt DESC LIMIT 10
    """).fetchall()
    print_table(rows, ["name", "cnt"])


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="PGN-SQLite-Abfrage-Tool")
    parser.add_argument("--db", default="games.db", help="SQLite-Datei")

    sub = parser.add_subparsers(dest="cmd", required=True)

    # losses
    p_loss = sub.add_parser("losses", help="Niederlagen eines Spielers")
    p_loss.add_argument("--player", required=True)
    p_loss.add_argument("--from", dest="from_date", metavar="YYYY.MM.DD")
    p_loss.add_argument("--to",   dest="to_date",   metavar="YYYY.MM.DD")
    p_loss.add_argument("--blitz", action="store_true", help="Nur Blitzpartien (3-5 Min)")
    p_loss.add_argument("--files", action="store_true", help="Dateinamen am Ende ausgeben")

    # stats
    p_stats = sub.add_parser("stats", help="Spieler-Statistik")
    p_stats.add_argument("--player", required=True)

    # openings
    p_open = sub.add_parser("openings", help="Eröffnungsstatistik")
    p_open.add_argument("--player", required=True)
    p_open.add_argument("--as", dest="color", choices=["white", "black", "both"], default="both")
    p_open.add_argument("--limit", type=int, default=15)

    # games (flexibler Filter)
    p_g = sub.add_parser("games", help="Partien-Liste mit kombinierbaren Filtern")
    p_g.add_argument("--player",        help="Hauptspieler (z.B. Martuni)")
    p_g.add_argument("--opponent",      help="Gegnername (in Kombination mit --player)")
    p_g.add_argument("--as", dest="color", choices=["white", "black"], help="Spielerfarbe")
    p_g.add_argument("--result",        help="win|loss|draw (rel. zu --player) oder 1-0/0-1/1/2-1/2")
    p_g.add_argument("--eco",           help="ECO-Präfix, z.B. B90 oder B")
    p_g.add_argument("--opening-like",  dest="opening_like", help="Substring im Opening-Tag")
    p_g.add_argument("--from", dest="from_date", metavar="YYYY.MM.DD")
    p_g.add_argument("--to",   dest="to_date",   metavar="YYYY.MM.DD")
    p_g.add_argument("--blitz", action="store_true")
    p_g.add_argument("--order", choices=["date", "moves", "elo"], default="date")
    p_g.add_argument("--limit", type=int, default=50)
    p_g.add_argument("--files", action="store_true", help="Spalte 'filename' mit ausgeben")

    # show (PGN dump)
    p_show = sub.add_parser("show", help="PGN-Datei einer Partie auf stdout ausgeben")
    p_show.add_argument("id", help="Partie-ID oder Substring im Dateinamen")
    p_show.add_argument("--pgn-root", help="Wurzelverzeichnis der PGN-Sammlung (Parent von --pgn-dir)")

    # sql
    p_sql = sub.add_parser("sql", help="Direktes SQL")
    p_sql.add_argument("query")

    # info
    sub.add_parser("info", help="DB-Übersicht")

    args = parser.parse_args()
    con = open_db(args.db)

    dispatch = {
        "losses":   cmd_losses,
        "stats":    cmd_stats,
        "openings": cmd_openings,
        "games":    cmd_games,
        "show":     cmd_show,
        "sql":      cmd_sql,
        "info":     cmd_info,
    }
    dispatch[args.cmd](args, con)
    con.close()


if __name__ == "__main__":
    main()
