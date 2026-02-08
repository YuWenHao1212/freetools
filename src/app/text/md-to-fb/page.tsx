import type { Metadata } from "next";
import Editor from "@/components/md-to-fb/Editor";

export const metadata: Metadata = {
  title:
    "Markdown to FB Post Formatting — Convert Markdown to Facebook Text | FreeTools",
  description:
    "Free online Markdown to Facebook formatting tool. Supports bold, headings, lists, dividers. Paste Markdown, preview Facebook format, one-click copy.",
};

export default function MdToFbPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-[#1A1A1A]">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold">
          Markdown &rarr; FB Formatting Tool
        </h1>
        <p className="mt-2 text-lg text-[#1A1A1A]/60">
          Paste Markdown, preview Facebook format, one-click copy
        </p>
      </header>

      {/* Editor (client component) */}
      <Editor />

      {/* SEO Content */}
      <section className="mt-12 space-y-8">
        {/* How to Use */}
        <div>
          <h2 className="text-2xl font-semibold">How to Use</h2>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-[#1A1A1A]/80">
            <li>
              Paste or type your Markdown content in the left editor panel.
            </li>
            <li>
              Choose a formatting style and preview the Facebook-ready output on
              the right.
            </li>
            <li>
              Click the &quot;Copy&quot; button to copy the formatted text, then
              paste it into your Facebook post.
            </li>
          </ol>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-2xl font-semibold">FAQ</h2>
          <dl className="mt-3 space-y-4 text-[#1A1A1A]/80">
            <div>
              <dt className="font-medium text-[#1A1A1A]">
                Can you bold text in Facebook posts?
              </dt>
              <dd className="mt-1">
                Facebook does not support native rich-text formatting in regular
                posts. However, you can use special Unicode characters (such as
                Mathematical Bold) to simulate &quot;bold&quot; text. This tool
                automatically converts Markdown bold syntax into those Unicode
                characters so your post stands out.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[#1A1A1A]">
                Why doesn&apos;t Chinese bold text change?
              </dt>
              <dd className="mt-1">
                Unicode bold character mappings only cover Latin letters (A-Z,
                a-z) and digits (0-9). CJK characters (Chinese, Japanese,
                Korean) do not have bold Unicode equivalents, so they remain
                unchanged. The bold effect is only visible on Latin-script
                characters.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[#1A1A1A]">
                What Markdown syntax is supported?
              </dt>
              <dd className="mt-1">
                This tool supports headings (#), bold (**text**), unordered
                lists (- item), ordered lists (1. item), and horizontal rules
                (---). Inline code and other advanced Markdown features are
                stripped to keep the output clean for Facebook.
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
