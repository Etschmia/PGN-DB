import React, { useRef, useState } from 'react';
import { UploadIcon, DownloadIcon, GlobeIcon } from './Icons';
import { fetchPgnFromLichess, fetchPgnFromChessCom } from '../services/lichessImportService';

type OnlinePlatform = 'lichess' | 'chesscom';

interface DatabaseControlsProps {
  onImport: (content: string, filename: string) => Promise<void>;
  onExportGame: () => void;
  onExportDatabase: () => void;
  onClearDatabase: () => void;
  gameCount: number;
  hasSelectedGame: boolean;
  isLoading: boolean;
}

const DatabaseControls: React.FC<DatabaseControlsProps> = ({
  onImport,
  onExportGame,
  onExportDatabase,
  onClearDatabase,
  gameCount,
  hasSelectedGame,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [onlinePlatform, setOnlinePlatform] = useState<OnlinePlatform>('lichess');
  const [username, setUsername] = useState('');
  const [isOnlineImporting, setIsOnlineImporting] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [progressText, setProgressText] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        try {
          await onImport(text, file.name);
        } catch (error) {
          console.error('Import fehlgeschlagen:', error);
        }
      };
      reader.onerror = () => {
        console.error('Fehler beim Lesen der Datei');
      };
      reader.readAsText(file);
    }
    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleOnlineImport = async () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) return;

    setIsOnlineImporting(true);
    setOnlineError(null);
    setProgressText('Verbinde...');

    try {
      let pgn: string;

      if (onlinePlatform === 'lichess') {
        pgn = await fetchPgnFromLichess(trimmedUsername, (gameCount) => {
          setProgressText(`${gameCount} ${gameCount === 1 ? 'Partie' : 'Partien'} geladen...`);
        });
      } else {
        pgn = await fetchPgnFromChessCom(trimmedUsername, (loaded, total) => {
          setProgressText(`${loaded} von ${total} ${total === 1 ? 'Archiv' : 'Archiven'} geladen...`);
        });
      }

      setProgressText('Importiere...');
      const platformLabel = onlinePlatform === 'lichess' ? 'lichess' : 'chesscom';
      await onImport(pgn, `${platformLabel}-${trimmedUsername}.pgn`);
      setUsername('');
    } catch (error) {
      let message: string;
      if (error instanceof DOMException && error.name === 'AbortError') {
        message = 'Verbindung abgebrochen — bitte erneut versuchen.';
      } else if (error instanceof Error) {
        message = error.message;
      } else {
        message = 'Unbekannter Fehler beim Online-Import.';
      }
      setOnlineError(message);
      console.error('[DatabaseControls] Online-Import fehlgeschlagen:', error);
    } finally {
      setIsOnlineImporting(false);
      setProgressText(null);
    }
  };

  const handleClearDatabase = () => {
    if (window.confirm(`Möchten Sie wirklich alle ${gameCount} Partien aus der Datenbank löschen? Diese Aktion kann nicht rückgängig gemacht werden!`)) {
      onClearDatabase();
    }
  };

  const isBusy = isLoading || isOnlineImporting;

  return (
    <div className="space-y-3">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pgn"
        className="hidden"
      />

      {/* Statistics */}
      <div className="bg-surface-600 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-accent">{gameCount}</div>
        <div className="text-sm text-gray-400">
          {gameCount === 1 ? 'Partie' : 'Partien'} in der Datenbank
        </div>
      </div>

      {/* Import Button */}
      <button
        onClick={handleImportClick}
        disabled={isBusy}
        className="w-full bg-accent hover:bg-accent-light text-surface-900 font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 disabled:bg-surface-500 disabled:text-gray-500 disabled:cursor-not-allowed"
      >
        <UploadIcon />
        {isLoading ? 'Importiere...' : 'PGN importieren'}
      </button>

      {/* Online Import Section */}
      <div className="bg-surface-600 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
          <GlobeIcon />
          Online importieren
        </div>

        {/* Platform Toggle */}
        <div className="flex rounded-lg overflow-hidden border border-surface-400">
          <button
            onClick={() => setOnlinePlatform('lichess')}
            className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
              onlinePlatform === 'lichess'
                ? 'bg-accent text-surface-900'
                : 'bg-surface-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            Lichess
          </button>
          <button
            onClick={() => setOnlinePlatform('chesscom')}
            className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
              onlinePlatform === 'chesscom'
                ? 'bg-accent text-surface-900'
                : 'bg-surface-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            Chess.com
          </button>
        </div>

        {/* Username Input + Import Button */}
        <div className="flex gap-2">
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setOnlineError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && username.trim() && !isBusy) handleOnlineImport(); }}
            placeholder="Benutzername"
            disabled={isBusy}
            className="flex-1 bg-surface-700 border border-surface-400 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-accent disabled:opacity-50"
          />
          <button
            onClick={handleOnlineImport}
            disabled={isBusy || !username.trim()}
            className="bg-accent hover:bg-accent-light text-surface-900 font-bold px-4 py-1.5 rounded-lg text-sm transition-colors duration-200 disabled:bg-surface-500 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {isOnlineImporting ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : 'Import'}
          </button>
        </div>

        {/* Error Message */}
        {onlineError && (
          <div className="text-xs text-red-400 px-1">
            {onlineError}
          </div>
        )}

        {/* Fortschrittsanzeige */}
        {progressText && (
          <div className="text-xs text-accent px-1 flex items-center gap-1.5">
            <svg className="w-3 h-3 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {progressText}
          </div>
        )}
      </div>

      {/* Export Current Game Button */}
      <button
        onClick={onExportGame}
        disabled={!hasSelectedGame}
        className="w-full bg-surface-600 hover:bg-surface-500 text-gray-200 font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 border border-surface-400 disabled:border-surface-500 disabled:text-gray-600 disabled:cursor-not-allowed"
      >
        <DownloadIcon />
        Aktuelle Partie exportieren
      </button>

      {/* Export Database Button */}
      <button
        onClick={onExportDatabase}
        disabled={gameCount === 0}
        className="w-full bg-surface-600 hover:bg-surface-500 text-gray-200 font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 border border-surface-400 disabled:border-surface-500 disabled:text-gray-600 disabled:cursor-not-allowed"
      >
        <DownloadIcon />
        Datenbank exportieren ({gameCount})
      </button>

      {/* Clear Database Button */}
      <button
        onClick={handleClearDatabase}
        disabled={gameCount === 0}
        className="w-full bg-red-900/50 hover:bg-red-800/50 text-red-400 font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 border border-red-900/50 disabled:bg-surface-600 disabled:border-surface-500 disabled:text-gray-600 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Datenbank löschen
      </button>
    </div>
  );
};

export default DatabaseControls;
