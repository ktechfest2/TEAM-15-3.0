import { handle } from "../../../../../lib/server/http";
import { unitNarration } from "../../../../../lib/server/read";
import { getDeps } from "../../../../../lib/server/supabase";

export const dynamic = "force-dynamic";

export const GET = (req: Request, ctx: { params: Promise<{ id: string }> }) =>
  handle(async () => unitNarration(getDeps(), (await ctx.params).id, new URL(req.url).searchParams.get("lang") ?? "en"));
