
import type { Move as ChessJSMove } from 'chess.js';

export interface Move extends ChessJSMove {
  comment: string;
}

export interface GameHeaders {
  [key: string]: string | undefined;
}
