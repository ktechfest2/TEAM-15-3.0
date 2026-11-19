import { authenticate } from "../../../lib/server/auth";
import { handle } from "../../../lib/server/http";
import { getDeps } from "../../../lib/server/supabase";

export const dynamic = "force-dynamic";

/** Who am I? Used by the app to show the right menu. Returns only the caller's own role. */
export const GET = (req: Request) => handle(async () => {
  const deps = getDeps();
  const user = await authenticate(deps, req.headers.get("authorization"));
  return { role: user.role };
});
