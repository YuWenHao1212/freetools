"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { fetchApi, ApiError } from "@/lib/api";
import { getErrorMessageKey } from "@/lib/error-messages";
import { getCachedTranscript } from "@/lib/youtube-utils";
import TurnstileWidget from "@/components/shared/TurnstileWidget";
import FullContentModal from "@/components/shared/FullContentModal";
import WarningModal from "@/components/shared/WarningModal";
import VideoInfoCard from "@/components/shared/VideoInfoCard";

type Status = "idle" | "loading" | "done" | "error";

const TARGET_LANGUAGES = [
  { code: "zh-TW", label: "\u7E41\u9AD4\u4E2D\u6587" },
  { code: "en", label: "English" },
] as const;

interface TranslateResult {
  video_id: string;
  source_language: string;
  target_language: string;
  total_lines: number;
  translation: string;
  title?: string;
  channel?: string;
  thumbnail_url?: string;
}

const SESSION_STORAGE_KEY = "yt-url";
const RESULT_CACHE_KEY = "yt-translate-result";
const PREVIEW_LINE_COUNT = 3;

export default function YouTubeTranslate() {
  const t = useTranslations("YouTubeTranslate");

  const [videoUrl, setVideoUrl] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("zh-TW");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [durationWarning, setDurationWarning] = useState(false);

  // Restore URL and cached result from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) setVideoUrl(saved);

    const cachedResult = sessionStorage.getItem(RESULT_CACHE_KEY);
    if (cachedResult) {
      try {
        const parsed: TranslateResult = JSON.parse(cachedResult);
        setResult(parsed);
        setStatus("done");
        setTargetLanguage(parsed.target_language);
      } catch {
        sessionStorage.removeItem(RESULT_CACHE_KEY);
      }
    }
  }, []);

  // Reset result and status when URL changes
  const handleUrlChange = useCallback((url: string) => {
    setVideoUrl(url);
    sessionStorage.setItem(SESSION_STORAGE_KEY, url);
    setResult(null);
    setStatus("idle");
    setError(null);
    setCopied(false);
    sessionStorage.removeItem(RESULT_CACHE_KEY);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!videoUrl.trim()) return;

    setStatus("loading");
    setError(null);
    setCopied(false);

    try {
      const headers: Record<string, string> = {};
      if (captchaToken) {
        headers["x-turnstile-token"] = captchaToken;
      }

      const cachedTranscript = getCachedTranscript(videoUrl);
      const body: Record<string, string> = {
        url: videoUrl,
        target_language: targetLanguage,
      };
      if (cachedTranscript) {
        body.transcript = cachedTranscript;
      }

      const response = await fetchApi(
        "/api/youtube/translate",
        JSON.stringify(body),
        { headers },
      );

      const data: TranslateResult = await response.json();
      setResult(data);
      setStatus("done");
      sessionStorage.setItem(RESULT_CACHE_KEY, JSON.stringify(data));
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setCaptchaRequired(true);
        setStatus("idle");
        return;
      }
      if (err instanceof ApiError) {
        const key = getErrorMessageKey(err.message);
        if (key === "apiErrors.durationExceeded") {
          setDurationWarning(true);
          setStatus("idle");
          return;
        }
        setError(key ? t(key) : err.message);
      } else {
        setError(t("error"));
      }
      setStatus("error");
    }
  }, [videoUrl, targetLanguage, captchaToken, t]);

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
    setCaptchaRequired(false);
  }, []);

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null);
  }, []);

  // Auto-retry after CAPTCHA verification
  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;
  useEffect(() => {
    if (captchaToken && status === "idle") {
      submitRef.current();
    }
  }, [captchaToken, status]);

  const handleCopy = useCallback(async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result.translation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: silent fail
    }
  }, [result]);

  const handleDownload = useCallback(() => {
    if (!result) return;

    const blob = new Blob([result.translation], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const safeName = (result.title || result.video_id).replace(/[/\\?%*:|"<>]/g, "").trim();
    anchor.download = `${safeName}-translate.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [result]);

  const previewText = result
    ? result.translation
        .split("\n")
        .filter((line) => line.trim())
        .slice(0, PREVIEW_LINE_COUNT)
        .join("\n")
    : "";

  const isSubmitDisabled = status === "loading" || !videoUrl.trim();

  return (
    <div className="flex flex-col gap-6">
      {/* URL input + submit button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text");
            if (pasted) {
              handleUrlChange(pasted);
            }
          }}
          placeholder={t("urlPlaceholder")}
          className="w-full rounded-xl border border-border bg-white px-4 py-3 text-base text-ink-900 placeholder:text-ink-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className="shrink-0 cursor-pointer rounded-xl bg-accent px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-cream-300 disabled:text-ink-400"
        >
          {status === "loading" ? t("loading") : t("translate")}
        </button>
      </div>

      {/* Target language pills */}
      <div>
        <p className="mb-2 text-sm font-medium text-ink-700">
          {t("selectTargetLanguage")}
        </p>
        <div className="flex flex-wrap gap-2">
          {TARGET_LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              onClick={() => setTargetLanguage(code)}
              className={
                targetLanguage === code
                  ? "rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white"
                  : "cursor-pointer rounded-full border border-border bg-white px-4 py-1.5 text-sm text-ink-600 hover:bg-cream-200"
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Turnstile CAPTCHA widget */}
      {captchaRequired && !captchaToken && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-3 text-sm text-amber-700">
            {t("captchaRequired")}
          </p>
          <TurnstileWidget
            onVerify={handleCaptchaVerify}
            onExpire={handleCaptchaExpire}
          />
        </div>
      )}

      {/* Loading state */}
      {status === "loading" && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-cream-200/30 py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-accent border-t-transparent" />
          <p className="mt-4 text-sm text-ink-600">{t("loading")}</p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={handleSubmit}
            className="mt-2 cursor-pointer text-sm font-medium text-red-700 underline hover:text-red-800"
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

          {/* Preview */}
          <div className="rounded-xl bg-white p-5">
            <p className="mb-4 text-sm font-medium text-ink-700">
              {t("preview")}
            </p>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-700">
              {previewText}
              {result.total_lines > PREVIEW_LINE_COUNT && "\n..."}
            </pre>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="cursor-pointer rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
            >
              {t("viewFull")}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="cursor-pointer rounded-xl border border-border bg-white px-6 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-cream-200"
            >
              {copied ? t("copied") : t("copyAll")}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="cursor-pointer rounded-xl border border-border bg-white px-6 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-cream-200"
            >
              {t("download")}
            </button>
          </div>
        </div>
      )}

      {/* Full content modal */}
      {result && (
        <FullContentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={t("viewFull")}
          content={result.translation}
        />
      )}

      {/* Duration warning modal */}
      <WarningModal
        isOpen={durationWarning}
        onClose={() => setDurationWarning(false)}
        title={t("durationWarningTitle")}
        message={t("apiErrors.durationExceeded")}
        buttonLabel={t("durationWarningOk")}
      />
    </div>
  );
}
