import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Bookmark, Flag, Eye, EyeOff, Sparkles, CheckCircle2, XCircle, X, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { Question } from '../types';
import MathText from './MathText';
import { reportQuestionApi } from '../services/api';
import { OptimizedImage } from './common/OptimizedImage';

export interface QuestionCardProps {
  question: Question;
  index: number;
  mode?: 'practice' | 'exam' | 'review';
  selectedOption?: 'A' | 'B' | 'C' | 'D' | null;
  onSelectOption?: (option: 'A' | 'B' | 'C' | 'D') => void;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  onAskAI?: (question: Question) => void;
  initialShowExplanation?: boolean;
  forceShowAnswer?: boolean;
}

// Bengali letter labels for options
const BANGLA_OPTION_LABELS: Record<'A' | 'B' | 'C' | 'D', string> = {
  A: 'ক',
  B: 'খ',
  C: 'গ',
  D: 'ঘ',
};

const QuestionCardComponent: React.FC<QuestionCardProps> = ({
  question,
  index,
  mode = 'practice',
  selectedOption: controlledSelectedOption,
  onSelectOption,
  isBookmarked = false,
  onToggleBookmark,
  onAskAI,
  initialShowExplanation = false,
  forceShowAnswer = false,
}) => {
  // Local state for self-managed practice selection if not controlled by parent
  const [internalSelectedOption, setInternalSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(initialShowExplanation || mode === 'review');
  const [peekAnswer, setPeekAnswer] = useState<boolean>(false);
  const [isReported, setIsReported] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<string>('সঠিক উত্তরে ভুল রয়েছে');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [showReportToast, setShowReportToast] = useState<boolean>(false);
  const [reportToastMessage, setReportToastMessage] = useState<string>('রিপোর্ট গ্রহণ করা হয়েছে। ধন্যবাদ!');

  const selectedOption = controlledSelectedOption !== undefined ? controlledSelectedOption : internalSelectedOption;
  const isAnswered = selectedOption !== undefined && selectedOption !== null;
  const isPeeking = peekAnswer || Boolean(forceShowAnswer);

  const optionKeys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  const handleOptionClick = (key: 'A' | 'B' | 'C' | 'D') => {
    // 1. Optimistic immediate state update: zero await, instant visual feedback
    if (controlledSelectedOption === undefined) {
      setInternalSelectedOption(key);
    }

    // 2. Synchronously invoke parent callback (fire-and-forget, never awaited)
    if (onSelectOption) {
      try {
        onSelectOption(key);
      } catch (err) {
        console.error('Error in onSelectOption:', err);
      }
    }

    if (mode === 'practice') {
      setShowExplanation(true);
    }
  };

  const handleOpenReportModal = () => {
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    setIsSubmittingReport(true);
    try {
      const res = await reportQuestionApi({
        questionId: question.id,
        question,
        reason: reportReason,
        details: reportDetails,
      });
      setIsReported(true);
      setShowReportModal(false);
      setReportToastMessage(res.message || 'রিপোর্ট গ্রহণ করা হয়েছে। ধন্যবাদ!');
      setShowReportToast(true);
      setTimeout(() => {
        setShowReportToast(false);
      }, 3000);
    } catch (err: any) {
      console.error('Report submission failed:', err);
      setIsReported(true);
      setShowReportModal(false);
      setReportToastMessage('রিপোর্ট সংরক্ষিত হয়েছে (অফলাইন মোড)।');
      setShowReportToast(true);
      setTimeout(() => {
        setShowReportToast(false);
      }, 3000);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Primary tag for bottom badge (e.g. "AFMC 24-25", "MAT+DAT-25-26", etc.)
  const primaryTag = question.tags && question.tags.length > 0 ? question.tags[0] : null;

  return (
    <div
      id={`question-card-${question.id}`}
      className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-700 shadow-2xs mb-4 transition-colors duration-150 relative w-full max-w-full overflow-hidden min-w-0"
    >
      {/* Question Header: Number & Text */}
      <div className="flex items-start gap-2 mb-3.5 w-full min-w-0">
        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-snug shrink-0 font-mono">
          {index + 1}.
        </span>
        <div className="text-slate-900 dark:text-slate-100 font-medium text-sm sm:text-[15px] leading-relaxed grow min-w-0 max-w-full overflow-x-auto">
          <MathText text={question.question_text} />

          {question.math_formula_latex && (
            <div className="mt-2 pl-2">
              <MathText text={`$$${question.math_formula_latex}$$`} />
            </div>
          )}

          {question.question_image_url && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-1">
              <OptimizedImage
                src={question.question_image_url}
                alt="Question Diagram"
                maxWidth={800}
                showPreviewOnClick={true}
                className="max-h-64 sm:max-h-80 w-auto max-w-full rounded-lg object-contain mx-auto"
                containerClassName="flex items-center justify-center min-h-[140px]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Options List */}
      <div className="space-y-2 mb-3">
        {optionKeys.map((key) => {
          const optionText = question.options[key];
          if (!optionText) return null;

          const isSelected = selectedOption === key;
          const isCorrectOption = question.correct_ans === key;
          const shouldHighlightCorrect = isCorrectOption && (isAnswered || isPeeking || mode === 'review');
          const isWrongSelected = isSelected && !isCorrectOption && (mode === 'practice' || mode === 'review' || isPeeking);

          // Container styles: fast, lightweight colors without heavy filters or layout transforms
          let containerClasses = 'bg-slate-100/70 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-200 border-transparent dark:border-slate-700/50';
          let circleClasses = 'border-slate-400/80 dark:border-slate-600 text-slate-700 dark:text-slate-300 bg-transparent';

          if (shouldHighlightCorrect) {
            containerClasses = 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-600 dark:border-emerald-500 text-emerald-950 dark:text-emerald-200 font-medium';
            circleClasses = 'bg-[#14532D] dark:bg-emerald-600 text-white border-[#14532D] dark:border-emerald-600 shadow-xs';
          } else if (isWrongSelected) {
            containerClasses = 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-500 text-rose-950 dark:text-rose-200 font-medium';
            circleClasses = 'bg-rose-600 text-white border-rose-600 shadow-xs';
          } else if (isSelected && mode === 'exam') {
            containerClasses = 'bg-blue-50/80 dark:bg-blue-950/50 border-[#2563EB] dark:border-blue-400 text-[#1E3A8A] dark:text-blue-200 font-medium';
            circleClasses = 'bg-[#2563EB] text-white border-[#2563EB]';
          }

          return (
            <button
              key={key}
              type="button"
              id={`option-${question.id}-${key}`}
              onClick={() => handleOptionClick(key)}
              className={`w-full text-left p-2.5 sm:p-3 rounded-2xl border transition-colors duration-150 flex items-center justify-between gap-3 cursor-pointer select-none ${containerClasses}`}
            >
              <div className="flex items-center gap-3 grow min-w-0">
                {/* Circular Bengali Letter Badge: (ক), (খ), (গ), (ঘ) */}
                <div
                  className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 transition-colors duration-150 ${circleClasses}`}
                >
                  {BANGLA_OPTION_LABELS[key]}
                </div>

                {/* Option text with LaTeX rendering */}
                <div className="grow text-sm sm:text-[14.5px] leading-relaxed text-inherit">
                  <MathText text={optionText} />
                </div>
              </div>

              {/* Status icon indicators if answered */}
              {shouldHighlightCorrect && isSelected && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              {isWrongSelected && (
                <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Collapsible "ব্যাখ্যা" Panel */}
      {(question.explanation || question.explanation_latex || question.explanation_image_url || (question.explanation_image_urls && question.explanation_image_urls.length > 0)) && (
        <div className="mb-3">
          <div className="rounded-2xl bg-[#DCFCE7]/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 overflow-hidden transition-colors duration-150">
            {/* Header: "ব্যাখ্যা" on left, Chevron on right */}
            <button
              type="button"
              id={`btn-explanation-${question.id}`}
              onClick={() => setShowExplanation(!showExplanation)}
              className="w-full flex items-center justify-between px-3.5 py-2 text-left cursor-pointer hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 transition-colors duration-150"
            >
              <span className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200">ব্যাখ্যা</span>
              <div className="text-emerald-900 dark:text-emerald-300">
                {showExplanation ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {/* Collapsible Explanation Content with MathText and Images */}
            {showExplanation && (
              <div className="px-3.5 pb-3 pt-1 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-2.5 leading-relaxed border-t border-emerald-200/50 dark:border-emerald-800/40">
                {question.explanation && (
                  <div className="text-slate-800 dark:text-slate-200 leading-relaxed">
                    <MathText text={question.explanation} />
                  </div>
                )}

                {question.explanation_latex && (
                  <div className="pt-1">
                    <MathText text={`$$${question.explanation_latex}$$`} />
                  </div>
                )}

                {question.explanation_image_url && (
                  <div className="pt-1 overflow-hidden rounded-xl border border-emerald-300/60 dark:border-emerald-800/60 bg-white/80 dark:bg-slate-900/80 p-1">
                    <OptimizedImage
                      src={question.explanation_image_url}
                      alt="Explanation Diagram"
                      maxWidth={800}
                      showPreviewOnClick={true}
                      className="max-h-56 sm:max-h-72 w-auto max-w-full rounded-lg object-contain mx-auto"
                      containerClassName="flex items-center justify-center min-h-[120px]"
                    />
                  </div>
                )}

                {question.explanation_image_urls && question.explanation_image_urls.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {question.explanation_image_urls.map((url, idx) => (
                      <div key={idx} className="overflow-hidden rounded-xl border border-emerald-300/60 dark:border-emerald-800/60 bg-white/80 dark:bg-slate-900/80 p-1">
                        <OptimizedImage
                          src={url}
                          alt={`Explanation Diagram ${idx + 1}`}
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
        </div>
      )}

      {/* Footer: Tags on Left, Bookmark, Flag & Peek on Right */}
      <div className="flex items-center justify-between pt-1">
        {/* Left Side: Tag Badge (e.g., "AFMC 24-25", "MAT+DAT-25-26", "BUP FST 24-25") */}
        <div className="flex flex-wrap items-center gap-1.5">
          {primaryTag && (
            <span className="px-2.5 py-0.5 rounded-md bg-[#E0F2FE] dark:bg-sky-950/60 text-[#0369A1] dark:text-sky-300 font-bold text-[11px] font-mono tracking-tight border border-sky-200/60 dark:border-sky-800/60">
              {primaryTag}
            </span>
          )}

          {question.tags && question.tags.length > 1 && (
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium text-[10.5px] font-mono">
              +{question.tags.length - 1}
            </span>
          )}
        </div>

        {/* Right Side Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Ask AI Tutor if available */}
          {onAskAI && (
            <button
              type="button"
              id={`btn-ask-ai-${question.id}`}
              onClick={() => onAskAI(question)}
              aria-label="Gemini AI থেকে ব্যাখ্যা নিন"
              className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-[#1E40AF] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 rounded-lg text-[11px] font-semibold transition-colors duration-150 cursor-pointer"
              title="Gemini AI থেকে ব্যাখ্যা নিন"
            >
              <Sparkles className="w-3 h-3 text-[#2563EB] dark:text-blue-400" />
              <span className="hidden sm:inline">AI ব্যাখ্যা</span>
            </button>
          )}

          {/* Bookmark Button */}
          {onToggleBookmark && (
            <button
              type="button"
              id={`btn-bookmark-${question.id}`}
              onClick={onToggleBookmark}
              aria-label={isBookmarked ? 'দাগানো থেকে সরান' : 'বুকমার্ক করুন'}
              className={`p-1.5 rounded-lg transition-colors duration-150 cursor-pointer ${
                isBookmarked
                  ? 'text-amber-500 hover:text-amber-600'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
              title={isBookmarked ? 'দাগানো থেকে সরান' : 'বুকমার্ক করুন'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
            </button>
          )}

          {/* Flag / Report Button */}
          <button
            type="button"
            id={`btn-report-${question.id}`}
            onClick={handleOpenReportModal}
            aria-label="প্রশ্নের ভুল রিপোর্ট করুন"
            className={`p-1.5 rounded-lg transition-colors duration-150 cursor-pointer ${
              isReported
                ? 'text-rose-500'
                : 'text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
            }`}
            title="ভুল রিপোর্ট করুন"
          >
            <Flag className={`w-4 h-4 ${isReported ? 'fill-rose-500' : ''}`} />
          </button>

          {/* Peek (পিক) Mode Eye Button */}
          <button
            type="button"
            id={`btn-peek-${question.id}`}
            onClick={() => setPeekAnswer(!isPeeking)}
            aria-label={isPeeking ? 'পিক বন্ধ করুন' : 'উত্তর পিক করুন (সরাসরি সঠিক উত্তর দেখুন)'}
            className={`p-1.5 rounded-xl transition-colors duration-150 cursor-pointer shadow-2xs flex items-center justify-center ${
              isPeeking
                ? 'bg-[#047857] text-white ring-2 ring-emerald-400'
                : 'bg-[#059669] hover:bg-[#047857] text-white'
            }`}
            title={isPeeking ? 'পিক বন্ধ করুন' : 'উত্তর পিক করুন (সরাসরি সঠিক উত্তর দেখুন)'}
          >
            {isPeeking ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Report Issue Modal Dialog */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>প্রশ্ন বা উত্তরের ত্রুটি রিপোর্ট</span>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                aria-label="রিপোর্ট ডায়ালগ বন্ধ করুন"
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                  সমস্যার কারণ নির্বাচন করুন:
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                >
                  <option value="সঠিক উত্তরে ভুল রয়েছে">সঠিক উত্তরে ভুল রয়েছে</option>
                  <option value="ব্যাখ্যা ভুল বা অসম্পূর্ণ">ব্যাখ্যা ভুল বা অসম্পূর্ণ</option>
                  <option value="টাইপো বা ল্যাটেক্স ফরম্যাটিং সমস্যা">টাইপো বা ল্যাটেক্স ফরম্যাটিং সমস্যা</option>
                  <option value="প্রশ্নটি অস্পষ্ট / অপশনে সঠিক উত্তর নেই">প্রশ্নটি অস্পষ্ট / অপশনে সঠিক উত্তর নেই</option>
                  <option value="অন্যান্য ত্রুটি">অন্যান্য ত্রুটি</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                  বিস্তারিত মন্তব্য (ঐচ্ছিক):
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="সঠিক উত্তর বা কী সমস্যা রয়েছে তা সংক্ষেপে লিখুন..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 resize-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                disabled={isSubmittingReport}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSubmitReport}
                disabled={isSubmittingReport}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmittingReport ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>পাঠানো হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>রিপোর্ট জমা দিন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Report Confirmation Toast */}
      {showReportToast && (
        <div className="absolute top-2 right-2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-1 z-20">
          {reportToastMessage}
        </div>
      )}
    </div>
  );
};

// Custom comparison function for React.memo to prevent unnecessary re-renders of non-active cards
function areQuestionCardPropsEqual(prevProps: QuestionCardProps, nextProps: QuestionCardProps): boolean {
  return (
    prevProps.question.id === nextProps.question.id &&
    prevProps.question === nextProps.question &&
    prevProps.index === nextProps.index &&
    prevProps.mode === nextProps.mode &&
    prevProps.selectedOption === nextProps.selectedOption &&
    prevProps.isBookmarked === nextProps.isBookmarked &&
    prevProps.forceShowAnswer === nextProps.forceShowAnswer &&
    prevProps.initialShowExplanation === nextProps.initialShowExplanation
  );
}

export const QuestionCard = React.memo(QuestionCardComponent, areQuestionCardPropsEqual);
export default QuestionCard;
