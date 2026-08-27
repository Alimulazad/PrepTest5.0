import React, { useState } from 'react';
import { Bookmark, AlertCircle, FileText, CheckCircle2, Trash2, Eye, EyeOff } from 'lucide-react';
import { Question, UserProgress, MistakeLog } from '../types';
import QuestionCard from '../components/QuestionCard';
import EmptyState from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';

interface HistoryScreenProps {
  questions: Question[];
  progress: UserProgress;
  onSaveProgress: (updated: Partial<UserProgress>) => void;
  onAskAI: (question: Question) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  questions,
  progress,
  onSaveProgress,
  onAskAI,
}) => {
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'mistakes' | 'exams'>('bookmarks');
  const [showAllAnswers, setShowAllAnswers] = useState<boolean>(false);
  const toast = useToast();

  // Bookmarked questions
  const bookmarkedQuestions = questions.filter((q) =>
    progress.bookmarks.includes(q.id)
  );

  // Past mistake questions
  const mistakeQuestions = progress.pastMistakes
    .map((m) => ({
      mistake: m,
      question: questions.find((q) => q.id === m.questionId),
    }))
    .filter((item): item is { mistake: MistakeLog; question: Question } => !!item.question);

  const handleToggleBookmark = (id: string) => {
    const isBookmarked = progress.bookmarks.includes(id);
    const updated = isBookmarked
      ? progress.bookmarks.filter((b) => b !== id)
      : [...progress.bookmarks, id];
    onSaveProgress({ bookmarks: updated });
    toast.info(isBookmarked ? 'বুকমার্ক থেকে সরানো হয়েছে' : 'বুকমার্কে যোগ করা হয়েছে');
  };

  const handleClearMistake = (questionId: string) => {
    const updatedMistakes = progress.pastMistakes.filter((m) => m.questionId !== questionId);
    onSaveProgress({ pastMistakes: updatedMistakes });
    toast.success('ভুল খাতা থেকে প্রশ্নটি সরানো হয়েছে');
  };

  return (
    <div className="space-y-4 pb-24 max-w-3xl mx-auto px-1 sm:px-2">
      {/* 3 Tabs (High Density) */}
      <div className="flex items-center justify-around border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`pb-1.5 text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${
            activeTab === 'bookmarks'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>দাগানো প্রশ্ন ({progress.bookmarks.length})</span>
          {activeTab === 'bookmarks' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('mistakes')}
          className={`pb-1.5 text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${
            activeTab === 'mistakes'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>পূর্বের ভুল ({progress.pastMistakes.length})</span>
          {activeTab === 'mistakes' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`pb-1.5 text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${
            activeTab === 'exams'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>বিগত পরীক্ষা ({progress.examHistory.length})</span>
          {activeTab === 'exams' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>
      </div>

      {/* TAB 1: দাগানো প্রশ্ন (Bookmarked Questions) */}
      {activeTab === 'bookmarks' && (
        <div className="space-y-3">
          {bookmarkedQuestions.length > 0 ? (
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAllAnswers((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                    showAllAnswers
                      ? 'bg-emerald-700 text-white ring-2 ring-emerald-400'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                  title={showAllAnswers ? 'সকল উত্তর লুকান' : 'একসাথে সকল উত্তর দেখুন'}
                >
                  {showAllAnswers ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>উত্তর লুকান</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>সকল উত্তর দেখুন</span>
                    </>
                  )}
                </button>
              </div>

              {bookmarkedQuestions.map((q, idx) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={idx}
                  mode="practice"
                  forceShowAnswer={showAllAnswers}
                  isBookmarked={true}
                  onToggleBookmark={() => handleToggleBookmark(q.id)}
                  onAskAI={onAskAI}
                />
              ))}
            </>
          ) : (
            <EmptyState
              icon={Bookmark}
              title="কোনো দাগানো প্রশ্ন নেই"
              description="যেকোনো প্রশ্নের নিচে বুকমার্ক আইকন চেপে প্রশ্নটি এখানে সংরক্ষণ করতে পারো।"
            />
          )}
        </div>
      )}

      {/* TAB 2: পূর্বের ভুল (Past Mistakes) */}
      {activeTab === 'mistakes' && (
        <div className="space-y-3">
          {mistakeQuestions.length > 0 ? (
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAllAnswers((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                    showAllAnswers
                      ? 'bg-emerald-700 text-white ring-2 ring-emerald-400'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                  title={showAllAnswers ? 'সকল উত্তর লুকান' : 'একসাথে সকল উত্তর দেখুন'}
                >
                  {showAllAnswers ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>উত্তর লুকান</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>সকল উত্তর দেখুন</span>
                    </>
                  )}
                </button>
              </div>

              {mistakeQuestions.map(({ mistake, question }, idx) => (
                <div key={mistake.questionId} className="relative">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 text-xs font-bold rounded-t-2xl border border-b-0 border-rose-200 dark:border-rose-800">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>পূর্বে ভুল উত্তর দিয়েছিলে: অপশন ({mistake.selectedAns})</span>
                    </div>
                    <button
                      onClick={() => handleClearMistake(mistake.questionId)}
                      className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                      title="ভুল তালিকা থেকে সরান"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <QuestionCard
                    question={question}
                    index={idx}
                    mode="practice"
                    forceShowAnswer={showAllAnswers}
                    isBookmarked={progress.bookmarks.includes(question.id)}
                    onToggleBookmark={() => handleToggleBookmark(question.id)}
                    onAskAI={onAskAI}
                  />
                </div>
              ))}
            </>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="কোনো ভুল জমা নেই!"
              description="পরীক্ষা বা প্র্যাকটিস দেওয়ার সময় কোনো প্রশ্ন ভুল হলে তা স্বয়ংক্রিয়ভাবে এখানে জমা হবে।"
            />
          )}
        </div>
      )}

      {/* TAB 3: বিগত পরীক্ষা (Exam History) */}
      {activeTab === 'exams' && (
        <div className="space-y-2.5">
          {progress.examHistory.length > 0 ? (
            progress.examHistory.map((exam) => (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-indigo-500 transition-all flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                      {exam.title}
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-md uppercase font-mono border border-indigo-200 dark:border-indigo-800">
                      {exam.tag}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{exam.date}</p>

                  <div className="flex items-center gap-2 text-xs font-mono pt-1">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">সঠিক: {exam.correctCount}</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-rose-600 dark:text-rose-400 font-bold">ভুল: {exam.wrongCount}</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-slate-500 dark:text-slate-400">উত্তরহীন: {exam.skippedCount}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg sm:text-xl font-bold font-mono text-indigo-700 dark:text-indigo-400">
                    {exam.score}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {Math.round(exam.timeTakenSeconds / 60)} মিনিট
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon={FileText}
              title="কোনো পরীক্ষার হিস্ট্রি নেই"
              description="মক পরীক্ষা সম্পন্ন করার পর ফলাফল ও বিস্তারিত বিশ্লেষণ এখানে দেখতে পাবে।"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryScreen;
