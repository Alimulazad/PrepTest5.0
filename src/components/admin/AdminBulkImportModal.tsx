import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  FileJson,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  RefreshCw,
  Sliders,
  Database,
  Info,
  Check,
  AlertTriangle,
  PlusCircle,
  HelpCircle,
  Trash2,
  Eye,
  Target,
  Edit3,
  CheckSquare,
  Layers
} from 'lucide-react';
import { QuestionSubject, TopicRecord } from '../../types';
import { SUBJECTS_DATA, CHAPTERS_DATA } from '../../data/admissionData';
import { COMPREHENSIVE_CHAPTERS_DATA } from '../../data/subjectTopicsData';
import MathText from '../MathText';
import {
  ParsedQuestionItem,
  BulkDefaults,
  parseExcelOrCsvFile,
  parseRawBengaliQuestions,
  smartMapTopicByName,
  validateAndEnrichQuestion,
  downloadExcelTemplate,
  downloadCsvTemplate,
  downloadJsonTemplate,
  downloadWrittenQuestionCsvTemplate,
  downloadWrittenQuestionJsonTemplate,
  downloadTopicCsvTemplate,
  downloadTopicJsonTemplate,
  downloadKnowledgeSnippetCsvTemplate,
  downloadKnowledgeSnippetJsonTemplate,
  isCsvFormat
} from '../../utils/bulkQuestionParser';
import { validateStrictJsonFormat } from '../../utils/jsonValidator';
import {
  bulkImportQuestionsApi,
  importQuestionsPreviewApi,
  importQuestionsCommitApi,
  importQuestionsAsyncApi,
  fetchImportJobStatusApi,
  rollbackQuestionsImportApi,
  bulkImportWrittenQuestionsApi,
  bulkImportTopicsApi,
  bulkImportKnowledgeSnippetsApi,
  fetchTopics,
  createTopic,
  checkQuestionsDuplicatesApi
} from '../../services/api';

interface AdminBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export type ImportContentType = 'mcq' | 'written' | 'topic' | 'knowledge_snippet';

export const BASE_SUBJECTS_LIST = [
  { id: 'physics', name: 'পদার্থবিজ্ঞান (Physics)', hasPapers: true },
  { id: 'chemistry', name: 'রসায়ন (Chemistry)', hasPapers: true },
  { id: 'math', name: 'উচ্চতর গণিত (Higher Math)', hasPapers: true },
  { id: 'biology', name: 'জীববিজ্ঞান (Biology)', hasPapers: true },
  { id: 'ict', name: 'তথ্য ও যোগাযোগ প্রযুক্তি (ICT)', hasPapers: false },
  { id: 'bangla', name: 'বাংলা (Bangla)', hasPapers: false },
  { id: 'english', name: 'ইংরেজি (English)', hasPapers: false },
  { id: 'gk', name: 'সাধারণ জ্ঞান (General Knowledge)', hasPapers: false },
];

export function parseSubjectIdToBaseAndPaper(subjectId: QuestionSubject): { base: string; paper: string } {
  if (subjectId.startsWith('physics_')) return { base: 'physics', paper: subjectId.endsWith('2') ? '2nd' : '1st' };
  if (subjectId.startsWith('chemistry_')) return { base: 'chemistry', paper: subjectId.endsWith('2') ? '2nd' : '1st' };
  if (subjectId.startsWith('math_')) return { base: 'math', paper: subjectId.endsWith('2') ? '2nd' : '1st' };
  if (subjectId.startsWith('biology_')) return { base: 'biology', paper: subjectId.endsWith('2') ? '2nd' : '1st' };
  return { base: subjectId, paper: '1st' };
}

export function buildSubjectIdFromBaseAndPaper(base: string, paper: string): QuestionSubject {
  if (base === 'physics') return paper === '2nd' ? 'physics_2' : 'physics_1';
  if (base === 'chemistry') return paper === '2nd' ? 'chemistry_2' : 'chemistry_1';
  if (base === 'math') return paper === '2nd' ? 'math_2' : 'math_1';
  if (base === 'biology') return paper === '2nd' ? 'biology_2' : 'biology_1';
  return base as QuestionSubject;
}

export const AdminBulkImportModal: React.FC<AdminBulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [importType, setImportType] = useState<ImportContentType>('mcq');
  const [activeTab, setActiveTab] = useState<'file' | 'text' | 'templates'>('file');

  // DB Topics list for referential integrity checks
  const [dbTopics, setDbTopics] = useState<Array<{ id: string; name?: string; bangla_name?: string; chapter_id?: string; subject_id?: string }>>([]);
  const [isLoadingDbTopics, setIsLoadingDbTopics] = useState<boolean>(false);

  // Defaults configuration
  const [defaultSubject, setDefaultSubject] = useState<QuestionSubject>('physics_1');
  const [defaultChapter, setDefaultChapter] = useState<string>('phy1_ch1');
  const [defaultDifficulty, setDefaultDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [defaultTagsInput, setDefaultTagsInput] = useState<string>('DU Ka 24-25, Varsity A');

  // Step 4: Cascading Taxonomy Picker States (Subject Base -> Paper -> Chapter -> Topic)
  const [defaultSubjectBase, setDefaultSubjectBase] = useState<string>('physics');
  const [defaultPaper, setDefaultPaper] = useState<string>('1st');
  const [defaultTopicId, setDefaultTopicId] = useState<string>('');

  // Bulk Assigner Cascading State
  const [assignSubjectBase, setAssignSubjectBase] = useState<string>('physics');
  const [assignPaper, setAssignPaper] = useState<string>('1st');
  const [assignChapterId, setAssignChapterId] = useState<string>('phy1_ch1');

  // File Upload State
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Raw Text State
  const [rawBengaliTextInput, setRawBengaliTextInput] = useState<string>('');

  // Parsed Items Pre-flight State
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestionItem[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCreatingMissingTopics, setIsCreatingMissingTopics] = useState<boolean>(false);
  const [autoCreateSuccessMsg, setAutoCreateSuccessMsg] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'warning' | 'invalid' | 'missing_taxonomy' | 'duplicate'>('all');

  // Step 5: Taxonomical Mapping Auto-Resolution State
  const [isResolvingTaxonomy, setIsResolvingTaxonomy] = useState<boolean>(false);
  const [autoCreateMissingTaxonomy, setAutoCreateMissingTaxonomy] = useState<boolean>(true);
  const [resolutionSummary, setResolutionSummary] = useState<{
    totalRows: number;
    fullyResolvedCount: number;
    ambiguousCount: number;
    missingTaxonomyCount: number;
  } | null>(null);

  // Step 6: Duplicate Question Detection Engine & Strategy State
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'overwrite' | 'keep_both'>('skip');
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState<boolean>(false);
  const [duplicateSummary, setDuplicateSummary] = useState<{
    totalDuplicates: number;
    exactCount: number;
    similarCount: number;
    intraBatchCount: number;
  } | null>(null);

  // Committed Batch & Rollback State (Step 2 Implementation)
  const [committedBatch, setCommittedBatch] = useState<{
    batchId?: string;
    count: number;
    chunkCount?: number;
    failedChunksCount?: number;
    message: string;
    committedAt: number;
  } | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackMessage, setRollbackMessage] = useState<string | null>(null);

  // Background Job & Progress Tracking State (Step 3 Implementation)
  const [activeJob, setActiveJob] = useState<{
    jobId: string;
    batchId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    totalRows: number;
    processedRows: number;
    successfulRows: number;
    failedRows: number;
    progress: number;
  } | null>(null);

  // Selected question indices for bulk topic assignment
  const [selectedQuestionIndices, setSelectedQuestionIndices] = useState<number[]>([]);

  // Bulk & Specific Topic Assigner Tool State
  const [assignTargetScope, setAssignTargetScope] = useState<'all' | 'selected' | 'range'>('all');
  const [assignRangeStart, setAssignRangeStart] = useState<number>(1);
  const [assignRangeEnd, setAssignRangeEnd] = useState<number>(10);
  const [assignTopicMode, setAssignTopicMode] = useState<'existing' | 'custom'>('existing');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [customTopicName, setCustomTopicName] = useState<string>('');
  const [customTopicId, setCustomTopicId] = useState<string>('');
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [inlineTopicInput, setInlineTopicInput] = useState<{ topic_id: string; topic_name: string }>({ topic_id: '', topic_name: '' });

  const toggleSelectAll = () => {
    if (selectedQuestionIndices.length === parsedQuestions.length) {
      setSelectedQuestionIndices([]);
    } else {
      setSelectedQuestionIndices(parsedQuestions.map((_, i) => i));
    }
  };

  const toggleSelectRow = (index: number) => {
    if (selectedQuestionIndices.includes(index)) {
      setSelectedQuestionIndices(selectedQuestionIndices.filter((i) => i !== index));
    } else {
      setSelectedQuestionIndices([...selectedQuestionIndices, index]);
    }
  };

  const handleApplyTopicToQuestions = async () => {
    let targetTopicId = '';
    let targetTopicName = '';

    const targetSubId = buildSubjectIdFromBaseAndPaper(assignSubjectBase, assignPaper);
    const targetChapId = assignChapterId;
    const selectedChapObj = CHAPTERS_DATA.find((c) => c.id === targetChapId);
    const selectedSubObj = SUBJECTS_DATA.find((s) => s.id === targetSubId);

    if (assignTopicMode === 'existing') {
      if (!selectedTopicId) {
        alert('অনুগ্রহ করে একটি টপিক নির্বাচন করুন!');
        return;
      }
      const availableTops = getTopicsForChapter(assignChapterId);
      const found = availableTops.find((t) => t.id === selectedTopicId) || dbTopics.find((t) => t.id === selectedTopicId);
      targetTopicId = selectedTopicId;
      targetTopicName = found ? found.bangla_name || found.name || found.id : selectedTopicId;
    } else {
      if (!customTopicName.trim()) {
        alert('অনুগ্রহ করে কাস্টম টপিকের নাম লিখুন!');
        return;
      }
      targetTopicName = customTopicName.trim();
      targetTopicId = customTopicId.trim() || `top_${targetChapId}_${Date.now().toString(36)}`;

      // Persist to topics table immediately via API
      try {
        const created = await createTopic({
          id: targetTopicId,
          chapter_id: targetChapId,
          subject_id: targetSubId,
          name: targetTopicName,
          bangla_name: targetTopicName,
          star_rating: 3,
        });
        if (created) {
          targetTopicId = created.id;
          setDbTopics((prev) => (prev.some((t) => t.id === created.id) ? prev : [...prev, created]));
        }
      } catch (err: any) {
        console.warn('Custom topic creation notice:', err.message);
      }
    }

    // Determine target question indices
    let targetIndices: number[] = [];
    if (assignTargetScope === 'all') {
      targetIndices = parsedQuestions.map((_, i) => i);
    } else if (assignTargetScope === 'selected') {
      if (selectedQuestionIndices.length === 0) {
        alert('কোনো প্রশ্ন সিলেক্ট করা হয়নি! অনুগ্রহ করে টেবিল থেকে প্রশ্ন সিলেক্ট করুন।');
        return;
      }
      targetIndices = [...selectedQuestionIndices];
    } else if (assignTargetScope === 'range') {
      const start = Math.max(1, assignRangeStart) - 1;
      const end = Math.min(parsedQuestions.length, assignRangeEnd);
      for (let i = start; i < end; i++) {
        targetIndices.push(i);
      }
    }

    if (targetIndices.length === 0) return;

    const updated = parsedQuestions.map((q, idx) => {
      if (targetIndices.includes(idx)) {
        return {
          ...q,
          subject_id: targetSubId,
          subject_name: selectedSubObj?.name || q.subject_name,
          chapter_id: targetChapId,
          chapter_name: selectedChapObj?.name || q.chapter_name,
          topic_id: targetTopicId,
          topic_name: targetTopicName,
          status: (q.status === 'invalid' && (!q.question_text || !q.options) ? 'invalid' : 'valid') as 'valid' | 'warning' | 'invalid',
          isValid: true,
          smartMappedNote: `🎯 ট্যাক্সোনমি ও টপিক সেট করা হয়েছে: ${targetTopicName} (${targetTopicId})`,
        };
      }
      return q;
    });

    setParsedQuestions(revalidateParsedItems(updated));
    setAutoCreateSuccessMsg(`সফলভাবে ${targetIndices.length} টি প্রশ্নে '${targetTopicName}' [ID: ${targetTopicId}] টপিক সেট ও সেভ করা হয়েছে!`);
    setTimeout(() => setAutoCreateSuccessMsg(null), 4000);
  };

  // Load existing topics from Database on mount/open
  useEffect(() => {
    if (isOpen) {
      loadDbTopics();
    }
  }, [isOpen]);

  const loadDbTopics = async () => {
    setIsLoadingDbTopics(true);
    try {
      const res = await fetchTopics();
      if (Array.isArray(res)) {
        // Merge DB topics with static topics list for high coverage
        const staticList: Array<TopicRecord> = [];
        COMPREHENSIVE_CHAPTERS_DATA.forEach((ch) => {
          if (ch.subtopics) {
            ch.subtopics.forEach((st) => {
              staticList.push({
                id: st.id,
                name: st.name || st.bangla_name || st.id,
                bangla_name: st.bangla_name || st.name || st.id,
                chapter_id: ch.id,
                subject_id: ch.subject_id,
                total_questions: st.total_questions || 0,
                completed_questions: st.completed_questions || 0,
              });
            });
          }
        });
        
        const combined = [...res];
        for (const st of staticList) {
          if (!combined.some((c) => c.id === st.id)) {
            combined.push(st);
          }
        }
        setDbTopics(combined);
      }
    } catch (err) {
      console.warn('Could not fetch DB topics for referential check:', err);
    } finally {
      setIsLoadingDbTopics(false);
    }
  };

  // Available chapters for selected default subject
  const availableChapters = useMemo(() => {
    return CHAPTERS_DATA.filter((ch) => ch.subject_id === defaultSubject);
  }, [defaultSubject]);

  // Step 4: Get topics for any specific chapter (combines DB topics and static subtopics)
  const getTopicsForChapter = useMemo(() => {
    return (chapterId: string) => {
      if (!chapterId) return [];
      const topicsMap = new Map<string, { id: string; name: string; bangla_name: string; topic_code?: string }>();

      // 1. From DB topics
      dbTopics.forEach((t) => {
        if (t.chapter_id === chapterId) {
          topicsMap.set(t.id, {
            id: t.id,
            name: t.name || t.bangla_name || t.id,
            bangla_name: t.bangla_name || t.name || t.id,
          });
        }
      });

      // 2. From static COMPREHENSIVE_CHAPTERS_DATA
      const ch = COMPREHENSIVE_CHAPTERS_DATA.find((c) => c.id === chapterId);
      if (ch && ch.subtopics) {
        ch.subtopics.forEach((st) => {
          if (!topicsMap.has(st.id)) {
            topicsMap.set(st.id, {
              id: st.id,
              name: st.name || st.bangla_name || st.id,
              bangla_name: st.bangla_name || st.name || st.id,
              topic_code: st.topic_code,
            });
          }
        });
      }

      return Array.from(topicsMap.values());
    };
  }, [dbTopics]);

  // Global Defaults Cascading Handlers
  const handleDefaultSubjectBaseChange = (base: string) => {
    setDefaultSubjectBase(base);
    const paper = base === 'physics' || base === 'chemistry' || base === 'math' || base === 'biology' ? defaultPaper : '1st';
    const newSubId = buildSubjectIdFromBaseAndPaper(base, paper);
    setDefaultSubject(newSubId);

    const chaps = CHAPTERS_DATA.filter((ch) => ch.subject_id === newSubId);
    if (chaps.length > 0) {
      setDefaultChapter(chaps[0].id);
      const topList = getTopicsForChapter(chaps[0].id);
      setDefaultTopicId(topList.length > 0 ? topList[0].id : '');
    } else {
      setDefaultChapter('');
      setDefaultTopicId('');
    }
  };

  const handleDefaultPaperChange = (paper: string) => {
    setDefaultPaper(paper);
    const newSubId = buildSubjectIdFromBaseAndPaper(defaultSubjectBase, paper);
    setDefaultSubject(newSubId);

    const chaps = CHAPTERS_DATA.filter((ch) => ch.subject_id === newSubId);
    if (chaps.length > 0) {
      setDefaultChapter(chaps[0].id);
      const topList = getTopicsForChapter(chaps[0].id);
      setDefaultTopicId(topList.length > 0 ? topList[0].id : '');
    } else {
      setDefaultChapter('');
      setDefaultTopicId('');
    }
  };

  const handleDefaultChapterChange = (chapterId: string) => {
    setDefaultChapter(chapterId);
    const topList = getTopicsForChapter(chapterId);
    setDefaultTopicId(topList.length > 0 ? topList[0].id : '');
  };

  // Bulk Assigner Cascading Handlers
  const handleAssignSubjectBaseChange = (base: string) => {
    setAssignSubjectBase(base);
    const paper = base === 'physics' || base === 'chemistry' || base === 'math' || base === 'biology' ? assignPaper : '1st';
    const newSubId = buildSubjectIdFromBaseAndPaper(base, paper);
    const chaps = CHAPTERS_DATA.filter((ch) => ch.subject_id === newSubId);
    if (chaps.length > 0) {
      setAssignChapterId(chaps[0].id);
      const topList = getTopicsForChapter(chaps[0].id);
      setSelectedTopicId(topList.length > 0 ? topList[0].id : '');
    } else {
      setAssignChapterId('');
      setSelectedTopicId('');
    }
  };

  const handleAssignPaperChange = (paper: string) => {
    setAssignPaper(paper);
    const newSubId = buildSubjectIdFromBaseAndPaper(assignSubjectBase, paper);
    const chaps = CHAPTERS_DATA.filter((ch) => ch.subject_id === newSubId);
    if (chaps.length > 0) {
      setAssignChapterId(chaps[0].id);
      const topList = getTopicsForChapter(chaps[0].id);
      setSelectedTopicId(topList.length > 0 ? topList[0].id : '');
    } else {
      setAssignChapterId('');
      setSelectedTopicId('');
    }
  };

  const handleAssignChapterChange = (chapterId: string) => {
    setAssignChapterId(chapterId);
    const topList = getTopicsForChapter(chapterId);
    setSelectedTopicId(topList.length > 0 ? topList[0].id : '');
  };

  const handleSubjectChange = (subjectId: QuestionSubject) => {
    setDefaultSubject(subjectId);
    const parsed = parseSubjectIdToBaseAndPaper(subjectId);
    setDefaultSubjectBase(parsed.base);
    setDefaultPaper(parsed.paper);
    const firstChap = CHAPTERS_DATA.find((ch) => ch.subject_id === subjectId);
    if (firstChap) {
      setDefaultChapter(firstChap.id);
      const topList = getTopicsForChapter(firstChap.id);
      setDefaultTopicId(topList.length > 0 ? topList[0].id : '');
    }
  };

  const getBulkDefaults = (): BulkDefaults => {
    const selectedChapObj = CHAPTERS_DATA.find((c) => c.id === defaultChapter);
    const selectedSubObj = SUBJECTS_DATA.find((s) => s.id === defaultSubject);
    const tagsArr = defaultTagsInput.split(/[,;]+/).map((t) => t.trim()).filter(Boolean);

    let topicName: string | undefined = undefined;
    if (defaultTopicId) {
      const availableTops = getTopicsForChapter(defaultChapter);
      const foundTop = availableTops.find((t) => t.id === defaultTopicId);
      if (foundTop) {
        topicName = foundTop.bangla_name || foundTop.name;
      }
    }

    return {
      subject_id: defaultSubject,
      subject_name: selectedSubObj?.name || 'Physics 1st Paper',
      paper: defaultSubject.endsWith('_2') ? '2nd' : '1st',
      chapter_id: defaultChapter,
      chapter_name: selectedChapObj?.name || 'সাধারণ অধ্যায়',
      topic_id: defaultTopicId || undefined,
      topic_name: topicName,
      tags: tagsArr.length > 0 ? tagsArr : ['Varsity Ka'],
      difficulty: defaultDifficulty,
    };
  };

  // Helper to re-validate and enrich all parsed items with current dbTopics list
  const revalidateParsedItems = (items: ParsedQuestionItem[], topicsList = dbTopics) => {
    const defaults = getBulkDefaults();

    return items.map((q, idx) => {
      // Referential check & Smart Mapping for topic_id
      const topicIdInput = q.topic_id?.trim();
      const topicNameInput = q.topic_name?.trim() || q.name?.trim();

      const mapRes = smartMapTopicByName(
        topicIdInput,
        topicNameInput,
        q.chapter_id || defaults.chapter_id,
        q.subject_id || defaults.subject_id,
        topicsList
      );

      const finalTopicId = mapRes.matchedTopicId || topicIdInput || '';
      const finalTopicName = mapRes.matchedTopicName || topicNameInput || finalTopicId;

      const issues = [...(q.validationIssues || [])];
      const warnings: string[] = [];

      let smartMappedNote = mapRes.smartMappedNote || q.smartMappedNote;
      if (mapRes.isChapterMismatch && mapRes.mismatchNote) {
        warnings.push(mapRes.mismatchNote);
      } else if (mapRes.isInvalidId && topicIdInput) {
        smartMappedNote = `⚡ কাস্টম/অনুপস্থিত টপিক ID '${topicIdInput}' (ইমপোর্টের সময় স্বয়ংক্রিয়ভাবে তৈরি হবে)`;
      }

      // Flag rows missing a topic as warning ("⚠️ Needs Topic")
      if (!finalTopicId) {
        warnings.push('⚠️ Needs Topic (টপিক অপরিবর্তিত/অনুপস্থিত)');
      }

      let status: 'valid' | 'warning' | 'invalid' = 'valid';
      if (issues.length > 0) {
        status = 'invalid';
      } else if (warnings.length > 0) {
        status = 'warning';
      }

      return {
        ...q,
        topic_id: finalTopicId,
        topic_name: finalTopicName,
        status: status,
        isValid: status !== 'invalid',
        isWarning: status === 'warning',
        warningIssues: warnings,
        smartMapped: mapRes.smartMapped,
        smartMappedNote: smartMappedNote || undefined,
      };
    });
  };

  // Detect missing topic IDs in current parsed list
  const missingTopicIds = useMemo(() => {
    const missing: Array<{ topic_id: string; topic_name: string; chapter_id: string; subject_id: string }> = [];
    
    parsedQuestions.forEach((q) => {
      if (q.warningIssues && q.warningIssues.length > 0) {
        const idMatch = q.warningIssues[0]?.match(/Topic ID '([^']+)'/);
        const originalId = idMatch ? idMatch[1] : q.topic_id;
        if (originalId && !missing.some((m) => m.topic_id === originalId)) {
          missing.push({
            topic_id: originalId,
            topic_name: q.topic_name || originalId,
            chapter_id: q.chapter_id || defaultChapter,
            subject_id: q.subject_id || defaultSubject,
          });
        }
      }
    });

    return missing;
  }, [parsedQuestions, defaultChapter, defaultSubject]);

  // Step 5: Auto-Resolve Taxonomy via Backend Fuzzy & Canonical Engine
  const handleAutoResolveTaxonomy = async () => {
    if (parsedQuestions.length === 0) return;

    setIsResolvingTaxonomy(true);
    setSubmitError(null);

    try {
      const previewRes = await importQuestionsPreviewApi({
        questions: parsedQuestions,
        defaults: {
          subject_id: defaultSubject,
          chapter_id: defaultChapter,
          paper: defaultPaper as '1st' | '2nd',
        },
      });

      if (previewRes && previewRes.summary) {
        setResolutionSummary({
          totalRows: previewRes.summary.totalRows,
          fullyResolvedCount: previewRes.summary.fullyResolvedCount,
          ambiguousCount: previewRes.summary.ambiguousCount,
          missingTaxonomyCount: previewRes.summary.missingTaxonomyCount,
        });

        // Map resolved taxonomy details back onto parsedQuestions
        const updated = parsedQuestions.map((q, idx) => {
          const fully = previewRes.fullyResolvedRows?.find((r: any) => r.rowIndex === idx);
          const ambig = previewRes.ambiguousRows?.find((r: any) => r.rowIndex === idx);
          const missing = previewRes.missingTaxonomyRows?.find((r: any) => r.rowIndex === idx);

          if (fully) {
            const resTax = fully.resolvedTaxonomy;
            return {
              ...q,
              subject_id: resTax.subject_id || q.subject_id,
              subject_name: resTax.subject_name || q.subject_name,
              paper: resTax.paper || q.paper,
              chapter_id: resTax.chapter_id || q.chapter_id,
              chapter_name: resTax.chapter_name || q.chapter_name,
              topic_id: resTax.topic_id || q.topic_id,
              topic_name: resTax.topic_name || q.topic_name,
              status: 'valid' as const,
              isValid: true,
              isWarning: false,
              smartMapped: true,
              smartMappedNote: `🎯 অটো-ম্যাপড: ${resTax.chapter_name}${resTax.topic_name ? ' → ' + resTax.topic_name : ''}`,
            };
          }

          if (ambig) {
            const sug = ambig.suggestedResolved;
            return {
              ...q,
              subject_id: sug?.subject_id || q.subject_id,
              chapter_id: sug?.chapter_id || q.chapter_id,
              topic_id: sug?.topic_id || q.topic_id,
              topic_name: sug?.topic_name || q.topic_name,
              status: 'warning' as const,
              isValid: true,
              isWarning: true,
              smartMappedNote: `⚠️ দ্ব্যর্থবোধক: ${ambig.reason}`,
            };
          }

          if (missing) {
            const defs = missing.suggestedDefaults;
            return {
              ...q,
              subject_id: defs?.subject_id || q.subject_id,
              chapter_id: defs?.chapter_id || q.chapter_id,
              topic_id: defs?.suggested_topic_id || q.topic_id,
              topic_name: defs?.suggested_topic_name || q.topic_name,
              status: 'warning' as const,
              isValid: true,
              isWarning: true,
              smartMappedNote: `⚠️ অনুপস্থিত: ${missing.reason}`,
            };
          }

          return q;
        });

        // Step 6: Process duplicate check from preview response if present
        if (previewRes.duplicateCheck) {
          const dupRes = previewRes.duplicateCheck;
          setDuplicateSummary({
            totalDuplicates: dupRes.duplicateCount,
            exactCount: dupRes.exactDuplicates.length,
            similarCount: dupRes.similarDuplicates.length,
            intraBatchCount: dupRes.intraBatchDuplicates.length,
          });

          const exactMap = new Map(dupRes.exactDuplicates.map((d: any) => [d.rowIndex, d]));
          const similarMap = new Map(dupRes.similarDuplicates.map((d: any) => [d.rowIndex, d]));
          const intraMap = new Map(dupRes.intraBatchDuplicates.map((d: any) => [d.rowIndex, d]));

          const updatedWithDups = updated.map((q, idx) => {
            const exact = exactMap.get(idx);
            const similar = similarMap.get(idx);
            const intra = intraMap.get(idx);

            if (exact || similar || intra) {
              const dupInfo = exact || similar || intra;
              const note = exact
                ? `⚠️ ডুপ্লিকেট প্রশ্ন (#${dupInfo.matchedQuestionId} - 100% Match)`
                : similar
                ? `⚠️ সমজাতীয় প্রশ্ন (#${dupInfo.matchedQuestionId} - ${Math.round(dupInfo.similarity * 100)}% Match)`
                : `⚠️ ফাইলে ২ বার পাওয়া গেছে (#${dupInfo.matchedQuestionId})`;

              return {
                ...q,
                isDuplicate: true,
                duplicateId: dupInfo.matchedQuestionId,
                duplicateSimilarity: dupInfo.similarity,
                duplicateMatchType: dupInfo.matchType,
                status: q.status === 'invalid' ? ('invalid' as const) : ('warning' as const),
                isWarning: true,
                smartMappedNote: q.smartMappedNote ? `${q.smartMappedNote} | ${note}` : note,
              };
            }
            return q;
          });

          setParsedQuestions(updatedWithDups);
        } else {
          setParsedQuestions(updated);
        }
      }
    } catch (err: any) {
      console.error('Taxonomy resolution error:', err);
      setSubmitError(`ট্যাক্সোনমি রেজোলিউশন ব্যর্থ: ${err.message || 'অজানা সমস্যা'}`);
    } finally {
      setIsResolvingTaxonomy(false);
    }
  };

  // Step 6: Dedicated Manual Duplicate Check Trigger
  const handleCheckDuplicates = async () => {
    if (parsedQuestions.length === 0) return;

    setIsCheckingDuplicates(true);
    setSubmitError(null);

    try {
      const res = await checkQuestionsDuplicatesApi({ questions: parsedQuestions });
      if (res && res.success) {
        setDuplicateSummary({
          totalDuplicates: res.duplicateCount,
          exactCount: res.exactDuplicates.length,
          similarCount: res.similarDuplicates.length,
          intraBatchCount: res.intraBatchDuplicates.length,
        });

        const exactMap = new Map(res.exactDuplicates.map((d: any) => [d.rowIndex, d]));
        const similarMap = new Map(res.similarDuplicates.map((d: any) => [d.rowIndex, d]));
        const intraMap = new Map(res.intraBatchDuplicates.map((d: any) => [d.rowIndex, d]));

        const updated = parsedQuestions.map((q, idx) => {
          const exact = exactMap.get(idx);
          const similar = similarMap.get(idx);
          const intra = intraMap.get(idx);

          if (exact || similar || intra) {
            const dupInfo = exact || similar || intra;
            const note = exact
              ? `⚠️ ডুপ্লিকেট প্রশ্ন (#${dupInfo.matchedQuestionId} - 100% Match)`
              : similar
              ? `⚠️ সমজাতীয় প্রশ্ন (#${dupInfo.matchedQuestionId} - ${Math.round(dupInfo.similarity * 100)}% Match)`
              : `⚠️ ফাইলে ২ বার পাওয়া গেছে (#${dupInfo.matchedQuestionId})`;

            return {
              ...q,
              isDuplicate: true,
              duplicateId: dupInfo.matchedQuestionId,
              duplicateSimilarity: dupInfo.similarity,
              duplicateMatchType: dupInfo.matchType,
              status: q.status === 'invalid' ? ('invalid' as const) : ('warning' as const),
              isWarning: true,
              smartMappedNote: q.smartMappedNote ? `${q.smartMappedNote} | ${note}` : note,
            };
          }
          return q;
        });

        setParsedQuestions(updated);
      }
    } catch (err: any) {
      console.error('Duplicate detection error:', err);
      setSubmitError(`ডুপ্লিকেট চেক ব্যর্থ: ${err.message || 'অজানা সমস্যা'}`);
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  // Handle Auto-creating missing topics in Database
  const handleAutoCreateMissingTopics = async () => {
    if (missingTopicIds.length === 0) return;

    setIsCreatingMissingTopics(true);
    setSubmitError(null);
    setAutoCreateSuccessMsg(null);

    try {
      let createdCount = 0;
      const newTopics: Array<TopicRecord> = [];

      for (const item of missingTopicIds) {
        const res = await createTopic({
          id: item.topic_id,
          name: item.topic_name || item.topic_id,
          bangla_name: item.topic_name || item.topic_id,
          chapter_id: item.chapter_id,
          subject_id: item.subject_id as QuestionSubject,
          paper: item.subject_id.endsWith('_2') ? '2nd' : '1st',
          star_rating: 3,
          total_questions: 0,
          completed_questions: 0,
        });

        if (res && res.id) {
          createdCount++;
          newTopics.push(res);
        }
      }

      const updatedDbTopics = [...dbTopics, ...newTopics];
      setDbTopics(updatedDbTopics);

      // Re-validate parsed questions with updated topics
      setParsedQuestions((prev) => revalidateParsedItems(prev, updatedDbTopics));
      setAutoCreateSuccessMsg(`✅ সফলভাবে ${createdCount} টি নতুন টপিক ডাটাবেজে তৈরি করা হয়েছে! ইমপোর্ট প্রিভিউ রিফ্রেশ করা হলো।`);
    } catch (err: any) {
      setSubmitError(`টপিক তৈরিতে ত্রুটি: ${err.message || 'সমস্যা হয়েছে'}`);
    } finally {
      setIsCreatingMissingTopics(false);
    }
  };

  // 1. Handle File Selection (Excel .xlsx, .xls, .csv, or .json)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsProcessingFile(true);
    setParseErrors([]);
    setSubmitError(null);
    setAutoCreateSuccessMsg(null);

    const defaults = getBulkDefaults();

    try {
      const fileNameLower = file.name.toLowerCase();
      if (fileNameLower.endsWith('.json')) {
        // Handle JSON file
        const text = await file.text();
        const jsonValidation = validateStrictJsonFormat(text);
        if (!jsonValidation.valid) {
          setParseErrors(jsonValidation.errors.map((e) => `${e.path}: ${e.message}`));
          setIsProcessingFile(false);
          return;
        }

        let rawList: any[] = [];
        const parsed = jsonValidation.parsedData;
        if (Array.isArray(parsed)) {
          rawList = parsed;
        } else if (parsed && Array.isArray(parsed.items)) {
          rawList = parsed.items;
        } else if (parsed && Array.isArray(parsed.questions)) {
          rawList = parsed.questions;
        } else if (parsed && Array.isArray(parsed.data)) {
          rawList = parsed.data;
        }

        const enriched: ParsedQuestionItem[] = rawList.map((item, idx) => {
          if (importType === 'mcq') {
            const opts = item.options || {};
            let optA = typeof opts === 'object' && !Array.isArray(opts) ? (opts.A || opts.a || opts['ক'] || item.option_a || '') : '';
            let optB = typeof opts === 'object' && !Array.isArray(opts) ? (opts.B || opts.b || opts['খ'] || item.option_b || '') : '';
            let optC = typeof opts === 'object' && !Array.isArray(opts) ? (opts.C || opts.c || opts['গ'] || item.option_c || '') : '';
            let optD = typeof opts === 'object' && !Array.isArray(opts) ? (opts.D || opts.d || opts['ঘ'] || item.option_d || '') : '';

            const qText = item.question_text || item.questionText || item.question || '';
            const correctAns = item.correct_ans || item.correctAnswer || item.ans || 'A';
            const expl = item.explanation || item.solution || '';

            return validateAndEnrichQuestion(
              {
                id: item.id || `q_json_${idx}_${Date.now()}`,
                question_text: qText,
                options: { A: optA, B: optB, C: optC, D: optD },
                correct_ans: correctAns,
                explanation: expl,
                subject_id: item.subject_id || defaults.subject_id,
                subject_name: item.subject_name || defaults.subject_name,
                paper: item.paper || defaults.paper,
                chapter_id: item.chapter_id || defaults.chapter_id,
                chapter_name: item.chapter_name || defaults.chapter_name,
                topic_id: item.topic_id || '',
                topic_name: item.topic_name || '',
                tags: Array.isArray(item.tags) ? item.tags : defaults.tags,
                difficulty: item.difficulty || defaults.difficulty,
                star_rating: item.star_rating || 3,
                type: 'mcq',
              },
              idx,
              defaults,
              dbTopics
            );
          } else if (importType === 'written') {
            const qText = item.question_text || item.question || '';
            const ansText = item.answer_text || item.answer || item.solution || '';
            const issues: string[] = [];
            if (!qText.trim()) issues.push('লিখিত প্রশ্নের বিবরণ অনুপস্থিত');
            if (!ansText.trim()) issues.push('লিখিত প্রশ্নের উত্তর/সমাধান অনুপস্থিত');

            return {
              id: item.id || `written_${idx}_${Date.now()}`,
              item_type: 'written',
              question_text: qText,
              answer_text: ansText,
              marks: Number(item.marks) || 5,
              subject_id: item.subject_id || defaults.subject_id,
              subject_name: item.subject_name || defaults.subject_name,
              paper: item.paper || defaults.paper,
              chapter_id: item.chapter_id || defaults.chapter_id,
              chapter_name: item.chapter_name || defaults.chapter_name,
              topic_id: item.topic_id || '',
              topic_name: item.topic_name || '',
              tags: Array.isArray(item.tags) ? item.tags : defaults.tags,
              difficulty: item.difficulty || defaults.difficulty,
              status: issues.length > 0 ? 'invalid' : 'valid',
              isValid: issues.length === 0,
              validationIssues: issues,
              rawSourceIndex: idx + 1,
            };
          } else if (importType === 'topic') {
            const topicId = item.id || item.topic_id || '';
            const name = item.name || item.bangla_name || item.topic_name || '';
            const issues: string[] = [];
            if (!topicId.trim()) issues.push('টপিক আইডি (Topic ID) অনুপস্থিত');
            if (!name.trim()) issues.push('টপিকের নাম (Topic Name) অনুপস্থিত');

            return {
              id: topicId,
              item_type: 'topic',
              topic_code: item.topic_code || topicId,
              name: name,
              bangla_name: item.bangla_name || name,
              subject_id: item.subject_id || defaults.subject_id,
              subject_name: item.subject_name || defaults.subject_name,
              paper: item.paper || defaults.paper,
              chapter_id: item.chapter_id || defaults.chapter_id,
              chapter_name: item.chapter_name || defaults.chapter_name,
              star_rating: item.star_rating || 3,
              status: issues.length > 0 ? 'invalid' : 'valid',
              isValid: issues.length === 0,
              validationIssues: issues,
              rawSourceIndex: idx + 1,
            };
          } else {
            // knowledge_snippet
            const title = item.title || item.name || '';
            const content = item.content || item.description || '';
            const issues: string[] = [];
            if (!title.trim()) issues.push('স্নিপেট শিরোনাম (Title) অনুপস্থিত');
            if (!content.trim()) issues.push('স্নিপেট কনটেন্ট (Content) অনুপস্থিত');

            return {
              id: item.id || `ks_${idx}_${Date.now()}`,
              item_type: 'knowledge_snippet',
              title: title,
              content: content,
              importance: item.importance || 'high',
              subject_id: item.subject_id || defaults.subject_id,
              subject_name: item.subject_name || defaults.subject_name,
              paper: item.paper || defaults.paper,
              chapter_id: item.chapter_id || defaults.chapter_id,
              chapter_name: item.chapter_name || defaults.chapter_name,
              topic_id: item.topic_id || '',
              topic_name: item.topic_name || '',
              star_rating: item.star_rating || 3,
              tags: Array.isArray(item.tags) ? item.tags : defaults.tags,
              status: issues.length > 0 ? 'invalid' : 'valid',
              isValid: issues.length === 0,
              validationIssues: issues,
              rawSourceIndex: idx + 1,
            };
          }
        });

        setParsedQuestions(revalidateParsedItems(enriched));
      } else {
        // Handle Excel (.xlsx, .xls) or CSV
        const result = await parseExcelOrCsvFile(file, defaults, importType);
        if (!result.success && result.errors.length > 0) {
          setParseErrors(result.errors);
        } else {
          setParsedQuestions(revalidateParsedItems(result.questions));
        }
      }
    } catch (err: any) {
      setParseErrors([`ফাইল পড়তে ত্রুটি: ${err.message || 'অজানা সমস্যা'}`]);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 2. Handle Bengali Raw Text (or CSV Text) Parsing
  const handleParseRawText = async () => {
    if (!rawBengaliTextInput.trim()) {
      setParseErrors(['অনুগ্রহ করে টেক্সট বক্সে প্রশ্নাবলী বা CSV ডেটা পেস্ট করুন।']);
      return;
    }

    setParseErrors([]);
    setSubmitError(null);
    setAutoCreateSuccessMsg(null);

    const defaults = getBulkDefaults();

    if (isCsvFormat(rawBengaliTextInput)) {
      setIsProcessingFile(true);
      try {
        const result = await parseExcelOrCsvFile(rawBengaliTextInput, defaults, importType);
        if (!result.success || result.questions.length === 0) {
          setParseErrors(result.errors.length ? result.errors : ['কোনো CSV প্রশ্ন শনাক্ত করা যায়নি। সঠিক কলামের নাম ও ডাটা দিন।']);
        } else {
          setParsedQuestions(revalidateParsedItems(result.questions));
        }
      } catch (err: any) {
        setParseErrors([`CSV পার্সিং ত্রুটি: ${err.message || 'অজানা সমস্যা'}`]);
      } finally {
        setIsProcessingFile(false);
      }
    } else {
      if (importType === 'written') {
        setParseErrors(['লিখিত (Written) প্রশ্নের জন্য শুধুমাত্র CSV ফরম্যাটের টেক্সট পেস্ট করা যাবে। অনুগ্রহ করে প্রথম লাইনে কলামের নামসহ CSV পেস্ট করুন।']);
        return;
      }
      const result = parseRawBengaliQuestions(rawBengaliTextInput, defaults);

      if (!result.success || result.questions.length === 0) {
        setParseErrors(result.errors.length ? result.errors : ['কোনো প্রশ্ন শনাক্ত করা যায়নি। সঠিক ফরম্যাটে প্রশ্ন দিন।']);
      } else {
        setParsedQuestions(revalidateParsedItems(result.questions));
      }
    }
  };

  const handleLoadSampleBengaliText = () => {
    const sample = `১. একটি প্রক্ষেপকের সর্বাধিক পাল্লা R_max এবং সর্বাধিক উচ্চতা H এর মধ্যে সম্পর্ক কোনটি?
(ক) R_max = 4H
(খ) R_max = 2H
(গ) R_max = H/4
(ঘ) R_max = H/2
উত্তর: ক
ব্যাখ্যা: সর্বাধিক পাল্লা $R_{max} = \\frac{v_0^2}{g}$ এবং উচ্চতা $H = \\frac{v_0^2}{4g}$। অতএব, $R_{max} = 4H$।

২. নিচের কোনটিতে সবচেয়ে শক্তিশালী হাইড্রোজেন বন্ধন বিদ্যমান?
(ক) H2O
(খ) HF
(গ) NH3
(ঘ) CH3OH
উ: খ
ব্যাখ্যা: ফ্লোরিনের উচ্চ তড়িৎ-ঋণাত্মকতার কারণে HF-এ সবচেয়ে শক্তিশালী হাইড্রোজেন বন্ধন থাকে।

৩. lim_{x->0} (sin 5x) / ln(1 + 2x) এর মান কত?
(A) 5/2
(B) 2/5
(C) 5
(D) 0
Ans: A
ব্যাখ্যা: L'Hospital নিয়ম ব্যবহার করে মান পাওয়া যায় 5/2।`;

    setRawBengaliTextInput(sample);
  };

  // Delete a single item from the pre-flight list
  const handleDeleteParsedItem = (index: number) => {
    setParsedQuestions((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Apply default subject/chapter across all currently parsed items
  const handleApplyDefaultsToAll = () => {
    const defaults = getBulkDefaults();
    setParsedQuestions((prev) =>
      revalidateParsedItems(
        prev.map((q) => ({
          ...q,
          subject_id: defaults.subject_id,
          subject_name: defaults.subject_name,
          paper: defaults.paper,
          chapter_id: defaults.chapter_id,
          chapter_name: defaults.chapter_name,
          tags: defaults.tags,
          difficulty: defaults.difficulty,
        }))
      )
    );
  };

  // Filtered preview items
  const filteredPreview = useMemo(() => {
    if (previewFilter === 'valid') return parsedQuestions.filter((q) => q.status === 'valid');
    if (previewFilter === 'warning') return parsedQuestions.filter((q) => q.status === 'warning');
    if (previewFilter === 'invalid') return parsedQuestions.filter((q) => q.status === 'invalid');
    if (previewFilter === 'missing_taxonomy') {
      return parsedQuestions.filter((q) => !q.topic_id || !q.chapter_id || q.status === 'warning');
    }
    return parsedQuestions;
  }, [parsedQuestions, previewFilter]);

  const validCount = parsedQuestions.filter((q) => q.status === 'valid').length;
  const warningCount = parsedQuestions.filter((q) => q.status === 'warning').length;
  const invalidCount = parsedQuestions.filter((q) => q.status === 'invalid').length;
  const missingTaxonomyCount = parsedQuestions.filter((q) => !q.topic_id || !q.chapter_id || q.status === 'warning').length;
  const uploadableCount = validCount + warningCount;

  // 3. Final Submit to Backend Database based on Import Content Type
  const handleFinalSubmit = async () => {
    if (parsedQuestions.length === 0) return;

    // Filter items that are valid or warnings (warnings get saved with topic_id=NULL or fallback)
    const itemsToUpload = parsedQuestions.filter((q) => q.isValid || q.status === 'warning');

    if (itemsToUpload.length === 0) {
      setSubmitError('কোনো ভ্যালিড আইটেম পাওয়া যায়নি। অনুগ্রহ করে লাল চিহ্নিত সমস্যাযুক্ত তথ্য সংশোধন বা ডিলিট করুন।');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setRollbackMessage(null);

    try {
      if (importType === 'mcq') {
        const formatted = itemsToUpload.map((q) => ({
          subject_id: q.subject_id,
          subject_name: q.subject_name,
          paper: q.paper,
          chapter_id: q.chapter_id,
          chapter_name: q.chapter_name,
          topic_id: q.topic_id || undefined,
          topic_name: q.topic_name,
          category: q.category || 'varsity_a',
          question_text: q.question_text || '',
          options: q.options || { A: '', B: '', C: '', D: '' },
          correct_ans: q.correct_ans || 'A',
          explanation: q.explanation || '',
          tags: q.tags || [],
          difficulty: q.difficulty || 'medium',
          star_rating: q.star_rating || 3,
          type: q.type || 'mcq',
        }));

        const createTaxonomyPayload: any[] = [];
        if (autoCreateMissingTaxonomy) {
          const knownTopicIds = new Set(dbTopics.map((t) => t.id));
          const createdKeys = new Set<string>();

          itemsToUpload.forEach((q) => {
            if (q.topic_id && !knownTopicIds.has(q.topic_id) && !createdKeys.has(q.topic_id)) {
              createdKeys.add(q.topic_id);
              createTaxonomyPayload.push({
                type: 'topic',
                id: q.topic_id,
                name: q.topic_name || q.topic_id,
                bangla_name: q.topic_name || q.topic_id,
                subject_id: q.subject_id || defaultSubject,
                chapter_id: q.chapter_id || defaultChapter,
              });
            }
          });
        }

        // Use Background Job Enqueue + Polling Progress (Step 3)
        const jobRes = await importQuestionsAsyncApi({
          questions: formatted,
          createTaxonomy: createTaxonomyPayload.length > 0 ? createTaxonomyPayload : undefined,
          duplicateStrategy,
        });

        setActiveJob({
          jobId: jobRes.jobId,
          batchId: jobRes.batchId,
          status: 'pending',
          totalRows: jobRes.totalRows,
          processedRows: 0,
          successfulRows: 0,
          failedRows: 0,
          progress: 0,
        });

        const pollTimer = setInterval(async () => {
          try {
            const st = await fetchImportJobStatusApi(jobRes.jobId);
            setActiveJob({
              jobId: st.id,
              batchId: st.batchId,
              status: st.status,
              totalRows: st.totalRows,
              processedRows: st.processedRows,
              successfulRows: st.successfulRows,
              failedRows: st.failedRows,
              progress: st.progress,
            });

            if (st.status === 'completed' || st.status === 'failed') {
              clearInterval(pollTimer);
              setIsSubmitting(false);

              if (st.status === 'completed') {
                setCommittedBatch({
                  batchId: st.batchId,
                  count: st.successfulRows,
                  message: `সফলভাবে ${st.successfulRows} টি প্রশ্ন ব্যাকগ্রাউন্ড জবের মাধ্যমে প্রসেস ও ইমপোর্ট সম্পন্ন হয়েছে!`,
                  committedAt: Date.now(),
                });
                setParsedQuestions([]);
                onSuccess(st.successfulRows);
              } else {
                setSubmitError(`ইমপোর্ট জব ব্যর্থ হয়েছে: ${st.errors?.join(', ') || 'অজানা ট্রানজ্যাকশন সমস্যা'}`);
              }

              setTimeout(() => {
                setActiveJob(null);
              }, 4000);
            }
          } catch (pollErr) {
            console.error('Job polling error:', pollErr);
          }
        }, 1200);
      } else if (importType === 'written') {
        const formatted = itemsToUpload.map((q) => ({
          subject_id: q.subject_id,
          subject_name: q.subject_name,
          paper: q.paper,
          chapter_id: q.chapter_id,
          chapter_name: q.chapter_name,
          topic_id: q.topic_id || undefined,
          topic_name: q.topic_name,
          question_text: q.question_text || '',
          answer_text: q.answer_text || '',
          marks: q.marks || 5,
          tags: q.tags || [],
          difficulty: q.difficulty || 'medium',
          question_number: q.question_number,
          question_image_url: q.question_image_url,
          explanation: q.answer_text || q.explanation || '',
          explanation_latex: q.explanation_latex,
          explanation_image_urls: q.explanation_image_urls || [],
          category: q.category || 'varsity_a',
          star_rating: q.star_rating || 1,
        }));

        const res = await bulkImportWrittenQuestionsApi(formatted);
        setCommittedBatch({
          count: res.count,
          message: res.message || `${res.count} টি লিখিত প্রশ্ন সফলভাবে ইমপোর্ট করা হয়েছে!`,
          committedAt: Date.now(),
        });
        setParsedQuestions([]);
        onSuccess(res.count);
      } else if (importType === 'topic') {
        const formatted = itemsToUpload.map((q) => ({
          id: q.id || q.topic_code || `top_${Date.now()}`,
          name: q.name || q.bangla_name || 'নতুন টপিক',
          bangla_name: q.bangla_name || q.name || 'নতুন টপিক',
          chapter_id: q.chapter_id || defaultChapter,
          subject_id: q.subject_id || defaultSubject,
          paper: q.paper || '1st',
          star_rating: q.star_rating || 3,
          topic_code: q.topic_code || q.id,
        }));

        const res = await bulkImportTopicsApi(formatted);
        onSuccess(res.count);
        onClose();
      } else if (importType === 'knowledge_snippet') {
        const formatted = itemsToUpload.map((q) => ({
          title: q.title || 'নলেজ স্নিপেট',
          content: q.content || '',
          subject_id: q.subject_id || defaultSubject,
          chapter_id: q.chapter_id || defaultChapter,
          topic_id: q.topic_id || undefined,
          importance: q.importance || 'high',
          star_rating: q.star_rating || 3,
          tags: q.tags || [],
        }));

        const res = await bulkImportKnowledgeSnippetsApi(formatted);
        onSuccess(res.count);
        onClose();
      }
    } catch (err: any) {
      setSubmitError(err.message || 'ডেটাবেজে ইমপোর্ট সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRollbackImport = async () => {
    if (!committedBatch?.batchId) return;
    if (!window.confirm(`আপনি কি নিশ্চিত যে ইমপোর্ট ব্যাচ '${committedBatch.batchId}' এর সমস্ত প্রশ্ন মুছে ফেলবেন?`)) {
      return;
    }
    setIsRollingBack(true);
    setRollbackMessage(null);
    try {
      const res = await rollbackQuestionsImportApi(committedBatch.batchId);
      setRollbackMessage(res.message);
      setCommittedBatch(null);
      onSuccess(0);
    } catch (err: any) {
      alert(err.message || 'রোলব্যাক করা সম্ভব হয়নি।');
    } finally {
      setIsRollingBack(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
        
        {/* Top Header */}
        <div className="p-5 md:p-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1 border border-emerald-400/30">
                <Sparkles className="w-3 h-3" />
                PrepTest Smart Bulk Importer 3.0
              </div>
              <h2 className="text-lg md:text-xl font-bold tracking-tight">স্মার্ট বাল্ক ইমপোর্ট সিস্টেম</h2>
              <p className="text-xs text-indigo-200/80">
                MCQ প্রশ্ন, লিখিত প্রশ্ন, টপিক ও নলেজ স্নিপেট রেফারেন্সিয়াল ভ্যালিডেশন সহ সহজে ইমপোর্ট করুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Type Selector Bar */}
        <div className="bg-indigo-950/40 border-b border-indigo-900/50 p-3 px-6 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <span className="text-indigo-900 font-extrabold">ইমপোর্ট কন্টেন্ট টাইপ:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => { setImportType('mcq'); setParsedQuestions([]); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                importType === 'mcq'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              📝 MCQ প্রশ্নাবলি (MCQ)
            </button>
            <button
              type="button"
              onClick={() => { setImportType('written'); setParsedQuestions([]); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                importType === 'written'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              ✍️ লিখিত প্রশ্নাবলি (Written)
            </button>
            <button
              type="button"
              onClick={() => { setImportType('topic'); setParsedQuestions([]); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                importType === 'topic'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              🎯 টপিক রেকর্ড (Topics)
            </button>
            <button
              type="button"
              onClick={() => { setImportType('knowledge_snippet'); setParsedQuestions([]); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                importType === 'knowledge_snippet'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              💡 নলেজ স্নিপেট (Knowledge Snippets)
            </button>
          </div>
        </div>

        {/* Active Job Progress Tracking Banner (Step 3 Implementation) */}
        {activeJob && (
          <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-700/50 text-white shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
                  {activeJob.status === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : activeJob.status === 'failed' ? (
                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                  ) : (
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {activeJob.status === 'completed'
                        ? 'ব্যাকগ্রাউন্ড ইমপোর্ট জব সম্পন্ন হয়েছে!'
                        : activeJob.status === 'failed'
                        ? 'ব্যাকগ্রাউন্ড ইমপোর্ট জব ব্যর্থ হয়েছে'
                        : 'ব্যাকগ্রাউন্ডে প্রশ্ন ইমপোর্ট প্রসেসিং চলছে...'}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                        activeJob.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : activeJob.status === 'failed'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/50 animate-pulse'
                      }`}
                    >
                      {activeJob.status}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200/80 mt-1">
                    জব ID: <code className="font-mono bg-indigo-900/60 px-1.5 py-0.5 rounded text-indigo-300">{activeJob.jobId}</code> | 
                    ব্যাচ ID: <code className="font-mono bg-indigo-900/60 px-1.5 py-0.5 rounded text-emerald-300">{activeJob.batchId}</code>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-indigo-300 font-mono">{activeJob.progress}%</span>
                <p className="text-[11px] text-indigo-200/70 font-medium">অগ্রগতি</p>
              </div>
            </div>

            {/* Live Animated Progress Bar */}
            <div className="mt-4">
              <div className="w-full h-3 bg-indigo-950 rounded-full overflow-hidden p-0.5 border border-indigo-800/80">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    activeJob.status === 'completed'
                      ? 'bg-emerald-500'
                      : activeJob.status === 'failed'
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 animate-pulse'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, activeJob.progress))}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-indigo-200/90 font-medium">
                <span>
                  প্রসেস করা হয়েছে: <strong className="text-white font-mono">{activeJob.processedRows}</strong> / {activeJob.totalRows}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-emerald-400">সফল: {activeJob.successfulRows}</span>
                  {activeJob.failedRows > 0 && <span className="text-rose-400">ব্যর্থ: {activeJob.failedRows}</span>}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Committed Batch Notification Banner (Step 2 Implementation) */}
        {committedBatch && (
          <div className="p-5 bg-emerald-50/90 border-b border-emerald-200 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-900">ইমপোর্ট ব্যাচ সফলভাবে সম্পন্ন হয়েছে!</h3>
                  <p className="text-xs text-emerald-700 mt-0.5">{committedBatch.message}</p>
                  {committedBatch.batchId && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-mono font-bold border border-emerald-300">
                        ব্যাচ ID: {committedBatch.batchId}
                      </span>
                      {committedBatch.chunkCount !== undefined && (
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                          ট্রানজ্যাকশন ট্রাঙ্কস: {committedBatch.chunkCount}
                        </span>
                      )}
                      <span className="text-slate-600 font-medium">
                        (মোট ইমপোর্টকৃত আইটেম: {committedBatch.count})
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCommittedBatch(null)}
                className="text-xs text-slate-500 hover:text-slate-700 underline font-medium cursor-pointer"
              >
                প্যানেল ডিসমিস করুন
              </button>
            </div>

            {committedBatch.batchId && (
              <div className="mt-4 pt-3 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>ভুলবশত ইমপোর্ট হলে ২৪ ঘণ্টার মধ্যে সম্পূর্ণ ব্যাচ 'Undo / Rollback' করতে পারবেন।</span>
                </div>
                <button
                  type="button"
                  disabled={isRollingBack}
                  onClick={handleRollbackImport}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isRollingBack ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>রোলব্যাক হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>🔄 এই ইমপোর্ট Undo / Rollback করুন</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {rollbackMessage && (
          <div className="p-4 bg-indigo-50 border-b border-indigo-200 text-indigo-900 text-xs font-semibold flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{rollbackMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setRollbackMessage(null)}
              className="text-indigo-600 hover:text-indigo-800 text-[11px] underline cursor-pointer"
            >
              মুছে দিন
            </button>
          </div>
        )}

        {/* Global Settings & Defaults Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>গ্লোবাল মেটাডাটা ও ডিফল্ট সেটিংস (যদি ফাইলে বিষয়/অধ্যায় উল্লেখ না থাকে):</span>
            </div>
            {parsedQuestions.length > 0 && (
              <button
                type="button"
                onClick={handleApplyDefaultsToAll}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                সকল প্রিভিউ আইটেমে ডিফল্ট প্রয়োগ করুন
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 text-xs">
            {/* 1. Subject Base */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">১. বিষয় (Subject)</label>
              <select
                value={defaultSubjectBase}
                onChange={(e) => handleDefaultSubjectBaseChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {BASE_SUBJECTS_LIST.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Paper */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">২. পত্র (Paper)</label>
              <select
                value={defaultPaper}
                onChange={(e) => handleDefaultPaperChange(e.target.value)}
                disabled={!BASE_SUBJECTS_LIST.find((s) => s.id === defaultSubjectBase)?.hasPapers}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="1st">১ম পত্র (1st Paper)</option>
                <option value="2nd">২য় পত্র (2nd Paper)</option>
              </select>
            </div>

            {/* 3. Chapter */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">৩. অধ্যায় (Chapter)</label>
              <select
                value={defaultChapter}
                onChange={(e) => handleDefaultChapterChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {availableChapters.map((chap) => (
                  <option key={chap.id} value={chap.id}>
                    {chap.bangla_name || chap.name} [{chap.id}]
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Topic */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">৪. ডিফল্ট টপিক (Topic)</label>
              <select
                value={defaultTopicId}
                onChange={(e) => setDefaultTopicId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="">-- কোনো টপিক সিলেক্ট করা হয়নি --</option>
                {getTopicsForChapter(defaultChapter).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.topic_code ? `${t.topic_code}: ` : ''}{t.bangla_name || t.name} [{t.id}]
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">ডিফল্ট ট্যাগ (Tags)</label>
              <input
                type="text"
                value={defaultTagsInput}
                onChange={(e) => setDefaultTagsInput(e.target.value)}
                placeholder="যেমন: DU Ka 24-25, Model Test"
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Difficulty */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">ডিফিকাল্টি লেভেল</label>
              <select
                value={defaultDifficulty}
                onChange={(e) => setDefaultDifficulty(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="easy">Easy (সহজ)</option>
                <option value="medium">Medium (মাঝারি)</option>
                <option value="hard">Hard (কঠিন)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Input Methods Tab Switcher */}
        <div className="px-6 pt-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'file'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>১. ফাইল আপলোড (Excel / CSV / JSON)</span>
            </button>

            {(importType === 'mcq' || importType === 'written') && (
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'text'
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>
                  {importType === 'written' ? '২. লিখিত CSV পেস্ট (CSV Text Paste)' : '২. টেক্সট / CSV পেস্ট (Raw Text & CSV Parser)'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'templates'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>৩. রেডিমেড টেমপ্লেট ডাউনলোড</span>
            </button>
          </div>

          <div className="text-[11px] font-semibold text-slate-500 hidden md:block">
            রেফারেন্সিয়া ভ্যালিডেশন: <span className="text-emerald-700 font-bold">{dbTopics.length} টি টপিক কানেক্টেড</span>
          </div>
        </div>

        {/* Tab Body Contents */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/json"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 group"
              >
                <div className="w-16 h-16 rounded-2xl bg-white shadow-md text-indigo-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <h3 className="text-sm md:text-base font-bold text-slate-800 mb-1">
                  এখানে ক্লিক করে আপনার Excel (.xlsx), CSV বা JSON ফাইল সিলেক্ট করুন
                </h3>
                <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                  গুগল শিট বা এক্সেলে সাজানো ফাইল ড্রপ করুন। সিস্টেমে সিলেক্ট করা <span className="font-bold text-indigo-600">[{importType.toUpperCase()}]</span> ফরম্যাটে পার্স ও ভ্যালিডেশন করা হবে।
                </p>

                {uploadedFileName && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>সিলেক্টেড ফাইল: {uploadedFileName}</span>
                  </div>
                )}

                {isProcessingFile && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>ফাইল প্রসেস ও রেফারেন্স ভ্যালিডেশন করা হচ্ছে...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RAW BENGALI TEXT / CSV PARSER */}
          {activeTab === 'text' && (importType === 'mcq' || importType === 'written') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    {importType === 'written' 
                      ? 'লিখিত (Written) প্রশ্নের CSV ডাটা সরাসরি পেস্ট করুন:' 
                      : 'মাইক্রোসফট ওয়ার্ড বা টেক্সট বা CSV সরাসরি পেস্ট করুন:'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {importType === 'written' ? (
                      <span>প্যাটার্ন: প্রথম লাইনে <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700">subject_id,question_text,answer_text,...</code> হেডার দিয়ে কমা/ট্যাব সেপারেটেড ডাটা পেস্ট করুন।</span>
                    ) : (
                      <span>প্যাটার্ন: সাধারণ বাংলা প্রশ্ন বা কমা সেপারেটেড CSV ফরম্যাট (যেমন: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700">subject_id,question_text,option_a,...</code>)</span>
                    )}
                  </p>
                </div>
                {importType === 'mcq' && (
                  <button
                    type="button"
                    onClick={handleLoadSampleBengaliText}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    নমুনা টেক্সট পেস্ট করুন
                  </button>
                )}
                {importType === 'written' && (
                  <button
                    type="button"
                    onClick={() => {
                      const sampleWrittenCsv = `subject_id,question_text,answer_text,marks,difficulty,star_rating\nphysics_1,"একটি বস্তুকে উর্ধ্বমুখী $20 m/s$ বেগে নিক্ষেপ করা হলে তার সর্বোচ্চ উচ্চতা কত হবে?","সর্বোচ্চ উচ্চতা $H = \\frac{v^2}{2g} = \\frac{20^2}{2 \\times 9.8} = 20.41 m$।",5,medium,3\nchemistry_1,"পানির অণুর আকৃতি কেমন এবং কেন?","পানির অণুর আকৃতি কৌণিক বা উল্টানো V আকৃতির। অক্সিজেনের sp3 সংকরণ ঘটলেও দুটি নিঃসঙ্গ ইলেকট্রন যুগল (lone pair) এর বিকর্ষণের কারণে বন্ধন কোণ ১০৯.৫ ডিগ্রী থেকে হ্রাস পেয়ে ১০৪.৫ ডিগ্রী হয়।",5,easy,2`;
                      setRawBengaliTextInput(sampleWrittenCsv);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    নমুনা লিখিত CSV পেস্ট করুন
                  </button>
                )}
              </div>

              <textarea
                value={rawBengaliTextInput}
                onChange={(e) => setRawBengaliTextInput(e.target.value)}
                placeholder={importType === 'written' 
                  ? "প্রথম লাইনে হেডার দিয়ে লিখিত প্রশ্নের CSV পেস্ট করুন...\n\nsubject_id,question_text,answer_text,marks,difficulty\nphysics_1,\"বলবিদ্যার মৌলিক সূত্রটি কী?\",\"F = ma\",5,easy"
                  : "এখানে বাংলা বা ইংরেজি প্রশ্ন অথবা CSV পেস্ট করুন...\n\n১. প্রশ্ন বাক্য...\n(ক) অপশন ১\n(খ) অপশন ২\n(গ) অপশন ৩\n(ঘ) অপশন ৪\nউত্তর: ক\nব্যাখ্যা: সমাধানের বিস্তারিত ব্যাখ্যা..."
                }
                rows={8}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden leading-relaxed resize-y"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParseRawText}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  স্বয়ংক্রিয়ভাবে টেক্সট/CSV পার্স করুন (Parse Text/CSV)
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DOWNLOAD READY-MADE TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-900 space-y-1">
                  <p className="font-bold">রেডিমেড টেমপ্লেট ব্যবহার করে বাল্ক ডেটা ইমপোর্ট করুন:</p>
                  <p className="text-indigo-800/80 leading-relaxed">
                    বর্তমানে নির্বাচিত টাইপ: <span className="font-bold text-indigo-950 underline">{importType.toUpperCase()}</span>। নিচের যেকোনো একটি টেমপ্লেট ডাউনলোড করে সঠিক তথ্য পুরণ করে আপলোড করুন।
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CSV Template Card */}
                <div className="bg-white rounded-2xl p-5 border border-blue-200 shadow-sm flex flex-col justify-between hover:border-blue-400 transition-colors">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1">{importType.toUpperCase()} CSV Template (.csv)</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      UTF-8 BOM এনকোডিং সহ সিএসভি ফাইল। বাংলা ফন্ট কোনো বিকৃতি ছাড়াই এক্সেলে বা গুগল শিটে ওপেন হবে।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (importType === 'mcq') downloadCsvTemplate();
                      else if (importType === 'written') downloadWrittenQuestionCsvTemplate();
                      else if (importType === 'topic') downloadTopicCsvTemplate();
                      else downloadKnowledgeSnippetCsvTemplate();
                    }}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download {importType.toUpperCase()} CSV Template
                  </button>
                </div>

                {/* JSON Template Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-400 transition-colors">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                      <FileJson className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1">{importType.toUpperCase()} JSON Template (.json)</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      ডেভেলপার ও স্ক্রিপ্টিং ব্যবহারের জন্য স্ট্যান্ডার্ড ফরম্যাটেড JSON অ্যারে টেমপ্লেট।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (importType === 'mcq') downloadJsonTemplate();
                      else if (importType === 'written') downloadWrittenQuestionJsonTemplate();
                      else if (importType === 'topic') downloadTopicJsonTemplate();
                      else downloadKnowledgeSnippetJsonTemplate();
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download {importType.toUpperCase()} JSON Template
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Parse Errors Banner */}
          {parseErrors.length > 0 && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-red-900">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>পার্সিং বা ভ্যালিডেশন ত্রুটি পাওয়া গেছে:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-red-700 pl-1 font-mono text-[11px]">
                {parseErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* AUTO-CREATE MISSING TOPICS BANNER (Requirement 3 & 4) */}
          {missingTopicIds.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-950 text-sm">
                    ⚠️ ডাটাবেজে {missingTopicIds.length} টি অবিদ্যমান topic_id পাওয়া গেছে!
                  </div>
                  <p className="text-amber-800 text-xs mt-0.5">
                    আইডিগুলো: {missingTopicIds.map((m) => `'${m.topic_id}'`).join(', ')}। এগুলো ডাটাবেজে তৈরি না করলে topic_id = NULL হিসেবে সেভ হবে।
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAutoCreateMissingTopics}
                disabled={isCreatingMissingTopics}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isCreatingMissingTopics ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>টপিক তৈরি হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>⚡ অনুপস্থিত টপিকসমূহ এখনই ডাটাবেজে তৈরি করুন</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Success Banner after Auto Creation */}
          {autoCreateSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{autoCreateSuccessMsg}</span>
            </div>
          )}

          {/* STEP 6: DUPLICATE CHECK & STRATEGY */}
          {parsedQuestions.length > 0 && importType === 'mcq' && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    <span>ধাপ ৬: ডুপ্লিকেট চেকার (Duplicate Detection)</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    বর্তমান ফাইলের সাথে ডাটাবেজের বিদ্যমান প্রশ্নের সামঞ্জস্য চেক করুন।
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-700">হ্যান্ডলিং কৌশল:</span>
                    <select
                      value={duplicateStrategy}
                      onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="skip">স্কিপ করুন (Skip Duplicates)</option>
                      <option value="keep_both">উভয় রাখুন (Keep Both / Force Add)</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckDuplicates}
                    disabled={isCheckingDuplicates}
                    className="px-4 py-2 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isCheckingDuplicates ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        চেক করা হচ্ছে...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        ডুপ্লিকেট চেক করুন
                      </>
                    )}
                  </button>
                </div>
              </div>

              {duplicateSummary && (
                <div className="flex flex-wrap items-center gap-3 text-xs pt-3 border-t border-slate-100">
                  <span className={`px-2.5 py-1 rounded-lg font-bold ${duplicateSummary.totalDuplicates === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    সর্বমোট ডুপ্লিকেট: {duplicateSummary.totalDuplicates} টি
                  </span>
                  {duplicateSummary.exactCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-800 font-semibold">
                      ১০০% মিল: {duplicateSummary.exactCount} টি
                    </span>
                  )}
                  {duplicateSummary.similarCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 font-semibold">
                      সমজাতীয়: {duplicateSummary.similarCount} টি
                    </span>
                  )}
                  {duplicateSummary.intraBatchCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-semibold">
                      ফাইলের ভেতরে: {duplicateSummary.intraBatchCount} টি
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PRE-FLIGHT LIVE PREVIEW TABLE */}
          {parsedQuestions.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              {/* Summary Statistics Bar */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    <span>ইমপোর্ট প্রি-ফ্লাইট টেবিল (Pre-flight Review) - [{importType.toUpperCase()}]</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    মোট <span className="text-white font-bold">{parsedQuestions.length}</span> টি আইটেম পার্স করা হয়েছে।
                    {selectedQuestionIndices.length > 0 && (
                      <span className="text-indigo-300 font-bold ml-2">
                        ({selectedQuestionIndices.length} টি সিলেক্ট করা হয়েছে)
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                      previewFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    সকল ({parsedQuestions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('valid')}
                    className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                      previewFilter === 'valid' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
                    }`}
                  >
                    ✅ Valid ({validCount})
                  </button>
                  {missingTaxonomyCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('missing_taxonomy')}
                      className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                        previewFilter === 'missing_taxonomy' ? 'bg-amber-500 text-slate-950' : 'bg-amber-950/80 text-amber-300 border border-amber-500/50 hover:bg-amber-900'
                      }`}
                    >
                      ⚠️ অস্পষ্ট ট্যাক্সোনমি ({missingTaxonomyCount})
                    </button>
                  )}
                  {warningCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('warning')}
                      className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                        previewFilter === 'warning' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                      }`}
                    >
                      ⚠️ Warning ({warningCount})
                    </button>
                  )}
                  {invalidCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('invalid')}
                      className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                        previewFilter === 'invalid' ? 'bg-red-600 text-white' : 'bg-slate-800 text-red-400 hover:bg-slate-700'
                      }`}
                    >
                      ❌ Invalid ({invalidCount})
                    </button>
                  )}
                </div>
              </div>

              {/* PRE-FLIGHT AMBIGUOUS / MISSING TAXONOMY WARNING CARD */}
              {/* STEP 5: TAXONOMY AUTO-RESOLUTION & MAPPING TOOLBAR */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
                      <Sparkles className="w-4 h-4 text-indigo-300" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <span>ধাপ ৫: ট্যাক্সোনমিক্যাল ম্যাপিং ও স্মার্ট অটো-রিজলভ (Taxonomy Auto-Resolution)</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                          Fuzzy Resolver
                        </span>
                      </h4>
                      <p className="text-[11px] text-indigo-200/80 mt-0.5">
                        ফাইলের অস্পষ্ট বা মিসিং বিষয়টি, অধ্যায় ও টপিক নাম সিস্টেমের ক্যানোনিক্যাল ট্যাক্সোনমি ট্রির সাথে অটো-রিজলভ করে নিখুঁত সিঙ্ক করুন।
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isResolvingTaxonomy || parsedQuestions.length === 0}
                      onClick={handleAutoResolveTaxonomy}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isResolvingTaxonomy ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>স্মার্ট ম্যাচিং হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>⚡ ট্যাক্সোনমি অটো-রিজলভ করুন (Auto-Match)</span>
                        </>
                      )}
                    </button>

                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-900/60 border border-indigo-700/60 text-xs font-semibold text-indigo-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoCreateMissingTaxonomy}
                        onChange={(e) => setAutoCreateMissingTaxonomy(e.target.checked)}
                        className="rounded border-indigo-400 text-indigo-500 focus:ring-indigo-400 cursor-pointer"
                      />
                      <span>অনুপস্থিত চ্যাপ্টার/টপিক ইমপোর্টে অটো-তৈরি করুন</span>
                    </label>
                  </div>
                </div>

                {resolutionSummary && (
                  <div className="pt-2 border-t border-indigo-800/60 flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-emerald-300 font-bold bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/40">
                      🎯 {resolutionSummary.fullyResolvedCount} টি সম্পূর্ণ ম্যাপড
                    </span>
                    {resolutionSummary.ambiguousCount > 0 && (
                      <span className="text-amber-300 font-bold bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-500/40">
                        ❓ {resolutionSummary.ambiguousCount} টি দ্ব্যর্থবোধক (Ambiguous)
                      </span>
                    )}
                    {resolutionSummary.missingTaxonomyCount > 0 && (
                      <span className="text-rose-300 font-bold bg-rose-950/80 px-2.5 py-1 rounded-lg border border-rose-500/40">
                        ⚠️ {resolutionSummary.missingTaxonomyCount} টি ট্যাক্সোনমি অনুপস্থিত
                      </span>
                    )}
                  </div>
                )}
              </div>

              {missingTaxonomyCount > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-amber-950">
                          ⚠️ প্রি-ফ্লাইট সতর্কতা: {missingTaxonomyCount} টি প্রশ্নে অস্পষ্ট বা অনুপস্থিত ট্যাক্সোনমি পাওয়া গেছে
                        </h4>
                        <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                          কিছু প্রশ্নের সুনির্দিষ্ট <span className="font-bold font-mono">topic_id</span> পাওয়া যায়নি বা অস্পষ্ট রয়েছে। নিচের টপিক অ্যাসাইনার ব্যবহার করে এক ক্লিকে টপিক নির্ধারণ ও সংরক্ষণ করে নিন।
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('missing_taxonomy')}
                      className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 cursor-pointer shadow-xs"
                    >
                      অস্পষ্ট প্রশ্ন দেখুন
                    </button>
                  </div>
                </div>
              )}

              {/* TOPIC & TOPIC ID ASSIGNER TOOLBAR (REQUIREMENT 4) */}
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-600 shrink-0" />
                    <h4 className="text-xs font-bold text-indigo-950">
                      🎯 টপিক ও কাস্টম টপিক ID অ্যাসাইনার (Assign Specific or Custom Topic & ID)
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="text-slate-600 font-bold">টার্গেট প্রশ্নাংশ:</span>
                    <select
                      value={assignTargetScope}
                      onChange={(e) => setAssignTargetScope(e.target.value as any)}
                      className="px-2.5 py-1 rounded-lg border border-indigo-200 text-xs font-bold bg-white text-indigo-950 cursor-pointer"
                    >
                      <option value="all">সকল প্রশ্ন ({parsedQuestions.length} টি)</option>
                      <option value="selected">সিলেক্ট করা প্রশ্ন ({selectedQuestionIndices.length} টি)</option>
                      <option value="range">নির্দিষ্ট সীমার প্রশ্ন (Range)</option>
                    </select>
                  </div>
                </div>

                {/* Range Inputs if target scope === 'range' */}
                {assignTargetScope === 'range' && (
                  <div className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded-xl border border-indigo-100 w-fit">
                    <span className="font-semibold">প্রশ্ন নম্বর #</span>
                    <input
                      type="number"
                      min={1}
                      max={parsedQuestions.length}
                      value={assignRangeStart}
                      onChange={(e) => setAssignRangeStart(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-0.5 rounded border border-slate-300 text-xs text-center font-bold"
                    />
                    <span className="font-semibold">থেকে #</span>
                    <input
                      type="number"
                      min={1}
                      max={parsedQuestions.length}
                      value={assignRangeEnd}
                      onChange={(e) => setAssignRangeEnd(Math.min(parsedQuestions.length, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-0.5 rounded border border-slate-300 text-xs text-center font-bold"
                    />
                    <span className="font-semibold">পর্যন্ত</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white p-3 rounded-xl border border-indigo-100 shadow-xs">
                  {/* Topic Source Toggle */}
                  <div className="md:col-span-3">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">টপিক উৎস (Source)</label>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setAssignTopicMode('existing')}
                        className={`flex-1 py-1 rounded-md transition-colors cursor-pointer ${
                          assignTopicMode === 'existing' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        বিদ্যমান টপিক
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssignTopicMode('custom')}
                        className={`flex-1 py-1 rounded-md transition-colors cursor-pointer ${
                          assignTopicMode === 'custom' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        + কাস্টম টপিক
                      </button>
                    </div>
                  </div>

                  {/* Input Fields */}
                  {assignTopicMode === 'existing' ? (
                    <>
                      {/* Subject Base */}
                      <div className="md:col-span-2">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">বিষয়</label>
                        <select
                          value={assignSubjectBase}
                          onChange={(e) => handleAssignSubjectBaseChange(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white font-medium focus:ring-2 focus:ring-indigo-500/20"
                        >
                          {BASE_SUBJECTS_LIST.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Paper */}
                      <div className="md:col-span-1">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">পত্র</label>
                        <select
                          value={assignPaper}
                          onChange={(e) => handleAssignPaperChange(e.target.value)}
                          disabled={!BASE_SUBJECTS_LIST.find((s) => s.id === assignSubjectBase)?.hasPapers}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white font-medium focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="1st">১ম</option>
                          <option value="2nd">২য়</option>
                        </select>
                      </div>

                      {/* Chapter */}
                      <div className="md:col-span-3">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">অধ্যায়</label>
                        <select
                          value={assignChapterId}
                          onChange={(e) => handleAssignChapterChange(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white font-medium focus:ring-2 focus:ring-indigo-500/20"
                        >
                          {CHAPTERS_DATA.filter((ch) => ch.subject_id === buildSubjectIdFromBaseAndPaper(assignSubjectBase, assignPaper)).map((chap) => (
                            <option key={chap.id} value={chap.id}>
                              {chap.bangla_name || chap.name} [{chap.id}]
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Topic Selector */}
                      <div className="md:col-span-3">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          টপিক ({getTopicsForChapter(assignChapterId).length} টি)
                        </label>
                        <select
                          value={selectedTopicId}
                          onChange={(e) => setSelectedTopicId(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white font-medium focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="">-- টপিক নির্বাচন করুন --</option>
                          {getTopicsForChapter(assignChapterId).map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.topic_code ? `${t.topic_code}: ` : ''}{t.bangla_name || t.name} [{t.id}]
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="md:col-span-3">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">কাস্টম টপিকের নাম</label>
                        <input
                          type="text"
                          value={customTopicName}
                          onChange={(e) => setCustomTopicName(e.target.value)}
                          placeholder="যেমন: ডাই-ইলেকট্রিক ও ধারকত্ব"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">কাস্টম Topic ID</label>
                        <input
                          type="text"
                          value={customTopicId}
                          onChange={(e) => setCustomTopicId(e.target.value)}
                          placeholder="যেমন: phy2_ch2_custom_01"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white font-mono focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </>
                  )}

                  {/* Apply Button */}
                  <div className="md:col-span-3">
                    <button
                      type="button"
                      onClick={handleApplyTopicToQuestions}
                      className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>⚡ প্রয়োগ করুন (Apply Topic)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Table Container */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedQuestionIndices.length === parsedQuestions.length && parsedQuestions.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      {importType === 'mcq' && (
                        <>
                          <th className="py-2.5 px-3 w-64">প্রশ্ন (Question & LaTeX)</th>
                          <th className="py-2.5 px-3 w-56">অপশনসমূহ (A, B, C, D)</th>
                          <th className="py-2.5 px-3 w-16 text-center">উত্তর</th>
                          <th className="py-2.5 px-3 w-60">অধ্যায়, টপিক ও আইডি</th>
                        </>
                      )}
                      {importType === 'written' && (
                        <>
                          <th className="py-2.5 px-3 w-64">লিখিত প্রশ্ন</th>
                          <th className="py-2.5 px-3 w-64">উত্তর / সমাধান</th>
                          <th className="py-2.5 px-3 w-16 text-center">মার্কেট</th>
                          <th className="py-2.5 px-3 w-60">অধ্যায় ও টপিক</th>
                        </>
                      )}
                      {importType === 'topic' && (
                        <>
                          <th className="py-2.5 px-3 w-40">Topic ID / Code</th>
                          <th className="py-2.5 px-3 w-56">টপিক এর নাম (Bangla Name)</th>
                          <th className="py-2.5 px-3 w-48">অধ্যায় ও বিষয়</th>
                          <th className="py-2.5 px-3 w-24 text-center">স্টার রেটিং</th>
                        </>
                      )}
                      {importType === 'knowledge_snippet' && (
                        <>
                          <th className="py-2.5 px-3 w-48">শিরোনাম (Title)</th>
                          <th className="py-2.5 px-3 w-64">কনটেন্ট (Content)</th>
                          <th className="py-2.5 px-3 w-32">গুরুত্ব (Importance)</th>
                          <th className="py-2.5 px-3 w-48">অধ্যায় ও টপিক</th>
                        </>
                      )}
                      <th className="py-2.5 px-3 w-36 text-center">স্ট্যাটাস (Status)</th>
                      <th className="py-2.5 px-3 w-12 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPreview.map((q, idx) => {
                      const realIndex = parsedQuestions.findIndex((item) => item === q || (item.id && item.id === q.id));
                      const isSelected = selectedQuestionIndices.includes(realIndex !== -1 ? realIndex : idx);

                      return (
                        <tr
                          key={q.id || idx}
                          className={`hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-indigo-50/60' : q.status === 'invalid' ? 'bg-red-50/40' : q.status === 'warning' ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(realIndex !== -1 ? realIndex : idx)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          
                          {/* MCQ Specific Columns */}
                          {importType === 'mcq' && (
                            <>
                              <td className="py-2.5 px-3">
                                <div className="font-medium text-slate-900 line-clamp-3 leading-relaxed">
                                  <MathText text={q.question_text || ''} />
                                </div>
                                {q.explanation && (
                                  <div className="text-[10px] text-slate-500 mt-1 line-clamp-1 italic">
                                    💡 <MathText text={q.explanation} />
                                  </div>
                                )}
                              </td>

                              <td className="py-2.5 px-3 space-y-0.5 text-[11px]">
                                <div className={q.correct_ans === 'A' ? 'font-bold text-emerald-700' : 'text-slate-600'}>
                                  (A) <MathText text={q.options?.A || ''} />
                                </div>
                                <div className={q.correct_ans === 'B' ? 'font-bold text-emerald-700' : 'text-slate-600'}>
                                  (B) <MathText text={q.options?.B || ''} />
                                </div>
                                <div className={q.correct_ans === 'C' ? 'font-bold text-emerald-700' : 'text-slate-600'}>
                                  (C) <MathText text={q.options?.C || ''} />
                                </div>
                                <div className={q.correct_ans === 'D' ? 'font-bold text-emerald-700' : 'text-slate-600'}>
                                  (D) <MathText text={q.options?.D || ''} />
                                </div>
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                                  {q.correct_ans}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-[11px] text-slate-600">
                                <div className="font-semibold text-slate-800">{q.chapter_name || q.chapter_id}</div>
                                {editingRowIndex === (realIndex !== -1 ? realIndex : idx) ? (
                                  <div className="mt-1 space-y-1 bg-white p-2 rounded-lg border border-indigo-200">
                                    <input
                                      type="text"
                                      value={inlineTopicInput.topic_name}
                                      onChange={(e) => setInlineTopicInput({ ...inlineTopicInput, topic_name: e.target.value })}
                                      placeholder="টপিক নাম"
                                      className="w-full px-2 py-1 border rounded text-[11px]"
                                    />
                                    <input
                                      type="text"
                                      value={inlineTopicInput.topic_id}
                                      onChange={(e) => setInlineTopicInput({ ...inlineTopicInput, topic_id: e.target.value })}
                                      placeholder="Topic ID"
                                      className="w-full px-2 py-1 border rounded text-[11px] font-mono"
                                    />
                                    <div className="flex justify-end gap-1 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => setEditingRowIndex(null)}
                                        className="px-2 py-0.5 text-[10px] text-slate-600 bg-slate-100 rounded"
                                      >
                                        বাতিল
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const targetIdx = realIndex !== -1 ? realIndex : idx;
                                          const updated = parsedQuestions.map((item, i) => {
                                            if (i === targetIdx) {
                                              return {
                                                ...item,
                                                topic_id: inlineTopicInput.topic_id.trim() || undefined,
                                                topic_name: inlineTopicInput.topic_name.trim() || undefined,
                                                smartMappedNote: `🎯 ম্যানুয়ালি সেট করা হয়েছে: ${inlineTopicInput.topic_name}`,
                                              };
                                            }
                                            return item;
                                          });
                                          setParsedQuestions(revalidateParsedItems(updated));
                                          setEditingRowIndex(null);
                                        }}
                                        className="px-2 py-0.5 text-[10px] text-white bg-indigo-600 rounded font-bold"
                                      >
                                        সেভ
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between mt-0.5 gap-1">
                                    {q.topic_id ? (
                                      <div className="text-emerald-700 font-bold text-[10px]">
                                        🎯 {q.topic_name || q.topic_id} ({q.topic_id})
                                      </div>
                                    ) : (
                                      <div className="text-amber-600 text-[10px] font-semibold">⚠️ No topic matched</div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const targetIdx = realIndex !== -1 ? realIndex : idx;
                                        setEditingRowIndex(targetIdx);
                                        setInlineTopicInput({
                                          topic_id: q.topic_id || '',
                                          topic_name: q.topic_name || '',
                                        });
                                      }}
                                      className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded cursor-pointer"
                                      title="টপিক পরিবর্তন করুন"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                                {q.smartMappedNote && (
                                  <div className="text-[9px] text-indigo-600 font-medium mt-0.5">
                                    {q.smartMappedNote}
                                  </div>
                                )}
                              </td>
                            </>
                          )}

                        {/* WRITTEN Specific Columns */}
                        {importType === 'written' && (
                          <>
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              <MathText text={q.question_text || ''} />
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                              <MathText text={q.answer_text || ''} />
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-indigo-700">
                              {q.marks || 5}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-600">
                              <div>{q.chapter_name || q.chapter_id}</div>
                              {q.topic_id && <div className="text-emerald-700 font-semibold">{q.topic_id}</div>}
                            </td>
                          </>
                        )}

                        {/* TOPIC Specific Columns */}
                        {importType === 'topic' && (
                          <>
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                              {q.id}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {q.name || q.bangla_name}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-600">
                              <div>{q.chapter_id}</div>
                              <div className="text-slate-400">{q.subject_id}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-amber-600">
                              ★ {q.star_rating || 3}
                            </td>
                          </>
                        )}

                        {/* KNOWLEDGE SNIPPET Specific Columns */}
                        {importType === 'knowledge_snippet' && (
                          <>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {q.title}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px] line-clamp-2">
                              {q.content}
                            </td>
                            <td className="py-2.5 px-3 text-xs font-bold text-indigo-600">
                              {q.importance || 'high'}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-600">
                              <div>{q.chapter_id}</div>
                              {q.topic_id && <div className="text-emerald-700 font-semibold">{q.topic_id}</div>}
                            </td>
                          </>
                        )}

                        {/* Validation Status (Multi-level) */}
                        <td className="py-2.5 px-3 text-center">
                          {q.status === 'valid' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Valid
                            </span>
                          )}

                          {q.status === 'warning' && (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Warning
                              </span>
                              {q.warningIssues && q.warningIssues.length > 0 && (
                                <span className="text-[9px] text-amber-700 font-semibold mt-0.5 max-w-[120px] truncate" title={q.warningIssues.join(', ')}>
                                  {q.warningIssues[0]}
                                </span>
                              )}
                            </div>
                          )}

                          {q.status === 'invalid' && (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                                <AlertCircle className="w-3 h-3 text-red-600" />
                                Invalid
                              </span>
                              {q.validationIssues && q.validationIssues.length > 0 && (
                                <span className="text-[9px] text-red-600 mt-0.5 max-w-[120px] truncate" title={q.validationIssues.join(', ')}>
                                  {q.validationIssues[0]}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteParsedItem(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="তালিকা থেকে বাদ দিন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Submit Error */}
          {submitError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {parsedQuestions.length > 0 ? (
              <span>
                মোট <strong className="text-slate-800">{uploadableCount}</strong> টি প্রস্তুত রেকর্ড ডেটাবেজে ইমপোর্ট হতে যাচ্ছে (Valid: {validCount}, Warning: {warningCount})।
              </span>
            ) : (
              <span>ফাইল আপলোড বা টেক্সট পেস্ট করে ইমপোর্ট প্রিভিউ দেখুন।</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              বাতিল
            </button>

            <button
              type="button"
              disabled={uploadableCount === 0 || isSubmitting}
              onClick={handleFinalSubmit}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>ডেটাবেজে আপলোড হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>{uploadableCount > 0 ? `এক ক্লিকে ${uploadableCount} টি ${importType.toUpperCase()} ইমপোর্ট করুন` : 'আপলোড করুন'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
