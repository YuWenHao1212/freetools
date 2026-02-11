import { useTranslations } from "next-intl";
import { EXTERNAL_LINKS, withUtm } from "@/lib/constants";

export default function MoreByWenhao() {
  const t = useTranslations("MoreByWenhao");

  return (
    <section className="border-t border-border bg-cream-200 px-6 py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-center gap-4">
          <span className="h-px flex-1 bg-border" />
          <h2 className="text-sm font-medium tracking-wide text-ink-600/60">
            {t("sectionTitle")}
          </h2>
          <span className="h-px flex-1 bg-border" />
        </div>

        <a
          href={withUtm(EXTERNAL_LINKS.airesumeadvisor, "freetools-home")}
          target="_blank"
          rel="noopener noreferrer"
          className="group mx-auto block max-w-2xl rounded-xl border border-border bg-white p-6 transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-serif text-lg font-semibold text-ink-900">
                {t("airaTitle")}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">
                {t("airaDescription")}
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium text-link transition-colors group-hover:text-link-hover">
              {t("airaCta")} &rarr;
            </span>
          </div>
        </a>
      </div>
    </section>
  );
}
