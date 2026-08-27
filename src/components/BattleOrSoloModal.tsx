import React from 'react';
import { Swords, Zap, X, Shield, Users, Clock, Award, Sparkles, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BattleOrSoloModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectName: string;
  chapterTitle: string;
  questionCount?: number;
  onSelectSolo: () => void;
  onSelectBattle: () => void;
}

export const BattleOrSoloModal: React.FC<BattleOrSoloModalProps> = ({
  isOpen,
  onClose,
  subjectName,
  chapterTitle,
  questionCount = 15,
  onSelectSolo,
  onSelectBattle,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
        {/* Backdrop Click */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 w-full max-w-md bg-[#09111E] text-slate-100 rounded-t-3xl sm:rounded-3xl border border-emerald-500/20 shadow-2xl overflow-hidden p-5 sm:p-6"
        >
          {/* Top Decorative Glow */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer"
            aria-label="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Chapter & Subject Tag */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{subjectName}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight line-clamp-1">
              {chapterTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              প্র্যাকটিস করার মোড নির্বাচন করুন
            </p>
          </div>

          {/* 2 Options Cards: Battle vs Solo Practice */}
          <div className="space-y-3.5">
            {/* 1. Live Battle Mode Option */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onClose();
                onSelectBattle();
              }}
              className="w-full text-left p-4 rounded-2xl bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-purple-900/40 border border-purple-500/40 hover:border-purple-400 shadow-lg shadow-purple-950/30 transition-all cursor-pointer relative overflow-hidden group"
            >
              {/* Corner Badge */}
              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-purple-500 text-white text-[10px] font-extrabold uppercase rounded-full shadow-xs tracking-wider">
                Live 1v1
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0 group-hover:scale-110 transition-transform">
                  <Swords className="w-6 h-6 text-purple-400 animate-pulse" />
                </div>
                <div className="flex-1 pr-12">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-extrabold text-white text-base">
                      ব্যাটেল (প্রতিযোগিতা করো)
                    </h4>
                  </div>
                  <p className="text-xs text-purple-200/80 mt-1 leading-relaxed">
                    অন্যান্য শিক্ষার্থীদের সাথে লাইভ ১v১ MCQ লড়াই, রিয়েল-টাইম স্কোর ও র‍্যাঙ্কিং।
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-purple-300/90 font-medium">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> মাল্টিপ্লেয়ার
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3" /> +50 XP বোনাস
                    </span>
                  </div>
                </div>
              </div>
            </motion.button>

            {/* 2. Quick Practice (Solo) Option */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onClose();
                onSelectSolo();
              }}
              className="w-full text-left p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-teal-950/60 to-emerald-900/40 border border-emerald-500/40 hover:border-emerald-400 shadow-lg shadow-emerald-950/30 transition-all cursor-pointer relative overflow-hidden group"
            >
              {/* Corner Badge */}
              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-extrabold uppercase rounded-full shadow-xs tracking-wider">
                Solo Mode
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-emerald-400 fill-emerald-400/30" />
                </div>
                <div className="flex-1 pr-12">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-extrabold text-white text-base">
                      দ্রুত প্র্যাকটিস (নিজে একা করো)
                    </h4>
                  </div>
                  <p className="text-xs text-emerald-200/80 mt-1 leading-relaxed">
                    নিজের গতিতে একা একা প্রশ্ন সমাধান, তাৎক্ষণিক নির্ভুল ব্যাখ্যা ও প্রস্তুতি।
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-emerald-300/90 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> কোনো চাপ নেই
                    </span>
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> {questionCount}টি প্রশ্ন
                    </span>
                  </div>
                </div>
              </div>
            </motion.button>
          </div>

          {/* Quick Dismiss Footer */}
          <div className="mt-5 text-center">
            <button
              onClick={onClose}
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer"
            >
              বাতিল করো
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
