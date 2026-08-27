import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Activity,
  Radio,
  RefreshCw,
  Search,
  Filter,
  Smartphone,
  Laptop,
  Globe,
  Clock,
  MapPin,
  GraduationCap,
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Eye
} from 'lucide-react';
import { fetchAdminActiveUsersApi } from '../../services/api';
import { ActiveUsersResponse, ActiveUserItem } from '../../types';
import { useToast } from '../../context/ToastContext';

export const AdminActiveUsersTab: React.FC = () => {
  const toast = useToast();
  const [data, setData] = useState<ActiveUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'idle' | 'registered' | 'guest'>('all');
  const [refreshInterval, setRefreshInterval] = useState<number>(0); // in seconds (0 = off by default for zero latency)
  const [secondsUntilNextRefresh, setSecondsUntilNextRefresh] = useState(0);
  const [selectedUser, setSelectedUser] = useState<ActiveUserItem | null>(null);

  const loadActiveUsers = useCallback(async (isManualClick = false) => {
    if (isManualClick) {
      setRefreshing(true);
    }
    setError(null);
    try {
      const response = await fetchAdminActiveUsersApi();
      setData(response);
      if (isManualClick) {
        toast.success('অ্যাক্টিভ ইউজার ডেটা সফলভাবে আপডেট হয়েছে');
      }
    } catch (err: any) {
      console.error('Active users fetch error:', err);
      setError(err.message || 'অ্যাক্টিভ ইউজার ডেটা লোড করতে ব্যর্থ হয়েছে');
      // Only show toast popup when user explicitly clicked the refresh button
      if (isManualClick) {
        toast.error('অ্যাক্টিভ ইউজার ডেটা আপডেট করা যায়নি');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSecondsUntilNextRefresh(refreshInterval);
    }
  }, [toast, refreshInterval]);

  // Initial load
  useEffect(() => {
    loadActiveUsers(false);
  }, [loadActiveUsers]);

  // Periodic Auto-refresh timer
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const intervalTimer = setInterval(() => {
      setSecondsUntilNextRefresh((prev) => {
        if (prev <= 1) {
          loadActiveUsers(false);
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalTimer);
  }, [refreshInterval, loadActiveUsers]);

  const formatCountdown = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s > 0 ? `${s}s` : ''}`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 10) return 'এইমাত্র';
    if (seconds < 60) return `${seconds} সে আগে`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} মি আগে`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ঘণ্টা আগে`;
    return `${Math.floor(hours / 24)} দিন আগে`;
  };

  const getDeviceIcon = (device?: string) => {
    if (!device) return <Globe className="w-4 h-4 text-slate-400" />;
    const d = device.toLowerCase();
    if (d.includes('phone') || d.includes('android') || d.includes('iphone')) {
      return <Smartphone className="w-4 h-4 text-emerald-400" />;
    }
    if (d.includes('pc') || d.includes('mac') || d.includes('linux') || d.includes('desktop')) {
      return <Laptop className="w-4 h-4 text-indigo-400" />;
    }
    return <Globe className="w-4 h-4 text-sky-400" />;
  };

  const getUniversityBanglaName = (code?: string) => {
    switch (code) {
      case 'du_a':
        return 'ঢাকা বিশ্ববিদ্যালয় (বিজ্ঞান)';
      case 'du_b':
        return 'ঢাকা বিশ্ববিদ্যালয় (মানবিক)';
      case 'du_c':
        return 'ঢাকা বিশ্ববিদ্যালয় (ব্যবসায়)';
      case 'gst_a':
        return 'জিএসটি গুচ্ছ (বিজ্ঞান)';
      case 'ru_c':
        return 'রাজশাহী বিশ্ববিদ্যালয়';
      case 'cu_a':
        return 'চট্টগ্রাম বিশ্ববিদ্যালয়';
      case 'buet':
        return 'বুয়েট / ইঞ্জিনিয়ারিং';
      case 'medical':
        return 'মেডিকেল ভর্তি পরীক্ষা';
      default:
        return code || 'সাধারণ প্রস্তুতি';
    }
  };

  const filteredUsers = (data?.activeUsers || []).filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm)) ||
      (user.targetUniversity && user.targetUniversity.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.currentPage && user.currentPage.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.college && user.college.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'online') return user.status === 'online';
    if (statusFilter === 'idle') return user.status === 'idle';
    if (statusFilter === 'registered') return !user.isGuest;
    if (statusFilter === 'guest') return user.isGuest;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              রিয়েল-টাইম লাইভ ইউজার মনিটরিং
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Heartbeat Engine
            </span>
          </div>
          <p className="text-xs text-slate-400">
            বর্তমানে প্ল্যাটফর্মে সক্রিয় শিক্ষার্থী, তাদের পাঠরত পেজ এবং রিয়েল-টাইম অ্যাক্টিভিটি ট্র্যাকিং।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Refresh interval selector */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-400">অটো রিফ্রেশ:</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              aria-label="অটো রিফ্রেশ ব্যবধান"
              className="bg-transparent border-0 text-white font-medium focus:ring-0 cursor-pointer text-xs pr-2"
            >
              <option value={0} className="bg-slate-900">বন্ধ (ডিফল্ট - জিরো লেটেন্সি)</option>
              <option value={30} className="bg-slate-900">৩০ সেকেন্ড (30s)</option>
              <option value={60} className="bg-slate-900">১ মিনিট (60s)</option>
              <option value={120} className="bg-slate-900">২ মিনিট (120s)</option>
              <option value={300} className="bg-slate-900">৫ মিনিট (300s)</option>
            </select>
            {refreshInterval > 0 && (
              <span className="text-[10px] text-slate-500 font-mono">({formatCountdown(secondsUntilNextRefresh)})</span>
            )}
          </div>

          <button
            onClick={() => loadActiveUsers(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'আপডেট হচ্ছে...' : 'এখনই রিফ্রেশ'}
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Now */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-4.5 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-emerald-400">এই মুহূর্তে লাইভ</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {loading ? '...' : (data?.totalActiveNow || 0)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            গত ২ মিনিটের মধ্যে সক্রিয়
          </div>
        </div>

        {/* Total Today */}
        <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-2xl p-4.5 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-indigo-400">গত ২৪ ঘণ্টায় মোট</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {loading ? '...' : (data?.totalActiveToday || 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            অনন্য সেশন ট্র্যাকিং
          </div>
        </div>

        {/* Registered Students */}
        <div className="bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/20 rounded-2xl p-4.5 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-purple-400">নিবন্ধিত শিক্ষার্থী</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {loading ? '...' : (data?.totalRegisteredActive || 0)}
          </div>
          <div className="mt-1 text-[11px] text-purple-300/80">
            লগইন করা স্টুডেন্ট অ্যাকাউন্ট
          </div>
        </div>

        {/* Guest Sessions */}
        <div className="bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/20 rounded-2xl p-4.5 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-400">অতিথি শিক্ষার্থী (Guests)</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {loading ? '...' : (data?.totalGuestsActive || 0)}
          </div>
          <div className="mt-1 text-[11px] text-amber-300/80">
            অ্যাকাউন্ট ছাড়া ব্রাউজিং
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="নাম, ফোন, পেজ বা ভার্সিটি দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> ফিল্টার:
          </span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            সকল ({data?.activeUsers?.length || 0})
          </button>
          <button
            onClick={() => setStatusFilter('online')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'online'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            অনলাইন ({data?.totalActiveNow || 0})
          </button>
          <button
            onClick={() => setStatusFilter('registered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap ${
              statusFilter === 'registered'
                ? 'bg-purple-600 text-white shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            শিক্ষার্থী ({data?.totalRegisteredActive || 0})
          </button>
          <button
            onClick={() => setStatusFilter('guest')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap ${
              statusFilter === 'guest'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            অতিথি ({data?.totalGuestsActive || 0})
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <p className="font-semibold">{error}</p>
            <p className="text-rose-400/80 mt-0.5">দয়া করে নিশ্চিত করুন যে ব্যাকএন্ড সার্ভার চালু আছে এবং কানেকশন সঠিক।</p>
          </div>
        </div>
      )}

      {/* Active Users Table & Analytics Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Users Table (3 Cols) */}
        <div className="xl:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              সক্রিয় ব্যবহারকারীদের তালিকা
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] text-slate-400 font-mono">
                {filteredUsers.length} জন
              </span>
            </h3>
            <span className="text-[11px] text-slate-500">
              সর্বশেষ ডেটা: {data ? new Date(data.lastUpdated).toLocaleTimeString() : '...'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">ব্যবহারকারী</th>
                  <th className="px-4 py-3">বর্তমান পেজ / কাজ</th>
                  <th className="px-4 py-3">টার্গেট ইউনিট</th>
                  <th className="px-4 py-3">ডিভাইস / ব্রাউজার</th>
                  <th className="px-4 py-3 text-center">স্ট্যাটাস</th>
                  <th className="px-4 py-3 text-right">শেষ সক্রিয়</th>
                  <th className="px-4 py-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                      লাইভ ইউজার ডেটা লোড হচ্ছে...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      কোনো সক্রিয় ব্যবহারকারী পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.sessionId}
                      className="hover:bg-slate-800/40 transition duration-150 group"
                    >
                      {/* User Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-inner"
                            style={{
                              backgroundColor: user.avatarColor || (user.isGuest ? '#475569' : '#2563eb'),
                            }}
                          >
                            {user.avatar || (user.isGuest ? '👤' : '🧑‍🎓')}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              {user.name}
                              {!user.isGuest && (
                                <span title="নিবন্ধিত শিক্ষার্থী" className="inline-flex items-center">
                                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2">
                              {user.phone ? (
                                <span className="font-mono text-slate-400">{user.phone}</span>
                              ) : (
                                <span className="text-slate-500">গেস্ট সেশন</span>
                              )}
                              {user.college && <span className="truncate max-w-[120px] text-slate-500">• {user.college}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Current Page */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-indigo-300 font-medium text-[11px] border border-slate-700/50 max-w-[160px] truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                          {user.currentPage || 'হোমপেজ'}
                        </span>
                      </td>

                      {/* Target University */}
                      <td className="px-4 py-3 text-slate-300">
                        <div className="text-[11px] font-semibold text-slate-200">
                          {getUniversityBanglaName(user.targetUniversity)}
                        </div>
                        {user.targetUnit && (
                          <div className="text-[10px] text-slate-500">{user.targetUnit}</div>
                        )}
                      </td>

                      {/* Device & Browser */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                          {getDeviceIcon(user.device)}
                          <span className="truncate max-w-[110px]">{user.device || 'Web Browser'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[110px]">
                          {user.browser || 'Browser'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        {user.status === 'online' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            অনলাইন
                          </span>
                        ) : user.status === 'idle' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-semibold border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            অলস (Idle)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium">
                            অফলাইন
                          </span>
                        )}
                      </td>

                      {/* Last Active */}
                      <td className="px-4 py-3 text-right">
                        <div className="text-slate-300 font-medium text-[11px]">
                          {formatTimeAgo(user.lastActiveAt)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {user.requestCount} রিকোয়েস্ট
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition cursor-pointer"
                          title="বিস্তারিত দেখুন"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Analytics Breakdown Sidebar (1 Col) */}
        <div className="space-y-4">
          {/* Target Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-400" />
              বিশ্ববিদ্যালয় টার্গেট ভাগ
            </h4>
            <div className="space-y-3">
              {Object.entries(data?.universityBreakdown || {}).length === 0 ? (
                <p className="text-xs text-slate-500">কোনো তথ্য নেই</p>
              ) : (
                Object.entries(data?.universityBreakdown || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([uniCode, count]) => {
                    const total = data?.totalActiveToday || 1;
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={uniCode} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 truncate max-w-[140px]">
                            {getUniversityBanglaName(uniCode)}
                          </span>
                          <span className="font-semibold text-white font-mono">
                            {count} জন ({percentage}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Popular Pages Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              জনপ্রিয় পেজ ও ফিচার
            </h4>
            <div className="space-y-3">
              {Object.entries(data?.pageBreakdown || {}).length === 0 ? (
                <p className="text-xs text-slate-500">কোনো তথ্য নেই</p>
              ) : (
                Object.entries(data?.pageBreakdown || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([pageName, count]) => {
                    const total = data?.totalActiveToday || 1;
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={pageName} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 truncate max-w-[140px]">
                            {pageName}
                          </span>
                          <span className="font-semibold text-white font-mono">
                            {count} জন ({percentage}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{ backgroundColor: selectedUser.avatarColor || '#2563eb' }}
                >
                  {selectedUser.avatar || '🧑‍🎓'}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{selectedUser.name}</h4>
                  <p className="text-xs text-slate-400">
                    {selectedUser.isGuest ? 'অতিথি শিক্ষার্থী' : 'নিবন্ধিত স্টুডেন্ট'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">সেশন আইডি:</span>
                <span className="font-mono text-indigo-300">{selectedUser.sessionId}</span>
              </div>
              {selectedUser.phone && (
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">ফোন নম্বর:</span>
                  <span className="font-mono text-white">{selectedUser.phone}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">টার্গেট ইউনিভার্সিটি:</span>
                <span className="font-semibold text-white">
                  {getUniversityBanglaName(selectedUser.targetUniversity)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">টার্গেট ইউনিট:</span>
                <span className="text-white">{selectedUser.targetUnit || 'ক ইউনিট'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">বর্তমান অবস্থান:</span>
                <span className="text-emerald-400 font-semibold">{selectedUser.currentPage}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">ডিভাইস ও ওএস:</span>
                <span className="text-white">{selectedUser.device || 'অজানা'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">ব্রাউজার:</span>
                <span className="text-white">{selectedUser.browser || 'অজানা'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">প্রথম প্রবেশ:</span>
                <span className="text-slate-400">{new Date(selectedUser.firstSeenAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">সর্বশেষ অ্যাক্টিভিটি:</span>
                <span className="text-emerald-400">{formatTimeAgo(selectedUser.lastActiveAt)}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedUser(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminActiveUsersTab;
