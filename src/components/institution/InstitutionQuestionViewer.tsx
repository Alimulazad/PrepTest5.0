import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Flag,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
  Share2,
} from 'lucide-react';
import { Question } from '../../types';
import { InstitutionExamPaper, InstitutionSection } from '../../data/institutionData';
import MathText from '../MathText';

interface InstitutionQuestionViewerProps {
  exam: InstitutionExamPaper;
  questions: (Question & { section_header?: string; mark?: number })[];
  bookmarks: string[];
  onToggleBookmark: (questionId: string) => void;
  onAskAI?: (question: Question) => void;
  onBack: () => void;
}

const toBengaliNumber = (num: number | string): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
};

const OPTION_LABELS: Record<'A' | 'B' | 'C' | 'D', string> = {
  A: 'ক',
  B: 'খ',
  C: 'গ',
  D: 'ঘ',
};

function getSectionBadgeForSubject(subjectId: string, count: number, examSections?: InstitutionSection[]): string {
  const sLower = (subjectId || '').toLowerCase();

  if (examSections && examSections.length > 0) {
    const matched = examSections.find((s) => {
      const c = s.code.toLowerCase();
      const n = s.name.toLowerCase();
      return (
        sLower.includes(c) ||
        n.includes(sLower) ||
        (c === 'phy' && (sLower.includes('physics') || sLower.includes('পদ'))) ||
        (c === 'chem' && (sLower.includes('chem') || sLower.includes('রস'))) ||
        (c === 'bio' && (sLower.includes('bio') || sLower.includes('জীব'))) ||
        (c === 'math' && (sLower.includes('math') || sLower.includes('গণিত'))) ||
        (c === 'eng' && (sLower.includes('eng') || sLower.includes('ইংরেজি') || sLower.includes('ইং'))) ||
        (c === 'gk' && (sLower.includes('gk') || sLower.includes('জ্ঞান')))
      );
    });
    if (matched) {
      return `${matched.name} (${count})`;
    }
  }

  if (sLower.includes('bio') || sLower.includes('জীব')) return `BIO (${count})`;
  if (sLower.includes('phys') || sLower.includes('পদ')) return `PHYSICS (${count})`;
  if (sLower.includes('chem') || sLower.includes('রস')) return `CHEMISTRY (${count})`;
  if (sLower.includes('math') || sLower.includes('গণিত')) return `MATH (${count})`;
  if (sLower.includes('eng') || sLower.includes('ইংরেজি') || sLower.includes('ইং')) return `ENGLISH (${count})`;
  if (sLower.includes('gk') || sLower.includes('জ্ঞান') || sLower.includes('সাধারণ')) return `GK (${count})`;
  if (sLower.includes('ict') || sLower.includes('তথ্য')) return `ICT (${count})`;
  if (sLower.includes('moral') || sLower.includes('মানবিক') || sLower.includes('মূল্যবোধ')) return `মানবিক গুণাবলি (${count})`;

  return `${(subjectId || 'SECTION').toUpperCase()} (${count})`;
}

export const InstitutionQuestionViewer: React.FC<InstitutionQuestionViewerProps> = ({
  exam,
  questions,
  bookmarks,
  onToggleBookmark,
  onAskAI,
  onBack,
}) => {
  // Track user selected option for each question
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  // Track open/closed status for explanations
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});
  // Universal toggle to reveal all answers & explanations
  const [revealAll, setRevealAll] = useState(false);

  // Group and dynamically format questions with section headers
  const processedQuestions = useMemo(() => {
    const subjectCounts: Record<string, number> = {};
    questions.forEach((q) => {
      const subKey = q.subject_id || 'general';
      subjectCounts[subKey] = (subjectCounts[subKey] || 0) + 1;
    });

    let lastSubject: string | null = null;
    return questions.map((q) => {
      const subKey = q.subject_id || 'general';
      let section_header = q.section_header;

      if (!section_header && subKey !== lastSubject) {
        lastSubject = subKey;
        const count = subjectCounts[subKey] || 1;
        section_header = getSectionBadgeForSubject(subKey, count, exam.sections);
      } else if (subKey === lastSubject) {
        // Continue within same group
      }

      return {
        ...q,
        section_header,
      };
    });
  }, [questions, exam.sections]);

  const handleSelectOption = (questionId: string, optionKey: 'A' | 'B' | 'C' | 'D') => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
    // Auto expand explanation when an answer is selected
    setExpandedExplanations((prev) => ({
      ...prev,
      [questionId]: true,
    }));
  };

  const toggleExplanation = (questionId: string) => {
    setExpandedExplanations((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto px-1 sm:px-2 animate-fadeIn font-sans">
      {/* Top Header Matching Frame 00:20 */}
      <div className="pt-2 pb-2 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800">
        <button
          id="btn-back-from-question-viewer"
          onClick={onBack}
          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          title="ফিরে যান"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {/* Universal Eye Toggle */}
          <button
            type="button"
            onClick={() => setRevealAll((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              revealAll
                ? 'bg-[#047857] text-white ring-2 ring-emerald-400'
                : 'bg-[#059669] hover:bg-[#047857] text-white'
            }`}
          >
            {revealAll ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{revealAll ? 'উত্তর লুকান' : 'সকল উত্তর'}</span>
          </button>
        </div>
      </div>

      {/* Centered Exam Meta Title and Rules matching Frame 00:20 */}
      <div className="text-center py-2 px-2">
        <h2 className="font-extrabold text-slate-900 dark:text-slate-100 text-base sm:text-lg leading-snug">
          {exam.title}
        </h2>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 space-y-0.5 font-medium">
          <p>সময়ঃ {toBengaliNumber(exam.duration_minutes)} মিনিট</p>
          <p>প্রতিটি প্রশ্নের পূর্ণমান প্রশ্নের পাশে দেওয়া আছে এবং ভুলউত্তর 0.25 মার্ক কাটা যাবে</p>
        </div>
      </div>

      {/* Questions List with Section Headers Matching Frames 00:20 - 01:00 */}
      <div className="space-y-6 pt-1">
        {processedQuestions.map((q, index) => {
          const userAns = selectedAnswers[q.id];
          const hasAnswered = !!userAns || revealAll;
          const isCorrect = userAns === q.correct_ans;
          const isExplanationOpen = expandedExplanations[q.id] || revealAll;
          const isBookmarked = bookmarks.includes(q.id);

          return (
            <React.Fragment key={q.id || index}>
              {/* Optional Section Header Banner (e.g. BIO (30), PHYSICS (15), etc.) */}
              {q.section_header && (
                <div className="pt-3 pb-1 flex items-center justify-center">
                  <div className="px-5 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs sm:text-sm tracking-wider uppercase shadow-2xs border border-slate-300/50 dark:border-slate-700">
                    {q.section_header}
                  </div>
                </div>
              )}

              {/* Question Card Frame */}
              <div
                id={`q-item-${q.id}`}
                className="bg-white dark:bg-slate-850 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-750 shadow-xs space-y-3.5 transition-all"
              >
                {/* Question Row: Serial Number + Text + Mark Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-relaxed">
                    <span className="font-bold mr-1.5 text-slate-900 dark:text-slate-100">
                      {toBengaliNumber(index + 1)}.
                    </span>
                    <MathText inline text={q.question_text} />
                  </div>

                  {/* Mark Pill on Right Matching Video (e.g. 1) */}
                  <div className="shrink-0 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700">
                    {toBengaliNumber(q.mark || 1)}
                  </div>
                </div>

                {/* 4 Options Grid (ক, খ, গ, ঘ) */}
                <div className="space-y-2 pt-1">
                  {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                    const optText = q.options[optKey];
                    if (!optText) return null;

                    const isThisSelected = userAns === optKey;
                    const isThisCorrect = q.correct_ans === optKey;

                    // Option styling based on interaction state
                    let optionStyle =
                      'bg-slate-50/70 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/80';

                    if (hasAnswered) {
                      if (isThisCorrect) {
                        optionStyle =
                          'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-500 ring-1 ring-emerald-500 font-semibold';
                      } else if (isThisSelected && !isThisCorrect) {
                        optionStyle =
                          'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-400 ring-1 ring-rose-400 font-semibold';
                      }
                    }

                    return (
                      <button
                        key={optKey}
                        type="button"
                        id={`opt-${q.id}-${optKey}`}
                        onClick={() => handleSelectOption(q.id, optKey)}
                        className={`w-full p-3 sm:p-3.5 rounded-xl border text-left flex items-center justify-between text-xs sm:text-sm transition-all cursor-pointer ${optionStyle}`}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          {/* Option Badge: (ক), (খ)... */}
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${
                              hasAnswered && isThisCorrect
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : hasAnswered && isThisSelected
                                ? 'bg-rose-600 text-white border-rose-600'
                                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {OPTION_LABELS[optKey]}
                          </div>

                          {/* Option Text */}
                          <span className="flex-1 min-w-0">
                            <MathText inline text={optText} />
                          </span>
                        </div>

                        {/* Status Icon Indicator */}
                        {hasAnswered && (
                          <div className="shrink-0 ml-2">
                            {isThisCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : isThisSelected ? (
                              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            ) : null}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Expandable Explanation (ব্যাখ্যা ∨) matching Frames 00:24 - 00:29 */}
                {hasAnswered && q.explanation && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => toggleExplanation(q.id)}
                      className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 transition-colors py-1 cursor-pointer"
                    >
                      <span>ব্যাখ্যা</span>
                      {isExplanationOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {isExplanationOpen && (
                      <div className="mt-2 p-3 sm:p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200 text-xs sm:text-sm leading-relaxed space-y-1.5 animate-fadeIn">
                        <MathText text={q.explanation} />
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Card Actions: Bookmark & Report matching Frame 00:20 */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800/80">
                  {onAskAI && (
                    <button
                      type="button"
                      onClick={() => onAskAI(q)}
                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer mr-auto flex items-center gap-1 text-xs font-bold"
                      title="AI টিউটরকে জিজ্ঞেস করুন"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      <span>AI ব্যাখ্যা</span>
                    </button>
                  )}

                  {/* Bookmark Button */}
                  <button
                    type="button"
                    id={`btn-bookmark-${q.id}`}
                    onClick={() => onToggleBookmark(q.id)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isBookmarked
                        ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={isBookmarked ? 'বুকমার্ক সরানো' : 'বুকমার্কে সংরক্ষণ'}
                  >
                    <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
                  </button>

                  {/* Report Flag Button */}
                  <button
                    type="button"
                    onClick={() => {}}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="রিপোর্ট করুন"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default InstitutionQuestionViewer;
