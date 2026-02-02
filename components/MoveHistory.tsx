
import React, { useEffect, useRef } from 'react';
import type { Move } from '../types';

interface MoveHistoryProps {
  moves: Move[];
  currentIndex: number;
  onMoveSelect: (index: number) => void;
}

const MoveHistory: React.FC<MoveHistoryProps> = ({ moves, currentIndex, onMoveSelect }) => {
    const currentMoveRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (currentMoveRef.current && containerRef.current) {
            const container = containerRef.current;
            const element = currentMoveRef.current;
            const elementTop = element.offsetTop;
            const elementHeight = element.offsetHeight;
            const containerTop = container.scrollTop;
            const containerHeight = container.offsetHeight;

            if (elementTop < containerTop || (elementTop + elementHeight) > (containerTop + containerHeight)) {
                container.scrollTo({
                    top: elementTop - (containerHeight / 2) + (elementHeight / 2),
                    behavior: 'smooth',
                });
            }
        }
    }, [currentIndex]);


  return (
    <div ref={containerRef} className="flex-grow p-3 overflow-y-auto bg-surface-700/50">
      <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-1 text-sm">
        {moves.map((move, index) => {
          const isWhiteMove = move.color === 'w';
          const moveNumber = Math.floor(index / 2) + 1;
          const isActive = index === currentIndex;

          return (
            <React.Fragment key={index}>
              {isWhiteMove && (
                <div
                    className="text-gray-600 text-right pr-2 select-none"
                    onClick={() => onMoveSelect(index)}
                >
                    {moveNumber}.
                </div>
              )}
              <div
                ref={isActive ? currentMoveRef : null}
                onClick={() => onMoveSelect(index)}
                className={`px-2 py-1 rounded cursor-pointer ${
                  isActive ? 'bg-accent text-surface-900 font-bold' : 'hover:bg-surface-600'
                } ${!isWhiteMove ? 'col-start-3' : 'col-start-2'}`}
              >
                {move.san}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default MoveHistory;
