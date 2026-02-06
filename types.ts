
import type { Move as ChessJSMove } from 'chess.js';

export interface Move extends ChessJSMove {
  comment: string;
}

export interface GameHeaders {
  [key: string]: string | undefined;
}

export interface GameRecord {
  id?: number;
  event: string;
  site: string;
  date: string;
  white: string;
  black: string;
  result: string;
  eco: string;
  opening: string;
  whiteElo?: string;
  blackElo?: string;
  pgn: string; // Komplette PGN dieser Partie
  tags: string[]; // Benutzerdefinierte Tags
  notes: string; // Allgemeine Notizen zur Partie
  moveCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface DatabaseState {
  games: GameRecord[];
  selectedGameId: number | null;
  filters: GameFilters;
}

export interface GameFilters {
  searchText: string; // Suche in Spielernamen
  opening: string;
  dateFrom: string;
  dateTo: string;
  result: string;
  tags: string[];
}

export interface AuthUser {
  id: number;
  email: string;
  createdAt?: string;
}

export interface StorageInfo {
  usedBytes: number;
  maxBytes: number;
  percentage: number;
}