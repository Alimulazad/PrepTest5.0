import { Question, WrittenQuestion } from '../types';

export interface QuestionFilterCriteria {
  subject_id?: string | null;
  paper?: string | null;
  chapter_id?: string | null;
  topic_id?: string | null;
  category?: string | null;
  type?: 'mcq' | 'written' | 'all' | null;
  search?: string | null;
  tag?: string | null;
  difficulty?: string | null;
  star_rating?: number | null;
}

/**
 * Normalizes subject identifier to support aliases (e.g. 'physics', 'physics_1', 'phy_p1')
 */
export function normalizeSubjectId(subjectId?: string | null): string {
  if (!subjectId) return '';
  const s = subjectId.trim().toLowerCase();

  if (s.startsWith('phy') || s.includes('পদার্থ')) return 'physics';
  if (s.startsWith('chem') || s.includes('রসায়ন')) return 'chemistry';
  if (s.startsWith('math') || s.startsWith('mat') || s.includes('গণিত')) return 'math';
  if (s.startsWith('bio') || s.includes('জীব')) return 'biology';
  return s.replace(/_1|_2|_p1|_p2/g, '');
}

/**
 * Maps any subject key/alias and paper to a canonical subject ID format (e.g. 'physics_1', 'chemistry_2', 'math_1')
 */
export function standardizeSubjectId(subjectId?: string | null, paper?: string | null): string {
  if (!subjectId) return '';
  const s = subjectId.trim().toLowerCase();

  let basePrefix = '';
  if (s.startsWith('phy') || s.includes('পদার্থ')) basePrefix = 'physics';
  else if (s.startsWith('chem') || s.includes('রসায়ন')) basePrefix = 'chemistry';
  else if (s.startsWith('math') || s.startsWith('mat') || s.includes('গণিত')) basePrefix = 'math';
  else if (s.startsWith('bio') || s.includes('জীব')) basePrefix = 'biology';
  else basePrefix = s.replace(/_1|_2|_p1|_p2/g, '');

  let p = normalizePaper(paper);
  if (!p) {
    if (s.includes('_1') || s.includes('p1') || s.includes('১ম') || s.includes('1st')) p = '1st';
    else if (s.includes('_2') || s.includes('p2') || s.includes('২য়') || s.includes('2nd')) p = '2nd';
  }

  if (p === '1st') return `${basePrefix}_1`;
  if (p === '2nd') return `${basePrefix}_2`;
  return basePrefix;
}

/**
 * Maps chapter input to standardized format (e.g. 'phy_p1_c2', 'chem_p2_c3', or preserves existing standardized ID)
 */
export function standardizeChapterId(chapterInput?: string | null, subjectId?: string | null, paper?: string | null): string {
  if (!chapterInput || chapterInput === 'all') return '';
  const ch = chapterInput.trim();

  // Already standardized like phy_p1_c2 or phy1_ch2
  if (/^[a-z]+_p[12]_c\d+$/i.test(ch)) {
    return ch.toLowerCase();
  }

  // Handle formats like phy1_ch2 -> phy_p1_c2
  const legacyMatch = ch.match(/([a-z]+)(\d)_ch(\d+)/i);
  if (legacyMatch) {
    const [, sub, p, cNum] = legacyMatch;
    const shortSub = sub.toLowerCase().startsWith('phy') ? 'phy' : sub.toLowerCase().startsWith('chem') ? 'chem' : sub.toLowerCase().startsWith('mat') ? 'math' : 'bio';
    return `${shortSub}_p${p}_c${cNum}`;
  }

  // Handle pure chapter numbers or 'c2', 'ch2'
  const cNumMatch = ch.match(/(?:ch|c|অধ্যায়|অধ্যায়)?\s*(\d+)/i);
  if (cNumMatch) {
    const cNum = cNumMatch[1];
    const stdSub = standardizeSubjectId(subjectId, paper);
    let subPrefix = 'phy';
    let pNum = '1';

    if (stdSub.includes('chem')) subPrefix = 'chem';
    else if (stdSub.includes('math')) subPrefix = 'math';
    else if (stdSub.includes('bio')) subPrefix = 'bio';

    if (stdSub.endsWith('_2') || normalizePaper(paper) === '2nd') {
      pNum = '2';
    }

    return `${subPrefix}_p${pNum}_c${cNum}`;
  }

  return ch;
}

/**
 * Maps topic input to standardized format (e.g. 'phy_p1_c2_t1', 'p1c2_s1' -> 'phy_p1_c2_t1')
 */
export function standardizeTopicId(
  topicInput?: string | null,
  chapterId?: string | null,
  subjectId?: string | null,
  paper?: string | null
): string {
  if (!topicInput || topicInput === 'all') return '';
  const t = topicInput.trim();

  // Already standardized like phy_p1_c2_t1
  if (/^[a-z]+_p[12]_c\d+_t\d+$/i.test(t)) {
    return t.toLowerCase();
  }

  // Legacy format like p1c2_s1 -> phy_p1_c2_t1
  const legacyMatch = t.match(/p(\d)c(\d+)_s(\d+)/i);
  if (legacyMatch) {
    const [, p, c, tNum] = legacyMatch;
    const stdSub = standardizeSubjectId(subjectId, paper);
    let subPrefix = 'phy';
    if (stdSub.includes('chem')) subPrefix = 'chem';
    else if (stdSub.includes('math')) subPrefix = 'math';
    else if (stdSub.includes('bio')) subPrefix = 'bio';
    return `${subPrefix}_p${p}_c${c}_t${tNum}`;
  }

  // Pure topic code like T-01, T-1, t1, s1
  const tNumMatch = t.match(/(?:t|s|t-|topic)?\s*(\d+)/i);
  const stdChapter = standardizeChapterId(chapterId, subjectId, paper);
  if (tNumMatch && stdChapter) {
    const tNum = parseInt(tNumMatch[1], 10);
    return `${stdChapter}_t${tNum}`;
  }

  return t;
}

/**
 * Pre-query validation and mapping step for UI filters before calling database endpoints
 */
export function validateAndStandardizeQueryParams<T extends Record<string, any>>(filters?: T): T {
  if (!filters) return {} as T;

  const sanitized: Record<string, any> = { ...filters };

  // 1. Standardize Subject
  if (sanitized.subject_id) {
    sanitized.subject_id = standardizeSubjectId(sanitized.subject_id, sanitized.paper);
  }

  // 2. Standardize Paper
  if (sanitized.paper) {
    sanitized.paper = normalizePaper(sanitized.paper);
  }

  // 3. Standardize Chapter
  if (sanitized.chapter_id) {
    sanitized.chapter_id = standardizeChapterId(sanitized.chapter_id, sanitized.subject_id, sanitized.paper);
  }

  // 4. Standardize Topic
  if (sanitized.topic_id) {
    sanitized.topic_id = standardizeTopicId(
      sanitized.topic_id,
      sanitized.chapter_id,
      sanitized.subject_id,
      sanitized.paper
    );
  }

  // 5. Clean empty strings and 'all'
  if (sanitized.chapter_id === 'all') delete sanitized.chapter_id;
  if (sanitized.topic_id === 'all') delete sanitized.topic_id;
  if (sanitized.category === 'all') delete sanitized.category;

  return sanitized as T;
}

/**
 * Normalizes paper identifier ('1st' | '2nd' | '১ম' | '২য়')
 */
export function normalizePaper(paper?: string | null): string {
  if (!paper) return '';
  const p = paper.trim().toLowerCase();
  if (p.includes('1') || p.includes('১') || p.includes('first')) return '1st';
  if (p.includes('2') || p.includes('২') || p.includes('second')) return '2nd';
  return p;
}

/**
 * Checks if a question matches a given subject and paper combination
 */
export function matchSubjectAndPaper(
  itemSubjectId?: string | null,
  itemPaper?: string | null,
  filterSubjectId?: string | null,
  filterPaper?: string | null
): boolean {
  if (!filterSubjectId && !filterPaper) return true;

  // If filter has compound subject like 'physics_1' or 'chem_p2'
  if (filterSubjectId) {
    const rawFilter = filterSubjectId.trim().toLowerCase();
    
    // Check if subject filter explicitly embeds paper (e.g. physics_1 -> subject: physics, paper: 1st)
    if (rawFilter.includes('_1') || rawFilter.includes('_p1')) {
      const baseSub = normalizeSubjectId(rawFilter.replace(/_1|_p1/g, ''));
      const itemSub = normalizeSubjectId(itemSubjectId);
      const itemP = normalizePaper(itemPaper);
      return itemSub === baseSub && (!itemPaper || itemP === '1st');
    }

    if (rawFilter.includes('_2') || rawFilter.includes('_p2')) {
      const baseSub = normalizeSubjectId(rawFilter.replace(/_2|_p2/g, ''));
      const itemSub = normalizeSubjectId(itemSubjectId);
      const itemP = normalizePaper(itemPaper);
      return itemSub === baseSub && (!itemPaper || itemP === '2nd');
    }

    // Standard subject comparison
    const normFilterSub = normalizeSubjectId(filterSubjectId);
    const normItemSub = normalizeSubjectId(itemSubjectId);
    if (normItemSub && normFilterSub && normItemSub !== normFilterSub) {
      return false;
    }
  }

  // Check paper explicitly if provided
  if (filterPaper) {
    const normFilterP = normalizePaper(filterPaper);
    const normItemP = normalizePaper(itemPaper);
    if (normItemP && normFilterP && normItemP !== normFilterP) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if a question matches a given chapter ID or name
 */
export function matchChapter(
  itemChapterId?: string | null,
  itemChapterName?: string | null,
  filterChapterId?: string | null
): boolean {
  if (!filterChapterId || filterChapterId === 'all') return true;

  const filter = filterChapterId.trim().toLowerCase();
  const itemId = (itemChapterId || '').trim().toLowerCase();
  const itemName = (itemChapterName || '').trim().toLowerCase();

  // 1. Direct ID match
  if (itemId && itemId === filter) return true;

  // 2. Normalized prefix or underscore/dash agnostic match (e.g. phy_p1_c2 vs c2)
  if (itemId) {
    if (itemId.endsWith(`_${filter}`) || itemId.endsWith(`-${filter}`)) return true;
    if (filter.endsWith(`_${itemId}`) || filter.endsWith(`-${itemId}`)) return true;
  }

  // 3. Name fallback
  if (itemName && itemName === filter) return true;

  return false;
}

/**
 * Checks if a question matches a given topic ID or name
 */
export function matchTopic(
  itemTopicId?: string | null,
  itemTopicName?: string | null,
  filterTopicId?: string | null
): boolean {
  if (!filterTopicId || filterTopicId === 'all') return true;

  const filter = filterTopicId.trim().toLowerCase();
  const itemId = (itemTopicId || '').trim().toLowerCase();
  const itemName = (itemTopicName || '').trim().toLowerCase();

  // 1. Direct ID match
  if (itemId && itemId === filter) return true;

  // 2. Suffix / Substring ID match (e.g. phy_p1_c2_t1 matching t1)
  if (itemId) {
    if (itemId.endsWith(`_${filter}`) || itemId.endsWith(`-${filter}`)) return true;
    if (filter.endsWith(`_${itemId}`) || filter.endsWith(`-${itemId}`)) return true;
  }

  // 3. Name fallback
  if (itemName && itemName === filter) return true;

  return false;
}

/**
 * Checks if a question matches a category or relevant tags
 */
export function matchCategory(
  itemCategory?: string | null,
  itemTags?: string[] | null,
  filterCategory?: string | null
): boolean {
  if (!filterCategory || filterCategory === 'all') return true;

  const filter = filterCategory.trim().toLowerCase();
  const cat = (itemCategory || '').trim().toLowerCase();
  const tagsStr = (itemTags || []).join(' ').toLowerCase();

  // Exact category match
  if (cat === filter) return true;

  // Multi-category tag matching
  if (filter === 'varsity_a' && (cat === 'varsity_a' || tagsStr.includes('varsity_a') || tagsStr.includes('du ') || tagsStr.includes('cu ') || tagsStr.includes('ru '))) {
    return true;
  }
  if (filter === 'engineering' && (cat === 'engineering' || tagsStr.includes('engineering') || tagsStr.includes('buet') || tagsStr.includes('ckruet') || tagsStr.includes('kuet') || tagsStr.includes('ruet') || tagsStr.includes('cuet') || tagsStr.includes('butex'))) {
    return true;
  }
  if (filter === 'medical' && (cat === 'medical' || tagsStr.includes('medical') || tagsStr.includes('mat') || tagsStr.includes('dental') || tagsStr.includes('dat'))) {
    return true;
  }
  if (filter === 'academic' && (cat === 'academic' || tagsStr.includes('academic') || tagsStr.includes('hsc') || tagsStr.includes('board') || tagsStr.includes('college'))) {
    return true;
  }
  if (filter === 'main_book' && (cat === 'main_book' || tagsStr.includes('main_book') || tagsStr.includes('মূল বই') || tagsStr.includes('অনুশীলনী'))) {
    return true;
  }

  return tagsStr.includes(filter);
}

/**
 * Checks if a question matches search text
 */
export function matchSearch(
  item: {
    question_text?: string;
    explanation?: string;
    chapter_name?: string;
    topic_name?: string;
    tags?: string[];
  },
  searchTerm?: string | null
): boolean {
  if (!searchTerm || !searchTerm.trim()) return true;

  const term = searchTerm.trim().toLowerCase();
  const qText = (item.question_text || '').toLowerCase();
  const expText = (item.explanation || '').toLowerCase();
  const chText = (item.chapter_name || '').toLowerCase();
  const tpText = (item.topic_name || '').toLowerCase();
  const tagText = (item.tags || []).join(' ').toLowerCase();

  return (
    qText.includes(term) ||
    expText.includes(term) ||
    chText.includes(term) ||
    tpText.includes(term) ||
    tagText.includes(term)
  );
}

/**
 * Standardized Central Filter Function for Questions (MCQ and Written)
 */
export function filterQuestions<T extends Question | WrittenQuestion>(
  questions: T[],
  criteria: QuestionFilterCriteria
): T[] {
  if (!Array.isArray(questions) || questions.length === 0) {
    return [];
  }

  return questions.filter((q) => {
    // 1. Subject & Paper Filter
    if (!matchSubjectAndPaper(q.subject_id, q.paper, criteria.subject_id, criteria.paper)) {
      return false;
    }

    // 2. Chapter Filter
    if (!matchChapter(q.chapter_id, q.chapter_name, criteria.chapter_id)) {
      return false;
    }

    // 3. Topic Filter
    if (!matchTopic(q.topic_id, q.topic_name, criteria.topic_id)) {
      return false;
    }

    // 4. Category Filter
    if (!matchCategory(q.category, q.tags, criteria.category)) {
      return false;
    }

    // 5. Tag Filter
    if (criteria.tag && (!q.tags || !q.tags.some((t) => t.toLowerCase().includes(criteria.tag!.toLowerCase())))) {
      return false;
    }

    // 6. Search Filter
    if (!matchSearch(q, criteria.search)) {
      return false;
    }

    // 7. Difficulty Filter
    if (criteria.difficulty && (q as any).difficulty && (q as any).difficulty !== criteria.difficulty) {
      return false;
    }

    // 8. Star Rating Filter
    if (criteria.star_rating && (q as any).star_rating && (q as any).star_rating !== criteria.star_rating) {
      return false;
    }

    return true;
  });
}
