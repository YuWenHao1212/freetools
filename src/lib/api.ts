export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface FetchApiOptions {
  timeout?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

const DIRECT_API_URL = process.env.NEXT_PUBLIC_API_URL!;

async function getUploadToken(
  action: string,
  captchaToken: string,
): Promise<string> {
  const res = await fetch("/api/upload-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-turnstile-token": captchaToken,
    },
    body: JSON.stringify({ action }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(
      data?.detail || "Failed to get upload token",
      res.status,
    );
  }

  const { token } = await res.json();
  return token;
}

interface DirectApiOptions extends FetchApiOptions {
  action: string;
  captchaToken: string;
}

export async function fetchDirectApi(
  path: string,
  body: FormData | string | null,
  options: DirectApiOptions,
): Promise<Response> {
  const { action, captchaToken, timeout = 120000, signal } = options;

  const token = await getUploadToken(action, captchaToken);
  const url = `${DIRECT_API_URL}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const combinedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;

  try {
    const fetchHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (typeof body === "string") {
      fetchHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method: "POST",
      body,
      signal: combinedSignal,
      headers: fetchHeaders,
    });

    clearTimeout(timeoutId);

    if (response.status === 503) {
      throw new ApiError("SERVER_WARMING_UP", 503);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const message =
        errorData?.detail || `Request failed (${response.status})`;
      throw new ApiError(message, response.status);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("REQUEST_TIMEOUT", 408);
    }
    const msg =
      error instanceof Error ? error.message : "Unknown error";
    throw new ApiError(`Network error: ${msg}`, 0);
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timeoutId = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeoutId);
      reject(signal.reason);
    }, { once: true });
  });
}

interface WarmupRetryOptions extends FetchApiOptions {
  maxWarmupRetries?: number;
  warmupDelayMs?: number;
  onWarmupRetry?: (attempt: number, maxRetries: number) => void;
}

export async function fetchApiWithWarmupRetry(
  path: string,
  body: FormData | string | null,
  options: WarmupRetryOptions = {},
): Promise<Response> {
  const {
    maxWarmupRetries = 3,
    warmupDelayMs = 5000,
    onWarmupRetry,
    ...fetchOptions
  } = options;

  for (let attempt = 0; attempt <= maxWarmupRetries; attempt++) {
    try {
      return await fetchApi(path, body, fetchOptions);
    } catch (error) {
      const isWarmup =
        error instanceof ApiError && error.message === "SERVER_WARMING_UP";
      if (isWarmup && attempt < maxWarmupRetries) {
        onWarmupRetry?.(attempt + 1, maxWarmupRetries);
        try {
          await delay(warmupDelayMs, fetchOptions.signal);
        } catch {
          throw new ApiError("REQUEST_TIMEOUT", 408);
        }
        continue;
      }
      throw error;
    }
  }

  throw new ApiError("SERVER_WARMING_UP", 503);
}

export async function fetchApi(
  path: string,
  body: FormData | string | null,
  options: FetchApiOptions = {},
): Promise<Response> {
  const { timeout = 120000, signal, headers: extraHeaders } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const combinedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;

  try {
    const fetchHeaders: Record<string, string> = { ...extraHeaders };

    if (typeof body === "string") {
      fetchHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(path, {
      method: "POST",
      body,
      signal: combinedSignal,
      headers: Object.keys(fetchHeaders).length > 0 ? fetchHeaders : undefined,
    });

    clearTimeout(timeoutId);

    if (response.status === 503) {
      throw new ApiError("SERVER_WARMING_UP", 503);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const message =
        errorData?.detail || `Request failed (${response.status})`;
      throw new ApiError(message, response.status);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("REQUEST_TIMEOUT", 408);
    }
    throw new ApiError("Network error. Please check your connection.", 0);
  }
}
