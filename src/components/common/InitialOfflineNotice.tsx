import React, { useState } from 'react';
import { motion } from 'motion/react';
import { WifiOff, RefreshCw, BookOpen, Clock, Bookmark, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';

interface InitialOfflineNoticeProps {
  onContinueOffline: () => void;
  onRetry: () => Promise<boolean>;
}

export const InitialOfflineNotice: React.FC<InitialOfflineNoticeProps> = ({
  onContinueOffline,
  onRetry,
}) => {
  const { isReconnecting } = useNetwork();
  const [retryFailed, setRetryFailed] = useState(false);

  const handleRetryClick = async () => {
    setRetryFailed(false);
    const success = await onRetry();
    if (!success) {
      setRetryFailed(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8"
      >
        {/* Header Icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30">
              <WifiOff className="w-10 h-10 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
            </span>
          </div>
        </div>

        {/* Title & Description in Bengali */}
        <div className="text-center space-y-2 mb-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            ইন্টারনেট বা সার্ভার সংযোগ সাময়িক বিচ্ছিন্ন
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            লাইভ সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি। তবে কোনো চিন্তা নেই — আপনি অ্যাপের সকল মূল ফিচার অফলাইনে ব্যবহার করতে পারবেন।
          </p>
        </div>

        {/* Features available offline */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 mb-6 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            অফলাইনে যা যা সচল থাকবে:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
              <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>বিগত বছরের প্রশ্নব্যাংক</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
              <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>টাইমারসহ পূর্ণাঙ্গ মক টেস্ট</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
              <Bookmark className="w-4 h-4 text-amber-500 shrink-0" />
              <span>বুকমার্ক ও ভুল খাতা</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
              <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
              <span>ফর্মুলা ও শর্টকাট নোটস</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">
            * ইন্টারনেট পুনরায় পেলে আপনার পরীক্ষা ও অগ্রগতি স্বয়ংক্রিয়ভাবে ক্লাউডে সিঙ্ক হয়ে যাবে।
          </p>
        </div>

        {retryFailed && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 text-center font-medium">
            পুনরায় সংযোগ ব্যর্থ হয়েছে। অনুগ্রহ করে নেটওয়ার্ক চেক করুন অথবা অফলাইনে চালিয়ে যান।
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onContinueOffline}
            className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <span>অফলাইনে চালিয়ে যান</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleRetryClick}
            disabled={isReconnecting}
            className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin text-indigo-500' : ''}`} />
            <span>{isReconnecting ? 'চেষ্টা করা হচ্ছে...' : 'পুনরায় চেষ্টা'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
