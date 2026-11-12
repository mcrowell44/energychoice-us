import submitLoeHandler from "../src/api/submit-loe";

export default async function handler(req: any, res?: any): Promise<any> {
  // Node.js serverless runtime (req: IncomingMessage, res: ServerResponse)
  if (res && typeof res.status === "function") {
    try {
      const url = `https://${req.headers?.host || "localhost"}${req.url || "/api/submit-loe"}`;
      const webReq = new Request(url, {
        method: req.method || "POST",
        headers: { "Content-Type": "application/json", ...(req.headers || {}) },
        body:
          req.method !== "GET" && req.method !== "HEAD"
            ? typeof req.body === "string"
              ? req.body
              : JSON.stringify(req.body || {})
            : undefined,
      });
      const webRes = await submitLoeHandler(webReq);
      const data = await webRes.json();
      return res.status(webRes.status).json(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ error: "LOE Submission Error", details: msg });
    }
  }

  // Web Standard / Edge runtime (request: Request) => Promise<Response>
  try {
    return await submitLoeHandler(req);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: "LOE Submission Error", details: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  return handler(request);
}

export async function GET(request: Request): Promise<Response> {
  return handler(request);
}
