# FB Post Formatter — Implementation Plan

> **Status**: ✅ All tasks completed (2026-02-08)

**Goal:** Build a client-side Markdown-to-Facebook formatting tool at `/[locale]/text/fb-post-formatter` that converts Markdown into Unicode-formatted plain text with style options, ZWSP spacing, and optional Pangu CJK spacing.

**Architecture:** Uses `marked` library with a custom renderer that maps Markdown tokens to plain-text Unicode output. Three interchangeable style configs control structural symbols (headings, lists, etc.). Post-processing pipeline handles ZWSP blank-line preservation and Pangu spacing. All client-side, zero backend.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, `marked` library, `next-intl` (i18n)

### Decision Log

| Decision | Rationale |
|----------|-----------|
| Renamed `md-to-fb` → `fb-post-formatter` | SEO: "facebook post formatter" matches user search intent. Cockpit SEO research (DataForSEO 2026-02-08) informed keyword choice. Phase 0 split into two pages per intent. |
| Added i18n with next-intl | zh-TW primary market per Cockpit freetools strategy. English for long-tail SEO. |
| Removed StyleSelector component | Integrated into Editor.tsx — simpler architecture, less prop drilling. |
| Extended Pangu regex | `\w` doesn't match Unicode Mathematical Alphanumerics (U+1D5D4–U+1D7FF). Extended for correct spacing around converted bold/italic text. |
| Added `breaks: true` to marked | Preserves single `\n` line breaks — critical for Facebook post formatting where users expect WYSIWYG line breaks. |
| Added del (strikethrough) renderer | Uses U+0336 Combining Long Stroke Overlay with CJK passthrough (CJK + combining char renders as boxes). |
| Added fb-audit module | External links reduce Facebook reach — core UX warning feature. |

---

## Prerequisites

Before starting, install `marked`:

```bash
cd /Users/yuwenhao/GitHub/freetools
npm install marked
npm install -D @types/marked
```

Also install vitest for testing:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add test script to `package.json`:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Create `vitest.config.ts` at project root:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

---

### Task 1: Unicode Conversion Module (`unicode-fonts.ts`) ✅

**Files:**
- Create: `src/lib/unicode-fonts.ts`
- Test: `src/lib/__tests__/unicode-fonts.test.ts`

This is the core shared module. It converts English letters (A-Z, a-z) and digits (0-9) into Unicode Mathematical Alphanumeric Symbols via offset calculation. CJK characters always pass through unchanged.

**Step 1: Write the failing tests**

Create `src/lib/__tests__/unicode-fonts.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { convertToUnicode, type FontStyle } from "@/lib/unicode-fonts";

describe("convertToUnicode", () => {
  describe("Sans-Serif Bold", () => {
    it("converts uppercase letters", () => {
      expect(convertToUnicode("ABC", "sansSerifBold")).toBe("\u{1D5D4}\u{1D5D5}\u{1D5D6}");
    });

    it("converts lowercase letters", () => {
      expect(convertToUnicode("abc", "sansSerifBold")).toBe("\u{1D5EE}\u{1D5EF}\u{1D5F0}");
    });

    it("converts digits", () => {
      expect(convertToUnicode("123", "sansSerifBold")).toBe("\u{1D7EC}\u{1D7ED}\u{1D7EE}");
    });
  });

  describe("Sans-Serif Italic", () => {
    it("converts uppercase letters", () => {
      expect(convertToUnicode("AB", "sansSerifItalic")).toBe("\u{1D608}\u{1D609}");
    });

    it("converts lowercase letters", () => {
      expect(convertToUnicode("ab", "sansSerifItalic")).toBe("\u{1D622}\u{1D623}");
    });

    it("passes through digits unchanged (no italic digits)", () => {
      expect(convertToUnicode("12", "sansSerifItalic")).toBe("12");
    });
  });

  describe("Sans-Serif Bold Italic", () => {
    it("converts letters", () => {
      expect(convertToUnicode("Ab", "sansSerifBoldItalic")).toBe("\u{1D63C}\u{1D657}");
    });
  });

  describe("Monospace", () => {
    it("converts uppercase letters", () => {
      expect(convertToUnicode("AB", "monospace")).toBe("\u{1D670}\u{1D671}");
    });

    it("converts lowercase letters", () => {
      expect(convertToUnicode("ab", "monospace")).toBe("\u{1D68A}\u{1D68B}");
    });

    it("converts digits", () => {
      expect(convertToUnicode("09", "monospace")).toBe("\u{1D7F6}\u{1D7FF}");
    });
  });

  describe("CJK passthrough", () => {
    it("passes CJK characters through unchanged", () => {
      expect(convertToUnicode("Hello\u4F60\u597D", "sansSerifBold"))
        .toBe("\u{1D5DB}\u{1D5EE}\u{1D5F5}\u{1D5F5}\u{1D5F8}\u4F60\u597D");
    });

    it("passes CJK Extension A through unchanged", () => {
      expect(convertToUnicode("\u3400", "sansSerifBold")).toBe("\u3400");
    });
  });

  describe("mixed content", () => {
    it("converts English and passes through CJK + symbols", () => {
      expect(convertToUnicode("Hi! \u4F60\u597D", "sansSerifBold"))
        .toBe("\u{1D5DB}\u{1D5F2}! \u4F60\u597D");
    });
  });

  describe("exception characters", () => {
    it("handles italic h exception", () => {
      expect(convertToUnicode("h", "sansSerifItalic")).toBe("\u{210E}");
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/unicode-fonts.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/lib/unicode-fonts.ts`:

```typescript
export type FontStyle =
  | "sansSerifBold"
  | "sansSerifItalic"
  | "sansSerifBoldItalic"
  | "monospace";

type FontConfig = {
  readonly uppercaseStart: number;
  readonly lowercaseStart: number;
  readonly digitStart: number | null;
  readonly exceptions: ReadonlyMap<string, number>;
};

const FONT_CONFIGS: Record<FontStyle, FontConfig> = {
  sansSerifBold: {
    uppercaseStart: 0x1d5d4,
    lowercaseStart: 0x1d5ee,
    digitStart: 0x1d7ec,
    exceptions: new Map(),
  },
  sansSerifItalic: {
    uppercaseStart: 0x1d608,
    lowercaseStart: 0x1d622,
    digitStart: null,
    exceptions: new Map([["h", 0x210e]]),
  },
  sansSerifBoldItalic: {
    uppercaseStart: 0x1d63c,
    lowercaseStart: 0x1d656,
    digitStart: null,
    exceptions: new Map(),
  },
  monospace: {
    uppercaseStart: 0x1d670,
    lowercaseStart: 0x1d68a,
    digitStart: 0x1d7f6,
    exceptions: new Map(),
  },
};

function isCJK(code: number): boolean {
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf)
  );
}

export function convertToUnicode(text: string, style: FontStyle): string {
  const config = FONT_CONFIGS[style];
  let result = "";

  for (const char of text) {
    const code = char.codePointAt(0)!;

    // Check exceptions first
    const exception = config.exceptions.get(char);
    if (exception !== undefined) {
      result += String.fromCodePoint(exception);
      continue;
    }

    // A-Z
    if (code >= 0x41 && code <= 0x5a) {
      result += String.fromCodePoint(config.uppercaseStart + (code - 0x41));
      continue;
    }

    // a-z
    if (code >= 0x61 && code <= 0x7a) {
      result += String.fromCodePoint(config.lowercaseStart + (code - 0x61));
      continue;
    }

    // 0-9
    if (code >= 0x30 && code <= 0x39 && config.digitStart !== null) {
      result += String.fromCodePoint(config.digitStart + (code - 0x30));
      continue;
    }

    // Everything else (CJK, symbols, spaces, etc.) passes through
    result += char;
  }

  return result;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/unicode-fonts.test.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/lib/unicode-fonts.ts src/lib/__tests__/unicode-fonts.test.ts vitest.config.ts package.json package-lock.json
git commit -m "feat: add unicode font conversion module with tests"
```

---

### Task 2: Style Configs (`symbol-configs.ts`) ✅

**Files:**
- Create: `src/lib/symbol-configs.ts`
- Test: `src/lib/__tests__/symbol-configs.test.ts`

Three style configurations that define how structural Markdown elements (headings, lists, blockquotes, hr) render as plain text with Unicode symbols.

**Step 1: Write the failing tests**

Create `src/lib/__tests__/symbol-configs.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { STYLE_CONFIGS, type StyleName, type SymbolConfig } from "@/lib/symbol-configs";

describe("STYLE_CONFIGS", () => {
  it("has three styles", () => {
    expect(Object.keys(STYLE_CONFIGS)).toEqual(["minimal", "structured", "social"]);
  });

  describe("minimal", () => {
    const style = STYLE_CONFIGS.minimal;

    it("h1 returns bold unicode text with blank lines", () => {
      // h1 wraps in bold unicode — actual bold conversion tested separately
      const result = style.h1("Title");
      expect(result).toContain("Title");
    });

    it("h2 returns plain text", () => {
      expect(style.h2("Subtitle")).toBe("Subtitle");
    });

    it("h3 returns plain text", () => {
      expect(style.h3("Section")).toBe("Section");
    });

    it("listItem uses bullet", () => {
      expect(style.listItem("item")).toBe("\u2022 item");
    });

    it("orderedItem uses number dot", () => {
      expect(style.orderedItem(1, "first")).toBe("1. first");
    });

    it("blockquote uses corner brackets", () => {
      expect(style.blockquote("quote")).toBe("\u300Cquote\u300D");
    });

    it("hr uses em dash", () => {
      expect(style.hr).toBe("\u2014\u2014\u2014");
    });
  });

  describe("structured (default)", () => {
    const style = STYLE_CONFIGS.structured;

    it("h1 wraps in lenticular brackets", () => {
      expect(style.h1("Title")).toBe("\u3010Title\u3011");
    });

    it("h2 uses vertical bar prefix", () => {
      expect(style.h2("Subtitle")).toBe("\u258DSubtitle");
    });

    it("h3 returns plain text", () => {
      expect(style.h3("Section")).toBe("Section");
    });

    it("listItem uses dash", () => {
      expect(style.listItem("item")).toBe("- item");
    });

    it("orderedItem uses number dot", () => {
      expect(style.orderedItem(2, "second")).toBe("2. second");
    });

    it("blockquote uses box drawing prefix", () => {
      expect(style.blockquote("quote")).toBe("\u2503quote");
    });

    it("hr uses heavy horizontal line", () => {
      expect(style.hr).toBe("\u2501\u2501\u2501\u2501\u2501\u2501");
    });
  });

  describe("social", () => {
    const style = STYLE_CONFIGS.social;

    it("h1 uses star prefix", () => {
      expect(style.h1("Title")).toBe("\u2738 Title");
    });

    it("h2 uses triangle prefix", () => {
      expect(style.h2("Subtitle")).toBe("\u25B8 Subtitle");
    });

    it("listItem uses arrow", () => {
      expect(style.listItem("item")).toBe("\u2192 item");
    });

    it("blockquote uses speech balloon", () => {
      expect(style.blockquote("quote")).toBe("\uD83D\uDCAC quote");
    });

    it("hr uses middle dots", () => {
      expect(style.hr).toBe("\u00B7 \u00B7 \u00B7");
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/symbol-configs.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/lib/symbol-configs.ts`:

```typescript
export type StyleName = "minimal" | "structured" | "social";

export type SymbolConfig = {
  readonly h1: (text: string) => string;
  readonly h2: (text: string) => string;
  readonly h3: (text: string) => string;
  readonly listItem: (text: string) => string;
  readonly orderedItem: (n: number, text: string) => string;
  readonly blockquote: (text: string) => string;
  readonly hr: string;
};

export const STYLE_CONFIGS: Record<StyleName, SymbolConfig> = {
  minimal: {
    h1: (text) => text,
    h2: (text) => text,
    h3: (text) => text,
    listItem: (text) => `\u2022 ${text}`,
    orderedItem: (n, text) => `${n}. ${text}`,
    blockquote: (text) => `\u300C${text}\u300D`,
    hr: "\u2014\u2014\u2014",
  },
  structured: {
    h1: (text) => `\u3010${text}\u3011`,
    h2: (text) => `\u258D${text}`,
    h3: (text) => text,
    listItem: (text) => `- ${text}`,
    orderedItem: (n, text) => `${n}. ${text}`,
    blockquote: (text) => `\u2503${text}`,
    hr: "\u2501\u2501\u2501\u2501\u2501\u2501",
  },
  social: {
    h1: (text) => `\u2738 ${text}`,
    h2: (text) => `\u25B8 ${text}`,
    h3: (text) => text,
    listItem: (text) => `\u2192 ${text}`,
    orderedItem: (n, text) => `${n}. ${text}`,
    blockquote: (text) => `\uD83D\uDCAC ${text}`,
    hr: "\u00B7 \u00B7 \u00B7",
  },
};

export const DEFAULT_STYLE: StyleName = "structured";
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/symbol-configs.test.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/lib/symbol-configs.ts src/lib/__tests__/symbol-configs.test.ts
git commit -m "feat: add three style configs for FB formatting"
```

---

### Task 3: Post-Processing Pipeline (`post-process.ts`) ✅

**Files:**
- Create: `src/lib/post-process.ts`
- Test: `src/lib/__tests__/post-process.test.ts`

Two-stage pipeline: (1) ZWSP blank-line preservation (always on), (2) Pangu CJK spacing (optional toggle).

**Step 1: Write the failing tests**

Create `src/lib/__tests__/post-process.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { insertZWSP, panguSpacing, postProcess } from "@/lib/post-process";

describe("insertZWSP", () => {
  it("inserts ZWSP in consecutive blank lines", () => {
    expect(insertZWSP("a\n\n\nb")).toBe("a\n\u200B\n\u200B\nb");
  });

  it("inserts ZWSP in double blank line", () => {
    expect(insertZWSP("a\n\nb")).toBe("a\n\u200B\nb");
  });

  it("does not modify single line break", () => {
    expect(insertZWSP("a\nb")).toBe("a\nb");
  });

  it("handles text with no blank lines", () => {
    expect(insertZWSP("hello")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(insertZWSP("")).toBe("");
  });
});

describe("panguSpacing", () => {
  it("inserts space between CJK and ASCII word", () => {
    expect(panguSpacing("\u6211\u7528Mac\u5BEB\u6587")).toBe("\u6211\u7528 Mac \u5BEB\u6587");
  });

  it("inserts space between ASCII word and CJK", () => {
    expect(panguSpacing("hello\u4F60\u597D")).toBe("hello \u4F60\u597D");
  });

  it("does not modify pure English", () => {
    expect(panguSpacing("I use Mac")).toBe("I use Mac");
  });

  it("does not modify pure CJK", () => {
    expect(panguSpacing("\u4F60\u597D\u4E16\u754C")).toBe("\u4F60\u597D\u4E16\u754C");
  });

  it("handles CJK with digits", () => {
    expect(panguSpacing("\u7B2C3\u7AE0")).toBe("\u7B2C 3 \u7AE0");
  });

  it("does not double-space existing spaces", () => {
    expect(panguSpacing("\u6211\u7528 Mac")).toBe("\u6211\u7528 Mac");
  });
});

describe("postProcess", () => {
  it("applies ZWSP only when pangu is off", () => {
    const result = postProcess("a\n\nb", false);
    expect(result).toBe("a\n\u200B\nb");
  });

  it("applies both ZWSP and Pangu when pangu is on", () => {
    const result = postProcess("\u6211\u7528Mac\n\n\u4F60\u597D", true);
    expect(result).toContain("\u200B");
    expect(result).toContain("\u6211\u7528 Mac");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/post-process.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/lib/post-process.ts`:

```typescript
const CJK_RANGE = "[\u4e00-\u9fff\u3400-\u4dbf]";
const ASCII_WORD = "[\\w]";

const CJK_BEFORE_ASCII = new RegExp(`(${CJK_RANGE})(${ASCII_WORD})`, "g");
const ASCII_BEFORE_CJK = new RegExp(`(${ASCII_WORD})(${CJK_RANGE})`, "g");

export function insertZWSP(text: string): string {
  // Replace each empty line (just \n between content lines) with \n + ZWSP + \n
  return text.replace(/\n(?=\n)/g, "\n\u200B");
}

export function panguSpacing(text: string): string {
  return text
    .replace(CJK_BEFORE_ASCII, "$1 $2")
    .replace(ASCII_BEFORE_CJK, "$1 $2");
}

export function postProcess(text: string, panguEnabled: boolean): string {
  let result = insertZWSP(text);
  if (panguEnabled) {
    result = panguSpacing(result);
  }
  return result;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/post-process.test.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/lib/post-process.ts src/lib/__tests__/post-process.test.ts
git commit -m "feat: add ZWSP and Pangu post-processing pipeline"
```

---

### Task 4: Clipboard Utility (`clipboard.ts`) ✅

**Files:**
- Create: `src/lib/clipboard.ts`
- Test: `src/lib/__tests__/clipboard.test.ts`

Wraps the Clipboard API with a fallback to `document.execCommand('copy')`.

**Step 1: Write the failing tests**

Create `src/lib/__tests__/clipboard.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { copyToClipboard } from "@/lib/clipboard";

describe("copyToClipboard", () => {
  it("uses navigator.clipboard when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    const result = await copyToClipboard("test text");
    expect(writeText).toHaveBeenCalledWith("test text");
    expect(result).toBe(true);
  });

  it("returns false on clipboard failure", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("fail"));
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    const result = await copyToClipboard("test text");
    expect(result).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/clipboard.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/lib/clipboard.ts`:

```typescript
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/clipboard.test.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/lib/clipboard.ts src/lib/__tests__/clipboard.test.ts
git commit -m "feat: add clipboard utility with fallback"
```

---

### Task 5: FB Renderer — Core (`fb-renderer.ts`) ✅

**Files:**
- Create: `src/lib/fb-renderer.ts`
- Test: `src/lib/__tests__/fb-renderer.test.ts`

The main conversion engine. Uses `marked` with a custom renderer that maps each Markdown token to styled plain text output. This is the largest and most important module.

**Step 1: Write the failing tests**

Create `src/lib/__tests__/fb-renderer.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { convertMarkdownToFb } from "@/lib/fb-renderer";
import { STYLE_CONFIGS } from "@/lib/symbol-configs";

const structured = STYLE_CONFIGS.structured;

describe("convertMarkdownToFb", () => {
  describe("headings", () => {
    it("converts h1", () => {
      const result = convertMarkdownToFb("# Hello", structured);
      expect(result).toContain("\u3010Hello\u3011");
    });

    it("converts h2", () => {
      const result = convertMarkdownToFb("## Section", structured);
      expect(result).toContain("\u258DSection");
    });

    it("converts h3", () => {
      const result = convertMarkdownToFb("### Detail", structured);
      expect(result).toContain("Detail");
    });
  });

  describe("inline formatting", () => {
    it("converts bold English to sans-serif bold unicode", () => {
      const result = convertMarkdownToFb("**Hello**", structured);
      // H=1D5DB, e=1D5EE, l=1D5F5, l=1D5F5, o=1D5F8
      expect(result).toContain("\u{1D5DB}\u{1D5EE}\u{1D5F5}\u{1D5F5}\u{1D5F8}");
    });

    it("passes through CJK in bold", () => {
      const result = convertMarkdownToFb("**\u4F60\u597D**", structured);
      expect(result).toContain("\u4F60\u597D");
    });

    it("converts italic English", () => {
      const result = convertMarkdownToFb("*test*", structured);
      expect(result).toContain("\u{1D631}\u{1D5EE}\u{1D62C}\u{1D631}");
    });

    it("converts inline code to monospace", () => {
      const result = convertMarkdownToFb("`code`", structured);
      expect(result).toContain("\u{1D68C}\u{1D698}\u{1D68D}\u{1D68E}");
    });
  });

  describe("lists", () => {
    it("converts unordered list", () => {
      const result = convertMarkdownToFb("- item one\n- item two", structured);
      expect(result).toContain("- item one");
      expect(result).toContain("- item two");
    });

    it("converts ordered list", () => {
      const result = convertMarkdownToFb("1. first\n2. second", structured);
      expect(result).toContain("1. first");
      expect(result).toContain("2. second");
    });
  });

  describe("blockquote", () => {
    it("converts blockquote with structured style", () => {
      const result = convertMarkdownToFb("> some quote", structured);
      expect(result).toContain("\u2503some quote");
    });
  });

  describe("horizontal rule", () => {
    it("converts hr", () => {
      const result = convertMarkdownToFb("---", structured);
      expect(result).toContain("\u2501\u2501\u2501\u2501\u2501\u2501");
    });
  });

  describe("links and images", () => {
    it("expands link to text (url)", () => {
      const result = convertMarkdownToFb("[Google](https://google.com)", structured);
      expect(result).toContain("Google (https://google.com)");
    });

    it("converts image to alt text marker", () => {
      const result = convertMarkdownToFb("![photo](https://img.jpg)", structured);
      expect(result).toContain("[image: photo]");
    });
  });

  describe("code blocks", () => {
    it("converts fenced code block to monospace", () => {
      const result = convertMarkdownToFb("```\nvar x\n```", structured);
      // v=1D69F, a=1D68A, r=1D69B
      expect(result).toContain("\u{1D69F}\u{1D68A}\u{1D69B}");
    });
  });

  describe("table conversion", () => {
    it("converts table to key:value format", () => {
      const md = "| Name | Price |\n|------|-------|\n| Apple | $30 |";
      const result = convertMarkdownToFb(md, structured);
      expect(result).toContain("- Apple");
      expect(result).toContain("Name: Apple");
      expect(result).toContain("Price: $30");
    });

    it("handles single-column table as plain list", () => {
      const md = "| Item |\n|------|\n| Apple |\n| Banana |";
      const result = convertMarkdownToFb(md, structured);
      expect(result).toContain("- Apple");
      expect(result).toContain("- Banana");
    });
  });

  describe("paragraph", () => {
    it("outputs paragraph text with line break", () => {
      const result = convertMarkdownToFb("Hello world", structured);
      expect(result.trim()).toContain("Hello world");
    });
  });

  describe("with minimal style", () => {
    const minimal = STYLE_CONFIGS.minimal;

    it("uses bullet for list items", () => {
      const result = convertMarkdownToFb("- item", minimal);
      expect(result).toContain("\u2022 item");
    });

    it("uses em dash for hr", () => {
      const result = convertMarkdownToFb("---", minimal);
      expect(result).toContain("\u2014\u2014\u2014");
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/fb-renderer.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/lib/fb-renderer.ts`:

```typescript
import { marked, type Tokens } from "marked";
import { convertToUnicode } from "@/lib/unicode-fonts";
import { type SymbolConfig } from "@/lib/symbol-configs";

function createFbRenderer(config: SymbolConfig) {
  let orderedCounter = 0;

  const renderer: marked.RendererObject = {
    heading({ text, depth }: Tokens.Heading): string {
      const raw = stripHtml(text);
      switch (depth) {
        case 1:
          return `\n${config.h1(raw)}\n\n`;
        case 2:
          return `\n${config.h2(raw)}\n\n`;
        case 3:
          return `\n${config.h3(raw)}\n\n`;
        default:
          return `\n${raw}\n\n`;
      }
    },

    paragraph({ text }: Tokens.Paragraph): string {
      return `${text}\n\n`;
    },

    strong({ text }: Tokens.Strong): string {
      return convertToUnicode(stripHtml(text), "sansSerifBold");
    },

    em({ text }: Tokens.Em): string {
      return convertToUnicode(stripHtml(text), "sansSerifItalic");
    },

    codespan({ text }: Tokens.Codespan): string {
      return convertToUnicode(text, "monospace");
    },

    code({ text }: Tokens.Code): string {
      const mono = convertToUnicode(text, "monospace");
      return `\n${mono}\n\n`;
    },

    blockquote({ text }: Tokens.Blockquote): string {
      const clean = stripHtml(text).replace(/\n+$/, "");
      return `${config.blockquote(clean)}\n\n`;
    },

    list({ items, ordered }: Tokens.List): string {
      orderedCounter = 0;
      const result = items
        .map((item) => {
          const text = stripHtml(item.text).replace(/\n+$/, "");
          if (ordered) {
            orderedCounter += 1;
            return config.orderedItem(orderedCounter, text);
          }
          return config.listItem(text);
        })
        .join("\n");
      return `${result}\n\n`;
    },

    listitem({ text }: Tokens.ListItem): string {
      return text;
    },

    hr(): string {
      return `\n${config.hr}\n\n`;
    },

    link({ href, text }: Tokens.Link): string {
      const clean = stripHtml(text);
      return `${clean} (${href})`;
    },

    image({ href, text }: Tokens.Image): string {
      return `[image: ${text || href}]`;
    },

    table({ header, rows }: Tokens.Table): string {
      const headers = header.map((h) => stripHtml(h.text));
      const isSingleColumn = headers.length <= 1;

      const lines: string[] = [];
      for (const row of rows) {
        const cells = row.map((c) => stripHtml(c.text));
        if (isSingleColumn) {
          lines.push(config.listItem(cells[0] || ""));
        } else {
          const label = cells[0] || "";
          lines.push(config.listItem(label));
          headers.forEach((h, i) => {
            lines.push(`\u3000${h}: ${cells[i] || ""}`);
          });
          lines.push("");
        }
      }

      return `${lines.join("\n")}\n\n`;
    },

    br(): string {
      return "\n";
    },

    text({ text }: Tokens.Text): string {
      return text;
    },

    html(): string {
      return "";
    },

    space(): string {
      return "\n";
    },
  };

  return renderer;
}

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function convertMarkdownToFb(
  markdown: string,
  config: SymbolConfig
): string {
  const renderer = createFbRenderer(config);
  marked.use({ renderer });

  const result = marked.parse(markdown, { async: false }) as string;

  // Clean up excessive blank lines (more than 2 consecutive \n → 2)
  return result.replace(/\n{3,}/g, "\n\n").trim();
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/fb-renderer.test.ts`
Expected: All PASS (some italic tests may need adjustment based on exact marked tokenization — fix as needed)

**Step 5: Commit**

```bash
git add src/lib/fb-renderer.ts src/lib/__tests__/fb-renderer.test.ts
git commit -m "feat: add marked-based FB renderer with custom token mapping"
```

---

### Task 6: StyleSelector Component ✅ (removed — integrated into Editor)

**Files:**
- Create: `src/components/md-to-fb/StyleSelector.tsx`

A single row with three style chips and a Pangu toggle. No separate test file — will be tested via integration in Task 10.

**Step 1: Write the component**

Create `src/components/md-to-fb/StyleSelector.tsx`:

```tsx
"use client";

import { type StyleName } from "@/lib/symbol-configs";

type StyleSelectorProps = {
  readonly activeStyle: StyleName;
  readonly onStyleChange: (style: StyleName) => void;
  readonly panguEnabled: boolean;
  readonly onPanguToggle: () => void;
};

const STYLE_OPTIONS: { value: StyleName; label: string }[] = [
  { value: "minimal", label: "\u6975\u7C21" },
  { value: "structured", label: "\u7D50\u69CB" },
  { value: "social", label: "\u793E\u7FA4" },
];

export function StyleSelector({
  activeStyle,
  onStyleChange,
  panguEnabled,
  onPanguToggle,
}: StyleSelectorProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex gap-2">
        {STYLE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => onStyleChange(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeStyle === value
                ? "bg-[#CA8A04] text-white"
                : "border border-[#1A1A1A]/20 text-[#1A1A1A]/70 hover:border-[#CA8A04]/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onPanguToggle}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          panguEnabled
            ? "bg-[#CA8A04] text-white"
            : "border border-[#1A1A1A]/20 text-[#1A1A1A]/70 hover:border-[#CA8A04]/50"
        }`}
        title="Insert spaces between CJK and English characters"
      >
        Pangu
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/md-to-fb/StyleSelector.tsx
git commit -m "feat: add StyleSelector component with style chips and Pangu toggle"
```

---

### Task 7: MarkdownInput Component ✅

**Files:**
- Create: `src/components/md-to-fb/MarkdownInput.tsx`

Left-column textarea with monospace font, character count, and 5000-char limit.

**Step 1: Write the component**

Create `src/components/md-to-fb/MarkdownInput.tsx`:

```tsx
"use client";

type MarkdownInputProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
};

const MAX_CHARS = 5000;

export function MarkdownInput({ value, onChange }: MarkdownInputProps) {
  const isOverLimit = value.length > MAX_CHARS;

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-[#1A1A1A]/10 bg-white">
      <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 px-4 py-2">
        <span className="text-sm font-medium text-[#1A1A1A]/70">
          Markdown Input
        </span>
        <span
          className={`text-xs ${isOverLimit ? "text-red-500" : "text-[#1A1A1A]/40"}`}
        >
          {value.length} / {MAX_CHARS}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
        placeholder="Paste your Markdown here..."
        className="flex-1 resize-none bg-transparent p-4 font-mono text-sm text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:outline-none"
        rows={16}
        spellCheck={false}
      />
      {isOverLimit && (
        <p className="px-4 pb-2 text-xs text-red-500">
          Consider splitting into multiple posts
        </p>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/md-to-fb/MarkdownInput.tsx
git commit -m "feat: add MarkdownInput textarea component"
```

---

### Task 8: FbPreview Component ✅

**Files:**
- Create: `src/components/md-to-fb/FbPreview.tsx`

Right-column preview pane with copy button and "Copied!" flash feedback.

**Step 1: Write the component**

Create `src/components/md-to-fb/FbPreview.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { copyToClipboard } from "@/lib/clipboard";

type FbPreviewProps = {
  readonly output: string;
};

export function FbPreview({ output }: FbPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(output);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [output]);

  const isEmpty = output.trim().length === 0;

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-[#1A1A1A]/10 bg-white">
      <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 px-4 py-2">
        <span className="text-sm font-medium text-[#1A1A1A]/70">
          FB Preview
        </span>
        <button
          type="button"
          onClick={handleCopy}
          disabled={isEmpty}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            copied
              ? "bg-green-500 text-white"
              : isEmpty
                ? "bg-[#1A1A1A]/10 text-[#1A1A1A]/30"
                : "bg-[#CA8A04] text-white hover:bg-[#CA8A04]/90"
          }`}
        >
          {copied ? "Copied!" : "Copy All"}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {isEmpty ? (
          <p className="text-sm text-[#1A1A1A]/30">
            Preview will appear here...
          </p>
        ) : (
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-[#1A1A1A]">
            {output}
          </pre>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/md-to-fb/FbPreview.tsx
git commit -m "feat: add FbPreview component with copy button"
```

---

### Task 9: Editor Component (State Management) ✅

**Files:**
- Create: `src/components/md-to-fb/Editor.tsx`

The main container that holds all state, wires up the conversion pipeline, and arranges the two-column layout.

**Step 1: Write the component**

Create `src/components/md-to-fb/Editor.tsx`:

```tsx
"use client";

import { useState, useMemo, useCallback } from "react";
import { StyleSelector } from "./StyleSelector";
import { MarkdownInput } from "./MarkdownInput";
import { FbPreview } from "./FbPreview";
import { convertMarkdownToFb } from "@/lib/fb-renderer";
import { postProcess } from "@/lib/post-process";
import { STYLE_CONFIGS, DEFAULT_STYLE, type StyleName } from "@/lib/symbol-configs";

export function Editor() {
  const [markdownInput, setMarkdownInput] = useState("");
  const [activeStyle, setActiveStyle] = useState<StyleName>(DEFAULT_STYLE);
  const [panguEnabled, setPanguEnabled] = useState(false);

  const fbOutput = useMemo(() => {
    if (!markdownInput.trim()) return "";
    const rendered = convertMarkdownToFb(markdownInput, STYLE_CONFIGS[activeStyle]);
    return postProcess(rendered, panguEnabled);
  }, [markdownInput, activeStyle, panguEnabled]);

  const handlePanguToggle = useCallback(() => {
    setPanguEnabled((prev) => !prev);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <StyleSelector
        activeStyle={activeStyle}
        onStyleChange={setActiveStyle}
        panguEnabled={panguEnabled}
        onPanguToggle={handlePanguToggle}
      />
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <MarkdownInput value={markdownInput} onChange={setMarkdownInput} />
        <FbPreview output={fbOutput} />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/md-to-fb/Editor.tsx
git commit -m "feat: add Editor container with state management and conversion pipeline"
```

---

### Task 10: Page Entry + SEO (`page.tsx`) ✅

**Files:**
- Create: `src/app/text/md-to-fb/page.tsx`

The Next.js page component with SEO metadata, heading, and structured data.

**Step 1: Write the page**

Create `src/app/text/md-to-fb/page.tsx`:

```tsx
import type { Metadata } from "next";
import { Editor } from "@/components/md-to-fb/Editor";

export const metadata: Metadata = {
  title:
    "Markdown to FB Post Formatting \u2014 Convert Markdown to Facebook Text | FreeTools",
  description:
    "Free online Markdown to Facebook formatting tool. Supports bold, headings, lists, dividers. Paste Markdown, preview Facebook format, one-click copy.",
};

export default function MdToFbPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-[#1A1A1A]">
          Markdown \u2192 FB Formatting Tool
        </h1>
        <p className="mt-2 text-[#1A1A1A]/60">
          Paste Markdown, preview Facebook format, one-click copy
        </p>
      </header>

      <Editor />

      <section className="mt-16 space-y-8 text-[#1A1A1A]/80">
        <div>
          <h2 className="mb-3 text-xl font-semibold text-[#1A1A1A]">
            How to Use
          </h2>
          <ol className="list-inside list-decimal space-y-1 text-sm">
            <li>Paste or type your Markdown in the left panel</li>
            <li>Choose a formatting style (Minimal / Structured / Social)</li>
            <li>Click &quot;Copy All&quot; and paste into Facebook</li>
          </ol>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-[#1A1A1A]">FAQ</h2>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="font-medium">
                Can you bold text in Facebook posts?
              </dt>
              <dd className="mt-1 text-[#1A1A1A]/60">
                Facebook doesn&apos;t support native bold formatting in regular
                posts. This tool uses Unicode Mathematical Bold characters to
                create a visual bold effect for English text.
              </dd>
            </div>
            <div>
              <dt className="font-medium">
                Why doesn&apos;t Chinese bold text change?
              </dt>
              <dd className="mt-1 text-[#1A1A1A]/60">
                Unicode Mathematical Bold only covers Latin letters (A-Z) and
                digits (0-9). CJK characters are not included in this Unicode
                range, so Chinese text remains unchanged.
              </dd>
            </div>
            <div>
              <dt className="font-medium">
                What Markdown syntax is supported?
              </dt>
              <dd className="mt-1 text-[#1A1A1A]/60">
                Headings (#, ##, ###), bold (**), italic (*), inline code (`),
                code blocks (```), lists (- and 1.), blockquotes (&gt;),
                horizontal rules (---), links, images, and tables.
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
```

**Step 2: Verify it builds**

Run: `npx next build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/app/text/md-to-fb/page.tsx
git commit -m "feat: add MD to FB page with SEO metadata and FAQ section"
```

---

### Task 11: Integration Test & Manual Verification ✅

**Files:**
- Create: `src/lib/__tests__/integration.test.ts`

End-to-end test of the full pipeline: Markdown input → renderer → post-process → output.

**Step 1: Write integration test**

Create `src/lib/__tests__/integration.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { convertMarkdownToFb } from "@/lib/fb-renderer";
import { postProcess } from "@/lib/post-process";
import { STYLE_CONFIGS } from "@/lib/symbol-configs";

describe("full pipeline integration", () => {
  it("converts a complete markdown document (structured style)", () => {
    const md = `# Announcement

## Details

This is **important** news.

- Item one
- Item two

> A wise quote

---

Check [our site](https://example.com) for more.`;

    const rendered = convertMarkdownToFb(md, STYLE_CONFIGS.structured);
    const output = postProcess(rendered, false);

    expect(output).toContain("\u3010Announcement\u3011");
    expect(output).toContain("\u258DDetails");
    expect(output).toContain("\u{1D5F2}\u{1D5F6}\u{1D5F9}\u{1D5F8}\u{1D5FB}\u{1D631}\u{1D5EE}\u{1D5F7}\u{1D631}");
    expect(output).toContain("- Item one");
    expect(output).toContain("- Item two");
    expect(output).toContain("\u2503A wise quote");
    expect(output).toContain("\u2501\u2501\u2501\u2501\u2501\u2501");
    expect(output).toContain("our site (https://example.com)");
  });

  it("applies Pangu spacing to mixed CJK/English content", () => {
    const md = "\u6211\u7528Mac\u5BEB\u6587";
    const rendered = convertMarkdownToFb(md, STYLE_CONFIGS.structured);
    const output = postProcess(rendered, true);

    expect(output).toContain("\u6211\u7528 Mac \u5BEB\u6587");
  });

  it("preserves blank lines with ZWSP", () => {
    const md = "Paragraph 1\n\nParagraph 2";
    const rendered = convertMarkdownToFb(md, STYLE_CONFIGS.structured);
    const output = postProcess(rendered, false);

    // Should contain ZWSP between paragraphs
    expect(output).toContain("\u200B");
  });

  it("handles table conversion", () => {
    const md = "| Name | Price |\n|------|-------|\n| Apple | $30 |\n| Banana | $15 |";
    const rendered = convertMarkdownToFb(md, STYLE_CONFIGS.structured);

    expect(rendered).toContain("- Apple");
    expect(rendered).toContain("Name: Apple");
    expect(rendered).toContain("Price: $30");
    expect(rendered).toContain("- Banana");
  });

  it("works with all three styles", () => {
    const md = "# Title\n\n- item\n\n---";

    const minimal = convertMarkdownToFb(md, STYLE_CONFIGS.minimal);
    expect(minimal).toContain("Title");
    expect(minimal).toContain("\u2022 item");
    expect(minimal).toContain("\u2014\u2014\u2014");

    const structured = convertMarkdownToFb(md, STYLE_CONFIGS.structured);
    expect(structured).toContain("\u3010Title\u3011");
    expect(structured).toContain("- item");
    expect(structured).toContain("\u2501\u2501\u2501\u2501\u2501\u2501");

    const social = convertMarkdownToFb(md, STYLE_CONFIGS.social);
    expect(social).toContain("\u2738 Title");
    expect(social).toContain("\u2192 item");
    expect(social).toContain("\u00B7 \u00B7 \u00B7");
  });
});
```

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

**Step 3: Manual verification**

Run: `npm run dev`
Open: `http://localhost:3000/text/md-to-fb`

Test these scenarios manually:
1. Type `# Hello` — should show `【Hello】` in preview
2. Type `**Bold Text**` — should show Unicode bold
3. Type `**\u4F60\u597D**` — CJK should stay unchanged
4. Switch between three styles — output should change
5. Toggle Pangu — mixed CJK/English should get spaces
6. Click "Copy All" — should show "Copied!" flash
7. Check mobile layout (resize browser narrow) — should stack vertically

**Step 4: Commit**

```bash
git add src/lib/__tests__/integration.test.ts
git commit -m "test: add full pipeline integration tests"
```

---

### Task 12: Build Verification & Final Cleanup ✅

**Files:**
- Modify: `src/app/text/md-to-fb/page.tsx` (if any build issues)

**Step 1: Run production build**

Run: `npx next build`
Expected: Build succeeds with zero errors

**Step 2: Run all tests one final time**

Run: `npx vitest run`
Expected: All PASS

**Step 3: Run linter**

Run: `npx eslint src/`
Expected: No errors (warnings acceptable)

**Step 4: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: build verification and cleanup"
```

**Step 5: Push to remote**

```bash
git push origin main
```

---

## Summary

| Task | Module | Description | Status |
|------|--------|-------------|--------|
| 1 | `unicode-fonts.ts` | Unicode offset conversion (shared core) | ✅ |
| 2 | `symbol-configs.ts` | Three style configurations | ✅ |
| 3 | `post-process.ts` | ZWSP + Pangu pipeline (extended to Unicode Math range) | ✅ |
| 4 | `clipboard.ts` | Clipboard API wrapper | ✅ |
| 5 | `fb-renderer.ts` | marked custom renderer + del + br + breaks:true | ✅ |
| 6 | `StyleSelector.tsx` | ~~Style chips + Pangu toggle UI~~ Removed, integrated into Editor | ✅ |
| 7 | `MarkdownInput.tsx` | Left textarea panel + backdrop highlighting | ✅ |
| 8 | `FbPreview.tsx` | Right preview panel + copy button + URL highlighting | ✅ |
| 9 | `Editor.tsx` | State management + style/pangu controls + audit warnings | ✅ |
| 10 | `page.tsx` | Next.js page + i18n SEO + FAQ | ✅ |
| 11 | Integration tests | Full pipeline verification | ✅ |
| 12 | Build & cleanup | Production build + push | ✅ |
| 13 | `MobileNav.tsx` | Mobile hamburger menu for < 768px viewports | ✅ |

### Additional work not in original plan

| Module | Description |
|--------|-------------|
| `next-intl` setup | i18n routing, middleware, messages (zh-TW + en) |
| `[locale]` layout | Locale-based routing with Inter/Newsreader fonts |
| `Header.tsx` / `Footer.tsx` / `LocaleSwitcher.tsx` | Layout components |
| `fb-audit.ts` | External link detection module + tests |
| Backdrop highlighting | CJK-in-markdown-markers visual warning |
| `MobileNav.tsx` | Mobile hamburger menu (see Task 13 below) |

**Total commits (actual):** 18 (12 original plan + 6 additional)
**Dependencies added:** `marked`, `next-intl`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`
**Tests:** 142 passing across 7 test files

---

### Task 13: Mobile Hamburger Menu ✅

**Files:**
- Created: `src/components/layout/MobileNav.tsx` (client component)
- Modified: `src/components/layout/Header.tsx` (added MobileNav import + render)

**Goal:** Add a hamburger menu for mobile viewports (< 768px) so users can access nav links and the language switcher on small screens.

**Implementation details:**

`MobileNav.tsx` — new `"use client"` component:
- Receives `navLinks` as props (array of `{ href, label, active? }`)
- `useState` for `isOpen` toggle
- **Hamburger button**: 3-line SVG icon, switches to X (close) icon when open; `md:hidden` hides it on desktop
- **Overlay**: Semi-transparent `bg-black/20` backdrop; clicking it closes the menu
- **Dropdown menu**: Full-width panel positioned below header (`top-[57px]`) with:
  - Vertically stacked nav links (with active state highlight `bg-ink-50`)
  - `<LocaleSwitcher />` at the bottom, separated by a border
- **Auto-close on navigation**: `useEffect` watches `usePathname()` and sets `isOpen(false)` on route change
- **Body scroll lock**: Sets `document.body.style.overflow = "hidden"` when menu is open
- **Accessibility**: `aria-expanded` and `aria-label` on toggle button

`Header.tsx` changes:
- Added `import MobileNav from "@/components/layout/MobileNav"`
- Added `<MobileNav navLinks={navLinks} />` after the existing desktop `<nav>`
- Desktop nav (`hidden md:flex`) unchanged

**Verification:**
- `npm run build` — passes with zero errors
- Mobile (< 768px): hamburger visible, opens dropdown with links + locale switcher
- Desktop (768px+): hamburger hidden, desktop nav unchanged

---

### Task 14: Font Generator — Full Implementation ✅

**Goal:** Implement Phase 0a font generator at `/text/font-generator` with 10 Unicode font styles, shared text tools navigation, and header dropdown.

**New files:**

| File | Description |
|------|-------------|
| `src/components/font-generator/FontGenerator.tsx` | Main tool component (client). Single-line input, 10 preview rows, per-row copy, CJK visual differentiation, CSS text-decoration for strikethrough/underline |
| `src/app/[locale]/text/font-generator/page.tsx` | Page entry (server). Hero, TextToolsNav, FontGenerator, SEO content (how-to + 5 FAQs), related tools |
| `src/components/layout/TextToolsNav.tsx` | Shared tab bar for text tools (client). Real `<Link>` for SEO, `usePathname()` active state |
| `src/components/layout/TextToolsDropdown.tsx` | Desktop header dropdown (client). Click toggle, click-outside-to-close, auto-close on route change |
| `public/fonts/satoshi-400.woff2` | Self-hosted Satoshi font, weight 400 |
| `public/fonts/satoshi-500.woff2` | Self-hosted Satoshi font, weight 500 |
| `public/fonts/satoshi-700.woff2` | Self-hosted Satoshi font, weight 700 |

**Modified files:**

| File | Changes |
|------|---------|
| `src/lib/unicode-fonts.ts` | Extended from 4 to 14 font styles. Added `GeneratorFontStyle` type, offset configs (bold, italic, boldItalic, boldScript, doubleStruck), lookup tables (circled, smallCaps), combining chars (strikethrough, underline), fullwidth. Added `convertToUnicodeRich()` returning per-char `{ char, converted }` for visual differentiation. Added `isCjkChar()` export. |
| `src/components/layout/Header.tsx` | Replaced flat "文字工具" link with `TextToolsDropdown`. Added `textToolItems` array. Updated `mobileNavLinks` with `subItems`. Nav links `text-sm` → `text-base`. |
| `src/components/layout/MobileNav.tsx` | Extended `NavLink` interface with `subItems`. Parent with subItems renders as `<span>` + indented sub-links. |
| `src/components/layout/Footer.tsx` | Copyright `text-xs` → `text-sm`. |
| `src/app/[locale]/layout.tsx` | Font: Inter (Google) → Satoshi (local woff2) + Noto Sans TC (Google, CJK fallback). Kept Newsreader for serif. |
| `src/app/globals.css` | `--font-sans`: updated to `var(--font-satoshi), var(--font-noto-sans-tc), system-ui, sans-serif` |
| `src/app/[locale]/text/fb-post-formatter/page.tsx` | Added TextToolsNav. Updated related tools to link to font-generator. |
| `messages/zh-TW.json` | Added: FontGenerator (19 keys), TextToolsNav (2), Metadata (2), Header (2) |
| `messages/en.json` | Same additions as zh-TW |

**Key implementation decisions:**

| Decision | Rationale |
|----------|-----------|
| CSS `text-decoration` for preview, combining chars for copy | U+0336/U+0332 render as black blocks in Satoshi/Inter. CSS preview is clean; combining chars still used for clipboard to ensure social media compatibility. |
| `convertToUnicodeRich()` per-char API | Enables visual differentiation — unconverted CJK chars rendered as `text-ink-600/30` (30% opacity), converted chars as `text-ink-900`. Users see the difference without reading any hint. |
| Default example "Hello 你好 123" | Shows mixed-language conversion behavior at a glance when input is empty. |
| TextToolsNav with real `<Link>` | SEO: crawlable links, not JS-only tabs. |
| Satoshi font (self-hosted) | Brand consistency with yu-wenhao.com. `next/font/local` avoids external DNS lookup, fonts auto-preloaded. |
| Low-key CJK hint (`text-ink-400`) | Replaced amber banner with subtle note. Visual differentiation (dimmed CJK) is the primary feedback; text hint is secondary. |

**Verification:**
- `npm run build` — passes with zero errors
- All 10 font styles render correctly
- CJK visual differentiation working (unconverted chars dimmed)
- TextToolsNav switches between font-generator and fb-post-formatter
- Header dropdown shows both text tools
- Mobile hamburger menu shows text tools sub-items
