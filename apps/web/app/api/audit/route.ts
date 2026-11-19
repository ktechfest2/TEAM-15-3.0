import { verifyAudit } from "../../../lib/server/audit-verify";
import { handle } from "../../../lib/server/http";
import { getDeps } from "../../../lib/server/supabase";

export const dynamic = "force-dynamic";
export const GET = () => handle(() => verifyAudit(getDeps()));
