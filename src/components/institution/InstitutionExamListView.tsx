import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  X,
  Clock,
  FileEdit,
  DownloadCloud,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  Sparkles,
  BookOpen,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { InstitutionInfo, InstitutionUnitInfo, InstitutionExamPaper } from '../../data/institutionData';
import { COMPREHENSIVE_CHAPTERS_DATA } from '../../data/subjectTopicsData';

interface InstitutionExamListViewProps {
  institution: InstitutionInfo;
  unit?: InstitutionUnitInfo | null;
  onBack: () => void;
  onSelectExam: (exam: InstitutionExamPaper) => void;
  onStartTopicQuestions?: (config: { subjectId?: string; chapterIds: string[]; questionType: string }) => void;
  onStartPracticeWithConfig?: (config: { durationMinutes: number; totalQuestions: number; questionType: string }) => void;
}

const toBengaliNumber = (num: number | string): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
};

// Subject chips matching video frames 00:22 - 00:30
const TOPIC_SUBJECT_CHIPS = [
  { id: 'bangla', name: 'বাংলা', count: 473 },
  { id: 'english', name: 'English', count: 513 },
  { id: 'gk', name: 'সাধারণ জ্ঞান', count: 3 },
  { id: 'physics', name: 'পদার্থবিজ্ঞান', count: 715 },
  { id: 'chemistry', name: 'রসায়ন', count: 598 },
  { id: 'biology', name: 'জীববিজ্ঞান', count: 629 },
  { id: 'math', name: 'উচ্চতর গণিত', count: 374 },
];

export const InstitutionExamListView: React.FC<InstitutionExamListViewProps> = ({
  institution,
  unit,
  onBack,
  onSelectExam,
  onStartTopicQuestions,
  onStartPracticeWithConfig,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'exam' | 'topic' | 'practice'>('exam');

  // Sub-Tab 2: Topic Wise State
  const [selectedSubjectChip, setSelectedSubjectChip] = useState<string>('physics');
  const [questionTypes, setQuestionTypes] = useState<{ mcq: boolean; written: boolean; writtenMultiple: boolean }>({
    mcq: true,
    written: false,
    writtenMultiple: false,
  });
  const [expandedPapers, setExpandedPapers] = useState<Record<string, boolean>>({
    'physics_1': true,
    'physics_2': false,
    'chemistry_1': true,
    'chemistry_2': false,
    'math_1': true,
    'math_2': false,
    'biology_1': true,
    'biology_2': false,
  });
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({
    'phy1_ch1': false,
    'phy1_ch2': true,
  });
  const [checkedChapters, setCheckedChapters] = useState<Record<string, boolean>>({});
  const [checkedTopics, setCheckedTopics] = useState<Record<string, boolean>>({});

  // Sub-Tab 3: Practice Settings State
  const [practiceDuration, setPracticeDuration] = useState<number>(20);
  const [practiceQuestionCount, setPracticeQuestionCount] = useState<number>(15);
  const [practiceQuestionType, setPracticeQuestionType] = useState<'MCQ' | 'WRITTEN' | 'CQ'>('MCQ');

  const examsList = useMemo(() => {
    if (unit && unit.exams && unit.exams.length > 0) {
      return unit.exams;
    }
    return institution.exams || [];
  }, [unit, institution.exams]);

  const filteredExams = useMemo(() => {
    if (!searchQuery.trim()) return examsList;
    const q = searchQuery.toLowerCase();
    return examsList.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.year.toLowerCase().includes(q)
    );
  }, [examsList, searchQuery]);

  const displayName = unit ? `${unit.fullName || unit.name} Admission Question Bank` : `${institution.name} Admission Question Bank`;

  // Toggle helpers for Topic tree
  const togglePaper = (paperKey: string) => {
    setExpandedPapers((prev) => ({ ...prev, [paperKey]: !prev[paperKey] }));
  };

  const toggleChapter = (chId: string) => {
    setExpandedChapters((prev) => ({ ...prev, [chId]: !prev[chId] }));
  };

  const toggleChapterCheck = (chId: string) => {
    setCheckedChapters((prev) => ({ ...prev, [chId]: !prev[chId] }));
  };

  const toggleTopicCheck = (topicId: string) => {
    setCheckedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const handleStartTopicWise = () => {
    const selectedChIds = Object.keys(checkedChapters).filter((k) => checkedChapters[k]);
    if (onStartTopicQuestions) {
      onStartTopicQuestions({
        subjectId: selectedSubjectChip,
        chapterIds: selectedChIds,
        questionType: questionTypes.mcq ? 'mcq' : 'written',
      });
    }
  };

  const handleStartPractice = () => {
    if (onStartPracticeWithConfig) {
      onStartPracticeWithConfig({
        durationMinutes: practiceDuration,
        totalQuestions: practiceQuestionCount,
        questionType: practiceQuestionType,
      });
    }
  };

  // Filter chapters based on active subject chip
  const currentSubjectChapters = useMemo(() => {
    if (selectedSubjectChip === 'physics') {
      return {
        paper1: COMPREHENSIVE_CHAPTERS_DATA.filter((c) => c.subject_id === 'physics_1'),
        paper2: COMPREHENSIVE_CHAPTERS_DATA.filter((c) => c.subject_id === 'physics_2'),
      };
    }
    if (selectedSubjectChip === 'chemistry') {
      return {
        paper1: COMPREHENSIVE_CHAPTERS_DATA.filter((c) => c.subject_id === 'chemistry_1'),
        paper2: COMPREHENSIVE_CHAPTERS_DATA.filter((c) => c.subject_id === 'chemistry_2'),
      };
    }
    if (selectedSubjectChip === 'math') {
      return {
        paper1: COMPREHENSIVE_CHAPTERS_DATA.filter((c) => c.subject_id === 'math_1'),
        paper2: COMPREHENSIVE_CHAPTERS_DATA.filter((c) => c.subject_id === 'math_2'),
      };
    }
    if (selectedSubjectChip === 'biology') {
      return {
        paper1: COMPREHENSIVE_CHAPTERS_DATA.filter((c) => c.subject_id === 'biology_1'),
        paper2: COMPREHENSIVE_CHAPTERS_DATA.filter((c) => c.subject_id === 'biology_2'),
      };
    }
    // Default fallback
    return {
      paper1: COMPREHENSIVE_CHAPTERS_DATA.filter((c) => c.subject_id?.includes('1') || c.paper === '1st').slice(0, 7),
      paper2: COMPREHENSIVE_CHAPTERS_DATA.filter((c) => c.subject_id?.includes('2') || c.paper === '2nd').slice(0, 7),
    };
  }, [selectedSubjectChip]);

  return (
    <div className="space-y-4 pb-28 max-w-2xl mx-auto px-1 sm:px-2 animate-fadeIn font-sans">
      {/* Top Header Matching Video Frame 00:06 */}
      <div className="pt-2 pb-2 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <button
            id="btn-back-to-institutions"
            onClick={onBack}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="পেছনে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-extrabold text-slate-900 dark:text-slate-100 text-base sm:text-lg tracking-tight">
            {displayName}
          </h2>
        </div>

        {/* Top Right Action (Download / Cloud) */}
        <button
          type="button"
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
          title="অফলাইন ডাউনলোড"
        >
          <DownloadCloud className="w-5 h-5" />
        </button>
      </div>

      {/* ======================= TAB 1: পরীক্ষা (EXAMS LIST) ======================= */}
      {activeSubTab === 'exam' && (
        <div className="space-y-3.5 animate-in fade-in">
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

          {/* Exam Cards List Matching Video */}
          <div className="space-y-2.5">
            {filteredExams.map((exam) => {
              return (
                <div
                  key={exam.id}
                  id={`exam-item-${exam.id}`}
                  onClick={() => onSelectExam(exam)}
                  className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm transition-all cursor-pointer group active:scale-[0.99]"
                >
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {exam.title}
                  </h3>

                  <div className="flex items-center gap-4 mt-2.5 text-xs">
                    {/* Duration badge */}
                    <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{exam.duration_label}</span>
                    </div>

                    {/* Question count badge */}
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>{toBengaliNumber(exam.total_questions)}টি প্রশ্ন</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredExams.length === 0 && (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                কোনো প্রশ্নপত্র পাওয়া যায়নি
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= TAB 2: টপিক ভিত্তিক প্রশ্ন (TOPIC-WISE QUESTIONS) ======================= */}
      {activeSubTab === 'topic' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Top Horizontal Scrollable Subjects Pills Matching Frame 00:22 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {TOPIC_SUBJECT_CHIPS.map((chip) => {
              const isSelected = selectedSubjectChip === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setSelectedSubjectChip(chip.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#1E40AF] text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  <span>{chip.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    {toBengaliNumber(chip.count)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Question Type Filter Checkboxes Matching Frame 00:23 */}
          <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={questionTypes.mcq}
                onChange={(e) => setQuestionTypes((p) => ({ ...p, mcq: e.target.checked }))}
                className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
              />
              <span>MCQ</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={questionTypes.written}
                onChange={(e) => setQuestionTypes((p) => ({ ...p, written: e.target.checked }))}
                className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
              />
              <span>Written</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={questionTypes.writtenMultiple}
                onChange={(e) => setQuestionTypes((p) => ({ ...p, writtenMultiple: e.target.checked }))}
                className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
              />
              <span>Written Multiple</span>
            </label>
          </div>

          {/* Multi-Level Accordion Tree Matching Frames 00:23 - 01:29 */}
          <div className="space-y-3">
            {/* 1st Paper Accordion */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
              <button
                onClick={() => togglePaper(`${selectedSubjectChip}_1`)}
                className="w-full p-3.5 bg-slate-50/80 dark:bg-slate-750/50 flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    ১ম পত্র
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    (৩২২)
                  </span>
                </div>
                {expandedPapers[`${selectedSubjectChip}_1`] ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {expandedPapers[`${selectedSubjectChip}_1`] && (
                <div className="p-3 space-y-2 divide-y divide-slate-100 dark:divide-slate-700/60">
                  {currentSubjectChapters.paper1.map((ch) => {
                    const isChExpanded = !!expandedChapters[ch.id];
                    const isChChecked = !!checkedChapters[ch.id];

                    return (
                      <div key={ch.id} className="pt-2 first:pt-0">
                        <div className="flex items-center justify-between py-1.5">
                          <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none flex-1">
                            <input
                              type="checkbox"
                              checked={isChChecked}
                              onChange={() => toggleChapterCheck(ch.id)}
                              className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                            />
                            <span>{ch.bangla_name}</span>
                            <span className="text-xs font-mono text-slate-400">
                              ({toBengaliNumber(ch.total_questions)})
                            </span>
                          </label>

                          {ch.subtopics && ch.subtopics.length > 0 && (
                            <button
                              onClick={() => toggleChapter(ch.id)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              {isChExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          )}
                        </div>

                        {/* Subtopics */}
                        {isChExpanded && ch.subtopics && (
                          <div className="pl-7 pr-2 py-2 space-y-2 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl my-1 border border-slate-100 dark:border-slate-700/50">
                            {ch.subtopics.map((sub) => {
                              const isSubChecked = !!checkedTopics[sub.id];
                              return (
                                <label
                                  key={sub.id}
                                  className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 py-0.5 cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isSubChecked}
                                      onChange={() => toggleTopicCheck(sub.id)}
                                      className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                                    />
                                    <span>{sub.bangla_name}</span>
                                  </div>
                                  <span className="font-mono text-slate-400 text-[11px]">
                                    ({toBengaliNumber(sub.total_questions)})
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2nd Paper Accordion */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
              <button
                onClick={() => togglePaper(`${selectedSubjectChip}_2`)}
                className="w-full p-3.5 bg-slate-50/80 dark:bg-slate-750/50 flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    ২য় পত্র
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    (৩৯৩)
                  </span>
                </div>
                {expandedPapers[`${selectedSubjectChip}_2`] ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {expandedPapers[`${selectedSubjectChip}_2`] && (
                <div className="p-3 space-y-2 divide-y divide-slate-100 dark:divide-slate-700/60">
                  {currentSubjectChapters.paper2.map((ch) => {
                    const isChExpanded = !!expandedChapters[ch.id];
                    const isChChecked = !!checkedChapters[ch.id];

                    return (
                      <div key={ch.id} className="pt-2 first:pt-0">
                        <div className="flex items-center justify-between py-1.5">
                          <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none flex-1">
                            <input
                              type="checkbox"
                              checked={isChChecked}
                              onChange={() => toggleChapterCheck(ch.id)}
                              className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                            />
                            <span>{ch.bangla_name}</span>
                            <span className="text-xs font-mono text-slate-400">
                              ({toBengaliNumber(ch.total_questions)})
                            </span>
                          </label>

                          {ch.subtopics && ch.subtopics.length > 0 && (
                            <button
                              onClick={() => toggleChapter(ch.id)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              {isChExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          )}
                        </div>

                        {/* Subtopics */}
                        {isChExpanded && ch.subtopics && (
                          <div className="pl-7 pr-2 py-2 space-y-2 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl my-1 border border-slate-100 dark:border-slate-700/50">
                            {ch.subtopics.map((sub) => {
                              const isSubChecked = !!checkedTopics[sub.id];
                              return (
                                <label
                                  key={sub.id}
                                  className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 py-0.5 cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isSubChecked}
                                      onChange={() => toggleTopicCheck(sub.id)}
                                      className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                                    />
                                    <span>{sub.bangla_name}</span>
                                  </div>
                                  <span className="font-mono text-slate-400 text-[11px]">
                                    ({toBengaliNumber(sub.total_questions)})
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Action Button for Topic Wise Matching Frame 00:23 */}
          <div className="pt-2">
            <button
              onClick={handleStartTopicWise}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-sm sm:text-base shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer text-center flex items-center justify-center gap-2"
            >
              <span>শুরু করো</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================= TAB 3: প্র্যাকটিস (PRACTICE SETUP) ======================= */}
      {activeSubTab === 'practice' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-5">
            {/* Total Time Input */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                মোট সময় (মিনিট)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={practiceDuration}
                  onChange={(e) => setPracticeDuration(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                  মিনিট
                </span>
              </div>
            </div>

            {/* Total Question Count Input */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                মোট প্রশ্ন
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={practiceQuestionCount}
                  onChange={(e) => setPracticeQuestionCount(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                  টি
                </span>
              </div>
            </div>

            {/* Question Type Selector Matching Video Frame 01:31 */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                প্রশ্নের ধরন
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['MCQ', 'WRITTEN', 'CQ'] as const).map((type) => {
                  const isSelected = practiceQuestionType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPracticeQuestionType(type)}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-650'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sticky Start Button Matching Frame 01:31 */}
          <div className="pt-2">
            <button
              onClick={handleStartPractice}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-sm sm:text-base shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer text-center flex items-center justify-center gap-2"
            >
              <span>শুরু করো</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================= BOTTOM 3 SUB-TABS (Sticky Bar) ======================= */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 py-2 px-3 max-w-2xl mx-auto shadow-lg">
        <div className="flex items-center justify-around gap-2 text-xs">
          <button
            id="subtab-exam"
            onClick={() => setActiveSubTab('exam')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer text-center ${
              activeSubTab === 'exam'
                ? 'text-emerald-600 dark:text-emerald-400 font-black border-b-2 border-emerald-600 dark:border-emerald-400'
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
                ? 'text-emerald-600 dark:text-emerald-400 font-black border-b-2 border-emerald-600 dark:border-emerald-400'
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
                ? 'text-emerald-600 dark:text-emerald-400 font-black border-b-2 border-emerald-600 dark:border-emerald-400'
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
