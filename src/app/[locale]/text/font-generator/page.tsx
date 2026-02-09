import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TextToolsNav from "@/components/layout/TextToolsNav";
import FontGenerator from "@/components/font-generator/FontGenerator";

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
    title: t("fontGeneratorTitle"),
    description: t("fontGeneratorDescription"),
    openGraph: {
      title: t("fontGeneratorTitle"),
      description: t("fontGeneratorDescription"),
      url: `/${locale}/text/font-generator`,
    },
    alternates: {
      canonical: `/${locale}/text/font-generator`,
      languages: {
        "zh-TW": "/zh-TW/text/font-generator",
        en: "/en/text/font-generator",
      },
    },
  };
}

export default async function FontGeneratorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("FontGenerator");

  const steps = [
    {
      number: 1,
      title: t("steps.step1Title"),
      description: t("steps.step1Desc"),
    },
    {
      number: 2,
      title: t("steps.step2Title"),
      description: t("steps.step2Desc"),
    },
  ];

  const faqs = [
    { question: t("faqs.q1"), answer: t("faqs.a1") },
    { question: t("faqs.q2"), answer: t("faqs.a2") },
    { question: t("faqs.q3"), answer: t("faqs.a3") },
    { question: t("faqs.q4"), answer: t("faqs.a4") },
    { question: t("faqs.q5"), answer: t("faqs.a5") },
    { question: t("faqs.q6"), answer: t("faqs.a6") },
    { question: t("faqs.q7"), answer: t("faqs.a7") },
    { question: t("faqs.q8"), answer: t("faqs.a8") },
    { question: t("faqs.q9"), answer: t("faqs.a9") },
  ];

  const platforms = [
    { name: t("platforms.igName"), desc: t("platforms.igDesc") },
    { name: t("platforms.fbName"), desc: t("platforms.fbDesc") },
    { name: t("platforms.lineName"), desc: t("platforms.lineDesc") },
    { name: t("platforms.twitterName"), desc: t("platforms.twitterDesc") },
    { name: t("platforms.discordName"), desc: t("platforms.discordDesc") },
    { name: t("platforms.otherName"), desc: t("platforms.otherDesc") },
  ];

  const relatedTools = [
    {
      href: "/text/fb-post-formatter",
      title: t("relatedTools.fbPostFormatter"),
      description: t("relatedTools.fbPostFormatterDesc"),
    },
    {
      href: "/image/compress",
      title: t("relatedTools.imageCompressor"),
      description: t("relatedTools.imageCompressorDesc"),
    },
    {
      href: "/image/remove-background",
      title: t("relatedTools.bgRemover"),
      description: t("relatedTools.bgRemoverDesc"),
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t("title"),
    url: `https://neatoolkit.com/${locale}/text/font-generator`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: t("howToUseTitle"),
    step: steps.map(({ number, title, description }) => ({
      "@type": "HowToStep",
      position: number,
      name: title,
      text: description,
    })),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="pb-6 pt-12 text-center">
          <div className="mx-auto max-w-4xl px-6 2xl:max-w-5xl">
            <h1 className="font-serif text-3xl font-bold leading-tight text-ink-900 md:text-4xl lg:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-3 text-lg text-ink-600 md:text-xl">
              {t("subtitle")}
            </p>
          </div>
        </section>

        {/* Tab bar */}
        <section className="mb-6">
          <TextToolsNav />
        </section>

        {/* Tool Section */}
        <section className="pb-12">
          <div className="mx-auto max-w-7xl px-6 2xl:max-w-[1600px]">
            <FontGenerator />
          </div>
        </section>

        {/* SEO info — 3-column grid */}
        <section className="bg-cream-200 py-16">
          <div className="mx-auto max-w-7xl px-6 2xl:max-w-[1600px]">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {/* What Is */}
              <div className="rounded-2xl border border-border bg-white p-7">
                <h2 className="font-serif text-2xl font-bold text-ink-900">
                  {t("whatIsTitle")}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-ink-600">
                  {t("whatIsContent")}
                </p>
              </div>

              {/* Platforms */}
              <div className="rounded-2xl border border-border bg-white p-7">
                <h2 className="font-serif text-2xl font-bold text-ink-900">
                  {t("platformsTitle")}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {platforms.map(({ name }) => (
                    <span
                      key={name}
                      className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-ink-700"
                    >
                      {name}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink-500">
                  {t("platformsSummary")}
                </p>
              </div>

              {/* vs comparison */}
              <div className="rounded-2xl border border-border bg-white p-7 md:col-span-2 lg:col-span-1">
                <h2 className="font-serif text-2xl font-bold text-ink-900">
                  {t("vsFaqTitle")}
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-accent/5 p-4">
                    <p className="text-sm font-semibold text-ink-900">{t("vsFont")}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{t("vsFontDesc")}</p>
                    <p className="mt-3 select-all truncate text-base text-ink-800">
                      {t("vsFontExample")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-ink-50 p-4">
                    <p className="text-sm font-semibold text-ink-900">{t("vsSymbol")}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{t("vsSymbolDesc")}</p>
                    <p className="mt-3 select-all truncate text-base text-ink-800">
                      {t("vsSymbolExample")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How to Use + FAQ */}
        <section className="bg-cream-200 py-16">
          <div className="mx-auto max-w-7xl px-6 2xl:max-w-[1600px]">
            {/* How to Use — horizontal numbered steps */}
            <h2 className="text-center font-serif text-2xl font-bold text-ink-900 md:text-3xl">
              {t("howToUseTitle")}
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {steps.map(({ number, title, description }) => (
                <div
                  key={number}
                  className="flex gap-4 rounded-2xl bg-white p-6 shadow-sm"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                    {number}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-ink-900">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* FAQ — 2-column grid */}
            <h2 className="mt-20 text-center font-serif text-2xl font-bold text-ink-900 md:text-3xl">
              {t("faqTitle")}
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {faqs.map(({ question, answer }) => (
                <div
                  key={question}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <h3 className="text-base font-semibold text-ink-900">
                    {question}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">
                    {answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Related Tools */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-6 2xl:max-w-[1600px]">
            <h2 className="text-center font-serif text-2xl font-bold text-ink-900 md:text-3xl">
              {t("relatedToolsTitle")}
            </h2>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {relatedTools.map(({ href, title, description }) => (
                <Link
                  key={title}
                  href={href}
                  className="group rounded-xl border border-border bg-white p-6 transition-shadow hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold text-ink-900 group-hover:text-accent">
                    {title}
                  </h3>
                  <p className="mt-2 text-base text-ink-600">{description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
