
import React, { useState, useCallback, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { useChessGame } from './hooks/useChessGame';
import { getOpeningName } from './services/geminiService';
import type { Move } from './types';
import FileControls from './components/FileControls';
import MoveHistory from './components/MoveHistory';
import GameControls from './components/GameControls';
import CommentEditor from './components/CommentEditor';
import OpeningDisplay from './components/OpeningDisplay';
import { ChessIcon } from './components/Icons';

export default function App() {
  const {
    game,
    fen,
    pgn,
    moves,
    headers,
    fileName,
    currentIndex,
    loadPgn,
    goToMove,
    updateCommentForCurrentMove,
    generatePgnWithComments,
    setFileName,
  } = useChessGame();

  const [opening, setOpening] = useState<{ name: string; eco: string } | null>(null);
  const [isLoadingOpening, setIsLoadingOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePgnLoad = useCallback(async (pgnString: string, name: string) => {
    try {
      setError(null);
      setOpening(null);
      const loaded = loadPgn(pgnString);
      if (loaded) {
        setFileName(name);
        setIsLoadingOpening(true);
        try {
          const openingData = await getOpeningName(pgnString);
          setOpening(openingData);
        } catch (e) {
          setError('Eröffnung konnte nicht von der KI ermittelt werden.');
          console.error(e);
        } finally {
          setIsLoadingOpening(false);
        }
      } else {
        setError("Ungültiges PGN-Format.");
      }
    } catch (e) {
      setError("Fehler beim Laden der PGN-Datei.");
      console.error(e);
    }
  }, [loadPgn, setFileName]);

  const currentMove: Move | undefined = moves[currentIndex];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col p-4">
      <header className="mb-4">
        <h1 className="text-3xl font-bold text-center text-cyan-400 flex items-center justify-center gap-3">
          <ChessIcon />
          Schach PGN-Datenbank
        </h1>
        {fileName && <p className="text-center text-slate-400 mt-1">Aktuelle Datei: {fileName}</p>}
      </header>

      {error && (
        <div className="bg-red-800 border border-red-600 text-white px-4 py-3 rounded-lg relative mb-4 text-center" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Chessboard and Controls */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center bg-slate-800 rounded-lg p-4 shadow-2xl">
          <div className="w-full max-w-[calc(100vh-250px)] sm:max-w-none sm:w-[90%] md:w-[80%] lg:w-full aspect-square">
            <Chessboard
              position={fen}
              boardWidth={560} // This will be scaled down by the container
              arePiecesDraggable={false}
            />
          </div>
          <GameControls 
            currentIndex={currentIndex}
            movesLength={moves.length}
            goToMove={goToMove}
          />
        </div>

        {/* Info Panel */}
        <div className="lg:col-span-2 bg-slate-800 rounded-lg p-4 shadow-2xl flex flex-col gap-4 overflow-hidden">
          <FileControls onPgnLoad={handlePgnLoad} generatePgn={generatePgnWithComments} fileName={fileName} disabled={!pgn} />
          
          {!game ? (
            <div className="flex-grow flex flex-col items-center justify-center text-slate-400">
               <ChessIcon className="w-24 h-24 mb-4 text-slate-600" />
              <p className="text-lg">Bitte laden Sie eine PGN-Datei, um zu beginnen.</p>
              <p>Analysieren, kommentieren und speichern Sie Ihre Schachpartien.</p>
            </div>
          ) : (
            <>
              <OpeningDisplay opening={opening} isLoading={isLoadingOpening} />
              <div className="flex-grow flex flex-col bg-slate-900/50 rounded-lg overflow-hidden">
                <h3 className="text-lg font-semibold p-3 bg-slate-900/70">Partiezüge</h3>
                <MoveHistory moves={moves} currentIndex={currentIndex} onMoveSelect={goToMove} />
              </div>
              <CommentEditor
                move={currentMove}
                onSaveComment={updateCommentForCurrentMove}
                moveIndex={currentIndex}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
