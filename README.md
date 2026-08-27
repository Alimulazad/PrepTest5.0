<div align="center">

# 🇧🇩 JACHAI (যাচাই) — University Admission Prep Platform
**A Production-Grade, Bengali-First Admission Preparation Ecosystem with AI Intelligence**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![Vitest](https://img.shields.io/badge/Tested_with-Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)

---

</div>

## 📌 1. System Architecture & Monorepo Design

**JACHAI (যাচাই)** is structured as a modular full-stack monorepo separating student-facing portals, administrative management, and shared backend core services:

```
jachai/
├── apps/
│   ├── web/               # Public student-facing portal (React 19, Tailwind CSS, Vite)
│   ├── admin/             # Dedicated administrator dashboard & CMS (React 19, Vite)
│   └── api/               # Express backend service, authentication, and AI proxy
├── src/
│   ├── components/        # Student & Admin UI components (CascadingTaxonomyPicker, AdminTaxonomyHealthTab)
│   ├── services/          # Frontend API integration & Taxonomy Services
│   └── utils/             # Centralized Question Filter Engine (questionFilter.ts) & LaTeX renderers
├── server/                # Server core modules, database connectors, and migrations
│   ├── db.ts              # PostgreSQL driver with pool connection & transaction handling
│   ├── migrations.ts      # Versioned migration engine (_migrations table tracker, Migrations 001-009)
│   ├── validation/        # Zod input & bulk import validation schemas
│   └── utils/             # Pino structured logger and Cloudinary upload pipelines
├── packages/
│   └── shared/            # Shared TypeScript types, schemas, and taxonomy resolvers (resolve.ts)
├── Dockerfile             # Multi-stage production container build
├── docker-compose.yml     # Full-stack container orchestration (Postgres 16 + JACHAI)
├── DataInstruction.txt    # Database entry manual, JSON/CSV/Excel specs, & system manual
└── README.md              # Monorepo architecture and system documentation
```

---

## 🎯 2. Core Systems & Technical Specifications

### 🖥️ Frontend System (React 19 + Tailwind CSS + Vite)
- **Student Learning Engine**: High-contrast Bengali UI, KaTeX/LaTeX mathematical equation rendering, TikZ vector diagram support, real-time mock exams with negative marking (0.25 penalty), and AI photo-solver.
- **Admin Taxonomy Health Portal**: 5 dedicated sub-tabs:
  1. *Duplicate Suspects*: Single-CTE grouping & safe transactional merging into survivor topic.
  2. *Zero-Question Topics*: Diagnostic view & 1-click batch cleanup.
  3. *Orphan Questions*: Detached question identification & re-assignment to valid topics.
  4. *Live Master ID Chart*: Exportable live text/markdown hierarchy (`Subject ➔ Chapter ➔ Topic`).
  5. *Taxonomy Audit Log*: Live transactional timeline of all taxonomy modifications (`taxonomy_audit_logs`).
- **Cascading Taxonomy Selector (`CascadingTaxonomyPicker`)**: 4-level cascading picker (`Subject` ➔ `Paper` ➔ `Chapter` ➔ `Topic`) with live search, chapter filtering, and inline topic creation (`+ নতুন টপিক তৈরি করুন`).

### ⚙️ Backend System (Express 4.21 + PostgreSQL 16 + Zod)
- **REST & Router Layer**: Clean API contracts for questions, topics, taxonomy health, master chart exports, and AI integrations.
- **Authentication & Security**: JWT authentication with `{ role: 'admin' }` claims, `express-rate-limit`, `helmet` security headers, and anti-spoofing user context extraction from tokens.
- **Structured Logging**: Pino structured logger tracking migration statuses, query execution times, and operational warnings.

### 📥 Smart Data Import System 3.0
- **3-Phase Lifecycle**: `Parse` (CSV/Excel/JSON) ➔ `Resolve / Multi-Tier Preview` ➔ `Transactional Commit`.
- **Taxonomy Referential Consistency Engine (`server/validation/taxonomyConsistency.ts`)**: Enforces 3-level hierarchical validation (`Subject ➔ Chapter ➔ Topic`). Verifies that `subject_id` exists, `chapter.subject_id === row.subject_id`, and `topic.chapter_id === row.chapter_id`.
- **Hard & Soft Mismatch Resolution**:
  - *Hard Mismatch*: Invalid or missing `subject_id` or `chapter_id` flags row as invalid/missing taxonomy requiring parent assignment.
  - *Soft Mismatch (Topic-Chapter Mismatch)*: If a valid `topic_id` belongs to a different chapter than `row.chapter_id`, the engine silently drops the mismatched ID, attempts re-resolution using `topic_name` under `row.chapter_id`, or sets `topic_id: null` ("Needs Topic") so valid questions are never rejected.
- **Pre-Flight Preview Table & Warning Badge Integrity**: Displays explicit `⚠️ Topic-Chapter Mismatch` warnings with exact parent chapter notes and fixes the preview bug by flagging unassigned topic rows with `status: 'warning'` ("⚠️ Needs Topic") rather than falsely marking them as valid.
- **Unicode & Whitespace Normalization**: Strips zero-width characters (`ZWJ`, `ZWNJ`, `BOM`) and normalizes Bangla glyphs via `packages/shared/src/taxonomy/resolve.ts`.
- **Pre-Flight Warning Engine**: Highlights missing/unassigned taxonomy rows in the preview header with dedicated filter buttons (`Missing Taxonomy`).
- **Instant Custom Topic Persistence**: Inline creation of custom topics directly saves to PostgreSQL `topics` table and records entry in `taxonomy_audit_logs`.
- **Transactional Upsert**: Uses `ON CONFLICT (id) DO UPDATE` for safe idempotent re-imports and recalculates `total_questions`, `mcq_count`, and `written_count` inside the same transaction.

### 🔍 4-Layer Filtering System
1. **Layer 1 (Database Indexing)**: Relational foreign keys and compound indices `(topic_id, category)`, `(chapter_id, topic_id)` on `questions` and `written_questions`.
2. **Layer 2 (Smart Import Auto-Resolver)**: Automatically resolves topic names to canonical `topic_id`s or preserves custom IDs.
3. **Layer 3 (Dynamic Recount Engine)**: Live aggregation queries via `/api/questions/counts` and `/api/topics/stats` ensuring accurate counts across UI chips without hardcoded values.
4. **Layer 4 (Centralized Pre-Query Filter Engine - `src/utils/questionFilter.ts`)**: Pre-query transformer supporting alias resolution (`physics_1`, `phy1`, `phy_p1_c2`), converting user filters into canonical database keys before hitting PostgreSQL.

### 🔄 Migration & Auto-Healing System (`server/migrations.ts`)
- **Versioned Migration Runner**: Runs on startup, executing pending migrations atomically and tracking them in `_migrations`.
- **Migration 008 (Taxonomy Hardening & FK Safety)**:
  - Cleans whitespace and decomposed Unicode characters across `subjects`, `chapters`, and `topics`.
  - Ensures parent references exist: auto-creates missing subjects (including fallback `physics_1`) and missing orphan chapters with required `chapter_no = 0` and default `paper = '1st'` to guarantee `NOT NULL` and FK constraint (`chapters_subject_id_fkey`) compliance.
  - Performs single-CTE deduplication for duplicate topics and duplicate chapters, re-pointing questions to survivor IDs.
  - Establishes diagnostic health views: `duplicate_suspect_topics`, `zero_question_topics`, `orphan_topic_ids`.
- **Migration 009 (Taxonomy Audit Logs)**: Creates `taxonomy_audit_logs` table (`id`, `action`, `entity_type`, `entity_id`, `details`, `performed_by`, `created_at`) with index on `created_at`.

### ✅ Data Validation System
- **Zod Schemas (`server/validation/`)**: Strict validation for questions, options (`A`, `B`, `C`, `D`), correct answers, tags, ratings (`1-3`), and categories (`varsity_a`, `engineering`, `medical`, `academic`, `main_book`).
- **LaTeX / KaTeX Integrity Checks**: Validates math equation delimiters (`$...$`, `$$...$$`) and JSON backslash escaping rules (`\\`).

---

## 🎨 3. UI/UX & Design Tokens

JACHAI is built with a disciplined design system:
- **Theme Engine (`ThemeContext`)**: Seamless switching between **Light Mode**, **Dark (Night Study) Mode**, and **System Default** with persistent storage.
- **Motion Animations (`motion/react`)**: Smooth route transitions (`AnimatePresence`), micro-interactions on button clicks, streak badges, and active exam progress counters.
- **Component States**: Standardized `SkeletonLoader` for shimmering data fetches, designed `EmptyState` cards with actionable recovery buttons, and non-blocking toast notifications (`ToastContext`).
- **PWA & Low-Connectivity Support**: Includes Web App Manifest (`manifest.webmanifest`) and Service Worker (`/public/sw.js`) enabling offline question practice on mobile devices.

---

## 🗄️ 4. Database Architecture & PostgreSQL Schema

JACHAI uses **PostgreSQL 16** with automatic in-memory SQLite fallback during local development:

```
┌─────────────────────────────────────────────────────────────┐
│                      JACHAI DATABASE                        │
├─────────────────┬─────────────────────────┬─────────────────┤
│  users          │  user_progress          │  topics         │
│  - id           │  - user_id (FK)         │  - id           │
│  - phone (UQ)   │  - points, streak_days  │  - chapter_id   │
│  - password_hash│  - accuracy, exam_hist  │  - name, bangla │
│  - target_univ  │  - bookmarks, mistakes  │  - star_rating  │
├─────────────────┼─────────────────────────┼─────────────────┤
│  questions      │  chat_history           │  admin_drafts   │
│  - id           │  - id, user_id (FK)     │  - id, source   │
│  - subject_id   │  - role, content        │  - content      │
│  - topic_id (FK)│  - options, ans         │  - status       │
│  - options, ans │  - model_used, provider │  - reviewed_by  │
├─────────────────┼─────────────────────────┼─────────────────┤
│  admin_settings │  knowledge_snippets     │  taxonomy_audit │
│  - key          │  - id, subject_id       │  - id, action   │
│  - value        │  - content_bn, answer   │  - entity_id    │
└─────────────────┴─────────────────────────┴─────────────────┘
```

### Automatic Migration Runner (`/server/migrations.ts`)
- Schema changes are versioned and executed automatically on startup inside atomic transactions (`001_initial_schema` to `009_taxonomy_audit_logs`).
- Pre-checks and idempotency safeguards (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) ensure complete resilience across pre-existing tables (`subjects`, `chapters`, `written_questions`, `topics`, `questions`).
- Failures trigger an instant rollback to maintain database integrity.

### 4-Layer Filtering & Auto-Healing Pipeline
1. **Layer 1 (Database Single Source of Truth)**: Compound indices `(topic_id, category)` and relational foreign keys ensure instant queries and clean joins.
2. **Layer 2 (Smart Import Pipeline)**: Auto-resolves topic names to valid topic IDs, preserves custom topic IDs, and supports batch range assignment in the admin panel.
3. **Layer 3 (Dynamic Recount Engine)**: Auto-synchronizes `mcq_count`, `written_count`, and per-category counts (`varsity_a_count`, `engineering_count`, etc.) with 1-click healing (`POST /api/admin/heal-database`).
4. **Layer 4 (Centralized Filter Engine & Pre-Query Validator - `src/utils/questionFilter.ts` & `src/services/api.ts`)**: Standardized ID-driven hierarchical filtering (`Subject -> Paper -> Chapter -> Topic -> Category`) with alias support (`physics_1`, `phy_p1_c2`, `phy_p1_c2_t1`) and automatic pre-query transformation before hitting PostgreSQL, eliminating UI-database query discrepancies.
5. **Strict Database-First Policy**: Disables hardcoded mock question injection so the application renders accurate real-time empty/loaded states without unprompted fallback questions when the database is empty.

---

## 🌐 5. API Reference & Security Architecture

### Core Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public (Rate-Limited) | Register student with phone and password |
| `POST` | `/api/auth/login` | Public (Rate-Limited) | Authenticate user & issue signed JWT |
| `GET` | `/api/user/profile` | Authenticated | Retrieve profile, bookmarks, and past mistakes |
| `PUT` | `/api/user/profile` | Authenticated | Update user progress, accuracy, and streak |
| `POST` | `/api/admin/login` | Public (Rate-Limited) | Admin authentication; issues admin JWT |
| `GET` | `/api/questions` | Public | List filtered questions with search |
| `POST` | `/api/questions` | Admin Only | Create question (Validated with Zod) |
| `PUT` | `/api/questions/:id` | Admin Only | Update question |
| `DELETE`| `/api/questions/:id` | Admin Only | Delete question |
| `GET` | `/api/topics` | Public | List topics with chapter/subject filters |
| `GET` | `/api/topics/stats` | Public | Aggregated category and question statistics per topic |
| `POST` | `/api/admin/heal-database` | Admin Only | Auto-normalize topics, verify integrity and recount |
| `POST` | `/api/ai/chat` | Authenticated (Rate-Limited)| Multi-turn AI academic tutor interaction |
| `POST` | `/api/ai/solve-photo` | Authenticated (Rate-Limited)| Vision-based question solver |

### Security Defenses:
- **RBAC Token Verification (`authenticateAdmin`)**: Rejects unauthorized tampering or student tokens attempting admin actions.
- **Anti-Spoofing Protocol**: `user_id` is exclusively extracted from cryptographic JWT payloads, never from untrusted headers or query parameters.
- **Rate Limiting**: Configured with `express-rate-limit` on all authentication and paid AI endpoints.
- **Security Headers & Logging**: Powered by `helmet` and structured logging with `pino`.

---

## 🔄 6. End-to-End Workflow

```
[ Student / Admin Client ]
          │  (React 19 + React Router + ThemeContext)
          ▼
[ Express API Gateway ]
    ├── 1. Security Headers (Helmet) & CORS Verification
    ├── 2. Rate Limiting (express-rate-limit)
    ├── 3. JWT Authentication & Role Authorization (authenticateToken / authenticateAdmin)
    └── 4. Zod Body Validation (validateBody)
          │
          ├──► [ Database Service ] (PostgreSQL 16 / Migrations Runner / In-Memory Fallback)
          │
          └──► [ AI Gateway ] (Google Gemini 2.5 Flash / OpenRouter AI Fallback)
```

---

## 🚀 7. Quick Start & Execution

### Prerequisites
- Node.js 20+ (or Node.js 18 LTS)
- npm 9+

### Local Development Setup
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Start development server (Port 3000)
npm run dev
```

### Production Build & Launch
```bash
npm run build
npm run start
```

### Automated Testing
```bash
npm run test
```

---

## 🧪 8. Pre-Deployment Manual Test Checklist

Before shipping new updates or deploying to production, execute the following 4-step verification checklist:

| Test Case | Objective & Steps | Expected Result |
| :--- | :--- | :--- |
| **1. Re-upload Same CSV** | Import a CSV file, complete the import, then re-upload and confirm the same file. | Zero duplicate topics generated; existing topics resolved and questions safely upserted via `ON CONFLICT (id) DO UPDATE`. |
| **2. Bengali Whitespace & Unicode Normalization** | Import questions with arbitrary spacing (e.g. `"  ভেক্টর   ডট গুণন  "`) or decomposed Unicode codepoints. | `normalizeBangla` strips ZWJ/ZWNJ and harmonizes glyphs to match the canonical topic without creating spurious duplicates. |
| **3. Cascading Taxonomy Picker** | Select Subject (e.g. Physics 1st) ➔ Chapter (Vector) in manual edit or bulk import modals. | Only topics belonging to Vector are displayed. Creating an in-line topic (`+ নতুন টপিক তৈরি করুন`) persists to DB and immediately refreshes the picker. |
| **4. Taxonomy Health & Transactional Merge** | Visit Admin Taxonomy Health Dashboard ➔ Duplicate Suspects ➔ Execute Topic Merge. | All MCQs and Written Questions pointing to old topics are atomically reassigned to survivor topic; audit log is written to `taxonomy_audit_logs`. |

---

## 🐳 9. Containerization & Deployment

Run the complete full-stack environment with a single command using Docker Compose:

```bash
docker compose up --build -d
```
Access the application at `http://localhost:3000`.

For detailed platform deployment guides (including **Android Termux**, **Free Cloud Platforms**, and **Sketchware Pro WebView Integration**), refer to [`run.txt`](./run.txt). For database injection and schema rules, refer to [`DataInstruction.txt`](./DataInstruction.txt).

---

<div align="center">
  <sub>Developed with ❤️ for University Admission Seekers of Bangladesh • Powered by JACHAI</sub>
</div>
