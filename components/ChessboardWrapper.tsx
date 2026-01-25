import React, { useMemo } from 'react';
import { Chessboard } from 'react-chessboard';

interface ChessboardWrapperProps {
  fen: string;
}

export default function ChessboardWrapper({ fen }: ChessboardWrapperProps) {
  console.log('[ChessboardWrapper] Render mit FEN:', fen);

  const options = useMemo(() => ({
    position: fen,
    allowDragging: false,
    animationDurationInMs: 200,
    boardOrientation: 'white' as const,
  }), [fen]);

  return <Chessboard options={options} />;
}
