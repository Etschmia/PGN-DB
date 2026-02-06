import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import gamesRoutes from './routes/games.js';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3003;

// Caddy steht als Reverse-Proxy davor
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '12mb' }));
app.use(cookieParser());

// Routes
app.use('/api/pgn/auth', authRoutes);
app.use('/api/pgn', gamesRoutes);

// Health-Check
app.get('/api/pgn/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[server] PGN-DB Backend läuft auf Port ${PORT}`);
});
