# Schach PGN-Datenbank

Eine vollwertige PGN-basierte Schach-Datenbank-Anwendung, die komplett im Browser läuft. Mit dieser Anwendung können Sie hunderte oder tausende von Schachpartien importieren, verwalten, analysieren, kommentieren und durchsuchen. Alle Daten werden lokal in Ihrem Browser gespeichert (IndexedDB) - keine Server, keine Cloud, vollständige Privatsphäre.

Dieses Projekt wurde mit Vite, React, TypeScript, Tailwind CSS und IndexedDB erstellt.

## Features

### Datenbank-Management
- **Multi-Game PGN Import:** Importieren Sie PGN-Dateien mit hunderten oder tausenden von Partien auf einmal
- **Persistente Speicherung:** Alle Partien werden lokal in IndexedDB gespeichert und bleiben auch nach einem Browser-Neustart erhalten
- **Tabellarische Übersicht:** Durchsuchen Sie Ihre gesamte Partien-Sammlung in einer übersichtlichen Tabelle
- **Leistungsstarke Filter:** Suchen und filtern Sie nach:
  - Spielernamen (Weiß oder Schwarz)
  - Eröffnungen
  - Datumsbereich
  - Ergebnis (1-0, 0-1, 1/2-1/2)
  - Benutzerdefinierten Tags
- **Bulk-Export:** Exportieren Sie die gesamte Datenbank oder einzelne Partien als PGN-Dateien

### Partie-Analyse
- **Interaktives Schachbrett:** Visualisieren Sie jede Stellung auf einem sauberen Schachbrett (`react-chessboard`)
- **Partie-Navigation:** Springen Sie schnell zum Anfang, zum Ende oder bewegen Sie sich zugweise vor und zurück
- **Zug-Historie:** Eine klickbare Liste aller Züge ermöglicht die direkte Navigation zu jeder Stellung
- **Kommentar-Funktion:** Fügen Sie zu jedem Zug eigene Kommentare hinzu oder bearbeiten Sie bestehende
- **Tags & Notizen:** Organisieren Sie Ihre Partien mit benutzerdefinierten Tags und Notizen
- **KI-Eröffnungsanalyse:** Die ersten Züge werden an die Google Gemini API gesendet, um den Namen und ECO-Code der Eröffnung zu identifizieren

### Benutzerfreundlichkeit
- **Modernes UI:** Eine ansprechende und responsive Benutzeroberfläche mit Tailwind CSS
- **Zwei-Spalten-Layout:** Datenbank-Übersicht links, Partie-Viewer rechts
- **Echtzeit-Updates:** Alle Änderungen werden sofort in der Datenbank gespeichert
- **Vollständig offline:** Funktioniert komplett ohne Internetverbindung (außer KI-Eröffnungsanalyse)

## Tech Stack

- **Frontend:** [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Datenbank:** [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (Browser-native)
- **Schach-Logik:** [chess.js](https://github.com/jhlywa/chess.js)
- **Schachbrett-UI:** [react-chessboard](https://github.com/Clariity/react-chessboard)
- **KI-Features:** [Google Gemini API](https://ai.google.dev/) (optional)

## Getting Started

Folgen Sie diesen Schritten, um das Projekt lokal auszuführen.

### Voraussetzungen

- [Node.js](https://nodejs.org/) (Version 18.x oder höher empfohlen)
- [npm](https://www.npmjs.com/) oder ein kompatibler Paketmanager

### Installation

1.  **Repository klonen:**
    ```bash
    git clone https://github.com/IHR-BENUTZERNAME/IHR-REPOSITORY.git
    cd IHR-REPOSITORY
    ```

2.  **Abhängigkeiten installieren:**
    ```bash
    npm install
    ```

3.  **API-Schlüssel einrichten (optional):**
    Die KI-Eröffnungsanalyse benötigt einen API-Schlüssel für die Google Gemini API.
    Die Anwendung funktioniert auch ohne API-Schlüssel, aber ohne Eröffnungserkennung.
    - Erstellen Sie eine `.env`-Datei im Hauptverzeichnis des Projekts.
    - Fügen Sie Ihren API-Schlüssel wie folgt hinzu:
      ```
      API_KEY=IHR_GOOGLE_GEMINI_API_SCHLÜSSEL
      ```

4.  **Entwicklungsserver starten:**
    ```bash
    npm run dev
    ```
    Die Anwendung sollte nun unter `http://localhost:5173` (oder einem anderen von Vite angegebenen Port) erreichbar sein.

## Verwendung

1. **PGN-Datei importieren:** Klicken Sie auf "PGN importieren" und wählen Sie eine PGN-Datei (einzelne Partie oder Multi-Game-Datei mit hunderten von Partien)
2. **Partien durchsuchen:** Nutzen Sie die Filter- und Suchfunktionen, um Partien nach Spielernamen, Eröffnung, Datum oder Ergebnis zu finden
3. **Partie auswählen:** Klicken Sie auf eine Zeile in der Tabelle, um die Partie anzuzeigen
4. **Partie analysieren:** Navigieren Sie durch die Züge, fügen Sie Kommentare hinzu, setzen Sie Tags
5. **Änderungen speichern:** Klicken Sie auf "Änderungen speichern", um Ihre Kommentare und Tags zu sichern
6. **Exportieren:** Exportieren Sie einzelne Partien oder die gesamte Datenbank als PGN-Datei

## Bekannte Probleme

Details zu bekannten Problemen und deren Lösungen finden Sie in der [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md)-Datei.

## Beitrag leisten

Beiträge sind willkommen! Wenn Sie einen Fehler finden oder eine neue Funktion vorschlagen möchten, erstellen Sie bitte ein Issue. Pull Requests zur Behebung von Fehlern oder zur Implementierung neuer Funktionen sind ebenfalls willkommen.

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz.
