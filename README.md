# Schach PGN-Datenbank

Eine schicke und moderne PGN-basierte Schach-Datenbank, die im Browser läuft. Mit dieser Anwendung können Sie lokale PGN-Dateien laden, Partien analysieren, Züge kommentieren und Ihre Arbeit wieder als PGN-Datei speichern. Die Eröffnungen werden mithilfe der Google Gemini API identifiziert, um Ihnen tiefere Einblicke in Ihre Partien zu geben.

Dieses Projekt wurde mit Vite, React, TypeScript und Tailwind CSS erstellt.

## Features

- **PGN-Dateien laden:** Öffnen Sie PGN-Dateien von Ihrem lokalen Computer per Drag-and-Drop oder Dateiauswahl.
- **Interaktives Schachbrett:** Visualisieren Sie die aktuelle Stellung auf einem sauberen Schachbrett (`react-chessboard`).
- **Partie-Navigation:** Springen Sie schnell zum Anfang, zum Ende oder bewegen Sie sich zugweise vor und zurück.
- **Zug-Historie:** Eine klickbare Liste aller Züge ermöglicht die direkte Navigation zu jeder Stellung in der Partie.
- **Kommentar-Funktion:** Fügen Sie zu jedem Zug eigene Kommentare hinzu oder bearbeiten Sie bestehende. Ihre Anmerkungen werden beim Speichern in die PGN-Datei übernommen.
- **PGN-Export:** Speichern Sie die Partie inklusive Ihrer neuen Kommentare als PGN-Datei auf Ihrem Computer.
- **KI-Eröffnungsanalyse:** Die ersten Züge der Partie werden an die Google Gemini API gesendet, um den Namen und den ECO-Code der Eröffnung zu identifizieren.
- **Modernes UI:** Eine ansprechende und responsive Benutzeroberfläche, gestaltet mit Tailwind CSS.

## Tech Stack

- **Frontend:** [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Schach-Logik:** [chess.js](https://github.com/jhlywa/chess.js)
- **Schachbrett-UI:** [react-chessboard](https://github.com/Clariity/react-chessboard)
- **KI-Features:** [Google Gemini API](https://ai.google.dev/)

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

3.  **API-Schlüssel einrichten:**
    Dieses Projekt benötigt einen API-Schlüssel für die Google Gemini API.
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

## Bekannte Probleme

Es gibt ein bekanntes, hartnäckiges Problem mit dem Parsen von PGN-Dateien mit bestimmten Formatierungen. Weitere Details finden Sie in der [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md)-Datei.

## Beitrag leisten

Beiträge sind willkommen! Wenn Sie einen Fehler finden oder eine neue Funktion vorschlagen möchten, erstellen Sie bitte ein Issue. Pull Requests zur Behebung von Fehlern oder zur Implementierung neuer Funktionen sind ebenfalls willkommen.

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz.
