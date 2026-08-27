import React, { useState } from 'react';
import { 
  X, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Send, 
  HelpCircle,
  FileCode,
  Tag
} from 'lucide-react';
import { AdminDraftItem, Question } from '../../types';
import MathText from '../MathText';
import { SUBJECTS_DATA } from '../../data/admissionData';

interface AdminDraftEditModalProps {
  draft: AdminDraftItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updatedPayload: any) => Promise<void>;
  onPublishDirect?: (id: string) => Promise<void>;
}

export const AdminDraftEditModal: React.FC<AdminDraftEditModalProps> = ({
  draft,
  isOpen,
  onClose,
  onSave,
  onPublishDirect,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'json'>('edit');
  const [formData, setFormData] = useState<any>(() => ({ ...draft.payload }));
  const [rawJsonText, setRawJsonText] = useState<string>(() => JSON.stringify(draft.payload, null, 2));
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isQuestion = draft.type === 'question';
  const isTopic = draft.type === 'topic';
  const isSnippet = draft.type === 'knowledge_snippet';

  const handleJsonChange = (val: string) => {
    setRawJsonText(val);
    try {
      const parsed = JSON.parse(val);
      setFormData(parsed);
      setErrorMsg('');
    } catch (e: any) {
      setErrorMsg('JSON ফরম্যাট সঠিক নয়: ' + e.message);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setErrorMsg('');
    try {
      await onSave(draft.id, formData);
      setSuccessMsg('ড্রাফট সফলভাবে সংরক্ষিত হয়েছে');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (e: any) {
      setErrorMsg(e.message || 'সংরক্ষণ ব্যর্থ');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishNow = async () => {
    setIsPublishing(true);
    setErrorMsg('');
    try {
      // First save changes
      await onSave(draft.id, formData);
      // Then publish
      if (onPublishDirect) {
        await onPublishDirect(draft.id);
      }
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || 'লাইভ প্রকাশ ব্যর্থ');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/40">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold">
                {isQuestion ? 'প্রশ্ন ড্রাফট সম্পাদনা' : isTopic ? 'টপিক ড্রাফট সম্পাদনা' : 'নলেজ স্নপেট সম্পাদনা'}
              </h3>
              <p className="text-[11px] text-slate-400">আইডি: {draft.id} • সোর্স: {draft.source_model || 'AI'}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-100/90 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'edit' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ফর্ম ভিউ
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'preview' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              লাইভ LaTeX প্রিভিউ
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'json' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              র-JSON এডিটর
            </button>
          </div>

          {successMsg && (
            <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {successMsg}
            </span>
          )}
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'edit' && (
            <div className="space-y-4 text-xs sm:text-sm">
              {isQuestion && (
                <>
                  {/* Subject & Question details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">বিষয় (Subject)</label>
                      <select
                        value={formData.subject_id || 'physics_1'}
                        onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white outline-none"
                      >
                        {SUBJECTS_DATA.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.paper})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ক্যাটাগরি</label>
                      <select
                        value={formData.category || 'varsity_a'}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white outline-none"
                      >
                        <option value="varsity_a">Varsity 'Ka' (ঢাবি 'ক' ইউনিট)</option>
                        <option value="engineering">Engineering (বুয়েট/রুয়েট/চুয়েট)</option>
                        <option value="medical">Medical (মেডিকেল ও ডেন্টাল)</option>
                        <option value="academic">HSC Academic</option>
                      </select>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      প্রশ্নের মূল টেক্সট (বাংলা ও LaTeX: $...$)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.question_text || ''}
                      onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white outline-none font-sans leading-relaxed"
                    />
                  </div>

                  {/* 4 Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['A', 'B', 'C', 'D'].map((optKey) => (
                      <div key={optKey} className="relative">
                        <label className="block font-bold text-slate-700 mb-1">
                          বিকল্প ({optKey === 'A' ? 'ক' : optKey === 'B' ? 'খ' : optKey === 'C' ? 'গ' : 'ঘ'})
                        </label>
                        <input
                          type="text"
                          value={formData.options?.[optKey] || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              options: {
                                ...formData.options,
                                [optKey]: e.target.value,
                              },
                            })
                          }
                          className={`w-full p-2.5 rounded-xl border text-slate-900 ${
                            formData.correct_ans === optKey
                              ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-400 font-semibold'
                              : 'border-slate-300 bg-slate-50 focus:bg-white'
                          } outline-none`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Correct answer & Difficulty */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">সঠিক উত্তর</label>
                      <select
                        value={formData.correct_ans || 'A'}
                        onChange={(e) => setFormData({ ...formData, correct_ans: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-emerald-400 bg-emerald-50/60 font-bold text-emerald-950 outline-none"
                      >
                        <option value="A">ক (A)</option>
                        <option value="B">খ (B)</option>
                        <option value="C">গ (C)</option>
                        <option value="D">ঘ (D)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">কঠিনতার মাত্রা</label>
                      <select
                        value={formData.difficulty || 'medium'}
                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white outline-none"
                      >
                        <option value="easy">সহজ (Easy)</option>
                        <option value="medium">মাঝারি (Medium)</option>
                        <option value="hard">কঠিন (Hard)</option>
                      </select>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ব্যাখ্যা ও সমাধান (Explanation)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.explanation || ''}
                      onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white outline-none leading-relaxed"
                    />
                  </div>
                </>
              )}

              {isTopic && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">টপিক নাম (বাংলা)</label>
                    <input
                      type="text"
                      value={formData.bangla_name || ''}
                      onChange={(e) => setFormData({ ...formData, bangla_name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">টপিক নাম (English)</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white outline-none"
                    />
                  </div>
                </div>
              )}

              {isSnippet && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">কন্টেন্ট (বাংলা / সূত্র)</label>
                    <textarea
                      rows={4}
                      value={formData.content_bn || ''}
                      onChange={(e) => setFormData({ ...formData, content_bn: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">রেন্ডারড প্রিভিউ (KaTeX Live)</h4>
              {isQuestion && (
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
                  <MathText text={formData.question_text || 'প্রশ্নের টেক্সট নেই'} className="font-semibold text-slate-900" />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {['A', 'B', 'C', 'D'].map((optKey) => (
                      <div
                        key={optKey}
                        className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                          formData.correct_ans === optKey
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-[10px]">
                          {optKey === 'A' ? 'ক' : optKey === 'B' ? 'খ' : optKey === 'C' ? 'গ' : 'ঘ'}
                        </span>
                        <MathText text={formData.options?.[optKey] || ''} />
                      </div>
                    ))}
                  </div>

                  {formData.explanation && (
                    <div className="mt-3 p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs">
                      <p className="font-bold text-blue-950 mb-1">ব্যাখ্যা:</p>
                      <MathText text={formData.explanation} />
                    </div>
                  )}
                </div>
              )}

              {!isQuestion && (
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                  <pre className="text-xs text-slate-800 font-mono whitespace-pre-wrap">
                    {JSON.stringify(formData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'json' && (
            <div>
              <textarea
                rows={14}
                value={rawJsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                className="w-full p-4 font-mono text-xs rounded-xl bg-slate-900 text-emerald-400 border border-slate-800 outline-none leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300 rounded-xl transition-all"
          >
            বাতিল
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleSaveDraft}
              disabled={isSaving || isPublishing}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'ড্রাফট সেভ করুন'}</span>
            </button>

            <button
              onClick={handlePublishNow}
              disabled={isSaving || isPublishing}
              className="flex-1 sm:flex-initial px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isPublishing ? 'প্রকাশ হচ্ছে...' : 'অনুমোদন ও লাইভ পাবলিশ'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
