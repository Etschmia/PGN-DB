import React, { useRef } from 'react';
import type { GameRecord } from '../types';

interface DatabaseListProps {
  games: GameRecord[];
  selectedGameId: number | null;
  onSelectGame: (id: number) => void;
  /** Bei Doppelklick auf eine Partie (z. B. Mobile): Partie wählen und Brett-Ansicht anzeigen */
  onSelectAndShowBoard?: (id: number) => void;
  onDeleteGame: (id: number) => void;
}

const DatabaseList: React.FC<DatabaseListProps> = ({
  games,
  selectedGameId,
  onSelectGame,
  onSelectAndShowBoard,
  onDeleteGame,
}) => {
  const pendingTap = useRef<{ id: number; timeout: ReturnType<typeof setTimeout> } | null>(null);

  const handleRowClick = (gameId: number) => {
    if (onSelectAndShowBoard && pendingTap.current?.id === gameId && pendingTap.current?.timeout) {
      clearTimeout(pendingTap.current.timeout);
      pendingTap.current = null;
      onSelectAndShowBoard(gameId);
      return;
    }
    if (pendingTap.current?.timeout) clearTimeout(pendingTap.current.timeout);
    pendingTap.current = {
      id: gameId,
      timeout: setTimeout(() => {
        onSelectGame(gameId);
        pendingTap.current = null;
      }, 300),
    };
  };
  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-lg font-semibold">Keine Partien in der Datenbank</p>
        <p className="text-sm mt-2">Importieren Sie eine PGN-Datei, um zu beginnen</p>
      </div>
    );
  }

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm('Möchten Sie diese Partie wirklich löschen?')) {
      onDeleteGame(id);
    }
  };

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm">
        <thead className="bg-surface-600 sticky top-0 z-10">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-accent">Datum</th>
            <th className="px-3 py-2 text-left font-semibold text-accent">Weiß</th>
            <th className="px-3 py-2 text-left font-semibold text-accent">Schwarz</th>
            <th className="px-3 py-2 text-center font-semibold text-accent">Ergebnis</th>
            <th className="px-3 py-2 text-left font-semibold text-accent">Eröffnung</th>
            <th className="px-3 py-2 text-center font-semibold text-accent">Züge</th>
            <th className="px-3 py-2 text-center font-semibold text-accent">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr
              key={game.id}
              onClick={() => game.id && handleRowClick(game.id)}
              className={`
                cursor-pointer hover:bg-surface-600 transition-colors border-b border-surface-500
                ${selectedGameId === game.id ? 'bg-accent/10' : ''}
              `}
            >
              <td className="px-3 py-2 whitespace-nowrap">{game.date}</td>
              <td className="px-3 py-2 truncate max-w-[120px]" title={game.white}>
                {game.white}
                {game.whiteElo && <span className="text-gray-500 text-xs ml-1">({game.whiteElo})</span>}
              </td>
              <td className="px-3 py-2 truncate max-w-[120px]" title={game.black}>
                {game.black}
                {game.blackElo && <span className="text-gray-500 text-xs ml-1">({game.blackElo})</span>}
              </td>
              <td className="px-3 py-2 text-center font-semibold">
                <span className={`
                  ${game.result === '1-0' ? 'text-green-400' : ''}
                  ${game.result === '0-1' ? 'text-red-400' : ''}
                  ${game.result === '1/2-1/2' ? 'text-yellow-400' : ''}
                `}>
                  {game.result}
                </span>
              </td>
              <td className="px-3 py-2 truncate max-w-[200px]" title={game.opening}>
                <span className="text-xs text-gray-500">{game.eco}</span>
                {game.opening && <span className="ml-2">{game.opening}</span>}
              </td>
              <td className="px-3 py-2 text-center text-gray-500">{game.moveCount}</td>
              <td className="px-3 py-2 text-center">
                <button
                  onClick={(e) => game.id && handleDelete(e, game.id)}
                  className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-surface-500 transition-colors"
                  title="Partie löschen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DatabaseList;
