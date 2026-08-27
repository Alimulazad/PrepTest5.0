import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Check, Plus, Swords, Zap } from 'lucide-react';
import { SUBJECT_TOPICS_DATABASE, EXAM_SUBJECTS } from './examData';
import { PaperNode } from './types';

interface ExamTopicSelectPageProps {
  subjectKey: string;
  onBack: () => void;
  onNext: (data: {
    selectedSubTopicIds: string[];
    selectedChapterIds: string[];
    selectedPaperIds: string[];
    questionCount: number;
  }) => void;
  onAddAnotherSubject?: () => void;
  onOpenChapterBattle?: (chapterId: string, chapterName: string) => void;
}

export const ExamTopicSelectPage: React.FC<ExamTopicSelectPageProps> = ({
  subjectKey,
  onBack,
  onNext,
  onAddAnotherSubject,
  onOpenChapterBattle,
}) => {
  const subject = EXAM_SUBJECTS.find((s) => s.key === subjectKey) || EXAM_SUBJECTS[6]; // fallback Chemistry
  const papers: PaperNode[] = SUBJECT_TOPICS_DATABASE[subjectKey] || SUBJECT_TOPICS_DATABASE['chemistry'];

  // State for expansions
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({
    chem1_ch2: true, // open Qualitative Chemistry by default matching screenshot
    chem2_ch1: true,
  });

  // State for selections
  const [selectedSubTopics, setSelectedSubTopics] = useState<Record<string, boolean>>({
    c1_2_1: false,
    c1_2_2: false,
    c2_1_1: true,
    c2_1_2: true,
  });
  const [selectedChapters, setSelectedChapters] = useState<Record<string, boolean>>({
    chem1_ch4: true, // Chemical change selected
  });
  const [selectedPapers, setSelectedPapers] = useState<Record<string, boolean>>({});
  const [questionCount, setQuestionCount] = useState<number>(30);

  const toggleChapterExpand = (chapterId: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  const handleToggleSubTopic = (subId: string, chapterId: string, paperId: string) => {
    setSelectedSubTopics((prev) => ({
      ...prev,
      [subId]: !prev[subId],
    }));
  };

  const handleToggleChapter = (chapterId: string, paper: PaperNode) => {
    const isSelected = !!selectedChapters[chapterId];
    const chapter = paper.chapters.find((c) => c.id === chapterId);
    
    const newSubState = { ...selectedSubTopics };
    if (chapter?.subtopics) {
      chapter.subtopics.forEach((sub) => {
        newSubState[sub.id] = !isSelected;
      });
    }
    
    setSelectedSubTopics(newSubState);
    setSelectedChapters((prev) => ({
      ...prev,
      [chapterId]: !isSelected,
    }));
  };

  const handleTogglePaper = (paper: PaperNode) => {
    const paperId = paper.paper;
    const isSelected = !!selectedPapers[paperId];

    const newChapState = { ...selectedChapters };
    const newSubState = { ...selectedSubTopics };

    paper.chapters.forEach((chap) => {
      newChapState[chap.id] = !isSelected;
      chap.subtopics?.forEach((sub) => {
        newSubState[sub.id] = !isSelected;
      });
    });

    setSelectedPapers((prev) => ({ ...prev, [paperId]: !isSelected }));
    setSelectedChapters(newChapState);
    setSelectedSubTopics(newSubState);
  };

  // Calculate selected counts for paper badge
  const getPaperSelectedCount = (paper: PaperNode) => {
    let count = 0;
    paper.chapters.forEach((ch) => {
      if (selectedChapters[ch.id]) {
        count += ch.subtopics?.length || 1;
      } else {
        ch.subtopics?.forEach((sub) => {
          if (selectedSubTopics[sub.id]) count += 1;
        });
      }
    });
    return count;
  };

  const handleProceed = () => {
    const subTopicIds = Object.keys(selectedSubTopics).filter((k) => selectedSubTopics[k]);
    const chapterIds = Object.keys(selectedChapters).filter((k) => selectedChapters[k]);
    const paperIds = Object.keys(selectedPapers).filter((k) => selectedPapers[k]);

    onNext({
      selectedSubTopicIds: subTopicIds,
      selectedChapterIds: chapterIds,
      selectedPaperIds: paperIds,
      questionCount: Math.max(5, questionCount || 25),
    });
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-slate-900 pb-36 flex flex-col">
      {/* Top Fixed Header Matching Screenshots */}
      <div className="sticky top-0 z-30 bg-[#F8FAFC] dark:bg-slate-900 px-4 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">টপিক সিলেক্ট করো</h2>
          </div>

          {/* 1/3 Steps Badge */}
          <div className="px-2.5 py-0.5 bg-[#047857]/15 dark:bg-emerald-950/50 rounded-full">
            <span className="text-xs font-bold text-[#047857] dark:text-emerald-400">১/৩ স্টেপস</span>
          </div>
        </div>

        {/* 3-Part Progress Line */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-1.5 rounded-full bg-[#047857] dark:bg-emerald-500" />
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>

      {/* Main Hierarchical Topic Selection Area */}
      <div className="p-4 space-y-4 max-w-xl mx-auto w-full">
        {papers.map((paper) => {
          const isPaperSelected = !!selectedPapers[paper.paper];
          const selectedCount = getPaperSelectedCount(paper);

          return (
            <div
              key={paper.paper}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs"
            >
              {/* Paper Header Row */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/90 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div
                  onClick={() => handleTogglePaper(paper)}
                  className="flex items-center gap-3 cursor-pointer select-none"
                >
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isPaperSelected
                        ? 'bg-[#047857] border-[#047857] text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                    }`}
                  >
                    {isPaperSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{paper.label}</h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {paper.solvedQuestions}/{paper.totalQuestions >= 1000 ? `${(paper.totalQuestions / 1000).toFixed(1)}K` : paper.totalQuestions} টি প্রশ্ন
                    </p>
                  </div>
                </div>

                {/* Selected count pill */}
                {selectedCount > 0 && (
                  <div className="w-6 h-6 rounded-full bg-[#047857] text-white text-xs font-bold flex items-center justify-center">
                    {selectedCount}
                  </div>
                )}
              </div>

              {/* Chapters List */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {paper.chapters.map((chapter) => {
                  const isChapterSelected = !!selectedChapters[chapter.id];
                  const isExpanded = !!expandedChapters[chapter.id];
                  const subCount = chapter.subtopics?.length || 0;

                  return (
                    <div key={chapter.id} className="bg-white dark:bg-slate-800">
                      {/* Chapter Item Row */}
                      <div className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <div
                          onClick={() => handleToggleChapter(chapter.id, paper)}
                          className="flex items-center gap-3 cursor-pointer select-none flex-1 pr-2"
                        >
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                              isChapterSelected
                                ? 'bg-[#047857] border-[#047857] text-white'
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                            }`}
                          >
                            {isChapterSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>

                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">
                              {chapter.name}
                            </p>
                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                              {chapter.solvedQuestions}/{chapter.totalQuestions >= 1000 ? `${(chapter.totalQuestions / 1000).toFixed(1)}K` : chapter.totalQuestions}
                            </p>
                          </div>
                        </div>

                        {/* Quick Battle Trigger & Expand Button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {onOpenChapterBattle && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenChapterBattle(chapter.id, chapter.name);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
                              title="ব্যাটেল বা দ্রুত প্র্যাকটিস খেলুন"
                            >
                              <Swords className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              <span className="hidden sm:inline">ব্যাটেল</span>
                            </button>
                          )}

                          {subCount > 0 && (
                            <button
                              onClick={() => toggleChapterExpand(chapter.id)}
                              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Subtopics Expanded Panel */}
                      {isExpanded && subCount > 0 && (
                        <div className="bg-slate-50/50 dark:bg-slate-900/50 pl-11 pr-4 py-2 space-y-2 border-t border-slate-100 dark:border-slate-700">
                          {chapter.subtopics.map((sub) => {
                            const isSubSelected =
                              isChapterSelected || !!selectedSubTopics[sub.id];

                            return (
                              <div
                                key={sub.id}
                                onClick={() =>
                                  handleToggleSubTopic(sub.id, chapter.id, paper.paper)
                                }
                                className="flex items-center justify-between py-1.5 cursor-pointer select-none group"
                              >
                                <div className="flex items-center gap-2.5 flex-1 pr-2">
                                  <div
                                    className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                      isSubSelected
                                        ? 'bg-[#047857] border-[#047857] text-white'
                                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                                    }`}
                                  >
                                    {isSubSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span
                                    className={`text-xs sm:text-[13px] leading-relaxed transition-colors ${
                                      isSubSelected
                                        ? 'font-bold text-slate-900 dark:text-slate-100'
                                        : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                                    }`}
                                  >
                                    {sub.name}
                                  </span>
                                </div>

                                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                                  {sub.solvedQuestions}/{sub.totalQuestions}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Bar Matching Screenshots */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 shadow-xl">
        <div className="max-w-xl mx-auto space-y-3">
          {/* Row 1: Questions count selector */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">প্রশ্নের সংখ্যা</span>
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-600">
              <input
                type="number"
                min={5}
                max={100}
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value) || 0)}
                className="w-12 text-center font-bold text-slate-900 dark:text-slate-100 bg-transparent focus:outline-hidden text-sm"
              />
            </div>
          </div>

          {/* Row 2: Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onAddAnotherSubject || onBack}
              className="py-3 px-3 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              আরেকটি বিষয়
            </button>

            <button
              onClick={handleProceed}
              className="py-3 px-3 rounded-xl bg-[#047857] hover:bg-[#065f46] active:bg-[#064e3b] text-white font-bold text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center"
            >
              এগিয়ে যাও
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
