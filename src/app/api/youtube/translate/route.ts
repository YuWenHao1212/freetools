import { proxyJson } from "@/lib/proxy";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const status = checkRateLimit(ip);

  if (status === "blocked") {
    return Response.json(
      { detail: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  if (status === "captcha") {
    const token = request.headers.get("x-turnstile-token");
    if (!token) {
      return Response.json(
        { detail: "CAPTCHA required", captchaRequired: true },
        { status: 403 },
      );
    }
    const valid = await verifyTurnstile(token, ip);
    if (!valid) {
      return Response.json(
        { detail: "CAPTCHA verification failed" },
        { status: 403 },
      );
    }
  }

  return proxyJson("/api/youtube/translate", request);
}
