import pool from '../db.js';

const MAX_STORAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function getStorageUsage(userId) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(
      LENGTH(pgn) + LENGTH(COALESCE(notes, '')) + LENGTH(COALESCE(event, '')) +
      LENGTH(COALESCE(site, '')) + LENGTH(COALESCE(white, '')) + LENGTH(COALESCE(black, '')) +
      LENGTH(COALESCE(opening, '')) + LENGTH(COALESCE(tags::text, '[]'))
    ), 0) AS used_bytes FROM games WHERE user_id = $1`,
    [userId]
  );
  return parseInt(result.rows[0].used_bytes, 10);
}

export async function checkStorageLimit(req, res, next) {
  try {
    const usedBytes = await getStorageUsage(req.user.id);
    if (usedBytes >= MAX_STORAGE_BYTES) {
      return res.status(413).json({
        error: 'Speicherlimit erreicht (10 MB). Bitte löschen Sie einige Partien.',
        usedBytes,
        maxBytes: MAX_STORAGE_BYTES,
      });
    }
    req.storageUsed = usedBytes;
    next();
  } catch (err) {
    console.error('[storage] Fehler bei Speicherprüfung:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
}

export { MAX_STORAGE_BYTES };
