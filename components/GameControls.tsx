
import React from 'react';
import { FirstIcon, PrevIcon, NextIcon, LastIcon } from './Icons';

interface GameControlsProps {
  currentIndex: number;
  movesLength: number;
  goToMove: (index: number) => void;
}

const ControlButton: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode; ariaLabel: string }> = ({ onClick, disabled, children, ariaLabel }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="bg-slate-700 hover:bg-cyan-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-200 rounded-md p-3 transition-colors duration-200"
    >
      {children}
    </button>
  );

const GameControls: React.FC<GameControlsProps> = ({ currentIndex, movesLength, goToMove }) => {
  const isAtStart = currentIndex <= -1;
  const isAtEnd = currentIndex >= movesLength - 1;

  return (
    <div className="flex justify-center items-center gap-2 mt-4 w-full max-w-sm">
      <ControlButton onClick={() => goToMove(-1)} disabled={isAtStart} ariaLabel="Zum ersten Zug">
        <FirstIcon />
      </ControlButton>
      <ControlButton onClick={() => goToMove(currentIndex - 1)} disabled={isAtStart} ariaLabel="Vorheriger Zug">
        <PrevIcon />
      </ControlButton>
      <ControlButton onClick={() => goToMove(currentIndex + 1)} disabled={isAtEnd} ariaLabel="Nächster Zug">
        <NextIcon />
      </ControlButton>
      <ControlButton onClick={() => goToMove(movesLength - 1)} disabled={isAtEnd} ariaLabel="Zum letzten Zug">
        <LastIcon />
      </ControlButton>
    </div>
  );
};

export default GameControls;
