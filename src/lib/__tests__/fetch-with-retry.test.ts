import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithRetry } from "../fetch-with-retry";

const TEST_URL = "https://api.example.com/test";
const TEST_INIT: RequestInit = {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ foo: "bar" }),
};
const FAST_OPTIONS = { maxRetries: 2, timeoutMs: 5_000, baseDelayMs: 10 };

function jsonResponse(status: number, body: object = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("fetchWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(global, "fetch");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns response on first successful attempt", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const promise = fetchWithRetry(TEST_URL, TEST_INIT, FAST_OPTIONS);
    const response = await promise;

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 503 and succeeds on second attempt", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse(503))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const promise = fetchWithRetry(TEST_URL, TEST_INIT, FAST_OPTIONS);
    await vi.advanceTimersByTimeAsync(10);
    const response = await promise;

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it("retries on 502 and succeeds on second attempt", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse(502))
      .mockResolvedValueOnce(jsonResponse(200));

    const promise = fetchWithRetry(TEST_URL, TEST_INIT, FAST_OPTIONS);
    await vi.advanceTimersByTimeAsync(10);
    const response = await promise;

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("retries on 504 and succeeds on second attempt", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse(504))
      .mockResolvedValueOnce(jsonResponse(200));

    const promise = fetchWithRetry(TEST_URL, TEST_INIT, FAST_OPTIONS);
    await vi.advanceTimersByTimeAsync(10);
    const response = await promise;

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("retries on network error (TypeError) and succeeds", async () => {
    vi.mocked(global.fetch)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse(200));

    const promise = fetchWithRetry(TEST_URL, TEST_INIT, FAST_OPTIONS);
    await vi.advanceTimersByTimeAsync(10);
    const response = await promise;

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it("does not retry on 400", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(400, { detail: "Bad request" }));

    const response = await fetchWithRetry(TEST_URL, TEST_INIT, FAST_OPTIONS);

    expect(response.status).toBe(400);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("does not retry on 404", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(404));

    const response = await fetchWithRetry(TEST_URL, TEST_INIT, FAST_OPTIONS);

    expect(response.status).toBe(404);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry on 429", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(429));

    const response = await fetchWithRetry(TEST_URL, TEST_INIT, FAST_OPTIONS);

    expect(response.status).toBe(429);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry on 500", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(500));

    const response = await fetchWithRetry(TEST_URL, TEST_INIT, FAST_OPTIONS);

    expect(response.status).toBe(500);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns last retryable response after all retries exhausted", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse(503))
      .mockResolvedValueOnce(jsonResponse(503))
      .mockResolvedValueOnce(jsonResponse(503));

    const promise = fetchWithRetry(TEST_URL, TEST_INIT, FAST_OPTIONS);
    await vi.advanceTimersByTimeAsync(10); // first retry delay
    await vi.advanceTimersByTimeAsync(20); // second retry delay
    const response = await promise;

    // On the last attempt, retryable status is returned as-is
    expect(response.status).toBe(503);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("throws after all retries exhausted on network error", async () => {
    vi.useRealTimers();

    vi.mocked(global.fetch).mockImplementation(
      () => Promise.reject(new TypeError("Failed to fetch")),
    );

    await expect(
      fetchWithRetry(TEST_URL, TEST_INIT, {
        maxRetries: 2,
        timeoutMs: 5_000,
        baseDelayMs: 1,
      }),
    ).rejects.toThrow("Failed to fetch");

    expect(global.fetch).toHaveBeenCalledTimes(3);

    vi.useFakeTimers();
  });

  it("retries on timeout (AbortError) and succeeds", async () => {
    const abortError = new DOMException("The operation was aborted", "AbortError");
    vi.mocked(global.fetch)
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(jsonResponse(200));

    const promise = fetchWithRetry(TEST_URL, TEST_INIT, FAST_OPTIONS);
    await vi.advanceTimersByTimeAsync(10);
    const response = await promise;

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry on non-retryable errors", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Unknown error"));

    await expect(
      fetchWithRetry(TEST_URL, TEST_INIT, FAST_OPTIONS),
    ).rejects.toThrow("Unknown error");

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("uses exponential backoff delay", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse(503))
      .mockResolvedValueOnce(jsonResponse(503))
      .mockResolvedValueOnce(jsonResponse(200));

    const promise = fetchWithRetry(TEST_URL, TEST_INIT, {
      ...FAST_OPTIONS,
      baseDelayMs: 100,
    });

    // First retry: 100ms * 2^0 = 100ms
    await vi.advanceTimersByTimeAsync(100);
    // Second retry: 100ms * 2^1 = 200ms
    await vi.advanceTimersByTimeAsync(200);

    const response = await promise;
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
