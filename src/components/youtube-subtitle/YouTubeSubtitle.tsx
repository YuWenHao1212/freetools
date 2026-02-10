"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { fetchApi, ApiError } from "@/lib/api";
import FullContentModal from "@/components/shared/FullContentModal";
import VideoInfoCard from "@/components/shared/VideoInfoCard";

type Status = "idle" | "loading" | "done" | "error";

interface AvailableLanguage {
  code: string;
  name: string;
  is_generated: boolean;
}

interface SubtitleResult {
  video_id: string;
  language: string;
  available_languages: AvailableLanguage[];
  total_lines: number;
  transcript: string;
  lines: { start: number; duration: number; text: string }[] | null;
  title?: string;
  channel?: string;
  thumbnail_url?: string;
}

const PREVIEW_LINES = 5;
const SESSION_KEY = "yt-url";

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `[${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}]`;
}

function buildDisplayText(
  result: SubtitleResult,
  showTimestamps: boolean,
): string {
  if (showTimestamps && result.lines) {
    return result.lines
      .map((line) => `${formatTimestamp(line.start)} ${line.text}`)
      .join("\n");
  }
  return result.transcript;
}

function getPreviewLines(text: string, count: number): string {
  return text.split("\n").slice(0, count).join("\n");
}

export default function YouTubeSubtitle() {
  const t = useTranslations("YouTubeSubtitle");

  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SubtitleResult | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Restore URL from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) setVideoUrl(saved);
  }, []);

  const handleUrlChange = useCallback((url: string) => {
    setVideoUrl(url);
    sessionStorage.setItem(SESSION_KEY, url);
    setResult(null);
    setStatus("idle");
    setError("");
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
    setError("");

    try {
      const response = await fetchApi(
        "/api/youtube/subtitle",
        JSON.stringify({
          url: trimmed,
          language: selectedLanguage || undefined,
          include_timestamps: showTimestamps,
        }),
      );

      const data: SubtitleResult = await response.json();
      setResult(data);
      setStatus("done");

      // Auto-select the returned language if not already set
      if (!selectedLanguage && data.language) {
        setSelectedLanguage(data.language);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t("error"));
      }
      setStatus("error");
    }
  }, [videoUrl, selectedLanguage, showTimestamps, t]);

  const handleLanguageSelect = useCallback(
    async (langCode: string) => {
      setSelectedLanguage(langCode);

      // Re-fetch with the new language
      const trimmed = videoUrl.trim();
      if (!trimmed || status !== "done") return;

      setStatus("loading");
      setError("");

      try {
        const response = await fetchApi(
          "/api/youtube/subtitle",
          JSON.stringify({
            url: trimmed,
            language: langCode,
            include_timestamps: showTimestamps,
          }),
        );

        const data: SubtitleResult = await response.json();
        setResult(data);
        setStatus("done");
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError(t("error"));
        }
        setStatus("error");
      }
    },
    [videoUrl, showTimestamps, status, t],
  );

  const handleTimestampToggle = useCallback(async () => {
    const newValue = !showTimestamps;
    setShowTimestamps(newValue);

    // Re-fetch if we need timestamp data and don't have it
    const trimmed = videoUrl.trim();
    if (!trimmed || status !== "done" || !result) return;

    if (newValue && !result.lines) {
      setStatus("loading");
      setError("");

      try {
        const response = await fetchApi(
          "/api/youtube/subtitle",
          JSON.stringify({
            url: trimmed,
            language: selectedLanguage || undefined,
            include_timestamps: true,
          }),
        );

        const data: SubtitleResult = await response.json();
        setResult(data);
        setStatus("done");
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError(t("error"));
        }
        setStatus("error");
      }
    }
  }, [showTimestamps, videoUrl, status, result, selectedLanguage, t]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    const text = buildDisplayText(result, showTimestamps);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result, showTimestamps]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const text = buildDisplayText(result, showTimestamps);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.video_id}-subtitle.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, showTimestamps]);

  const handleRetry = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  const displayText = result ? buildDisplayText(result, showTimestamps) : "";
  const previewText = displayText
    ? getPreviewLines(displayText, PREVIEW_LINES)
    : "";

  const isSubmitDisabled = status === "loading" || status === "done";

  return (
    <div className="flex flex-col gap-5">
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
          disabled={isSubmitDisabled || !videoUrl.trim()}
          className="shrink-0 cursor-pointer rounded-xl bg-accent px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-cream-300 disabled:text-ink-400"
        >
          {status === "loading" ? t("loading") : t("getTranscript")}
        </button>
      </div>

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
          {/* Video info card with language pills */}
          <VideoInfoCard
            videoId={result.video_id}
            title={result.title}
            channel={result.channel}
            thumbnailUrl={result.thumbnail_url}
          >
            {result.available_languages.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-ink-500">
                  {t("selectLanguage")}
                </span>
                {result.available_languages.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageSelect(lang.code)}
                    className={
                      selectedLanguage === lang.code
                        ? "rounded-full bg-accent px-3 py-1 text-xs font-medium text-white"
                        : "cursor-pointer rounded-full border border-border bg-white px-3 py-1 text-xs text-ink-600 hover:bg-cream-200"
                    }
                  >
                    {lang.name}
                    {lang.is_generated && (
                      <span className="ml-1 opacity-60">
                        ({t("autoGenerated")})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </VideoInfoCard>

          {/* Transcript preview card */}
          <div className="rounded-xl bg-white p-5">
            {/* Header row */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-ink-700">
                {t("preview", { count: result.total_lines })}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-500">{t("timestamp")}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showTimestamps}
                  onClick={handleTimestampToggle}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    showTimestamps ? "bg-accent" : "bg-ink-300"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      showTimestamps ? "translate-x-[18px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Transcript text */}
            <pre className="whitespace-pre-wrap font-sans text-base leading-loose text-ink-700">
              {previewText}
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
          content={displayText}
        />
      )}
    </div>
  );
}
