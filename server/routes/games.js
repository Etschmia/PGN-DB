import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { checkStorageLimit, getStorageUsage, MAX_STORAGE_BYTES } from '../middleware/storage.js';

const router = Router();

// Hilfsfunktion: DB-Zeile → Frontend GameRecord
function rowToGameRecord(row) {
  return {
    id: row.id,
    event: row.event,
    site: row.site,
    date: row.date,
    white: row.white,
    black: row.black,
    result: row.result,
    eco: row.eco,
    opening: row.opening,
    whiteElo: row.white_elo || undefined,
    blackElo: row.black_elo || undefined,
    pgn: row.pgn,
    tags: row.tags || [],
    notes: row.notes || '',
    moveCount: row.move_count,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

// GET /api/pgn/games — Alle Partien des Users
router.get('/games', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM games WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows.map(rowToGameRecord));
  } catch (err) {
    console.error('[games] Fehler beim Laden:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Partien' });
  }
});

// POST /api/pgn/games — Neue Partie
router.post('/games', requireAuth, checkStorageLimit, async (req, res) => {
  try {
    const { event, site, date, white, black, result: gameResult, eco, opening, whiteElo, blackElo, pgn, tags, notes, moveCount } = req.body;

    if (!pgn) {
      return res.status(400).json({ error: 'PGN ist erforderlich' });
    }

    const row = await pool.query(
      `INSERT INTO games (user_id, event, site, date, white, black, result, eco, opening, white_elo, black_elo, pgn, tags, notes, move_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [req.user.id, event || 'Unknown', site || 'Unknown', date || '????.??.??',
       white || 'Unknown', black || 'Unknown', gameResult || '*', eco || '', opening || '',
       whiteElo || null, blackElo || null, pgn, JSON.stringify(tags || []), notes || '', moveCount || 0]
    );

    res.status(201).json(rowToGameRecord(row.rows[0]));
  } catch (err) {
    console.error('[games] Fehler beim Speichern:', err);
    res.status(500).json({ error: 'Fehler beim Speichern der Partie' });
  }
});

// PUT /api/pgn/games/:id — Partie aktualisieren
router.put('/games/:id', requireAuth, async (req, res) => {
  try {
    const gameId = parseInt(req.params.id, 10);
    const { event, site, date, white, black, result: gameResult, eco, opening, whiteElo, blackElo, pgn, tags, notes, moveCount } = req.body;

    const row = await pool.query(
      `UPDATE games SET event = $1, site = $2, date = $3, white = $4, black = $5,
       result = $6, eco = $7, opening = $8, white_elo = $9, black_elo = $10,
       pgn = $11, tags = $12, notes = $13, move_count = $14, updated_at = NOW()
       WHERE id = $15 AND user_id = $16
       RETURNING *`,
      [event, site, date, white, black, gameResult, eco, opening,
       whiteElo || null, blackElo || null, pgn, JSON.stringify(tags || []), notes || '', moveCount || 0,
       gameId, req.user.id]
    );

    if (row.rows.length === 0) {
      return res.status(404).json({ error: 'Partie nicht gefunden' });
    }

    res.json(rowToGameRecord(row.rows[0]));
  } catch (err) {
    console.error('[games] Fehler beim Aktualisieren:', err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Partie' });
  }
});

// DELETE /api/pgn/games/:id — Einzelne Partie löschen
router.delete('/games/:id', requireAuth, async (req, res) => {
  try {
    const gameId = parseInt(req.params.id, 10);
    const result = await pool.query(
      'DELETE FROM games WHERE id = $1 AND user_id = $2 RETURNING id',
      [gameId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Partie nicht gefunden' });
    }

    res.json({ message: 'Partie gelöscht' });
  } catch (err) {
    console.error('[games] Fehler beim Löschen:', err);
    res.status(500).json({ error: 'Fehler beim Löschen der Partie' });
  }
});

// DELETE /api/pgn/games — Alle Partien löschen
router.delete('/games', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM games WHERE user_id = $1', [req.user.id]);
    res.json({ message: `${result.rowCount} Partien gelöscht` });
  } catch (err) {
    console.error('[games] Fehler beim Leeren:', err);
    res.status(500).json({ error: 'Fehler beim Leeren der Datenbank' });
  }
});

// POST /api/pgn/games/import — Bulk-Import
router.post('/games/import', requireAuth, checkStorageLimit, async (req, res) => {
  const client = await pool.connect();
  try {
    const { games } = req.body;

    if (!Array.isArray(games) || games.length === 0) {
      return res.status(400).json({ error: 'Keine Partien zum Importieren' });
    }

    await client.query('BEGIN');

    const ids = [];
    for (const game of games) {
      const row = await client.query(
        `INSERT INTO games (user_id, event, site, date, white, black, result, eco, opening, white_elo, black_elo, pgn, tags, notes, move_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING id`,
        [req.user.id, game.event || 'Unknown', game.site || 'Unknown', game.date || '????.??.??',
         game.white || 'Unknown', game.black || 'Unknown', game.result || '*', game.eco || '', game.opening || '',
         game.whiteElo || null, game.blackElo || null, game.pgn,
         JSON.stringify(game.tags || []), game.notes || '', game.moveCount || 0]
      );
      ids.push(row.rows[0].id);
    }

    await client.query('COMMIT');
    res.status(201).json({ imported: ids.length, ids });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[games] Fehler beim Bulk-Import:', err);
    res.status(500).json({ error: 'Fehler beim Importieren der Partien' });
  } finally {
    client.release();
  }
});

// GET /api/pgn/user/storage — Speicherverbrauch
router.get('/user/storage', requireAuth, async (req, res) => {
  try {
    const usedBytes = await getStorageUsage(req.user.id);
    res.json({
      usedBytes,
      maxBytes: MAX_STORAGE_BYTES,
      percentage: Math.round((usedBytes / MAX_STORAGE_BYTES) * 100),
    });
  } catch (err) {
    console.error('[games] Fehler bei Storage-Info:', err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Speicherinfo' });
  }
});

export default router;
