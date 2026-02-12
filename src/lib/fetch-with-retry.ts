interface FetchWithRetryOptions {
  maxRetries?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
}

const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

function isRetryableError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const {
    maxRetries = 2,
    timeoutMs = 120_000,
    baseDelayMs = 1_000,
  } = options;

  const totalAttempts = maxRetries + 1;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < maxRetries) {
        const waitMs = baseDelayMs * 2 ** attempt;
        console.warn(
          `[fetchWithRetry] ${response.status} on attempt ${attempt + 1}/${totalAttempts}, retrying in ${waitMs}ms`,
        );
        await delay(waitMs);
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (isRetryableError(error) && attempt < maxRetries) {
        const waitMs = baseDelayMs * 2 ** attempt;
        const label = error instanceof DOMException ? "timeout" : "network error";
        console.warn(
          `[fetchWithRetry] ${label} on attempt ${attempt + 1}/${totalAttempts}, retrying in ${waitMs}ms`,
        );
        await delay(waitMs);
        continue;
      }

      throw error;
    }
  }

  // Unreachable — the loop always returns or throws
  throw new Error("[fetchWithRetry] unexpected: all attempts exhausted");
}
