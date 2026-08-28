/**
 * JACHAI Wikipedia Integration Service
 * Provides fast, verified, bi-lingual (Bengali/English) knowledge summaries with intelligent caching and search fallback.
 */

export interface WikiSummary {
  title: string;
  extract: string;
  description?: string;
  thumbnailUrl?: string;
  pageUrl: string;
  lang: 'bn' | 'en';
  isFallback: boolean;
  timestamp: number;
}

interface CacheEntry {
  data: WikiSummary | null;
  expiresAt: number;
}

// In-Memory cache with 24-hour TTL
const wikiCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 500;
const FETCH_TIMEOUT_MS = 4500; // 4.5 seconds timeout to prevent blocking

const USER_AGENT = 'PrepTestAdmissionApp/1.0 (alimulazad5@gmail.com; https://preptest.app)';

/**
 * Clean and normalize search query
 */
function cleanQueryString(query: string): string {
  return query
    .trim()
    .replace(/[?।!.,:;'"(){}\[\]]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Fetch with strict timeout and User-Agent
 */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json; charset=utf-8',
      },
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Perform OpenSearch on Wikipedia to find the exact page title if direct summary fails
 */
async function searchWikiPageTitle(query: string, lang: 'bn' | 'en'): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encoded}&limit=1&namespace=0&format=json`;
    const res = await fetchWithTimeout(searchUrl);
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;

    const data: any = await res.json();
    // OpenSearch format: [query, [titles], [descriptions], [urls]]
    if (Array.isArray(data) && Array.isArray(data[1]) && data[1].length > 0) {
      return data[1][0];
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Fetch single page summary from Wikipedia REST API
 */
async function fetchDirectSummary(title: string, lang: 'bn' | 'en'): Promise<WikiSummary | null> {
  try {
    const encoded = encodeURIComponent(title);
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
    const res = await fetchWithTimeout(url);

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }

    const data: any = await res.json();
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
  } catch (err) {
    return null;
  }
}

/**
 * Fetch Wikipedia summary with Bi-lingual Fallback (Bengali -> English) and Search Recovery
 */
export async function fetchWikipediaSummary(
  rawQuery: string,
  preferredLang: 'bn' | 'en' = 'bn'
): Promise<WikiSummary | null> {
  const query = cleanQueryString(rawQuery);
  if (!query || query.length < 2) return null;

  const cacheKey = `${preferredLang}:${query.toLowerCase()}`;
  const cached = wikiCache.get(cacheKey);

  // Return from in-memory cache if valid
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let summary: WikiSummary | null = null;

  try {
    // 1. Try direct summary in preferred language (default Bengali)
    summary = await fetchDirectSummary(query, preferredLang);

    // 2. If direct fails in Bengali, try OpenSearch in Bengali
    if (!summary && preferredLang === 'bn') {
      const searchTitle = await searchWikiPageTitle(query, 'bn');
      if (searchTitle && searchTitle !== query) {
        summary = await fetchDirectSummary(searchTitle, 'bn');
      }
    }

    // 3. If still nothing and was Bengali, fallback to English Wikipedia
    if (!summary && preferredLang === 'bn') {
      // Try direct English
      summary = await fetchDirectSummary(query, 'en');

      // Try English search if direct failed
      if (!summary) {
        const enSearchTitle = await searchWikiPageTitle(query, 'en');
        if (enSearchTitle && enSearchTitle !== query) {
          summary = await fetchDirectSummary(enSearchTitle, 'en');
        }
      }
    }

    // Manage Cache Size
    if (wikiCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = wikiCache.keys().next().value;
      if (oldestKey) wikiCache.delete(oldestKey);
    }

    // Save result (even if null, to avoid repetitive hammering for 30 mins)
    wikiCache.set(cacheKey, {
      data: summary,
      expiresAt: Date.now() + (summary ? CACHE_TTL_MS : 30 * 60 * 1000),
    });

    return summary;
  } catch (error) {
    console.error(`[WikipediaService] Failed to fetch for "${query}":`, error);
    return null;
  }
}

/**
 * Formatted prompt helper for AI Doubt Solver (RAG Context)
 */
export async function getWikipediaContextForPrompt(query: string): Promise<string | null> {
  try {
    const summary = await fetchWikipediaSummary(query, 'bn');
    if (!summary || !summary.extract) return null;

    return `[উইকিপিডিয়া ভেরিফাইড তথ্য (${summary.lang === 'bn' ? 'বাংলা' : 'ইংরেজি'} উইকিপিডিয়া - ${summary.title})]:\n${summary.extract}\nউৎস লিংক: ${summary.pageUrl}`;
  } catch {
    return null;
  }
}

/**
 * Intelligent topic & keyword extractor from user query / admission question
 */
export function extractLikelyWikiKeywords(prompt: string): string[] {
  if (!prompt || typeof prompt !== 'string') return [];

  const raw = prompt.trim();
  if (raw.length < 3) return [];

  const candidates: string[] = [];

  // 1. Quoted terms e.g. "কার্নোর চক্র" or 'Photoelectric effect'
  const quotedMatches = raw.match(/["'“‘]([^"'“”‘’]+)["'”’]/g);
  if (quotedMatches) {
    for (const q of quotedMatches) {
      const clean = cleanQueryString(q);
      if (clean.length >= 3 && !candidates.includes(clean)) {
        candidates.push(clean);
      }
    }
  }

  // 2. English scientific terms in Bengali text (e.g. "Carnot engine", "DNA replication", "Doppler effect", "Viscosity")
  const englishMatches = raw.match(/\b[A-Za-z][A-Za-z0-9\s-]{2,30}\b/g);
  if (englishMatches) {
    for (const em of englishMatches) {
      const clean = cleanQueryString(em);
      if (clean.length >= 3 && !['what', 'how', 'why', 'who', 'the', 'and', 'for', 'with', 'from', 'help', 'give', 'solve', 'calculate'].includes(clean.toLowerCase()) && !candidates.includes(clean)) {
        candidates.push(clean);
      }
    }
  }

  // 3. Bengali Question Question-Word Stripping
  // Remove common question prefixes, suffixes & fillers
  const stopWordsPattern = /(কীভাবে|কিভাবে|কাকে বলে|বলতে কী বোঝায়|বলতে কী বুঝায়|বলতে কি বুঝায়|বলতে কি বোঝায়|সংজ্ঞা দাও|সংজ্ঞা কী|মান কত|নির্ণয় করো|নির্ণয় কর|সমাধান করো|সমাধান দাও|শর্টকাট কী|শর্টকাট কৌশল|ব্যাখ্যা করো|ব্যাখ্যা দাও|পার্থক্য কী|পার্থক্য কি|বৈশিষ্ট্য কী|সূত্রটি কী|সূত্র কী|একক কী|মাত্রা কী|কত সালে|কোথায়|কোথায়|কোনটি|কেন|কী|কি|কার|কখন|বলো|বল|দাও|প্লিজ|ভাইয়া|স্যার|hsc|buet|du|medical|mcq)/gi;

  const cleanedBengali = raw
    .replace(stopWordsPattern, ' ')
    .replace(/[?।!.,:;'"(){}\[\]\\\/+\-*=<>#_@$%^&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If the entire cleaned query is a clean concise topic (2 to 40 chars)
  if (cleanedBengali.length >= 3 && cleanedBengali.length <= 40 && !candidates.includes(cleanedBengali)) {
    candidates.push(cleanedBengali);
  }

  // Split into words and grab 2-3 word compound phrases (most scientific concepts are 2-3 words in Bangla)
  const words = cleanedBengali.split(' ').filter((w) => w.length > 1);
  if (words.length >= 2 && words.length <= 5) {
    const fullPhrase = words.join(' ');
    if (!candidates.includes(fullPhrase)) {
      candidates.push(fullPhrase);
    }
  }

  // Add individual significant nouns (length >= 4)
  for (const w of words) {
    if (w.length >= 4 && !candidates.includes(w) && !['হলো', 'হবে', 'করলে', 'থাকে', 'আছে', 'ছিল', 'করে', 'একটি', 'কোনো'].includes(w)) {
      candidates.push(w);
    }
  }

  return candidates.slice(0, 3); // Max top 3 candidates for fast execution
}

export interface WikipediaRAGResult {
  contextText: string | null;
  sources: Array<{ uri: string; title: string; snippet?: string }>;
  detectedTopics: string[];
}

/**
 * Fast, non-blocking RAG enricher for AI Doubt Solver
 * Guaranteed to resolve quickly (max ~1200ms) with graceful fallback.
 */
export async function getEnrichedWikipediaRAG(prompt: string): Promise<WikipediaRAGResult> {
  const emptyResult: WikipediaRAGResult = {
    contextText: null,
    sources: [],
    detectedTopics: [],
  };

  try {
    const keywords = extractLikelyWikiKeywords(prompt);
    if (!keywords || keywords.length === 0) {
      return emptyResult;
    }

    // Wrap in a tight timeout (1400ms max) so user experience is snappy
    const ragPromise = (async (): Promise<WikipediaRAGResult> => {
      const validSummaries: WikiSummary[] = [];
      const sources: Array<{ uri: string; title: string; snippet?: string }> = [];
      const detectedTopics: string[] = [];

      for (const kw of keywords) {
        if (validSummaries.length >= 2) break; // Max 2 summaries per question
        const summary = await fetchWikipediaSummary(kw, 'bn');
        if (summary && summary.extract) {
          validSummaries.push(summary);
          detectedTopics.push(summary.title);
          sources.push({
            uri: summary.pageUrl,
            title: `উইকিপিডিয়া: ${summary.title}`,
            snippet: summary.extract.slice(0, 160) + '...',
          });
        }
      }

      if (validSummaries.length === 0) {
        return emptyResult;
      }

      const contextLines = validSummaries.map(
        (s) =>
          `[উইকিপিডিয়া যাচাইকৃত তথ্য (${s.lang === 'bn' ? 'বাংলা' : 'ইংরেজি'} - ${s.title})]:\n${s.extract}\nউৎস: ${s.pageUrl}`
      );

      return {
        contextText: `\n\n--- নির্ভরযোগ্য উইকিপিডিয়া তথ্যভাণ্ডার (Fact-Checked Context) ---\n${contextLines.join('\n\n')}\n--- উল্লেখিত বৈজ্ঞানিক তথ্যের সাথে সামঞ্জস্য রেখে নির্ভুল উত্তর নিশ্চিত করুন ---`,
        sources,
        detectedTopics,
      };
    })();

    // 1400ms fallback timeout
    const timeoutPromise = new Promise<WikipediaRAGResult>((resolve) =>
      setTimeout(() => resolve(emptyResult), 1400)
    );

    return await Promise.race([ragPromise, timeoutPromise]);
  } catch (error) {
    console.warn('[WikipediaService] RAG enrichment error (non-fatal):', error);
    return emptyResult;
  }
}
