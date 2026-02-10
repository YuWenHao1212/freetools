import { proxyJson } from "@/lib/proxy";

export async function POST(request: Request) {
  return proxyJson("/api/youtube/subtitle", request);
}
