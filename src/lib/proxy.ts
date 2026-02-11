const API_URL = process.env.API_URL!;
const PROXY_KEY = process.env.PROXY_KEY!;

export async function proxyJson(
  path: string,
  request: Request,
): Promise<Response> {
  const url = `${API_URL}${path}`;

  const body = await request.text();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-Key": PROXY_KEY,
      "Content-Type": "application/json",
    },
    body,
  });

  const data = await response.text();

  return new Response(data, {
    status: response.status,
    headers: { "content-type": "application/json" },
  });
}
