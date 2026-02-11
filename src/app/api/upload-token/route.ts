import { SignJWT } from "jose";
import { randomUUID } from "crypto";
import { verifyTurnstile } from "@/lib/turnstile";
import { headers } from "next/headers";

const secret = new TextEncoder().encode(process.env.UPLOAD_SECRET!);

const ALLOWED_ACTIONS = [
  "video/compress",
  "video/to-gif",
  "image/compress",
  "image/remove-bg",
];

export async function POST(request: Request) {
  const headersList = await headers();
  const turnstileToken = headersList.get("x-turnstile-token");
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (!turnstileToken) {
    return Response.json({ detail: "CAPTCHA required" }, { status: 403 });
  }

  const valid = await verifyTurnstile(turnstileToken, ip);
  if (!valid) {
    return Response.json(
      { detail: "CAPTCHA verification failed" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const action = body.action;

  if (!ALLOWED_ACTIONS.includes(action)) {
    return Response.json({ detail: "Invalid action" }, { status: 400 });
  }

  const token = await new SignJWT({ action })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret);

  return Response.json({ token });
}
