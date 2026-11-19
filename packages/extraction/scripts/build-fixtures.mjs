// Builds src/fixtures.json: SHA-256 of each synthetic DEMO sheet -> the figures printed on it.
// Run: npm run build:fixtures -w @voteguard/extraction
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "..", "..", "public", "sample-result-sheets");
const truth = JSON.parse(readFileSync(join(dir, "ground-truth.json"), "utf8"));
const out = {};
for (const [name, meta] of Object.entries(truth)) {
  const sha = createHash("sha256").update(readFileSync(join(dir, name + ".png"))).digest("hex");
  out[sha] = { sheet: name, note: meta.note, fields: meta.fields };
}
writeFileSync(join(here, "..", "src", "fixtures.json"), JSON.stringify(out, null, 2) + "\n");
console.log("fixtures for", Object.values(out).map((v) => v.sheet));
