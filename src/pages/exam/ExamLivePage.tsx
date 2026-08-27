import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, LayoutGrid, CheckCircle2, Clock, AlertTriangle, X } from 'lucide-react';
import { Question } from '../../types';
import { MathText } from '../../components/MathText';
import { OptimizedImage } from '../../components/common/OptimizedImage';

interface ExamLivePageProps {
  title: string;
  durationMinutes: number;
  questions: Question[];
  onFinishExam: (answers: Record<string, 'A' | 'B' | 'C' | 'D'>, timeTakenSeconds: number) => void;
  onExit: () => void;
}

const OPTION_LETTER_MAP: Record<'A' | 'B' | 'C' | 'D', string> = {
  A: 'ক',
  B: 'খ',
  C: 'গ',
  D: 'ঘ',
};

const OPTION_KEYS: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

const STORAGE_KEY = 'jachai_active_live_exam_v1';

const toBnNum = (n: number | string): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(n).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
};

// Memoized individual question item to prevent re-rendering unaffected questions
interface ExamLiveQuestionItemProps {
  question: Question;
  displayIndex: number;
  selectedOption?: 'A' | 'B' | 'C' | 'D';
  onSelectAnswer: (qId: string, opt: 'A' | 'B' | 'C' | 'D') => void;
}

const ExamLiveQuestionItemComponent: React.FC<ExamLiveQuestionItemProps> = ({
  question,
  displayIndex,
  selectedOption,
  onSelectAnswer,
}) => {
  return (
    <div
      id={`question-${question.id}`}
      className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3.5 scroll-mt-24"
    >
      {/* Question Header & Point pill */}
      <div className="flex items-start justify-between gap-3">
        <div className="text-slate-900 dark:text-slate-100 font-bold text-sm sm:text-base leading-relaxed flex-1">
          <span className="mr-1 font-mono">{toBnNum(displayIndex)}.</span>
          <MathText text={question.question_text} />
          {question.math_formula_latex && (
            <div className="mt-2 text-indigo-900 dark:text-indigo-300 font-serif">
              <MathText text={question.math_formula_latex} />
            </div>
          )}

          {question.question_image_url && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-1">
              <OptimizedImage
                src={question.question_image_url}
                alt="Question diagram"
                maxWidth={800}
                showPreviewOnClick={true}
                className="max-h-60 w-auto max-w-full rounded-lg object-contain mx-auto"
                containerClassName="flex items-center justify-center min-h-[120px]"
              />
            </div>
          )}
        </div>

        {/* Point Badge */}
        <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 font-mono">
          ১
        </div>
      </div>

      {/* Options Grid */}
      <div className="space-y-2 pt-1">
        {OPTION_KEYS.map((optKey) => {
          const optText = question.options[optKey];
          if (!optText) return null;
          const isSelected = selectedOption === optKey;

          return (
            <button
              key={optKey}
              type="button"
              id={`exam-opt-${question.id}-${optKey}`}
              onClick={() => onSelectAnswer(question.id, optKey)}
              className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-colors duration-150 cursor-pointer select-none ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 shadow-xs text-indigo-950 dark:text-indigo-200 font-bold'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/60 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-medium'
              }`}
            >
              {/* Option letter circle */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors duration-150 ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700'
                }`}
              >
                {OPTION_LETTER_MAP[optKey]}
              </div>

              {/* Option Text */}
              <div className="text-xs sm:text-sm leading-normal flex-1">
                <MathText text={optText} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ExamLiveQuestionItem = React.memo(
  ExamLiveQuestionItemComponent,
  (prevProps, nextProps) =>
    prevProps.question.id === nextProps.question.id &&
    prevProps.question === nextProps.question &&
    prevProps.displayIndex === nextProps.displayIndex &&
    prevProps.selectedOption === nextProps.selectedOption &&
    prevProps.onSelectAnswer === nextProps.onSelectAnswer
);

export const ExamLivePage: React.FC<ExamLivePageProps> = ({
  title,
  durationMinutes,
  questions,
  onFinishExam,
  onExit,
}) => {
  // Load initial state from localStorage if available and matching questions
  const getInitialExamState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const currentQIds = questions.map((q) => q.id).join(',');
        const savedQIds = (parsed.questionIds || []).join(',');
        if (currentQIds === savedQIds && parsed.answers) {
          const elapsed = Math.floor((Date.now() - (parsed.savedAt || Date.now())) / 1000);
          const remaining = Math.max(5, (parsed.secondsRemaining ?? durationMinutes * 60) - elapsed);
          return {
            initialAnswers: parsed.answers as Record<string, 'A' | 'B' | 'C' | 'D'>,
            initialSeconds: remaining,
          };
        }
      }
    } catch (e) {
      console.warn('Could not parse saved exam state:', e);
    }
    return {
      initialAnswers: {},
      initialSeconds: durationMinutes * 60,
    };
  };

  const initialConfig = getInitialExamState();
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialConfig.initialSeconds);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>(initialConfig.initialAnswers);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [showNavigator, setShowNavigator] = useState<boolean>(false);

  // Clear persisted exam state helper
  const clearExamStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear exam storage:', e);
    }
  }, []);

  // Save state continuously to localStorage
  useEffect(() => {
    try {
      const payload = {
        title,
        questionIds: questions.map((q) => q.id),
        answers,
        secondsRemaining,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to save exam state:', err);
    }
  }, [answers, secondsRemaining, title, questions]);

  // Prevent accidental page reload or closing tab while exam is in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'আপনার চলমান পরীক্ষা বন্ধ হয়ে যাবে। আপনি কি নিশ্চিত?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Optimistic synchronous selection with stable callback
  const handleSelectAnswer = useCallback((qId: string, opt: 'A' | 'B' | 'C' | 'D') => {
    setAnswers((prev) => {
      if (prev[qId] === opt) {
        // Unselect if tapped again
        const copy = { ...prev };
        delete copy[qId];
        return copy;
      }
      return { ...prev, [qId]: opt };
    });
  }, []);

  const answeredCount = Object.keys(answers).length;
  const isTimeWarning = secondsRemaining <= 300; // Under 5 minutes
  const isTimeCritical = secondsRemaining <= 60; // Under 1 minute

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 mb-4 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">কোনো প্রশ্ন পাওয়া যায়নি</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
          এই বিষয়ের জন্য ডেটাবেজে এখনও কোনো প্রশ্ন যুক্ত করা হয়নি।
        </p>
        <button
          type="button"
          onClick={onExit}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-sm"
        >
          ড্যাশবোর্ডে ফিরে যান
        </button>
      </div>
    );
  }

  const handleSubmit = () => {
    clearExamStorage();
    const timeTaken = durationMinutes * 60 - secondsRemaining;
    setShowSubmitModal(false);
    onFinishExam(answers, Math.max(1, timeTaken));
  };

  const handleConfirmExit = () => {
    clearExamStorage();
    setShowExitModal(false);
    onExit();
  };

  const handleScrollToQuestion = (qId: string) => {
    setShowNavigator(false);
    setTimeout(() => {
      const el = document.getElementById(`question-${qId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  // Group questions by subject if multi-subject
  const subjectsMap: Record<string, Question[]> = {};
  questions.forEach((q) => {
    const sName = q.subject_name || 'সাধারণ প্রশ্নাবলী';
    if (!subjectsMap[sName]) subjectsMap[sName] = [];
    subjectsMap[sName].push(q);
  });

  const isMultiSubject = Object.keys(subjectsMap).length > 1;

  let globalIndex = 0;

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-slate-900 pb-32 flex flex-col">
      {/* Top Header Matching Screenshots */}
      <div className="sticky top-0 z-30 bg-[#F8FAFC] dark:bg-slate-900 px-4 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center justify-between relative mb-1">
          <button
            type="button"
            onClick={() => setShowExitModal(true)}
            aria-label="পরীক্ষা থেকে বের হন"
            title="পরীক্ষা থেকে বের হন"
            className="p-1.5 -ml-1 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors duration-150 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {title || 'মক পরীক্ষা'}
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">সময়: {toBnNum(durationMinutes)} মিনিট</p>
          </div>

          <button
            type="button"
            onClick={() => setShowNavigator(true)}
            aria-label="প্রশ্ন নেভিগেটর ওপেন করুন"
            title="প্রশ্ন নেভিগেটর"
            className="p-1.5 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        <p className="text-center text-[11px] font-medium text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          প্রতিটি প্রশ্নের পূর্ণমান প্রশ্নের পাশে লেখা আছে এবং ভুলপ্রতি ০.২৫ মার্ক কাটা যাবে
        </p>
      </div>

      {/* Main Questions List */}
      <div className="p-4 max-w-xl mx-auto w-full space-y-6">
        {Object.entries(subjectsMap).map(([subjName, qList]) => (
          <div key={subjName} className="space-y-4">
            {/* Subject Section Header Band */}
            {isMultiSubject && (
              <div className="bg-slate-200/80 dark:bg-slate-800 px-4 py-2 rounded-xl text-center">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {subjName} ({toBnNum(qList.length)})
                </span>
              </div>
            )}

            {/* Questions in this section */}
            <div className="space-y-5">
              {qList.map((q) => {
                globalIndex += 1;
                return (
                  <ExamLiveQuestionItem
                    key={q.id}
                    question={q}
                    displayIndex={globalIndex}
                    selectedOption={answers[q.id]}
                    onSelectAnswer={handleSelectAnswer}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Bottom Exam Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 text-white px-4 py-3 shadow-2xl transition-colors duration-300 ${
          isTimeCritical
            ? 'bg-rose-700'
            : isTimeWarning
            ? 'bg-amber-700'
            : 'bg-[#047857]'
        }`}
      >
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
          {/* Left Timer with dynamic warning */}
          <div className="flex items-center gap-1.5">
            {isTimeWarning && (
              <AlertTriangle className={`w-4 h-4 ${isTimeCritical ? 'animate-bounce text-yellow-300' : 'text-amber-200'}`} />
            )}
            <div
              className={`font-mono text-base sm:text-lg font-black tracking-wider ${
                isTimeCritical
                  ? 'text-yellow-300 animate-pulse'
                  : isTimeWarning
                  ? 'text-amber-100'
                  : 'text-white'
              }`}
            >
              {formatTimer(secondsRemaining)}
            </div>
          </div>

          {/* Center Question Navigator Trigger */}
          <button
            type="button"
            onClick={() => setShowNavigator(true)}
            aria-label={`প্রশ্ন নেভিগেটর (${toBnNum(answeredCount)} / ${toBnNum(questions.length)})`}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black/20 hover:bg-black/30 text-white text-xs font-bold transition-colors cursor-pointer border border-white/20"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>নেভিগেটর ({toBnNum(answeredCount)}/{toBnNum(questions.length)})</span>
          </button>

          {/* Right Submit Button */}
          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            aria-label="পরীক্ষা সাবমিট করুন"
            className="px-5 py-2 bg-white/20 hover:bg-white/30 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer border border-white/30"
          >
            সাবমিট করো
          </button>
        </div>
      </div>

      {/* Question Navigator Grid Modal / Bottom Drawer */}
      {showNavigator && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl p-5 max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-6 sm:zoom-in-95">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>প্রশ্ন নেভিগেটর</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">যেকোনো প্রশ্নে সরাসরি যেতে নম্বরে ট্যাপ করুন</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNavigator(false)}
                aria-label="নেভিগেটর বন্ধ করুন"
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Answer Summary Stats */}
            <div className="grid grid-cols-2 gap-2 my-3">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 shrink-0" />
                <div className="text-xs">
                  <span className="text-slate-600 dark:text-slate-400 block">উত্তর দেওয়া হয়েছে:</span>
                  <strong className="text-emerald-800 dark:text-emerald-300 font-mono text-sm">{toBnNum(answeredCount)} টি</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                <div className="w-3.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-500 shrink-0" />
                <div className="text-xs">
                  <span className="text-slate-600 dark:text-slate-400 block">বাকি রয়েছে:</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-mono text-sm">{toBnNum(questions.length - answeredCount)} টি</strong>
                </div>
              </div>
            </div>

            {/* Grid of question numbers */}
            <div className="overflow-y-auto max-h-72 p-1">
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = Boolean(answers[q.id]);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleScrollToQuestion(q.id)}
                      aria-label={`প্রশ্ন ${toBnNum(idx + 1)}${isAnswered ? ' (উত্তর দেওয়া হয়েছে)' : ''}`}
                      className={`h-11 rounded-xl text-xs sm:text-sm font-bold font-mono transition-all cursor-pointer flex items-center justify-center border ${
                        isAnswered
                          ? 'bg-[#047857] text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300/40'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      {toBnNum(idx + 1)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowNavigator(false)}
                aria-label="নেভিগেটর বন্ধ করুন"
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal Matching Screenshots */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-800 text-white rounded-2xl p-6 max-w-xs w-full shadow-2xl space-y-4 border border-slate-700 animate-in zoom-in-95">
            <h3 className="font-bold text-lg text-slate-100">নিশ্চিত হও</h3>
            <p className="text-sm text-slate-300">
              তুমি কি সাবমিট করতে চাও? <br />
              <span className="text-xs text-emerald-400 mt-1 block">
                উত্তর দেওয়া হয়েছে: {toBnNum(answeredCount)} / {toBnNum(questions.length)}
              </span>
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                aria-label="না, ফিরে যান"
                className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white rounded-lg cursor-pointer"
              >
                না
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                aria-label="সাবমিট নিশ্চিত করুন"
                className="px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white text-sm font-bold rounded-lg shadow-xs cursor-pointer"
              >
                সাবমিট করো
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-800 text-white rounded-2xl p-6 max-w-xs w-full shadow-2xl space-y-4 border border-slate-700 animate-in zoom-in-95">
            <h3 className="font-bold text-lg text-slate-100">নিশ্চিত হও</h3>
            <p className="text-sm text-slate-300">তুমি কি পরীক্ষা থেকে বের হতে চাও?</p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                aria-label="না, পরীক্ষায় থাকুন"
                className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white rounded-lg cursor-pointer"
              >
                না
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                aria-label="বের হয়ে যান"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg shadow-xs cursor-pointer"
              >
                বের হও
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

