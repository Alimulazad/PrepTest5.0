import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Activity,
  Users,
  Database,
  Key,
  Layers,
  Sparkles,
  HelpCircle,
  Server,
  RefreshCw,
  LogOut,
  ExternalLink,
  ChevronRight,
  Radio,
  Sliders,
  Bell,
} from 'lucide-react';
import { Question, AdminDraftItem, AdminApiKeyConfig, AdminSystemStats } from './types';
import {
  fetchQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  verifyAdminPassword,
  fetchAdminStatsApi,
  fetchAdminKeysApi,
  saveAdminKeysApi,
  fetchAdminDraftsApi,
  publishAdminDraftApi,
  batchPublishAdminDraftsApi,
  batchRejectAdminDraftsApi,
  deleteAdminDraftApi,
  updateAdminDraftApi,
  getApiBaseUrl,
  setCustomServerUrl
} from './services/api';

import { AdminDashboardTab } from './components/admin/AdminDashboardTab';
import { AdminExtractTab } from './components/admin/AdminExtractTab';
import { AdminDraftsQueueTab } from './components/admin/AdminDraftsQueueTab';
import { AdminApiKeysTab } from './components/admin/AdminApiKeysTab';
import { AdminQuestionsTab } from './components/admin/AdminQuestionsTab';
import { AdminSystemHealthWidget } from './components/admin/AdminSystemHealthWidget';
import { AdminActiveUsersTab } from './components/admin/AdminActiveUsersTab';
import { AdminNotificationsTab } from './components/admin/AdminNotificationsTab';
import { AdminKnowledgeCarouselTab } from './components/admin/AdminKnowledgeCarouselTab';
import { AdminTaxonomyHealthTab } from './components/admin/AdminTaxonomyHealthTab';
import { useToast } from './context/ToastContext';

export type AdminTabType =
  | 'dashboard'
  | 'carousel'
  | 'active_users'
  | 'notifications'
  | 'extract'
  | 'drafts'
  | 'questions'
  | 'taxonomy_health'
  | 'keys'
  | 'health';

export const AdminApp: React.FC = () => {
  const toast = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<AdminTabType>('dashboard');

  // Core Data States
  const [stats, setStats] = useState<AdminSystemStats | null>(null);
  const [keys, setKeys] = useState<AdminApiKeyConfig[]>([]);
  const [drafts, setDrafts] = useState<AdminDraftItem[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);

  // Backend URL Config modal/state
  const [serverUrlInput, setServerUrlInput] = useState<string>(getApiBaseUrl());
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // Check stored session auth
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('varsity_admin_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      loadAllAdminData();
    }
  }, []);

  const loadAllAdminData = useCallback(async () => {
    setIsLoading(true);
    setIsLoadingStats(true);
    try {
      const [statsData, keysData, draftsData, questionsData] = await Promise.allSettled([
        fetchAdminStatsApi(),
        fetchAdminKeysApi(),
        fetchAdminDraftsApi(),
        fetchQuestions(),
      ]);

      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (keysData.status === 'fulfilled') setKeys(keysData.value);
      if (draftsData.status === 'fulfilled') setDrafts(draftsData.value);
      if (questionsData.status === 'fulfilled') setQuestions(questionsData.value);
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setIsLoading(false);
      setIsLoadingStats(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsVerifying(true);

    try {
      const isValid = await verifyAdminPassword(passwordInput);
      if (isValid) {
        setIsAuthenticated(true);
        sessionStorage.setItem('varsity_admin_auth', 'true');
        toast.success('অ্যাডমিন সফলভাবে লগইন করেছেন');
        loadAllAdminData();
      } else {
        setAuthError('ভুল পাসওয়ার্ড! সঠিক অ্যাডমিন পাসওয়ার্ড দিন।');
      }
    } catch (err) {
      setAuthError('সার্ভারের সাথে সংযোগ করা সম্ভব হয়নি।');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('varsity_admin_auth');
    setIsAuthenticated(false);
    setPasswordInput('');
    toast.info('লগআউট সম্পন্ন হয়েছে');
  };

  // Draft action handlers
  const handlePublishDraft = async (draftId: string) => {
    try {
      await publishAdminDraftApi(draftId);
      toast.success('প্রশ্ন সফলভাবে ডেটাবেজে প্রকাশিত হয়েছে!');
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || 'প্রশ্ন প্রকাশ ব্যর্থ');
    }
  };

  const handleBatchPublish = async (draftIds: string[]) => {
    try {
      await batchPublishAdminDraftsApi(draftIds);
      toast.success(`${draftIds.length} টি ড্রাফট ডেটাবেজে প্রকাশিত হয়েছে!`);
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || 'ব্যাচ প্রকাশ ব্যর্থ');
    }
  };

  const handleBatchReject = async (draftIds: string[]) => {
    try {
      await batchRejectAdminDraftsApi(draftIds);
      toast.info(`${draftIds.length} টি ড্রাফট বাতিল করা হয়েছে`);
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || 'ড্রাফট বাতিলকরণ ব্যর্থ');
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      await deleteAdminDraftApi(draftId);
      toast.info('ড্রাফট ডিলিট করা হয়েছে');
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || 'ড্রাফট ডিলিট ব্যর্থ');
    }
  };

  const handleUpdateDraft = async (draftId: string, updates: Partial<AdminDraftItem>) => {
    try {
      await updateAdminDraftApi(draftId, updates);
      toast.success('ড্রাফট আপডেট করা হয়েছে');
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || 'ড্রাফট আপডেট ব্যর্থ');
    }
  };

  // Question CRUD handlers
  const handleCreateQuestion = async (q: Partial<Question>) => {
    try {
      await createQuestion(q);
      toast.success('নতুন প্রশ্ন যুক্ত হয়েছে');
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || 'প্রশ্ন তৈরি ব্যর্থ');
    }
  };

  const handleUpdateQuestion = async (id: string, q: Partial<Question>) => {
    try {
      await updateQuestion(id, q);
      toast.success('প্রশ্ন আপডেট করা হয়েছে');
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || 'প্রশ্ন আপডেট ব্যর্থ');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await deleteQuestion(id);
      toast.info('প্রশ্ন ডিলিট করা হয়েছে');
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || 'প্রশ্ন ডিলিট ব্যর্থ');
    }
  };

  const handleSaveServerUrl = () => {
    setCustomServerUrl(serverUrlInput);
    setShowConfigModal(false);
    toast.success('ব্যাকএন্ড URL সংরক্ষিত হয়েছে');
    window.location.reload();
  };

  // ---------------- LOGIN SCREEN ----------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 font-['Hind_Siliguri',sans-serif]">
        <div className="w-full max-w-md">
          {/* Header Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 shadow-xl shadow-indigo-500/20 mb-4 ring-8 ring-indigo-500/10">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              JACHAI অ্যাডমিন কন্ট্রোল সেন্টার
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              সম্পূর্ণ পৃথকীকৃত অ্যাডমিন ড্যাশবোর্ড ও সার্ভার টেলিমেট্রি
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span>অ্যাডমিন মাস্টার পাসওয়ার্ড</span>
                  <span className="text-[11px] text-indigo-400 font-mono">Secured (SHA-256)</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="মাস্টার পাসওয়ার্ড লিখুন..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                    autoFocus
                  />
                </div>
              </div>

              {authError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying || !passwordInput}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    যাচাই করা হচ্ছে...
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    প্রবেশ করুন
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="hover:text-indigo-400 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                ব্যাকএন্ড URL কনফিগার
              </button>
              <a
                href="/"
                className="hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                স্টুডেন্ট পোর্টালে যান <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Backend URL modal */}
        {showConfigModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                অ্যাডমিন ব্যাকএন্ড API এন্ডপয়েন্ট
              </h3>
              <p className="text-xs text-slate-400">
                লোকাল Ngrok টানেল বা প্রোডাকশন ব্যাকএন্ড সার্ভারের URL সেট করুন:
              </p>
              <input
                type="text"
                value={serverUrlInput}
                onChange={(e) => setServerUrlInput(e.target.value)}
                placeholder="https://xxxx.ngrok-free.dev"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  onClick={handleSaveServerUrl}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------- MAIN AUTHENTICATED ADMIN APP ----------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Hind_Siliguri',sans-serif]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Portal Title */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base tracking-tight">
                    JACHAI
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wide">
                    Admin Portal
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  API: <span className="font-mono text-slate-300 truncate max-w-[180px]">{getApiBaseUrl()}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Logout */}
            <div className="flex items-center gap-3">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-800 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                স্টুডেন্ট সাইট দেখুন
              </a>

              <button
                onClick={() => loadAllAdminData()}
                disabled={isLoading}
                title="তথ্য রিফ্রেশ করুন"
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/20 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                লগআউট
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-800/40 no-scrollbar">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              ড্যাশবোর্ড ও মেট্রিক্স
            </button>

            <button
              onClick={() => setActiveTab('carousel')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap relative ${
                activeTab === 'carousel'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              নলেজ ক্যারোসেল
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            </button>

            <button
              onClick={() => setActiveTab('active_users')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap relative ${
                activeTab === 'active_users'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              অ্যাক্টিভ ইউজার মনিটরিং
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap relative ${
                activeTab === 'notifications'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-purple-300" />
              লাইভ নোটিফিকেশন ব্রডকাস্ট
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
            </button>

            <button
              onClick={() => setActiveTab('extract')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'extract'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI প্রশ্ন এক্সট্রাকশন
            </button>

            <button
              onClick={() => setActiveTab('drafts')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'drafts'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              ড্রাফট কিউ ({drafts.filter((d) => d.status === 'pending').length})
            </button>

            <button
              onClick={() => setActiveTab('questions')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'questions'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              প্রশ্নব্যাংক ({questions.length})
            </button>

            <button
              onClick={() => setActiveTab('taxonomy_health')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'taxonomy_health'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              ট্যাক্সোনমি হেলথ ও মাস্টার চার্ট
            </button>

            <button
              onClick={() => setActiveTab('keys')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'keys'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              API কী ম্যানেজার
            </button>

            <button
              onClick={() => setActiveTab('health')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'health'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              সিস্টেম হেলথ
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'dashboard' && (
              <AdminDashboardTab
                stats={stats}
                isLoadingStats={isLoadingStats}
                onRefreshStats={loadAllAdminData}
                onNavigateTab={(tab) => setActiveTab(tab as AdminTabType)}
              />
            )}

            {activeTab === 'carousel' && <AdminKnowledgeCarouselTab />}

            {activeTab === 'active_users' && <AdminActiveUsersTab />}

            {activeTab === 'notifications' && <AdminNotificationsTab />}

            {activeTab === 'extract' && (
              <AdminExtractTab
                onExtractionComplete={loadAllAdminData}
                onNavigateToDrafts={() => setActiveTab('drafts')}
              />
            )}

            {activeTab === 'drafts' && (
              <AdminDraftsQueueTab
                drafts={drafts}
                isLoading={isLoading}
                onApprovePublish={handlePublishDraft}
                onBatchApprovePublish={handleBatchPublish}
                onBatchReject={handleBatchReject}
                onDeleteDraft={handleDeleteDraft}
                onUpdateDraft={handleUpdateDraft}
                onNavigateToExtract={() => setActiveTab('extract')}
                onRefresh={loadAllAdminData}
              />
            )}

            {activeTab === 'questions' && (
              <AdminQuestionsTab
                questions={questions}
                isLoading={isLoading}
                onCreateQuestion={handleCreateQuestion}
                onUpdateQuestion={handleUpdateQuestion}
                onDeleteQuestion={handleDeleteQuestion}
                onRefresh={loadAllAdminData}
              />
            )}

            {activeTab === 'taxonomy_health' && <AdminTaxonomyHealthTab />}

            {activeTab === 'keys' && (
              <AdminApiKeysTab
                keys={keys}
                isLoading={isLoading}
                onRefreshKeys={loadAllAdminData}
                onSaveKeys={async (newKeys) => {
                  await saveAdminKeysApi(newKeys);
                  loadAllAdminData();
                }}
              />
            )}

            {activeTab === 'health' && <AdminSystemHealthWidget />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
export default AdminApp;
