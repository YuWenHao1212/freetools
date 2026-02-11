import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { toolCategories, categoryColors } from "@/lib/tools";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CategoryCard from "@/components/home/CategoryCard";
import ToolCard from "@/components/home/ToolCard";
import HeroDecorations from "@/components/home/HeroDecorations";
import LucideIcon from "@/components/home/LucideIcon";

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: t("siteTitle"),
    description: t("siteDescription"),
    openGraph: {
      title: t("siteTitle"),
      description: t("siteDescription"),
      url: `/${locale}`,
    },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        "zh-TW": "/zh-TW",
        en: "/en",
      },
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Homepage");

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Neatoolkit",
    url: `https://neatoolkit.com/${locale}`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  const categories = toolCategories.map((cat) => ({
    key: cat.key,
    icon: cat.icon,
    color: cat.color,
    title: t(`categories.${cat.key}`),
    href: cat.tools[0].href,
    tools: cat.tools.map((tool) => ({
      key: tool.key,
      href: tool.href,
      icon: tool.icon,
      title: t(`tools.${tool.key}`),
      description: t(`tools.${tool.key}Desc`),
    })),
  }));

  const categoryDescriptions: Record<string, string[]> = {
    image: categories.find((c) => c.key === "image")?.tools.map((t) => t.title) ?? [],
    video: categories.find((c) => c.key === "video")?.tools.map((t) => t.title) ?? [],
    youtube: categories.find((c) => c.key === "youtube")?.tools.map((t) => t.title) ?? [],
    text: categories.find((c) => c.key === "text")?.tools.map((t) => t.title) ?? [],
  };

  // First tool in each category is the featured one
  const featuredTools: Record<string, string> = {
    image: categories.find((c) => c.key === "image")?.tools[0]?.title ?? "",
    video: categories.find((c) => c.key === "video")?.tools[0]?.title ?? "",
    youtube: categories.find((c) => c.key === "youtube")?.tools[0]?.title ?? "",
    text: categories.find((c) => c.key === "text")?.tools[0]?.title ?? "",
  };

  const trustBadges = [
    { icon: "UserX", text: t("valueProp1") },
    { icon: "BadgeCheck", text: t("valueProp2") },
    { icon: "Trash2", text: t("valueProp3") },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pb-10 pt-16 md:pb-14 md:pt-24">
          <HeroDecorations />
          <div className="relative mx-auto max-w-3xl px-6 text-center">
            <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-ink-900 md:text-4xl lg:text-[52px] lg:leading-tight">
              {t("heroTitlePrefix")}
              <span className="relative inline-block px-1">
                {t("heroTitleHighlight")}
                <svg
                  className="absolute -bottom-1 left-[-8%] h-[35%] w-[116%] lg:-bottom-2"
                  viewBox="0 0 100 30"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M0 14C6 4 18 1 34 7C50 13 58 3 74 9C88 14 96 7 100 12L99 28C94 20 86 24 74 20C58 14 50 26 34 20C18 14 6 22 0 28Z"
                    fill="#d3050b"
                    opacity="0.75"
                  />
                </svg>
              </span>
              {t("heroTitleSuffix")}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-ink-600 md:text-lg">
              {t("heroSubtitle")}
            </p>

            {/* Trust Badges */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-ink-600">
              {trustBadges.map(({ icon, text }, i) => (
                <span key={text} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span className="mr-6 hidden h-4 w-px bg-cream-300 sm:block" />
                  )}
                  <LucideIcon name={icon} size={14} strokeWidth={1.8} />
                  {text}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Category Cards */}
        <section className="px-6">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-5 lg:grid-cols-4">
            {categories.map((cat) => {
              const colors = categoryColors[cat.key];
              return (
                <CategoryCard
                  key={cat.key}
                  href={cat.href}
                  icon={cat.icon}
                  title={cat.title}
                  toolCount={t("categoryToolCount", { count: cat.tools.length })}
                  description={categoryDescriptions[cat.key]?.join("、") ?? ""}
                  colorClass={colors.bg}
                  featuredLabel={t("featuredTool")}
                  featuredTool={featuredTools[cat.key] ?? ""}
                />
              );
            })}
          </div>
        </section>

        {/* All Tools */}
        <section className="px-6 pb-20 pt-10 md:pt-14">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <h2 className="font-serif text-2xl font-semibold text-ink-900 md:text-3xl">
                {t("allToolsTitle")}
              </h2>
              <p className="mt-2 text-base text-ink-600">
                {t("allToolsSubtitle")}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.flatMap((cat) => {
                const colors = categoryColors[cat.key];
                return cat.tools.map((tool) => (
                  <ToolCard
                    key={tool.key}
                    href={tool.href}
                    icon={tool.icon}
                    title={tool.title}
                    description={tool.description}
                    iconColorClass={colors.text}
                    iconBgClass={colors.iconBg}
                  />
                ));
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
