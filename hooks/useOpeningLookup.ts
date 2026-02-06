import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameRecord } from '../types';
import {
  loadTree,
  loadEcoDatabase,
  lookupOpening,
  lookupOpeningForGame,
  saveName as saveNameService,
  isSchachmentorAvailable,
  extractMovesFromPgn,
  type LookupResult,
} from '../services/openingLookupService';
import * as db from '../services/storageService';

export interface UseOpeningLookupReturn {
  /** Aktueller Eröffnungsname für angezeigte Position */
  currentOpening: LookupResult | null;
  /** Schachmentor erreichbar? */
  isTreeAvailable: boolean;
  /** Initiales Laden des Baums */
  isLoading: boolean;
  /** Lookup für aktuelle Zugposition triggern */
  lookupForPosition(moveHistory: string[], moveIndex: number, pgnHeader?: { opening: string; eco: string }): void;
  /** Eröffnungsname in Schachmentor speichern */
  saveOpeningName(moves: string[], name: string): Promise<boolean>;
  /** Batch-Lookup für alle Partien in IndexedDB (Hintergrund). onComplete wird nach Abschluss aufgerufen. */
  enrichGames(onComplete?: () => void): void;
}

export function useOpeningLookup(): UseOpeningLookupReturn {
  const [currentOpening, setCurrentOpening] = useState<LookupResult | null>(null);
  const [isTreeAvailable, setIsTreeAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastLookupRef = useRef<string>('');

  // Baum und ECO-DB beim App-Start laden
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([loadTree(), loadEcoDatabase()]);
      if (!cancelled) {
        setIsTreeAvailable(isSchachmentorAvailable());
        setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Lookup für aktuelle Zugposition
  const lookupForPosition = useCallback((
    moveHistory: string[],
    moveIndex: number,
    pgnHeader?: { opening: string; eco: string },
  ) => {
    // Deduplizierung: nicht erneut suchen wenn gleiche Position
    const key = `${moveHistory.slice(0, moveIndex + 1).join(',')}`;
    if (key === lastLookupRef.current) return;
    lastLookupRef.current = key;

    const result = lookupOpening(moveHistory, moveIndex, pgnHeader);
    setCurrentOpening(result);
  }, []);

  // Eröffnungsname in Schachmentor speichern
  const saveOpeningName = useCallback(async (
    moves: string[],
    name: string,
  ): Promise<boolean> => {
    const updatedTree = await saveNameService(moves, name);
    if (updatedTree) {
      setIsTreeAvailable(true);
      // Re-Lookup mit neuem Baum für die aktuelle Position
      // (wird beim nächsten lookupForPosition automatisch aktualisiert)
      lastLookupRef.current = ''; // Cache invalidieren
      return true;
    }
    return false;
  }, []);

  // Batch-Lookup für alle Partien in IndexedDB (asynchron im Hintergrund)
  const enrichGames = useCallback((onComplete?: () => void) => {
    (async () => {
      // Partien direkt aus IndexedDB laden (nicht aus React-State, der veraltet sein kann)
      let allGames: GameRecord[];
      try {
        allGames = await db.getAllGames();
      } catch (e) {
        console.error('[useOpeningLookup] Fehler beim Laden der Partien:', e);
        return;
      }

      console.log(`[useOpeningLookup] Starte Batch-Enrichment für ${allGames.length} Partien`);
      let updated = 0;

      const CHUNK_SIZE = 50;
      let idx = 0;

      const processChunk = async () => {
        const chunk = allGames.slice(idx, idx + CHUNK_SIZE);
        if (chunk.length === 0) {
          console.log(`[useOpeningLookup] Batch-Enrichment abgeschlossen: ${updated} Partien aktualisiert`);
          if (updated > 0 && onComplete) onComplete();
          return;
        }

        for (const game of chunk) {
          if (!game.id) continue;

          const moveHistory = extractMovesFromPgn(game.pgn);
          const pgnHeader = { opening: game.opening, eco: game.eco };
          const result = lookupOpeningForGame(moveHistory, pgnHeader);

          if (result && result.source !== 'pgn-header') {
            const needsUpdate =
              result.name !== game.opening || result.eco !== game.eco;

            if (needsUpdate) {
              try {
                await db.updateGame({
                  ...game,
                  opening: result.name,
                  eco: result.eco,
                  updatedAt: Date.now(),
                });
                updated++;
              } catch (e) {
                console.error(`[useOpeningLookup] Fehler beim Update Partie ${game.id}:`, e);
              }
            }
          }
        }

        idx += CHUNK_SIZE;
        console.log(`[useOpeningLookup] Enrichment: ${Math.min(idx, allGames.length)}/${allGames.length}`);

        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => processChunk());
        } else {
          setTimeout(processChunk, 0);
        }
      };

      processChunk();
    })();
  }, []);

  return {
    currentOpening,
    isTreeAvailable,
    isLoading,
    lookupForPosition,
    saveOpeningName,
    enrichGames,
  };
}
