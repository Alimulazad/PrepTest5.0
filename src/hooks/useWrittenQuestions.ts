import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseInfiniteQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import {
  WrittenQuestion,
  WrittenQuestionFilters,
  WrittenQuestionsPaginatedResponse,
  CreateWrittenQuestionInput,
  UpdateWrittenQuestionInput,
} from '../types';
import { getApiUrl, getAdminToken } from '../services/api';
import { fetchWithRetry } from '../utils/apiClient';

// ==========================================
// 1. QUERY KEYS FACTORY
// ==========================================
export const writtenQuestionKeys = {
  all: ['written-questions'] as const,
  lists: () => [...writtenQuestionKeys.all, 'list'] as const,
  list: (filters: WrittenQuestionFilters = {}) => [...writtenQuestionKeys.lists(), filters] as const,
  infinite: (filters: Omit<WrittenQuestionFilters, 'page'> = {}) =>
    [...writtenQuestionKeys.all, 'infinite', filters] as const,
  details: () => [...writtenQuestionKeys.all, 'detail'] as const,
  detail: (id: string) => [...writtenQuestionKeys.details(), id] as const,
};

// ==========================================
// 2. HELPER FUNCTIONS FOR API REQUESTS
// ==========================================
function buildWrittenQuestionsUrl(filters: WrittenQuestionFilters = {}): string {
  const query = new URLSearchParams();
  if (filters.subject_id) query.append('subject_id', filters.subject_id);
  if (filters.chapter_id) query.append('chapter_id', filters.chapter_id);
  if (filters.topic_id) query.append('topic_id', filters.topic_id);
  if (filters.paper) query.append('paper', filters.paper);
  if (filters.category) query.append('category', filters.category);
  if (filters.difficulty) query.append('difficulty', filters.difficulty);
  if (filters.tag) query.append('tag', filters.tag);
  if (filters.search) query.append('search', filters.search);
  if (filters.cursor) query.append('cursor', filters.cursor);
  if (filters.page !== undefined) query.append('page', String(filters.page));
  if (filters.limit !== undefined) query.append('limit', String(filters.limit));

  const queryString = query.toString();
  return getApiUrl(`/api/written-questions${queryString ? `?${queryString}` : ''}`);
}

function getAdminAuthHeaders(isFormData = false): Record<string, string> {
  const token = getAdminToken();
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Fetch single list or paginated response
export async function fetchWrittenQuestions(
  filters: WrittenQuestionFilters = {}
): Promise<WrittenQuestionsPaginatedResponse> {
  const url = buildWrittenQuestionsUrl(filters);
  const res = await fetchWithRetry(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch written questions (${res.status})`);
  }

  const data = await res.json();

  // If the server returns an array directly (unpaginated query)
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

// Fetch single written question
export async function fetchWrittenQuestionById(id: string): Promise<WrittenQuestion> {
  if (!id) throw new Error('Question ID is required');

  const res = await fetchWithRetry(getApiUrl(`/api/written-questions/${id}`), {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Written question with ID ${id} not found (${res.status})`);
  }

  return res.json();
}

// Create written question (Admin)
export async function createWrittenQuestionApi(
  input: CreateWrittenQuestionInput,
  files?: { questionImageFile?: File | null; explanationImageFile?: File | null }
): Promise<WrittenQuestion> {
  let res: Response;

  if (files?.questionImageFile || files?.explanationImageFile) {
    const formData = new FormData();
    Object.entries(input).forEach(([key, val]) => {
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

    res = await fetchWithRetry(getApiUrl('/api/written-questions'), {
      method: 'POST',
      headers: getAdminAuthHeaders(true),
      body: formData,
    });
  } else {
    res = await fetchWithRetry(getApiUrl('/api/written-questions'), {
      method: 'POST',
      headers: getAdminAuthHeaders(false),
      body: JSON.stringify(input),
    });
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to create written question (${res.status})`);
  }

  return res.json();
}

// Update written question (Admin)
export async function updateWrittenQuestionApi(
  id: string,
  input: UpdateWrittenQuestionInput,
  files?: { questionImageFile?: File | null; explanationImageFile?: File | null }
): Promise<WrittenQuestion> {
  let res: Response;

  if (files?.questionImageFile || files?.explanationImageFile) {
    const formData = new FormData();
    Object.entries(input).forEach(([key, val]) => {
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

    res = await fetchWithRetry(getApiUrl(`/api/written-questions/${id}`), {
      method: 'PUT',
      headers: getAdminAuthHeaders(true),
      body: formData,
    });
  } else {
    res = await fetchWithRetry(getApiUrl(`/api/written-questions/${id}`), {
      method: 'PUT',
      headers: getAdminAuthHeaders(false),
      body: JSON.stringify(input),
    });
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to update written question (${res.status})`);
  }

  return res.json();
}

// Delete written question (Admin)
export async function deleteWrittenQuestionApi(
  id: string
): Promise<{ success: boolean; id: string }> {
  const res = await fetchWithRetry(getApiUrl(`/api/written-questions/${id}`), {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to delete written question (${res.status})`);
  }

  return res.json();
}

// ==========================================
// 3. TANSTACK REACT QUERY HOOKS
// ==========================================

/**
 * Hook to fetch paginated or filtered written questions with automatic caching.
 * @param filters Query filters (subject_id, chapter_id, topic_id, paper, difficulty, page, limit, search)
 * @param options Additional TanStack React Query options
 */
export function useWrittenQuestions(
  filters: WrittenQuestionFilters = {},
  options?: Omit<UseQueryOptions<WrittenQuestionsPaginatedResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<WrittenQuestionsPaginatedResponse, Error>({
    queryKey: writtenQuestionKeys.list(filters),
    queryFn: () => fetchWrittenQuestions(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes fresh data
    gcTime: 1000 * 60 * 30, // 30 minutes in garbage collection cache
    placeholderData: (previousData) => previousData, // Smooth pagination transitions
    ...options,
  });
}

/**
 * Hook for infinite scrolling of written questions.
 * @param filters Query filters excluding `page`
 * @param limit Items per page (default: 15)
 */
export function useInfiniteWrittenQuestions(
  filters: Omit<WrittenQuestionFilters, 'page' | 'cursor'> = {},
  limit = 15,
  options?: Omit<
    UseInfiniteQueryOptions<
      WrittenQuestionsPaginatedResponse,
      Error,
      WrittenQuestionsPaginatedResponse,
      readonly unknown[],
      string | number | undefined
    >,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
) {
  return useInfiniteQuery<
    WrittenQuestionsPaginatedResponse,
    Error,
    WrittenQuestionsPaginatedResponse,
    readonly unknown[],
    string | number | undefined
  >({
    queryKey: writtenQuestionKeys.infinite({ ...filters, limit }),
    queryFn: ({ pageParam }) => {
      if (typeof pageParam === 'string' && pageParam.length > 0) {
        return fetchWrittenQuestions({ ...filters, cursor: pageParam, limit });
      }
      const pageNum = typeof pageParam === 'number' ? pageParam : 1;
      return fetchWrittenQuestions({ ...filters, page: pageNum, limit });
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

/**
 * Hook to fetch a single written question by its ID.
 * @param id The question ID
 */
export function useWrittenQuestion(
  id: string | undefined,
  options?: Omit<UseQueryOptions<WrittenQuestion, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<WrittenQuestion, Error>({
    queryKey: writtenQuestionKeys.detail(id || ''),
    queryFn: () => fetchWrittenQuestionById(id!),
    enabled: Boolean(id && id.trim().length > 0),
    staleTime: 1000 * 60 * 10, // 10 minutes cache for single question
    gcTime: 1000 * 60 * 60,
    ...options,
  });
}

/**
 * Admin hook to create a new written question.
 * Automatically invalidates query caches upon success.
 */
export function useCreateWrittenQuestion(
  options?: UseMutationOptions<
    WrittenQuestion,
    Error,
    CreateWrittenQuestionInput | { input: CreateWrittenQuestionInput; files?: { questionImageFile?: File | null; explanationImageFile?: File | null } }
  >
) {
  const queryClient = useQueryClient();

  return useMutation<
    WrittenQuestion,
    Error,
    CreateWrittenQuestionInput | { input: CreateWrittenQuestionInput; files?: { questionImageFile?: File | null; explanationImageFile?: File | null } }
  >({
    mutationFn: (param) => {
      if ('input' in param) {
        return createWrittenQuestionApi(param.input, param.files);
      }
      return createWrittenQuestionApi(param);
    },
    ...options,
    onSuccess: (newQuestion, variables, context) => {
      // Invalidate all written questions list queries
      queryClient.invalidateQueries({ queryKey: writtenQuestionKeys.all });
      (options?.onSuccess as any)?.(newQuestion, variables, context);
    },
  });
}

/**
 * Admin hook to update an existing written question.
 * Updates the single item cache and invalidates list caches.
 */
export function useUpdateWrittenQuestion(
  options?: UseMutationOptions<
    WrittenQuestion,
    Error,
    { id: string; input: UpdateWrittenQuestionInput; files?: { questionImageFile?: File | null; explanationImageFile?: File | null } }
  >
) {
  const queryClient = useQueryClient();

  return useMutation<
    WrittenQuestion,
    Error,
    { id: string; input: UpdateWrittenQuestionInput; files?: { questionImageFile?: File | null; explanationImageFile?: File | null } }
  >({
    mutationFn: ({ id, input, files }) => updateWrittenQuestionApi(id, input, files),
    ...options,
    onSuccess: (updatedQuestion, variables, context) => {
      // Update individual item cache
      queryClient.setQueryData(
        writtenQuestionKeys.detail(variables.id),
        updatedQuestion
      );
      // Invalidate all list queries
      queryClient.invalidateQueries({ queryKey: writtenQuestionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: writtenQuestionKeys.all });
      (options?.onSuccess as any)?.(updatedQuestion, variables, context);
    },
  });
}

/**
 * Admin hook to delete a written question.
 * Cleans up cache and invalidates lists upon success.
 */
export function useDeleteWrittenQuestion(
  options?: UseMutationOptions<{ success: boolean; id: string }, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; id: string }, Error, string>({
    mutationFn: (id: string) => deleteWrittenQuestionApi(id),
    ...options,
    onSuccess: (data, id, context) => {
      // Remove detail from cache
      queryClient.removeQueries({ queryKey: writtenQuestionKeys.detail(id) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: writtenQuestionKeys.all });
      (options?.onSuccess as any)?.(data, id, context);
    },
  });
}
