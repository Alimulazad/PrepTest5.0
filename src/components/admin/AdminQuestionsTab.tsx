import React, { useState, useRef } from 'react';
import {
  Database,
  Plus,
  Edit3,
  Trash2,
  Search,
  Check,
  RefreshCw,
  HelpCircle,
  Sparkles,
  Filter,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  FileJson,
} from 'lucide-react';
import { Question, QuestionSubject } from '../../types';
import { SUBJECTS_DATA } from '../../data/admissionData';
import MathText from '../MathText';
import { AdminQuestionEditModal } from './AdminQuestionEditModal';
import { AdminBulkImportModal } from './AdminBulkImportModal';
import { bulkImportQuestionsApi } from '../../services/api';
import { validateStrictJsonFormat } from '../../utils/jsonValidator';
import { fixMojibake } from '../../utils/mathNormalizer';

interface AdminQuestionsTabProps {
  questions: Question[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreateQuestion: (
    q: Partial<Question>,
    files?: { questionImageFile?: File | null; explanationImageFile?: File | null }
  ) => Promise<void>;
  onUpdateQuestion: (
    id: string,
    q: Partial<Question>,
    files?: { questionImageFile?: File | null; explanationImageFile?: File | null }
  ) => Promise<void>;
  onDeleteQuestion: (id: string) => Promise<void>;
}

export const AdminQuestionsTab: React.FC<AdminQuestionsTabProps> = ({
  questions,
  isLoading,
  onRefresh,
  onCreateQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    question: Partial<Question> | null;
    isNew: boolean;
  }>({
    isOpen: false,
    question: null,
    isNew: false,
  });

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [errorModalData, setErrorModalData] = useState<{
    title: string;
    message: string;
    details?: Array<{ path: string; message: string }>;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;

        // Perform strict JSON format validation against standard JSON rules
        const validationResult = validateStrictJsonFormat(content);
        if (!validationResult.valid) {
          setErrorModalData({
            title: 'JSON ফরম্যাট ভ্যালিডেশন ত্রুটি (Strict JSON Format Error)',
            message: 'আপলোডকৃত JSON ফাইলে সঠিক ফরম্যাটিং নিয়ম ভঙ্গ হয়েছে। নিচের ত্রুটিগুলোর সমাধান করুন:',
            details: validationResult.errors,
          });
          return;
        }

        const parsedData = validationResult.parsedData;

        setIsImporting(true);
        setErrorModalData(null);

        const res = await bulkImportQuestionsApi(parsedData);

        setNotification({
          text: `সফলভাবে ${res.count} টি প্রশ্ন ইমপোর্ট বা আপডেট করা হয়েছে!`,
          type: 'success',
        });
        setTimeout(() => setNotification(null), 5000);
        onRefresh();
      } catch (err: any) {
        if (err.details && Array.isArray(err.details)) {
          setErrorModalData({
            title: 'JSON ভ্যালিডেশন ত্রুটি (Zod Validation Failed)',
            message: err.message || 'আপলোডকৃত JSON ডেটায় তথ্যের ঘাটতি বা ভুল ফরম্যাট রয়েছে।',
            details: err.details,
          });
        } else {
          setErrorModalData({
            title: 'ইমপোর্ট ব্যর্থ হয়েছে',
            message: err.message || 'ডেটাবেজে প্রশ্ন সংরক্ষণে একটি অপ্রত্যাশিত সমস্যা দেখা দিয়েছে।',
          });
        }
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setErrorModalData({
        title: 'ফাইল রিড ত্রুটি',
        message: 'JSON ফাইলটি পড়া সম্ভব হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  // Filtered Questions
  const filteredQuestions = questions.filter((q) => {
    if (selectedSubject !== 'all' && q.subject_id !== selectedSubject) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const textMatch = q.question_text.toLowerCase().includes(query);
      const tagMatch = (q.tags || []).some((t) => t.toLowerCase().includes(query));
      const chapMatch = (q.chapter_name || '').toLowerCase().includes(query);
      return textMatch || tagMatch || chapMatch;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredQuestions.length / pageSize) || 1;
  const paginatedQuestions = filteredQuestions.slice((page - 1) * pageSize, page * pageSize);

  const handleOpenAdd = () => {
    setModalState({
      isOpen: true,
      question: {
        subject_id: 'physics_1',
        subject_name: 'Physics 1st Paper',
        paper: '1st',
        chapter_id: 'phy1_ch1',
        chapter_name: 'ভৌতজগত ও পরিমাপ',
        question_text: '',
        options: { A: '', B: '', C: '', D: '' },
        correct_ans: 'A',
        explanation: '',
        tags: ['DU Ka 24-25', 'Varsity A'],
        star_rating: 3,
        type: 'mcq',
        difficulty: 'medium',
      },
      isNew: true,
    });
  };

  const handleOpenEdit = (q: Question) => {
    setModalState({
      isOpen: true,
      question: { ...q },
      isNew: false,
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই প্রশ্নটি লাইভ ডেটাবেজ থেকে মুছে ফেলতে চান?')) return;
    try {
      await onDeleteQuestion(id);
      setNotification({ text: 'প্রশ্ন সফলভাবে মুছে ফেলা হয়েছে', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification({ text: err.message || 'মুছতে ব্যর্থ হয়েছে', type: 'error' });
    }
  };

  const handleSaveModal = async (
    data: Partial<Question>,
    files?: { questionImageFile?: File | null; explanationImageFile?: File | null }
  ) => {
    if (modalState.isNew) {
      await onCreateQuestion(data, files);
      setNotification({ text: 'নতুন প্রশ্ন সফলভাবে লাইভ ডেটাবেজে যুক্ত হয়েছে!', type: 'success' });
    } else if (modalState.question?.id) {
      await onUpdateQuestion(modalState.question.id, data, files);
      setNotification({ text: 'প্রশ্ন সফলভাবে আপডেট করা হয়েছে!', type: 'success' });
    }
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
            <Database className="w-3.5 h-3.5" />
            প্রোডাকশন SQLite স্টোরেজ
          </div>
          <h2 className="text-xl font-bold text-slate-900">লাইভ প্রশ্ন ও ডেটাবেজ ব্রাউজার</h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            লাইভ অ্যাপে শিক্ষার্থীদের জন্য দৃশ্যমান সকল প্রশ্ন ব্রাউজ করুন, ম্যানুয়ালি নতুন প্রশ্ন যুক্ত করুন বা সংশোধন করুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            disabled={isImporting || isLoading}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            Bulk Question Importer (Excel/CSV/Text)
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading || isImporting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            রিফ্রেশ
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            disabled={isImporting}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            নতুন প্রশ্ন যুক্ত করুন
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Search & Subject Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Subject Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setSelectedSubject('all');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedSubject === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            সকল বিষয় ({questions.length})
          </button>
          {SUBJECTS_DATA.map((sub) => {
            const count = questions.filter((q) => q.subject_id === sub.id).length;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  setSelectedSubject(sub.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedSubject === sub.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {sub.short_code} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="প্রশ্ন বা ট্যাগ সার্চ..."
            className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 w-full md:w-64"
          />
        </div>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">প্রশ্ন লোড হচ্ছে...</p>
        </div>
      ) : paginatedQuestions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">কোনো প্রশ্ন পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            নির্বাচিত বিষয় বা ফিল্টারে কোনো প্রশ্ন নেই। নতুন প্রশ্ন যুক্ত করতে উপরের বাটনে ক্লিক করুন।
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedQuestions.map((q, idx) => {
            const actualIdx = (page - 1) * pageSize + idx + 1;
            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all p-5 shadow-xs space-y-4"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                      #{actualIdx}
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded">
                      {fixMojibake(q.subject_name || q.subject_id)}
                    </span>
                    {q.chapter_name && (
                      <span className="text-xs text-slate-500 font-medium">
                        • {fixMojibake(q.chapter_name)}
                      </span>
                    )}
                    {q.star_rating && (
                      <span className="text-xs text-amber-500 font-bold">
                        {'★'.repeat(q.star_rating)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(q)}
                      className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> এডিট
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(q.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question */}
                <div className="text-sm font-bold text-slate-900 leading-relaxed">
                  <MathText text={q.question_text} />
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                    const isCorrect = q.correct_ans === opt;
                    const optVal = q.options?.[opt] || '';
                    return (
                      <div
                        key={opt}
                        className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {opt === 'A' ? 'ক' : opt === 'B' ? 'খ' : opt === 'C' ? 'গ' : 'ঘ'}
                        </span>
                        <div className="flex-1">
                          <MathText text={optVal} inline />
                        </div>
                        {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation & Tags */}
                {q.explanation && (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-200/70">
                    <span className="font-bold text-indigo-700 block mb-0.5">ব্যাখ্যা:</span>
                    <MathText text={q.explanation} />
                  </div>
                )}

                {Array.isArray(q.tags) && q.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {q.tags.map((t, i) => (
                      <span key={i} className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        #{fixMojibake(t)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
              <span className="text-xs text-slate-600">
                পৃষ্ঠা {page} / {totalPages} (মোট {filteredQuestions.length} টি প্রশ্ন)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40 cursor-pointer"
                >
                  পূর্ববর্তী
                </button>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40 cursor-pointer"
                >
                  পরবর্তী
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit/Add Modal */}
      {modalState.isOpen && (
        <AdminQuestionEditModal
          question={modalState.question}
          isOpen={modalState.isOpen}
          isNew={modalState.isNew}
          onClose={() => setModalState({ isOpen: false, question: null, isNew: false })}
          onSave={handleSaveModal}
        />
      )}

      {/* Bulk Upload 2.0 Modal (Excel / CSV / JSON / Raw Text) */}
      <AdminBulkImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={(count) => {
          setNotification({
            text: `সফলভাবে ${count} টি প্রশ্ন ডেটাবেজে ইমপোর্ট সম্পন্ন হয়েছে!`,
            type: 'success',
          });
          setTimeout(() => setNotification(null), 5000);
          onRefresh();
        }}
      />

      {/* Bulk Import Validation / DB Error Modal */}
      {errorModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-red-50 border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-red-800">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <h3 className="text-sm font-bold">{errorModalData.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setErrorModalData(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
              <p className="font-semibold text-slate-900 leading-relaxed">{errorModalData.message}</p>

              {errorModalData.details && errorModalData.details.length > 0 && (
                <div className="space-y-2">
                  <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    বিস্তারিত ত্রুটির তালিকা ({errorModalData.details.length} টি সমস্যা পাওয়া গেছে):
                  </p>
                  <div className="bg-slate-900 text-red-400 font-mono text-[11px] p-3.5 rounded-xl max-h-64 overflow-y-auto space-y-2">
                    {errorModalData.details.map((item, idx) => (
                      <div key={idx} className="flex gap-2 border-b border-slate-800 pb-1.5 last:border-0">
                        <span className="text-slate-500 shrink-0 font-bold">#{idx + 1}</span>
                        <div>
                          <span className="text-amber-400 font-semibold">{item.path}: </span>
                          <span className="text-slate-200">{item.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setErrorModalData(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
