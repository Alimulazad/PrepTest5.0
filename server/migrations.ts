import pg from 'pg';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';

dotenv.config();

export interface Migration {
  id: string;
  name: string;
  up: (client: pg.PoolClient) => Promise<void>;
  down?: (client: pg.PoolClient) => Promise<void>;
}

export const migrations: Migration[] = [
  {
    id: '001_initial_schema',
    name: 'Create base tables (topics, questions, users, progress, chat, drafts, settings, snippets)',
    up: async (client: pg.PoolClient) => {
      await client.query(`
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
          exam_history TEXT DEFAULT '[]',
          bookmarks TEXT DEFAULT '[]',
          past_mistakes TEXT DEFAULT '[]',
          chapter_progress TEXT DEFAULT '{}',
          avatar_seed VARCHAR(100),
          avatar_bg_color VARCHAR(50),
          updated_at BIGINT
        );

        CREATE TABLE IF NOT EXISTS chat_history (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255),
          role VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          model_used VARCHAR(100),
          provider VARCHAR(50),
          created_at BIGINT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS admin_drafts (
          id VARCHAR(255) PRIMARY KEY,
          source VARCHAR(100) DEFAULT 'manual',
          chapter_id VARCHAR(255),
          subject VARCHAR(100),
          content TEXT NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          reviewed_by VARCHAR(255),
          reviewed_at BIGINT,
          created_at BIGINT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS admin_settings (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at BIGINT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS knowledge_snippets (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          content_bn TEXT NOT NULL,
          content_latex TEXT,
          answer_bn TEXT,
          subject_id VARCHAR(100),
          chapter_id VARCHAR(100),
          active INTEGER DEFAULT 1,
          created_at BIGINT
        );
      `);
    },
  },
  {
    id: '002_add_indexes_and_constraints',
    name: 'Add query performance indexes on questions and chat history',
    up: async (client: pg.PoolClient) => {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_questions_subject_chapter ON questions (subject_id, chapter_id);
        CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions (topic_id);
        CREATE INDEX IF NOT EXISTS idx_chat_user_created ON chat_history (user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_admin_drafts_status ON admin_drafts (status, created_at);
      `);
    },
  },
  {
    id: '003_add_active_users_tracking',
    name: 'Add last_active_at, last_ip, last_device, and current_page tracking to users table',
    up: async (client: pg.PoolClient) => {
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at BIGINT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_ip VARCHAR(100);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_device VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS current_page VARCHAR(100);
        CREATE INDEX IF NOT EXISTS idx_users_last_active ON users (last_active_at);
      `);
    },
  },
  {
    id: '004_create_written_questions_table',
    name: 'Create written_questions table for descriptive engineering and varsity questions',
    up: async (client: pg.PoolClient) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS written_questions (
          id VARCHAR(255) PRIMARY KEY,
          subject_id VARCHAR(50) NOT NULL,
          subject_name VARCHAR(100) NOT NULL,
          paper VARCHAR(10) NOT NULL,
          chapter_id VARCHAR(50) NOT NULL,
          chapter_name VARCHAR(150) NOT NULL,
          topic_id VARCHAR(50),
          topic_name VARCHAR(150),
          question_number INTEGER,
          question_text TEXT NOT NULL,
          question_image_url TEXT,
          explanation TEXT NOT NULL,
          explanation_latex TEXT,
          explanation_image_urls TEXT,
          tags TEXT NOT NULL DEFAULT '[]',
          category VARCHAR(30),
          difficulty VARCHAR(20) DEFAULT 'medium',
          star_rating SMALLINT DEFAULT 1,
          created_at BIGINT,
          updated_at BIGINT,
          is_active BOOLEAN DEFAULT TRUE
        );

        -- Ensure columns exist even if table was pre-existing
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS subject_id VARCHAR(50);
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS subject_name VARCHAR(100);
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS paper VARCHAR(10);
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS chapter_id VARCHAR(50);
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS chapter_name VARCHAR(150);
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS topic_id VARCHAR(50);
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS topic_name VARCHAR(150);
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS question_number INTEGER;
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS question_text TEXT;
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS question_image_url TEXT;
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS explanation TEXT;
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS explanation_latex TEXT;
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS explanation_image_urls TEXT;
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '[]';
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS category VARCHAR(30);
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'medium';
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS star_rating SMALLINT DEFAULT 1;
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS created_at BIGINT;
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS updated_at BIGINT;
        ALTER TABLE written_questions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

        CREATE INDEX IF NOT EXISTS idx_written_questions_subject_chapter ON written_questions (subject_id, chapter_id);
        CREATE INDEX IF NOT EXISTS idx_written_questions_topic ON written_questions (topic_id);
        CREATE INDEX IF NOT EXISTS idx_written_questions_is_active ON written_questions (is_active);
        CREATE INDEX IF NOT EXISTS idx_written_questions_created ON written_questions (created_at DESC);
      `);
    },
  },
  {
    id: '005_optimize_database_indexes',
    name: 'Add compound filter indexes and GIN tags index for fast cursor pagination and filtering',
    up: async (client: pg.PoolClient) => {
      await client.query(`
        -- Ensure is_active exists on questions table
        ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

        -- Create compound index for written questions filter
        CREATE INDEX IF NOT EXISTS idx_written_filter ON written_questions (subject_id, chapter_id, is_active);

        -- Create compound index for mcq questions filter
        CREATE INDEX IF NOT EXISTS idx_mcq_filter ON questions (subject_id, chapter_id, type, is_active);

        -- Install pg_trgm extension for GIN index on text/tags if available
        CREATE EXTENSION IF NOT EXISTS pg_trgm;

        -- Create GIN index on written_questions tags
        DO $$
        BEGIN
          BEGIN
            CREATE INDEX IF NOT EXISTS idx_written_tags ON written_questions USING GIN(tags gin_trgm_ops);
          EXCEPTION WHEN OTHERS THEN
            BEGIN
              CREATE INDEX IF NOT EXISTS idx_written_tags ON written_questions USING GIN(to_tsvector('simple', tags));
            EXCEPTION WHEN OTHERS THEN
              NULL;
            END;
          END;
        END $$;
      `);
    },
  },
  {
    id: '006_topics_relational_indices_and_stats',
    name: 'Add dynamic category count columns to topics and compound category indices',
    up: async (client: pg.PoolClient) => {
      await client.query(`
        -- Add dynamic category count columns to topics table
        ALTER TABLE topics ADD COLUMN IF NOT EXISTS varsity_a_count INTEGER DEFAULT 0;
        ALTER TABLE topics ADD COLUMN IF NOT EXISTS medical_count INTEGER DEFAULT 0;
        ALTER TABLE topics ADD COLUMN IF NOT EXISTS engineering_count INTEGER DEFAULT 0;
        ALTER TABLE topics ADD COLUMN IF NOT EXISTS academic_count INTEGER DEFAULT 0;
        ALTER TABLE topics ADD COLUMN IF NOT EXISTS main_book_count INTEGER DEFAULT 0;

        -- Create indices for ultra-fast relational filtering on questions
        CREATE INDEX IF NOT EXISTS idx_questions_category ON questions (category);
        CREATE INDEX IF NOT EXISTS idx_questions_topic_category ON questions (topic_id, category);
        CREATE INDEX IF NOT EXISTS idx_questions_chapter_topic ON questions (chapter_id, topic_id);

        -- Create indices for written questions
        CREATE INDEX IF NOT EXISTS idx_written_category ON written_questions (category);
        CREATE INDEX IF NOT EXISTS idx_written_topic_category ON written_questions (topic_id, category);
        CREATE INDEX IF NOT EXISTS idx_written_chapter_topic ON written_questions (chapter_id, topic_id);
      `);
    },
  },
  {
    id: '007_relational_hierarchy_and_performance_indices',
    name: 'Create subjects, chapters tables and add compound indices for standardized ID filtering',
    up: async (client: pg.PoolClient) => {
      await client.query(`
        -- 1. Create subjects table
        CREATE TABLE IF NOT EXISTS subjects (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          bangla_name VARCHAR(100) NOT NULL,
          paper VARCHAR(10) NOT NULL,
          short_code VARCHAR(20),
          icon_name VARCHAR(50),
          order_index SMALLINT DEFAULT 0,
          created_at BIGINT
        );

        -- Ensure all subject columns exist in case table was pre-created
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS name VARCHAR(100);
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS bangla_name VARCHAR(100);
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS paper VARCHAR(10);
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS short_code VARCHAR(20);
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS icon_name VARCHAR(50);
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS order_index SMALLINT DEFAULT 0;
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS created_at BIGINT;

        -- 2. Create chapters table
        CREATE TABLE IF NOT EXISTS chapters (
          id VARCHAR(50) PRIMARY KEY,
          subject_id VARCHAR(50) NOT NULL,
          chapter_number SMALLINT,
          name VARCHAR(150) NOT NULL,
          bangla_name VARCHAR(150) NOT NULL,
          paper VARCHAR(10),
          total_topics INTEGER DEFAULT 0,
          created_at BIGINT
        );

        -- Ensure all chapter columns exist in case table was pre-created
        ALTER TABLE chapters ADD COLUMN IF NOT EXISTS subject_id VARCHAR(50);
        ALTER TABLE chapters ADD COLUMN IF NOT EXISTS chapter_number SMALLINT;
        ALTER TABLE chapters ADD COLUMN IF NOT EXISTS name VARCHAR(150);
        ALTER TABLE chapters ADD COLUMN IF NOT EXISTS bangla_name VARCHAR(150);
        ALTER TABLE chapters ADD COLUMN IF NOT EXISTS paper VARCHAR(10);
        ALTER TABLE chapters ADD COLUMN IF NOT EXISTS total_topics INTEGER DEFAULT 0;
        ALTER TABLE chapters ADD COLUMN IF NOT EXISTS created_at BIGINT;

        CREATE INDEX IF NOT EXISTS idx_chapters_subject ON chapters(subject_id);

        -- 3. Add compound indices for ultra-fast multi-dimensional filtering
        CREATE INDEX IF NOT EXISTS idx_questions_topic_cat ON questions (topic_id, category);
        CREATE INDEX IF NOT EXISTS idx_written_topic_cat ON written_questions (topic_id, category);

        CREATE INDEX IF NOT EXISTS idx_questions_ch_cat ON questions (chapter_id, category);
        CREATE INDEX IF NOT EXISTS idx_written_ch_cat ON written_questions (chapter_id, category);

        CREATE INDEX IF NOT EXISTS idx_questions_hierarchy ON questions (subject_id, chapter_id, topic_id, category);
        CREATE INDEX IF NOT EXISTS idx_written_hierarchy ON written_questions (subject_id, chapter_id, topic_id, category);

        -- 4. Seed Canonical Subjects
        INSERT INTO subjects (id, name, bangla_name, paper, short_code, icon_name, order_index, created_at)
        VALUES
          ('physics_1', 'Physics 1st Paper', 'পদার্থবিজ্ঞান ১ম পত্র', '1st', 'PHY-1', 'Atom', 1, EXTRACT(EPOCH FROM NOW()) * 1000),
          ('physics_2', 'Physics 2nd Paper', 'পদার্থবিজ্ঞান ২য় পত্র', '2nd', 'PHY-2', 'Zap', 2, EXTRACT(EPOCH FROM NOW()) * 1000),
          ('chemistry_1', 'Chemistry 1st Paper', 'রসায়ন ১ম পত্র', '1st', 'CHEM-1', 'FlaskConical', 3, EXTRACT(EPOCH FROM NOW()) * 1000),
          ('chemistry_2', 'Chemistry 2nd Paper', 'রসায়ন ২য় পত্র', '2nd', 'CHEM-2', 'TestTube2', 4, EXTRACT(EPOCH FROM NOW()) * 1000),
          ('math_1', 'Higher Math 1st Paper', 'উচ্চতর গণিত ১ম পত্র', '1st', 'MATH-1', 'Calculator', 5, EXTRACT(EPOCH FROM NOW()) * 1000),
          ('math_2', 'Higher Math 2nd Paper', 'উচ্চতর গণিত ২য় পত্র', '2nd', 'MATH-2', 'Sigma', 6, EXTRACT(EPOCH FROM NOW()) * 1000),
          ('biology_1', 'Biology 1st Paper', 'জীববিজ্ঞান ১ম পত্র', '1st', 'BIO-1', 'Dna', 7, EXTRACT(EPOCH FROM NOW()) * 1000),
          ('biology_2', 'Biology 2nd Paper', 'জীববিজ্ঞান ২য় পত্র', '2nd', 'BIO-2', 'Bug', 8, EXTRACT(EPOCH FROM NOW()) * 1000)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          bangla_name = EXCLUDED.bangla_name,
          paper = EXCLUDED.paper,
          short_code = EXCLUDED.short_code,
          icon_name = EXCLUDED.icon_name,
          order_index = EXCLUDED.order_index;
      `);
    },
  },
  {
    id: '008_taxonomy_hardening',
    name: 'Taxonomy hardening: Data cleaning, deduplication, safe UNIQUE constraints, FKs, and health views',
    up: async (client: pg.PoolClient) => {
      logger.info('[Migration 008] Starting taxonomy hardening and data cleaning...');

      // 1. Data Cleaning & Unicode Normalization
      // Strips zero-width characters (ZWJ, ZWNJ, BOM) and trims redundant whitespace
      await client.query(`
        -- Clean subjects
        UPDATE subjects
        SET 
          bangla_name = TRIM(regexp_replace(regexp_replace(bangla_name, '[\\u200B-\\u200D\\uFEFF]', '', 'g'), '\\s+', ' ', 'g')),
          name = TRIM(regexp_replace(name, '\\s+', ' ', 'g'))
        WHERE bangla_name IS NOT NULL;

        -- Clean chapters
        UPDATE chapters
        SET 
          bangla_name = TRIM(regexp_replace(regexp_replace(bangla_name, '[\\u200B-\\u200D\\uFEFF]', '', 'g'), '\\s+', ' ', 'g')),
          name = TRIM(regexp_replace(name, '\\s+', ' ', 'g'))
        WHERE bangla_name IS NOT NULL;

        -- Clean topics
        UPDATE topics
        SET 
          bangla_name = TRIM(regexp_replace(regexp_replace(bangla_name, '[\\u200B-\\u200D\\uFEFF]', '', 'g'), '\\s+', ' ', 'g')),
          name = TRIM(regexp_replace(name, '\\s+', ' ', 'g'))
        WHERE bangla_name IS NOT NULL;
      `);

      // 2. Ensure parent references exist before applying FK constraints
      // A. Populate missing subject_id in topics if chapter exists
      await client.query(`
        UPDATE topics t
        SET subject_id = c.subject_id
        FROM chapters c
        WHERE t.chapter_id = c.id AND (t.subject_id IS NULL OR t.subject_id = '');
      `);

      // B. Create placeholder chapters/subjects for orphan topics if any exist
      await client.query(`
        -- Insert fallback subject if not present
        INSERT INTO subjects (id, name, bangla_name, paper, created_at)
        VALUES ('physics_1', 'Physics 1st Paper', 'পদার্থবিজ্ঞান ১ম পত্র', '1st', EXTRACT(EPOCH FROM NOW()) * 1000)
        ON CONFLICT (id) DO NOTHING;

        -- Insert missing subjects referenced by chapters
        INSERT INTO subjects (id, name, bangla_name, paper, created_at)
        SELECT DISTINCT c.subject_id, c.subject_id, c.subject_id, '1st', EXTRACT(EPOCH FROM NOW()) * 1000
        FROM chapters c
        LEFT JOIN subjects s ON c.subject_id = s.id
        WHERE s.id IS NULL AND c.subject_id IS NOT NULL AND c.subject_id <> ''
        ON CONFLICT (id) DO NOTHING;

        -- Insert missing subjects referenced directly by topics
        INSERT INTO subjects (id, name, bangla_name, paper, created_at)
        SELECT DISTINCT t.subject_id, t.subject_id, t.subject_id, '1st', EXTRACT(EPOCH FROM NOW()) * 1000
        FROM topics t
        LEFT JOIN subjects s ON t.subject_id = s.id
        WHERE s.id IS NULL AND t.subject_id IS NOT NULL AND t.subject_id <> ''
        ON CONFLICT (id) DO NOTHING;

        -- Insert missing chapters referenced by topics (with chapter_no = 0, paper = '1st', and guaranteed subject_id)
        INSERT INTO chapters (id, subject_id, chapter_no, name, bangla_name, paper, created_at)
        SELECT DISTINCT t.chapter_id, COALESCE(NULLIF(t.subject_id, ''), 'physics_1'), 0, t.chapter_id, t.chapter_id, '1st', EXTRACT(EPOCH FROM NOW()) * 1000
        FROM topics t
        LEFT JOIN chapters c ON t.chapter_id = c.id
        WHERE c.id IS NULL AND t.chapter_id IS NOT NULL AND t.chapter_id <> ''
        ON CONFLICT (id) DO NOTHING;
      `);

      // 3. Deduplicate Topics under same (chapter_id, bangla_name)
      // Find duplicates, re-point questions & written_questions to the surviving topic ID, then remove duplicates
      const dedupResult = await client.query(`
        WITH topic_groups AS (
          SELECT 
            id,
            chapter_id,
            bangla_name,
            total_questions,
            created_at,
            ROW_NUMBER() OVER (
              PARTITION BY chapter_id, bangla_name 
              ORDER BY COALESCE(total_questions, 0) DESC, created_at ASC, id ASC
            ) as row_num,
            FIRST_VALUE(id) OVER (
              PARTITION BY chapter_id, bangla_name 
              ORDER BY COALESCE(total_questions, 0) DESC, created_at ASC, id ASC
            ) as survivor_id
          FROM topics
        ),
        duplicates AS (
          SELECT id as duplicate_id, survivor_id
          FROM topic_groups
          WHERE row_num > 1
        )
        SELECT duplicate_id, survivor_id FROM duplicates;
      `);

      if (dedupResult.rows.length > 0) {
        logger.info(`[Migration 008] Found ${dedupResult.rows.length} duplicate topics. Merging & re-pointing questions...`);

        // Re-point MCQ questions
        const mcqUpdateRes = await client.query(`
          WITH topic_groups AS (
            SELECT 
              id,
              chapter_id,
              bangla_name,
              ROW_NUMBER() OVER (
                PARTITION BY chapter_id, bangla_name 
                ORDER BY COALESCE(total_questions, 0) DESC, created_at ASC, id ASC
              ) as row_num,
              FIRST_VALUE(id) OVER (
                PARTITION BY chapter_id, bangla_name 
                ORDER BY COALESCE(total_questions, 0) DESC, created_at ASC, id ASC
              ) as survivor_id
            FROM topics
          ),
          duplicates AS (
            SELECT id as duplicate_id, survivor_id
            FROM topic_groups
            WHERE row_num > 1
          )
          UPDATE questions q
          SET topic_id = d.survivor_id
          FROM duplicates d
          WHERE q.topic_id = d.duplicate_id;
        `);

        // Re-point Written questions
        const writtenUpdateRes = await client.query(`
          WITH topic_groups AS (
            SELECT 
              id,
              chapter_id,
              bangla_name,
              ROW_NUMBER() OVER (
                PARTITION BY chapter_id, bangla_name 
                ORDER BY COALESCE(total_questions, 0) DESC, created_at ASC, id ASC
              ) as row_num,
              FIRST_VALUE(id) OVER (
                PARTITION BY chapter_id, bangla_name 
                ORDER BY COALESCE(total_questions, 0) DESC, created_at ASC, id ASC
              ) as survivor_id
            FROM topics
          ),
          duplicates AS (
            SELECT id as duplicate_id, survivor_id
            FROM topic_groups
            WHERE row_num > 1
          )
          UPDATE written_questions w
          SET topic_id = d.survivor_id
          FROM duplicates d
          WHERE w.topic_id = d.duplicate_id;
        `);

        // Delete the duplicate topics
        const deleteDupesRes = await client.query(`
          WITH topic_groups AS (
            SELECT 
              id,
              ROW_NUMBER() OVER (
                PARTITION BY chapter_id, bangla_name 
                ORDER BY COALESCE(total_questions, 0) DESC, created_at ASC, id ASC
              ) as row_num
            FROM topics
          )
          DELETE FROM topics
          WHERE id IN (
            SELECT id FROM topic_groups WHERE row_num > 1
          );
        `);

        logger.info(
          `[Migration 008] Cleaned ${deleteDupesRes.rowCount} duplicate topics. Re-pointed ${mcqUpdateRes.rowCount} MCQs and ${writtenUpdateRes.rowCount} Written questions.`
        );
      }

      // Deduplicate Chapters under same (subject_id, bangla_name)
      // Check duplicate chapters and use single CTE pattern for mapping updates and safe deletion
      const dupChaptersCheck = await client.query(`
        WITH chapter_groups AS (
          SELECT 
            id,
            subject_id,
            bangla_name,
            ROW_NUMBER() OVER (
              PARTITION BY subject_id, bangla_name 
              ORDER BY created_at ASC, COALESCE(total_topics, 0) DESC, id ASC
            ) as row_num,
            FIRST_VALUE(id) OVER (
              PARTITION BY subject_id, bangla_name 
              ORDER BY created_at ASC, COALESCE(total_topics, 0) DESC, id ASC
            ) as survivor_id
          FROM chapters
        ),
        dup_chapters AS (
          SELECT id as duplicate_id, survivor_id
          FROM chapter_groups
          WHERE row_num > 1
        )
        SELECT duplicate_id, survivor_id FROM dup_chapters;
      `);

      if (dupChaptersCheck.rows.length > 0) {
        logger.info(`[Migration 008] Found ${dupChaptersCheck.rows.length} duplicate chapters. Merging references & re-pointing topics & questions...`);

        // Update topics pointing to duplicate chapters
        const updateTopicsChapRes = await client.query(`
          WITH chapter_groups AS (
            SELECT 
              id,
              subject_id,
              bangla_name,
              ROW_NUMBER() OVER (
                PARTITION BY subject_id, bangla_name 
                ORDER BY created_at ASC, COALESCE(total_topics, 0) DESC, id ASC
              ) as row_num,
              FIRST_VALUE(id) OVER (
                PARTITION BY subject_id, bangla_name 
                ORDER BY created_at ASC, COALESCE(total_topics, 0) DESC, id ASC
              ) as survivor_id
            FROM chapters
          ),
          dup_chapters AS (
            SELECT id as duplicate_id, survivor_id
            FROM chapter_groups
            WHERE row_num > 1
          )
          UPDATE topics t
          SET chapter_id = d.survivor_id
          FROM dup_chapters d
          WHERE t.chapter_id = d.duplicate_id;
        `);

        // Update questions pointing directly to duplicate chapters
        const updateQuestionsChapRes = await client.query(`
          WITH chapter_groups AS (
            SELECT 
              id,
              subject_id,
              bangla_name,
              ROW_NUMBER() OVER (
                PARTITION BY subject_id, bangla_name 
                ORDER BY created_at ASC, COALESCE(total_topics, 0) DESC, id ASC
              ) as row_num,
              FIRST_VALUE(id) OVER (
                PARTITION BY subject_id, bangla_name 
                ORDER BY created_at ASC, COALESCE(total_topics, 0) DESC, id ASC
              ) as survivor_id
            FROM chapters
          ),
          dup_chapters AS (
            SELECT id as duplicate_id, survivor_id
            FROM chapter_groups
            WHERE row_num > 1
          )
          UPDATE questions q
          SET chapter_id = d.survivor_id
          FROM dup_chapters d
          WHERE q.chapter_id = d.duplicate_id;
        `);

        // Update written questions pointing directly to duplicate chapters
        const updateWrittenChapRes = await client.query(`
          WITH chapter_groups AS (
            SELECT 
              id,
              subject_id,
              bangla_name,
              ROW_NUMBER() OVER (
                PARTITION BY subject_id, bangla_name 
                ORDER BY created_at ASC, COALESCE(total_topics, 0) DESC, id ASC
              ) as row_num,
              FIRST_VALUE(id) OVER (
                PARTITION BY subject_id, bangla_name 
                ORDER BY created_at ASC, COALESCE(total_topics, 0) DESC, id ASC
              ) as survivor_id
            FROM chapters
          ),
          dup_chapters AS (
            SELECT id as duplicate_id, survivor_id
            FROM chapter_groups
            WHERE row_num > 1
          )
          UPDATE written_questions w
          SET chapter_id = d.survivor_id
          FROM dup_chapters d
          WHERE w.chapter_id = d.duplicate_id;
        `);

        // Delete duplicate chapters safely
        const deleteDupChaptersRes = await client.query(`
          WITH chapter_groups AS (
            SELECT 
              id,
              ROW_NUMBER() OVER (
                PARTITION BY subject_id, bangla_name 
                ORDER BY created_at ASC, COALESCE(total_topics, 0) DESC, id ASC
              ) as row_num
            FROM chapters
          )
          DELETE FROM chapters
          WHERE id IN (SELECT id FROM chapter_groups WHERE row_num > 1);
        `);

        logger.info(
          `[Migration 008] Cleaned ${deleteDupChaptersRes.rowCount} duplicate chapters. Re-pointed ${updateTopicsChapRes.rowCount} topics, ${updateQuestionsChapRes.rowCount} MCQs, and ${updateWrittenChapRes.rowCount} Written questions.`
        );
      }

      // Deduplicate Subjects under same (bangla_name, paper) if any exist before applying UNIQUE constraint
      const dupSubjectsCheck = await client.query(`
        WITH subject_groups AS (
          SELECT 
            id,
            bangla_name,
            COALESCE(paper, '1st') as paper,
            ROW_NUMBER() OVER (
              PARTITION BY bangla_name, COALESCE(paper, '1st')
              ORDER BY created_at ASC, id ASC
            ) as row_num,
            FIRST_VALUE(id) OVER (
              PARTITION BY bangla_name, COALESCE(paper, '1st')
              ORDER BY created_at ASC, id ASC
            ) as survivor_id
          FROM subjects
        ),
        dup_subjects AS (
          SELECT id as duplicate_id, survivor_id
          FROM subject_groups
          WHERE row_num > 1
        )
        SELECT duplicate_id, survivor_id FROM dup_subjects;
      `);

      if (dupSubjectsCheck.rows.length > 0) {
        logger.warn(`[Migration 008] Found ${dupSubjectsCheck.rows.length} duplicate subjects. Merging references & re-pointing chapters/topics...`);

        await client.query(`
          WITH subject_groups AS (
            SELECT 
              id,
              bangla_name,
              COALESCE(paper, '1st') as paper,
              ROW_NUMBER() OVER (
                PARTITION BY bangla_name, COALESCE(paper, '1st')
                ORDER BY created_at ASC, id ASC
              ) as row_num,
              FIRST_VALUE(id) OVER (
                PARTITION BY bangla_name, COALESCE(paper, '1st')
                ORDER BY created_at ASC, id ASC
              ) as survivor_id
            FROM subjects
          ),
          dup_subjects AS (
            SELECT id as duplicate_id, survivor_id
            FROM subject_groups
            WHERE row_num > 1
          )
          UPDATE chapters c
          SET subject_id = d.survivor_id
          FROM dup_subjects d
          WHERE c.subject_id = d.duplicate_id;

          WITH subject_groups AS (
            SELECT 
              id,
              bangla_name,
              COALESCE(paper, '1st') as paper,
              ROW_NUMBER() OVER (
                PARTITION BY bangla_name, COALESCE(paper, '1st')
                ORDER BY created_at ASC, id ASC
              ) as row_num,
              FIRST_VALUE(id) OVER (
                PARTITION BY bangla_name, COALESCE(paper, '1st')
                ORDER BY created_at ASC, id ASC
              ) as survivor_id
            FROM subjects
          ),
          dup_subjects AS (
            SELECT id as duplicate_id, survivor_id
            FROM subject_groups
            WHERE row_num > 1
          )
          UPDATE topics t
          SET subject_id = d.survivor_id
          FROM dup_subjects d
          WHERE t.subject_id = d.duplicate_id;

          WITH subject_groups AS (
            SELECT 
              id,
              ROW_NUMBER() OVER (
                PARTITION BY bangla_name, COALESCE(paper, '1st')
                ORDER BY created_at ASC, id ASC
              ) as row_num
            FROM subjects
          )
          DELETE FROM subjects
          WHERE id IN (SELECT id FROM subject_groups WHERE row_num > 1);
        `);
      }

      // 4. Safe UNIQUE Constraints
      await client.query(`
        DO $$
        BEGIN
          -- Unique subject bangla_name + paper
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'uq_subjects_bangla_paper'
          ) THEN
            ALTER TABLE subjects ADD CONSTRAINT uq_subjects_bangla_paper UNIQUE (bangla_name, paper);
          END IF;

          -- Unique chapter under subject
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'uq_chapters_subject_bangla'
          ) THEN
            ALTER TABLE chapters ADD CONSTRAINT uq_chapters_subject_bangla UNIQUE (subject_id, bangla_name);
          END IF;

          -- Unique topic under chapter
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'uq_topics_chapter_bangla'
          ) THEN
            ALTER TABLE topics ADD CONSTRAINT uq_topics_chapter_bangla UNIQUE (chapter_id, bangla_name);
          END IF;
        END $$;
      `);

      // 5. Safe Foreign Keys (NOT VALID first, then VALIDATE)
      await client.query(`
        DO $$
        BEGIN
          -- FK: chapters.subject_id -> subjects(id)
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_chapters_subject_id'
          ) THEN
            ALTER TABLE chapters 
            ADD CONSTRAINT fk_chapters_subject_id 
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE NOT VALID;
          END IF;

          -- FK: topics.chapter_id -> chapters(id)
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_topics_chapter_id'
          ) THEN
            ALTER TABLE topics 
            ADD CONSTRAINT fk_topics_chapter_id 
            FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE NOT VALID;
          END IF;

          -- FK: topics.subject_id -> subjects(id)
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_topics_subject_id'
          ) THEN
            ALTER TABLE topics 
            ADD CONSTRAINT fk_topics_subject_id 
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL NOT VALID;
          END IF;
        END $$;

        -- Validate newly added foreign keys
        ALTER TABLE chapters VALIDATE CONSTRAINT fk_chapters_subject_id;
        ALTER TABLE topics VALIDATE CONSTRAINT fk_topics_chapter_id;
        ALTER TABLE topics VALIDATE CONSTRAINT fk_topics_subject_id;
      `);

      // 6. Taxonomy Health Diagnostics Views
      await client.query(`
        -- View A: Duplicate Suspect Topics
        CREATE OR REPLACE VIEW duplicate_suspect_topics AS
        SELECT 
          chapter_id,
          bangla_name,
          COUNT(*) AS duplicate_count,
          ARRAY_AGG(id) AS topic_ids,
          SUM(total_questions) AS combined_questions
        FROM topics
        GROUP BY chapter_id, bangla_name
        HAVING COUNT(*) > 1;

        -- View B: Zero Question Topics
        CREATE OR REPLACE VIEW zero_question_topics AS
        SELECT 
          t.id,
          t.subject_id,
          t.chapter_id,
          t.bangla_name,
          t.name,
          t.created_at
        FROM topics t
        LEFT JOIN questions q ON q.topic_id = t.id
        LEFT JOIN written_questions w ON w.topic_id = t.id
        WHERE q.id IS NULL AND w.id IS NULL AND (t.total_questions = 0 OR t.total_questions IS NULL);

        -- View C: Orphan Topic IDs in Questions
        CREATE OR REPLACE VIEW orphan_topic_ids AS
        SELECT 
          'mcq' AS question_type,
          q.id AS question_id,
          q.subject_id,
          q.chapter_id,
          q.topic_id,
          q.topic_name,
          q.question_text
        FROM questions q
        LEFT JOIN topics t ON q.topic_id = t.id
        WHERE q.topic_id IS NOT NULL AND t.id IS NULL
        UNION ALL
        SELECT 
          'written' AS question_type,
          w.id AS question_id,
          w.subject_id,
          w.chapter_id,
          w.topic_id,
          w.topic_name,
          w.question_text
        FROM written_questions w
        LEFT JOIN topics t ON w.topic_id = t.id
        WHERE w.topic_id IS NOT NULL AND t.id IS NULL;
      `);

      logger.info('[Migration 008] ✅ Taxonomy hardening migration completed successfully.');
    },
    down: async (client: pg.PoolClient) => {
      logger.info('[Migration 008] Rolling back taxonomy hardening migration...');
      await client.query(`
        -- Drop health views
        DROP VIEW IF EXISTS orphan_topic_ids;
        DROP VIEW IF EXISTS zero_question_topics;
        DROP VIEW IF EXISTS duplicate_suspect_topics;

        -- Drop foreign keys
        ALTER TABLE topics DROP CONSTRAINT IF EXISTS fk_topics_subject_id;
        ALTER TABLE topics DROP CONSTRAINT IF EXISTS fk_topics_chapter_id;
        ALTER TABLE chapters DROP CONSTRAINT IF EXISTS fk_chapters_subject_id;

        -- Drop unique constraints
        ALTER TABLE topics DROP CONSTRAINT IF EXISTS uq_topics_chapter_bangla;
        ALTER TABLE chapters DROP CONSTRAINT IF EXISTS uq_chapters_subject_bangla;
        ALTER TABLE subjects DROP CONSTRAINT IF EXISTS uq_subjects_bangla_paper;
      `);
      logger.info('[Migration 008] Rollback completed.');
    },
  },
  {
    id: '009_taxonomy_audit_logs',
    name: 'Create taxonomy audit logs table and tracking indexes',
    up: async (client: pg.PoolClient) => {
      logger.info('[Migration 009] Creating taxonomy_audit_logs table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS taxonomy_audit_logs (
          id VARCHAR(255) PRIMARY KEY,
          action VARCHAR(50) NOT NULL,
          entity_type VARCHAR(50) NOT NULL DEFAULT 'topic',
          entity_id VARCHAR(255) NOT NULL,
          details JSONB NOT NULL DEFAULT '{}'::jsonb,
          performed_by VARCHAR(255) DEFAULT 'admin',
          created_at BIGINT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_taxonomy_audit_action ON taxonomy_audit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_taxonomy_audit_entity ON taxonomy_audit_logs(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_taxonomy_audit_created ON taxonomy_audit_logs(created_at DESC);
      `);
      logger.info('[Migration 009] ✅ taxonomy_audit_logs table created successfully.');
    },
    down: async (client: pg.PoolClient) => {
      logger.info('[Migration 009] Rolling back taxonomy_audit_logs table...');
      await client.query(`DROP TABLE IF EXISTS taxonomy_audit_logs CASCADE;`);
    },
  },
];

export async function runMigrations(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    // Create migrations tracker table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Get executed migrations
    const res = await client.query(`SELECT id FROM _migrations`);
    const executedIds = new Set(res.rows.map((r) => r.id));

    for (const migration of migrations) {
      if (!executedIds.has(migration.id)) {
        logger.info(`[Database Migrations] 🚀 Running migration ${migration.id}: ${migration.name}`);
        await client.query('BEGIN');
        try {
          await migration.up(client);
          await client.query(`INSERT INTO _migrations (id, name) VALUES ($1, $2)`, [
            migration.id,
            migration.name,
          ]);
          await client.query('COMMIT');
          logger.info(`[Database Migrations] ✅ Migration ${migration.id} applied successfully.`);
        } catch (err: any) {
          await client.query('ROLLBACK');
          logger.error(`[Database Migrations] ❌ Migration ${migration.id} failed: ${err.message}`);
          throw err;
        }
      }
    }
  } finally {
    client.release();
  }
}
