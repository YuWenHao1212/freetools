"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import UploadZone from "@/components/shared/UploadZone";
import { fetchApi, ApiError } from "@/lib/api";
import { formatFileSize } from "@/lib/utils";

type Status = "idle" | "compressing" | "done" | "error";
type Quality = "low" | "medium" | "high";

interface CompressResult {
  url: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

export default function ImageCompress() {
  const t = useTranslations("ImageCompress");

  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<Quality>("medium");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<CompressResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState<{ w: number; h: number } | null>(null);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
    setOriginalDimensions(null);

    // Read original image dimensions
    const img = new Image();
    img.onload = () => {
      setOriginalDimensions({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = URL.createObjectURL(f);
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file) return;

    setStatus("compressing");
    setErrorMsg("");
    setIsWarmingUp(false);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("quality", quality);

    try {
      const response = await fetchApi("/api/image/compress", formData, {
        timeout: 30000,
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setResult({
        url,
        originalSize: Number(response.headers.get("x-original-size") || 0),
        compressedSize: Number(response.headers.get("x-compressed-size") || 0),
        width: Number(response.headers.get("x-width") || 0),
        height: Number(response.headers.get("x-height") || 0),
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
    }
  }, [file, quality, t]);

  const handleRetry = useCallback(() => {
    handleCompress();
  }, [handleCompress]);

  const handleReset = useCallback(() => {
    if (result?.url) URL.revokeObjectURL(result.url);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
    setIsWarmingUp(false);
    setOriginalDimensions(null);
  }, [result, previewUrl]);

  const savingsPercent =
    result && result.originalSize > 0
      ? Math.round((1 - result.compressedSize / result.originalSize) * 100)
      : 0;

  const fileFormat = file?.type.split("/")[1]?.toUpperCase() ?? "";
  const compressedFileName = file ? `compressed-${file.name}` : "";

  return (
    <div className="rounded-2xl border border-border bg-white">
      {/* Top: two-column preview area */}
      <div className="grid lg:grid-cols-2">
        {/* Left: Upload / Original */}
        <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
          {!file ? (
            <UploadZone
              accept="image/jpeg,image/png,image/webp"
              maxSize={15 * 1024 * 1024}
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl ?? ""}
                  alt={file.name}
                  className="max-h-52 rounded-lg object-contain"
                />
              </div>
              <div className="mt-3">
                <p className="truncate text-sm font-medium text-ink-900">{file.name}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {formatFileSize(file.size)} &middot; {fileFormat}
                  {originalDimensions && ` \u00B7 ${originalDimensions.w} x ${originalDimensions.h} px`}
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
              <div className="flex flex-1 items-center justify-center rounded-xl bg-cream-200/30 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.url}
                  alt="Compressed"
                  className="max-h-52 rounded-lg object-contain"
                />
              </div>
              <div className="mt-3">
                <p className="truncate text-sm font-medium text-ink-900">{compressedFileName}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {formatFileSize(result.compressedSize)} &middot; {fileFormat} &middot; {result.width} x {result.height} px
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

          {/* Pre-compress: quality + button */}
          {status !== "done" && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

              <button
                type="button"
                onClick={handleCompress}
                disabled={status === "compressing"}
                className="cursor-pointer rounded-xl bg-accent px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "compressing" ? t("compressing") : t("compressBtn")}
              </button>
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
                  {savingsPercent > 0 ? `-${savingsPercent}%` : `0%`}
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
