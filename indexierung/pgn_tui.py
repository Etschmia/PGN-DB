#!/usr/bin/env python3
"""
pgn_tui.py — Textual-basiertes Terminal-Interface für die PGN-SQLite-DB.

Aufruf via Wrapper:
    pgn tui

Layout:
    +----------------------------------------------------------+
    | Filter: [Player] [Opponent] [ECO] [Opening] [Result]     |
    +----------------------------------------------------------+
    | DataTable: Date | White | Black | Res | Mv | ECO | Open. |
    +----------------------------------------------------------+
    | PGN-Preview der ausgewählten Partie                      |
    +----------------------------------------------------------+

Tasten:
    Enter / Klick   Partie auswählen → Preview unten
    /               Fokus auf Filterzeile
    Ctrl+R          DB neu laden
    q / Ctrl+C      Beenden
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical
from textual.widgets import DataTable, Footer, Header, Input, Label, Static


# ---------------------------------------------------------------------------
# Query-Builder
# ---------------------------------------------------------------------------

def build_query(filters: dict) -> tuple[str, list]:
    where = ["1=1"]
    params: list = []

    if filters.get("player"):
        where.append("(LOWER(white)=LOWER(?) OR LOWER(black)=LOWER(?))")
        params += [filters["player"], filters["player"]]

    if filters.get("opponent"):
        if filters.get("player"):
            where.append("""(
                (LOWER(white)=LOWER(?) AND LOWER(black)=LOWER(?))
                OR
                (LOWER(black)=LOWER(?) AND LOWER(white)=LOWER(?))
            )""")
            params += [filters["player"], filters["opponent"],
                       filters["player"], filters["opponent"]]
        else:
            where.append("(LOWER(white)=LOWER(?) OR LOWER(black)=LOWER(?))")
            params += [filters["opponent"], filters["opponent"]]

    if filters.get("eco"):
        where.append("eco LIKE ?")
        params.append(filters["eco"] + "%")

    if filters.get("opening"):
        where.append("LOWER(opening) LIKE LOWER(?)")
        params.append(f"%{filters['opening']}%")

    res = (filters.get("result") or "").lower().strip()
    if res:
        if res in ("win", "w") and filters.get("player"):
            where.append("((LOWER(white)=LOWER(?) AND result='1-0') OR (LOWER(black)=LOWER(?) AND result='0-1'))")
            params += [filters["player"], filters["player"]]
        elif res in ("loss", "l") and filters.get("player"):
            where.append("((LOWER(white)=LOWER(?) AND result='0-1') OR (LOWER(black)=LOWER(?) AND result='1-0'))")
            params += [filters["player"], filters["player"]]
        elif res in ("draw", "d", "1/2", "1/2-1/2"):
            where.append("result = '1/2-1/2'")
        elif res in ("1-0", "0-1"):
            where.append("result = ?")
            params.append(res)

    sql = f"""
        SELECT id, date, white, black, result, time_control,
               ply_count, eco, opening, filename
        FROM games
        WHERE {' AND '.join(where)}
        ORDER BY date DESC, id DESC
        LIMIT 500
    """
    return sql, params


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

class PgnBrowser(App):
    CSS = """
    Screen { layout: vertical; }

    #filters {
        height: auto;
        padding: 1 1 0 1;
        background: $panel;
    }
    #filters Input { width: 1fr; margin: 0 1 0 0; }
    #filters Label { width: auto; padding: 1 1 0 0; color: $text-muted; }

    #results { height: 1fr; }
    DataTable { height: 1fr; }

    #preview-wrap {
        height: 40%;
        border-top: solid $primary;
        padding: 0 1;
        background: $surface;
    }
    #preview-title { color: $accent; padding: 0 0 1 0; }
    #preview { height: 1fr; }

    #status { dock: bottom; height: 1; background: $boost; padding: 0 1; }
    """

    BINDINGS = [
        Binding("q", "quit", "Beenden"),
        Binding("ctrl+r", "refresh", "Reload"),
        Binding("slash", "focus_filter", "Filter", key_display="/"),
        Binding("escape", "focus_table", "Tabelle"),
    ]

    def __init__(self, db_path: Path, pgn_root: Path, default_player: str = ""):
        super().__init__()
        self.db_path = db_path
        self.pgn_root = pgn_root
        self.default_player = default_player
        self._con: sqlite3.Connection | None = None
        self._row_index: list[sqlite3.Row] = []

    # -- Lifecycle --------------------------------------------------------

    def on_mount(self) -> None:
        self._con = sqlite3.connect(self.db_path)
        self._con.row_factory = sqlite3.Row

        table = self.query_one(DataTable)
        table.cursor_type = "row"
        table.zebra_stripes = True
        table.add_columns("Datum", "Weiß", "Schwarz", "Erg.", "Zeit", "Mv", "ECO", "Eröffnung")

        self.query_one("#f_player", Input).value = self.default_player
        self.refresh_results()

    def compose(self) -> ComposeResult:
        yield Header(show_clock=False)
        with Horizontal(id="filters"):
            yield Label("Spieler")
            yield Input(placeholder="z.B. Martuni", id="f_player")
            yield Label("Gegner")
            yield Input(placeholder="Bot/Username", id="f_opponent")
            yield Label("ECO")
            yield Input(placeholder="B90", id="f_eco")
            yield Label("Eröffnung")
            yield Input(placeholder="Sicilian, Caro-Kann …", id="f_opening")
            yield Label("Ergebnis")
            yield Input(placeholder="win|loss|draw", id="f_result")
        with Vertical(id="results"):
            yield DataTable(id="table")
        with Vertical(id="preview-wrap"):
            yield Static("Vorschau (Enter = laden)", id="preview-title")
            yield Static("", id="preview", expand=True)
        yield Static("", id="status")
        yield Footer()

    # -- Filter / Reload --------------------------------------------------

    def _current_filters(self) -> dict:
        return {
            "player":   self.query_one("#f_player",   Input).value.strip(),
            "opponent": self.query_one("#f_opponent", Input).value.strip(),
            "eco":      self.query_one("#f_eco",      Input).value.strip(),
            "opening":  self.query_one("#f_opening",  Input).value.strip(),
            "result":   self.query_one("#f_result",   Input).value.strip(),
        }

    def refresh_results(self) -> None:
        assert self._con is not None
        sql, params = build_query(self._current_filters())
        rows = self._con.execute(sql, params).fetchall()
        self._row_index = rows

        table = self.query_one(DataTable)
        table.clear()
        for r in rows:
            table.add_row(
                r["date"] or "",
                r["white"] or "",
                r["black"] or "",
                r["result"] or "",
                r["time_control"] or "",
                str(r["ply_count"] or ""),
                r["eco"] or "",
                (r["opening"] or "")[:60],
            )

        self.query_one("#status", Static).update(
            f" {len(rows)} Treffer  ·  DB: {self.db_path}  ·  / Filter  ·  Enter PGN  ·  q Beenden"
        )

    # -- Events -----------------------------------------------------------

    def on_input_changed(self, event: Input.Changed) -> None:
        # Live-Filter — rebuild on every keystroke (DB ist klein, das hält locker)
        if event.input.id and event.input.id.startswith("f_"):
            self.refresh_results()

    def on_data_table_row_selected(self, event: DataTable.RowSelected) -> None:
        idx = event.cursor_row
        if not (0 <= idx < len(self._row_index)):
            return
        row = self._row_index[idx]
        self._show_preview(row)

    def on_data_table_row_highlighted(self, event: DataTable.RowHighlighted) -> None:
        # Auto-Preview beim Pfeil-hoch/runter
        idx = event.cursor_row
        if 0 <= idx < len(self._row_index):
            self._show_preview(self._row_index[idx])

    def _show_preview(self, row: sqlite3.Row) -> None:
        filename = row["filename"]
        full = self.pgn_root / filename
        if not full.exists():
            cands = list(self.pgn_root.rglob(Path(filename).name))
            full = cands[0] if cands else None

        title = self.query_one("#preview-title", Static)
        preview = self.query_one("#preview", Static)
        if not full:
            title.update(f"[red]Datei nicht gefunden:[/red] {filename}")
            preview.update("")
            return

        try:
            text = full.read_text(encoding="utf-8", errors="replace")
        except Exception as e:
            title.update(f"[red]Lesefehler:[/red] {e}")
            preview.update("")
            return

        title.update(
            f"[bold]{row['white']} – {row['black']}[/bold]  {row['result']}  ·  "
            f"{row['date']}  ·  {row['eco'] or ''} {row['opening'] or ''}  ·  "
            f"[dim]{full}[/dim]"
        )
        preview.update(text)

    # -- Actions ----------------------------------------------------------

    def action_focus_filter(self) -> None:
        self.query_one("#f_player", Input).focus()

    def action_focus_table(self) -> None:
        self.query_one(DataTable).focus()

    def action_refresh(self) -> None:
        self.refresh_results()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    p = argparse.ArgumentParser(description="PGN-Browser (Textual TUI)")
    p.add_argument("--db", required=True, help="SQLite-Datei (games.db)")
    p.add_argument("--pgn-root", required=True,
                   help="Wurzelverzeichnis der PGN-Sammlung (Parent von --pgn-dir bei der Indexierung)")
    p.add_argument("--player", default="", help="Default für Spieler-Filter (z.B. Martuni)")
    args = p.parse_args()

    db = Path(args.db)
    if not db.exists():
        print(f"DB nicht gefunden: {db}", file=sys.stderr)
        return 1

    PgnBrowser(db, Path(args.pgn_root), args.player).run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
