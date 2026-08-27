import React, { useState } from 'react';
import {
  Database,
  HelpCircle,
  Layers,
  Sparkles,
  Key,
  Users,
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight,
  RefreshCw,
  HardDrive,
  Cpu,
  CheckCheck,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Wrench,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import { AdminSystemStats } from '../../types';
import { AdminSystemHealthWidget } from './AdminSystemHealthWidget';
import { healAndSyncDatabaseApi } from '../../services/api';

interface AdminDashboardTabProps {
  stats: AdminSystemStats | null;
  isLoadingStats: boolean;
  onRefreshStats: () => void;
  onNavigateTab: (tab: string) => void;
}

export const AdminDashboardTab: React.FC<AdminDashboardTabProps> = ({
  stats,
  isLoadingStats,
  onRefreshStats,
  onNavigateTab,
}) => {
  const [isHealingDb, setIsHealingDb] = useState(false);
  const [healResult, setHealResult] = useState<any | null>(null);

  const handleHealDatabase = async () => {
    setIsHealingDb(true);
    setHealResult(null);
    try {
      const res = await healAndSyncDatabaseApi();
      setHealResult(res);
      onRefreshStats();
    } catch (err: any) {
      setHealResult({ success: false, message: err.message || 'হিয়ারিং ব্যর্থ হয়েছে' });
    } finally {
      setIsHealingDb(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 md:p-8 text-white border border-indigo-900/50 shadow-2xl shadow-indigo-950/20">
        {/* Background glow and ambient radial accents */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/30 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              সিস্টেম সচল • ক্লাউড ও লোকাল PostgreSQL সিঙ্ক
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              PrepTest অ্যাডমিন কন্ট্রোল ও অ্যানালিটিক্স
            </h2>
            <p className="text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed">
              আইসোলেটেড এআই ডেটা এক্সট্রাকশন পাইপলাইন, হিউম্যান-ইন-দ্য-লুপ ড্রাফট কিউ ও অটোমেটিক ওপেনরাউটার ফেইলওভার ম্যানেজমেন্ট।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-xs text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>নিরাপদ আইসোলেটেড মোড</span>
            </div>
            <button
              onClick={onRefreshStats}
              disabled={isLoadingStats}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
              {isLoadingStats ? 'রিফ্রেশ হচ্ছে...' : 'রিফ্রেশ মেট্রিক্স'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid with Modern Accent Borders & Trends */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Questions */}
        <div
          onClick={() => onNavigateTab('questions')}
          className="group relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 cursor-pointer flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500 opacity-80 group-hover:h-1.5 transition-all" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">মোট প্রশ্ন</span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                <HelpCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {stats ? stats.totalQuestions.toLocaleString('bn-BD') : '...'}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">লাইভ ভাণ্ডার</span>
            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
              <TrendingUp className="w-3 h-3" /> +১২% বৃদ্ধি
            </span>
          </div>
        </div>

        {/* Total Topics */}
        <div
          onClick={() => onNavigateTab('questions')}
          className="group relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all duration-300 cursor-pointer flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 opacity-80 group-hover:h-1.5 transition-all" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">টপিক ও সিলেবাস</span>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {stats ? stats.totalTopics.toLocaleString('bn-BD') : '...'}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">সাবটপিক ও বিষয়</span>
            <span className="inline-flex items-center gap-0.5 text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-md">
              <Activity className="w-3 h-3" /> শতভাগ কভার্ড
            </span>
          </div>
        </div>

        {/* Knowledge Snippets */}
        <div
          onClick={() => onNavigateTab('questions')}
          className="group relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all duration-300 cursor-pointer flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 opacity-80 group-hover:h-1.5 transition-all" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">নলেজ স্নপেট</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {stats ? stats.totalSnippets.toLocaleString('bn-BD') : '...'}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">ফর্মুলা ও শর্টকাট</span>
            <span className="inline-flex items-center gap-0.5 text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md">
              <TrendingUp className="w-3 h-3" /> সক্রিয়
            </span>
          </div>
        </div>

        {/* Pending Drafts (High Priority Warning Alert style) */}
        <div
          onClick={() => onNavigateTab('drafts')}
          className="group relative overflow-hidden bg-gradient-to-b from-amber-50/70 to-white rounded-2xl p-5 border-2 border-amber-300 shadow-sm hover:shadow-xl hover:border-amber-400 transition-all duration-300 cursor-pointer flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">পেন্ডিং ড্রাফট</span>
              <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-amber-800 tracking-tight flex items-center gap-2">
                {stats ? stats.pendingDrafts.toLocaleString('bn-BD') : '0'}
                {stats && stats.pendingDrafts > 0 && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-100 flex items-center justify-between text-xs">
            <span className="text-amber-800 font-semibold">রিভিউ প্রয়োজন</span>
            <span className="inline-flex items-center gap-1 text-amber-800 font-bold group-hover:translate-x-1 transition-transform">
              যাচাই করুন <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Registered Users */}
        <div className="group relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80 group-hover:h-1.5 transition-all" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">শিক্ষার্থী একাউন্ট</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {stats ? stats.totalUsers.toLocaleString('bn-BD') : '...'}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">মোট রেজিস্টার্ড</span>
            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
              <TrendingUp className="w-3 h-3" /> +১৮% বৃদ্ধি
            </span>
          </div>
        </div>

        {/* API Keys */}
        <div
          onClick={() => onNavigateTab('keys')}
          className="group relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 cursor-pointer flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-80 group-hover:h-1.5 transition-all" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">এপিআই কি পুল</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                <Key className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {stats ? stats.openRouterKeysCount.toLocaleString('bn-BD') : '...'}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">স্মার্ট পুল</span>
            <span className="inline-flex items-center gap-1 text-blue-600 font-bold group-hover:translate-x-1 transition-transform">
              ফেইলওভার <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Real-time System Health & OpenRouter Telemetry Widget */}
      <AdminSystemHealthWidget
        onNavigateToKeys={() => onNavigateTab('keys')}
      />

      {/* 4-Layer Database Normalization & Topic Health Sync Tool */}
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-850 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
              <Sparkles className="w-3.5 h-3.5" />
              ৪-স্তরের (4-Layer) ফিল্টারিং ও টপিক হেলথ সিস্টেম
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              ডেটাবেজ নরম্যালাইজেশন ও টপিক কাউন্টার অটো-সিঙ্ক
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              নামহীন বা অসঙ্গতিপূর্ণ টপিকগুলো স্বয়ংক্রিয়ভাবে ম্যাপ করে, প্রতিটি ক্যাটাগরি ও চ্যাপ্টারের প্রশ্ন সংখ্যা নিখুঁতভাবে রিকাউন্ট করে এবং ফিল্টারিং ১০০% বাগ-মুক্ত রাখে।
            </p>
          </div>

          <button
            type="button"
            onClick={handleHealDatabase}
            disabled={isHealingDb}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Wrench className={`w-4 h-4 ${isHealingDb ? 'animate-spin' : ''}`} />
            {isHealingDb ? 'ডেটাবেজ সিঙ্ক হচ্ছে...' : '⚡ ১-ক্লিকে ডেটাবেজ সিঙ্ক ও হিল করুন'}
          </button>
        </div>

        {healResult && (
          <div className={`mt-4 p-4 rounded-xl border text-xs leading-relaxed ${healResult.success ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200' : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'}`}>
            <div className="font-bold text-sm mb-1 flex items-center gap-1.5">
              {healResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              {healResult.message}
            </div>
            {healResult.success && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 text-slate-700 dark:text-slate-300">
                <div>ম্যাপকৃত MCQ: <span className="font-bold text-emerald-700 dark:text-emerald-400">{healResult.totalMcqNormalized} টি</span></div>
                <div>ম্যাপকৃত লিখিত: <span className="font-bold text-emerald-700 dark:text-emerald-400">{healResult.totalWrittenNormalized} টি</span></div>
                <div>মোট সিঙ্ককৃত টপিক: <span className="font-bold text-indigo-700 dark:text-indigo-400">{healResult.totalTopicsCounted} টি</span></div>
                <div>ম্যাপিং প্রয়োজন: <span className="font-bold text-amber-700 dark:text-amber-400">{healResult.unmappedMcqCount + healResult.unmappedWrittenCount} টি</span></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Action Cards with High Contrast Visual Hierarchy */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600" />
            কুইক অপারেশন ও মডিউল স্টুডিও
          </h3>
          <span className="text-xs text-slate-500">যেকোনো মডিউলে সরাসরি প্রবেশ করুন</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Action: Knowledge Carousel */}
          <div
            onClick={() => onNavigateTab('carousel')}
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                নলেজ ক্যারোসেল কন্ট্রোল
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                হোমস্ক্রিনের শর্টকাট সূত্র, সাধারণ জ্ঞান ও অনুপ্রেরণামূলক স্লাইডারের টাইমার, থিম ও অ্যাকশন বাটন রিয়েল-টাইমে নিয়ন্ত্রণ করুন।
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-indigo-600 gap-1.5 group-hover:translate-x-1 transition-transform">
              ক্যারোসেল পরিচালনা করুন <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Action 1: Extract */}
          <div
            onClick={() => onNavigateTab('extract')}
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                এআই ডেটা এক্সট্রাকশন
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                বইয়ের টেক্সট, পিডিএফ বা ছবি থেকে স্বয়ংক্রিয়ভাবে নির্ভুল MCQ প্রশ্ন, LaTeX সূত্র ও TikZ চিত্র তৈরি করুন।
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-indigo-600 gap-1.5 group-hover:translate-x-1 transition-transform">
              এক্সট্রাকশন স্টুডিওতে যান <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Action 2: Review Queue */}
          <div
            onClick={() => onNavigateTab('drafts')}
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shadow-sm mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                <CheckCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                পেন্ডিং ড্রাফট কিউ
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                এআই জেনারেটকৃত খসড়া প্রশ্ন যাচাই ও সংশোধন করুন এবং ১-ক্লিকে লাইভ ডেটাবেজে প্রকাশ করুন।
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-amber-700 gap-1.5 group-hover:translate-x-1 transition-transform">
              অনুমোদন কিউ দেখুন <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Action 3: Live DB */}
          <div
            onClick={() => onNavigateTab('questions')}
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-sm mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                প্রশ্নব্যাংক ও সিলেবাস
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                পোস্টগ্রেস ডেটাবেজের সকল প্রশ্ন ও টপিক ব্রাউজ করুন, ফিল্টার করুন এবং ব্যাচ ইমপোর্ট করুন।
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-emerald-700 gap-1.5 group-hover:translate-x-1 transition-transform">
              ডেটাবেজ ব্রাউজ করুন <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Action 4: API Settings */}
          <div
            onClick={() => onNavigateTab('keys')}
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                <Key className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                এপিআই কি ও ফেইলওভার
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                ওপেনরাউটার একাধিক ফ্রি ও পেইড কী ম্যানেজ করুন, ল্যাটেন্সি টেস্ট করুন এবং অটো-ফেইলওভার নিশ্চিত করুন।
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-blue-700 gap-1.5 group-hover:translate-x-1 transition-transform">
              কী কনফিগার করুন <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* System Status & Architecture Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-indigo-600" />
          সিস্টেম আর্কিটেকচার ও ডেটা সেফটি গ্যারান্টি
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/70 transition-colors">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
              <Zap className="w-4 h-4 text-indigo-600" />
              জিরো-ডিসরাপশন আইসোলেশন
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              অ্যাডমিন প্যানেলের সমস্ত এআই ফিচার ও ড্রাফট কিউ সম্পূর্ণ আলাদা এপিআই এবং টেবিলে সুরক্ষিত। মূল স্টুডেন্ট অ্যাপে কোনো ব্যাঘাত ঘটে না।
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/70 transition-colors">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              হিউম্যান-ইন-দ্য-লুপ সেফটি
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              এআই নিষ্কাশিত ডেটা সরাসরি লাইভ ডেটাবেজে যায় না। অ্যাডমিনের রিভিউ ও অনুমোদনের পরেই কেবল মূল প্রশ্নব্যাংকে প্রকাশিত হয়।
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/70 transition-colors">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
              <Cpu className="w-4 h-4 text-blue-600" />
              স্মার্ট মাল্টি-কি ফেইলওভার
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              কোনো এপিআই কী রেট লিমিট (429) বা সার্ভার এরর (500) পেলে সিস্টেম স্বয়ংক্রিয়ভাবে পরবর্তী কী-তে সুইচ করে নিরবচ্ছিন্ন থাকে।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
