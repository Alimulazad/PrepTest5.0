import React, { useState } from 'react';
import { Globe, Sparkles } from 'lucide-react';
import { WikiConceptModal } from './WikiConceptModal';

export interface WikiConceptBadgeProps {
  concept: string;
  className?: string;
  onAskAI?: (concept: string) => void;
}

export const WikiConceptBadge: React.FC<WikiConceptBadgeProps> = ({
  concept,
  className = '',
  onAskAI,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  if (!concept || !concept.trim()) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] font-medium transition-all shadow-2xs hover:scale-[1.02] cursor-pointer ${className}`}
        title={`উইকিপিডিয়া থেকে "${concept}" কনসেপ্ট দেখুন`}
      >
        <Globe className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="truncate max-w-[150px]">{concept}</span>
      </button>

      <WikiConceptModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        conceptQuery={concept}
        onAskAIWithConcept={onAskAI ? (title) => onAskAI(title) : undefined}
      />
    </>
  );
};
