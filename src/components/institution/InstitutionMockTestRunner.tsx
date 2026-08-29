import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Share2,
  RotateCcw,
  Sparkles,
  Zap,
  TrendingUp,
  Flame,
} from 'lucide-react';
import { Question } from '../../types';
import MathText from '../MathText';

interface InstitutionMockTestRunnerProps {
  examTitle: string;
  institutionName: string;
  questions: Question[];
  durationMinutes: number;
  onExit: () => void;
  onRestart: () => void;
}

const toBengaliNumber = (num: number | string): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
};

export const InstitutionMockTestRunner: React.FC<InstitutionMockTestRunnerProps> = ({
  examTitle,
  institutionName,
  questions,
  durationMinutes,
  onExit,
  onRestart,
}) => {
  const [currentStage, setCurrentStage] = useState<'running' | 'scorecard' | 'review'>('running');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string, boolean>>({});
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped'>('all');

  // Active Timer
  useEffect(() => {
    if (currentStage !== 'running') return;
    if (timeLeft <= 0) {
      setCurrentStage('scorecard');
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCurrentStage('scorecard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStage, timeLeft]);

  const handleSelectOption = (questionId: string, optionKey: string) => {
    if (currentStage !== 'running') return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: prev[questionId] === optionKey ? '' : optionKey,
    }));
  };

  const answeredCount = Object.values(selectedAnswers).filter(Boolean).length;
  const totalCount = questions.length;

  // Calculate results
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  questions.forEach((q) => {
    const userAns = selectedAnswers[q.id];
    if (!userAns) {
      skippedCount++;
    } else if (userAns === q.correct_ans) {
      correctCount++;
    } else {
      wrongCount++;
    }
  });

  const totalScore = correctCount * 1 - wrongCount * 0.25;
  const earnedPoints = Math.max(0, correctCount * 1.5 - wrongCount * 0.5);
  const timeTakenSeconds = durationMinutes * 60 - timeLeft;
  const timeTakenMinutes = Math.floor(timeTakenSeconds / 60);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${toBengaliNumber(mins.toString().padStart(2, '0'))}:${toBengaliNumber(secs.toString().padStart(2, '0'))}`;
  };

  const toggleExplanation = (qId: string) => {
    setExpandedExplanations((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const toggleBookmark = (qId: string) => {
    setBookmarkedIds((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const optionLabels: Record<string, string> = {
    A: 'ক',
    B: 'খ',
    C: 'গ',
    D: 'ঘ',
  };

  // 1. RUNNING TEST STAGE
  if (currentStage === 'running') {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in pb-24">
        {/* Top Floating App Bar */}
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (answeredCount > 0) {
                  setShowConfirmSubmit(true);
                } else {
                  onExit();
                }
              }}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {institutionName} • মক পরীক্ষা
              </span>
              <h2 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base truncate max-w-xs sm:max-w-md">
                {examTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-bold font-mono">
              <Clock className="w-4 h-4 animate-pulse text-amber-600 dark:text-amber-400" />
              <span>{formatTimer(timeLeft)}</span>
            </div>
          </div>
        </div>

        {/* Question Cards List */}
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const isAnswered = !!selectedAnswers[q.id];
            return (
              <div
                key={q.id}
                id={`exam-q-${q.id}`}
                className={`bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border transition-all shadow-xs ${
                  isAnswered
                    ? 'border-blue-300 dark:border-blue-800/80 ring-1 ring-blue-500/20'
                    : 'border-slate-200/80 dark:border-slate-700/80'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-black font-mono flex items-center justify-center border border-blue-200 dark:border-blue-800/80">
                      {toBengaliNumber(idx + 1)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {q.subject_name || 'সাধারণ প্রশ্ন'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-mono">
                    ১ নম্বর
                  </span>
                </div>

                {/* Question Prompt */}
                <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed mb-4">
                  <MathText text={q.question_text} />
                </div>

                {/* Option Choices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(q.options).map(([optKey, optVal]) => {
                    const isSelected = selectedAnswers[q.id] === optKey;
                    return (
                      <button
                        key={optKey}
                        onClick={() => handleSelectOption(q.id, optKey)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 text-xs sm:text-sm cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 dark:border-blue-500 text-blue-950 dark:text-blue-100 font-semibold shadow-xs ring-1 ring-blue-500/20'
                            : 'bg-slate-50/70 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 font-mono ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {optionLabels[optKey] || optKey}
                        </span>
                        <div className="flex-1 pt-0.5">
                          <MathText text={optVal} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Sticky Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 sm:p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                উত্তর প্রদান:
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-bold font-mono">
                {toBengaliNumber(answeredCount)} / {toBengaliNumber(totalCount)}
              </span>
            </div>

            <button
              onClick={() => setShowConfirmSubmit(true)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>সাবমিট করো</span>
            </button>
          </div>
        </div>

        {/* Confirmation Modal Matching Video */}
        {showConfirmSubmit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-700 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  নিশ্চিত হও
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  তুমি কি পরীক্ষাটি সাবমিট করতে চাও?
                </p>
                <div className="mt-3 inline-block px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300">
                  উত্তর দিয়েছেন: {toBengaliNumber(answeredCount)} / {toBengaliNumber(totalCount)} টি
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmSubmit(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm cursor-pointer transition-colors"
                >
                  না
                </button>
                <button
                  onClick={() => {
                    setShowConfirmSubmit(false);
                    setCurrentStage('scorecard');
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md cursor-pointer transition-all active:scale-95"
                >
                  সাবমিট করো
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. SCORECARD STAGE (Matching Video Frames 02:11 - 02:23)
  if (currentStage === 'scorecard') {
    return (
      <div className="max-w-md mx-auto space-y-4 animate-in fade-in py-2 pb-24">
        {/* Top 3 Score Pill Boxes */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Points */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-3 text-center shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider block opacity-90">
              পয়েন্ট
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono mt-0.5 flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4 fill-white" />
              <span>{toBengaliNumber(earnedPoints.toFixed(1))}</span>
            </div>
          </div>

          {/* Marks */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-3 text-center shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider block opacity-90">
              মার্কস
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono mt-0.5">
              {toBengaliNumber(correctCount)} / {toBengaliNumber(totalCount)}
            </div>
          </div>

          {/* Time */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-3 text-center shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider block opacity-90">
              সময়
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono mt-0.5">
              {toBengaliNumber(Math.max(1, timeTakenMinutes))} মি.
            </div>
          </div>
        </div>

        {/* Emotion / Mascot Message Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-sm text-center space-y-3">
          {/* Animated Mascot Illustration */}
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
              <Flame className="w-10 h-10 fill-rose-500 animate-bounce" />
            </div>
          </div>

          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base leading-snug">
              {correctCount > totalCount / 2
                ? 'দারুণ ফলাফল! তোমার প্রস্তুতি চমৎকার দিকে এগোচ্ছে!'
                : 'দুঃখ ভরা জীবন আমার, তোমার ভালো পয়েন্ট এর দেখা পাই না'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              সঠিক উত্তর: {toBengaliNumber(correctCount)} • ভুল উত্তর: {toBengaliNumber(wrongCount)} • ছেড়ে দিয়েছো: {toBengaliNumber(skippedCount)}
            </p>
          </div>
        </div>

        {/* Tier Standing & Progress Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">
                  বর্তমান টায়ার
                </span>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                  আয়রন (Iron Tier)
                </span>
              </div>
            </div>
            <span className="text-xs font-bold font-mono px-2.5 py-1 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-800">
              ৪৯.৫ পয়েন্ট
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full w-[49.5%]" />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>০ পয়েন্ট</span>
              <span>পরবর্তী টায়ার: ১০০ পয়েন্ট</span>
            </div>
          </div>

          {/* Mini Leaderboard List Matching Video Frame 02:22 */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>লিডারবোর্ড অবস্থান</span>
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            </div>

            {/* Current User Highlighted */}
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 text-center text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                  ১০৪৮
                </span>
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  A
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    Alimul Azad (তুমি)
                  </span>
                  <span className="text-[10px] text-slate-500">32 FT</span>
                </div>
              </div>
              <span className="text-xs font-black text-blue-700 dark:text-blue-300 font-mono">
                ৪৯.৫ পয়েন্ট
              </span>
            </div>

            {/* Other peers */}
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-700/30 flex items-center justify-between text-xs opacity-75">
              <div className="flex items-center gap-2">
                <span className="w-6 text-center font-mono text-slate-400">১০৪৯</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">Bad Boy</span>
              </div>
              <span className="font-mono font-bold text-slate-600 dark:text-slate-400">৪৯.০ পয়েন্ট</span>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-700/30 flex items-center justify-between text-xs opacity-75">
              <div className="flex items-center gap-2">
                <span className="w-6 text-center font-mono text-slate-400">১০৫০</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">Abusadat Sayem</span>
              </div>
              <span className="font-mono font-bold text-slate-600 dark:text-slate-400">৪৯.০ পয়েন্ট</span>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Action Button "এগিয়ে যাও" */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 sm:p-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <button
              onClick={onRestart}
              className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
              title="পুনরায় প্র্যাকটিস"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentStage('review')}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer text-center"
            >
              এগিয়ে যাও (বিশ্লেষণ ও সমাধান দেখুন)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. DETAILED REVIEW & SOLUTIONS STAGE (Matching Video Frames 02:24 - 02:28)
  const filteredQuestions = questions.filter((q) => {
    const userAns = selectedAnswers[q.id];
    if (reviewFilter === 'correct') return userAns === q.correct_ans;
    if (reviewFilter === 'wrong') return userAns && userAns !== q.correct_ans;
    if (reviewFilter === 'skipped') return !userAns;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in pb-24">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentStage('scorecard')}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
              প্রশ্ন সমাধান ও বিশ্লেষণ
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              মোট প্রশ্ন: {toBengaliNumber(totalCount)} • প্রাপ্ত নম্বর: {toBengaliNumber(totalScore.toFixed(2))}
            </p>
          </div>
        </div>

        <button
          onClick={onExit}
          className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          ড্যাশবোর্ড
        </button>
      </div>

      {/* Filter Status Pills Matching Video */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setReviewFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            reviewFilter === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          সকল ({toBengaliNumber(totalCount)})
        </button>
        <button
          onClick={() => setReviewFilter('correct')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            reviewFilter === 'correct'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{toBengaliNumber(correctCount)} সঠিক</span>
        </button>
        <button
          onClick={() => setReviewFilter('wrong')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            reviewFilter === 'wrong'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>{toBengaliNumber(wrongCount)} ভুল</span>
        </button>
        <button
          onClick={() => setReviewFilter('skipped')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            reviewFilter === 'skipped'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{toBengaliNumber(skippedCount)} স্কিপ</span>
        </button>
      </div>

      {/* Questions Solution List */}
      <div className="space-y-4">
        {filteredQuestions.map((q, idx) => {
          const userAns = selectedAnswers[q.id];
          const isCorrect = userAns === q.correct_ans;
          const isSkipped = !userAns;
          const isExpanded = !!expandedExplanations[q.id];
          const isBookmarked = !!bookmarkedIds[q.id];

          return (
            <div
              key={q.id}
              className={`bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border transition-all shadow-xs ${
                isCorrect
                  ? 'border-emerald-200 dark:border-emerald-900/60 ring-1 ring-emerald-500/20'
                  : isSkipped
                  ? 'border-slate-200 dark:border-slate-700'
                  : 'border-rose-200 dark:border-rose-900/60 ring-1 ring-rose-500/20'
              }`}
            >
              {/* Question Header Status */}
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black font-mono flex items-center justify-center">
                    {toBengaliNumber(idx + 1)}
                  </span>
                  {isCorrect && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                      সঠিক উত্তর
                    </span>
                  )}
                  {!isCorrect && !isSkipped && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                      ভুল উত্তর
                    </span>
                  )}
                  {isSkipped && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                      উত্তর করোনি
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Tag Pill Matching Video */}
                  {q.tags && q.tags[0] && (
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {q.tags[0]}
                    </span>
                  )}
                  <button
                    onClick={() => toggleBookmark(q.id)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isBookmarked
                        ? 'text-amber-500 bg-amber-50 dark:bg-amber-950'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed mb-4">
                <MathText text={q.question_text} />
              </div>

              {/* Options Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                {Object.entries(q.options).map(([optKey, optVal]) => {
                  const isUserChosen = userAns === optKey;
                  const isRightAns = q.correct_ans === optKey;

                  let cardStyle = 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300';
                  let badgeStyle = 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300';

                  if (isRightAns) {
                    cardStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold';
                    badgeStyle = 'bg-emerald-600 text-white';
                  } else if (isUserChosen && !isRightAns) {
                    cardStyle = 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-950 dark:text-rose-100 font-bold';
                    badgeStyle = 'bg-rose-600 text-white';
                  }

                  return (
                    <div
                      key={optKey}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs sm:text-sm ${cardStyle}`}
                    >
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 font-mono ${badgeStyle}`}>
                        {optionLabels[optKey] || optKey}
                      </span>
                      <div className="flex-1 pt-0.5">
                        <MathText text={optVal} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Collapsible Explanation Accordion Matching Video */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  onClick={() => toggleExplanation(q.id)}
                  className="w-full flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>ব্যাখ্যা {isExpanded ? 'লুকান' : 'দেখুন'}</span>
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {isExpanded && (
                  <div className="mt-2 p-3 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-2 animate-in fade-in">
                    <div className="font-semibold text-blue-950 dark:text-blue-200">
                      সঠিক উত্তর: {optionLabels[q.correct_ans] || q.correct_ans}
                    </div>
                    <MathText text={q.explanation || 'এই প্রশ্নের জন্য বিস্তারিত ব্যাখ্যা শীঘ্রই যুক্ত করা হবে।'} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InstitutionMockTestRunner;
