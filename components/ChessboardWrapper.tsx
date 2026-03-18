import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';

interface ChessboardWrapperProps {
  fen: string;
  initialSize?: number;
}

const MIN_SIZE = 160;
const MAX_SIZE = 900;
const DEFAULT_SIZE = 420;

export default function ChessboardWrapper({ fen, initialSize = DEFAULT_SIZE }: ChessboardWrapperProps) {
  console.log('[ChessboardWrapper] Render mit FEN:', fen);

  const [boardSize, setBoardSize] = useState(initialSize);
  const dragStartRef = useRef<{ x: number; y: number; size: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX, y: e.clientY, size: boardSize };
  }, [boardSize]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    // Beide Achsen mitteln damit diagonales Ziehen natürlich wirkt
    const delta = ((e.clientX - dragStartRef.current.x) + (e.clientY - dragStartRef.current.y)) / 2;
    setBoardSize(Math.round(Math.max(MIN_SIZE, Math.min(MAX_SIZE, dragStartRef.current.size + delta))));
  }, []);

  const handlePointerUp = useCallback(() => {
    dragStartRef.current = null;
  }, []);

  const options = useMemo(() => ({
    position: fen,
    allowDragging: false,
    animationDurationInMs: 200,
    boardOrientation: 'white' as const,
    boardWidth: boardSize,
    darkSquareStyle: { backgroundColor: '#B5784F' },
    lightSquareStyle: { backgroundColor: '#E8D5B5' },
  }), [fen, boardSize]);

  return (
    <div
      style={{ width: boardSize, height: boardSize }}
      className="relative flex-shrink-0"
    >
      <Chessboard options={options} />

      {/* Resize-Griff rechts unten */}
      <div
        className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-10 flex items-end justify-end p-0.5"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        title="Brett-Größe ändern"
      >
        {/* Drei diagonale Punkte als Grip-Indikator */}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="10" cy="10" r="1.5" fill="rgba(255,255,255,0.5)" />
          <circle cx="6"  cy="10" r="1.5" fill="rgba(255,255,255,0.5)" />
          <circle cx="10" cy="6"  r="1.5" fill="rgba(255,255,255,0.5)" />
        </svg>
      </div>
    </div>
  );
}
