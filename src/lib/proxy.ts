const API_URL = process.env.API_URL!;
const PROXY_KEY = process.env.PROXY_KEY!;

export async function proxyFormData(
  path: string,
  request: Request,
): Promise<Response> {
  const url = `${API_URL}${path}`;

  const headers = new Headers();
  headers.set("X-API-Key", PROXY_KEY);

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: request.body,
    // @ts-expect-error -- duplex required for streaming request body in Node
    duplex: "half",
  });

  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (
      key.startsWith("x-") ||
      key === "content-type" ||
      key === "content-disposition"
    ) {
      responseHeaders.set(key, value);
    }
  });

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

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
