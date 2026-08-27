/**
 * Taxonomy Referential Integrity & Consistency Engine
 * Checks three-level chain:
 * 1. subject_id exists in subjects table
 * 2. chapter_id exists AND chapter.subject_id === row.subject_id
 * 3. topic_id (if provided) exists AND topic.chapter_id === row.chapter_id
 */

export interface TaxonomyConsistencyResult {
  isHardMismatch: boolean;
  isSoftMismatch: boolean;
  mismatchType?: 'subject_invalid' | 'chapter_invalid' | 'chapter_subject_mismatch' | 'topic_chapter_mismatch';
  reason?: string;
  suggestedAction?: 'reject' | 're_resolve_or_orphan' | 'valid';
  resolvedTopicId?: string | null;
  resolvedTopicName?: string | null;
  actualParentChapterId?: string | null;
}

export function validateTaxonomyConsistency(
  row: {
    subject_id?: string;
    chapter_id?: string;
    topic_id?: string;
    topic_name?: string;
    topic?: string;
  },
  context: {
    subjects: Array<{ id: string; name?: string; bangla_name?: string }>;
    chapters: Array<{ id: string; subject_id: string; name?: string; bangla_name?: string }>;
    topics: Array<{ id: string; chapter_id: string; subject_id?: string; name?: string; bangla_name?: string }>;
  }
): TaxonomyConsistencyResult {
  const subId = row.subject_id?.trim();
  const chapId = row.chapter_id?.trim();
  const topId = row.topic_id?.trim();
  const topName = (row.topic_name || row.topic)?.trim();

  // 1. Check subject_id existence
  const existingSubject = subId
    ? context.subjects.find((s) => s.id.toLowerCase() === subId.toLowerCase())
    : null;

  if (subId && !existingSubject) {
    return {
      isHardMismatch: true,
      isSoftMismatch: false,
      mismatchType: 'subject_invalid',
      reason: `বিষয় ID '${subId}' ডাটাবেজে পাওয়া যায়নি।`,
      suggestedAction: 'reject',
    };
  }

  // 2. Check chapter_id existence and chapter.subject_id === row.subject_id
  const existingChapter = chapId
    ? context.chapters.find((c) => c.id.toLowerCase() === chapId.toLowerCase())
    : null;

  if (chapId && !existingChapter) {
    return {
      isHardMismatch: true,
      isSoftMismatch: false,
      mismatchType: 'chapter_invalid',
      reason: `অধ্যায় ID '${chapId}' ডাটাবেজে পাওয়া যায়নি।`,
      suggestedAction: 'reject',
    };
  }

  if (existingChapter && subId && existingChapter.subject_id.toLowerCase() !== subId.toLowerCase()) {
    return {
      isHardMismatch: true,
      isSoftMismatch: false,
      mismatchType: 'chapter_subject_mismatch',
      reason: `অধ্যায় '${chapId}' বিষয় '${existingChapter.subject_id}'-এর অধীনে, কিন্তু রো-তে বিষয় দেওয়া আছে '${subId}'।`,
      suggestedAction: 'reject',
    };
  }

  // 3. Check topic_id (if provided) consistency: topic.chapter_id === row.chapter_id
  if (topId) {
    const existingTopic = context.topics.find((t) => t.id.toLowerCase() === topId.toLowerCase());

    if (existingTopic && chapId && existingTopic.chapter_id.toLowerCase() !== chapId.toLowerCase()) {
      // SOFT MISMATCH: topic_id exists, but belongs to a DIFFERENT chapter!
      const actualChapter = existingTopic.chapter_id;
      let reResolvedTopic: any = null;

      // Attempt silent drop & re-resolve using topic_name under row.chapter_id
      if (topName && chapId) {
        const normName = topName.toLowerCase().replace(/[\s\-_,\.\:\(\)\[\]]+/g, '');
        reResolvedTopic = context.topics.find((t) => {
          if (t.chapter_id.toLowerCase() !== chapId.toLowerCase()) return false;
          const tName = (t.bangla_name || t.name || '').toLowerCase().replace(/[\s\-_,\.\:\(\)\[\]]+/g, '');
          return (
            tName.length > 0 &&
            (tName === normName || tName.includes(normName) || normName.includes(tName))
          );
        });
      }

      const reasonMsg = `CSV-তে topic_id '${topId}' দেওয়া আছে কিন্তু chapter_id '${chapId}'-এ, প্রকৃতপক্ষে এই topic '${actualChapter}'-এর অধীনে।`;

      if (reResolvedTopic) {
        return {
          isHardMismatch: false,
          isSoftMismatch: true,
          mismatchType: 'topic_chapter_mismatch',
          reason: `${reasonMsg} স্বয়ংক্রিয়ভাবে অধ্যায় '${chapId}'-এর অধীনস্থ টপিক '${reResolvedTopic.id}' (${reResolvedTopic.bangla_name || reResolvedTopic.name}) দিয়ে পুনঃনির্ধারণ করা হয়েছে।`,
          suggestedAction: 're_resolve_or_orphan',
          resolvedTopicId: reResolvedTopic.id,
          resolvedTopicName: reResolvedTopic.bangla_name || reResolvedTopic.name || reResolvedTopic.id,
          actualParentChapterId: actualChapter,
        };
      } else {
        return {
          isHardMismatch: false,
          isSoftMismatch: true,
          mismatchType: 'topic_chapter_mismatch',
          reason: `${reasonMsg} অধ্যায় '${chapId}'-এ '${topName || topId}' নামে কোনো টপিক না থাকায় topic_id খালি (pending assignment) রাখা হলো।`,
          suggestedAction: 're_resolve_or_orphan',
          resolvedTopicId: null,
          resolvedTopicName: topName || null,
          actualParentChapterId: actualChapter,
        };
      }
    }
  }

  // No taxonomy mismatch
  return {
    isHardMismatch: false,
    isSoftMismatch: false,
    suggestedAction: 'valid',
  };
}
