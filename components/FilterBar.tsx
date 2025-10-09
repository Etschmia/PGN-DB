import React from 'react';
import type { GameFilters } from '../types';

interface FilterBarProps {
  filters: GameFilters;
  onUpdateFilters: (filters: Partial<GameFilters>) => void;
  onResetFilters: () => void;
  uniqueOpenings: string[];
  totalGames: number;
  filteredGames: number;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onUpdateFilters,
  onResetFilters,
  uniqueOpenings,
  totalGames,
  filteredGames,
}) => {
  return (
    <div className="bg-slate-800 p-4 rounded-lg space-y-3">
      {/* Statistics */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">
          {filteredGames} von {totalGames} Partien
        </span>
        {(filters.searchText || filters.opening || filters.dateFrom || filters.dateTo || filters.result) && (
          <button
            onClick={onResetFilters}
            className="text-cyan-400 hover:text-cyan-300 underline text-xs"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {/* Search by player name */}
      <div>
        <input
          type="text"
          placeholder="Spielername suchen..."
          value={filters.searchText}
          onChange={(e) => onUpdateFilters({ searchText: e.target.value })}
          className="w-full px-3 py-2 bg-slate-700 text-slate-200 rounded border border-slate-600 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      {/* Filters row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Opening filter */}
        <div>
          <select
            value={filters.opening}
            onChange={(e) => onUpdateFilters({ opening: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 text-slate-200 rounded border border-slate-600 focus:border-cyan-500 focus:outline-none text-sm"
          >
            <option value="">Alle Eröffnungen</option>
            {uniqueOpenings.map((opening) => (
              <option key={opening} value={opening}>
                {opening}
              </option>
            ))}
          </select>
        </div>

        {/* Result filter */}
        <div>
          <select
            value={filters.result}
            onChange={(e) => onUpdateFilters({ result: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 text-slate-200 rounded border border-slate-600 focus:border-cyan-500 focus:outline-none text-sm"
          >
            <option value="">Alle Ergebnisse</option>
            <option value="1-0">1-0 (Weiß gewinnt)</option>
            <option value="0-1">0-1 (Schwarz gewinnt)</option>
            <option value="1/2-1/2">1/2-1/2 (Remis)</option>
            <option value="*">* (Unbekannt)</option>
          </select>
        </div>

        {/* Date from */}
        <div>
          <input
            type="date"
            placeholder="Von Datum"
            value={filters.dateFrom}
            onChange={(e) => onUpdateFilters({ dateFrom: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 text-slate-200 rounded border border-slate-600 focus:border-cyan-500 focus:outline-none text-sm"
          />
        </div>

        {/* Date to */}
        <div>
          <input
            type="date"
            placeholder="Bis Datum"
            value={filters.dateTo}
            onChange={(e) => onUpdateFilters({ dateTo: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 text-slate-200 rounded border border-slate-600 focus:border-cyan-500 focus:outline-none text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default FilterBar;



