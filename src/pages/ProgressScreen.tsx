import React from 'react';
import { Flame, Award, Target, CheckCircle2, XCircle, TrendingUp, Sparkles, BookOpen, BrainCircuit, LogIn, UserPlus, ShieldCheck } from 'lucide-react';
import { UserProgress, Question, User as UserType } from '../types';
import { UNIVERSITIES_DATA } from '../data/admissionData';
import WeakTopicsCard from '../components/WeakTopicsCard';
import { LiveLeaderboardCard } from '../components/LiveLeaderboardCard';

interface ProgressScreenProps {
  progress: UserProgress;
  currentUser: UserType | null;
  questions?: Question[];
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
  onOpenAITutor: () => void;
  onPracticeTopic?: (chapterId: string) => void;
  onAskAIAboutTopic?: (topicName: string) => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  progress,
  currentUser,
  questions = [],
  onOpenAuthModal,
  onOpenAITutor,
  onPracticeTopic,
  onAskAIAboutTopic,
}) => {
  const targetUni =
    UNIVERSITIES_DATA.find((u) => u.id === (currentUser?.target_university || progress.targetUniversity)) || UNIVERSITIES_DATA[0];

  const isLoggedIn = !!currentUser;
  const daysOfWeek = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
  const dailyPoints = Array.isArray(progress.dailyPoints) && progress.dailyPoints.length === 7
    ? progress.dailyPoints
    : [0, 0, 0, progress.points > 0 ? progress.points : 0, 0, 0, 0];
  const maxDayPoints = Math.max(...dailyPoints, 30);

  const totalAnswered = progress.totalCorrect + progress.totalWrong;
  const accuracy = totalAnswered > 0 ? Math.round((progress.totalCorrect / totalAnswered) * 100) : (isLoggedIn ? 100 : 0);

  return (
    <div className="space-y-3.5 pb-20 max-w-3xl mx-auto px-3 sm:px-4">
      {/* Auth Prompt if not logged in */}
      {!isLoggedIn && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold">রিয়েল-টাইম অগ্রগতি সংরক্ষণ করুন</h4>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                আপনার স্ট্রিক, নির্ভুলতা ও মক টেস্ট অ্যানালাইসিস লোকাল SQLite ডাটাবেজে পার্সোনালাইজড রাখতে লগইন করুন।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => onOpenAuthModal('login')}
              className="grow sm:grow-0 px-3 py-1.5 bg-[#1E3A8A] dark:bg-indigo-600 text-white hover:bg-blue-900 dark:hover:bg-indigo-700 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>লগইন</span>
            </button>
            <button
              onClick={() => onOpenAuthModal('register')}
              className="grow sm:grow-0 px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100/60 dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>রেজিস্ট্রেশন</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. Daily Points Chart (High Density) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">দৈনিক অর্জিত পয়েন্ট</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">গত ৭ দিনের প্র্যাকটিস ও সক্রিয়তা</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md text-xs font-bold font-mono">
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{isLoggedIn ? progress.streakDays : 0} Days Streak</span>
          </div>
        </div>

        {/* 7 Days Bar Visual (High Density) */}
        <div className="grid grid-cols-7 gap-2 pt-1">
          {daysOfWeek.map((day, idx) => {
            const pts = isLoggedIn ? (dailyPoints[idx] || 0) : 0;
            const heightPercent = isLoggedIn && maxDayPoints > 0 ? Math.max(Math.round((pts / maxDayPoints) * 100), 12) : 10;
            const isToday = idx === 3; // Center day

            return (
              <div key={idx} className="flex flex-col items-center gap-1.5">
                {/* Flame indicator on active day */}
                <div className="h-4 flex items-center justify-center">
                  {pts > 0 ? (
                    <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                  ) : null}
                </div>

                {/* Vertical Bar */}
                <div className="w-full h-24 bg-slate-100 dark:bg-slate-700/60 rounded-lg flex items-end p-0.5 overflow-hidden">
                  <div
                    className={`w-full rounded-md transition-all duration-500 ${
                      isToday
                        ? 'bg-blue-600 dark:bg-blue-500'
                        : pts > 0
                        ? 'bg-indigo-500 dark:bg-indigo-400'
                        : 'bg-slate-200 dark:bg-slate-600'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                {/* Points label */}
                <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">{pts}</span>

                {/* Day label */}
                <span
                  className={`text-[11px] font-bold ${
                    isToday ? 'text-blue-600 dark:text-blue-400 font-black underline' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Lifetime Stats Grid (High Density Stat Boxes from SQLite) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="high-density-stat-box">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-0.5">মোট পয়েন্ট</div>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
            {isLoggedIn ? progress.points : 0}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">র‍্যাঙ্কিং স্কোর</div>
        </div>

        <div className="high-density-stat-box">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-0.5">নির্ভুলতা (Accuracy)</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {isLoggedIn ? `${accuracy}%` : '০%'}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">সঠিক উত্তরের হার</div>
        </div>

        <div className="high-density-stat-box">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-0.5">সঠিক উত্তর</div>
          <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {isLoggedIn ? progress.totalCorrect : 0}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">টি প্রশ্ন</div>
        </div>

        <div className="high-density-stat-box">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-0.5">সম্পন্ন পরীক্ষা</div>
          <div className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-200">
            {isLoggedIn ? progress.examsCompleted : 0}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">টি মক টেস্ট</div>
        </div>
      </div>

      {/* 3. Subject Mastery Progress */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">বিষয়ভিত্তিক প্রস্তুতি অগ্রগতি</h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {isLoggedIn ? `${progress.totalCorrect} প্রশ্ন সঠিক` : 'প্র্যাকটিস শুরু করুন'}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <span>পদার্থবিজ্ঞান (Physics)</span>
              <span className="font-mono text-blue-600 dark:text-blue-400">
                {isLoggedIn ? `${Math.min(100, Math.max(10, progress.totalCorrect * 5 + 15))}%` : '০%'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: isLoggedIn ? `${Math.min(100, Math.max(10, progress.totalCorrect * 5 + 15))}%` : '0%' }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <span>উচ্চতর গণিত (Higher Math)</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                {isLoggedIn ? `${Math.min(100, Math.max(5, progress.totalCorrect * 4 + 10))}%` : '০%'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: isLoggedIn ? `${Math.min(100, Math.max(5, progress.totalCorrect * 4 + 10))}%` : '0%' }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <span>রসায়ন (Chemistry)</span>
              <span className="font-mono text-purple-600 dark:text-purple-400">
                {isLoggedIn ? `${Math.min(100, Math.max(5, progress.totalCorrect * 3 + 10))}%` : '০%'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 dark:bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: isLoggedIn ? `${Math.min(100, Math.max(5, progress.totalCorrect * 3 + 10))}%` : '0%' }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <span>জীববিজ্ঞান (Biology)</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {isLoggedIn ? `${Math.min(100, Math.max(5, progress.totalCorrect * 2 + 5))}%` : '০%'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: isLoggedIn ? `${Math.min(100, Math.max(5, progress.totalCorrect * 2 + 5))}%` : '0%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Weak Topics Section (Max 3 topics, detailed) */}
      <WeakTopicsCard
        progress={progress}
        questions={questions}
        maxTopics={3}
        onPracticeTopic={(chapterId) => onPracticeTopic && onPracticeTopic(chapterId)}
        onAskAIAboutTopic={(topicName) => onAskAIAboutTopic && onAskAIAboutTopic(topicName)}
      />

      {/* Live Realtime Leaderboard (Firebase RTDB Powered) */}
      <LiveLeaderboardCard
        currentUser={currentUser}
        progress={progress}
        onOpenAuthModal={onOpenAuthModal}
      />

      {/* 4. AI Mentor Study Advice Card (High Density) */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-xl p-5 shadow-sm border border-blue-900/30 flex items-start gap-3.5 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
          <BrainCircuit className="w-5 h-5" />
        </div>
        <div className="space-y-1 grow relative z-10">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm sm:text-base">PrepTest AI পর্যালোচনা ও পরামর্শ</h4>
            <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded font-mono uppercase">
              {targetUni.shortCode} Focus
            </span>
          </div>
          <p className="text-xs text-blue-100 leading-relaxed">
            {isLoggedIn ? (
              <>
                <strong>{currentUser?.name}</strong>, তোমার বর্তমান স্কোর <strong>{progress.points} পয়েন্ট</strong> এবং <strong>{progress.streakDays} দিনের স্ট্রিক</strong> রয়েছে। পদার্থবিজ্ঞান ১ম পত্রের ভেক্টর ও গতিবিদ্যা অধ্যায়ে আরও অনুশীলন করো।
              </>
            ) : (
              <>
                প্রস্তুতি শুরু করতে প্রশ্নব্যাংক ও মক টেস্টের প্রশ্ন সমাধান করো। লগইন করলে AI তোমার দুর্বল অধ্যায়গুলো বিশ্লেষণ করে পরামর্শ দেবে।
              </>
            )}
          </p>
          <button
            onClick={onOpenAITutor}
            className="inline-flex items-center gap-1 mt-1.5 text-xs font-bold text-white hover:underline cursor-pointer"
          >
            <span>PrepTest AI এর সাথে বিস্তারিত আলোচনা করুন</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgressScreen;

