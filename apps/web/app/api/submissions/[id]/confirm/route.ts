import { authenticate } from "../../../../../lib/server/auth";
import { confirmExtraction } from "../../../../../lib/server/extract";
import { handle, readJson } from "../../../../../lib/server/http";
import { getDeps } from "../../../../../lib/server/supabase";

export const dynamic = "force-dynamic";

export const POST = (req: Request, ctx: { params: Promise<{ id: string }> }) => handle(async () => {
  const deps = getDeps();
  const user = await authenticate(deps, req.headers.get("authorization"));
  return confirmExtraction(deps, user, (await ctx.params).id, await readJson(req));
});
