"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { fetchApi, ApiError } from "@/lib/api";
import TurnstileWidget from "@/components/shared/TurnstileWidget";
import FullContentModal from "@/components/shared/FullContentModal";

type Status = "idle" | "loading" | "done" | "error";

const TARGET_LANGUAGES = [
  { code: "zh-TW", label: "\u7E41\u9AD4\u4E2D\u6587" },
  { code: "en", label: "English" },
  { code: "ja", label: "\u65E5\u672C\u8A9E" },
  { code: "ko", label: "\uD55C\uAD6D\uC5B4" },
] as const;

interface TranslateResult {
  video_id: string;
  source_language: string;
  target_language: string;
  total_lines: number;
  translation: string;
}

const SESSION_STORAGE_KEY = "yt-url";
const PREVIEW_LINE_COUNT = 5;

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

  // Restore URL from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      setVideoUrl(saved);
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

      const response = await fetchApi(
        "/api/youtube/translate",
        JSON.stringify({ url: videoUrl, target_language: targetLanguage }),
        { headers },
      );

      const data = await response.json();
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
  }, [videoUrl, targetLanguage, captchaToken, t]);

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
    setCaptchaRequired(false);
  }, []);

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null);
  }, []);

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

    const blob = new Blob([result.translation], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${result.video_id}-${result.target_language}.txt`;
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
    <div className="mx-auto max-w-2xl space-y-6">
      {/* URL input + submit button */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          onPaste={(e) => {
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
          className="shrink-0 rounded-xl bg-accent px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
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
                  : "rounded-full border border-border bg-white px-4 py-1.5 text-sm text-ink-600 hover:bg-cream-200 cursor-pointer"
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
        <div className="space-y-4">
          {/* Preview */}
          <div className="rounded-xl border border-border bg-cream-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-ink-700">
                {t("preview")}
              </p>
              <p className="text-xs text-ink-500">
                {t("totalLines", { count: result.total_lines })}
              </p>
            </div>
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
              className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
            >
              {t("viewFull")}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-xl border border-border bg-white px-6 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-cream-200 cursor-pointer"
            >
              {copied ? t("copied") : t("copyAll")}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-xl border border-border bg-white px-6 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-cream-200 cursor-pointer"
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
    </div>
  );
}
