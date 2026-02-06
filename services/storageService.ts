import type { GameRecord, StorageInfo } from '../types';
import * as indexedDB from './indexedDBService';
import * as server from './serverStorageService';

let useServer = false;

export function setStorageMode(isAuthenticated: boolean) {
  useServer = isAuthenticated;
  console.log('[storageService] Modus:', isAuthenticated ? 'Server' : 'IndexedDB');
}

export function getStorageMode(): boolean {
  return useServer;
}

export async function getAllGames(): Promise<GameRecord[]> {
  if (useServer) return server.getAllGames();
  return indexedDB.getAllGames();
}

export async function saveGame(game: GameRecord): Promise<number> {
  if (useServer) return server.saveGame(game);
  return indexedDB.saveGame(game);
}

export async function updateGame(game: GameRecord): Promise<void> {
  if (useServer) return server.updateGame(game);
  return indexedDB.updateGame(game);
}

export async function deleteGame(id: number): Promise<void> {
  if (useServer) return server.deleteGame(id);
  return indexedDB.deleteGame(id);
}

export async function importGames(games: GameRecord[]): Promise<number[]> {
  if (useServer) return server.importGames(games);
  return indexedDB.importGames(games);
}

export async function clearDatabase(): Promise<void> {
  if (useServer) return server.clearDatabase();
  return indexedDB.clearDatabase();
}

export async function getStorageInfo(): Promise<StorageInfo | null> {
  if (useServer) return server.getStorageInfo();
  return null; // IndexedDB hat kein Speicherlimit
}
