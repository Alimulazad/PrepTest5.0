import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { ExamSetupState } from './types';
import { EXAM_SUBJECTS } from './examData';

interface ExamConfirmPageProps {
  setupData: ExamSetupState;
  onBack: () => void;
  onStartExam: (finalState: ExamSetupState) => void;
}

export const ExamConfirmPage: React.FC<ExamConfirmPageProps> = ({
  setupData,
  onBack,
  onStartExam,
}) => {
  const [questionType, setQuestionType] = useState<'mcq' | 'written'>(setupData.questionType || 'mcq');
  const [questionCount, setQuestionCount] = useState<number>(setupData.questionCount || 30);
  const [durationMinutes, setDurationMinutes] = useState<number>(setupData.durationMinutes || 30);
  const [negativeMarking, setNegativeMarking] = useState<boolean>(
    setupData.negativeMarking !== undefined ? setupData.negativeMarking : true
  );
  const [isTopicTreeExpanded, setIsTopicTreeExpanded] = useState<boolean>(true);

  const subject = EXAM_SUBJECTS.find((s) => s.key === setupData.subjectKey) || EXAM_SUBJECTS[6];

  const handleStart = () => {
    onStartExam({
      ...setupData,
      questionType,
      questionCount: Math.max(5, questionCount || 25),
      durationMinutes: Math.max(1, durationMinutes || 30),
      negativeMarking,
    });
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-slate-900 pb-48 flex flex-col">
      {/* Top Header Matching Screenshots */}
      <div className="sticky top-0 z-30 bg-[#F8FAFC] dark:bg-slate-900 px-4 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">নিশ্চিত করো</h2>
          </div>

          {/* 3/3 Steps Badge */}
          <div className="px-2.5 py-0.5 bg-[#047857]/15 dark:bg-emerald-950/50 rounded-full">
            <span className="text-xs font-bold text-[#047857] dark:text-emerald-400">৩/৩ স্টেপস</span>
          </div>
        </div>

        {/* 3-Part Progress Line - ALL ACTIVE GREEN */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-1.5 rounded-full bg-[#047857] dark:bg-emerald-500" />
          <div className="h-1.5 rounded-full bg-[#047857] dark:bg-emerald-500" />
          <div className="h-1.5 rounded-full bg-[#047857] dark:bg-emerald-500" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 max-w-xl mx-auto w-full space-y-5 flex-1">
        {/* Section: Question Type */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">প্রশ্নের ধরন</h3>
          <div className="grid grid-cols-2 gap-2 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setQuestionType('mcq')}
              className={`py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                questionType === 'mcq'
                  ? 'bg-[#7E22CE] text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              MCQ
            </button>
            <button
              type="button"
              onClick={() => setQuestionType('written')}
              className={`py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                questionType === 'written'
                  ? 'bg-[#7E22CE] text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              WRITTEN
            </button>
          </div>
        </div>

        {/* Section: Selected Subject (1) */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">সিলেক্টেড বিষয় (১)</h3>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-2xs space-y-3">
            {/* Subject row with question count */}
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-base">{subject.name}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value) || 0)}
                  className="w-14 text-center font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 rounded-lg py-1 border border-slate-200 dark:border-slate-600 focus:outline-hidden text-sm"
                />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">টি প্রশ্ন</span>
              </div>
            </div>

            {/* Expandable Topic Accordion */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
              <button
                type="button"
                onClick={() => setIsTopicTreeExpanded(!isTopicTreeExpanded)}
                className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
              >
                <span>সিলেক্টেড টপিকস দেখতে এখানে ট্যাপ করো</span>
                {isTopicTreeExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {isTopicTreeExpanded && (
                <div className="mt-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3.5 text-xs text-slate-700 dark:text-slate-300 space-y-2 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#047857]" />
                      {subject.name} ({questionCount}টি প্রশ্ন)
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      ১২/২K টি প্রশ্ন সলভ করা হয়েছে
                    </span>
                  </div>

                  <div className="space-y-2 pt-1 pl-2">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">১ম পত্র</p>
                      <ul className="list-disc pl-4 text-slate-600 dark:text-slate-400 space-y-0.5 mt-0.5">
                        <li>রাসায়নিক পরিবর্তন: সকল টপিক</li>
                        <li>গুণগত রসায়ন: কোয়ান্টাম সংখ্যা ও মডেল</li>
                      </ul>
                    </div>

                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">২য় পত্র</p>
                      <ul className="list-disc pl-4 text-slate-600 dark:text-slate-400 space-y-0.5 mt-0.5">
                        <li>পরিবেশ রসায়ন: ১.১ বায়ুমণ্ডল এর গঠন, উপাদান</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Settings and Action Bar Matching Screenshot 5 & 6 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 shadow-xl">
        <div className="max-w-xl mx-auto space-y-3.5">
          {/* Row 1: Duration Settings */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">মোট সময়</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={180}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                className="w-14 text-center font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 rounded-lg py-1 border border-slate-200 dark:border-slate-600 focus:outline-hidden text-sm"
              />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">মিনিট</span>
            </div>
          </div>

          {/* Row 2: Negative Marking Toggle with pink/red notice badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">নেগেটিভ মার্কিং</span>
              <button
                type="button"
                onClick={() => setNegativeMarking(!negativeMarking)}
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  negativeMarking ? 'bg-[#047857]' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    negativeMarking ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {negativeMarking && (
              <div className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900 rounded-full">
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-300">
                  প্রতি ভুলে ০.২৫ মার্কস কাটা যাবে
                </span>
              </div>
            )}
          </div>

          {/* Row 3: Start Exam Button */}
          <button
            type="button"
            onClick={handleStart}
            className="w-full py-3.5 bg-[#047857] hover:bg-[#065f46] active:bg-[#064e3b] text-white font-bold rounded-xl shadow-md transition-all active:scale-98 cursor-pointer text-base flex items-center justify-center tracking-wide"
          >
            পরীক্ষা শুরু করো
          </button>
        </div>
      </div>
    </div>
  );
};
