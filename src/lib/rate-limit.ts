const ipCounts = new Map<string, { count: number; resetAt: number }>();
const FREE_REQUESTS = 3;
const CAPTCHA_REQUESTS = 10;
const RESET_MS = 24 * 60 * 60 * 1000;

export function checkRateLimit(
  ip: string,
): "free" | "captcha" | "blocked" {
  const now = Date.now();
  const entry = ipCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + RESET_MS });
    return "free";
  }

  entry.count++;
  if (entry.count <= FREE_REQUESTS) return "free";
  if (entry.count <= CAPTCHA_REQUESTS) return "captcha";
  return "blocked";
}

export function getClientIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
