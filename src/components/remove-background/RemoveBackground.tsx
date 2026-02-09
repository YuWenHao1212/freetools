"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import UploadZone from "@/components/shared/UploadZone";
import { fetchApi, ApiError } from "@/lib/api";
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<RemoveBgResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
    setPreviewUrl(URL.createObjectURL(f));
  }, []);

  const handleProcess = useCallback(async () => {
    if (!file) return;

    setStatus("processing");
    setErrorMsg("");
    setIsWarmingUp(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetchApi("/api/image/remove-bg", formData, {
        timeout: 60000,
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
  }, [file, t]);

  const handleReset = useCallback(() => {
    if (result?.url) URL.revokeObjectURL(result.url);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
    setIsWarmingUp(false);
  }, [result, previewUrl]);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left: Upload */}
      <div className="flex flex-col gap-6">
        <UploadZone
          accept="image/jpeg,image/png,image/webp"
          maxSize={15 * 1024 * 1024}
          label={t("uploadLabel")}
          hint={t("uploadHint")}
          onFile={handleFile}
          disabled={status === "processing"}
          preview={
            file && previewUrl ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-48 max-w-full rounded-lg object-contain"
                />
                <p className="text-sm text-ink-500">
                  {file.name} ({formatFileSize(file.size)})
                </p>
              </div>
            ) : undefined
          }
        />

        {file && status !== "done" && (
          <button
            type="button"
            onClick={handleProcess}
            disabled={status === "processing"}
            className="rounded-xl bg-accent px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {status === "processing" ? t("processing") : t("processBtn")}
          </button>
        )}

        {status === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{errorMsg}</p>
            <button
              type="button"
              onClick={handleProcess}
              className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800"
            >
              {t("retry")}
            </button>
          </div>
        )}
      </div>

      {/* Right: Result */}
      <div className="flex flex-col gap-4">
        {status === "processing" && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-white px-6 py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-accent border-t-transparent" />
            <p className="mt-4 text-sm text-ink-600">{t("aiProcessing")}</p>
            <p className="mt-1 text-xs text-ink-400">{t("processingHint")}</p>
          </div>
        )}

        {status === "done" && result && (
          <div className="rounded-2xl border border-border bg-white p-6">
            {/* Checkered background for transparency preview */}
            <div
              className="relative overflow-hidden rounded-xl"
              style={{
                backgroundImage:
                  "linear-gradient(45deg, #e0e0e0 25%, transparent 25%), linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e0e0e0 75%), linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)",
                backgroundSize: "16px 16px",
                backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
              }}
            >
              <img
                src={result.url}
                alt="Background removed"
                className="mx-auto max-h-64 object-contain"
              />
            </div>

            <div className="mt-4 flex gap-3">
              <a
                href={result.url}
                download={`no-bg-${file?.name?.replace(/\.\w+$/, "")}.png`}
                className="flex-1 rounded-xl bg-accent px-4 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                {t("download")}
              </a>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-border px-4 py-3 text-base font-medium text-ink-600 transition-colors hover:bg-cream-200"
              >
                {t("reset")}
              </button>
            </div>
          </div>
        )}

        {status === "idle" && !file && (
          <div className="hidden flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-cream-200/50 px-6 py-16 lg:flex">
            <p className="text-sm text-ink-500">{t("resultPlaceholder")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
