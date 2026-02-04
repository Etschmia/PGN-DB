
import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useChessGame } from './hooks/useChessGame';
import { usePgnDatabase } from './hooks/usePgnDatabase';
import { useOpeningLookup } from './hooks/useOpeningLookup';
import type { Move } from './types';
import { ChessIcon } from './components/Icons';
import ChessboardWrapper from './components/ChessboardWrapper';
const DatabaseList = lazy(() => import('./components/DatabaseList'));
const FilterBar = lazy(() => import('./components/FilterBar'));
const DatabaseControls = lazy(() => import('./components/DatabaseControls'));
const MoveHistory = lazy(() => import('./components/MoveHistory'));
const GameControls = lazy(() => import('./components/GameControls'));
const CommentEditor = lazy(() => import('./components/CommentEditor'));
const OpeningDisplay = lazy(() => import('./components/OpeningDisplay'));
const TagEditor = lazy(() => import('./components/TagEditor'));

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
    getUniqueOpenings,
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

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      // enrichGames lädt Partien direkt aus IndexedDB und ruft refreshGames nach Abschluss auf
      enrichGames(refreshGames);
    } catch (e) {
      setError('Fehler beim Importieren der PGN-Datei.');
      console.error(e);
    }
  }, [importPgnFile, enrichGames, refreshGames]);

  // Handle export current game
  const handleExportGame = useCallback(async () => {
    if (!selectedGame) return;

    // Get updated PGN with comments
    const updatedPgn = generatePgnWithComments();
    const updatedGame = {
      ...selectedGame,
      pgn: updatedPgn,
    };

    await exportGame(updatedGame);
  }, [selectedGame, generatePgnWithComments, exportGame]);

  // Handle export database
  const handleExportDatabase = useCallback(async () => {
    await exportDatabase(`chess-database-${new Date().toISOString().split('T')[0]}.pgn`);
  }, [exportDatabase]);

  // Handle clear database
  const handleClearDatabase = useCallback(async () => {
    try {
      await clearDatabase();
      setSuccess('Datenbank erfolgreich geleert!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError('Fehler beim Leeren der Datenbank.');
      console.error(e);
    }
  }, [clearDatabase]);

  // Save changes to current game (comments, tags, notes)
  const handleSaveCurrentGame = useCallback(async () => {
    if (!selectedGame) return;
    
    try {
      const updatedPgn = generatePgnWithComments();
      const updatedGame = {
        ...selectedGame,
        pgn: updatedPgn,
      };
      await updateCurrentGame(updatedGame);
      setSuccess('Änderungen gespeichert!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (e) {
      setError('Fehler beim Speichern der Änderungen.');
      console.error(e);
    }
  }, [selectedGame, generatePgnWithComments, updateCurrentGame]);

  const currentMove: Move | undefined = moves[currentIndex];

  // TimeControl formatieren: "300+0" → "5+0", "900+10" → "15+10"
  const formatTimeControl = (tc: string | undefined): string | null => {
    if (!tc || tc === '-') return null;
    const match = tc.match(/^(\d+)\+(\d+)$/);
    if (!match) return tc;
    const minutes = Math.round(parseInt(match[1]) / 60);
    return `${minutes}+${match[2]}`;
  };

  // Tastaturnavigation für Züge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignoriere Tastatureingaben wenn ein Eingabefeld fokussiert ist
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      // Nur navigieren wenn eine Partie geladen ist
      if (!selectedGame || moves.length === 0) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > -1) {
            goToMove(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < moves.length - 1) {
            goToMove(currentIndex + 1);
          }
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

  return (
    <div className="min-h-screen bg-surface-900 text-gray-200 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-surface-800 border-b border-surface-500 px-6 py-4">
        <h1 className="text-3xl font-bold text-accent flex items-center gap-3">
          <ChessIcon />
          Schach PGN-Datenbank
        </h1>
      </header>

      {/* Messages */}
      {error && (
        <div className="bg-red-900/80 border-b border-red-700 text-red-200 px-6 py-3 text-center">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-900/80 border-b border-green-700 text-green-200 px-6 py-3 text-center">
          <span className="block sm:inline">{success}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow flex overflow-hidden">
        {/* Left Panel - Database */}
        <div className="w-full lg:w-2/5 xl:w-1/3 border-r border-surface-500 flex flex-col bg-surface-800">
          {/* Database Controls */}
          <div className="p-4 border-b border-surface-500">
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

          {/* Filter Bar */}
          <div className="p-4 border-b border-surface-500">
            <Suspense fallback={<div className="animate-pulse bg-surface-600 h-10 rounded"></div>}>
              <FilterBar
                filters={filters}
                onUpdateFilters={updateFilters}
                onResetFilters={resetFilters}
                uniqueOpenings={getUniqueOpenings()}
                totalGames={games.length}
                filteredGames={filteredGames.length}
              />
            </Suspense>
          </div>

          {/* Database List */}
          <div className="flex-grow overflow-hidden">
            <Suspense fallback={<div className="animate-pulse bg-surface-600 h-32 rounded m-4"></div>}>
              <DatabaseList
                games={filteredGames}
                selectedGameId={selectedGameId}
                onSelectGame={selectGame}
                onDeleteGame={deleteGame}
              />
            </Suspense>
          </div>
        </div>

        {/* Right Panel - Game Viewer */}
        <div className="flex-grow flex flex-col overflow-hidden bg-surface-900">
          {!selectedGame ? (
            <div className="flex-grow flex flex-col items-center justify-center text-gray-500 p-8">
              <ChessIcon className="w-32 h-32 mb-6 text-surface-400" />
              <p className="text-xl font-semibold text-gray-400">Keine Partie ausgewählt</p>
              <p className="text-sm mt-2">Wählen Sie eine Partie aus der Liste oder importieren Sie eine PGN-Datei</p>
            </div>
          ) : (
            <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
              {/* Chessboard Column */}
              <div className="lg:w-3/5 flex flex-col p-4 overflow-auto">
                <div className="flex-shrink-0 mb-4">
                  <h2 className="text-xl font-bold mb-2 text-accent-light">
                    {selectedGame.white} vs {selectedGame.black}
                  </h2>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>{selectedGame.event} - {selectedGame.date}</div>
                    <div>Ergebnis: <span className="font-semibold text-gray-200">{selectedGame.result}</span></div>
                  </div>
                </div>

                <div className="flex-shrink-0 w-full max-w-[600px] mx-auto aspect-square mb-4">
                  <ChessboardWrapper fen={fen} />
                </div>

                <div className="flex-shrink-0">
                  <Suspense fallback={<div className="animate-pulse bg-surface-600 h-12 rounded"></div>}>
                    <GameControls
                      currentIndex={currentIndex}
                      movesLength={moves.length}
                      goToMove={goToMove}
                    />
                  </Suspense>
                </div>

                {/* Save Button */}
                <div className="mt-4">
                  <button
                    onClick={handleSaveCurrentGame}
                    className="w-full bg-accent hover:bg-accent-light text-surface-900 font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Änderungen speichern
                  </button>
                </div>
              </div>

              {/* Info Column */}
              <div className="lg:w-2/5 border-t lg:border-t-0 lg:border-l border-surface-500 flex flex-col overflow-hidden">
                <div className="p-4 space-y-4 overflow-auto">
                  {/* Opening Display */}
                  <Suspense fallback={<div className="animate-pulse bg-surface-600 h-20 rounded"></div>}>
                    <OpeningDisplay
                      opening={currentOpening}
                      isLoading={isLoadingOpening}
                      isTreeAvailable={isTreeAvailable}
                      currentMoves={moves.slice(0, currentIndex + 1).map(m => m.san)}
                      onSaveName={saveOpeningName}
                    />
                  </Suspense>

                  {/* Event & Zeitmodus */}
                  {selectedGame.event && (
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                      <span>{selectedGame.event}</span>
                      {formatTimeControl(headers.TimeControl) && (
                        <span className="text-gray-500">·</span>
                      )}
                      {formatTimeControl(headers.TimeControl) && (
                        <span className="font-mono text-gray-300">{formatTimeControl(headers.TimeControl)}</span>
                      )}
                    </div>
                  )}

                  {/* Move History */}
                  <div className="bg-surface-700 rounded-lg overflow-hidden">
                    <h3 className="text-lg font-semibold p-3 bg-surface-900/70 text-accent">Partiezüge</h3>
                    <div className="max-h-[300px] overflow-auto">
                      <Suspense fallback={<div className="animate-pulse bg-surface-600 h-32 rounded"></div>}>
                        <MoveHistory moves={moves} currentIndex={currentIndex} onMoveSelect={goToMove} />
                      </Suspense>
                    </div>
                  </div>

                  {/* Comment Editor */}
                  <Suspense fallback={<div className="animate-pulse bg-surface-600 h-32 rounded"></div>}>
                    <CommentEditor
                      move={currentMove}
                      onSaveComment={updateCommentForCurrentMove}
                      moveIndex={currentIndex}
                    />
                  </Suspense>

                  {/* Tags and Notes */}
                  <Suspense fallback={<div className="animate-pulse bg-surface-600 h-32 rounded"></div>}>
                    <TagEditor
                      game={selectedGame}
                      onUpdate={updateCurrentGame}
                    />
                  </Suspense>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
