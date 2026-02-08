/**
 * Unicode Mathematical Alphanumeric Symbols conversion module.
 *
 * Converts ASCII letters (A-Z, a-z) and digits (0-9) into styled Unicode
 * characters via code-point offset calculation. CJK characters and all
 * other symbols pass through unchanged.
 */

// --- Font styles used by MD-to-FB formatter ---

export type FbFontStyle =
  | "sansSerifBold"
  | "sansSerifItalic"
  | "sansSerifBoldItalic"
  | "monospace";

// --- Font styles used by Font Generator ---

export type GeneratorFontStyle =
  | "bold"
  | "italic"
  | "boldItalic"
  | "boldScript"
  | "script"
  | "fraktur"
  | "doubleStruck"
  | "circled"
  | "squared"
  | "parenthesized"
  | "upsideDown"
  | "strikethrough"
  | "underline"
  | "fullwidth"
  | "smallCaps";

export type FontStyle = FbFontStyle | GeneratorFontStyle;

interface FontConfig {
  readonly uppercaseStart: number;
  readonly lowercaseStart: number;
  readonly digitStart: number | null;
  readonly exceptions?: Readonly<Record<string, number>>;
}

// Offset-based font configs (A-Z / a-z / 0-9 mapped via offset)
const FONT_CONFIGS: Readonly<Record<string, FontConfig>> = {
  // -- FB formatter styles --
  sansSerifBold: {
    uppercaseStart: 0x1d5d4,
    lowercaseStart: 0x1d5ee,
    digitStart: 0x1d7ec,
  },
  sansSerifItalic: {
    uppercaseStart: 0x1d608,
    lowercaseStart: 0x1d622,
    digitStart: null,
    exceptions: { h: 0x210e },
  },
  sansSerifBoldItalic: {
    uppercaseStart: 0x1d63c,
    lowercaseStart: 0x1d656,
    digitStart: null,
  },
  monospace: {
    uppercaseStart: 0x1d670,
    lowercaseStart: 0x1d68a,
    digitStart: 0x1d7f6,
  },

  // -- Font Generator styles (offset-based) --
  bold: {
    uppercaseStart: 0x1d400,
    lowercaseStart: 0x1d41a,
    digitStart: 0x1d7ce,
  },
  italic: {
    uppercaseStart: 0x1d434,
    lowercaseStart: 0x1d44e,
    digitStart: null,
    exceptions: { h: 0x210e },
  },
  boldItalic: {
    uppercaseStart: 0x1d468,
    lowercaseStart: 0x1d482,
    digitStart: null,
  },
  boldScript: {
    uppercaseStart: 0x1d4d0,
    lowercaseStart: 0x1d4ea,
    digitStart: null,
  },
  doubleStruck: {
    uppercaseStart: 0x1d538,
    lowercaseStart: 0x1d552,
    digitStart: 0x1d7d8,
    exceptions: {
      C: 0x2102,
      H: 0x210d,
      N: 0x2115,
      P: 0x2119,
      Q: 0x211a,
      R: 0x211d,
      Z: 0x2124,
    },
  },
  script: {
    uppercaseStart: 0x1d49c,
    lowercaseStart: 0x1d4b6,
    digitStart: null,
    exceptions: {
      B: 0x212c,
      E: 0x2130,
      F: 0x2131,
      G: 0x1d4a2,
      H: 0x210b,
      I: 0x2110,
      L: 0x2112,
      M: 0x2133,
      R: 0x211b,
      e: 0x212f,
      g: 0x210a,
      o: 0x2134,
    },
  },
  fraktur: {
    uppercaseStart: 0x1d504,
    lowercaseStart: 0x1d51e,
    digitStart: null,
    exceptions: {
      C: 0x212d,
      H: 0x210c,
      I: 0x2111,
      R: 0x211c,
      Z: 0x2128,
    },
  },
};

// --- Circled letters (non-offset, lookup-based) ---

const CIRCLED_UPPER: Readonly<Record<string, number>> = {};
const CIRCLED_LOWER: Readonly<Record<string, number>> = {};

// A-Z: U+24B6 - U+24CF
for (let i = 0; i < 26; i++) {
  (CIRCLED_UPPER as Record<string, number>)[
    String.fromCharCode(0x41 + i)
  ] = 0x24b6 + i;
  (CIRCLED_LOWER as Record<string, number>)[
    String.fromCharCode(0x61 + i)
  ] = 0x24d0 + i;
}

// Digits: 0 -> U+24EA, 1-9 -> U+2460-U+2468
const CIRCLED_DIGITS: Readonly<Record<string, number>> = {
  "0": 0x24ea,
  "1": 0x2460,
  "2": 0x2461,
  "3": 0x2462,
  "4": 0x2463,
  "5": 0x2464,
  "6": 0x2465,
  "7": 0x2466,
  "8": 0x2467,
  "9": 0x2468,
};

// --- Small Caps (lowercase only, lookup-based) ---

const SMALL_CAPS: Readonly<Record<string, number>> = {
  a: 0x1d00,
  b: 0x0299,
  c: 0x1d04,
  d: 0x1d05,
  e: 0x1d07,
  f: 0xa730,
  g: 0x0262,
  h: 0x029c,
  i: 0x026a,
  j: 0x1d0a,
  k: 0x1d0b,
  l: 0x029f,
  m: 0x1d0d,
  n: 0x0274,
  o: 0x1d0f,
  p: 0x1d18,
  // q: no small cap variant, keep original
  r: 0x0280,
  s: 0xa731,
  t: 0x1d1b,
  u: 0x1d1c,
  v: 0x1d20,
  w: 0x1d21,
  // x: no small cap variant, keep original
  y: 0x028f,
  z: 0x1d22,
};

// --- Squared letters (negative squared, filled background) ---

const SQUARED_UPPER: Readonly<Record<string, number>> = {};
// A-Z: U+1F170 - U+1F189 (Negative Squared Latin Capital Letters)
for (let i = 0; i < 26; i++) {
  (SQUARED_UPPER as Record<string, number>)[
    String.fromCharCode(0x41 + i)
  ] = 0x1f170 + i;
}

// --- Parenthesized letters ---

const PARENTHESIZED_LOWER: Readonly<Record<string, number>> = {};
// a-z: U+249C - U+24B5 (Parenthesized Latin Small Letters)
for (let i = 0; i < 26; i++) {
  (PARENTHESIZED_LOWER as Record<string, number>)[
    String.fromCharCode(0x61 + i)
  ] = 0x249c + i;
}
// Digits 1-9: U+2474 - U+247C
const PARENTHESIZED_DIGITS: Readonly<Record<string, number>> = {
  "1": 0x2474,
  "2": 0x2475,
  "3": 0x2476,
  "4": 0x2477,
  "5": 0x2478,
  "6": 0x2479,
  "7": 0x247a,
  "8": 0x247b,
  "9": 0x247c,
};

// --- Upside-down character mapping ---

const UPSIDE_DOWN_MAP: Readonly<Record<string, string>> = {
  a: "\u0250", b: "q", c: "\u0254", d: "p", e: "\u01dd",
  f: "\u025f", g: "\u0183", h: "\u0265", i: "\u0131", j: "\u027e",
  k: "\u029e", l: "l", m: "\u026f", n: "u", o: "o",
  p: "d", q: "b", r: "\u0279", s: "s", t: "\u0287",
  u: "n", v: "\u028c", w: "\u028d", x: "x", y: "\u028e", z: "z",
  A: "\u2200", B: "\u15fa", C: "\u0186", D: "\u15e1", E: "\u018e",
  F: "\u2132", G: "\u2141", H: "H", I: "I", J: "\u017f",
  K: "\u22ca", L: "\u02e5", M: "W", N: "N", O: "O",
  P: "\u0500", Q: "\u038c", R: "\ua780", S: "S", T: "\u22a5",
  U: "\u2229", V: "\u039b", W: "M", X: "X", Y: "\u2144", Z: "Z",
  "0": "0", "1": "\u0196", "2": "\u1105", "3": "\u0190",
  "4": "\u3123", "5": "\u03db", "6": "9", "7": "\u3125",
  "8": "8", "9": "6",
  ".": "\u02d9", ",": "\u02bb", "?": "\u00bf", "!": "\u00a1",
  "'": ",", '"': "\u201e", "(": ")", ")": "(",
  "[": "]", "]": "[", "{": "}", "}": "{",
  "<": ">", ">": "<", "&": "\u214b", "_": "\u203e",
};

// --- Combining characters ---

const COMBINING_STRIKETHROUGH = "\u0336"; // U+0336 COMBINING LONG STROKE OVERLAY
const COMBINING_UNDERLINE = "\u0332"; // U+0332 COMBINING LOW LINE

// --- Helpers ---

const isUppercase = (code: number): boolean =>
  code >= 0x41 && code <= 0x5a;

const isLowercase = (code: number): boolean =>
  code >= 0x61 && code <= 0x7a;

const isDigit = (code: number): boolean =>
  code >= 0x30 && code <= 0x39;

const isCjk = (code: number): boolean =>
  (code >= 0x4e00 && code <= 0x9fff) ||
  (code >= 0x3400 && code <= 0x4dbf);

/** Check if a character is CJK (for use in other modules). */
export const isCjkChar = (char: string): boolean =>
  isCjk(char.codePointAt(0)!);

// --- Core conversion ---

/**
 * Convert a single character using an offset-based font config.
 * Returns the original character if no conversion applies.
 */
const convertCharOffset = (char: string, config: FontConfig): string => {
  if (config.exceptions?.[char] !== undefined) {
    return String.fromCodePoint(config.exceptions[char]);
  }

  const code = char.codePointAt(0)!;

  if (isCjk(code)) return char;
  if (isUppercase(code))
    return String.fromCodePoint(config.uppercaseStart + (code - 0x41));
  if (isLowercase(code))
    return String.fromCodePoint(config.lowercaseStart + (code - 0x61));
  if (isDigit(code) && config.digitStart !== null)
    return String.fromCodePoint(config.digitStart + (code - 0x30));

  return char;
};

/** Convert a single character for the circled style. */
const convertCharCircled = (char: string): string => {
  if (CIRCLED_UPPER[char] !== undefined)
    return String.fromCodePoint(CIRCLED_UPPER[char]);
  if (CIRCLED_LOWER[char] !== undefined)
    return String.fromCodePoint(CIRCLED_LOWER[char]);
  if (CIRCLED_DIGITS[char] !== undefined)
    return String.fromCodePoint(CIRCLED_DIGITS[char]);
  return char;
};

/** Convert a single character for the fullwidth style. */
const convertCharFullwidth = (char: string): string => {
  const code = char.codePointAt(0)!;
  // Space -> Ideographic Space
  if (code === 0x20) return "\u3000";
  // ASCII 0x21-0x7E -> fullwidth (offset 0xFEE0)
  if (code >= 0x21 && code <= 0x7e)
    return String.fromCodePoint(code + 0xfee0);
  return char;
};

/** Convert a single character for the small caps style. */
const convertCharSmallCaps = (char: string): string => {
  const lower = char.toLowerCase();
  if (SMALL_CAPS[lower] !== undefined)
    return String.fromCodePoint(SMALL_CAPS[lower]);
  // Uppercase A-Z pass through as-is (already "caps")
  const code = char.codePointAt(0)!;
  if (isUppercase(code)) return char;
  return char;
};

/** Convert a single character for the squared style. */
const convertCharSquared = (char: string): string => {
  const upper = char.toUpperCase();
  if (SQUARED_UPPER[upper] !== undefined)
    return String.fromCodePoint(SQUARED_UPPER[upper]);
  return char;
};

/** Convert a single character for the parenthesized style. */
const convertCharParenthesized = (char: string): string => {
  const lower = char.toLowerCase();
  if (PARENTHESIZED_LOWER[lower] !== undefined)
    return String.fromCodePoint(PARENTHESIZED_LOWER[lower]);
  if (PARENTHESIZED_DIGITS[char] !== undefined)
    return String.fromCodePoint(PARENTHESIZED_DIGITS[char]);
  return char;
};

/** Convert text to upside-down (flip + reverse). */
const convertCharUpsideDown = (char: string): string =>
  UPSIDE_DOWN_MAP[char] ?? char;

/** Apply a combining character after each non-space character in text. */
const applyCombining = (text: string, combiner: string): string =>
  [...text].map((char) => (char === " " ? char : char + combiner)).join("");

/** Per-character conversion result for visual differentiation in the UI. */
export interface RichChar {
  readonly char: string;
  readonly converted: boolean;
}

/**
 * Convert text and return per-character info about whether each character
 * was actually transformed. Used by the UI to dim passthrough characters.
 */
export const convertToUnicodeRich = (
  text: string,
  style: FontStyle,
): RichChar[] => {
  // Combining-character styles apply to all non-space chars
  if (style === "strikethrough" || style === "underline") {
    return [...text].map((char) => ({
      char: char === " " ? char : char + (style === "strikethrough" ? COMBINING_STRIKETHROUGH : COMBINING_UNDERLINE),
      converted: char !== " ",
    }));
  }

  // Fullwidth applies to all ASCII (0x20-0x7E)
  if (style === "fullwidth") {
    return [...text].map((char) => {
      const result = convertCharFullwidth(char);
      return { char: result, converted: result !== char };
    });
  }

  // Circled
  if (style === "circled") {
    return [...text].map((char) => {
      const result = convertCharCircled(char);
      return { char: result, converted: result !== char };
    });
  }

  // Squared
  if (style === "squared") {
    return [...text].map((char) => {
      const result = convertCharSquared(char);
      return { char: result, converted: result !== char };
    });
  }

  // Parenthesized
  if (style === "parenthesized") {
    return [...text].map((char) => {
      const result = convertCharParenthesized(char);
      return { char: result, converted: result !== char };
    });
  }

  // Upside Down (flip each char, then reverse the array)
  if (style === "upsideDown") {
    const chars = [...text].map((char) => {
      const result = convertCharUpsideDown(char);
      return { char: result, converted: result !== char };
    });
    return chars.reverse();
  }

  // Small caps
  if (style === "smallCaps") {
    return [...text].map((char) => {
      const result = convertCharSmallCaps(char);
      return { char: result, converted: result !== char };
    });
  }

  // Offset-based styles
  const config = FONT_CONFIGS[style];
  return [...text].map((char) => {
    const result = convertCharOffset(char, config);
    return { char: result, converted: result !== char };
  });
};

/**
 * Convert text to Unicode styled characters for the given font style.
 * ASCII letters and digits are converted; CJK characters, punctuation,
 * spaces, and all other characters pass through unchanged (except for
 * strikethrough, underline, and fullwidth which apply to all characters).
 */
export const convertToUnicode = (text: string, style: FontStyle): string => {
  // Combining-character styles
  if (style === "strikethrough")
    return applyCombining(text, COMBINING_STRIKETHROUGH);
  if (style === "underline")
    return applyCombining(text, COMBINING_UNDERLINE);

  // Lookup-based styles
  if (style === "circled")
    return [...text].map(convertCharCircled).join("");
  if (style === "squared")
    return [...text].map(convertCharSquared).join("");
  if (style === "parenthesized")
    return [...text].map(convertCharParenthesized).join("");
  if (style === "upsideDown")
    return [...text].map(convertCharUpsideDown).reverse().join("");
  if (style === "fullwidth")
    return [...text].map(convertCharFullwidth).join("");
  if (style === "smallCaps")
    return [...text].map(convertCharSmallCaps).join("");

  // Offset-based styles
  const config = FONT_CONFIGS[style];
  return [...text].map((char) => convertCharOffset(char, config)).join("");
};
