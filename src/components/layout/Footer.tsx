import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function Footer() {
  const t = await getTranslations("Footer");

  const footerLinks = [
    { href: "#", label: t("about") },
    { href: "#", label: t("privacy") },
    { href: "#", label: t("terms") },
  ];

  return (
    <footer className="border-t border-border bg-cream-200">
      <div className="mx-auto max-w-7xl px-6 py-8 text-center 2xl:max-w-[1600px]">
        <nav className="flex items-center justify-center gap-2 text-sm">
          {footerLinks.map(({ href, label }, i) => (
            <span key={label} className="flex items-center gap-2">
              {i > 0 && (
                <span className="text-ink-600/40" aria-hidden="true">
                  &middot;
                </span>
              )}
              <Link
                href={href}
                className="text-link hover:text-link-hover"
              >
                {label}
              </Link>
            </span>
          ))}
        </nav>

        <p className="mt-3 text-sm text-ink-600">
          {t("madeWith")} <span className="text-red-500">&#10084;</span> {t("by")}
        </p>

        <p className="mt-1 text-xs text-ink-600/60">
          &copy; {new Date().getFullYear()} FreeTools.tw
        </p>
      </div>
    </footer>
  );
}
