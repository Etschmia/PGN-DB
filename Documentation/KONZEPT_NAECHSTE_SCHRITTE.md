# Konzept: Nächste Schritte

Dieses Dokument beschreibt die empfohlenen nächsten Schritte für die Weiterentwicklung der Schach PGN-Datenbank.

## Priorität 1: Kritische Probleme beheben

### 1.1 React 19 Kompatibilität mit react-chessboard ✅ GELÖST

**Problem:** Das Schachbrett aktualisierte die Position nicht korrekt beim Navigieren durch Züge.

**Lösung (umgesetzt am 25.01.2026):**

1. **react-chessboard auf v5.8.6 upgraden:**
   ```bash
   npm install react-chessboard@5.8.6
   ```

2. **Wichtig: API-Breaking-Change beachten!**
   Die API hat sich in v5.8.6 komplett geändert:

   | Alte API (v5.6.x) | Neue API (v5.8.6) |
   |-------------------|-------------------|
   | `<Chessboard position={fen} />` | `<Chessboard options={{ position: fen }} />` |
   | `arePiecesDraggable={false}` | `options.allowDragging: false` |
   | `animationDuration={200}` | `options.animationDurationInMs: 200` |
   | `boardOrientation="white"` | `options.boardOrientation: 'white'` |

3. **ChessboardWrapper erstellt** (`components/ChessboardWrapper.tsx`):
   ```tsx
   import { Chessboard } from 'react-chessboard';

   export default function ChessboardWrapper({ fen }: { fen: string }) {
     const options = useMemo(() => ({
       position: fen,
       allowDragging: false,
       animationDurationInMs: 200,
       boardOrientation: 'white' as const,
     }), [fen]);

     return <Chessboard options={options} />;
   }
   ```

**Status:** ✅ Behoben und getestet.

### 1.2 PGN-Parsing Stabilität

**Problem:** Einige PGN-Dateien schlagen trotz Preprocessing fehl.

**Maßnahmen:**
- Weitere Edge Cases in `useChessGame.ts` dokumentieren
- Fehlerbehandlung verbessern mit spezifischen Fehlermeldungen
- Fallback-Modus für teilweise lesbare Dateien implementieren

## Priorität 2: Code-Qualität

### 2.1 ESLint und Prettier einrichten

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier
```

Konfigurationsdateien erstellen:
- `.eslintrc.cjs` - TypeScript-spezifische Regeln
- `.prettierrc` - Einheitliche Formatierung

### 2.2 Testing-Framework hinzufügen

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Prioritäten für Tests:
1. `useChessGame.ts` - PGN-Parsing-Logik (kritisch)
2. `indexedDBService.ts` - Datenbankoperationen
3. `usePgnDatabase.ts` - Filter- und Suchlogik

## Priorität 3: Funktionale Erweiterungen

### 3.1 Offline-Fähigkeit (PWA)

- Service Worker für Offline-Nutzung
- Manifest-Datei für Installation auf Mobilgeräten
- Vite PWA Plugin: `vite-plugin-pwa`

### 3.2 Analysefunktionen erweitern

- Stockfish-Engine im Browser integrieren (via Web Worker)
- Zugbewertungen anzeigen
- Beste Züge vorschlagen

### 3.3 Import/Export erweitern

- Drag & Drop für PGN-Dateien
- Export als PDF mit Diagrammen
- Lichess/Chess.com API-Integration zum direkten Import

### 3.4 UI/UX Verbesserungen

- Dark Mode implementieren
- Responsive Design für Mobilgeräte verbessern
- ✅ Tastaturnavigation für Züge (Pfeiltasten) - **Erledigt am 25.01.2026**
  - Pfeil links/rechts: Vorheriger/Nächster Zug
  - Home/End: Zum Anfang/Ende der Partie
  - Automatische Deaktivierung bei fokussierten Eingabefeldern

## Priorität 4: Infrastruktur

### 4.1 CI/CD Pipeline

GitHub Actions Workflow erstellen (`.github/workflows/ci.yml`):
- Build-Validierung bei Pull Requests
- Automatische Tests
- Deployment auf GitHub Pages oder Vercel

### 4.2 Dokumentation

- JSDoc-Kommentare für öffentliche Funktionen
- Storybook für Komponenten-Dokumentation (optional)

## Umsetzungsreihenfolge

| Phase | Aufgabe | Geschätzter Aufwand |
|-------|---------|---------------------|
| 1 | React 19 Problem beheben | Klein |
| 2 | ESLint/Prettier einrichten | Klein |
| 3 | Vitest + erste Tests | Mittel |
| 4 | PGN-Parsing stabilisieren | Mittel |
| 5 | Tastaturnavigation | ✅ Erledigt |
| 6 | PWA-Unterstützung | Mittel |
| 7 | Stockfish-Integration | Groß |
| 8 | CI/CD Pipeline | Klein |

## Entscheidungen

Folgende Entscheidungen sollten vor der Umsetzung getroffen werden:

1. **React Version:** Downgrade auf 18.x oder Workaround für 19?
2. **Zielgruppe:** Rein lokale Nutzung oder auch Cloud-Sync in Zukunft?
3. **Sprache:** Bleibt die App einsprachig (Deutsch) oder soll i18n vorbereitet werden?
4. **Engine-Analyse:** Soll Stockfish integriert werden oder reicht die Eröffnungserkennung via Gemini?
