import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchTaxonomyHealthApi,
  mergeTopicsApi,
  normalizeTopicApi,
  deleteEmptyTopicsApi,
  reassignOrphanQuestionsApi,
  fetchMasterChartApi,
  fetchTaxonomyAuditLogsApi,
  TaxonomyHealthSummary,
  DuplicateSuspectGroup,
  ZeroQuestionTopicItem,
  OrphanedQuestionItem,
  TaxonomyAuditLogItem,
} from '../../services/api';
import { CascadingTaxonomyPicker, TaxonomySelectionValue } from './CascadingTaxonomyPicker';
import {
  Activity,
  AlertTriangle,
  GitMerge,
  Trash2,
  Edit3,
  CheckCircle2,
  RefreshCw,
  Search,
  Download,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  Layers,
  Database,
  FileText,
  Bookmark,
  ShieldCheck,
  ArrowRight,
  Filter,
  X,
  AlertCircle,
  HelpCircle,
  History,
} from 'lucide-react';

export const AdminTaxonomyHealthTab: React.FC = () => {
  const [healthData, setHealthData] = useState<TaxonomyHealthSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'duplicates' | 'empty' | 'orphans' | 'chart' | 'audit'>('duplicates');

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<TaxonomyAuditLogItem[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState<boolean>(false);

  // Merge Modal State
  const [selectedMergeGroup, setSelectedMergeGroup] = useState<DuplicateSuspectGroup | null>(null);
  const [mergeSurvivorId, setMergeSurvivorId] = useState<string>('');
  const [mergeBanglaName, setMergeBanglaName] = useState<string>('');
  const [mergeEnglishName, setMergeEnglishName] = useState<string>('');
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  // Rename/Normalize Modal State
  const [selectedNormalizeTopic, setSelectedNormalizeTopic] = useState<{ id: string; name: string; bangla_name: string } | null>(null);
  const [normalizeBanglaName, setNormalizeBanglaName] = useState<string>('');
  const [normalizeEnglishName, setNormalizeEnglishName] = useState<string>('');
  const [isNormalizing, setIsNormalizing] = useState<boolean>(false);

  // Delete Empty Topics State
  const [selectedEmptyTopicIds, setSelectedEmptyTopicIds] = useState<Set<string>>(new Set());
  const [isDeletingEmpty, setIsDeletingEmpty] = useState<boolean>(false);

  // Orphan Reassignment Modal State
  const [selectedOrphanQuestion, setSelectedOrphanQuestion] = useState<OrphanedQuestionItem | null>(null);
  const [orphanReassignTaxonomy, setOrphanReassignTaxonomy] = useState<TaxonomySelectionValue>({});
  const [isReassigningOrphan, setIsReassigningOrphan] = useState<boolean>(false);

  // Master Chart State
  const [masterChartContent, setMasterChartContent] = useState<string>('');
  const [isChartLoading, setIsChartLoading] = useState<boolean>(false);
  const [hasCopiedChart, setHasCopiedChart] = useState<boolean>(false);

  // Load health data
  const loadHealthData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchTaxonomyHealthApi();
      setHealthData(data);
      setSelectedEmptyTopicIds(new Set());
    } catch (err: any) {
      console.error('Error loading taxonomy health:', err);
      setError(err.message || 'ট্যাক্সোনমি হেলথ মেট্রিক লোড করা সম্ভব হয়নি');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setIsAuditLoading(true);
      const logs = await fetchTaxonomyAuditLogsApi(100);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error('Error loading taxonomy audit logs:', err);
    } finally {
      setIsAuditLoading(false);
    }
  };

  useEffect(() => {
    loadHealthData();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeSubTab]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Open Merge Modal
  const openMergeModal = (group: DuplicateSuspectGroup) => {
    setSelectedMergeGroup(group);
    const suggested = group.topics.find((t) => t.is_suggested_survivor) || group.topics[0];
    setMergeSurvivorId(suggested?.id || '');
    setMergeBanglaName(suggested?.bangla_name || group.bangla_name);
    setMergeEnglishName(suggested?.name || '');
    setMergeError(null);
  };

  // Perform Merge Action
  const handleExecuteMerge = async () => {
    if (!selectedMergeGroup || !mergeSurvivorId) return;

    try {
      setIsMerging(true);
      setMergeError(null);

      const sourceTopicIds = selectedMergeGroup.topics
        .map((t) => t.id)
        .filter((id) => id !== mergeSurvivorId);

      const res = await mergeTopicsApi({
        sourceTopicIds,
        targetTopicId: mergeSurvivorId,
        targetBanglaName: mergeBanglaName.trim(),
        targetName: mergeEnglishName.trim() || undefined,
      });

      showToast(`সফলভাবে ${res.merged_count}টি টপিক মার্জ করা হয়েছে (${res.reassigned_mcq_count + res.reassigned_written_count}টি প্রশ্ন রি-অ্যাসাইন হয়েছে)`);
      setSelectedMergeGroup(null);
      await loadHealthData();
    } catch (err: any) {
      console.error('Merge error:', err);
      setMergeError(err.message || 'মার্জ করার সময় সমস্যা হয়েছে');
    } finally {
      setIsMerging(false);
    }
  };

  // Perform Normalize / Rename Action
  const handleExecuteNormalize = async () => {
    if (!selectedNormalizeTopic || !normalizeBanglaName.trim()) return;

    try {
      setIsNormalizing(true);
      await normalizeTopicApi({
        topicId: selectedNormalizeTopic.id,
        banglaName: normalizeBanglaName.trim(),
        name: normalizeEnglishName.trim() || undefined,
      });

      showToast(`টপিক '${normalizeBanglaName}' সফলভাবে নরমালাইজ ও আপডেট হয়েছে`);
      setSelectedNormalizeTopic(null);
      await loadHealthData();
    } catch (err: any) {
      alert(err.message || 'নরমালাইজ করতে ব্যর্থ হয়েছে');
    } finally {
      setIsNormalizing(false);
    }
  };

  // Delete Empty Topics
  const handleDeleteEmptyTopics = async (topicIds: string[]) => {
    if (topicIds.length === 0) return;
    if (!confirm(`আপনি কি নিশ্চিত যে এই ${topicIds.length}টি শূন্য-প্রশ্ন টপিক মুছে ফেলতে চান?`)) {
      return;
    }

    try {
      setIsDeletingEmpty(true);
      const res = await deleteEmptyTopicsApi(topicIds);
      showToast(`সফলভাবে ${res.deleted_count}টি অব্যবহৃত টপিক মুছে ফেলা হয়েছে`);
      await loadHealthData();
    } catch (err: any) {
      alert(err.message || 'টপিক মুছে ফেলা সম্ভব হয়নি');
    } finally {
      setIsDeletingEmpty(false);
    }
  };

  // Reassign Orphan Question
  const handleExecuteReassignOrphan = async () => {
    if (!selectedOrphanQuestion || !orphanReassignTaxonomy.topic_id) {
      alert('অনুগ্রহ করে একটি বৈধ টপিক নির্বাচন করুন');
      return;
    }

    try {
      setIsReassigningOrphan(true);
      await reassignOrphanQuestionsApi([
        {
          question_id: selectedOrphanQuestion.question_id,
          question_type: selectedOrphanQuestion.question_type,
          target_topic_id: orphanReassignTaxonomy.topic_id,
        },
      ]);

      showToast(`প্রশ্নটি সফলভাবে '${orphanReassignTaxonomy.topic_name || orphanReassignTaxonomy.topic_id}' টপিকে অ্যাসাইন করা হয়েছে`);
      setSelectedOrphanQuestion(null);
      setOrphanReassignTaxonomy({});
      await loadHealthData();
    } catch (err: any) {
      alert(err.message || 'প্রশ্ন রি-অ্যাসাইন ব্যর্থ হয়েছে');
    } finally {
      setIsReassigningOrphan(false);
    }
  };

  // Load Master Chart on Tab Selection
  const loadMasterChart = async () => {
    try {
      setIsChartLoading(true);
      const text = await fetchMasterChartApi('markdown');
      setMasterChartContent(text);
    } catch (err: any) {
      console.error('Error fetching master chart:', err);
    } finally {
      setIsChartLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'chart' && !masterChartContent) {
      loadMasterChart();
    }
  }, [activeSubTab]);

  const handleCopyChart = () => {
    if (!masterChartContent) return;
    navigator.clipboard.writeText(masterChartContent);
    setHasCopiedChart(true);
    setTimeout(() => setHasCopiedChart(false), 2500);
  };

  const handleDownloadChart = (format: 'markdown' | 'json') => {
    const filename = `jachai-taxonomy-master-chart-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'md'}`;
    const element = document.createElement('a');
    const file = new Blob([masterChartContent], { type: format === 'json' ? 'application/json' : 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Filtered Duplicate Suspects
  const filteredDuplicates = useMemo(() => {
    if (!healthData?.duplicate_suspects) return [];
    if (!searchQuery.trim()) return healthData.duplicate_suspects;
    const q = searchQuery.toLowerCase();
    return healthData.duplicate_suspects.filter(
      (g) =>
        g.bangla_name.toLowerCase().includes(q) ||
        g.chapter_name.toLowerCase().includes(q) ||
        g.subject_name.toLowerCase().includes(q) ||
        g.topics.some((t) => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
    );
  }, [healthData, searchQuery]);

  // Filtered Empty Topics
  const filteredEmptyTopics = useMemo(() => {
    if (!healthData?.zero_question_topics) return [];
    if (!searchQuery.trim()) return healthData.zero_question_topics;
    const q = searchQuery.toLowerCase();
    return healthData.zero_question_topics.filter(
      (t) =>
        t.bangla_name.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.chapter_name && t.chapter_name.toLowerCase().includes(q))
    );
  }, [healthData, searchQuery]);

  // Toggle selection for empty topics
  const toggleEmptyTopicSelect = (id: string) => {
    const next = new Set(selectedEmptyTopicIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEmptyTopicIds(next);
  };

  const toggleSelectAllEmpty = () => {
    if (selectedEmptyTopicIds.size === filteredEmptyTopics.length) {
      setSelectedEmptyTopicIds(new Set());
    } else {
      setSelectedEmptyTopicIds(new Set(filteredEmptyTopics.map((t) => t.id)));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="admin-taxonomy-health-dashboard">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-900 text-emerald-100 rounded-xl shadow-2xl border border-emerald-700 flex items-center gap-3 animate-slide-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* HEADER & HEALTH OVERVIEW BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Taxonomy Health Diagnostics
              </div>
              <span className="text-xs text-slate-400">JACHAI Engine 3.0</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              ট্যাক্সোনমি ও ডাটাবেজ হেলথ ড্যাশবোর্ড
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              ডুপ্লিকেট টপিক মার্জ, শূন্য-প্রশ্ন টপিক ক্লিনআপ এবং এতিম প্রশ্নসমূহকে সঠিক ট্যাক্সোনমিতে ট্রানজেকশনালভাবে যুক্ত করুন।
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={loadHealthData}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              রিফ্রেশ ড্যাশবোর্ড
            </button>
            <button
              onClick={() => setActiveSubTab('chart')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
            >
              <FileText className="w-4 h-4" />
              লাইভ মাস্টার চার্ট
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        {healthData && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-[11px] text-slate-400 flex items-center justify-between">
                হেলথ স্কোর
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {healthData.health_score}%
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-[11px] text-slate-400 flex items-center justify-between">
                মোট বিষয়
                <Database className="w-3.5 h-3.5 text-indigo-400" />
              </span>
              <div className="text-2xl font-bold text-slate-100 mt-1">
                {healthData.total_subjects}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-[11px] text-slate-400 flex items-center justify-between">
                মোট অধ্যায়
                <Layers className="w-3.5 h-3.5 text-blue-400" />
              </span>
              <div className="text-2xl font-bold text-slate-100 mt-1">
                {healthData.total_chapters}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <span className="text-[11px] text-slate-400 flex items-center justify-between">
                মোট টপিক
                <Bookmark className="w-3.5 h-3.5 text-purple-400" />
              </span>
              <div className="text-2xl font-bold text-slate-100 mt-1">
                {healthData.total_topics}
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border ${healthData.duplicate_groups_count > 0 ? 'bg-amber-950/30 border-amber-800/80 text-amber-300' : 'bg-slate-800/40 border-slate-700/60 text-slate-300'}`}>
              <span className="text-[11px] text-slate-400 flex items-center justify-between">
                ডুপ্লিকেট সন্দেহ
                <GitMerge className="w-3.5 h-3.5 text-amber-400" />
              </span>
              <div className="text-2xl font-bold mt-1">
                {healthData.duplicate_groups_count}
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border ${healthData.orphaned_questions_count > 0 ? 'bg-red-950/30 border-red-800/80 text-red-300' : 'bg-slate-800/40 border-slate-700/60 text-slate-300'}`}>
              <span className="text-[11px] text-slate-400 flex items-center justify-between">
                অরফ্যান প্রশ্ন
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              </span>
              <div className="text-2xl font-bold mt-1">
                {healthData.orphaned_questions_count}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setActiveSubTab('duplicates'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeSubTab === 'duplicates'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            ডুপ্লিকেট সন্দেহভাজন টপিক
            {healthData && healthData.duplicate_groups_count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-bold">
                {healthData.duplicate_groups_count}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveSubTab('empty'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeSubTab === 'empty'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            অব্যবহৃত শূন্য-প্রশ্ন টপিক
            {healthData && healthData.zero_question_topics_count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-bold">
                {healthData.zero_question_topics_count}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveSubTab('orphans'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeSubTab === 'orphans'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            অরফ্যান টপিক প্রশ্ন
            {healthData && healthData.orphaned_questions_count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-bold">
                {healthData.orphaned_questions_count}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveSubTab('chart'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeSubTab === 'chart'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            লাইভ মাস্টার আইডি চার্ট
          </button>

          <button
            onClick={() => { setActiveSubTab('audit'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeSubTab === 'audit'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            ট্যাক্সোনমি অডিট লগ
          </button>
        </div>

        {/* Global Search Bar for Current Tab */}
        {activeSubTab !== 'chart' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="সার্চ করুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* LOADING STATE */}
      {isLoading && !healthData && (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            ট্যাক্সোনমি হেলথ ও ডুপ্লিকেট স্ক্যানিং চলছে...
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: DUPLICATE SUSPECTS */}
      {/* ========================================================================= */}
      {activeSubTab === 'duplicates' && healthData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50">
            <div className="flex items-center gap-3">
              <GitMerge className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  একই অধ্যায়ের অধীনে ডুপ্লিকেট সন্দেহভাজন টপিকসমূহ ({filteredDuplicates.length})
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  নিচের টপিকগুলোর নাম ও নরমালাইজড কী একই। আপনি 'টপিক মার্জ করুন' বাটনে ক্লিক করে সব প্রশ্ন একটি নির্দিষ্ট টপিকে সংযুক্ত করতে পারেন।
                </p>
              </div>
            </div>
          </div>

          {filteredDuplicates.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                অভিনন্দন! কোনো ডুপ্লিকেট টপিক পাওয়া যায়নি
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                আপনার ডাটাবেজের সকল টপিক ও আইডি ১০০% ইউনিক এবং সুশৃঙ্খল।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredDuplicates.map((group) => (
                <div
                  key={group.group_id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold">
                          {group.subject_name}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {group.chapter_name}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {group.bangla_name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        নরমালাইজড কী: <span className="font-mono text-slate-500">{group.normalized_key}</span> • মোট প্রশ্ন: <span className="font-semibold text-slate-700 dark:text-slate-300">{group.total_combined_questions}টি</span>
                      </p>
                    </div>

                    <button
                      onClick={() => openMergeModal(group)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition shrink-0"
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      টপিকগুলো মার্জ করুন
                    </button>
                  </div>

                  {/* Duplicate Candidates List */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.topics.map((t) => (
                      <div
                        key={t.id}
                        className={`p-3.5 rounded-xl border transition ${
                          t.is_suggested_survivor
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-[11px] text-slate-500 font-semibold truncate">
                            {t.id}
                          </span>
                          {t.is_suggested_survivor && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                              প্রস্তাবিত সার্ভাইভার
                            </span>
                          )}
                        </div>
                        <div className="font-medium text-xs text-slate-900 dark:text-slate-100 truncate">
                          {t.bangla_name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mb-2">
                          {t.name}
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-400">
                          <span>MCQ: <strong>{t.mcq_count}</strong> | Written: <strong>{t.written_count}</strong></span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            মোট: {t.total_questions}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ZERO-QUESTION EMPTY TOPICS */}
      {/* ========================================================================= */}
      {activeSubTab === 'empty' && healthData && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-purple-50 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-200 dark:border-purple-900/50">
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-purple-900 dark:text-purple-200">
                  অব্যবহৃত শূন্য-প্রশ্ন টপিকসমূহ ({filteredEmptyTopics.length})
                </h3>
                <p className="text-xs text-purple-700 dark:text-purple-400">
                  যেসব টপিকের অধীনে কোনো MCQ বা লিখিত প্রশ্ন নেই। ক্লিন ডাটাবেজের জন্য এগুলো মুছে ফেলতে পারেন।
                </p>
              </div>
            </div>

            {selectedEmptyTopicIds.size > 0 && (
              <button
                onClick={() => handleDeleteEmptyTopics(Array.from(selectedEmptyTopicIds))}
                disabled={isDeletingEmpty}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                নির্বাচিত ({selectedEmptyTopicIds.size}টি) টপিক মুছুন
              </button>
            )}
          </div>

          {filteredEmptyTopics.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                কোনো অপ্রয়োজনীয় শূন্য-প্রশ্ন টপিক নেই
              </h3>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEmptyTopicIds.size === filteredEmptyTopics.length && filteredEmptyTopics.length > 0}
                    onChange={toggleSelectAllEmpty}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span>সবগুলো সিলেক্ট করুন ({filteredEmptyTopics.length})</span>
                </label>
                <span>অ্যাকশন</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
                {filteredEmptyTopics.map((t) => {
                  const isChecked = selectedEmptyTopicIds.has(t.id);
                  return (
                    <div
                      key={t.id}
                      className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center justify-between gap-4 transition"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEmptyTopicSelect(t.id)}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 shrink-0"
                        />
                        <div className="truncate">
                          <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>{t.bangla_name}</span>
                            <span className="font-mono text-[10px] text-slate-400">[{t.id}]</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {t.chapter_name || t.chapter_id} • {t.subject_name || t.subject_id}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedNormalizeTopic(t);
                            setNormalizeBanglaName(t.bangla_name);
                            setNormalizeEnglishName(t.name);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="টপিক রিনেম ও নরমালাইজ"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmptyTopics([t.id])}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                          title="টপিক মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ORPHANED QUESTIONS */}
      {/* ========================================================================= */}
      {activeSubTab === 'orphans' && healthData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/30 p-4 rounded-xl border border-red-200 dark:border-red-900/50">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-red-900 dark:text-red-200">
                  অরফ্যান টপিক আইডিযুক্ত প্রশ্নসমূহ ({healthData.orphaned_questions.length})
                </h3>
                <p className="text-xs text-red-700 dark:text-red-400">
                  যেসব প্রশ্ন এমন একটি <code className="font-mono font-bold">topic_id</code> নির্দেশ করছে যা বর্তমানে ডাটাবেজে উপস্থিত নেই।
                </p>
              </div>
            </div>
          </div>

          {healthData.orphaned_questions.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                সব প্রশ্ন বৈধ টপিকের সাথে সঠিকভাবে সংযুক্ত আছে
              </h3>
            </div>
          ) : (
            <div className="space-y-3">
              {healthData.orphaned_questions.map((q) => (
                <div
                  key={`${q.question_type}_${q.question_id}`}
                  className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        q.question_type === 'mcq' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {q.question_type.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs text-slate-400">ID: {q.question_id}</span>
                      <span className="text-xs font-semibold text-red-500">
                        বর্তমান অবৈধ Topic ID: <code className="font-mono">{q.topic_id || 'NULL'}</code>
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2">
                      {q.question_text || '(প্রশ্নের টেক্সট নেই)'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedOrphanQuestion(q);
                      setOrphanReassignTaxonomy({
                        subject_id: q.subject_id,
                        chapter_id: q.chapter_id,
                      });
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    সঠিক টপিকে রি-অ্যাসাইন করুন
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LIVE MASTER ID CHART */}
      {/* ========================================================================= */}
      {activeSubTab === 'chart' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                লাইভ ট্যাক্সোনমি মাস্টার চার্ট (Live Master ID Chart)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ডাটাবেজের বর্তমান বাস্তব অবস্থা অনুযায়ী স্বয়ংক্রিয়ভাবে জেনারেট করা মাস্টার ট্যাক্সোনমি চার্ট।
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyChart}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {hasCopiedChart ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {hasCopiedChart ? 'কপি হয়েছে!' : 'Markdown কপি'}
              </button>
              <button
                onClick={() => handleDownloadChart('markdown')}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                ডাউনলোড (.md)
              </button>
            </div>
          </div>

          <div className="bg-slate-950 text-slate-100 p-6 rounded-2xl font-mono text-xs max-h-[650px] overflow-auto border border-slate-800 shadow-inner">
            {isChartLoading ? (
              <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                মাস্টার চার্ট রেন্ডারিং হচ্ছে...
              </div>
            ) : (
              <pre className="whitespace-pre-wrap">{masterChartContent}</pre>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: TAXONOMY AUDIT LOGS */}
      {/* ========================================================================= */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-teal-500" />
                ট্যাক্সোনমি পরিবর্তন অডিট লগ (Taxonomy Audit Trail)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                টপিক মার্জ, নাম পরিবর্তন, নতুন টপিক সংযোজন এবং ক্লিনআপের সম্পূর্ণ ট্রানজেকশনাল রেকর্ড।
              </p>
            </div>

            <button
              onClick={loadAuditLogs}
              disabled={isAuditLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditLoading ? 'animate-spin' : ''}`} />
              অডিট লগ রিফ্রেশ
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            {isAuditLoading ? (
              <div className="py-16 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-teal-500" />
                অডিট হিস্ট্রি লোড হচ্ছে...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                কোনো অডিট রেকর্ড পাওয়া যায়নি।
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-4 w-36">সময় (Time)</th>
                      <th className="py-3 px-4 w-28">অ্যাকশন (Action)</th>
                      <th className="py-3 px-4 w-44">টার্গেট ID (Entity ID)</th>
                      <th className="py-3 px-4">পরিবর্তনের বিবরণ (Details)</th>
                      <th className="py-3 px-4 w-28 text-center">সম্পাদনকারী</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {auditLogs
                      .filter((log) => {
                        if (!searchQuery) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          log.action.toLowerCase().includes(q) ||
                          log.entity_id.toLowerCase().includes(q) ||
                          JSON.stringify(log.details).toLowerCase().includes(q) ||
                          log.performed_by.toLowerCase().includes(q)
                        );
                      })
                      .map((log) => {
                        const dateStr = new Date(log.created_at).toLocaleString('bn-BD', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                        const actionBadgeClass =
                          log.action === 'MERGE'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : log.action === 'NORMALIZE'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : log.action === 'DELETE'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                            : log.action === 'CREATE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                              {dateStr}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] tracking-wide ${actionBadgeClass}`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                              {log.entity_id}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-sans text-xs">
                              {log.details?.survivor_name ? (
                                <div className="space-y-0.5">
                                  <div>
                                    সারভাইভার: <span className="font-bold text-slate-900 dark:text-white">{log.details.survivor_bangla_name || log.details.survivor_name}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    মার্জ করা টপিক: {log.details.source_ids?.length || 0} টি (MCQ: {log.details.reassigned_mcqs || 0}, Written: {log.details.reassigned_written || 0})
                                  </div>
                                </div>
                              ) : log.details?.new_bangla_name ? (
                                <div>
                                  নতুন নাম: <span className="font-bold text-slate-900 dark:text-white">{log.details.new_bangla_name}</span> ({log.details.new_name})
                                </div>
                              ) : log.details?.deleted_topic_ids ? (
                                <div>
                                  মুছে ফেলা আইডি: <span className="font-mono text-red-600 dark:text-red-400">{log.details.deleted_topic_ids.join(', ')}</span>
                                </div>
                              ) : (
                                <pre className="text-[11px] font-mono bg-slate-50 dark:bg-slate-800 p-1.5 rounded-md overflow-x-auto max-w-md">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-500">
                              {log.performed_by || 'admin'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: MERGE TOPICS MODAL */}
      {/* ========================================================================= */}
      {selectedMergeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
            <button
              onClick={() => setSelectedMergeGroup(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <GitMerge className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  টপিক মার্জ ও প্রশ্ন রিলোকেশন
                </h3>
                <p className="text-xs text-slate-500">
                  অধ্যায়: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedMergeGroup.chapter_name}</span>
                </p>
              </div>
            </div>

            {mergeError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
                {mergeError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Step 1: Survivor Topic Selection */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                  ১. মূল টপিক (Survivor Topic) নির্বাচন করুন:
                </label>
                <div className="space-y-2">
                  {selectedMergeGroup.topics.map((t) => {
                    const isSelected = mergeSurvivorId === t.id;
                    return (
                      <label
                        key={t.id}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <input
                            type="radio"
                            name="survivor_topic"
                            value={t.id}
                            checked={isSelected}
                            onChange={() => {
                              setMergeSurvivorId(t.id);
                              setMergeBanglaName(t.bangla_name);
                              setMergeEnglishName(t.name);
                            }}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <div className="truncate">
                            <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {t.bangla_name} <span className="font-mono font-normal text-slate-400 text-[10px]">[{t.id}]</span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {t.name} • মোট {t.total_questions}টি প্রশ্ন
                            </div>
                          </div>
                        </div>

                        {t.is_suggested_survivor && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                            প্রস্তাবিত
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Canonical Name Edit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    সার্ভাইভার বাংলা নাম:
                  </label>
                  <input
                    type="text"
                    value={mergeBanglaName}
                    onChange={(e) => setMergeBanglaName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    সার্ভাইভার ইংরেজি নাম:
                  </label>
                  <input
                    type="text"
                    value={mergeEnglishName}
                    onChange={(e) => setMergeEnglishName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Transaction notice */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>ট্রানজেকশনাল নিশ্চয়তা:</strong> মার্জ চলাকালীন অন্যান্য ডুপ্লিকেট টপিকের সকল প্রশ্ন স্বয়ংক্রিয়ভাবে সার্ভাইভার টপিকে স্থানান্তরিত হবে এবং অপ্রয়োজনীয় রেকর্ড নিরাপদভাবে ডিলিট হয়ে চ্যাপ্টারের টপিক কাউন্টার আপডেট হবে।
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedMergeGroup(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleExecuteMerge}
                disabled={isMerging}
                className="px-5 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isMerging ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    মার্জ সম্পন্ন হচ্ছে...
                  </>
                ) : (
                  <>
                    <GitMerge className="w-3.5 h-3.5" />
                    মার্জ নিশ্চিত করুন
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ORPHAN QUESTION REASSIGNMENT MODAL */}
      {/* ========================================================================= */}
      {selectedOrphanQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
            <button
              onClick={() => setSelectedOrphanQuestion(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <ArrowRight className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  প্রশ্নটি সঠিক টপিকে রি-অ্যাসাইন করুন
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Question ID: {selectedOrphanQuestion.question_id} ({selectedOrphanQuestion.question_type.toUpperCase()})
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs mb-4">
              <div className="font-semibold text-slate-500 mb-1">প্রশ্নের বিবরণ:</div>
              <p className="text-slate-800 dark:text-slate-200">
                {selectedOrphanQuestion.question_text || '(কোনো টেক্সট নেই)'}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                সঠিক ট্যাক্সোনমি নির্বাচন করুন:
              </label>
              <CascadingTaxonomyPicker
                value={orphanReassignTaxonomy}
                onChange={setOrphanReassignTaxonomy}
                layout="grid"
                showTopic={true}
                allowCreateTopic={true}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedOrphanQuestion(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleExecuteReassignOrphan}
                disabled={isReassigningOrphan || !orphanReassignTaxonomy.topic_id}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isReassigningOrphan ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    রি-অ্যাসাইন হচ্ছে...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    রি-অ্যাসাইন সম্পন্ন করুন
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
