"use client";

const MAX_CHARS = 5000;

type MarkdownInputProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
};

export default function MarkdownInput({
  value,
  onChange,
}: MarkdownInputProps) {
  const charCount = value.length;
  const isOverLimit = charCount >= MAX_CHARS;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;
    onChange(raw.length > MAX_CHARS ? raw.slice(0, MAX_CHARS) : raw);
  };

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-[#1A1A1A]/20 bg-white">
      <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 px-4 py-2">
        <span className="text-sm font-medium text-[#1A1A1A]">
          Markdown Input
        </span>
        <span
          className={
            isOverLimit
              ? "text-xs text-red-600"
              : "text-xs text-[#1A1A1A]/50"
          }
        >
          {charCount} / {MAX_CHARS}
        </span>
      </div>

      <textarea
        value={value}
        onChange={handleChange}
        rows={16}
        spellCheck={false}
        placeholder="Paste your Markdown here..."
        className="flex-1 resize-none bg-transparent px-4 py-3 font-mono text-sm text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:outline-none"
      />

      {isOverLimit && (
        <div className="px-4 pb-2">
          <p className="text-xs text-amber-600">
            Consider splitting into multiple posts
          </p>
        </div>
      )}
    </div>
  );
}
