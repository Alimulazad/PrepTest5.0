import { Question, UserProgress, ChatMessage, User, AuthResponse, AIModelOption, KnowledgeSnippet, TopicRecord, AdminDraftItem, AdminApiKeyConfig, AdminSystemStats, OpenRouterSystemHealthResponse, ActiveUsersResponse } from '../types';
import { INITIAL_USER_PROGRESS, INITIAL_QUESTIONS, CHAPTERS_DATA, INITIAL_KNOWLEDGE_SNIPPETS } from '../data/admissionData';
import { fetchWithRetry, probeServerHealth } from '../utils/apiClient';
import { validateAndStandardizeQueryParams } from '../utils/questionFilter';

export { probeServerHealth };

const USER_STORAGE_KEY = 'varsity_admission_user_data_v1';
const AUTH_TOKEN_KEY = 'varsity_admission_auth_token_v1';
const AUTH_USER_KEY = 'varsity_admission_auth_user_v1';
const ADMIN_TOKEN_KEY = 'jachai_admin_token_v1';
const AI_MODEL_KEY = 'varsity_admission_ai_model_v1';
const OPENROUTER_KEY = 'varsity_admission_openrouter_api_key_v1';
const OPENROUTER_KEYS_LIST = 'varsity_admission_openrouter_keys_list_v1';
const CUSTOM_MODEL_KEY = 'varsity_admission_custom_model_v1';
const CUSTOM_SERVER_URL_KEY = 'jachai_custom_api_server_url_v1';

const DEFAULT_BACKEND_URL = '';

// ---------------- API Server Base URL Configuration ----------------

export function getApiBaseUrl(): string {
  try {
    const savedCustomUrl = localStorage.getItem(CUSTOM_SERVER_URL_KEY);
    if (savedCustomUrl && savedCustomUrl.trim()) {
      if (savedCustomUrl.includes('unblessed-plexiglas-repeater')) {
        localStorage.removeItem(CUSTOM_SERVER_URL_KEY);
      } else {
        return savedCustomUrl.trim().replace(/\/+$/, '');
      }
    }
  } catch (e) {}

  const metaEnv = (typeof import.meta !== 'undefined' ? (import.meta as any).env : null) || {};
  const envUrl = (
    metaEnv.VITE_API_BASE_URL ||
    metaEnv.VITE_SERVER_URL_FOR_ADMIN ||
    metaEnv.VITE_SERVER_URL ||
    DEFAULT_BACKEND_URL
  ).trim();

  return envUrl.replace(/\/+$/, '');
}

export function setCustomServerUrl(url: string): void {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(CUSTOM_SERVER_URL_KEY);
    } else {
      localStorage.setItem(CUSTOM_SERVER_URL_KEY, url.trim().replace(/\/+$/, ''));
    }
  } catch (e) {}
}

export function getApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

// ---------------- Token, User & AI Storage Management ----------------

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export function setAdminToken(token: string): void {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch (e) {}
}

export function clearAdminToken(): void {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch (e) {}
}

function getAdminAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAdminToken();
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function getStoredAIModel(): string {
  try {
    return localStorage.getItem(AI_MODEL_KEY) || 'openrouter/free';
  } catch (e) {
    return 'openrouter/free';
  }
}

export function setStoredAIModel(modelId: string): void {
  try {
    localStorage.setItem(AI_MODEL_KEY, modelId);
  } catch (e) {}
}

export function getStoredOpenRouterKeys(): string[] {
  try {
    const rawList = localStorage.getItem(OPENROUTER_KEYS_LIST);
    if (rawList) {
      const parsed = JSON.parse(rawList);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((k) => typeof k === 'string' && k.trim().length > 0);
      }
    }
    const single = localStorage.getItem(OPENROUTER_KEY);
    if (single && single.trim()) {
      return single.split(/[\n,]+/).map((k) => k.trim()).filter((k) => k.length > 0);
    }
    return [];
  } catch (e) {
    return [];
  }
}

export function setStoredOpenRouterKeys(keys: string[]): void {
  try {
    const cleanKeys = Array.from(new Set(keys.map((k) => k.trim()).filter(Boolean)));
    localStorage.setItem(OPENROUTER_KEYS_LIST, JSON.stringify(cleanKeys));
    localStorage.setItem(OPENROUTER_KEY, cleanKeys[0] || '');
  } catch (e) {}
}

export function getStoredOpenRouterKey(): string {
  const keys = getStoredOpenRouterKeys();
  return keys[0] || '';
}

export function setStoredOpenRouterKey(key: string): void {
  try {
    const existing = getStoredOpenRouterKeys();
    if (key.trim()) {
      const newKeys = Array.from(new Set([key.trim(), ...existing]));
      setStoredOpenRouterKeys(newKeys);
    } else {
      localStorage.removeItem(OPENROUTER_KEY);
    }
  } catch (e) {}
}

export function getStoredCustomModelName(): string {
  try {
    return localStorage.getItem(CUSTOM_MODEL_KEY) || '';
  } catch (e) {
    return '';
  }
}

export function setStoredCustomModelName(name: string): void {
  try {
    localStorage.setItem(CUSTOM_MODEL_KEY, name);
  } catch (e) {}
}


export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (e) {
    console.error('Failed to store auth token', e);
  }
}

export function removeAuthToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  } catch (e) {
    console.error('Failed to clear auth token', e);
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function setStoredUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  } catch (e) {}
}

export function getSavedUserData(): UserProgress {
  try {
    const data = localStorage.getItem(USER_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load user data from storage', e);
  }
  return INITIAL_USER_PROGRESS;
}

export function saveUserData(progress: UserProgress): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save user data to storage', e);
  }
}

// ---------------- SQLite Authentication API Client ----------------

export async function registerUserApi(payload: {
  phone: string;
  password: string;
  name: string;
  targetUniversity?: string;
  targetUnit?: string;
  examYear?: string;
  college?: string;
  avatar?: string;
  avatarBgColor?: string;
}): Promise<AuthResponse> {
  const response = await fetchWithRetry(getApiUrl('/api/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে');
  }

  setAuthToken(data.token);
  setStoredUser(data.user);
  saveUserData(data.progress);
  return data;
}

export async function loginUserApi(payload: {
  phone: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await fetchWithRetry(getApiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'লগইন ব্যর্থ হয়েছে');
  }

  setAuthToken(data.token);
  setStoredUser(data.user);
  saveUserData(data.progress);
  return data;
}

export async function socialSyncAuthApi(payload: {
  uid?: string;
  email?: string;
  phone?: string;
  name?: string;
  provider: 'google' | 'facebook' | 'phone' | 'guest';
  avatar?: string;
  avatarColor?: string;
  targetUniversity?: string;
  targetUnit?: string;
  examYear?: string;
  college?: string;
}): Promise<AuthResponse> {
  const response = await fetchWithRetry(getApiUrl('/api/auth/social-sync'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'সোশ্যাল সাইন-ইন সিঙ্ক ব্যর্থ হয়েছে');
  }

  setAuthToken(data.token);
  setStoredUser(data.user);
  saveUserData(data.progress);
  return data;
}

export async function guestLoginApi(): Promise<AuthResponse> {
  try {
    const response = await fetchWithRetry(getApiUrl('/api/auth/guest-login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    if (response.ok && data.token) {
      setAuthToken(data.token);
      setStoredUser(data.user);
      saveUserData(data.progress);
      return data;
    }
  } catch (err) {
    console.warn('Guest login backend sync notice:', err);
  }

  // Resilient Client-Side Fallback for Instant Guest Mode
  const guestUser: User = {
    id: `guest_${Date.now()}`,
    phone: 'guest',
    name: 'গেস্ট শিক্ষার্থী',
    target_university: 'du_a',
    target_unit: "'ক' ইউনিট (বিজ্ঞান)",
    exam_year: 'HSC-26',
    college: 'ঢাকা কলেজ',
    avatar: '🚀',
    avatar_color: '#FF6B00',
    created_at: Date.now(),
  };

  const guestProgress = getSavedUserData();
  const dummyToken = `guest_token_${Date.now()}`;
  setAuthToken(dummyToken);
  setStoredUser(guestUser);
  saveUserData(guestProgress);

  return {
    token: dummyToken,
    user: guestUser,
    progress: guestProgress,
  };
}

export async function fetchCurrentUserApi(): Promise<AuthResponse | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await fetchWithRetry(getApiUrl('/api/auth/me'), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        removeAuthToken();
      }
      return null;
    }

    const data = await response.json();
    if (data.user) {
      setStoredUser(data.user);
    }
    if (data.progress) {
      saveUserData(data.progress);
    }
    return { token, user: data.user, progress: data.progress };
  } catch (e) {
    console.error('Fetch current user error:', e);
    return null;
  }
}

export async function updateUserProfileApi(payload: {
  name?: string;
  college?: string;
  examYear?: string;
  targetUniversity?: string;
  targetUnit?: string;
  avatar?: string;
  avatarBgColor?: string;
}): Promise<{ user: User; progress: UserProgress }> {
  const token = getAuthToken();
  if (!token) throw new Error('অনুগ্রহ করে লগইন করুন');

  const response = await fetchWithRetry(getApiUrl('/api/auth/profile'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'প্রোফাইল আপডেট ব্যর্থ হয়েছে');
  }

  if (data.user) setStoredUser(data.user);
  if (data.progress) saveUserData(data.progress);
  return data;
}

export async function fetchUserProgressFromBackend(): Promise<UserProgress | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await fetchWithRetry(getApiUrl('/api/user/progress'), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;
    const progress = await response.json();
    saveUserData(progress);
    return progress;
  } catch (e) {
    return null;
  }
}

export async function syncUserProgressToBackend(progress: UserProgress): Promise<void> {
  const token = getAuthToken();
  if (!token) return;

  try {
    await fetchWithRetry(getApiUrl('/api/user/progress'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(progress),
    });
  } catch (e) {
    console.error('Failed to sync progress to SQLite database', e);
  }
}


// ---------------- SQLite Question API Operations ----------------

function getFilteredInitialQuestions(_filters?: {
  subject_id?: string;
  chapter_id?: string;
  topic_id?: string;
  paper?: string;
  tag?: string;
  search?: string;
  category?: string;
}): Question[] {
  return [];
}

function getFallbackTopics(filters?: {
  chapter_id?: string;
  subject_id?: string;
  paper?: string;
  search?: string;
}): TopicRecord[] {
  const topics: TopicRecord[] = [];
  for (const chap of CHAPTERS_DATA) {
    if (filters?.chapter_id && chap.id !== filters.chapter_id) continue;
    if (filters?.subject_id && chap.subject_id !== filters.subject_id) continue;
    if (filters?.paper && chap.paper !== filters.paper) continue;
    if (chap.subtopics) {
      for (const st of chap.subtopics) {
        if (filters?.search) {
          const s = filters.search.toLowerCase();
          if (
            !st.name.toLowerCase().includes(s) &&
            !st.bangla_name.toLowerCase().includes(s) &&
            !(st.topic_code && st.topic_code.toLowerCase().includes(s))
          ) {
            continue;
          }
        }
        topics.push({
          id: st.id,
          chapter_id: chap.id,
          subject_id: chap.subject_id,
          paper: chap.paper,
          topic_code: st.topic_code,
          name: st.name,
          bangla_name: st.bangla_name,
          star_rating: (st.star_rating as 1 | 2 | 3) || 3,
          total_questions: st.total_questions || 0,
          completed_questions: st.completed_questions || 0,
          mcq_count: st.mcq_count || 0,
          written_count: st.written_count || 0,
          exam_occurrences: st.exam_occurrences,
          key_points: st.key_points,
        });
      }
    }
  }
  return topics;
}

export interface FetchQuestionsParams {
  subject_id?: string;
  chapter_id?: string;
  topic_id?: string;
  paper?: string;
  tag?: string;
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedQuestionsResponse {
  questions: Question[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchQuestions(filters?: FetchQuestionsParams): Promise<Question[]> {
  try {
    const validatedFilters = validateAndStandardizeQueryParams(filters);
    const params = new URLSearchParams();
    if (validatedFilters?.subject_id) params.append('subject_id', validatedFilters.subject_id);
    if (validatedFilters?.chapter_id) params.append('chapter_id', validatedFilters.chapter_id);
    if (validatedFilters?.topic_id) params.append('topic_id', validatedFilters.topic_id);
    if (validatedFilters?.paper) params.append('paper', validatedFilters.paper);
    if (validatedFilters?.tag) params.append('tag', validatedFilters.tag);
    if (validatedFilters?.search) params.append('search', validatedFilters.search);
    if (validatedFilters?.category) params.append('category', validatedFilters.category);
    if (validatedFilters?.page) params.append('page', String(validatedFilters.page));
    if (validatedFilters?.limit) params.append('limit', String(validatedFilters.limit));

    const queryString = params.toString();
    const url = `/api/questions${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetchWithRetry(getApiUrl(url));
    if (!response.ok) {
      return getFilteredInitialQuestions(validatedFilters);
    }
    const data = await response.json();
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.questions)) {
      return data.questions;
    }
    return getFilteredInitialQuestions(validatedFilters);
  } catch (e) {
    return getFilteredInitialQuestions(filters);
  }
}

export async function fetchPaginatedQuestions(filters?: FetchQuestionsParams): Promise<PaginatedQuestionsResponse> {
  try {
    const validatedFilters = validateAndStandardizeQueryParams(filters);
    const params = new URLSearchParams();
    if (validatedFilters?.subject_id) params.append('subject_id', validatedFilters.subject_id);
    if (validatedFilters?.chapter_id) params.append('chapter_id', validatedFilters.chapter_id);
    if (validatedFilters?.topic_id) params.append('topic_id', validatedFilters.topic_id);
    if (validatedFilters?.paper) params.append('paper', validatedFilters.paper);
    if (validatedFilters?.tag) params.append('tag', validatedFilters.tag);
    if (validatedFilters?.search) params.append('search', validatedFilters.search);
    if (validatedFilters?.category) params.append('category', validatedFilters.category);
    if (validatedFilters?.page) params.append('page', String(validatedFilters.page));
    if (validatedFilters?.limit) params.append('limit', String(validatedFilters.limit));

    const queryString = params.toString();
    const url = `/api/questions${queryString ? `?${queryString}` : ''}`;

    const response = await fetchWithRetry(getApiUrl(url));
    if (!response.ok) {
      const fallbackList = getFilteredInitialQuestions(validatedFilters);
      const page = validatedFilters?.page || 1;
      const limit = validatedFilters?.limit || 20;
      return {
        questions: fallbackList.slice((page - 1) * limit, page * limit),
        total: fallbackList.length,
        page,
        limit,
        totalPages: Math.ceil(fallbackList.length / limit) || 1,
      };
    }

    const data = await response.json();
    if (data && Array.isArray(data.questions)) {
      return data as PaginatedQuestionsResponse;
    }
    if (Array.isArray(data)) {
      const page = validatedFilters?.page || 1;
      const limit = validatedFilters?.limit || data.length || 20;
      return {
        questions: data,
        total: data.length,
        page,
        limit,
        totalPages: 1,
      };
    }
    const fallbackList = getFilteredInitialQuestions(validatedFilters);
    return {
      questions: fallbackList,
      total: fallbackList.length,
      page: 1,
      limit: fallbackList.length,
      totalPages: 1,
    };
  } catch (e) {
    const fallbackList = getFilteredInitialQuestions(filters);
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    return {
      questions: fallbackList.slice((page - 1) * limit, page * limit),
      total: fallbackList.length,
      page,
      limit,
      totalPages: Math.ceil(fallbackList.length / limit) || 1,
    };
  }
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetchWithRetry(getApiUrl('/api/upload/image'), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload image to Cloudinary');
  }

  const data = await response.json();
  return data.url;
}

export async function createQuestion(
  questionData: Partial<Question>,
  files?: { questionImageFile?: File | null; explanationImageFile?: File | null }
): Promise<Question> {
  let response: Response;
  const adminHeaders = getAdminAuthHeaders();

  if (files?.questionImageFile || files?.explanationImageFile) {
    const formData = new FormData();
    Object.entries(questionData).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        if (typeof val === 'object') {
          formData.append(key, JSON.stringify(val));
        } else {
          formData.append(key, String(val));
        }
      }
    });

    if (files.questionImageFile) {
      formData.append('question_image', files.questionImageFile);
    }
    if (files.explanationImageFile) {
      formData.append('explanation_image', files.explanationImageFile);
    }

    response = await fetchWithRetry(getApiUrl('/api/questions'), {
      method: 'POST',
      headers: adminHeaders,
      body: formData,
    });
  } else {
    response = await fetchWithRetry(getApiUrl('/api/questions'), {
      method: 'POST',
      headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(questionData),
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create question');
  }

  return await response.json();
}

export async function updateQuestion(
  id: string,
  questionData: Partial<Question>,
  files?: { questionImageFile?: File | null; explanationImageFile?: File | null }
): Promise<Question> {
  let response: Response;
  const adminHeaders = getAdminAuthHeaders();

  if (files?.questionImageFile || files?.explanationImageFile) {
    const formData = new FormData();
    Object.entries(questionData).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        if (typeof val === 'object') {
          formData.append(key, JSON.stringify(val));
        } else {
          formData.append(key, String(val));
        }
      }
    });

    if (files.questionImageFile) {
      formData.append('question_image', files.questionImageFile);
    }
    if (files.explanationImageFile) {
      formData.append('explanation_image', files.explanationImageFile);
    }

    response = await fetchWithRetry(getApiUrl(`/api/questions/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: adminHeaders,
      body: formData,
    });
  } else {
    response = await fetchWithRetry(getApiUrl(`/api/questions/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(questionData),
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update question');
  }

  return await response.json();
}

export async function deleteQuestion(id: string): Promise<boolean> {
  const response = await fetchWithRetry(getApiUrl(`/api/questions/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete question');
  }

  return true;
}

export interface BulkImportResponse {
  success: boolean;
  count: number;
  message: string;
  error?: string;
  details?: Array<{ path: string; message: string }>;
}

export interface ImportPreviewApiResponse {
  success: boolean;
  summary: {
    totalRows: number;
    fullyResolvedCount: number;
    ambiguousCount: number;
    missingTaxonomyCount: number;
    canDirectlyCommit: boolean;
  };
  fullyResolvedRows: any[];
  ambiguousRows: any[];
  missingTaxonomyRows: any[];
  taxonomyTree: any[];
  error?: string;
  details?: string;
}

export interface ImportCommitApiResponse {
  success: boolean;
  count: number;
  createdTaxonomyCount: number;
  updatedTopicCountersCount: number;
  message: string;
  error?: string;
  details?: string;
}

export async function importQuestionsPreviewApi(payload: {
  questions: any[];
  defaults?: any;
}): Promise<ImportPreviewApiResponse> {
  const response = await fetchWithRetry(getApiUrl('/api/admin/questions/import-preview'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  const resData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorObj: any = new Error(resData.error || 'Import preview failed');
    errorObj.details = resData.details;
    errorObj.status = response.status;
    throw errorObj;
  }

  return resData;
}

export async function importQuestionsCommitApi(payload: {
  questions: any[];
  createTaxonomy?: any[];
}): Promise<ImportCommitApiResponse> {
  const response = await fetchWithRetry(getApiUrl('/api/admin/questions/import-commit'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  const resData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorObj: any = new Error(resData.error || 'Import commit failed');
    errorObj.details = resData.details;
    errorObj.status = response.status;
    throw errorObj;
  }

  return resData;
}

export async function bulkImportQuestionsApi(questionsData: any): Promise<BulkImportResponse> {
  const response = await fetchWithRetry(getApiUrl('/api/admin/questions/bulk-import'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(questionsData),
  });

  const resData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorObj: any = new Error(resData.error || 'Failed to bulk import questions');
    errorObj.details = resData.details;
    errorObj.status = response.status;
    throw errorObj;
  }

  return resData;
}

export async function bulkImportWrittenQuestionsApi(data: any): Promise<BulkImportResponse> {
  const response = await fetchWithRetry(getApiUrl('/api/admin/written-questions/bulk-import'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });

  const resData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorObj: any = new Error(resData.error || 'Failed to bulk import written questions');
    errorObj.details = resData.details;
    errorObj.status = response.status;
    throw errorObj;
  }

  return resData;
}

export async function bulkImportTopicsApi(data: any): Promise<BulkImportResponse> {
  const response = await fetchWithRetry(getApiUrl('/api/admin/topics/bulk-import'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });

  const resData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorObj: any = new Error(resData.error || 'Failed to bulk import topics');
    errorObj.details = resData.details;
    errorObj.status = response.status;
    throw errorObj;
  }

  return resData;
}

export async function bulkImportKnowledgeSnippetsApi(data: any): Promise<BulkImportResponse> {
  const response = await fetchWithRetry(getApiUrl('/api/admin/knowledge-snippets/bulk-import'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });

  const resData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorObj: any = new Error(resData.error || 'Failed to bulk import knowledge snippets');
    errorObj.details = resData.details;
    errorObj.status = response.status;
    throw errorObj;
  }

  return resData;
}

// ---------------- SQLite Topic API Operations ----------------

export async function fetchTopics(filters?: {
  chapter_id?: string;
  subject_id?: string;
  paper?: string;
  search?: string;
}): Promise<TopicRecord[]> {
  try {
    const validatedFilters = validateAndStandardizeQueryParams(filters);
    const params = new URLSearchParams();
    if (validatedFilters?.chapter_id) params.append('chapter_id', validatedFilters.chapter_id);
    if (validatedFilters?.subject_id) params.append('subject_id', validatedFilters.subject_id);
    if (validatedFilters?.paper) params.append('paper', validatedFilters.paper);
    if (validatedFilters?.search) params.append('search', validatedFilters.search);

    const queryString = params.toString();
    const url = `/api/topics${queryString ? `?${queryString}` : ''}`;

    const response = await fetchWithRetry(getApiUrl(url));
    if (!response.ok) {
      return getFallbackTopics(validatedFilters);
    }
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return getFallbackTopics(validatedFilters);
  } catch (e) {
    return getFallbackTopics(filters);
  }
}

export async function fetchTopicById(id: string): Promise<TopicRecord | null> {
  try {
    const response = await fetchWithRetry(getApiUrl(`/api/topics/${encodeURIComponent(id)}`));
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error('Error in fetchTopicById:', e);
    return null;
  }
}

export async function createTopic(topicData: Partial<TopicRecord>): Promise<TopicRecord> {
  const response = await fetchWithRetry(getApiUrl('/api/topics'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(topicData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create topic');
  }

  return await response.json();
}

export async function updateTopic(id: string, topicData: Partial<TopicRecord>): Promise<TopicRecord> {
  const response = await fetchWithRetry(getApiUrl(`/api/topics/${encodeURIComponent(id)}`), {
    method: 'PUT',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(topicData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update topic');
  }

  return await response.json();
}

export async function deleteTopic(id: string): Promise<boolean> {
  const response = await fetchWithRetry(getApiUrl(`/api/topics/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete topic');
  }

  return true;
}

// ---------------- TAXONOMY & HEALTH API ----------------

export interface TaxonomyTopicTreeNode {
  id: string;
  chapter_id: string;
  subject_id?: string;
  paper?: string;
  name: string;
  bangla_name: string;
  topic_code?: string;
  star_rating: number;
  total_questions: number;
}

export interface TaxonomyChapterTreeNode {
  id: string;
  subject_id: string;
  name: string;
  bangla_name: string;
  paper?: string;
  chapter_number?: number;
  total_topics?: number;
  topics: TaxonomyTopicTreeNode[];
}

export interface TaxonomySubjectTreeNode {
  id: string;
  name: string;
  bangla_name: string;
  paper: '1st' | '2nd';
  chapters: TaxonomyChapterTreeNode[];
}

export interface TaxonomyTreeResponse {
  subjects: TaxonomySubjectTreeNode[];
  totalTopics: number;
  totalChapters: number;
  totalSubjects: number;
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
  health_score: number;
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

export async function fetchTaxonomyTreeApi(): Promise<TaxonomyTreeResponse> {
  const response = await fetchWithRetry(getApiUrl('/api/taxonomy/tree'));
  if (!response.ok) {
    throw new Error('Failed to fetch taxonomy hierarchy tree');
  }
  return await response.json();
}

export async function fetchTaxonomyHealthApi(): Promise<TaxonomyHealthSummary> {
  const response = await fetchWithRetry(getApiUrl('/api/admin/taxonomy/health'), {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch taxonomy health metrics');
  }
  return await response.json();
}

export async function mergeTopicsApi(params: {
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
  const response = await fetchWithRetry(getApiUrl('/api/admin/taxonomy/merge-topics'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to merge topics');
  }
  return await response.json();
}

export async function normalizeTopicApi(params: {
  topicId: string;
  banglaName: string;
  name?: string;
}): Promise<{ success: boolean; topic: TopicRecord }> {
  const response = await fetchWithRetry(getApiUrl('/api/admin/taxonomy/normalize-topic'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to normalize topic');
  }
  return await response.json();
}

export async function deleteEmptyTopicsApi(topicIds: string[]): Promise<{
  success: boolean;
  deleted_count: number;
  deleted_ids: string[];
}> {
  const response = await fetchWithRetry(getApiUrl('/api/admin/taxonomy/delete-empty-topics'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ topicIds }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete empty topics');
  }
  return await response.json();
}

export async function reassignOrphanQuestionsApi(items: Array<{
  question_id: string;
  question_type: 'mcq' | 'written';
  target_topic_id: string;
}>): Promise<{ success: boolean; reassigned_count: number }> {
  const response = await fetchWithRetry(getApiUrl('/api/admin/taxonomy/reassign-orphans'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ items }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reassign orphan questions');
  }
  return await response.json();
}

export async function fetchMasterChartApi(format: 'json' | 'markdown' = 'markdown'): Promise<string | any> {
  const response = await fetchWithRetry(getApiUrl(`/api/admin/taxonomy/master-chart?format=${format}`), {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch master chart');
  }
  if (format === 'json') {
    return await response.json();
  }
  return await response.text();
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const response = await fetchWithRetry(getApiUrl('/api/admin/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    if (data.authenticated === true && data.token) {
      setAdminToken(data.token);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Password verification error:', e);
    return false;
  }
}

// ---------------- AI Operations (Gemini & OpenRouter) ----------------

export const DEFAULT_FALLBACK_AI_MODELS: AIModelOption[] = [
  {
    id: 'openrouter/free',
    name: 'OpenRouter Free Router',
    provider: 'openrouter',
    category: 'router',
    description: 'সর্বোচ্চ ফ্রি মডেলের মধ্য থেকে স্বয়ংক্রিয়ভাবে উপযুক্ত মডেল নির্বাচন করে',
    badge: 'ডিফল্ট • ফ্রি অটো রাউটার',
    supportsVision: true,
    isPopular: true,
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Google Gemini 3.7 Flash',
    provider: 'gemini',
    category: 'gemini',
    description: 'অত্যন্ত দ্রুত ও নির্ভুল, ম্যাথ ও বাংলা প্রশ্নের সেরা ব্যাখ্যা',
    badge: 'গুগল ফ্ল্যাগশিপ',
    supportsVision: true,
    isPopular: true,
  },
  {
    id: 'nvidia/llama-3.1-nemotron-70b-instruct:free',
    name: 'NVIDIA Nemotron 70B (Free)',
    provider: 'openrouter',
    category: 'reasoning',
    description: 'জটিল ফিজিক্স, কেমিস্ট্রি ম্যাথ ও ল্যাটেক্স সমীকরণ সঠিকভাবে প্রসেস করতে আদর্শ',
    badge: 'উচ্চ যুক্তি ও গণিত',
    supportsVision: false,
    isPopular: true,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Meta Llama 3.3 70B (Free)',
    provider: 'openrouter',
    category: 'chat',
    description: 'বাংলা ব্যাকরণ, সাধারণ জ্ঞান এবং দীর্ঘ চ্যাপ্টার সামারি তৈরির জন্য চমৎকার',
    badge: 'উচ্চ নির্ভুলতা',
    supportsVision: false,
  },
  {
    id: 'qwen/qwen-2.5-coder-32b-instruct:free',
    name: 'Qwen 2.5 Coder 32B (Free)',
    provider: 'openrouter',
    category: 'reasoning',
    description: 'শতভাগ নিখুঁত ও সঠিক JSON স্কিমা ফরম্যাট ডেলিভারিতে পারদর্শী',
    badge: 'কঠোর স্ট্রাকচার',
    supportsVision: false,
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Google Gemini 2.0 Flash (Free)',
    provider: 'openrouter',
    category: 'chat',
    description: 'ছবি ও মাল্টিমোডাল ইনপুট প্রসেসিংয়ে দক্ষ',
    badge: 'ফ্রি ভিশন',
    supportsVision: true,
  },
  {
    id: 'custom',
    name: 'কাস্টম OpenRouter মডেল',
    provider: 'openrouter',
    category: 'custom',
    description: 'যেকোনো OpenRouter মডেল আইডি ম্যানুয়ালি ইনপুট দিন',
    supportsVision: true,
  },
];

export async function fetchAIModelsApi(): Promise<{
  models: AIModelOption[];
  serverConfig: { hasGeminiKey: boolean; hasOpenRouterKey: boolean };
}> {
  try {
    const response = await fetchWithRetry(getApiUrl('/api/ai/models'), {}, { maxRetries: 1, timeoutMs: 8000 });
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.models) && data.models.length > 0) {
        return data;
      }
    }
  } catch (e: any) {
    if (e?.name !== 'AbortError' && !e?.message?.includes('aborted')) {
      console.warn('AI models list load note:', e?.message || e);
    }
  }
  return {
    models: DEFAULT_FALLBACK_AI_MODELS,
    serverConfig: { hasGeminiKey: true, hasOpenRouterKey: false },
  };
}

export async function askGeminiMentor(
  prompt: string,
  history: ChatMessage[] = [],
  includeSearch: boolean = false,
  options?: {
    provider?: 'gemini' | 'openrouter';
    model?: string;
    customApiKey?: string;
    customApiKeys?: string[];
    customModelName?: string;
  }
): Promise<{
  text: string;
  sources?: { uri: string; title: string }[];
  modelUsed?: string;
  provider?: 'gemini' | 'openrouter';
  reasoning?: string;
}> {
  try {
    const selectedModel = options?.model || getStoredAIModel();
    const isCustom = selectedModel === 'custom';
    const storedKeys = getStoredOpenRouterKeys();
    const customKeys = options?.customApiKeys || (storedKeys.length > 0 ? storedKeys : undefined);
    const customKey = options?.customApiKey || getStoredOpenRouterKey();
    const customName = options?.customModelName || getStoredCustomModelName();
    const provider = options?.provider || (selectedModel.includes('/') || isCustom ? 'openrouter' : 'gemini');

    const response = await fetchWithRetry(getApiUrl('/api/ai/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        history: history.map((h) => ({ role: h.role, content: h.content })),
        includeSearch,
        provider,
        model: selectedModel,
        customApiKey: customKey || undefined,
        customApiKeys: customKeys,
        customModelName: customName || undefined,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.details || data.error || `Server error: ${response.status}`);
    }

    return {
      text: data.text || 'কোনো উত্তর পাওয়া যায়নি। আবার চেষ্টা করুন।',
      sources: data.sources,
      modelUsed: data.modelUsed,
      provider: data.provider,
      reasoning: data.reasoning,
    };
  } catch (error: any) {
    console.error('AI chat failed:', error);
    return {
      text: `দুঃখিত, AI সংযোগে সমস্যা হয়েছে:\n\n*${error.message || error}*\n\nদয়া করে আপনার API Key অথবা নির্বাচিত মডেল যাচাই করুন।`,
    };
  }
}

export async function askGeminiMentorStream(
  prompt: string,
  history: ChatMessage[] = [],
  includeSearch: boolean = false,
  options?: {
    provider?: 'gemini' | 'openrouter';
    model?: string;
    customApiKey?: string;
    customApiKeys?: string[];
    customModelName?: string;
  },
  onChunk?: (deltaText: string, deltaReasoning: string, fullText: string, fullReasoning: string) => void
): Promise<{
  text: string;
  sources?: { uri: string; title: string }[];
  modelUsed?: string;
  provider?: 'gemini' | 'openrouter';
  reasoning?: string;
}> {
  let accumulatedText = '';
  let accumulatedReasoning = '';
  let modelUsed: string | undefined;
  let providerUsed: 'gemini' | 'openrouter' | undefined;
  let sources: { uri: string; title: string }[] | undefined;

  try {
    const selectedModel = options?.model || getStoredAIModel();
    const isCustom = selectedModel === 'custom';
    const storedKeys = getStoredOpenRouterKeys();
    const customKeys = options?.customApiKeys || (storedKeys.length > 0 ? storedKeys : undefined);
    const customKey = options?.customApiKey || getStoredOpenRouterKey();
    const customName = options?.customModelName || getStoredCustomModelName();
    const provider = options?.provider || (selectedModel.includes('/') || isCustom ? 'openrouter' : 'gemini');

    const response = await fetch(getApiUrl('/api/ai/chat'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        prompt,
        history: history.map((h) => ({ role: h.role, content: h.content })),
        includeSearch,
        provider,
        model: selectedModel,
        customApiKey: customKey || undefined,
        customApiKeys: customKeys,
        customModelName: customName || undefined,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || `Server error: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream') || !response.body) {
      // Fallback to normal JSON parse
      const data = await response.json();
      return {
        text: data.text || 'কোনো উত্তর পাওয়া যায়নি।',
        sources: data.sources,
        modelUsed: data.modelUsed,
        provider: data.provider,
        reasoning: data.reasoning,
      };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              accumulatedText += parsed.text;
            }
            if (parsed.reasoning) {
              accumulatedReasoning += parsed.reasoning;
            }
            if (parsed.modelUsed) {
              modelUsed = parsed.modelUsed;
            }
            if (parsed.provider) {
              providerUsed = parsed.provider;
            }
            if (parsed.sources) {
              sources = parsed.sources;
            }

            if (onChunk && (parsed.text || parsed.reasoning)) {
              onChunk(parsed.text || '', parsed.reasoning || '', accumulatedText, accumulatedReasoning);
            }
          } catch (e: any) {
            if (e.message && e.message !== 'Unexpected end of JSON input') {
              console.warn('SSE chunk parse error:', e);
            }
          }
        }
      }
    }

    return {
      text: accumulatedText || 'কোনো উত্তর পাওয়া যায়নি। আবার চেষ্টা করুন।',
      reasoning: accumulatedReasoning || undefined,
      sources,
      modelUsed,
      provider: providerUsed,
    };
  } catch (error: any) {
    console.error('AI streaming chat failed:', error);
    if (accumulatedText.length > 0) {
      return {
        text: accumulatedText,
        reasoning: accumulatedReasoning || undefined,
        modelUsed,
        provider: providerUsed,
      };
    }
    return {
      text: `দুঃখিত, AI সংযোগে সমস্যা হয়েছে:\n\n*${error.message || error}*\n\nদয়া করে আপনার API Key অথবা নির্বাচিত মডেল যাচাই করুন।`,
    };
  }
}

export async function solveQuestionFromPhoto(
  base64Image: string,
  mimeType: string = 'image/jpeg',
  options?: {
    provider?: 'gemini' | 'openrouter';
    model?: string;
    customApiKey?: string;
    customApiKeys?: string[];
    customModelName?: string;
  }
): Promise<{ solution: string; detectedQuestion?: string; latexFormula?: string; modelUsed?: string }> {
  try {
    const selectedModel = options?.model || getStoredAIModel();
    const isCustom = selectedModel === 'custom';
    const storedKeys = getStoredOpenRouterKeys();
    const customKeys = options?.customApiKeys || (storedKeys.length > 0 ? storedKeys : undefined);
    const customKey = options?.customApiKey || getStoredOpenRouterKey();
    const customName = options?.customModelName || getStoredCustomModelName();
    const provider = options?.provider || (selectedModel.includes('/') || isCustom ? 'openrouter' : 'gemini');

    const response = await fetchWithRetry(getApiUrl('/api/ai/solve-photo'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Image,
        mimeType,
        provider,
        model: selectedModel,
        customApiKey: customKey || undefined,
        customApiKeys: customKeys,
        customModelName: customName || undefined,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.details || data.error || `Server error: ${response.status}`);
    }

    return {
      solution: data.solution || 'সমাধান তৈরি করা যায়নি।',
      detectedQuestion: data.detectedQuestion,
      latexFormula: data.latexFormula,
      modelUsed: data.modelUsed,
    };
  } catch (error: any) {
    console.error('Photo solver failed:', error);
    return {
      solution: `ছবিটি প্রক্রিয়া করতে সমস্যা হয়েছে: ${error.message || ''}। অনুগ্রহ করে আবার চেষ্টা করুন বা অন্য মডেল নির্বাচন করুন।`,
    };
  }
}

export async function getQuestionInsight(question: Question): Promise<string> {
  try {
    const response = await fetchWithRetry(getApiUrl('/api/ai/explain-question'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.explanation;
    }
  } catch (e) {
    console.error('Question insight error:', e);
  }
  return question.explanation;
}

// ---------------- Chat History API ----------------

export async function fetchChatHistoryApi(): Promise<ChatMessage[]> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetchWithRetry(
      getApiUrl('/api/ai/history'),
      { headers },
      { maxRetries: 1, timeoutMs: 8000 }
    );
    if (!response.ok) return [];

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return [];
    }

    const data = await response.json();
    return (data.history || []).map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      modelUsed: msg.modelUsed,
      provider: msg.provider,
      timestamp: msg.timestamp || Date.now(),
    }));
  } catch (err: any) {
    if (err?.name !== 'AbortError' && !err?.message?.includes('aborted')) {
      console.warn('Chat history fetch note:', err?.message || err);
    }
    return [];
  }
}

export async function saveChatMessageApi(message: {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
  provider?: 'gemini' | 'openrouter';
}): Promise<void> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    await fetchWithRetry(
      getApiUrl('/api/ai/history'),
      {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
      },
      { maxRetries: 1, timeoutMs: 6000 }
    );
  } catch (err: any) {
    if (err?.name !== 'AbortError' && !err?.message?.includes('aborted')) {
      console.warn('Could not persist chat message to SQLite:', err?.message || err);
    }
  }
}

export async function clearChatHistoryApi(): Promise<boolean> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetchWithRetry(
      getApiUrl('/api/ai/history'),
      {
        method: 'DELETE',
        headers,
      },
      { maxRetries: 1, timeoutMs: 6000 }
    );
    return res.ok;
  } catch (err: any) {
    if (err?.name !== 'AbortError' && !err?.message?.includes('aborted')) {
      console.warn('Failed to clear chat history:', err?.message || err);
    }
    return false;
  }
}

// ---------------- Knowledge Snippets API ----------------

export async function fetchKnowledgeSnippets(): Promise<KnowledgeSnippet[]> {
  try {
    const response = await fetchWithRetry(getApiUrl('/api/knowledge-snippets'));
    if (!response.ok) {
      return INITIAL_KNOWLEDGE_SNIPPETS;
    }
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return INITIAL_KNOWLEDGE_SNIPPETS;
  } catch (e) {
    return INITIAL_KNOWLEDGE_SNIPPETS;
  }
}

// ---------------- Admin Control Center & AI Staging API Client ----------------

export async function fetchAdminStatsApi(): Promise<AdminSystemStats> {
  const res = await fetchWithRetry(getApiUrl('/api/admin/stats'), {
    headers: getAdminAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'পরিসংখ্যান লোড করতে ব্যর্থ');
  return data.stats;
}

export async function fetchAdminKeysApi(): Promise<AdminApiKeyConfig[]> {
  const res = await fetchWithRetry(getApiUrl('/api/admin/keys'), {
    headers: getAdminAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'এপিআই কী তালিকা লোড করতে ব্যর্থ');
  return data.keys || [];
}

export async function revealAdminKeyApi(id: string): Promise<string> {
  const res = await fetchWithRetry(getApiUrl('/api/admin/keys/reveal'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reveal key');
  return data.key;
}

export async function saveAdminKeysApi(keys: AdminApiKeyConfig[]): Promise<{ success: boolean; message: string }> {
  const res = await fetchWithRetry(getApiUrl('/api/admin/keys'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ keys }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'এপিআই কী সংরক্ষণ করতে ব্যর্থ');
  return data;
}

export async function setAdminPrimaryKeyApi(id: string): Promise<{ success: boolean; message: string; primaryKeyId: string }> {
  const res = await fetchWithRetry(getApiUrl('/api/admin/keys/set-primary'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'প্রাইমারি কী সেট করতে ব্যর্থ');
  return data;
}

export async function fetchAdminAIConfigApi(): Promise<{
  preferredModel: string;
  autoFailoverEnabled: boolean;
  primaryKeyId: string | null;
  primaryKeyLabel: string | null;
  totalKeys: number;
}> {
  const res = await fetchWithRetry(getApiUrl('/api/admin/ai-config'), {
    headers: getAdminAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'AI কনফিগারেশন লোড করতে ব্যর্থ');
  return data.config;
}

export async function updateAdminAIConfigApi(config: {
  preferredModel?: string;
  autoFailoverEnabled?: boolean;
  primaryKeyId?: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetchWithRetry(getApiUrl('/api/admin/ai-config'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(config),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'AI কনফিগারেশন আপডেট করতে ব্যর্থ');
  return data;
}

export async function testAdminKeyApi(params: { key?: string; id?: string }): Promise<{
  success: boolean;
  status: 'active' | 'rate_limited' | 'error';
  latencyMs: number;
  statusCode?: number;
  message?: string;
  error?: string;
}> {
  const res = await fetchWithRetry(getApiUrl('/api/admin/keys/test'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(params),
  });
  const data = await res.json();
  return data;
}

export async function fetchAdminDraftsApi(filters?: {
  status?: string;
  type?: string;
  search?: string;
}): Promise<AdminDraftItem[]> {
  const query = new URLSearchParams();
  if (filters?.status) query.append('status', filters.status);
  if (filters?.type) query.append('type', filters.type);
  if (filters?.search) query.append('search', filters.search);

  const res = await fetchWithRetry(getApiUrl(`/api/admin/drafts?${query.toString()}`), {
    headers: getAdminAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'ড্রাফট লোড করতে ব্যর্থ');
  return data.drafts || [];
}

export async function createAdminDraftApi(draft: {
  type: string;
  payload: any;
  source_model?: string;
  source_info?: string;
  status?: string;
}): Promise<AdminDraftItem> {
  const res = await fetchWithRetry(getApiUrl('/api/admin/drafts'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(draft),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'ড্রাফট সংরক্ষণ ব্যর্থ');
  return data.draft;
}

export async function updateAdminDraftApi(id: string, payload: any, status?: string): Promise<AdminDraftItem> {
  const res = await fetchWithRetry(getApiUrl(`/api/admin/drafts/${id}`), {
    method: 'PUT',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ payload, status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'ড্রাফট আপডেট ব্যর্থ');
  return data.draft;
}

export async function deleteAdminDraftApi(id: string): Promise<boolean> {
  const res = await fetchWithRetry(getApiUrl(`/api/admin/drafts/${id}`), {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'ড্রাফট মুছতে ব্যর্থ');
  return true;
}

export async function publishAdminDraftApi(id: string): Promise<{
  success: boolean;
  publishedItem: any;
  draft: AdminDraftItem;
}> {
  const res = await fetchWithRetry(getApiUrl(`/api/admin/drafts/${id}/publish`), {
    method: 'POST',
    headers: getAdminAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'ড্রাফট প্রকাশ করতে ব্যর্থ');
  return data;
}

export async function batchPublishAdminDraftsApi(ids: string[]): Promise<{
  success: boolean;
  approvedCount: number;
  errors: any[];
}> {
  const res = await fetchWithRetry(getApiUrl('/api/admin/drafts/batch-publish'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'ব্যাচ প্রকাশ ব্যর্থ');
  return data;
}

export async function batchRejectAdminDraftsApi(ids: string[]): Promise<{
  success: boolean;
  rejectedCount: number;
}> {
  const res = await fetchWithRetry(getApiUrl('/api/admin/drafts/batch-reject'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'ব্যাচ বাতিল ব্যর্থ');
  return data;
}

export async function runAdminAiExtractApi(params: {
  content?: string;
  image?: string;
  type: string;
  subject_id?: string;
  chapter_id?: string;
  model?: string;
  promptNotes?: string;
}): Promise<{
  success: boolean;
  message: string;
  count: number;
  drafts: AdminDraftItem[];
  reasoning?: string;
}> {
  const res = await fetchWithRetry(getApiUrl('/api/admin/extract'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'AI নিষ্কাশন ব্যর্থ হয়েছে');
  return data;
}

export async function fetchOpenRouterSystemHealthApi(): Promise<OpenRouterSystemHealthResponse> {
  const res = await fetchWithRetry(getApiUrl('/api/admin/health/openrouter'), {
    headers: getAdminAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'সিস্টেম হেলথ মেট্রিক লোড করতে ব্যর্থ');
  return data;
}

export async function reportQuestionApi(params: {
  questionId: string;
  question?: Question;
  reason: string;
  details?: string;
  userId?: string;
}): Promise<{ success: boolean; message: string; report_id?: string }> {
  const res = await fetchWithRetry(getApiUrl('/api/reports'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question_id: params.questionId,
      question: params.question,
      reason: params.reason,
      details: params.details,
      user_id: params.userId,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'রিপোর্ট জমা দেওয়া সম্ভব হয়নি');
  return data;
}

// ---------------- Real-time Active Users Telemetry API ----------------

export async function sendUserHeartbeatApi(payload: {
  page?: string;
  targetUniversity?: string;
  device?: string;
  sessionId?: string;
}): Promise<{ success: boolean; timestamp: number; totalActiveNow: number }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetchWithRetry(getApiUrl('/api/user/heartbeat'), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { success: false, timestamp: Date.now(), totalActiveNow: 0 };
    }
    return await res.json();
  } catch {
    return { success: false, timestamp: Date.now(), totalActiveNow: 0 };
  }
}

export async function fetchAdminActiveUsersApi(): Promise<ActiveUsersResponse> {
  const res = await fetchWithRetry(getApiUrl('/api/admin/active-users'), {
    headers: getAdminAuthHeaders(),
  });
  
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    if (text.includes('<!doctype') || text.includes('<html')) {
      throw new Error(`সার্ভার সংযোগ ত্রুটি (${res.status}): API রুট পাওয়া যায়নি বা ব্যাকএন্ডে সংযোগ বিঘ্নিত হয়েছে`);
    }
    throw new Error(`অপ্রত্যাশিত ডেটা ফরম্যাট (${res.status})`);
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'সক্রিয় ব্যবহারকারীদের তথ্য লোড করতে ব্যর্থ হয়েছে');
  }
  return data;
}

// ---------------- 4-Layer Database Normalization & Topic Healing API ----------------

export interface DatabaseHealResult {
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
}

export async function healAndSyncDatabaseApi(): Promise<DatabaseHealResult> {
  const res = await fetchWithRetry(getApiUrl('/api/admin/heal-database'), {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'ডেটাবেজ নরম্যালাইজেশন ও সিঙ্ক ব্যর্থ হয়েছে');
  }
  return data;
}

export async function fetchTopicStatsApi(): Promise<{
  success: boolean;
  totalTopics: number;
  totalQuestions: number;
  categoryDistribution: Record<string, number>;
  topics: Array<TopicRecord>;
}> {
  const res = await fetchWithRetry(getApiUrl('/api/topics/stats'));
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'টপিক পরিসংখ্যান লোড করতে ব্যর্থ');
  }
  return data;
}




