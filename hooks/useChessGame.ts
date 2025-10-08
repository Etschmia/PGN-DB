import { useState, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import type { Move, GameHeaders } from '../types';

// Per user request, define placeholders to temporarily replace braces within comments.
const OPEN_BRACE_PLACEHOLDER = 'öffnendeGeschweifteKlammer';
const CLOSE_BRACE_PLACEHOLDER = 'schließendeGeschweifteKlammer';

export const useChessGame = () => {
  const [game, setGame] = useState<Chess | null>(null);
  const [pgn, setPgn] = useState<string>('');
  const [fileName, setFileName] = useState<string>('partie.pgn');
  const [moves, setMoves] = useState<Move[]>([]);
  const [headers, setHeaders] = useState<GameHeaders>({});
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  const fen = useMemo(() => {
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
    return tempGame.fen();
  }, [currentIndex, moves, headers]);

  const loadPgn = useCallback((pgnString: string): boolean => {
    try {
      const newGame = new Chess();

      // --- START: Definitive PGN Parsing Logic ---

      // Normalize line endings for consistent processing.
      const pgnStringNormalized = pgnString.replace(/\r\n|\r/g, '\n');
      const lines = pgnStringNormalized.split('\n');
      
      // Step 1: Reliably separate headers from the movetext.
      // This is crucial to avoid corrupting string values within header tags.
      const headerLines: string[] = [];
      const movetextLines: string[] = [];
      let inHeaders = true;

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (inHeaders) {
          // PGN spec dictates headers come first. Any non-header line marks the start of the movetext.
          if (trimmedLine.startsWith('[') && trimmedLine.endsWith('"]')) {
            headerLines.push(line);
          } else {
            inHeaders = false;
            movetextLines.push(line);
          }
        } else {
          movetextLines.push(line);
        }
      }

      const headerSection = headerLines.join('\n');
      const movetextSection = movetextLines.join('\n');
      
      // The cleaning pipeline is now applied *only* to the movetext section.
      let processedMovetext = movetextSection;

      // Step 2: Convert all comment types (semicolon) to the standard brace format.
      processedMovetext = processedMovetext.split('\n').map(line => {
        const semiColonIndex = line.indexOf(';');
        if (semiColonIndex !== -1) {
          const contentBefore = line.substring(0, semiColonIndex);
          const commentText = line.substring(semiColonIndex + 1).trim();
          return commentText ? `${contentBefore} {${commentText}}` : contentBefore.trim();
        }
        return line;
      }).join('\n');
      
      // Step 3 (User's Strategy): Protect braces that are *inside* comments with placeholders.
      processedMovetext = processedMovetext.replace(/{([\s\S]*?)}/g, (_match, commentContent) => {
        const sanitizedContent = commentContent
          .replace(/{/g, OPEN_BRACE_PLACEHOLDER)
          .replace(/}/g, CLOSE_BRACE_PLACEHOLDER);
        return `{${sanitizedContent}}`;
      });

      // Step 4: Structurally isolate the comment blocks by ensuring they are space-delimited.
      processedMovetext = processedMovetext.replace(/{/g, ' { ').replace(/}/g, ' } ');
      
      // Step 5: Final cleanup of movetext.
      processedMovetext = processedMovetext.replace(/ +/g, ' ');
      processedMovetext = processedMovetext.replace(/{ }/g, '');

      // Step 6: Recombine the pristine headers with the cleaned movetext.
      const finalPgn = `${headerSection}\n\n${processedMovetext.trim()}`;
      
      // Attempt to load the fully sanitized PGN string.
      newGame.loadPgn(finalPgn, { sloppy: true });

      // --- END: Definitive PGN Parsing Logic ---

      const parsedHeaders = newGame.header();
      
      // Step 7: Restore the placeholders back to braces for internal use (e.g., in the editor).
      const comments = newGame.getComments();
      const commentsMap = new Map<string, string>(comments.map(c => {
        const restoredComment = c.comment
          .replace(new RegExp(OPEN_BRACE_PLACEHOLDER, 'g'), '{')
          .replace(new RegExp(CLOSE_BRACE_PLACEHOLDER, 'g'), '}');
        return [c.fen, restoredComment];
      }));

      const gameMoves = newGame.history({ verbose: true }).map(move => ({
        ...move,
        comment: commentsMap.get(move.after) || '',
      }));

      setGame(newGame);
      setPgn(pgnString);
      setHeaders(parsedHeaders);
      setMoves(gameMoves);
      setCurrentIndex(-1);
      return true;
    } catch (e) {
      console.error("Ungültiges PGN:", e);
      setGame(null);
      setPgn('');
      setMoves([]);
      setHeaders({});
      setCurrentIndex(-1);
      return false;
    }
  }, []);

  const goToMove = useCallback((index: number) => {
    if (index >= -1 && index < moves.length) {
      setCurrentIndex(index);
    }
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