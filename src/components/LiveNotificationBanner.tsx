import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  X,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Radio,
} from 'lucide-react';
import {
  subscribeAdminNotifications,
  AdminBroadcastNotification,
} from '../services/firebase';

interface LiveNotificationBannerProps {
  onNavigateAction?: (route: string) => void;
}

export const LiveNotificationBanner: React.FC<LiveNotificationBannerProps> = ({
  onNavigateAction,
}) => {
  const [activeNotification, setActiveNotification] = useState<AdminBroadcastNotification | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('preptest_dismissed_notifs') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const unsubscribe = subscribeAdminNotifications((list) => {
      if (!list || list.length === 0) {
        setActiveNotification(null);
        return;
      }

      // Find newest notification that user hasn't dismissed yet
      const unread = list.find((n) => !dismissedIds.includes(n.id));
      setActiveNotification(unread || null);
    });

    return () => unsubscribe();
  }, [dismissedIds]);

  const handleDismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      sessionStorage.setItem('preptest_dismissed_notifs', JSON.stringify(updated));
    } catch {}
    setActiveNotification(null);
  };

  if (!activeNotification) return null;

  const typeConfig = {
    info: {
      bg: 'bg-blue-900/95 border-blue-500/40 text-blue-100 shadow-blue-950/50',
      badgeBg: 'bg-blue-600 text-white',
      icon: Info,
      iconColor: 'text-blue-400',
    },
    success: {
      bg: 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/50',
      badgeBg: 'bg-emerald-600 text-white',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
    },
    warning: {
      bg: 'bg-amber-950/95 border-amber-500/40 text-amber-100 shadow-amber-950/50',
      badgeBg: 'bg-amber-600 text-white',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
    },
    urgent: {
      bg: 'bg-rose-950/95 border-rose-500/50 text-rose-100 shadow-rose-950/60 animate-pulse',
      badgeBg: 'bg-rose-600 text-white',
      icon: AlertTriangle,
      iconColor: 'text-rose-400',
    },
  }[activeNotification.type] || {
    bg: 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-slate-950/50',
    badgeBg: 'bg-indigo-600 text-white',
    icon: Bell,
    iconColor: 'text-indigo-400',
  };

  const IconComponent = typeConfig.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="w-full px-3 py-2 z-40"
      >
        <div
          className={`max-w-3xl mx-auto rounded-2xl border p-3 sm:p-3.5 backdrop-blur-md shadow-xl flex items-start sm:items-center justify-between gap-3 ${typeConfig.bg}`}
        >
          {/* Left Icon & Text */}
          <div className="flex items-start sm:items-center gap-3 grow min-w-0">
            <div className="p-2 rounded-xl bg-white/10 shrink-0 mt-0.5 sm:mt-0">
              <IconComponent className={`w-4 h-4 sm:w-5 sm:h-5 ${typeConfig.iconColor}`} />
            </div>

            <div className="space-y-0.5 grow min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${typeConfig.badgeBg}`}>
                  {activeNotification.type === 'urgent' ? 'জরুরি ঘোষণা' : 'লাইভ বার্তা'}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                  {activeNotification.title}
                </h4>
              </div>
              <p className="text-xs text-slate-200/90 leading-snug line-clamp-2">
                {activeNotification.message}
              </p>
            </div>
          </div>

          {/* Action and Dismiss */}
          <div className="flex items-center gap-2 shrink-0">
            {activeNotification.actionLink && (
              <button
                onClick={() => {
                  if (onNavigateAction && activeNotification.actionLink) {
                    onNavigateAction(activeNotification.actionLink);
                  }
                  handleDismiss(activeNotification.id);
                }}
                className="px-3 py-1.5 rounded-xl bg-white text-slate-950 hover:bg-slate-100 text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <span>{activeNotification.actionText || 'দেখুন'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => handleDismiss(activeNotification.id)}
              aria-label="বন্ধ করুন"
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
