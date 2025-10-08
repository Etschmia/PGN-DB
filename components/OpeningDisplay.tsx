
import React from 'react';

interface OpeningDisplayProps {
  opening: { name: string; eco: string } | null;
  isLoading: boolean;
}

const OpeningDisplay: React.FC<OpeningDisplayProps> = ({ opening, isLoading }) => {
  return (
    <div className="bg-slate-900/50 rounded-lg p-3">
      <h3 className="text-lg font-semibold mb-1 text-slate-300">Eröffnung</h3>
      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <div className="w-4 h-4 border-2 border-slate-500 border-t-cyan-400 rounded-full animate-spin"></div>
          <span>Analysiere mit KI...</span>
        </div>
      ) : opening ? (
        <div>
          <p className="font-bold text-cyan-400">{opening.name}</p>
          <p className="text-sm text-slate-400">{opening.eco}</p>
        </div>
      ) : (
        <p className="text-slate-400">Keine Eröffnungsinformationen verfügbar.</p>
      )}
    </div>
  );
};

export default OpeningDisplay;
