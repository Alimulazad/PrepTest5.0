import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Bookmark, Flag, Play, Check } from 'lucide-react';
import { ExamSessionResult } from './types';
import { MathText } from '../../components/MathText';
import { Question } from '../../types';
import { OptimizedImage } from '../../components/common/OptimizedImage';

interface ExamReviewPageProps {
  result: ExamSessionResult;
  onBackToDashboard: () => void;
  onBookmarkQuestion?: (qId: string) => void;
  bookmarkedIds?: string[];
}

export const ExamReviewPage: React.FC<ExamReviewPageProps> = ({
  result,
  onBackToDashboard,
  onBookmarkQuestion,
  bookmarkedIds = [],
}) => {
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});
  const [localBookmarks, setLocalBookmarks] = useState<Record<string, boolean>>({});

  const toggleExplanation = (qId: string) => {
    setExpandedExplanations((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const handleToggleBookmark = (qId: string) => {
    setLocalBookmarks((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
    if (onBookmarkQuestion) {
      onBookmarkQuestion(qId);
    }
  };

  const optionLetterMap: Record<'A' | 'B' | 'C' | 'D', string> = {
    A: 'ক',
    B: 'খ',
    C: 'গ',
    D: 'ঘ',
  };

  // Group questions by subject if multi-subject
  const subjectsMap: Record<string, Question[]> = {};
  (result.questions || []).forEach((q) => {
    const sName = q.subject_name || 'সাধারণ প্রশ্নাবলী';
    if (!subjectsMap[sName]) subjectsMap[sName] = [];
    subjectsMap[sName].push(q);
  });

  const isMultiSubject = Object.keys(subjectsMap).length > 1;
  let globalIndex = 0;

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-slate-900 pb-24 flex flex-col">
      {/* Top Header Matching Screenshots */}
      <div className="sticky top-0 z-30 bg-[#F8FAFC] dark:bg-slate-900 px-4 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center justify-between relative">
          <button
            onClick={onBackToDashboard}
            className="p-1.5 -ml-1 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {result.examTitle || 'মক পরীক্ষা'}
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              সময়: {Math.floor(result.timeTakenSeconds / 60) || 30} মিনিট
            </p>
          </div>

          <div className="w-8" />
        </div>
      </div>

      <div className="p-4 max-w-xl mx-auto w-full space-y-5">
        {/* Top 3 Stat Cards Matching Screenshots */}
        <div className="grid grid-cols-3 gap-3">
          {/* Card 1: পয়েন্ট */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs text-center flex flex-col">
            <div className="bg-amber-500 text-white font-black text-xs py-1">
              পয়েন্ট
            </div>
            <div className="p-2.5 font-black text-slate-900 dark:text-slate-100 text-lg flex items-center justify-center gap-1">
              <span className="text-amber-500 text-base">★</span>
              <span>{result.pointsEarned}</span>
            </div>
          </div>

          {/* Card 2: মার্কস */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs text-center flex flex-col">
            <div className="bg-emerald-600 text-white font-black text-xs py-1">
              মার্কস
            </div>
            <div className="p-2.5 font-black text-slate-900 dark:text-slate-100 text-base flex items-center justify-center">
              <span>{result.score.toFixed(1)}</span>
              <span className="text-slate-400 dark:text-slate-500 font-bold text-xs ml-1">/ {result.totalMarks}</span>
            </div>
          </div>

          {/* Card 3: সময় */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs text-center flex flex-col">
            <div className="bg-sky-500 text-white font-black text-xs py-1">
              সময়
            </div>
            <div className="p-2.5 font-black text-slate-900 dark:text-slate-100 text-base flex items-center justify-center">
              <span>{Math.floor(result.timeTakenSeconds / 60)}</span>
              <span className="text-slate-500 dark:text-slate-400 font-bold text-xs ml-1">মিনিট</span>
            </div>
          </div>
        </div>

        {/* 3 Breakdown Pills Matching Screenshots */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="px-2 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{result.correctCount} সঠিক</span>
          </div>

          <div className="px-2 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>{result.wrongCount} ভুল</span>
          </div>

          <div className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>{result.skippedCount} স্কিপ</span>
          </div>
        </div>

        {/* Question Review Cards */}
        {Object.entries(subjectsMap).map(([subjName, qList]) => (
          <div key={subjName} className="space-y-4 pt-2">
            {/* Subject Section Header Band */}
            {isMultiSubject && (
              <div className="bg-slate-200/80 dark:bg-slate-800 px-4 py-2 rounded-xl text-center">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {subjName} ({qList.length})
                </span>
              </div>
            )}

            <div className="space-y-5">
              {qList.map((q) => {
                globalIndex += 1;
                const userAns = result.userAnswers[q.id];
                const correctAns = q.correct_ans;
                const isExplanationOpen = expandedExplanations[q.id] ?? true; // Open by default matching screenshots
                const isBookmarked = localBookmarks[q.id] || bookmarkedIds.includes(q.id);

                return (
                  <div
                    key={q.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3.5"
                  >
                    {/* Question Statement & Mark (1) */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-slate-900 dark:text-slate-100 font-bold text-sm sm:text-base leading-relaxed flex-1">
                        <span className="mr-1">{globalIndex}.</span>
                        <MathText text={q.question_text} />
                        {q.math_formula_latex && (
                          <div className="mt-2 text-indigo-900 dark:text-indigo-300 font-serif">
                            <MathText text={q.math_formula_latex} />
                          </div>
                        )}

                        {q.question_image_url && (
                          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-1">
                            <OptimizedImage
                              src={q.question_image_url}
                              alt="Question diagram"
                              maxWidth={800}
                              showPreviewOnClick={true}
                              className="max-h-60 w-auto max-w-full rounded-lg object-contain mx-auto"
                              containerClassName="flex items-center justify-center min-h-[120px]"
                            />
                          </div>
                        )}
                      </div>

                      <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                        1
                      </div>
                    </div>

                    {/* Options Review with Color Highlighting */}
                    <div className="space-y-2 pt-1">
                      {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                        const optText = q.options[optKey];
                        if (!optText) return null;

                        const isCorrect = optKey === correctAns;
                        const isUserChoice = userAns === optKey;
                        const isWrongUserChoice = isUserChoice && !isCorrect;

                        let cardStyle = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800';
                        let circleStyle = 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700';
                        let textStyle = 'text-slate-700 dark:text-slate-300';

                        if (isCorrect) {
                          cardStyle = 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40';
                          circleStyle = 'bg-emerald-600 text-white border-emerald-600';
                          textStyle = 'text-emerald-950 dark:text-emerald-200 font-bold';
                        } else if (isWrongUserChoice) {
                          cardStyle = 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/40';
                          circleStyle = 'bg-rose-600 text-white border-rose-600';
                          textStyle = 'text-rose-950 dark:text-rose-200 font-bold';
                        }

                        return (
                          <div
                            key={optKey}
                            className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-colors ${cardStyle}`}
                          >
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${circleStyle}`}
                            >
                              {optionLetterMap[optKey]}
                            </div>

                            <div className={`text-xs sm:text-sm leading-normal flex-1 font-medium ${textStyle}`}>
                              <MathText text={optText} />
                            </div>

                            {isCorrect && (
                              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[3] shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Expandable Explanation Accordion Matching Screenshots */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => toggleExplanation(q.id)}
                        className="w-full flex items-center justify-between py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 cursor-pointer"
                      >
                        <span>ব্যাখ্যা</span>
                        {isExplanationOpen ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {isExplanationOpen && (
                        <div className="mt-1 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3.5 text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 leading-relaxed space-y-2">
                          <MathText text={q.explanation || 'সঠিক উত্তরের জন্য পাঠ্যবইয়ের সংশ্লিষ্ট অধ্যায়টি মনোযোগ দিয়ে পড়ুন।'} />
                          {q.explanation_latex && (
                            <div className="pt-1 font-mono text-emerald-900 dark:text-emerald-300">
                              <MathText text={q.explanation_latex} />
                            </div>
                          )}
                          {q.explanation_image_url && (
                            <div className="pt-2 overflow-hidden rounded-xl border border-emerald-300/60 dark:border-emerald-800/60 bg-white/80 dark:bg-slate-900/80 p-1">
                              <OptimizedImage
                                src={q.explanation_image_url}
                                alt="Explanation Diagram"
                                maxWidth={800}
                                showPreviewOnClick={true}
                                className="max-h-56 sm:max-h-72 w-auto max-w-full rounded-lg object-contain mx-auto"
                                containerClassName="flex items-center justify-center min-h-[120px]"
                              />
                            </div>
                          )}
                          {q.explanation_image_urls && q.explanation_image_urls.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                              {q.explanation_image_urls.map((imgUrl, iIdx) => (
                                <div key={iIdx} className="overflow-hidden rounded-xl border border-emerald-300/60 dark:border-emerald-800/60 bg-white/80 dark:bg-slate-900/80 p-1">
                                  <OptimizedImage
                                    src={imgUrl}
                                    alt={`Explanation Diagram ${iIdx + 1}`}
                                    maxWidth={800}
                                    showPreviewOnClick={true}
                                    className="max-h-56 sm:max-h-72 w-auto max-w-full rounded-lg object-contain mx-auto"
                                    containerClassName="flex items-center justify-center min-h-[120px]"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Question Card Footer (Tags & Action Icons) */}
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-3 text-xs text-slate-500 dark:text-slate-400">
                      {/* University Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {q.tags && q.tags.length > 0 ? (
                          q.tags.slice(0, 2).map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200 dark:border-slate-600"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200 dark:border-slate-600">
                            DU A 22-23
                          </span>
                        )}
                      </div>

                      {/* Action Icons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(q.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isBookmarked
                              ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                          title="বুকমার্ক করো"
                        >
                          <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="রিপোর্ট করো"
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Floating Back Button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 shadow-xl">
        <div className="max-w-xl mx-auto">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="w-full py-3.5 bg-[#047857] hover:bg-[#065f46] active:bg-[#064e3b] text-white font-bold rounded-xl shadow-md transition-all active:scale-98 cursor-pointer text-base text-center"
          >
            ড্যাশবোর্ডে ফিরে যাও
          </button>
        </div>
      </div>
    </div>
  );
};
