
import React, { useState, useEffect } from 'react';
import type { Move } from '../types';
import { SaveIcon } from './Icons';

interface CommentEditorProps {
  move: Move | undefined;
  onSaveComment: (comment: string) => void;
  moveIndex: number;
}

const CommentEditor: React.FC<CommentEditorProps> = ({ move, onSaveComment, moveIndex }) => {
  const [comment, setComment] = useState('');
  const [key, setKey] = useState(moveIndex);

  useEffect(() => {
    setComment(move?.comment || '');
    setKey(moveIndex);
  }, [move, moveIndex]);

  const handleSave = () => {
    onSaveComment(comment);
  };

  const isDisabled = moveIndex < 0;

  return (
    <div key={key} className="flex flex-col gap-2">
      <label htmlFor="comment" className="font-semibold text-gray-300">
        Kommentar zu Zug {moveIndex < 0 ? '-' : `${Math.floor(moveIndex / 2) + 1}${move?.color === 'w' ? '.' : '...'}` } {move?.san || ''}
      </label>
      <textarea
        id="comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={isDisabled ? "Wählen Sie einen Zug, um einen Kommentar hinzuzufügen." : "Kommentar hier eingeben..."}
        disabled={isDisabled}
        rows={3}
        className="w-full bg-surface-600 border border-surface-400 rounded-lg p-2 text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-shadow disabled:bg-surface-800 disabled:cursor-not-allowed"
      />
      <button
        onClick={handleSave}
        disabled={isDisabled}
        className="bg-accent hover:bg-accent-light text-surface-900 font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 disabled:bg-surface-600 disabled:cursor-not-allowed disabled:text-gray-600"
      >
        <SaveIcon />
        Kommentar speichern
      </button>
    </div>
  );
};

export default CommentEditor;
