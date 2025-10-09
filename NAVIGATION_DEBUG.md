# Schachbrett-Navigation Problem - Debugging-Dokumentation

## Problem-Beschreibung
Das Schachbrett zeigt immer nur die Startposition an, obwohl Züge in der Zugliste angeklickt werden und die Navigationspfeile verwendet werden. Das Brett reagiert nicht auf die Navigation.

## Symptome
- ✓ Partie wird korrekt geladen (64 Züge erkannt)
- ✓ Züge werden in der Zugliste angezeigt
- ✓ Klicks auf Züge und Navigationspfeile werden registriert
- ✗ Brett bleibt in der Startposition stehen
- ✗ Keine visuellen Änderungen auf dem Brett

## Durchgeführte Diagnose-Schritte

### 1. Event-Handler überprüft ✓
**Ergebnis:** Event-Handler funktionieren korrekt
```
useChessGame.ts:240 [useChessGame] goToMove aufgerufen! Index: 0 moves.length: 64
useChessGame.ts:243 [useChessGame] Setze Index von -1 auf 0
```
- `goToMove` wird bei jedem Klick aufgerufen
- Index-Parameter ist korrekt (0, 1, 2, 3, ...)

### 2. State-Management überprüft ✓
**Ergebnis:** `currentIndex` State wird korrekt aktualisiert
```
useChessGame.ts:243 [useChessGame] Setze Index von -1 auf 0
useChessGame.ts:243 [useChessGame] Setze Index von 0 auf 1
useChessGame.ts:243 [useChessGame] Setze Index von 1 auf 2
```
- State-Update funktioniert
- Index ändert sich sequenziell korrekt

### 3. FEN-Berechnung überprüft ✓
**Ergebnis:** FEN wird korrekt berechnet und ändert sich
```
useChessGame.ts:14 [useChessGame] fen useMemo wird berechnet! currentIndex: 0 moves.length: 64
useChessGame.ts:31 [useChessGame] Berechnete FEN: rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1

useChessGame.ts:14 [useChessGame] fen useMemo wird berechnet! currentIndex: 1 moves.length: 64
useChessGame.ts:31 [useChessGame] Berechnete FEN: rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2

useChessGame.ts:14 [useChessGame] fen useMemo wird berechnet! currentIndex: 2 moves.length: 64
useChessGame.ts:31 [useChessGame] Berechnete FEN: rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2
```
- `fen` useMemo Hook wird bei jeder `currentIndex`-Änderung neu berechnet
- FEN-String ist korrekt und repräsentiert die richtige Position
- FEN ändert sich mit jedem Zug

### 4. PGN-Parsing überprüft ✓
**Ergebnis:** PGN wird korrekt geparst
```
useChessGame.ts:196 [useChessGame] ✓ PGN erfolgreich in chess.js geladen!
useChessGame.ts:212 [useChessGame] Anzahl Züge: 64
```
- Lichess Clock-Tags `[%clk]` werden korrekt entfernt
- Chess.js kann die PGN erfolgreich parsen
- Alle 64 Züge werden extrahiert

## Ausgeschlossene Ursachen

1. ✗ **Problem bei Event-Handlern** - Funktionieren korrekt
2. ✗ **Problem beim State-Update** - `currentIndex` wird korrekt gesetzt
3. ✗ **Problem bei FEN-Berechnung** - Korrekte FEN wird generiert
4. ✗ **Problem mit useMemo Dependencies** - Hook reagiert auf `currentIndex`-Änderungen
5. ✗ **Problem mit PGN-Parsing** - PGN wird erfolgreich geladen

## Versuchte Lösungen

### Versuch 1: `key` Prop auf Chessboard
```tsx
<Chessboard
  key={fen}
  position={fen}
  arePiecesDraggable={false}
/>
```
**Ergebnis:** Keine Änderung

### Versuch 2: `key` Prop auf Suspense-Wrapper + zusätzliche Props
```tsx
<Suspense key={fen} fallback={...}>
  <Chessboard
    position={fen}
    arePiecesDraggable={false}
    animationDuration={0}
    boardOrientation="white"
  />
</Suspense>
```
**Ergebnis:** Keine Änderung (aktuelle Version)

## Aktuelle Code-Situation

### App.tsx (Zeilen 237-246)
```tsx
<div className="flex-shrink-0 w-full max-w-[600px] mx-auto aspect-square mb-4">
  <Suspense key={fen} fallback={<div className="w-full h-full bg-slate-800 animate-pulse rounded"></div>}>
    <Chessboard
      position={fen}
      arePiecesDraggable={false}
      animationDuration={0}
      boardOrientation="white"
    />
  </Suspense>
</div>
```

### useChessGame.ts (FEN Berechnung)
```tsx
const fen = useMemo(() => {
  console.log('[useChessGame] fen useMemo wird berechnet! currentIndex:', currentIndex, 'moves.length:', moves.length);
  const tempGame = new Chess();
  if (headers.FEN && typeof headers.FEN === 'string') {
      try {
          tempGame.load(headers.FEN);
      } catch {
          console.warn("Ungültige FEN im PGN-Header, verwende Standard-Startposition.");
      }
  }
  
  for (let i = 0; i <= currentIndex; i++) {
      if(moves[i]) {
          tempGame.move({ from: moves[i].from, to: moves[i].to, promotion: moves[i].promotion });
      }
  }
  
  const resultFen = tempGame.fen();
  console.log('[useChessGame] Berechnete FEN:', resultFen);
  return resultFen;
}, [currentIndex, moves, headers]);
```

## Verdacht: React-Chessboard Component Problem

Die `react-chessboard` Komponente scheint die `position` Prop nicht korrekt zu beobachten, selbst wenn:
- Die Prop sich ändert
- Ein `key` Prop gesetzt ist (sollte Komponente neu mounten)
- `animationDuration={0}` gesetzt ist

**Mögliche Ursachen:**
1. Die Komponente cached intern die Position
2. Lazy-Loading durch `Suspense` interferiert mit Updates
3. Die Version der `react-chessboard` Library hat einen Bug
4. Es fehlt ein kritisches Prop, das Updates triggert

## Nächste Schritte

### Option 1: Wrapper-Komponente mit useEffect erstellen
Erstelle eine Wrapper-Komponente um `Chessboard`, die die Position explizit mit einem `useEffect` aktualisiert:

```tsx
// components/ChessboardWrapper.tsx
const ChessboardWrapper = ({ fen }: { fen: string }) => {
  const [position, setPosition] = useState(fen);
  
  useEffect(() => {
    setPosition(fen);
  }, [fen]);
  
  return (
    <Chessboard
      position={position}
      arePiecesDraggable={false}
      animationDuration={0}
    />
  );
};
```

### Option 2: Chessboard direkt aus DOM entfernen und neu mounten
Verwende `{fen && <Chessboard position={fen} />}` Pattern, um bei FEN-Änderung das Component komplett zu unmounten:

```tsx
<div key={`board-${currentIndex}`}>
  <Chessboard position={fen} />
</div>
```

### Option 3: Alternative Chessboard-Library testen
Teste ob das Problem library-spezifisch ist:
- `chessboardjsx`
- `react-chess-board` (alternative)
- Eigene Canvas-basierte Implementation

### Option 4: react-chessboard Version/Dokumentation prüfen
- Check `package.json` für aktuelle Version
- Dokumentation auf GitHub für bekannte Issues durchsuchen
- Nach "position not updating" Issues suchen

### Option 5: Browser DevTools React Components Inspector
Verwende React DevTools um zu prüfen:
- Ob die `position` Prop tatsächlich im DOM ankommt
- Ob die Chessboard-Komponente neu rendert
- Welcher interne State die Komponente hat

## Wichtige Beobachtung aus letzten Logs

Die FEN wird **zweimal hintereinander** mit dem gleichen Wert berechnet:
```
useChessGame.ts:14 [useChessGame] fen useMemo wird berechnet! currentIndex: 6 moves.length: 64
useChessGame.ts:31 [useChessGame] Berechnete FEN: rnbqkbnr/pp2pppp/8/2ppP3/3P4/5N2/PPP2PPP/RNBQKB1R b KQkq - 1 4
useChessGame.ts:14 [useChessGame] fen useMemo wird berechnet! currentIndex: 6 moves.length: 64
useChessGame.ts:31 [useChessGame] Berechnete FEN: rnbqkbnr/pp2pppp/8/2ppP3/3P4/5N2/PPP2PPP/RNBQKB1R b KQkq - 1 4
```

Dies deutet auf einen doppelten Render hin (normal in React Strict Mode), ABER es bestätigt, dass die FEN korrekt ist.

## Empfohlene Priorität für morgen

### 🔴 HÖCHSTE PRIORITÄT: React 19 Kompatibilitätsproblem prüfen

**Hypothese:** `react-chessboard@5.6.2` ist nicht mit React 19.2.0 kompatibel.

**Sofort-Test 1:** React DevTools verwenden
- Prüfen ob `position` Prop tatsächlich bei der Chessboard-Komponente ankommt
- Schauen ob die Komponente überhaupt neu rendert

**Sofort-Test 2:** GitHub Issues von react-chessboard prüfen
- Suchen nach "React 19" oder "position not updating"
- URL: https://github.com/Clariity/react-chessboard/issues

**Lösung A - React Downgrade (Schnellste Lösung):**
```bash
npm install react@18.3.1 react-dom@18.3.1
```
React 18 ist stabil und sollte mit react-chessboard funktionieren.

**Lösung B - Wrapper-Komponente (Falls Downgrade nicht gewünscht):**
Option 1 aus obiger Liste - eigene Wrapper-Komponente erstellen.

**Lösung C - Alternatives Chessboard (Letzter Ausweg):**
- `chessground` (von Lichess verwendet)
- Eigene Implementation mit chess.js + Canvas/SVG

### Weitere Prioritäten:

1. **Option 5** - React DevTools nutzen (ZUERST!)
2. **Option 4** - GitHub Issues durchsuchen
3. **Lösung A** - React Downgrade testen
4. **Option 1** - Wrapper-Komponente als Workaround
5. **Lösung C** - Alternative Library nur falls nötig

## Zusätzliche Debug-Informationen

**Browser:** Nicht dokumentiert (sollte geprüft werden)
**React Version:** 19.2.0 (sehr neue Version!)
**React DOM Version:** 19.2.0
**react-chessboard Version:** 5.6.2
**chess.js Version:** 1.4.0
**Vite Version:** 6.2.0

### ⚠️ WICHTIGER HINWEIS: React 19 Kompatibilität!
React 19.2.0 ist eine sehr neue Version (Release Dezember 2024). Es ist möglich, dass `react-chessboard@5.6.2` noch nicht vollständig mit React 19 kompatibel ist. Dies könnte der Hauptgrund für das Problem sein!

## Relevante Dateien
- `App.tsx` (Zeilen 237-246)
- `hooks/useChessGame.ts` (Zeilen 13-33, 236-247)
- `components/GameControls.tsx`
- `components/MoveHistory.tsx`

