import { authenticate } from "../../../../../lib/server/auth";
import { runExtraction } from "../../../../../lib/server/extract";
import { handle } from "../../../../../lib/server/http";
import { getDeps } from "../../../../../lib/server/supabase";

export const dynamic = "force-dynamic";

export const POST = (req: Request, ctx: { params: Promise<{ id: string }> }) => handle(async () => {
  const deps = getDeps();
  const user = await authenticate(deps, req.headers.get("authorization"));
  return runExtraction(deps, user, (await ctx.params).id);
});
