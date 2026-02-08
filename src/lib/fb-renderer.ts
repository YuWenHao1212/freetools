import { marked, type Tokens, type RendererObject } from "marked";
import { convertToUnicode } from "@/lib/unicode-fonts";
import type { SymbolConfig } from "@/lib/symbol-configs";

// Strip HTML tags and decode common HTML entities
const stripHtml = (text: string): string =>
  text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

// Collapse more than 2 consecutive newlines into exactly 2
const collapseNewlines = (text: string): string =>
  text.replace(/\n{3,}/g, "\n\n");

export const convertMarkdownToFb = (
  markdown: string,
  config: SymbolConfig
): string => {
  const renderer: RendererObject = {
    heading(token: Tokens.Heading) {
      const text = stripHtml(
        this.parser.parseInline(token.tokens)
      );
      const formatFn =
        token.depth === 1
          ? config.h1
          : token.depth === 2
            ? config.h2
            : config.h3;
      return `\n${formatFn(text)}\n\n`;
    },

    strong(token: Tokens.Strong) {
      const text = stripHtml(
        this.parser.parseInline(token.tokens)
      );
      return convertToUnicode(text, "sansSerifBold");
    },

    em(token: Tokens.Em) {
      const text = stripHtml(
        this.parser.parseInline(token.tokens)
      );
      return convertToUnicode(text, "sansSerifItalic");
    },

    codespan(token: Tokens.Codespan) {
      return convertToUnicode(token.text, "monospace");
    },

    code(token: Tokens.Code) {
      return convertToUnicode(token.text, "monospace") + "\n\n";
    },

    link(token: Tokens.Link) {
      const text = stripHtml(
        this.parser.parseInline(token.tokens)
      );
      return `${text} (${token.href})`;
    },

    image(token: Tokens.Image) {
      return `[image: ${token.text}]`;
    },

    list(token: Tokens.List) {
      const lines: string[] = [];

      for (let i = 0; i < token.items.length; i++) {
        const item = token.items[i];
        // Parse item content — items have tokens that may be
        // text (tight list) or paragraph (loose list)
        const first = item.tokens[0] as { tokens?: Tokens.Generic[] } | undefined;
        const innerTokens = first?.tokens ?? [];
        const text = stripHtml(
          this.parser.parseInline(innerTokens)
        );

        if (token.ordered) {
          lines.push(config.orderedItem(Number(token.start) + i, text));
        } else {
          lines.push(config.listItem(text));
        }
      }

      return lines.join("\n") + "\n\n";
    },

    blockquote(token: Tokens.Blockquote) {
      // Parse the inner block tokens, then strip to plain text
      const inner = this.parser.parse(token.tokens);
      const text = stripHtml(inner).trim();
      return config.blockquote(text) + "\n\n";
    },

    hr() {
      return config.hr + "\n\n";
    },

    paragraph(token: Tokens.Paragraph) {
      return (
        stripHtml(this.parser.parseInline(token.tokens)) + "\n\n"
      );
    },

    table(token: Tokens.Table) {
      const headers = token.header.map((h) => stripHtml(h.text));
      const isSingleColumn = headers.length <= 1;
      const lines: string[] = [];

      for (const row of token.rows) {
        const firstCol = stripHtml(row[0].text);

        if (isSingleColumn) {
          // Single column: plain list
          lines.push(config.listItem(firstCol));
        } else {
          // Multi-column: first col as list item, rest as key:value
          lines.push(config.listItem(firstCol));
          for (let c = 1; c < row.length; c++) {
            const value = stripHtml(row[c].text);
            // Ideographic space (U+3000) for indentation
            lines.push(`\u3000${headers[c]}: ${value}`);
          }
        }
      }

      return lines.join("\n") + "\n\n";
    },

    text(token: Tokens.Text | Tokens.Escape) {
      if ("tokens" in token && token.tokens) {
        return this.parser.parseInline(token.tokens);
      }
      return token.text;
    },
  };

  marked.use({ renderer });

  const raw = marked.parse(markdown, { async: false }) as string;

  return collapseNewlines(raw).trim() + "\n";
};
