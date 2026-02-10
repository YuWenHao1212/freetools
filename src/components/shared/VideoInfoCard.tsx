"use client";

import Image from "next/image";

interface VideoInfoCardProps {
  videoId: string;
  title?: string;
  channel?: string;
  thumbnailUrl?: string;
  children?: React.ReactNode;
}

export default function VideoInfoCard({
  videoId,
  title,
  channel,
  thumbnailUrl,
  children,
}: VideoInfoCardProps) {
  const thumb =
    thumbnailUrl || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

  return (
    <div className="flex gap-4 rounded-xl bg-cream-100 p-4">
      <div className="relative h-[112px] w-[200px] shrink-0 overflow-hidden rounded-lg bg-cream-300">
        <Image
          src={thumb}
          alt={title || videoId}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {title && (
          <p className="text-base font-semibold leading-snug text-ink-900">
            {title}
          </p>
        )}
        {channel && <p className="text-xs text-ink-500">{channel}</p>}
        {children}
      </div>
    </div>
  );
}
