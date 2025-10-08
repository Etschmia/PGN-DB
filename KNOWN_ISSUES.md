# Bekannte Probleme

Dieses Dokument listet bekannte Probleme und Bugs in der Anwendung auf.

## PGN-Parsing-Fehler bei bestimmten Formatierungen

**Status:** Offen | **Priorität:** Hoch

### Symptom

Beim Versuch, bestimmte, ansonsten gültige PGN-Dateien zu laden, schlägt der Import fehl. Die Anwendung zeigt die Fehlermeldung "Ungültiges PGN-Format" an. In der Entwicklerkonsole erscheint ein detaillierterer Fehler von der `chess.js`-Bibliothek, typischerweise:

```
Ungültiges PGN:
Expected end of input, game termination marker, move number, standard algebraic notation, or whitespace but "{" found.
```

Dieser Fehler tritt auf, obwohl die PGN-Datei in anderen Schachprogrammen (wie Lichess, chess.com oder ChessBase) problemlos geöffnet werden kann.

### Ursache

Die Wurzel des Problems liegt im PGN-Parser der `chess.js`-Bibliothek. Dieser Parser ist extrem streng und empfindlich gegenüber subtilen Formatierungsabweichungen vom PGN-Standard, insbesondere im Zusammenhang mit Kommentaren (`{...}` und `;...`).

Selbst im "sloppy mode" (`{ sloppy: true }`) scheitert der Parser, wenn Leerräume (Whitespace) oder Zeilenumbrüche nicht exakt seinen Erwartungen entsprechen. Ein häufiger Auslöser ist ein Zug oder eine Zugnummer, die ohne Leerzeichen direkt an eine öffnende Kommentar-Klammer (`{`) stößt (z.B. `...e4{Ein Kommentar}`).

### Bisherige Lösungsversuche

Es wurden zahlreiche, immer robuster werdende Vorverarbeitungs- und Bereinigungsstrategien implementiert, um die PGN-Daten vor der Übergabe an den Parser zu "waschen". Leider konnte keine dieser Methoden eine 100%ige Erfolgsquote garantieren:

1.  **Normalisierung von Zeilenumbrüchen:** Vereinheitlichung von `\r\n` und `\r` zu `\n`.
2.  **Konvertierung von Kommentaren:** Umwandlung von Semikolon-Kommentaren (`;`) in das Standard-Klammerformat (`{...}`).
3.  **Erzwingen von Leerzeichen (Brute-Force):** Pauschales Einfügen von Leerzeichen vor und nach jeder `{` und `}` Klammer.
4.  **Platzhalter-Strategie:** Ersetzen von geschweiften Klammern *innerhalb* von Kommentaren durch Platzhalter, um den Inhalt zu schützen, bevor die äußeren Klammern bereinigt werden.
5.  **Trennung von Headern und Zügen:** Die aufwändigste Methode trennte explizit die PGN-Header vom Zug-Text, um die Bereinigungslogik nur auf die Züge anzuwenden und eine unbeabsichtigte Beschädigung der Header-Werte zu verhindern.

Trotz dieser umfangreichen Bemühungen gibt es immer noch Randfälle bei der PGN-Formatierung, die den Parser zum Scheitern bringen.

### Mögliche nächste Schritte

Eine endgültige Lösung erfordert wahrscheinlich einen fundamental anderen Ansatz, da die clientseitige Vorverarbeitung an ihre Grenzen stößt:

-   **Alternative Bibliothek:** Recherche und Austausch von `chess.js` gegen eine andere JavaScript-Schachbibliothek mit einem fehlertoleranteren PGN-Parser.
-   **Fork von `chess.js`:** Erstellen eines Forks der Bibliothek und direkte Verbesserung des PGN-Parsers, um ihn robuster gegenüber gängigen Formatierungsvarianten zu machen.
-   **Server-seitiges Parsing:** Implementierung eines kleinen Backend-Endpunkts, der die PGN-Daten empfängt, sie mit einer serverseitigen, kampferprobten Schach-Engine (z.B. `python-chess` in Python) validiert und standardisiert und eine saubere PGN-Version an das Frontend zurückgibt.
