import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Bookmark, Eye, EyeOff, Sparkles, Flag, FileText, CheckCircle2 } from 'lucide-react';
import { WrittenQuestion } from '../types';
import MathText from './MathText';
import { OptimizedImage } from './common/OptimizedImage';

export interface WrittenQuestionCardProps {
  question: WrittenQuestion;
  index: number;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  onAskAI?: (question: WrittenQuestion) => void;
  forceShowAnswer?: boolean;
}

const toBengaliNumber = (num: number | string): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
};

export const WrittenQuestionCard: React.FC<WrittenQuestionCardProps> = ({
  question,
  index,
  isBookmarked = false,
  onToggleBookmark,
  onAskAI,
  forceShowAnswer = false,
}) => {
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const isExplanationVisible = showExplanation || forceShowAnswer;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-4">
      {/* Top Header: Badge, Tags, Bookmark */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800">
            <FileText className="w-3.5 h-3.5" />
            <span>লিখিত প্রশ্ন {toBengaliNumber(question.question_number || index + 1)}</span>
          </span>

          {question.chapter_name && (
            <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium">
              {question.chapter_name}
            </span>
          )}

          {question.tags && question.tags.length > 0 && (
            <div className="hidden sm:flex flex-wrap items-center gap-1">
              {question.tags.slice(0, 3).map((tag, tIdx) => (
                <span
                  key={tIdx}
                  className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-semibold border border-amber-200/60 dark:border-amber-800/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onToggleBookmark && (
            <button
              type="button"
              onClick={onToggleBookmark}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isBookmarked ? 'বুকমার্ক সরান' : 'বুকমার্ক করুন'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          )}

          {onAskAI && (
            <button
              type="button"
              onClick={() => onAskAI(question)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800/60 transition-colors cursor-pointer"
              title="AI টিউটরের সাহায্য নিন"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">AI টিউটর</span>
            </button>
          )}
        </div>
      </div>

      {/* Question Text */}
      <div className="text-slate-900 dark:text-slate-100 text-base sm:text-lg font-medium leading-relaxed">
        <MathText text={question.question_text} />
      </div>

      {/* Question Image if exists */}
      {question.question_image_url && (
        <div className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-w-lg bg-slate-50 dark:bg-slate-950 p-1">
          <OptimizedImage
            src={question.question_image_url}
            alt="Question illustration"
            maxWidth={800}
            showPreviewOnClick={true}
            className="w-full h-auto object-contain max-h-72"
            containerClassName="min-h-[140px]"
          />
        </div>
      )}

      {/* Explanation Toggle & Content */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => setShowExplanation((prev) => !prev)}
          className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            isExplanationVisible
              ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800'
              : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 ${isExplanationVisible ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
            <span>{isExplanationVisible ? 'ব্যাখ্যা ও সমাধান লুকান' : 'উত্তর ও বিস্তারিত সমাধান দেখুন'}</span>
          </div>
          {isExplanationVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isExplanationVisible && (
          <div className="mt-3 p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed space-y-3 animate-fadeIn">
            <h4 className="font-bold text-purple-900 dark:text-purple-300 text-sm flex items-center gap-1.5">
              <span>নমুনা সমাধান (Sample Solution):</span>
            </h4>

            {/* Render LaTeX / Explanation Text */}
            <div className="prose dark:prose-invert max-w-none">
              <MathText text={question.explanation_latex || question.explanation} />
            </div>

            {/* Render Solution Image Arrays or Single Image if present */}
            {question.explanation_image_url && (!question.explanation_image_urls || question.explanation_image_urls.length === 0) && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">চিত্র/সমাধানের ছবি:</span>
                <div className="rounded-xl overflow-hidden border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 p-1 max-w-lg">
                  <OptimizedImage
                    src={question.explanation_image_url}
                    alt="Solution illustration"
                    maxWidth={800}
                    showPreviewOnClick={true}
                    className="w-full h-auto object-contain rounded-lg max-h-64"
                    containerClassName="min-h-[120px]"
                  />
                </div>
              </div>
            )}

            {question.explanation_image_urls && question.explanation_image_urls.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">চিত্র/সমাধানের ছবি:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {question.explanation_image_urls.map((imgUrl, imgIdx) => (
                    <div
                      key={imgIdx}
                      className="rounded-xl overflow-hidden border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 p-1"
                    >
                      <OptimizedImage
                        src={imgUrl}
                        alt={`Solution step ${imgIdx + 1}`}
                        maxWidth={800}
                        showPreviewOnClick={true}
                        className="w-full h-auto object-contain rounded-lg max-h-64"
                        containerClassName="min-h-[120px]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WrittenQuestionCard;
