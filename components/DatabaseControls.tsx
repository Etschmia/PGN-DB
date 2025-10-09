import React, { useRef } from 'react';
import { UploadIcon, DownloadIcon } from './Icons';

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

  const handleClearDatabase = () => {
    if (window.confirm(`Möchten Sie wirklich alle ${gameCount} Partien aus der Datenbank löschen? Diese Aktion kann nicht rückgängig gemacht werden!`)) {
      onClearDatabase();
    }
  };

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
      <div className="bg-slate-700 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-cyan-400">{gameCount}</div>
        <div className="text-sm text-slate-300">
          {gameCount === 1 ? 'Partie' : 'Partien'} in der Datenbank
        </div>
      </div>

      {/* Import Button */}
      <button
        onClick={handleImportClick}
        disabled={isLoading}
        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed"
      >
        <UploadIcon />
        {isLoading ? 'Importiere...' : 'PGN importieren'}
      </button>

      {/* Export Current Game Button */}
      <button
        onClick={onExportGame}
        disabled={!hasSelectedGame}
        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400"
      >
        <DownloadIcon />
        Aktuelle Partie exportieren
      </button>

      {/* Export Database Button */}
      <button
        onClick={onExportDatabase}
        disabled={gameCount === 0}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400"
      >
        <DownloadIcon />
        Datenbank exportieren ({gameCount})
      </button>

      {/* Clear Database Button */}
      <button
        onClick={handleClearDatabase}
        disabled={gameCount === 0}
        className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400"
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



