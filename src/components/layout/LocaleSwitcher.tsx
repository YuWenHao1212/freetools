"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("LocaleSwitcher");

  const handleSwitch = (nextLocale: string) => {
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <div className="flex items-center gap-1 rounded-full border border-[#1A1A1A]/20 p-0.5">
      {routing.locales.map((loc) => {
        const isActive = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => handleSwitch(loc)}
            className={
              isActive
                ? "cursor-pointer rounded-full bg-[#CA8A04] px-3 py-1 text-sm font-medium text-white"
                : "cursor-pointer rounded-full px-3 py-1 text-sm font-medium text-[#1A1A1A]/70 transition-colors hover:bg-[#1A1A1A]/10 hover:text-[#1A1A1A]"
            }
          >
            {t(loc)}
          </button>
        );
      })}
    </div>
  );
}
