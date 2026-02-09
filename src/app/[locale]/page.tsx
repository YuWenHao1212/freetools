import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

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

const toolCategories = [
  {
    titleKey: "imageToolsTitle" as const,
    tools: [
      { key: "imageCompress" as const, href: "/image/compress" },
      { key: "removeBackground" as const, href: "/image/remove-background" },
    ],
  },
  {
    titleKey: "videoToolsTitle" as const,
    tools: [
      { key: "videoCompress" as const, href: "/video/compress" },
      { key: "videoToGif" as const, href: "/video/to-gif" },
    ],
  },
  {
    titleKey: "textToolsTitle" as const,
    tools: [
      { key: "fontGenerator" as const, href: "/text/font-generator" },
      { key: "fbPostFormatter" as const, href: "/text/fb-post-formatter" },
    ],
  },
];

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

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="pb-8 pt-16 text-center md:pt-20">
          <div className="mx-auto max-w-4xl px-6 2xl:max-w-5xl">
            <h1 className="font-serif text-4xl font-bold leading-tight text-ink-900 md:text-5xl lg:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-600 md:text-xl">
              {t("heroSubtitle")}
            </p>
          </div>
        </section>

        {/* Tool Categories */}
        <section className="pb-20 pt-8">
          <div className="mx-auto max-w-4xl px-6">
            <div className="space-y-12">
              {toolCategories.map(({ titleKey, tools }) => (
                <div key={titleKey}>
                  <h2 className="font-serif text-2xl font-bold text-ink-900 md:text-3xl">
                    {t(titleKey)}
                  </h2>
                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    {tools.map(({ key, href }) => (
                      <Link
                        key={key}
                        href={href}
                        className="group rounded-xl border border-border bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-lg"
                      >
                        <h3 className="text-lg font-semibold text-ink-900 group-hover:text-accent">
                          {t(`tools.${key}`)}
                        </h3>
                        <p className="mt-2 text-base leading-relaxed text-ink-600">
                          {t(`tools.${key}Desc`)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
