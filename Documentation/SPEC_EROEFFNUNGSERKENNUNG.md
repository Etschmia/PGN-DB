# Spec: Eröffnungserkennung — Von Gemini auf Datenbank umstellen

> Referenz: KONZEPT_NAECHSTE_SCHRITTE.md, Abschnitt 1.1

---

## 1. Zusammenfassung

Die bisherige Eröffnungserkennung via Google Gemini API wird komplett ersetzt durch ein zweistufiges lokales Lookup-System:

1. **Schachmentor-Eröffnungsbaum** (primär) — live vom Schachmentor-Server geladen
2. **Statische ECO-Datenbank** (Fallback) — gebündelt als JSON aus dem lichess/chess-openings Datensatz

Gemini wird vollständig entfernt (`geminiService.ts` gelöscht, `@google/genai`-Dependency entfernt).

---

## 2. Architektur-Entscheidungen

| Frage | Entscheidung | Begründung |
|-------|-------------|------------|
| Lookup-Priorität | Schachmentor-Baum → ECO-DB → PGN-Header | Baum hat deutsche, kuratierte Namen; ECO-DB ist vollständig; PGN-Header ist letzter Fallback |
| Gemini-Fallback? | Nein, komplett entfernen | Keine API-Kosten, keine Halluzinationen, keine externe Abhängigkeit |
| Dynamik | Eröffnungsname aktualisiert sich beim Navigieren durch Züge | Wie in Schachmentor — zeigt Entwicklung der Eröffnung |
| Leere Baumknoten | Letzten gefundenen Namen behalten | Natürlichstes Verhalten; Name bleibt stehen bis ein neuer kommt |
| Import-Strategie | Hybrid: PGN-Header sofort, Baum-Lookup asynchron im Hintergrund | Import bleibt schnell, Daten werden nachträglich angereichert |
| Datenspeicherung | `opening`/`eco`-Felder in IndexedDB überschreiben | Einfaches Datenmodell; bestes verfügbares Ergebnis gewinnt |
| Schachmentor-Baum: Qualitätsfilter | Whitelist: Nur Einträge mit Wikipedia/Wikibooks-Link gelten als gesichert | Filtert Platzhalter wie "dafür gibt es keinen Namen ..." heraus |
| Editierfunktion | Inline-Edit in pgn-db, POST an Schachmentor-API | Fehlende Namen direkt beim Analysieren ergänzen |
| Edit-Felder | Nur Eröffnungsname (kein Link, kein ECO) | Einfach halten |
| Cache-Invalidierung | Frischer Baum-Load bei jedem App-Start | Bei 28 KB kein Performance-Problem |
| Offline-Verhalten | Dezenter Hinweis; Edit-Button ausblenden | Kein lauter Fehler, Fallback auf ECO-DB funktioniert trotzdem |
| ECO-Datenquelle | lichess/chess-openings (~3500 Einträge, MIT-Lizenz) | Gut gepflegt, vollständig, freie Lizenz |
| ECO-Sprache | Gängige Eröffnungen Deutsch, Rest Englisch | Pragmatischer Kompromiss |
| Schachmentor-API | Neuer schlanker Endpoint `/api/moves/slim` | TTS-Metadaten (40% des JSON) werden nicht gebraucht |

---

## 3. Lookup-Logik im Detail

### 3.1 Prioritätsreihenfolge

Für jeden Zug in der aktuellen Navigation:

```
1. Schachmentor-Baum traversieren (Zugfolge matchen)
   ├─ Treffer MIT Link → Name verwenden ✓
   ├─ Treffer OHNE Link → ignorieren (Whitelist-Filter)
   └─ Kein Treffer → weiter zu 2.

2. Statische ECO-DB durchsuchen (Zugfolge matchen)
   ├─ Treffer → ECO-Code + Name verwenden ✓
   └─ Kein Treffer → weiter zu 3.

3. PGN-Header auslesen
   ├─ [Opening] und [ECO] vorhanden → verwenden ✓
   └─ Nicht vorhanden → Feld bleibt leer
```

### 3.2 Dynamische Zug-für-Zug-Anzeige

- Bei jedem Navigationsschritt (Pfeiltasten, Klick auf Zug) wird der Baum bis zur aktuellen Zugposition traversiert
- Wenn der aktuelle Knoten einen Namen hat → anzeigen
- Wenn nicht → **letzten gefundenen Namen beibehalten** (kein Blinken/Verschwinden)
- Beispiel: `1.e4 e5 2.Nf3 Nc6 3.Bb5`
  - Zug 1 (e4): "Königsbauern-Eröffnung"
  - Zug 2 (e5): kein eigener Name → "Königsbauern-Eröffnung" bleibt
  - Zug 3 (Nf3): kein eigener Name → "Königsbauern-Eröffnung" bleibt
  - Zug 4 (Nc6): kein eigener Name → ECO-Fallback: "Ruy Lopez" (falls im ECO-Datensatz)
  - Zug 5 (Bb5): ECO-Fallback: "Ruy Lopez" (tieferer Match)

### 3.3 Baum-Traversierung

Algorithmus analog zu Schachmentors `OpeningWidget.tsx`:

```typescript
function traverseTree(tree: MoveNode, moveHistory: string[]): TraversalResult {
  let current = tree;
  let lastNamedNode: { name: string; eco?: string; depth: number } | null = null;

  for (let i = 0; i < moveHistory.length; i++) {
    const child = current.children?.find(c => c.move === moveHistory[i]);
    if (!child) break; // Pfad endet hier

    current = child;
    // Whitelist-Filter: nur Knoten mit Link gelten als benannt
    if (child.name && child.link) {
      lastNamedNode = { name: child.name, depth: i + 1 };
    }
  }

  return { lastNamedNode, reachedDepth: /* ... */ };
}
```

### 3.4 ECO-DB-Lookup

Die statische ECO-DB wird beim App-Start als Trie/Map geladen. Der Lookup sucht den **längsten passenden Prefix** in der Zugfolge:

```typescript
// Zugfolge: ["e4", "e5", "Nf3", "Nc6", "Bb5"]
// ECO-DB enthält z.B.:
//   ["e4", "e5", "Nf3", "Nc6", "Bb5"] → { eco: "C60", name: "Ruy Lopez" }
//   ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"] → { eco: "C68", name: "Ruy Lopez: Exchange Variation" }
// → Längster Match: C60, "Ruy Lopez"
```

---

## 4. Datenquellen

### 4.1 Schachmentor-Eröffnungsbaum

- **Quelle:** `GET http://localhost:3001/api/moves/slim` (neuer Endpoint)
- **Aktueller Umfang:** 117 Knoten, 83 benannt, max. 11 Halbzüge tief
- **Format:** Verschachtelter JSON-Baum
- **Relevante Felder:** `move`, `name`, `link`, `children`
- **Größe:** ~15-17 KB (nach Entfernung von TTS-Metadaten)

### 4.2 Statische ECO-Datenbank

- **Quelle:** [lichess/chess-openings](https://github.com/lichess-org/chess-openings) (MIT-Lizenz)
- **Umfang:** ~3500 Eröffnungsvarianten
- **Originalformat:** TSV mit Spalten `eco`, `name`, `pgn`
- **Zielformat:** JSON-Datei, als Trie oder sortierte Liste aufbereitet
- **Sprache:** Gängige Eröffnungen auf Deutsch übersetzt (Sizilianisch, Spanisch, Französisch, Damengambit, etc.), Rest bleibt Englisch
- **Bundling:** Als statische JSON-Datei in `src/data/eco-openings.json` eingebunden

### 4.3 Deutsche Übersetzungen (Auszug der wichtigsten)

| Englisch | Deutsch |
|----------|---------|
| Sicilian Defense | Sizilianische Verteidigung |
| Ruy Lopez | Spanische Partie |
| French Defense | Französische Verteidigung |
| Italian Game | Italienische Partie |
| Queen's Gambit | Damengambit |
| King's Indian Defense | Königsindische Verteidigung |
| English Opening | Englische Eröffnung |
| Caro-Kann Defense | Caro-Kann |
| Pirc Defense | Pirc-Verteidigung |
| Scandinavian Defense | Skandinavische Verteidigung |
| Dutch Defense | Holländische Verteidigung |
| Nimzo-Indian Defense | Nimzowitsch-Indische Verteidigung |
| Grünfeld Defense | Grünfeld-Verteidigung |
| Benoni Defense | Benoni-Verteidigung |
| Alekhine's Defense | Aljechin-Verteidigung |
| Petrov's Defense | Russische Verteidigung |
| Philidor Defense | Philidor-Verteidigung |
| Scotch Game | Schottische Partie |
| Vienna Game | Wiener Partie |
| King's Gambit | Königsgambit |
| Bird's Opening | Bird-Eröffnung |
| London System | Londoner System |
| Catalan Opening | Katalanische Eröffnung |
| Slav Defense | Slawische Verteidigung |
| Semi-Slav Defense | Halbslawisch |
| Trompowsky Attack | Trompowsky-Angriff |
| Budapest Gambit | Budapester Gambit |

> Die vollständige Übersetzungsliste wird bei der Implementierung erstellt. Nicht übersetzte Namen bleiben auf Englisch.

---

## 5. API-Änderungen in Schachmentor

### 5.1 Neuer Endpoint: `GET /api/moves/slim`

Liefert den Eröffnungsbaum **ohne** TTS-Metadaten.

**Response-Format:**
```json
{
  "move": "",
  "name": null,
  "link": null,
  "children": [
    {
      "move": "e4",
      "name": "Königsbauern-Eröffnung",
      "link": "http://en.wikipedia.org/wiki/King%27s_Pawn_Game",
      "children": [
        {
          "move": "e6",
          "name": "Französisch",
          "link": "http://en.wikipedia.org/wiki/French_Defence",
          "children": [ ... ]
        }
      ]
    }
  ]
}
```

**Implementierung in `server.js`:**
- Wiederverwendet die bestehende `loadMovesTree()`-Funktion
- Strippt rekursiv alle Felder außer `move`, `name`, `link`, `children`

### 5.2 Bestehender Endpoint: `POST /api/moves`

Wird unverändert von pgn-db genutzt für die Editierfunktion.

**Request:**
```json
{
  "moves": ["e4", "c5", "Nf3"],
  "name": "Sizilianische Verteidigung: Offene Variante"
}
```

**Response:**
```json
{
  "success": true,
  "moves": { /* vollständiger aktualisierter Baum */ }
}
```

---

## 6. Änderungen in pgn-db

### 6.1 Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/services/openingLookupService.ts` | Zentraler Service: Baum laden, ECO laden, Lookup-Logik |
| `src/data/eco-openings.json` | Statische ECO-Datenbank (generiert aus lichess/chess-openings) |
| `src/hooks/useOpeningLookup.ts` | React-Hook: Verwaltet Baum-State, bietet `lookup(moves)` und `saveName()` |

### 6.2 Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `App.tsx` | Gemini-Import entfernen, `useOpeningLookup`-Hook einbinden, dynamischen Lookup bei Zugnavigation triggern |
| `components/OpeningDisplay.tsx` | Erweitern: Inline-Edit, Schachmentor-Status-Indikator, dynamische Anzeige |
| `hooks/usePgnDatabase.ts` | `importPgnFile()`: Nach Import Hintergrund-Lookup starten, Ergebnisse in IndexedDB updaten |
| `hooks/useChessGame.ts` | Zughistorie als SAN-Array exportieren (für Baum-Traversierung) |
| `types.ts` | Optional: `openingSource`-Feld hinzufügen (für Debugging/Transparenz) |

### 6.3 Gelöschte Dateien

| Datei | Grund |
|-------|-------|
| `services/geminiService.ts` | Komplett durch openingLookupService ersetzt |

### 6.4 Entfernte Dependencies

| Paket | Grund |
|-------|-------|
| `@google/genai` | Nicht mehr benötigt |

---

## 7. Komponentendesign

### 7.1 `openingLookupService.ts`

```typescript
interface MoveNode {
  move: string;
  name: string | null;
  link: string | null;
  children: MoveNode[];
}

interface EcoEntry {
  eco: string;
  name: string;
  moves: string[]; // SAN-Zugfolge als Array
}

interface LookupResult {
  name: string;
  eco: string;
  source: 'tree' | 'eco' | 'pgn-header';
}

// Öffentliche API:
loadTree(): Promise<MoveNode | null>
  // GET http://localhost:3001/api/moves/slim
  // Gibt null zurück wenn nicht erreichbar

loadEcoDatabase(): EcoEntry[]
  // Import aus src/data/eco-openings.json
  // Wird beim ersten Aufruf geladen und gecached

lookupOpening(moveHistory: string[], pgnHeader?: { opening: string; eco: string }): LookupResult | null
  // Priorität: Baum (mit Whitelist) → ECO → PGN-Header
  // Sucht den längsten passenden Prefix

lookupDynamic(moveHistory: string[], currentMoveIndex: number, ...): LookupResult | null
  // Wie lookupOpening, aber nur bis currentMoveIndex
  // Für die dynamische Zug-für-Zug-Anzeige

saveName(moves: string[], name: string): Promise<MoveNode | null>
  // POST http://localhost:3001/api/moves
  // Gibt aktualisierten Baum zurück oder null bei Fehler

isSchachmentorAvailable(): boolean
  // Gibt cached Verfügbarkeitsstatus zurück
```

### 7.2 `useOpeningLookup` Hook

```typescript
interface UseOpeningLookupReturn {
  // State
  currentOpening: LookupResult | null;   // Aktueller Eröffnungsname für angezeigte Position
  isTreeAvailable: boolean;               // Schachmentor erreichbar?
  isLoading: boolean;

  // Actions
  lookupForPosition(moveHistory: string[], moveIndex: number): void;
  saveName(moves: string[], name: string): Promise<boolean>;
  enrichGames(games: GameRecord[]): Promise<GameRecord[]>;  // Batch-Lookup für Import
}
```

### 7.3 `OpeningDisplay.tsx` (erweitert)

**Anzeige-Zustände:**

1. **Normal (Baum-Treffer):** Eröffnungsname in Cyan, dezentes Edit-Icon bei Hover
2. **ECO-Fallback:** Eröffnungsname + ECO-Code in Grau, kein Edit-Icon
3. **PGN-Header-Fallback:** Name aus Header, kein Edit-Icon
4. **Kein Treffer:** "Keine Eröffnung erkannt" in Grau
5. **Laden:** Spinner (nur beim initialen Baum-Load)
6. **Schachmentor offline:** Kleiner grauer Punkt als Indikator, Edit-Icon ausgeblendet

**Inline-Edit:**
- Klick auf den Eröffnungsnamen öffnet ein Textfeld (nur wenn `isTreeAvailable === true`)
- Enter speichert (POST an Schachmentor), Escape bricht ab
- Nach Speichern wird der Baum im State aktualisiert (Response enthält neuen Baum)

---

## 8. Batch-Lookup beim Import

### Ablauf

```
PGN-Datei importiert (500 Partien)
  │
  ├─ Sofort: PGN-Header-Daten extrahieren → opening/eco in IndexedDB
  │          (bestehendes Verhalten, synchron beim Import)
  │
  └─ Danach (asynchron im Hintergrund):
       Für jede Partie:
         1. Zugfolge aus PGN extrahieren
         2. lookupOpening(zugfolge, pgnHeader) aufrufen
         3. Wenn Ergebnis besser als PGN-Header → IndexedDB updaten

       Ergebnisse:
         - opening/eco Felder in IndexedDB werden überschrieben
         - UI aktualisiert sich wenn Partieliste neu geladen wird
```

### "Besser" definiert als:

- Baum-Treffer > ECO-DB-Treffer > PGN-Header
- Bei gleicher Quelle: tieferer Match (spezifischerer Name) gewinnt

---

## 9. Phasenplan

### Phase 1: Infrastruktur & Daten

**Schachmentor-Seite:**
- [ ] Neuen Endpoint `GET /api/moves/slim` in `server.js` implementieren
- [ ] Testen: Response enthält nur `move`, `name`, `link`, `children`

**pgn-db-Seite:**
- [ ] lichess/chess-openings Datensatz herunterladen (TSV-Dateien a.tsv bis e.tsv)
- [ ] Konvertierungsskript: TSV → `src/data/eco-openings.json`
  - PGN-Zugfolgen in SAN-Arrays parsen
  - Gängige Eröffnungsnamen ins Deutsche übersetzen
  - Als sortierte Liste speichern (nach Zugfolge-Länge absteigend für Longest-Prefix-Match)
- [ ] `geminiService.ts` löschen
- [ ] `@google/genai` aus `package.json` entfernen
- [ ] `.env`-Referenzen auf `GEMINI_API_KEY`/`API_KEY` entfernen

### Phase 2: Kern-Lookup-Service

- [ ] `src/services/openingLookupService.ts` erstellen
  - `loadTree()`: Fetch von `localhost:3001/api/moves/slim`, Fehlerbehandlung
  - `loadEcoDatabase()`: Import & Caching der statischen ECO-Daten
  - `lookupOpening()`: Dreistufiger Lookup (Baum → ECO → Header)
  - `lookupDynamic()`: Lookup bis zu einer bestimmten Zugposition
  - `saveName()`: POST an Schachmentor-API
  - `isSchachmentorAvailable()`: Cached Statusabfrage
- [ ] `src/hooks/useOpeningLookup.ts` erstellen
  - Baum beim App-Start laden
  - Verfügbarkeitsstatus tracken
  - `lookupForPosition()` für dynamische Anzeige
  - `enrichGames()` für Batch-Lookup

### Phase 3: UI-Integration

- [ ] `App.tsx` anpassen:
  - Gemini-Import und -State entfernen
  - `useOpeningLookup`-Hook einbinden
  - Bei Zugnavigation `lookupForPosition()` aufrufen (mit aktuellem `currentMoveIndex`)
- [ ] `components/OpeningDisplay.tsx` erweitern:
  - Dynamische Anzeige des aktuellen Eröffnungsnamens
  - Inline-Edit-Funktionalität (Textfeld, Enter/Escape)
  - Schachmentor-Verfügbarkeitsindikator (grüner/grauer Punkt)
  - Edit-Icon nur anzeigen wenn Schachmentor erreichbar
  - Verschiedene visuelle Stile je nach Quelle (Baum vs. ECO vs. Header)
- [ ] `hooks/useChessGame.ts` anpassen:
  - Zughistorie als SAN-Array exportieren (falls noch nicht verfügbar)

### Phase 4: Import-Integration

- [ ] `hooks/usePgnDatabase.ts` anpassen:
  - Nach `importPgnFile()`: asynchronen Batch-Lookup starten
  - Ergebnisse in IndexedDB updaten (`updateGame()` pro Partie)
  - UI-Refresh nach Abschluss des Hintergrund-Lookups
- [ ] Fortschrittsindikator (optional): "Eröffnungen werden erkannt..." in der Partieliste

### Phase 5: Aufräumen & Dokumentation

- [ ] `CLAUDE.md` aktualisieren: Gemini-Referenzen entfernen, neuen Service dokumentieren
- [ ] `KONZEPT_NAECHSTE_SCHRITTE.md`: Status auf "✅ Erledigt" setzen
- [ ] `Documentation/KNOWN_ISSUES.md`: Gemini-bezogene Issues entfernen/aktualisieren
- [ ] Manueller Test: Import einer PGN-Datei, Zugnavigation, Inline-Edit, Offline-Fallback

---

## 10. Offene Punkte / Risiken

| Risiko | Mitigation |
|--------|-----------|
| Schachmentor-Baum hat nur 83 benannte Eröffnungen | ECO-DB mit 3500 Einträgen als Fallback |
| SAN-Notation-Unterschiede (O-O vs. 0-0) | chess.js normalisiert bereits zu Standard-SAN; ECO-Daten beim Konvertieren ebenfalls normalisieren |
| POST /api/moves erstellt fehlende Baumknoten automatisch | Gewünschtes Verhalten — neue Pfade werden im Baum angelegt |
| Batch-Lookup bei 500+ Partien könnte UI blockieren | `requestIdleCallback` oder `setTimeout`-Chunking verwenden |
| CORS: pgn-db (Port 3000) → Schachmentor (Port 3001) | Schachmentor hat bereits CORS-Header; ggf. konfigurieren |
| Deutsche Übersetzungen der ECO-Namen: Aufwand | ~30-40 Haupteröffnungen übersetzen, Rest bleibt Englisch |

---

## 11. Akzeptanzkriterien

1. **Kein Gemini-Aufruf mehr:** `geminiService.ts` ist gelöscht, `@google/genai` deinstalliert
2. **Dynamische Anzeige:** Beim Navigieren durch eine Partie ändert sich der Eröffnungsname pro Zug
3. **Schachmentor-Baum funktioniert:** Bei erreichbarem Schachmentor werden deutsche Eröffnungsnamen aus dem Baum angezeigt
4. **ECO-Fallback funktioniert:** Bei nicht erreichbarem Schachmentor werden ECO-Daten als Fallback angezeigt
5. **Inline-Edit funktioniert:** Klick auf Eröffnungsname → Textfeld → Enter speichert → Name aktualisiert sich
6. **Import-Anreicherung:** Nach PGN-Import werden Eröffnungsnamen im Hintergrund ergänzt
7. **Offline-Indikator:** Wenn Schachmentor nicht erreichbar, ist ein dezenter visueller Hinweis sichtbar
8. **Filter funktioniert:** Eröffnungsfilter in der Partieliste funktioniert mit den neuen Daten
