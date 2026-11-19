import { authenticate } from "../../../lib/server/auth";
import { handle, readJson } from "../../../lib/server/http";
import { getDeps } from "../../../lib/server/supabase";
import { createUpload } from "../../../lib/server/uploads";

export const dynamic = "force-dynamic";

export const POST = (req: Request) => handle(async () => {
  const deps = getDeps();
  const user = await authenticate(deps, req.headers.get("authorization"));
  return createUpload(deps, user, await readJson(req));
});
