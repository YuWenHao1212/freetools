import { describe, it, expect } from "vitest";
import {
  STYLE_CONFIGS,
  DEFAULT_STYLE,
  type StyleName,
} from "../symbol-configs";

describe("symbol-configs", () => {
  describe("StyleName type", () => {
    it("should have exactly three style names", () => {
      const styleNames = Object.keys(STYLE_CONFIGS);
      expect(styleNames).toHaveLength(3);
      expect(styleNames).toContain("minimal");
      expect(styleNames).toContain("structured");
      expect(styleNames).toContain("social");
    });
  });

  describe("DEFAULT_STYLE", () => {
    it('should be "structured"', () => {
      expect(DEFAULT_STYLE).toBe("structured");
    });

    it("should be a valid StyleName key in STYLE_CONFIGS", () => {
      expect(STYLE_CONFIGS[DEFAULT_STYLE]).toBeDefined();
    });
  });

  describe("SymbolConfig shape", () => {
    const styleNames: StyleName[] = ["minimal", "structured", "social"];

    it.each(styleNames)(
      "config for %s should have all required properties",
      (name) => {
        const config = STYLE_CONFIGS[name];
        expect(typeof config.h1).toBe("function");
        expect(typeof config.h2).toBe("function");
        expect(typeof config.h3).toBe("function");
        expect(typeof config.listItem).toBe("function");
        expect(typeof config.orderedItem).toBe("function");
        expect(typeof config.blockquote).toBe("function");
        expect(typeof config.hr).toBe("string");
      },
    );
  });

  describe("minimal style", () => {
    const config = STYLE_CONFIGS["minimal"];

    it("h1 returns just the text with no decoration", () => {
      expect(config.h1("Title")).toBe("Title");
    });

    it("h2 returns just the text with no decoration", () => {
      expect(config.h2("Subtitle")).toBe("Subtitle");
    });

    it("h3 returns just the text with no decoration", () => {
      expect(config.h3("Heading")).toBe("Heading");
    });

    it("listItem prepends bullet U+2022", () => {
      expect(config.listItem("item")).toBe("\u2022 item");
    });

    it("orderedItem formats as n. item", () => {
      expect(config.orderedItem(1, "first")).toBe("1. first");
      expect(config.orderedItem(10, "tenth")).toBe("10. tenth");
    });

    it("blockquote wraps with corner brackets U+300C U+300D", () => {
      expect(config.blockquote("text")).toBe("\u300Ctext\u300D");
    });

    it("hr is three em dashes U+2014", () => {
      expect(config.hr).toBe("\u2014\u2014\u2014");
    });
  });

  describe("structured style", () => {
    const config = STYLE_CONFIGS["structured"];

    it("h1 wraps with lenticular brackets U+3010 U+3011", () => {
      expect(config.h1("Title")).toBe("\u3010Title\u3011");
    });

    it("h2 prepends left five-eighths block U+258D", () => {
      expect(config.h2("Subtitle")).toBe("\u258DSubtitle");
    });

    it("h3 returns just the text", () => {
      expect(config.h3("Heading")).toBe("Heading");
    });

    it("listItem prepends dash", () => {
      expect(config.listItem("item")).toBe("- item");
    });

    it("orderedItem formats as n. item", () => {
      expect(config.orderedItem(1, "first")).toBe("1. first");
      expect(config.orderedItem(3, "third")).toBe("3. third");
    });

    it("blockquote prepends heavy vertical U+2503", () => {
      expect(config.blockquote("text")).toBe("\u2503text");
    });

    it("hr is six heavy horizontal lines U+2501", () => {
      expect(config.hr).toBe("\u2501\u2501\u2501\u2501\u2501\u2501");
    });
  });

  describe("social style", () => {
    const config = STYLE_CONFIGS["social"];

    it("h1 prepends heavy eight-pointed star U+2738", () => {
      expect(config.h1("Title")).toBe("\u2738 Title");
    });

    it("h2 prepends small right triangle U+25B8", () => {
      expect(config.h2("Subtitle")).toBe("\u25B8 Subtitle");
    });

    it("h3 returns just the text", () => {
      expect(config.h3("Heading")).toBe("Heading");
    });

    it("listItem prepends rightwards arrow U+2192", () => {
      expect(config.listItem("item")).toBe("\u2192 item");
    });

    it("orderedItem formats as n. item", () => {
      expect(config.orderedItem(1, "first")).toBe("1. first");
      expect(config.orderedItem(5, "fifth")).toBe("5. fifth");
    });

    it("blockquote prepends speech balloon U+1F4AC", () => {
      expect(config.blockquote("text")).toBe("\uD83D\uDCAC text");
    });

    it("hr is middle dots with spaces U+00B7", () => {
      expect(config.hr).toBe("\u00B7 \u00B7 \u00B7");
    });
  });

  describe("immutability", () => {
    it("STYLE_CONFIGS should be frozen at top level", () => {
      expect(Object.isFrozen(STYLE_CONFIGS)).toBe(true);
    });

    it("each config object should be frozen", () => {
      const styleNames: StyleName[] = ["minimal", "structured", "social"];
      for (const name of styleNames) {
        expect(Object.isFrozen(STYLE_CONFIGS[name])).toBe(true);
      }
    });
  });
});
