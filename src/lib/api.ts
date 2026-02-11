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
      throw new ApiError("SERVER_WARMING_UP", 408);
    }
    throw new ApiError("Network error. Please check your connection.", 0);
  }
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
      throw new ApiError("SERVER_WARMING_UP", 408);
    }
    throw new ApiError("Network error. Please check your connection.", 0);
  }
}
