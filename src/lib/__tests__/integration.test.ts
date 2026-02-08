import { describe, it, expect } from "vitest";
import { convertMarkdownToFb } from "@/lib/fb-renderer";
import { postProcess } from "@/lib/post-process";
import { STYLE_CONFIGS } from "@/lib/symbol-configs";

// Helper: full pipeline (render + post-process)
const pipeline = (
  md: string,
  style: keyof typeof STYLE_CONFIGS,
  pangu = false
): string => {
  const rendered = convertMarkdownToFb(md, STYLE_CONFIGS[style]);
  return postProcess(rendered, pangu);
};

describe("Integration: full pipeline", () => {
  describe("full document with structured style", () => {
    const fullDoc = [
      "# Main Title",
      "",
      "## Section",
      "",
      "Some text with **bold English** here.",
      "",
      "- Item one",
      "- Item two",
      "",
      "> A wise quote",
      "",
      "---",
      "",
      "[Click here](https://example.com)",
    ].join("\n");

    const result = pipeline(fullDoc, "structured");

    it("renders h1 with lenticular brackets", () => {
      expect(result).toContain("\u3010Main Title\u3011");
    });

    it("renders h2 with left one-eighth block", () => {
      expect(result).toContain("\u258DSection");
    });

    it("renders bold English as Unicode sans-serif bold", () => {
      // 'b' (0x62) -> sans-serif bold lowercase: 0x1d5ee + (0x62 - 0x61) = 0x1d5ef
      const boldB = String.fromCodePoint(0x1d5ef); // bold 'b'
      expect(result).toContain(boldB);
      // Should NOT contain the original ASCII "bold English"
      expect(result).not.toContain("bold English");
    });

    it("renders list items with dash prefix", () => {
      expect(result).toContain("- Item one");
      expect(result).toContain("- Item two");
    });

    it("renders blockquote with box-drawing heavy vertical", () => {
      expect(result).toContain("\u2503A wise quote");
    });

    it("renders hr with heavy horizontal lines", () => {
      expect(result).toContain("\u2501\u2501\u2501\u2501\u2501\u2501");
    });

    it("expands link to text (url) format", () => {
      expect(result).toContain("Click here (https://example.com)");
    });
  });

  describe("pangu spacing", () => {
    it("inserts spaces between CJK and English when enabled", () => {
      const md = "我用Mac寫文";
      const result = pipeline(md, "structured", true);
      expect(result).toContain("我用 Mac 寫文");
    });

    it("does not insert spaces when pangu is disabled", () => {
      const md = "我用Mac寫文";
      const result = pipeline(md, "structured", false);
      expect(result).toContain("我用Mac寫文");
    });
  });

  describe("ZWSP preservation", () => {
    it("inserts ZWSP between paragraphs", () => {
      const md = "First paragraph.\n\nSecond paragraph.";
      const result = pipeline(md, "structured");
      // The rendered output has blank lines between paragraphs;
      // postProcess replaces interior blank lines with ZWSP
      expect(result).toContain("\u200B");
    });
  });

  describe("table conversion", () => {
    it("converts multi-column table to list with key-value format", () => {
      const md = [
        "| Name | Role |",
        "| --- | --- |",
        "| Alice | Engineer |",
        "| Bob | Designer |",
      ].join("\n");
      const result = pipeline(md, "structured");
      // First column as list item with dash prefix
      expect(result).toContain("- Alice");
      expect(result).toContain("- Bob");
      // Remaining columns as ideographic-space-indented key:value
      expect(result).toContain("\u3000Role: Engineer");
      expect(result).toContain("\u3000Role: Designer");
    });
  });

  describe("all three styles", () => {
    const md = [
      "# Heading",
      "",
      "- Item",
      "",
      "---",
    ].join("\n");

    describe("minimal style", () => {
      const result = pipeline(md, "minimal");

      it("uses bullet for list items", () => {
        expect(result).toContain("\u2022 Item");
      });

      it("uses em dash triplet for hr", () => {
        expect(result).toContain("\u2014\u2014\u2014");
      });

      it("renders h1 as plain text", () => {
        expect(result).toContain("Heading");
        expect(result).not.toContain("\u3010");
        expect(result).not.toContain("\u2738");
      });
    });

    describe("structured style", () => {
      const result = pipeline(md, "structured");

      it("uses dash for list items", () => {
        expect(result).toContain("- Item");
      });

      it("uses heavy horizontal for hr", () => {
        expect(result).toContain("\u2501\u2501\u2501\u2501\u2501\u2501");
      });

      it("renders h1 with lenticular brackets", () => {
        expect(result).toContain("\u3010Heading\u3011");
      });
    });

    describe("social style", () => {
      const result = pipeline(md, "social");

      it("uses arrow for list items", () => {
        expect(result).toContain("\u2192 Item");
      });

      it("uses middle dots for hr", () => {
        expect(result).toContain("\u00B7 \u00B7 \u00B7");
      });

      it("renders h1 with heavy eight-pointed star", () => {
        expect(result).toContain("\u2738 Heading");
      });
    });
  });
});
