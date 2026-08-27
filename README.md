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
│   ├── web/               # Public student-facing portal (React 19, Tailwind, Vite)
│   ├── admin/             # Dedicated administrator dashboard & CMS (React 19, Vite)
│   └── api/               # Express backend service, authentication, and AI proxy
├── packages/
│   └── shared/            # Shared TypeScript types, schemas, and admission metadata
├── server/                # Server core modules, database connectors, and migrations
│   ├── db.ts              # PostgreSQL driver with in-memory fallback & transaction handling
│   ├── migrations.ts      # Versioned migration engine (_migrations table tracker)
│   ├── validation/        # Zod input validation schemas
│   └── utils/             # Pino structured logger and Cloudinary upload pipelines
├── tests/                 # Unit and integration test suites (Vitest)
├── Dockerfile             # Multi-stage production container build
├── docker-compose.yml     # Full-stack container orchestration (Postgres + JACHAI)
├── DataInstruction.txt    # Database entry manual and JSON/SQL schema guide
└── run.txt                # Deployment guide (Termux, Cloud Free Tiers, Sketchware Pro)
```

---

## 🎯 2. Feature & Functional Overview

### 🎓 Student Learning Ecosystem
- **Bengali-First UI & Pedagogy**: High-contrast typography and authentic Bengali academic vocabulary tailored for DU, BUET, Medical, and GST aspirants.
- **Categorized Question Bank**: Filter by Subject, Paper (1st/2nd), Chapter, Topic, Difficulty (`Easy`, `Medium`, `Hard`), and University standard (`Varsity A`, `Engineering`, `Medical`, `GST`).
- **Dynamic Real-Time Counting Engine**: Live question aggregation from PostgreSQL via `/api/questions/counts` across Subject cards, Category blocks, Chapter chips, and Topic chips without static or hardcoded estimates.
- **Real-Time Mock Exam Engine**: Live exam timer, custom question sets, randomized shuffling, instant scoring, and accurate negative marking penalty deduction (0.25 marks).
- **AI Tutor & Instant Solver**: Multi-turn academic tutor powered by Google Gemini (primary) with seamless OpenRouter fallback for LaTeX equations and step-by-step problem breakdown.
- **Photo-Solve & OCR**: Upload or capture textbook questions to receive instant solutions, step-by-step explanations, and related concept links.
- **Progress Tracking & Analytics**: Accuracy percentages, subject-wise mastery graphs, streak tracking, question bookmarking, and past mistake logs.
- **Google Calendar Study Sync**: Synchronize upcoming admission exam schedules directly to Google Calendar via OAuth2.

### 🛡️ Administrator CMS & Operations
- **Secure Admin Authentication**: JWT token authentication with `{ role: 'admin' }` claims and short-lived expiry.
- **Smart Bulk Importer 3.0 & Taxonomy Resolver**: 3-stage lifecycle (`Parse` ➔ `Resolve / Multi-Tier Preview` ➔ `Transactional Commit`) with Bengali Unicode normalization (`packages/shared/src/taxonomy/resolve.ts`), categorization into `fullyResolvedRows`, `ambiguousRows` (candidate mismatch detection), and `missingTaxonomyRows`, transactional `ON CONFLICT DO UPDATE` question and taxonomy upserts, and real-time counter recalculations in the same transaction.
- **Cascading Taxonomy Picker**: Searchable 4-level cascading selector (`Subject` ➔ `Paper` ➔ `Chapter` ➔ `Topic`) with in-line topic creation (`+ নতুন টপিক তৈরি করুন`) and immediate reactive refresh across Bulk Import and Question Edit modals.
- **Taxonomy Health Dashboard**: Diagnostic and remediation portal visualizing duplicate suspect topics, zero-question topics, and orphan questions with transactional Merge, Normalize, Delete Empty, and Re-assign actions.
- **Live Dynamic Master ID Chart**: Live export endpoints (`/api/admin/taxonomy/export-master-chart` and `/api/admin/taxonomy/tree`) rendering the live hierarchy of subjects, chapters, and topics on-demand.
- **Database Hardening & Auto-Deduplication**: Schema migration `008_taxonomy_hardening` enforcing foreign keys, composite UNIQUE constraints, single-CTE survivor chapter mapping, and diagnostic health views (`duplicate_suspect_topics`, `zero_question_topics`, `orphan_topic_ids`).
- **Question & Topic Editor**: Visual question creation, LaTeX equation previews, option management, and batch JSON imports.
- **AI Question Extractor**: Convert unstructured question papers and scans into structured database models.
- **Drafts Approval Queue**: Moderate community and OCR-extracted drafts before publishing to the live question bank.
- **Masked API Key Manager**: Safely monitor active OpenRouter and Gemini keys with zero raw secret leaks.

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
│  - topic_id (FK)│  - model_used, provider │  - status       │
│  - options, ans │  - created_at           │  - reviewed_by  │
├─────────────────┼─────────────────────────┼─────────────────┤
│  admin_settings │  knowledge_snippets     │  _migrations    │
│  - key          │  - id, subject_id       │  - id, name     │
│  - value        │  - content_bn, answer   │  - executed_at  │
└─────────────────┴─────────────────────────┴─────────────────┘
```

### Automatic Migration Runner (`/server/migrations.ts`)
- Schema changes are versioned and executed automatically on startup inside atomic transactions (`001_initial_schema` to `007_relational_hierarchy_and_performance_indices`).
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
