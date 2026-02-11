import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher";
import ImageToolsDropdown from "@/components/layout/ImageToolsDropdown";
import VideoToolsDropdown from "@/components/layout/VideoToolsDropdown";
import TextToolsDropdown from "@/components/layout/TextToolsDropdown";
import YouTubeToolsDropdown from "@/components/layout/YouTubeToolsDropdown";
import MobileNav from "@/components/layout/MobileNav";

export default async function Header() {
  const t = await getTranslations("Header");

  const imageToolItems = [
    { href: "/image/compress", label: t("imageCompress") },
    { href: "/image/remove-background", label: t("removeBackground") },
  ];

  const videoToolItems = [
    { href: "/video/compress", label: t("videoCompress") },
    { href: "/video/to-gif", label: t("videoToGif") },
  ];

  const textToolItems = [
    { href: "/text/font-generator", label: t("fontGenerator") },
    { href: "/text/fb-post-formatter", label: t("fbPostFormatter") },
  ];

  const youtubeToolItems = [
    { href: "/youtube/subtitle", label: t("youtubeSubtitle") },
    { href: "/youtube/summary", label: t("youtubeSummary") },
    { href: "/youtube/translate", label: t("youtubeTranslate") },
  ];

  const mobileNavLinks = [
    {
      href: "/image/compress",
      label: t("imageTools"),
      active: true,
      subItems: imageToolItems,
    },
    {
      href: "/video/compress",
      label: t("videoTools"),
      active: true,
      subItems: videoToolItems,
    },
    {
      href: "/youtube/subtitle",
      label: t("youtubeTools"),
      active: true,
      subItems: youtubeToolItems,
    },
    {
      href: "/text/font-generator",
      label: t("textTools"),
      active: true,
      subItems: textToolItems,
    },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 2xl:max-w-[1600px]">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent font-serif text-lg font-bold text-white">
            N
          </span>
          <div className="flex flex-col">
            <span className="text-lg font-semibold leading-tight text-ink-900">
              Neatoolkit
            </span>
            <span className="self-end text-[10px] leading-tight text-ink-600">
              by <span className="font-semibold">Wenhao</span>
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <ImageToolsDropdown
            label={t("imageTools")}
            items={imageToolItems}
            active
          />
          <VideoToolsDropdown
            label={t("videoTools")}
            items={videoToolItems}
            active
          />
          <YouTubeToolsDropdown
            label={t("youtubeTools")}
            items={youtubeToolItems}
            active
          />
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
