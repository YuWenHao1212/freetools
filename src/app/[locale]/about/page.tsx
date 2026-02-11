import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SocialLinks from "@/components/shared/SocialLinks";
import { EXTERNAL_LINKS, withUtm } from "@/lib/constants";

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });

  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: {
      canonical: `/${locale}/about`,
      languages: {
        "zh-TW": "/zh-TW/about",
        en: "/en/about",
      },
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("About");

  const otherWorks = [
    {
      title: t("otherWorks.airaTitle"),
      description: t("otherWorks.airaDescription"),
      href: withUtm(EXTERNAL_LINKS.airesumeadvisor, "freetools-about"),
    },
    {
      title: t("otherWorks.blogTitle"),
      description: t("otherWorks.blogDescription"),
      href: withUtm(EXTERNAL_LINKS.blog, "freetools-about"),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-6">
            <h1 className="font-serif text-3xl font-bold text-ink-900 md:text-4xl">
              {t("title")}
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-ink-600">
              {t("intro")}
            </p>

            <h2 className="mt-12 font-serif text-xl font-bold text-ink-900 md:text-2xl">
              {t("whyTitle")}
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-ink-600">
              {t("whyContent")}
            </p>

            <h2 className="mt-12 font-serif text-xl font-bold text-ink-900 md:text-2xl">
              {t("howTitle")}
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-ink-600">
              {t("howContent")}
            </p>

            {/* Author Section */}
            <hr className="mt-14 border-border" />

            <h2 className="mt-14 font-serif text-xl font-bold text-ink-900 md:text-2xl">
              {t("authorTitle")}
            </h2>

            <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream-300">
                <Image
                  src="/images/hao.webp"
                  alt="Yu-Wen Hao"
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-lg leading-relaxed text-ink-600">
                  {t("authorBio")}
                </p>
                <p className="mt-2 text-lg leading-relaxed text-ink-600">
                  {t("authorBio2")}
                </p>
                <SocialLinks className="mt-4" />
              </div>
            </div>

            {/* Other Works */}
            <h2 className="mt-14 font-serif text-xl font-bold text-ink-900 md:text-2xl">
              {t("otherWorksTitle")}
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {otherWorks.map(({ title, description, href }) => (
                <a
                  key={title}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-xl border border-border bg-white p-5 transition-shadow hover:shadow-md"
                >
                  <h3 className="font-semibold text-ink-900 group-hover:text-link">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm text-ink-600">{description}</p>
                  <span className="mt-3 inline-block text-sm font-medium text-link group-hover:text-link-hover">
                    &rarr;
                  </span>
                </a>
              ))}
            </div>

            {/* Collaboration */}
            <h2 className="mt-14 font-serif text-xl font-bold text-ink-900 md:text-2xl">
              {t("collaborateTitle")}
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-ink-600">
              {t("collaborateContent")}
            </p>
            <p className="mt-3 text-lg text-ink-600">
              <a
                href={`mailto:${t("contactEmail")}`}
                className="text-link hover:text-link-hover"
              >
                {t("contactEmail")}
              </a>
            </p>

            {/* Built With */}
            <p className="mt-14 text-center text-sm text-ink-600/50">
              {t("builtWith")}
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
