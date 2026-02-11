"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import UploadZone from "@/components/shared/UploadZone";
import { fetchDirectApi, ApiError } from "@/lib/api";
import TurnstileWidget from "@/components/shared/TurnstileWidget";
import { formatFileSize } from "@/lib/utils";

type Status = "idle" | "processing" | "done" | "error";

interface RemoveBgResult {
  url: string;
  originalSize: number;
  resultSize: number;
}

export default function RemoveBackground() {
  const t = useTranslations("RemoveBackground");

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<RemoveBgResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
    setCaptchaToken(null);
  }, []);

  const handleProcess = useCallback(async () => {
    if (!file || !captchaToken) return;

    setStatus("processing");
    setErrorMsg("");
    setIsWarmingUp(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetchDirectApi("/api/image/remove-bg", formData, {
        timeout: 60000,
        action: "image/remove-bg",
        captchaToken,
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
  }, [file, captchaToken, t]);

  const handleReset = useCallback(() => {
    if (result?.url) URL.revokeObjectURL(result.url);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
    setIsWarmingUp(false);
    setCaptchaToken(null);
  }, [result, previewUrl]);

  const fileFormat = file?.type.split("/")[1]?.toUpperCase() ?? "";
  const downloadFileName = file ? `no-bg-${file.name.replace(/\.\w+$/, "")}.png` : "";

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
              disabled={status === "processing"}
            />
          ) : (
            <div className="flex h-full flex-col">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                {t("original")}
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

          {/* Processing */}
          {status === "processing" && (
            <div className="flex h-full flex-col">
              <p className="invisible mb-2 text-xs">&nbsp;</p>
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-cream-200/30">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-accent border-t-transparent" />
                <p className="mt-4 text-sm text-ink-600">{t("aiProcessing")}</p>
                <p className="mt-1 text-xs text-ink-400">{t("processingHint")}</p>
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
                {t("resultLabel")}
              </p>
              <div
                className="flex flex-1 items-center justify-center rounded-xl p-4"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, #e0e0e0 25%, transparent 25%), linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e0e0e0 75%), linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)",
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.url}
                  alt="Background removed"
                  className="max-h-52 rounded-lg object-contain"
                />
              </div>
              <div className="mt-3">
                <p className="truncate text-sm font-medium text-ink-900">{downloadFileName}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {formatFileSize(result.resultSize)} &middot; PNG
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
                onClick={handleProcess}
                className="mt-2 cursor-pointer text-sm font-medium text-red-700 underline hover:text-red-800"
              >
                {t("retry")}
              </button>
            </div>
          )}

          {/* Pre-process: button */}
          {status !== "done" && (
            <div className="flex items-center justify-between">
              <TurnstileWidget
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
              />
              <button
                type="button"
                onClick={handleProcess}
                disabled={status === "processing" || !captchaToken}
                className="cursor-pointer rounded-xl bg-accent px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "processing" ? t("processing") : t("processBtn")}
              </button>
            </div>
          )}

          {/* Post-process: stats + actions */}
          {status === "done" && result && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Stats */}
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-ink-500">{t("original")}</p>
                  <p className="text-base font-semibold text-ink-900">
                    {formatFileSize(result.originalSize)}
                  </p>
                </div>
                <div className="text-ink-500">&rarr;</div>
                <div>
                  <p className="text-xs text-ink-500">{t("resultLabel")}</p>
                  <p className="text-base font-semibold text-accent">
                    {formatFileSize(result.resultSize)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <a
                  href={result.url}
                  download={downloadFileName}
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
