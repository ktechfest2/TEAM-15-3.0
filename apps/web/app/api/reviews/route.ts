import { authenticate } from "../../../lib/server/auth";
import { handle, readJson } from "../../../lib/server/http";
import { createReview } from "../../../lib/server/reviews";
import { getDeps } from "../../../lib/server/supabase";

export const dynamic = "force-dynamic";

export const POST = (req: Request) => handle(async () => {
  const deps = getDeps();
  const user = await authenticate(deps, req.headers.get("authorization"));
  return createReview(deps, user, await readJson(req));
});
