import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EXTERNAL_LINKS, withUtm } from "@/lib/constants";
import SocialLinks from "@/components/shared/SocialLinks";

export default async function Footer() {
  const t = await getTranslations("Footer");

  const footerLinks = [
    { href: "/about", label: t("about") },
    { href: "/privacy", label: t("privacy") },
    { href: "/terms", label: t("terms") },
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
          {t("madeWith")} <span className="text-red-500">&#10084;</span>{" "}
          by{" "}
          <a
            href={withUtm(EXTERNAL_LINKS.personalSite, "freetools")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-600 underline decoration-ink-600/30 underline-offset-2 transition-colors hover:text-ink-900 hover:decoration-ink-900/50"
          >
            Yu-Wen Hao
          </a>
        </p>

        <div className="mt-3 flex justify-center">
          <SocialLinks />
        </div>

        <p className="mt-3 text-sm text-ink-600/60">
          &copy; {new Date().getFullYear()} Neatoolkit
        </p>
      </div>
    </footer>
  );
}
