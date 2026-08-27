import { getPgPool, isPostgresActive, memoryStore, query } from '../db.js';
import { SUBJECTS_DATA, CHAPTERS_DATA } from '../../src/data/admissionData.js';
import { COMPREHENSIVE_CHAPTERS_DATA } from '../../src/data/subjectTopicsData.js';
import {
  normalizeBangla,
  normalizeBanglaKey,
  calculateSimilarity,
  resolveSubject,
  resolveChapter,
  resolveTopic,
  buildTaxonomyTree,
  generateChapterId,
  generateTopicId,
  SubjectEntity,
  ChapterEntity,
  TopicEntity,
  Candidate,
  TaxonomyTreeNode,
} from '../../packages/shared/src/taxonomy/resolve.js';
import { logger } from '../utils/logger.js';
import { validateTaxonomyConsistency } from '../validation/taxonomyConsistency.js';

// ==========================================
// INTERFACES & SCHEMAS
// ==========================================

export interface RawImportRow {
  id?: string;
  item_type?: 'mcq' | 'written' | 'topic' | 'knowledge_snippet';
  question_text?: string;
  questionText?: string;
  question?: string;
  options?: { A: string; B: string; C: string; D: string; [key: string]: string } | any[];
  correct_ans?: string;
  correctAnswer?: string;
  ans?: string;
  explanation?: string;
  solution?: string;
  explanation_latex?: string;
  math_formula_latex?: string;
  question_image_url?: string;
  explanation_image_url?: string;
  
  // Taxonomy fields
  subject_id?: string;
  subject?: string;
  subject_name?: string;
  paper?: string | number;
  chapter_id?: string;
  chapterId?: string;
  chapter_name?: string;
  topic_id?: string;
  topic?: string;
  topic_name?: string;
  name?: string;
  bangla_name?: string;

  // Metadata
  category?: string;
  tags?: string[] | string;
  difficulty?: 'easy' | 'medium' | 'hard';
  star_rating?: number;
  type?: 'mcq' | 'written';
  marks?: number;
  answer_text?: string;

  // Passthrough source row index
  rawSourceIndex?: number;
}

export interface ResolvedTaxonomyDetails {
  subject_id: string;
  subject_name: string;
  paper: '1st' | '2nd';
  chapter_id: string;
  chapter_name: string;
  topic_id: string | null;
  topic_name: string | null;
}

export interface FullyResolvedRow {
  rowIndex: number;
  originalData: RawImportRow;
  resolvedTaxonomy: ResolvedTaxonomyDetails;
  matchedEntityIds: {
    subject_id: string;
    chapter_id: string;
    topic_id: string | null;
  };
  resolutionNotes: string[];
}

export interface AmbiguousRow {
  rowIndex: number;
  originalData: RawImportRow;
  ambiguityType: 'topic_name_mismatch' | 'topic_fuzzy' | 'chapter_fuzzy' | 'subject_fuzzy' | 'multiple_matches';
  reason: string;
  currentTaxonomy: {
    subject_id?: string;
    subject_name?: string;
    chapter_id?: string;
    chapter_name?: string;
    topic_id?: string;
    topic_name?: string;
  };
  candidates: {
    subjects?: Candidate[];
    chapters?: Candidate[];
    topics?: Candidate[];
  };
  suggestedResolved?: ResolvedTaxonomyDetails;
}

export interface MissingTaxonomyRow {
  rowIndex: number;
  originalData: RawImportRow;
  missingFields: ('subject' | 'chapter' | 'topic')[];
  reason: string;
  suggestedDefaults: {
    subject_id: string;
    subject_name: string;
    paper: '1st' | '2nd';
    chapter_id: string;
    chapter_name: string;
    suggested_topic_id?: string;
    suggested_topic_name?: string;
  };
}

export interface ImportPreviewResult {
  summary: {
    totalRows: number;
    fullyResolvedCount: number;
    ambiguousCount: number;
    missingTaxonomyCount: number;
    canDirectlyCommit: boolean;
  };
  fullyResolvedRows: FullyResolvedRow[];
  ambiguousRows: AmbiguousRow[];
  missingTaxonomyRows: MissingTaxonomyRow[];
  taxonomyTree: TaxonomyTreeNode[];
}

export interface CommitTaxonomyItem {
  type: 'chapter' | 'topic';
  id?: string;
  name: string;
  bangla_name: string;
  subject_id: string;
  chapter_id?: string;
  paper?: '1st' | '2nd';
  star_rating?: number;
}

export interface CommitImportPayload {
  questions: RawImportRow[];
  createTaxonomy?: CommitTaxonomyItem[];
}

export interface CommitImportResult {
  success: boolean;
  importedQuestionsCount: number;
  createdTaxonomyCount: number;
  updatedTopicCountersCount: number;
  batchId?: string;
  chunkCount?: number;
  failedChunksCount?: number;
  message: string;
}

// ==========================================
// 1. TAXONOMY CONTEXT LOADER
// ==========================================

export async function loadTaxonomyContext(): Promise<{
  subjects: SubjectEntity[];
  chapters: ChapterEntity[];
  topics: TopicEntity[];
  taxonomyTree: TaxonomyTreeNode[];
}> {
  let subjects: SubjectEntity[] = [];
  let chapters: ChapterEntity[] = [];
  let topics: TopicEntity[] = [];

  const activePool = getPgPool();
  if (isPostgresActive() && activePool) {
    try {
      const subRes = await query('SELECT * FROM subjects ORDER BY order_index ASC, id ASC');
      if (subRes && subRes.rows && subRes.rows.length > 0) {
        subjects = subRes.rows.map((r: any) => ({
          id: r.id,
          name: r.name || r.id,
          bangla_name: r.bangla_name || r.name || r.id,
          paper: r.paper || '1st',
          short_code: r.short_code || undefined,
        }));
      }

      const chapRes = await query('SELECT * FROM chapters ORDER BY subject_id ASC, chapter_number ASC, id ASC');
      if (chapRes && chapRes.rows && chapRes.rows.length > 0) {
        chapters = chapRes.rows.map((r: any) => ({
          id: r.id,
          subject_id: r.subject_id,
          name: r.name || r.id,
          bangla_name: r.bangla_name || r.name || r.id,
          paper: r.paper || undefined,
          chapter_number: r.chapter_number ? Number(r.chapter_number) : undefined,
        }));
      }

      const topRes = await query('SELECT * FROM topics ORDER BY chapter_id ASC, topic_code ASC, id ASC');
      if (topRes && topRes.rows && topRes.rows.length > 0) {
        topics = topRes.rows.map((r: any) => ({
          id: r.id,
          chapter_id: r.chapter_id,
          subject_id: r.subject_id || undefined,
          name: r.name || r.id,
          bangla_name: r.bangla_name || r.name || r.id,
          paper: r.paper || undefined,
          topic_code: r.topic_code || undefined,
          star_rating: r.star_rating ? Number(r.star_rating) : 3,
          total_questions: r.total_questions ? Number(r.total_questions) : 0,
        }));
      }
    } catch (dbErr: any) {
      logger.warn(`[TaxonomyLoader] Failed to fetch taxonomy from DB, falling back to static data: ${dbErr.message}`);
    }
  }

  // Fallback to static subjects/chapters/topics if empty
  if (subjects.length === 0 && Array.isArray(SUBJECTS_DATA)) {
    subjects = SUBJECTS_DATA.map((s) => ({
      id: s.id,
      name: s.name,
      bangla_name: s.name,
      paper: (s.id.endsWith('_2') ? '2nd' : '1st') as '1st' | '2nd',
    }));
  }

  if (chapters.length === 0 && Array.isArray(CHAPTERS_DATA)) {
    chapters = CHAPTERS_DATA.map((c) => ({
      id: c.id,
      subject_id: c.subject_id,
      name: c.name,
      bangla_name: c.name,
      paper: c.subject_id.endsWith('_2') ? '2nd' : '1st',
    }));
  }

  if (topics.length === 0) {
    if (memoryStore && memoryStore.topics && memoryStore.topics.size > 0) {
      topics = Array.from(memoryStore.topics.values()).map((t) => ({
        id: t.id,
        chapter_id: t.chapter_id,
        subject_id: t.subject_id,
        name: t.name,
        bangla_name: t.bangla_name,
        paper: t.paper,
        star_rating: t.star_rating,
        total_questions: t.total_questions,
      }));
    } else if (Array.isArray(COMPREHENSIVE_CHAPTERS_DATA)) {
      COMPREHENSIVE_CHAPTERS_DATA.forEach((ch) => {
        if (ch.subtopics) {
          ch.subtopics.forEach((st) => {
            topics.push({
              id: st.id,
              chapter_id: ch.id,
              subject_id: ch.subject_id,
              name: st.name || st.bangla_name || st.id,
              bangla_name: st.bangla_name || st.name || st.id,
              paper: ch.subject_id.endsWith('_2') ? '2nd' : '1st',
              star_rating: st.star_rating || 3,
              total_questions: st.total_questions || 0,
            });
          });
        }
      });
    }
  }

  const taxonomyTree = buildTaxonomyTree(subjects, chapters, topics);

  return { subjects, chapters, topics, taxonomyTree };
}

// ==========================================
// 2. RESOLVE PHASE (PREVIEW ENGINE)
// ==========================================

export async function resolveQuestionsImport(
  rawQuestions: RawImportRow[],
  defaults?: {
    subject_id?: string;
    chapter_id?: string;
    paper?: '1st' | '2nd';
  }
): Promise<ImportPreviewResult> {
  const { subjects, chapters, topics, taxonomyTree } = await loadTaxonomyContext();

  const fullyResolvedRows: FullyResolvedRow[] = [];
  const ambiguousRows: AmbiguousRow[] = [];
  const missingTaxonomyRows: MissingTaxonomyRow[] = [];

  for (let idx = 0; idx < rawQuestions.length; idx++) {
    const raw = rawQuestions[idx];
    const notes: string[] = [];

    // --- STEP 1: RESOLVE SUBJECT ---
    const rawSubId = raw.subject_id || raw.subject || defaults?.subject_id || 'physics_1';
    const rawSubName = raw.subject_name;
    const rawPaper = raw.paper === 2 || raw.paper === '2' || raw.paper === '2nd' ? '2nd' : (raw.paper === 1 || raw.paper === '1' || raw.paper === '1st' ? '1st' : defaults?.paper);

    const subRes = resolveSubject(
      {
        id: rawSubId,
        name: rawSubName,
        bangla_name: rawSubName,
        paper: rawPaper,
      },
      subjects
    );

    const resolvedSubject = subRes.matched;

    // --- STEP 2: RESOLVE CHAPTER ---
    const rawChapId = raw.chapter_id || raw.chapterId || defaults?.chapter_id;
    const rawChapName = raw.chapter_name;
    const effectiveSubId = resolvedSubject?.id || rawSubId;

    const chapRes = resolveChapter(
      {
        id: rawChapId,
        subject_id: effectiveSubId,
        name: rawChapName,
        bangla_name: rawChapName,
      },
      chapters
    );

    const resolvedChapter = chapRes.matched;

    // --- STEP 3: RESOLVE TOPIC ---
    const rawTopicId = raw.topic_id?.trim();
    const rawTopicName = (raw.topic_name || raw.topic || raw.name)?.trim();
    const effectiveChapId = resolvedChapter?.id || rawChapId;

    const topicRes = resolveTopic(
      {
        id: rawTopicId,
        chapter_id: effectiveChapId,
        subject_id: effectiveSubId,
        name: rawTopicName,
        bangla_name: rawTopicName,
      },
      topics
    );

    const resolvedTopic = topicRes.matched;

    // --- STEP 4: CHECK REFERENTIAL INTEGRITY & CONSISTENCY ---
    const consistency = validateTaxonomyConsistency(
      {
        subject_id: resolvedSubject?.id || rawSubId,
        chapter_id: resolvedChapter?.id || rawChapId,
        topic_id: rawTopicId,
        topic_name: rawTopicName,
      },
      { subjects, chapters, topics }
    );

    let effectiveTopicId = resolvedTopic ? resolvedTopic.id : (rawTopicId || null);
    let effectiveTopicName = resolvedTopic ? (resolvedTopic.bangla_name || resolvedTopic.name) : (rawTopicName || null);

    if (consistency.isSoftMismatch && consistency.mismatchType === 'topic_chapter_mismatch') {
      notes.push(consistency.reason || 'Topic-Chapter Mismatch detected');
      if (consistency.resolvedTopicId !== undefined) {
        effectiveTopicId = consistency.resolvedTopicId;
        effectiveTopicName = consistency.resolvedTopicName || effectiveTopicName;
      }
    }

    // Critical Rule: If a row has topic_id but the name doesn't match the DB topic name -> treat as ambiguous!
    let hasTopicNameConflict = false;
    let conflictReason = '';

    if (rawTopicId && rawTopicName) {
      // Find existing topic with this ID directly
      const existingById = topics.find((t) => t.id === rawTopicId);
      if (existingById) {
        const idNameSim = calculateSimilarity(rawTopicName, existingById.bangla_name || existingById.name);
        if (idNameSim < 0.35) {
          hasTopicNameConflict = true;
          conflictReason = `টপিক আইডি '${rawTopicId}' ডাটাবেজে '${existingById.bangla_name || existingById.name}' হিসেবে আছে, কিন্তু ফাইলে দেওয়া নাম '${rawTopicName}' মিলছে না।`;
        }
      }
    }

    // Determine category
    if (consistency.isHardMismatch) {
      missingTaxonomyRows.push({
        rowIndex: idx,
        originalData: raw,
        missingFields: [consistency.mismatchType === 'subject_invalid' ? 'subject' : 'chapter'],
        reason: consistency.reason || 'ট্যাক্সোনমিতে অসামঞ্জস্যতা পাওয়া গেছে।',
        suggestedDefaults: {
          subject_id: resolvedSubject?.id || rawSubId || 'physics_1',
          subject_name: resolvedSubject?.bangla_name || resolvedSubject?.name || rawSubName || 'পদার্থবিজ্ঞান',
          paper: (resolvedSubject?.paper as '1st' | '2nd') || '1st',
          chapter_id: resolvedChapter?.id || rawChapId || 'phy1_ch1',
          chapter_name: resolvedChapter?.bangla_name || resolvedChapter?.name || rawChapName || 'অধ্যায়',
        },
      });
    } else if (hasTopicNameConflict) {
      ambiguousRows.push({
        rowIndex: idx,
        originalData: raw,
        ambiguityType: 'topic_name_mismatch',
        reason: conflictReason,
        currentTaxonomy: {
          subject_id: rawSubId,
          subject_name: rawSubName,
          chapter_id: rawChapId,
          chapter_name: rawChapName,
          topic_id: rawTopicId,
          topic_name: rawTopicName,
        },
        candidates: {
          topics: topicRes.candidates,
        },
        suggestedResolved: {
          subject_id: resolvedSubject?.id || effectiveSubId,
          subject_name: resolvedSubject?.bangla_name || resolvedSubject?.name || rawSubName || 'পদার্থবিজ্ঞান',
          paper: (resolvedSubject?.paper as '1st' | '2nd') || '1st',
          chapter_id: resolvedChapter?.id || effectiveChapId || 'phy1_ch1',
          chapter_name: resolvedChapter?.bangla_name || resolvedChapter?.name || rawChapName || 'অধ্যায়',
          topic_id: effectiveTopicId,
          topic_name: effectiveTopicName,
        },
      });
    } else if (
      topicRes.confidence === 'fuzzy_candidate' ||
      chapRes.confidence === 'fuzzy_candidate' ||
      subRes.confidence === 'fuzzy_candidate'
    ) {
      const reasons: string[] = [];
      if (topicRes.confidence === 'fuzzy_candidate') reasons.push(`টপিক '${rawTopicName || rawTopicId}' এর একাধিক সম্ভাব্য মিল পাওয়া গেছে।`);
      if (chapRes.confidence === 'fuzzy_candidate') reasons.push(`অধ্যায় '${rawChapName || rawChapId}' নিশ্চিত নয়।`);
      if (subRes.confidence === 'fuzzy_candidate') reasons.push(`বিষয় '${rawSubName || rawSubId}' নিশ্চিত নয়।`);

      ambiguousRows.push({
        rowIndex: idx,
        originalData: raw,
        ambiguityType: 'multiple_matches',
        reason: reasons.join(' ') || 'ট্যাক্সোনমিতে সম্ভাব্য একাধিক মিল পাওয়া গেছে।',
        currentTaxonomy: {
          subject_id: rawSubId,
          subject_name: rawSubName,
          chapter_id: rawChapId,
          chapter_name: rawChapName,
          topic_id: rawTopicId,
          topic_name: rawTopicName,
        },
        candidates: {
          subjects: subRes.candidates,
          chapters: chapRes.candidates,
          topics: topicRes.candidates,
        },
        suggestedResolved: {
          subject_id: resolvedSubject?.id || effectiveSubId,
          subject_name: resolvedSubject?.bangla_name || resolvedSubject?.name || rawSubName || 'পদার্থবিজ্ঞান',
          paper: (resolvedSubject?.paper as '1st' | '2nd') || '1st',
          chapter_id: resolvedChapter?.id || effectiveChapId || 'phy1_ch1',
          chapter_name: resolvedChapter?.bangla_name || resolvedChapter?.name || rawChapName || 'অধ্যায়',
          topic_id: effectiveTopicId,
          topic_name: effectiveTopicName,
        },
      });
    } else if (!resolvedSubject || !resolvedChapter || (rawTopicName && !resolvedTopic && !rawTopicId)) {
      // Missing taxonomy
      const missing: ('subject' | 'chapter' | 'topic')[] = [];
      if (!resolvedSubject) missing.push('subject');
      if (!resolvedChapter) missing.push('chapter');
      if (rawTopicName && !resolvedTopic) missing.push('topic');

      const fallbackSub = subjects[0] || { id: 'physics_1', name: 'Physics 1st Paper', bangla_name: 'পদার্থবিজ্ঞান ১ম পত্র', paper: '1st' };
      const fallbackChap = chapters.find((c) => c.subject_id === fallbackSub.id) || { id: 'phy1_ch1', subject_id: fallbackSub.id, name: 'অধ্যায় ১', bangla_name: 'ভৌত জগৎ ও পরিমাপ', paper: '1st' };

      const subName = resolvedSubject ? resolvedSubject.bangla_name || resolvedSubject.name : rawSubName || fallbackSub.bangla_name;
      const chapName = resolvedChapter ? resolvedChapter.bangla_name || resolvedChapter.name : rawChapName || fallbackChap.bangla_name;
      const chapId = resolvedChapter ? resolvedChapter.id : generateChapterId(effectiveSubId, undefined, chapName);
      const suggestedTopicId = rawTopicName ? generateTopicId(chapId, undefined, rawTopicName) : undefined;

      missingTaxonomyRows.push({
        rowIndex: idx,
        originalData: raw,
        missingFields: missing,
        reason: `প্রদত্ত তথ্যের জন্য ডাটাবেজে সঠিক ${missing.join(', ')} খুঁজে পাওয়া যায়নি। নতুন ট্যাক্সোনমি হিসেবে তৈরি বা নির্বাচন করুন।`,
        suggestedDefaults: {
          subject_id: resolvedSubject?.id || fallbackSub.id,
          subject_name: subName,
          paper: (resolvedSubject?.paper as '1st' | '2nd') || '1st',
          chapter_id: chapId,
          chapter_name: chapName,
          suggested_topic_id: suggestedTopicId,
          suggested_topic_name: rawTopicName || undefined,
        },
      });
    } else {
      // Fully resolved!
      const subFinalId = resolvedSubject.id;
      const subFinalName = resolvedSubject.bangla_name || resolvedSubject.name;
      const paperFinal = (resolvedSubject.paper as '1st' | '2nd') || '1st';
      const chapFinalId = resolvedChapter.id;
      const chapFinalName = resolvedChapter.bangla_name || resolvedChapter.name;

      if (topicRes.confidence === 'exact_id') notes.push('টপিক আইডি নিখুঁতভাবে মিলেছে');
      if (topicRes.confidence === 'exact_name') notes.push('টপিক নাম দ্বারা স্বয়ংক্রিয়ভাবে শনাক্ত হয়েছে');

      fullyResolvedRows.push({
        rowIndex: idx,
        originalData: raw,
        resolvedTaxonomy: {
          subject_id: subFinalId,
          subject_name: subFinalName,
          paper: paperFinal,
          chapter_id: chapFinalId,
          chapter_name: chapFinalName,
          topic_id: effectiveTopicId,
          topic_name: effectiveTopicName,
        },
        matchedEntityIds: {
          subject_id: subFinalId,
          chapter_id: chapFinalId,
          topic_id: effectiveTopicId,
        },
        resolutionNotes: notes,
      });
    }
  }

  return {
    summary: {
      totalRows: rawQuestions.length,
      fullyResolvedCount: fullyResolvedRows.length,
      ambiguousCount: ambiguousRows.length,
      missingTaxonomyCount: missingTaxonomyRows.length,
      canDirectlyCommit: ambiguousRows.length === 0 && missingTaxonomyRows.length === 0,
    },
    fullyResolvedRows,
    ambiguousRows,
    missingTaxonomyRows,
    taxonomyTree,
  };
}

// ==========================================
// 3. COMMIT PHASE (TRANSACTIONAL INSERT)
// ==========================================

export async function commitQuestionsImport(
  payload: CommitImportPayload
): Promise<CommitImportResult> {
  const { questions, createTaxonomy = [] } = payload;

  if (!questions || questions.length === 0) {
    return {
      success: false,
      importedQuestionsCount: 0,
      createdTaxonomyCount: 0,
      updatedTopicCountersCount: 0,
      message: 'ইমপোর্টের জন্য কোনো প্রশ্ন পাওয়া যায়নি।',
    };
  }

  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const activePool = getPgPool();
  let createdTaxonomyCount = 0;
  let totalImportedCount = 0;

  if (isPostgresActive() && activePool) {
    const client = await activePool.connect();
    try {
      // --- 1. UPSERT TAXONOMY FIRST (in separate transaction) ---
      if (createTaxonomy.length > 0) {
        await client.query('BEGIN');
        for (const item of createTaxonomy) {
          if (item.type === 'chapter') {
            const chapId = item.id || generateChapterId(item.subject_id, undefined, item.bangla_name || item.name);
            await client.query(
              `INSERT INTO chapters (id, subject_id, name, bangla_name, paper, created_at)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (id) DO UPDATE SET
                 name = EXCLUDED.name,
                 bangla_name = EXCLUDED.bangla_name,
                 paper = EXCLUDED.paper`,
              [
                chapId,
                item.subject_id,
                item.name || item.bangla_name,
                item.bangla_name || item.name,
                item.paper || '1st',
                Date.now(),
              ]
            );
            createdTaxonomyCount++;
          } else if (item.type === 'topic') {
            const topicId = item.id || generateTopicId(item.chapter_id || 'ch', undefined, item.bangla_name || item.name);
            await client.query(
              `INSERT INTO topics (
                 id, chapter_id, subject_id, paper, name, bangla_name, star_rating,
                 total_questions, completed_questions, mcq_count, written_count, created_at
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, 0, $8)
               ON CONFLICT (id) DO UPDATE SET
                 name = EXCLUDED.name,
                 bangla_name = EXCLUDED.bangla_name,
                 chapter_id = EXCLUDED.chapter_id,
                 subject_id = EXCLUDED.subject_id,
                 paper = EXCLUDED.paper`,
              [
                topicId,
                item.chapter_id,
                item.subject_id,
                item.paper || '1st',
                item.name || item.bangla_name,
                item.bangla_name || item.name,
                item.star_rating || 3,
                Date.now(),
              ]
            );
            createdTaxonomyCount++;
          }
        }
        await client.query('COMMIT');
      }

      // --- 2. CHUNKED UPSERT QUESTIONS (500 ROWS PER CHUNK TRANSACTION) ---
      const CHUNK_SIZE = 500;
      const chunks: RawImportRow[][] = [];
      for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
        chunks.push(questions.slice(i, i + CHUNK_SIZE));
      }

      const upsertQuestionSql = `
        INSERT INTO questions (
          id, subject_id, subject_name, paper, chapter_id, chapter_name,
          topic_id, topic_name, category, question_text, math_formula_latex,
          options, correct_ans, explanation, explanation_latex,
          question_image_url, explanation_image_url,
          tags, star_rating, type, difficulty, created_at, import_batch_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        ON CONFLICT (id) DO UPDATE SET
          subject_id = EXCLUDED.subject_id,
          subject_name = EXCLUDED.subject_name,
          paper = EXCLUDED.paper,
          chapter_id = EXCLUDED.chapter_id,
          chapter_name = EXCLUDED.chapter_name,
          topic_id = EXCLUDED.topic_id,
          topic_name = EXCLUDED.topic_name,
          category = EXCLUDED.category,
          question_text = EXCLUDED.question_text,
          math_formula_latex = EXCLUDED.math_formula_latex,
          options = EXCLUDED.options,
          correct_ans = EXCLUDED.correct_ans,
          explanation = EXCLUDED.explanation,
          explanation_latex = EXCLUDED.explanation_latex,
          question_image_url = EXCLUDED.question_image_url,
          explanation_image_url = EXCLUDED.explanation_image_url,
          tags = EXCLUDED.tags,
          star_rating = EXCLUDED.star_rating,
          type = EXCLUDED.type,
          difficulty = EXCLUDED.difficulty,
          import_batch_id = EXCLUDED.import_batch_id;
      `;

      let failedChunksCount = 0;

      for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
        const chunk = chunks[cIdx];
        await client.query('BEGIN');
        try {
          for (const q of chunk) {
            let optionsObj: { A: string; B: string; C: string; D: string; [key: string]: string } = {
              A: '',
              B: '',
              C: '',
              D: '',
            };

            if (Array.isArray(q.options)) {
              for (const opt of q.options) {
                if (opt) {
                  const key = opt.id || opt.label || 'A';
                  optionsObj[key] = opt.text ?? opt.value ?? '';
                }
              }
            } else if (q.options && typeof q.options === 'object') {
              optionsObj = { ...optionsObj, ...q.options };
            }

            let tagsArr: string[] = [];
            if (Array.isArray(q.tags)) {
              tagsArr = q.tags.map((t: any) => String(t));
            } else if (typeof q.tags === 'string' && q.tags.trim()) {
              tagsArr = q.tags.split(',').map((t) => t.trim()).filter(Boolean);
            }

            const questionId = q.id || `q_${q.subject_id || 'phy'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const paperStr = q.paper === 2 || q.paper === '2' || q.paper === '2nd' ? '2nd' : '1st';

            await client.query(upsertQuestionSql, [
              questionId,
              q.subject_id || 'physics_1',
              q.subject_name || 'পদার্থবিজ্ঞান ১ম পত্র',
              paperStr,
              q.chapter_id || 'phy1_ch1',
              q.chapter_name || 'অধ্যায়',
              q.topic_id || null,
              q.topic_name || null,
              q.category || 'varsity_a',
              (q.question_text || q.questionText || q.question || '').trim(),
              q.math_formula_latex || null,
              JSON.stringify(optionsObj),
              (q.correct_ans || q.correctAnswer || q.ans || 'A').trim().toUpperCase(),
              q.explanation || q.solution || '',
              q.explanation_latex || null,
              q.question_image_url || null,
              q.explanation_image_url || null,
              JSON.stringify(tagsArr),
              Math.min(3, Math.max(1, Number(q.star_rating) || 3)),
              q.type || 'mcq',
              q.difficulty || 'medium',
              Date.now(),
              batchId,
            ]);
          }

          await client.query('COMMIT');
          totalImportedCount += chunk.length;
        } catch (chunkErr: any) {
          await client.query('ROLLBACK');
          failedChunksCount++;
          logger.error(`[ImportService] Chunk ${cIdx + 1}/${chunks.length} failed: ${chunkErr.message}`);
        }
      }

      // --- 3. RECALCULATE COUNTERS & LOG AUDIT ---
      await client.query('BEGIN');
      const updateTopicCountersRes = await client.query(`
        UPDATE topics t
        SET 
          mcq_count = (SELECT COUNT(*)::int FROM questions q WHERE q.topic_id = t.id),
          written_count = (SELECT COUNT(*)::int FROM written_questions w WHERE w.topic_id = t.id),
          total_questions = (SELECT COUNT(*)::int FROM questions q WHERE q.topic_id = t.id) + (SELECT COUNT(*)::int FROM written_questions w WHERE w.topic_id = t.id);
      `);

      await client.query(`
        UPDATE chapters c
        SET total_topics = (SELECT COUNT(*)::int FROM topics t WHERE t.chapter_id = c.id);
      `);

      // Audit Log
      const auditId = `audit_import_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await client.query(
        `INSERT INTO taxonomy_audit_logs (id, action, entity_type, entity_id, details, performed_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          auditId,
          'bulk_import_commit',
          'import_batch',
          batchId,
          JSON.stringify({ totalImportedCount, createdTaxonomyCount, chunkCount: chunks.length, batchId }),
          'admin',
          Date.now(),
        ]
      );

      await client.query('COMMIT');
      logger.info(`[ImportService] Batch ${batchId} commit success: ${totalImportedCount} questions, ${chunks.length} chunks (${failedChunksCount} failed).`);

      return {
        success: totalImportedCount > 0,
        importedQuestionsCount: totalImportedCount,
        createdTaxonomyCount,
        updatedTopicCountersCount: updateTopicCountersRes.rowCount || 0,
        batchId,
        chunkCount: chunks.length,
        failedChunksCount,
        message: `সফলভাবে ${totalImportedCount} টি প্রশ্ন (${chunks.length} চ্যাঙ্ক) এবং ${createdTaxonomyCount} টি ট্যাক্সোনমি আইটেম সংরক্ষিত হয়েছে। (ব্যাচ ID: ${batchId})`,
      };
    } catch (err: any) {
      logger.error(`[ImportService] Batch commit failed: ${err.message}`);
      throw new Error(`বাল্ক ইমপোর্ট ট্রানজ্যাকশন ব্যর্থ: ${err.message}`);
    } finally {
      client.release();
    }
  }

  // Fallback to in-memory store
  for (const q of questions) {
    const questionId = q.id || `q_${q.subject_id || 'phy'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    memoryStore.questions.set(questionId, {
      id: questionId,
      subject_id: (q.subject_id || 'physics_1') as any,
      subject_name: q.subject_name || 'পদার্থবিজ্ঞান ১ম পত্র',
      paper: (q.paper === 2 || q.paper === '2' || q.paper === '2nd' ? '2nd' : '1st') as '1st' | '2nd',
      chapter_id: (q.chapter_id || 'phy1_ch1') as any,
      chapter_name: q.chapter_name || 'অধ্যায়',
      topic_id: q.topic_id,
      topic_name: q.topic_name,
      category: (q.category || 'varsity_a') as any,
      question_text: (q.question_text || q.questionText || q.question || '').trim(),
      options: typeof q.options === 'object' && !Array.isArray(q.options) ? q.options : { A: '', B: '', C: '', D: '' },
      correct_ans: (q.correct_ans || q.correctAnswer || q.ans || 'A').trim().toUpperCase() as any,
      explanation: q.explanation || q.solution || '',
      tags: Array.isArray(q.tags) ? q.tags : [],
      star_rating: (Math.min(3, Math.max(1, Number(q.star_rating) || 3)) as 1 | 2 | 3),
      type: q.type || 'mcq',
      difficulty: q.difficulty || 'medium',
      import_batch_id: batchId,
    } as any);
  }

  return {
    success: true,
    importedQuestionsCount: questions.length,
    createdTaxonomyCount: 0,
    updatedTopicCountersCount: memoryStore.topics.size,
    batchId,
    chunkCount: 1,
    failedChunksCount: 0,
    message: `সফলভাবে ${questions.length} টি প্রশ্ন মেমোরিতে ইমপোর্ট করা হয়েছে। (ব্যাচ ID: ${batchId})`,
  };
}

export async function rollbackImportBatch(
  batchId: string,
  performedBy: string = 'admin'
): Promise<{ success: boolean; deletedMcqCount: number; deletedWrittenCount: number; message: string }> {
  if (!batchId) {
    throw new Error('রোলব্যাক এর জন্য বৈধ batchId আবশ্যক।');
  }

  const activePool = getPgPool();
  if (isPostgresActive() && activePool) {
    const client = await activePool.connect();
    try {
      await client.query('BEGIN');

      const mcqDel = await client.query('DELETE FROM questions WHERE import_batch_id = $1', [batchId]);
      const writtenDel = await client.query('DELETE FROM written_questions WHERE import_batch_id = $1', [batchId]);

      const deletedMcqCount = mcqDel.rowCount || 0;
      const deletedWrittenCount = writtenDel.rowCount || 0;

      // Recalculate topic & chapter counters
      await client.query(`
        UPDATE topics t
        SET 
          mcq_count = (SELECT COUNT(*)::int FROM questions q WHERE q.topic_id = t.id),
          written_count = (SELECT COUNT(*)::int FROM written_questions w WHERE w.topic_id = t.id),
          total_questions = (SELECT COUNT(*)::int FROM questions q WHERE q.topic_id = t.id) + (SELECT COUNT(*)::int FROM written_questions w WHERE w.topic_id = t.id);

        UPDATE chapters c
        SET total_topics = (SELECT COUNT(*)::int FROM topics t WHERE t.chapter_id = c.id);
      `);

      // Audit log entry
      const auditId = `audit_rollback_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await client.query(
        `INSERT INTO taxonomy_audit_logs (id, action, entity_type, entity_id, details, performed_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          auditId,
          'bulk_import_rollback',
          'import_batch',
          batchId,
          JSON.stringify({ deletedMcqCount, deletedWrittenCount, batchId }),
          performedBy,
          Date.now(),
        ]
      );

      await client.query('COMMIT');
      logger.info(`[ImportService] Rollback batch ${batchId} success: ${deletedMcqCount} MCQ, ${deletedWrittenCount} written deleted.`);

      return {
        success: true,
        deletedMcqCount,
        deletedWrittenCount,
        message: `ব্যাচ '${batchId}' এর ইমপোর্ট সফলভাবে রোলব্যাক করা হয়েছে। (${deletedMcqCount} MCQ ও ${deletedWrittenCount} Written মুছে ফেলা হয়েছে)`,
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      logger.error(`[ImportService] Rollback batch ${batchId} failed: ${err.message}`);
      throw new Error(`ইমপোর্ট রোলব্যাক ব্যর্থ: ${err.message}`);
    } finally {
      client.release();
    }
  }

  // Fallback memory store rollback
  let deletedMcqCount = 0;
  for (const [id, q] of Array.from(memoryStore.questions.entries())) {
    if ((q as any).import_batch_id === batchId) {
      memoryStore.questions.delete(id);
      deletedMcqCount++;
    }
  }

  return {
    success: true,
    deletedMcqCount,
    deletedWrittenCount: 0,
    message: `মেমোরি থেকে ব্যাচ '${batchId}' রোলব্যাক করা হয়েছে (${deletedMcqCount} প্রশ্ন ডিলিট)`,
  };
}
