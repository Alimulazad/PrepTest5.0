import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchTaxonomyTreeApi,
  createTopic,
  TaxonomyTreeResponse,
  TaxonomySubjectTreeNode,
  TaxonomyChapterTreeNode,
  TaxonomyTopicTreeNode,
} from '../../services/api';
import { normalizeBangla, generateTopicId } from '../../../packages/shared/src/taxonomy/resolve';
import {
  BookOpen,
  FileText,
  Bookmark,
  Hash,
  Plus,
  Search,
  Check,
  Star,
  RefreshCw,
  X,
  Layers,
  ChevronDown,
} from 'lucide-react';

export interface TaxonomySelectionValue {
  subject_id?: string;
  subject_name?: string;
  paper?: '1st' | '2nd';
  chapter_id?: string;
  chapter_name?: string;
  topic_id?: string;
  topic_name?: string;
  star_rating?: number;
}

export interface CascadingTaxonomyPickerProps {
  value?: TaxonomySelectionValue;
  onChange: (val: TaxonomySelectionValue) => void;
  layout?: 'grid' | 'vertical' | 'horizontal' | 'compact';
  showTopic?: boolean;
  allowCreateTopic?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const CascadingTaxonomyPicker: React.FC<CascadingTaxonomyPickerProps> = ({
  value = {},
  onChange,
  layout = 'grid',
  showTopic = true,
  allowCreateTopic = true,
  disabled = false,
  required = false,
  className = '',
}) => {
  const [treeData, setTreeData] = useState<TaxonomyTreeResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Topic search term
  const [topicSearchTerm, setTopicSearchTerm] = useState<string>('');
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState<boolean>(false);

  // Quick "+ New Topic" Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newTopicBanglaName, setNewTopicBanglaName] = useState<string>('');
  const [newTopicEnglishName, setNewTopicEnglishName] = useState<string>('');
  const [newTopicStarRating, setNewTopicStarRating] = useState<1 | 2 | 3>(3);
  const [newTopicCode, setNewTopicCode] = useState<string>('');
  const [isCreatingTopic, setIsCreatingTopic] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Load live taxonomy tree
  const loadTaxonomy = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetchTaxonomyTreeApi();
      setTreeData(res);
    } catch (err: any) {
      console.error('Failed to load taxonomy tree:', err);
      setError('ট্যাক্সোনমি লোড হতে ব্যর্থ হয়েছে');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTaxonomy();
  }, []);

  // Current Subject options
  const subjects = useMemo(() => {
    return treeData?.subjects || [];
  }, [treeData]);

  // Selected Subject Entity
  const selectedSubject = useMemo(() => {
    if (!value.subject_id) return undefined;
    return subjects.find((s) => s.id === value.subject_id);
  }, [subjects, value.subject_id]);

  // Derived Paper
  const derivedPaper: '1st' | '2nd' = useMemo(() => {
    if (value.paper) return value.paper;
    if (selectedSubject) return selectedSubject.paper;
    if (value.subject_id?.endsWith('_2')) return '2nd';
    return '1st';
  }, [value.paper, selectedSubject, value.subject_id]);

  // Chapter options for current subject & paper
  const chapterOptions = useMemo(() => {
    if (!selectedSubject) return [];
    return selectedSubject.chapters || [];
  }, [selectedSubject]);

  // Selected Chapter Entity
  const selectedChapter = useMemo(() => {
    if (!value.chapter_id) return undefined;
    return chapterOptions.find((c) => c.id === value.chapter_id);
  }, [chapterOptions, value.chapter_id]);

  // Topic options for current chapter
  const topicOptions = useMemo(() => {
    if (!selectedChapter) return [];
    return selectedChapter.topics || [];
  }, [selectedChapter]);

  // Filtered topics based on search term
  const filteredTopics = useMemo(() => {
    if (!topicSearchTerm.trim()) return topicOptions;
    const term = topicSearchTerm.toLowerCase();
    return topicOptions.filter(
      (t) =>
        t.bangla_name.toLowerCase().includes(term) ||
        t.name.toLowerCase().includes(term) ||
        t.id.toLowerCase().includes(term) ||
        (t.topic_code && t.topic_code.toLowerCase().includes(term))
    );
  }, [topicOptions, topicSearchTerm]);

  // Handlers for selection changes
  const handleSubjectChange = (newSubjectId: string) => {
    const sub = subjects.find((s) => s.id === newSubjectId);
    const paper = sub?.paper || (newSubjectId.endsWith('_2') ? '2nd' : '1st');
    
    onChange({
      subject_id: newSubjectId,
      subject_name: sub?.bangla_name || sub?.name || newSubjectId,
      paper,
      chapter_id: undefined,
      chapter_name: undefined,
      topic_id: undefined,
      topic_name: undefined,
    });
    setTopicSearchTerm('');
  };

  const handleChapterChange = (newChapterId: string) => {
    const chap = chapterOptions.find((c) => c.id === newChapterId);
    onChange({
      ...value,
      chapter_id: newChapterId,
      chapter_name: chap?.bangla_name || chap?.name || newChapterId,
      topic_id: undefined,
      topic_name: undefined,
    });
    setTopicSearchTerm('');
  };

  const handleTopicSelect = (topic: TaxonomyTopicTreeNode) => {
    onChange({
      ...value,
      topic_id: topic.id,
      topic_name: topic.bangla_name || topic.name,
      star_rating: topic.star_rating,
    });
    setIsTopicDropdownOpen(false);
  };

  // Quick Create New Topic Handler
  const handleCreateNewTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicBanglaName.trim()) {
      setCreateError('টপিকের বাংলা নাম আবশ্যক');
      return;
    }
    if (!value.chapter_id) {
      setCreateError('প্রথমে একটি অধ্যায় নির্বাচন করুন');
      return;
    }

    try {
      setIsCreatingTopic(true);
      setCreateError(null);

      const normBangla = normalizeBangla(newTopicBanglaName.trim());
      const normEnglish = (newTopicEnglishName || normBangla).trim();
      const generatedId = generateTopicId(value.chapter_id, normBangla);

      const created = await createTopic({
        id: generatedId,
        chapter_id: value.chapter_id,
        subject_id: value.subject_id,
        paper: derivedPaper,
        name: normEnglish,
        bangla_name: normBangla,
        star_rating: newTopicStarRating,
        topic_code: newTopicCode.trim() || undefined,
        total_questions: 0,
        completed_questions: 0,
      });

      // Reload taxonomy tree to refresh all lists
      await loadTaxonomy();

      // Automatically select the newly created topic
      onChange({
        ...value,
        topic_id: created.id,
        topic_name: created.bangla_name,
        star_rating: created.star_rating,
      });

      // Reset modal
      setNewTopicBanglaName('');
      setNewTopicEnglishName('');
      setNewTopicCode('');
      setIsCreateModalOpen(false);
    } catch (err: any) {
      console.error('Create topic error:', err);
      setCreateError(err.message || 'টপিক তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setIsCreatingTopic(false);
    }
  };

  // Layout Container Classes
  const gridClasses = {
    grid: 'grid grid-cols-1 md:grid-cols-3 gap-3',
    vertical: 'flex flex-col gap-3',
    horizontal: 'flex flex-row flex-wrap items-center gap-3',
    compact: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm',
  }[layout];

  return (
    <div className={`w-full ${className}`} id="cascading-taxonomy-picker">
      <div className={gridClasses}>
        {/* 1. SUBJECT & DERIVED PAPER */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              বিষয় (Subject) {required && <span className="text-red-500">*</span>}
            </span>
            {derivedPaper && value.subject_id && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium">
                {derivedPaper === '1st' ? '১ম পত্র' : '২য় পত্র'}
              </span>
            )}
          </label>
          <select
            id="taxonomy-picker-subject-select"
            value={value.subject_id || ''}
            onChange={(e) => handleSubjectChange(e.target.value)}
            disabled={disabled || isLoading}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition disabled:opacity-50"
          >
            <option value="">-- বিষয় নির্বাচন করুন --</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.bangla_name} ({sub.paper === '1st' ? '১ম পত্র' : '২য় পত্র'})
              </option>
            ))}
          </select>
        </div>

        {/* 2. CHAPTER */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              অধ্যায় (Chapter) {required && <span className="text-red-500">*</span>}
            </span>
            {selectedChapter && (
              <span className="text-[10px] text-slate-500">
                {selectedChapter.topics.length} টপিক
              </span>
            )}
          </label>
          <select
            id="taxonomy-picker-chapter-select"
            value={value.chapter_id || ''}
            onChange={(e) => handleChapterChange(e.target.value)}
            disabled={disabled || !value.subject_id || isLoading}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/40"
          >
            <option value="">
              {!value.subject_id ? '-- আগে বিষয় নির্বাচন করুন --' : '-- অধ্যায় নির্বাচন করুন --'}
            </option>
            {chapterOptions.map((chap) => (
              <option key={chap.id} value={chap.id}>
                {chap.bangla_name || chap.name} ({chap.topics?.length || 0})
              </option>
            ))}
          </select>
        </div>

        {/* 3. TOPIC (SEARCHABLE & WITH QUICK CREATE) */}
        {showTopic && (
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-emerald-500" />
                টপিক (Topic)
              </span>
              {allowCreateTopic && value.chapter_id && (
                <button
                  type="button"
                  id="taxonomy-picker-btn-new-topic"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-0.5 transition"
                >
                  <Plus className="w-3 h-3" />
                  নতুন টপিক
                </button>
              )}
            </label>

            {/* Custom Searchable Topic Selector */}
            <div className="relative">
              <button
                type="button"
                id="taxonomy-picker-topic-trigger"
                onClick={() => {
                  if (value.chapter_id && !disabled) {
                    setIsTopicDropdownOpen(!isTopicDropdownOpen);
                  }
                }}
                disabled={disabled || !value.chapter_id}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/40"
              >
                <span className="truncate text-slate-800 dark:text-slate-100">
                  {!value.chapter_id ? (
                    <span className="text-slate-400">-- আগে অধ্যায় নির্বাচন করুন --</span>
                  ) : value.topic_id ? (
                    <span className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {value.topic_name || topicOptions.find((t) => t.id === value.topic_id)?.bangla_name || value.topic_id}
                      </span>
                      {value.star_rating && (
                        <span className="text-amber-500 text-xs">
                          {'★'.repeat(value.star_rating)}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-400">-- টপিক নির্বাচন করুন ({topicOptions.length}) --</span>
                  )}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
              </button>

              {/* Topic Dropdown Popover */}
              {isTopicDropdownOpen && value.chapter_id && (
                <div
                  id="taxonomy-picker-topic-popover"
                  className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 max-h-72 overflow-hidden flex flex-col"
                >
                  {/* Search bar inside dropdown */}
                  <div className="relative mb-2 shrink-0">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      id="taxonomy-picker-topic-search-input"
                      placeholder="টপিকের নাম বা কোড দিয়ে খুঁজুন..."
                      value={topicSearchTerm}
                      onChange={(e) => setTopicSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 text-xs rounded-md bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                      autoFocus
                    />
                    {topicSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setTopicSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Options List */}
                  <div className="overflow-y-auto flex-1 space-y-1 pr-0.5">
                    {/* Clear selection option */}
                    <button
                      type="button"
                      onClick={() => {
                        onChange({ ...value, topic_id: undefined, topic_name: undefined });
                        setIsTopicDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      (কোনো টপিক নির্বাচন করবেন না)
                    </button>

                    {filteredTopics.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-500">
                        কোনো টপিক পাওয়া যায়নি
                        {allowCreateTopic && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsTopicDropdownOpen(false);
                                setNewTopicBanglaName(topicSearchTerm);
                                setIsCreateModalOpen(true);
                              }}
                              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> "{topicSearchTerm || 'নতুন টপিক'}" তৈরি করুন
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      filteredTopics.map((t) => {
                        const isSelected = value.topic_id === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleTopicSelect(t)}
                            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                              isSelected
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 font-medium'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex flex-col truncate pr-2">
                              <span className="truncate font-medium">{t.bangla_name}</span>
                              <span className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                {t.topic_code && <span className="text-emerald-600 dark:text-emerald-400 font-mono">[{t.topic_code}]</span>}
                                {t.name !== t.bangla_name && <span>{t.name}</span>}
                                <span>• {t.total_questions} প্রশ্ন</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-amber-500 font-bold">
                                {'★'.repeat(t.star_rating || 3)}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Bottom Quick Create Button */}
                  {allowCreateTopic && (
                    <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIsTopicDropdownOpen(false);
                          setNewTopicBanglaName(topicSearchTerm);
                          setIsCreateModalOpen(true);
                        }}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        নতুন টপিক যোগ করুন
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QUICK CREATE TOPIC MODAL */}
      {isCreateModalOpen && (
        <div
          id="taxonomy-picker-create-topic-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  নতুন টপিক তৈরি করুন
                </h3>
                <p className="text-xs text-slate-500">
                  অধ্যায়: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedChapter?.bangla_name || selectedChapter?.name || value.chapter_id}</span>
                </p>
              </div>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateNewTopic} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  টপিকের বাংলা নাম <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="new-topic-bangla-name"
                  placeholder="যেমন: কাজ-শক্তি উপপাদ্য ও ক্ষমতা"
                  value={newTopicBanglaName}
                  onChange={(e) => setNewTopicBanglaName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ইংরেজি নাম (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  id="new-topic-english-name"
                  placeholder="e.g. Work-Energy Theorem and Power"
                  value={newTopicEnglishName}
                  onChange={(e) => setNewTopicEnglishName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    টপিক কোড (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    id="new-topic-code"
                    placeholder="e.g. T-01"
                    value={newTopicCode}
                    onChange={(e) => setNewTopicCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    গুরুত্ব (Star Rating)
                  </label>
                  <select
                    id="new-topic-star-rating"
                    value={newTopicStarRating}
                    onChange={(e) => setNewTopicStarRating(Number(e.target.value) as 1 | 2 | 3)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  >
                    <option value={3}>★★★ (সর্বোচ্চ গুরুত্বপূর্ণ)</option>
                    <option value={2}>★★ (মাঝারি গুরুত্বপূর্ণ)</option>
                    <option value={1}>★ (সাধারণ)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  id="new-topic-submit-btn"
                  disabled={isCreatingTopic}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isCreatingTopic ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      তৈরি হচ্ছে...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      টপিক নিশ্চিত করুন
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
