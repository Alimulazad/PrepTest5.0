import React, { useState } from 'react';
import { Trophy, Star, Clock, Target, ArrowUp, ArrowDown, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { MascotIllustration } from './components/MascotIllustration';
import { User as UserType } from '../../types';

interface QuickPracticeResultLeaderboardProps {
  scoreResults: {
    pointsEarned: number;
    avgTimeSeconds: number;
    accuracy: number;
    totalAnswered: number;
    correctCount: number;
  };
  currentUser?: UserType | null;
  onProceed: () => void;
}

interface LeaderboardUser {
  id: string;
  name: string;
  avatarText: string;
  rank: number;
  points: number;
  isCurrentUser?: boolean;
  avatarBg: string;
}

export const QuickPracticeResultLeaderboard: React.FC<QuickPracticeResultLeaderboardProps> = ({
  scoreResults,
  currentUser,
  onProceed,
}) => {
  // Step transition: 1 -> "Point card floating up with Mascot", 2 -> "League & Leaderboard"
  const [screenStage, setScreenStage] = useState<'mascot_score' | 'league_leaderboard'>('mascot_score');

  // Dummy leaderboard roster surrounding user
  const userDisplayName = currentUser?.name || 'Alimul Azad';
  const userInitialPoints = 48.5;
  const userRank = 788;

  const LEADERBOARD_DATA: LeaderboardUser[] = [
    { id: '1', name: 'Md Robiul', avatarText: 'MR', rank: 787, points: 48.5, avatarBg: 'bg-amber-100 text-amber-800' },
    {
      id: '2',
      name: userDisplayName,
      avatarText: 'AA',
      rank: userRank,
      points: +(userInitialPoints + (scoreResults.pointsEarned || 0)).toFixed(1),
      isCurrentUser: true,
      avatarBg: 'bg-rose-500 text-white',
    },
    { id: '3', name: 'AR Suzume', avatarText: 'AS', rank: 789, points: 48.5, avatarBg: 'bg-teal-100 text-teal-800' },
    { id: '4', name: 'khaled mondol', avatarText: 'KM', rank: 790, points: 48.3, avatarBg: 'bg-sky-100 text-sky-800' },
    { id: '5', name: 'Rayanur Rahat', avatarText: 'RR', rank: 791, points: 48.0, avatarBg: 'bg-indigo-100 text-indigo-800' },
    { id: '6', name: 'Md. Sifat Pathan', avatarText: 'SP', rank: 792, points: 48.0, avatarBg: 'bg-purple-100 text-purple-800' },
    { id: '7', name: 'rifa', avatarText: 'R', rank: 793, points: 48.0, avatarBg: 'bg-emerald-100 text-emerald-800' },
    { id: '8', name: 'Mishkat Ahammed', avatarText: 'MA', rank: 794, points: 48.0, avatarBg: 'bg-amber-100 text-amber-800' },
    { id: '9', name: 'Fahmida Kabir', avatarText: 'FK', rank: 795, points: 48.0, avatarBg: 'bg-pink-100 text-pink-800' },
  ];

  // Stage 1: Mascot & Score Card (Mascot holding golden board + 3 Stat cards)
  if (screenStage === 'mascot_score') {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-slate-900 pb-28 flex flex-col justify-between p-4 max-w-lg mx-auto select-none">
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 pt-6">
          {/* Mascot Holding Board */}
          <div className="w-64 h-56 flex items-center justify-center">
            <MascotIllustration mood="sad_sign" className="w-full h-full" />
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
              মার্কস এর যা অবস্থা
            </h2>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
              এটা ছাড়া উপায় পেলাম না
            </p>
          </div>

          {/* 3 Color-coded stat cards */}
          <div className="grid grid-cols-3 gap-2.5 w-full pt-2">
            {/* Card 1: পয়েন্ট (Yellow Top) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs text-center flex flex-col">
              <div className="bg-amber-400 text-slate-900 font-bold text-[11px] py-1">
                পয়েন্ট
              </div>
              <div className="p-3 font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{scoreResults.pointsEarned.toFixed(2)}</span>
              </div>
            </div>

            {/* Card 2: গড় সময় (Sky Top) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs text-center flex flex-col">
              <div className="bg-sky-400 text-slate-900 font-bold text-[11px] py-1">
                গড় সময়
              </div>
              <div className="p-3 font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base flex items-center justify-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-sky-500" />
                <span>0:0{scoreResults.avgTimeSeconds || 2}</span>
              </div>
            </div>

            {/* Card 3: অ্যাকুরেসি (Emerald Top) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs text-center flex flex-col">
              <div className="bg-emerald-400 text-slate-900 font-bold text-[11px] py-1">
                অ্যাকুরেসি
              </div>
              <div className="p-3 font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base flex items-center justify-center gap-1 font-mono">
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                <span>{scoreResults.accuracy}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Button */}
        <div className="pt-4">
          <button
            onClick={() => setScreenStage('league_leaderboard')}
            className="w-full py-3.5 bg-[#2e7d32] hover:bg-[#1b5e20] text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] cursor-pointer text-center"
          >
            এগিয়ে যাও
          </button>
        </div>
      </div>
    );
  }

  // Stage 2: League + Leaderboard Screen (Step 7 in spec)
  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-slate-900 pb-28 flex flex-col justify-between p-4 max-w-lg mx-auto select-none">
      <div className="space-y-4">
        {/* League Shield & Badges Header */}
        <div className="text-center pt-2 space-y-2">
          {/* 3 League Badges */}
          <div className="flex items-center justify-center gap-4 pt-1">
            <div className="w-10 h-10 rounded-xl bg-slate-300 dark:bg-slate-700 opacity-60 flex items-center justify-center text-xs font-bold">
              🛡️
            </div>
            {/* Active Iron Shield */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-slate-400 to-slate-600 shadow-md flex items-center justify-center text-white text-xl font-bold border-2 border-slate-300">
              🛡️
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-200 dark:bg-sky-900 opacity-60 flex items-center justify-center text-xs font-bold">
              💎
            </div>
          </div>

          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-wide">
            আয়রন
          </h2>

          {/* 0 - 100 League Progress bar */}
          <div className="space-y-1 max-w-xs mx-auto">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
              <span>0</span>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded-full text-amber-800 dark:text-amber-300 text-xs font-mono font-bold">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{(userInitialPoints + scoreResults.pointsEarned).toFixed(1)}</span>
              </div>
              <span>100</span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-750 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, (userInitialPoints + scoreResults.pointsEarned))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden shadow-2xs mt-4">
          {LEADERBOARD_DATA.map((u) => {
            if (u.isCurrentUser) {
              return (
                <div
                  key={u.id}
                  className="p-3.5 bg-emerald-50/90 dark:bg-emerald-950/60 flex items-center justify-between border-l-4 border-[#2e7d32] dark:border-emerald-400"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${u.avatarBg}`}>
                      {u.avatarText}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                          {u.name}
                        </span>
                        <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 text-[10px] font-black rounded">
                          স্বাধীন
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-300 font-bold mt-0.5">
                        <span className="flex items-center gap-0.5 text-emerald-600">
                          <ArrowUp className="w-3 h-3 stroke-[3]" /> +২
                        </span>
                        <span>{u.points} পয়েন্ট</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {u.rank}th
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {u.points} পয়েন্ট
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div key={u.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${u.avatarBg}`}>
                    {u.avatarText}
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    {u.name}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {u.rank}
                  </span>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {u.points} পয়েন্ট
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Finish / Proceed Button */}
      <div className="pt-4">
        <button
          onClick={onProceed}
          className="w-full py-3.5 bg-[#2e7d32] hover:bg-[#1b5e20] text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] cursor-pointer text-center"
        >
          এগিয়ে যাও
        </button>
      </div>
    </div>
  );
};
