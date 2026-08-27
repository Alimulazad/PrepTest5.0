import React, { useState } from 'react';
import {
  CheckCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit3,
  Search,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Layers,
  Sparkles,
  Check,
  X,
  ExternalLink,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { AdminDraftItem } from '../../types';
import MathText from '../MathText';
import { AdminDraftEditModal } from './AdminDraftEditModal';

interface AdminDraftsQueueTabProps {
  drafts: AdminDraftItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onApprovePublish: (id: string) => Promise<void>;
  onBatchApprovePublish: (ids: string[]) => Promise<void>;
  onBatchReject: (ids: string[]) => Promise<void>;
  onDeleteDraft: (id: string) => Promise<void>;
  onUpdateDraft: (id: string, payload: any) => Promise<void>;
  onNavigateToExtract: () => void;
}

export const AdminDraftsQueueTab: React.FC<AdminDraftsQueueTabProps> = ({
  drafts,
  isLoading,
  onRefresh,
  onApprovePublish,
  onBatchApprovePublish,
  onBatchReject,
  onDeleteDraft,
  onUpdateDraft,
  onNavigateToExtract,
}) => {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Action Loading states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit Modal
  const [editingDraft, setEditingDraft] = useState<AdminDraftItem | null>(null);

  // Filtered drafts
  const filteredDrafts = drafts.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (typeFilter !== 'all' && d.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const payloadStr = JSON.stringify(d.payload).toLowerCase();
      return (
        d.id.toLowerCase().includes(q) ||
        payloadStr.includes(q) ||
        (d.source_model && d.source_model.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filteredDrafts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDrafts.map((d) => d.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleApproveSingle = async (id: string) => {
    setProcessingId(id);
    setActionMessage(null);
    try {
      await onApprovePublish(id);
      setActionMessage({ text: 'আইটেমটি সফলভাবে লাইভ ডেটাবেজে প্রকাশিত হয়েছে!', type: 'success' });
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } catch (err: any) {
      setActionMessage({ text: err.message || 'প্রকাশ ব্যর্থ হয়েছে', type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchProcessing(true);
    setActionMessage(null);
    try {
      await onBatchApprovePublish(selectedIds);
      setActionMessage({ text: `${selectedIds.length} টি আইটেম লাইভ ডেটাবেজে প্রকাশিত হয়েছে!`, type: 'success' });
      setSelectedIds([]);
    } catch (err: any) {
      setActionMessage({ text: err.message || 'ব্যাচ প্রকাশ ব্যর্থ হয়েছে', type: 'error' });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`আপনি কি নিশ্চিত যে নির্বাচিত ${selectedIds.length} টি ড্রাফট বাতিল করতে চান?`)) return;
    setIsBatchProcessing(true);
    setActionMessage(null);
    try {
      await onBatchReject(selectedIds);
      setActionMessage({ text: `${selectedIds.length} টি আইটেম বাতিল করা হয়েছে।`, type: 'success' });
      setSelectedIds([]);
    } catch (err: any) {
      setActionMessage({ text: err.message || 'ব্যাচ বাতিল ব্যর্থ হয়েছে', type: 'error' });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই ড্রাফটটি মুছে ফেলতে চান?')) return;
    setProcessingId(id);
    try {
      await onDeleteDraft(id);
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } catch (err: any) {
      alert(err.message || 'মুছতে ব্যর্থ');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = drafts.filter((d) => d.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold mb-2">
            <Clock className="w-3.5 h-3.5" />
            হিউম্যান-ইন-দ্য-লুপ ভেরিফিকেশন
          </div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            পেন্ডিং অনুমোদন ও কোয়ালিটি কন্ট্রোল কিউ
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                {pendingCount.toLocaleString('bn-BD')} টি অপেক্ষমাণ
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            এআই দ্বারা প্রস্তুতকৃত সমস্ত ডেটা পরীক্ষা করুন। প্রয়োজনীয় অংশ ম্যানুয়ালি এডিট করুন এবং সন্তুষ্ট হলে অনুমোদন দিয়ে লাইভ অ্যাপে প্রকাশ করুন।
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            রিফ্রেশ কিউ
          </button>

          <button
            type="button"
            onClick={onNavigateToExtract}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            নতুন এআই নিষ্কাশন
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between gap-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters & Batch Controls Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  setSelectedIds([]);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status === 'pending'
                  ? '⏳ অপেক্ষমাণ (Pending)'
                  : status === 'approved'
                  ? '✅ অনুমোদিত (Live)'
                  : status === 'rejected'
                  ? '❌ বাতিল (Rejected)'
                  : 'সকল (All)'}
              </button>
            ))}
          </div>

          {/* Type Filter & Search */}
          <div className="flex items-center gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-medium bg-white cursor-pointer"
            >
              <option value="all">সকল ধরন (All Types)</option>
              <option value="question">📝 প্রশ্নাবলী (Questions)</option>
              <option value="topic">📑 টপিক ও সিলেবাস (Topics)</option>
              <option value="knowledge_snippet">💡 নলেজ স্নপেট (Snippets)</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ড্রাফট সার্চ করুন..."
                className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 w-48 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Batch Action Bar */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              {selectedIds.length} টি আইটেম নির্বাচিত হয়েছে
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBatchApprove}
                disabled={isBatchProcessing}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                একসাথে অনুমোদন ও লাইভ প্রকাশ করুন
              </button>
              <button
                type="button"
                onClick={handleBatchReject}
                disabled={isBatchProcessing}
                className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs cursor-pointer"
              >
                নির্বাচন মুছুন
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Select All Checkbox */}
      {filteredDrafts.length > 0 && (
        <div className="flex items-center justify-between px-2 text-xs text-slate-500 font-medium">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectedIds.length === filteredDrafts.length && filteredDrafts.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>সবগুলো নির্বাচন করুন ({filteredDrafts.length})</span>
          </label>

          <span>দেখানো হচ্ছে: {filteredDrafts.length} টি আইটেম</span>
        </div>
      )}

      {/* Drafts List Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">ড্রাফট কিউ লোড হচ্ছে...</p>
        </div>
      ) : filteredDrafts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <CheckCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {statusFilter === 'pending' ? 'কোনো অপেক্ষমাণ ড্রাফট নেই!' : 'কোনো ড্রাফট পাওয়া যায়নি'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {statusFilter === 'pending'
              ? 'এআই এক্সট্রাকশন স্টুডিও থেকে নতুন বইয়ের টেক্সট বা প্রশ্নপত্র আপলোড করে ড্রাফট কিউতে যুক্ত করুন।'
              : 'ফিল্টার পরিবর্তন করে দেখুন অথবা নতুন এক্সট্রাকশন রান করুন।'}
          </p>
          {statusFilter === 'pending' && (
            <button
              type="button"
              onClick={onNavigateToExtract}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              এআই নিষ্কাশন শুরু করুন
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDrafts.map((draft) => {
            const p = draft.payload;
            const isQuestion = draft.type === 'question';
            const isTopic = draft.type === 'topic';
            const isSnippet = draft.type === 'knowledge_snippet';
            const isSelected = selectedIds.includes(draft.id);

            return (
              <div
                key={draft.id}
                className={`bg-white rounded-2xl border transition-all shadow-xs hover:shadow-md overflow-hidden ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/10'
                    : draft.status === 'pending'
                    ? 'border-amber-200/90'
                    : draft.status === 'approved'
                    ? 'border-emerald-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Draft Card Top Header */}
                <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(draft.id)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isQuestion
                          ? 'bg-indigo-100 text-indigo-800'
                          : isTopic
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isQuestion ? (
                        <>
                          <HelpCircle className="w-3 h-3" /> প্রশ্ন (Question)
                        </>
                      ) : isTopic ? (
                        <>
                          <Layers className="w-3 h-3" /> টপিক (Topic)
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" /> নলেজ স্নপেট
                        </>
                      )}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        draft.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : draft.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {draft.status === 'pending'
                        ? '⏳ অপেক্ষমাণ'
                        : draft.status === 'approved'
                        ? '✅ অনুমোদিত ও লাইভ'
                        : '❌ বাতিল'}
                    </span>

                    {p.category && (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                        {p.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {draft.source_model && (
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {draft.source_model}
                      </span>
                    )}
                    <span>{new Date(draft.created_at).toLocaleDateString('bn-BD')}</span>
                  </div>
                </div>

                {/* Draft Card Body Content */}
                <div className="p-5 space-y-4">
                  {isQuestion && (
                    <>
                      {/* Question Text */}
                      <div className="text-base font-bold text-slate-900 leading-relaxed">
                        <MathText text={p.question_text || ''} />
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                          const isCorrect = p.correct_ans === opt;
                          const optText = p.options?.[opt] || '';
                          return (
                            <div
                              key={opt}
                              className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2.5 ${
                                isCorrect
                                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold ring-1 ring-emerald-400/30'
                                  : 'bg-slate-50/60 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                  isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {opt === 'A' ? 'ক' : opt === 'B' ? 'খ' : opt === 'C' ? 'গ' : 'ঘ'}
                              </span>
                              <div className="flex-1">
                                <MathText text={optText} />
                              </div>
                              {isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {p.explanation && (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-1">
                          <span className="font-bold text-indigo-700 block">ব্যাখ্যা ও টেকনিক:</span>
                          <MathText text={p.explanation} />
                        </div>
                      )}

                      {/* Tags */}
                      {Array.isArray(p.tags) && p.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {p.tags.map((t: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium border border-slate-200/60"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {isTopic && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-base font-bold text-slate-900">{p.bangla_name}</h4>
                          <span className="text-xs text-slate-500 font-mono">{p.name}</span>
                        </div>
                        {p.topic_code && (
                          <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-lg">
                            {p.topic_code}
                          </span>
                        )}
                      </div>

                      {Array.isArray(p.key_points) && p.key_points.length > 0 && (
                        <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 space-y-1">
                          <span className="text-xs font-bold text-purple-800 block">প্রধান ধারণাসমূহ:</span>
                          <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                            {p.key_points.map((pt: string, idx: number) => (
                              <li key={idx}>
                                <MathText text={pt} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {isSnippet && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-800">
                        <MathText text={p.content_bn || ''} />
                      </div>
                      {p.content_latex && (
                        <div className="p-2.5 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono">
                          <MathText text={`$${p.content_latex}$`} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Draft Card Actions Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingDraft(draft)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      এডিট ও সংশোধন
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSingle(draft.id)}
                      disabled={processingId === draft.id}
                      className="px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {draft.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleApproveSingle(draft.id)}
                        disabled={processingId === draft.id}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {processingId === draft.id ? 'প্রকাশ হচ্ছে...' : 'অনুমোদন ও লাইভ প্রকাশ'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingDraft && (
        <AdminDraftEditModal
          draft={editingDraft}
          isOpen={true}
          onClose={() => setEditingDraft(null)}
          onSave={async (id, payload) => {
            await onUpdateDraft(id, payload);
            setEditingDraft(null);
          }}
        />
      )}
    </div>
  );
};
