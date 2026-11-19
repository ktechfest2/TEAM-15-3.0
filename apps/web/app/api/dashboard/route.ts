import { handle } from "../../../lib/server/http";
import { dashboard } from "../../../lib/server/rollup";
import { getDeps } from "../../../lib/server/supabase";

export const dynamic = "force-dynamic";
export const GET = () => handle(() => dashboard(getDeps()));
