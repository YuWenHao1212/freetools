const VIDEO_ID_RE =
  /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;

export function extractVideoId(url: string): string | null {
  const match = VIDEO_ID_RE.exec(url);
  return match ? match[1] : null;
}

const SUBTITLE_CACHE_KEY = "yt-subtitle-result";

export function getCachedTranscript(videoUrl: string): string | null {
  try {
    const raw = sessionStorage.getItem(SUBTITLE_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    if (!cached.video_id || !cached.transcript) return null;

    const currentId = extractVideoId(videoUrl);
    if (!currentId || cached.video_id !== currentId) return null;

    return cached.transcript;
  } catch {
    return null;
  }
}
