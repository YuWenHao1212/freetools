"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import UploadZone from "@/components/shared/UploadZone";
import { fetchDirectApi, ApiError } from "@/lib/api";
import TurnstileWidget from "@/components/shared/TurnstileWidget";
import { formatFileSize } from "@/lib/utils";

type Status = "idle" | "compressing" | "done" | "error";
type Quality = "low" | "medium" | "high";

interface CompressResult {
  url: string;
  originalSize: number;
  compressedSize: number;
}

interface VideoMeta {
  thumbnail: string | null;
  width: number;
  height: number;
}

function captureVideoMeta(file: File): Promise<VideoMeta> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        URL.revokeObjectURL(objectUrl);
        resolve({ thumbnail: dataUrl, width: w, height: h });
      } else {
        URL.revokeObjectURL(objectUrl);
        resolve({ thumbnail: null, width: w, height: h });
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ thumbnail: null, width: 0, height: 0 });
    };
  });
}

function estimateCompressTime(
  fileSizeMB: number,
  quality: Quality,
  resolution: string,
): number {
  // Fixed overhead: upload + ffprobe + response streaming (~15s for ~20MB)
  const overhead = Math.max(5, Math.ceil(fileSizeMB * 0.8));

  // Encoding rate per MB (calibrated: 19MB medium 720p -> 30s total)
  const encodingRatePerMB = 0.68;

  // Quality multiplier: ultrafast is ~2x faster than fast
  const qualityMultiplier: Record<Quality, number> = {
    low: 0.5,
    medium: 1.0,
    high: 1.8,
  };

  // Resolution multiplier: pixel count relative to 720p
  const resolutionMultiplier: Record<string, number> = {
    "480p": 0.45,
    "": 1.0,       // 720p (default auto-downscale)
    "1080p": 2.25,
  };

  const qMul = qualityMultiplier[quality];
  const rMul = resolutionMultiplier[resolution] ?? 1.0;
  const encoding = fileSizeMB * encodingRatePerMB * qMul * rMul;
  return Math.max(5, Math.ceil(overhead + encoding));
}

export default function VideoCompress() {
  const t = useTranslations("VideoCompress");

  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ w: number; h: number } | null>(null);
  const [quality, setQuality] = useState<Quality>("medium");
  const [resolution, setResolution] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<CompressResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
    setIsWarmingUp(false);
    setThumbnail(null);
    setVideoDimensions(null);
    setCaptchaToken(null);

    const meta = await captureVideoMeta(f);
    setThumbnail(meta.thumbnail);
    if (meta.width > 0) {
      setVideoDimensions({ w: meta.width, h: meta.height });
    }
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file || !captchaToken) return;

    setStatus("compressing");
    setErrorMsg("");
    setIsWarmingUp(false);
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("quality", quality);
    if (resolution) formData.append("max_resolution", resolution);

    const estimatedSeconds = estimateCompressTime(file.size / (1024 * 1024), quality, resolution);
    const timeoutMs = Math.max(120000, estimatedSeconds * 1.5 * 1000);

    try {
      const response = await fetchDirectApi("/api/video/compress", formData, {
        timeout: timeoutMs,
        action: "video/compress",
        captchaToken,
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setResult({
        url,
        originalSize: Number(response.headers.get("x-original-size") || 0),
        compressedSize: Number(response.headers.get("x-compressed-size") || 0),
      });
      setStatus("done");
    } catch (error) {
      if (error instanceof ApiError && (error.status === 503 || error.status === 408)) {
        setIsWarmingUp(true);
        setErrorMsg(t("warmingUp"));
      } else if (error instanceof ApiError) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg(t("unknownError"));
      }
      setStatus("error");
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [file, quality, resolution, captchaToken, t]);

  const handleRetry = useCallback(() => {
    handleCompress();
  }, [handleCompress]);

  const handleReset = useCallback(() => {
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setThumbnail(null);
    setVideoDimensions(null);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
    setIsWarmingUp(false);
    setElapsed(0);
    setCaptchaToken(null);
  }, [result]);

  const savingsPercent =
    result && result.originalSize > 0
      ? Math.round((1 - result.compressedSize / result.originalSize) * 100)
      : 0;

  const compressedFileName = file
    ? `compressed-${file.name.replace(/\.\w+$/, "")}.mp4`
    : "";

  const videoIcon = (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-ink-600/40"
    >
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );

  return (
    <div className="rounded-2xl border border-border bg-white">
      {/* Top: two-column preview area */}
      <div className="grid lg:grid-cols-2">
        {/* Left: Upload / Original */}
        <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
          {!file ? (
            <UploadZone
              accept="video/mp4,video/quicktime,video/webm"
              maxSize={100 * 1024 * 1024}
              label={t("uploadLabel")}
              hint={t("uploadHint")}
              onFile={handleFile}
              disabled={status === "compressing"}
            />
          ) : (
            <div className="flex h-full flex-col">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                {t("originalSize")}
              </p>
              <div className="flex flex-1 items-center justify-center rounded-xl bg-cream-200/30 p-4">
                {thumbnail ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={thumbnail}
                    alt={file.name}
                    className="max-h-52 rounded-lg object-contain"
                  />
                ) : (
                  videoIcon
                )}
              </div>
              <div className="mt-3">
                <p className="truncate text-sm font-medium text-ink-900">{file.name}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {formatFileSize(file.size)}
                  {videoDimensions && ` \u00B7 ${videoDimensions.w} x ${videoDimensions.h}`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Result / Placeholder */}
        <div className="p-4">
          {/* Placeholder */}
          {(status === "idle" || status === "error") && (
            <div className="flex h-full flex-col">
              {file && <p className="invisible mb-2 text-xs">&nbsp;</p>}
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-cream-200/30">
                <p className="text-sm text-ink-500">{t("resultPlaceholder")}</p>
              </div>
              {file && (
                <div className="invisible mt-3">
                  <p className="text-sm">&nbsp;</p>
                  <p className="mt-0.5 text-xs">&nbsp;</p>
                </div>
              )}
            </div>
          )}

          {/* Compressing */}
          {status === "compressing" && (
            <div className="flex h-full flex-col">
              <p className="invisible mb-2 text-xs">&nbsp;</p>
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-cream-200/30">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-accent border-t-transparent" />
                <p className="mt-4 text-sm text-ink-600">{t("compressing")}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {elapsed}s / {t("estimatedTime", { seconds: file ? estimateCompressTime(file.size / (1024 * 1024), quality, resolution) : 0 })}
                </p>
              </div>
              <div className="invisible mt-3">
                <p className="text-sm">&nbsp;</p>
                <p className="mt-0.5 text-xs">&nbsp;</p>
              </div>
            </div>
          )}

          {/* Done */}
          {status === "done" && result && (
            <div className="flex h-full flex-col">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                {t("compressedSize")}
              </p>
              <div className="relative flex flex-1 items-center justify-center rounded-xl bg-cream-200/30 p-4">
                {thumbnail ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbnail}
                      alt="Compressed"
                      className="max-h-52 rounded-lg object-contain"
                    />
                    <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </>
                ) : (
                  <>
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-green-500"
                    >
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                    <p className="mt-2 text-sm font-medium text-green-600">
                      {savingsPercent > 0 ? `-${savingsPercent}%` : "0%"}
                    </p>
                  </>
                )}
              </div>
              <div className="mt-3">
                <p className="truncate text-sm font-medium text-ink-900">{compressedFileName}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {formatFileSize(result.compressedSize)} &middot; MP4
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Controls spanning full width */}
      {file && (
        <div className="border-t border-border px-6 py-5">
          {/* Error */}
          {status === "error" && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{errorMsg}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-2 cursor-pointer text-sm font-medium text-red-700 underline hover:text-red-800"
              >
                {t("retry")}
              </button>
            </div>
          )}

          {/* Pre-compress: quality + resolution + button */}
          {status !== "done" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                {/* Quality */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-ink-700">
                    {t("qualityLabel")}
                  </label>
                  <div className="flex gap-2">
                    {(["low", "medium", "high"] as const).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuality(q)}
                        disabled={status === "compressing"}
                        className={`
                          cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors
                          ${quality === q
                            ? "bg-accent text-white"
                            : "bg-cream-200 text-ink-600 hover:bg-cream-300"
                          }
                        `}
                      >
                        {t(`quality.${q}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resolution */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-ink-700">
                    {t("resolutionLabel")}
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: "1080p", label: "1080p" },
                      { value: "", label: "720p" },
                      { value: "480p", label: "480p" },
                    ].map(({ value, label }) => (
                      <button
                        key={value || "original"}
                        type="button"
                        onClick={() => setResolution(value)}
                        disabled={status === "compressing"}
                        className={`
                          cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors
                          ${resolution === value
                            ? "bg-accent text-white"
                            : "bg-cream-200 text-ink-600 hover:bg-cream-300"
                          }
                        `}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <TurnstileWidget
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                />
                <button
                  type="button"
                  onClick={handleCompress}
                  disabled={status === "compressing" || !captchaToken}
                  className="cursor-pointer rounded-xl bg-accent px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "compressing" ? t("compressing") : t("compressBtn")}
                </button>
              </div>
            </div>
          )}

          {/* Post-compress: stats + actions */}
          {status === "done" && result && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Stats */}
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-ink-500">{t("originalSize")}</p>
                  <p className="text-base font-semibold text-ink-900">
                    {formatFileSize(result.originalSize)}
                  </p>
                </div>
                <div className="text-ink-500">&rarr;</div>
                <div>
                  <p className="text-xs text-ink-500">{t("compressedSize")}</p>
                  <p className="text-base font-semibold text-accent">
                    {formatFileSize(result.compressedSize)}
                  </p>
                </div>
                <div className={`rounded-lg px-3 py-1 text-sm font-semibold ${savingsPercent > 0 ? "bg-green-50 text-green-600" : "bg-cream-200 text-ink-600"}`}>
                  {savingsPercent > 0 ? `-${savingsPercent}%` : "0%"}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <a
                  href={result.url}
                  download={compressedFileName}
                  className="rounded-xl bg-accent px-6 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  {t("download")}
                </a>
                <button
                  type="button"
                  onClick={handleReset}
                  className="cursor-pointer rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-cream-200"
                >
                  {t("reset")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
