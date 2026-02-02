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
import * as db from '../services/indexedDBService';

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
  /** Batch-Lookup für importierte Partien (Hintergrund) */
  enrichGames(games: GameRecord[]): void;
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

  // Batch-Lookup für importierte Partien (asynchron im Hintergrund)
  const enrichGames = useCallback((games: GameRecord[]) => {
    // Kleine Chunks verarbeiten um UI nicht zu blockieren
    const CHUNK_SIZE = 50;
    let index = 0;

    const processChunk = async () => {
      const chunk = games.slice(index, index + CHUNK_SIZE);
      if (chunk.length === 0) {
        console.log('[useOpeningLookup] Batch-Enrichment abgeschlossen');
        return;
      }

      for (const game of chunk) {
        if (!game.id) continue;

        const moveHistory = extractMovesFromPgn(game.pgn);
        const pgnHeader = { opening: game.opening, eco: game.eco };
        const result = lookupOpeningForGame(moveHistory, pgnHeader);

        if (result && result.source !== 'pgn-header') {
          // Nur updaten wenn wir ein besseres Ergebnis als den PGN-Header haben
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
            } catch (e) {
              console.error(`[useOpeningLookup] Fehler beim Update Partie ${game.id}:`, e);
            }
          }
        }
      }

      index += CHUNK_SIZE;
      console.log(`[useOpeningLookup] Enrichment: ${Math.min(index, games.length)}/${games.length}`);

      // Nächsten Chunk mit requestIdleCallback oder setTimeout
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => processChunk());
      } else {
        setTimeout(processChunk, 0);
      }
    };

    console.log(`[useOpeningLookup] Starte Batch-Enrichment für ${games.length} Partien`);
    processChunk();
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
