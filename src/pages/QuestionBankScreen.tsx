import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Calculator,
  Stethoscope,
  BookMarked,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Award,
  Atom,
  Zap,
  FlaskConical,
  Dna,
  Laptop,
  Languages,
  Globe2,
  Calendar,
  CheckCircle2,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import { SubjectInfo, Question, WrittenQuestion, ExamCategory, QuestionSubject, Chapter, QuestionsPaginatedResponse, WrittenQuestionsPaginatedResponse } from '../types';
import { SUBJECTS_DATA, UNIVERSITIES_DATA, CHAPTERS_DATA } from '../data/admissionData';
import { COMPREHENSIVE_CHAPTERS_DATA } from '../data/subjectTopicsData';
import { INITIAL_WRITTEN_QUESTIONS } from '../data/writtenQuestionsData';
import { useInfiniteQuestions, useQuestionCounts } from '../hooks/useQuestions';
import { useInfiniteWrittenQuestions } from '../hooks/useWrittenQuestions';
import QuestionCard from '../components/QuestionCard';
import WrittenQuestionCard from '../components/WrittenQuestionCard';
import EmptyState from '../components/common/EmptyState';
import { QuestionListSkeleton } from '../components/common/SkeletonLoader';
import VirtualizedQuestionList from '../components/common/VirtualizedQuestionList';
import { filterQuestions, matchCategory } from '../utils/questionFilter';

interface QuestionBankScreenProps {
  questions: Question[];
  writtenQuestions?: WrittenQuestion[];
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  onAskAI: (question: Question | WrittenQuestion) => void;
  isLoading?: boolean;
}

export function matchesCategory(q: Question, category: ExamCategory): boolean {
  if (q.category && q.category === category) return true;
  const tagsStr = (q.tags || []).join(' ').toLowerCase();
  if (category === 'engineering') {
    return (
      tagsStr.includes('buet') ||
      tagsStr.includes('engineering') ||
      tagsStr.includes('sust') ||
      tagsStr.includes('ckruet') ||
      tagsStr.includes('cuet') ||
      tagsStr.includes('ruet') ||
      tagsStr.includes('kuet') ||
      tagsStr.includes('iut')
    );
  }
  if (category === 'medical') {
    return tagsStr.includes('medical') || tagsStr.includes('mbbs') || tagsStr.includes('dental') || tagsStr.includes('mat');
  }
  if (category === 'varsity_a') {
    return (
      tagsStr.includes('du') ||
      tagsStr.includes('varsity') ||
      tagsStr.includes('gst') ||
      tagsStr.includes('bup') ||
      tagsStr.includes('ru') ||
      tagsStr.includes('cu') ||
      tagsStr.includes('ju') ||
      tagsStr.includes('agri')
    );
  }
  if (category === 'academic') {
    return tagsStr.includes('board') || tagsStr.includes('hsc') || tagsStr.includes('academic') || tagsStr.includes('dhaka board');
  }
  if (category === 'main_book') {
    return tagsStr.includes('main book') || tagsStr.includes('textbook') || tagsStr.includes('মূলবই') || tagsStr.includes('অনুশীলনী');
  }
  return false;
}

// Category visual cards config
interface CategoryCardConfig {
  id: ExamCategory;
  label: string;
  gradient: string;
  bgSolid: string;
  textColor: string;
  icon: React.ReactNode;
  illustrationType: 'academic' | 'main_book' | 'engineering' | 'medical' | 'varsity';
}

const toBengaliNumber = (num: number | string): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
};

const CATEGORY_CARDS_CONFIG: CategoryCardConfig[] = [
  {
    id: 'academic',
    label: 'একাডেমিক',
    gradient: 'from-[#CA8A04] via-[#D97706] to-[#B45309]',
    bgSolid: '#D97706',
    textColor: 'text-amber-100',
    icon: <BookOpen className="w-8 h-8 text-amber-200" />,
    illustrationType: 'academic',
  },
  {
    id: 'main_book',
    label: 'মূলবই',
    gradient: 'from-[#6B21A8] via-[#7E22CE] to-[#581C87]',
    bgSolid: '#7E22CE',
    textColor: 'text-purple-100',
    icon: <BookMarked className="w-8 h-8 text-purple-200" />,
    illustrationType: 'main_book',
  },
  {
    id: 'engineering',
    label: 'ইঞ্জিনিয়ারিং',
    gradient: 'from-[#881337] via-[#9F1239] to-[#701A75]',
    bgSolid: '#881337',
    textColor: 'text-rose-100',
    icon: <Calculator className="w-8 h-8 text-rose-200" />,
    illustrationType: 'engineering',
  },
  {
    id: 'medical',
    label: 'মেডিকেল',
    gradient: 'from-[#1E40AF] via-[#2563EB] to-[#1D4ED8]',
    bgSolid: '#2563EB',
    textColor: 'text-blue-100',
    icon: <Stethoscope className="w-8 h-8 text-blue-200" />,
    illustrationType: 'medical',
  },
  {
    id: 'varsity_a',
    label: "ভার্সিটি 'ক'",
    gradient: 'from-[#15803D] via-[#16A34A] to-[#14532D]',
    bgSolid: '#16A34A',
    textColor: 'text-emerald-100',
    icon: <GraduationCap className="w-8 h-8 text-emerald-200" />,
    illustrationType: 'varsity',
  },
];

export const QuestionBankScreen: React.FC<QuestionBankScreenProps> = ({
  questions,
  writtenQuestions: propWrittenQuestions,
  bookmarks,
  onToggleBookmark,
  onAskAI,
  isLoading = false,
}) => {
  // Navigation states
  const [activeTab, setActiveTab] = useState<'subject' | 'model_test' | 'university'>('subject');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<SubjectInfo | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ExamCategory | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | 'all' | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isDrilledIntoTopics, setIsDrilledIntoTopics] = useState<boolean>(false);
  const [questionTypeFilter, setQuestionTypeFilter] = useState<'all' | 'mcq' | 'written'>('mcq');
  const [showAllAnswers, setShowAllAnswers] = useState<boolean>(false);
  const [visibleLimit, setVisibleLimit] = useState<number>(15);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  const [fetchedWrittenQuestions, setFetchedWrittenQuestions] = useState<WrittenQuestion[]>([]);

  useEffect(() => {
    fetch('/api/written-questions')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setFetchedWrittenQuestions(data);
        } else if (data && Array.isArray(data.questions)) {
          setFetchedWrittenQuestions(data.questions);
        } else {
          setFetchedWrittenQuestions([]);
        }
      })
      .catch(() => {
        setFetchedWrittenQuestions([]);
      });
  }, []);

  const [dynamicTopics, setDynamicTopics] = useState<any[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState<boolean>(false);

  useEffect(() => {
    if (selectedChapter && selectedChapter !== 'all') {
      setIsLoadingTopics(true);
      fetch(`/api/topics?chapter_id=${selectedChapter.id}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            setDynamicTopics(data);
          } else {
            setDynamicTopics([]);
          }
          setIsLoadingTopics(false);
        })
        .catch((err) => {
          console.error('Error fetching dynamic topics:', err);
          setDynamicTopics([]);
          setIsLoadingTopics(false);
        });
    } else {
      setDynamicTopics([]);
    }
  }, [selectedChapter]);

  const combinedSubtopics = useMemo(() => {
    if (!selectedChapter || selectedChapter === 'all') return [];
    
    const staticSubtopics = selectedChapter.subtopics || [];
    const topicMap = new Map<string, { id: string; topic_code?: string; name: string; bangla_name: string }>();

    // Add static first
    staticSubtopics.forEach((st) => {
      topicMap.set(st.id, st);
    });

    // Add/Overwrite with dynamic from database
    dynamicTopics.forEach((dt) => {
      topicMap.set(dt.id, {
        id: dt.id,
        topic_code: dt.topic_code,
        name: dt.name,
        bangla_name: dt.bangla_name || dt.name,
      });
    });

    return Array.from(topicMap.values());
  }, [selectedChapter, dynamicTopics]);

  const allWrittenQuestions = useMemo(() => {
    return propWrittenQuestions && propWrittenQuestions.length > 0
      ? propWrittenQuestions
      : fetchedWrittenQuestions;
  }, [propWrittenQuestions, fetchedWrittenQuestions]);

  // Filtered Subjects for Level 1
  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return SUBJECTS_DATA;
    const q = searchQuery.toLowerCase();
    return SUBJECTS_DATA.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.bangla_name.includes(q) ||
        s.paper.includes(q) ||
        (s.short_code && s.short_code.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Related chapters for selected subject
  const subjectChapters = useMemo(() => {
    if (!selectedSubject) return [];
    const directChapters = COMPREHENSIVE_CHAPTERS_DATA.filter((c) => c.subject_id === selectedSubject.id);
    if (directChapters.length > 0) return directChapters;

    const fallbackChapters = CHAPTERS_DATA.filter((c) => c.subject_id === selectedSubject.id);
    if (fallbackChapters.length > 0) return fallbackChapters;

    // Fallback: extract distinct chapters from questions
    const extractedMap = new Map<string, Chapter>();
    questions
      .filter((q) => q.subject_id === selectedSubject.id || q.subject_name.includes(selectedSubject.bangla_name))
      .forEach((q) => {
        if (q.chapter_id && !extractedMap.has(q.chapter_id)) {
          extractedMap.set(q.chapter_id, {
            id: q.chapter_id,
            subject_id: selectedSubject.id,
            paper: (selectedSubject.paper.includes('1') ? '1st' : '2nd') as any,
            name: q.chapter_name,
            bangla_name: q.chapter_name,
            total_questions: 50,
            completed_questions: 12,
            star_rating: 3,
          });
        }
      });
    return Array.from(extractedMap.values());
  }, [selectedSubject, questions]);

  // ==========================================
  // LIVE DATABASE QUESTION COUNTS (PostgreSQL / Realtime Sync)
  // ==========================================
  const { data: dbCounts } = useQuestionCounts();

  const getSubjectTotalCount = (subId: string): number => {
    if (!dbCounts?.bySubject) return 0;
    const lower = subId.toLowerCase();
    return dbCounts.bySubject[subId]?.total ?? dbCounts.bySubject[lower]?.total ?? 0;
  };

  const getCategoryCountForSubject = (subId: string, catId: ExamCategory): number => {
    if (!dbCounts?.bySubjectAndCategory) return 0;
    const lower = subId.toLowerCase();
    const subMap = dbCounts.bySubjectAndCategory[subId] || dbCounts.bySubjectAndCategory[lower];
    if (subMap && subMap[catId] !== undefined) {
      return subMap[catId].total;
    }
    return 0;
  };

  const getChapterCount = (chapterId: string, category?: ExamCategory): number => {
    if (!dbCounts) return 0;
    const lower = chapterId.toLowerCase();
    if (category && dbCounts.byChapterAndCategory) {
      const chMap = dbCounts.byChapterAndCategory[chapterId] || dbCounts.byChapterAndCategory[lower];
      if (chMap && chMap[category] !== undefined) {
        return chMap[category].total;
      }
    }
    return dbCounts.byChapter?.[chapterId]?.total ?? dbCounts.byChapter?.[lower]?.total ?? 0;
  };

  const getTopicCount = (topicId: string, category?: ExamCategory): number => {
    if (!dbCounts) return 0;
    const lower = topicId.toLowerCase();
    if (category && dbCounts.byTopicAndCategory) {
      const tMap = dbCounts.byTopicAndCategory[topicId] || dbCounts.byTopicAndCategory[lower];
      if (tMap && tMap[category] !== undefined) {
        return tMap[category].total;
      }
    }
    return dbCounts.byTopic?.[topicId]?.total ?? dbCounts.byTopic?.[lower]?.total ?? 0;
  };

  // Calculate real category counts for the selected subject
  const categoryCounts = useMemo(() => {
    const counts: Record<ExamCategory, number> = {
      academic: 0,
      main_book: 0,
      engineering: 0,
      medical: 0,
      varsity_a: 0,
    };

    if (!selectedSubject) return counts;

    CATEGORY_CARDS_CONFIG.forEach((cat) => {
      counts[cat.id] = getCategoryCountForSubject(selectedSubject.id, cat.id);
    });

    return counts;
  }, [selectedSubject, dbCounts]);

  // Filtered Questions for Level 4 (Explorer View)
  const currentQuestions = useMemo(() => {
    if (!selectedSubject || !selectedCategory) return [];

    return filterQuestions(questions, {
      subject_id: selectedSubject.id,
      category: selectedCategory,
      chapter_id: selectedChapter && selectedChapter !== 'all' ? selectedChapter.id : undefined,
      topic_id: selectedTopicId || undefined,
      type: questionTypeFilter !== 'all' ? questionTypeFilter : undefined,
      search: searchQuery.trim() || undefined,
    });
  }, [questions, selectedSubject, selectedCategory, selectedChapter, selectedTopicId, questionTypeFilter, searchQuery]);

  // Filtered Written Questions
  const currentWrittenQuestions = useMemo(() => {
    if (!selectedSubject || !selectedCategory) return [];

    return filterQuestions(allWrittenQuestions, {
      subject_id: selectedSubject.id,
      category: selectedCategory,
      chapter_id: selectedChapter && selectedChapter !== 'all' ? selectedChapter.id : undefined,
      topic_id: selectedTopicId || undefined,
      search: searchQuery.trim() || undefined,
    });
  }, [allWrittenQuestions, selectedSubject, selectedCategory, selectedChapter, selectedTopicId, searchQuery]);
  // ==========================================
  // SERVER-DRIVEN TANSTACK REACT QUERY HOOKS
  // ==========================================
  const isWrittenMode = questionTypeFilter === 'written';

  const mcqFilters = useMemo(() => ({
    subject_id: selectedSubject?.id,
    category: selectedCategory || undefined,
    chapter_id: selectedChapter && selectedChapter !== 'all' ? selectedChapter.id : undefined,
    topic_id: selectedTopicId || undefined,
    search: searchQuery.trim() || undefined,
    type: questionTypeFilter !== 'all' ? questionTypeFilter : undefined,
  }), [selectedSubject, selectedCategory, selectedChapter, selectedTopicId, searchQuery, questionTypeFilter]);

  const writtenFilters = useMemo(() => ({
    subject_id: selectedSubject?.id,
    category: selectedCategory || undefined,
    chapter_id: selectedChapter && selectedChapter !== 'all' ? selectedChapter.id : undefined,
    topic_id: selectedTopicId || undefined,
    search: searchQuery.trim() || undefined,
  }), [selectedSubject, selectedCategory, selectedChapter, selectedTopicId, searchQuery]);

  const {
    data: mcqData,
    isLoading: isMcqLoading,
    isFetching: isMcqFetching,
    fetchNextPage: fetchNextMcqPage,
    hasNextPage: hasNextMcqPage,
    isFetchingNextPage: isFetchingNextMcqPage,
  } = useInfiniteQuestions(mcqFilters, 15, {
    enabled: Boolean(selectedSubject && selectedCategory && !isWrittenMode),
  });

  const {
    data: writtenData,
    isLoading: isWrittenLoading,
    isFetching: isWrittenFetching,
    fetchNextPage: fetchNextWrittenPage,
    hasNextPage: hasNextWrittenPage,
    isFetchingNextPage: isFetchingNextWrittenPage,
  } = useInfiniteWrittenQuestions(writtenFilters, 15, {
    enabled: Boolean(selectedSubject && selectedCategory && isWrittenMode),
  });

  // Extract server-fetched items with deduplication by ID
  const serverMcqQuestions = useMemo(() => {
    const pages = (mcqData as any)?.pages as QuestionsPaginatedResponse[] | undefined;
    if (!pages) return [];
    const all = pages.flatMap((page) => page.questions || []);
    const seen = new Set<string>();
    return all.filter((q) => {
      const id = q.id || `temp-${Math.random()}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [mcqData]);

  const serverWrittenQuestions = useMemo(() => {
    const pages = (writtenData as any)?.pages as WrittenQuestionsPaginatedResponse[] | undefined;
    if (!pages) return [];
    const all = pages.flatMap((page) => page.questions || []);
    const seen = new Set<string>();
    return all.filter((wq) => {
      const id = wq.id || `temp-${Math.random()}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [writtenData]);

  // Combine server data with client-side fallback if server returns empty/offline
  const activeMcqQuestions = useMemo(() => {
    if (serverMcqQuestions.length > 0) return serverMcqQuestions;
    return currentQuestions;
  }, [serverMcqQuestions, currentQuestions]);

  const activeWrittenQuestions = useMemo(() => {
    if (serverWrittenQuestions.length > 0) return serverWrittenQuestions;
    return currentWrittenQuestions;
  }, [serverWrittenQuestions, currentWrittenQuestions]);

  // Server-driven loading state for Dynamic Skeleton Transition
  const isServerLoading = isWrittenMode
    ? (isWrittenLoading || (isWrittenFetching && !isFetchingNextWrittenPage))
    : (isMcqLoading || (isMcqFetching && !isFetchingNextMcqPage));

  const activeList = isWrittenMode ? activeWrittenQuestions : activeMcqQuestions;

  const totalQuestionsHeader = useMemo(() => {
    const isWritten = isWrittenMode;
    const serverTotal = isWritten
      ? ((writtenData as any)?.pages?.[0]?.total)
      : ((mcqData as any)?.pages?.[0]?.total);

    if (typeof serverTotal === 'number') {
      return serverTotal;
    }

    if (selectedTopicId && selectedCategory) {
      const tCount = dbCounts?.byTopicAndCategory?.[selectedTopicId]?.[selectedCategory];
      if (tCount) return isWritten ? tCount.written : tCount.mcq;
    } else if (selectedChapter && selectedChapter !== 'all' && selectedCategory) {
      const chCount = dbCounts?.byChapterAndCategory?.[selectedChapter.id]?.[selectedCategory];
      if (chCount) return isWritten ? chCount.written : chCount.mcq;
    } else if (selectedSubject && selectedCategory) {
      const sCount = dbCounts?.bySubjectAndCategory?.[selectedSubject.id]?.[selectedCategory];
      if (sCount) return isWritten ? sCount.written : sCount.mcq;
    }

    return activeList.length;
  }, [isWrittenMode, writtenData, mcqData, selectedTopicId, selectedChapter, selectedSubject, selectedCategory, dbCounts, activeList.length]);

  const handleSelectChapter = (ch: Chapter) => {
    setSelectedChapter(ch);
    setSelectedTopicId(null);
    setIsDrilledIntoTopics(true);
  };

  const handleSelectAllChapters = () => {
    setSelectedChapter('all');
    setSelectedTopicId(null);
    setIsDrilledIntoTopics(false);
  };

  const handleBackToChapters = () => {
    setIsDrilledIntoTopics(false);
  };

  const handleSelectTopic = (topicId: string | null) => {
    setSelectedTopicId(topicId);
  };

  const handleSelectCategory = (catId: ExamCategory) => {
    setSelectedCategory(catId);
    setSelectedChapter(null);
    setSelectedTopicId(null);
    setIsDrilledIntoTopics(false);
  };

  const handleToggleQuestionType = (type: 'mcq' | 'written') => {
    if (type === questionTypeFilter) return;
    setQuestionTypeFilter(type);
  };

  // IntersectionObserver for Server-Driven Infinite Scrolling
  useEffect(() => {
    if (isLoading || isServerLoading) return;
    const isWritten = questionTypeFilter === 'written';
    const hasNext = isWritten ? hasNextWrittenPage : hasNextMcqPage;
    const isFetchingNext = isWritten ? isFetchingNextWrittenPage : isFetchingNextMcqPage;

    if (!hasNext || isFetchingNext) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasNext && !isFetchingNext) {
          if (isWritten) {
            fetchNextWrittenPage();
          } else {
            fetchNextMcqPage();
          }
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const currentTrigger = loadMoreTriggerRef.current;
    if (currentTrigger) {
      observer.observe(currentTrigger);
    }

    return () => {
      if (currentTrigger) observer.unobserve(currentTrigger);
    };
  }, [
    isLoading,
    isServerLoading,
    questionTypeFilter,
    hasNextMcqPage,
    hasNextWrittenPage,
    isFetchingNextMcqPage,
    isFetchingNextWrittenPage,
    fetchNextMcqPage,
    fetchNextWrittenPage,
  ]);

  // Render subject icon helper
  const renderSubjectArt = (sub: SubjectInfo) => {
    if (sub.id.startsWith('physics')) return <Atom className="w-12 h-12 text-white/20" />;
    if (sub.id.startsWith('chem')) return <FlaskConical className="w-12 h-12 text-white/20" />;
    if (sub.id.startsWith('math')) return <Calculator className="w-12 h-12 text-white/20" />;
    if (sub.id.startsWith('bio')) return <Dna className="w-12 h-12 text-white/20" />;
    if (sub.id === 'ict') return <Laptop className="w-12 h-12 text-white/20" />;
    if (sub.id === 'bangla') return <BookOpen className="w-12 h-12 text-white/20" />;
    if (sub.id === 'english') return <Languages className="w-12 h-12 text-white/20" />;
    return <Globe2 className="w-12 h-12 text-white/20" />;
  };

  // ==========================================
  // LEVEL 3 & 4: Questions List with Sticky Hierarchical Chapter/Topic Bar (Matching Video)
  // ==========================================
  if (selectedSubject && selectedCategory) {
    const activeCategoryInfo = CATEGORY_CARDS_CONFIG.find((c) => c.id === selectedCategory);
    const activeCategoryLabel = activeCategoryInfo ? activeCategoryInfo.label : selectedCategory;

    const activeList = isWrittenMode ? activeWrittenQuestions : activeMcqQuestions;
    const isFetchingNext = isWrittenMode ? isFetchingNextWrittenPage : isFetchingNextMcqPage;
    const hasNext = isWrittenMode ? hasNextWrittenPage : hasNextMcqPage;

    return (
      <div className="space-y-4 pb-36 max-w-2xl mx-auto px-1 sm:px-2">
        {/* Top Header (Matching Screenshots 1-4 & Video) */}
        <div className="pt-2 pb-1 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-750">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setSelectedChapter(null);
                setSelectedTopicId(null);
                setIsDrilledIntoTopics(false);
                setSelectedCategory(null);
              }}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="ক্যাটাগরি নির্বাচনে ফিরে যান"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg tracking-tight">
              {selectedSubject.bangla_name} {selectedSubject.paper} ({activeCategoryLabel})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Universal Eye Toggle Button */}
            <button
              type="button"
              id="btn-toggle-all-answers"
              onClick={() => setShowAllAnswers((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                showAllAnswers
                  ? 'bg-[#047857] text-white ring-2 ring-emerald-400'
                  : 'bg-[#059669] hover:bg-[#047857] text-white'
              }`}
              title={showAllAnswers ? 'সকল উত্তর লুকান' : 'একসাথে সকল উত্তর দেখুন'}
            >
              {showAllAnswers ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">উত্তর লুকান</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">সকল উত্তর</span>
                </>
              )}
            </button>

            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold font-mono border border-slate-200/60 dark:border-slate-700">
              {toBengaliNumber(totalQuestionsHeader)} টি প্রশ্ন
            </span>
          </div>
        </div>

        {/* Questions List with Dynamic Server Skeleton Transition & Infinite Scrolling */}
        {(isLoading || isServerLoading) ? (
          <div className="space-y-4 pt-1" id="question-bank-skeleton-loading">
            <QuestionListSkeleton count={4} />
          </div>
        ) : activeList.length > 0 ? (
          <div className="space-y-4 pt-1">
            {isWrittenMode ? (
              (activeList as WrittenQuestion[]).map((wq, idx) => (
                <WrittenQuestionCard
                  key={`${wq.id || 'wq'}-${idx}`}
                  question={wq}
                  index={idx}
                  forceShowAnswer={showAllAnswers}
                  isBookmarked={bookmarks.includes(wq.id)}
                  onToggleBookmark={() => onToggleBookmark(wq.id)}
                  onAskAI={onAskAI as any}
                />
              ))
            ) : (
              (activeList as Question[]).map((q, idx) => (
                <QuestionCard
                  key={`${q.id || 'q'}-${idx}`}
                  question={q}
                  index={idx}
                  mode="practice"
                  forceShowAnswer={showAllAnswers}
                  isBookmarked={bookmarks.includes(q.id)}
                  onToggleBookmark={() => onToggleBookmark(q.id)}
                  onAskAI={onAskAI}
                />
              ))
            )}

            {/* Bottom Sentinel and Green Circular Spinner during server infinite fetch */}
            {hasNext && (
              <div
                ref={loadMoreTriggerRef}
                className="py-5 flex flex-col items-center justify-center gap-2"
              >
                {isFetchingNext && (
                  <div className="w-7 h-7 rounded-full border-3 border-emerald-500/20 border-t-emerald-600 dark:border-t-emerald-400 animate-spin" />
                )}
              </div>
            )}

            {/* End of questions banner */}
            {!hasNext && activeList.length > 0 && (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 font-medium">
                — সকল প্রশ্ন দেখানো হয়েছে ({toBengaliNumber(totalQuestionsHeader)} টি) —
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            title="এই ফিল্টারে কোনো প্রশ্ন পাওয়া যায়নি"
            description="নিচের বার থেকে অন্য অধ্যায় বা টপিক নির্বাচন করুন অথবা ফিল্টার রিসেট করুন।"
            actionLabel="সকল অধ্যায় দেখুন"
            onAction={handleSelectAllChapters}
          />
        )}

        {/* Sticky Bottom Bar: Horizontal Scrollable Chapter/Topic Chips + MCQ/Written Toggle (Matching Video) */}
        <div className="fixed bottom-[56px] left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 py-2.5 px-3 max-w-2xl mx-auto shadow-lg space-y-2">
          {/* Row 1: Horizontal Scrollable Chapter / Topic Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            {!isDrilledIntoTopics || selectedChapter === 'all' || !selectedChapter ? (
              <>
                {/* All Chapters Chip */}
                <button
                  type="button"
                  id="btn-all-chapters"
                  onClick={handleSelectAllChapters}
                  className={`px-3.5 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    selectedChapter === 'all' || selectedChapter === null
                      ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900 dark:border-emerald-500 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  সকল অধ্যায় ({toBengaliNumber(getCategoryCountForSubject(selectedSubject.id, selectedCategory))})
                </button>

                {/* Individual Chapter Chips */}
                {subjectChapters.map((ch) => {
                  const isSelected = selectedChapter !== 'all' && selectedChapter?.id === ch.id;
                  const count = getChapterCount(ch.id, selectedCategory);

                  return (
                    <button
                      type="button"
                      key={ch.id}
                      id={`btn-chapter-${ch.id}`}
                      onClick={() => handleSelectChapter(ch)}
                      className={`px-3.5 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900 dark:border-emerald-500 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {ch.bangla_name} ({toBengaliNumber(count)})
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                {/* Back to Chapters List button */}
                <button
                  type="button"
                  id="btn-back-to-chapters"
                  onClick={handleBackToChapters}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0"
                  title="অধ্যায়সমূহে ফিরে যান"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>অধ্যায়সমূহ</span>
                </button>

                {/* All Topics Chip for the Selected Chapter */}
                <button
                  type="button"
                  id="btn-all-topics"
                  onClick={() => handleSelectTopic(null)}
                  className={`px-3.5 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    selectedTopicId === null
                      ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900 dark:border-emerald-500 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  সকল টপিক ({toBengaliNumber(getChapterCount(selectedChapter.id, selectedCategory))})
                </button>

                {/* Subtopic Chips for Selected Chapter */}
                {combinedSubtopics.map((st) => {
                  const isSelected = selectedTopicId === st.id;
                  const count = getTopicCount(st.id, selectedCategory);

                  return (
                    <button
                      type="button"
                      key={st.id}
                      id={`btn-topic-${st.id}`}
                      onClick={() => handleSelectTopic(st.id)}
                      className={`px-3.5 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900 dark:border-emerald-500 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {st.bangla_name} ({toBengaliNumber(count)})
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Row 2: MCQ vs Written Filter Radio/Pills (Matching Video & Screenshot 4) */}
          <div className="flex items-center gap-5 px-1 pt-0.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="radio"
                name="qtype_bottom"
                checked={questionTypeFilter === 'mcq'}
                onChange={() => handleToggleQuestionType('mcq')}
                className="text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
              />
              <span>MCQ</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="radio"
                name="qtype_bottom"
                checked={questionTypeFilter === 'written'}
                onChange={() => handleToggleQuestionType('written')}
                className="text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
              />
              <span>Written</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // LEVEL 2: ExamCategory Grid for Selected Subject
  // ==========================================
  if (selectedSubject) {
    return (
      <div className="space-y-4 pb-20 max-w-2xl mx-auto px-1 sm:px-2">
        {/* Header with Back button (Matching Screenshot 2) */}
        <div className="flex items-center gap-3 py-1 px-1">
          <button
            onClick={() => setSelectedSubject(null)}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="বিষয় নির্বাচনে ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-slate-900 dark:text-slate-100 text-lg sm:text-xl tracking-tight">
            {selectedSubject.bangla_name} {selectedSubject.paper}
          </h2>
        </div>

        {/* 5 ExamCategory Cards Grid (Matching Screenshot 2) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CATEGORY_CARDS_CONFIG.map((cat) => {
            const count = categoryCounts[cat.id] ?? 0;

            return (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.id)}
                className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 text-white flex flex-col justify-between h-40 sm:h-44 shadow-sm hover:shadow-md transition-all text-left cursor-pointer active:scale-95 group border border-black/10 bg-gradient-to-br ${cat.gradient}`}
              >
                {/* Top Category Label */}
                <div>
                  <h3 className="font-bold text-base sm:text-lg tracking-tight leading-snug drop-shadow-xs">
                    {cat.label}
                  </h3>
                </div>

                {/* Center / Background Thematic Illustration */}
                <div className="absolute right-2 bottom-2 opacity-30 group-hover:opacity-40 group-hover:scale-110 transition-all pointer-events-none">
                  {cat.icon}
                </div>

                {/* Bottom Pencil Count Badge */}
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 text-xs font-bold font-mono shadow-2xs">
                    <Pencil className="w-3 h-3 text-slate-600 dark:text-slate-400 stroke-[2.5]" />
                    <span>{toBengaliNumber(count)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================
  // LEVEL 1: Question Bank Home (Matching Screenshot 1)
  // ==========================================
  return (
    <div className="space-y-4 pb-20 max-w-2xl mx-auto px-1 sm:px-2">
      {/* 1. Search Bar */}
      <div className="relative">
        <input
          type="text"
          id="input-search-questionbank"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="প্রশ্নব্যাংক খুঁজুন..."
          className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 shadow-2xs placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 sm:top-4" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3 top-2.5 sm:top-3 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Top Segmented Tabs: মডেল টেস্ট / বিষয় ভিত্তিক / প্রতিষ্ঠান ভিত্তিক */}
      <div className="flex items-center justify-between gap-1.5 p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('model_test')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${
            activeTab === 'model_test'
              ? 'bg-[#1E3A8A] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          মডেল টেস্ট
        </button>

        <button
          onClick={() => setActiveTab('subject')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${
            activeTab === 'subject'
              ? 'bg-[#15803D] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          বিষয় ভিত্তিক
        </button>

        <button
          onClick={() => setActiveTab('university')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${
            activeTab === 'university'
              ? 'bg-[#1E3A8A] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          প্রতিষ্ঠান ভিত্তিক
        </button>
      </div>

      {/* 3. Tab Content: বিষয় ভিত্তিক (Subject Cards Grid) */}
      {activeTab === 'subject' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {filteredSubjects.map((sub) => {
            const count = getSubjectTotalCount(sub.id);

            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubject(sub)}
                className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 text-white flex flex-col justify-between h-40 sm:h-44 shadow-sm hover:shadow-md transition-all text-left cursor-pointer active:scale-95 group border border-black/10 bg-gradient-to-br ${sub.gradient}`}
              >
                {/* Top Subject Title */}
                <div>
                  <h3 className="font-bold text-base sm:text-lg tracking-tight leading-snug drop-shadow-xs">
                    {sub.bangla_name}
                  </h3>
                  <span className="text-xs text-white/80 font-medium block mt-0.5">
                    {sub.paper}
                  </span>
                </div>

                {/* Center / Background Art Icon */}
                <div className="absolute right-2 bottom-2 opacity-30 group-hover:opacity-40 group-hover:scale-110 transition-all pointer-events-none">
                  {renderSubjectArt(sub)}
                </div>

                {/* Bottom Pencil Count Badge */}
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 text-xs font-bold font-mono shadow-2xs">
                    <Pencil className="w-3 h-3 text-slate-600 dark:text-slate-400 stroke-[2.5]" />
                    <span>{toBengaliNumber(count)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Tab Content: প্রতিষ্ঠান ভিত্তিক (University Wise) */}
      {activeTab === 'university' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {UNIVERSITIES_DATA.map((uni) => (
            <div
              key={uni.id}
              className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-between hover:border-[#2563EB] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs"
                  style={{ backgroundColor: uni.bgColor }}
                >
                  {uni.shortCode.split(' ')[0]}
                </div>
                <div>
                  <h4 className="font-bold text-[#1E3A8A] dark:text-blue-400 text-sm leading-tight">{uni.name}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{uni.fullName}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedSubject(SUBJECTS_DATA[0]);
                  setSelectedCategory('varsity_a');
                }}
                className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                প্রশ্ন দেখুন
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: মডেল টেস্ট (Model Tests) */}
      {activeTab === 'model_test' && (
        <div className="space-y-2.5">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div>
              <div className="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 text-[10px] font-bold uppercase rounded-md mb-1 border border-blue-200 dark:border-blue-800">
                Live Model Test
              </div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                ঢাকা বিশ্ববিদ্যালয় 'ক' ইউনিট পূর্ণাঙ্গ মডেল টেস্ট - ০১
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">১০০ টি প্রশ্ন • ৯০ মিনিট</p>
            </div>
            <button
              onClick={() => {
                setSelectedSubject(SUBJECTS_DATA[0]);
                setSelectedCategory('varsity_a');
              }}
              className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              অংশগ্রহণ
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div>
              <div className="inline-block px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-[10px] font-bold uppercase rounded-md mb-1 border border-purple-200 dark:border-purple-800">
                BUET Engineering
              </div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                BUET প্রিলিমিনারি ফিজিক্স & ম্যাথ স্পিড টেস্ট
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">৫০ টি প্রশ্ন • ৪৫ মিনিট</p>
            </div>
            <button
              onClick={() => {
                setSelectedSubject(SUBJECTS_DATA[0]);
                setSelectedCategory('engineering');
              }}
              className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              অংশগ্রহণ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBankScreen;

