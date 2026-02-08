import { describe, it, expect } from "vitest";
import {
  insertZWSP,
  panguSpacing,
  postProcess,
} from "@/lib/post-process";

describe("insertZWSP", () => {
  it("inserts ZWSP in blank lines between two content lines (double newline)", () => {
    expect(insertZWSP("a\n\nb")).toBe("a\n\u200B\nb");
  });

  it("inserts ZWSP in multiple consecutive blank lines", () => {
    expect(insertZWSP("a\n\n\nb")).toBe("a\n\u200B\n\u200B\nb");
  });

  it("handles three consecutive blank lines", () => {
    expect(insertZWSP("a\n\n\n\nb")).toBe("a\n\u200B\n\u200B\n\u200B\nb");
  });

  it("leaves single line breaks unchanged", () => {
    expect(insertZWSP("a\nb")).toBe("a\nb");
  });

  it("returns empty string for empty input", () => {
    expect(insertZWSP("")).toBe("");
  });

  it("handles text with no line breaks", () => {
    expect(insertZWSP("hello world")).toBe("hello world");
  });

  it("handles multiple groups of blank lines", () => {
    expect(insertZWSP("a\n\nb\n\nc")).toBe("a\n\u200B\nb\n\u200B\nc");
  });

  it("handles only newlines", () => {
    expect(insertZWSP("\n\n")).toBe("\n\u200B\n");
  });

  it("handles mixed single and double line breaks", () => {
    expect(insertZWSP("a\nb\n\nc")).toBe("a\nb\n\u200B\nc");
  });
});

describe("panguSpacing", () => {
  it("inserts space between CJK and ASCII word characters", () => {
    expect(panguSpacing("\u6211\u7528Mac\u5beb\u6587")).toBe(
      "\u6211\u7528 Mac \u5beb\u6587"
    );
  });

  it("inserts space when ASCII precedes CJK", () => {
    expect(panguSpacing("hello\u4f60\u597d")).toBe("hello \u4f60\u597d");
  });

  it("leaves pure English unchanged", () => {
    expect(panguSpacing("hello world")).toBe("hello world");
  });

  it("leaves pure CJK unchanged", () => {
    expect(panguSpacing("\u4f60\u597d\u4e16\u754c")).toBe(
      "\u4f60\u597d\u4e16\u754c"
    );
  });

  it("inserts space around digits adjacent to CJK", () => {
    expect(panguSpacing("\u7b2c3\u7ae0")).toBe("\u7b2c 3 \u7ae0");
  });

  it("does not double-space existing spaces", () => {
    expect(panguSpacing("\u6211\u7528 Mac")).toBe("\u6211\u7528 Mac");
  });

  it("returns empty string for empty input", () => {
    expect(panguSpacing("")).toBe("");
  });

  it("handles CJK Extension A range (U+3400-U+4DBF)", () => {
    expect(panguSpacing("\u3400abc\u4dbf")).toBe("\u3400 abc \u4dbf");
  });

  it("handles multiple CJK-ASCII boundaries", () => {
    expect(panguSpacing("a\u4e00b\u4e01c")).toBe(
      "a \u4e00 b \u4e01 c"
    );
  });

  it("handles underscores as word characters", () => {
    // \w includes underscore
    expect(panguSpacing("\u4e2d_test")).toBe("\u4e2d _test");
  });
});

describe("postProcess", () => {
  it("always applies ZWSP insertion", () => {
    expect(postProcess("a\n\nb", false)).toBe("a\n\u200B\nb");
  });

  it("applies both ZWSP and Pangu when enabled", () => {
    expect(
      postProcess("\u6211\u7528Mac\n\n\u7b2c2\u884c", true)
    ).toBe("\u6211\u7528 Mac\n\u200B\n\u7b2c 2 \u884c");
  });

  it("skips Pangu when disabled", () => {
    expect(
      postProcess("\u6211\u7528Mac\n\n\u7b2c2\u884c", false)
    ).toBe("\u6211\u7528Mac\n\u200B\n\u7b2c2\u884c");
  });

  it("handles empty string", () => {
    expect(postProcess("", true)).toBe("");
    expect(postProcess("", false)).toBe("");
  });

  it("handles text with no transformations needed", () => {
    expect(postProcess("hello world", false)).toBe("hello world");
    expect(postProcess("hello world", true)).toBe("hello world");
  });
});
