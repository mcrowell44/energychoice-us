import handler from "../src/api/spark-match";

export async function POST(request: Request): Promise<Response> {
  return handler(request);
}

export async function GET(request: Request): Promise<Response> {
  return handler(request);
}
