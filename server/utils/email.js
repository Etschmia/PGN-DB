import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.BASE_URL || 'https://pgn.martuni.de';

export async function sendVerificationEmail(email, token) {
  const verifyUrl = `${BASE_URL}/api/pgn/auth/verify?token=${token}`;

  try {
    await resend.emails.send({
      from: 'PGN-Datenbank <noreply@martuni.de>',
      to: email,
      subject: 'Email-Adresse bestätigen – Schach PGN-Datenbank',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Email-Adresse bestätigen</h2>
          <p>Vielen Dank für die Registrierung bei der Schach PGN-Datenbank.</p>
          <p>Bitte klicken Sie auf den folgenden Link, um Ihre Email-Adresse zu bestätigen:</p>
          <p style="margin: 24px 0;">
            <a href="${verifyUrl}"
               style="background: #d4a843; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Email bestätigen
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            Der Link ist 24 Stunden gültig. Falls Sie sich nicht registriert haben, können Sie diese Email ignorieren.
          </p>
        </div>
      `,
    });
    console.log('[email] Verifizierungs-Email gesendet an:', email);
    return true;
  } catch (err) {
    console.error('[email] Fehler beim Senden:', err);
    return false;
  }
}
