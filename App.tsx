
import React, { useState, useCallback, useEffect, lazy, Suspense, useRef } from 'react';
import { useChessGame } from './hooks/useChessGame';
import { usePgnDatabase } from './hooks/usePgnDatabase';
import { useOpeningLookup } from './hooks/useOpeningLookup';
import { useAuth } from './hooks/useAuth';
import { useIsMobile } from './hooks/useIsMobile';
import type { Move } from './types';
import { ChessIcon } from './components/Icons';
import ChessboardWrapper from './components/ChessboardWrapper';
import AuthBar from './components/AuthBar';

// TimeControl formatieren: "300+0" → "5+0", "900+10" → "15+10"
const formatTimeControl = (tc: string | undefined): string | null => {
  if (!tc || tc === '-') return null;
  const match = tc.match(/^(\d+)\+(\d+)$/);
  if (!match) return tc;
  const minutes = Math.round(parseInt(match[1]) / 60);
  return `${minutes}+${match[2]}`;
};
const DatabaseList = lazy(() => import('./components/DatabaseList'));
const FilterBar = lazy(() => import('./components/FilterBar'));
const DatabaseControls = lazy(() => import('./components/DatabaseControls'));
const MoveHistory = lazy(() => import('./components/MoveHistory'));
const GameControls = lazy(() => import('./components/GameControls'));
const CommentEditor = lazy(() => import('./components/CommentEditor'));
const OpeningDisplay = lazy(() => import('./components/OpeningDisplay'));
const TagEditor = lazy(() => import('./components/TagEditor'));

type DragType = 'left' | 'center' | 'horizontal';

export default function App() {
  const {
    game,
    fen,
    moves,
    headers,
    currentIndex,
    loadPgn,
    goToMove,
    updateCommentForCurrentMove,
    generatePgnWithComments,
  } = useChessGame();

  const {
    games,
    filteredGames,
    selectedGameId,
    selectedGame,
    filters,
    isLoading,
    importPgnFile,
    selectGame,
    updateCurrentGame,
    deleteGame,
    exportGame,
    exportDatabase,
    clearDatabase,
    updateFilters,
    resetFilters,
    uniqueOpenings,
    refreshGames,
  } = usePgnDatabase();

  const {
    currentOpening,
    isTreeAvailable,
    isLoading: isLoadingOpening,
    lookupForPosition,
    saveOpeningName,
    enrichGames,
  } = useOpeningLookup();

  const {
    user,
    isAuthenticated,
    isLoading: isLoadingAuth,
    storageInfo,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    refreshStorageInfo,
  } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'board'>('list');
  const boardViewRef = useRef<HTMLDivElement | null>(null);

  // Resizable panels state
  const [leftWidth, setLeftWidth] = useState(280);
  const [centerWidth, setCenterWidth] = useState(520);
  const [topHeightPx, setTopHeightPx] = useState<number | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const topAreaRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    type: DragType;
    startX: number;
    startY: number;
    startValue: number;
  } | null>(null);

  const isMobile = useIsMobile();

  // URL-Parameter erkennen
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === '1') {
      setSuccess('Email-Adresse erfolgreich bestätigt! Sie sind jetzt eingeloggt.');
      setTimeout(() => setSuccess(null), 6000);
      window.history.replaceState({}, '', '/');
    } else if (params.get('verify') === 'expired') {
      setError('Der Bestätigungslink ist abgelaufen. Bitte registrieren Sie sich erneut.');
      window.history.replaceState({}, '', '/');
    } else if (params.get('verify') === 'error') {
      setError('Fehler bei der Email-Bestätigung. Bitte versuchen Sie es erneut.');
      window.history.replaceState({}, '', '/');
    } else if (params.get('reset-token')) {
      setResetToken(params.get('reset-token'));
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Load selected game into chess viewer
  useEffect(() => {
    if (selectedGame) {
      console.log('[App] Lade ausgewählte Partie:', selectedGame.id);
      loadPgn(selectedGame.pgn);
    }
  }, [selectedGame, loadPgn]);

  // Dynamischer Eröffnungs-Lookup bei Zugnavigation
  useEffect(() => {
    if (selectedGame && moves.length > 0) {
      const moveHistory = moves.map(m => m.san);
      const pgnHeader = { opening: selectedGame.opening, eco: selectedGame.eco };
      lookupForPosition(moveHistory, currentIndex, pgnHeader);
    }
  }, [selectedGame, moves, currentIndex, lookupForPosition]);

  // Handle PGN import + Hintergrund-Enrichment
  const handleImport = useCallback(async (content: string, filename: string) => {
    try {
      setError(null);
      setSuccess(null);
      const count = await importPgnFile(content);
      setSuccess(`${count} Partie(n) erfolgreich importiert!`);
      setTimeout(() => setSuccess(null), 5000);

      // Eröffnungserkennung im Hintergrund starten
      enrichGames(refreshGames);

      if (isAuthenticated) refreshStorageInfo();
    } catch (e) {
      setError('Fehler beim Importieren der PGN-Datei.');
      console.error(e);
    }
  }, [importPgnFile, enrichGames, refreshGames, isAuthenticated, refreshStorageInfo]);

  const handleExportGame = useCallback(async () => {
    if (!selectedGame) return;
    const updatedPgn = generatePgnWithComments();
    const updatedGame = { ...selectedGame, pgn: updatedPgn };
    await exportGame(updatedGame);
  }, [selectedGame, generatePgnWithComments, exportGame]);

  const handleExportDatabase = useCallback(async () => {
    await exportDatabase(`chess-database-${new Date().toISOString().split('T')[0]}.pgn`);
  }, [exportDatabase]);

  const handleClearDatabase = useCallback(async () => {
    try {
      await clearDatabase();
      setSuccess('Datenbank erfolgreich geleert!');
      setTimeout(() => setSuccess(null), 3000);
      if (isAuthenticated) refreshStorageInfo();
    } catch (e) {
      setError('Fehler beim Leeren der Datenbank.');
      console.error(e);
    }
  }, [clearDatabase, isAuthenticated, refreshStorageInfo]);

  const handleSaveCurrentGame = useCallback(async () => {
    if (!selectedGame) return;
    try {
      const updatedPgn = generatePgnWithComments();
      const updatedGame = { ...selectedGame, pgn: updatedPgn };
      await updateCurrentGame(updatedGame);
      setSuccess('Änderungen gespeichert!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (e) {
      setError('Fehler beim Speichern der Änderungen.');
      console.error(e);
    }
  }, [selectedGame, generatePgnWithComments, updateCurrentGame]);

  const currentMove: Move | undefined = moves[currentIndex];

  const handleResetPassword = useCallback(async (token: string, password: string) => {
    await resetPassword(token, password);
    setResetToken(null);
    setSuccess('Passwort erfolgreich geändert! Sie sind jetzt eingeloggt.');
    setTimeout(() => setSuccess(null), 6000);
  }, [resetPassword]);

  // Tastaturnavigation für Züge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }
      if (!selectedGame || moves.length === 0) return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > -1) goToMove(currentIndex - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < moves.length - 1) goToMove(currentIndex + 1);
          break;
        case 'Home':
          e.preventDefault();
          goToMove(-1);
          break;
        case 'End':
          e.preventDefault();
          goToMove(moves.length - 1);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedGame, moves.length, currentIndex, goToMove]);

  // Auf Mobile beim Wechsel in die Brettansicht nach oben scrollen
  useEffect(() => {
    if (!isMobile) return;
    if (mobileView !== 'board') return;
    if (!selectedGame) return;
    const node = boardViewRef.current;
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isMobile, mobileView, selectedGame?.id]);

  // Drag-Handler für resizable panels
  const startDrag = useCallback((type: DragType, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    let startValue: number;
    if (type === 'left') startValue = leftCollapsed ? 0 : leftWidth;
    else if (type === 'center') startValue = centerWidth;
    else startValue = topHeightPx ?? topAreaRef.current?.offsetHeight ?? 400;

    dragStateRef.current = { type, startX: clientX, startY: clientY, startValue };
  }, [leftWidth, leftCollapsed, centerWidth, topHeightPx]);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragStateRef.current) return;
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      const { type, startX, startY, startValue } = dragStateRef.current;

      if (type === 'left') {
        setLeftWidth(Math.max(160, Math.min(600, startValue + (clientX - startX))));
      } else if (type === 'center') {
        setCenterWidth(Math.max(280, Math.min(800, startValue + (clientX - startX))));
      } else {
        setTopHeightPx(Math.max(150, startValue + (clientY - startY)));
      }
    };

    const handleEnd = () => { dragStateRef.current = null; };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, []);

  // Gemeinsame Inhalte für Datenbanksteuerung
  const dbControls = (
    <>
      <div className="p-4 border-b border-surface-500 flex-shrink-0">
        <Suspense fallback={<div className="animate-pulse bg-surface-600 h-10 rounded"></div>}>
          <DatabaseControls
            onImport={handleImport}
            onExportGame={handleExportGame}
            onExportDatabase={handleExportDatabase}
            onClearDatabase={handleClearDatabase}
            gameCount={games.length}
            hasSelectedGame={!!selectedGame}
            isLoading={isLoading}
          />
        </Suspense>
      </div>
      <div className="p-4 border-b border-surface-500 flex-shrink-0 overflow-auto">
        <Suspense fallback={<div className="animate-pulse bg-surface-600 h-10 rounded"></div>}>
          <FilterBar
            filters={filters}
            onUpdateFilters={updateFilters}
            onResetFilters={resetFilters}
            uniqueOpenings={uniqueOpenings}
            totalGames={games.length}
            filteredGames={filteredGames.length}
          />
        </Suspense>
      </div>
    </>
  );

  // Partienliste (full-width unten)
  const gameListPanel = (
    <div className="flex-grow overflow-hidden flex flex-col min-h-[150px]">
      <Suspense fallback={<div className="animate-pulse bg-surface-600 h-32 rounded m-4"></div>}>
        <DatabaseList
          games={filteredGames}
          selectedGameId={selectedGameId}
          onSelectGame={selectGame}
          onSelectAndShowBoard={isMobile ? (id) => { selectGame(id); setMobileView('board'); } : undefined}
          onDeleteGame={deleteGame}
        />
      </Suspense>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-900 text-gray-200 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-surface-800 border-b border-surface-500 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <h1 className="text-3xl font-bold text-accent flex items-center gap-3">
          <ChessIcon />
          Schach PGN-Datenbank
        </h1>
        {!isLoadingAuth && (
          <AuthBar
            user={user}
            isAuthenticated={isAuthenticated}
            storageInfo={storageInfo}
            onLogin={login}
            onRegister={register}
            onLogout={logout}
            onForgotPassword={forgotPassword}
            onResetPassword={handleResetPassword}
            resetToken={resetToken}
          />
        )}
      </header>

      {/* Messages */}
      {error && (
        <div className="bg-red-900/80 border-b border-red-700 text-red-200 px-6 py-3 text-center flex-shrink-0">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-900/80 border-b border-green-700 text-green-200 px-6 py-3 text-center flex-shrink-0">
          <span className="block sm:inline">{success}</span>
        </div>
      )}

      {isMobile ? (
        /* ── Mobile Layout ─────────────────────────────────────────────── */
        <main className="flex-grow flex flex-col overflow-hidden">
          {mobileView === 'list' ? (
            <>
              <div className="bg-surface-800 flex-shrink-0">
                {dbControls}
              </div>
              {gameListPanel}
            </>
          ) : (
            <div className="flex-grow flex flex-col overflow-hidden bg-surface-900" ref={boardViewRef}>
              {/* Zurück zur Liste */}
              <div className="flex-shrink-0 p-3 border-b border-surface-500 bg-surface-800">
                <button
                  type="button"
                  onClick={() => setMobileView('list')}
                  className="flex items-center gap-2 text-accent hover:text-accent-light font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Zurück zur Liste
                </button>
              </div>
              {selectedGame ? (
                <div className="flex-grow flex flex-col overflow-auto p-4">
                  <div className="flex-shrink-0 mb-4">
                    <h2 className="text-xl font-bold mb-2 text-accent-light">
                      {selectedGame.white} vs {selectedGame.black}
                    </h2>
                    <div className="text-sm text-gray-400 space-y-1">
                      <div>{selectedGame.event} - {selectedGame.date}</div>
                      <div>Ergebnis: <span className="font-semibold text-gray-200">{selectedGame.result}</span></div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 mb-4 flex justify-center">
                    <ChessboardWrapper fen={fen} />
                  </div>
                  <div className="flex-shrink-0">
                    <Suspense fallback={<div className="animate-pulse bg-surface-600 h-12 rounded"></div>}>
                      <GameControls currentIndex={currentIndex} movesLength={moves.length} goToMove={goToMove} />
                    </Suspense>
                  </div>
                  <div className="mt-4 space-y-4">
                    <Suspense fallback={null}>
                      <OpeningDisplay
                        opening={currentOpening}
                        isLoading={isLoadingOpening}
                        isTreeAvailable={isTreeAvailable}
                        currentMoves={moves.slice(0, currentIndex + 1).map(m => m.san)}
                        onSaveName={saveOpeningName}
                      />
                    </Suspense>
                    <div className="bg-surface-700 rounded-lg overflow-hidden">
                      <h3 className="text-lg font-semibold p-3 bg-surface-900/70 text-accent">Partiezüge</h3>
                      <div className="max-h-[300px] overflow-auto">
                        <Suspense fallback={null}>
                          <MoveHistory moves={moves} currentIndex={currentIndex} onMoveSelect={goToMove} />
                        </Suspense>
                      </div>
                    </div>
                    <Suspense fallback={null}>
                      <CommentEditor move={currentMove} onSaveComment={updateCommentForCurrentMove} moveIndex={currentIndex} />
                    </Suspense>
                    <Suspense fallback={null}>
                      <TagEditor game={selectedGame} onUpdate={updateCurrentGame} />
                    </Suspense>
                    <button
                      onClick={handleSaveCurrentGame}
                      className="w-full bg-accent hover:bg-accent-light text-surface-900 font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                      Änderungen speichern
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-gray-500 p-8">
                  <ChessIcon className="w-32 h-32 mb-6 text-surface-400" />
                  <p className="text-xl font-semibold text-gray-400">Keine Partie ausgewählt</p>
                  <p className="text-sm mt-2">Wählen Sie eine Partie aus der Liste</p>
                </div>
              )}
            </div>
          )}
        </main>
      ) : (
        /* ── Desktop Layout ─────────────────────────────────────────────── */
        <main className="flex-grow flex flex-col overflow-hidden" ref={containerRef}>

          {/* Oberer Bereich: 3 Spalten */}
          <div
            ref={topAreaRef}
            className="flex overflow-hidden flex-shrink-0"
            style={topHeightPx !== null ? { height: topHeightPx } : { flex: '2 1 0' }}
          >

            {/* Linke Spalte (einklappbar) */}
            <div
              className="flex flex-col bg-surface-800 flex-shrink-0 overflow-hidden transition-none"
              style={{ width: leftCollapsed ? 0 : leftWidth }}
            >
              {!leftCollapsed && dbControls}
            </div>

            {/* Vertikaler Trenner 1 + Einklapp-Button */}
            <div
              className="w-2 bg-surface-600 hover:bg-accent/40 cursor-col-resize flex-shrink-0 flex items-center justify-center relative select-none"
              onMouseDown={(e) => { if ((e.target as HTMLElement).tagName !== 'BUTTON') startDrag('left', e); }}
              onTouchStart={(e) => { if ((e.target as HTMLElement).tagName !== 'BUTTON') startDrag('left', e); }}
            >
              <button
                type="button"
                title={leftCollapsed ? 'Linke Spalte einblenden' : 'Linke Spalte ausblenden'}
                onClick={() => setLeftCollapsed(c => !c)}
                className="absolute z-20 bg-surface-700 hover:bg-accent hover:text-surface-900 text-gray-400 rounded-full w-5 h-5 flex items-center justify-center text-xs shadow border border-surface-500 hover:border-accent transition-colors"
              >
                {leftCollapsed ? '›' : '‹'}
              </button>
            </div>

            {/* Mittlere Spalte: Schachbrett */}
            <div
              className="flex flex-col p-4 overflow-auto flex-shrink-0"
              style={{ width: selectedGame ? centerWidth : undefined, flexGrow: selectedGame ? 0 : 1 }}
            >
              {!selectedGame ? (
                <div className="flex-grow flex flex-col items-center justify-center text-gray-500">
                  <ChessIcon className="w-32 h-32 mb-6 text-surface-400" />
                  <p className="text-xl font-semibold text-gray-400">Keine Partie ausgewählt</p>
                  <p className="text-sm mt-2">Wählen Sie eine Partie aus der Liste unten oder importieren Sie eine PGN-Datei</p>
                </div>
              ) : (
                <>
                  <div className="flex-shrink-0 mb-4">
                    <h2 className="text-xl font-bold mb-2 text-accent-light">
                      {selectedGame.white} vs {selectedGame.black}
                    </h2>
                    <div className="text-sm text-gray-400 space-y-1">
                      <div>{selectedGame.event} - {selectedGame.date}</div>
                      <div>Ergebnis: <span className="font-semibold text-gray-200">{selectedGame.result}</span></div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 mb-4 flex justify-center">
                    <ChessboardWrapper fen={fen} />
                  </div>
                  <div className="flex-shrink-0">
                    <Suspense fallback={<div className="animate-pulse bg-surface-600 h-12 rounded"></div>}>
                      <GameControls currentIndex={currentIndex} movesLength={moves.length} goToMove={goToMove} />
                    </Suspense>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={handleSaveCurrentGame}
                      className="w-full bg-accent hover:bg-accent-light text-surface-900 font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                      Änderungen speichern
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Vertikaler Trenner 2 (nur bei ausgewählter Partie) */}
            {selectedGame && (
              <div
                className="w-2 bg-surface-600 hover:bg-accent/40 cursor-col-resize flex-shrink-0 select-none"
                onMouseDown={(e) => startDrag('center', e)}
                onTouchStart={(e) => startDrag('center', e)}
              />
            )}

            {/* Rechte Spalte: Partieinfo */}
            {selectedGame && (
              <div className="flex-grow flex flex-col overflow-hidden border-l border-surface-500">
                <div className="p-4 space-y-4 overflow-auto h-full">
                  <Suspense fallback={<div className="animate-pulse bg-surface-600 h-20 rounded"></div>}>
                    <OpeningDisplay
                      opening={currentOpening}
                      isLoading={isLoadingOpening}
                      isTreeAvailable={isTreeAvailable}
                      currentMoves={moves.slice(0, currentIndex + 1).map(m => m.san)}
                      onSaveName={saveOpeningName}
                    />
                  </Suspense>

                  {selectedGame.event && (
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                      <span>{selectedGame.event}</span>
                      {formatTimeControl(headers.TimeControl) && (
                        <>
                          <span className="text-gray-500">·</span>
                          <span className="font-mono text-gray-300">{formatTimeControl(headers.TimeControl)}</span>
                        </>
                      )}
                    </div>
                  )}

                  <div className="bg-surface-700 rounded-lg overflow-hidden">
                    <h3 className="text-lg font-semibold p-3 bg-surface-900/70 text-accent">Partiezüge</h3>
                    <div className="max-h-[300px] overflow-auto">
                      <Suspense fallback={<div className="animate-pulse bg-surface-600 h-32 rounded"></div>}>
                        <MoveHistory moves={moves} currentIndex={currentIndex} onMoveSelect={goToMove} />
                      </Suspense>
                    </div>
                  </div>

                  <Suspense fallback={<div className="animate-pulse bg-surface-600 h-32 rounded"></div>}>
                    <CommentEditor move={currentMove} onSaveComment={updateCommentForCurrentMove} moveIndex={currentIndex} />
                  </Suspense>

                  <Suspense fallback={<div className="animate-pulse bg-surface-600 h-32 rounded"></div>}>
                    <TagEditor game={selectedGame} onUpdate={updateCurrentGame} />
                  </Suspense>
                </div>
              </div>
            )}
          </div>

          {/* Horizontaler Trenner */}
          <div
            className="h-2 bg-surface-600 hover:bg-accent/40 cursor-row-resize flex-shrink-0 select-none border-t border-b border-surface-500"
            onMouseDown={(e) => startDrag('horizontal', e)}
            onTouchStart={(e) => startDrag('horizontal', e)}
          />

          {/* Unterer Bereich: Partienliste über volle Breite */}
          <div
            className="bg-surface-800 flex flex-col overflow-hidden"
            style={topHeightPx !== null ? { flex: '1 1 0' } : { flex: '1 1 0' }}
          >
            {gameListPanel}
          </div>

        </main>
      )}
    </div>
  );
}
