import { HttpError } from "./ports";

const MAX_BODY_BYTES = 64 * 1024;

/** Read a small JSON body. Photos never come through here; they go straight to storage. */
export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw new HttpError(413, "That request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "The request body is not valid JSON.");
  }
}

const headers = { "cache-control": "no-store" };

/** Run a handler and turn the outcome into a JSON response. Unexpected errors are logged, not shown. */
export async function handle(fn: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await fn(), { headers });
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status, headers });
    console.error("unexpected error", e);
    return Response.json({ error: "Something went wrong on our side." }, { status: 500, headers });
  }
}
