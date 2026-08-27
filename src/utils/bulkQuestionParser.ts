import * as XLSX from 'xlsx';
import { Question, QuestionSubject } from '../types';
import { fixMojibake, normalizeLatexMath } from './mathNormalizer';

export interface ParsedQuestionItem {
  id?: string;
  item_type?: 'mcq' | 'written' | 'topic' | 'knowledge_snippet';
  question_text?: string;
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_ans?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;

  // Written question fields
  answer_text?: string;
  marks?: number;

  // Topic fields
  topic_code?: string;
  name?: string;
  bangla_name?: string;

  // Knowledge snippet fields
  title?: string;
  content?: string;
  importance?: 'low' | 'medium' | 'high' | 'top_priority';

  subject_id: QuestionSubject;
  subject_name?: string;
  paper?: '1st' | '2nd' | 1 | 2;
  chapter_id?: string;
  chapter_name?: string;
  topic_id?: string;
  topic_name?: string;
  category?: string;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  star_rating?: 1 | 2 | 3;
  type?: 'mcq' | 'written';

  // Multi-level validation status for UI preview
  status: 'valid' | 'warning' | 'invalid';
  isValid: boolean;
  isWarning?: boolean;
  validationIssues?: string[];
  warningIssues?: string[];
  smartMapped?: boolean;
  smartMappedNote?: string;
  rawSourceIndex?: number;
}

export interface BulkParseResult {
  success: boolean;
  totalParsed: number;
  validCount: number;
  invalidCount: number;
  questions: ParsedQuestionItem[];
  errors: string[];
}

export interface BulkDefaults {
  subject_id: QuestionSubject;
  subject_name?: string;
  paper?: '1st' | '2nd';
  chapter_id?: string;
  chapter_name?: string;
  topic_id?: string;
  topic_name?: string;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
}

/**
 * Normalizes answer tokens into standard 'A' | 'B' | 'C' | 'D'
 */
export function normalizeAnswer(ans: any): 'A' | 'B' | 'C' | 'D' | null {
  if (ans === null || ans === undefined) return null;
  const str = String(ans).trim().toUpperCase();

  if (str === 'A' || str === 'ক' || str === '১' || str === '1' || str.startsWith('OPTION A') || str.startsWith('অপশন ক')) return 'A';
  if (str === 'B' || str === 'খ' || str === '২' || str === '2' || str.startsWith('OPTION B') || str.startsWith('অপশন খ')) return 'B';
  if (str === 'C' || str === 'গ' || str === '৩' || str === '3' || str.startsWith('OPTION C') || str.startsWith('অপশন গ')) return 'C';
  if (str === 'D' || str === 'ঘ' || str === '৪' || str === '4' || str.startsWith('OPTION D') || str.startsWith('অপশন ঘ')) return 'D';

  // Check matching letter within string like "(ক)" or "[B]"
  const match = str.match(/([A-Dক-ঘ১-৪])/i);
  if (match) {
    const letter = match[1].toUpperCase();
    if (letter === 'A' || letter === 'ক' || letter === '১') return 'A';
    if (letter === 'B' || letter === 'খ' || letter === '২') return 'B';
    if (letter === 'C' || letter === 'গ' || letter === '৩') return 'C';
    if (letter === 'D' || letter === 'ঘ' || letter === '৪') return 'D';
  }

  return null;
}

/**
 * Maps subject strings to valid system subject_id
 */
export function normalizeSubjectId(sub: string | undefined, defaultSub: QuestionSubject = 'physics_1'): QuestionSubject {
  if (!sub) return defaultSub;
  const s = sub.toLowerCase().trim();

  if (s.includes('phy') && (s.includes('1') || s.includes('১') || s.includes('১ম') || s.includes('first'))) return 'physics_1';
  if (s.includes('phy') && (s.includes('2') || s.includes('২') || s.includes('২য়') || s.includes('second'))) return 'physics_2';
  if (s.includes('chem') && (s.includes('1') || s.includes('১') || s.includes('১ম') || s.includes('first'))) return 'chemistry_1';
  if (s.includes('chem') && (s.includes('2') || s.includes('২') || s.includes('২য়') || s.includes('second'))) return 'chemistry_2';
  if (s.includes('bio') && (s.includes('1') || s.includes('১') || s.includes('১ম') || s.includes('first') || s.includes('উদ্ভিদ'))) return 'biology_1';
  if (s.includes('bio') && (s.includes('2') || s.includes('২') || s.includes('২য়') || s.includes('second') || s.includes('প্রাণী'))) return 'biology_2';
  if (s.includes('math') && (s.includes('1') || s.includes('১') || s.includes('১ম') || s.includes('first'))) return 'math_1';
  if (s.includes('math') && (s.includes('2') || s.includes('২') || s.includes('২য়') || s.includes('second'))) return 'math_2';
  if (s.includes('bangla') || s.includes('বাংলা')) return 'bangla';
  if (s.includes('eng') || s.includes('ইংরেজি')) return 'english';
  if (s.includes('gk') || s.includes('সাধারণ জ্ঞান') || s.includes('সাধারণ')) return 'gk';

  // Check direct IDs
  const validIds: QuestionSubject[] = [
    'physics_1', 'physics_2', 'chemistry_1', 'chemistry_2',
    'biology_1', 'biology_2', 'math_1', 'math_2', 'bangla', 'english', 'gk'
  ];
  if (validIds.includes(s as QuestionSubject)) {
    return s as QuestionSubject;
  }

  return defaultSub;
}

/**
 * Smart Name-to-ID Topic Mapper and Referential Integrity Checker
 */
export function smartMapTopicByName(
  topicIdInput: string | undefined,
  topicNameInput: string | undefined,
  chapterIdInput: string | undefined,
  subjectIdInput: string | undefined,
  validTopics?: Array<{ id: string; name?: string; bangla_name?: string; chapter_id?: string; subject_id?: string }>
): {
  matchedTopicId: string | null;
  matchedTopicName: string | null;
  smartMapped: boolean;
  smartMappedNote: string | null;
  isInvalidId: boolean;
  isChapterMismatch: boolean;
  mismatchNote: string | null;
  actualParentChapterId: string | null;
} {
  const cleanId = topicIdInput?.trim();
  const cleanName = topicNameInput?.trim();

  if (!validTopics || validTopics.length === 0) {
    return {
      matchedTopicId: cleanId || null,
      matchedTopicName: cleanName || null,
      smartMapped: false,
      smartMappedNote: null,
      isInvalidId: false,
      isChapterMismatch: false,
      mismatchNote: null,
      actualParentChapterId: null,
    };
  }

  // 1. Direct ID match & Chapter Referential Consistency check
  if (cleanId) {
    const directMatch = validTopics.find(
      (t) => t.id === cleanId || t.id.toLowerCase() === cleanId.toLowerCase()
    );

    if (directMatch) {
      // Check if topic's parent chapter matches the row's chapter_id
      const parentChap = directMatch.chapter_id;
      if (chapterIdInput && parentChap && parentChap.toLowerCase() !== chapterIdInput.toLowerCase()) {
        // SOFT MISMATCH: topic_id exists, but belongs to a different chapter!
        const mismatchReason = `CSV-তে topic_id '${cleanId}' দেওয়া আছে কিন্তু chapter_id '${chapterIdInput}'-এ, প্রকৃতপক্ষে এই topic '${parentChap}'-এর অধীনে।`;

        // Try silently re-resolving topic within chapterIdInput using cleanName
        let reResolved: typeof directMatch | undefined = undefined;
        if (cleanName) {
          const normName = cleanName.toLowerCase().replace(/[\s\-_,\.\:\(\)\[\]]+/g, '');
          reResolved = validTopics.find((t) => {
            if (t.chapter_id?.toLowerCase() !== chapterIdInput.toLowerCase()) return false;
            const tName = (t.name || t.bangla_name || '').toLowerCase().replace(/[\s\-_,\.\:\(\)\[\]]+/g, '');
            return tName.length > 0 && (tName === normName || tName.includes(normName) || normName.includes(tName));
          });
        }

        if (reResolved) {
          return {
            matchedTopicId: reResolved.id,
            matchedTopicName: reResolved.bangla_name || reResolved.name || reResolved.id,
            smartMapped: true,
            smartMappedNote: `⚡ ${mismatchReason} স্বয়ংক্রিয়ভাবে অধ্যায় '${chapterIdInput}'-এর অধীনস্থ টপিক '${reResolved.id}' দিয়ে রি-রেজোলভ করা হয়েছে।`,
            isInvalidId: false,
            isChapterMismatch: true,
            mismatchNote: `⚠️ Topic-Chapter Mismatch: CSV-তে topic_id '${cleanId}' দেওয়া আছে কিন্তু chapter_id '${chapterIdInput}'-এ, প্রকৃতপক্ষে এই topic '${parentChap}'-এর অধীনে।`,
            actualParentChapterId: parentChap,
          };
        } else {
          return {
            matchedTopicId: null,
            matchedTopicName: cleanName || null,
            smartMapped: false,
            smartMappedNote: `⚠️ ${mismatchReason} অধ্যায় '${chapterIdInput}'-এ '${cleanName || cleanId}' টপিক না থাকায় topic_id খালি রাখা হলো।`,
            isInvalidId: false,
            isChapterMismatch: true,
            mismatchNote: `⚠️ Topic-Chapter Mismatch: CSV-তে topic_id '${cleanId}' দেওয়া আছে কিন্তু chapter_id '${chapterIdInput}'-এ, প্রকৃতপক্ষে এই topic '${parentChap}'-এর অধীনে।`,
            actualParentChapterId: parentChap,
          };
        }
      }

      // Exact valid match under the same chapter
      return {
        matchedTopicId: directMatch.id,
        matchedTopicName: directMatch.name || directMatch.bangla_name || cleanName || null,
        smartMapped: false,
        smartMappedNote: null,
        isInvalidId: false,
        isChapterMismatch: false,
        mismatchNote: null,
        actualParentChapterId: null,
      };
    }
  }

  // 2. Smart Name Match check if topic_name exists
  if (cleanName) {
    const normalizedSearchName = cleanName.toLowerCase().replace(/[\s\-_,\.\:\(\)\[\]]+/g, '');

    // Search among valid topics for chapter/subject first
    let candidate = validTopics.find((t) => {
      const tName = (t.name || t.bangla_name || '').toLowerCase().replace(/[\s\-_,\.\:\(\)\[\]]+/g, '');
      const chapterMatch = !chapterIdInput || t.chapter_id?.toLowerCase() === chapterIdInput.toLowerCase();
      return (
        chapterMatch &&
        tName.length > 0 &&
        (tName === normalizedSearchName ||
          tName.includes(normalizedSearchName) ||
          normalizedSearchName.includes(tName))
      );
    });

    // Fallback search across all topics in system
    if (!candidate) {
      candidate = validTopics.find((t) => {
        const tName = (t.name || t.bangla_name || '').toLowerCase().replace(/[\s\-_,\.\:\(\)\[\]]+/g, '');
        return (
          tName.length > 2 &&
          (tName === normalizedSearchName ||
            tName.includes(normalizedSearchName) ||
            normalizedSearchName.includes(tName))
        );
      });
    }

    if (candidate) {
      return {
        matchedTopicId: candidate.id,
        matchedTopicName: candidate.name || candidate.bangla_name || candidate.id,
        smartMapped: true,
        smartMappedNote: `✨ '${cleanName}' থেকে স্বয়ংক্রিয়ভাবে '${candidate.id}' আইডি ম্যাপ করা হয়েছে`,
        isInvalidId: false,
        isChapterMismatch: false,
        mismatchNote: null,
        actualParentChapterId: null,
      };
    }
  }

  // 3. Provided topic_id was not found in DB & name could not be mapped
  const isInvalidId = Boolean(cleanId);
  return {
    matchedTopicId: cleanId || null,
    matchedTopicName: cleanName || null,
    smartMapped: false,
    smartMappedNote: null,
    isInvalidId: isInvalidId,
    isChapterMismatch: false,
    mismatchNote: null,
    actualParentChapterId: null,
  };
}

/**
 * Validates and completes a single parsed question
 */
export function validateAndEnrichQuestion(
  raw: Partial<ParsedQuestionItem>,
  index: number,
  defaults?: BulkDefaults,
  dbTopics?: Array<{ id: string; name?: string; bangla_name?: string; chapter_id?: string; subject_id?: string }>
): ParsedQuestionItem {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Normalize LaTeX and fix any Mojibake in text fields
  const questionText = normalizeLatexMath(fixMojibake(raw.question_text || '')).trim();
  if (!questionText) {
    issues.push('প্রশ্নের বিবরণ (Question text) অনুপস্থিত');
  }

  const optA = normalizeLatexMath(fixMojibake(raw.options?.A || '')).trim();
  const optB = normalizeLatexMath(fixMojibake(raw.options?.B || '')).trim();
  const optC = normalizeLatexMath(fixMojibake(raw.options?.C || '')).trim();
  const optD = normalizeLatexMath(fixMojibake(raw.options?.D || '')).trim();

  if (!optA) issues.push('অপশন (A) বা (ক) অনুপস্থিত');
  if (!optB) issues.push('অপশন (B) বা (খ) অনুপস্থিত');
  if (!optC) issues.push('অপশন (C) বা (গ) অনুপস্থিত');
  if (!optD) issues.push('অপশন (D) বা (ঘ) অনুপস্থিত');

  const normalizedAns = normalizeAnswer(raw.correct_ans);
  if (!normalizedAns) {
    issues.push('সঠিক উত্তর (A, B, C, D অথবা ক, খ, গ, ঘ) সঠিকভাবে পাওয়া যায়নি');
  }

  const subjectId = raw.subject_id || defaults?.subject_id || 'physics_1';
  const paper = raw.paper || defaults?.paper || (subjectId.endsWith('_2') ? '2nd' : '1st');
  const chapterId = raw.chapter_id || defaults?.chapter_id || `${subjectId.substring(0, 3)}_ch1`;
  const chapterName = fixMojibake(raw.chapter_name || defaults?.chapter_name || 'সাধারণ অধ্যায়').trim();
  const subjectName = fixMojibake(raw.subject_name || defaults?.subject_name || subjectId).trim();

  let tags = raw.tags || defaults?.tags || [];
  if (typeof tags === 'string') {
    tags = (tags as string).split(/[,;]+/).map((t: string) => fixMojibake(t.trim())).filter(Boolean);
  } else if (Array.isArray(tags)) {
    tags = tags.map((t) => fixMojibake(String(t).trim())).filter(Boolean);
  }
  if (!tags.length) {
    tags = ['Varsity Ka', 'Admission Prep'];
  }

  const difficulty = raw.difficulty || defaults?.difficulty || 'medium';
  const starRating = raw.star_rating || 3;

  // Referential Validation & Smart Name Matching for topic_id
  const topicIdRaw = raw.topic_id?.trim();
  const topicNameRaw = fixMojibake(raw.topic_name || '').trim();

  const mapResult = smartMapTopicByName(topicIdRaw, topicNameRaw, chapterId, subjectId, dbTopics);

  let finalTopicId = mapResult.matchedTopicId || topicIdRaw || '';
  let finalTopicName = mapResult.matchedTopicName || topicNameRaw || finalTopicId;
  let smartMapped = mapResult.smartMapped;
  let smartMappedNote = mapResult.smartMappedNote;

  if (mapResult.isChapterMismatch && mapResult.mismatchNote) {
    warnings.push(mapResult.mismatchNote);
  } else if (mapResult.isInvalidId && topicIdRaw) {
    smartMappedNote = `⚡ কাস্টম/অনুপস্থিত টপিক ID '${topicIdRaw}' (ইমপোর্টের সময় স্বয়ংক্রিয়ভাবে তৈরি হবে)`;
  }

  // Requirement 4: If topic is missing or unresolved, flag as warning ("⚠️ Needs Topic"), NOT valid!
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
    id: raw.id || `q_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
    item_type: 'mcq',
    question_text: questionText,
    options: {
      A: optA,
      B: optB,
      C: optC,
      D: optD,
    },
    correct_ans: normalizedAns || 'A',
    explanation: normalizeLatexMath(fixMojibake(raw.explanation || '')).trim(),
    subject_id: subjectId,
    subject_name: subjectName,
    paper: paper,
    chapter_id: chapterId,
    chapter_name: chapterName,
    topic_id: finalTopicId,
    topic_name: finalTopicName,
    category: raw.category || defaults?.category || 'varsity_a',
    tags: tags,
    difficulty: difficulty,
    star_rating: starRating,
    type: raw.type || 'mcq',
    status: status,
    isValid: status !== 'invalid',
    isWarning: status === 'warning',
    validationIssues: issues,
    warningIssues: warnings,
    smartMapped: smartMapped,
    smartMappedNote: smartMappedNote || undefined,
    rawSourceIndex: index + 1,
  };
}

/**
 * Helper to match keys case-insensitively from arbitrary objects
 */
function findKeyValue(row: Record<string, any>, possibleKeys: string[]): any {
  const rowKeys = Object.keys(row);
  for (const pKey of possibleKeys) {
    const pKeyNorm = pKey.toLowerCase().replace(/[\s_\-\.\:\(\)\[\]]/g, '');
    for (const rKey of rowKeys) {
      const rKeyNorm = rKey.toLowerCase().replace(/[\s_\-\.\:\(\)\[\]]/g, '');
      if (rKeyNorm === pKeyNorm) {
        const val = row[rKey];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return val;
        }
      }
    }
  }
  return undefined;
}

/**
 * Parse Excel (.xlsx, .xls) and CSV files into standard questions list
 */
export async function parseExcelOrCsvFile(
  file: File | ArrayBuffer,
  defaults?: BulkDefaults
): Promise<BulkParseResult> {
  const errors: string[] = [];
  try {
    let data: ArrayBuffer;
    let fileName = '';
    if (file instanceof File) {
      fileName = file.name.toLowerCase();
      data = await file.arrayBuffer();
    } else {
      data = file;
    }

    // Check magic bytes to detect binary XLSX/XLS vs UTF-8 Text/CSV
    const byteView = new Uint8Array(data.slice(0, 4));
    const isZipOrXlsx = byteView[0] === 0x50 && byteView[1] === 0x4b;
    const isOldXls = byteView[0] === 0xd0 && byteView[1] === 0xcf;

    let workbook: XLSX.WorkBook;

    if (!isZipOrXlsx && !isOldXls) {
      // Plain text CSV / TSV / TXT - Decode with UTF-8 to prevent Bengali Mojibake
      const decoder = new TextDecoder('utf-8');
      let textContent = decoder.decode(data);
      if (textContent.charCodeAt(0) === 0xfeff) {
        textContent = textContent.slice(1);
      }
      workbook = XLSX.read(textContent, {
        type: 'string',
        raw: false,
      });
    } else {
      // Binary Excel file (.xlsx / .xls)
      workbook = XLSX.read(data, {
        type: 'array',
        cellDates: false,
        raw: false,
        codepage: 65001,
      });
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        success: false,
        totalParsed: 0,
        validCount: 0,
        invalidCount: 0,
        questions: [],
        errors: ['ফাইলে কোনো শিট (Sheet) পাওয়া যায়নি।'],
      };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      blankrows: false,
    });

    if (!rawRows || rawRows.length === 0) {
      return {
        success: false,
        totalParsed: 0,
        validCount: 0,
        invalidCount: 0,
        questions: [],
        errors: ['আপলোডকৃত শিটে কোনো ডেটা বা সারি পাওয়া যায়নি।'],
      };
    }

    const parsedQuestions: ParsedQuestionItem[] = [];

    rawRows.forEach((row, idx) => {
      // Find question text
      const qText = findKeyValue(row, [
        'question_text', 'question', 'questionText', 'প্রশ্ন', 'Question Text', 'Question', 'q_text', 'q'
      ]);

      // Options
      const optA = findKeyValue(row, ['option_a', 'optionA', 'opt_a', 'opta', 'a', 'A', 'অপশন ক', 'অপশন (ক)', 'ক', 'Option A', 'Option (A)', 'option_1', 'option1']);
      const optB = findKeyValue(row, ['option_b', 'optionB', 'opt_b', 'optb', 'b', 'B', 'অপশন খ', 'অপশন (খ)', 'খ', 'Option B', 'Option (B)', 'option_2', 'option2']);
      const optC = findKeyValue(row, ['option_c', 'optionC', 'opt_c', 'optc', 'c', 'C', 'অপশন গ', 'অপশন (গ)', 'গ', 'Option C', 'Option (C)', 'option_3', 'option3']);
      const optD = findKeyValue(row, ['option_d', 'optionD', 'opt_d', 'optd', 'd', 'D', 'অপশন ঘ', 'অপশন (ঘ)', 'ঘ', 'Option D', 'Option (D)', 'option_4', 'option4']);

      // Correct Answer
      const correctAns = findKeyValue(row, [
        'correct_ans', 'correctAnswer', 'correct_answer', 'ans', 'answer', 'সঠিক উত্তর', 'সঠিক_উত্তর', 'উত্তর', 'উ:', 'উঃ', 'Correct Answer', 'correct'
      ]);

      // Explanation
      const explanation = findKeyValue(row, ['explanation', 'ব্যাখ্যা', 'ব্যাখ্যাঃ', 'ব্যাখ্যা:', 'Explanation', 'Solution', 'সমাধান', 'explain']);

      // Subject
      const subject = findKeyValue(row, ['subject_id', 'subject', 'বিষয়', 'বিষয়', 'Subject', 'Subject ID', 'subject_name']);
      const subjectName = findKeyValue(row, ['subject_name', 'subjectName', 'Subject Name']);

      // Chapter
      const chapterId = findKeyValue(row, ['chapter_id', 'chapterId', 'Chapter ID']);
      const chapterName = findKeyValue(row, ['chapter_name', 'chapter', 'অধ্যায়', 'অধ্যায়', 'Chapter Name', 'Chapter']);

      // Tags
      const tagsRaw = findKeyValue(row, ['tags', 'tag', 'ট্যাগ', 'Tags']);

      // Difficulty & Rating
      const difficulty = findKeyValue(row, ['difficulty', 'মান', 'Difficulty', 'লেভেল']);
      const starRating = findKeyValue(row, ['star_rating', 'rating', 'স্টার', 'Star Rating', 'star']);

      // Ignore entirely empty rows
      if (!qText && !optA && !correctAns) {
        return;
      }

      let tagsArr: string[] = [];
      if (typeof tagsRaw === 'string') {
        tagsArr = tagsRaw.split(/[,;]+/).map((t: string) => t.trim()).filter(Boolean);
      } else if (Array.isArray(tagsRaw)) {
        tagsArr = tagsRaw;
      }

      const item = validateAndEnrichQuestion(
        {
          question_text: String(qText || ''),
          options: {
            A: String(optA || ''),
            B: String(optB || ''),
            C: String(optC || ''),
            D: String(optD || ''),
          },
          correct_ans: correctAns ? (String(correctAns) as any) : undefined,
          explanation: String(explanation || ''),
          subject_id: subject ? normalizeSubjectId(String(subject), defaults?.subject_id) : defaults?.subject_id,
          subject_name: subjectName ? String(subjectName) : undefined,
          chapter_id: chapterId ? String(chapterId) : undefined,
          chapter_name: chapterName ? String(chapterName) : undefined,
          tags: tagsArr.length ? tagsArr : undefined,
          difficulty: difficulty ? (String(difficulty).toLowerCase() as any) : undefined,
          star_rating: starRating ? (Number(starRating) as any) : undefined,
        },
        idx,
        defaults
      );

      parsedQuestions.push(item);
    });

    const validCount = parsedQuestions.filter((q) => q.isValid).length;
    const invalidCount = parsedQuestions.length - validCount;

    return {
      success: parsedQuestions.length > 0,
      totalParsed: parsedQuestions.length,
      validCount,
      invalidCount,
      questions: parsedQuestions,
      errors,
    };
  } catch (err: any) {
    return {
      success: false,
      totalParsed: 0,
      validCount: 0,
      invalidCount: 0,
      questions: [],
      errors: [`ফাইল প্রসেসিং ব্যর্থ: ${err.message || 'অজানা ত্রুটি'}`],
    };
  }
}

/**
 * Raw Bengali Text Parser:
 * Parses pasted Bengali/English questions from MS Word, PDF, FB groups, notes, etc.
 * Supports numbers (১., 1., [1], Q1.), options ((ক), ক., A), Ans: ক, ব্যাখ্যা: ..., etc.
 */
export function parseRawBengaliQuestions(
  rawText: string,
  defaults?: BulkDefaults
): BulkParseResult {
  const errors: string[] = [];
  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      totalParsed: 0,
      validCount: 0,
      invalidCount: 0,
      questions: [],
      errors: ['কোনো টেক্সট প্রদান করা হয়নি।'],
    };
  }

  // Normalize newlines and whitespace
  const normalizedText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Strategy 1: Split by numbered question patterns (e.g. \n১., \n1., \nপ্রশ্ন ১:, \nQ1., etc.)
  // We use a regex that matches question number boundaries at the beginning of lines
  const questionBlocks: string[] = [];

  // Regex for question boundary at start of string or following a newline
  const questionBoundaryRegex = /(?:^|\n)(?:(?:প্রশ্ন|Q|Ques|Question)\s*[:\.]?\s*)?(?:[০-৯0-9]+|[IVXLCDMivxlcdm]+)[\.\)\-\:\s]/g;
  
  const matches: { index: number; text: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = questionBoundaryRegex.exec(normalizedText)) !== null) {
    matches.push({ index: match.index, text: match[0] });
  }

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const startIndex = matches[i].index;
      const endIndex = i + 1 < matches.length ? matches[i + 1].index : normalizedText.length;
      const block = normalizedText.substring(startIndex, endIndex).trim();
      if (block) {
        questionBlocks.push(block);
      }
    }
  } else {
    // If no numbered pattern matched, fallback to splitting by double newlines
    const doubleNewlineBlocks = normalizedText.split(/\n\s*\n+/).filter((b) => b.trim().length > 10);
    if (doubleNewlineBlocks.length > 0) {
      questionBlocks.push(...doubleNewlineBlocks);
    } else {
      questionBlocks.push(normalizedText);
    }
  }

  const parsedQuestions: ParsedQuestionItem[] = [];

  questionBlocks.forEach((block, idx) => {
    // Clean leading question numbering (e.g. "১. ", "1) ", "প্রশ্ন ১: ")
    let cleanBlock = block.replace(/^(?:(?:প্রশ্ন|Q|Ques|Question)\s*[:\.]?\s*)?(?:[০-৯0-9]+|[IVXLCDMivxlcdm]+)[\.\)\-\:\s]+\s*/i, '').trim();

    // 1. Extract explanation if present
    let explanation = '';
    const explMatch = cleanBlock.match(/(?:ব্যাখ্যা|ব্যাখ্যাঃ|ব্যাখ্যা:|Solution|Explanation|Expl)\s*[:ঃ=]?\s*([\s\S]+)$/i);
    if (explMatch) {
      explanation = explMatch[1].trim();
      cleanBlock = cleanBlock.substring(0, explMatch.index).trim();
    }

    // 2. Extract answer if present
    let correctAns: 'A' | 'B' | 'C' | 'D' | null = null;
    const ansMatch = cleanBlock.match(/(?:সঠিক উত্তর|উত্তর|উ|উঃ|Ans|Answer|Correct Ans|Correct)\s*[:ঃ=]?\s*([ক-ঘa-dA-D১-৪1-4])/i);
    if (ansMatch) {
      correctAns = normalizeAnswer(ansMatch[1]);
      cleanBlock = cleanBlock.substring(0, ansMatch.index).trim();
    }

    // 3. Extract 4 options (A, B, C, D or ক, খ, গ, ঘ)
    // We support multiline and inline options with formats:
    // (ক), (খ), (গ), (ঘ)
    // ক), খ), গ), ঘ)
    // ক. খ. গ. ঘ.
    // [ক] [খ] [গ] [ঘ]
    // (A), (B), (C), (D)
    // A), B), C), D)
    // A. B. C. D.
    // [A] [B] [C] [D]
    
    let optA = '';
    let optB = '';
    let optC = '';
    let optD = '';
    let questionText = cleanBlock;

    // Try finding option tokens
    // Matcher for option start:
    const optionTokensRegex = /(?:^|\s|\n)(?:\(|\[)?([ক-ঘa-dA-D])(?:\)|\]|\.|\:)\s+/g;
    const optMatches: { index: number; letter: string; fullMatchLen: number }[] = [];
    let oMatch: RegExpExecArray | null;

    while ((oMatch = optionTokensRegex.exec(cleanBlock)) !== null) {
      const letter = oMatch[1].toUpperCase();
      const normLetter = normalizeAnswer(letter);
      if (normLetter) {
        optMatches.push({
          index: oMatch.index,
          letter: normLetter,
          fullMatchLen: oMatch[0].length,
        });
      }
    }

    // Filter down to valid sequence A -> B -> C -> D if multiple matches found
    const aIdx = optMatches.findIndex((m) => m.letter === 'A');
    const bIdx = optMatches.findIndex((m, i) => i > aIdx && m.letter === 'B');
    const cIdx = optMatches.findIndex((m, i) => i > bIdx && m.letter === 'C');
    const dIdx = optMatches.findIndex((m, i) => i > cIdx && m.letter === 'D');

    if (aIdx >= 0 && bIdx > aIdx && cIdx > bIdx && dIdx > cIdx) {
      const aMatch = optMatches[aIdx];
      const bMatch = optMatches[bIdx];
      const cMatch = optMatches[cIdx];
      const dMatch = optMatches[dIdx];

      questionText = cleanBlock.substring(0, aMatch.index).trim();
      optA = cleanBlock.substring(aMatch.index + aMatch.fullMatchLen, bMatch.index).trim();
      optB = cleanBlock.substring(bMatch.index + bMatch.fullMatchLen, cMatch.index).trim();
      optC = cleanBlock.substring(cMatch.index + cMatch.fullMatchLen, dMatch.index).trim();
      optD = cleanBlock.substring(dMatch.index + dMatch.fullMatchLen).trim();
    } else {
      // Fallback: Check if options were written line-by-line
      const lines = cleanBlock.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length >= 5) {
        // Last 4 lines might be options
        const potentialA = lines[lines.length - 4].replace(/^[(\[]?[কaA1১][)\]\.\:\s]+/, '').trim();
        const potentialB = lines[lines.length - 3].replace(/^[(\[]?[খbB2২][)\]\.\:\s]+/, '').trim();
        const potentialC = lines[lines.length - 2].replace(/^[(\[]?[গcC3৩][)\]\.\:\s]+/, '').trim();
        const potentialD = lines[lines.length - 1].replace(/^[(\[]?[ঘdD4৪][)\]\.\:\s]+/, '').trim();

        if (potentialA && potentialB && potentialC && potentialD) {
          optA = potentialA;
          optB = potentialB;
          optC = potentialC;
          optD = potentialD;
          questionText = lines.slice(0, lines.length - 4).join('\n').trim();
        }
      }
    }

    // Also check if answer was inside the text after options
    if (!correctAns) {
      const lateAnsMatch = block.match(/(?:সঠিক উত্তর|উত্তর|উ|উঃ|Ans|Answer|Correct Ans|Correct)\s*[:ঃ=]?\s*([ক-ঘa-dA-D১-৪1-4])/i);
      if (lateAnsMatch) {
        correctAns = normalizeAnswer(lateAnsMatch[1]);
      }
    }

    const item = validateAndEnrichQuestion(
      {
        question_text: questionText,
        options: {
          A: optA,
          B: optB,
          C: optC,
          D: optD,
        },
        correct_ans: correctAns || undefined,
        explanation: explanation,
        subject_id: defaults?.subject_id,
        chapter_id: defaults?.chapter_id,
        chapter_name: defaults?.chapter_name,
        tags: defaults?.tags,
        difficulty: defaults?.difficulty,
      },
      idx,
      defaults
    );

    parsedQuestions.push(item);
  });

  const validCount = parsedQuestions.filter((q) => q.isValid).length;
  const invalidCount = parsedQuestions.length - validCount;

  return {
    success: parsedQuestions.length > 0,
    totalParsed: parsedQuestions.length,
    validCount,
    invalidCount,
    questions: parsedQuestions,
    errors,
  };
}

/**
 * Sample Admission Questions for Templates
 */
export const SAMPLE_QUESTIONS_TEMPLATE_DATA = [
  {
    question_text: 'একটি প্রক্ষেপকের সর্বাধিক পাল্লা $R_{max}$ এবং সর্বাধিক উচ্চতা $H$ এর মধ্যে সম্পর্ক কোনটি?',
    option_a: '$R_{max} = 4H$',
    option_b: '$R_{max} = 2H$',
    option_c: '$R_{max} = H/4$',
    option_d: '$R_{max} = H/2$',
    correct_ans: 'A',
    explanation: 'আমরা জানি, সর্বাধিক পাল্লা $R_{max} = \\frac{v_0^2}{g}$ (যখন $\\theta = 45^\\circ$)। তখন উচ্চতা $H = \\frac{v_0^2 \\sin^2(45^\\circ)}{2g} = \\frac{v_0^2}{4g}$। অতএব, $R_{max} = 4H$।',
    subject_id: 'physics_1',
    subject_name: 'Physics 1st Paper',
    chapter_id: 'phy1_ch3',
    chapter_name: 'গতিবিদ্যা',
    tags: 'DU Ka 23-24, Important, Vector',
    difficulty: 'medium',
    star_rating: 3,
  },
  {
    question_text: 'নিচের কোনটিতে সবচেয়ে শক্তিশালী হাইড্রোজেন বন্ধন বিদ্যমান?',
    option_a: '$H_2O$',
    option_b: '$HF$',
    option_c: '$NH_3$',
    option_d: '$CH_3OH$',
    correct_ans: 'B',
    explanation: 'ফ্লোরিন ($F$) পর্যায় সারণীর সর্বাধিক তড়িৎ-ঋণাত্মক মৌল (তড়িৎ ঋণাত্মকতা $4.0$)। ফলে $H-F$ বন্ধনে সর্বাধিক পোলারিটি সৃষ্টি হয় এবং সবচেয়ে শক্তিশালী হাইড্রোজেন বন্ধন গঠিত হয়।',
    subject_id: 'chemistry_1',
    subject_name: 'Chemistry 1st Paper',
    chapter_id: 'chem1_ch3',
    chapter_name: 'মৌলের পর্যায়বৃত্ত ধর্ম ও রাসায়নিক বন্ধন',
    tags: 'Medical 22-23, BUET, Chemical Bond',
    difficulty: 'easy',
    star_rating: 3,
  },
  {
    question_text: '$\\lim_{x \\to 0} \\frac{\\sin 5x}{\\ln(1 + 2x)}$ এর মান কত?',
    option_a: '5/2',
    option_b: '2/5',
    option_c: '5',
    option_d: '0',
    correct_ans: 'A',
    explanation: 'L\'Hospital এর নিয়ম প্রয়োগ করে: $\\lim_{x \\to 0} \\frac{5\\cos 5x}{\\frac{2}{1+2x}} = \\frac{5(1)}{2} = \\frac{5}{2}$।',
    subject_id: 'math_1',
    subject_name: 'Higher Math 1st Paper',
    chapter_id: 'math1_ch9',
    chapter_name: 'অন্তরীকরণ',
    tags: 'DU Ka, Calculus, Limits',
    difficulty: 'medium',
    star_rating: 3,
  },
  {
    question_text: 'মানবদেহে ইউরিয়া তৈরির মূল অঙ্গ কোনটি?',
    option_a: 'যকৃৎ (Liver)',
    option_b: 'বৃক্ক (Kidney)',
    option_c: 'ফুসফুস (Lungs)',
    option_d: 'হৃদপিণ্ড (Heart)',
    correct_ans: 'A',
    explanation: 'যকৃতে অরনিথিন চক্রের (Ornithine cycle) মাধ্যমে বিষাক্ত অ্যামোনিয়া থেকে কম বিষাক্ত ইউরিয়া তৈরি হয়। বৃক্ক মূলত ইউরিয়া রক্ত থেকে ফিল্টার করে মূত্রের মাধ্যমে বের করে দেয়।',
    subject_id: 'biology_2',
    subject_name: 'Biology 2nd Paper',
    chapter_id: 'bio2_ch3',
    chapter_name: 'মানব শারীরতত্ত্ব: পরিপাক ও শোষণ',
    tags: 'Medical 23-24, DU Ka, Physiology',
    difficulty: 'easy',
    star_rating: 3,
  }
];

/**
 * Downloads ready-made Excel Template (.xlsx)
 */
export function downloadExcelTemplate() {
  const ws = XLSX.utils.json_to_sheet(SAMPLE_QUESTIONS_TEMPLATE_DATA);

  // Set nice column widths
  ws['!cols'] = [
    { wch: 45 }, // question_text
    { wch: 20 }, // option_a
    { wch: 20 }, // option_b
    { wch: 20 }, // option_c
    { wch: 20 }, // option_d
    { wch: 12 }, // correct_ans
    { wch: 45 }, // explanation
    { wch: 16 }, // subject_id
    { wch: 22 }, // subject_name
    { wch: 15 }, // chapter_id
    { wch: 25 }, // chapter_name
    { wch: 25 }, // tags
    { wch: 12 }, // difficulty
    { wch: 12 }, // star_rating
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Questions_Template');

  XLSX.writeFile(wb, 'preptest_bulk_questions_template.xlsx');
}

/**
 * Downloads ready-made CSV Template (.csv) with UTF-8 BOM
 */
export function downloadCsvTemplate() {
  const ws = XLSX.utils.json_to_sheet(SAMPLE_QUESTIONS_TEMPLATE_DATA);
  const csvContent = XLSX.utils.sheet_to_csv(ws);
  
  // Add UTF-8 BOM for proper Bengali rendering in Excel
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'preptest_bulk_questions_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads ready-made JSON Template (.json)
 */
export function downloadJsonTemplate() {
  const jsonString = JSON.stringify(SAMPLE_QUESTIONS_TEMPLATE_DATA, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'preptest_bulk_questions_template.json');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Sample Written Questions Template Data
 */
export const SAMPLE_WRITTEN_TEMPLATE_DATA = [
  {
    question_text: 'একটি সমাতল দর্পণের ফোকাস দূরত্ব কত এবং কেন?',
    answer_text: 'সমতল দর্পণের ফোকাস দূরত্ব অসীম (infinity)। কারণ সমতল দর্পণের পৃষ্ঠ সমতল হওয়ায় এর বক্রতার ব্যাসার্ধ r = ∞, তাই f = r/2 = ∞।',
    subject_id: 'physics_2',
    subject_name: 'Physics 2nd Paper',
    chapter_id: 'phy2_ch6',
    chapter_name: 'জ্যামিতিক আলোকবিজ্ঞান',
    topic_id: 'phy2_ch6_t01',
    topic_name: 'দর্পণ ও প্রতিফলন',
    marks: 5,
    tags: 'BUET 22-23, Written',
    difficulty: 'medium'
  },
  {
    question_text: 'বেনজিনের রেজোন্যান্স গঠন এঁকে ব্যাখ্যা করো।',
    answer_text: 'বেনজিনে ৬টি কার্বন পরমাণু একক ও দ্বিবন্ধন দ্বারা পর্যায়ক্রমে যুক্ত থাকে। ৬টি পাই ইলেকট্রন ডিলোকালাইজড অবস্থায় পুরো রিং জুড়ে আবর্তিত হয়।',
    subject_id: 'chemistry_2',
    subject_name: 'Chemistry 2nd Paper',
    chapter_id: 'chem2_ch2',
    chapter_name: 'জৈব রসায়ন',
    topic_id: 'chem2_ch2_t03',
    topic_name: 'অ্যারোমেটিক যৌগ',
    marks: 10,
    tags: 'DU Written 21-22',
    difficulty: 'hard'
  }
];

export function downloadWrittenQuestionCsvTemplate() {
  const ws = XLSX.utils.json_to_sheet(SAMPLE_WRITTEN_TEMPLATE_DATA);
  const csvContent = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'preptest_written_questions_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadWrittenQuestionJsonTemplate() {
  const jsonString = JSON.stringify(SAMPLE_WRITTEN_TEMPLATE_DATA, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'preptest_written_questions_template.json');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Sample Topics Template Data
 */
export const SAMPLE_TOPICS_TEMPLATE_DATA = [
  {
    id: 'bio2_ch1_t03',
    name: 'প্রতিসাম্যতা ও সিলেম',
    bangla_name: 'প্রতিসাম্যতা ও সিলেম',
    chapter_id: 'bio2_ch1',
    chapter_name: 'প্রাণীর শ্রেণিবিন্যাস',
    subject_id: 'biology_2',
    paper: '2nd',
    star_rating: 3,
    topic_code: 'b2c1_s3'
  },
  {
    id: 'phy1_ch3_t02',
    name: 'প্রক্ষেপক বা প্রজেক্টাইল',
    bangla_name: 'প্রক্ষেপক বা প্রজেক্টাইল',
    chapter_id: 'phy1_ch3',
    chapter_name: 'গতিবিদ্যা',
    subject_id: 'physics_1',
    paper: '1st',
    star_rating: 3,
    topic_code: 'p1c3_s2'
  }
];

export function downloadTopicCsvTemplate() {
  const ws = XLSX.utils.json_to_sheet(SAMPLE_TOPICS_TEMPLATE_DATA);
  const csvContent = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'preptest_topics_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadTopicJsonTemplate() {
  const jsonString = JSON.stringify(SAMPLE_TOPICS_TEMPLATE_DATA, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'preptest_topics_template.json');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Sample Knowledge Snippets Template Data
 */
export const SAMPLE_KNOWLEDGE_SNIPPETS_TEMPLATE_DATA = [
  {
    title: 'সর্বাধিক শক্তিশালী হাইড্রোজেন বন্ধন',
    content: 'ফ্লোরিনের উচ্চ তড়িৎ-ঋণাত্মকতার (4.0) কারণে HF-এ সবচেয়ে শক্তিশালী হাইড্রোজেন বন্ধন দেখা যায়।',
    subject_id: 'chemistry_1',
    chapter_id: 'chem1_ch3',
    topic_id: 'chem1_ch3_t02',
    importance: 'top_priority',
    star_rating: 3,
    tags: 'Chemical Bonding, Quick Revision'
  },
  {
    title: 'প্রক্ষেপকের সর্বাধিক পাল্লা (Maximum Range)',
    content: 'প্রক্ষেপণ কোণ θ = 45° হলে সর্বাধিক পাল্লা পাওয়া যায়, R_max = v0^2 / g। এ সময় সর্বাধিক উচ্চতা H = R_max / 4।',
    subject_id: 'physics_1',
    chapter_id: 'phy1_ch3',
    topic_id: 'phy1_ch3_t02',
    importance: 'high',
    star_rating: 3,
    tags: 'Dynamics, Projectile Formula'
  }
];

export function downloadKnowledgeSnippetCsvTemplate() {
  const ws = XLSX.utils.json_to_sheet(SAMPLE_KNOWLEDGE_SNIPPETS_TEMPLATE_DATA);
  const csvContent = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'preptest_knowledge_snippets_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadKnowledgeSnippetJsonTemplate() {
  const jsonString = JSON.stringify(SAMPLE_KNOWLEDGE_SNIPPETS_TEMPLATE_DATA, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'preptest_knowledge_snippets_template.json');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
