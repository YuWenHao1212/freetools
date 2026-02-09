"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import UploadZone from "@/components/shared/UploadZone";
import { fetchApi, ApiError } from "@/lib/api";
import { formatFileSize } from "@/lib/utils";

type Status = "idle" | "converting" | "done" | "error";

interface GifResult {
  url: string;
  originalSize: number;
  resultSize: number;
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

export default function VideoToGif() {
  const t = useTranslations("VideoToGif");

  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ w: number; h: number } | null>(null);
  const [fps, setFps] = useState(10);
  const [width, setWidth] = useState(480);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<GifResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
    setThumbnail(null);
    setVideoDimensions(null);

    const meta = await captureVideoMeta(f);
    setThumbnail(meta.thumbnail);
    if (meta.width > 0) {
      setVideoDimensions({ w: meta.width, h: meta.height });
    }
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    setStatus("converting");
    setErrorMsg("");
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fps", String(fps));
    formData.append("width", String(width));

    try {
      const response = await fetchApi("/api/video/to-gif", formData, {
        timeout: 300000,
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setResult({
        url,
        originalSize: Number(response.headers.get("x-original-size") || 0),
        resultSize: Number(response.headers.get("x-result-size") || 0),
      });
      setStatus("done");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMsg(error.status === 503 || error.status === 408
          ? t("warmingUp") : error.message);
      } else {
        setErrorMsg(t("unknownError"));
      }
      setStatus("error");
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [file, fps, width, t]);

  const handleRetry = useCallback(() => {
    handleConvert();
  }, [handleConvert]);

  const handleReset = useCallback(() => {
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setThumbnail(null);
    setVideoDimensions(null);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
    setElapsed(0);
  }, [result]);

  const gifFileName = file
    ? `${file.name.replace(/\.\w+$/, "")}.gif`
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
              disabled={status === "converting"}
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

          {/* Converting */}
          {status === "converting" && (
            <div className="flex h-full flex-col">
              <p className="invisible mb-2 text-xs">&nbsp;</p>
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-cream-200/30">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-accent border-t-transparent" />
                <p className="mt-4 text-sm text-ink-600">{t("converting")}</p>
                <p className="mt-1 text-xs text-ink-400">{elapsed}s</p>
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
                {t("gifSize")}
              </p>
              <div className="relative flex flex-1 items-center justify-center rounded-xl bg-cream-200/30 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.url}
                  alt="GIF preview"
                  className="max-h-52 rounded-lg object-contain"
                />
                <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
              <div className="mt-3">
                <p className="truncate text-sm font-medium text-ink-900">{gifFileName}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {formatFileSize(result.resultSize)} &middot; {width}px &middot; {fps} FPS
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

          {/* Pre-convert: fps + width + button */}
          {status !== "done" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                {/* FPS */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-ink-700">
                    {t("fpsLabel")}
                  </label>
                  <div className="flex gap-2">
                    {[5, 10, 15, 20].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setFps(v)}
                        disabled={status === "converting"}
                        className={`
                          cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors
                          ${fps === v
                            ? "bg-accent text-white"
                            : "bg-cream-200 text-ink-600 hover:bg-cream-300"
                          }
                        `}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Width */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-ink-700">
                    {t("widthLabel")}
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 320, label: "320px" },
                      { value: 480, label: "480px" },
                      { value: 640, label: "640px" },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setWidth(value)}
                        disabled={status === "converting"}
                        className={`
                          cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors
                          ${width === value
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

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={status === "converting"}
                  className="cursor-pointer rounded-xl bg-accent px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "converting" ? t("converting") : t("convertBtn")}
                </button>
              </div>
            </div>
          )}

          {/* Post-convert: stats + actions */}
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
                  <p className="text-xs text-ink-500">{t("gifSize")}</p>
                  <p className="text-base font-semibold text-accent">
                    {formatFileSize(result.resultSize)}
                  </p>
                </div>
                <div className="text-xs text-ink-400">
                  {width}px &middot; {fps} FPS
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <a
                  href={result.url}
                  download={gifFileName}
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
