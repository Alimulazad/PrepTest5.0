export interface WrittenQuestion {
  id: string;
  subject_id: QuestionSubject | string;
  subject_name: string;
  paper: '1st' | '2nd' | 'all';
  chapter_id: string;
  chapter_name: string;
  topic_id?: string;
  topic_name?: string;
  institution_code?: string;
  session?: string;
  question_number?: number;
  question_text: string;
  question_image_url?: string;
  explanation: string;
  explanation_latex?: string;
  explanation_image_url?: string;
  explanation_image_urls?: string[];
  tags: string[]; // e.g. ["KhU B 25-26", "DU A 24-25"]
  category?: ExamCategory | string;
  difficulty?: 'easy' | 'medium' | 'hard';
  star_rating?: 1 | 2 | 3;
  created_at?: number;
  updated_at?: number;
  is_active?: boolean;
}

export interface WrittenQuestionFilters {
  subject_id?: string;
  chapter_id?: string;
  topic_id?: string;
  institution_code?: string;
  session?: string;
  paper?: '1st' | '2nd' | 'all' | string;
  category?: ExamCategory | string;
  difficulty?: 'easy' | 'medium' | 'hard' | string;
  tag?: string;
  search?: string;
  cursor?: string;
  page?: number;
  limit?: number;
}

export interface WrittenQuestionsPaginatedResponse {
  questions: WrittenQuestion[];
  total: number;
  nextCursor?: string | null;
  hasMore?: boolean;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface QuestionFilters {
  subject_id?: string;
  chapter_id?: string;
  topic_id?: string;
  institution_code?: string;
  session?: string;
  paper?: '1st' | '2nd' | 'all' | string;
  category?: ExamCategory | string;
  difficulty?: 'easy' | 'medium' | 'hard' | string;
  tag?: string;
  search?: string;
  type?: 'mcq' | 'written' | string;
  cursor?: string;
  page?: number;
  limit?: number;
}

export interface QuestionsPaginatedResponse {
  questions: Question[];
  total: number;
  nextCursor?: string | null;
  hasMore?: boolean;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export type CreateWrittenQuestionInput = Omit<WrittenQuestion, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type UpdateWrittenQuestionInput = Partial<CreateWrittenQuestionInput>;

export type NavigationTab = 'home' | 'question_bank' | 'exam' | 'history' | 'progress';

export type QuestionSubject = 
  | 'physics_1' 
  | 'physics_2' 
  | 'chemistry_1' 
  | 'chemistry_2' 
  | 'math_1' 
  | 'math_2' 
  | 'biology_1' 
  | 'biology_2' 
  | 'ict' 
  | 'bangla' 
  | 'english' 
  | 'gk'
  | 'psychology';

export type UniversityUnit = 
  | 'du_a' 
  | 'du_b' 
  | 'buet' 
  | 'medical' 
  | 'bup_fst' 
  | 'sust_a' 
  | 'gst_a' 
  | 'cu_a' 
  | 'ru_c' 
  | 'ju_a' 
  | 'agri';

export type ExamCategory = 'academic' | 'main_book' | 'engineering' | 'medical' | 'varsity_a';

export interface QuestionOption {
  id: 'A' | 'B' | 'C' | 'D';
  label: string; // 'ক' | 'খ' | 'গ' | 'ঘ'
  text: string; // supports LaTeX formatted with $...$
}

export interface Question {
  id: string;
  subject_id: QuestionSubject;
  subject_name: string;
  paper: '1st' | '2nd' | 'all';
  chapter_id: string;
  chapter_name: string;
  topic_id?: string;
  topic_name?: string;
  institution_code?: string;
  session?: string;
  category?: ExamCategory;
  question_text: string;
  math_formula_latex?: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_ans: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  explanation_latex?: string;
  question_image_url?: string;
  explanation_image_url?: string;
  explanation_image_urls?: string[];
  tags: string[]; // e.g. ["BUP FST 24-25", "DU 'Ka' 22-23", "HSC"]
  star_rating: 1 | 2 | 3;
  type: 'mcq' | 'written';
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface SubTopic {
  id: string;
  topic_code?: string; // e.g. 'T-01'
  name: string;
  bangla_name: string;
  total_questions: number;
  completed_questions?: number;
  star_rating?: 1 | 2 | 3;
  mcq_count?: number;
  written_count?: number;
  exam_occurrences?: {
    mcq?: string;
    written?: string;
  };
  key_points?: string[];
}

export interface TopicRecord extends SubTopic {
  chapter_id: string;
  subject_id?: string;
  paper?: string;
  created_at?: number;
  varsity_a_count?: number;
  medical_count?: number;
  engineering_count?: number;
  academic_count?: number;
  main_book_count?: number;
}

export interface Chapter {
  id: string;
  subject_id: QuestionSubject;
  paper: '1st' | '2nd';
  name: string;
  bangla_name: string;
  total_questions: number;
  completed_questions: number;
  star_rating: 1 | 2 | 3;
  subtopics?: SubTopic[];
}

export interface SubjectInfo {
  id: QuestionSubject;
  name: string;
  bangla_name: string;
  paper: '১ম পত্র' | '২য় পত্র' | 'সকল';
  short_code?: string;
  color: string;
  gradient: string;
  iconName: string;
  totalQuestions: number;
  category: 'science' | 'general';
}

export interface UniversityInfo {
  id: UniversityUnit;
  name: string;
  fullName: string;
  shortCode: string;
  examDate?: string;
  seatCount: number;
  negativeMark: number;
  durationMinutes: number;
  totalMarks: number;
  syllabus: string;
  bgColor: string;
  icon: string;
}

export interface MistakeLog {
  questionId: string;
  selectedAns: 'A' | 'B' | 'C' | 'D';
  timestamp: number;
  resolved: boolean;
}

export interface ExamHistoryItem {
  id: string;
  title: string;
  subject: string;
  totalQuestions: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  timeTakenSeconds: number;
  date: string;
  tag: string;
}

export interface UserProgress {
  name: string;
  college: string;
  hscBatch: string;
  avatarSeed: string;
  avatarBgColor: string;
  points: number;
  examsCompleted: number;
  totalCorrect: number;
  totalWrong: number;
  rank: number;
  streakDays: number;
  targetUniversity: UniversityUnit;
  bookmarks: string[]; // question ids
  pastMistakes: MistakeLog[];
  examHistory: ExamHistoryItem[];
  dailyPoints: number[];
  completedJourneyTasks: string[];
}

export interface User {
  id: string;
  phone: string;
  name: string;
  target_university?: string;
  target_unit?: string;
  exam_year?: string;
  college?: string;
  avatar?: string;
  avatar_color?: string;
  avatar_bg_color?: string;
  created_at?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
  progress: UserProgress;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  groundingSources?: { uri: string; title: string }[];
  isThinking?: boolean;
  modelUsed?: string;
  provider?: 'gemini' | 'openrouter';
  reasoning?: string;
}

export interface AIModelOption {
  id: string;
  name: string;
  provider: 'gemini' | 'openrouter';
  category?: 'router' | 'reasoning' | 'chat' | 'gemini' | 'custom' | string;
  description: string;
  badge?: string;
  supportsVision?: boolean;
  isPopular?: boolean;
}

export type CarouselTheme =
  | 'blue_royal'
  | 'dark_navy'
  | 'emerald_green'
  | 'amber_gold'
  | 'purple_violet'
  | 'rose_crimson'
  | 'cyber_cyan'
  | 'sunset_orange'
  | 'charcoal_dark';

export type CarouselTextSize = 'small' | 'normal' | 'medium' | 'large';

export type CarouselItemType =
  | 'concept'
  | 'formula'
  | 'gk'
  | 'quote'
  | 'shortcut'
  | 'announcement';

export interface CarouselActionButton {
  enabled: boolean;
  text: string;
  link: string;
  variant?: 'primary' | 'glass' | 'outline';
  isExternal?: boolean;
}

export interface CarouselItem {
  id: string;
  type: CarouselItemType;
  title_bn?: string;
  content_bn: string;
  content_latex?: string;
  answer_bn?: string;
  subject_id?: string;
  theme?: CarouselTheme;
  textSize?: CarouselTextSize;
  customDuration?: number; // per-item duration in seconds
  actionButton?: CarouselActionButton;
  pinned?: boolean;
  active: boolean;
  order?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface CarouselSettings {
  autoPlay: boolean;
  intervalSeconds: number; // default duration (e.g. 5, 7, 10s)
  defaultTheme: CarouselTheme;
  defaultTextSize: CarouselTextSize;
  showBadge: boolean;
  showProgressDots: boolean;
  showNavButtons: boolean;
  pauseOnHover: boolean;
  updatedAt?: number;
}

export interface KnowledgeSnippet {
  id: string;
  type: 'quote' | 'formula' | 'gk' | 'concept' | 'shortcut' | 'announcement';
  title_bn?: string;
  content_bn: string;
  content_latex?: string;
  answer_bn?: string;
  subject_id?: string;
  theme?: CarouselTheme;
  textSize?: CarouselTextSize;
  customDuration?: number;
  actionButton?: CarouselActionButton;
  pinned?: boolean;
  active?: number | boolean;
}

export type DraftStatus = 'pending' | 'approved' | 'rejected';
export type DraftType = 'question' | 'topic' | 'knowledge_snippet';

export interface AdminDraftItem {
  id: string;
  type: DraftType;
  payload: any; // Complete Question, TopicRecord, or KnowledgeSnippet object
  status: DraftStatus;
  source_model?: string;
  source_info?: string;
  created_at: number;
  updated_at?: number;
}

export interface AdminApiKeyConfig {
  id: string;
  key?: string;
  key_full?: string;
  key_masked?: string;
  label?: string;
  provider: 'openrouter' | 'gemini';
  status: 'active' | 'rate_limited' | 'error' | 'untested';
  is_primary?: boolean;
  priority?: number;
  lastTested?: number;
  last_checked_at?: string;
  latencyMs?: number;
  latency_ms?: number;
  errorCount?: number;
  error_count?: number;
  successCount?: number;
  success_count?: number;
  created_at?: string | number;
}

export interface AdminAIConfig {
  preferredModel: string;
  autoFailoverEnabled: boolean;
  primaryKeyId: string | null;
  primaryKeyLabel: string | null;
  totalKeys: number;
}

export interface AdminSystemStats {
  totalQuestions: number;
  totalTopics: number;
  totalSnippets: number;
  totalUsers: number;
  pendingDrafts: number;
  approvedDrafts: number;
  rejectedDrafts: number;
  openRouterKeysCount: number;
  activeKeysCount?: number;
  activeKeyIndex: number;
  activeModel: string;
  dbFileSize?: string;
  status: 'online' | 'degraded' | 'offline';
}

export interface OpenRouterEndpointCheck {
  id: string;
  name: string;
  url: string;
  status: 'healthy' | 'degraded' | 'down' | 'untested';
  statusCode?: number;
  latencyMs?: number;
  lastPolledAt: string;
  message?: string;
}

export interface OpenRouterKeyUsageStats {
  id: string;
  label: string;
  keyMasked: string;
  provider: 'openrouter' | 'gemini';
  status: 'active' | 'rate_limited' | 'error' | 'untested';
  latencyMs?: number;
  successCount: number;
  errorCount: number;
  lastTested?: number;
  isCurrentActive: boolean;
  creditUsage?: {
    label?: string;
    limit?: number;
    usage?: number;
    isFreeTier?: boolean;
    rateLimitRemaining?: number;
  };
}

export interface LatencyHistoryPoint {
  time: string;
  latencyMs: number;
  status: 'healthy' | 'degraded' | 'down';
}

export interface OpenRouterSystemHealthResponse {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'down';
  avgLatencyMs: number;
  activeModel: string;
  currentKeyIndex: number;
  totalKeys: number;
  activeKeysCount: number;
  totalRequestsHandled: number;
  successRate: number; // percentage, e.g. 98.5
  endpoints: OpenRouterEndpointCheck[];
  keysUsage: OpenRouterKeyUsageStats[];
  failoverStatus: {
    isAutoFailoverEnabled: boolean;
    activeKeyLabel: string;
    healthyFallbacksCount: number;
    lastFailoverAt?: string;
  };
  serverTime: string;
}

export interface ActiveUserItem {
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
}

export interface ActiveUsersResponse {
  success: boolean;
  totalActiveNow: number;
  totalActiveToday: number;
  totalRegisteredActive: number;
  totalGuestsActive: number;
  activeUsers: ActiveUserItem[];
  universityBreakdown: Record<string, number>;
  pageBreakdown: Record<string, number>;
  lastUpdated: number;
}


