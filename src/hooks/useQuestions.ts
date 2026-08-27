import {
  useQuery,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import { Question, QuestionFilters, QuestionsPaginatedResponse } from '../types';
import { getApiUrl } from '../services/api';
import { fetchWithRetry } from '../utils/apiClient';

// ==========================================
// 1. QUERY KEYS FACTORY
// ==========================================
export const questionKeys = {
  all: ['questions'] as const,
  lists: () => [...questionKeys.all, 'list'] as const,
  list: (filters: QuestionFilters = {}) => [...questionKeys.lists(), filters] as const,
  infinite: (filters: Omit<QuestionFilters, 'page' | 'cursor'> = {}) =>
    [...questionKeys.all, 'infinite', filters] as const,
  details: () => [...questionKeys.all, 'detail'] as const,
  detail: (id: string) => [...questionKeys.details(), id] as const,
};

// ==========================================
// 2. HELPER FUNCTIONS FOR API REQUESTS
// ==========================================
function buildQuestionsUrl(filters: QuestionFilters = {}): string {
  const query = new URLSearchParams();
  if (filters.subject_id) query.append('subject_id', filters.subject_id);
  if (filters.chapter_id) query.append('chapter_id', filters.chapter_id);
  if (filters.topic_id) query.append('topic_id', filters.topic_id);
  if (filters.paper) query.append('paper', filters.paper);
  if (filters.category) query.append('category', filters.category);
  if (filters.difficulty) query.append('difficulty', filters.difficulty);
  if (filters.tag) query.append('tag', filters.tag);
  if (filters.search) query.append('search', filters.search);
  if (filters.type) query.append('type', filters.type);
  if (filters.cursor) query.append('cursor', filters.cursor);
  if (filters.page !== undefined) query.append('page', String(filters.page));
  if (filters.limit !== undefined) query.append('limit', String(filters.limit));

  const queryString = query.toString();
  return getApiUrl(`/api/questions${queryString ? `?${queryString}` : ''}`);
}

export async function fetchQuestions(
  filters: QuestionFilters = {}
): Promise<QuestionsPaginatedResponse> {
  const url = buildQuestionsUrl(filters);
  const res = await fetchWithRetry(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch questions (${res.status})`);
  }

  const data = await res.json();

  if (Array.isArray(data)) {
    return {
      questions: data,
      total: data.length,
      nextCursor: null,
      hasMore: false,
      page: filters.page || 1,
      limit: filters.limit || data.length,
      totalPages: 1,
    };
  }

  return {
    questions: data.questions || [],
    total: data.total ?? data.questions?.length ?? 0,
    nextCursor: data.nextCursor ?? null,
    hasMore: Boolean(data.hasMore),
    page: data.page ?? filters.page ?? 1,
    limit: data.limit ?? filters.limit ?? 20,
    totalPages: data.totalPages ?? 1,
  };
}

export async function fetchQuestionById(id: string): Promise<Question> {
  if (!id) throw new Error('Question ID is required');

  const res = await fetchWithRetry(getApiUrl(`/api/questions/${id}`), {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Question with ID ${id} not found (${res.status})`);
  }

  return res.json();
}

// ==========================================
// 3. TANSTACK REACT QUERY HOOKS
// ==========================================

export function useQuestions(
  filters: QuestionFilters = {},
  options?: Omit<UseQueryOptions<QuestionsPaginatedResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<QuestionsPaginatedResponse, Error>({
    queryKey: questionKeys.list(filters),
    queryFn: () => fetchQuestions(filters),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

export function useInfiniteQuestions(
  filters: Omit<QuestionFilters, 'page' | 'cursor'> = {},
  limit = 20,
  options?: Omit<
    UseInfiniteQueryOptions<
      QuestionsPaginatedResponse,
      Error,
      QuestionsPaginatedResponse,
      readonly unknown[],
      string | number | undefined
    >,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
) {
  return useInfiniteQuery<
    QuestionsPaginatedResponse,
    Error,
    QuestionsPaginatedResponse,
    readonly unknown[],
    string | number | undefined
  >({
    queryKey: questionKeys.infinite({ ...filters, limit }),
    queryFn: ({ pageParam }) => {
      if (typeof pageParam === 'string' && pageParam.length > 0) {
        return fetchQuestions({ ...filters, cursor: pageParam, limit });
      }
      const pageNum = typeof pageParam === 'number' ? pageParam : 1;
      return fetchQuestions({ ...filters, page: pageNum, limit });
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      if (lastPage.nextCursor) {
        return lastPage.nextCursor;
      }
      const currentPage = lastPage.page ?? 1;
      const totalPages = lastPage.totalPages ?? 1;
      if (currentPage < totalPages) {
        return currentPage + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    ...options,
  });
}

export function useQuestion(
  id: string | undefined,
  options?: Omit<UseQueryOptions<Question, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Question, Error>({
    queryKey: questionKeys.detail(id || ''),
    queryFn: () => fetchQuestionById(id!),
    enabled: Boolean(id && id.trim().length > 0),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    ...options,
  });
}

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

export async function fetchQuestionCounts(filters?: {
  subject_id?: string;
  category?: string;
  chapter_id?: string;
}): Promise<QuestionCountsResponse> {
  const query = new URLSearchParams();
  if (filters?.subject_id) query.append('subject_id', filters.subject_id);
  if (filters?.category) query.append('category', filters.category);
  if (filters?.chapter_id) query.append('chapter_id', filters.chapter_id);

  const queryString = query.toString();
  const url = getApiUrl(`/api/questions/counts${queryString ? `?${queryString}` : ''}`);
  const res = await fetchWithRetry(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch question counts (${res.status})`);
  }

  return res.json();
}

export function useQuestionCounts(
  filters?: { subject_id?: string; category?: string; chapter_id?: string },
  options?: Omit<UseQueryOptions<QuestionCountsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<QuestionCountsResponse, Error>({
    queryKey: ['question-counts', filters],
    queryFn: () => fetchQuestionCounts(filters),
    staleTime: 1000 * 30, // 30s fresh
    gcTime: 1000 * 60 * 10,
    ...options,
  });
}

