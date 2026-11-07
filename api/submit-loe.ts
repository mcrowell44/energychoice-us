import handler from "../src/api/submit-loe";

export async function POST(request: Request): Promise<Response> {
  return handler(request);
}
