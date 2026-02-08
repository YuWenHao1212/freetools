import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher";
import TextToolsDropdown from "@/components/layout/TextToolsDropdown";
import MobileNav from "@/components/layout/MobileNav";

export default async function Header() {
  const t = await getTranslations("Header");

  const navLinks = [
    { href: "#", label: t("imageTools") },
    { href: "#", label: t("videoTools") },
    { href: "#", label: t("careerTools") },
  ];

  const textToolItems = [
    { href: "/text/font-generator", label: t("fontGenerator") },
    { href: "/text/fb-post-formatter", label: t("fbPostFormatter") },
  ];

  const mobileNavLinks = [
    { href: "#", label: t("imageTools") },
    { href: "#", label: t("videoTools") },
    {
      href: "/text/font-generator",
      label: t("textTools"),
      active: true,
      subItems: textToolItems,
    },
    { href: "#", label: t("careerTools") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 2xl:max-w-[1600px]">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent font-serif text-lg font-bold text-white">
            F
          </span>
          <span className="text-lg font-semibold text-ink-900">
            FreeTools
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="text-base text-ink-600 hover:text-ink-900"
            >
              {label}
            </Link>
          ))}
          <TextToolsDropdown
            label={t("textTools")}
            items={textToolItems}
            active
          />
          <LocaleSwitcher />
        </nav>

        <MobileNav navLinks={mobileNavLinks} />
      </div>
    </header>
  );
}
