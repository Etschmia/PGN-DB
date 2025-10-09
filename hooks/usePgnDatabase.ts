import { useState, useCallback, useEffect } from 'react';
import type { GameRecord, GameFilters } from '../types';
import * as db from '../services/indexedDBService';
import { parseMultiGamePgn } from './useChessGame';

export const usePgnDatabase = () => {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [filters, setFilters] = useState<GameFilters>({
    searchText: '',
    opening: '',
    dateFrom: '',
    dateTo: '',
    result: '',
    tags: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load all games from IndexedDB on mount
  useEffect(() => {
    loadGamesFromDB();
  }, []);

  const loadGamesFromDB = useCallback(async () => {
    try {
      console.log('[usePgnDatabase] Lade Partien aus IndexedDB...');
      setIsLoading(true);
      const loadedGames = await db.getAllGames();
      setGames(loadedGames);
      console.log('[usePgnDatabase] Partien geladen:', loadedGames.length);
    } catch (error) {
      console.error('[usePgnDatabase] Fehler beim Laden der Partien:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Import PGN file (single or multi-game)
  const importPgnFile = useCallback(async (pgnContent: string): Promise<number> => {
    try {
      console.log('[usePgnDatabase] Importiere PGN-Datei...');
      setIsLoading(true);
      
      const parsedGames = parseMultiGamePgn(pgnContent);
      console.log('[usePgnDatabase] Geparste Partien:', parsedGames.length);
      
      if (parsedGames.length === 0) {
        throw new Error('Keine Partien in der Datei gefunden');
      }
      
      const ids = await db.importGames(parsedGames);
      console.log('[usePgnDatabase] Import erfolgreich, IDs:', ids);
      
      // Reload games from database
      await loadGamesFromDB();
      
      return parsedGames.length;
    } catch (error) {
      console.error('[usePgnDatabase] Fehler beim Import:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadGamesFromDB]);

  // Select a game by ID
  const selectGame = useCallback((id: number | null) => {
    console.log('[usePgnDatabase] Wähle Partie:', id);
    setSelectedGameId(id);
  }, []);

  // Get the currently selected game
  const getSelectedGame = useCallback((): GameRecord | null => {
    if (selectedGameId === null) return null;
    return games.find(g => g.id === selectedGameId) || null;
  }, [selectedGameId, games]);

  // Update the currently selected game
  const updateCurrentGame = useCallback(async (updatedGame: GameRecord): Promise<void> => {
    try {
      console.log('[usePgnDatabase] Aktualisiere Partie:', updatedGame.id);
      await db.updateGame(updatedGame);
      await loadGamesFromDB();
    } catch (error) {
      console.error('[usePgnDatabase] Fehler beim Aktualisieren:', error);
      throw error;
    }
  }, [loadGamesFromDB]);

  // Delete a game
  const deleteGame = useCallback(async (id: number): Promise<void> => {
    try {
      console.log('[usePgnDatabase] Lösche Partie:', id);
      await db.deleteGame(id);
      
      if (selectedGameId === id) {
        setSelectedGameId(null);
      }
      
      await loadGamesFromDB();
    } catch (error) {
      console.error('[usePgnDatabase] Fehler beim Löschen:', error);
      throw error;
    }
  }, [selectedGameId, loadGamesFromDB]);

  // Export a single game as PGN
  const exportGame = useCallback((game: GameRecord, filename?: string): void => {
    const blob = new Blob([game.pgn], { type: 'application/vnd.chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${game.white}_vs_${game.black}_${game.date}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('[usePgnDatabase] Partie exportiert:', filename);
  }, []);

  // Export all games as multi-game PGN
  const exportDatabase = useCallback((filename: string = 'database.pgn'): void => {
    const multiGamePgn = games.map(g => g.pgn).join('\n\n');
    const blob = new Blob([multiGamePgn], { type: 'application/vnd.chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('[usePgnDatabase] Datenbank exportiert:', games.length, 'Partien');
  }, [games]);

  // Clear entire database
  const clearDatabase = useCallback(async (): Promise<void> => {
    try {
      console.log('[usePgnDatabase] Lösche gesamte Datenbank...');
      await db.clearDatabase();
      setGames([]);
      setSelectedGameId(null);
      console.log('[usePgnDatabase] Datenbank geleert');
    } catch (error) {
      console.error('[usePgnDatabase] Fehler beim Leeren der Datenbank:', error);
      throw error;
    }
  }, []);

  // Filter and sort games
  const getFilteredGames = useCallback((): GameRecord[] => {
    let filtered = [...games];

    // Search text (player names)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(
        g => 
          g.white.toLowerCase().includes(searchLower) ||
          g.black.toLowerCase().includes(searchLower)
      );
    }

    // Opening filter
    if (filters.opening) {
      filtered = filtered.filter(g => g.opening === filters.opening);
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(g => g.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(g => g.date <= filters.dateTo);
    }

    // Result filter
    if (filters.result) {
      filtered = filtered.filter(g => g.result === filters.result);
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(g => 
        filters.tags.some(tag => g.tags.includes(tag))
      );
    }

    return filtered;
  }, [games, filters]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<GameFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters({
      searchText: '',
      opening: '',
      dateFrom: '',
      dateTo: '',
      result: '',
      tags: [],
    });
  }, []);

  // Get unique openings from all games
  const getUniqueOpenings = useCallback((): string[] => {
    const openings = games
      .map(g => g.opening)
      .filter(o => o && o !== '');
    return Array.from(new Set(openings)).sort();
  }, [games]);

  // Get unique tags from all games
  const getUniqueTags = useCallback((): string[] => {
    const allTags = games.flatMap(g => g.tags);
    return Array.from(new Set(allTags)).sort();
  }, [games]);

  return {
    games,
    filteredGames: getFilteredGames(),
    selectedGameId,
    selectedGame: getSelectedGame(),
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
    getUniqueTags,
  };
};



