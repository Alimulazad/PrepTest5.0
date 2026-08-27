import React, { useMemo } from 'react';
import { Sparkles, PenSquare, CheckCircle2, AlertTriangle, ArrowRight, BrainCircuit } from 'lucide-react';
import { UserProgress, Question } from '../types';

interface WeakTopicsCardProps {
  progress: UserProgress;
  questions: Question[];
  onPracticeTopic: (chapterId: string) => void;
  onAskAIAboutTopic: (topicName: string) => void;
  maxTopics?: number;
}

interface GroupedWeakTopic {
  chapterId: string;
  chapterName: string;
  subjectName: string;
  mistakeCount: number;
}

export const WeakTopicsCard: React.FC<WeakTopicsCardProps> = ({
  progress,
  questions,
  onPracticeTopic,
  onAskAIAboutTopic,
  maxTopics = 3,
}) => {
  const weakTopics = useMemo(() => {
    const unresolved = progress.pastMistakes
      ? progress.pastMistakes.filter((m) => !m.resolved)
      : [];

    if (unresolved.length === 0) return [];

    const sourceQuestions = questions && questions.length > 0 ? questions : [];
    const topicMap: { [key: string]: GroupedWeakTopic } = {};

    unresolved.forEach((m) => {
      const q = sourceQuestions.find((item) => item.id === m.questionId);
      if (q) {
        const cId = q.chapter_id || 'general';
        const cName = q.chapter_name || q.topic_name || q.subject_name || 'সাধারণ প্র্যাকটিস';
        const sName = q.subject_name || '';

        if (!topicMap[cId]) {
          topicMap[cId] = {
            chapterId: cId,
            chapterName: cName,
            subjectName: sName,
            mistakeCount: 0,
          };
        }
        topicMap[cId].mistakeCount += 1;
      }
    });

    return Object.values(topicMap)
      .sort((a, b) => b.mistakeCount - a.mistakeCount)
      .slice(0, maxTopics);
  }, [progress.pastMistakes, questions, maxTopics]);

  if (weakTopics.length === 0) {
    return (
      <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 text-emerald-900 dark:text-emerald-200 shadow-2xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="grow">
          <h4 className="font-bold text-xs sm:text-sm text-emerald-950 dark:text-emerald-100">দুর্বল অধ্যায় অ্যানালাইসিস</h4>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium mt-0.5">
            এখনো কোনো দুর্বল টপিক পাওয়া যায়নি, দারুণ করছো!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-rose-100 dark:border-slate-700 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-rose-100/60 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm leading-tight">
              দুর্বল অধ্যায় ও টপিকসমূহ
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              যে অধ্যায়গুলোতে বেশি ভুল হচ্ছে — AI দিয়ে রিভিশন দাও
            </p>
          </div>
        </div>
        <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-extrabold px-2 py-0.5 rounded-full font-mono border border-rose-200/60 dark:border-rose-800">
          {weakTopics.length}টি দুর্বল টপিক
        </span>
      </div>

      {/* Weak Topics List */}
      <div className="space-y-2.5">
        {weakTopics.map((topic) => (
          <div
            key={topic.chapterId}
            className="p-3 bg-slate-50/80 dark:bg-slate-900/60 hover:bg-rose-50/30 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-all space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    {topic.chapterName}
                  </span>
                  {topic.subjectName && (
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-1.5 py-0.5 rounded">
                      {topic.subjectName}
                    </span>
                  )}
                </div>
              </div>

              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                {topic.mistakeCount} টি ভুল
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => onAskAIAboutTopic(topic.chapterName)}
                className="grow py-1.5 px-2.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 font-bold text-xs rounded-lg transition-colors border border-indigo-200/80 dark:border-indigo-800 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 fill-indigo-200 dark:fill-indigo-900 shrink-0" />
                <span>কনসেপ্ট বুঝো</span>
              </button>

              <button
                type="button"
                onClick={() => onPracticeTopic(topic.chapterId)}
                className="grow py-1.5 px-2.5 bg-[#1E3A8A] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <PenSquare className="w-3.5 h-3.5 shrink-0" />
                <span>প্র্যাকটিস করো</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeakTopicsCard;
