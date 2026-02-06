import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'pgn_db',
  user: process.env.DB_USER || 'librechat',
  password: process.env.DB_PASSWORD || '',
});

pool.on('error', (err) => {
  console.error('[db] Unerwarteter Fehler im Connection Pool:', err);
});

export default pool;
