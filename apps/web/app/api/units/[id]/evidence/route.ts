import { handle } from "../../../../../lib/server/http";
import { unitEvidence } from "../../../../../lib/server/read";
import { getDeps } from "../../../../../lib/server/supabase";

export const dynamic = "force-dynamic";

export const GET = (_req: Request, ctx: { params: Promise<{ id: string }> }) =>
  handle(async () => unitEvidence(getDeps(), (await ctx.params).id));
