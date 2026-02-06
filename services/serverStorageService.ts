import type { GameRecord, StorageInfo } from '../types';

const API_BASE = '/api/pgn';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Serverfehler');
  }

  return data as T;
}

// Hilfsfunktion: GameRecord-Felder für API vorbereiten
function gameToPayload(game: GameRecord) {
  return {
    event: game.event,
    site: game.site,
    date: game.date,
    white: game.white,
    black: game.black,
    result: game.result,
    eco: game.eco,
    opening: game.opening,
    whiteElo: game.whiteElo,
    blackElo: game.blackElo,
    pgn: game.pgn,
    tags: game.tags,
    notes: game.notes,
    moveCount: game.moveCount,
  };
}

export async function getAllGames(): Promise<GameRecord[]> {
  return request(`${API_BASE}/games`);
}

export async function saveGame(game: GameRecord): Promise<number> {
  const result = await request<GameRecord>(`${API_BASE}/games`, {
    method: 'POST',
    body: JSON.stringify(gameToPayload(game)),
  });
  return result.id!;
}

export async function updateGame(game: GameRecord): Promise<void> {
  if (!game.id) throw new Error('Partie-ID erforderlich für Update');
  await request(`${API_BASE}/games/${game.id}`, {
    method: 'PUT',
    body: JSON.stringify(gameToPayload(game)),
  });
}

export async function deleteGame(id: number): Promise<void> {
  await request(`${API_BASE}/games/${id}`, { method: 'DELETE' });
}

export async function importGames(games: GameRecord[]): Promise<number[]> {
  const result = await request<{ imported: number; ids: number[] }>(`${API_BASE}/games/import`, {
    method: 'POST',
    body: JSON.stringify({ games: games.map(gameToPayload) }),
  });
  return result.ids;
}

export async function clearDatabase(): Promise<void> {
  await request(`${API_BASE}/games`, { method: 'DELETE' });
}

export async function getStorageInfo(): Promise<StorageInfo> {
  return request(`${API_BASE}/user/storage`);
}
