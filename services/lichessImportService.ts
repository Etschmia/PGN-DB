
const LICHESS_API_BASE_URL = 'https://lichess.org/api/games/user/';
const LICHESS_MAX_GAMES = 2000;
const LICHESS_PERF_TYPES = 'blitz,rapid,classical,correspondence,standard';
const LICHESS_PARAMS = `tags=true&clocks=false&evals=false&opening=true&max=${LICHESS_MAX_GAMES}&perfType=${LICHESS_PERF_TYPES}`;

const CHESSCOM_API_BASE_URL = 'https://api.chess.com/pub/player/';

/**
 * Lädt PGN-Daten eines Lichess-Benutzers per Streaming herunter.
 * Zählt Partien inkrementell über den ReadableStream und meldet Fortschritt.
 */
export const fetchPgnFromLichess = async (
  username: string,
  onProgress?: (gameCount: number) => void,
): Promise<string> => {
  const url = `${LICHESS_API_BASE_URL}${encodeURIComponent(username)}?${LICHESS_PARAMS}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/x-chess-pgn',
    },
  });

  if (response.status === 404) {
    throw new Error(`Lichess-Benutzer "${username}" nicht gefunden.`);
  }

  if (!response.ok) {
    throw new Error(`Fehler beim Abruf von Lichess (Status ${response.status}).`);
  }

  // Streaming: Partien inkrementell lesen und zählen
  if (onProgress && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    let gameCount = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      chunks.push(text);

      // Jede Partie beginnt mit [Event "..."] — zähle Vorkommen im Chunk
      const matches = text.match(/\[Event\s/g);
      if (matches) {
        gameCount += matches.length;
        onProgress(gameCount);
      }
    }

    // Letzter Flush des Decoders
    const trailing = decoder.decode();
    if (trailing) chunks.push(trailing);

    const pgn = chunks.join('');

    if (!pgn.trim()) {
      throw new Error(`Keine Partien für Lichess-Benutzer "${username}" gefunden.`);
    }

    return pgn;
  }

  // Fallback ohne Streaming
  const pgn = await response.text();

  if (!pgn.trim()) {
    throw new Error(`Keine Partien für Lichess-Benutzer "${username}" gefunden.`);
  }

  return pgn;
};

interface ChessComArchivesResponse {
  archives: string[];
}

/**
 * Lädt PGN-Daten eines Chess.com-Benutzers herunter.
 * Holt zunächst die Archiv-Liste, dann alle Monats-PGNs parallel mit Fortschrittsmeldung.
 */
export const fetchPgnFromChessCom = async (
  username: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<string> => {
  const archivesUrl = `${CHESSCOM_API_BASE_URL}${encodeURIComponent(username)}/games/archives`;

  const archivesResponse = await fetch(archivesUrl);

  if (archivesResponse.status === 404) {
    throw new Error(`Chess.com-Benutzer "${username}" nicht gefunden.`);
  }

  if (!archivesResponse.ok) {
    throw new Error(`Fehler beim Abruf der Chess.com-Archive (Status ${archivesResponse.status}).`);
  }

  const archivesData: ChessComArchivesResponse = await archivesResponse.json();

  if (!archivesData.archives || archivesData.archives.length === 0) {
    throw new Error(`Keine Partien für Chess.com-Benutzer "${username}" gefunden.`);
  }

  const total = archivesData.archives.length;
  let loaded = 0;

  onProgress?.(0, total);

  // Alle Monats-PGNs parallel herunterladen, Fortschritt pro abgeschlossenem Monat
  const pgnPromises = archivesData.archives.map(async (archiveUrl) => {
    try {
      const response = await fetch(`${archiveUrl}/pgn`);
      if (!response.ok) return '';
      const text = await response.text();
      loaded++;
      onProgress?.(loaded, total);
      return text;
    } catch {
      loaded++;
      onProgress?.(loaded, total);
      console.warn(`[lichessImportService] Fehler beim Abruf von ${archiveUrl}`);
      return '';
    }
  });

  const pgnParts = await Promise.all(pgnPromises);
  const pgn = pgnParts.filter(p => p.trim()).join('\n\n');

  if (!pgn.trim()) {
    throw new Error(`Keine Partien für Chess.com-Benutzer "${username}" gefunden.`);
  }

  return pgn;
};
