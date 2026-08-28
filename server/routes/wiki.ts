import { Router, Request, Response as ExpressResponse } from 'express';

export const wikiRouter = Router();

// Constant Wikipedia API User-Agent complying with Wikimedia API policy
// Format: <client name>/<version> (<contact information>)
const WIKIPEDIA_USER_AGENT = 'PrepTestAdmissionApp/1.0 (alimulazad5@gmail.com; https://preptest.app)';
const FETCH_TIMEOUT_MS = 5000; // 5 seconds timeout

export interface WikiSummaryPayload {
  title: string;
  extract: string;
  description?: string;
  thumbnailUrl?: string;
  pageUrl: string;
  lang: 'bn' | 'en';
  isFallback: boolean;
  timestamp: number;
}

// In-Memory cache for speed and to respect Wikimedia rate limits
interface CacheEntry {
  data: WikiSummaryPayload | null;
  expiresAt: number;
}
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours TTL
const MAX_CACHE_SIZE = 600;

/**
 * Clean & normalize topic string
 */
function sanitizeTopic(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[?।!.,:;'"(){}\[\]\\\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Safe backend fetcher with User-Agent, custom headers, and AbortController timeout
 */
async function fetchWikiEndpoint(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': WIKIPEDIA_USER_AGENT,
        'Accept': 'application/json; charset=utf-8',
      },
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch direct page summary from Wikipedia REST API
 * Validates Content-Type header to avoid parsing HTML as JSON
 */
async function fetchDirectPageSummary(title: string, lang: 'bn' | 'en'): Promise<WikiSummaryPayload | null> {
  try {
    const encoded = encodeURIComponent(title);
    const endpoint = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
    const res = await fetchWikiEndpoint(endpoint);

    // If 404 or non-success status, return null so fallback can activate
    if (!res.ok) {
      return null;
    }

    // Safety Check: Verify Content-Type is JSON before parsing
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.warn(`[WikiProxy] Received unexpected non-JSON content-type "${contentType}" for "${title}" (${lang})`);
      return null;
    }

    const data: any = await res.json();

    // Disambiguation or empty extract pages are not helpful as direct summaries
    if (!data || !data.extract || data.type === 'disambiguation') {
      return null;
    }

    return {
      title: data.title || title,
      extract: data.extract,
      description: data.description,
      thumbnailUrl: data.thumbnail?.source || undefined,
      pageUrl: data.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encoded}`,
      lang,
      isFallback: lang === 'en',
      timestamp: Date.now(),
    };
  } catch (err: any) {
    console.warn(`[WikiProxy] Direct fetch error for "${title}" (${lang}):`, err?.message || err);
    return null;
  }
}

/**
 * Search Wikipedia OpenSearch API to find the canonical article title if the direct title failed
 */
async function searchWikiCanonicalTitle(query: string, lang: 'bn' | 'en'): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(query);
    const endpoint = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encoded}&limit=1&namespace=0&format=json`;
    const res = await fetchWikiEndpoint(endpoint);

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;

    const data: any = await res.json();
    // OpenSearch format: [query, [titles], [descriptions], [urls]]
    if (Array.isArray(data) && Array.isArray(data[1]) && data[1].length > 0 && typeof data[1][0] === 'string') {
      return data[1][0];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Core resolver for Wikipedia summary with bilingual fallback:
 * 1. Try Bengali direct summary
 * 2. Try Bengali OpenSearch canonical title
 * 3. Fallback to English direct summary
 * 4. Fallback to English OpenSearch canonical title
 */
export async function getResolvedWikiSummary(
  rawTitle: string,
  preferredLang: 'bn' | 'en' = 'bn'
): Promise<WikiSummaryPayload | null> {
  const cleanTitle = sanitizeTopic(rawTitle);
  if (!cleanTitle || cleanTitle.length < 2) return null;

  const cacheKey = `${preferredLang}:${cleanTitle.toLowerCase()}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let result: WikiSummaryPayload | null = null;

  try {
    // Step 1: Attempt direct summary in requested language
    result = await fetchDirectPageSummary(cleanTitle, preferredLang);

    // Step 2: If requested Bengali and failed, attempt Bengali OpenSearch title recovery
    if (!result && preferredLang === 'bn') {
      const searchTitle = await searchWikiCanonicalTitle(cleanTitle, 'bn');
      if (searchTitle && searchTitle !== cleanTitle) {
        result = await fetchDirectPageSummary(searchTitle, 'bn');
      }
    }

    // Step 3: Bilingual Fallback -> If Bengali returned 404 or empty, try English Wikipedia
    if (!result && preferredLang === 'bn') {
      result = await fetchDirectPageSummary(cleanTitle, 'en');

      // Step 4: If English direct failed, try English OpenSearch recovery
      if (!result) {
        const enSearchTitle = await searchWikiCanonicalTitle(cleanTitle, 'en');
        if (enSearchTitle) {
          result = await fetchDirectPageSummary(enSearchTitle, 'en');
        }
      }
    }

    // Cache management
    if (memoryCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) memoryCache.delete(oldestKey);
    }

    // Cache result (positive results for 12 hours, negative for 30 minutes to avoid repeated API hammering)
    memoryCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + (result ? CACHE_TTL_MS : 30 * 60 * 1000),
    });

    return result;
  } catch (error: any) {
    console.error(`[WikiProxy] Resolution failed for "${cleanTitle}":`, error?.message || error);
    return null;
  }
}

/**
 * GET /api/wiki/summary
 * Query Parameters:
 *   - title (or q / query): Topic title to search (string, required)
 *   - lang: Language code ('bn' | 'en', optional, default 'bn')
 */
wikiRouter.get('/summary', async (req: Request, res: ExpressResponse) => {
  try {
    const rawTitle = (req.query.title || req.query.q || req.query.query || '') as string;
    const requestedLang = (req.query.lang === 'en' ? 'en' : 'bn') as 'bn' | 'en';

    if (!rawTitle || rawTitle.trim().length === 0) {
      return res.status(400).json({
        found: false,
        error: 'Query parameter "title" or "q" is required.',
        extract: null,
      });
    }

    const summary = await getResolvedWikiSummary(rawTitle, requestedLang);

    if (!summary) {
      return res.status(404).json({
        found: false,
        message: 'উইকিপিডিয়ায় কোনো উপযুক্ত তথ্য পাওয়া যায়নি।',
        title: rawTitle,
        extract: null,
        data: null,
      });
    }

    return res.status(200).json({
      found: true,
      title: summary.title,
      extract: summary.extract,
      description: summary.description,
      thumbnailUrl: summary.thumbnailUrl,
      pageUrl: summary.pageUrl,
      lang: summary.lang,
      isFallback: summary.isFallback,
      data: summary, // Nested data object for full backwards-compatibility
    });
  } catch (error: any) {
    console.error('[WikiProxy] Route error in /api/wiki/summary:', error);
    return res.status(500).json({
      found: false,
      error: 'Failed to fetch Wikipedia summary from proxy service.',
      details: error?.message || 'Unknown server error',
      extract: null,
    });
  }
});
