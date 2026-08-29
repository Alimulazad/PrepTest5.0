import React from 'react';
import { ArrowLeft, Clock, FileEdit, Eye, Play } from 'lucide-react';
import { InstitutionExamPaper } from '../../data/institutionData';

interface InstitutionExamDetailModalProps {
  exam: InstitutionExamPaper;
  onBack: () => void;
  onStartExam: (exam: InstitutionExamPaper) => void;
  onViewQuestions: (exam: InstitutionExamPaper) => void;
}

const toBengaliNumber = (num: number | string): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
};

export const InstitutionExamDetailModal: React.FC<InstitutionExamDetailModalProps> = ({
  exam,
  onBack,
  onStartExam,
  onViewQuestions,
}) => {
  return (
    <div className="space-y-6 pb-20 max-w-xl mx-auto px-2 sm:px-4 animate-fadeIn">
      {/* Top Header with Back Arrow */}
      <div className="pt-2 pb-1 flex items-center gap-3">
        <button
          id="btn-back-from-exam-detail"
          onClick={onBack}
          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          title="ফিরে যান"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Main Title Centered */}
      <div className="text-center pt-2 pb-4">
        <h2 className="font-extrabold text-slate-900 dark:text-slate-100 text-xl sm:text-2xl leading-snug tracking-tight">
          {exam.title}
        </h2>
      </div>

      {/* Info Pill Card matching Frame 00:14 */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-750 shadow-xs flex items-center justify-center gap-8">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-sm">
          <Clock className="w-4 h-4" />
          <span>{exam.duration_label}</span>
        </div>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
          <FileEdit className="w-4 h-4" />
          <span>{toBengaliNumber(exam.total_questions)}টি প্রশ্ন</span>
        </div>
      </div>

      {/* Action Buttons Matching Frames 00:14 - 00:17 */}
      <div className="space-y-3 pt-2">
        {/* Solid Green Button: পরীক্ষা শুরু করো */}
        <button
          id="btn-start-live-exam"
          type="button"
          onClick={() => onStartExam(exam)}
          className="w-full py-3.5 px-4 bg-[#056643] hover:bg-[#045236] active:bg-[#033e29] text-white rounded-xl text-sm sm:text-base font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          <span>পরীক্ষা শুরু করো</span>
        </button>

        {/* Green Outlined/Clean Button: 👁 প্রশ্ন দেখো */}
        <button
          id="btn-view-questions-practice"
          type="button"
          onClick={() => onViewQuestions(exam)}
          className="w-full py-3.5 px-4 bg-emerald-50/50 hover:bg-emerald-100/50 dark:bg-slate-850 dark:hover:bg-slate-800 text-[#056643] dark:text-emerald-400 border border-[#056643]/30 dark:border-emerald-600/40 rounded-xl text-sm sm:text-base font-extrabold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          <Eye className="w-4 h-4" />
          <span>প্রশ্ন দেখো</span>
        </button>
      </div>
    </div>
  );
};

export default InstitutionExamDetailModal;
