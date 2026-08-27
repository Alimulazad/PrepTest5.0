import React from 'react';
import { MascotIllustration } from './components/MascotIllustration';
import { ExamSessionResult } from './types';

interface ExamResultMascotPageProps {
  result: ExamSessionResult;
  onNext: () => void;
}

export const ExamResultMascotPage: React.FC<ExamResultMascotPageProps> = ({
  result,
  onNext,
}) => {
  const percentage = (result.score / Math.max(1, result.totalMarks)) * 100;

  let headline = 'বুঝে নাও';
  let subheadline = 'বেশি কথা বলতে চাচ্ছি না';
  let mood: 'scared' | 'sad_sign' | 'celebrate' | 'thinking' = 'sad_sign';

  if (percentage < 20) {
    headline = 'আমার স্বপ্নগুলো';
    subheadline = 'দুঃস্বপ্ন হয়ে ভেসে আসছে!';
    mood = 'scared';
  } else if (percentage < 50) {
    headline = 'বুঝে নাও';
    subheadline = 'বেশি কথা বলতে চাচ্ছি না';
    mood = 'sad_sign';
  } else if (percentage < 80) {
    headline = 'বেশ ভালো করেছো!';
    subheadline = 'আরেকটু চেষ্টা করলেই শীর্ষে থাকবে!';
    mood = 'thinking';
  } else {
    headline = 'অসাধারণ পারফরম্যান্স!';
    subheadline = 'তুমি তো আগুন লাগিয়ে দিয়েছো!';
    mood = 'celebrate';
  }

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-slate-900 pb-32 flex flex-col justify-between p-4 max-w-xl mx-auto">
      <div className="space-y-6 pt-4 flex-1 flex flex-col items-center justify-center">
        {/* Mascot Illustration Matching Screenshots */}
        <div className="w-64 h-56 flex items-center justify-center">
          <MascotIllustration mood={mood} className="w-full h-full" />
        </div>

        {/* Dynamic Emotional Bengali Headline Matching Screenshots */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {headline}
          </h2>
          <p className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400">
            {subheadline}
          </p>
        </div>

        {/* 3 Color-Coded Stat Cards Matching Screenshots */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-md pt-2">
          {/* Card 1: পয়েন্ট (Yellow Top) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs text-center flex flex-col">
            <div className="bg-amber-500 text-white font-black text-xs py-1">
              পয়েন্ট
            </div>
            <div className="p-3 font-black text-slate-900 dark:text-slate-100 text-lg sm:text-xl flex items-center justify-center gap-1">
              <span className="text-amber-500 text-base">★</span>
              <span>{result.pointsEarned}</span>
            </div>
          </div>

          {/* Card 2: মার্কস (Green Top) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs text-center flex flex-col">
            <div className="bg-emerald-600 text-white font-black text-xs py-1">
              মার্কস
            </div>
            <div className="p-3 font-black text-slate-900 dark:text-slate-100 text-base sm:text-lg flex items-center justify-center">
              <span>{result.score.toFixed(1)}</span>
              <span className="text-slate-400 dark:text-slate-500 font-bold text-xs ml-1">/ {result.totalMarks}</span>
            </div>
          </div>

          {/* Card 3: সময় (Cyan Top) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs text-center flex flex-col">
            <div className="bg-sky-500 text-white font-black text-xs py-1">
              সময়
            </div>
            <div className="p-3 font-black text-slate-900 dark:text-slate-100 text-base sm:text-lg flex items-center justify-center">
              <span>{Math.floor(result.timeTakenSeconds / 60)}</span>
              <span className="text-slate-500 dark:text-slate-400 font-bold text-xs ml-1">মিনিট</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Button Matching Screenshots */}
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
