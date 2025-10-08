
import React, { useRef } from 'react';
import { UploadIcon, DownloadIcon } from './Icons';

interface FileControlsProps {
  onPgnLoad: (pgn: string, fileName: string) => void;
  generatePgn: () => string;
  fileName: string;
  disabled: boolean;
}

const FileControls: React.FC<FileControlsProps> = ({ onPgnLoad, generatePgn, fileName, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        onPgnLoad(text, file.name);
      };
      reader.readAsText(file);
    }
    // Reset file input to allow loading the same file again
    if(event.target) {
        event.target.value = '';
    }
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSaveClick = () => {
    if(disabled) return;
    const pgnData = generatePgn();
    const blob = new Blob([pgnData], { type: 'application/vnd.chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'partie.pgn';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pgn"
        className="hidden"
      />
      <button
        onClick={handleLoadClick}
        className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200"
      >
        <UploadIcon />
        PGN laden
      </button>
      <button
        onClick={handleSaveClick}
        disabled={disabled}
        className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-500"
      >
        <DownloadIcon />
        PGN speichern
      </button>
    </div>
  );
};

export default FileControls;
