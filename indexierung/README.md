# PGN → SQLite Toolset — Debian 13

## Installation

Auf Debian 13 ist `pip install` system-weit blockiert (PEP 668). Daher: dediziertes venv.

```bash
# venv anlegen + python-chess installieren
mkdir -p ~/pgn-tool
python3 -m venv ~/pgn-tool/.venv
~/pgn-tool/.venv/bin/pip install chess

# Skripte bleiben hier im Repo (Single-Source) — keine Kopie nötig.
# Wrapper ist global verfügbar als `pgn`:
ls -la ~/.local/bin/pgn
```

## Schnellstart via Wrapper

```bash
pgn reindex                              # /home/librechat/lichess-bot/game_archiv → ~/pgn-tool/games.db
pgn info
pgn games --player Martuni --opponent baby_eubos --result loss
pgn games --player Martuni --eco B90 --order moves --limit 20    # Najdorf-Sizilianer, kürzeste zuerst
pgn games --player Martuni --opening-like "Caro-Kann" --as black
pgn show 42                              # PGN von Partie ID 42 auf stdout
pgn show kpGDlotv                        # …oder per Substring im Dateinamen
```

Konfig per Env: `PGN_TOOL_DB`, `PGN_TOOL_DIR`, `PGN_TOOL_REPO`.

---

## 1. Erstindexierung

```bash
python3 pgn_index.py --pgn-dir /pfad/zu/pgn-ordner --db games.db
```

Ausgabe alle 1000 Dateien:
```
Gefundene PGN-Dateien: 42381
  1000/42381 (4823/s) — neu:1000 upd:0 skip:0 err:0
  ...
Fertig in 8.8s
  Neu:         42381
  Aktualisiert:0
  Übersprungen:0
  Fehler:      3
```

### Optionen

| Flag | Bedeutung |
|------|-----------|
| `--pgn-dir` | Verzeichnis (wird rekursiv durchsucht) |
| `--db` | SQLite-Datei (wird angelegt wenn nicht vorhanden) |
| `--force` | Alle Dateien neu einlesen (ignoriert mtime-Cache) |
| `--verbose` | Jede Datei ausgeben |

### Inkrementell (nur neue/geänderte Dateien)

```bash
# Einfach erneut aufrufen — bereits indexierte Dateien werden übersprungen
python3 pgn_index.py --pgn-dir /pfad/zu/pgn --db games.db
```

---

## 2. Abfragen

### Datenbank-Übersicht

```bash
python3 pgn_query.py --db games.db info
```

### Niederlagen (Hauptanwendungsfall)

```bash
# Alle Blitz-Niederlagen eines Spielers in einem Zeitraum, nach Zugzahl sortiert
python3 pgn_query.py --db games.db losses \
    --player "Magnus Carlsen" \
    --from 2023.01.01 \
    --to   2023.12.31 \
    --blitz

# Mit Dateinamen (um die PGN-Datei direkt zu öffnen)
python3 pgn_query.py --db games.db losses \
    --player "Magnus Carlsen" \
    --blitz --files
```

### Spieler-Statistik

```bash
python3 pgn_query.py --db games.db stats --player "Magnus Carlsen"
```

### Eröffnungsstatistik

```bash
# Als Schwarz
python3 pgn_query.py --db games.db openings --player "Magnus Carlsen" --as black

# Top 20 gesamt
python3 pgn_query.py --db games.db openings --player "Magnus Carlsen" --limit 20
```

### Direktes SQL

```bash
# Beliebige Abfrage
python3 pgn_query.py --db games.db sql \
    "SELECT white, black, ply_count, date FROM games WHERE eco LIKE 'E%' ORDER BY ply_count DESC LIMIT 10"
```

---

## 3. Blitz-Definition anpassen

In `pgn_query.py`, Zeile ~40:

```python
BLITZ_SECONDS = (180, 299)   # 3:00 – 4:59 → anpassen nach Bedarf
```

FIDE-Standard:
- Bullet: < 3 min  → `(1, 179)`
- Blitz:  3–10 min → `(180, 599)`
- Rapid:  10–60 min → `(600, 3599)`

---

## 4. Automatische Neu-Indexierung (systemd)

Siehe `pgn-index.service` — stündlicher Timer oder inotifywait für Echtzeit.

---

## 5. Nützliche SQL-Snippets (direkt via sqlite3)

```bash
sqlite3 games.db
```

```sql
-- Kürzeste gespielte Partien aller Zeiten
SELECT white, black, ply_count, date FROM games
ORDER BY ply_count ASC LIMIT 10;

-- Durchschnittliche Zugzahl pro Eröffnung
SELECT eco, opening, COUNT(*) AS n, ROUND(AVG(ply_count),1) AS avg_z
FROM games WHERE eco IS NOT NULL
GROUP BY eco ORDER BY n DESC LIMIT 20;

-- Gegner mit den meisten Partien gegen einen Spieler
SELECT
    CASE WHEN LOWER(white)='magnus carlsen' THEN black ELSE white END AS gegner,
    COUNT(*) AS partien
FROM games
WHERE LOWER(white)='magnus carlsen' OR LOWER(black)='magnus carlsen'
GROUP BY gegner ORDER BY partien DESC LIMIT 10;

-- Partien ohne TimeControl (unbekanntes Zeitformat)
SELECT COUNT(*) FROM games WHERE time_control IS NULL;

-- Alle Remis-Partien über 100 Züge
SELECT white, black, move_count, date FROM games
WHERE result = '1/2-1/2' AND move_count > 100
ORDER BY move_count DESC;
```

---

## Schema-Referenz

| Spalte | Typ | Inhalt |
|--------|-----|--------|
| `filename` | TEXT | Relativer Pfad zur PGN-Datei |
| `date` | TEXT | Format `YYYY.MM.DD` (PGN-Standard) |
| `white` / `black` | TEXT | Spielernamen |
| `result` | TEXT | `1-0`, `0-1`, `1/2-1/2`, `*` |
| `time_control` | TEXT | z.B. `180+2`, `300+0` |
| `ply_count` | INTEGER | Halbzüge (1 Zug = 2 Halbzüge) |
| `move_count` | INTEGER | Vollzüge |
| `eco` | TEXT | Eröffnungscode z.B. `E60` |
| `white_elo` / `black_elo` | INTEGER | Elo-Zahlen falls vorhanden |
