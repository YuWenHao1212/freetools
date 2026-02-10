"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { fetchApi, ApiError } from "@/lib/api";
import TurnstileWidget from "@/components/shared/TurnstileWidget";
import VideoInfoCard from "@/components/shared/VideoInfoCard";

type Status = "idle" | "loading" | "done" | "error";

interface SummaryResult {
  video_id: string;
  summary: string;
  title?: string;
  channel?: string;
  thumbnail_url?: string;
}

const SESSION_KEY = "yt-url";

export default function YouTubeSummary() {
  const t = useTranslations("YouTubeSummary");

  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Restore URL from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) setVideoUrl(saved);
  }, []);

  // Reset result and status when URL changes
  const handleUrlChange = useCallback((url: string) => {
    setVideoUrl(url);
    sessionStorage.setItem(SESSION_KEY, url);
    setResult(null);
    setStatus("idle");
    setError(null);
    setCaptchaRequired(false);
    setCaptchaToken(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = videoUrl.trim();
    if (!trimmed) return;

    // Basic URL validation
    const isYouTubeUrl =
      trimmed.includes("youtube.com/watch") ||
      trimmed.includes("youtu.be/") ||
      trimmed.includes("youtube.com/embed/");

    if (!isYouTubeUrl) {
      setError(t("invalidUrl"));
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (captchaToken) {
        headers["x-turnstile-token"] = captchaToken;
      }

      const response = await fetchApi(
        "/api/youtube/summary",
        JSON.stringify({ url: trimmed }),
        { headers },
      );

      const data: SummaryResult = await response.json();
      setResult(data);
      setStatus("done");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setCaptchaRequired(true);
        setStatus("idle");
        return;
      }
      setError(err instanceof ApiError ? err.message : t("error"));
      setStatus("error");
    }
  }, [videoUrl, captchaToken, t]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handleRegenerate = useCallback(() => {
    setResult(null);
    setStatus("idle");
    setError(null);
    // Trigger a fresh submit after state resets
    setTimeout(() => {
      handleSubmit();
    }, 0);
  }, [handleSubmit]);

  const handleRetry = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  return (
    <div className="flex flex-col gap-6">
      {/* URL input + submit button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder={t("urlPlaceholder")}
          className="w-full rounded-xl border border-border bg-white px-4 py-3 text-base text-ink-900 placeholder:text-ink-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={status === "loading" || !videoUrl.trim()}
          className="shrink-0 cursor-pointer rounded-xl bg-accent px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-cream-300 disabled:text-ink-400"
        >
          {status === "loading" ? t("loading") : t("generateSummary")}
        </button>
      </div>

      {/* Turnstile CAPTCHA widget (conditional) */}
      {captchaRequired && !captchaToken && (
        <TurnstileWidget onVerify={(token) => setCaptchaToken(token)} />
      )}

      {/* Loading state */}
      {status === "loading" && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-accent border-t-transparent" />
          <p className="mt-4 text-sm text-ink-600">{t("loading")}</p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-2 cursor-pointer rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {/* Result state */}
      {status === "done" && result && (
        <div className="flex flex-col gap-4">
          {/* Video info card */}
          <VideoInfoCard
            videoId={result.video_id}
            title={result.title}
            channel={result.channel}
            thumbnailUrl={result.thumbnail_url}
          />

          {/* Summary display */}
          <div className="rounded-xl bg-white p-6">
            <p className="text-xs font-medium text-ink-500">
              {t("summaryLabel")}
            </p>
            <h3 className="mt-1 text-lg font-bold text-ink-900">
              {t("summaryTitle")}
            </h3>
            <div className="mt-4 prose prose-sm max-w-none whitespace-pre-wrap text-ink-700">
              {result.summary}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="cursor-pointer rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
            >
              {copied ? t("copied") : t("copyAll")}
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              className="cursor-pointer rounded-xl border border-border bg-white px-6 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-cream-200"
            >
              {t("regenerate")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
