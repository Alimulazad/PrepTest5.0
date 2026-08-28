/**
 * Wikipedia Integration Frontend Service
 * Connects securely to the Express backend proxy (/api/wiki/summary)
 * Provides verified bi-lingual academic concepts, definitions, and formulas.
 */

export interface WikiSummaryData {
  title: string;
  extract: string;
  description?: string;
  thumbnailUrl?: string;
  pageUrl: string;
  lang: 'bn' | 'en';
  isFallback: boolean;
}

export interface WikiApiResponse {
  found: boolean;
  title?: string;
  extract?: string | null;
  description?: string;
  thumbnailUrl?: string;
  pageUrl?: string;
  lang?: 'bn' | 'en';
  isFallback?: boolean;
  data?: WikiSummaryData | null;
  error?: string;
  message?: string;
}

// Client-side in-memory cache to avoid duplicate network roundtrips
const clientWikiCache = new Map<string, { data: WikiSummaryData | null; timestamp: number }>();
const CLIENT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch a plain text summary string for any academic topic.
 * Returns the summary extract string or null if unavailable.
 *
 * @param topic Academic concept or formula name (e.g., 'কার্নো চক্র', 'আদর্শ গ্যাস', 'Doppler Effect')
 * @param lang Preferred language ('bn' for Bengali, 'en' for English). Default: 'bn'
 * @returns Promise<string | null>
 */
export async function fetchWikiSummary(topic: string, lang: 'bn' | 'en' = 'bn'): Promise<string | null> {
  const details = await fetchWikiSummaryDetails(topic, lang);
  return details ? details.extract : null;
}

/**
 * Fetch rich Wikipedia details (title, extract, thumbnail, link, fallback flag).
 * Safely validates HTTP status and content-type before JSON parsing to avoid HTML error crashes.
 *
 * @param topic Academic concept name
 * @param lang Preferred language ('bn' | 'en')
 * @returns Promise<WikiSummaryData | null>
 */
export async function fetchWikiSummaryDetails(
  topic: string,
  lang: 'bn' | 'en' = 'bn'
): Promise<WikiSummaryData | null> {
  if (!topic || typeof topic !== 'string') {
    return null;
  }

  const cleanTopic = topic.trim();
  if (cleanTopic.length < 2) {
    return null;
  }

  const cacheKey = `${lang}:${cleanTopic.toLowerCase()}`;
  const cached = clientWikiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const encodedTitle = encodeURIComponent(cleanTopic);
    const apiUrl = `/api/wiki/summary?title=${encodedTitle}&lang=${lang}`;

    // Use standard fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    }).finally(() => clearTimeout(timeoutId));

    // Handle 404 or non-OK response codes gracefully
    if (!response.ok) {
      if (response.status === 404) {
        clientWikiCache.set(cacheKey, { data: null, timestamp: Date.now() });
      }
      return null;
    }

    // Safety check: Ensure the response is JSON before calling response.json()
    // This prevents "Unexpected token '<', '<!doctype '... is not valid JSON" errors if the server returns an HTML fallback
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.warn(`[WikiService] Received non-JSON response (${contentType}) from proxy for "${cleanTopic}"`);
      return null;
    }

    const payload: WikiApiResponse = await response.json();

    if (!payload || !payload.found) {
      clientWikiCache.set(cacheKey, { data: null, timestamp: Date.now() });
      return null;
    }

    const summaryResult: WikiSummaryData = payload.data || {
      title: payload.title || cleanTopic,
      extract: payload.extract || '',
      description: payload.description,
      thumbnailUrl: payload.thumbnailUrl,
      pageUrl: payload.pageUrl || `https://${payload.lang || lang}.wikipedia.org/wiki/${encodedTitle}`,
      lang: payload.lang || lang,
      isFallback: Boolean(payload.isFallback),
    };

    clientWikiCache.set(cacheKey, { data: summaryResult, timestamp: Date.now() });
    return summaryResult;
  } catch (error: any) {
    // Network drops, aborts, or server restarts fail gracefully without interrupting UI flows
    console.warn(`[WikiService] Unable to fetch Wikipedia summary for "${cleanTopic}":`, error?.message || error);
    return null;
  }
}
