import { useState, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import type { Move, GameHeaders, GameRecord } from '../types';

export const useChessGame = () => {
  const [game, setGame] = useState<Chess | null>(null);
  const [pgn, setPgn] = useState<string>('');
  const [fileName, setFileName] = useState<string>('partie.pgn');
  const [moves, setMoves] = useState<Move[]>([]);
  const [headers, setHeaders] = useState<GameHeaders>({});
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  const fen = useMemo(() => {
    console.log('[useChessGame] fen useMemo wird berechnet! currentIndex:', currentIndex, 'moves.length:', moves.length);
    const tempGame = new Chess();
    if (headers.FEN && typeof headers.FEN === 'string') {
        try {
            tempGame.load(headers.FEN);
        } catch {
            console.warn("Ungültige FEN im PGN-Header, verwende Standard-Startposition.");
        }
    }
    
    for (let i = 0; i <= currentIndex; i++) {
        if(moves[i]) {
            tempGame.move({ from: moves[i].from, to: moves[i].to, promotion: moves[i].promotion });
        }
    }
    
    const resultFen = tempGame.fen();
    console.log('[useChessGame] Berechnete FEN:', resultFen);
    return resultFen;
  }, [currentIndex, moves, headers]);

  const loadPgn = useCallback((pgnString: string): boolean => {
    console.log('[useChessGame] loadPgn gestartet');
    console.log('[useChessGame] Input-PGN Länge:', pgnString?.length);
    
    try {
      const newGame = new Chess();

      // --- START: Enhanced PGN Parsing Logic ---

      // Normalize line endings for consistent processing.
      console.log('[useChessGame] Schritt 1: Normalisiere Zeilenumbrüche...');
      const pgnStringNormalized = pgnString.replace(/\r\n|\r/g, '\n');
      const lines = pgnStringNormalized.split('\n');
      console.log('[useChessGame] Anzahl Zeilen:', lines.length);
      
      // Step 1: Extract only the FIRST game from multi-game PGN files.
      // This is crucial because chess.js can only load one game at a time.
      const headerLines: string[] = [];
      const movetextLines: string[] = [];
      let inHeaders = true;
      let foundFirstGame = false;

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // If we've already found a complete game, stop processing
        if (foundFirstGame) {
          break;
        }
        
        if (inHeaders) {
          // PGN spec dictates headers come first. Any non-header line marks the start of the movetext.
          if (trimmedLine.startsWith('[') && trimmedLine.endsWith('"]')) {
            headerLines.push(line);
          } else {
            inHeaders = false;
            movetextLines.push(line);
          }
        } else {
          // We're in the movetext section
          // Check if this is the start of a NEW game (new headers after movetext)
          if (trimmedLine.startsWith('[') && trimmedLine.endsWith('"]')) {
            // Found the start of the next game - stop here
            console.log('[useChessGame] Multi-Game PGN erkannt! Lade nur erste Partie.');
            foundFirstGame = true;
            break;
          }
          movetextLines.push(line);
        }
      }

      const headerSection = headerLines.join('\n');
      const movetextSection = movetextLines.join('\n');
      
      console.log('[useChessGame] Headers gefunden:', headerLines.length);
      console.log('[useChessGame] Movetext-Zeilen:', movetextLines.length);
      console.log('[useChessGame] Header-Section:', headerSection.substring(0, 200));
      console.log('[useChessGame] Movetext-Section (erste 200 Zeichen):', movetextSection.substring(0, 200));
      
      // The cleaning pipeline is now applied *only* to the movetext section.
      let processedMovetext = movetextSection;

      // Step 2: Convert all comment types (semicolon) to the standard brace format.
      console.log('[useChessGame] Schritt 2: Konvertiere Semikolon-Kommentare...');
      processedMovetext = processedMovetext.split('\n').map(line => {
        const semiColonIndex = line.indexOf(';');
        if (semiColonIndex !== -1) {
          const contentBefore = line.substring(0, semiColonIndex);
          const commentText = line.substring(semiColonIndex + 1).trim();
          return commentText ? `${contentBefore} {${commentText}}` : contentBefore.trim();
        }
        return line;
      }).join('\n');
      
      // Step 3: Extract all comments temporarily to preserve their content.
      console.log('[useChessGame] Schritt 3: Extrahiere Kommentare...');
      const commentStore: string[] = [];
      const COMMENT_MARKER = '___COMMENT_PLACEHOLDER___';
      
      // Extract comments (handle nested braces by using a more sophisticated approach)
      let depth = 0;
      let currentComment = '';
      let result = '';
      
      for (let i = 0; i < processedMovetext.length; i++) {
        const char = processedMovetext[i];
        
        if (char === '{') {
          if (depth === 0) {
            // Start of a new comment
            currentComment = '';
          } else {
            // Nested brace inside comment - preserve it
            currentComment += char;
          }
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0) {
            // End of comment - store it
            commentStore.push(currentComment);
            result += ` ${COMMENT_MARKER}_${commentStore.length - 1}_ `;
          } else if (depth > 0) {
            // Nested closing brace
            currentComment += char;
          }
        } else {
          if (depth > 0) {
            currentComment += char;
          } else {
            result += char;
          }
        }
      }
      
      processedMovetext = result;
      console.log('[useChessGame] Kommentare extrahiert:', commentStore.length);
      console.log('[useChessGame] Movetext ohne Kommentare (erste 200 Zeichen):', processedMovetext.substring(0, 200));
      
      // Step 4: Clean up the movetext (without comments).
      console.log('[useChessGame] Schritt 4: Bereinige Movetext...');
      processedMovetext = processedMovetext.replace(/ +/g, ' ').trim();
      
      // Step 5: Restore comments with proper spacing.
      console.log('[useChessGame] Schritt 5: Stelle Kommentare wieder her...');
      commentStore.forEach((comment, index) => {
        // Clean up special PGN tags like [%clk], [%eval], etc. that chess.js doesn't support
        let cleanedComment = comment.trim();
        
        // Remove all [%...] tags (e.g., [%clk 0:10:00], [%eval 0.5])
        cleanedComment = cleanedComment.replace(/\[%[^\]]*\]/g, '').trim();
        
        // Only restore the comment if there's still content after cleaning
        if (cleanedComment) {
          processedMovetext = processedMovetext.replace(
            `${COMMENT_MARKER}_${index}_`,
            `{ ${cleanedComment} }`
          );
        } else {
          // If the comment is now empty, just remove the placeholder
          processedMovetext = processedMovetext.replace(
            new RegExp(`\\s*${COMMENT_MARKER}_${index}_\\s*`, 'g'),
            ' '
          );
        }
      });
      
      // Step 6: Final cleanup.
      console.log('[useChessGame] Schritt 6: Finale Bereinigung...');
      processedMovetext = processedMovetext.replace(/ +/g, ' ');
      processedMovetext = processedMovetext.replace(/{ }/g, '');

      // Step 7: Recombine the pristine headers with the cleaned movetext.
      console.log('[useChessGame] Schritt 7: Kombiniere Headers und Movetext...');
      const finalPgn = `${headerSection}\n\n${processedMovetext.trim()}`;
      console.log('[useChessGame] Finale PGN (erste 500 Zeichen):', finalPgn.substring(0, 500));
      console.log('[useChessGame] Finale PGN (letzte 200 Zeichen):', finalPgn.substring(Math.max(0, finalPgn.length - 200)));
      
      // Attempt to load the fully sanitized PGN string.
      console.log('[useChessGame] Versuche PGN in chess.js zu laden...');
      newGame.loadPgn(finalPgn, { sloppy: true });
      console.log('[useChessGame] ✓ PGN erfolgreich in chess.js geladen!');

      // --- END: Enhanced PGN Parsing Logic ---

      const parsedHeaders = newGame.header();
      console.log('[useChessGame] Geparste Headers:', parsedHeaders);
      
      // Step 8: Extract comments from the parsed game.
      const comments = newGame.getComments();
      console.log('[useChessGame] Extrahierte Kommentare:', comments.length);
      const commentsMap = new Map<string, string>(comments.map(c => [c.fen, c.comment]));

      const gameMoves = newGame.history({ verbose: true }).map(move => ({
        ...move,
        comment: commentsMap.get(move.after) || '',
      }));
      console.log('[useChessGame] Anzahl Züge:', gameMoves.length);

      setGame(newGame);
      setPgn(pgnString);
      setHeaders(parsedHeaders);
      setMoves(gameMoves);
      setCurrentIndex(-1);
      console.log('[useChessGame] ✓ State erfolgreich aktualisiert!');
      console.log('[useChessGame] ✓ loadPgn return true');
      return true;
    } catch (e) {
      console.error('[useChessGame] ✗ FEHLER beim Parsen des PGN:', e);
      console.error('[useChessGame] Fehler-Details:', {
        name: (e as Error).name,
        message: (e as Error).message,
        stack: (e as Error).stack
      });
      setGame(null);
      setPgn('');
      setMoves([]);
      setHeaders({});
      setCurrentIndex(-1);
      console.log('[useChessGame] ✗ loadPgn return false');
      return false;
    }
  }, []);

  const goToMove = useCallback((index: number) => {
    console.log('[useChessGame] goToMove aufgerufen! Index:', index, 'moves.length:', moves.length);
    setCurrentIndex(prevIndex => {
      if (index >= -1 && index < moves.length) {
        console.log('[useChessGame] Setze Index von', prevIndex, 'auf', index);
        return index;
      } else {
        console.warn('[useChessGame] Ungültiger Index:', index, 'muss zwischen -1 und', moves.length - 1, 'liegen');
        return prevIndex;
      }
    });
  }, [moves.length]);

  const updateCommentForCurrentMove = useCallback((comment: string) => {
    if (currentIndex > -1) {
      setMoves(prevMoves => {
        const newMoves = [...prevMoves];
        newMoves[currentIndex] = { ...newMoves[currentIndex], comment };
        return newMoves;
      });
    }
  }, [currentIndex]);

  const generatePgnWithComments = useCallback((): string => {
    if (!game) return '';

    const tempGame = new Chess();
    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined) {
        tempGame.header(key, String(value));
      }
    });

    moves.forEach(move => {
      tempGame.move({ from: move.from, to: move.to, promotion: move.promotion });
      if (move.comment) {
        const cleanComment = move.comment.replace(/^{|}$/g, '').trim();
        if (cleanComment) {
          tempGame.setComment(cleanComment);
        }
      } else {
        // Ensure no stray comments from previous moves are carried over
        tempGame.setComment('');
      }
    });
    
    // chess.js correctly handles creating the final PGN with standard { } braces.
    return tempGame.pgn({ maxWidth: 0, newline: '\n' });
  }, [game, headers, moves]);


  return {
    game,
    fen,
    pgn,
    fileName,
    moves,
    headers,
    currentIndex,
    loadPgn,
    goToMove,
    updateCommentForCurrentMove,
    generatePgnWithComments,
    setFileName,
  };
};

// Helper function to extract header value from a header line
const extractHeaderValue = (line: string, key: string): string => {
  const match = line.match(new RegExp(`\\[${key}\\s+"([^"]*)"\\]`));
  return match ? match[1] : '';
};

// Helper function to create a GameRecord from headers and movetext
const createGameRecord = (headerLines: string[], movetextLines: string[]): GameRecord => {
  const headerSection = headerLines.join('\n');
  const movetextSection = movetextLines.join('\n').trim();
  const completePgn = `${headerSection}\n\n${movetextSection}`;

  // Count moves (simple approximation)
  const moveMatches = movetextSection.match(/\d+\./g);
  const moveCount = moveMatches ? moveMatches.length : 0;

  return {
    event: extractHeaderValue(headerSection, 'Event') || 'Unknown',
    site: extractHeaderValue(headerSection, 'Site') || 'Unknown',
    date: extractHeaderValue(headerSection, 'Date') || '????.??.??',
    white: extractHeaderValue(headerSection, 'White') || 'Unknown',
    black: extractHeaderValue(headerSection, 'Black') || 'Unknown',
    result: extractHeaderValue(headerSection, 'Result') || '*',
    eco: extractHeaderValue(headerSection, 'ECO') || '',
    opening: extractHeaderValue(headerSection, 'Opening') || '',
    whiteElo: extractHeaderValue(headerSection, 'WhiteElo') || undefined,
    blackElo: extractHeaderValue(headerSection, 'BlackElo') || undefined,
    pgn: completePgn,
    tags: [],
    notes: '',
    moveCount,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

// Parse a multi-game PGN string into an array of GameRecords
export const parseMultiGamePgn = (content: string): GameRecord[] => {
  console.log('[parseMultiGamePgn] Starte Parsing...');
  const games: GameRecord[] = [];
  const lines = content.replace(/\r\n|\r/g, '\n').split('\n');
  
  let currentHeaders: string[] = [];
  let currentMovetext: string[] = [];
  let inHeaders = true;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if this is a header line
    if (trimmed.startsWith('[') && trimmed.endsWith('"]')) {
      if (!inHeaders && currentHeaders.length > 0) {
        // We were in movetext, and now we found a new header = new game starts
        games.push(createGameRecord(currentHeaders, currentMovetext));
        console.log(`[parseMultiGamePgn] Partie ${games.length} extrahiert`);
        currentHeaders = [line];
        currentMovetext = [];
        inHeaders = true;
      } else {
        // Still collecting headers for current game
        currentHeaders.push(line);
      }
    } else {
      // Not a header line
      if (trimmed) {
        inHeaders = false;
        currentMovetext.push(line);
      }
    }
  }
  
  // Don't forget the last game
  if (currentHeaders.length > 0) {
    games.push(createGameRecord(currentHeaders, currentMovetext));
    console.log(`[parseMultiGamePgn] Partie ${games.length} extrahiert (letzte Partie)`);
  }
  
  console.log(`[parseMultiGamePgn] Gesamt ${games.length} Partien gefunden`);
  return games;
};