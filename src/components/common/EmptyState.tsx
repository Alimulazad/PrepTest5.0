import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon, Inbox, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  actionLabel,
  onAction,
  secondaryActionText,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  const primaryLabel = actionText || actionLabel;
  const secondaryLabel = secondaryActionText || secondaryActionLabel;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`p-8 sm:p-12 text-center rounded-3xl bg-white/80 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 backdrop-blur-xs flex flex-col items-center justify-center space-y-4 ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
        <Icon className="w-8 h-8 stroke-[1.8]" />
      </div>

      <div className="max-w-sm space-y-1.5">
        <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 font-serif">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>

      {(primaryLabel || secondaryLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          {primaryLabel && onAction && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onAction}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{primaryLabel}</span>
            </motion.button>
          )}

          {secondaryLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default EmptyState;
