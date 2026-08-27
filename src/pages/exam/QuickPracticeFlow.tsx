import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, Swords, Zap, X, Sparkles } from 'lucide-react';
import { SubjectIcon } from './components/SubjectIcon';
import { EXAM_SUBJECTS, SUBJECT_TOPICS_DATABASE, PRESET_EXAMS_LIST } from './examData';
import { PresetExamConfig, PaperNode, ChapterNode, SubTopicNode } from './types';
import { BattleOrSoloModal } from '../../components/BattleOrSoloModal';

interface QuickPracticeFlowProps {
  onStartSoloPractice: (chapterId: string, chapterName: string, subjectKey: string) => void;
  onStartBattle: (chapterId: string, chapterName: string, subjectKey: string) => void;
  onStartPresetExam: (preset: PresetExamConfig, optionalSelected: string[]) => void;
  onSelectTopicSelectForMock: (subjectKey: string) => void;
  solvedChapterMap?: Record<string, number>; // chapterId -> percentage (0-100)
}

export const QuickPracticeFlow: React.FC<QuickPracticeFlowProps> = ({
  onStartSoloPractice,
  onStartBattle,
  onStartPresetExam,
  onSelectTopicSelectForMock,
  solvedChapterMap = {},
}) => {
  // Navigation level in Exam tab: 'main_tabs' | 'paper_select' | 'chapter_list' | 'subtopic_breakdown'
  const [activeTab, setActiveTab] = useState<'mock' | 'quick'>('quick');
  
  // Navigation stack state
  const [selectedSubjectKey, setSelectedSubjectKey] = useState<string | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<'1st' | '2nd' | null>(null);
  const [selectedChapterForSubtopics, setSelectedChapterForSubtopics] = useState<ChapterNode | null>(null);

  // Battle vs Solo Modal
  const [modalData, setModalData] = useState<{
    chapterId: string;
    chapterName: string;
    subjectName: string;
  } | null>(null);

  // Preset Exam Modal state for Mock Test tab
  const [selectedPreset, setSelectedPreset] = useState<PresetExamConfig | null>(null);
  const [selectedOptionals, setSelectedOptionals] = useState<string[]>([]);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const currentSubject = EXAM_SUBJECTS.find((s) => s.key === selectedSubjectKey);
  const papers: PaperNode[] = selectedSubjectKey
    ? SUBJECT_TOPICS_DATABASE[selectedSubjectKey] || SUBJECT_TOPICS_DATABASE['physics'] || []
    : [];

  const currentPaperData = papers.find((p) => p.paper === selectedPaper);

  // Handlers for breadcrumb / back navigation
  const handleBack = () => {
    if (selectedChapterForSubtopics) {
      setSelectedChapterForSubtopics(null);
    } else if (selectedPaper) {
      // If subject has multiple papers, go back to paper select
      if (papers.length > 1) {
        setSelectedPaper(null);
      } else {
        setSelectedPaper(null);
        setSelectedSubjectKey(null);
      }
    } else if (selectedSubjectKey) {
      setSelectedSubjectKey(null);
    }
  };

  const handleSelectSubject = (subjectKey: string) => {
    if (activeTab === 'mock') {
      onSelectTopicSelectForMock(subjectKey);
      return;
    }

    const subPapers = SUBJECT_TOPICS_DATABASE[subjectKey] || SUBJECT_TOPICS_DATABASE['physics'] || [];
    setSelectedSubjectKey(subjectKey);

    if (subPapers.length === 1) {
      // If single paper subject (e.g. Bangla or GK), directly open chapters
      setSelectedPaper(subPapers[0].paper);
    } else {
      setSelectedPaper(null);
    }
  };

  const handleSelectPaper = (paper: '1st' | '2nd') => {
    setSelectedPaper(paper);
  };

  const handleRowClickForPractice = (chapter: ChapterNode) => {
    setModalData({
      chapterId: chapter.id,
      chapterName: chapter.name,
      subjectName: currentSubject?.name || 'পদার্থবিজ্ঞান',
    });
  };

  const handleOpenSubtopicsBreakdown = (e: React.MouseEvent, chapter: ChapterNode) => {
    e.stopPropagation();
    setSelectedChapterForSubtopics(chapter);
  };

  // Mock Preset handlers
  const handleToggleOptional = (subjectKey: string) => {
    if (!selectedPreset) return;
    if (selectedOptionals.includes(subjectKey)) {
      setSelectedOptionals(selectedOptionals.filter((s) => s !== subjectKey));
    } else {
      if (selectedOptionals.length >= selectedPreset.requiredOptionalCount) {
        setSelectedOptionals([...selectedOptionals.slice(1), subjectKey]);
      } else {
        setSelectedOptionals([...selectedOptionals, subjectKey]);
      }
    }
  };

  const handleStartPreset = () => {
    if (!selectedPreset) return;
    if (
      selectedPreset.requiredOptionalCount > 0 &&
      selectedOptionals.length !== selectedPreset.requiredOptionalCount
    ) {
      setAlertMessage(`${selectedPreset.requiredOptionalCount} টি ঐচ্ছিক বিষয় নির্বাচন করো`);
      return;
    }
    onStartPresetExam(selectedPreset, selectedOptionals);
    setSelectedPreset(null);
  };

  // Render Sub-topic Breakdown View (Step 3.1)
  if (selectedChapterForSubtopics && currentSubject) {
    return (
      <div className="w-full pb-24 max-w-lg mx-auto">
        {/* Top Header Tabs */}
        <div className="flex items-center justify-center gap-10 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
          <button
            onClick={() => {
              setActiveTab('mock');
              setSelectedChapterForSubtopics(null);
              setSelectedPaper(null);
              setSelectedSubjectKey(null);
            }}
            className="text-lg font-bold pb-2 text-slate-400 dark:text-slate-500 cursor-pointer"
          >
            মক পরীক্ষা
          </button>
          <button
            onClick={() => setActiveTab('quick')}
            className="text-lg font-bold pb-2 relative text-slate-900 dark:text-slate-100 font-extrabold cursor-pointer"
          >
            দ্রুত প্র্যাকটিস
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2e7d32] dark:bg-emerald-500 rounded-full" />
          </button>
        </div>

        {/* Back + Chapter Title */}
        <div className="flex items-center gap-3 px-3 mb-5">
          <button
            onClick={handleBack}
            className="p-1.5 -ml-1 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="পেছনে যান"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
            {selectedChapterForSubtopics.name}
          </h2>
        </div>

        {/* Subtopic list with progress bars */}
        <div className="space-y-3 px-3">
          {selectedChapterForSubtopics.subtopics && selectedChapterForSubtopics.subtopics.length > 0 ? (
            selectedChapterForSubtopics.subtopics.map((sub, idx) => {
              const progPercent = (idx % 2 === 0 ? 15 : 0); // initial sample state matching video
              return (
                <div
                  key={sub.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700 p-4 shadow-2xs overflow-hidden"
                >
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {sub.name}
                  </p>
                  {/* Thin Progress bar below */}
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-[#2e7d32] dark:bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progPercent}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-slate-400 text-sm">
              এই অধ্যায়ের কোনো সাব-টপিক তালিকাভুক্ত নেই
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Chapter List (Step 3)
  if (selectedPaper && currentSubject && currentPaperData) {
    return (
      <div className="w-full pb-24 max-w-lg mx-auto">
        {/* Battle Modal */}
        {modalData && (
          <BattleOrSoloModal
            isOpen={!!modalData}
            onClose={() => setModalData(null)}
            subjectName={modalData.subjectName}
            chapterTitle={modalData.chapterName}
            onSelectBattle={() => {
              const data = { ...modalData };
              setModalData(null);
              onStartBattle(data.chapterId, data.chapterName, selectedSubjectKey || 'physics');
            }}
            onSelectSolo={() => {
              const data = { ...modalData };
              setModalData(null);
              onStartSoloPractice(data.chapterId, data.chapterName, selectedSubjectKey || 'physics');
            }}
          />
        )}

        {/* Top Main Tab Navigation */}
        <div className="flex items-center justify-center gap-10 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
          <button
            onClick={() => {
              setActiveTab('mock');
              setSelectedPaper(null);
              setSelectedSubjectKey(null);
            }}
            className="text-lg font-bold pb-2 text-slate-400 dark:text-slate-500 cursor-pointer"
          >
            মক পরীক্ষা
          </button>
          <button
            onClick={() => setActiveTab('quick')}
            className="text-lg font-bold pb-2 relative text-slate-900 dark:text-slate-100 font-extrabold cursor-pointer"
          >
            দ্রুত প্র্যাকটিস
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2e7d32] dark:bg-emerald-500 rounded-full" />
          </button>
        </div>

        {/* Back + Paper Label */}
        <div className="flex items-center gap-3 px-3 mb-4">
          <button
            onClick={handleBack}
            className="p-1.5 -ml-1 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="পেছনে যান"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            {currentPaperData.label || `${selectedPaper === '1st' ? '১ম' : '২য়'} পত্র`}
          </h2>
        </div>

        {/* Chapters Vertical List with Progress bar & Chevron */}
        <div className="space-y-3 px-3">
          {currentPaperData.chapters.map((ch, idx) => {
            const currentPercentage = solvedChapterMap[ch.id] || (idx === 0 ? 12 : 0);
            return (
              <div
                key={ch.id}
                onClick={() => handleRowClickForPractice(ch)}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700 p-4 shadow-2xs hover:border-[#2e7d32] dark:hover:border-emerald-500 transition-all cursor-pointer active:scale-[0.99] select-none"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                    {ch.name}
                  </span>

                  {/* Chevron button with circular subtle border for subtopics overview */}
                  <button
                    type="button"
                    onClick={(e) => handleOpenSubtopicsBreakdown(e, ch)}
                    className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
                    title="সাব-টপিক ব্রেকডাউন দেখুন"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* Progress bar at the bottom of chapter card */}
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-[#2e7d32] dark:bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, currentPercentage))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Render Paper Selection (Step 2)
  if (selectedSubjectKey && currentSubject && papers.length > 1) {
    return (
      <div className="w-full pb-24 max-w-lg mx-auto">
        {/* Top Main Tab Navigation */}
        <div className="flex items-center justify-center gap-10 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
          <button
            onClick={() => {
              setActiveTab('mock');
              setSelectedSubjectKey(null);
            }}
            className="text-lg font-bold pb-2 text-slate-400 dark:text-slate-500 cursor-pointer"
          >
            মক পরীক্ষা
          </button>
          <button
            onClick={() => setActiveTab('quick')}
            className="text-lg font-bold pb-2 relative text-slate-900 dark:text-slate-100 font-extrabold cursor-pointer"
          >
            দ্রুত প্র্যাকটিস
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2e7d32] dark:bg-emerald-500 rounded-full" />
          </button>
        </div>

        {/* Back + Subject Name */}
        <div className="flex items-center gap-3 px-3 mb-6">
          <button
            onClick={handleBack}
            className="p-1.5 -ml-1 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="পেছনে যান"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            {currentSubject.name}
          </h2>
        </div>

        {/* 2 Paper Cards: ১ম পত্র & ২য় পত্র */}
        <div className="space-y-3.5 px-3">
          {papers.map((p) => (
            <button
              key={p.paper}
              onClick={() => handleSelectPaper(p.paper)}
              className="w-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700 p-5 shadow-2xs hover:border-[#2e7d32] dark:hover:border-emerald-500 transition-all text-left cursor-pointer active:scale-[0.99] select-none block group"
            >
              <span className="font-bold text-slate-800 dark:text-slate-200 text-base group-hover:text-[#2e7d32] dark:group-hover:text-emerald-400 transition-colors">
                {p.label || `${p.paper === '1st' ? '১ম' : '২য়'} পত্র`}
              </span>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-4 overflow-hidden">
                <div
                  className="bg-[#2e7d32] dark:bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: p.paper === '1st' ? '12%' : '4%' }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Render Step 1: Subject List (Vertical 1-column with colored emojis)
  return (
    <div className="w-full pb-24 max-w-lg mx-auto">
      {/* Top Main Tab Navigation */}
      <div className="flex items-center justify-center gap-10 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
        <button
          onClick={() => setActiveTab('mock')}
          className={`text-lg font-bold pb-2 relative transition-all cursor-pointer ${
            activeTab === 'mock'
              ? 'text-slate-900 dark:text-slate-100 font-extrabold'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          মক পরীক্ষা
          {activeTab === 'mock' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2e7d32] dark:bg-emerald-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('quick')}
          className={`text-lg font-bold pb-2 relative transition-all cursor-pointer ${
            activeTab === 'quick'
              ? 'text-slate-900 dark:text-slate-100 font-extrabold'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          দ্রুত প্র্যাকটিস
          {activeTab === 'quick' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2e7d32] dark:bg-emerald-500 rounded-full" />
          )}
        </button>
      </div>

      {/* When activeTab is 'quick', render vertical subject list matching video */}
      {activeTab === 'quick' ? (
        <div className="space-y-3 px-3">
          {EXAM_SUBJECTS.map((sub) => (
            <button
              key={sub.key}
              onClick={() => handleSelectSubject(sub.key)}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-2xs hover:border-[#2e7d32] dark:hover:border-emerald-500 transition-all active:scale-[0.99] text-left cursor-pointer group"
            >
              <div className="shrink-0 flex items-center justify-center w-7 h-7">
                <SubjectIcon type={sub.iconType} className="w-6 h-6" />
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base group-hover:text-[#2e7d32] dark:group-hover:text-emerald-400 transition-colors">
                {sub.name}
              </span>
            </button>
          ))}
        </div>
      ) : (
        /* When activeTab is 'mock', show 2-column subject grid + presets */
        <div className="px-3">
          <div className="text-center mb-4">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-wide">
              বিষয় ভিত্তিক
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {EXAM_SUBJECTS.map((sub) => (
              <button
                key={sub.key}
                onClick={() => onSelectTopicSelectForMock(sub.key)}
                className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all active:scale-98 text-left cursor-pointer group"
              >
                <div className="shrink-0 flex items-center justify-center w-7 h-7">
                  <SubjectIcon type={sub.iconType} className="w-6 h-6" />
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-[15px] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {sub.name}
                </span>
              </button>
            ))}
          </div>

          {/* Preset Exams */}
          <div className="space-y-3 mb-6">
            <div className="text-center">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">প্রিসেট পরীক্ষা</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {PRESET_EXAMS_LIST.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedPreset(preset);
                    setSelectedOptionals([]);
                    setAlertMessage(null);
                  }}
                  className="px-5 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-600 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/40 text-slate-800 dark:text-slate-200 text-sm font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Preset Bottom Sheet Modal */}
          {selectedPreset && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center">
              <div className="bg-[#F8FAFC] dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {selectedPreset.title}
                  </h3>
                  <button
                    onClick={() => setSelectedPreset(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">প্রশ্ন বণ্টন</h4>
                  {selectedPreset.mandatorySubjects.map((sub, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
                      <span>{sub.name} - {sub.count}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleStartPreset}
                  className="w-full py-3.5 bg-[#2e7d32] hover:bg-[#1b5e20] text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  পরীক্ষা শুরু করো
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
