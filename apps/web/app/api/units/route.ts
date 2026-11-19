import { handle } from "../../../lib/server/http";
import { listUnits } from "../../../lib/server/read";
import { getDeps } from "../../../lib/server/supabase";

export const dynamic = "force-dynamic";

export const GET = (req: Request) => handle(async () => {
  const p = new URL(req.url).searchParams;
  return { units: await listUnits(getDeps(), { state: p.get("state") ?? undefined, lga: p.get("lga") ?? undefined, ward: p.get("ward") ?? undefined, q: p.get("q") ?? undefined }) };
});
