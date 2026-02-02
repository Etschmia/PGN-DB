
import React, { useState } from 'react';
import type { LookupResult } from '../services/openingLookupService';

interface OpeningDisplayProps {
  opening: LookupResult | null;
  isLoading: boolean;
  isTreeAvailable: boolean;
  currentMoves: string[];
  onSaveName: (moves: string[], name: string) => Promise<boolean>;
}

const OpeningDisplay: React.FC<OpeningDisplayProps> = ({
  opening,
  isLoading,
  isTreeAvailable,
  currentMoves,
  onSaveName,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleEditStart = () => {
    if (!isTreeAvailable || currentMoves.length === 0) return;
    setEditValue(opening?.name || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editValue.trim()) return;
    setIsSaving(true);
    const success = await onSaveName(currentMoves, editValue.trim());
    setIsSaving(false);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setIsEditing(false);
  };

  // Quelle-Indikator
  const sourceLabel = opening?.source === 'tree' ? 'Schachmentor'
    : opening?.source === 'eco' ? 'ECO'
    : opening?.source === 'pgn-header' ? 'PGN-Header'
    : null;

  return (
    <div className="bg-slate-900/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-slate-300">Eröffnung</h3>
        {/* Schachmentor-Verfügbarkeitsindikator */}
        <div className="flex items-center gap-1.5" title={isTreeAvailable ? 'Schachmentor verbunden' : 'Schachmentor nicht erreichbar'}>
          <div className={`w-2 h-2 rounded-full ${isTreeAvailable ? 'bg-green-500' : 'bg-slate-500'}`} />
          <span className="text-xs text-slate-500">SM</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <div className="w-4 h-4 border-2 border-slate-500 border-t-cyan-400 rounded-full animate-spin" />
          <span>Lade Eröffnungsdaten...</span>
        </div>
      ) : isEditing ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="flex-grow bg-slate-800 text-cyan-400 border border-slate-600 focus:border-cyan-500 rounded px-2 py-1 text-sm outline-none"
            placeholder="Eröffnungsname..."
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="text-green-400 hover:text-green-300 text-sm px-2 py-1"
          >
            {isSaving ? '...' : '✓'}
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="text-slate-400 hover:text-slate-300 text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>
      ) : opening ? (
        <div
          className={`group ${isTreeAvailable && currentMoves.length > 0 ? 'cursor-pointer hover:bg-slate-800/50 rounded -mx-1 px-1 transition-colors' : ''}`}
          onClick={handleEditStart}
        >
          <p className={`font-bold ${opening.source === 'tree' ? 'text-cyan-400' : opening.source === 'eco' ? 'text-cyan-500/80' : 'text-slate-300'}`}>
            {opening.name}
            {isTreeAvailable && currentMoves.length > 0 && (
              <span className="ml-2 opacity-0 group-hover:opacity-50 text-xs text-slate-400 transition-opacity">bearbeiten</span>
            )}
          </p>
          <div className="flex items-center gap-2 text-sm">
            {opening.eco && <span className="text-slate-400">{opening.eco}</span>}
            {sourceLabel && <span className="text-slate-500 text-xs">({sourceLabel})</span>}
          </div>
        </div>
      ) : (
        <p className="text-slate-500 text-sm">
          {currentMoves.length === 0 ? 'Startposition' : 'Keine Eröffnung erkannt'}
        </p>
      )}
    </div>
  );
};

export default OpeningDisplay;
