import React, { useState, useEffect } from 'react';
import { X, Star, Bookmark, Flag, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Question } from '../../types';
import { MathText } from '../../components/MathText';
import { MascotIllustration } from './components/MascotIllustration';

interface QuickPracticeQuizProps {
  chapterTitle: string;
  subjectName: string;
  questions: Question[];
  onFinishQuiz: (results: {
    totalAnswered: number;
    correctCount: number;
    wrongCount: number;
    pointsEarned: number;
    avgTimeSeconds: number;
    accuracy: number;
    wrongQuestionIds: string[];
  }) => void;
  onExit: () => void;
  onBookmarkQuestion?: (qId: string) => void;
  bookmarkedIds?: string[];
}

export const QuickPracticeQuiz: React.FC<QuickPracticeQuizProps> = ({
  chapterTitle,
  subjectName,
  questions,
  onFinishQuiz,
  onExit,
  onBookmarkQuestion,
  bookmarkedIds = [],
}) => {
  // Phase 1: Main Set, Phase 2: Review Transition Mascot, Phase 3: Review Mistakes Set
  const [phase, setPhase] = useState<'main' | 'review_intro' | 'review_round'>('main');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [points, setPoints] = useState(0.0);
  const [startTime] = useState<number>(Date.now());

  // Current question interaction states
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isAiExplanationOpen, setIsAiExplanationOpen] = useState(false);

  // Tracking mistakes
  const [mainMistakes, setMainMistakes] = useState<Question[]>([]);
  const [reviewQuestions, setReviewQuestions] = useState<Question[]>([]);
  const [reviewMistakesLeft, setReviewMistakesLeft] = useState<string[]>([]);
  const [totalCorrectAnswers, setTotalCorrectAnswers] = useState(0);

  // AI Feedback ratings
  const [aiFeedback, setAiFeedback] = useState<'up' | 'down' | null>(null);

  const safeQuestions = questions && questions.length > 0 ? questions : [];
  const activeQuestionList = phase === 'main' ? safeQuestions : reviewQuestions;

  if (safeQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 mb-4 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">অনুশীলনের জন্য কোনো প্রশ্ন নেই</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
          এই অধ্যায়ের জন্য ডেটাবেজে এখনও কোনো প্রশ্ন যুক্ত করা হয়নি।
        </p>
        <button
          type="button"
          onClick={onExit}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-sm"
        >
          ফিরে যান
        </button>
      </div>
    );
  }

  const currentQ = activeQuestionList[currentIndex] || safeQuestions[0];
  const isLastQuestion = currentIndex === activeQuestionList.length - 1;

  const isCurrentCorrect = selectedOption && currentQ && currentQ.correct_ans === selectedOption;

  // Calculate Progress Percent for top bar
  const progressPercent = activeQuestionList.length > 0
    ? ((currentIndex + (isAnswerSubmitted ? 1 : 0)) / activeQuestionList.length) * 100
    : 0;

  // Handle Option Click
  const handleSelectOption = (opt: 'A' | 'B' | 'C' | 'D') => {
    if (isAnswerSubmitted) return; // Locked once answered

    setSelectedOption(opt);
    setIsAnswerSubmitted(true);

    const isCorrect = currentQ.correct_ans === opt;
    if (isCorrect) {
      setPoints((prev) => +(prev + 2).toFixed(2));
      setTotalCorrectAnswers((prev) => prev + 1);
    } else {
      if (phase === 'main') {
        setMainMistakes((prev) => [...prev, currentQ]);
      }
    }
  };

  // Move to next question or transition to Review Round
  const handleNextOrFinish = () => {
    if (!isLastQuestion) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setIsAiExplanationOpen(false);
      setAiFeedback(null);
      return;
    }

    // Finished current set
    if (phase === 'main') {
      if (mainMistakes.length > 0) {
        // Automatically start Review Mistakes phase
        setReviewQuestions(mainMistakes);
        setPhase('review_intro');
      } else {
        // Perfect score, no mistakes, finish directly
        finishPracticeSession();
      }
    } else if (phase === 'review_round') {
      // Completed review round -> Finish
      finishPracticeSession();
    }
  };

  const handleStartReviewFromIntro = () => {
    setPhase('review_round');
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setIsAiExplanationOpen(false);
    setAiFeedback(null);
  };

  const handleSkipReview = () => {
    finishPracticeSession();
  };

  const finishPracticeSession = () => {
    const elapsedSeconds = Math.max(5, Math.floor((Date.now() - startTime) / 1000));
    const totalQ = questions.length;
    const avgSec = Math.max(2, Math.floor(elapsedSeconds / Math.max(1, totalQ)));
    const acc = Math.round((totalCorrectAnswers / Math.max(1, totalQ + reviewQuestions.length)) * 100);

    onFinishQuiz({
      totalAnswered: totalQ,
      correctCount: totalCorrectAnswers,
      wrongCount: mainMistakes.length,
      pointsEarned: points,
      avgTimeSeconds: avgSec,
      accuracy: acc,
      wrongQuestionIds: mainMistakes.map((q) => q.id),
    });
  };

  // Render Review Intro Page (Step 6 mascot screen)
  if (phase === 'review_intro') {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-slate-900 pb-20 flex flex-col justify-between p-4 max-w-lg mx-auto select-none">
        {/* Top bar with close */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onExit}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1 font-bold text-amber-500 text-sm">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>{points.toFixed(2)}</span>
          </div>
        </div>

        {/* Center Mascot with Red Mistake Icon */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
          <div className="w-52 h-44 flex items-center justify-center">
            <MascotIllustration mood="sad_sign" className="w-full h-full" />
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
            পূর্বের ভুলগুলো রিভিউ করো
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
            যে {mainMistakes.length}টি প্রশ্ন তোমার ভুল হয়েছিল, সেগুলো আবার সঠিক করে অতিরিক্ত পয়েন্ট অর্জন করো!
          </p>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-3">
          <button
            onClick={handleStartReviewFromIntro}
            className="w-full py-3.5 bg-[#2e7d32] hover:bg-[#1b5e20] text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] cursor-pointer"
          >
            রিভিউ শুরু করো
          </button>
          <button
            onClick={handleSkipReview}
            className="w-full py-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold text-sm cursor-pointer"
          >
            স্কিপ করো
          </button>
        </div>
      </div>
    );
  }

  const isBookmarked = bookmarkedIds.includes(currentQ.id);

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-slate-900 pb-36 flex flex-col justify-between select-none max-w-lg mx-auto">
      {/* 1. Top Bar: Exit + Horizontal Progress Bar + Star Points */}
      <div className="sticky top-0 z-30 bg-[#F8FAFC] dark:bg-slate-900 px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="বেরিয়ে যান"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Progress Bar in middle */}
          <div className="flex-1 bg-slate-200 dark:bg-slate-750 h-2 rounded-full overflow-hidden">
            <motion.div
              className="bg-[#2e7d32] dark:bg-emerald-500 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Star Point Counter on right */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 rounded-full shrink-0 font-bold text-xs text-amber-700 dark:text-amber-300 font-mono">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{points.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Question Area */}
      <div className="flex-1 px-4 pt-4 space-y-4">
        {/* Phase Badge if in review round */}
        {phase === 'review_round' && (
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded text-xs font-bold">
            <span>✕</span>
            <span>পূর্বের ভুল</span>
          </div>
        )}

        {/* Question Text */}
        <div className="text-slate-900 dark:text-slate-100 font-bold text-base sm:text-lg leading-relaxed pt-1">
          <MathText text={currentQ.question_text} />
          {currentQ.math_formula_latex && (
            <div className="mt-2 text-indigo-900 dark:text-indigo-300 font-serif">
              <MathText text={currentQ.math_formula_latex} />
            </div>
          )}
        </div>

        {/* 4 Options Grid (Full-width rounded rectangles, no radio) */}
        <div className="space-y-2.5 pt-2">
          {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
            const optText = currentQ.options ? currentQ.options[optKey] : '';
            if (!optText) return null;

            const isSelected = selectedOption === optKey;
            const isCorrect = currentQ.correct_ans === optKey;

            let optionStyle =
              'bg-white dark:bg-slate-800 border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600';

            if (isAnswerSubmitted) {
              if (isSelected && isCorrect) {
                // Correctly selected option (Green)
                optionStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-[#2e7d32] dark:border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold';
              } else if (isSelected && !isCorrect) {
                // Wrongly selected option (Red)
                optionStyle = 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-950 dark:text-rose-200 font-bold';
              } else if (!isSelected && isCorrect) {
                // Revealed correct answer (Green)
                optionStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-[#2e7d32] dark:border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold';
              } else {
                optionStyle = 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 opacity-60 text-slate-500';
              }
            }

            return (
              <button
                key={optKey}
                onClick={() => handleSelectOption(optKey)}
                disabled={isAnswerSubmitted}
                className={`w-full p-3.5 rounded-xl border text-left text-sm sm:text-base font-medium transition-all shadow-2xs cursor-pointer select-none ${optionStyle}`}
              >
                <MathText text={optText} />
              </button>
            );
          })}
        </div>

        {/* Source Badge & Report Button */}
        {isAnswerSubmitted && (
          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 font-bold">
                {currentQ.chapter_name || 'DB 16'}
              </span>
            </div>
            <button
              onClick={() => alert('প্রশ্নটি পর্যালোচনার জন্য চিহ্নিত করা হয়েছে।')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 3. Explanation / AI Explanation Accordion */}
        {isAnswerSubmitted && (
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 rounded-xl overflow-hidden shadow-2xs mt-3">
            <button
              onClick={() => setIsAiExplanationOpen(!isAiExplanationOpen)}
              className="w-full flex items-center justify-between p-3.5 text-left text-[#2e7d32] dark:text-emerald-400 font-bold text-sm cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>ব্যাখ্যা / AI সমাধান</span>
              </span>
              {isAiExplanationOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isAiExplanationOpen && (
              <div className="px-3.5 pb-4 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-2.5 leading-relaxed">
                <div>
                  <MathText
                    text={
                      currentQ.explanation ||
                      `সঠিক উত্তরটি হলো ${currentQ.correct_ans}। এই সংক্রান্ত সূত্র ও বিস্তারিত মান পর্যালোচনা করুন।`
                    }
                  />
                </div>

                {/* Feedback Buttons */}
                <div className="flex items-center gap-3 pt-2 border-t border-emerald-200/40 dark:border-emerald-800/40 text-xs text-slate-500 dark:text-slate-400">
                  <span>ব্যাখ্যাটি কি সহায়ক ছিল?</span>
                  <button
                    onClick={() => setAiFeedback('up')}
                    className={`p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900 cursor-pointer ${
                      aiFeedback === 'up' ? 'text-emerald-700 dark:text-emerald-300 font-bold' : ''
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setAiFeedback('down')}
                    className={`p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900 cursor-pointer ${
                      aiFeedback === 'down' ? 'text-rose-600 font-bold' : ''
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Bottom Snackbar Panel (Green for Correct, Red for Wrong) */}
      <AnimatePresence>
        {isAnswerSubmitted && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`fixed bottom-0 left-0 right-0 z-40 border-t p-4 pb-6 shadow-2xl backdrop-blur-md ${
              isCurrentCorrect
                ? 'bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50/95 dark:bg-rose-950/95 border-rose-300 dark:border-rose-800'
            }`}
          >
            <div className="max-w-lg mx-auto space-y-3">
              {/* Mascot peek animation on correct answer */}
              {isCurrentCorrect && (
                <div className="flex justify-center -mt-10 pointer-events-none">
                  <div className="w-16 h-12">
                    <MascotIllustration mood="celebrate" className="w-full h-full" />
                  </div>
                </div>
              )}

              {/* Status Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-sm sm:text-base">
                  {isCurrentCorrect ? (
                    <span className="text-[#2e7d32] dark:text-emerald-400 flex items-center gap-1.5">
                      <span>✓</span>
                      <span>উত্তরটি সঠিক</span>
                    </span>
                  ) : (
                    <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <span>✕</span>
                      <span>দুঃখিত! উত্তরটি ভুল হয়েছে</span>
                    </span>
                  )}
                </div>

                {/* Point Pill */}
                <div
                  className={`px-3 py-1 rounded-full text-xs font-black ${
                    isCurrentCorrect
                      ? 'bg-[#2e7d32] text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {isCurrentCorrect ? '+২ পয়েন্ট' : '+০ পয়েন্ট'}
                </div>
              </div>

              {/* Action Buttons: Next/Finish + Bookmark Button */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleNextOrFinish}
                  className={`flex-1 py-3.5 rounded-xl font-bold text-white shadow-md transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5 ${
                    isCurrentCorrect
                      ? 'bg-[#2e7d32] hover:bg-[#1b5e20]'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <span>{isLastQuestion ? 'শেষ করো' : 'পরের প্রশ্ন'}</span>
                  <span>→</span>
                </button>

                {onBookmarkQuestion && (
                  <button
                    onClick={() => onBookmarkQuestion(currentQ.id)}
                    className={`p-3.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                      isBookmarked
                        ? 'bg-amber-100 border-amber-400 text-amber-800'
                        : isCurrentCorrect
                        ? 'bg-emerald-100/70 border-emerald-300 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                        : 'bg-rose-100/70 border-rose-300 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                    }`}
                    title="বুকমার্ক করুন"
                  >
                    <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
