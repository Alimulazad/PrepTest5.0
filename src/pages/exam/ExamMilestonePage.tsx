import React from 'react';
import { MilestoneCloudIcon } from './components/MilestoneCloudIcon';
import { UserProgress } from '../../types';

interface ExamMilestonePageProps {
  progress?: UserProgress;
  onNext: () => void;
}

export const ExamMilestonePage: React.FC<ExamMilestonePageProps> = ({
  progress,
  onNext,
}) => {
  const streak = progress?.streakDays || 1;
  const examsCount = progress?.examsCompleted || 80;
  const correctCount = progress?.totalCorrect || 961;

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-slate-900 pb-32 flex flex-col justify-between p-4 max-w-xl mx-auto">
      <div className="space-y-8 pt-8 flex-1 flex flex-col items-center justify-center">
        {/* Top Orange Lightning Cloud Icon Matching Screenshot */}
        <div className="w-28 h-28 flex items-center justify-center">
          <MilestoneCloudIcon className="w-full h-full" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            তুমি খুব দ্রুত এগিয়ে যাচ্ছো
          </h2>
        </div>

        {/* 3 Progress Bars with Yellow Fill and Pill Indicators */}
        <div className="w-full max-w-md space-y-6 pt-2">
          {/* Milestone 1: 7-Day Streak */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <span>🔥</span>
                ৭ দিনের স্ট্রাইক অর্জন করো
              </span>
            </div>

            {/* Bar */}
            <div className="relative h-6 bg-slate-200 dark:bg-slate-750 rounded-full overflow-visible flex items-center p-1">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(15, (streak / 7) * 100))}%` }}
              />
              <div
                className="absolute right-2 px-2 py-0.5 bg-slate-900/10 dark:bg-slate-100/10 rounded-full text-[11px] font-black text-slate-800 dark:text-slate-200"
              >
                {streak}
              </div>
            </div>
          </div>

          {/* Milestone 2: 100 Exams */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <span>✏️</span>
                ১০০ টি পরীক্ষা দাও
              </span>
            </div>

            {/* Bar */}
            <div className="relative h-6 bg-slate-200 dark:bg-slate-750 rounded-full overflow-visible flex items-center p-1">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(15, (examsCount / 100) * 100))}%` }}
              />
              <div
                className="absolute right-2 px-2 py-0.5 bg-slate-900/10 dark:bg-slate-100/10 rounded-full text-[11px] font-black text-slate-800 dark:text-slate-200"
              >
                {examsCount}
              </div>
            </div>
          </div>

          {/* Milestone 3: 1000 Correct Answers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-black">✓</span>
                ১০০০ টি সঠিক উত্তর দাও
              </span>
            </div>

            {/* Bar */}
            <div className="relative h-6 bg-slate-200 dark:bg-slate-750 rounded-full overflow-visible flex items-center p-1">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(15, (correctCount / 1000) * 100))}%` }}
              />
              <div
                className="absolute right-2 px-2 py-0.5 bg-slate-900/10 dark:bg-slate-100/10 rounded-full text-[11px] font-black text-slate-800 dark:text-slate-200"
              >
                {correctCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Button Matching Screenshot */}
      <div className="w-full pt-4">
        <button
          type="button"
          onClick={onNext}
          className="w-full py-3.5 bg-[#047857] hover:bg-[#065f46] active:bg-[#064e3b] text-white font-bold rounded-xl shadow-md transition-all active:scale-98 cursor-pointer text-base text-center"
        >
          এগিয়ে যাও
        </button>
      </div>
    </div>
  );
};
