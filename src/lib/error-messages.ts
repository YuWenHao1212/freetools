const API_ERROR_KEYS: Record<string, string> = {
  "Invalid YouTube URL": "apiErrors.invalidUrl",
  "Subtitles are disabled for this video": "apiErrors.subtitlesDisabled",
  "No subtitles available for this video": "apiErrors.noSubtitles",
  "Video is unavailable": "apiErrors.videoUnavailable",
  "Too many requests. Please try again later.": "apiErrors.tooManyRequests",
  "Video exceeds 60 minute duration limit": "apiErrors.durationExceeded",
  SERVER_WARMING_UP: "apiErrors.serverWarmingUp",
  REQUEST_TIMEOUT: "apiErrors.requestTimeout",
};

export function getErrorMessageKey(apiMessage: string): string | null {
  if (apiMessage.startsWith("Failed to fetch subtitles:")) {
    return "apiErrors.fetchFailed";
  }
  return API_ERROR_KEYS[apiMessage] ?? null;
}
