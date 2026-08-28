import pg from 'pg';
import dotenv from 'dotenv';
import { INITIAL_QUESTIONS, CHAPTERS_DATA, SUBJECTS_DATA, INITIAL_KNOWLEDGE_SNIPPETS } from '../src/data/admissionData.js';
import { INITIAL_WRITTEN_QUESTIONS } from '../src/data/writtenQuestionsData.js';
import { Question, WrittenQuestion, KnowledgeSnippet, TopicRecord } from '../src/types.js';
import { logger } from './utils/logger.js';
import { runMigrations } from './migrations.js';

dotenv.config();

const { Pool } = pg;

// Dynamic PostgreSQL Connection Pool management
let poolInstance: pg.Pool | null = null;

export function getPgPool(): pg.Pool | null {
  if (poolInstance) return poolInstance;

  const connectionString = process.env.DATABASE_URL || '';
  if (!connectionString) return null;

  const isRemote =
    connectionString.includes('sslmode=require') ||
    (!connectionString.includes('localhost') &&
      !connectionString.includes('127.0.0.1') &&
      connectionString.startsWith('postgres'));

  poolInstance = new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
  });

  poolInstance.on('error', (err) => {
    if (isPgConnected) {
      console.warn('[PostgreSQL Pool Error]:', err.message);
    }
  });

  return poolInstance;
}

// Backward-compatible export
export const pool = getPgPool();

let isPgConnected = false;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

// In-Memory Data Storage (serves as resilient fallback if PostgreSQL is not running/connected)
export const memoryStore = {
  questions: new Map<string, Question>(),
  writtenQuestions: new Map<string, WrittenQuestion>(),
  topics: new Map<string, TopicRecord>(),
  snippets: new Map<string, KnowledgeSnippet>(),
  users: new Map<string, UserRecord>(),
  userProgress: new Map<string, any>(),
  chatHistory: [] as Array<{
    id: string;
    userId: string;
    role: 'user' | 'assistant';
    content: string;
    modelUsed?: string;
    provider?: string;
    createdAt: number;
  }>,
  adminDrafts: new Map<string, AdminDraftRow>(),
  adminSettings: new Map<string, string>(),
};

// Seed in-memory store initially
export function seedMemoryStore() {
  if (memoryStore.topics.size > 0) return;

  // 1. Topics
  if (Array.isArray(CHAPTERS_DATA)) {
    for (const chap of CHAPTERS_DATA) {
      if (chap.subtopics && chap.subtopics.length > 0) {
        for (const st of chap.subtopics) {
          const tRecord: TopicRecord = {
            id: st.id,
            chapter_id: chap.id,
            subject_id: chap.subject_id,
            paper: chap.paper,
            topic_code: st.topic_code || undefined,
            name: st.name,
            bangla_name: st.bangla_name,
            star_rating: (st.star_rating as 1 | 2 | 3) || 3,
            total_questions: 0,
            completed_questions: 0,
            mcq_count: 0,
            written_count: 0,
            exam_occurrences: st.exam_occurrences,
            key_points: st.key_points,
            created_at: Date.now(),
          };
          memoryStore.topics.set(tRecord.id, tRecord);
        }
      }
    }
  }

  // 2. Snippets
  const BASE_KNOWLEDGE_SNIPPETS: KnowledgeSnippet[] = [
    {
      id: 'ks_q1',
      type: 'quote',
      content_bn: 'কঠিন পরিশ্রম কখনো ব্যর্থ হয় না। ঢাকা বিশ্ববিদ্যালয়ের লাল বাসে চড়ার স্বপ্ন পূরণ তোমার হাতেই!',
    },
    {
      id: 'ks_q2',
      type: 'quote',
      content_bn: 'আজকের ২ ঘণ্টার অতিরিক্ত পড়াশোনা পরীক্ষার হলে তোমার ৫টি অতিরিক্ত সঠিক উত্তর এনে দেবে।',
    },
    {
      id: 'ks_q3',
      type: 'quote',
      content_bn: 'ভর্তি পরীক্ষা এক ঘণ্টার যুদ্ধ, তবে বিজয়ী নির্ধারণ হয় বিগত মাসের প্রতিদিনের ধারাবাহিকতায়।',
    },
    {
      id: 'ks_q4',
      type: 'quote',
      content_bn: 'তোমার প্রতিদ্বন্দ্বী যখন ঘুমাচ্ছে, তখন তুমি আরেকটি শর্টকাট ফর্মুলা আয়ত্ত করে নাও।',
    },
    {
      id: 'ks_f1',
      type: 'formula',
      content_bn: 'পদার্থবিজ্ঞান ১ম পত্র — কাজ ও শক্তি: কাজ-শক্তি উপপاد্য (Work-Energy Theorem):',
      content_latex: '$W = \\Delta E_k = \\frac{1}{2}m(v^2 - u^2)$',
      subject_id: 'physics_1',
    },
    {
      id: 'ks_f2',
      type: 'formula',
      content_bn: 'রসায়ন ১ম পত্র — দ্রাব্যতা গুণফল: $A_n B_m$ টাইপ লবণের দ্রাব্যতা গুণফল $K_{sp}$ নির্ণয়:',
      content_latex: '$K_{sp} = (n^n \\cdot m^m) \\cdot s^{(n+m)}$',
      subject_id: 'chemistry_1',
    },
    {
      id: 'ks_f3',
      type: 'formula',
      content_bn: 'উচ্চতর গণিত ১ম পত্র — পরাবৃত্তের প্রমিত সমীকরণ ও উপকৌণিক লম্বের দৈর্ঘ্য:',
      content_latex: '$y^2 = 4ax \\implies \\text{উপকেন্দ্রিক লম্বের দৈর্ঘ্য} = |4a|$',
      subject_id: 'math_1',
    },
    {
      id: 'ks_f4',
      type: 'formula',
      content_bn: 'পদার্থবিজ্ঞান ২য় পত্র — মহাকর্ষ ও অভিকর্ষ: পৃথিবীর পৃষ্ঠ হতে মুক্তিবেগের সূত্র:',
      content_latex: '$v_e = \\sqrt{2gR} = \\sqrt{\\frac{2GM}{R}} \\approx 11.2 \\text{ km/s}$',
      subject_id: 'physics_2',
    },
    {
      id: 'ks_f5',
      type: 'formula',
      content_bn: 'উচ্চতর গণিত ২য় পত্র — দ্বিঘাত সমীকরণের মূলদ্বয়ের যোগফল ও গুণফল:',
      content_latex: '$ax^2 + bx + c = 0 \\implies \\alpha + \\beta = -\\frac{b}{a}, \\; \\alpha \\beta = \\frac{c}{a}$',
      subject_id: 'math_2',
    },
    {
      id: 'ks_f6',
      type: 'formula',
      content_bn: 'রসায়ন ২য় পত্র — তড়িৎ রসায়ন: ফ্যারাডের ১ম সূত্র (তড়িৎ বিশ্লেষণ):',
      content_latex: '$W = ZIt = \\left(\\frac{M}{nF}\\right) I t$',
      subject_id: 'chemistry_2',
    },
    {
      id: 'ks_g1',
      type: 'gk',
      content_bn: 'ঢাকা বিশ্ববিদ্যালয়ের প্রতিষ্ঠাকাল ও প্রথম উপাচার্যের নাম কী?',
      answer_bn: '১৯২১ সালের ১ জুলাই; প্রথম উপাচার্য স্যার পি. জে. হার্টগ।',
      subject_id: 'gk',
    },
    {
      id: 'ks_g2',
      type: 'gk',
      content_bn: 'বাংলাদেশের প্রথম ভূ-উপগ্রহ কেন্দ্র কোথায় এবং কত সালে স্থাপিত হয়?',
      answer_bn: 'রাঙামাটির বেতবুনিয়ায়, ১৯৭৫ সালের ১৪ জুন।',
      subject_id: 'gk',
    },
    {
      id: 'ks_g3',
      type: 'gk',
      content_bn: 'বুয়েট (BUET) কত সালে পূর্ণাঙ্গ বিশ্ববিদ্যালয় হিসেবে আত্মপ্রকাশ করে?',
      answer_bn: '১৯৬২ সালে (ইস্ট পাকিস্তান ইউনিভার্সিটি অফ ইঞ্জিনিয়ারিং অ্যান্ড টেকনোলজি হিসেবে)।',
      subject_id: 'gk',
    },
    {
      id: 'ks_g4',
      type: 'gk',
      content_bn: 'ইউনেস্কো কত সালে ২১শে ফেব্রুয়ারিকে আন্তর্জাতিক মাতৃভাষা দিবস হিসেবে স্বীকৃতি দেয়?',
      answer_bn: '১৯৯৯ সালের ১৭ নভেম্বর (৩০তম সাধারণ অধিবেশনে)।',
      subject_id: 'gk',
    },
    {
      id: 'ks_c1',
      type: 'concept',
      content_bn: 'বুয়েট/DU ট্র্যাপ: তরঙ্গের দশা পার্থক্য (Phase Difference) ও পথ পার্থক্যের (Path Difference) সম্পর্ক হল: $\\delta = \\frac{2\\pi}{\\lambda} \\times x$। পরীক্ষার হলে $\\pi$ বাদ দিয়ে ভুল কোরো না।',
      subject_id: 'physics_1',
    },
    {
      id: 'ks_c2',
      type: 'concept',
      content_bn: 'pH নো-ক্যালকুলেটর ট্র্যাপ: $[H^+] = 2 \\times 10^{-3}$ M হলে, $pH = 3 - \\log_{10}(2) = 3 - 0.3010 = 2.70$। এই শর্টকাট DU "ক" ইউনিটে ক্যালকুলেটর ছাড়াই সমাধান করতে সাহায্য করে।',
      subject_id: 'chemistry_1',
    },
    {
      id: 'ks_c3',
      type: 'concept',
      content_bn: 'লিমিনেটিং ভ্যালু ট্র্যাপ: $\\lim_{x \\to 0} \\frac{\\sin ax}{x} = a$ এবং $\\lim_{x \\to 0} \\frac{\\tan ax}{\\sin bx} = \\frac{a}{b}$। সরাসরি L\'Hopital প্রয়োগ না করেও চোখের পলকে উত্তর পাওয়া যায়!',
      subject_id: 'math_1',
    },
    {
      id: 'ks_c4',
      type: 'concept',
      content_bn: 'ডপলার প্রভাব ট্র্যাপ: উৎস গতিশীল এবং শ্রোতা স্থির হলে কম্পাঙ্কের পরিবর্তন $f\' = f \\left(\\frac{v}{v \\mp v_s}\\right)$। উৎস কাছে আসলে হরে মাইনাস (-) চিহ্ন বসবে।',
      subject_id: 'physics_1',
    },
  ];

  const allSnippets = [...BASE_KNOWLEDGE_SNIPPETS, ...INITIAL_KNOWLEDGE_SNIPPETS];
  for (const s of allSnippets) {
    memoryStore.snippets.set(s.id, { ...s, active: s.active !== undefined ? s.active : 1 });
  }
}

seedMemoryStore();

// Safe PostgreSQL Query Runner
export async function query(text: string, params?: any[]): Promise<pg.QueryResult<any> | null> {
  await getDatabase();
  const activePool = getPgPool();
  if (isPgConnected && activePool) {
    try {
      return await activePool.query(text, params);
    } catch (err: any) {
      console.warn('[PostgreSQL Query Warn]', err.message);
      return null;
    }
  }
  return null;
}

export function isPostgresActive(): boolean {
  return isPgConnected;
}

export function getDatabaseConnectionInfo() {
  const conn = process.env.DATABASE_URL || '';
  let sanitizedUrl = 'Not configured';
  if (conn) {
    try {
      const u = new URL(conn);
      sanitizedUrl = `${u.protocol}//${u.username ? '***:***@' : ''}${u.host}${u.pathname}`;
    } catch {
      sanitizedUrl = conn.substring(0, 15) + '...';
    }
  }
  return {
    isPostgresConnected: isPgConnected,
    mode: isPgConnected ? 'postgresql' : 'memory_fallback',
    connectionString: sanitizedUrl,
  };
}

// Initialize Database connection and table schemas
export async function getDatabase(): Promise<void> {
  if (isInitialized) {
    return;
  }

  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    seedMemoryStore();

    const connectionString = process.env.DATABASE_URL || '';
    if (!connectionString) {
      console.log('[Database] ℹ️ Running in embedded memory mode (set DATABASE_URL in .env to connect to PostgreSQL).');
      isInitialized = true;
      return;
    }

    try {
      const activePool = getPgPool();
      if (!activePool) {
        isInitialized = true;
        return;
      }

      console.log('[PostgreSQL] 🔌 Testing connection to PostgreSQL...');
      const client = await Promise.race([
        activePool.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PostgreSQL connection timeout (3000ms)')), 3000)
        ),
      ]);
      client.release();
      isPgConnected = true;
      console.log('[PostgreSQL] ✅ Connected successfully. Running migration tool...');

      // Run versioned migrations
      try {
        await runMigrations(activePool);
      } catch (mErr: any) {
        logger.warn('[PostgreSQL Migrations warning]: ' + mErr.message);
      }

      await activePool.query(`
        CREATE TABLE IF NOT EXISTS topics (
          id VARCHAR(255) PRIMARY KEY,
          chapter_id VARCHAR(255) NOT NULL,
          subject_id VARCHAR(255),
          paper VARCHAR(50),
          topic_code VARCHAR(100),
          name TEXT NOT NULL,
          bangla_name TEXT NOT NULL,
          star_rating INTEGER DEFAULT 3,
          total_questions INTEGER DEFAULT 0,
          completed_questions INTEGER DEFAULT 0,
          mcq_count INTEGER DEFAULT 0,
          written_count INTEGER DEFAULT 0,
          exam_occurrences TEXT,
          key_points TEXT,
          created_at BIGINT
        );

        CREATE TABLE IF NOT EXISTS questions (
          id VARCHAR(255) PRIMARY KEY,
          subject_id VARCHAR(255) NOT NULL,
          subject_name VARCHAR(255) NOT NULL,
          paper VARCHAR(50) NOT NULL,
          chapter_id VARCHAR(255) NOT NULL,
          chapter_name VARCHAR(255) NOT NULL,
          topic_id VARCHAR(255) REFERENCES topics(id) ON DELETE SET NULL,
          topic_name VARCHAR(255),
          category VARCHAR(100),
          question_text TEXT NOT NULL,
          math_formula_latex TEXT,
          options TEXT NOT NULL,
          correct_ans VARCHAR(10) NOT NULL,
          explanation TEXT NOT NULL,
          explanation_latex TEXT,
          question_image_url TEXT,
          explanation_image_url TEXT,
          tags TEXT NOT NULL,
          star_rating INTEGER DEFAULT 3,
          type VARCHAR(50) DEFAULT 'mcq',
          difficulty VARCHAR(50) DEFAULT 'medium',
          created_at BIGINT
        );

        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          phone VARCHAR(50) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name VARCHAR(255) NOT NULL,
          target_university VARCHAR(100) DEFAULT 'du_a',
          target_unit VARCHAR(100) DEFAULT '''ক'' ইউনিট (বিজ্ঞান)',
          exam_year VARCHAR(50) DEFAULT 'HSC-26',
          college VARCHAR(255) DEFAULT 'ঢাকা কলেজ',
          avatar VARCHAR(50) DEFAULT '🧑‍🎓',
          avatar_color VARCHAR(50) DEFAULT '#2563eb',
          created_at BIGINT
        );

        CREATE TABLE IF NOT EXISTS user_progress (
          user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          points INTEGER DEFAULT 50,
          streak_days INTEGER DEFAULT 1,
          exams_completed INTEGER DEFAULT 0,
          total_correct INTEGER DEFAULT 0,
          total_wrong INTEGER DEFAULT 0,
          accuracy DOUBLE PRECISION DEFAULT 0.0,
          bookmarks TEXT DEFAULT '[]',
          past_mistakes TEXT DEFAULT '[]',
          exam_history TEXT DEFAULT '[]',
          daily_points TEXT DEFAULT '[0,0,0,0,0,0,0]',
          completed_journey_tasks TEXT DEFAULT '[]',
          updated_at BIGINT
        );

        CREATE TABLE IF NOT EXISTS chat_history (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          model_used VARCHAR(255),
          provider VARCHAR(100),
          created_at BIGINT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS knowledge_snippets (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          content_bn TEXT NOT NULL,
          content_latex TEXT,
          answer_bn TEXT,
          subject_id VARCHAR(255),
          active INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS admin_drafts (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          payload TEXT NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          source_model VARCHAR(255),
          source_info TEXT,
          created_at BIGINT NOT NULL,
          updated_at BIGINT
        );

        CREATE TABLE IF NOT EXISTS admin_settings (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at BIGINT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_questions_subject_chapter ON questions(subject_id, chapter_id);
        CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
        CREATE INDEX IF NOT EXISTS idx_topics_chapter ON topics(chapter_id);
        CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_admin_drafts_status ON admin_drafts(status);

        -- Safe column migrations for existing PostgreSQL databases
        ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_image_url TEXT;
        ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation_image_url TEXT;
      `);

      // Seed Topics in PG
      for (const t of memoryStore.topics.values()) {
        await activePool.query(
          `INSERT INTO topics (
            id, chapter_id, subject_id, paper, topic_code, name, bangla_name,
            star_rating, total_questions, completed_questions, mcq_count, written_count,
            exam_occurrences, key_points, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (id) DO NOTHING`,
          [
            t.id,
            t.chapter_id,
            t.subject_id || null,
            t.paper || null,
            t.topic_code || null,
            t.name,
            t.bangla_name,
            t.star_rating,
            t.total_questions,
            t.completed_questions,
            t.mcq_count,
            t.written_count,
            t.exam_occurrences ? JSON.stringify(t.exam_occurrences) : null,
            t.key_points ? JSON.stringify(t.key_points) : null,
            t.created_at || Date.now(),
          ]
        );
      }

      // Seed Snippets in PG
      for (const s of memoryStore.snippets.values()) {
        await activePool.query(
          `INSERT INTO knowledge_snippets (id, type, content_bn, content_latex, answer_bn, subject_id, active)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [s.id, s.type, s.content_bn, s.content_latex || null, s.answer_bn || null, s.subject_id || null, s.active ?? 1]
        );
      }

      console.log(`[PostgreSQL] ✅ Initialized & synced ${memoryStore.topics.size} topics into PostgreSQL.`);
    } catch (err: any) {
      isPgConnected = false;
      if (poolInstance) {
        try {
          await poolInstance.end();
        } catch {
          // ignore pool termination error on failed connection
        }
        poolInstance = null;
      }
      console.log(`[Database] PostgreSQL not connected (${err.message}). Seamlessly running with in-memory storage fallback.`);
    } finally {
      isInitialized = true;
    }
  })();

  await initPromise;
}

// ---------------- KNOWLEDGE SNIPPETS ----------------

export async function getAllKnowledgeSnippets(): Promise<KnowledgeSnippet[]> {
  try {
    const res = await query('SELECT * FROM knowledge_snippets WHERE active = 1 ORDER BY RANDOM()');
    if (res && res.rows) {
      return res.rows.map((r: any) => ({
        id: String(r.id),
        type: r.type,
        content_bn: r.content_bn,
        content_latex: r.content_latex || undefined,
        answer_bn: r.answer_bn || undefined,
        subject_id: r.subject_id || undefined,
        active: Number(r.active) ?? 1,
      }));
    }
  } catch (err) {
    // fallback
  }

  return Array.from(memoryStore.snippets.values()).filter((s) => s.active !== 0);
}

export async function insertKnowledgeSnippet(s: Partial<KnowledgeSnippet>): Promise<KnowledgeSnippet> {
  const id = s.id || `snip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: KnowledgeSnippet = {
    id,
    type: (s.type as any) || 'concept',
    content_bn: s.content_bn || '',
    content_latex: s.content_latex,
    answer_bn: s.answer_bn,
    subject_id: s.subject_id,
    active: s.active !== undefined ? s.active : 1,
  };

  memoryStore.snippets.set(id, item);

  await query(
    `INSERT INTO knowledge_snippets (id, type, content_bn, content_latex, answer_bn, subject_id, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       type = EXCLUDED.type,
       content_bn = EXCLUDED.content_bn,
       content_latex = EXCLUDED.content_latex,
       answer_bn = EXCLUDED.answer_bn,
       subject_id = EXCLUDED.subject_id,
       active = EXCLUDED.active`,
    [id, item.type, item.content_bn, item.content_latex || null, item.answer_bn || null, item.subject_id || null, item.active ?? 1]
  );

  return item;
}

// ---------------- TOPICS ----------------

export function formatRowToTopic(row: any): TopicRecord {
  let exam_occurrences = undefined;
  if (row.exam_occurrences) {
    try {
      exam_occurrences = typeof row.exam_occurrences === 'string' ? JSON.parse(row.exam_occurrences) : row.exam_occurrences;
    } catch (e) {
      exam_occurrences = undefined;
    }
  }

  let key_points = undefined;
  if (row.key_points) {
    try {
      key_points = typeof row.key_points === 'string' ? JSON.parse(row.key_points) : row.key_points;
    } catch (e) {
      key_points = undefined;
    }
  }

  return {
    id: String(row.id),
    chapter_id: row.chapter_id,
    subject_id: row.subject_id || undefined,
    paper: row.paper || undefined,
    topic_code: row.topic_code || undefined,
    name: row.name,
    bangla_name: row.bangla_name,
    star_rating: (row.star_rating as 1 | 2 | 3) || 3,
    total_questions: Number(row.total_questions) || 0,
    completed_questions: Number(row.completed_questions) || 0,
    mcq_count: Number(row.mcq_count) || 0,
    written_count: Number(row.written_count) || 0,
    varsity_a_count: Number(row.varsity_a_count) || 0,
    engineering_count: Number(row.engineering_count) || 0,
    medical_count: Number(row.medical_count) || 0,
    academic_count: Number(row.academic_count) || 0,
    main_book_count: Number(row.main_book_count) || 0,
    exam_occurrences,
    key_points,
    created_at: Number(row.created_at) || undefined,
  };
}

export async function getAllTopics(filters?: {
  chapter_id?: string;
  subject_id?: string;
  paper?: string;
  search?: string;
}): Promise<TopicRecord[]> {
  try {
    let sql = 'SELECT * FROM topics WHERE 1=1';
    const params: any[] = [];
    let pIdx = 1;

    if (filters?.chapter_id) {
      sql += ` AND chapter_id = $${pIdx++}`;
      params.push(filters.chapter_id);
    }
    if (filters?.subject_id) {
      sql += ` AND subject_id = $${pIdx++}`;
      params.push(filters.subject_id);
    }
    if (filters?.paper) {
      sql += ` AND paper = $${pIdx++}`;
      params.push(filters.paper);
    }
    if (filters?.search) {
      const term = `%${filters.search}%`;
      sql += ` AND (name ILIKE $${pIdx++} OR bangla_name ILIKE $${pIdx++} OR topic_code ILIKE $${pIdx++})`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY topic_code ASC, id ASC';

    const res = await query(sql, params);
    if (res && res.rows) {
      return res.rows.map(formatRowToTopic);
    }
  } catch (err) {}

  // Fallback to in-memory filter
  let list = Array.from(memoryStore.topics.values());
  if (filters?.chapter_id) {
    list = list.filter((t) => t.chapter_id === filters.chapter_id);
  }
  if (filters?.subject_id) {
    list = list.filter((t) => t.subject_id === filters.subject_id);
  }
  if (filters?.paper) {
    list = list.filter((t) => t.paper === filters.paper);
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    list = list.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        t.bangla_name.toLowerCase().includes(s) ||
        (t.topic_code && t.topic_code.toLowerCase().includes(s))
    );
  }
  return list;
}

export async function getTopicById(id: string): Promise<TopicRecord | null> {
  try {
    const res = await query('SELECT * FROM topics WHERE id = $1', [id]);
    if (res && res.rows.length > 0) return formatRowToTopic(res.rows[0]);
  } catch (err) {}

  return memoryStore.topics.get(id) || null;
}

export async function insertTopic(t: Partial<TopicRecord>): Promise<TopicRecord> {
  const id = t.id || `topic_${t.chapter_id || 'ch'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const item: TopicRecord = {
    id,
    chapter_id: t.chapter_id || 'chem1_ch1',
    subject_id: t.subject_id,
    paper: t.paper,
    topic_code: t.topic_code,
    name: t.name || t.bangla_name || 'New Topic',
    bangla_name: t.bangla_name || t.name || 'নতুন টপিক',
    star_rating: (t.star_rating as 1 | 2 | 3) || 3,
    total_questions: Number(t.total_questions) || 0,
    completed_questions: Number(t.completed_questions) || 0,
    mcq_count: Number(t.mcq_count) || 0,
    written_count: Number(t.written_count) || 0,
    varsity_a_count: Number(t.varsity_a_count) || 0,
    engineering_count: Number(t.engineering_count) || 0,
    medical_count: Number(t.medical_count) || 0,
    academic_count: Number(t.academic_count) || 0,
    main_book_count: Number(t.main_book_count) || 0,
    exam_occurrences: t.exam_occurrences,
    key_points: t.key_points,
    created_at: Date.now(),
  };

  memoryStore.topics.set(id, item);

  await query(
    `INSERT INTO topics (
      id, chapter_id, subject_id, paper, topic_code, name, bangla_name,
      star_rating, total_questions, completed_questions, mcq_count, written_count,
      varsity_a_count, engineering_count, medical_count, academic_count, main_book_count,
      exam_occurrences, key_points, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    ON CONFLICT (id) DO UPDATE SET
      chapter_id = EXCLUDED.chapter_id,
      subject_id = EXCLUDED.subject_id,
      paper = EXCLUDED.paper,
      topic_code = EXCLUDED.topic_code,
      name = EXCLUDED.name,
      bangla_name = EXCLUDED.bangla_name,
      star_rating = EXCLUDED.star_rating,
      total_questions = EXCLUDED.total_questions,
      completed_questions = EXCLUDED.completed_questions,
      mcq_count = EXCLUDED.mcq_count,
      written_count = EXCLUDED.written_count,
      varsity_a_count = EXCLUDED.varsity_a_count,
      engineering_count = EXCLUDED.engineering_count,
      medical_count = EXCLUDED.medical_count,
      academic_count = EXCLUDED.academic_count,
      main_book_count = EXCLUDED.main_book_count,
      exam_occurrences = EXCLUDED.exam_occurrences,
      key_points = EXCLUDED.key_points`,
    [
      id,
      item.chapter_id,
      item.subject_id || null,
      item.paper || null,
      item.topic_code || null,
      item.name,
      item.bangla_name,
      item.star_rating,
      item.total_questions,
      item.completed_questions,
      item.mcq_count,
      item.written_count,
      item.varsity_a_count || 0,
      item.engineering_count || 0,
      item.medical_count || 0,
      item.academic_count || 0,
      item.main_book_count || 0,
      item.exam_occurrences ? JSON.stringify(item.exam_occurrences) : null,
      item.key_points ? JSON.stringify(item.key_points) : null,
      item.created_at,
    ]
  );

  return item;
}

export async function updateTopicInDb(id: string, t: Partial<TopicRecord>): Promise<TopicRecord | null> {
  const existing = await getTopicById(id);
  if (!existing) return null;

  const updated: TopicRecord = {
    ...existing,
    ...t,
    id,
  };

  memoryStore.topics.set(id, updated);

  await query(
    `UPDATE topics SET
      chapter_id = $1, subject_id = $2, paper = $3, topic_code = $4,
      name = $5, bangla_name = $6, star_rating = $7, total_questions = $8,
      completed_questions = $9, mcq_count = $10, written_count = $11,
      varsity_a_count = $12, engineering_count = $13, medical_count = $14,
      academic_count = $15, main_book_count = $16,
      exam_occurrences = $17, key_points = $18
    WHERE id = $19`,
    [
      updated.chapter_id,
      updated.subject_id || null,
      updated.paper || null,
      updated.topic_code || null,
      updated.name,
      updated.bangla_name,
      updated.star_rating,
      updated.total_questions,
      updated.completed_questions,
      updated.mcq_count,
      updated.written_count,
      updated.varsity_a_count || 0,
      updated.engineering_count || 0,
      updated.medical_count || 0,
      updated.academic_count || 0,
      updated.main_book_count || 0,
      updated.exam_occurrences ? JSON.stringify(updated.exam_occurrences) : null,
      updated.key_points ? JSON.stringify(updated.key_points) : null,
      id,
    ]
  );

  return updated;
}

export async function deleteTopicFromDb(id: string, performedBy: string = 'admin'): Promise<boolean> {
  const activePool = getPgPool();
  if (isPostgresActive() && activePool) {
    const client = await activePool.connect();
    try {
      await client.query('BEGIN');
      const topRes = await client.query('SELECT * FROM topics WHERE id = $1', [id]);
      const topic = topRes.rows[0];

      // Update all questions that pointed to this topic
      await client.query('UPDATE questions SET topic_id = NULL, topic_name = NULL WHERE topic_id = $1', [id]);
      await client.query('UPDATE written_questions SET topic_id = NULL, topic_name = NULL WHERE topic_id = $1', [id]);

      // Delete topic
      const res = await client.query('DELETE FROM topics WHERE id = $1', [id]);

      // Recalculate chapter total_topics
      if (topic?.chapter_id) {
        await client.query(
          'UPDATE chapters SET total_topics = (SELECT COUNT(*) FROM topics WHERE chapter_id = $1) WHERE id = $1',
          [topic.chapter_id]
        );
      }

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
            id,
            JSON.stringify({ topic_name: topic?.name, bangla_name: topic?.bangla_name, chapter_id: topic?.chapter_id }),
            performedBy,
            Date.now(),
          ]
        );
      } catch (logErr) {
        // Audit log table might be initializing
      }

      await client.query('COMMIT');

      memoryStore.topics.delete(id);
      for (const [, q] of memoryStore.questions) {
        if (q.topic_id === id) {
          q.topic_id = undefined;
          q.topic_name = undefined;
        }
      }
      for (const [, w] of memoryStore.writtenQuestions) {
        if (w.topic_id === id) {
          w.topic_id = undefined;
          w.topic_name = undefined;
        }
      }

      return (res.rowCount || 0) > 0;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    memoryStore.topics.delete(id);
    for (const [, q] of memoryStore.questions) {
      if (q.topic_id === id) {
        q.topic_id = undefined;
        q.topic_name = undefined;
      }
    }
    for (const [, w] of memoryStore.writtenQuestions) {
      if (w.topic_id === id) {
        w.topic_id = undefined;
        w.topic_name = undefined;
      }
    }
    await query('UPDATE questions SET topic_id = NULL, topic_name = NULL WHERE topic_id = $1', [id]);
    await query('UPDATE written_questions SET topic_id = NULL, topic_name = NULL WHERE topic_id = $1', [id]);
    await query('DELETE FROM topics WHERE id = $1', [id]);
    return true;
  }
}

// ---------------- 4-LAYER COUNTER & HEAL SYSTEM ----------------

export async function recalculateTopicCounts(targetTopicId?: string): Promise<void> {
  try {
    if (isPostgresActive()) {
      if (targetTopicId) {
        await query(`
          UPDATE topics t
          SET 
            mcq_count = (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id AND (q.is_active IS NULL OR q.is_active = TRUE)),
            written_count = (SELECT COUNT(*) FROM written_questions wq WHERE wq.topic_id = t.id AND (wq.is_active IS NULL OR wq.is_active = TRUE)),
            varsity_a_count = (
              (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id AND (q.is_active IS NULL OR q.is_active = TRUE) AND (q.category = 'varsity_a' OR q.tags ILIKE '%varsity_a%')) +
              (SELECT COUNT(*) FROM written_questions wq WHERE wq.topic_id = t.id AND (wq.is_active IS NULL OR wq.is_active = TRUE) AND (wq.category = 'varsity_a' OR wq.tags ILIKE '%varsity_a%'))
            ),
            engineering_count = (
              (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id AND (q.is_active IS NULL OR q.is_active = TRUE) AND (q.category = 'engineering' OR q.tags ILIKE '%engineering%' OR q.tags ILIKE '%buet%')) +
              (SELECT COUNT(*) FROM written_questions wq WHERE wq.topic_id = t.id AND (wq.is_active IS NULL OR wq.is_active = TRUE) AND (wq.category = 'engineering' OR wq.tags ILIKE '%engineering%' OR wq.tags ILIKE '%buet%'))
            ),
            medical_count = (
              (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id AND (q.is_active IS NULL OR q.is_active = TRUE) AND (q.category = 'medical' OR q.tags ILIKE '%medical%' OR q.tags ILIKE '%mat%')) +
              (SELECT COUNT(*) FROM written_questions wq WHERE wq.topic_id = t.id AND (wq.is_active IS NULL OR wq.is_active = TRUE) AND (wq.category = 'medical' OR wq.tags ILIKE '%medical%' OR wq.tags ILIKE '%mat%'))
            ),
            academic_count = (
              (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id AND (q.is_active IS NULL OR q.is_active = TRUE) AND (q.category = 'academic' OR q.tags ILIKE '%academic%' OR q.tags ILIKE '%hsc%' OR q.tags ILIKE '%board%')) +
              (SELECT COUNT(*) FROM written_questions wq WHERE wq.topic_id = t.id AND (wq.is_active IS NULL OR wq.is_active = TRUE) AND (wq.category = 'academic' OR wq.tags ILIKE '%academic%' OR wq.tags ILIKE '%hsc%' OR wq.tags ILIKE '%board%'))
            ),
            main_book_count = (
              (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id AND (q.is_active IS NULL OR q.is_active = TRUE) AND (q.category = 'main_book' OR q.tags ILIKE '%main_book%')) +
              (SELECT COUNT(*) FROM written_questions wq WHERE wq.topic_id = t.id AND (wq.is_active IS NULL OR wq.is_active = TRUE) AND (wq.category = 'main_book' OR wq.tags ILIKE '%main_book%'))
            ),
            total_questions = (
              (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id AND (q.is_active IS NULL OR q.is_active = TRUE)) +
              (SELECT COUNT(*) FROM written_questions wq WHERE wq.topic_id = t.id AND (wq.is_active IS NULL OR wq.is_active = TRUE))
            )
          WHERE t.id = $1
        `, [targetTopicId]);
      } else {
        await query(`
          WITH q_stats AS (
            SELECT 
              topic_id,
              COUNT(*) AS mcq_cnt,
              COUNT(*) FILTER (WHERE category = 'varsity_a' OR tags ILIKE '%varsity_a%') AS va_cnt,
              COUNT(*) FILTER (WHERE category = 'engineering' OR tags ILIKE '%engineering%' OR tags ILIKE '%buet%') AS eng_cnt,
              COUNT(*) FILTER (WHERE category = 'medical' OR tags ILIKE '%medical%' OR tags ILIKE '%mat%') AS med_cnt,
              COUNT(*) FILTER (WHERE category = 'academic' OR tags ILIKE '%academic%' OR tags ILIKE '%hsc%' OR tags ILIKE '%board%') AS acad_cnt,
              COUNT(*) FILTER (WHERE category = 'main_book' OR tags ILIKE '%main_book%') AS mb_cnt
            FROM questions
            WHERE topic_id IS NOT NULL AND (is_active IS NULL OR is_active = TRUE)
            GROUP BY topic_id
          ),
          wq_stats AS (
            SELECT 
              topic_id,
              COUNT(*) AS wq_cnt,
              COUNT(*) FILTER (WHERE category = 'varsity_a' OR tags ILIKE '%varsity_a%') AS va_cnt,
              COUNT(*) FILTER (WHERE category = 'engineering' OR tags ILIKE '%engineering%' OR tags ILIKE '%buet%') AS eng_cnt,
              COUNT(*) FILTER (WHERE category = 'medical' OR tags ILIKE '%medical%' OR tags ILIKE '%mat%') AS med_cnt,
              COUNT(*) FILTER (WHERE category = 'academic' OR tags ILIKE '%academic%' OR tags ILIKE '%hsc%' OR tags ILIKE '%board%') AS acad_cnt,
              COUNT(*) FILTER (WHERE category = 'main_book' OR tags ILIKE '%main_book%') AS mb_cnt
            FROM written_questions
            WHERE topic_id IS NOT NULL AND (is_active IS NULL OR is_active = TRUE)
            GROUP BY topic_id
          )
          UPDATE topics t
          SET 
            mcq_count = COALESCE(q.mcq_cnt, 0),
            written_count = COALESCE(w.wq_cnt, 0),
            total_questions = COALESCE(q.mcq_cnt, 0) + COALESCE(w.wq_cnt, 0),
            varsity_a_count = COALESCE(q.va_cnt, 0) + COALESCE(w.va_cnt, 0),
            engineering_count = COALESCE(q.eng_cnt, 0) + COALESCE(w.eng_cnt, 0),
            medical_count = COALESCE(q.med_cnt, 0) + COALESCE(w.med_cnt, 0),
            academic_count = COALESCE(q.acad_cnt, 0) + COALESCE(w.acad_cnt, 0),
            main_book_count = COALESCE(q.mb_cnt, 0) + COALESCE(w.mb_cnt, 0)
          FROM (
            SELECT 
              COALESCE(q.topic_id, w.topic_id) AS topic_id,
              q.mcq_cnt,
              w.wq_cnt,
              q.va_cnt,
              w.va_cnt,
              q.eng_cnt,
              w.eng_cnt,
              q.med_cnt,
              w.med_cnt,
              q.acad_cnt,
              w.acad_cnt,
              q.mb_cnt,
              w.mb_cnt
            FROM q_stats q
            FULL OUTER JOIN wq_stats w ON q.topic_id = w.topic_id
          ) combined
          WHERE t.id = combined.topic_id
        `);
      }
    }
  } catch (err) {
    console.error('Error recalculating topic counts in DB:', err);
  }

  // Synchronize in-memory fallback
  for (const [tId, topic] of memoryStore.topics.entries()) {
    if (targetTopicId && tId !== targetTopicId) continue;
    let mcq = 0;
    let wq = 0;
    let va = 0;
    let eng = 0;
    let med = 0;
    let acad = 0;
    let mb = 0;

    for (const q of memoryStore.questions.values()) {
      if (q.topic_id === tId && ((q as any).is_active === undefined || (q as any).is_active === true)) {
        mcq++;
        const cat = q.category || '';
        const tagsStr = (q.tags || []).join(' ').toLowerCase();
        if (cat === 'varsity_a' || tagsStr.includes('varsity_a')) va++;
        if (cat === 'engineering' || tagsStr.includes('engineering') || tagsStr.includes('buet')) eng++;
        if (cat === 'medical' || tagsStr.includes('medical') || tagsStr.includes('mat')) med++;
        if (cat === 'academic' || tagsStr.includes('academic') || tagsStr.includes('hsc') || tagsStr.includes('board')) acad++;
        if (cat === 'main_book' || tagsStr.includes('main_book')) mb++;
      }
    }

    for (const w of memoryStore.writtenQuestions.values()) {
      if (w.topic_id === tId && ((w as any).is_active === undefined || (w as any).is_active === true)) {
        wq++;
        const cat = w.category || '';
        const tagsStr = (w.tags || []).join(' ').toLowerCase();
        if (cat === 'varsity_a' || tagsStr.includes('varsity_a')) va++;
        if (cat === 'engineering' || tagsStr.includes('engineering') || tagsStr.includes('buet')) eng++;
        if (cat === 'medical' || tagsStr.includes('medical') || tagsStr.includes('mat')) med++;
        if (cat === 'academic' || tagsStr.includes('academic') || tagsStr.includes('hsc') || tagsStr.includes('board')) acad++;
        if (cat === 'main_book' || tagsStr.includes('main_book')) mb++;
      }
    }

    topic.mcq_count = mcq;
    topic.written_count = wq;
    topic.total_questions = mcq + wq;
    topic.varsity_a_count = va;
    topic.engineering_count = eng;
    topic.medical_count = med;
    topic.academic_count = acad;
    topic.main_book_count = mb;
  }
}

export async function healAndSyncDatabase(): Promise<{
  success: boolean;
  message: string;
  totalMcqNormalized: number;
  totalWrittenNormalized: number;
  totalTopicsCounted: number;
  unmappedMcqCount: number;
  unmappedWrittenCount: number;
  topicsStats: Array<{
    id: string;
    name: string;
    total_questions: number;
    mcq_count: number;
    written_count: number;
    varsity_a_count: number;
    engineering_count: number;
    medical_count: number;
    academic_count: number;
    main_book_count: number;
  }>;
}> {
  let totalMcqNormalized = 0;
  let totalWrittenNormalized = 0;
  let unmappedMcqCount = 0;
  let unmappedWrittenCount = 0;

  // Load all available topics for matching
  const allTopics = await getAllTopics();
  const topicMapById = new Map<string, TopicRecord>();
  const topicMapByName = new Map<string, TopicRecord>();

  for (const t of allTopics) {
    topicMapById.set(t.id, t);
    if (t.name) topicMapByName.set(t.name.trim().toLowerCase(), t);
    if (t.bangla_name) topicMapByName.set(t.bangla_name.trim().toLowerCase(), t);
  }

  // 1. Normalize and resolve MCQ Questions
  const allMcqsRes = await getAllQuestions({ limit: 10000 });
  for (const q of allMcqsRes.questions) {
    let modified = false;
    let targetTopicId = q.topic_id;
    let targetTopicName = q.topic_name;

    if (!targetTopicId && targetTopicName) {
      const matched = topicMapByName.get(targetTopicName.trim().toLowerCase());
      if (matched) {
        targetTopicId = matched.id;
        targetTopicName = matched.bangla_name || matched.name;
        modified = true;
      }
    } else if (targetTopicId && topicMapById.has(targetTopicId)) {
      const matched = topicMapById.get(targetTopicId)!;
      if (!targetTopicName || targetTopicName !== (matched.bangla_name || matched.name)) {
        targetTopicName = matched.bangla_name || matched.name;
        modified = true;
      }
    }

    if (!targetTopicId) {
      unmappedMcqCount++;
    }

    if (modified) {
      await updateQuestionInDb(q.id, {
        topic_id: targetTopicId,
        topic_name: targetTopicName,
      });
      totalMcqNormalized++;
    }
  }

  // 2. Normalize and resolve Written Questions
  const allWrittenRes = await getAllWrittenQuestions({ limit: 10000 });
  for (const w of allWrittenRes.questions) {
    let modified = false;
    let targetTopicId = w.topic_id;
    let targetTopicName = w.topic_name;

    if (!targetTopicId && targetTopicName) {
      const matched = topicMapByName.get(targetTopicName.trim().toLowerCase());
      if (matched) {
        targetTopicId = matched.id;
        targetTopicName = matched.bangla_name || matched.name;
        modified = true;
      }
    } else if (targetTopicId && topicMapById.has(targetTopicId)) {
      const matched = topicMapById.get(targetTopicId)!;
      if (!targetTopicName || targetTopicName !== (matched.bangla_name || matched.name)) {
        targetTopicName = matched.bangla_name || matched.name;
        modified = true;
      }
    }

    if (!targetTopicId) {
      unmappedWrittenCount++;
    }

    if (modified) {
      await updateWrittenQuestionInDb(w.id, {
        topic_id: targetTopicId,
        topic_name: targetTopicName,
      });
      totalWrittenNormalized++;
    }
  }

  // 3. Recalculate all topic counts dynamically
  await recalculateTopicCounts();

  // 4. Return summary
  const updatedTopics = await getAllTopics();
  const topicsStats = updatedTopics.map((t) => ({
    id: t.id,
    name: t.bangla_name || t.name,
    total_questions: t.total_questions || 0,
    mcq_count: t.mcq_count || 0,
    written_count: t.written_count || 0,
    varsity_a_count: t.varsity_a_count || 0,
    engineering_count: t.engineering_count || 0,
    medical_count: t.medical_count || 0,
    academic_count: t.academic_count || 0,
    main_book_count: t.main_book_count || 0,
  }));

  return {
    success: true,
    message: `Database synchronization complete. ${totalMcqNormalized} MCQs and ${totalWrittenNormalized} Written questions verified and mapped.`,
    totalMcqNormalized,
    totalWrittenNormalized,
    totalTopicsCounted: updatedTopics.length,
    unmappedMcqCount,
    unmappedWrittenCount,
    topicsStats,
  };
}


// ---------------- QUESTIONS ----------------

export function formatRowToQuestion(row: any): Question {
  let options = { A: '', B: '', C: '', D: '' };
  try {
    options = typeof row.options === 'string' ? JSON.parse(row.options) : row.options;
  } catch (e) {
    console.error('Failed to parse options for question', row.id, e);
  }

  let tags: string[] = [];
  try {
    tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [];
  } catch (e) {
    console.error('Failed to parse tags for question', row.id, e);
  }

  return {
    id: String(row.id),
    subject_id: row.subject_id,
    subject_name: row.subject_name,
    paper: row.paper,
    chapter_id: row.chapter_id,
    chapter_name: row.chapter_name,
    topic_id: row.topic_id || undefined,
    topic_name: row.topic_name || undefined,
    category: row.category || undefined,
    question_text: row.question_text,
    math_formula_latex: row.math_formula_latex || undefined,
    options,
    correct_ans: row.correct_ans,
    explanation: row.explanation,
    explanation_latex: row.explanation_latex || undefined,
    question_image_url: row.question_image_url || undefined,
    explanation_image_url: row.explanation_image_url || undefined,
    tags,
    star_rating: (row.star_rating as 1 | 2 | 3) || 3,
    type: row.type || 'mcq',
    difficulty: row.difficulty || 'medium',
  };
}

export interface PaginatedQuestionsResult {
  data: Question[];
  questions: Question[];
  total: number;
  nextCursor?: string | null;
  hasMore?: boolean;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface CursorPayload {
  created_at?: number;
  id?: string;
  page?: number;
}

export function decodeCursor(cursorStr?: string): CursorPayload | null {
  if (!cursorStr) return null;
  try {
    const raw = Buffer.from(cursorStr, 'base64').toString('utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        created_at: typeof parsed.created_at === 'number' ? parsed.created_at : undefined,
        id: parsed.id ? String(parsed.id) : undefined,
        page: typeof parsed.page === 'number' ? parsed.page : undefined,
      };
    }
  } catch {
    const num = Number(cursorStr);
    if (!isNaN(num) && num > 1000000) {
      return { created_at: num };
    }
    return { id: cursorStr };
  }
  return { id: cursorStr };
}

export function encodeCursor(created_at?: number, id?: string, page?: number): string | null {
  if (!id) return null;
  return Buffer.from(JSON.stringify({ created_at: created_at || Date.now(), id, page })).toString('base64');
}

function buildCategoryWhereClause(category: string, pIdxStart: number): { clause: string; params: any[]; pIdxNext: number } {
  const params: any[] = [];
  let pIdx = pIdxStart;

  if (category === 'engineering') {
    const terms = ['engineering', 'buet', 'sust', 'ckruet', 'cuet', 'ruet', 'kuet', 'iut'];
    const subClauses = [`category = $${pIdx++}`];
    params.push('engineering');
    for (const term of terms) {
      subClauses.push(`tags ILIKE $${pIdx++}`);
      params.push(`%${term}%`);
    }
    return { clause: ` AND (${subClauses.join(' OR ')})`, params, pIdxNext: pIdx };
  } else if (category === 'medical') {
    const terms = ['medical', 'mbbs', 'dental', 'mat'];
    const subClauses = [`category = $${pIdx++}`];
    params.push('medical');
    for (const term of terms) {
      subClauses.push(`tags ILIKE $${pIdx++}`);
      params.push(`%${term}%`);
    }
    return { clause: ` AND (${subClauses.join(' OR ')})`, params, pIdxNext: pIdx };
  } else if (category === 'varsity_a') {
    const terms = ['varsity_a', 'du', 'varsity', 'gst', 'bup', 'ru', 'cu', 'ju', 'agri'];
    const subClauses = [`category = $${pIdx++}`];
    params.push('varsity_a');
    for (const term of terms) {
      subClauses.push(`tags ILIKE $${pIdx++}`);
      params.push(`%${term}%`);
    }
    return { clause: ` AND (${subClauses.join(' OR ')})`, params, pIdxNext: pIdx };
  } else if (category === 'academic') {
    const terms = ['academic', 'board', 'hsc'];
    const subClauses = [`category = $${pIdx++}`];
    params.push('academic');
    for (const term of terms) {
      subClauses.push(`tags ILIKE $${pIdx++}`);
      params.push(`%${term}%`);
    }
    return { clause: ` AND (${subClauses.join(' OR ')})`, params, pIdxNext: pIdx };
  } else if (category === 'main_book') {
    const terms = ['main_book', 'main book', 'textbook'];
    const subClauses = [`category = $${pIdx++}`];
    params.push('main_book');
    for (const term of terms) {
      subClauses.push(`tags ILIKE $${pIdx++}`);
      params.push(`%${term}%`);
    }
    return { clause: ` AND (${subClauses.join(' OR ')})`, params, pIdxNext: pIdx };
  } else {
    const clause = ` AND (category = $${pIdx++} OR tags ILIKE $${pIdx++})`;
    params.push(category, `%${category}%`);
    return { clause, params, pIdxNext: pIdx };
  }
}

function matchesCategoryInMemory(q: { category?: string; tags?: string[] }, category: string): boolean {
  if (!category) return true;
  const qCat = q.category || '';
  const tagsStr = (q.tags || []).join(' ').toLowerCase();

  if (category === 'engineering') {
    return (
      qCat === 'engineering' ||
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
    return (
      qCat === 'medical' ||
      tagsStr.includes('medical') ||
      tagsStr.includes('mbbs') ||
      tagsStr.includes('dental') ||
      tagsStr.includes('mat')
    );
  }
  if (category === 'varsity_a') {
    return (
      qCat === 'varsity_a' ||
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
    return (
      qCat === 'academic' ||
      tagsStr.includes('board') ||
      tagsStr.includes('hsc') ||
      tagsStr.includes('academic')
    );
  }
  if (category === 'main_book') {
    return (
      qCat === 'main_book' ||
      tagsStr.includes('main book') ||
      tagsStr.includes('textbook') ||
      tagsStr.includes('main_book')
    );
  }
  return qCat === category || tagsStr.includes(category.toLowerCase());
}

export async function getAllQuestions(filters?: {
  subject_id?: string;
  chapter_id?: string;
  topic_id?: string;
  type?: string;
  paper?: string;
  tag?: string;
  search?: string;
  category?: string;
  difficulty?: string;
  cursor?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedQuestionsResult> {
  const cursorData = decodeCursor(filters?.cursor);
  const page = Math.max(1, filters?.page ?? (cursorData?.page ? cursorData.page + 1 : 1));
  const limit = filters?.limit ? Math.max(1, filters.limit) : 15;
  const offset = (page - 1) * limit;

  try {
    let whereClause = ' WHERE (is_active IS NULL OR is_active = TRUE)';
    const params: any[] = [];
    let pIdx = 1;

    if (filters?.subject_id) {
      whereClause += ` AND subject_id = $${pIdx++}`;
      params.push(filters.subject_id);
    }
    if (filters?.chapter_id) {
      whereClause += ` AND chapter_id = $${pIdx++}`;
      params.push(filters.chapter_id);
    }
    if (filters?.topic_id) {
      whereClause += ` AND topic_id = $${pIdx++}`;
      params.push(filters.topic_id);
    }
    if (filters?.type) {
      whereClause += ` AND type = $${pIdx++}`;
      params.push(filters.type);
    }
    if (filters?.paper) {
      whereClause += ` AND paper = $${pIdx++}`;
      params.push(filters.paper);
    }
    if (filters?.category) {
      const catFilter = buildCategoryWhereClause(filters.category, pIdx);
      whereClause += catFilter.clause;
      params.push(...catFilter.params);
      pIdx = catFilter.pIdxNext;
    }
    if (filters?.difficulty) {
      whereClause += ` AND difficulty = $${pIdx++}`;
      params.push(filters.difficulty);
    }
    if (filters?.tag) {
      whereClause += ` AND tags ILIKE $${pIdx++}`;
      params.push(`%${filters.tag}%`);
    }
    if (filters?.search) {
      const term = `%${filters.search}%`;
      whereClause += ` AND (question_text ILIKE $${pIdx++} OR explanation ILIKE $${pIdx++} OR tags ILIKE $${pIdx++} OR chapter_name ILIKE $${pIdx++} OR topic_name ILIKE $${pIdx++})`;
      params.push(term, term, term, term, term);
    }

    // 1. Total count query
    const countSql = `SELECT COUNT(*) as total FROM questions${whereClause}`;
    const countRes = await query(countSql, params);
    const total = countRes && countRes.rows && countRes.rows[0] ? Number(countRes.rows[0].total) || 0 : 0;

    // 2. Data query with LIMIT & OFFSET
    let dataSql = `SELECT * FROM questions${whereClause} ORDER BY COALESCE(created_at, 0) DESC, id DESC`;
    const dataParams = [...params];

    const fetchLimit = limit + 1;
    dataSql += ` LIMIT $${pIdx++} OFFSET $${pIdx++}`;
    dataParams.push(fetchLimit, offset);

    const res = await query(dataSql, dataParams);
    if (res && res.rows) {
      let questions = res.rows.map(formatRowToQuestion);
      let hasMore = false;
      if (questions.length > limit) {
        hasMore = true;
        questions = questions.slice(0, limit);
      }

      const lastQuestion = questions[questions.length - 1];
      const nextCursor = hasMore && lastQuestion
        ? encodeCursor((lastQuestion as any).created_at || Date.now(), lastQuestion.id, page)
        : null;

      const totalPages = Math.ceil(total / limit) || 1;
      return {
        data: questions,
        questions,
        total,
        nextCursor,
        hasMore,
        page,
        limit,
        totalPages,
      };
    }
  } catch (err) {}

  // Fallback in-memory filter
  let list = Array.from(memoryStore.questions.values()).filter((q: any) => q.is_active !== false);
  if (filters?.subject_id) {
    list = list.filter((q) => q.subject_id === filters.subject_id);
  }
  if (filters?.chapter_id) {
    list = list.filter((q) => q.chapter_id === filters.chapter_id);
  }
  if (filters?.topic_id) {
    list = list.filter((q) => q.topic_id === filters.topic_id);
  }
  if (filters?.type) {
    list = list.filter((q) => (q.type || 'mcq') === filters.type);
  }
  if (filters?.paper) {
    list = list.filter((q) => q.paper === filters.paper);
  }
  if (filters?.category) {
    list = list.filter((q) => matchesCategoryInMemory(q, filters.category!));
  }
  if (filters?.difficulty) {
    list = list.filter((q) => q.difficulty === filters.difficulty);
  }
  if (filters?.tag) {
    list = list.filter((q) => q.tags && q.tags.some((t) => t.toLowerCase().includes(filters.tag!.toLowerCase())));
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    list = list.filter(
      (q) =>
        q.question_text.toLowerCase().includes(s) ||
        q.explanation.toLowerCase().includes(s) ||
        (q.chapter_name && q.chapter_name.toLowerCase().includes(s)) ||
        (q.topic_name && q.topic_name.toLowerCase().includes(s))
    );
  }

  const total = list.length;
  let startIndex = offset;

  if (cursorData?.id) {
    const idx = list.findIndex((q) => String(q.id) === String(cursorData.id));
    if (idx !== -1) {
      startIndex = idx + 1;
    }
  }

  let questions = list.slice(startIndex, startIndex + limit + 1);
  let hasMore = false;
  if (questions.length > limit) {
    hasMore = true;
    questions = questions.slice(0, limit);
  }

  const lastQuestion = questions[questions.length - 1];
  const nextCursor = hasMore && lastQuestion
    ? encodeCursor((lastQuestion as any).created_at || Date.now(), lastQuestion.id, page)
    : null;

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: questions,
    questions,
    total,
    nextCursor,
    hasMore,
    page,
    limit,
    totalPages,
  };
}

export async function getQuestionById(id: string): Promise<Question | null> {
  try {
    const res = await query('SELECT * FROM questions WHERE id = $1', [id]);
    if (res && res.rows.length > 0) return formatRowToQuestion(res.rows[0]);
  } catch (err) {}

  return memoryStore.questions.get(id) || null;
}

export async function insertQuestion(q: Partial<Question>): Promise<Question> {
  const id = q.id || `q_${q.subject_id || 'gen'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let subject_id = q.subject_id || 'physics_1';
  let subject_name = q.subject_name || 'পদার্থবিজ্ঞান ১ম পত্র';
  let paper = q.paper || '1st';
  let chapter_id = q.chapter_id || 'phy1_ch1';
  let chapter_name = q.chapter_name || 'ভৌতজগত ও পরিমাপ';
  let topic_id = q.topic_id || undefined;
  let topic_name = q.topic_name || undefined;

  if (topic_id) {
    let topicRec = await getTopicById(topic_id);
    if (!topicRec) {
      try {
        const tName = topic_name || topic_id;
        topicRec = await insertTopic({
          id: topic_id,
          name: tName,
          bangla_name: tName,
          subject_id: subject_id as any,
          paper: paper,
          chapter_id: chapter_id,
          star_rating: 3,
          total_questions: 0,
          completed_questions: 0,
        });
      } catch (e) {}
    }
    if (topicRec) {
      if (!topic_name) topic_name = topicRec.bangla_name || topicRec.name;
      if (!q.chapter_id && topicRec.chapter_id) chapter_id = topicRec.chapter_id;
      if (!q.subject_id && topicRec.subject_id) subject_id = topicRec.subject_id as any;
      if (!q.paper && topicRec.paper) paper = topicRec.paper as '1st' | '2nd';
    }
  }

  const newQ: Question = {
    id,
    subject_id,
    subject_name,
    paper,
    chapter_id,
    chapter_name,
    topic_id,
    topic_name,
    category: q.category || 'varsity_a',
    question_text: q.question_text || '',
    math_formula_latex: q.math_formula_latex,
    options: q.options || { A: '', B: '', C: '', D: '' },
    correct_ans: q.correct_ans || 'A',
    explanation: q.explanation || '',
    explanation_latex: q.explanation_latex,
    question_image_url: q.question_image_url,
    explanation_image_url: q.explanation_image_url,
    tags: q.tags || [],
    star_rating: (q.star_rating as 1 | 2 | 3) || 3,
    type: q.type || 'mcq',
    difficulty: q.difficulty || 'medium',
  };

  memoryStore.questions.set(id, newQ);

  await query(
    `INSERT INTO questions (
      id, subject_id, subject_name, paper, chapter_id, chapter_name,
      topic_id, topic_name, category, question_text, math_formula_latex,
      options, correct_ans, explanation, explanation_latex,
      question_image_url, explanation_image_url,
      tags, star_rating, type, difficulty, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
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
      difficulty = EXCLUDED.difficulty`,
    [
      id,
      newQ.subject_id,
      newQ.subject_name,
      newQ.paper,
      newQ.chapter_id,
      newQ.chapter_name,
      newQ.topic_id || null,
      newQ.topic_name || null,
      newQ.category,
      newQ.question_text,
      newQ.math_formula_latex || null,
      JSON.stringify(newQ.options),
      newQ.correct_ans,
      newQ.explanation,
      newQ.explanation_latex || null,
      newQ.question_image_url || null,
      newQ.explanation_image_url || null,
      JSON.stringify(newQ.tags),
      newQ.star_rating,
      newQ.type,
      newQ.difficulty,
      Date.now(),
    ]
  );

  return newQ;
}

export async function updateQuestionInDb(id: string, q: Partial<Question>): Promise<Question | null> {
  const existing = await getQuestionById(id);
  if (!existing) return null;

  const updated: Question = {
    ...existing,
    ...q,
    id,
  };

  memoryStore.questions.set(id, updated);

  await query(
    `UPDATE questions SET
      subject_id = $1, subject_name = $2, paper = $3, chapter_id = $4, chapter_name = $5,
      topic_id = $6, topic_name = $7, category = $8, question_text = $9, math_formula_latex = $10,
      options = $11, correct_ans = $12, explanation = $13, explanation_latex = $14,
      question_image_url = $15, explanation_image_url = $16,
      tags = $17, star_rating = $18, type = $19, difficulty = $20
    WHERE id = $21`,
    [
      updated.subject_id,
      updated.subject_name,
      updated.paper,
      updated.chapter_id,
      updated.chapter_name,
      updated.topic_id || null,
      updated.topic_name || null,
      updated.category || 'varsity_a',
      updated.question_text,
      updated.math_formula_latex || null,
      JSON.stringify(updated.options),
      updated.correct_ans,
      updated.explanation,
      updated.explanation_latex || null,
      updated.question_image_url || null,
      updated.explanation_image_url || null,
      JSON.stringify(updated.tags || []),
      updated.star_rating,
      updated.type,
      updated.difficulty,
      id,
    ]
  );

  return updated;
}

export async function deleteQuestionFromDb(id: string): Promise<boolean> {
  memoryStore.questions.delete(id);
  await query('DELETE FROM questions WHERE id = $1', [id]);
  return true;
}

export async function bulkImportQuestions(rawQuestions: any[]): Promise<{ count: number; questions: Question[] }> {
  const normalizedQuestions: Question[] = [];

  for (const q of rawQuestions) {
    let subject_id = q.subject_id || q.subject || 'physics_1';
    if (subject_id === 'physics') subject_id = 'physics_1';
    if (subject_id === 'chemistry') subject_id = 'chemistry_1';
    if (subject_id === 'math') subject_id = 'math_1';
    if (subject_id === 'biology') subject_id = 'biology_1';

    let subject_name = q.subject_name;
    if (!subject_name) {
      const matchedSub = SUBJECTS_DATA.find((s) => s.id === subject_id);
      subject_name = matchedSub ? matchedSub.name : 'পদার্থবিজ্ঞান ১ম পত্র';
    }

    let paper: '1st' | '2nd' = '1st';
    if (q.paper === 2 || q.paper === '2' || q.paper === '2nd') {
      paper = '2nd';
    }

    let chapter_id = q.chapter_id || q.chapterId || 'phy1_ch1';
    let chapter_name = q.chapter_name;
    if (!chapter_name && Array.isArray(CHAPTERS_DATA)) {
      const chap = CHAPTERS_DATA.find((c) => c.id === chapter_id);
      if (chap) chapter_name = chap.name;
    }
    if (!chapter_name) chapter_name = 'অধ্যায়';

    let topic_id = q.topic_id || undefined;
    let topic_name = q.topic_name || q.topic || undefined;

    if (topic_id) {
      let topicRec = memoryStore.topics.get(topic_id) || (await getTopicById(topic_id));
      if (!topicRec) {
        try {
          const tName = topic_name || topic_id;
          topicRec = await insertTopic({
            id: topic_id,
            name: tName,
            bangla_name: tName,
            subject_id: subject_id as any,
            paper: paper,
            chapter_id: chapter_id,
            star_rating: 3,
            total_questions: 0,
            completed_questions: 0,
          });
        } catch (e) {}
      }
      if (topicRec) {
        if (!topic_name) topic_name = topicRec.bangla_name || topicRec.name;
        if (!q.chapter_id && !q.chapterId && topicRec.chapter_id) chapter_id = topicRec.chapter_id;
        if (!q.subject_id && !q.subject && topicRec.subject_id) subject_id = topicRec.subject_id as any;
        if (!q.paper && topicRec.paper) paper = topicRec.paper as '1st' | '2nd';
      }
    }

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
    if (q.university && !tagsArr.includes(q.university)) tagsArr.push(q.university);
    if (q.year && !tagsArr.includes(q.year)) tagsArr.push(q.year);

    const id = q.id || `q_${subject_id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newQ: Question = {
      id,
      subject_id: subject_id as any,
      subject_name,
      paper,
      chapter_id: chapter_id as any,
      chapter_name,
      topic_id,
      topic_name,
      category: q.category || 'varsity_a',
      question_text: (q.question_text || q.questionText || '').trim(),
      math_formula_latex: q.math_formula_latex || null,
      options: optionsObj,
      correct_ans: (q.correct_ans || q.correctAnswer || 'A').trim().toUpperCase(),
      explanation: q.explanation || '',
      explanation_latex: q.explanation_latex || null,
      question_image_url: q.question_image_url || null,
      explanation_image_url: q.explanation_image_url || null,
      tags: tagsArr,
      star_rating: (Math.min(3, Math.max(1, Number(q.star_rating) || 3)) as 1 | 2 | 3),
      type: q.type || q.questionType || 'mcq',
      difficulty: q.difficulty || 'medium',
    };

    normalizedQuestions.push(newQ);
  }

  // PostgreSQL Transaction
  const activePool = getPgPool();
  if (isPostgresActive() && activePool) {
    const client = await activePool.connect();
    try {
      await client.query('BEGIN');
      const upsertSql = `INSERT INTO questions (
        id, subject_id, subject_name, paper, chapter_id, chapter_name,
        topic_id, topic_name, category, question_text, math_formula_latex,
        options, correct_ans, explanation, explanation_latex,
        question_image_url, explanation_image_url,
        tags, star_rating, type, difficulty, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
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
        difficulty = EXCLUDED.difficulty;`;

      for (const item of normalizedQuestions) {
        await client.query(upsertSql, [
          item.id,
          item.subject_id,
          item.subject_name,
          item.paper,
          item.chapter_id,
          item.chapter_name,
          item.topic_id || null,
          item.topic_name || null,
          item.category,
          item.question_text,
          item.math_formula_latex || null,
          JSON.stringify(item.options),
          item.correct_ans,
          item.explanation,
          item.explanation_latex || null,
          item.question_image_url || null,
          item.explanation_image_url || null,
          JSON.stringify(item.tags),
          item.star_rating,
          item.type,
          item.difficulty,
          Date.now(),
        ]);
      }

      // Recalculate topic and chapter counters in same transaction
      await client.query(`
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

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Update in-memory fallback store
  for (const item of normalizedQuestions) {
    memoryStore.questions.set(item.id, item);
  }

  return { count: normalizedQuestions.length, questions: normalizedQuestions };
}

// ---------------- USER & AUTH DATABASE OPERATIONS ----------------

export interface UserRecord {
  id: string;
  phone: string;
  password_hash: string;
  name: string;
  target_university: string;
  target_unit: string;
  exam_year: string;
  college: string;
  avatar: string;
  avatar_color: string;
  created_at: number;
  last_active_at?: number;
  last_ip?: string;
  last_device?: string;
  current_page?: string;
}

export async function getUserByPhone(phone: string): Promise<UserRecord | null> {
  const cleaned = phone.trim();
  try {
    const res = await query('SELECT * FROM users WHERE phone = $1', [cleaned]);
    if (res && res.rows.length > 0) return res.rows[0] as UserRecord;
  } catch (err) {}

  for (const u of memoryStore.users.values()) {
    if (u.phone === cleaned) return u;
  }
  return null;
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  if (id === 'guest_user') {
    return {
      id: 'guest_user',
      phone: '01700000000',
      password_hash: '',
      name: 'অতিথি শিক্ষার্থী',
      target_university: 'du_a',
      target_unit: "'ক' ইউনিট (বিজ্ঞান)",
      exam_year: 'HSC-26',
      college: 'ঢাকা কলেজ',
      avatar: '🧑‍🎓',
      avatar_color: '#FF6B00',
      created_at: Date.now(),
    };
  }

  try {
    const res = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (res && res.rows.length > 0) return res.rows[0] as UserRecord;
  } catch (err) {}

  return memoryStore.users.get(id) || null;
}

export async function createUser(userData: {
  id?: string;
  phone: string;
  password_hash: string;
  name: string;
  target_university?: string;
  target_unit?: string;
  exam_year?: string;
  college?: string;
  avatar?: string;
  avatar_color?: string;
}): Promise<UserRecord> {
  const id = userData.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const phone = userData.phone.trim();
  const password_hash = userData.password_hash;
  const name = userData.name.trim();
  const target_university = userData.target_university || 'du_a';
  const target_unit = userData.target_unit || "'ক' ইউনিট (বিজ্ঞান)";
  const exam_year = userData.exam_year || 'HSC-26';
  const college = userData.college || 'ঢাকা কলেজ';
  const avatar = userData.avatar || '🧑‍🎓';
  const avatar_color = userData.avatar_color || '#2563eb';
  const created_at = Date.now();

  const userRecord: UserRecord = {
    id,
    phone,
    password_hash,
    name,
    target_university,
    target_unit,
    exam_year,
    college,
    avatar,
    avatar_color,
    created_at,
  };

  memoryStore.users.set(id, userRecord);
  memoryStore.userProgress.set(id, {
    name,
    college,
    hscBatch: exam_year,
    avatarSeed: avatar,
    avatarBgColor: avatar_color,
    points: 50,
    examsCompleted: 0,
    totalCorrect: 0,
    totalWrong: 0,
    rank: 1500,
    streakDays: 1,
    targetUniversity: target_university,
    bookmarks: [],
    pastMistakes: [],
    examHistory: [],
    dailyPoints: [0, 0, 0, 50, 0, 0, 0],
    completedJourneyTasks: ['task_account_created'],
  });

  await query(
    `INSERT INTO users (
      id, phone, password_hash, name, target_university, target_unit,
      exam_year, college, avatar, avatar_color, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [id, phone, password_hash, name, target_university, target_unit, exam_year, college, avatar, avatar_color, created_at]
  );

  await query(
    `INSERT INTO user_progress (
      user_id, points, streak_days, exams_completed, total_correct,
      total_wrong, accuracy, bookmarks, past_mistakes, exam_history,
      daily_points, completed_journey_tasks, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (user_id) DO NOTHING`,
    [id, 50, 1, 0, 0, 0, 0.0, '[]', '[]', '[]', JSON.stringify([0, 0, 0, 50, 0, 0, 0]), JSON.stringify(['task_account_created']), Date.now()]
  );

  return userRecord;
}

export async function updateUserProfile(
  id: string,
  updates: {
    name?: string;
    college?: string;
    exam_year?: string;
    target_university?: string;
    target_unit?: string;
    avatar?: string;
    avatar_color?: string;
  }
): Promise<UserRecord | null> {
  const existing = await getUserById(id);
  if (!existing) return null;

  const updated: UserRecord = {
    ...existing,
    name: updates.name !== undefined ? updates.name : existing.name,
    college: updates.college !== undefined ? updates.college : existing.college,
    exam_year: updates.exam_year !== undefined ? updates.exam_year : existing.exam_year,
    target_university: updates.target_university !== undefined ? updates.target_university : existing.target_university,
    target_unit: updates.target_unit !== undefined ? updates.target_unit : existing.target_unit,
    avatar: updates.avatar !== undefined ? updates.avatar : existing.avatar,
    avatar_color: updates.avatar_color !== undefined ? updates.avatar_color : existing.avatar_color,
  };

  memoryStore.users.set(id, updated);

  await query(
    `UPDATE users SET
      name = $1, college = $2, exam_year = $3, target_university = $4, target_unit = $5, avatar = $6, avatar_color = $7
    WHERE id = $8`,
    [updated.name, updated.college, updated.exam_year, updated.target_university, updated.target_unit, updated.avatar, updated.avatar_color, id]
  );

  return updated;
}

// ---------------- USER PROGRESS OPERATIONS ----------------

export async function getUserProgressFromDb(userId: string): Promise<any> {
  const user = await getUserById(userId);
  if (!user) return null;

  try {
    const res = await query('SELECT * FROM user_progress WHERE user_id = $1', [userId]);
    if (res && res.rows.length > 0) {
      const p = res.rows[0];
      let bookmarks = [];
      try { bookmarks = typeof p.bookmarks === 'string' ? JSON.parse(p.bookmarks) : p.bookmarks || []; } catch (e) {}
      let pastMistakes = [];
      try { pastMistakes = typeof p.past_mistakes === 'string' ? JSON.parse(p.past_mistakes) : p.past_mistakes || []; } catch (e) {}
      let examHistory = [];
      try { examHistory = typeof p.exam_history === 'string' ? JSON.parse(p.exam_history) : p.exam_history || []; } catch (e) {}
      let dailyPoints = [0, 0, 0, 50, 0, 0, 0];
      try { dailyPoints = typeof p.daily_points === 'string' ? JSON.parse(p.daily_points) : p.daily_points || [0, 0, 0, 50, 0, 0, 0]; } catch (e) {}
      let completedJourneyTasks = ['task_account_created'];
      try { completedJourneyTasks = typeof p.completed_journey_tasks === 'string' ? JSON.parse(p.completed_journey_tasks) : p.completed_journey_tasks || []; } catch (e) {}

      return {
        name: user.name,
        college: user.college,
        hscBatch: user.exam_year,
        avatarSeed: user.avatar || '🧑‍🎓',
        avatarBgColor: user.avatar_color || '#2563eb',
        points: p.points || 0,
        examsCompleted: p.exams_completed || 0,
        totalCorrect: p.total_correct || 0,
        totalWrong: p.total_wrong || 0,
        rank: Math.max(1, 1500 - Math.floor((p.points || 0) / 10)),
        streakDays: p.streak_days || 1,
        targetUniversity: user.target_university || 'du_a',
        bookmarks,
        pastMistakes,
        examHistory,
        dailyPoints,
        completedJourneyTasks,
      };
    }
  } catch (err) {}

  if (memoryStore.userProgress.has(userId)) {
    return memoryStore.userProgress.get(userId);
  }

  const defaultProgress = {
    name: user.name,
    college: user.college,
    hscBatch: user.exam_year,
    avatarSeed: user.avatar || '🧑‍🎓',
    avatarBgColor: user.avatar_color || '#2563eb',
    points: 50,
    examsCompleted: 0,
    totalCorrect: 0,
    totalWrong: 0,
    rank: 1500,
    streakDays: 1,
    targetUniversity: user.target_university || 'du_a',
    bookmarks: [],
    pastMistakes: [],
    examHistory: [],
    dailyPoints: [0, 0, 0, 50, 0, 0, 0],
    completedJourneyTasks: ['task_account_created'],
  };

  memoryStore.userProgress.set(userId, defaultProgress);
  return defaultProgress;
}

export async function saveUserProgressToDb(userId: string, progress: any): Promise<any> {
  const user = await getUserById(userId);
  if (!user) return null;

  const points = typeof progress.points === 'number' ? progress.points : 0;
  const streak_days = typeof progress.streakDays === 'number' ? progress.streakDays : 1;
  const exams_completed = typeof progress.examsCompleted === 'number' ? progress.examsCompleted : 0;
  const total_correct = typeof progress.totalCorrect === 'number' ? progress.totalCorrect : 0;
  const total_wrong = typeof progress.totalWrong === 'number' ? progress.totalWrong : 0;
  const total_answered = total_correct + total_wrong;
  const accuracy = total_answered > 0 ? (total_correct / total_answered) * 100 : 0.0;

  const bookmarks = Array.isArray(progress.bookmarks) ? progress.bookmarks : [];
  const past_mistakes = Array.isArray(progress.pastMistakes) ? progress.pastMistakes : [];
  const exam_history = Array.isArray(progress.examHistory) ? progress.examHistory : [];
  const daily_points = Array.isArray(progress.dailyPoints) ? progress.dailyPoints : [0, 0, 0, 50, 0, 0, 0];
  const completed_journey_tasks = Array.isArray(progress.completedJourneyTasks) ? progress.completedJourneyTasks : ['task_account_created'];

  const updatedProgressObj = {
    ...progress,
    name: progress.name || user.name,
    college: progress.college || user.college,
    hscBatch: progress.hscBatch || user.exam_year,
    avatarSeed: progress.avatarSeed || user.avatar,
    avatarBgColor: progress.avatarBgColor || user.avatar_color,
    points,
    streakDays: streak_days,
    examsCompleted: exams_completed,
    totalCorrect: total_correct,
    totalWrong: total_wrong,
    bookmarks,
    pastMistakes: past_mistakes,
    examHistory: exam_history,
    dailyPoints: daily_points,
    completedJourneyTasks: completed_journey_tasks,
  };

  memoryStore.userProgress.set(userId, updatedProgressObj);

  if (progress.name || progress.college || progress.hscBatch || progress.targetUniversity || progress.avatarBgColor) {
    await updateUserProfile(userId, {
      name: progress.name,
      college: progress.college,
      exam_year: progress.hscBatch,
      target_university: progress.targetUniversity,
      avatar_color: progress.avatarBgColor,
    });
  }

  await query(
    `INSERT INTO user_progress (
      user_id, points, streak_days, exams_completed, total_correct, total_wrong,
      accuracy, bookmarks, past_mistakes, exam_history,
      daily_points, completed_journey_tasks, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (user_id) DO UPDATE SET
      points = EXCLUDED.points,
      streak_days = EXCLUDED.streak_days,
      exams_completed = EXCLUDED.exams_completed,
      total_correct = EXCLUDED.total_correct,
      total_wrong = EXCLUDED.total_wrong,
      accuracy = EXCLUDED.accuracy,
      bookmarks = EXCLUDED.bookmarks,
      past_mistakes = EXCLUDED.past_mistakes,
      exam_history = EXCLUDED.exam_history,
      daily_points = EXCLUDED.daily_points,
      completed_journey_tasks = EXCLUDED.completed_journey_tasks,
      updated_at = EXCLUDED.updated_at`,
    [
      userId,
      points,
      streak_days,
      exams_completed,
      total_correct,
      total_wrong,
      accuracy,
      JSON.stringify(bookmarks),
      JSON.stringify(past_mistakes),
      JSON.stringify(exam_history),
      JSON.stringify(daily_points),
      JSON.stringify(completed_journey_tasks),
      Date.now(),
    ]
  );

  return updatedProgressObj;
}

// ---------------- Chat History Management ----------------

export async function getChatHistoryFromDb(userId: string, limit: number = 100) {
  try {
    const res = await query(
      `SELECT id, user_id, role, content, model_used, provider, created_at
       FROM chat_history
       WHERE user_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [userId, limit]
    );

    if (res && res.rows) {
      return res.rows.map((item: any) => ({
        id: item.id,
        role: item.role as 'user' | 'assistant',
        content: item.content,
        modelUsed: item.model_used || undefined,
        provider: item.provider as 'gemini' | 'openrouter' | undefined,
        timestamp: Number(item.created_at) || Date.now(),
      }));
    }
  } catch (err) {}

  return memoryStore.chatHistory
    .filter((c) => c.userId === userId)
    .slice(-limit)
    .map((c) => ({
      id: c.id,
      role: c.role,
      content: c.content,
      modelUsed: c.modelUsed,
      provider: c.provider as any,
      timestamp: c.createdAt,
    }));
}

export async function saveChatMessageToDb(
  userId: string,
  role: string,
  content: string,
  modelUsed?: string,
  provider?: string,
  customId?: string
) {
  const id = customId || `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  memoryStore.chatHistory.push({
    id,
    userId,
    role: role as any,
    content,
    modelUsed,
    provider,
    createdAt: now,
  });

  await query(
    `INSERT INTO chat_history (id, user_id, role, content, model_used, provider, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       content = EXCLUDED.content,
       model_used = EXCLUDED.model_used`,
    [id, userId, role, content, modelUsed || null, provider || null, now]
  );

  return { id, role, content, modelUsed, provider, timestamp: now };
}

export async function clearChatHistoryInDb(userId: string) {
  memoryStore.chatHistory = memoryStore.chatHistory.filter((c) => c.userId !== userId);
  await query('DELETE FROM chat_history WHERE user_id = $1', [userId]);
  return true;
}

// ---------------- Admin Settings Management ----------------

export async function getAdminSetting(key: string, defaultValue: string = ''): Promise<string> {
  try {
    const res = await query('SELECT value FROM admin_settings WHERE key = $1', [key]);
    if (res && res.rows.length > 0) return res.rows[0].value;
  } catch (err) {}

  return memoryStore.adminSettings.get(key) || defaultValue;
}

export async function setAdminSetting(key: string, value: string): Promise<boolean> {
  const now = Date.now();
  memoryStore.adminSettings.set(key, value);

  await query(
    `INSERT INTO admin_settings (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       updated_at = EXCLUDED.updated_at`,
    [key, value, now]
  );
  return true;
}

// ---------------- Admin Drafts Queue Management ----------------

export interface AdminDraftRow {
  id: string;
  type: 'question' | 'topic' | 'knowledge_snippet';
  payload: any;
  status: 'pending' | 'approved' | 'rejected';
  source_model?: string;
  source_info?: string;
  created_at: number;
  updated_at?: number;
}

export async function getAllAdminDrafts(filters?: {
  type?: string;
  status?: string;
  search?: string;
}): Promise<AdminDraftRow[]> {
  try {
    let sql = 'SELECT * FROM admin_drafts WHERE 1=1';
    const params: any[] = [];
    let pIdx = 1;

    if (filters?.type) {
      sql += ` AND type = $${pIdx++}`;
      params.push(filters.type);
    }
    if (filters?.status) {
      sql += ` AND status = $${pIdx++}`;
      params.push(filters.status);
    }
    if (filters?.search) {
      sql += ` AND (payload ILIKE $${pIdx++} OR source_info ILIKE $${pIdx++})`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const res = await query(sql, params);
    if (res && res.rows) {
      return res.rows.map((r: any) => ({
        id: String(r.id),
        type: r.type,
        payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
        status: r.status,
        source_model: r.source_model || undefined,
        source_info: r.source_info || undefined,
        created_at: Number(r.created_at) || Date.now(),
        updated_at: r.updated_at ? Number(r.updated_at) : undefined,
      }));
    }
  } catch (err) {}

  let list = Array.from(memoryStore.adminDrafts.values());
  if (filters?.type) {
    list = list.filter((d) => d.type === filters.type);
  }
  if (filters?.status) {
    list = list.filter((d) => d.status === filters.status);
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    list = list.filter(
      (d) =>
        JSON.stringify(d.payload).toLowerCase().includes(s) ||
        (d.source_info && d.source_info.toLowerCase().includes(s))
    );
  }
  return list;
}

export async function getAdminDraftById(id: string): Promise<AdminDraftRow | null> {
  try {
    const res = await query('SELECT * FROM admin_drafts WHERE id = $1', [id]);
    if (res && res.rows.length > 0) {
      const r = res.rows[0];
      return {
        id: String(r.id),
        type: r.type,
        payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
        status: r.status,
        source_model: r.source_model || undefined,
        source_info: r.source_info || undefined,
        created_at: Number(r.created_at) || Date.now(),
        updated_at: r.updated_at ? Number(r.updated_at) : undefined,
      };
    }
  } catch (err) {}

  return memoryStore.adminDrafts.get(id) || null;
}

export async function insertAdminDraft({
  type,
  payload,
  source_model,
  source_info,
  status = 'pending',
}: {
  type: 'question' | 'topic' | 'knowledge_snippet';
  payload: any;
  source_model?: string;
  source_info?: string;
  status?: 'pending' | 'approved' | 'rejected';
}): Promise<AdminDraftRow> {
  const id = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  const payloadObj = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const payloadJson = JSON.stringify(payloadObj);

  const draft: AdminDraftRow = {
    id,
    type,
    payload: payloadObj,
    status,
    source_model,
    source_info,
    created_at: now,
    updated_at: now,
  };

  memoryStore.adminDrafts.set(id, draft);

  await query(
    `INSERT INTO admin_drafts (id, type, payload, status, source_model, source_info, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, type, payloadJson, status, source_model || null, source_info || null, now, now]
  );

  return draft;
}

export async function updateAdminDraft(
  id: string,
  update: { payload?: any; status?: 'pending' | 'approved' | 'rejected' }
): Promise<AdminDraftRow | null> {
  const existing = await getAdminDraftById(id);
  if (!existing) return null;

  const newPayload = update.payload !== undefined ? update.payload : existing.payload;
  const newStatus = update.status !== undefined ? update.status : existing.status;
  const now = Date.now();

  const updated: AdminDraftRow = {
    ...existing,
    payload: newPayload,
    status: newStatus,
    updated_at: now,
  };

  memoryStore.adminDrafts.set(id, updated);

  await query(
    `UPDATE admin_drafts SET payload = $1, status = $2, updated_at = $3 WHERE id = $4`,
    [JSON.stringify(newPayload), newStatus, now, id]
  );

  return updated;
}

export async function deleteAdminDraft(id: string): Promise<boolean> {
  memoryStore.adminDrafts.delete(id);
  await query('DELETE FROM admin_drafts WHERE id = $1', [id]);
  return true;
}

export async function clearAdminDrafts(status?: string): Promise<number> {
  if (status && status !== 'all') {
    for (const [id, d] of memoryStore.adminDrafts.entries()) {
      if (d.status === status) memoryStore.adminDrafts.delete(id);
    }
    await query('DELETE FROM admin_drafts WHERE status = $1', [status]);
  } else {
    memoryStore.adminDrafts.clear();
    await query('DELETE FROM admin_drafts');
  }
  return 1;
}

// Approve and Inject Draft into Live Production Database
export async function approveAndPublishDraft(id: string): Promise<{ success: boolean; publishedItem: any; draft: AdminDraftRow }> {
  const draft = await getAdminDraftById(id);
  if (!draft) {
    throw new Error('Draft not found');
  }

  let publishedItem: any = null;
  const p = draft.payload;

  if (draft.type === 'question') {
    publishedItem = await insertQuestion(p);
  } else if (draft.type === 'topic') {
    publishedItem = await insertTopic(p);
  } else if (draft.type === 'knowledge_snippet') {
    publishedItem = await insertKnowledgeSnippet(p);
  } else {
    throw new Error(`Unsupported draft type: ${draft.type}`);
  }

  const updatedDraft = await updateAdminDraft(id, { status: 'approved' });

  return {
    success: true,
    publishedItem,
    draft: updatedDraft || draft,
  };
}

export async function batchApproveDrafts(ids: string[]): Promise<{ approvedCount: number; errors: any[] }> {
  let approvedCount = 0;
  const errors: any[] = [];

  for (const id of ids) {
    try {
      await approveAndPublishDraft(id);
      approvedCount++;
    } catch (e: any) {
      errors.push({ id, error: e.message });
    }
  }

  return { approvedCount, errors };
}

export async function batchRejectDrafts(ids: string[]): Promise<{ rejectedCount: number }> {
  for (const id of ids) {
    await updateAdminDraft(id, { status: 'rejected' });
  }
  return { rejectedCount: ids.length };
}

// ---------------- Admin Metrics & Stats ----------------

export async function getAdminDatabaseStats(): Promise<any> {
  let totalQuestions = memoryStore.questions.size;
  let totalTopics = memoryStore.topics.size;
  let totalSnippets = memoryStore.snippets.size;
  let totalUsers = memoryStore.users.size;
  let pendingDrafts = Array.from(memoryStore.adminDrafts.values()).filter((d) => d.status === 'pending').length;
  let approvedDrafts = Array.from(memoryStore.adminDrafts.values()).filter((d) => d.status === 'approved').length;
  let rejectedDrafts = Array.from(memoryStore.adminDrafts.values()).filter((d) => d.status === 'rejected').length;
  let dbFileSize = isPgConnected ? 'PostgreSQL Active' : 'Memory Cache (Fast)';

  try {
    const qCountRes = await query('SELECT COUNT(*)::int AS count FROM questions');
    if (qCountRes && qCountRes.rows[0]) totalQuestions = qCountRes.rows[0].count;

    const tCountRes = await query('SELECT COUNT(*)::int AS count FROM topics');
    if (tCountRes && tCountRes.rows[0]) totalTopics = tCountRes.rows[0].count;

    const sCountRes = await query('SELECT COUNT(*)::int AS count FROM knowledge_snippets');
    if (sCountRes && sCountRes.rows[0]) totalSnippets = sCountRes.rows[0].count;

    const uCountRes = await query('SELECT COUNT(*)::int AS count FROM users');
    if (uCountRes && uCountRes.rows[0]) totalUsers = uCountRes.rows[0].count;

    const pendingDraftsRes = await query("SELECT COUNT(*)::int AS count FROM admin_drafts WHERE status = 'pending'");
    if (pendingDraftsRes && pendingDraftsRes.rows[0]) pendingDrafts = pendingDraftsRes.rows[0].count;

    const approvedDraftsRes = await query("SELECT COUNT(*)::int AS count FROM admin_drafts WHERE status = 'approved'");
    if (approvedDraftsRes && approvedDraftsRes.rows[0]) approvedDrafts = approvedDraftsRes.rows[0].count;

    const rejectedDraftsRes = await query("SELECT COUNT(*)::int AS count FROM admin_drafts WHERE status = 'rejected'");
    if (rejectedDraftsRes && rejectedDraftsRes.rows[0]) rejectedDrafts = rejectedDraftsRes.rows[0].count;

    if (isPgConnected) {
      try {
        const sizeRes = await query('SELECT pg_size_pretty(pg_database_size(current_database())) AS size');
        if (sizeRes && sizeRes.rows[0]?.size) {
          dbFileSize = sizeRes.rows[0].size;
        }
      } catch {}
    }
  } catch (err: any) {}

  return {
    totalQuestions,
    totalTopics,
    totalSnippets,
    totalUsers,
    pendingDrafts,
    approvedDrafts,
    rejectedDrafts,
    dbFileSize,
    status: isPgConnected ? 'postgresql_online' : 'ready',
  };
}

// ---------------- REAL-TIME ACTIVE USERS TELEMETRY ----------------

export interface ActiveUserSession {
  sessionId: string;
  userId?: string;
  name: string;
  phone?: string;
  avatar?: string;
  avatarColor?: string;
  targetUniversity?: string;
  targetUnit?: string;
  college?: string;
  device?: string;
  browser?: string;
  ip?: string;
  currentPage: string;
  firstSeenAt: number;
  lastActiveAt: number;
  requestCount: number;
  isGuest: boolean;
}

// In-memory real-time active sessions store
const activeSessionsStore = new Map<string, ActiveUserSession>();

export async function recordUserActivityInDb(data: {
  userId?: string;
  customSessionId?: string;
  ip?: string;
  userAgent?: string;
  currentPage?: string;
  targetUniversity?: string;
  deviceInfo?: string;
}): Promise<void> {
  const now = Date.now();
  const sessionId = data.userId ? `user_${data.userId}` : (data.customSessionId || `guest_${data.ip || 'anon'}`);
  
  // Clean up user agent to friendly device/browser name
  let device = data.deviceInfo || 'Web Browser';
  let browser = 'Chrome/Safari';
  if (data.userAgent) {
    const ua = data.userAgent;
    if (ua.includes('Android')) device = 'Android Phone';
    else if (ua.includes('iPhone')) device = 'iPhone';
    else if (ua.includes('iPad')) device = 'iPad Tablet';
    else if (ua.includes('Macintosh')) device = 'macOS Desktop';
    else if (ua.includes('Windows')) device = 'Windows PC';
    else if (ua.includes('Linux')) device = 'Linux Machine';

    if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome/')) browser = 'Google Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari';
    else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
  }

  let existing = activeSessionsStore.get(sessionId);

  // If registered user, retrieve name and avatar
  let userName = 'অতিথি শিক্ষার্থী';
  let userPhone = undefined;
  let userAvatar = '🧑‍🎓';
  let userAvatarColor = '#2563eb';
  let userTargetUni = data.targetUniversity || 'du_a';
  let userTargetUnit = "'ক' ইউনিট";
  let userCollege = 'কলেজ শিক্ষার্থী';

  if (data.userId) {
    const user = await getUserById(data.userId);
    if (user) {
      userName = user.name;
      userPhone = user.phone;
      userAvatar = user.avatar || '🧑‍🎓';
      userAvatarColor = user.avatar_color || '#2563eb';
      userTargetUni = user.target_university || 'du_a';
      userTargetUnit = user.target_unit || "'ক' ইউনিট";
      userCollege = user.college || 'কলেজ শিক্ষার্থী';

      // Update in memory user
      user.last_active_at = now;
      if (data.ip) user.last_ip = data.ip;
      if (device) user.last_device = device;
      if (data.currentPage) user.current_page = data.currentPage;
      memoryStore.users.set(user.id, user);

      // Async write to PG
      query(
        `UPDATE users SET
          last_active_at = $1,
          last_ip = COALESCE($2, last_ip),
          last_device = COALESCE($3, last_device),
          current_page = COALESCE($4, current_page)
        WHERE id = $5`,
        [now, data.ip || null, device || null, data.currentPage || null, user.id]
      ).catch(() => {});
    }
  }

  if (existing) {
    existing.lastActiveAt = now;
    existing.requestCount += 1;
    if (data.currentPage) existing.currentPage = data.currentPage;
    if (data.ip) existing.ip = data.ip;
    if (data.userId) {
      existing.userId = data.userId;
      existing.name = userName;
      existing.phone = userPhone;
      existing.avatar = userAvatar;
      existing.avatarColor = userAvatarColor;
      existing.targetUniversity = userTargetUni;
      existing.targetUnit = userTargetUnit;
      existing.college = userCollege;
      existing.isGuest = false;
    }
    activeSessionsStore.set(sessionId, existing);
  } else {
    const newSession: ActiveUserSession = {
      sessionId,
      userId: data.userId,
      name: userName,
      phone: userPhone,
      avatar: userAvatar,
      avatarColor: userAvatarColor,
      targetUniversity: userTargetUni,
      targetUnit: userTargetUnit,
      college: userCollege,
      device,
      browser,
      ip: data.ip,
      currentPage: data.currentPage || 'হোমপেজ',
      firstSeenAt: now,
      lastActiveAt: now,
      requestCount: 1,
      isGuest: !data.userId,
    };
    activeSessionsStore.set(sessionId, newSession);
  }

  // Purge sessions older than 24 hours to prevent memory bloat
  const expiryCutoff = now - 24 * 60 * 60 * 1000;
  for (const [key, session] of activeSessionsStore.entries()) {
    if (session.lastActiveAt < expiryCutoff) {
      activeSessionsStore.delete(key);
    }
  }
}

export async function getActiveUsersTelemetryFromDb(): Promise<{
  success: boolean;
  totalActiveNow: number;
  totalActiveToday: number;
  totalRegisteredActive: number;
  totalGuestsActive: number;
  activeUsers: Array<{
    sessionId: string;
    userId?: string;
    name: string;
    phone?: string;
    avatar?: string;
    avatarColor?: string;
    targetUniversity?: string;
    targetUnit?: string;
    college?: string;
    device?: string;
    browser?: string;
    ip?: string;
    currentPage: string;
    firstSeenAt: number;
    lastActiveAt: number;
    requestCount: number;
    isGuest: boolean;
    status: 'online' | 'idle' | 'offline';
  }>;
  universityBreakdown: Record<string, number>;
  pageBreakdown: Record<string, number>;
  lastUpdated: number;
}> {
  const now = Date.now();
  const onlineThresholdMs = 2 * 60 * 1000; // < 2 minutes = online
  const idleThresholdMs = 6 * 60 * 1000;   // 2 to 6 minutes = idle
  const todayCutoff = now - 24 * 60 * 60 * 1000;

  const sessionList = Array.from(activeSessionsStore.values());
  const universityBreakdown: Record<string, number> = {};
  const pageBreakdown: Record<string, number> = {};

  let totalActiveNow = 0;
  let totalActiveToday = 0;
  let totalRegisteredActive = 0;
  let totalGuestsActive = 0;

  const activeUsers = sessionList
    .filter((s) => s.lastActiveAt >= todayCutoff)
    .map((s) => {
      const diff = now - s.lastActiveAt;
      let status: 'online' | 'idle' | 'offline' = 'offline';
      if (diff <= onlineThresholdMs) {
        status = 'online';
        totalActiveNow++;
      } else if (diff <= idleThresholdMs) {
        status = 'idle';
      }

      totalActiveToday++;
      if (s.isGuest) {
        totalGuestsActive++;
      } else {
        totalRegisteredActive++;
      }

      const uni = s.targetUniversity || 'general';
      universityBreakdown[uni] = (universityBreakdown[uni] || 0) + 1;

      const page = s.currentPage || 'হোমপেজ';
      pageBreakdown[page] = (pageBreakdown[page] || 0) + 1;

      return {
        ...s,
        status,
      };
    })
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt);

  return {
    success: true,
    totalActiveNow,
    totalActiveToday,
    totalRegisteredActive,
    totalGuestsActive,
    activeUsers,
    universityBreakdown,
    pageBreakdown,
    lastUpdated: now,
  };
}

// ---------------- WRITTEN QUESTIONS ----------------

export function formatRowToWrittenQuestion(row: any): WrittenQuestion {
  let tags: string[] = [];
  try {
    tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [];
  } catch (e) {
    tags = [];
  }

  let explanation_image_urls: string[] | undefined = undefined;
  if (row.explanation_image_urls) {
    try {
      explanation_image_urls =
        typeof row.explanation_image_urls === 'string'
          ? JSON.parse(row.explanation_image_urls)
          : row.explanation_image_urls;
    } catch (e) {
      explanation_image_urls = undefined;
    }
  }

  return {
    id: String(row.id),
    subject_id: row.subject_id,
    subject_name: row.subject_name,
    paper: row.paper,
    chapter_id: row.chapter_id,
    chapter_name: row.chapter_name,
    topic_id: row.topic_id || undefined,
    topic_name: row.topic_name || undefined,
    question_number: row.question_number ? Number(row.question_number) : undefined,
    question_text: row.question_text,
    question_image_url: row.question_image_url || undefined,
    explanation: row.explanation,
    explanation_latex: row.explanation_latex || undefined,
    explanation_image_urls,
    tags,
    category: row.category || undefined,
    difficulty: row.difficulty || 'medium',
    star_rating: (row.star_rating as 1 | 2 | 3) || 1,
    created_at: row.created_at ? Number(row.created_at) : undefined,
    updated_at: row.updated_at ? Number(row.updated_at) : undefined,
    is_active: row.is_active !== undefined ? Boolean(row.is_active) : true,
  };
}

export interface PaginatedWrittenQuestionsResult {
  data: WrittenQuestion[];
  questions: WrittenQuestion[];
  total: number;
  nextCursor?: string | null;
  hasMore?: boolean;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export async function getAllWrittenQuestions(filters?: {
  subject_id?: string;
  chapter_id?: string;
  topic_id?: string;
  type?: string;
  paper?: string;
  tag?: string;
  search?: string;
  category?: string;
  difficulty?: string;
  cursor?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedWrittenQuestionsResult> {
  const cursorData = decodeCursor(filters?.cursor);
  const page = Math.max(1, filters?.page ?? (cursorData?.page ? cursorData.page + 1 : 1));
  const limit = filters?.limit ? Math.max(1, filters.limit) : 15;
  const offset = (page - 1) * limit;

  try {
    let whereClause = ' WHERE is_active = TRUE';
    const params: any[] = [];
    let pIdx = 1;

    if (filters?.subject_id) {
      whereClause += ` AND subject_id = $${pIdx++}`;
      params.push(filters.subject_id);
    }
    if (filters?.chapter_id) {
      whereClause += ` AND chapter_id = $${pIdx++}`;
      params.push(filters.chapter_id);
    }
    if (filters?.topic_id) {
      whereClause += ` AND topic_id = $${pIdx++}`;
      params.push(filters.topic_id);
    }
    if (filters?.paper) {
      whereClause += ` AND paper = $${pIdx++}`;
      params.push(filters.paper);
    }
    if (filters?.category) {
      const catFilter = buildCategoryWhereClause(filters.category, pIdx);
      whereClause += catFilter.clause;
      params.push(...catFilter.params);
      pIdx = catFilter.pIdxNext;
    }
    if (filters?.difficulty) {
      whereClause += ` AND difficulty = $${pIdx++}`;
      params.push(filters.difficulty);
    }
    if (filters?.tag) {
      whereClause += ` AND tags ILIKE $${pIdx++}`;
      params.push(`%${filters.tag}%`);
    }
    if (filters?.search) {
      const term = `%${filters.search}%`;
      whereClause += ` AND (question_text ILIKE $${pIdx++} OR explanation ILIKE $${pIdx++} OR tags ILIKE $${pIdx++} OR chapter_name ILIKE $${pIdx++} OR topic_name ILIKE $${pIdx++})`;
      params.push(term, term, term, term, term);
    }

    // 1. Get total count
    const countSql = `SELECT COUNT(*) as total FROM written_questions${whereClause}`;
    const countRes = await query(countSql, params);
    const total = countRes && countRes.rows && countRes.rows[0] ? Number(countRes.rows[0].total) || 0 : 0;

    // 2. Get questions with LIMIT & OFFSET
    let dataSql = `SELECT * FROM written_questions${whereClause} ORDER BY question_number ASC NULLS LAST, created_at DESC NULLS LAST, id DESC`;
    const dataParams = [...params];

    const fetchLimit = limit + 1;
    dataSql += ` LIMIT $${pIdx++} OFFSET $${pIdx++}`;
    dataParams.push(fetchLimit, offset);

    const res = await query(dataSql, dataParams);
    if (res && res.rows) {
      let questions = res.rows.map(formatRowToWrittenQuestion);
      let hasMore = false;
      if (questions.length > limit) {
        hasMore = true;
        questions = questions.slice(0, limit);
      }

      const lastQuestion = questions[questions.length - 1];
      const nextCursor = hasMore && lastQuestion
        ? encodeCursor(lastQuestion.created_at || Date.now(), lastQuestion.id, page)
        : null;

      const totalPages = Math.ceil(total / limit) || 1;
      return {
        data: questions,
        questions,
        total,
        nextCursor,
        hasMore,
        page,
        limit,
        totalPages,
      };
    }
  } catch (err) {}

  // Fallback in-memory filter
  let list = Array.from(memoryStore.writtenQuestions.values()).filter((q) => q.is_active !== false);
  if (filters?.subject_id) {
    list = list.filter((q) => q.subject_id === filters.subject_id);
  }
  if (filters?.chapter_id) {
    list = list.filter((q) => q.chapter_id === filters.chapter_id);
  }
  if (filters?.topic_id) {
    list = list.filter((q) => q.topic_id === filters.topic_id);
  }
  if (filters?.paper) {
    list = list.filter((q) => q.paper === filters.paper);
  }
  if (filters?.category) {
    list = list.filter((q) => matchesCategoryInMemory(q, filters.category!));
  }
  if (filters?.difficulty) {
    list = list.filter((q) => q.difficulty === filters.difficulty);
  }
  if (filters?.tag) {
    const tLower = filters.tag.toLowerCase();
    list = list.filter((q) => q.tags && q.tags.some((t) => t.toLowerCase().includes(tLower)));
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    list = list.filter(
      (q) =>
        q.question_text.toLowerCase().includes(s) ||
        q.explanation.toLowerCase().includes(s) ||
        (q.chapter_name && q.chapter_name.toLowerCase().includes(s)) ||
        (q.topic_name && q.topic_name.toLowerCase().includes(s))
    );
  }

  const total = list.length;
  let startIndex = offset;

  if (cursorData?.id) {
    const idx = list.findIndex((q) => String(q.id) === String(cursorData.id));
    if (idx !== -1) {
      startIndex = idx + 1;
    }
  }

  let questions = list.slice(startIndex, startIndex + limit + 1);
  let hasMore = false;
  if (questions.length > limit) {
    hasMore = true;
    questions = questions.slice(0, limit);
  }

  const lastQuestion = questions[questions.length - 1];
  const nextCursor = hasMore && lastQuestion
    ? encodeCursor(lastQuestion.created_at || Date.now(), lastQuestion.id, page)
    : null;

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: questions,
    questions,
    total,
    nextCursor,
    hasMore,
    page,
    limit,
    totalPages,
  };
}

export async function getWrittenQuestionById(id: string): Promise<WrittenQuestion | null> {
  try {
    const res = await query('SELECT * FROM written_questions WHERE id = $1', [id]);
    if (res && res.rows.length > 0) return formatRowToWrittenQuestion(res.rows[0]);
  } catch (err) {}

  return memoryStore.writtenQuestions.get(id) || null;
}

export async function insertWrittenQuestion(q: Partial<WrittenQuestion>): Promise<WrittenQuestion> {
  const now = Date.now();
  const id = q.id || `wq_${q.subject_id || 'sub'}_${now}_${Math.random().toString(36).substring(2, 6)}`;
  
  const item: WrittenQuestion = {
    id,
    subject_id: q.subject_id || 'physics_2',
    subject_name: q.subject_name || 'পদার্থবিজ্ঞান ২য় পত্র',
    paper: (q.paper as any) || '2nd',
    chapter_id: q.chapter_id || 'phy2_ch1',
    chapter_name: q.chapter_name || 'তাপগতিবিদ্যা',
    topic_id: q.topic_id,
    topic_name: q.topic_name,
    question_number: q.question_number ? Number(q.question_number) : undefined,
    question_text: q.question_text || '',
    question_image_url: q.question_image_url,
    explanation: q.explanation || (q as any).answer_text || '',
    explanation_latex: q.explanation_latex,
    explanation_image_urls: q.explanation_image_urls || [],
    tags: Array.isArray(q.tags) ? q.tags : [],
    category: q.category || 'varsity_a',
    difficulty: (q.difficulty as any) || 'medium',
    star_rating: (q.star_rating as 1 | 2 | 3) || 1,
    created_at: now,
    updated_at: now,
    is_active: q.is_active !== undefined ? q.is_active : true,
  };

  memoryStore.writtenQuestions.set(id, item);

  await query(
    `INSERT INTO written_questions (
      id, subject_id, subject_name, paper, chapter_id, chapter_name,
      topic_id, topic_name, question_number, question_text, question_image_url,
      explanation, explanation_latex, explanation_image_urls, tags, category,
      difficulty, star_rating, created_at, updated_at, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    ON CONFLICT (id) DO UPDATE SET
      subject_id = EXCLUDED.subject_id,
      subject_name = EXCLUDED.subject_name,
      paper = EXCLUDED.paper,
      chapter_id = EXCLUDED.chapter_id,
      chapter_name = EXCLUDED.chapter_name,
      topic_id = EXCLUDED.topic_id,
      topic_name = EXCLUDED.topic_name,
      question_number = EXCLUDED.question_number,
      question_text = EXCLUDED.question_text,
      question_image_url = EXCLUDED.question_image_url,
      explanation = EXCLUDED.explanation,
      explanation_latex = EXCLUDED.explanation_latex,
      explanation_image_urls = EXCLUDED.explanation_image_urls,
      tags = EXCLUDED.tags,
      category = EXCLUDED.category,
      difficulty = EXCLUDED.difficulty,
      star_rating = EXCLUDED.star_rating,
      updated_at = EXCLUDED.updated_at,
      is_active = EXCLUDED.is_active`,
    [
      id,
      item.subject_id,
      item.subject_name,
      item.paper,
      item.chapter_id,
      item.chapter_name,
      item.topic_id || null,
      item.topic_name || null,
      item.question_number || null,
      item.question_text,
      item.question_image_url || null,
      item.explanation,
      item.explanation_latex || null,
      item.explanation_image_urls ? JSON.stringify(item.explanation_image_urls) : null,
      JSON.stringify(item.tags),
      item.category || null,
      item.difficulty,
      item.star_rating,
      item.created_at,
      item.updated_at,
      item.is_active,
    ]
  );

  return item;
}

export async function updateWrittenQuestionInDb(id: string, q: Partial<WrittenQuestion>): Promise<WrittenQuestion | null> {
  const existing = await getWrittenQuestionById(id);
  if (!existing) return null;

  const now = Date.now();
  const updated: WrittenQuestion = {
    ...existing,
    ...q,
    id,
    updated_at: now,
  };

  memoryStore.writtenQuestions.set(id, updated);

  await query(
    `UPDATE written_questions SET
      subject_id = $1, subject_name = $2, paper = $3, chapter_id = $4, chapter_name = $5,
      topic_id = $6, topic_name = $7, question_number = $8, question_text = $9,
      question_image_url = $10, explanation = $11, explanation_latex = $12,
      explanation_image_urls = $13, tags = $14, category = $15, difficulty = $16,
      star_rating = $17, updated_at = $18, is_active = $19
    WHERE id = $20`,
    [
      updated.subject_id,
      updated.subject_name,
      updated.paper,
      updated.chapter_id,
      updated.chapter_name,
      updated.topic_id || null,
      updated.topic_name || null,
      updated.question_number || null,
      updated.question_text,
      updated.question_image_url || null,
      updated.explanation,
      updated.explanation_latex || null,
      updated.explanation_image_urls ? JSON.stringify(updated.explanation_image_urls) : null,
      JSON.stringify(updated.tags || []),
      updated.category || null,
      updated.difficulty,
      updated.star_rating,
      updated.updated_at,
      updated.is_active,
      id,
    ]
  );

  return updated;
}

export async function deleteWrittenQuestionFromDb(id: string): Promise<boolean> {
  memoryStore.writtenQuestions.delete(id);
  await query('DELETE FROM written_questions WHERE id = $1', [id]);
  return true;
}

export async function bulkImportWrittenQuestions(items: Partial<WrittenQuestion>[]): Promise<WrittenQuestion[]> {
  const imported: WrittenQuestion[] = [];
  for (const item of items) {
    const created = await insertWrittenQuestion(item);
    imported.push(created);
  }
  return imported;
}

export async function bulkImportTopics(items: Partial<TopicRecord>[]): Promise<TopicRecord[]> {
  const imported: TopicRecord[] = [];
  for (const item of items) {
    const created = await insertTopic(item);
    imported.push(created);
  }
  return imported;
}

export async function bulkImportKnowledgeSnippets(items: Partial<KnowledgeSnippet>[]): Promise<KnowledgeSnippet[]> {
  const imported: KnowledgeSnippet[] = [];
  for (const item of items) {
    const created = await insertKnowledgeSnippet(item);
    imported.push(created);
  }
  return imported;
}

// ---------------- High-Performance Aggregated Question Counts ----------------

export interface QuestionCountItem {
  total: number;
  mcq: number;
  written: number;
}

export interface QuestionCountsResponse {
  totalQuestions: number;
  totalMcq: number;
  totalWritten: number;
  bySubject: Record<string, QuestionCountItem>;
  byCategory: Record<string, QuestionCountItem>;
  bySubjectAndCategory: Record<string, Record<string, QuestionCountItem>>;
  byChapter: Record<string, QuestionCountItem>;
  byChapterAndCategory: Record<string, Record<string, QuestionCountItem>>;
  byTopic: Record<string, QuestionCountItem>;
  byTopicAndCategory: Record<string, Record<string, QuestionCountItem>>;
}

export function extractSubjectAliases(subjectId?: string): string[] {
  if (!subjectId) return [];
  const list = new Set<string>([subjectId.toLowerCase().trim()]);
  const s = subjectId.toLowerCase().trim();

  // physics_1 <-> physics1, phy_1, phy1, physics_p1
  const m = s.match(/^([a-z_]+?)(?:_p|_paper|paper|p|_)?(\d)$/i);
  if (m) {
    const base = m[1].replace(/_/g, '');
    const paper = m[2];
    list.add(`${base}_${paper}`);
    list.add(`${base}${paper}`);
    list.add(`${base}_p${paper}`);
    list.add(`${base}_paper_${paper}`);

    const map: Record<string, string[]> = {
      phy: ['physics'],
      physics: ['phy'],
      chem: ['chemistry'],
      chemistry: ['chem'],
      math: ['higher_math', 'highermath', 'maths'],
      highermath: ['math', 'higher_math'],
      higher_math: ['math', 'highermath'],
      bio: ['biology'],
      biology: ['bio'],
      botany: ['biology_1', 'bio_1'],
      zoology: ['biology_2', 'bio_2'],
    };

    if (map[base]) {
      for (const alt of map[base]) {
        list.add(`${alt}_${paper}`);
        list.add(`${alt}${paper}`);
        list.add(`${alt}_p${paper}`);
      }
    }
  }
  return Array.from(list);
}

export function extractChapterAliases(chapterId?: string): string[] {
  if (!chapterId) return [];
  const list = new Set<string>([chapterId.toLowerCase().trim()]);
  const ch = chapterId.toLowerCase().trim();

  // Format: phy1_ch1, bio1_ch12
  const m1 = ch.match(/^([a-z]+)(\d)_ch(\d+)$/i);
  if (m1) {
    const base = m1[1];
    const paper = m1[2];
    const cNum = m1[3];
    list.add(`${base}_p${paper}_c${cNum}`);
    list.add(`${base}_p${paper}_ch${cNum}`);
    list.add(`${base}${paper}_c${cNum}`);
    list.add(`${base}${paper}_ch${cNum}`);
    list.add(`${base}_${paper}_c${cNum}`);
    list.add(`${base}_${paper}_ch${cNum}`);
  }

  // Format: phy_p1_c1, bio_p1_c1
  const m2 = ch.match(/^([a-z]+)_p(\d)_c(?:h)?(\d+)$/i);
  if (m2) {
    const base = m2[1];
    const paper = m2[2];
    const cNum = m2[3];
    list.add(`${base}${paper}_ch${cNum}`);
    list.add(`${base}${paper}_c${cNum}`);
    list.add(`${base}_${paper}_ch${cNum}`);
    list.add(`${base}_${paper}_c${cNum}`);
  }

  return Array.from(list);
}

export function extractMatchedCategoryKeys(cat?: string, tags?: string[] | string): string[] {
  const cats = new Set<string>();
  const qCat = (cat || '').toLowerCase().trim();
  let tagsStr = '';
  if (Array.isArray(tags)) {
    tagsStr = tags.join(' ').toLowerCase();
  } else if (typeof tags === 'string') {
    tagsStr = tags.toLowerCase();
  }

  // 1. Varsity A
  if (
    qCat === 'varsity_a' ||
    qCat === 'varsity' ||
    tagsStr.includes('varsity_a') ||
    tagsStr.includes('du') ||
    tagsStr.includes('varsity') ||
    tagsStr.includes('gst') ||
    tagsStr.includes('bup') ||
    tagsStr.includes('ru') ||
    tagsStr.includes('cu') ||
    tagsStr.includes('ju') ||
    tagsStr.includes('agri')
  ) {
    cats.add('varsity_a');
  }

  // 2. Engineering
  if (
    qCat === 'engineering' ||
    tagsStr.includes('engineering') ||
    tagsStr.includes('buet') ||
    tagsStr.includes('sust') ||
    tagsStr.includes('ckruet') ||
    tagsStr.includes('cuet') ||
    tagsStr.includes('ruet') ||
    tagsStr.includes('kuet') ||
    tagsStr.includes('iut')
  ) {
    cats.add('engineering');
  }

  // 3. Medical
  if (
    qCat === 'medical' ||
    tagsStr.includes('medical') ||
    tagsStr.includes('mbbs') ||
    tagsStr.includes('dental') ||
    tagsStr.includes('mat')
  ) {
    cats.add('medical');
  }

  // 4. Academic
  if (
    qCat === 'academic' ||
    tagsStr.includes('academic') ||
    tagsStr.includes('board') ||
    tagsStr.includes('hsc') ||
    tagsStr.includes('dhaka board')
  ) {
    cats.add('academic');
  }

  // 5. Main Book
  if (
    qCat === 'main_book' ||
    tagsStr.includes('main_book') ||
    tagsStr.includes('main book') ||
    tagsStr.includes('textbook') ||
    tagsStr.includes('মূলবই') ||
    tagsStr.includes('অনুশীলনী')
  ) {
    cats.add('main_book');
  }

  if (qCat && ['varsity_a', 'engineering', 'medical', 'academic', 'main_book'].includes(qCat)) {
    cats.add(qCat);
  }

  if (cats.size === 0) {
    cats.add('varsity_a');
  }

  return Array.from(cats);
}

let cachedCounts: { timestamp: number; data: QuestionCountsResponse } | null = null;
const COUNTS_CACHE_TTL_MS = 5000; // 5 seconds cache for blazing fast performance

export function invalidateQuestionCountsCache() {
  cachedCounts = null;
}

export async function getQuestionCounts(filters?: {
  subject_id?: string;
  category?: string;
  chapter_id?: string;
}): Promise<QuestionCountsResponse> {
  const now = Date.now();
  if (cachedCounts && now - cachedCounts.timestamp < COUNTS_CACHE_TTL_MS && !filters?.subject_id && !filters?.category && !filters?.chapter_id) {
    return cachedCounts.data;
  }

  const bySubject: Record<string, QuestionCountItem> = {};
  const byCategory: Record<string, QuestionCountItem> = {
    varsity_a: { total: 0, mcq: 0, written: 0 },
    engineering: { total: 0, mcq: 0, written: 0 },
    medical: { total: 0, mcq: 0, written: 0 },
    academic: { total: 0, mcq: 0, written: 0 },
    main_book: { total: 0, mcq: 0, written: 0 },
  };
  const bySubjectAndCategory: Record<string, Record<string, QuestionCountItem>> = {};
  const byChapter: Record<string, QuestionCountItem> = {};
  const byChapterAndCategory: Record<string, Record<string, QuestionCountItem>> = {};
  const byTopic: Record<string, QuestionCountItem> = {};
  const byTopicAndCategory: Record<string, Record<string, QuestionCountItem>> = {};

  let totalMcq = 0;
  let totalWritten = 0;

  const incrementItem = (obj: Record<string, QuestionCountItem>, key: string, isWritten: boolean) => {
    if (!key) return;
    if (!obj[key]) {
      obj[key] = { total: 0, mcq: 0, written: 0 };
    }
    obj[key].total++;
    if (isWritten) {
      obj[key].written++;
    } else {
      obj[key].mcq++;
    }
  };

  const incrementNested = (
    parentObj: Record<string, Record<string, QuestionCountItem>>,
    parentKey: string,
    childKey: string,
    isWritten: boolean
  ) => {
    if (!parentKey || !childKey) return;
    if (!parentObj[parentKey]) {
      parentObj[parentKey] = {};
    }
    if (!parentObj[parentKey][childKey]) {
      parentObj[parentKey][childKey] = { total: 0, mcq: 0, written: 0 };
    }
    parentObj[parentKey][childKey].total++;
    if (isWritten) {
      parentObj[parentKey][childKey].written++;
    } else {
      parentObj[parentKey][childKey].mcq++;
    }
  };

  // Helper to ingest a question row
  const processQuestion = (q: {
    subject_id?: string;
    chapter_id?: string;
    topic_id?: string;
    category?: string;
    tags?: any;
  }, isWritten: boolean) => {
    if (isWritten) totalWritten++;
    else totalMcq++;

    const categories = extractMatchedCategoryKeys(q.category, q.tags);
    const subAliases = extractSubjectAliases(q.subject_id);
    const chAliases = extractChapterAliases(q.chapter_id);
    const topicId = q.topic_id ? q.topic_id.trim() : null;

    // Overall Category Counts
    for (const cat of categories) {
      incrementItem(byCategory, cat, isWritten);
    }

    // Subject Counts & Subject+Category Counts
    for (const sub of subAliases) {
      incrementItem(bySubject, sub, isWritten);
      for (const cat of categories) {
        incrementNested(bySubjectAndCategory, sub, cat, isWritten);
      }
    }

    // Chapter Counts & Chapter+Category Counts
    for (const ch of chAliases) {
      incrementItem(byChapter, ch, isWritten);
      for (const cat of categories) {
        incrementNested(byChapterAndCategory, ch, cat, isWritten);
      }
    }

    // Topic Counts & Topic+Category Counts
    if (topicId) {
      incrementItem(byTopic, topicId, isWritten);
      for (const cat of categories) {
        incrementNested(byTopicAndCategory, topicId, cat, isWritten);
      }
    }
  };

  // 1. Process MCQ Questions
  let fetchedFromDb = false;
  if (isPgConnected) {
    try {
      const mcqRes = await query(
        'SELECT subject_id, chapter_id, topic_id, category, tags FROM questions WHERE is_active IS NULL OR is_active = TRUE'
      );
      if (mcqRes && Array.isArray(mcqRes.rows)) {
        for (const row of mcqRes.rows) {
          processQuestion(row, false);
        }
      }

      const wqRes = await query(
        'SELECT subject_id, chapter_id, topic_id, category, tags FROM written_questions WHERE is_active IS NULL OR is_active = TRUE'
      );
      if (wqRes && Array.isArray(wqRes.rows)) {
        for (const row of wqRes.rows) {
          processQuestion(row, true);
        }
      }

      fetchedFromDb = true;
    } catch (e) {
      console.warn('Error reading aggregated counts from PostgreSQL, falling back to memory store:', e);
    }
  }

  // 2. Memory Store Fallback
  if (!fetchedFromDb) {
    for (const q of memoryStore.questions.values()) {
      if ((q as any).is_active === undefined || (q as any).is_active === true) {
        processQuestion(q, false);
      }
    }
    for (const w of memoryStore.writtenQuestions.values()) {
      if ((w as any).is_active === undefined || (w as any).is_active === true) {
        processQuestion(w, true);
      }
    }
  }

  const result: QuestionCountsResponse = {
    totalQuestions: totalMcq + totalWritten,
    totalMcq,
    totalWritten,
    bySubject,
    byCategory,
    bySubjectAndCategory,
    byChapter,
    byChapterAndCategory,
    byTopic,
    byTopicAndCategory,
  };

  if (!filters?.subject_id && !filters?.category && !filters?.chapter_id) {
    cachedCounts = { timestamp: now, data: result };
  }

  return result;
}

