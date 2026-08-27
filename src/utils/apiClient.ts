/**
 * JACHAI Resilient API Client
 * Automatic exponential backoff retry, timeout handling, and network connectivity awareness.
 */

export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  timeoutMs?: number;
  retryOnStatusCodes?: number[];
  onRetry?: (attempt: number, error: any, delay: number) => void;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 800,
  maxDelayMs: 6000,
  backoffFactor: 2,
  timeoutMs: 25000,
  retryOnStatusCodes: [408, 429, 500, 502, 503, 504],
  onRetry: () => {},
};

/**
 * Check if an error is a transient network error that warrants a retry
 */
export function isTransientError(error: any): boolean {
  if (!error) return false;

  // Intentional aborts by caller or component unmount should NEVER be retried
  if (error.name === 'AbortError' || error.message?.includes('aborted')) {
    return false;
  }

  // Network failures / DNS errors / CORS drops / Browser offline
  if (error instanceof TypeError && error.message) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('failed to fetch') ||
      msg.includes('load failed')
    ) {
      return true;
    }
  }

  // DOMException Timeout Error
  if (error.name === 'TimeoutError' || error.message?.includes('timed out')) {
    return true;
  }

  // Offline navigator
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false; // don't rapidly spin retry if device has explicitly no network
  }

  return false;
}

/**
 * Calculate exponential delay with randomized ±20% jitter
 */
function calculateDelay(attempt: number, initial: number, factor: number, max: number): number {
  const base = Math.min(initial * Math.pow(factor, attempt), max);
  const jitter = base * 0.2 * (Math.random() * 2 - 1); // ±20%
  return Math.max(200, Math.round(base + jitter));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Custom resilient fetch wrapper with automatic retry and exponential backoff
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  customConfig?: RetryConfig
): Promise<Response> {
  const config: Required<RetryConfig> = {
    ...DEFAULT_RETRY_CONFIG,
    ...customConfig,
  };

  // If already aborted before even starting, reject cleanly
  if (init?.signal?.aborted) {
    throw new DOMException('Request was aborted prior to execution', 'AbortError');
  }

  let lastError: any = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    // Abort controller for per-request timeout
    const controller = new AbortController();
    let timeoutId: any = null;

    if (config.timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        try {
          controller.abort(new DOMException(`Request timed out after ${config.timeoutMs}ms`, 'TimeoutError'));
        } catch {
          controller.abort();
        }
      }, config.timeoutMs);
    }

    // Merge external signal if passed
    const onExternalAbort = () => {
      try {
        controller.abort(init?.signal?.reason || new DOMException('Operation aborted', 'AbortError'));
      } catch {
        controller.abort();
      }
    };

    if (init?.signal) {
      if (init.signal.aborted) {
        onExternalAbort();
      } else {
        init.signal.addEventListener('abort', onExternalAbort, { once: true });
      }
    }

    try {
      // Merge global headers including ngrok warning bypass
      const headers = new Headers(init?.headers || {});
      if (!headers.has('ngrok-skip-browser-warning')) {
        headers.set('ngrok-skip-browser-warning', 'true');
      }

      const response = await fetch(input, {
        ...init,
        headers,
        signal: controller.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);
      if (init?.signal) {
        init.signal.removeEventListener('abort', onExternalAbort);
      }

      // If response is OK or a client error not in retry status codes (e.g. 400, 401, 403, 404), return it immediately
      if (response.ok || !config.retryOnStatusCodes.includes(response.status)) {
        return response;
      }

      // 5xx Server Error or 429 Rate Limit encountered
      if (attempt < config.maxRetries) {
        let delay = calculateDelay(
          attempt,
          config.initialDelayMs,
          config.backoffFactor,
          config.maxDelayMs
        );

        // Check for Retry-After header if available
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          const parsedSeconds = parseInt(retryAfter, 10);
          if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
            delay = Math.min(parsedSeconds * 1000, config.maxDelayMs);
          }
        }

        config.onRetry(attempt + 1, new Error(`HTTP ${response.status}`), delay);
        await wait(delay);
        continue;
      }

      return response;
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      if (init?.signal) {
        init.signal.removeEventListener('abort', onExternalAbort);
      }
      lastError = err;

      // If intentionally aborted, do not retry
      if (init?.signal?.aborted || err.name === 'AbortError') {
        throw err;
      }

      if (attempt < config.maxRetries && isTransientError(err)) {
        const delay = calculateDelay(
          attempt,
          config.initialDelayMs,
          config.backoffFactor,
          config.maxDelayMs
        );
        config.onRetry(attempt + 1, err, delay);
        await wait(delay);
        continue;
      }

      throw err;
    }
  }

  throw lastError || new Error('Fetch retry limit exceeded');
}

/**
 * Health check utility to probe server reachability
 */
export async function probeServerHealth(serverUrl: string): Promise<boolean> {
  try {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const target = cleanUrl ? `${cleanUrl}/api/health` : '/api/health';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(target, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    return res.ok;
  } catch (e) {
    return false;
  }
}
