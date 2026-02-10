import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import YouTubeToolsNav from "@/components/layout/YouTubeToolsNav";
import YouTubeSummary from "@/components/youtube-summary/YouTubeSummary";

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
    title: t("youtubeSummaryTitle"),
    description: t("youtubeSummaryDescription"),
    openGraph: {
      title: t("youtubeSummaryTitle"),
      description: t("youtubeSummaryDescription"),
      url: `/${locale}/youtube/summary`,
    },
    alternates: {
      canonical: `/${locale}/youtube/summary`,
      languages: {
        "zh-TW": "/zh-TW/youtube/summary",
        en: "/en/youtube/summary",
      },
    },
  };
}

export default async function YouTubeSummaryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("YouTubeSummary");

  const steps = [
    { number: 1, title: t("steps.step1Title"), description: t("steps.step1Desc") },
    { number: 2, title: t("steps.step2Title"), description: t("steps.step2Desc") },
    { number: 3, title: t("steps.step3Title"), description: t("steps.step3Desc") },
  ];

  const faqs = [
    { question: t("faqs.q1"), answer: t("faqs.a1") },
    { question: t("faqs.q2"), answer: t("faqs.a2") },
    { question: t("faqs.q3"), answer: t("faqs.a3") },
    { question: t("faqs.q4"), answer: t("faqs.a4") },
    { question: t("faqs.q5"), answer: t("faqs.a5") },
  ];

  const relatedTools = [
    {
      href: "/youtube/subtitle",
      title: t("relatedTools.subtitle"),
      description: t("relatedTools.subtitleDesc"),
    },
    {
      href: "/youtube/translate",
      title: t("relatedTools.translate"),
      description: t("relatedTools.translateDesc"),
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t("title"),
    url: `https://neatoolkit.com/${locale}/youtube/summary`,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <Header />

      <main className="flex-1">
        <section className="pb-6 pt-12 text-center">
          <div className="mx-auto max-w-4xl px-6 2xl:max-w-5xl">
            <h1 className="font-serif text-3xl font-bold leading-tight text-ink-900 md:text-4xl lg:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-3 text-lg text-ink-600 md:text-xl">{t("subtitle")}</p>
          </div>
        </section>

        <section className="mb-6"><YouTubeToolsNav /></section>

        <section className="pb-12">
          <div className="mx-auto max-w-7xl px-6 2xl:max-w-[1600px]"><YouTubeSummary /></div>
        </section>

        <section className="bg-cream-200 py-16">
          <div className="mx-auto max-w-7xl px-6 2xl:max-w-[1600px]">
            <h2 className="text-center font-serif text-2xl font-bold text-ink-900 md:text-3xl">{t("howToUseTitle")}</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {steps.map(({ number, title, description }) => (
                <div key={number} className="flex gap-4 rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">{number}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="mt-20 text-center font-serif text-2xl font-bold text-ink-900 md:text-3xl">{t("faqTitle")}</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {faqs.map(({ question, answer }) => (
                <div key={question} className="rounded-2xl bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-ink-900">{question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-7xl px-6 2xl:max-w-[1600px]">
            <h2 className="text-center font-serif text-2xl font-bold text-ink-900 md:text-3xl">{t("relatedToolsTitle")}</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {relatedTools.map(({ href, title, description }) => (
                <Link key={title} href={href} className="group rounded-xl border border-border bg-white p-6 transition-shadow hover:shadow-md">
                  <h3 className="text-lg font-semibold text-ink-900 group-hover:text-accent">{title}</h3>
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
