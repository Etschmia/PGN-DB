import type { GameRecord } from '../types';

const DB_NAME = 'PgnDatabase';
const DB_VERSION = 1;
const STORE_NAME = 'games';

// Initialize and open the database
const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[IndexedDB] Fehler beim Öffnen der Datenbank:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('[IndexedDB] Datenbank erfolgreich geöffnet');
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      console.log('[IndexedDB] Datenbank-Upgrade wird durchgeführt...');
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });

        // Create indices for fast queries
        objectStore.createIndex('white', 'white', { unique: false });
        objectStore.createIndex('black', 'black', { unique: false });
        objectStore.createIndex('date', 'date', { unique: false });
        objectStore.createIndex('opening', 'opening', { unique: false });
        objectStore.createIndex('eco', 'eco', { unique: false });
        objectStore.createIndex('event', 'event', { unique: false });

        console.log('[IndexedDB] Object Store und Indizes erstellt');
      }
    };
  });
};

// Save a single game to the database
export const saveGame = async (game: GameRecord): Promise<number> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const gameToSave = {
      ...game,
      updatedAt: Date.now(),
      createdAt: game.createdAt || Date.now(),
    };

    const request = store.add(gameToSave);

    request.onsuccess = () => {
      console.log('[IndexedDB] Partie gespeichert mit ID:', request.result);
      resolve(request.result as number);
    };

    request.onerror = () => {
      console.error('[IndexedDB] Fehler beim Speichern:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

// Get a single game by ID
export const getGame = async (id: number): Promise<GameRecord | null> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      console.error('[IndexedDB] Fehler beim Abrufen der Partie:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

// Get all games from the database
export const getAllGames = async (): Promise<GameRecord[]> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      console.log('[IndexedDB] Anzahl geladener Partien:', request.result.length);
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('[IndexedDB] Fehler beim Abrufen aller Partien:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

// Update an existing game
export const updateGame = async (game: GameRecord): Promise<void> => {
  if (!game.id) {
    throw new Error('Partie-ID ist erforderlich für Update');
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const gameToUpdate = {
      ...game,
      updatedAt: Date.now(),
    };

    const request = store.put(gameToUpdate);

    request.onsuccess = () => {
      console.log('[IndexedDB] Partie aktualisiert:', game.id);
      resolve();
    };

    request.onerror = () => {
      console.error('[IndexedDB] Fehler beim Aktualisieren:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

// Delete a game by ID
export const deleteGame = async (id: number): Promise<void> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      console.log('[IndexedDB] Partie gelöscht:', id);
      resolve();
    };

    request.onerror = () => {
      console.error('[IndexedDB] Fehler beim Löschen:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

// Bulk import multiple games
export const importGames = async (games: GameRecord[]): Promise<number[]> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const ids: number[] = [];

    let completed = 0;
    let failed = 0;

    games.forEach((game) => {
      const gameToSave = {
        ...game,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const request = store.add(gameToSave);

      request.onsuccess = () => {
        ids.push(request.result as number);
        completed++;
      };

      request.onerror = () => {
        console.error('[IndexedDB] Fehler beim Import einer Partie:', request.error);
        failed++;
      };
    });

    transaction.oncomplete = () => {
      console.log(`[IndexedDB] Bulk-Import abgeschlossen: ${completed} erfolgreich, ${failed} fehlgeschlagen`);
      db.close();
      resolve(ids);
    };

    transaction.onerror = () => {
      console.error('[IndexedDB] Transaktion fehlgeschlagen:', transaction.error);
      reject(transaction.error);
    };
  });
};

// Clear all games from the database
export const clearDatabase = async (): Promise<void> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      console.log('[IndexedDB] Datenbank geleert');
      resolve();
    };

    request.onerror = () => {
      console.error('[IndexedDB] Fehler beim Leeren der Datenbank:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};



