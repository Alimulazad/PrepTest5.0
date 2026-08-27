import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Flame,
  Search,
  Users,
  Target,
  Sparkles,
  ChevronRight,
  Shield,
  Star,
  Lock,
} from 'lucide-react';
import {
  subscribeRealtimeLeaderboard,
  LeaderboardUserEntry,
} from '../services/firebase';
import { User as UserType, UserProgress } from '../types';
import {
  DUMMY_LEADERBOARD_USERS,
  LEAGUES_CONFIG,
  LeagueConfig,
  DummyLeaderboardUser,
} from '../data/dummyUsers';

interface LiveLeaderboardCardProps {
  currentUser: UserType | null;
  progress: UserProgress;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
}

export const LiveLeaderboardCard: React.FC<LiveLeaderboardCardProps> = ({
  currentUser,
  progress,
  onOpenAuthModal,
}) => {
  const [realtimeUsers, setRealtimeUsers] = useState<LeaderboardUserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState<LeagueConfig['id']>('iron');
  const [filterUni, setFilterUni] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // User's points
  const userPoints = progress.points || 48.5;

  // Determine user's active league
  const userLeagueId = useMemo<LeagueConfig['id']>(() => {
    if (userPoints >= 5000) return 'infinity';
    if (userPoints >= 2500) return 'diamond';
    if (userPoints >= 1000) return 'gold';
    if (userPoints >= 500) return 'silver';
    if (userPoints >= 100) return 'bronze';
    return 'iron';
  }, [userPoints]);

  useEffect(() => {
    const unsubscribe = subscribeRealtimeLeaderboard((entries) => {
      setRealtimeUsers(entries);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Format points with 'K' or '.5' in Bengali
  const formatPointsBn = (pts: number) => {
    if (pts >= 1000) {
      const kVal = (pts / 1000).toFixed(1).replace('.0', '');
      return `${kVal}K পয়েন্ট`;
    }
    return `${pts} পয়েন্ট`;
  };

  // Combine dummy users with real users for the selected league
  const currentLeagueUsers = useMemo(() => {
    const currentLeagueObj = LEAGUES_CONFIG.find((l) => l.id === selectedLeague);
    const minPts = currentLeagueObj?.minPoints ?? 0;
    const maxPts = currentLeagueObj?.maxPoints ?? 100;

    // Filter dummy users
    const dummyForLeague = DUMMY_LEADERBOARD_USERS.filter(
      (u) => u.league === selectedLeague
    );

    // Filter real users that belong in this score range
    const realForLeague: DummyLeaderboardUser[] = realtimeUsers
      .filter((r) => {
        const pts = r.points || 0;
        return pts >= minPts && pts <= maxPts;
      })
      .map((r) => ({
        id: r.userId,
        name: r.name,
        college: r.college || 'ঢাকা কলেজ',
        targetUniversity: r.targetUniversity || 'buet',
        avatar: r.avatar || '🧑‍🎓',
        avatarBgColor: r.avatarColor || '#3B82F6',
        points: r.points || 0,
        accuracy: r.accuracy || 85,
        examsCompleted: r.examsCompleted || 1,
        streakDays: r.streakDays || 1,
        isPro: true,
        league: selectedLeague,
        isOnline: true,
      }));

    // Merge and deduplicate by name
    const combined = [...dummyForLeague];
    realForLeague.forEach((ru) => {
      if (!combined.some((c) => c.name.toLowerCase() === ru.name.toLowerCase())) {
        combined.push(ru);
      }
    });

    // Sort descending by points
    combined.sort((a, b) => b.points - a.points);

    // Apply university filter
    return combined.filter((u) => {
      const matchUni = filterUni === 'all' || u.targetUniversity === filterUni;
      const matchSearch =
        !searchQuery.trim() ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.college && u.college.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchUni && matchSearch;
    });
  }, [selectedLeague, realtimeUsers, filterUni, searchQuery]);

  const currentLeagueObj = LEAGUES_CONFIG.find((l) => l.id === selectedLeague)!;
  const isSelectedLeagueLocked =
    LEAGUES_CONFIG.findIndex((l) => l.id === selectedLeague) >
    LEAGUES_CONFIG.findIndex((l) => l.id === userLeagueId);

  // User rank calculation
  const userName = currentUser?.name || 'Alimul Azad';
  const userRankNumber = userLeagueId === selectedLeague ? 803 : '--';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
      {/* 1. League Navigation Carousel Header */}
      <div className="bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-slate-900 dark:to-slate-800/80 p-4 sm:p-6 border-b border-slate-200/80 dark:border-slate-700/80">
        {/* League Hexagon Badges Icons */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 overflow-x-auto pb-3 pt-1 scrollbar-none">
          {LEAGUES_CONFIG.map((league) => {
            const isSelected = league.id === selectedLeague;
            return (
              <button
                key={league.id}
                onClick={() => setSelectedLeague(league.id)}
                className={`flex flex-col items-center transition-all cursor-pointer group shrink-0 ${
                  isSelected ? 'scale-110' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-xl sm:text-2xl transition-all shadow-md ${
                    isSelected
                      ? `bg-gradient-to-br ${league.badgeColor} text-white ring-4 ring-purple-500/40 shadow-lg`
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {league.icon}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected League Title */}
        <div className="text-center mt-2 space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {currentLeagueObj.nameBn}
          </h2>
        </div>

        {/* League Progress Bar or Locked Banner */}
        {selectedLeague === 'iron' ? (
          <div className="mt-4 max-w-md mx-auto space-y-1.5">
            <div className="relative flex items-center">
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.min(100, (userPoints / 100) * 100)}%` }}
                />
              </div>

              {/* Star Badge Indicator on progress */}
              <div
                className="absolute -top-2 flex items-center gap-1 bg-amber-400 text-slate-950 font-black text-[11px] px-2 py-0.5 rounded-full shadow-md border border-amber-300"
                style={{
                  left: `calc(${Math.min(90, Math.max(10, (userPoints / 100) * 100))}% - 24px)`,
                }}
              >
                <Star className="w-3 h-3 fill-current" />
                <span>{userPoints}</span>
              </div>
            </div>

            <div className="flex justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 font-mono px-1">
              <span>0</span>
              <span>100</span>
            </div>
          </div>
        ) : isSelectedLeagueLocked ? (
          <div className="mt-3 bg-slate-200/90 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-semibold py-2 px-4 rounded-xl text-center flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>এই লীগ আনলক করতে পূর্ববর্তী লীগ গুলো কমপ্লিট করো</span>
          </div>
        ) : null}
      </div>

      {/* 2. Filters & Search */}
      <div className="px-4 sm:px-6 pt-3 pb-2 flex flex-col sm:flex-row gap-2 border-b border-slate-100 dark:border-slate-700/60">
        <div className="relative grow">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="শিক্ষার্থী বা কলেজের নাম খুঁজুন..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
          />
        </div>

        <select
          value={filterUni}
          onChange={(e) => setFilterUni(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 shrink-0"
        >
          <option value="all">সকল বিশ্ববিদ্যালয়</option>
          <option value="buet">BUET (বুয়েট)</option>
          <option value="du">DU (ঢাকা বিশ্ববিদ্যালয়)</option>
          <option value="medical">Medical (মেডিকেল)</option>
          <option value="cuet">CUET (চুয়েট)</option>
          <option value="ruet">RUET (রুয়েট)</option>
          <option value="kuet">KUET (কুয়েট)</option>
          <option value="ju">JU (জাহাঙ্গীরনগর)</option>
        </select>
      </div>

      {/* 3. Leaderboard List Table */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/60 overflow-y-auto max-h-[380px] p-2 sm:p-4">
        {loading ? (
          <div className="text-center py-10 text-xs text-slate-400">
            রিয়েল-টাইম লিডারবোর্ড লোড হচ্ছে...
          </div>
        ) : currentLeagueUsers.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            কোনো শিক্ষার্থী পাওয়া যায়নি।
          </div>
        ) : (
          currentLeagueUsers.map((user, idx) => {
            const rank = idx + 1;
            const isOnline = user.isOnline ?? (idx % 2 === 0);

            return (
              <div
                key={user.id || idx}
                className="flex items-center justify-between py-3 px-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
              >
                {/* Left: Avatar + Online Dot + Name + Pro Badge */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar Container with Online Indicator Dot */}
                  <div className="relative shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg text-white font-bold shadow-xs"
                      style={{ backgroundColor: user.avatarBgColor || '#3B82F6' }}
                    >
                      {user.avatar || user.name.charAt(0)}
                    </div>
                    <span
                      className={`w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 absolute bottom-0 right-0 ${
                        isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                  </div>

                  {/* Name + Pro Badge */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {user.name}
                      </span>
                      {user.isPro && (
                        <span className="w-5 h-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded text-[10px] font-black italic text-white flex items-center justify-center shadow-xs">
                          P
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                      {user.college}
                    </div>
                  </div>
                </div>

                {/* Right: Rank Number + Points */}
                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className="text-sm font-black font-mono text-slate-900 dark:text-slate-100 leading-tight">
                    {rank}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {formatPointsBn(user.points)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Current User Sticky Bottom Banner (Matching Screenshot 1) */}
      <div className="bg-[#E2ECE2] dark:bg-[#1A2E26] border-t border-emerald-300 dark:border-emerald-800 p-3 sm:p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-xl text-white font-bold shadow-sm"
              style={{
                backgroundColor:
                  currentUser?.avatar_bg_color || progress.avatarBgColor || '#059669',
              }}
            >
              {currentUser?.avatar || '🧑‍🎓'}
            </div>
            <span className="w-3 h-3 rounded-full border-2 border-[#E2ECE2] dark:border-[#1A2E26] bg-emerald-500 absolute bottom-0 right-0" />
          </div>

          <div>
            <h4 className="font-black text-sm text-slate-900 dark:text-emerald-100">
              {userName}
            </h4>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
              {currentUser?.college || 'শিক্ষার্থী'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-black font-mono text-slate-900 dark:text-emerald-100">
            {userRankNumber} <span className="text-xs font-normal">th</span>
          </div>
          <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
            {formatPointsBn(userPoints)}
          </div>
        </div>
      </div>
    </div>
  );
};
