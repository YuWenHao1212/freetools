# FB Post Formatter — Design Document

## Overview

A client-side tool that converts Markdown text into Facebook-optimized plain text with Unicode formatting, smart line spacing, and optional Pangu spacing for CJK content.

**URL**: `/[locale]/text/fb-post-formatter` (locale: `zh-TW`, `en`)
**Tech**: Next.js 16 App Router + TypeScript + Tailwind CSS v4 + `marked` + `next-intl`
**Cost**: Zero (pure frontend, no backend)
**Status**: ✅ Implemented (2026-02-08)

### Decision Log

| Decision | Rationale |
|----------|-----------|
| Renamed `md-to-fb` → `fb-post-formatter` | SEO: "facebook post formatter" matches user search intent better than "markdown to facebook". Phase 0 split into two pages (font-generator + fb-post-formatter) because user intents differ — one page per intent is cleaner for SEO. |
| Added i18n (next-intl) | zh-TW is primary market (Taiwan tool site positioning per Cockpit strategy). English covers long-tail SEO traffic. |
| Removed StyleSelector as standalone component | Simplified UI — style switching and Pangu toggle integrated directly into Editor, reducing prop drilling and component layers. |
| Extended Pangu regex to Unicode Mathematical range | Original `\w` couldn't match converted Unicode Bold/Italic characters, causing Pangu spacing to fail on rendered output. |
| Added fb-audit module | External link detection is a core UX need — warns users that outbound URLs reduce Facebook reach. |

---

## Architecture

```
User input (textarea with backdrop highlighting)
       |
       v  (useMemo — recomputes on input/style/pangu change)
   marked.parse() with custom renderer (breaks: true)
       |  receives symbolConfig based on active style
       |
       v
   Post-processing pipeline:
       |  1. ZWSP blank line preservation (always on)
       |  2. Pangu CJK spacing (toggle, covers Unicode Math Alphanumerics)
       |
       v
   Audit checks:
       |  - External link detection (fb-audit.ts)
       |  - CJK-in-markdown-markers warning (backdrop overlay)
       |
       v
   Preview pane (plain text, URL highlighting)
       |
       v  user clicks "Copy"
   Clipboard API (with execCommand fallback)
```

---

## Module Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (imports globals.css, delegates to [locale])
│   └── [locale]/
│       ├── layout.tsx                # Locale layout (Satoshi + Noto Sans TC + Newsreader)
│       ├── page.tsx                  # Home (redirects to fb-post-formatter)
│       └── text/
│           ├── fb-post-formatter/
│           │   └── page.tsx          # FB formatter page + i18n SEO + FAQ
│           └── font-generator/
│               └── page.tsx          # Font generator page + i18n SEO + FAQ
│
├── components/
│   ├── fb-post-formatter/
│   │   ├── Editor.tsx                # Two-column layout + state + style/pangu controls
│   │   ├── MarkdownInput.tsx         # Left: textarea + backdrop highlighting
│   │   └── FbPreview.tsx             # Right: preview + copy button + URL highlighting
│   ├── font-generator/
│   │   └── FontGenerator.tsx         # 10-style preview + per-row copy + CJK visual differentiation
│   └── layout/
│       ├── Header.tsx                # Navigation with TextToolsDropdown
│       ├── Footer.tsx                # Footer with links
│       ├── LocaleSwitcher.tsx        # zh-TW / en toggle
│       ├── MobileNav.tsx             # Mobile hamburger menu with subItems
│       ├── TextToolsNav.tsx          # Shared tab bar (font-generator / fb-post-formatter)
│       └── TextToolsDropdown.tsx     # Desktop dropdown for text tools
│
├── lib/
│   ├── unicode-fonts.ts              # 14 Unicode font styles + convertToUnicodeRich() + isCjkChar
│   ├── fb-renderer.ts               # marked custom renderer (core conversion, breaks: true)
│   ├── symbol-configs.ts            # Three style symbol tables
│   ├── post-process.ts              # ZWSP + Pangu pipeline (Unicode-aware regex)
│   ├── fb-audit.ts                  # External link detection
│   └── clipboard.ts                 # Clipboard API wrapper with fallback
│
├── i18n/
│   ├── routing.ts                    # Locale config (zh-TW default, en)
│   ├── request.ts                    # Server-side i18n setup
│   └── navigation.ts                # i18n-aware Link, redirect, useRouter
│
├── middleware.ts                     # next-intl routing middleware
│
public/
├── fonts/
│   ├── satoshi-400.woff2             # Self-hosted Satoshi (regular)
│   ├── satoshi-500.woff2             # Self-hosted Satoshi (medium)
│   └── satoshi-700.woff2             # Self-hosted Satoshi (bold)
│
messages/
├── zh-TW.json                        # ~100 translation keys
└── en.json                           # ~100 translation keys
```

---

## Conversion Logic (fb-renderer.ts)

Uses `marked` with a custom renderer. Each Markdown token maps to plain text + Unicode output.

### Token Mapping

| Token | Output |
|-------|--------|
| `heading` (h1) | Style-dependent (see Style System below) |
| `heading` (h2) | Style-dependent |
| `heading` (h3) | Style-dependent |
| `list` (unordered) | Style-dependent bullet + text |
| `list` (ordered) | `1. 2. 3.` (all styles) |
| `blockquote` | Style-dependent prefix |
| `hr` | Style-dependent separator |
| `code` (fenced) | Each character → Monospace Unicode (U+1D670 range) |
| `codespan` (inline) | Each character → Monospace Unicode |
| `strong` | English → Sans-Serif Bold Unicode (U+1D5D4 range), CJK passthrough |
| `em` | English → Sans-Serif Italic Unicode (U+1D608 range), CJK passthrough |
| `strong + em` | English → Sans-Serif Bold Italic Unicode (U+1D63C range), CJK passthrough |
| `del` (strikethrough) | ✅ U+0336 Combining Long Stroke Overlay per char, CJK passthrough |
| `br` | ✅ Single line break (`\n`), enabled via `breaks: true` in marked config |
| `link` | `text (url)` plain text expansion |
| `image` | `[image: alt]` |
| `table` | Each row → key:value list (see Table Conversion) |
| `paragraph` | Direct text output + line break |

### Unicode Conversion

English letters (A-Z, a-z) and digits (0-9) are converted via offset calculation:

```
output = startCodePoint + (charCode - baseCharCode)
```

CJK characters (U+4E00-U+9FFF, U+3400-U+4DBF) always pass through unchanged.

Exception characters (e.g. Italic `h` → U+210E) are handled via a lookup map.

---

## Style System (symbol-configs.ts)

Three styles, **Structured** is the default.

### SymbolConfig Type

```typescript
type SymbolConfig = {
  h1: (text: string) => string
  h2: (text: string) => string
  h3: (text: string) => string
  listItem: (text: string) => string
  orderedItem: (n: number, text: string) => string
  blockquote: (text: string) => string
  hr: string
}
```

### Style Comparison

| Element | Minimal | **Structured (default)** | Social |
|---------|---------|--------------------------|--------|
| h1 | Unicode Bold + blank lines | 【title】 | ✸ title |
| h2 | Plain text + blank line | ▍title | ▸ title |
| h3 | Plain text | Plain text | Plain text |
| list (unordered) | • | - | → |
| list (ordered) | 1. 2. 3. | 1. 2. 3. | 1. 2. 3. |
| blockquote | 「text」 | ┃text | 💬 text |
| hr | ——— | ━━━━━━ | · · · |

---

## Table Conversion

Facebook has no table rendering. Tables convert to key:value format per row.

### Input

```markdown
| Name   | Price | Stock |
|--------|-------|-------|
| Apple  | $30   | 50    |
| Banana | $15   | 120   |
```

### Output (Structured style)

```
- Apple
  Name: Apple
  Price: $30
  Stock: 50

- Banana
  Name: Banana
  Price: $15
  Stock: 120
```

The first column value is used as the row label. Each subsequent column becomes a key:value pair with full-width space indentation.

Single-column tables degrade to a plain list.

---

## Post-Processing Pipeline (post-process.ts)

Runs after the renderer, in fixed order.

### 1. ZWSP Blank Line Preservation (always on)

Facebook compresses consecutive line breaks. Insert U+200B (Zero-Width Space) in blank lines to preserve spacing.

```
Input:  \n\n\n
Output: \n\u200B\n\u200B\n
```

### 2. Pangu CJK Spacing (toggle, off by default)

Insert half-width space between CJK characters and ASCII/Unicode alphanumeric characters.

```
Input:  "I use Mac to write code"  → no change
Input:  "我用Mac寫code"            → "我用 Mac 寫 code"
Input:  "我用𝗠𝗮𝗰寫文"              → "我用 𝗠𝗮𝗰 寫文"  (Unicode Bold also matched)
```

Regex patterns (updated to cover Unicode Mathematical Alphanumerics):
```
Word range: \w + U+1D5D4–U+1D7FF (Bold/Italic/Monospace) + U+210E (italic h)
CJK range:  U+4E00–U+9FFF + U+3400–U+4DBF

/(CJK)(WORD)/gu → "$1 $2"
/(WORD)(CJK)/gu → "$1 $2"
```

> **Why extended**: After Unicode font conversion, bold/italic characters fall outside `\w` range.
> Without this extension, Pangu spacing would not insert spaces around converted text.

---

## UI Components

> **Note**: StyleSelector was removed as a standalone component. Style switching and Pangu toggle
> are integrated directly into Editor.tsx to reduce prop drilling.

### Editor.tsx (state management + controls)

```typescript
State:
- markdownInput: string
- panguEnabled: boolean

Derived (useMemo):
- fbOutput: computed from markdownInput + STYLE_CONFIGS.structured + panguEnabled
- hasLinks: fb-audit external link detection

UI includes:
- Pangu spacing toggle
- Conditional hints: CJK-in-markdown warning, external link warning
```

> **Note**: Style is currently fixed to "structured" (default). The three-style UI was
> simplified during implementation. Style configs remain in code for future use.

### MarkdownInput.tsx

- Left column, textarea with monospace font
- **Backdrop highlighting**: CJK characters inside markdown bold/italic markers
  shown with amber background overlay to warn users these won't convert
- Header bar: i18n label + character counter
- Max 5000 characters

### FbPreview.tsx

- Right column, rendered preview in sans-serif font
- Copy button with "Copied!" flash (1.5s)
- **URL highlighting**: External links shown with visual emphasis
- Desktop: side-by-side with MarkdownInput
- Mobile: stacked below MarkdownInput

### FontGenerator.tsx (font generator tool)

- Single-line input (max 200 chars), 10 font style preview rows
- Per-row copy button with "Copied!" flash (1.5s)
- **CJK visual differentiation**: `convertToUnicodeRich()` returns per-char info; unconverted CJK chars rendered at `text-ink-600/30`, converted chars at `text-ink-900`
- **CSS text-decoration**: Strikethrough/underline use CSS for clean preview, combining characters for clipboard copy
- **Default example**: "Hello 你好 123" shown in `text-ink-400` when input is empty
- **Dynamic CJK hint**: Low-key `text-ink-400` note, message changes based on CJK state (none/mixed/allCjk)

### Layout Components

- **Header.tsx**: Navigation header with TextToolsDropdown for "文字工具" sub-menu
- **Footer.tsx**: Footer with "Made by" attribution + links
- **LocaleSwitcher.tsx**: zh-TW / en language toggle
- **MobileNav.tsx**: Hamburger menu for mobile, supports `subItems` nesting
- **TextToolsNav.tsx**: Shared tab bar for text tool pages (real `<Link>` for SEO)
- **TextToolsDropdown.tsx**: Desktop dropdown with click-toggle + outside-click-close

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Empty input | Preview shows placeholder hint text |
| Pure CJK bold `**Chinese**` | Remove `**` markers, CJK text unchanged |
| Input > 5000 chars | Truncate + show warning "Consider splitting into multiple posts" |
| Clipboard API unsupported | Fallback to `document.execCommand('copy')` |
| Single-column table | Degrade to plain list |
| Nested blockquote `>> text` | Process one level only, ignore nesting |
| Fenced code block (```) | Convert all characters to Monospace Unicode |

---

## Performance Requirements

- Real-time conversion < 16ms (60fps)
- Max input: 5000 characters
- Copy feedback < 100ms
- First contentful paint < 1s (static page)
- Debounce: 150ms on input change

---

## SEO Plan

**i18n SEO**: Each locale has its own metadata via `getTranslations()`.

**zh-TW Meta Tags**:
```
Title: Facebook 貼文排版工具 — Markdown 轉 FB 格式化文字 | FreeTools
Description: 免費線上 Facebook 貼文排版工具。支援粗體、標題、列表、分隔線。貼上 Markdown，預覽 Facebook 格式，一鍵複製。
H1: Facebook 貼文排版工具
```

**en Meta Tags**:
```
Title: Facebook Post Formatter — Convert Markdown to FB Formatted Text | FreeTools
Description: Free online Facebook post formatting tool. Supports bold, headings, lists, dividers. Paste Markdown, preview Facebook format, one-click copy.
H1: Facebook Post Formatter
```

**Schema Markup**: WebApplication + FAQPage + HowTo (planned)

**FAQ Topics** (bilingual):
1. Can you bold text in FB posts? / FB 貼文可以使用粗體嗎？
2. Why doesn't Chinese bold text change? / 為什麼中文粗體沒有變化？
3. What Markdown syntax is supported? / 支援哪些 Markdown 語法？

---

## Dependencies

| Package | Purpose | Size (gzipped) |
|---------|---------|----------------|
| `marked` | Markdown parser | ~12KB |
| `next-intl` | i18n routing & translations | ~15KB |
| (none others) | All conversion is custom code | — |

---

**Created**: 2026-02-08
**Status**: ✅ Implemented
**Completed**: 2026-02-08
**Commits**: 6 commits (i18n → layout → components → renderer → audit → docs)
