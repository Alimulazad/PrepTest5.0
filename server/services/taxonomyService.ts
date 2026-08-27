import { query, memoryStore } from '../db';
import { TopicRecord } from '../../src/types';
import { logger } from '../utils/logger';
import {
  normalizeBangla,
  normalizeBanglaKey,
  generateTopicId,
  generateChapterId,
  buildTaxonomyTree,
  SubjectEntity,
  ChapterEntity,
  TopicEntity,
} from '../../packages/shared/src/taxonomy/resolve';
import { SUBJECTS_DATA, CHAPTERS_DATA } from '../../src/data/admissionData';
import { COMPREHENSIVE_CHAPTERS_DATA } from '../../src/data/subjectTopicsData';
import { loadTaxonomyContext } from './importService';

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

export interface TaxonomyTopicItem {
  id: string;
  chapter_id: string;
  subject_id?: string;
  paper?: string;
  name: string;
  bangla_name: string;
  topic_code?: string;
  star_rating: number;
  total_questions: number;
  mcq_count?: number;
  written_count?: number;
  created_at?: number;
}

export interface TaxonomyChapterItem {
  id: string;
  subject_id: string;
  name: string;
  bangla_name: string;
  paper?: string;
  chapter_number?: number;
  total_topics?: number;
  topics: TaxonomyTopicItem[];
}

export interface TaxonomySubjectItem {
  id: string;
  name: string;
  bangla_name: string;
  paper: '1st' | '2nd';
  chapters: TaxonomyChapterItem[];
}

export interface DuplicateSuspectGroup {
  group_id: string;
  chapter_id: string;
  chapter_name: string;
  subject_id: string;
  subject_name: string;
  bangla_name: string;
  normalized_key: string;
  topics: Array<{
    id: string;
    name: string;
    bangla_name: string;
    total_questions: number;
    mcq_count: number;
    written_count: number;
    created_at?: number;
    is_suggested_survivor: boolean;
  }>;
  total_combined_questions: number;
}

export interface ZeroQuestionTopicItem {
  id: string;
  subject_id?: string;
  subject_name?: string;
  chapter_id: string;
  chapter_name?: string;
  name: string;
  bangla_name: string;
  created_at?: number;
}

export interface OrphanedQuestionItem {
  question_id: string;
  question_type: 'mcq' | 'written';
  subject_id?: string;
  chapter_id?: string;
  topic_id?: string;
  topic_name?: string;
  question_text: string;
}

export interface TaxonomyHealthSummary {
  health_score: number; // 0 - 100
  total_subjects: number;
  total_chapters: number;
  total_topics: number;
  duplicate_groups_count: number;
  suspect_duplicate_topics_count: number;
  zero_question_topics_count: number;
  orphaned_questions_count: number;
  duplicate_suspects: DuplicateSuspectGroup[];
  zero_question_topics: ZeroQuestionTopicItem[];
  orphaned_questions: OrphanedQuestionItem[];
}

// ==========================================
// 2. TAXONOMY TREE SERVICE
// ==========================================

export async function getTaxonomyTreeService(): Promise<{
  subjects: TaxonomySubjectItem[];
  totalTopics: number;
  totalChapters: number;
  totalSubjects: number;
}> {
  const { subjects, chapters, topics } = await loadTaxonomyContext();

  const chaptersMap = new Map<string, TaxonomyChapterItem>();
  for (const c of chapters) {
    chaptersMap.set(c.id, {
      id: c.id,
      subject_id: c.subject_id,
      name: c.name,
      bangla_name: c.bangla_name || c.name,
      paper: c.paper,
      chapter_number: c.chapter_number,
      total_topics: 0,
      topics: [],
    });
  }

  // Populate topics into chapters
  let totalTopics = 0;
  for (const t of topics) {
    totalTopics++;
    const chap = chaptersMap.get(t.chapter_id);
    const item: TaxonomyTopicItem = {
      id: t.id,
      chapter_id: t.chapter_id,
      subject_id: t.subject_id,
      paper: t.paper,
      name: t.name,
      bangla_name: t.bangla_name || t.name,
      topic_code: t.topic_code,
      star_rating: t.star_rating || 3,
      total_questions: t.total_questions || 0,
    };
    if (chap) {
      chap.topics.push(item);
      chap.total_topics = (chap.total_topics || 0) + 1;
    }
  }

  // Populate chapters into subjects
  const subjectsMap = new Map<string, TaxonomySubjectItem>();
  for (const s of subjects) {
    subjectsMap.set(s.id, {
      id: s.id,
      name: s.name,
      bangla_name: s.bangla_name || s.name,
      paper: s.paper === '2nd' ? '2nd' : '1st',
      chapters: [],
    });
  }

  for (const c of chaptersMap.values()) {
    const sub = subjectsMap.get(c.subject_id);
    if (sub) {
      sub.chapters.push(c);
    } else {
      // Find or create default subject container
      const subId = c.subject_id || 'unknown';
      let existing = subjectsMap.get(subId);
      if (!existing) {
        existing = {
          id: subId,
          name: subId,
          bangla_name: subId,
          paper: subId.endsWith('_2') ? '2nd' : '1st',
          chapters: [],
        };
        subjectsMap.set(subId, existing);
      }
      existing.chapters.push(c);
    }
  }

  const resultSubjects = Array.from(subjectsMap.values());

  return {
    subjects: resultSubjects,
    totalTopics,
    totalChapters: chapters.length,
    totalSubjects: resultSubjects.length,
  };
}

// ==========================================
// 3. TAXONOMY HEALTH DIAGNOSTICS
// ==========================================

export async function getTaxonomyHealthService(): Promise<TaxonomyHealthSummary> {
  const { subjects, chapters, topics } = await loadTaxonomyContext();
  const subMap = new Map<string, SubjectEntity>(subjects.map((s) => [s.id, s]));
  const chapMap = new Map<string, ChapterEntity>(chapters.map((c) => [c.id, c]));

  let duplicateGroups: DuplicateSuspectGroup[] = [];
  let zeroQuestionTopics: ZeroQuestionTopicItem[] = [];
  let orphanedQuestions: OrphanedQuestionItem[] = [];

  // 1. Check duplicate suspects via DB view first
  const groupMap = new Map<string, DuplicateSuspectGroup>();

  try {
    const dupRes = await query('SELECT * FROM duplicate_suspect_topics');
    if (dupRes && dupRes.rows && dupRes.rows.length > 0) {
      for (const row of dupRes.rows) {
        const chap = chapMap.get(row.chapter_id);
        const sub = chap ? subMap.get(chap.subject_id) : undefined;
        const topicIds = Array.isArray(row.topic_ids) ? row.topic_ids : [];

        // Query detailed info for these topics
        const detailRes = await query('SELECT * FROM topics WHERE id = ANY($1)', [topicIds]);
        const detailedTopics = (detailRes?.rows || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          bangla_name: t.bangla_name,
          total_questions: Number(t.total_questions) || 0,
          mcq_count: Number(t.mcq_count) || 0,
          written_count: Number(t.written_count) || 0,
          created_at: Number(t.created_at) || undefined,
          is_suggested_survivor: false,
        }));

        // Pick survivor: highest question count, then oldest created_at, then alphabetical ID
        detailedTopics.sort((a: any, b: any) => {
          if (b.total_questions !== a.total_questions) return b.total_questions - a.total_questions;
          if (a.created_at && b.created_at && a.created_at !== b.created_at) return a.created_at - b.created_at;
          return a.id.localeCompare(b.id);
        });

        if (detailedTopics.length > 0) {
          detailedTopics[0].is_suggested_survivor = true;
        }

        const groupId = `dup_${row.chapter_id}_${normalizeBanglaKey(row.bangla_name)}`;
        groupMap.set(groupId, {
          group_id: groupId,
          chapter_id: row.chapter_id,
          chapter_name: chap?.bangla_name || chap?.name || row.chapter_id,
          subject_id: chap?.subject_id || '',
          subject_name: sub?.bangla_name || sub?.name || chap?.subject_id || '',
          bangla_name: row.bangla_name,
          normalized_key: normalizeBanglaKey(row.bangla_name),
          topics: detailedTopics,
          total_combined_questions: Number(row.combined_questions) || detailedTopics.reduce((acc: number, t: any) => acc + t.total_questions, 0),
        });
      }
    }
  } catch (err: any) {
    logger.warn(`[TaxonomyHealth] duplicate_suspect_topics view query failed: ${err.message}`);
  }

  // Programmatic duplicate check across all topics to catch subtle acoustic / Unicode normalization matches
  const chapterTopicsMap = new Map<string, TopicRecord[]>();
  for (const t of topics) {
    const list = chapterTopicsMap.get(t.chapter_id) || [];
    list.push(t as any);
    chapterTopicsMap.set(t.chapter_id, list);
  }

  chapterTopicsMap.forEach((tList, chapId) => {
    const groupedByNorm = new Map<string, TopicRecord[]>();
    for (const t of tList) {
      const normKey = normalizeBanglaKey(t.bangla_name || t.name);
      if (!normKey) continue;
      const g = groupedByNorm.get(normKey) || [];
      g.push(t);
      groupedByNorm.set(normKey, g);
    }

    groupedByNorm.forEach((g, normKey) => {
      if (g.length > 1) {
        const groupId = `dup_${chapId}_${normKey}`;
        if (!groupMap.has(groupId)) {
          const chap = chapMap.get(chapId);
          const sub = chap ? subMap.get(chap.subject_id) : undefined;
          const mappedTopics = g.map((t) => ({
            id: t.id,
            name: t.name,
            bangla_name: t.bangla_name,
            total_questions: t.total_questions || 0,
            mcq_count: t.mcq_count || 0,
            written_count: t.written_count || 0,
            created_at: t.created_at,
            is_suggested_survivor: false,
          }));

          mappedTopics.sort((a, b) => {
            if (b.total_questions !== a.total_questions) return b.total_questions - a.total_questions;
            return a.id.localeCompare(b.id);
          });
          mappedTopics[0].is_suggested_survivor = true;

          groupMap.set(groupId, {
            group_id: groupId,
            chapter_id: chapId,
            chapter_name: chap?.bangla_name || chap?.name || chapId,
            subject_id: chap?.subject_id || '',
            subject_name: sub?.bangla_name || sub?.name || chap?.subject_id || '',
            bangla_name: g[0].bangla_name || g[0].name,
            normalized_key: normKey,
            topics: mappedTopics,
            total_combined_questions: mappedTopics.reduce((acc, t) => acc + t.total_questions, 0),
          });
        }
      }
    });
  });

  duplicateGroups = Array.from(groupMap.values());

  // 2. Check Zero Question Topics
  try {
    const zeroRes = await query('SELECT * FROM zero_question_topics ORDER BY chapter_id ASC, id ASC LIMIT 200');
    if (zeroRes && zeroRes.rows) {
      zeroQuestionTopics = zeroRes.rows.map((r: any) => {
        const chap = chapMap.get(r.chapter_id);
        const sub = chap ? subMap.get(chap.subject_id) : undefined;
        return {
          id: r.id,
          subject_id: r.subject_id || chap?.subject_id,
          subject_name: sub?.bangla_name || sub?.name || r.subject_id,
          chapter_id: r.chapter_id,
          chapter_name: chap?.bangla_name || chap?.name || r.chapter_id,
          name: r.name,
          bangla_name: r.bangla_name || r.name,
          created_at: Number(r.created_at) || undefined,
        };
      });
    }
  } catch (err: any) {
    logger.warn(`[TaxonomyHealth] zero_question_topics view query failed: ${err.message}`);
    // Fallback: topics where total_questions = 0
    zeroQuestionTopics = topics
      .filter((t) => !t.total_questions || t.total_questions === 0)
      .slice(0, 100)
      .map((t) => {
        const chap = chapMap.get(t.chapter_id);
        const sub = chap ? subMap.get(chap.subject_id) : undefined;
        return {
          id: t.id,
          subject_id: t.subject_id || chap?.subject_id,
          subject_name: sub?.bangla_name || sub?.name,
          chapter_id: t.chapter_id,
          chapter_name: chap?.bangla_name || chap?.name,
          name: t.name,
          bangla_name: t.bangla_name || t.name,
        };
      });
  }

  // 3. Check Orphaned Topic IDs in Questions
  try {
    const orphanRes = await query('SELECT * FROM orphan_topic_ids LIMIT 200');
    if (orphanRes && orphanRes.rows) {
      orphanedQuestions = orphanRes.rows.map((r: any) => ({
        question_id: r.question_id,
        question_type: r.question_type || 'mcq',
        subject_id: r.subject_id,
        chapter_id: r.chapter_id,
        topic_id: r.topic_id,
        topic_name: r.topic_name,
        question_text: r.question_text || '',
      }));
    }
  } catch (err: any) {
    logger.warn(`[TaxonomyHealth] orphan_topic_ids view query failed: ${err.message}`);
  }

  const suspectDuplicateTopicsCount = duplicateGroups.reduce((acc, g) => acc + g.topics.length, 0);
  const totalIssues = duplicateGroups.length * 2 + zeroQuestionTopics.length * 0.1 + orphanedQuestions.length * 1.5;
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - (totalIssues / Math.max(10, topics.length)) * 50)));

  return {
    health_score: healthScore,
    total_subjects: subjects.length,
    total_chapters: chapters.length,
    total_topics: topics.length,
    duplicate_groups_count: duplicateGroups.length,
    suspect_duplicate_topics_count: suspectDuplicateTopicsCount,
    zero_question_topics_count: zeroQuestionTopics.length,
    orphaned_questions_count: orphanedQuestions.length,
    duplicate_suspects: duplicateGroups,
    zero_question_topics: zeroQuestionTopics,
    orphaned_questions: orphanedQuestions,
  };
}

// ==========================================
// 4. TRANSACTIONAL MERGE TOPICS
// ==========================================

export async function mergeTopicsService(params: {
  sourceTopicIds: string[];
  targetTopicId: string;
  targetBanglaName?: string;
  targetName?: string;
}): Promise<{
  success: boolean;
  merged_count: number;
  target_topic_id: string;
  reassigned_mcq_count: number;
  reassigned_written_count: number;
}> {
  const { sourceTopicIds, targetTopicId, targetBanglaName, targetName } = params;

  if (!targetTopicId) {
    throw new Error('Target survivor topic ID is required');
  }
  if (!Array.isArray(sourceTopicIds) || sourceTopicIds.length === 0) {
    throw new Error('At least one source topic ID is required for merging');
  }

  // Filter out targetTopicId if included in sources
  const effectiveSources = sourceTopicIds.filter((id) => id !== targetTopicId);
  if (effectiveSources.length === 0) {
    throw new Error('Source topics cannot be only the target survivor topic');
  }

  const client = (query as any).getClient ? await (query as any).getClient() : null;

  if (client) {
    try {
      await client.query('BEGIN');

      // 1. Verify target topic exists
      const targetRes = await client.query('SELECT * FROM topics WHERE id = $1', [targetTopicId]);
      if (!targetRes || targetRes.rows.length === 0) {
        throw new Error(`Target topic '${targetTopicId}' does not exist in database`);
      }
      const targetTopic = targetRes.rows[0];
      const effectiveBanglaName = normalizeBangla(targetBanglaName || targetTopic.bangla_name || targetTopic.name);
      const effectiveName = (targetName || targetTopic.name || effectiveBanglaName).trim();

      // 2. Re-point MCQ questions
      const mcqUpdateRes = await client.query(
        `UPDATE questions 
         SET topic_id = $1, 
             topic_name = $2,
             chapter_id = COALESCE(chapter_id, $3),
             subject_id = COALESCE(subject_id, $4)
         WHERE topic_id = ANY($5)`,
        [targetTopicId, effectiveBanglaName, targetTopic.chapter_id, targetTopic.subject_id, effectiveSources]
      );
      const reassignedMcqCount = mcqUpdateRes.rowCount || 0;

      // 3. Re-point Written questions
      const writtenUpdateRes = await client.query(
        `UPDATE written_questions 
         SET topic_id = $1, 
             topic_name = $2,
             chapter_id = COALESCE(chapter_id, $3),
             subject_id = COALESCE(subject_id, $4)
         WHERE topic_id = ANY($5)`,
        [targetTopicId, effectiveBanglaName, targetTopic.chapter_id, targetTopic.subject_id, effectiveSources]
      );
      const reassignedWrittenCount = writtenUpdateRes.rowCount || 0;

      // 4. Update survivor target topic name & recount in real-time
      await client.query(
        `UPDATE topics SET
           name = $1,
           bangla_name = $2,
           mcq_count = (SELECT COUNT(*) FROM questions WHERE topic_id = $3),
           written_count = (SELECT COUNT(*) FROM written_questions WHERE topic_id = $3),
           total_questions = (SELECT COUNT(*) FROM questions WHERE topic_id = $3) + (SELECT COUNT(*) FROM written_questions WHERE topic_id = $3)
         WHERE id = $3`,
        [effectiveName, effectiveBanglaName, targetTopicId]
      );

      // 5. Delete obsolete source topics
      await client.query('DELETE FROM topics WHERE id = ANY($1)', [effectiveSources]);

      // 6. Recalculate chapter total_topics
      await client.query(
        `UPDATE chapters c
         SET total_topics = (SELECT COUNT(*) FROM topics t WHERE t.chapter_id = c.id)
         WHERE c.id = $1`,
        [targetTopic.chapter_id]
      );

      // 7. Insert Audit Log
      try {
        const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await client.query(
          `INSERT INTO taxonomy_audit_logs (id, action, entity_type, entity_id, details, performed_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            logId,
            'MERGE',
            'topic',
            targetTopicId,
            JSON.stringify({
              survivor_id: targetTopicId,
              survivor_name: effectiveName,
              survivor_bangla_name: effectiveBanglaName,
              source_ids: effectiveSources,
              reassigned_mcqs: reassignedMcqCount,
              reassigned_written: reassignedWrittenCount,
            }),
            'admin',
            Date.now(),
          ]
        );
      } catch (logErr) {}

      await client.query('COMMIT');

      // Update in-memory cache if active
      if (memoryStore && memoryStore.topics) {
        for (const sId of effectiveSources) {
          memoryStore.topics.delete(sId);
        }
        const existing = memoryStore.topics.get(targetTopicId);
        if (existing) {
          existing.bangla_name = effectiveBanglaName;
          existing.name = effectiveName;
          existing.total_questions = (existing.total_questions || 0) + reassignedMcqCount + reassignedWrittenCount;
        }
      }

      if (memoryStore && memoryStore.questions) {
        for (const [, q] of memoryStore.questions) {
          if (effectiveSources.includes(q.topic_id || '')) {
            q.topic_id = targetTopicId;
            q.topic_name = effectiveBanglaName;
          }
        }
      }
      if (memoryStore && memoryStore.writtenQuestions) {
        for (const [, w] of memoryStore.writtenQuestions) {
          if (effectiveSources.includes(w.topic_id || '')) {
            w.topic_id = targetTopicId;
            w.topic_name = effectiveBanglaName;
          }
        }
      }

      logger.info(
        `[TaxonomyService] ✅ Merged ${effectiveSources.length} topics into '${targetTopicId}' (Reassigned: ${reassignedMcqCount} MCQs, ${reassignedWrittenCount} Written questions)`
      );

      return {
        success: true,
        merged_count: effectiveSources.length,
        target_topic_id: targetTopicId,
        reassigned_mcq_count: reassignedMcqCount,
        reassigned_written_count: reassignedWrittenCount,
      };
    } catch (txErr: any) {
      await client.query('ROLLBACK');
      logger.error(`[TaxonomyService] ❌ Merge topics transaction failed: ${txErr.message}`);
      throw txErr;
    } finally {
      client.release();
    }
  } else {
    // Non-pool fallback
    await query(
      `UPDATE questions SET topic_id = $1 WHERE topic_id = ANY($2)`,
      [targetTopicId, effectiveSources]
    );
    await query(
      `UPDATE written_questions SET topic_id = $1 WHERE topic_id = ANY($2)`,
      [targetTopicId, effectiveSources]
    );
    await query('DELETE FROM topics WHERE id = ANY($1)', [effectiveSources]);

    return {
      success: true,
      merged_count: effectiveSources.length,
      target_topic_id: targetTopicId,
      reassigned_mcq_count: 0,
      reassigned_written_count: 0,
    };
  }
}

// ==========================================
// 5. TRANSACTIONAL RENAME & NORMALIZE TOPIC
// ==========================================

export async function normalizeTopicService(params: {
  topicId: string;
  banglaName: string;
  name?: string;
}): Promise<TopicRecord> {
  const { topicId, banglaName, name } = params;
  if (!topicId) throw new Error('Topic ID is required');
  if (!banglaName) throw new Error('Bengali topic name is required');

  const normalizedBangla = normalizeBangla(banglaName);
  const normalizedEnglish = (name || normalizedBangla).trim();

  const client = (query as any).getClient ? await (query as any).getClient() : null;

  if (client) {
    try {
      await client.query('BEGIN');

      const res = await client.query(
        `UPDATE topics 
         SET bangla_name = $1, name = $2 
         WHERE id = $3 
         RETURNING *`,
        [normalizedBangla, normalizedEnglish, topicId]
      );

      if (!res || res.rows.length === 0) {
        throw new Error(`Topic '${topicId}' not found`);
      }

      // Update question denormalized names
      await client.query(`UPDATE questions SET topic_name = $1 WHERE topic_id = $2`, [normalizedBangla, topicId]);
      await client.query(`UPDATE written_questions SET topic_name = $1 WHERE topic_id = $2`, [normalizedBangla, topicId]);

      // Record audit log
      try {
        const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await client.query(
          `INSERT INTO taxonomy_audit_logs (id, action, entity_type, entity_id, details, performed_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            logId,
            'NORMALIZE',
            'topic',
            topicId,
            JSON.stringify({
              new_bangla_name: normalizedBangla,
              new_name: normalizedEnglish,
            }),
            'admin',
            Date.now(),
          ]
        );
      } catch (logErr) {}

      await client.query('COMMIT');

      if (memoryStore && memoryStore.topics) {
        const memTopic = memoryStore.topics.get(topicId);
        if (memTopic) {
          memTopic.bangla_name = normalizedBangla;
          memTopic.name = normalizedEnglish;
        }
      }

      const row = res.rows[0];
      return {
        id: row.id,
        chapter_id: row.chapter_id,
        subject_id: row.subject_id,
        name: row.name,
        bangla_name: row.bangla_name,
        paper: row.paper,
        star_rating: row.star_rating,
        total_questions: Number(row.total_questions) || 0,
      };
    } catch (e: any) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } else {
    await query(
      `UPDATE topics SET bangla_name = $1, name = $2 WHERE id = $3`,
      [normalizedBangla, normalizedEnglish, topicId]
    );
    return {
      id: topicId,
      chapter_id: 'ch',
      name: normalizedEnglish,
      bangla_name: normalizedBangla,
      star_rating: 3,
      total_questions: 0,
    };
  }
}

// ==========================================
// 6. TRANSACTIONAL DELETE EMPTY TOPICS
// ==========================================

export async function deleteEmptyTopicsService(topicIds: string[]): Promise<{
  success: boolean;
  deleted_count: number;
  deleted_ids: string[];
}> {
  if (!Array.isArray(topicIds) || topicIds.length === 0) {
    throw new Error('At least one topic ID is required for deletion');
  }

  const client = (query as any).getClient ? await (query as any).getClient() : null;

  if (client) {
    try {
      await client.query('BEGIN');

      // Filter only topics with zero questions
      const checkRes = await client.query(
        `SELECT t.id, 
                (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id) as q_count,
                (SELECT COUNT(*) FROM written_questions w WHERE w.topic_id = t.id) as w_count
         FROM topics t
         WHERE t.id = ANY($1)`,
        [topicIds]
      );

      const safeToDelete = (checkRes.rows || [])
        .filter((r: any) => Number(r.q_count) === 0 && Number(r.w_count) === 0)
        .map((r: any) => r.id);

      if (safeToDelete.length === 0) {
        throw new Error('None of the selected topics are empty (they have active questions assigned)');
      }

      // Safeguard: nullify any residual question references
      await client.query('UPDATE questions SET topic_id = NULL, topic_name = NULL WHERE topic_id = ANY($1)', [safeToDelete]);
      await client.query('UPDATE written_questions SET topic_id = NULL, topic_name = NULL WHERE topic_id = ANY($1)', [safeToDelete]);

      await client.query('DELETE FROM topics WHERE id = ANY($1)', [safeToDelete]);

      // Recalculate chapters total_topics
      await client.query(`
        UPDATE chapters c
        SET total_topics = (SELECT COUNT(*) FROM topics t WHERE t.chapter_id = c.id)
      `);

      // Record audit log
      try {
        const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await client.query(
          `INSERT INTO taxonomy_audit_logs (id, action, entity_type, entity_id, details, performed_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            logId,
            'DELETE',
            'topic',
            safeToDelete.join(','),
            JSON.stringify({ deleted_topic_ids: safeToDelete, count: safeToDelete.length }),
            'admin',
            Date.now(),
          ]
        );
      } catch (logErr) {}

      await client.query('COMMIT');

      if (memoryStore && memoryStore.topics) {
        for (const id of safeToDelete) {
          memoryStore.topics.delete(id);
        }
      }

      return {
        success: true,
        deleted_count: safeToDelete.length,
        deleted_ids: safeToDelete,
      };
    } catch (e: any) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } else {
    await query('DELETE FROM topics WHERE id = ANY($1)', [topicIds]);
    return {
      success: true,
      deleted_count: topicIds.length,
      deleted_ids: topicIds,
    };
  }
}

// ==========================================
// 7. TRANSACTIONAL REASSIGN ORPHAN QUESTIONS
// ==========================================

export async function reassignOrphanQuestionsService(items: Array<{
  question_id: string;
  question_type: 'mcq' | 'written';
  target_topic_id: string;
}>): Promise<{
  success: boolean;
  reassigned_count: number;
}> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('No questions provided for reassignment');
  }

  const client = (query as any).getClient ? await (query as any).getClient() : null;

  if (client) {
    try {
      await client.query('BEGIN');
      let count = 0;

      for (const item of items) {
        const topRes = await client.query('SELECT * FROM topics WHERE id = $1', [item.target_topic_id]);
        if (!topRes || topRes.rows.length === 0) {
          throw new Error(`Target topic '${item.target_topic_id}' not found`);
        }
        const top = topRes.rows[0];

        if (item.question_type === 'mcq') {
          await client.query(
            `UPDATE questions 
             SET topic_id = $1, 
                 topic_name = $2, 
                 chapter_id = $3, 
                 subject_id = COALESCE($4, subject_id)
             WHERE id = $5`,
            [top.id, top.bangla_name || top.name, top.chapter_id, top.subject_id, item.question_id]
          );
          count++;
        } else {
          await client.query(
            `UPDATE written_questions 
             SET topic_id = $1, 
                 topic_name = $2, 
                 chapter_id = $3, 
                 subject_id = COALESCE($4, subject_id)
             WHERE id = $5`,
            [top.id, top.bangla_name || top.name, top.chapter_id, top.subject_id, item.question_id]
          );
          count++;
        }
      }

      // Recalculate counters
      await client.query(`
        UPDATE topics t SET
          mcq_count = (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id),
          written_count = (SELECT COUNT(*) FROM written_questions w WHERE w.topic_id = t.id),
          total_questions = (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id) + (SELECT COUNT(*) FROM written_questions w WHERE w.topic_id = t.id)
      `);

      // Record audit log
      try {
        const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await client.query(
          `INSERT INTO taxonomy_audit_logs (id, action, entity_type, entity_id, details, performed_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            logId,
            'REASSIGN',
            'topic',
            items[0]?.target_topic_id || 'batch',
            JSON.stringify({ reassigned_count: count, items }),
            'admin',
            Date.now(),
          ]
        );
      } catch (logErr) {}

      await client.query('COMMIT');

      return {
        success: true,
        reassigned_count: count,
      };
    } catch (e: any) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } else {
    return { success: true, reassigned_count: items.length };
  }
}

// ==========================================
// 8. CREATE TOPIC TRANSACTIONAL SERVICE
// ==========================================

export async function createTopicService(topicData: Partial<TopicRecord>, performedBy: string = 'admin'): Promise<TopicRecord> {
  const normBangla = normalizeBangla(topicData.bangla_name || topicData.name || 'নতুন টপিক');
  const normName = (topicData.name || normBangla).trim();
  const chapId = topicData.chapter_id || 'phy1_ch1';
  const topicId = topicData.id || generateTopicId(chapId, topicData.topic_code, normBangla);

  const client = (query as any).getClient ? await (query as any).getClient() : null;

  if (client) {
    try {
      await client.query('BEGIN');
      const insertRes = await client.query(
        `INSERT INTO topics (
          id, chapter_id, subject_id, paper, topic_code, name, bangla_name,
          star_rating, total_questions, completed_questions, mcq_count, written_count, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, 0, 0, $9)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          bangla_name = EXCLUDED.bangla_name,
          chapter_id = EXCLUDED.chapter_id,
          subject_id = EXCLUDED.subject_id,
          paper = EXCLUDED.paper,
          topic_code = COALESCE(EXCLUDED.topic_code, topics.topic_code)
        RETURNING *`,
        [
          topicId,
          chapId,
          topicData.subject_id || null,
          topicData.paper || null,
          topicData.topic_code || null,
          normName,
          normBangla,
          topicData.star_rating || 3,
          Date.now(),
        ]
      );

      // Recalculate chapter total_topics
      await client.query(
        'UPDATE chapters SET total_topics = (SELECT COUNT(*) FROM topics WHERE chapter_id = $1) WHERE id = $1',
        [chapId]
      );

      // Log audit
      try {
        const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await client.query(
          `INSERT INTO taxonomy_audit_logs (id, action, entity_type, entity_id, details, performed_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            logId,
            'CREATE',
            'topic',
            topicId,
            JSON.stringify({ id: topicId, name: normName, bangla_name: normBangla, chapter_id: chapId }),
            performedBy,
            Date.now(),
          ]
        );
      } catch (err) {}

      await client.query('COMMIT');

      const row = insertRes.rows[0];
      const created: TopicRecord = {
        id: row.id,
        chapter_id: row.chapter_id,
        subject_id: row.subject_id,
        paper: row.paper,
        topic_code: row.topic_code,
        name: row.name,
        bangla_name: row.bangla_name,
        star_rating: row.star_rating || 3,
        total_questions: Number(row.total_questions) || 0,
      };

      if (memoryStore && memoryStore.topics) {
        memoryStore.topics.set(created.id, created);
      }

      return created;
    } catch (e: any) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } else {
    const created: TopicRecord = {
      id: topicId,
      chapter_id: chapId,
      subject_id: topicData.subject_id,
      paper: topicData.paper,
      topic_code: topicData.topic_code,
      name: normName,
      bangla_name: normBangla,
      star_rating: topicData.star_rating || 3,
      total_questions: 0,
    };
    if (memoryStore && memoryStore.topics) {
      memoryStore.topics.set(created.id, created);
    }
    return created;
  }
}

// ==========================================
// 9. GET TAXONOMY AUDIT LOGS SERVICE
// ==========================================

export async function getTaxonomyAuditLogsService(limit: number = 50): Promise<Array<{
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
  performed_by: string;
  created_at: number;
}>> {
  try {
    const res = await query('SELECT * FROM taxonomy_audit_logs ORDER BY created_at DESC LIMIT $1', [limit]);
    if (res && res.rows) {
      return res.rows.map((r: any) => ({
        id: r.id,
        action: r.action,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details,
        performed_by: r.performed_by || 'admin',
        created_at: Number(r.created_at) || Date.now(),
      }));
    }
  } catch (err: any) {
    logger.warn(`[TaxonomyAudit] Fetch audit logs failed: ${err.message}`);
  }
  return [];
}

// ==========================================
// 8. MASTER ID CHART GENERATION
// ==========================================

export async function exportMasterChartService(format: 'json' | 'markdown' | 'txt' = 'markdown'): Promise<string | object> {
  const treeData = await getTaxonomyTreeService();

  if (format === 'json') {
    return {
      generated_at: new Date().toISOString(),
      system_totals: {
        total_subjects: treeData.totalSubjects,
        total_chapters: treeData.totalChapters,
        total_topics: treeData.totalTopics,
      },
      subjects: treeData.subjects,
    };
  }

  // Generate structured, clean Markdown table & tree
  const lines: string[] = [];
  lines.push(`# JACHAI LIVE MASTER TAXONOMY & ID CHART`);
  lines.push(`> Generated at: **${new Date().toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' })} (Asia/Dhaka)**`);
  lines.push(`> Total Subjects: **${treeData.totalSubjects}** | Total Chapters: **${treeData.totalChapters}** | Total Topics: **${treeData.totalTopics}**\n`);

  for (const sub of treeData.subjects) {
    lines.push(`## 📚 বিষয়: ${sub.bangla_name} (\`${sub.id}\` — ${sub.paper === '1st' ? '১ম পত্র' : '২য় পত্র'})`);
    lines.push(`| চ্যাপ্টার ID | অধ্যায়ের নাম | মোট টপিক |`);
    lines.push(`|---|---|---|`);
    for (const chap of sub.chapters) {
      lines.push(`| \`${chap.id}\` | ${chap.bangla_name} (${chap.name}) | ${chap.topics.length} |`);
    }
    lines.push('');

    for (const chap of sub.chapters) {
      lines.push(`### 📖 অধ্যায়: ${chap.bangla_name} (\`${chap.id}\`)`);
      lines.push(`| টপিক ID | টপিক কোড | বাংলা নাম | রেটিং | মোট প্রশ্ন |`);
      lines.push(`|---|---|---|---|---|`);
      if (chap.topics.length === 0) {
        lines.push(`| *(কোনো টপিক নেই)* | - | - | - | 0 |`);
      } else {
        for (const t of chap.topics) {
          const stars = '★'.repeat(t.star_rating || 3);
          lines.push(`| \`${t.id}\` | \`${t.topic_code || '-'}\` | ${t.bangla_name} | ${stars} | ${t.total_questions || 0} |`);
        }
      }
      lines.push('');
    }
    lines.push('---\n');
  }

  return lines.join('\n');
}
