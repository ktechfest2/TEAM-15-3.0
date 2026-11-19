/* Plants the demo story through the real API, as the demo observers.
   Usage: NODE_PATH=$PWD/node_modules node scripts/demo-scenario.cjs [baseUrl]
   Reads public Supabase vars from .env.local and demo logins from .demo-users.local (both gitignored).
   Refuses to touch a unit that already has photos, because the audit log is append-only. */
const fs = require("fs");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

fs.readFileSync(".env.local", "utf8").split("\n").forEach((l) => { const m = /^([A-Z_]+)=(.*)$/.exec(l); if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, ""); });
const BASE = process.argv[2] || "https://voteguard-360.vercel.app";
const creds = JSON.parse(fs.readFileSync(".demo-users.local", "utf8"));
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const SCENARIO = [
  { unit: "LA-IKJ-04-012", note: "two photos that differ by one figure (Party B 98 vs 89) -> Photos differ", photos: [["observer1", "sheet-a-clean"], ["observer2", "sheet-b-altered-figure"]] },
  { unit: "LA-IKJ-04-013", note: "two different photos, same figures -> Two people agree", photos: [["observer1", "sheet-a-clean"], ["observer2", "sheet-a-second-photo"]] },
  { unit: "LA-IKJ-04-014", note: "one clean photo -> Waiting", photos: [["observer1", "sheet-a-clean"]] },
  { unit: "LA-IKJ-04-015", note: "one photo whose arithmetic fails -> Needs a person to check", photos: [["observer1", "sheet-c-bad-arithmetic"]] },
];

const tokens = {};
async function token(who) {
  if (!tokens[who]) {
    const email = `${who}@demo.voteguard.test`;
    const { data, error } = await sb.auth.signInWithPassword({ email, password: creds[email].password });
    if (error) throw new Error(`login ${who}: ${error.message}`);
    tokens[who] = data.session.access_token;
  }
  return tokens[who];
}
async function api(method, path, who, body) {
  const r = await fetch(BASE + path, { method, headers: { "content-type": "application/json", ...(who ? { authorization: "Bearer " + (await token(who)) } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const json = await r.json();
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${json.error}`);
  return json;
}

(async () => {
  for (const step of SCENARIO) {
    const unit = (await api("GET", `/api/units?q=${step.unit}`)).units.find((u) => u.code === step.unit);
    const ev = await api("GET", `/api/units/${unit.id}/evidence`);
    if (ev.submissions.length || ev.pending) { console.log(`skip ${step.unit}: already has photos`); continue; }
    for (const [who, sheet] of step.photos) {
      const bytes = fs.readFileSync(`public/sample-result-sheets/${sheet}.png`);
      const up = await api("POST", "/api/uploads", who, { polling_unit_id: unit.id, sha256: crypto.createHash("sha256").update(bytes).digest("hex"), captured_at: new Date().toISOString(), content_type: "image/png" });
      const put = await sb.storage.from("evidence").uploadToSignedUrl(up.path, up.token, bytes, { contentType: "image/png" });
      if (put.error) throw new Error("storage: " + put.error.message);
      await api("POST", `/api/submissions/${up.submission_id}/extract`, who);
    }
    const after = await api("GET", `/api/units/${unit.id}/evidence`);
    console.log(`${step.unit}: ${after.status}   (${step.note})`);
  }
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
