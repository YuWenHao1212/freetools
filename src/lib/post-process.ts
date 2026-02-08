/**
 * Post-processing pipeline for social media text formatting.
 *
 * Two-stage pipeline:
 * 1. ZWSP blank-line preservation (always on)
 * 2. Pangu CJK-ASCII spacing (optional toggle)
 */

const ZWSP = "\u200B";

// CJK Unified Ideographs + CJK Extension A
const CJK_RANGE = "\\u4e00-\\u9fff\\u3400-\\u4dbf";

// CJK followed by word character (alphanumeric + underscore)
const CJK_THEN_WORD = new RegExp(`([${CJK_RANGE}])([\\w])`, "g");

// Word character followed by CJK
const WORD_THEN_CJK = new RegExp(`([\\w])([${CJK_RANGE}])`, "g");

/**
 * Insert Zero-Width Space (U+200B) in blank lines to preserve
 * consecutive line breaks on platforms like Facebook that compress them.
 *
 * Each empty line (the gap between two \n) receives a ZWSP character.
 *
 * "a\n\n\nb" -> "a\n\u200B\n\u200B\nb"
 * "a\n\nb"   -> "a\n\u200B\nb"
 * "a\nb"     -> "a\nb" (single break, unchanged)
 */
export const insertZWSP = (text: string): string => {
  if (text === "") return "";

  const lines = text.split("\n");

  const processed = lines.map((line, index) => {
    const isInterior = index > 0 && index < lines.length - 1;
    return line === "" && isInterior ? ZWSP : line;
  });

  return processed.join("\n");
};

/**
 * Insert a half-width space between CJK characters and ASCII
 * alphanumeric/word characters (Pangu spacing).
 *
 * "我用Mac寫文" -> "我用 Mac 寫文"
 * "hello你好"   -> "hello 你好"
 * "第3章"       -> "第 3 章"
 */
export const panguSpacing = (text: string): string => {
  if (text === "") return "";

  const withSpaceAfterCJK = text.replace(CJK_THEN_WORD, "$1 $2");
  return withSpaceAfterCJK.replace(WORD_THEN_CJK, "$1 $2");
};

/**
 * Apply post-processing pipeline to text.
 *
 * Stage 1 (always): Insert ZWSP in blank lines
 * Stage 2 (optional): Apply Pangu CJK-ASCII spacing
 */
export const postProcess = (
  text: string,
  panguEnabled: boolean
): string => {
  const afterZWSP = insertZWSP(text);
  return panguEnabled ? panguSpacing(afterZWSP) : afterZWSP;
};
