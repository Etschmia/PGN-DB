
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
    <div className="bg-surface-900/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-accent">Eröffnung</h3>
        {/* Schachmentor-Verfügbarkeitsindikator */}
        <div className="flex items-center gap-1.5" title={isTreeAvailable ? 'Schachmentor verbunden' : 'Schachmentor nicht erreichbar'}>
          <div className={`w-2 h-2 rounded-full ${isTreeAvailable ? 'bg-green-500' : 'bg-gray-600'}`} />
          <span className="text-xs text-gray-600">SM</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-surface-400 border-t-accent rounded-full animate-spin" />
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
            className="flex-grow bg-surface-700 text-accent border border-surface-400 focus:border-accent rounded px-2 py-1 text-sm outline-none"
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
            className="text-gray-500 hover:text-gray-400 text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>
      ) : opening ? (
        <div
          className={`group ${isTreeAvailable && currentMoves.length > 0 ? 'cursor-pointer hover:bg-surface-700/50 rounded -mx-1 px-1 transition-colors' : ''}`}
          onClick={handleEditStart}
        >
          <p className={`font-bold ${opening.source === 'tree' ? 'text-accent' : opening.source === 'eco' ? 'text-accent/80' : 'text-gray-300'}`}>
            {opening.name}
            {isTreeAvailable && currentMoves.length > 0 && (
              <span className="ml-2 opacity-0 group-hover:opacity-50 text-xs text-gray-500 transition-opacity">bearbeiten</span>
            )}
          </p>
          <div className="flex items-center gap-2 text-sm">
            {opening.eco && <span className="text-gray-500">{opening.eco}</span>}
            {sourceLabel && <span className="text-gray-600 text-xs">({sourceLabel})</span>}
          </div>
        </div>
      ) : (
        <p className="text-gray-600 text-sm">
          {currentMoves.length === 0 ? 'Startposition' : 'Keine Eröffnung erkannt'}
        </p>
      )}
    </div>
  );
};

export default OpeningDisplay;
