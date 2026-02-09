"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const VIDEO_TOOLS = [
  { href: "/video/compress", key: "videoCompress" },
  { href: "/video/to-gif", key: "videoToGif" },
] as const;

export default function VideoToolsNav() {
  const t = useTranslations("VideoToolsNav");
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-7xl px-6 2xl:max-w-[1600px]">
      <nav className="flex gap-0 border-b border-border">
        {VIDEO_TOOLS.map(({ href, key }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={key}
              href={href}
              className={
                isActive
                  ? "border-b-2 border-accent px-4 py-3 text-base font-semibold text-ink-900"
                  : "border-b-2 border-transparent px-4 py-3 text-base text-ink-500 hover:text-ink-700"
              }
            >
              {t(key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
