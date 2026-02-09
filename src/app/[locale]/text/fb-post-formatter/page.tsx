import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TextToolsNav from "@/components/layout/TextToolsNav";
import Editor from "@/components/fb-post-formatter/Editor";

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
    title: t("mdToFbTitle"),
    description: t("mdToFbDescription"),
  };
}

export default async function MdToFbPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("MdToFb");

  const steps = [
    { number: 1, title: t("steps.step1Title"), description: t("steps.step1Desc") },
    { number: 2, title: t("steps.step2Title"), description: t("steps.step2Desc") },
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

  const relatedTools = [
    {
      href: "/text/font-generator",
      title: t("relatedTools.fontGenerator"),
      description: t("relatedTools.fontGeneratorDesc"),
    },
    {
      href: "/image/compress",
      title: t("relatedTools.imageCompressor"),
      description: t("relatedTools.imageCompressorDesc"),
    },
    {
      href: "/video/compress",
      title: t("relatedTools.videoCompressor"),
      description: t("relatedTools.videoCompressorDesc"),
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
    url: `https://neatoolkit.com/${locale}/text/fb-post-formatter`,
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
            <Editor />
          </div>
        </section>

        {/* SEO Content */}
        <section className="bg-cream-200 py-16">
          <div className="mx-auto max-w-7xl px-6 2xl:max-w-[1600px]">
            {/* How to Use */}
            <h2 className="text-center font-serif text-2xl font-bold text-ink-900 md:text-3xl">
              {t("howToUseTitle")}
            </h2>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {steps.map(({ number, title, description }) => (
                <div
                  key={number}
                  className="rounded-xl bg-white p-6 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                    {number}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-ink-900 md:text-xl">
                    {title}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-ink-600">
                    {description}
                  </p>
                </div>
              ))}
            </div>

            {/* FAQ */}
            <h2 className="mt-16 text-center font-serif text-2xl font-bold text-ink-900 md:text-3xl">
              {t("faqTitle")}
            </h2>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {faqs.map(({ question, answer }) => (
                <div
                  key={question}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <h3 className="text-base font-semibold text-ink-900">{question}</h3>
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
