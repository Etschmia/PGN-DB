import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import pool from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { sendVerificationEmail } from '../utils/email.js';

const router = Router();

// Rate Limiting für Registrierung
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 10,
  message: { error: 'Zu viele Registrierungsversuche. Bitte warten Sie 15 Minuten.' },
});

// Rate Limiting für Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Zu viele Login-Versuche. Bitte warten Sie 15 Minuten.' },
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 Tage
  path: '/',
};

// POST /api/pgn/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email und Passwort erforderlich' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
    }

    // Email-Format prüfen
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Ungültige Email-Adresse' });
    }

    // Prüfen ob Email bereits existiert
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Diese Email-Adresse ist bereits registriert' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await pool.query(
      `INSERT INTO users (email, password_hash, verify_token, verify_expires)
       VALUES ($1, $2, $3, $4)`,
      [email.toLowerCase(), passwordHash, verifyToken, verifyExpires]
    );

    // Verifizierungs-Email senden
    await sendVerificationEmail(email.toLowerCase(), verifyToken);

    res.status(201).json({
      message: 'Registrierung erfolgreich. Bitte bestätigen Sie Ihre Email-Adresse.',
    });
  } catch (err) {
    console.error('[auth] Registrierungsfehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// GET /api/pgn/auth/verify?token=
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token fehlt' });
    }

    const result = await pool.query(
      `UPDATE users SET verified = TRUE, verify_token = NULL, verify_expires = NULL, updated_at = NOW()
       WHERE verify_token = $1 AND verify_expires > NOW() AND verified = FALSE
       RETURNING id, email`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.redirect('/?verify=expired');
    }

    const user = result.rows[0];

    // Automatisch einloggen nach Verifizierung
    const jwtToken = signToken(user.id, user.email);
    res.cookie('pgn_token', jwtToken, COOKIE_OPTIONS);
    res.redirect('/?verified=1');
  } catch (err) {
    console.error('[auth] Verifizierungsfehler:', err);
    res.redirect('/?verify=error');
  }
});

// POST /api/pgn/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email und Passwort erforderlich' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email oder Passwort falsch' });
    }

    const user = result.rows[0];

    if (!user.verified) {
      return res.status(403).json({ error: 'Bitte bestätigen Sie zuerst Ihre Email-Adresse' });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Email oder Passwort falsch' });
    }

    const token = signToken(user.id, user.email);
    res.cookie('pgn_token', token, COOKIE_OPTIONS);

    res.json({
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error('[auth] Login-Fehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// POST /api/pgn/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('pgn_token', { path: '/' });
  res.json({ message: 'Erfolgreich abgemeldet' });
});

// GET /api/pgn/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, created_at FROM users WHERE id = $1', [req.user.id]);

    if (result.rows.length === 0) {
      res.clearCookie('pgn_token', { path: '/' });
      return res.status(401).json({ error: 'Benutzer nicht gefunden' });
    }

    const user = result.rows[0];
    res.json({ user: { id: user.id, email: user.email, createdAt: user.created_at } });
  } catch (err) {
    console.error('[auth] Me-Fehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

export default router;
