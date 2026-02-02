import React, { useState } from 'react';
import type { GameRecord } from '../types';

interface TagEditorProps {
  game: GameRecord;
  onUpdate: (game: GameRecord) => void;
}

const TagEditor: React.FC<TagEditorProps> = ({ game, onUpdate }) => {
  const [newTag, setNewTag] = useState('');
  const [notes, setNotes] = useState(game.notes || '');

  const handleAddTag = () => {
    if (newTag.trim() && !game.tags.includes(newTag.trim())) {
      const updatedGame = {
        ...game,
        tags: [...game.tags, newTag.trim()],
      };
      onUpdate(updatedGame);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    const updatedGame = {
      ...game,
      tags: game.tags.filter((t) => t !== tag),
    };
    onUpdate(updatedGame);
  };

  const handleSaveNotes = () => {
    if (notes !== game.notes) {
      const updatedGame = {
        ...game,
        notes,
      };
      onUpdate(updatedGame);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    }
  };

  return (
    <div className="bg-surface-900/50 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold text-accent">Tags & Notizen</h3>

      {/* Tags Section */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Tags
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Neues Tag hinzufügen..."
            className="flex-1 px-3 py-2 bg-surface-600 text-gray-200 rounded border border-surface-400 focus:border-accent focus:outline-none text-sm"
          />
          <button
            onClick={handleAddTag}
            disabled={!newTag.trim()}
            className="px-4 py-2 bg-accent hover:bg-accent-light text-surface-900 rounded font-semibold disabled:bg-surface-500 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors text-sm"
          >
            +
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {game.tags.length === 0 ? (
            <span className="text-sm text-gray-500 italic">Keine Tags vorhanden</span>
          ) : (
            game.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-accent/15 text-accent-light rounded-full text-sm"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-400 transition-colors"
                  title="Tag entfernen"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Notes Section */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Allgemeine Notizen
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSaveNotes}
          placeholder="Notizen zur Partie..."
          rows={4}
          className="w-full px-3 py-2 bg-surface-600 text-gray-200 rounded border border-surface-400 focus:border-accent focus:outline-none text-sm resize-none"
        />
        {notes !== game.notes && (
          <button
            onClick={handleSaveNotes}
            className="mt-2 px-4 py-1 bg-accent hover:bg-accent-light text-surface-900 rounded text-sm font-semibold transition-colors"
          >
            Notizen speichern
          </button>
        )}
      </div>
    </div>
  );
};

export default TagEditor;
