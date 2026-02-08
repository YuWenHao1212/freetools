"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  convertToUnicode,
  convertToUnicodeRich,
  isCjkChar,
  type GeneratorFontStyle,
  type RichChar,
} from "@/lib/unicode-fonts";
import { copyToClipboard } from "@/lib/clipboard";

const FONT_STYLES: GeneratorFontStyle[] = [
  "bold",
  "italic",
  "boldItalic",
  "boldScript",
  "script",
  "fraktur",
  "doubleStruck",
  "circled",
  "squared",
  "parenthesized",
  "upsideDown",
  "strikethrough",
  "underline",
  "fullwidth",
  "smallCaps",
];

// Strikethrough/underline use CSS for clean preview, combining chars for copy
const CSS_DECORATION_STYLES: Record<string, string> = {
  strikethrough: "line-through",
  underline: "underline",
};

const MAX_INPUT_LENGTH = 200;

type CjkState = "none" | "mixed" | "allCjk";

const detectCjkState = (text: string): CjkState => {
  const chars = [...text].filter((c) => c.trim() !== "");
  if (chars.length === 0) return "none";

  const cjkCount = chars.filter((c) => isCjkChar(c)).length;
  if (cjkCount === 0) return "none";
  if (cjkCount === chars.length) return "allCjk";
  return "mixed";
};

export default function FontGenerator() {
  const t = useTranslations("FontGenerator");
  const [input, setInput] = useState("");
  const [copiedStyle, setCopiedStyle] = useState<string | null>(null);

  const hasInput = input.trim() !== "";
  const previewText = hasInput ? input.trim() : t("exampleText");
  const isExample = !hasInput;

  const previews = useMemo(
    () =>
      FONT_STYLES.map((style) => {
        const cssDecoration = CSS_DECORATION_STYLES[style];
        const richChars = cssDecoration
          ? [...previewText].map((char) => ({ char, converted: char.trim() !== "" }))
          : convertToUnicodeRich(previewText, style);
        return {
          style,
          copyText: convertToUnicode(previewText, style),
          displayText: cssDecoration ? previewText : undefined,
          richChars,
          cssDecoration,
        };
      }),
    [previewText],
  );

  const cjkState = useMemo(
    () => (hasInput ? detectCjkState(input) : "none"),
    [input, hasInput],
  );

  const handleCopy = useCallback(
    async (text: string, style: string) => {
      const success = await copyToClipboard(text);
      if (success) {
        setCopiedStyle(style);
        setTimeout(() => setCopiedStyle(null), 1500);
      }
    },
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Input */}
      <div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
          placeholder={t("inputPlaceholder")}
          maxLength={MAX_INPUT_LENGTH}
          className="w-full rounded-lg border border-border bg-white px-4 py-3 text-lg text-ink-900 placeholder:text-ink-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />

        {/* Hint — low-key note, upgrades to specific message for CJK input */}
        <p className="mt-1.5 text-sm text-ink-400">
          {cjkState === "allCjk"
            ? t("hintAllCjk")
            : cjkState === "mixed"
              ? t("hintMixed")
              : t("hint")}
        </p>
      </div>

      {/* Preview grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {previews.map(({ style, copyText, displayText, richChars, cssDecoration }) => (
          <div
            key={style}
            className="flex flex-col rounded-xl border border-border bg-white px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink-500">
                {t(`styles.${style}`)}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(copyText, style)}
                disabled={isExample}
                className={
                  copiedStyle === style
                    ? "rounded-lg bg-green-50 px-3 py-1 text-sm font-medium text-green-700"
                    : isExample
                      ? "rounded-lg border border-border px-3 py-1 text-sm font-medium text-ink-300 cursor-not-allowed"
                      : "rounded-lg border border-border px-3 py-1 text-sm font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                }
              >
                {copiedStyle === style ? t("copied") : t("copy")}
              </button>
            </div>
            <span
              className={`mt-2 truncate text-lg ${
                isExample ? "text-ink-400" : ""
              }`}
              style={
                cssDecoration
                  ? { textDecoration: cssDecoration }
                  : undefined
              }
            >
              {cssDecoration ? (
                displayText
              ) : (
                richChars.map((rc: RichChar, i: number) => (
                  <span
                    key={i}
                    className={
                      isExample
                        ? ""
                        : rc.converted
                          ? "text-ink-900"
                          : "text-ink-600/30"
                    }
                  >
                    {rc.char}
                  </span>
                ))
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Tip */}
      <p className="text-center text-sm text-ink-500">
        {t("tip")}
      </p>
    </div>
  );
}
