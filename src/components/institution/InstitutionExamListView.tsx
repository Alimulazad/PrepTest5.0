import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  X,
  Clock,
  FileEdit,
  DownloadCloud,
  CheckCircle2,
  BookOpen,
  Sparkles,
  HelpCircle,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { InstitutionInfo, InstitutionExamPaper } from '../../data/institutionData';

interface InstitutionExamListViewProps {
  institution: InstitutionInfo;
  onBack: () => void;
  onSelectExam: (exam: InstitutionExamPaper) => void;
  onSelectTopicWise: (institution: InstitutionInfo) => void;
  onStartPractice: (institution: InstitutionInfo) => void;
}

const toBengaliNumber = (num: number | string): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
};

export const InstitutionExamListView: React.FC<InstitutionExamListViewProps> = ({
  institution,
  onBack,
  onSelectExam,
  onSelectTopicWise,
  onStartPractice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'exam' | 'topic' | 'practice'>('exam');

  const filteredExams = useMemo(() => {
    if (!searchQuery.trim()) return institution.exams;
    const q = searchQuery.toLowerCase();
    return institution.exams.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.year.toLowerCase().includes(q)
    );
  }, [institution.exams, searchQuery]);

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto px-1 sm:px-2 animate-fadeIn">
      {/* Top Header Matching Frame 00:06 */}
      <div className="pt-2 pb-1 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <button
            id="btn-back-to-institutions"
            onClick={onBack}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="প্রতিষ্ঠান তালিকায় ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg tracking-tight">
            {institution.name} Admission Question Bank
          </h2>
        </div>

        {/* Top Right Action (Cloud / Download) */}
        <button
          type="button"
          onClick={() => {}}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
          title="অফলাইন ডাউনলোড"
        >
          <DownloadCloud className="w-5 h-5" />
        </button>
      </div>

      {/* Search Box: "পরীক্ষা খুঁজে বের করো" */}
      <div className="relative">
        <input
          type="text"
          id="input-search-institution-exams"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="পরীক্ষা খুঁজে বের করো"
          className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 shadow-2xs placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 sm:top-4" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3 top-2.5 sm:top-3 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sub-tab 1: Exam Papers List */}
      {activeSubTab === 'exam' && (
        <div className="space-y-2.5">
          {filteredExams.map((exam) => {
            return (
              <div
                key={exam.id}
                id={`exam-item-${exam.id}`}
                onClick={() => onSelectExam(exam)}
                className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-750 shadow-xs hover:border-slate-300 dark:hover:border-slate-650 transition-all cursor-pointer group active:scale-[0.99]"
              >
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-snug group-hover:text-[#059669] dark:group-hover:text-emerald-400 transition-colors">
                  {exam.title}
                </h3>

                <div className="flex items-center gap-4 mt-2.5 text-xs">
                  {/* Duration badge */}
                  <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{exam.duration_label}</span>
                  </div>

                  {/* Question count badge */}
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>{toBengaliNumber(exam.total_questions)}টি প্রশ্ন</span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredExams.length === 0 && (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400 text-sm">
              কোনো প্রশ্নপত্র পাওয়া যায়নি
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 2: Topic Wise Questions */}
      {activeSubTab === 'topic' && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-2">
              {institution.name} টপিক ভিত্তিক প্রশ্ন তালিকা
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              বিগত বছরগুলোতে {institution.name}-এ যেসকল টপিক থেকে সবচেয়ে বেশি প্রশ্ন এসেছে সেগুলো টপিকভিত্তিক চর্চা করুন।
            </p>
            <button
              onClick={() => onSelectTopicWise(institution)}
              className="w-full py-2.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              টপিক ভিত্তিক প্রশ্ন এক্সপ্লোর করুন
            </button>
          </div>
        </div>
      )}

      {/* Sub-tab 3: Practice */}
      {activeSubTab === 'practice' && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-2">
              {institution.name} স্পেশাল প্র্যাকটিস মোড
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              টাইমার ও ইনস্ট্যান্ট এক্সপ্লেনেশন সহ বিগত বছরের সেরা নির্বাচিত প্রশ্নগুলোতে দ্রুত প্রস্তুতি নিন।
            </p>
            <button
              onClick={() => onStartPractice(institution)}
              className="w-full py-2.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              প্র্যাকটিস শুরু করুন
            </button>
          </div>
        </div>
      )}

      {/* Bottom Sub-Tabs Navigation Matching Frame 00:06 - 00:13 */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 py-2 px-3 max-w-2xl mx-auto shadow-lg">
        <div className="flex items-center justify-around gap-2 text-xs">
          <button
            id="subtab-exam"
            onClick={() => setActiveSubTab('exam')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer text-center ${
              activeSubTab === 'exam'
                ? 'text-[#059669] dark:text-emerald-400 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            পরীক্ষা
          </button>

          <button
            id="subtab-topic"
            onClick={() => setActiveSubTab('topic')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer text-center ${
              activeSubTab === 'topic'
                ? 'text-[#059669] dark:text-emerald-400 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            টপিক ভিত্তিক প্রশ্ন
          </button>

          <button
            id="subtab-practice"
            onClick={() => setActiveSubTab('practice')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer text-center ${
              activeSubTab === 'practice'
                ? 'text-[#059669] dark:text-emerald-400 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            প্র্যাকটিস
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstitutionExamListView;
