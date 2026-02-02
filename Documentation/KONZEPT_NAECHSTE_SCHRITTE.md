# Konzept: Nächste Schritte

Dieses Dokument beschreibt die empfohlenen nächsten Schritte für die Weiterentwicklung der Schach PGN-Datenbank.

---

## Status-Übersicht (Stand: 02.02.2026)

| Aufgabe | Status |
|---------|--------|
| React 19 Kompatibilität | ✅ Erledigt (25.01.2026) |
| Tastaturnavigation | ✅ Erledigt (25.01.2026) |
| PGN-Export ins Dateisystem | ✅ Vorhanden (Blob-Download) |
| react-chessboard v5.8.6 | ✅ Erledigt, neue Options-API |
| ESLint/Prettier | ⬜ Offen |
| Testing-Framework | ⬜ Offen |
| PWA-Unterstützung | ⬜ Offen |
| CI/CD Pipeline | ⬜ Offen |
| Eröffnungserkennung ohne Gemini | ⬜ Neu geplant (siehe 1.1) |
| Lichess/Chess.com Import | ⬜ Neu geplant (siehe 1.2) |
| PGN Dateisystem-Export (File System Access API) | ⬜ Neu geplant (siehe 1.3) |
| Login/Registrierung + Server-Storage | ⬜ Neu geplant (siehe 1.4) |

---

## Priorität 1: Neue funktionale Erweiterungen

### 1.1 Eröffnungserkennung: Von Gemini auf Datenbank umstellen

**Problem:** Aktuell wird für jede Partie ein Gemini-API-Call (`geminiService.ts`) gemacht, nur um den Eröffnungsnamen und ECO-Code zu ermitteln. Das ist:
- Langsam (Netzwerk-Roundtrip + LLM-Inference)
- Kostet API-Tokens
- Nicht deterministisch (LLM kann halluzinieren)
- Benötigt API-Key im Frontend/Environment

**Lösung im Schwester-Projekt Schachmentor:**
Schachmentor hat bereits eine PostgreSQL-basierte Lösung:
- Tabelle `moves` mit Baumstruktur (id, parent_id, move, name)
- API-Endpoint `GET /api/moves` liefert den gesamten Eröffnungsbaum
- `POST /api/moves` erlaubt das Benennen von Zugfolgen
- Der Baum wird aus der Datenbank geladen und im Frontend traversiert (`OpeningWidget.tsx`)
- Die Datenbank läuft auf demselben Server (PostgreSQL 17, Port 5432)

**Integrationsmöglichkeiten (absteigend nach Aufwand):**

| Option | Beschreibung | Vorteile | Nachteile |
|--------|-------------|----------|-----------|
| **A) API-Call zu Schachmentor** | pgn-db ruft `GET http://localhost:3001/api/moves` auf und traversiert den Baum clientseitig | Kein DB-Zugriff nötig, sofort umsetzbar, Schachmentor pflegt die Daten | Abhängigkeit von laufendem Schachmentor-Service |
| **B) Direkter DB-Zugriff** | pgn-db bekommt eigenen PostgreSQL-Zugang zur `moves`-Tabelle | Unabhängig vom Schachmentor-Service, schneller | Tight Coupling auf DB-Ebene, Schachmentor-Schema-Änderungen betreffen pgn-db |
| **C) Shared NPM-Modul** | Opening-Lookup als eigenes Paket extrahieren, von beiden Projekten genutzt | Saubere Trennung, wiederverwendbar | Höchster initialer Aufwand |

**Empfehlung:** Option A ist der pragmatischste Weg. Der Schachmentor-Service läuft sowieso dauerhaft auf Port 3001. Der `geminiService.ts` wird durch einen `openingLookupService.ts` ersetzt, der den Moves-Baum von Schachmentor holt und lokal cached. Als Fallback kann Gemini weiterhin genutzt werden, wenn der Schachmentor-Service nicht erreichbar ist.

**Umsetzungsschritte:**
1. Neuen Service `openingLookupService.ts` erstellen
2. Beim App-Start den Moves-Baum von `localhost:3001/api/moves` laden und cachen
3. Lookup-Funktion: Zugfolge der aktuellen Partie gegen den Baum matchen
4. `OpeningDisplay.tsx` anpassen: Statt Gemini-Call den lokalen Lookup nutzen
5. Fallback auf Gemini nur wenn Baum-Lookup keinen Treffer ergibt
6. `geminiService.ts` kann dann optional/als Fallback erhalten bleiben

---

### 1.2 Lichess/Chess.com Import

**Aktueller Stand:** Partien werden nur per manueller PGN-Datei-Upload importiert.

**Lösung im Schwester-Projekt ChessTrax:**
ChessTrax hat bereits einen funktionierenden Lichess-Import (`services/lichessService.ts`):
```typescript
const LICHESS_API_BASE_URL = "https://lichess.org/api/games/user/";
const MAX_GAMES = 2000;
const PERF_TYPES = "blitz,rapid,classical,correspondence,standard";
```
- Fetcht bis zu 2000 Partien eines Users im PGN-Format
- Nutzt die offizielle Lichess-API (kein API-Key nötig)
- Parameter: Tags, Clocks, Evals, Opening-Info

**Integration in pgn-db:**

1. **Neuer Service `lichessImportService.ts`:**
   - `fetchPgnFromLichess(username: string): Promise<string>` — aus ChessTrax übernehmen
   - Optional: `fetchPgnFromChessCom(username: string): Promise<string>` — Chess.com hat eine ähnliche API (`https://api.chess.com/pub/player/{username}/games/{YYYY}/{MM}/pgn`)
   - Rückgabe: Multi-Game-PGN-String

2. **UI-Erweiterung in `DatabaseControls.tsx`:**
   - Neuer Button "Von Lichess importieren"
   - Eingabefeld für Benutzername
   - Optional: Zeitraum-Filter, Partietyp-Filter
   - Fortschrittsanzeige (Lichess-API streamt die Daten)

3. **Parsing-Pipeline:**
   - Der bestehende PGN-Parser (`useChessGame.ts`) kann den Multi-Game-PGN-String verarbeiten
   - Partien in IndexedDB speichern (bestehende `saveGame()`-Funktion)
   - Duplikaterkennung (z.B. anhand der Lichess-Game-ID im PGN-Header)

**Aufwand:** Mittel. Der Kern-Service ist Copy-Paste aus ChessTrax, die UI-Integration braucht etwas Arbeit.

---

### 1.3 PGN-Export ins lokale Dateisystem

**Aktueller Stand:** pgn-db hat bereits Export-Funktionalität:
- `exportGame()` — einzelne Partie als PGN-Download (Blob + `<a download>`)
- `exportDatabase()` — gesamte Datenbank als Multi-Game-PGN-Download

Diese Funktionen erzeugen einen Browser-Download. Das ist funktional, aber nicht so komfortabel wie direktes Schreiben ins Dateisystem.

**Verbesserungsmöglichkeit: File System Access API**
Moderne Browser (Chrome, Edge) unterstützen die [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API):
```typescript
const handle = await window.showSaveFilePicker({
  suggestedName: 'meine-partien.pgn',
  types: [{ description: 'PGN', accept: { 'application/x-chess-pgn': ['.pgn'] } }]
});
const writable = await handle.createWritable();
await writable.write(pgnString);
await writable.close();
```

**Vorteile:**
- Nutzer wählt Speicherort selbst
- Kein automatischer Download-Ordner-Chaos
- Datei kann direkt überschrieben werden (z.B. regelmäßiges Backup)
- Kann mit `showOpenFilePicker()` auch den Import verbessern

**Einschränkung:** Firefox und Safari unterstützen die API nicht vollständig. Fallback auf Blob-Download muss erhalten bleiben.

**Umsetzung:**
1. Wrapper-Funktion `saveToFileSystem(content: string, filename: string)` mit Feature Detection
2. `exportGame()` und `exportDatabase()` nutzen den Wrapper
3. Bestehender Blob-Download als Fallback für nicht-unterstützte Browser

---

### 1.4 Login-/Registrierungssystem + Server-seitige PGN-Speicherung

**Ziel:** Eingeloggte User können ihre PGN-Daten auf dem Server speichern und verwalten, limitiert auf 10 MB pro User.

**Vorab zu klären / zu installieren:**

1. **Backend-Entscheidung:**
   - pgn-db ist aktuell ein reines Frontend (Vite + React, kein Server).
   - Für Auth + Storage brauchen wir einen Backend-Server.
   - **Empfehlung:** Eigener Express/Fastify-Server (wie bei Schachmentor/ChessTrax), da wir bereits PostgreSQL auf dem Server haben.
   - Alternative: Bestehenden Schachmentor-Server erweitern (weniger Infrastruktur, aber Kopplung)

2. **Authentifizierung:**
   - **Option A: Eigenes Auth-System** (bcrypt + JWT/Sessions)
     - Registrierung: Email + Passwort
     - Login: JWT-Token, gespeichert im HttpOnly-Cookie
     - PostgreSQL-Tabelle `users` (id, email, password_hash, created_at, storage_used)
     - Vorteil: Volle Kontrolle, kein externer Dienst
     - Nachteil: Eigene Implementierung von Passwort-Reset, Email-Verifizierung etc.
   - **Option B: OAuth-Provider** (Google, GitHub, Lichess)
     - Lichess-OAuth wäre thematisch passend und könnte den Lichess-Import gleich mit authentifizieren
     - Vorteil: Kein Passwort-Management, vertrauenswürdiger
     - Nachteil: Abhängigkeit von externem Provider
   - **Empfehlung:** Option A (eigenes System) für den Start, Optional Lichess-OAuth als Ergänzung

3. **Datenbank-Schema:**
   ```sql
   CREATE TABLE users (
     id SERIAL PRIMARY KEY,
     email VARCHAR(255) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     storage_used_bytes BIGINT DEFAULT 0,
     storage_limit_bytes BIGINT DEFAULT 10485760, -- 10 MB
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE user_pgn_files (
     id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
     filename VARCHAR(255) NOT NULL,
     pgn_data TEXT NOT NULL,
     size_bytes INTEGER NOT NULL,
     game_count INTEGER DEFAULT 0,
     uploaded_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_user_pgn_user_id ON user_pgn_files(user_id);
   ```

4. **API-Endpoints:**
   ```
   POST   /api/auth/register     — Registrierung
   POST   /api/auth/login        — Login
   POST   /api/auth/logout       — Logout
   GET    /api/pgn               — Eigene PGN-Dateien auflisten
   POST   /api/pgn               — PGN hochladen (prüft 10MB-Limit)
   GET    /api/pgn/:id           — PGN-Datei abrufen
   PUT    /api/pgn/:id           — PGN-Datei aktualisieren
   DELETE /api/pgn/:id           — PGN-Datei löschen
   GET    /api/user/storage      — Speicherverbrauch anzeigen
   ```

5. **Infrastruktur-Voraussetzungen:**
   - PostgreSQL 17 ✅ bereits vorhanden
   - Neues systemd-Service für pgn-db Backend
   - Caddy-Reverse-Proxy-Eintrag für die neue Subdomain (z.B. `pgn.martuni.de`)
   - CORS-Konfiguration oder Same-Origin-Deployment
   - Rate-Limiting für Auth-Endpoints (gegen Brute-Force)
   - Optional: Email-Service für Registrierungsbestätigung (oder ohne Bestätigung starten)

6. **Frontend-Änderungen:**
   - Login/Registrierungs-UI (Modal oder eigene Seite)
   - Auth-State-Management (Context/Zustand)
   - Sync-Logik: LocalStorage/IndexedDB ↔ Server
   - Anzeige des Speicherverbrauchs (X von 10 MB belegt)
   - Offline-Modus: Lokal arbeiten, bei nächster Verbindung synchronisieren

**Aufwand:** Groß. Dies ist das umfangreichste Feature. Empfohlene Reihenfolge:
1. Backend-Server aufsetzen (Express + PostgreSQL)
2. Auth-System implementieren (Register/Login/JWT)
3. PGN-Upload/Download-API
4. Frontend-Integration
5. Sync-Logik

---

## Priorität 2: Code-Qualität (unverändert)

### 2.1 ESLint und Prettier einrichten
```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier
```

### 2.2 Testing-Framework hinzufügen
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Prioritäten für Tests:
1. `useChessGame.ts` — PGN-Parsing-Logik (kritisch)
2. `indexedDBService.ts` — Datenbankoperationen
3. `usePgnDatabase.ts` — Filter- und Suchlogik

---

## Priorität 3: Weitere Erweiterungen (unverändert)

### 3.1 Offline-Fähigkeit (PWA)
- Service Worker für Offline-Nutzung
- Manifest-Datei für Installation auf Mobilgeräten
- Vite PWA Plugin: `vite-plugin-pwa`

### 3.2 Analysefunktionen erweitern
- Stockfish-Engine im Browser integrieren (via Web Worker)
- Zugbewertungen anzeigen
- Beste Züge vorschlagen

### 3.3 PGN-Parsing Stabilität
- Weitere Edge Cases in `useChessGame.ts` dokumentieren
- Fehlerbehandlung verbessern mit spezifischen Fehlermeldungen
- Fallback-Modus für teilweise lesbare Dateien implementieren

### 3.4 UI/UX Verbesserungen
- Dark Mode implementieren
- Responsive Design für Mobilgeräte verbessern

---

## Priorität 4: Infrastruktur (unverändert)

### 4.1 CI/CD Pipeline
GitHub Actions Workflow erstellen

### 4.2 Dokumentation
- JSDoc-Kommentare für öffentliche Funktionen

---

## Entscheidungen (aktualisiert)

| Frage | Status | Antwort |
|-------|--------|---------|
| React Version: Downgrade oder Workaround? | ✅ Erledigt | React 19 + react-chessboard v5.8.6 funktioniert |
| Zielgruppe: Lokal oder Cloud-Sync? | 🔄 In Planung | Beides — lokale Nutzung bleibt, Server-Storage kommt als Option (siehe 1.4) |
| Sprache: Einsprachig oder i18n? | ⬜ Offen | Noch zu entscheiden |
| Engine-Analyse: Stockfish oder Eröffnungserkennung via Gemini? | 🔄 In Planung | Eröffnungserkennung wird auf Schachmentor-DB umgestellt (siehe 1.1), Stockfish bleibt als separates Feature |
