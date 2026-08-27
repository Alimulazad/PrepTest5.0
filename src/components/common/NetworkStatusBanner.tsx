import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, RefreshCw, CheckCircle2, X } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { useToast } from '../../context/ToastContext';


export const NetworkStatusBanner: React.FC = () => {
  const { isOnline, isOfflineMode, isReconnecting, triggerReconnection, offlineSince } = useNetwork();
  const toast = useToast();
  const [wasOffline, setWasOffline] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Monitor transition from offline -> online
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setIsDismissed(false);
    } else if (wasOffline && isOnline) {
      toast.success('ইন্টারনেট সংযোগ পুনঃস্থাপিত হয়েছে! ডেটা সিঙ্ক হচ্ছে...', 'অনলাইন');
      setWasOffline(false);
    }
  }, [isOnline, wasOffline, toast]);

  // If online and not in forced offline mode, hide banner
  if (isOnline && !isOfflineMode) {
    return null;
  }

  if (isDismissed) {
    return (
      <div className="fixed bottom-16 right-4 z-40">
        <button
          onClick={() => setIsDismissed(false)}
          title="অফলাইন স্ট্যাটাস দেখুন"
          className="p-2.5 rounded-full bg-amber-500 text-slate-950 font-bold shadow-lg border border-amber-400 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
        >
          <WifiOff className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="fixed bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-md w-[calc(100vw-2rem)] pointer-events-none"
      >
        <div className="pointer-events-auto bg-slate-950/95 dark:bg-slate-900/95 text-white p-3 sm:p-3.5 rounded-2xl border border-amber-500/40 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span>অফলাইন মোড সক্রিয়</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                সংরক্ষিত প্রশ্নব্যাংক ও মক টেস্ট সচল রয়েছে
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => triggerReconnection()}
              disabled={isReconnecting}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>{isReconnecting ? 'সিঙ্ক...' : 'পুনরায় চেষ্টা'}</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="লুকান"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
