import { Redis } from "@upstash/redis";

const FREE_REQUESTS = 3;
const CAPTCHA_REQUESTS = 10;
const RESET_SECONDS = 24 * 60 * 60;

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

// Lua script: atomically increment and ensure TTL
// Self-heals keys that lost their TTL (ttl === -1)
const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
local ttl = redis.call('TTL', KEYS[1])
if ttl == -1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
return {count, ttl}
`;

type RateLimitScriptResult = [number, number];

let rateLimitScript: {
  exec: (keys: string[], args: string[]) => Promise<RateLimitScriptResult>;
} | null = null;

function getRateLimitScript(client: Redis) {
  if (!rateLimitScript) {
    rateLimitScript = client.createScript<RateLimitScriptResult>(RATE_LIMIT_SCRIPT);
  }
  return rateLimitScript;
}

export type RateLimitStatus = "free" | "captcha" | "blocked";

export async function checkRateLimit(
  ip: string,
): Promise<RateLimitStatus> {
  try {
    const client = getRedis();
    if (!client) return "free";

    const key = `rate:${ip}`;
    const script = getRateLimitScript(client);
    const [count] = await script.exec([key], [String(RESET_SECONDS)]);

    if (count <= FREE_REQUESTS) return "free";
    if (count > CAPTCHA_REQUESTS) return "blocked";

    const verified = await client.get(`verified:${ip}`);
    if (verified) return "free";

    return "captcha";
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return "free";
  }
}

export async function markVerified(ip: string): Promise<void> {
  try {
    const client = getRedis();
    if (!client) return;
    await client.set(`verified:${ip}`, "1", { ex: RESET_SECONDS });
  } catch (error) {
    console.error("Mark verified failed:", error);
  }
}

export function getClientIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
