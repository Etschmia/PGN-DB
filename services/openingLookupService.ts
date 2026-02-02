/**
 * Eröffnungserkennungs-Service
 *
 * Zweistufiger Lookup:
 *   1. Schachmentor-Eröffnungsbaum (mit Whitelist-Filter: nur Einträge mit Link)
 *   2. Statische ECO-Datenbank (lichess/chess-openings, ~3600 Einträge)
 *
 * Fallback: PGN-Header-Daten (Opening/ECO)
 */

// --- Types ---

export interface MoveNode {
  move: string;
  name: string | null;
  link: string | null;
  children: MoveNode[];
}

export interface EcoEntry {
  eco: string;
  name: string;
  moves: string[];
}

export interface LookupResult {
  name: string;
  eco: string;
  source: 'tree' | 'eco' | 'pgn-header';
}

// --- Configuration ---

const SCHACHMENTOR_BASE_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

// --- State ---

let cachedTree: MoveNode | null = null;
let schachmentorAvailable = false;
let ecoDatabase: EcoEntry[] | null = null;

// Pre-built index for fast ECO longest-prefix lookup.
// Key = moves joined by space, Value = { eco, name }
let ecoIndex: Map<string, { eco: string; name: string }> | null = null;

// --- Tree Loading ---

export async function loadTree(): Promise<MoveNode | null> {
  try {
    const res = await fetch(`${SCHACHMENTOR_BASE_URL}/api/moves/slim`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tree: MoveNode = await res.json();
    cachedTree = tree;
    schachmentorAvailable = true;
    console.log('[openingLookup] Schachmentor-Baum geladen');
    return tree;
  } catch (e) {
    console.warn('[openingLookup] Schachmentor nicht erreichbar:', (e as Error).message);
    cachedTree = null;
    schachmentorAvailable = false;
    return null;
  }
}

// --- ECO Database ---

export async function loadEcoDatabase(): Promise<void> {
  if (ecoDatabase) return;
  const module = await import('../data/eco-openings.json');
  ecoDatabase = (module.default ?? module) as EcoEntry[];
  console.log(`[openingLookup] ECO-DB geladen: ${ecoDatabase.length} Einträge`);
  buildEcoIndex();
}

function buildEcoIndex(): void {
  if (ecoIndex || !ecoDatabase) return;
  ecoIndex = new Map();
  // Die Daten sind bereits nach Zugfolge-Länge absteigend sortiert.
  // Bei Duplikaten (gleiche Zugfolge) gewinnt der erste Eintrag (längster/spezifischster).
  for (const entry of ecoDatabase) {
    const key = entry.moves.join(' ');
    if (!ecoIndex.has(key)) {
      ecoIndex.set(key, { eco: entry.eco, name: entry.name });
    }
  }
  console.log(`[openingLookup] ECO-Index erstellt: ${ecoIndex.size} eindeutige Zugfolgen`);
}

function getEcoIndex(): Map<string, { eco: string; name: string }> | null {
  return ecoIndex;
}

// --- Tree Traversal ---

/**
 * Traversiert den Schachmentor-Baum entlang der Zugfolge.
 * Whitelist-Filter: Nur Knoten mit Link gelten als benannt.
 * Gibt den tiefsten benannten Treffer zurück.
 */
function traverseTree(
  tree: MoveNode,
  moveHistory: string[],
  upToIndex?: number,
): { name: string; depth: number } | null {
  const limit = upToIndex !== undefined ? upToIndex + 1 : moveHistory.length;
  let current = tree;
  let lastNamed: { name: string; depth: number } | null = null;

  for (let i = 0; i < limit; i++) {
    const child = current.children?.find(c => c.move === moveHistory[i]);
    if (!child) break;

    current = child;
    // Whitelist: nur Knoten mit Link gelten als gesichert
    if (child.name && child.link) {
      lastNamed = { name: child.name, depth: i + 1 };
    }
  }

  return lastNamed;
}

// --- ECO Lookup ---

/**
 * Sucht den längsten passenden Prefix in der ECO-Datenbank.
 */
function lookupEco(
  moveHistory: string[],
  upToIndex?: number,
): { eco: string; name: string; depth: number } | null {
  const limit = upToIndex !== undefined ? upToIndex + 1 : moveHistory.length;
  const index = getEcoIndex();
  if (!index) return null;

  // Vom längsten Prefix zum kürzesten suchen
  for (let len = limit; len >= 1; len--) {
    const key = moveHistory.slice(0, len).join(' ');
    const match = index.get(key);
    if (match) {
      return { eco: match.eco, name: match.name, depth: len };
    }
  }

  return null;
}

// --- Public API ---

/**
 * Eröffnungs-Lookup für eine bestimmte Zugposition.
 * Priorität: Schachmentor-Baum → ECO-DB → PGN-Header
 */
export function lookupOpening(
  moveHistory: string[],
  upToIndex?: number,
  pgnHeader?: { opening: string; eco: string },
): LookupResult | null {
  // 1. Schachmentor-Baum
  if (cachedTree) {
    const treeResult = traverseTree(cachedTree, moveHistory, upToIndex);
    if (treeResult) {
      // Versuche ECO-Code aus ECO-DB zu ergänzen
      const ecoMatch = lookupEco(moveHistory, upToIndex);
      return {
        name: treeResult.name,
        eco: ecoMatch?.eco || '',
        source: 'tree',
      };
    }
  }

  // 2. Statische ECO-Datenbank
  const ecoResult = lookupEco(moveHistory, upToIndex);
  if (ecoResult) {
    return {
      name: ecoResult.name,
      eco: ecoResult.eco,
      source: 'eco',
    };
  }

  // 3. PGN-Header Fallback
  if (pgnHeader && pgnHeader.opening) {
    return {
      name: pgnHeader.opening,
      eco: pgnHeader.eco || '',
      source: 'pgn-header',
    };
  }

  return null;
}

/**
 * Vollständiger Lookup für eine Partie (für Import/Batch).
 * Gibt das beste Ergebnis über die gesamte Zugfolge zurück.
 */
export function lookupOpeningForGame(
  moveHistory: string[],
  pgnHeader?: { opening: string; eco: string },
): LookupResult | null {
  return lookupOpening(moveHistory, undefined, pgnHeader);
}

/**
 * Eröffnungsname in Schachmentor speichern.
 * Gibt den aktualisierten Baum zurück oder null bei Fehler.
 */
export async function saveName(
  moves: string[],
  name: string,
): Promise<MoveNode | null> {
  try {
    const res = await fetch(`${SCHACHMENTOR_BASE_URL}/api/moves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moves, name }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (data.success && data.moves) {
      // Baum muss nach dem Speichern als slim neu geladen werden,
      // da POST /api/moves den vollen Baum zurückgibt (mit TTS-Daten)
      const slimTree = await loadTree();
      return slimTree;
    }
    return null;
  } catch (e) {
    console.error('[openingLookup] Fehler beim Speichern:', (e as Error).message);
    return null;
  }
}

/**
 * Prüft ob Schachmentor erreichbar ist (cached).
 */
export function isSchachmentorAvailable(): boolean {
  return schachmentorAvailable;
}

/**
 * Gibt den gecachten Baum zurück (oder null).
 */
export function getCachedTree(): MoveNode | null {
  return cachedTree;
}

/**
 * Extrahiert die SAN-Zugfolge aus einem PGN-Movetext-String.
 * Entfernt Zugnummern, Kommentare, Ergebnis und NAGs.
 */
export function extractMovesFromPgn(pgn: string): string[] {
  // Header entfernen
  const parts = pgn.split(/\n\n/);
  const movetext = parts.length > 1 ? parts.slice(1).join('\n\n') : pgn;

  // Kommentare entfernen (verschachtelte Klammern)
  let cleaned = '';
  let depth = 0;
  for (const char of movetext) {
    if (char === '{') { depth++; continue; }
    if (char === '}') { depth--; continue; }
    if (depth === 0) cleaned += char;
  }

  // Varianten entfernen (Klammern)
  let noVariants = '';
  depth = 0;
  for (const char of cleaned) {
    if (char === '(') { depth++; continue; }
    if (char === ')') { depth--; continue; }
    if (depth === 0) noVariants += char;
  }

  // Zugnummern, Ergebnis, NAGs entfernen
  const tokens = noVariants
    .replace(/\d+\.\.\./g, '')  // 5...
    .replace(/\d+\./g, '')      // 5.
    .replace(/\$\d+/g, '')      // $1, $14 etc.
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  return tokens;
}
