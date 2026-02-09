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

export default function VideoToGif() {
  const t = useTranslations("VideoToGif");

  const [file, setFile] = useState<File | null>(null);
  const [fps, setFps] = useState(10);
  const [width, setWidth] = useState(480);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<GifResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
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

  const handleReset = useCallback(() => {
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
    setElapsed(0);
  }, [result]);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <UploadZone
          accept="video/mp4,video/quicktime,video/webm"
          maxSize={200 * 1024 * 1024}
          label={t("uploadLabel")}
          hint={t("uploadHint")}
          onFile={handleFile}
          disabled={status === "converting"}
          preview={
            file ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-base font-medium text-ink-900">{file.name}</p>
                <p className="text-sm text-ink-500">{formatFileSize(file.size)}</p>
              </div>
            ) : undefined
          }
        />

        {file && (
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-ink-700">{t("fpsLabel")}</label>
            <div className="flex gap-2">
              {[5, 10, 15, 20].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFps(v)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    fps === v ? "bg-accent text-white" : "bg-cream-200 text-ink-600 hover:bg-cream-300"
                  }`}
                >
                  {v} FPS
                </button>
              ))}
            </div>

            <label className="text-sm font-medium text-ink-700">{t("widthLabel")}</label>
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
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    width === value ? "bg-accent text-white" : "bg-cream-200 text-ink-600 hover:bg-cream-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleConvert}
              disabled={status === "converting"}
              className="mt-2 rounded-xl bg-accent px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {status === "converting" ? t("converting") : t("convertBtn")}
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{errorMsg}</p>
            <button
              type="button"
              onClick={handleConvert}
              className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800"
            >
              {t("retry")}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {status === "converting" && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-white px-6 py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-accent border-t-transparent" />
            <p className="mt-4 text-sm text-ink-600">{t("converting")}</p>
            <p className="mt-1 text-xs text-ink-400">{elapsed}s</p>
          </div>
        )}

        {status === "done" && result && (
          <div className="rounded-2xl border border-border bg-white p-6">
            <div className="mb-4 overflow-hidden rounded-xl bg-cream-200">
              <img
                src={result.url}
                alt="GIF preview"
                className="mx-auto max-h-64 object-contain"
              />
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-ink-500">{t("originalSize")}</p>
                <p className="text-lg font-semibold text-ink-900">{formatFileSize(result.originalSize)}</p>
              </div>
              <div>
                <p className="text-sm text-ink-500">{t("gifSize")}</p>
                <p className="text-lg font-semibold text-accent">{formatFileSize(result.resultSize)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href={result.url}
                download={`${file?.name?.replace(/\.\w+$/, "")}.gif`}
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
