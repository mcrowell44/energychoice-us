import handler from "../src/api/spark-match";

export async function POST(request: Request): Promise<Response> {
  try {
    return await handler(request);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: "Rate Matching Error", details: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    return await handler(request);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: "Rate Matching Error", details: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
