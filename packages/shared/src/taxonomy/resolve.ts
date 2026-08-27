import { z } from 'zod';

// ==========================================
// 1. SCHEMAS & INTERFACES
// ==========================================

export const SubjectEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  bangla_name: z.string(),
  paper: z.string().optional().default('1st'),
  short_code: z.string().optional(),
});
export type SubjectEntity = z.infer<typeof SubjectEntitySchema>;

export const ChapterEntitySchema = z.object({
  id: z.string(),
  subject_id: z.string(),
  name: z.string(),
  bangla_name: z.string(),
  paper: z.string().optional(),
  chapter_number: z.number().optional(),
});
export type ChapterEntity = z.infer<typeof ChapterEntitySchema>;

export const TopicEntitySchema = z.object({
  id: z.string(),
  chapter_id: z.string(),
  subject_id: z.string().optional(),
  name: z.string(),
  bangla_name: z.string(),
  paper: z.string().optional(),
  topic_code: z.string().optional(),
  star_rating: z.number().optional(),
  total_questions: z.number().optional(),
});
export type TopicEntity = z.infer<typeof TopicEntitySchema>;

export const CandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  bangla_name: z.string(),
  similarity: z.number(),
  reason: z.string().optional(),
});
export type Candidate = z.infer<typeof CandidateSchema>;

export const ResolveSubjectResultSchema = z.object({
  matched: SubjectEntitySchema.nullable(),
  candidates: z.array(CandidateSchema),
  confidence: z.enum(['exact_id', 'exact_name', 'fuzzy_candidate', 'none']),
  message: z.string().optional(),
});
export type ResolveSubjectResult = z.infer<typeof ResolveSubjectResultSchema>;

export const ResolveChapterResultSchema = z.object({
  matched: ChapterEntitySchema.nullable(),
  candidates: z.array(CandidateSchema),
  confidence: z.enum(['exact_id', 'exact_name', 'fuzzy_candidate', 'none']),
  message: z.string().optional(),
});
export type ResolveChapterResult = z.infer<typeof ResolveChapterResultSchema>;

export const ResolveTopicResultSchema = z.object({
  matched: TopicEntitySchema.nullable(),
  candidates: z.array(CandidateSchema),
  confidence: z.enum(['exact_id', 'exact_name', 'fuzzy_candidate', 'none']),
  message: z.string().optional(),
});
export type ResolveTopicResult = z.infer<typeof ResolveTopicResultSchema>;

// ==========================================
// 2. BANGLA UNICODE NORMALIZATION
// ==========================================

/**
 * Normalizes Bengali & general text by:
 * - Converting Unicode to standard NFC form
 * - Removing invisible zero-width chars (ZWJ \u200D, ZWNJ \u200C, ZWSP \u200B, BOM \uFEFF)
 * - Standardizing Bengali Y/Ya/R (e.g. য় vs য়, ড় vs ড়, ঢ় vs ঢ় decomposed vs composed)
 * - Standardizing whitespace (collapsing multi-spaces to single space + trim)
 */
export function normalizeBangla(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .normalize('NFC')
    // Remove Zero-Width Non-Joiner, Zero-Width Joiner, Zero-Width Space, BOM
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Normalize Bengali decomposed characters (য + ় -> য়, ড + ় -> ড়, ঢ + ় -> ঢ়)
    .replace(/\u09AF\u09BC/g, '\u09DF') // য + ় -> য়
    .replace(/\u09A1\u09BC/g, '\u09DC') // ড + ় -> ড়
    .replace(/\u09A2\u09BC/g, '\u09DD') // ঢ + ় -> ঢ়
    // Standardize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips all spaces and punctuation for deep acoustic/character-level equality check
 */
export function normalizeBanglaKey(text: string | null | undefined): string {
  return normalizeBangla(text)
    .toLowerCase()
    .replace(/[^\u0980-\u09FFa-zA-Z0-9]/g, '');
}

/**
 * Calculates Dice's coefficient / bigram similarity between two strings (0.0 to 1.0)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeBangla(str1).toLowerCase();
  const s2 = normalizeBangla(str2).toLowerCase();

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  // Exact match on stripped key
  const k1 = normalizeBanglaKey(s1);
  const k2 = normalizeBanglaKey(s2);
  if (k1 && k1 === k2) return 0.98;

  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return Math.max(0.75, +(minLen / maxLen).toFixed(2));
  }

  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);

  if (b1.size === 0 || b2.size === 0) return 0.0;

  let intersection = 0;
  for (const item of b1) {
    if (b2.has(item)) intersection++;
  }

  return +((2.0 * intersection) / (b1.size + b2.size)).toFixed(2);
}

// ==========================================
// 3. TAXONOMY RESOLUTION FUNCTIONS
// ==========================================

export interface ResolveSubjectInput {
  id?: string;
  name?: string;
  bangla_name?: string;
  paper?: '1st' | '2nd' | '১ম পত্র' | '২য় পত্র' | 'সকল' | string;
  contextList?: SubjectEntity[];
}

/**
 * Resolves Subject entity strictly, preventing silent failures
 */
export function resolveSubject(
  input: ResolveSubjectInput,
  subjectList: SubjectEntity[]
): ResolveSubjectResult {
  const subjects = input.contextList || subjectList;

  // 1. If explicit ID is provided -> verify existence and check name consistency
  if (input.id) {
    const targetId = input.id.trim().toLowerCase();
    const match = subjects.find((s) => s.id.toLowerCase() === targetId);

    if (match) {
      // If name/bangla_name was also supplied, verify no severe collision
      if (input.bangla_name || input.name) {
        const inputNameNorm = normalizeBangla(input.bangla_name || input.name);
        const matchNameNorm = normalizeBangla(match.bangla_name || match.name);
        const sim = calculateSimilarity(inputNameNorm, matchNameNorm);

        if (sim < 0.3) {
          // Warning: ID provided points to something completely different
          return {
            matched: null,
            confidence: 'none',
            message: `Subject ID '${input.id}' matches '${match.bangla_name}', but name '${input.bangla_name || input.name}' differs significantly.`,
            candidates: [
              {
                id: match.id,
                name: match.name,
                bangla_name: match.bangla_name,
                similarity: sim,
                reason: 'Matched ID but name mismatch',
              },
            ],
          };
        }
      }

      return {
        matched: match,
        confidence: 'exact_id',
        candidates: [],
      };
    }
  }

  // 2. Exact match on normalized Bengali name / English name & paper
  const queryName = normalizeBangla(input.bangla_name || input.name);
  const queryKey = normalizeBanglaKey(queryName);

  if (queryName) {
    // Check paper normalization
    let reqPaper = input.paper ? input.paper.toString().toLowerCase() : '';
    if (reqPaper.includes('1') || reqPaper.includes('১')) reqPaper = '1st';
    if (reqPaper.includes('2') || reqPaper.includes('২')) reqPaper = '2nd';

    const exactMatch = subjects.find((s) => {
      const sBnKey = normalizeBanglaKey(s.bangla_name);
      const sEnKey = normalizeBanglaKey(s.name);
      const nameMatches = sBnKey === queryKey || sEnKey === queryKey || s.id.toLowerCase() === queryKey;

      if (!nameMatches) return false;
      if (reqPaper && s.paper) {
        let sPaper = s.paper.toLowerCase();
        if (sPaper.includes('1') || sPaper.includes('১')) sPaper = '1st';
        if (sPaper.includes('2') || sPaper.includes('২')) sPaper = '2nd';
        return sPaper === reqPaper;
      }
      return true;
    });

    if (exactMatch) {
      return {
        matched: exactMatch,
        confidence: 'exact_name',
        candidates: [],
      };
    }
  }

  // 3. If no exact match -> calculate top candidates
  const scoredCandidates: Candidate[] = subjects
    .map((s) => {
      const simBn = calculateSimilarity(queryName, s.bangla_name);
      const simEn = calculateSimilarity(queryName, s.name);
      const bestSim = Math.max(simBn, simEn);
      return {
        id: s.id,
        name: s.name,
        bangla_name: s.bangla_name,
        similarity: bestSim,
      };
    })
    .filter((c) => c.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  return {
    matched: null,
    confidence: scoredCandidates.length > 0 ? 'fuzzy_candidate' : 'none',
    candidates: scoredCandidates,
    message: queryName ? `No exact subject found for '${queryName}'.` : 'Subject name or ID is required.',
  };
}

export interface ResolveChapterInput {
  id?: string;
  subject_id?: string;
  name?: string;
  bangla_name?: string;
  chapter_number?: number;
}

/**
 * Resolves Chapter entity strictly under given subject_id
 */
export function resolveChapter(
  input: ResolveChapterInput,
  chapterList: ChapterEntity[]
): ResolveChapterResult {
  // Filter by subject_id if provided
  const chapters = input.subject_id
    ? chapterList.filter((c) => c.subject_id.toLowerCase() === input.subject_id?.toLowerCase())
    : chapterList;

  // 1. Exact ID check
  if (input.id) {
    const targetId = input.id.trim().toLowerCase();
    const match = chapters.find((c) => c.id.toLowerCase() === targetId);

    if (match) {
      return {
        matched: match,
        confidence: 'exact_id',
        candidates: [],
      };
    }
  }

  // 2. Exact Name Match under subject
  const queryName = normalizeBangla(input.bangla_name || input.name);
  const queryKey = normalizeBanglaKey(queryName);

  if (queryName) {
    const exactMatch = chapters.find((c) => {
      const cBnKey = normalizeBanglaKey(c.bangla_name);
      const cEnKey = normalizeBanglaKey(c.name);
      return cBnKey === queryKey || cEnKey === queryKey || c.id.toLowerCase() === queryKey;
    });

    if (exactMatch) {
      return {
        matched: exactMatch,
        confidence: 'exact_name',
        candidates: [],
      };
    }
  }

  // 3. Top 5 candidates
  const scoredCandidates: Candidate[] = chapters
    .map((c) => {
      const simBn = calculateSimilarity(queryName, c.bangla_name);
      const simEn = calculateSimilarity(queryName, c.name);
      const bestSim = Math.max(simBn, simEn);
      return {
        id: c.id,
        name: c.name,
        bangla_name: c.bangla_name,
        similarity: bestSim,
      };
    })
    .filter((c) => c.similarity > 0.25)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  return {
    matched: null,
    confidence: scoredCandidates.length > 0 ? 'fuzzy_candidate' : 'none',
    candidates: scoredCandidates,
    message: queryName
      ? `No exact chapter found for '${queryName}'${input.subject_id ? ` under subject '${input.subject_id}'` : ''}.`
      : 'Chapter name or ID is required.',
  };
}

export interface ResolveTopicInput {
  id?: string;
  chapter_id?: string;
  subject_id?: string;
  name?: string;
  bangla_name?: string;
}

/**
 * Resolves Topic entity strictly under given chapter_id
 */
export function resolveTopic(
  input: ResolveTopicInput,
  topicList: TopicEntity[]
): ResolveTopicResult {
  // Filter by chapter_id if provided
  const topics = input.chapter_id
    ? topicList.filter((t) => t.chapter_id.toLowerCase() === input.chapter_id?.toLowerCase())
    : topicList;

  // 1. Exact ID check
  if (input.id) {
    const targetId = input.id.trim().toLowerCase();
    const match = topics.find((t) => t.id.toLowerCase() === targetId);

    if (match) {
      return {
        matched: match,
        confidence: 'exact_id',
        candidates: [],
      };
    }
  }

  // 2. Exact Name Match under chapter
  const queryName = normalizeBangla(input.bangla_name || input.name);
  const queryKey = normalizeBanglaKey(queryName);

  if (queryName) {
    const exactMatch = topics.find((t) => {
      const tBnKey = normalizeBanglaKey(t.bangla_name);
      const tEnKey = normalizeBanglaKey(t.name);
      return tBnKey === queryKey || tEnKey === queryKey || t.id.toLowerCase() === queryKey;
    });

    if (exactMatch) {
      return {
        matched: exactMatch,
        confidence: 'exact_name',
        candidates: [],
      };
    }
  }

  // 3. Top 5 candidates
  const scoredCandidates: Candidate[] = topics
    .map((t) => {
      const simBn = calculateSimilarity(queryName, t.bangla_name);
      const simEn = calculateSimilarity(queryName, t.name);
      const bestSim = Math.max(simBn, simEn);
      return {
        id: t.id,
        name: t.name,
        bangla_name: t.bangla_name,
        similarity: bestSim,
      };
    })
    .filter((c) => c.similarity > 0.25)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  return {
    matched: null,
    confidence: scoredCandidates.length > 0 ? 'fuzzy_candidate' : 'none',
    candidates: scoredCandidates,
    message: queryName
      ? `No exact topic found for '${queryName}'${input.chapter_id ? ` in chapter '${input.chapter_id}'` : ''}.`
      : 'Topic name or ID is required.',
  };
}

// ==========================================
// 4. CREATION / INSERTION HELPERS
// ==========================================

export interface CreateChapterInput {
  id?: string;
  subject_id: string;
  name: string;
  bangla_name: string;
  paper?: string;
  chapter_number?: number;
}

export interface CreateTopicInput {
  id?: string;
  chapter_id: string;
  subject_id?: string;
  name: string;
  bangla_name: string;
  paper?: string;
  topic_code?: string;
  star_rating?: number;
}

/**
 * Generates deterministic or clean slug ID for new chapter
 */
export function generateChapterId(subject_id: string, chapter_number?: number, name?: string): string {
  if (chapter_number) {
    const subPrefix = subject_id.replace(/[^a-zA-Z0-9]/g, '');
    return `${subPrefix}_ch${chapter_number}`;
  }
  const cleanName = (name || 'ch')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 20);
  return `ch_${subject_id}_${cleanName}_${Date.now().toString(36)}`;
}

/**
 * Generates clean topic ID
 */
export function generateTopicId(chapter_id: string, topic_code?: string, name?: string): string {
  if (topic_code) {
    const cleanCode = topic_code.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `top_${chapter_id}_${cleanCode}`;
  }
  const cleanName = (name || 'top')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 20);
  return `top_${chapter_id}_${cleanName}_${Date.now().toString(36)}`;
}

// ==========================================
// 5. TAXONOMY TREE & CASCADING HELPERS
// ==========================================

export interface TaxonomyTreeNode {
  id: string;
  name: string;
  bangla_name: string;
  paper?: string;
  chapters: Array<{
    id: string;
    name: string;
    bangla_name: string;
    chapter_number?: number;
    topics: Array<{
      id: string;
      name: string;
      bangla_name: string;
      topic_code?: string;
      star_rating?: number;
      total_questions?: number;
    }>;
  }>;
}

/**
 * Builds a hierarchical cascading taxonomy tree for Admin Pickers
 */
export function buildTaxonomyTree(
  subjects: SubjectEntity[],
  chapters: ChapterEntity[],
  topics: TopicEntity[],
  filterSubjectId?: string
): TaxonomyTreeNode[] {
  const filteredSubjects = filterSubjectId
    ? subjects.filter((s) => s.id.toLowerCase() === filterSubjectId.toLowerCase())
    : subjects;

  return filteredSubjects.map((s) => {
    const sChapters = chapters.filter((c) => c.subject_id.toLowerCase() === s.id.toLowerCase());

    return {
      id: s.id,
      name: s.name,
      bangla_name: s.bangla_name,
      paper: s.paper,
      chapters: sChapters.map((c) => {
        const cTopics = topics.filter((t) => t.chapter_id.toLowerCase() === c.id.toLowerCase());
        return {
          id: c.id,
          name: c.name,
          bangla_name: c.bangla_name,
          chapter_number: c.chapter_number,
          topics: cTopics.map((t) => ({
            id: t.id,
            name: t.name,
            bangla_name: t.bangla_name,
            topic_code: t.topic_code,
            star_rating: t.star_rating,
            total_questions: t.total_questions,
          })),
        };
      }),
    };
  });
}
