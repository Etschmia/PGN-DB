import React, { useState } from 'react';
import type { AuthUser, StorageInfo } from '../types';

interface AuthBarProps {
  user: AuthUser | null;
  isAuthenticated: boolean;
  storageInfo: StorageInfo | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<string>;
  onLogout: () => Promise<void>;
  onForgotPassword: (email: string) => Promise<string>;
  onResetPassword: (token: string, password: string) => Promise<void>;
  resetToken: string | null;
}

type AuthView = 'none' | 'login' | 'register' | 'forgot' | 'reset';

export default function AuthBar({ user, isAuthenticated, storageInfo, onLogin, onRegister, onLogout, onForgotPassword, onResetPassword, resetToken }: AuthBarProps) {
  const [view, setView] = useState<AuthView>(resetToken ? 'reset' : 'none');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset-Token von URL: View automatisch öffnen
  React.useEffect(() => {
    if (resetToken) setView('reset');
  }, [resetToken]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setPasswordConfirm('');
    setError('');
    setMessage('');
    setView('none');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await onLogin(email, password);
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const msg = await onRegister(email, password);
      setMessage(msg);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const msg = await onForgotPassword(email);
      setMessage(msg);
      setEmail('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('Passwörter stimmen nicht überein');
      return;
    }

    setIsSubmitting(true);
    try {
      await onResetPassword(resetToken!, password);
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eingeloggt: User-Info anzeigen
  if (isAuthenticated && user) {
    const storagePercent = storageInfo?.percentage ?? 0;
    const storageColor = storagePercent > 80 ? 'bg-red-500' : storagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500';

    return (
      <div className="flex items-center gap-3 text-sm">
        {storageInfo && (
          <div className="flex items-center gap-2" title={`${(storageInfo.usedBytes / 1024 / 1024).toFixed(1)} / ${(storageInfo.maxBytes / 1024 / 1024).toFixed(0)} MB`}>
            <div className="w-16 h-1.5 bg-surface-600 rounded-full overflow-hidden">
              <div className={`h-full ${storageColor} rounded-full transition-all`} style={{ width: `${storagePercent}%` }} />
            </div>
            <span className="text-gray-500 text-xs">{storagePercent}%</span>
          </div>
        )}
        <span className="text-gray-400">{user.email}</span>
        <button
          onClick={onLogout}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          Abmelden
        </button>
      </div>
    );
  }

  // Nicht eingeloggt: Login/Register-Buttons oder Formular
  if (view === 'none') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => setView('login')}
          className="text-accent hover:text-accent-light transition-colors"
        >
          Anmelden
        </button>
        <span className="text-surface-500">|</span>
        <button
          onClick={() => setView('register')}
          className="text-gray-400 hover:text-gray-300 transition-colors"
        >
          Registrieren
        </button>
      </div>
    );
  }

  // Forgot-Password-Formular
  if (view === 'forgot') {
    return (
      <div className="flex items-center gap-2 text-sm">
        {message ? (
          <div className="flex items-center gap-2">
            <span className="text-green-400">{message}</span>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-300">✕</button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email-Adresse"
              required
              className="bg-surface-700 border border-surface-500 rounded px-2 py-1 text-sm text-gray-200 w-48 focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-accent hover:bg-accent-light text-surface-900 font-semibold px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? '...' : 'Link senden'}
            </button>
            <button type="button" onClick={() => { setError(''); setView('login'); }} className="text-gray-500 hover:text-gray-300">✕</button>
            {error && <span className="text-red-400 text-xs max-w-48 truncate" title={error}>{error}</span>}
          </form>
        )}
      </div>
    );
  }

  // Reset-Password-Formular
  if (view === 'reset') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <form onSubmit={handleResetPassword} className="flex items-center gap-2">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Neues Passwort (min. 8)"
            required
            minLength={8}
            className="bg-surface-700 border border-surface-500 rounded px-2 py-1 text-sm text-gray-200 w-40 focus:border-accent focus:outline-none"
          />
          <input
            type="password"
            value={passwordConfirm}
            onChange={e => setPasswordConfirm(e.target.value)}
            placeholder="Passwort bestätigen"
            required
            minLength={8}
            className="bg-surface-700 border border-surface-500 rounded px-2 py-1 text-sm text-gray-200 w-40 focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-accent hover:bg-accent-light text-surface-900 font-semibold px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? '...' : 'Passwort ändern'}
          </button>
          <button type="button" onClick={resetForm} className="text-gray-500 hover:text-gray-300">✕</button>
          {error && <span className="text-red-400 text-xs max-w-48 truncate" title={error}>{error}</span>}
        </form>
      </div>
    );
  }

  // Login/Register-Formular
  const isLogin = view === 'login';

  return (
    <div className="flex items-center gap-2 text-sm">
      {message ? (
        <div className="flex items-center gap-2">
          <span className="text-green-400">{message}</span>
          <button onClick={resetForm} className="text-gray-500 hover:text-gray-300">✕</button>
        </div>
      ) : (
        <form onSubmit={isLogin ? handleLogin : handleRegister} className="flex items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="bg-surface-700 border border-surface-500 rounded px-2 py-1 text-sm text-gray-200 w-40 focus:border-accent focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={isLogin ? 'Passwort' : 'Passwort (min. 8)'}
            required
            minLength={isLogin ? undefined : 8}
            className="bg-surface-700 border border-surface-500 rounded px-2 py-1 text-sm text-gray-200 w-32 focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-accent hover:bg-accent-light text-surface-900 font-semibold px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? '...' : isLogin ? 'Login' : 'Registrieren'}
          </button>
          {isLogin && (
            <button
              type="button"
              onClick={() => { setError(''); setPassword(''); setView('forgot'); }}
              className="text-gray-500 hover:text-accent text-xs transition-colors"
            >
              Passwort vergessen?
            </button>
          )}
          <button
            type="button"
            onClick={resetForm}
            className="text-gray-500 hover:text-gray-300"
          >
            ✕
          </button>
          {error && <span className="text-red-400 text-xs max-w-48 truncate" title={error}>{error}</span>}
        </form>
      )}
    </div>
  );
}
